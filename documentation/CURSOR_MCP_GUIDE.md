# Test Running Agent - Cursor MCP Guide

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

This guide helps you use the Test Running Agent MCP tools effectively in Cursor.

## Overview

The Test Running Agent is an automated test runner that monitors file changes and intelligently runs appropriate test suites. It integrates with Jest, Cypress, Storybook, Postman, and more.

## Common Workflows

### 1. Development Workflow
```
# Start watching files when you begin coding
@test-running-agent start_watching

# Check git status before starting
@test-running-agent check_git_status

# Make your code changes...

# Stop watching when done
@test-running-agent stop_watching
```

### 2. Pre-Commit Workflow
```
# Check if all requirements are met
@test-running-agent check_jira

# Check deployment environments
@test-running-agent check_environments

# Generate commit message
@test-running-agent generate_commit_message
```

### 3. Code Quality Check
```
# Analyze complexity of changed files
@test-running-agent analyze_complexity

# Compare complexity of specific file
@test-running-agent compare_complexity file: "src/services/auth.ts"

# Check test coverage
@test-running_agent analyze_coverage
```

## Tool Reference

### File Watching & Testing

#### `start_watching`
Start automatic test execution on file changes.
```
@test-running-agent start_watching
@test-running-agent start_watching projectPath: "/path/to/project"
```

#### `stop_watching`
Stop the file watcher.
```
@test-running-agent stop_watching
```

#### `run_tests`
Run tests for specific files.
```
@test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
@test-running-agent run_tests files: ["src/app.ts"] coverage: false
```

### Code Quality

#### `analyze_complexity`
Check cyclomatic complexity of code.
```
# Analyze all changed files
@test-running-agent analyze_complexity

# Analyze specific files
@test-running-agent analyze_complexity files: ["src/services/auth.ts", "src/utils/parser.ts"]
```

#### `compare_complexity`
Compare complexity with previous version.
```
@test-running-agent compare_complexity file: "src/services/auth.ts"
```

#### `analyze_coverage`
Get test coverage report and recommendations.
```
@test-running-agent analyze_coverage
```

### Development Support

#### `check_git_status`
Check if branch needs updates.
```
@test-running-agent check_git_status
```

#### `check_jira`
Verify JIRA ticket requirements.
```
# Auto-detect from branch
@test-running-agent check_jira

# Specific ticket
@test-running-agent check_jira ticketKey: "DEV-1234"
```

#### `check_environments`
Check deployment status.
```
@test-running-agent check_environments
```

#### `generate_commit_message`
Create intelligent commit messages.
```
@test-running-agent generate_commit_message
```

### E2E Testing

#### `run_e2e`
Run Stagehand UI tests.
```
# Run all scenarios
@test-running-agent run_e2e

# Run specific scenario
@test-running-agent run_e2e scenario: "User Login Flow" baseUrl: "http://localhost:3000"
```

### Status & Info

#### `get_status`
Check agent configuration and status.
```
@test-running-agent get_status
```

## Configuration

The agent uses `test-agent.config.json` for configuration. Key settings:

- **Test Suites**: Jest, Cypress, Storybook, Postman, Stagehand
- **Coverage Thresholds**: Unit (80%), Integration (70%), E2E (60%)
- **Complexity Thresholds**: Warning (10), Error (20)
- **Critical Paths**: Files that trigger comprehensive testing
- **Integrations**: JIRA, Jenkins, Slack, MCP

## Tips

1. **Start with `get_status`** to see what's configured
2. **Use `start_watching`** during active development
3. **Run `check_git_status`** before starting work
4. **Use `analyze_complexity`** after refactoring
5. **Check `analyze_coverage`** to find untested code
6. **Run `check_jira`** before creating PRs
7. **Use `generate_commit_message`** for consistent commits

## Troubleshooting

- **"Tool not found"**: Ensure the agent is installed: `npm run install-mcp`
- **"Configuration not found"**: Create `test-agent.config.json` from the example
- **"Build failed"**: Run `npm run build` in the test-running-agent directory
- **"Feature disabled"**: Enable the feature in `test-agent.config.json`

## Examples by Use Case

### Testing a React Component
```
# After modifying Button.tsx
@test-running-agent run_tests files: ["src/components/Button.tsx"]
```

### Testing an API Endpoint
```
# After modifying auth controller
@test-running-agent run_tests files: ["src/controllers/auth.controller.ts"]
```

### Checking Code Quality
```
# After refactoring a complex function
@test-running-agent compare_complexity file: "src/utils/dataProcessor.ts"
```

### Full Development Cycle
```
# 1. Start work
@test-running-agent check_git_status
@test-running-agent start_watching

# 2. Make changes (tests run automatically)

# 3. Check quality
@test-running-agent analyze_complexity
@test-running-agent analyze_coverage

# 4. Prepare to commit
@test-running-agent stop_watching
@test-running-agent check_jira
@test-running-agent generate_commit_message
```