const crypto = require('node:crypto');
const { ROLES, ACCOUNT_STATUSES, normalizeRole, normalizeStatus } = require('../auth/roles');

class User {
  constructor({
    id = crypto.randomUUID(),
    name,
    username,
    email,
    passwordHash,
    role = ROLES.WEB_USER,
    status = ACCOUNT_STATUSES.ACTIVE,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.username = String(username || '').trim();
    this.name = String(name || this.username).trim();
    this.email = String(email || '').trim().toLowerCase();
    this.passwordHash = passwordHash;
    this.role = normalizeRole(role) || ROLES.WEB_USER;
    this.status = normalizeStatus(status);
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isActive() {
    return this.status === ACCOUNT_STATUSES.ACTIVE;
  }

  toPublicJSON() {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      email: this.email,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      username: this.username,
      email: this.email,
      passwordHash: this.passwordHash,
      role: this.role,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = { User };

