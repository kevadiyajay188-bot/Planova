const { PROVIDERS } = require('../config/aiConfig');
const { LocalIntelligenceEngine } = require('./localIntelligenceEngine');

class AiModelService {
  constructor(config = {}) {
    this.config = config;
    this.provider = config.provider || PROVIDERS.LOCAL;
    this.model = config.model || 'gemini-3.6-flash';
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
          return await this.callGemini({ prompt, systemPrompt, tools, context });
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
    if (intent.directText || !intent.toolName) {
      return {
        text: intent.directText || "I'm analyzing your request against our records.",
        toolCall: null,
        confidence: 0.98,
        provider: 'local-engine',
        model: 'planova-intelligence-v1'
      };
    }
    return {
      text: `Understood your request regarding: "${prompt}". Executing action [${intent.toolName}] with context-backed intelligence.`,
      toolCall: {
        name: intent.toolName,
        parameters: intent.params
      },
      confidence: 0.95,
      provider: 'local-engine',
      model: 'planova-intelligence-v1'
    };
  }

  async callGemini({ prompt, systemPrompt = '', tools = [], context = {} }) {
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': this.apiKey
    };

    let enrichedSystemPrompt = systemPrompt;
    if (tools && tools.length > 0) {
      const toolSummaries = tools.map(t => `- ${t.name}: ${t.description} (Parameters: ${Object.keys(t.parameters || {}).join(', ') || 'none'})`).join('\n');
      enrichedSystemPrompt += `\n\nOPERATIONAL TOOL REGISTRY:
${toolSummaries}

TOOL CALLING FORMAT:
If the user's request is best fulfilled by executing one of the available tools above, respond with valid JSON:
{
  "toolCall": {
    "name": "exact_tool_name",
    "parameters": { ... }
  },
  "text": "Brief confirmation"
}
If no tool execution is needed, or if the request is out-of-scope for the user's role, respond with conversational markdown text.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        contents: [
          ...(enrichedSystemPrompt ? [{ role: 'user', parts: [{ text: `System Instruction: ${enrichedSystemPrompt}` }] }] : []),
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
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Check if Gemini generated a toolCall in JSON format
    let toolCall = null;
    let cleanText = rawText;
    try {
      const jsonCandidate = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      if (jsonCandidate.startsWith('{') && jsonCandidate.endsWith('}')) {
        const parsed = JSON.parse(jsonCandidate);
        if (parsed && parsed.toolCall && parsed.toolCall.name) {
          toolCall = parsed.toolCall;
          cleanText = parsed.text || `Executing ${toolCall.name}`;
        }
      }
    } catch {
      // Direct text response
    }

    return {
      text: cleanText,
      toolCall,
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

