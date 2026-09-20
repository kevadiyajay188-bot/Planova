const crypto = require('node:crypto');
const { hashPassword, compare } = require('../auth/passwordService');
const { clientError, validateIdentity, validateRegistration, validateLogin, validateProfileUpdate, validateClubId, validateRoleChange, validateStatusChange } = require('../auth/authValidation');
const { ROLES, ACCOUNT_STATUSES, normalizeRole, normalizeStatus, isPresident } = require('../auth/roles');
const { Club, DEFAULT_CLUB_ID, DEFAULT_CLUB_NAME } = require('../models/Club');
const { TokenService } = require('../auth/tokenService');
const { User } = require('../models/User');

function publicUser(user) {
  if (user instanceof User) return user.toPublicJSON();
  return {
    id: user.id,
    name: user.name || user.username,
    email: user.email,
    username: user.username,
    avatar: user.avatar || null,
    clubId: user.clubId || null,
    role: normalizeRole(user.role) || ROLES.WEB_USER,
    status: normalizeStatus(user.status),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function conflict(message) {
  const error = new Error(message);
  error.status = 409;
  return error;
}

function safeSecretMatches(candidate, expected) {
  const supplied = Buffer.from(String(candidate || ''));
  const configured = Buffer.from(String(expected || ''));
  return supplied.length === configured.length && supplied.length > 0 && crypto.timingSafeEqual(supplied, configured);
}

function createAuthService(store, config) {
  const tokenService = new TokenService(config);

  function resolveRegistrationClub(data, input, hasExistingUsers) {
    const requestedClubId = input.clubId ? validateClubId(input.clubId) : DEFAULT_CLUB_ID;
    const existing = (data.clubs || []).find((club) => club.clubId === requestedClubId);
    if (existing) return existing;
    if (hasExistingUsers) {
      const error = new Error('That Club ID does not exist.');
      error.status = 422;
      throw error;
    }
    const created = new Club({
      clubId: requestedClubId,
      name: input.clubName || (requestedClubId === DEFAULT_CLUB_ID ? DEFAULT_CLUB_NAME : `Club ${requestedClubId}`)
    }).toJSON();
    data.clubs.push(created);
    return created;
  }

  function createUserRecord(identity, role, clubId) {
    const now = new Date().toISOString();
    return new User({
      id: crypto.randomUUID(),
      name: identity.name,
      email: identity.email,
      username: identity.username,
      clubId,
      role,
      status: ACCOUNT_STATUSES.ACTIVE,
      passwordHash: hashPassword(identity.password),
      createdAt: now,
      updatedAt: now
    }).toJSON();
  }

  function findByIdentity(users, identity) {
    const normalized = identity.toLowerCase();
    return (users || []).find(
      (candidate) => candidate.username.toLowerCase() === normalized || candidate.email === normalized
    );
  }

  function assertUnique(data, identity) {
    if ((data.users || []).some((candidate) => candidate.email === identity.email)) {
      throw conflict('An account with this email already exists.');
    }
    if ((data.users || []).some((candidate) => candidate.username.toLowerCase() === identity.username.toLowerCase())) {
      throw conflict('That username is already in use.');
    }
  }

  async function register(input) {
    const currentData = await store.read();
    const hasExistingUsers = Array.isArray(currentData.users) && currentData.users.length > 0;
    const normalized = validateRegistration(input, hasExistingUsers);

    let created;
    let club;
    await store.update((data) => {
      assertUnique(data, normalized);
      club = resolveRegistrationClub(data, input, hasExistingUsers);
      created = createUserRecord(normalized, normalized.role, club.clubId);
      data.users.push(created);
      data.memberships.push({ id: `${created.id}:${club.clubId}`, userId: created.id, clubId: club.clubId, role: created.role, status: created.status, createdAt: created.createdAt, updatedAt: created.updatedAt });
    });

    const { token } = await tokenService.createSession(store, created.id, created.clubId);
    return { user: publicUser(created), token };
  }

  async function bootstrap(input) {
    if (!config.bootstrapSecret) {
      const error = new Error('Initial administrator setup is not enabled.');
      error.status = 404;
      throw error;
    }
    if (!safeSecretMatches(input.bootstrapSecret, config.bootstrapSecret)) {
      const error = new Error('Initial administrator setup could not be authorized.');
      error.status = 403;
      throw error;
    }
    const normalized = validateIdentity(input);
    let created;
    let club;
    await store.update((data) => {
      if ((data.users || []).length > 0) throw conflict('Initial administrator setup has already been completed.');
      assertUnique(data, normalized);
      club = resolveRegistrationClub(data, input, false);
      created = createUserRecord(normalized, ROLES.PRESIDENT, club.clubId);
      data.users.push(created);
      data.memberships.push({ id: `${created.id}:${club.clubId}`, userId: created.id, clubId: club.clubId, role: created.role, status: created.status, createdAt: created.createdAt, updatedAt: created.updatedAt });
    });
    const { token } = await tokenService.createSession(store, created.id, created.clubId);
    return { user: publicUser(created), token };
  }

  async function login(input) {
    const { identifier, password } = validateLogin(input);
    const data = await store.read();
    const user = findByIdentity(data.users, identifier);

    if (!user || !compare(password, user.passwordHash) || normalizeStatus(user.status) !== ACCOUNT_STATUSES.ACTIVE) {
      const error = new Error('Invalid email or password.');
      error.status = 401;
      throw error;
    }

    const { token } = await tokenService.createSession(store, user.id, user.clubId);
    return { user: publicUser(user), token };
  }

  async function updateProfile(userId, input) {
    const profile = validateProfileUpdate(input);
    let updated;
    await store.update((data) => {
      const index = (data.users || []).findIndex((candidate) => candidate.id === userId);
      if (index < 0) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
      }
      if (data.users.some((candidate, candidateIndex) => candidateIndex !== index && candidate.email === profile.email)) {
        throw conflict('An account with this email already exists.');
      }
      const current = data.users[index];
      const now = new Date().toISOString();
      data.users[index] = {
        ...current,
        name: profile.name,
        email: profile.email,
        avatar: profile.avatar,
        updatedAt: now
      };
      updated = data.users[index];
    });
    return publicUser(updated);
  }

  async function getProfile(user) {
    const data = await store.read();
    const currentUser = (data.users || []).find((u) => u.id === user.id) || user;
    const userRsvps = (data.rsvps || []).filter((r) => r.userId === user.id && r.status === 'CONFIRMED');
    const rsvpIds = userRsvps.map((r) => r.eventId);
    const rsvpEvents = (data.events || []).filter((e) => rsvpIds.includes(e.id)).map((e) => ({
      id: e.id,
      name: e.name,
      type: e.type || e.category || 'General',
      date: e.date || (e.eventDate ? e.eventDate.slice(0, 10) : ''),
      time: e.time || '10:00 AM',
      venue: e.venue || 'Campus Auditorium',
      status: e.status || 'upcoming'
    }));
    return {
      ...publicUser(currentUser),
      rsvps: rsvpIds,
      rsvpEvents
    };
  }

  async function logout(user, sessionId) {
    if (!sessionId) return;
    await tokenService.revokeSession(store, user.id, sessionId);
  }

  async function refresh(user, sessionId) {
    await logout(user, sessionId);
    const { token } = await tokenService.createSession(store, user.id, user.clubId);
    return { user: publicUser(user), token };
  }

  async function listUsers(clubId) {
    const data = await store.read();
    return (data.users || []).filter((user) => user.clubId === clubId).map(publicUser);
  }

  async function updateUser(userId, input, clubId) {
    let result;
    await store.update((data) => {
      const index = (data.users || []).findIndex((candidate) => candidate.id === userId);
      if (index < 0 || data.users[index].clubId !== clubId) {
        const error = new Error('User not found.');
        error.status = 404;
        throw error;
      }
      const current = data.users[index];
      const nextRole = input.role === undefined ? normalizeRole(current.role) : validateRoleChange(input);
      const nextStatus = input.status === undefined ? normalizeStatus(current.status) : validateStatusChange(input);
      const removesActivePresident = isPresident(current) && (nextRole !== ROLES.PRESIDENT || nextStatus !== ACCOUNT_STATUSES.ACTIVE);
      if (removesActivePresident) {
        const activePresidents = data.users.filter((candidate) => isPresident(candidate) && normalizeStatus(candidate.status) === ACCOUNT_STATUSES.ACTIVE);
        if (activePresidents.length <= 1) throw clientError('The final active President account cannot be changed or deactivated.', 409);
      }
      const now = new Date().toISOString();
      data.users[index] = { ...current, role: nextRole, status: nextStatus, updatedAt: now };
      for (const membership of data.memberships || []) {
        if (membership.userId === current.id && membership.clubId === current.clubId) {
          membership.role = nextRole;
          membership.status = nextStatus;
          membership.updatedAt = now;
        }
      }
      if (nextStatus !== ACCOUNT_STATUSES.ACTIVE) {
        for (const session of data.sessions || []) {
          if (session.userId === current.id && !session.revokedAt) session.revokedAt = now;
        }
      }
      result = data.users[index];
    });
    return publicUser(result);
  }

  return {
    register,
    signup: register,
    bootstrap,
    login,
    getProfile,
    updateProfile,
    logout,
    refresh,
    listUsers,
    updateUser,
    publicUser,
    tokenService
  };
}

module.exports = { createAuthService, publicUser };
