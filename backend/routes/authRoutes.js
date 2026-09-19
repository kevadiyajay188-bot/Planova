const { AuthController } = require('../auth/authController');
const { failure } = require('../utils/http');

let controllerInstance = null;

function getController(context) {
  if (!controllerInstance || controllerInstance.authService !== context.auth) {
    controllerInstance = new AuthController(context.auth, context.loginRateLimiter);
  }
  return controllerInstance;
}

async function handleAuthRoutes(request, response, url, context) {
  const { pathname } = url;
  const controller = getController(context);

  // 1. Public Auth Endpoints
  if (request.method === 'POST' && (pathname === '/api/auth/signup' || pathname === '/api/auth/register')) {
    return await controller.register(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/auth/login') {
    return await controller.login(request, response);
  }

  if (request.method === 'POST' && pathname === '/api/auth/bootstrap') {
    return await controller.bootstrap(request, response);
  }

  // 2. Protected Auth & User Endpoints (require authenticated user)
  const user = context.user;
  const payload = context.payload;

  if (!user) {
    return failure(response, 401, 'Please log in to continue.');
  }

  if (request.method === 'GET' && pathname === '/api/auth/me') {
    return await controller.getMe(request, response, user);
  }

  if (request.method === 'POST' && pathname === '/api/auth/logout') {
    return await controller.logout(request, response, user, payload || {});
  }

  if (request.method === 'POST' && pathname === '/api/auth/refresh') {
    return await controller.refresh(request, response, user, payload || {});
  }

  if (request.method === 'GET' && pathname === '/api/users') {
    return await controller.listUsers(request, response, user);
  }

  const userMatch = pathname.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch && request.method === 'PATCH') {
    return await controller.updateUser(request, response, user, userMatch[1]);
  }

  return false;
}

module.exports = { handleAuthRoutes };

