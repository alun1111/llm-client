# LLM Client

A web-based chat interface for interacting with Large Language Models (LLMs) with codebase context integration. Designed for corporate deployment on Windows/Linux systems.

## Features

- **Multi-Provider Support**: OpenAI and Anthropic models
- **Context-Aware**: Automatically scans and includes codebase files as context
- **Web-Based**: No client installation required, runs in any browser
- **Corporate Ready**: Docker deployment, secure configuration
- **Real-Time Chat**: Interactive conversation interface
- **Configuration Management**: YAML-based configuration system

## Quick Start

### Prerequisites

- Node.js 18+ (for development)
- Docker (for production deployment)
- API keys for desired LLM providers

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd llm-client
   npm run install:all
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

3. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

### Production Deployment

1. **Using Docker Compose**
   ```bash
   # Copy environment file
   cp .env.example .env
   # Edit .env with production settings
   
   # Start the application
   docker-compose up -d
   ```

2. **Manual Docker Build**
   ```bash
   docker build -t llm-client .
   docker run -p 3001:3001 --env-file .env llm-client
   ```

## Configuration

Edit `config/app.yml` to customize:

- **LLM Providers**: Add/remove model support
- **Context Sources**: Specify which files/directories to scan
- **Security Settings**: Rate limiting, file access controls

Example configuration:
```yaml
llm:
  default_provider: "openai"
  providers:
    openai:
      models: ["gpt-4", "gpt-3.5-turbo"]

context:
  max_files: 100
  sources:
    - type: "directory"
      path: "./src"
      extensions: [".js", ".ts", ".py"]
```

## Usage

1. **Select Model**: Choose from available LLM providers
2. **Scan Context**: Load codebase files for context
3. **Chat**: Ask questions about your code
4. **View Context**: Inspect loaded files and configuration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

## API Endpoints

- `POST /api/chat` - Send chat messages
- `GET /api/chat/models` - List available models
- `POST /api/context/scan` - Scan codebase for context
- `GET /api/config` - Get configuration
- `GET /health` - Health check

## Security

- Rate limiting (100 requests per 15 minutes)
- CORS protection
- Input validation and sanitization
- Secure API key handling
- File access restrictions

## Troubleshooting

**No models available:**
- Check API keys in `.env` file
- Verify internet connectivity

**Context scan fails:**
- Check file paths in `config/app.yml`
- Ensure proper file permissions

**Docker build fails:**
- Verify Node.js version compatibility
- Check available disk space

### Docker Deployment Issues

**Build timeouts or slow builds:**
- The Docker build process can take 2-5 minutes due to npm dependencies
- Frontend build includes 1300+ packages with some deprecation warnings (normal)
- Use `--progress=plain` flag for detailed build output
- Consider increasing Docker build timeout in CI/CD environments

**Container startup issues:**
- **Port conflicts**: If port 3001 is in use, map to different port: `-p 3002:3001`
- **Environment setup**: Ensure `.env` file exists (copy from `.env.example`)
- **Volume mounts**: Create required directories before starting:
  ```bash
  mkdir -p config data
  cp .env.example .env
  ```

**Docker Compose not available:**
- Some systems have `docker compose` (v2) instead of `docker-compose` (v1)
- Alternative: Run container directly:
  ```bash
  docker run -d --name llm-client \
    -p 3001:3001 \
    --env-file .env \
    -v $(pwd)/config:/app/config:ro \
    -v $(pwd)/data:/app/data \
    llm-client
  ```

**Health check failures:**
- Container may take 30-60 seconds to fully start
- Health endpoint available at `/health` returns JSON status
- Check logs: `docker logs <container-name>`

**Frontend serving issues:**
- Ensure frontend build completed successfully during Docker build
- Static files served from `/app/frontend/build` inside container
- 404 errors on root path indicate missing frontend build artifacts

## Development

### Project Structure
```
llm-client/
├── backend/          # Node.js/Express API
├── frontend/         # React TypeScript app
├── config/           # Configuration files
├── docker/           # Docker setup
└── shared/           # Common utilities
```

### Scripts

- `npm run dev` - Start development servers
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run install:all` - Install all dependencies

## License

MIT License - see LICENSE file for details.