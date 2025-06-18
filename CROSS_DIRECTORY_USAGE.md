# Cross-Directory Usage Guide

This guide explains how to use the Test Running Agent to monitor projects in different directories.

## Overview

The Test Running Agent can monitor any project directory, regardless of where the agent itself is installed. This makes it easy to:
- Monitor multiple projects
- Install the agent globally
- Share configurations across teams
- Use different configurations for different projects

## Installation Options

### 1. Global Installation

Install the agent globally to use it from anywhere:

```bash
npm install -g test-running-agent
```

### 2. Local Installation

Install in a tools directory:

```bash
mkdir ~/tools/test-agent
cd ~/tools/test-agent
git clone <repo-url> .
npm install
npm run build
npm link  # Makes 'test-agent' command available globally
```

## Configuration

### 1. Project-Specific Configuration

Place `test-agent.config.json` in your project root:

```json
{
  "projectRoot": ".",  // Relative to config file
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    }
  ]
}
```

### 2. Centralized Configuration

Store configurations in a central location:

```bash
# Create configs directory
mkdir ~/.test-agent-configs

# Create project-specific configs
~/.test-agent-configs/
  ├── project-a.json
  ├── project-b.json
  └── shared-settings.json
```

### 3. Environment Variable

Set a default configuration:

```bash
export TEST_AGENT_CONFIG=~/.test-agent-configs/default.json
```

## Usage Examples

### Monitor Current Directory

```bash
# From within your project
cd ~/projects/my-app
test-agent start
```

### Monitor Different Directory

```bash
# From anywhere
test-agent start -p ~/projects/my-app

# Or with explicit config
test-agent start -c ~/configs/my-app.json -p ~/projects/my-app
```

### Multiple Projects

Create aliases for different projects:

```bash
# In ~/.bashrc or ~/.zshrc
alias test-app-a='test-agent start -c ~/.configs/app-a.json -p ~/projects/app-a'
alias test-app-b='test-agent start -c ~/.configs/app-b.json -p ~/projects/app-b'
```

### Using MCP with Different Projects

When using MCP commands in Cursor:

```bash
# Start watching a specific project
@test-running-agent start_watching projectPath: "/Users/you/projects/my-app"

# Run tests for files in that project
@test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
```

## Configuration Templates

### Multi-Project Setup

Create a base configuration:

```json
{
  "projectRoot": ".",
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70
    }
  },
  "notifications": {
    "slack": {
      "enabled": true,
      "webhookUrl": "$SLACK_WEBHOOK"
    }
  }
}
```

### Project-Specific Override

```json
{
  "extends": "~/.test-agent-configs/base.json",
  "projectRoot": "/Users/you/projects/specific-app",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["src/**/*.test.ts"],
      "command": "yarn test"
    }
  ]
}
```

## Best Practices

### 1. Use Relative Paths in Configs

```json
{
  "projectRoot": ".",  // Always relative to config file
  "testSuites": [
    {
      "pattern": ["tests/**/*.spec.ts"],  // Relative to projectRoot
      "command": "npm test"
    }
  ]
}
```

### 2. Project Structure

```
my-project/
├── src/
├── tests/
├── package.json
└── test-agent.config.json  # Project-specific config
```

### 3. CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Run Test Agent
  run: |
    npx test-running-agent start -p ${{ github.workspace }}
```

### 4. Docker Usage

```dockerfile
# Dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install -g test-running-agent
CMD ["test-agent", "start", "-p", "/app"]
```

## Troubleshooting

### Config Not Found

If the agent can't find your config:

1. Check the search order:
   - Environment variable: `TEST_AGENT_CONFIG`
   - Current directory: `./test-agent.config.json`
   - Project directory: `<project>/test-agent.config.json`
   - Parent directories (up to 3 levels)

2. Use explicit paths:
   ```bash
   test-agent start -c /absolute/path/to/config.json
   ```

### Path Resolution Issues

If paths aren't resolving correctly:

1. Check if paths in config are relative:
   ```json
   {
     "projectRoot": ".",  // Good: relative
     "projectRoot": "/Users/me/project"  // Bad: absolute
   }
   ```

2. Verify working directory:
   ```bash
   pwd  # Should show where you're running from
   test-agent start --debug  # Shows resolved paths
   ```

### Permission Issues

If you get permission errors:

1. Check file permissions:
   ```bash
   ls -la test-agent.config.json
   ```

2. For global configs:
   ```bash
   chmod 644 ~/.test-agent-configs/*.json
   ```

## Advanced Usage

### Workspace Monitoring

Monitor multiple related projects:

```json
{
  "projectRoot": ".",
  "workspaces": [
    "./packages/frontend",
    "./packages/backend",
    "./packages/shared"
  ]
}
```

### Dynamic Configuration

Use environment variables:

```json
{
  "projectRoot": "${PROJECT_DIR:-.}",
  "notifications": {
    "webhookUrl": "${WEBHOOK_URL}"
  }
}
```

### Remote Monitoring

Monitor projects on remote machines:

```bash
# SSH tunnel for WebSocket
ssh -L 3456:localhost:3456 remote-host

# Run agent on remote
ssh remote-host 'test-agent start -p /path/to/project'
```

## Examples by Use Case

### 1. Freelancer with Multiple Clients

```bash
# Structure
~/clients/
  ├── client-a/
  │   └── project/
  ├── client-b/
  │   └── project/
  └── configs/
      ├── client-a.json
      └── client-b.json

# Usage
test-agent start -c ~/clients/configs/client-a.json -p ~/clients/client-a/project
```

### 2. Monorepo

```json
{
  "projectRoot": ".",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["packages/*/src/**/*.test.ts"],
      "command": "lerna run test"
    }
  ]
}
```

### 3. Docker Development

```bash
# Mount project and config
docker run -v $(pwd):/project -v ~/.configs:/configs \
  test-agent start -c /configs/my-app.json -p /project
```

### 4. Team Shared Configuration

```bash
# Clone team configs
git clone team-configs ~/.team-test-configs

# Use team config
test-agent start -c ~/.team-test-configs/backend.json -p ./my-backend
```

## Summary

The Test Running Agent is designed to be flexible and work with any project structure:

- Install once, use everywhere
- Configuration can live anywhere
- Paths are resolved intelligently
- Works with CI/CD, Docker, and remote development
- Supports team collaboration through shared configs

For more details, see [PATH_HANDLING.md](./PATH_HANDLING.md).