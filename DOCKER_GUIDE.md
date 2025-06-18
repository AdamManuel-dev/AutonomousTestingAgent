# Docker Container Guide for Test Running Agent

This guide provides comprehensive examples for running the Test Running Agent in Docker containers for various use cases.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Production Dockerfile](#production-dockerfile)
3. [Development Setup](#development-setup)
4. [Multi-Project Monitoring](#multi-project-monitoring)
5. [Docker Compose Examples](#docker-compose-examples)
6. [Kubernetes Deployment](#kubernetes-deployment)
7. [Best Practices](#best-practices)

## Quick Start

### Basic Docker Run

```bash
# Build the image
docker build -t test-running-agent .

# Run with current directory mounted
docker run -it --rm \
  -v $(pwd):/workspace \
  -v /workspace/node_modules \
  test-running-agent start

# Run with specific config
docker run -it --rm \
  -v $(pwd):/workspace \
  -v ~/.test-agent/config.json:/config/test-agent.config.json \
  -e TEST_AGENT_CONFIG=/config/test-agent.config.json \
  test-running-agent start
```

## Production Dockerfile

### Dockerfile

```dockerfile
# Production-ready Dockerfile for Test Running Agent
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache python3 make g++ git

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

# Install runtime dependencies
RUN apk add --no-cache git bash tini

# Create non-root user
RUN addgroup -g 1001 -S testrunner && \
    adduser -S testrunner -u 1001

# Install test-running-agent globally
COPY --from=builder /app /opt/test-running-agent
RUN cd /opt/test-running-agent && npm link

# Create working directory
WORKDIR /workspace

# Use non-root user
USER testrunner

# Use tini for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Default command
CMD ["test-agent", "start"]
```

## Development Setup

### docker-compose.dev.yml

```yaml
version: '3.8'

services:
  test-agent:
    build:
      context: .
      dockerfile: Dockerfile.dev
    volumes:
      # Mount source code
      - .:/workspace
      # Persist node_modules
      - node_modules:/workspace/node_modules
      # Mount npm cache
      - npm_cache:/home/node/.npm
      # Socket for Docker-in-Docker (if needed)
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - NODE_ENV=development
      - DEBUG=test-agent:*
      - FORCE_COLOR=1
    ports:
      - "3456:3456"  # Cursor WebSocket
      - "9229:9229"  # Node.js debugger
    stdin_open: true
    tty: true
    command: npm run dev

  # Supporting services for testing
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: test_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  node_modules:
  npm_cache:
  postgres_data:
```

### Dockerfile.dev

```dockerfile
# Development Dockerfile with hot reload and debugging
FROM node:18

# Install additional tools for development
RUN apt-get update && apt-get install -y \
    vim \
    curl \
    wget \
    jq \
    htop \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# Install global development tools
RUN npm install -g \
    nodemon \
    ts-node \
    typescript \
    @types/node

# Create app directory
WORKDIR /workspace

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm install

# Expose ports
EXPOSE 3456 9229

# Development command with hot reload
CMD ["nodemon", "--inspect=0.0.0.0:9229", "src/index.ts"]
```

## Multi-Project Monitoring

### Docker Setup for Multiple Projects

```yaml
# docker-compose.multi-project.yml
version: '3.8'

services:
  # Central test agent service
  test-agent-central:
    image: test-running-agent:latest
    volumes:
      - ./configs:/configs:ro
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - AGENT_MODE=orchestrator
    networks:
      - monitoring
    command: ["test-agent", "orchestrate"]

  # Project A monitor
  project-a-monitor:
    image: test-running-agent:latest
    volumes:
      - ~/projects/project-a:/workspace
      - ./configs/project-a.json:/config/test-agent.config.json:ro
    environment:
      - TEST_AGENT_CONFIG=/config/test-agent.config.json
      - PROJECT_NAME=project-a
    networks:
      - monitoring
    labels:
      - "test-agent.project=project-a"
      - "test-agent.team=backend"

  # Project B monitor
  project-b-monitor:
    image: test-running-agent:latest
    volumes:
      - ~/projects/project-b:/workspace
      - ./configs/project-b.json:/config/test-agent.config.json:ro
    environment:
      - TEST_AGENT_CONFIG=/config/test-agent.config.json
      - PROJECT_NAME=project-b
    networks:
      - monitoring
    labels:
      - "test-agent.project=project-b"
      - "test-agent.team=frontend"

  # Shared notification service
  notifier:
    image: test-running-agent:latest
    environment:
      - SLACK_WEBHOOK=${SLACK_WEBHOOK}
      - NOTIFICATION_MODE=aggregate
    networks:
      - monitoring
    command: ["test-agent", "notify", "--listen"]

  # Dashboard
  dashboard:
    image: test-running-agent-dashboard:latest
    ports:
      - "8080:8080"
    environment:
      - API_ENDPOINTS=test-agent-central:3456
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge
```

## Docker Compose Examples

### 1. Full Stack Application Testing

```yaml
# docker-compose.fullstack.yml
version: '3.8'

services:
  # Frontend application
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://backend:4000
    networks:
      - app-network

  # Backend API
  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/app
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - app-network

  # Test Running Agent
  test-agent:
    image: test-running-agent:latest
    volumes:
      - .:/workspace
      - ./test-agent.config.json:/config/test-agent.config.json
    environment:
      - TEST_AGENT_CONFIG=/config/test-agent.config.json
      - FRONTEND_URL=http://frontend:3000
      - BACKEND_URL=http://backend:4000
    depends_on:
      - frontend
      - backend
    networks:
      - app-network
    command: >
      sh -c "
        echo 'Waiting for services to be ready...' &&
        sleep 10 &&
        test-agent test --suite e2e --env docker
      "

  # Database
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network

  # Cache
  redis:
    image: redis:7-alpine
    networks:
      - app-network

  # Browser for E2E tests
  selenium:
    image: selenium/standalone-chrome:latest
    shm_size: 2gb
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### 2. Microservices Testing

```yaml
# docker-compose.microservices.yml
version: '3.8'

services:
  # Service registry
  consul:
    image: consul:latest
    ports:
      - "8500:8500"
    networks:
      - microservices

  # API Gateway
  api-gateway:
    build: ./services/gateway
    ports:
      - "8080:8080"
    environment:
      - CONSUL_HOST=consul
    networks:
      - microservices

  # Microservice A
  service-a:
    build: ./services/service-a
    environment:
      - SERVICE_NAME=service-a
      - CONSUL_HOST=consul
    networks:
      - microservices
    deploy:
      replicas: 2

  # Microservice B
  service-b:
    build: ./services/service-b
    environment:
      - SERVICE_NAME=service-b
      - CONSUL_HOST=consul
    networks:
      - microservices
    deploy:
      replicas: 2

  # Test Agent for each service
  test-agent-gateway:
    image: test-running-agent:latest
    volumes:
      - ./services/gateway:/workspace
      - ./configs/gateway.json:/config/test-agent.config.json
    environment:
      - TEST_AGENT_CONFIG=/config/test-agent.config.json
      - SERVICE_NAME=gateway
    networks:
      - microservices

  test-agent-service-a:
    image: test-running-agent:latest
    volumes:
      - ./services/service-a:/workspace
      - ./configs/service-a.json:/config/test-agent.config.json
    environment:
      - TEST_AGENT_CONFIG=/config/test-agent.config.json
      - SERVICE_NAME=service-a
    networks:
      - microservices

  # Contract testing
  pact-broker:
    image: pactfoundation/pact-broker:latest
    ports:
      - "9292:9292"
    environment:
      - PACT_BROKER_DATABASE_URL=postgres://user:pass@postgres/pact
    networks:
      - microservices

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    networks:
      - microservices

networks:
  microservices:
    driver: overlay
```

### 3. Isolated Testing Environment

```yaml
# docker-compose.isolated.yml
version: '3.8'

services:
  test-agent:
    build:
      context: .
      dockerfile: Dockerfile.isolated
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
      - /run
    volumes:
      - ./src:/workspace/src:ro
      - ./tests:/workspace/tests:ro
      - ./package.json:/workspace/package.json:ro
      - test-results:/workspace/test-results
    environment:
      - NODE_ENV=test
      - CI=true
    networks:
      - isolated-network
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID

networks:
  isolated-network:
    driver: bridge
    internal: true

volumes:
  test-results:
```

## Kubernetes Deployment

### k8s-deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: test-running-agent
  namespace: testing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: test-running-agent
  template:
    metadata:
      labels:
        app: test-running-agent
    spec:
      containers:
      - name: test-agent
        image: test-running-agent:latest
        resources:
          limits:
            memory: "1Gi"
            cpu: "1000m"
          requests:
            memory: "512Mi"
            cpu: "500m"
        env:
        - name: AGENT_MODE
          value: "kubernetes"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        volumeMounts:
        - name: config
          mountPath: /config
        - name: workspace
          mountPath: /workspace
      volumes:
      - name: config
        configMap:
          name: test-agent-config
      - name: workspace
        persistentVolumeClaim:
          claimName: test-workspace-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: test-agent-service
  namespace: testing
spec:
  selector:
    app: test-running-agent
  ports:
  - port: 3456
    targetPort: 3456
    name: websocket
  - port: 8080
    targetPort: 8080
    name: api
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-agent-config
  namespace: testing
data:
  test-agent.config.json: |
    {
      "projectRoot": "/workspace",
      "kubernetes": {
        "enabled": true,
        "namespace": "testing",
        "serviceAccount": "test-runner"
      }
    }
```

### Helm Chart

```yaml
# helm/test-agent/values.yaml
replicaCount: 3

image:
  repository: test-running-agent
  pullPolicy: IfNotPresent
  tag: "latest"

service:
  type: ClusterIP
  port: 3456

ingress:
  enabled: true
  className: "nginx"
  annotations:
    nginx.ingress.kubernetes.io/websocket-services: "test-agent-service"
  hosts:
    - host: test-agent.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 1000m
    memory: 1Gi
  requests:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

persistence:
  enabled: true
  size: 10Gi
  storageClass: "fast-ssd"

config:
  projectRoot: "/workspace"
  testSuites:
    - type: "jest"
      enabled: true
    - type: "cypress"
      enabled: true
```

## Best Practices

### 1. Dockerfile Optimization

```dockerfile
# Optimized multi-stage Dockerfile
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runtime
RUN apk add --no-cache tini git
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./

USER nodejs
EXPOSE 3456

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
```

### 2. Security Considerations

```yaml
# docker-compose.secure.yml
version: '3.8'

services:
  test-agent:
    image: test-running-agent:latest
    security_opt:
      - no-new-privileges:true
      - seccomp:unconfined
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
      - SETUID
      - SETGID
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
    user: "1001:1001"
    environment:
      - NODE_ENV=production
    secrets:
      - slack_webhook
      - api_keys

secrets:
  slack_webhook:
    external: true
  api_keys:
    external: true
```

### 3. Resource Management

```yaml
# Resource limits for different environments
services:
  test-agent-dev:
    image: test-running-agent:latest
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  test-agent-staging:
    image: test-running-agent:latest
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M

  test-agent-prod:
    image: test-running-agent:latest
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 4. Monitoring and Logging

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  test-agent:
    image: test-running-agent:latest
    labels:
      - "prometheus.io/scrape=true"
      - "prometheus.io/port=9090"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "service=test-agent"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3456/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Log aggregation
  fluentd:
    image: fluent/fluentd:latest
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    ports:
      - "24224:24224"

  # Metrics collection
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  # Visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
```

## Troubleshooting

### Common Issues and Solutions

1. **Permission Issues**
```bash
# Fix ownership
docker run --rm -v $(pwd):/workspace alpine chown -R 1001:1001 /workspace

# Run with proper user
docker run --user $(id -u):$(id -g) test-running-agent
```

2. **Network Issues**
```bash
# Debug network connectivity
docker run --rm --network container:test-agent alpine ping backend

# Use host network
docker run --network host test-running-agent
```

3. **Volume Mount Issues**
```bash
# Use named volumes
docker volume create test-workspace
docker run -v test-workspace:/workspace test-running-agent

# Debug mounts
docker run --rm -v $(pwd):/workspace alpine ls -la /workspace
```

4. **Memory Issues**
```bash
# Increase memory limits
docker run -m 2g --memory-swap 2g test-running-agent

# Monitor memory usage
docker stats test-running-agent
```

## Summary

This guide provides comprehensive examples for running the Test Running Agent in Docker containers across various scenarios:

- Development environments with hot reload
- Production deployments with security hardening
- Multi-project monitoring setups
- Microservices testing orchestration
- Kubernetes deployments
- CI/CD pipeline integration

Each example can be adapted to specific needs and combined with other Docker best practices for optimal results.