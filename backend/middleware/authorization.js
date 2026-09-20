const { failure } = require('../utils/http');
const { ROLES, hasRole, isPresident, isTeamLead, isClubMember } = require('../auth/roles');
const { belongsToClub } = require('./clubScope');

const POLICIES = Object.freeze({
  CLUB_MEMBER: [ROLES.PRESIDENT, ROLES.TEAM_LEAD, ROLES.VOLUNTEER],
  MANAGEMENT: [ROLES.PRESIDENT, ROLES.TEAM_LEAD],
  PRESIDENT: [ROLES.PRESIDENT],
  VOLUNTEER: [ROLES.VOLUNTEER]
});

function requirePolicy(response, user, policy, message = 'You do not have permission to perform this action.') {
  const roles = Array.isArray(policy) ? policy : POLICIES[policy];
  if (user && roles && hasRole(user, ...roles)) return true;
  failure(response, user ? 403 : 401, user ? message : 'Please log in to continue.');
  return false;
}

function requireClubResource(response, user, resource, message = 'Resource not found.') {
  if (belongsToClub(resource, user)) return true;
  failure(response, 404, message);
  return false;
}

function canManageClub(user) {
  return isPresident(user) || isTeamLead(user);
}

function canManageUsers(user) {
  return isPresident(user);
}

function canAccessClubOperations(user) {
  return isClubMember(user);
}

module.exports = {
  POLICIES,
  requirePolicy,
  requireClubResource,
  canManageClub,
  canManageUsers,
  canAccessClubOperations,
  isPresident,
  isTeamLead
};
