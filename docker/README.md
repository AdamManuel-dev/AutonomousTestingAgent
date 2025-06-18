# Docker Setup for Test Running Agent

This directory contains comprehensive Docker configurations for running the Test Running Agent in various environments.

## Quick Start

```bash
# Build the image
docker build -f docker/Dockerfile -t test-running-agent:latest .

# Run with your project
docker run -it --rm \
  -v $(pwd):/workspace \
  -p 3456:3456 \
  test-running-agent:latest

# Or use the examples script
./docker/docker-examples.sh quick-start
```

## File Structure

```
docker/
├── Dockerfile                 # Production image
├── Dockerfile.dev            # Development image with hot reload
├── docker-compose.yml        # Complete multi-service setup
├── docker-entrypoint.sh      # Smart entrypoint script
├── docker-examples.sh        # Usage examples script
├── config/
│   └── test-agent.config.json # Docker-optimized configuration
├── nginx/
│   └── nginx.conf            # Reverse proxy configuration
└── README.md                 # This file
```

## Available Images

### Production Image (`Dockerfile`)
- Multi-stage build for optimal size
- Non-root user for security
- Health checks included
- Tini for proper signal handling

### Development Image (`Dockerfile.dev`)
- Hot reload with nodemon
- Debugging support on port 9229
- Development tools included
- Full shell environment

## Usage Examples

### 1. Development Environment

```bash
# Start development with hot reload
./docker/docker-examples.sh dev

# Or manually
docker compose --profile dev up -d
```

### 2. Production Environment

```bash
# Full production stack
./docker/docker-examples.sh prod

# Access at http://localhost:3456
```

### 3. Run Tests

```bash
# Run all test suites in containers
./docker/docker-examples.sh test
```

### 4. Monitoring Stack

```bash
# Start with Grafana, Prometheus, etc.
./docker/docker-examples.sh monitoring

# Access:
# - Grafana: http://localhost/grafana
# - Prometheus: http://localhost/prometheus
# - Kibana: http://localhost/kibana
```

### 5. Multi-Project Setup

```bash
# Monitor multiple projects
./docker/docker-examples.sh multi-project
```

## Docker Compose Services

| Service | Purpose | Port | Health Check |
|---------|---------|------|-------------|
| test-agent | Main application | 3456 | ✅ |
| postgres | Database for tests | 5432 | ✅ |
| redis | Caching/sessions | 6379 | ✅ |
| selenium | Browser automation | 4444 | ✅ |
| mockserver | API mocking | 1080 | ✅ |
| prometheus | Metrics collection | 9090 | ✅ |
| grafana | Dashboards | 3000 | ✅ |
| kibana | Log visualization | 5601 | ✅ |
| nginx | Reverse proxy | 80/443 | ✅ |

## Environment Variables

### Essential Variables
```bash
TEST_AGENT_CONFIG=/config/test-agent.config.json
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@postgres:5432/db
REDIS_URL=redis://:pass@redis:6379
```

### Notification Variables
```bash
SLACK_WEBHOOK=https://hooks.slack.com/...
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_USER=user@example.com
EMAIL_SMTP_PASS=password
```

### CI/CD Variables
```bash
CI=true
COVERAGE_THRESHOLD=80
BASE_BRANCH=main
BUILD_NUMBER=123
BUILD_URL=https://ci.example.com/build/123
```

## Volumes

### Named Volumes
```yaml
volumes:
  postgres_data:     # Database persistence
  redis_data:        # Redis persistence
  test-cache:        # Test result cache
  prometheus_data:   # Metrics storage
  grafana_data:      # Dashboard config
```

### Mount Points
```bash
# Project source code
-v $(pwd):/workspace

# Configuration
-v ./config.json:/config/test-agent.config.json:ro

# Cache (performance)
-v test-cache:/tmp/test-cache
```

## Networking

### Default Network
- Network: `test-network`
- Subnet: `172.20.0.0/16`
- Driver: `bridge`

