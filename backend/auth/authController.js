const { readJson, success, failure } = require('../utils/http');
const { requireRole, ROLES } = require('./roleMiddleware');

function clientIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

class AuthController {
  constructor(authService, rateLimiter) {
    this.authService = authService;
    this.rateLimiter = rateLimiter;
  }

  async register(request, response) {
    const body = await readJson(request);
    const result = await this.authService.register(body);
    return success(
      response,
      { user: result.user },
      201,
      { token: result.token, message: 'Account created successfully.' }
    );
  }

  async login(request, response) {
    const input = await readJson(request);
    const identifier = String(input.username || input.email || '').trim().toLowerCase();
    const rateLimitKey = `${clientIp(request)}:${identifier}`;

    if (this.rateLimiter) {
      this.rateLimiter.assertAllowed(rateLimitKey);
    }

    try {
      const result = await this.authService.login(input);
      if (this.rateLimiter) {
        this.rateLimiter.clear(rateLimitKey);
      }
      return success(
        response,
        { user: result.user },
        200,
        { token: result.token, message: 'Signed in successfully.' }
      );
    } catch (err) {
      if (err.status === 401 && this.rateLimiter) {
        this.rateLimiter.recordFailure(rateLimitKey);
      }
      throw err;
    }
  }

  async logout(request, response, user, payload) {
    await this.authService.logout(user, payload.sid);
    return success(response, {}, 200, { message: 'Signed out successfully.' });
  }

  async getMe(request, response, user) {
    return success(response, { user: this.authService.publicUser(user) });
  }

  async getProfile(request, response, user) {
    const profile = await this.authService.getProfile(user);
    return success(response, { profile });
  }

  async updateProfile(request, response, user) {
    const body = await readJson(request);
    const profile = await this.authService.updateProfile(user.id, body);
    return success(response, { profile });
  }

  async refresh(request, response, user, payload) {
    const result = await this.authService.refresh(user, payload.sid);
    return success(response, { user: result.user }, 200, { token: result.token });
  }

  async bootstrap(request, response) {
    const input = await readJson(request);
    const result = await this.authService.bootstrap(input);
    return success(
      response,
      { user: result.user },
      201,
      { token: result.token, message: 'President account created successfully.' }
    );
  }

  async listUsers(request, response, user) {
    if (!requireRole(response, user, [ROLES.PRESIDENT])) return;
    const users = await this.authService.listUsers(user.clubId);
    return success(response, { users });
  }

  async updateUser(request, response, user, userId) {
    if (!requireRole(response, user, [ROLES.PRESIDENT])) return;
    const body = await readJson(request);
    const updated = await this.authService.updateUser(userId, body, user.clubId);
    return success(response, { user: updated });
  }
}

module.exports = { AuthController };

