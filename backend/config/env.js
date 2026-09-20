const path = require('node:path');
const fs = require('node:fs');

function loadEnvironmentFile(projectRoot) {
  const envFile = path.join(projectRoot, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

function numberFromEnv(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfig(overrides = {}) {
  const projectRoot = path.resolve(__dirname, '..', '..');
  loadEnvironmentFile(projectRoot);
  const jwtSecret = overrides.jwtSecret || process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret === 'replace-with-a-long-random-secret') {
    throw new Error('JWT_SECRET must be set to a long, unique value before Planova can start.');
  }
  if (!overrides.jwtSecret && jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');
  return {
    port: numberFromEnv(overrides.port ?? process.env.PORT, 3000),
    jwtSecret,
    tokenTtlHours: numberFromEnv(overrides.tokenTtlHours ?? process.env.TOKEN_TTL_HOURS, 8),
    databaseFile: overrides.databaseFile || path.join(projectRoot, 'backend', 'database', 'data.json'),
    frontendDirectory: overrides.frontendDirectory || projectRoot,
    aiProvider: overrides.aiProvider || process.env.AI_PROVIDER || 'gemini',
    aiModel: overrides.aiModel || process.env.AI_MODEL || 'gemini-3.6-flash',
    aiApiKey: overrides.aiApiKey || process.env.AI_API_KEY || '',
    aiAutonomy: overrides.aiAutonomy || process.env.AI_AUTONOMY || 'AUTO',
    bootstrapSecret: overrides.bootstrapSecret || process.env.BOOTSTRAP_ADMIN_SECRET || '',
    loginRateLimitAttempts: numberFromEnv(overrides.loginRateLimitAttempts ?? process.env.LOGIN_RATE_LIMIT_ATTEMPTS, 8),
    loginRateLimitWindowMinutes: numberFromEnv(overrides.loginRateLimitWindowMinutes ?? process.env.LOGIN_RATE_LIMIT_WINDOW_MINUTES, 15)
  };
}

module.exports = { getConfig };
