const { PROVIDERS } = require('../config/aiConfig');
const { LocalIntelligenceEngine } = require('./localIntelligenceEngine');

class AiModelService {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || PROVIDERS.LOCAL;
    this.model = config.model || 'gemini-1.5-pro';
    this.apiKey = config.apiKey || '';
    this.localEngine = new LocalIntelligenceEngine();
  }

  /**
   * Primary entry point for structured generation with tools/system prompt.
   */
  async generateCompletion({ prompt, systemPrompt = '', tools = [], context = {} }) {
    // If configured with an external provider and API key, call provider; otherwise use local engine.
    if (this.apiKey && this.provider !== PROVIDERS.LOCAL) {
      try {
        if (this.provider === PROVIDERS.GEMINI) {
          return await this.callGemini({ prompt, systemPrompt });
        }
        if (this.provider === PROVIDERS.OPENAI) {
          return await this.callOpenAi({ prompt, systemPrompt });
        }
        if (this.provider === PROVIDERS.CLAUDE) {
          return await this.callClaude({ prompt, systemPrompt });
        }
      } catch (error) {
        console.warn(`[AI Model] ${this.provider} call failed (${error.message}). Falling back to Local Intelligence Engine.`);
      }
    }

    return this.generateWithLocalEngine({ prompt, systemPrompt, tools, context });
  }

  generateWithLocalEngine({ prompt, context = {} }) {
    const intent = this.localEngine.classifyIntent(prompt, context);
    return {
      text: `Understood your request regarding: "${prompt}". Selected tool [${intent.toolName}] to process this with context-backed intelligence.`,
      toolCall: {
        name: intent.toolName,
        parameters: intent.params
      },
      confidence: 0.92,
      provider: 'local-engine',
      model: 'planova-intelligence-v1'
    };
  }

  async callGemini({ prompt, systemPrompt }) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          ...(systemPrompt ? [{ role: 'user', parts: [{ text: `System Instruction: ${systemPrompt}` }] }] : []),
          { role: 'user', parts: [{ text: prompt }] }
        ],
        generationConfig: {
          temperature: this.config.temperature || 0.2,
          maxOutputTokens: this.config.maxTokens || 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
      text,
      raw: data,
      provider: 'gemini',
      model: this.model
    };
  }

  async callOpenAi({ prompt, systemPrompt }) {
    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: this.model || 'gpt-4o',
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature || 0.2
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API returned status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices?.[0]?.message?.content || '',
      raw: data,
      provider: 'openai',
      model: this.model
    };
  }

  async callClaude({ prompt, systemPrompt }) {
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.model || 'claude-3-5-sonnet-20241022',
        system: systemPrompt || undefined,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: this.config.maxTokens || 2048
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API returned status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.content?.[0]?.text || '',
      raw: data,
      provider: 'claude',
      model: this.model
    };
  }
}

module.exports = { AiModelService };