### Service Discovery
```bash
# Services can communicate by name
http://postgres:5432
http://redis:6379
http://selenium:4444
```

## Configuration

### Docker-Optimized Config
```json
{
  "projectRoot": "/workspace",
  "docker": {
    "enabled": true,
    "containerName": "test-agent",
    "networkName": "test-network"
  },
  "integrations": {
    "database": {
      "host": "postgres",
      "port": 5432
    },
    "redis": {
      "host": "redis",
      "port": 6379
    }
  }
}
```

## Advanced Usage

### 1. Custom Network

```bash
# Create custom network
docker network create my-test-network

# Run with custom network
docker run --network my-test-network test-running-agent
```

### 2. Resource Limits

```yaml
services:
  test-agent:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 3. Security Hardening

```yaml
services:
  test-agent:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - CHOWN
    read_only: true
    user: "1001:1001"
```

### 4. Health Monitoring

```bash
# Check service health
docker compose ps

# View health status
docker inspect test-agent --format='{{.State.Health.Status}}'

# View health logs
docker inspect test-agent --format='{{range .State.Health.Log}}{{.Output}}{{end}}'
```

## CI/CD Integration

### GitHub Actions
```yaml
- name: Test with Docker
  run: |
    docker compose -f docker/docker-compose.yml run --rm test-agent \
      test-agent test --coverage
```

### GitLab CI
```yaml
test:
  image: docker:latest
  services:
    - docker:dind
  script:
    - docker compose run test-agent test-agent test
```

### Jenkins Pipeline
```groovy
stage('Docker Test') {
    steps {
        sh 'docker compose run test-agent test-agent test'
    }
}
```

## Troubleshooting

### Common Issues

1. **Permission Denied**
```bash
# Fix ownership
docker run --rm -v $(pwd):/workspace alpine chown -R 1001:1001 /workspace
```

2. **Port Already in Use**
```bash
# Find what's using the port
lsof -i :3456

# Use different port
docker run -p 3457:3456 test-running-agent
```

3. **Out of Memory**
```bash
# Increase Docker memory limit
# Docker Desktop: Settings > Resources > Memory

# Check memory usage
docker stats test-agent
```

4. **Network Issues**
```bash
# Debug network connectivity
docker run --rm --network container:test-agent alpine ping postgres

# Reset Docker networks
docker network prune
```

### Debug Mode

```bash
# Run in debug mode
./docker/docker-examples.sh debug

# View logs
docker compose logs -f test-agent

# Execute shell in container
docker exec -it test-agent bash
```

## Performance Tips

### 1. Use Build Cache
```dockerfile
# Copy package.json first
COPY package*.json ./
RUN npm ci

# Copy source code last
COPY . .
```

### 2. Multi-stage Builds
```dockerfile
FROM node:18 AS builder
# Build stage

FROM node:18-alpine AS runtime
# Runtime stage
```

### 3. Volume Optimization
```bash
# Use named volumes for node_modules
-v node_modules:/workspace/node_modules

# Cache npm packages
-v npm_cache:/home/node/.npm
```

### 4. Resource Limits
```yaml
deploy:
  resources:
    limits:
      memory: 1G
      cpus: '1.0'
```

## Monitoring and Observability

### Metrics Collection
- Prometheus scrapes metrics from test-agent
- Grafana visualizes performance data
- Custom dashboards for test metrics

### Log Aggregation
- Elasticsearch stores all logs
- Kibana provides search and visualization
- Structured logging with JSON format

### Health Checks
- HTTP health endpoints
- Container health checks
- Service dependency monitoring

## Contributing

When adding new Docker features:

1. Update relevant Dockerfile
2. Add to docker-compose.yml if needed
3. Update configuration examples
4. Add to docker-examples.sh script
5. Update this README

## See Also

- [CI/CD Integration Guide](../CI_CD_INTEGRATION.md)
- [Cross-Directory Usage](../CROSS_DIRECTORY_USAGE.md)
- [Main Documentation](../README.md)