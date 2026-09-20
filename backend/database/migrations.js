const { normalizeRole, normalizeStatus, ROLES } = require('../auth/roles');
const { createDefaultClub, DEFAULT_CLUB_ID } = require('../models/Club');

function migrateData(data) {
  const migrated = { ...data };
  migrated.clubs = Array.isArray(data.clubs) && data.clubs.length ? data.clubs : [createDefaultClub()];
  const fallbackClubId = migrated.clubs[0]?.clubId || DEFAULT_CLUB_ID;
  migrated.users = Array.isArray(data.users) ? data.users.map((user) => ({
    ...user,
    name: user.name || user.username,
    role: normalizeRole(user.role) || ROLES.WEB_USER,
    status: normalizeStatus(user.status),
    clubId: user.clubId || fallbackClubId,
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
  })) : [];
  migrated.memberships = Array.isArray(data.memberships) ? data.memberships : [];
  const membershipKeys = new Set(migrated.memberships.map((membership) => `${membership.userId}:${membership.clubId}`));
  for (const user of migrated.users) {
    const key = `${user.id}:${user.clubId}`;
    if (!membershipKeys.has(key)) {
      migrated.memberships.push({
        id: `${user.id}:${user.clubId}`,
        userId: user.id,
        clubId: user.clubId,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString()
      });
      membershipKeys.add(key);
    }
  }
  migrated.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  migrated.rsvps = Array.isArray(data.rsvps) ? data.rsvps : [];
  migrated.settings = data.settings && typeof data.settings === 'object' ? data.settings : {};
  migrated.version = Math.max(Number(data.version) || 1, 2);
  const scopedCollections = ['events', 'tasks', 'risks', 'volunteers', 'meetings', 'documents', 'announcements', 'activities', 'budgets'];
  for (const collection of scopedCollections) {
    migrated[collection] = Array.isArray(data[collection])
      ? data[collection].map((record) => ({ ...record, clubId: record.clubId || fallbackClubId }))
      : [];
  }
  return migrated;
}

module.exports = { migrateData };
