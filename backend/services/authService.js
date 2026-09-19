const crypto = require('node:crypto');
const { hashPassword, compare } = require('../auth/passwordService');
const { clientError, validateIdentity, validateRegistration, validateLogin, validateRoleChange, validateStatusChange } = require('../auth/authValidation');
const { ROLES, ACCOUNT_STATUSES, normalizeRole, normalizeStatus, isPresident } = require('../auth/roles');
const { TokenService } = require('../auth/tokenService');
const { User } = require('../models/User');

function publicUser(user) {
  if (user instanceof User) return user.toPublicJSON();
  return {
    id: user.id,
    name: user.name || user.username,
    email: user.email,
    username: user.username,
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

  function createUserRecord(identity, role) {
    const now = new Date().toISOString();
    return new User({
      id: crypto.randomUUID(),
      name: identity.name,
      email: identity.email,
      username: identity.username,
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
    await store.update((data) => {
      assertUnique(data, normalized);
      created = createUserRecord(normalized, normalized.role);
      data.users.push(created);
    });

    const { token } = await tokenService.createSession(store, created.id);
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
    await store.update((data) => {
      if ((data.users || []).length > 0) throw conflict('Initial administrator setup has already been completed.');
      assertUnique(data, normalized);
      created = createUserRecord(normalized, ROLES.PRESIDENT);
      data.users.push(created);
    });
    const { token } = await tokenService.createSession(store, created.id);
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

    const { token } = await tokenService.createSession(store, user.id);
    return { user: publicUser(user), token };
  }

  async function logout(user, sessionId) {
    if (!sessionId) return;
    await tokenService.revokeSession(store, user.id, sessionId);
  }

  async function refresh(user, sessionId) {
    await logout(user, sessionId);
    const { token } = await tokenService.createSession(store, user.id);
    return { user: publicUser(user), token };
  }

  async function listUsers() {
    const data = await store.read();
    return (data.users || []).map(publicUser);
  }

  async function updateUser(userId, input) {
    let result;
    await store.update((data) => {
      const index = (data.users || []).findIndex((candidate) => candidate.id === userId);
      if (index < 0) {
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
    logout,
    refresh,
    listUsers,
    updateUser,
    publicUser,
    tokenService
  };
}

module.exports = { createAuthService, publicUser };
