const { ROLES, normalizeRole, hasRole, isPresident, isTeamLead, isClubMember } = require('./roles');
const { failure } = require('../utils/http');

function isVolunteer(user) {
  return hasRole(user, ROLES.VOLUNTEER);
}

function isWebUser(user) {
  return hasRole(user, ROLES.WEB_USER);
}

function canManageEvents(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageTasks(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageVolunteers(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageMeetings(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageAnnouncements(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageSettings(user) {
  return isPresident(user);
}

function canManageUsers(user) {
  return isPresident(user);
}

function canAccessClubOps(user) {
  return isClubMember(user);
}

function requireRole(response, user, roles, message = 'You do not have permission to perform this action.') {
  if (hasRole(user, ...roles)) return true;
  failure(response, 403, message);
  return false;
}

module.exports = {
  ROLES,
  normalizeRole,
  hasRole,
  isPresident,
  isTeamLead,
  isVolunteer,
  isWebUser,
  isClubMember,
  canManageEvents,
  canManageTasks,
  canManageVolunteers,
  canManageMeetings,
  canManageAnnouncements,
  canManageSettings,
  canManageUsers,
  canAccessClubOps,
  requireRole
};

