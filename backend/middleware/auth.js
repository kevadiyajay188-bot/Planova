const { verify } = require('../utils/jwt');
const { ACCOUNT_STATUSES, hasRole, isPresident, isTeamLead, isClubMember, normalizeStatus } = require('../auth/roles');

function bearerToken(request) {
  const authorization = request.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : null;
}

async function authenticateUser(request, context) {
  const token = bearerToken(request);
  if (!token) return null;

  const payload = verify(token, context.config.jwtSecret);
  if (!payload) return null;
  if (!payload || !payload.sub) return null;

  const data = await context.store.read();
  const user = (data.users || []).find((candidate) => candidate.id === payload.sub);
  if (!user || normalizeStatus(user.status) !== ACCOUNT_STATUSES.ACTIVE) return null;

  if (payload.sid) {
    const session = (data.sessions || []).find(
      (candidate) => candidate.id === payload.sid && candidate.userId === payload.sub
    );
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() <= Date.now()) {
      return null;
    }
    if (!session.clubId || session.clubId !== user.clubId || (payload.clubId && payload.clubId !== session.clubId)) return null;
  }

  const club = (data.clubs || []).find((candidate) => candidate.clubId === user.clubId && candidate.status === 'ACTIVE');
  if (!club) return null;

  return { user, club, payload, token };
}

async function requireUser(request, response, context) {
  const authentication = await authenticateUser(request, context);
  return authentication ? authentication.user : null;
}

function authorizeRoles(user, ...roles) {
  return hasRole(user, ...roles);
}

function canManageEvents(user) {
  return isPresident(user) || isTeamLead(user);
}

module.exports = {
  bearerToken,
  authenticateUser,
  requireUser,
  authorizeRoles,
  canManageEvents,
  isPresident,
  isTeamLead,
  isClubMember
};
