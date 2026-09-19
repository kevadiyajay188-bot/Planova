const { normalizeRole, normalizeStatus, ROLES } = require('../auth/roles');

function migrateData(data) {
  const migrated = { ...data };
  migrated.users = Array.isArray(data.users) ? data.users.map((user) => ({
    ...user,
    name: user.name || user.username,
    role: normalizeRole(user.role) || ROLES.WEB_USER,
    status: normalizeStatus(user.status),
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
  })) : [];
  migrated.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  migrated.rsvps = Array.isArray(data.rsvps) ? data.rsvps : [];
  migrated.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  migrated.version = Math.max(Number(data.version) || 1, 2);
  return migrated;
}

module.exports = { migrateData };
