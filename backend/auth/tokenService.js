const crypto = require('node:crypto');
const { sign, verify } = require('../utils/jwt');

class TokenService {
  constructor(config = {}) {
    this.jwtSecret = config.jwtSecret || 'planova-development-secret-change-before-production';
    this.tokenTtlHours = Number(config.tokenTtlHours) || 8;
  }

  generateToken(payload, ttlHours = this.tokenTtlHours) {
    return sign(payload, this.jwtSecret, ttlHours);
  }

  verifyToken(token) {
    return verify(token, this.jwtSecret);
  }

  async createSession(store, userId, ttlHours = this.tokenTtlHours) {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (ttlHours * 60 * 60 * 1000));
    const token = this.generateToken({ sub: userId, sid: sessionId }, ttlHours);

    await store.update((data) => {
      if (!Array.isArray(data.sessions)) data.sessions = [];
      data.sessions.push({
        id: sessionId,
        userId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        revokedAt: null
      });
    });

    return { token, sessionId, expiresAt };
  }

  async validateSession(store, userId, sessionId) {
    const data = await store.read();
    const session = (data.sessions || []).find(
      (s) => s.id === sessionId && s.userId === userId
    );
    if (!session || session.revokedAt) return null;
    if (new Date(session.expiresAt).getTime() <= Date.now()) return null;
    return session;
  }

  async revokeSession(store, userId, sessionId) {
    if (!sessionId) return false;
    let revoked = false;
    await store.update((data) => {
      const session = (data.sessions || []).find(
        (s) => s.id === sessionId && s.userId === userId
      );
      if (session && !session.revokedAt) {
        session.revokedAt = new Date().toISOString();
        revoked = true;
      }
    });
    return revoked;
  }

  async revokeAllUserSessions(store, userId) {
    const now = new Date().toISOString();
    await store.update((data) => {
      for (const session of data.sessions || []) {
        if (session.userId === userId && !session.revokedAt) {
          session.revokedAt = now;
        }
      }
    });
  }
}

module.exports = { TokenService };

