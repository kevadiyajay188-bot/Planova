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
  return {
    port: numberFromEnv(overrides.port ?? process.env.PORT, 3000),
    jwtSecret: overrides.jwtSecret || process.env.JWT_SECRET || 'planova-development-secret-change-before-production',
    tokenTtlHours: numberFromEnv(overrides.tokenTtlHours ?? process.env.TOKEN_TTL_HOURS, 8),
    databaseFile: overrides.databaseFile || path.join(projectRoot, 'backend', 'database', 'data.json'),
    frontendDirectory: overrides.frontendDirectory || projectRoot,
    aiProvider: overrides.aiProvider || process.env.AI_PROVIDER || 'local',
    aiModel: overrides.aiModel || process.env.AI_MODEL || 'gemini-1.5-pro',
    aiApiKey: overrides.aiApiKey || process.env.AI_API_KEY || '',
    aiAutonomy: overrides.aiAutonomy || process.env.AI_AUTONOMY || 'ASK_FOR_RISKY'
  };
}

module.exports = { getConfig };
