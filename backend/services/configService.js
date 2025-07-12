const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

class ConfigService {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config', 'app.yml');
    this.defaultConfig = {
      llm: {
        default_provider: 'openai',
        providers: {
          openai: {
            models: ['gpt-4', 'gpt-3.5-turbo']
          },
          anthropic: {
            models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
          }
        }
      },
      context: {
        max_files: 100,
        max_file_size: 100000,
        sources: [
          {
            type: 'directory',
            path: './src',
            extensions: ['.js', '.ts', '.jsx', '.tsx']
          },
          {
            type: 'file',
            path: './README.md'
          }
        ]
      },
      security: {
        rate_limit: {
          window_ms: 900000,
          max_requests: 100
        }
      }
    };
  }

  async getConfig() {
    try {
      await fs.access(this.configPath);
      const configContent = await fs.readFile(this.configPath, 'utf8');
      return yaml.load(configContent);
    } catch (error) {
      console.log('Config file not found, using defaults');
      await this.createDefaultConfig();
      return this.defaultConfig;
    }
  }

  async updateConfig(config) {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      const yamlContent = yaml.dump(config, { indent: 2 });
      await fs.writeFile(this.configPath, yamlContent, 'utf8');
    } catch (error) {
      throw new Error(`Failed to update config: ${error.message}`);
    }
  }

  async createDefaultConfig() {
    try {
      await fs.mkdir(path.dirname(this.configPath), { recursive: true });
      const yamlContent = yaml.dump(this.defaultConfig, { indent: 2 });
      await fs.writeFile(this.configPath, yamlContent, 'utf8');
      console.log('Created default configuration file');
    } catch (error) {
      console.error('Failed to create default config:', error.message);
    }
  }
}

module.exports = ConfigService;