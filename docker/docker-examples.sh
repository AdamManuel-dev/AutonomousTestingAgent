#!/bin/bash

# Docker Examples for Test Running Agent
# This script demonstrates various Docker usage patterns

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🐳 Test Running Agent - Docker Examples${NC}"
echo "=============================================="

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_help() {
    cat <<EOF
Docker Examples for Test Running Agent

Usage: $0 [COMMAND]

Commands:
  build           Build all Docker images
  dev             Start development environment
  prod            Start production environment
  test            Run tests in containers
  monitoring      Start monitoring stack
  clean           Clean up containers and volumes
  quick-start     Quick start with basic setup
  multi-project   Multi-project monitoring setup
  ci              CI/CD pipeline simulation
  debug           Debug mode with logs
  help            Show this help

Examples:
  $0 quick-start     # Start basic test agent
  $0 dev             # Development with hot reload
  $0 test            # Run full test suite
  $0 monitoring      # Full monitoring stack

EOF
}

build_images() {
    log_info "Building Docker images..."
    
    # Build production image
    docker build -f docker/Dockerfile -t test-running-agent:latest .
    
    # Build development image
    docker build -f docker/Dockerfile.dev -t test-running-agent:dev .
    
    log_info "Images built successfully"
}

quick_start() {
    log_info "Quick start - Basic test agent setup"
    
    # Create minimal config if not exists
    mkdir -p docker/config
    if [ ! -f docker/config/quick-start.json ]; then
        cat > docker/config/quick-start.json <<EOF
{
  "projectRoot": "/workspace",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test",
      "enabled": true
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": { "unit": 70 }
  }
}
EOF
    fi
    
    # Run basic setup
    docker run -it --rm \
        --name test-agent-quick \
        -v "$(pwd):/workspace" \
        -v "$(pwd)/docker/config/quick-start.json:/config/test-agent.config.json:ro" \
        -p 3456:3456 \
        -e TEST_AGENT_CONFIG=/config/test-agent.config.json \
        test-running-agent:latest
}

development_setup() {
    log_info "Starting development environment with hot reload..."
    
    # Check if development profile exists
    if ! docker compose --profile dev ps >/dev/null 2>&1; then
        log_info "Starting development services..."
        docker compose --profile dev up -d
    else
        log_info "Development environment is already running"
    fi
    
    # Show logs
    log_info "Showing development logs (Ctrl+C to stop)..."
    docker compose --profile dev logs -f test-agent-dev
}

production_setup() {
    log_info "Starting production environment..."
    
    # Start production services
    docker compose up -d test-agent postgres redis
    
    # Wait for services to be ready
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Show status
    docker compose ps
    
    log_info "Production environment is running"
    log_info "WebSocket available at: http://localhost:3456"
}

run_tests() {
    log_info "Running tests in Docker containers..."
    
    # Start test infrastructure
    docker compose up -d postgres redis selenium mockserver
    
    # Wait for infrastructure
    sleep 15
    
    # Run unit tests
    log_info "Running unit tests..."
    docker run --rm \
        --network "$(basename $(pwd))_test-network" \
        -v "$(pwd):/workspace" \
        -e NODE_ENV=test \
        test-running-agent:latest \
        test-agent test --suite unit
    
    # Run integration tests
    log_info "Running integration tests..."
    docker run --rm \
        --network "$(basename $(pwd))_test-network" \
        -v "$(pwd):/workspace" \
        -e DATABASE_URL=postgresql://testuser:testpass@postgres:5432/testdb \
        -e REDIS_URL=redis://:redispass@redis:6379 \
        test-running-agent:latest \
        test-agent test --suite integration
    
    # Run E2E tests
    log_info "Running E2E tests..."
    docker run --rm \
        --network "$(basename $(pwd))_test-network" \
        -v "$(pwd):/workspace" \
        -e SELENIUM_URL=http://selenium:4444/wd/hub \
        test-running-agent:latest \
        test-agent test --suite e2e
    
    log_info "All tests completed"
}

monitoring_stack() {
    log_info "Starting full monitoring stack..."
    
    # Start all monitoring services
    docker compose up -d \
        test-agent \
        postgres \
        redis \
        prometheus \
        grafana \
        elasticsearch \
        kibana \
        nginx
    
    # Wait for services
    log_info "Waiting for monitoring services to start..."
    sleep 30
    
    # Show status
    docker compose ps
    
    cat <<EOF

${GREEN}Monitoring Stack Started Successfully!${NC}

Access the following services:
- Test Agent WebSocket: http://localhost:3456
- Grafana Dashboard:    http://localhost/grafana (admin/admin123)
- Prometheus Metrics:   http://localhost/prometheus
- Kibana Logs:         http://localhost/kibana
- Nginx Proxy:         http://localhost

EOF
}

