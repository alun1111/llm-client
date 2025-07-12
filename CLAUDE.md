# llm client

This application provides a simple chat interface with an underlying llm (model can vary - API key should be provided in .env file). This is a web-based application designed for corporate deployment. The purpose of this tool is to allow a standard non-dev team user to ask questions about the code base and will utilize a pre-defined (via configuration) set of context sources.

## Technology Stack

**Frontend:** React web application
- Modern React with TypeScript
- Responsive design for desktop/mobile browsers
- Real-time chat interface

**Backend:** Node.js/Express API server
- RESTful API for LLM interactions
- File system scanning for context sources
- Configuration management
- Secure API key handling

**Deployment:** Docker containerized
- Single container with frontend + backend
- Easy deployment to corporate Windows/Linux servers
- Accessible via standard web browsers
- No client-side installation required

**Security:**
- Environment-based secret management
- HTTPS enforcement
- Corporate authentication integration ready



