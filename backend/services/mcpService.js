const fs = require('fs');
const path = require('path');

class MCPService {
  constructor() {
    this.servers = new Map();
    this.configPath = path.join(__dirname, '../../config/mcp.json');
    this.handlerPath = path.join(__dirname, '../mcp/handlers');
    this.config = null;
    this.isInitialized = false;
  }

  async initialize() {
    try {
      await this.loadConfiguration();
      await this.loadHandlers();
      await this.startEnabledServers();
      this.isInitialized = true;
      console.log('MCP Service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MCP Service:', error);
      throw error;
    }
  }

  async loadConfiguration() {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
    } catch (error) {
      throw new Error(`Failed to load MCP configuration: ${error.message}`);
    }
  }

  async loadHandlers() {
    if (!fs.existsSync(this.handlerPath)) {
      fs.mkdirSync(this.handlerPath, { recursive: true });
    }

    const handlerFiles = fs.readdirSync(this.handlerPath)
      .filter(file => file.endsWith('.js'));

    for (const file of handlerFiles) {
      try {
        const handlerName = path.basename(file, '.js');
        const HandlerClass = require(path.join(this.handlerPath, file));
        console.log(`Loaded MCP handler: ${handlerName}`);
      } catch (error) {
        console.error(`Failed to load handler ${file}:`, error);
      }
    }
  }

  async startEnabledServers() {
    for (const [serverId, serverConfig] of Object.entries(this.config.mcpServers)) {
      if (serverConfig.enabled) {
        try {
          await this.startServer(serverId, serverConfig);
        } catch (error) {
          console.error(`Failed to start MCP server ${serverId}:`, error);
        }
      }
    }
  }

  async startServer(serverId, serverConfig) {
    if (serverConfig.type === 'internal' && serverConfig.handler) {
      try {
        const HandlerClass = require(path.join(this.handlerPath, `${serverConfig.handler}.js`));
        const handler = new HandlerClass(serverConfig.config || {});
        
        const server = {
          id: serverId,
          name: serverConfig.name,
          description: serverConfig.description,
          handler: handler,
          config: serverConfig,
          status: 'running',
          startTime: new Date().toISOString()
        };

        this.servers.set(serverId, server);
        console.log(`Started MCP server: ${serverId}`);
      } catch (error) {
        throw new Error(`Failed to start internal server ${serverId}: ${error.message}`);
      }
    } else {
      throw new Error(`Unsupported server type: ${serverConfig.type}`);
    }
  }

  async stopServer(serverId) {
    const server = this.servers.get(serverId);
    if (server) {
      if (server.handler && typeof server.handler.stop === 'function') {
        await server.handler.stop();
      }
      this.servers.delete(serverId);
      console.log(`Stopped MCP server: ${serverId}`);
      return true;
    }
    return false;
  }

  async executeRequest(serverId, method, params = {}) {
    console.log(`[MCP] Executing request - Server: ${serverId}, Method: ${method}, Params:`, JSON.stringify(params));
    
    const server = this.servers.get(serverId);
    if (!server) {
      console.error(`[MCP] Server not found: ${serverId}`);
      throw new Error(`MCP server not found: ${serverId}`);
    }

    if (server.status !== 'running') {
      console.error(`[MCP] Server not running: ${serverId}`);
      throw new Error(`MCP server is not running: ${serverId}`);
    }

    try {
      const startTime = Date.now();
      const result = await server.handler.execute(method, params);
      const duration = Date.now() - startTime;
      
      console.log(`[MCP] Request completed - Server: ${serverId}, Method: ${method}, Duration: ${duration}ms, Success: ${result.success || 'unknown'}`);
      
      return {
        success: true,
        result: result,
        serverId: serverId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[MCP] Request failed - Server: ${serverId}, Method: ${method}, Error: ${error.message}`);
      throw new Error(`MCP request failed for ${serverId}: ${error.message}`);
    }
  }

  getServerStatus(serverId = null) {
    if (serverId) {
      const server = this.servers.get(serverId);
      return server ? {
        id: server.id,
        name: server.name,
        description: server.description,
        status: server.status,
        startTime: server.startTime
      } : null;
    }

    return Array.from(this.servers.values()).map(server => ({
      id: server.id,
      name: server.name,
      description: server.description,
      status: server.status,
      startTime: server.startTime
    }));
  }

  async toggleServer(serverId, enabled) {
    const serverConfig = this.config.mcpServers[serverId];
    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverId}`);
    }

    if (enabled && !this.servers.has(serverId)) {
      await this.startServer(serverId, serverConfig);
    } else if (!enabled && this.servers.has(serverId)) {
      await this.stopServer(serverId);
    }

    serverConfig.enabled = enabled;
    await this.saveConfiguration();
  }

  async saveConfiguration() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save MCP configuration: ${error.message}`);
    }
  }

  isReady() {
    return this.isInitialized;
  }
}

module.exports = MCPService;