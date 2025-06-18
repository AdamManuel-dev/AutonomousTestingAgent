#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Test Running Agent for Cursor MCP${NC}\n"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js and npm first.${NC}"
    exit 1
fi

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Build the project
echo -e "${BLUE}🔨 Building the project...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please check for TypeScript errors.${NC}"
    exit 1
fi

# Check if test-agent.config.json exists
if [ ! -f "test-agent.config.json" ]; then
    echo -e "${YELLOW}⚠️  No configuration file found. Creating from example...${NC}"
    if [ -f "test-agent.config.example.json" ]; then
        cp test-agent.config.example.json test-agent.config.json
        echo -e "${GREEN}✅ Created test-agent.config.json from example${NC}"
    else
        echo -e "${BLUE}📝 Creating default configuration...${NC}"
        npm run init
    fi
fi

# Install to Cursor MCP
echo -e "${BLUE}🔧 Installing to Cursor MCP registry...${NC}"
npm run install-mcp
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install to Cursor MCP registry${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ Setup complete!${NC}\n"
echo -e "${BLUE}Next steps:${NC}"
echo -e "1. Edit ${YELLOW}test-agent.config.json${NC} to configure your settings"
echo -e "2. Restart Cursor to load the MCP server"
echo -e "3. Use the test running agent in Cursor with ${YELLOW}@test-running-agent${NC}"
echo -e "\n${BLUE}Available MCP commands:${NC}"
echo -e "  • ${YELLOW}start_watching${NC} - Start watching files for changes"
echo -e "  • ${YELLOW}stop_watching${NC} - Stop watching files"
echo -e "  • ${YELLOW}run_tests${NC} - Run tests for specific files"
echo -e "  • ${YELLOW}check_jira${NC} - Check JIRA ticket status"
echo -e "  • ${YELLOW}check_environments${NC} - Check deployment environments"
echo -e "  • ${YELLOW}generate_commit_message${NC} - Generate commit message"
echo -e "  • ${YELLOW}check_git_status${NC} - Check if branch needs pull/merge"
echo -e "  • ${YELLOW}get_status${NC} - Get current agent status"

# Make the script executable
chmod +x setup-mcp.sh