multi_project_setup() {
    log_info "Setting up multi-project monitoring..."
    
    # Create project configs
    mkdir -p docker/projects/{project-a,project-b}
    
    # Project A config
    cat > docker/projects/project-a/test-agent.config.json <<EOF
{
  "projectRoot": "/workspace/project-a",
  "projectName": "Project A - Backend API",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    },
    {
      "type": "postman",
      "pattern": ["**/*.postman_collection.json"],
      "command": "newman run"
    }
  ]
}
EOF
    
    # Project B config
    cat > docker/projects/project-b/test-agent.config.json <<EOF
{
  "projectRoot": "/workspace/project-b",
  "projectName": "Project B - Frontend App",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.tsx"],
      "command": "npm test"
    },
    {
      "type": "cypress",
      "pattern": ["**/*.cy.ts"],
      "command": "cypress run"
    }
  ]
}
EOF
    
    # Start multi-project setup
    docker network create test-multi-network 2>/dev/null || true
    
    # Project A agent
    docker run -d \
        --name test-agent-project-a \
        --network test-multi-network \
        -v "$(pwd)/example-projects/project-a:/workspace/project-a" \
        -v "$(pwd)/docker/projects/project-a/test-agent.config.json:/config/test-agent.config.json:ro" \
        -e TEST_AGENT_CONFIG=/config/test-agent.config.json \
        -e PROJECT_NAME=project-a \
        -p 3456:3456 \
        test-running-agent:latest
    
    # Project B agent
    docker run -d \
        --name test-agent-project-b \
        --network test-multi-network \
        -v "$(pwd)/example-projects/project-b:/workspace/project-b" \
        -v "$(pwd)/docker/projects/project-b/test-agent.config.json:/config/test-agent.config.json:ro" \
        -e TEST_AGENT_CONFIG=/config/test-agent.config.json \
        -e PROJECT_NAME=project-b \
        -p 3457:3456 \
        test-running-agent:latest
    
    log_info "Multi-project setup completed"
    log_info "Project A: http://localhost:3456"
    log_info "Project B: http://localhost:3457"
}

ci_simulation() {
    log_info "Simulating CI/CD pipeline..."
    
    # Build test image
    docker build -f ci/Dockerfile -t test-agent-ci:latest .
    
    # Run CI pipeline
    docker run --rm \
        -v "$(pwd):/workspace" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        -e CI=true \
        -e COVERAGE_THRESHOLD=80 \
        -e BASE_BRANCH=main \
        test-agent-ci:latest
    
    log_info "CI simulation completed"
}

debug_mode() {
    log_info "Starting debug mode with detailed logging..."
    
    # Start with debug logging
    docker run -it --rm \
        --name test-agent-debug \
        -v "$(pwd):/workspace" \
        -v "$(pwd)/docker/config/test-agent.config.json:/config/test-agent.config.json:ro" \
        -p 3456:3456 \
        -p 9229:9229 \
        -e DEBUG=test-agent:* \
        -e NODE_ENV=development \
        -e TEST_AGENT_CONFIG=/config/test-agent.config.json \
        test-running-agent:dev
}

cleanup() {
    log_warn "Cleaning up Docker containers and volumes..."
    
    # Stop all containers
    docker compose down -v
    
    # Remove custom containers
    docker rm -f test-agent-project-a test-agent-project-b 2>/dev/null || true
    
    # Remove custom networks
    docker network rm test-multi-network 2>/dev/null || true
    
    # Prune unused images (optional)
    read -p "Remove unused Docker images? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        docker image prune -f
    fi
    
    log_info "Cleanup completed"
}

# Main script logic
case "${1:-help}" in
    build)
        build_images
        ;;
    dev|development)
        development_setup
        ;;
    prod|production)
        production_setup
        ;;
    test)
        run_tests
        ;;
    monitoring)
        monitoring_stack
        ;;
    quick-start|quick)
        quick_start
        ;;
    multi-project|multi)
        multi_project_setup
        ;;
    ci|pipeline)
        ci_simulation
        ;;
    debug)
        debug_mode
        ;;
    clean|cleanup)
        cleanup
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac