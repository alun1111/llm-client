const axios = require('axios');

class LLMService {
  constructor() {
    this.providers = {
      openai: {
        baseURL: 'https://api.openai.com/v1',
        models: ['gpt-4', 'gpt-3.5-turbo'],
        apiKey: process.env.OPENAI_API_KEY
      },
      anthropic: {
        baseURL: 'https://api.anthropic.com/v1',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        apiKey: process.env.ANTHROPIC_API_KEY
      }
    };
  }

  async chat(message, model = 'gpt-3.5-turbo', context = []) {
    const provider = this.getProviderForModel(model);
    
    if (!provider) {
      throw new Error(`Unsupported model: ${model}`);
    }

    const messages = this.buildMessages(message, context);
    
    switch (provider.name) {
      case 'openai':
        return await this.callOpenAI(messages, model, provider);
      case 'anthropic':
        return await this.callAnthropic(messages, model, provider);
      default:
        throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  async streamChat(message, model, context, onChunk) {
    const provider = this.getProviderForModel(model);
    const messages = this.buildMessages(message, context);

    if (provider.name === 'openai') {
      await this.streamOpenAI(messages, model, provider, onChunk);
    } else {
      const response = await this.chat(message, model, context);
      onChunk(response);
    }
  }

  buildMessages(message, context) {
    const messages = [];
    
    if (context && context.length > 0) {
      const contextText = context.map(file => 
        `File: ${file.path}\n${file.content}`
      ).join('\n\n---\n\n');
      
      messages.push({
        role: 'system',
        content: `You are a helpful assistant. Here is the codebase context:\n\n${contextText}`
      });
    }
    
    messages.push({
      role: 'user',
      content: message
    });
    
    return messages;
  }

  async callOpenAI(messages, model, provider) {
    if (!provider.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      `${provider.baseURL}/chat/completions`,
      {
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  }

  async streamOpenAI(messages, model, provider, onChunk) {
    if (!provider.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await axios.post(
      `${provider.baseURL}/chat/completions`,
      {
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    );

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
    });
  }

  async callAnthropic(messages, model, provider) {
    if (!provider.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await axios.post(
      `${provider.baseURL}/messages`,
      {
        model,
        max_tokens: 2000,
        system: systemMessage?.content,
        messages: userMessages
      },
      {
        headers: {
          'x-api-key': provider.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.content[0].text;
  }

  getProviderForModel(model) {
    for (const [name, provider] of Object.entries(this.providers)) {
      if (provider.models.includes(model)) {
        return { ...provider, name };
      }
    }
    return null;
  }

  async getAvailableModels() {
    const models = [];
    
    for (const [name, provider] of Object.entries(this.providers)) {
      if (provider.apiKey) {
        models.push(...provider.models.map(model => ({
          id: model,
          provider: name,
          available: true
        })));
      } else {
        models.push(...provider.models.map(model => ({
          id: model,
          provider: name,
          available: false,
          reason: `${name.toUpperCase()}_API_KEY not configured`
        })));
      }
    }
    
    return models;
  }
}

module.exports = LLMService;