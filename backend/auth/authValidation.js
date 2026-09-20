const { ROLES, ACCOUNT_STATUSES, normalizeRole, normalizeStatus } = require('./roles');
const { normalizeClubId } = require('../models/Club');

const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clientError(message, status = 422) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function validateIdentity(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const username = String(input.username || '').trim();
  const name = String(input.name || username).trim().slice(0, 100);
  const password = String(input.password || '');
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw clientError('Please provide a valid email address.');
  if (!USERNAME_PATTERN.test(username)) throw clientError('Username must be 3–40 characters and may contain letters, numbers, dots, dashes, or underscores.');
  if (!name) throw clientError('Name is required.');
  if (password.length < 8 || password.length > 256) throw clientError('Password must be between 8 and 256 characters.');
  return { email, username, name, password };
}

function validateRegistration(input, hasExistingUsers = true) {
  const identity = validateIdentity(input);
  const requestedRole = normalizeRole(input.role);

  // If the database has no users yet, allow initial administrator setup
  if (!hasExistingUsers) {
    const role = requestedRole || ROLES.PRESIDENT;
    return { ...identity, role };
  }

  // Once users exist, public registration cannot assign privileged roles (Admin / Coordinator)
  const role = requestedRole || ROLES.WEB_USER;
  if (![ROLES.WEB_USER, ROLES.VOLUNTEER].includes(role)) {
    throw clientError('Public registration is available only for Web User or Volunteer accounts.', 403);
  }
  return { ...identity, role };
}

function validateLogin(input) {
  const identifier = String(input.username || input.email || '').trim();
  const password = String(input.password || '');
  if (!identifier || !password) throw clientError('Email or username and password are required.');
  if (identifier.length > 254 || password.length > 256) throw clientError('Invalid email or password.', 401);
  return { identifier, password };
}

function validateProfileUpdate(input) {
  const forbiddenFields = ['role', 'clubId', 'password', 'username', 'status'];
  if (forbiddenFields.some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    throw clientError('Profile updates cannot change account access or identity fields.', 403);
  }

  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 100) throw clientError('Name must be between 2 and 100 characters.');
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw clientError('Please provide a valid email address.');

  let avatar = null;
  if (input.avatar !== undefined && input.avatar !== null && input.avatar !== '') {
    avatar = String(input.avatar).trim();
    if (avatar.length > 2_000_000 || !/^(https?:\/\/|data:image\/)/i.test(avatar)) {
      throw clientError('Profile picture must be a valid image URL or image data.');
    }
  }
  return { name, email, avatar };
}

function validateClubId(input) {
  const clubId = normalizeClubId(input);
  if (!clubId) throw clientError('Please provide a valid Club ID.');
  return clubId;
}

function validateRoleChange(input) {
  const role = normalizeRole(input.role);
  if (!role) throw clientError('Please select a valid role.');
  return role;
}

function validateStatusChange(input) {
  const rawStatus = String(input.status || '').trim().toUpperCase();
  if (!Object.values(ACCOUNT_STATUSES).includes(rawStatus)) throw clientError('Please select a valid account status.');
  return normalizeStatus(rawStatus);
}

module.exports = {
  clientError,
  validateIdentity,
  validateRegistration,
  validateLogin,
  validateProfileUpdate,
  validateClubId,
  validateRoleChange,
  validateStatusChange
};
