const { verify } = require('../utils/jwt');

async function requireUser(request, response, context) {
  const authorization = request.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
  const payload = verify(token, context.config.jwtSecret);
  if (!payload) return null;
  const data = await context.store.read();
  const user = data.users.find((candidate) => candidate.id === payload.sub);
  if (!user) return null;
  return user;
}

function canManageEvents(user) {
  return ['Admin', 'Core Team'].includes(user.role);
}

module.exports = { requireUser, canManageEvents };
