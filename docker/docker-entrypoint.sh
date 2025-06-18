#!/bin/bash

# Docker entrypoint script for Test Running Agent
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🐳 Starting Test Running Agent in Docker${NC}"

# Environment setup
export NODE_ENV=${NODE_ENV:-production}
export TEST_AGENT_CONFIG=${TEST_AGENT_CONFIG:-/config/test-agent.config.json}

# Wait for dependencies function
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local timeout=${4:-30}
    
    echo -e "${YELLOW}⏳ Waiting for $service_name ($host:$port)...${NC}"
    
    for i in $(seq 1 $timeout); do
        if nc -z "$host" "$port" 2>/dev/null; then
            echo -e "${GREEN}✅ $service_name is ready${NC}"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}❌ Timeout waiting for $service_name${NC}"
    return 1
}

# Check if running in Docker environment
if [ -f /.dockerenv ]; then
    echo -e "${GREEN}📦 Running in Docker container${NC}"
    
    # Wait for dependent services if they exist
    if [ "$DATABASE_URL" ]; then
        # Extract host and port from DATABASE_URL
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        wait_for_service "$DB_HOST" "$DB_PORT" "PostgreSQL" 60
    fi
    
    if [ "$REDIS_URL" ]; then
        # Extract host and port from REDIS_URL
        REDIS_HOST=$(echo $REDIS_URL | sed -n 's/.*\/\/\([^:]*\).*/\1/p')
        REDIS_PORT=$(echo $REDIS_URL | sed -n 's/.*:\([0-9]*\).*/\1/p')
        wait_for_service "$REDIS_HOST" "$REDIS_PORT" "Redis" 30
    fi
    
    # Check for selenium service
    if getent hosts selenium >/dev/null 2>&1; then
        wait_for_service "selenium" "4444" "Selenium" 60
    fi
    
    # Check for mockserver service
    if getent hosts mockserver >/dev/null 2>&1; then
        wait_for_service "mockserver" "1080" "MockServer" 30
    fi
fi

# Configuration validation
if [ ! -f "$TEST_AGENT_CONFIG" ]; then
    echo -e "${YELLOW}⚠️  Config file not found at $TEST_AGENT_CONFIG${NC}"
    echo -e "${YELLOW}   Creating default configuration...${NC}"
    
    mkdir -p "$(dirname "$TEST_AGENT_CONFIG")"
    
    cat > "$TEST_AGENT_CONFIG" <<EOF
{
  "projectRoot": "/workspace",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": { "unit": 80 }
  }
}
EOF
    
    echo -e "${GREEN}✅ Default configuration created${NC}"
fi

# Validate configuration
echo -e "${YELLOW}🔍 Validating configuration...${NC}"
if ! test-agent validate --config "$TEST_AGENT_CONFIG"; then
    echo -e "${RED}❌ Configuration validation failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration is valid${NC}"

# Set up git configuration if in development mode
if [ "$NODE_ENV" = "development" ]; then
    if [ ! -f ~/.gitconfig ]; then
        echo -e "${YELLOW}⚙️  Setting up git configuration...${NC}"
        git config --global user.name "Docker Test Runner"
        git config --global user.email "test@docker.local"
        git config --global init.defaultBranch main
    fi
fi

# Create necessary directories
mkdir -p /workspace/{coverage,test-results,artifacts}
mkdir -p /tmp/test-cache

# Set permissions
if [ "$(id -u)" = "0" ]; then
    # Running as root, fix permissions
    chown -R 1001:1001 /workspace /tmp/test-cache 2>/dev/null || true
fi

echo -e "${GREEN}🚀 Starting Test Running Agent...${NC}"

# Execute the main command
if [ "$#" -eq 0 ]; then
    # No arguments provided, run default command
    exec test-agent start --config "$TEST_AGENT_CONFIG"
else
    # Arguments provided, execute them
    exec "$@"
fi