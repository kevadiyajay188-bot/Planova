const ROLES = Object.freeze({
  PRESIDENT: 'PRESIDENT',
  TEAM_LEAD: 'TEAM_LEAD',
  VOLUNTEER: 'VOLUNTEER',
  WEB_USER: 'WEB_USER'
});

const ACCOUNT_STATUSES = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED'
});

const ROLE_LABELS = Object.freeze({
  [ROLES.PRESIDENT]: 'President',
  [ROLES.TEAM_LEAD]: 'Team Lead',
  [ROLES.VOLUNTEER]: 'Volunteer',
  [ROLES.WEB_USER]: 'Web User'
});

const roleAliases = new Map([
  ['president', ROLES.PRESIDENT], ['admin', ROLES.PRESIDENT], ['president / admin', ROLES.PRESIDENT],
  ['team lead', ROLES.TEAM_LEAD], ['coordinator', ROLES.TEAM_LEAD], ['core team', ROLES.TEAM_LEAD], ['team_lead', ROLES.TEAM_LEAD],
  ['volunteer', ROLES.VOLUNTEER],
  ['web user', ROLES.WEB_USER], ['user', ROLES.WEB_USER], ['web_user', ROLES.WEB_USER]
]);

function normalizeRole(value) {
  if (!value) return null;
  const direct = String(value).trim().toUpperCase();
  if (Object.values(ROLES).includes(direct)) return direct;
  return roleAliases.get(String(value).trim().toLowerCase()) || null;
}

function normalizeStatus(value) {
  const normalized = String(value || ACCOUNT_STATUSES.ACTIVE).trim().toUpperCase();
  return Object.values(ACCOUNT_STATUSES).includes(normalized) ? normalized : ACCOUNT_STATUSES.ACTIVE;
}

function hasRole(user, ...roles) {
  const currentRole = normalizeRole(user && user.role);
  return roles.map(normalizeRole).includes(currentRole);
}

function isPresident(user) {
  return hasRole(user, ROLES.PRESIDENT);
}

function isTeamLead(user) {
  return hasRole(user, ROLES.TEAM_LEAD);
}

function isClubMember(user) {
  return hasRole(user, ROLES.PRESIDENT, ROLES.TEAM_LEAD, ROLES.VOLUNTEER);
}

module.exports = {
  ROLES,
  ACCOUNT_STATUSES,
  ROLE_LABELS,
  normalizeRole,
  normalizeStatus,
  hasRole,
  isPresident,
  isTeamLead,
  isClubMember
};
