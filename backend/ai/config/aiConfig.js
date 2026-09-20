const AUTONOMY_LEVELS = {
  ASK_ALWAYS: 'ASK_ALWAYS',
  ASK_FOR_RISKY: 'ASK_FOR_RISKY',
  AUTO: 'AUTO'
};

const PROVIDERS = {
  LOCAL: 'local',
  GEMINI: 'gemini',
  OPENAI: 'openai',
  CLAUDE: 'claude'
};

function getAiConfig(envConfig = {}) {
  const provider = (envConfig.aiProvider || process.env.AI_PROVIDER || PROVIDERS.GEMINI).toLowerCase();
  const model = envConfig.aiModel || process.env.AI_MODEL || (provider === PROVIDERS.GEMINI ? 'gemini-1.5-pro' : 'gpt-4o');
  const apiKey = envConfig.aiApiKey || process.env.AI_API_KEY || '';
  const rawAutonomy = (envConfig.aiAutonomy || process.env.AI_AUTONOMY || AUTONOMY_LEVELS.ASK_FOR_RISKY).toUpperCase();
  const autonomy = AUTONOMY_LEVELS[rawAutonomy] || AUTONOMY_LEVELS.ASK_FOR_RISKY;

  return {
    provider,
    model,
    apiKey,
    autonomy,
    temperature: 0.2,
    maxTokens: 2048,
    similarityThreshold: 0.35,
    maxHistoryEvents: 5
  };
}

module.exports = {
  AUTONOMY_LEVELS,
  PROVIDERS,
  getAiConfig
};

