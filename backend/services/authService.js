const crypto = require('node:crypto');
const { sign } = require('../utils/jwt');

const ROLES = new Set(['Admin', 'Core Team', 'Volunteer']);
const USERNAME_PATTERN = /^[a-zA-Z0-9_.-]{3,40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, email: user.email, username: user.username, role: user.role, createdAt: user.createdAt };
}

function validationError(message) {
  const error = new Error(message);
  error.status = 422;
  return error;
}

function validateSignup(input) {
  const email = String(input.email || '').trim().toLowerCase();
  const username = String(input.username || '').trim();
  const role = String(input.role || '').trim();
  const password = String(input.password || '');
  if (!EMAIL_PATTERN.test(email) || email.length > 254) throw validationError('Please provide a valid email address.');
  if (!USERNAME_PATTERN.test(username)) throw validationError('Username must be 3–40 characters and may contain letters, numbers, dots, dashes, or underscores.');
  if (!ROLES.has(role)) throw validationError('Please select a valid club role.');
  if (password.length < 8 || password.length > 256) throw validationError('Password must be between 8 and 256 characters.');
  return { email, username, role, password };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('base64url')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('base64url');
  return `${salt}:${hash}`;
}

function passwordMatches(password, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const derived = Buffer.from(crypto.scryptSync(password, salt, 64).toString('base64url'));
  const expected = Buffer.from(hash);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

function createAuthService(store, config) {
  function tokenFor(user) {
    return sign({ sub: user.id, username: user.username, role: user.role }, config.jwtSecret, config.tokenTtlHours);
  }

  async function signup(input) {
    const normalized = validateSignup(input);
    const user = await store.update((data) => {
      if (data.users.some((candidate) => candidate.email === normalized.email)) {
        const error = new Error('An account with this email already exists.');
        error.status = 409;
        throw error;
      }
      if (data.users.some((candidate) => candidate.username.toLowerCase() === normalized.username.toLowerCase())) {
        const error = new Error('That username is already in use.');
        error.status = 409;
        throw error;
      }
      const created = {
        id: crypto.randomUUID(),
        email: normalized.email,
        username: normalized.username,
        role: normalized.role,
        passwordHash: hashPassword(normalized.password),
        createdAt: new Date().toISOString()
      };
      data.users.push(created);
      return created;
    });
    return { user: publicUser(user), token: tokenFor(user) };
  }

  async function login(input) {
    const username = String(input.username || '').trim();
    const password = String(input.password || '');
    if (!username || !password) throw validationError('Username and password are required.');
    const data = await store.read();
    const user = data.users.find((candidate) => candidate.username.toLowerCase() === username.toLowerCase() || candidate.email === username.toLowerCase());
    if (!user || !passwordMatches(password, user.passwordHash)) {
      const error = new Error('Invalid username or password.');
      error.status = 401;
      throw error;
    }
    return { user: publicUser(user), token: tokenFor(user) };
  }

  return { signup, login, publicUser };
}

module.exports = { createAuthService };
