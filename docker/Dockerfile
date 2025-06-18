# Production-ready multi-stage Dockerfile for Test Running Agent

# Stage 1: Dependencies
FROM node:18-alpine AS dependencies

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies for build
RUN npm ci

# Stage 2: Build
FROM dependencies AS build

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Stage 3: Production dependencies
FROM node:18-alpine AS prod-deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies (skip postinstall)
RUN npm ci --omit=dev --ignore-scripts

# Stage 4: Runtime
FROM node:18-alpine AS runtime

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    bash \
    tini \
    curl \
    jq

# Create non-root user
RUN addgroup -g 1001 -S testrunner && \
    adduser -S testrunner -u 1001

# Install test-running-agent globally
WORKDIR /opt/test-running-agent

# Copy built application
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist
COPY --from=prod-deps /app/node_modules ./node_modules

# Make available globally
RUN npm link

# Create workspace directory
RUN mkdir -p /workspace && \
    chown -R testrunner:testrunner /workspace

# Create config directory
RUN mkdir -p /config && \
    chown -R testrunner:testrunner /config

WORKDIR /workspace

# Switch to non-root user
USER testrunner

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3456/health || exit 1

# Expose ports
EXPOSE 3456

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["test-agent", "start"]