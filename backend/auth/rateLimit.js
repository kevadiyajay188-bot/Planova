function createLoginRateLimiter({ maxAttempts = 8, windowMs = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();

  function clean(now) {
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
  }

  function assertAllowed(key) {
    const now = Date.now();
    clean(now);
    const entry = attempts.get(key);
    if (entry && entry.count >= maxAttempts) {
      const error = new Error('Too many sign-in attempts. Please try again later.');
      error.status = 429;
      error.retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      throw error;
    }
  }

  function recordFailure(key) {
    const now = Date.now();
    clean(now);
    const entry = attempts.get(key);
    attempts.set(key, entry ? { ...entry, count: entry.count + 1 } : { count: 1, resetAt: now + windowMs });
  }

  function clear(key) { attempts.delete(key); }

  return { assertAllowed, recordFailure, clear };
}

module.exports = { createLoginRateLimiter };
