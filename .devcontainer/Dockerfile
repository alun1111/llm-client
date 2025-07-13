FROM node:18-bullseye

# Install additional packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends \
    git \
    curl \
    wget \
    vim \
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Create workspace directory
WORKDIR /workspace

# Copy package files for dependency installation
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm install
RUN cd backend && npm install
RUN cd frontend && npm install

# Set up git safe directory
RUN git config --global --add safe.directory /workspace

# Create non-root user
RUN groupadd --gid 1000 node \
    && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

# Switch to non-root user
USER node