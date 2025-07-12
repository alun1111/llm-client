const fs = require('fs').promises;
const path = require('path');
const ConfigService = require('./configService');

class ContextService {
  constructor() {
    this.configService = new ConfigService();
  }

  async scanPaths(paths = [], extensions = [], maxFiles = 100) {
    const config = await this.configService.getConfig();
    const scanPaths = paths.length > 0 ? paths : config.context?.sources?.map(s => s.path) || [];
    const scanExtensions = extensions.length > 0 ? extensions : 
      config.context?.sources?.flatMap(s => s.extensions || []) || ['.js', '.ts', '.py', '.md'];

    const files = [];
    
    for (const scanPath of scanPaths) {
      if (files.length >= maxFiles) break;
      
      try {
        const resolvedPath = path.resolve(scanPath);
        const stats = await fs.stat(resolvedPath);
        
        if (stats.isFile()) {
          if (this.shouldIncludeFile(resolvedPath, scanExtensions)) {
            const content = await this.readFileContent(resolvedPath);
            files.push({
              path: resolvedPath,
              relativePath: path.relative(process.cwd(), resolvedPath),
              content,
              size: content.length
            });
          }
        } else if (stats.isDirectory()) {
          const dirFiles = await this.scanDirectory(resolvedPath, scanExtensions, maxFiles - files.length);
          files.push(...dirFiles);
        }
      } catch (error) {
        console.warn(`Failed to scan path ${scanPath}:`, error.message);
      }
    }

    return files.slice(0, maxFiles);
  }

  async scanDirectory(dirPath, extensions, maxFiles) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (files.length >= maxFiles) break;
        
        if (this.shouldIgnore(entry.name)) continue;
        
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && this.shouldIncludeFile(fullPath, extensions)) {
          try {
            const content = await this.readFileContent(fullPath);
            files.push({
              path: fullPath,
              relativePath: path.relative(process.cwd(), fullPath),
              content,
              size: content.length
            });
          } catch (error) {
            console.warn(`Failed to read file ${fullPath}:`, error.message);
          }
        } else if (entry.isDirectory()) {
          const subFiles = await this.scanDirectory(fullPath, extensions, maxFiles - files.length);
          files.push(...subFiles);
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error.message);
    }

    return files;
  }

  async readFileContent(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    
    // Limit file size to prevent memory issues
    const maxSize = 100000; // 100KB
    if (content.length > maxSize) {
      return content.substring(0, maxSize) + '\n... [truncated]';
    }
    
    return content;
  }

  shouldIncludeFile(filePath, extensions) {
    const ext = path.extname(filePath).toLowerCase();
    return extensions.includes(ext);
  }

  shouldIgnore(name) {
    const ignorePatterns = [
      'node_modules',
      '.git',
      '.vscode',
      '.idea',
      'dist',
      'build',
      'coverage',
      '.env',
      '.env.local',
      '.DS_Store',
      'Thumbs.db'
    ];
    
    return ignorePatterns.some(pattern => {
      if (pattern.startsWith('.')) {
        return name === pattern || name.startsWith(pattern);
      }
      return name === pattern;
    });
  }

  async getConfiguredSources() {
    const config = await this.configService.getConfig();
    return config.context?.sources || [];
  }
}

module.exports = ContextService;