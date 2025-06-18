# Multi-stage Dockerfile for Test Running Agent CI/CD

# Stage 1: Base image with dependencies
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    git \
    bash \
    curl \
    jq \
    python3 \
    make \
    g++

# Install global dependencies
RUN npm install -g test-running-agent@latest

# Create app directory
WORKDIR /workspace

# Stage 2: Development/Test environment
FROM base AS test

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy test configuration
COPY ci/test-agent-ci.config.json ./ci/

# Copy CI scripts
COPY ci/run-ci-tests.sh ./ci/
RUN chmod +x ci/run-ci-tests.sh

# Set environment variables
ENV CI=true \
    NODE_ENV=test \
    TEST_AGENT_CONFIG=/workspace/ci/test-agent-ci.config.json

# Stage 3: CI Runner
FROM test AS ci-runner

# Copy source code
COPY . .

# Install all dependencies (including dev)
RUN npm ci

# Run tests by default
CMD ["./ci/run-ci-tests.sh"]

# Stage 4: Lightweight reporter
FROM base AS reporter

# Only copy necessary files for reporting
COPY --from=ci-runner /workspace/coverage ./coverage
COPY --from=ci-runner /workspace/test-results ./test-results
COPY --from=ci-runner /workspace/complexity-report.json ./

# Install reporting tools
RUN npm install -g \
    @codecov/codecov-uploader \
    sonarqube-scanner

# Generate and upload reports
CMD ["sh", "-c", "test-agent report --format all --upload"]

# Stage 5: Production artifact
FROM alpine:latest AS artifact

# Copy only the artifacts
COPY --from=ci-runner /workspace/artifacts /artifacts

# Add metadata
RUN echo "Build Date: $(date)" > /artifacts/build-info.txt && \
    echo "Image: test-running-agent-ci" >> /artifacts/build-info.txt

# Default command to list artifacts
CMD ["ls", "-la", "/artifacts"]