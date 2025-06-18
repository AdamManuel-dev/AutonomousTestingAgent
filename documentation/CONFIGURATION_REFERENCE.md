# Configuration Reference Guide

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Configuration Overview](#configuration-overview)
2. [Core Configuration](#core-configuration)
3. [Test Suite Configuration](#test-suite-configuration)
4. [Integration Configurations](#integration-configurations)
5. [Advanced Settings](#advanced-settings)
6. [Environment Variables](#environment-variables)
7. [Configuration Discovery](#configuration-discovery)
8. [Validation and Debugging](#validation-and-debugging)
9. [Complete Configuration Examples](#complete-configuration-examples)
10. [Migration and Upgrades](#migration-and-upgrades)

---

## Configuration Overview

The Test Running Agent uses a JSON configuration file that controls all aspects of the agent's behavior. The configuration system is designed to be:

- **Flexible**: Support for environment variables and dynamic paths
- **Discoverable**: Automatic configuration file discovery
- **Extensible**: Easy to add new features and integrations
- **Validated**: Comprehensive validation with helpful error messages

### Configuration File Names

The agent searches for configuration files in this order:
1. `test-agent.config.json` (recommended)
2. `test-runner.config.json`
3. `.test-agent.json`
4. `package.json` (under `testAgent` key)

---

## Core Configuration

### Basic Structure

```json
{
  "projectRoot": "./",
  "testSuites": [...],
  "excludePatterns": [...],
  "debounceMs": 1000,
  "cursorPort": 3456
}
```

### Core Properties

#### `projectRoot`
**Type**: `string`  
**Default**: `"./"`  
**Description**: Root directory of the project to monitor

```json
{
  "projectRoot": "./my-project",           // Relative path
  "projectRoot": "/absolute/path/project", // Absolute path
  "projectRoot": "${PROJECT_ROOT}"         // Environment variable
}
```

#### `excludePatterns`
**Type**: `string[]`  
**Default**: `["**/node_modules/**", "**/dist/**", "**/.git/**"]`  
**Description**: Glob patterns for files/directories to ignore during monitoring

```json
{
  "excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/*.log"
  ]
}
```

#### `debounceMs`
**Type**: `number`  
**Default**: `1000`  
**Description**: Milliseconds to wait before processing file changes (prevents excessive test runs)

```json
{
  "debounceMs": 1000,  // 1 second
  "debounceMs": 2500,  // 2.5 seconds for slower systems
  "debounceMs": 500    // 0.5 seconds for faster feedback
}
```

#### `cursorPort`
**Type**: `number`  
**Default**: `3456`  
**Description**: Port for Cursor IDE WebSocket integration

```json
{
  "cursorPort": 3456,
  "cursorPort": 0      // Use random available port
}
```

---

## Test Suite Configuration

### Test Suite Structure

```json
{
  "testSuites": [
    {
      "type": "jest|cypress|storybook|postman|stagehand|custom",
      "name": "optional-custom-name",
      "pattern": ["**/*.test.ts"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage",
      "watchPattern": ["src/**/*.ts"],
      "priority": 1,
      "enabled": true,
      "timeout": 30000,
      "env": {},
      "cwd": "./"
    }
  ]
}
```

### Test Suite Properties

#### `type`
**Required**: Yes  
**Options**: `"jest"`, `"cypress"`, `"storybook"`, `"postman"`, `"stagehand"`, `"custom"`  
**Description**: Type of test suite

#### `pattern`
**Type**: `string | string[]`  
**Required**: Yes  
**Description**: Glob patterns for test files

```json
{
  "pattern": "**/*.test.ts",                    // Single pattern
  "pattern": ["**/*.test.ts", "**/*.spec.ts"], // Multiple patterns
  "pattern": ["tests/**/*.js", "!tests/e2e/**"] // With exclusions
}
```

#### `command`
**Type**: `string`  
**Required**: Yes  
**Description**: Command to run tests

```json
{
  "command": "npm test",
  "command": "yarn test",
  "command": "npx jest",
  "command": "npm run test:unit"
}
```

#### `coverageCommand`
**Type**: `string`  
**Required**: No  
**Description**: Command to run tests with coverage

```json
{
  "coverageCommand": "npm test -- --coverage",
  "coverageCommand": "npm run test:coverage",
  "coverageCommand": "npx jest --coverage"
}
```

#### `watchPattern`
**Type**: `string[]`  
**Required**: Yes  
**Description**: File patterns that trigger this test suite

```json
{
  "watchPattern": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "!src/**/*.test.ts"
  ]
}
```

#### `priority`
**Type**: `number`  
**Default**: `3`  
**Range**: `1-5` (1 = highest priority)  
**Description**: Execution priority for test suite

```json
{
  "priority": 1,  // Run first (E2E tests)
  "priority": 2,  // Run second (Integration tests)
  "priority": 3,  // Run third (Unit tests)
  "priority": 4,  // Run fourth (Linting)
  "priority": 5   // Run last (Documentation tests)
}
```

#### `enabled`
**Type**: `boolean`  
**Default**: `true`  
**Description**: Whether this test suite is active

#### `timeout`
**Type**: `number`  
**Default**: `30000`  
**Description**: Timeout in milliseconds for test execution

#### `env`
**Type**: `object`  
**Description**: Environment variables for test execution

```json
{
  "env": {
    "NODE_ENV": "test",
    "API_URL": "http://localhost:3001",
    "TEST_TIMEOUT": "10000"
  }
}
```

#### `cwd`
**Type**: `string`  
**Default**: Project root  
**Description**: Working directory for test execution

### Test Suite Examples

#### Jest Configuration
```json
{
  "type": "jest",
  "name": "unit-tests",
  "pattern": ["**/*.test.ts", "**/*.test.tsx"],
  "command": "npm test",
  "coverageCommand": "npm test -- --coverage",
  "watchPattern": ["src/**/*.ts", "src/**/*.tsx"],
  "priority": 3,
  "timeout": 30000,
  "env": {
    "NODE_ENV": "test"
  }
}
```

#### Cypress Configuration
```json
{
  "type": "cypress",
  "name": "e2e-tests",
  "pattern": "cypress/e2e/**/*.cy.ts",
  "command": "npm run cypress:run",
  "coverageCommand": "npm run cypress:run -- --record",
  "watchPattern": ["src/**/*.ts", "cypress/**/*.ts"],
  "priority": 1,
  "timeout": 120000
}
```

#### Storybook Configuration
```json
{
  "type": "storybook",
  "name": "component-tests",
  "pattern": "**/*.stories.tsx",
  "command": "npm run test-storybook",
  "watchPattern": ["src/**/*.tsx", "**/*.stories.tsx"],
  "priority": 2,
  "timeout": 60000
}
```

#### Custom Test Suite
```json
{
  "type": "custom",
  "name": "api-tests",
  "pattern": "tests/api/**/*.test.js",
  "command": "npm run test:api",
  "coverageCommand": "npm run test:api -- --coverage",
  "watchPattern": ["src/api/**/*.ts", "tests/api/**/*.js"],
  "priority": 2,
  "env": {
    "API_BASE_URL": "${TEST_API_URL}"
  }
}
```

---

## Integration Configurations

### Coverage Configuration

```json
{
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    },
    "persistPath": "./coverage",
    "historyLimit": 50,
    "formats": ["json", "lcov", "text"],
    "excludePatterns": ["**/*.test.ts", "**/mocks/**"]
  }
}
```

#### Coverage Properties

- **`enabled`**: Enable/disable coverage analysis
- **`thresholds`**: Coverage percentage thresholds for different test types
- **`persistPath`**: Directory to store coverage history
- **`historyLimit`**: Number of coverage runs to keep in history
- **`formats`**: Coverage formats to parse
- **`excludePatterns`**: Files to exclude from coverage analysis

### Critical Paths Configuration

```json
{
  "criticalPaths": {
    "enabled": true,
    "paths": [
      "src/api/auth",
      "src/api/payment",
      "src/core/security"
    ],
    "patterns": [
      "**/auth/**",
      "**/payment/**",
      "**/security/**",
      "**/api/core/**"
    ],
    "testStrategy": "comprehensive"
  }
}
```

#### Critical Paths Properties

- **`paths`**: Specific directories considered critical
- **`patterns`**: Glob patterns for critical code
- **`testStrategy`**: Test strategy for critical changes (`"comprehensive"`, `"enhanced"`, `"normal"`)

### Postman Configuration

```json
{
  "postman": {
    "enabled": true,
    "collections": [
      "./postman/api-tests.json",
      "./postman/integration-tests.json"
    ],
    "environment": "./postman/test-environment.json",
    "globals": "./postman/globals.json",
    "iterationCount": 1,
    "timeout": 60000,
    "reporters": ["cli", "json"],
    "outputFile": "./postman-results.json"
  }
}
```

### Stagehand Configuration

```json
{
  "stagehand": {
    "enabled": true,
    "baseUrl": "http://localhost:3000",
    "scenariosPath": "./e2e/scenarios",
    "scenarios": [
      {
        "name": "User Registration",
        "description": "Complete user registration flow",
        "steps": [
          "Navigate to registration page",
          "Fill out registration form",
          "Submit form",
          "Verify email confirmation"
        ]
      }
    ],
    "promptForClarification": true,
    "screenshotMode": "on_failure",
    "timeout": 30000
  }
}
```

### JIRA Configuration

```json
{
  "jira": {
    "enabled": true,
    "baseUrl": "https://company.atlassian.net",
    "email": "${JIRA_EMAIL}",
    "apiToken": "${JIRA_API_TOKEN}",
    "projectKey": "DEV",
    "branchPattern": "DEV-\\d+",
    "requirementPatterns": [
      "acceptance criteria",
      "definition of done",
      "requirements"
    ],
    "commentAnalysis": {
      "enabled": true,
      "actionableKeywords": ["should", "must", "need", "question"]
    }
  }
}
```

### Git Integration

```json
{
  "git": {
    "enabled": true,
    "mainBranch": "auto",
    "checkRemote": true,
    "conflictDetection": true,
    "autoFetch": true,
    "ignorePatterns": ["*.log", "*.tmp"]
  }
}
```

### Environment Monitoring

```json
{
  "environments": {
    "enabled": true,
    "checkUrl": "https://jenkins.company.com/environments",
    "credentials": {
      "username": "${JENKINS_USER}",
      "password": "${JENKINS_TOKEN}"
    },
    "notifyOnNonMaster": true,
    "criticalEnvironments": ["production", "staging"],
    "checkInterval": 300000
  }
}
```

### MCP Configuration

```json
{
  "mcp": {
    "enabled": true,
    "registrationPath": "./mcp-registration.json",
    "actionName": "test-running-agent",
    "delegateToCursor": true,
    "tools": {
      "enabled": ["all"],
      "disabled": [],
      "timeout": 30000
    }
  }
}
```

---

## Advanced Settings

### Notifications Configuration

```json
{
  "notifications": {
    "enabled": true,
    "channels": {
      "console": {
        "enabled": true,
        "level": "info",
        "colors": true
      },
      "system": {
        "enabled": false,
        "level": "warning"
      },
      "webSocket": {
        "enabled": true,
        "level": "info"
      },
      "slack": {
        "enabled": false,
        "webhookUrl": "${SLACK_WEBHOOK_URL}",
        "channel": "#test-notifications",
        "level": "error",
        "username": "Test Agent",
        "iconEmoji": ":robot_face:"
      },
      "email": {
        "enabled": false,
        "smtp": {
          "host": "${SMTP_HOST}",
          "port": 587,
          "secure": false,
          "auth": {
            "user": "${SMTP_USER}",
            "pass": "${SMTP_PASS}"
          }
        },
        "from": "test-agent@company.com",
        "to": ["dev-team@company.com"],
        "level": "error"
      }
    },
    "templates": {
      "testPassed": "✅ Tests passed: {suite} ({duration}s)",
      "testFailed": "❌ Tests failed: {suite} - {errors} errors",
      "coverageWarning": "⚠️ Coverage below threshold: {coverage}% < {threshold}%"
    }
  }
}
```

### Complexity Configuration

```json
{
  "complexity": {
    "enabled": true,
    "warningThreshold": 10,
    "errorThreshold": 20,
    "includePatterns": ["src/**/*.ts", "src/**/*.tsx"],
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.d.ts",
      "**/mocks/**"
    ],
    "gitComparison": true,
    "cacheResults": true,
    "reportFormat": "detailed"
  }
}
```

### Performance Settings

```json
{
  "performance": {
    "maxConcurrentTests": 3,
    "testTimeout": 30000,
    "fileWatcherThrottle": 100,
    "cacheStrategy": "aggressive",
    "memoryLimit": "2GB"
  }
}
```

---

## Environment Variables

### Configuration Discovery

- **`TEST_AGENT_CONFIG`**: Path to configuration file
- **`TEST_AGENT_PROJECT_ROOT`**: Override project root
- **`TEST_AGENT_DEBUG`**: Enable debug logging

### Integration Variables

#### JIRA
- **`JIRA_EMAIL`**: JIRA account email
- **`JIRA_API_TOKEN`**: JIRA API token
- **`JIRA_BASE_URL`**: JIRA instance URL

#### Jenkins
- **`JENKINS_USER`**: Jenkins username
- **`JENKINS_TOKEN`**: Jenkins API token
- **`JENKINS_URL`**: Jenkins instance URL

#### Slack
- **`SLACK_WEBHOOK_URL`**: Slack webhook URL
- **`SLACK_BOT_TOKEN`**: Slack bot token

#### Email
- **`SMTP_HOST`**: SMTP server host
- **`SMTP_USER`**: SMTP username
- **`SMTP_PASS`**: SMTP password

### Usage in Configuration

```json
{
  "jira": {
    "baseUrl": "${JIRA_BASE_URL}",
    "email": "${JIRA_EMAIL}",
    "apiToken": "${JIRA_API_TOKEN}"
  },
  "customPath": "${PROJECT_ROOT}/custom",
  "withDefault": "${OPTIONAL_VAR:-default-value}"
}
```

---

## Configuration Discovery

### Search Order

1. **Environment Variable**: `TEST_AGENT_CONFIG`
2. **Current Directory**: `./test-agent.config.json`
3. **Parent Directory**: `../test-agent.config.json`
4. **Grandparent Directory**: `../../test-agent.config.json`
5. **User Config**: `~/.config/test-agent/config.json`

### Path Resolution

```json
{
  "projectRoot": "./my-project",        // Relative to config file
  "projectRoot": "/absolute/path",      // Absolute path
  "projectRoot": "~/projects/my-app",   // Home directory
  "projectRoot": "${PROJECT_ROOT}"      // Environment variable
}
```

### Configuration Merging

```json
// Base configuration
{
  "testSuites": [
    { "type": "jest", "priority": 3 }
  ],
  "coverage": { "enabled": true }
}

// Override configuration
{
  "testSuites": [
    { "type": "cypress", "priority": 1 }
  ],
  "coverage": { "thresholds": { "unit": 90 } }
}

// Merged result
{
  "testSuites": [
    { "type": "jest", "priority": 3 },
    { "type": "cypress", "priority": 1 }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": { "unit": 90 }
  }
}
```

---

## Validation and Debugging

### Configuration Validation

```bash
# Validate configuration
npm run validate-config

# Validate with custom config
npm run validate-config -- --config ./custom-config.json

# Show resolved configuration
npm run show-config
```

### Debug Mode

```bash
# Enable debug logging
export DEBUG=test-agent:*
npm start

# Debug specific modules
export DEBUG=test-agent:config,test-agent:git
npm start
```

### Configuration Schema

The agent uses JSON Schema for configuration validation:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "projectRoot": {
      "type": "string",
      "description": "Root directory of the project"
    },
    "testSuites": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type", "pattern", "command", "watchPattern"],
        "properties": {
          "type": {
            "enum": ["jest", "cypress", "storybook", "postman", "stagehand", "custom"]
          }
        }
      }
    }
  },
  "required": ["testSuites"]
}
```

---

## Complete Configuration Examples

### Minimal Configuration

```json
{
  "testSuites": [
    {
      "type": "jest",
      "pattern": "**/*.test.ts",
      "command": "npm test",
      "watchPattern": ["src/**/*.ts"]
    }
  ]
}
```

### Development Team Configuration

```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "name": "unit-tests",
      "pattern": ["**/*.test.ts", "**/*.test.tsx"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage",
      "watchPattern": ["src/**/*.ts", "src/**/*.tsx"],
      "priority": 3
    },
    {
      "type": "cypress",
      "name": "e2e-tests",
      "pattern": "cypress/e2e/**/*.cy.ts",
      "command": "npm run cypress:run",
      "watchPattern": ["src/**/*.ts", "cypress/**/*.ts"],
      "priority": 1,
      "timeout": 120000
    },
    {
      "type": "storybook",
      "name": "component-tests",
      "pattern": "**/*.stories.tsx",
      "command": "npm run test-storybook",
      "watchPattern": ["src/**/*.tsx", "**/*.stories.tsx"],
      "priority": 2
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    }
  },
  "criticalPaths": {
    "enabled": true,
    "patterns": ["**/auth/**", "**/payment/**"]
  },
  "notifications": {
    "enabled": true,
    "channels": {
      "console": { "enabled": true },
      "webSocket": { "enabled": true }
    }
  }
}
```

### Enterprise Configuration

```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts", "**/*.test.tsx"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage",
      "watchPattern": ["src/**/*.ts", "src/**/*.tsx"],
      "priority": 3,
      "env": { "NODE_ENV": "test" }
    },
    {
      "type": "cypress",
      "pattern": "cypress/e2e/**/*.cy.ts",
      "command": "npm run cypress:run",
      "watchPattern": ["src/**/*.ts", "cypress/**/*.ts"],
      "priority": 1,
      "timeout": 180000
    },
    {
      "type": "postman",
      "pattern": "postman/**/*.json",
      "command": "newman run",
      "watchPattern": ["src/api/**/*.ts"],
      "priority": 2
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": { "unit": 85, "integration": 75, "e2e": 65 },
    "persistPath": "./coverage",
    "historyLimit": 100
  },
  "criticalPaths": {
    "enabled": true,
    "paths": ["src/api/auth", "src/api/payment", "src/core/security"],
    "patterns": ["**/auth/**", "**/payment/**", "**/security/**"]
  },
  "postman": {
    "enabled": true,
    "collections": ["./postman/api-tests.json"],
    "environment": "./postman/test-env.json",
    "iterationCount": 1
  },
  "jira": {
    "enabled": true,
    "baseUrl": "${JIRA_BASE_URL}",
    "email": "${JIRA_EMAIL}",
    "apiToken": "${JIRA_API_TOKEN}",
    "projectKey": "PROJ",
    "branchPattern": "PROJ-\\d+"
  },
  "environments": {
    "enabled": true,
    "checkUrl": "${JENKINS_URL}/environments",
    "notifyOnNonMaster": true
  },
  "notifications": {
    "enabled": true,
    "channels": {
      "console": { "enabled": true, "level": "info" },
      "slack": {
        "enabled": true,
        "webhookUrl": "${SLACK_WEBHOOK_URL}",
        "channel": "#test-notifications",
        "level": "warning"
      },
      "email": {
        "enabled": true,
        "smtp": {
          "host": "${SMTP_HOST}",
          "port": 587,
          "auth": {
            "user": "${SMTP_USER}",
            "pass": "${SMTP_PASS}"
          }
        },
        "from": "test-agent@company.com",
        "to": ["dev-team@company.com"],
        "level": "error"
      }
    }
  },
  "complexity": {
    "enabled": true,
    "warningThreshold": 12,
    "errorThreshold": 25,
    "gitComparison": true
  },
  "mcp": {
    "enabled": true,
    "delegateToCursor": true
  }
}
```

---

## Migration and Upgrades

### Version 1.x to 2.x Migration

```json
// Old format (v1.x)
{
  "testCommand": "npm test",
  "watchPaths": ["src/**/*.ts"]
}

// New format (v2.x)
{
  "testSuites": [
    {
      "type": "jest",
      "pattern": "**/*.test.ts",
      "command": "npm test",
      "watchPattern": ["src/**/*.ts"]
    }
  ]
}
```

### Automatic Migration

```bash
# Migrate configuration to latest format
npm run migrate-config

# Preview migration changes
npm run migrate-config -- --dry-run

# Backup before migration
npm run migrate-config -- --backup
```

### Configuration Compatibility

```bash
# Check configuration compatibility
npm run check-config-version

# Upgrade configuration
npm run upgrade-config
```

---

This comprehensive configuration reference provides complete documentation for all configuration options, helping users optimize the Test Running Agent for their specific needs and workflows.