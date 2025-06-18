# Test Running Agent - Comprehensive Feature Documentation

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Core Engine](#core-engine)
2. [Smart Test Selection](#smart-test-selection)
3. [Test Runners](#test-runners)
4. [Code Quality Analysis](#code-quality-analysis)
5. [Coverage Analysis](#coverage-analysis)
6. [Development Integrations](#development-integrations)
7. [Project Management Integration](#project-management-integration)
8. [Automation & CI/CD](#automation--cicd)
9. [Real-time Communication](#real-time-communication)
10. [Configuration System](#configuration-system)
11. [Advanced Features](#advanced-features)

---

## Core Engine

### 🚀 Agent Orchestrator (`src/Agent.ts`)
**Purpose**: Central hub that coordinates all testing activities

**Key Features**:
- **Intelligent File Watching**: Monitors project files and triggers appropriate tests
- **Event-Driven Architecture**: Responds to file changes, git events, and external triggers
- **Multi-Integration Coordination**: Orchestrates between all external services and tools
- **Real-time Status Broadcasting**: Sends live updates to connected clients
- **Graceful Error Handling**: Comprehensive error recovery and reporting

**Configuration**:
```json
{
  "projectRoot": "./",
  "cursorPort": 3456,
  "debounceMs": 1000,
  "excludePatterns": ["**/node_modules/**", "**/dist/**"]
}
```

**Capabilities**:
- File change detection with debouncing
- Parallel test execution management
- Status broadcasting to Cursor IDE
- Integration health monitoring
- Automatic error recovery

---

## Smart Test Selection

### 🧠 Intelligent Test Selector (`src/utils/SmartTestSelector.ts`)
**Purpose**: Makes data-driven decisions about which tests to run

**Key Features**:
- **Coverage-Driven Decision Making**: Uses coverage data to prioritize tests
- **Critical Path Detection**: Identifies changes in critical code areas
- **Test Priority Management**: Executes high-priority tests first
- **Coverage Gap Analysis**: Finds files needing more test coverage
- **Trend-Based Selection**: Considers coverage trends over time

**Decision Logic**:
1. **Critical Path Changes** → Run all test suites
2. **Low Coverage Files** → Prioritize unit tests
3. **Declining Coverage** → Run comprehensive tests
4. **UI Component Changes** → Run Storybook tests
5. **API Changes** → Run Postman tests
6. **Very Low Coverage** → Run E2E tests

**Configuration**:
```json
{
  "criticalPaths": {
    "enabled": true,
    "paths": ["src/api/auth", "src/api/payment"],
    "patterns": ["**/auth/**", "**/payment/**"]
  },
  "coverage": {
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    }
  }
}
```

### 🔍 Test Detection (`src/utils/TestDetector.ts`)
**Purpose**: Automatically discovers and categorizes test files

**Features**:
- Pattern-based test file discovery
- Multi-framework test classification
- Dynamic test suite registration
- File-to-test mapping

---

## Test Runners

### 🧪 Universal Test Runner (`src/runners/TestRunner.ts`)
**Purpose**: Executes test suites with coverage collection

**Supported Frameworks**:
- **Jest**: Unit and integration tests
- **Cypress**: End-to-end tests
- **Storybook**: Component tests
- **Custom**: Any command-line test runner

**Features**:
- **Parallel Execution**: Run multiple test suites simultaneously
- **Coverage Integration**: Automatic coverage data collection
- **Cancellation Support**: Abort running tests on demand
- **Progress Tracking**: Real-time execution updates
- **File-Specific Testing**: Target tests for changed files only

**Configuration**:
```json
{
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage",
      "watchPattern": ["src/**/*.ts"],
      "priority": 3,
      "enabled": true
    }
  ]
}
```

### 🌐 Postman API Runner (`src/runners/PostmanRunner.ts`)
**Purpose**: Executes API tests using Postman collections

**Features**:
- **Newman Integration**: Uses Newman CLI for execution
- **Environment Support**: Postman environments and globals
- **Collection Management**: Multiple collection support
- **Iteration Control**: Configurable test iterations
- **JSON Reporting**: Structured result output

**Configuration**:
```json
{
  "postman": {
    "enabled": true,
    "collections": ["./postman/collection.json"],
    "environment": "./postman/environment.json",
    "globals": "./postman/globals.json",
    "iterationCount": 1
  }
}
```

**Triggers**:
- API file changes (`**/api/**`, `**/controllers/**`)
- Route modifications
- Service layer updates

### 🎭 Stagehand UI Runner (`src/runners/StagehandRunner.ts`)
**Purpose**: Executes end-to-end UI tests using browser automation

**Features**:
- **MCP-Powered Automation**: Integrates with Stagehand through MCP
- **Natural Language Scenarios**: Write tests in plain English
- **Screenshot Documentation**: Automatic before/after screenshots
- **Scenario Validation**: Checks scenario clarity and completeness
- **Dynamic Generation**: Create scenarios from descriptions

**Configuration**:
```json
{
  "stagehand": {
    "enabled": true,
    "baseUrl": "http://localhost:3000",
    "scenariosPath": "./e2e/scenarios",
    "scenarios": [
      {
        "name": "User Login Flow",
        "description": "Test the complete user login process",
        "steps": [
          "Navigate to login page",
          "Type 'testuser@example.com' in email field",
          "Type password in password field",
          "Click login button",
          "Verify dashboard is loaded"
        ]
      }
    ],
    "promptForClarification": true
  }
}
```

**Scenario Formats**:
- JSON configuration files
- YAML scenario definitions
- Inline scenario objects
- Dynamic MCP generation

---

## Code Quality Analysis

### 📊 Complexity Analyzer (`src/utils/ComplexityAnalyzer.ts`)
**Purpose**: Analyzes code complexity using AST parsing

**Features**:
- **Cyclomatic Complexity**: Measures function, method, and class complexity
- **TypeScript Support**: Full AST analysis of TypeScript code
- **Historical Comparison**: Compare complexity with previous versions
- **Threshold Monitoring**: Configurable warning and error levels
- **Visual Reporting**: Color-coded complexity reports

**Complexity Factors**:
- Conditional statements (`if`, ternary operators)
- Loops (`for`, `while`, `do-while`)
- Switch statements and cases
- Logical operators (`&&`, `||`, `??`)
- Exception handling (`try`/`catch`)
- Function expressions and arrow functions

**Configuration**:
```json
{
  "complexity": {
    "enabled": true,
    "warningThreshold": 10,
    "errorThreshold": 20,
    "includePatterns": ["src/**/*.ts"],
    "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
  }
}
```

**Reporting**:
- Per-function complexity scores
- File-level complexity summaries
- Git-based change analysis
- Threshold violation alerts
- Line-by-line complexity breakdown

---

## Coverage Analysis

### 📈 Coverage Analyzer (`src/utils/CoverageAnalyzer.ts`)
**Purpose**: Comprehensive test coverage analysis and tracking

**Features**:
- **Multi-Format Support**: Jest, Cypress, and Storybook coverage
- **Historical Tracking**: Maintains coverage history (last 50 runs)
- **Trend Analysis**: Identifies improving/declining coverage
- **File-Level Analysis**: Per-file coverage recommendations
- **E2E Recommendations**: Determines when E2E tests are needed

**Coverage Metrics**:
- Line coverage percentage
- Branch coverage analysis
- Function coverage tracking
- Statement coverage measurement
- Uncovered line identification

**Data Sources**:
- `coverage/coverage-summary.json` (Jest)
- `coverage/lcov.info` (Standard LCOV)
- Custom coverage formats
- Historical coverage data

**Configuration**:
```json
{
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    },
    "persistPath": "./coverage"
  }
}
```

**Decision Making**:
- Files with <80% coverage → Unit tests
- Critical paths with <70% → Integration tests
- Overall coverage <60% → E2E tests
- Declining coverage → Comprehensive testing

---

## Development Integrations

### 🔄 Git Integration (`src/integrations/GitIntegration.ts`)
**Purpose**: Comprehensive Git repository management

**Features**:
- **Branch Status Monitoring**: Track ahead/behind status with remote
- **Merge Conflict Detection**: Predict conflicts before they occur
- **Change Tracking**: Identify modified files for targeted testing
- **Main Branch Detection**: Automatic main/master branch identification
- **Working Directory Status**: Monitor uncommitted changes

**Capabilities**:
- Remote synchronization status
- File change detection
- Conflict prediction
- Branch relationship analysis
- Commit history tracking

**Status Checks**:
- ✅ Branch is up to date
- ⚠️ Branch is behind origin (needs pull)
- 🔄 Branch is ahead of origin (needs push)
- ⚡ Main branch has new commits (needs merge)
- 📝 Uncommitted changes present

### 🖥️ Cursor IDE Integration (`src/utils/CursorIntegration.ts`)
**Purpose**: Real-time integration with Cursor IDE

**Features**:
- **WebSocket Communication**: Live bidirectional communication
- **Real-time Updates**: Test results, file changes, status updates
- **Command Interface**: Trigger tests and operations from Cursor
- **Status Broadcasting**: Continuous status synchronization

**WebSocket Messages**:
- `test-result`: Test execution results
- `file-change`: File modification notifications
- `status`: Agent status updates
- `run-tests`: Trigger test execution
- `get-status`: Request current status

**MCP Integration** (`src/integrations/MCPIntegration.ts`):
- **LLM-Powered Features**: Natural language processing for development tasks
- **Stagehand Control**: Browser automation through MCP
- **Commit Message Generation**: Intelligent commit messages
- **Tool Detection**: Dynamic MCP tool availability

---

## Project Management Integration

### 🎫 JIRA Integration (`src/integrations/JiraIntegration.ts`)
**Purpose**: Seamless JIRA ticket management and workflow integration

**Features**:
- **Automatic Ticket Detection**: Extract JIRA tickets from branch names
- **Requirement Analysis**: Check for missing acceptance criteria
- **Comment Monitoring**: Identify unaddressed actionable comments
- **Commit Message Generation**: Create messages based on ticket info
- **Completeness Validation**: Ensure tickets meet quality standards

**Ticket Analysis**:
- Description completeness check
- Acceptance criteria validation
- Comment review for action items
- Requirement pattern matching
- Ticket status verification

**Configuration**:
```json
{
  "jira": {
    "enabled": true,
    "baseUrl": "https://yourcompany.atlassian.net",
    "email": "your-email@company.com",
    "apiToken": "YOUR_JIRA_API_TOKEN",
    "projectKey": "DEV",
    "branchPattern": "DEV-\\d+"
  }
}
```

**Branch Pattern Examples**:
- `DEV-123-feature-branch` → Ticket DEV-123
- `feature/DEV-456-user-auth` → Ticket DEV-456
- `bugfix/PROJ-789` → Ticket PROJ-789

**Commit Message Generation**:
- Includes ticket title and type
- References ticket key
- Categorizes changes (feature, bug, improvement)
- Adds ticket context and requirements

### 🌍 Environment Monitoring (`src/integrations/EnvironmentChecker.ts`)
**Purpose**: Track deployment environments and prevent conflicts

**Features**:
- **Environment Status Tracking**: Monitor multiple deployment environments
- **Branch Deployment Monitoring**: Track which branches are deployed where
- **Non-Master Alerts**: Warn when non-master branches are deployed
- **Deployment Conflict Prevention**: Avoid pushing to active environments

**Environment Types**:
- Development
- Staging
- Production
- Feature environments
- Testing environments

**Configuration**:
```json
{
  "environments": {
    "enabled": true,
    "checkUrl": "https://api.yourcompany.com/deployments",
    "notifyOnNonMaster": true
  }
}
```

---

## Automation & CI/CD

### 🔧 Configuration Loader (`src/utils/ConfigLoader.ts`)
**Purpose**: Flexible configuration management and discovery

**Features**:
- **Auto-Discovery**: Searches multiple locations for config files
- **Environment Variables**: Support for environment-based configuration
- **Path Resolution**: Intelligent relative/absolute path handling
- **Validation**: Configuration validation and error reporting

**Search Order**:
1. `TEST_AGENT_CONFIG` environment variable
2. Current working directory
3. Project root directory
4. Parent directories (up to 3 levels)

**Path Handling**:
- Relative paths resolved from config file location
- Absolute paths used as-is
- Environment variable substitution
- Cross-platform path normalization

### 📁 File Watcher (`src/watchers/FileWatcher.ts`)
**Purpose**: Intelligent file system monitoring

**Features**:
- **Debounced Change Detection**: Prevents excessive test triggering
- **Pattern-Based Filtering**: Include/exclude pattern support
- **Cross-Platform Compatibility**: Works on Windows, macOS, Linux
- **Performance Optimization**: Efficient file system monitoring

---

## Real-time Communication

### 📢 Notification Manager (`src/utils/NotificationManager.ts`)
**Purpose**: Multi-channel notification system

**Features**:
- **Multiple Channels**: Console, WebSocket, system notifications, Slack
- **Message Categorization**: Info, success, warning, error levels
- **Template Support**: Customizable message templates
- **Delivery Tracking**: Monitor notification delivery status

**Notification Channels**:
- **Console Output**: Colored terminal output
- **System Notifications**: Native OS notifications
- **WebSocket**: Real-time updates to connected clients
- **Slack**: Team notifications via webhook
- **Custom**: Extensible notification system

**Configuration**:
```json
{
  "notifications": {
    "enabled": true,
    "consoleOutput": true,
    "systemNotifications": false,
    "webSocket": true,
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/...",
      "channel": "#test-notifications"
    }
  }
}
```

**Message Types**:
- **Info**: File changes, test strategies
- **Success**: All tests passed, coverage met
- **Warning**: Low coverage, git status issues
- **Error**: Test failures, configuration problems

---

## Configuration System

### ⚙️ Comprehensive Configuration
**Purpose**: Flexible, extensible configuration management

**Core Configuration Structure**:
```json
{
  "projectRoot": "./",
  "testSuites": [...],
  "excludePatterns": [...],
  "debounceMs": 1000,
  "cursorPort": 3456,
  "coverage": {...},
  "criticalPaths": {...},
  "postman": {...},
  "stagehand": {...},
  "figma": {...},
  "jira": {...},
  "environments": {...},
  "mcp": {...},
  "notifications": {...},
  "complexity": {...}
}
```

**Test Suite Configuration**:
```json
{
  "type": "jest|cypress|storybook|postman|stagehand",
  "pattern": ["**/*.test.ts"],
  "command": "npm test",
  "coverageCommand": "npm test -- --coverage",
  "watchPattern": ["src/**/*.ts"],
  "priority": 1-5,
  "enabled": true
}
```

**Configuration Features**:
- **Environment Variable Support**: `${VAR_NAME}` substitution
- **Path Resolution**: Automatic relative/absolute path handling
- **Schema Validation**: Type-safe configuration validation
- **Hot Reloading**: Dynamic configuration updates
- **Inheritance**: Configuration file inheritance and overrides

---

## Advanced Features

### 🎨 Figma Integration (Planned)
**Purpose**: Visual regression testing with design comparison

**Features** (Stub Implementation):
- **Design Comparison**: Compare Storybook components with Figma designs
- **Visual Diff Detection**: Identify visual changes automatically
- **Threshold-Based Validation**: Configurable similarity thresholds
- **Automated Screenshots**: Capture component screenshots for comparison

### 🚀 Performance Optimizations
- **Caching**: Intelligent caching for coverage and complexity data
- **Parallel Processing**: Concurrent test execution
- **Debouncing**: File change debouncing to prevent excessive runs
- **Memory Management**: Efficient memory usage for large projects

### 🔐 Security Features
- **API Token Management**: Secure storage and handling of credentials
- **HTTPS Support**: Secure communication with external services
- **Input Validation**: Comprehensive input sanitization
- **Error Handling**: Safe error reporting without exposing sensitive data

### 📊 Analytics and Reporting
- **Test Duration Tracking**: Monitor test execution times
- **Coverage Trends**: Historical coverage analysis
- **Complexity Monitoring**: Track code complexity over time
- **Performance Metrics**: Test performance analytics

### 🔄 Extensibility
- **Plugin Architecture**: Easy addition of new test runners
- **Custom Integrations**: Extensible integration framework
- **Event System**: Comprehensive event-driven architecture
- **API Endpoints**: RESTful API for external integrations

---

## Summary

The Test Running Agent is a comprehensive, intelligent testing solution that provides:

1. **Smart Test Execution**: Data-driven test selection based on coverage and complexity
2. **Multi-Framework Support**: Jest, Cypress, Storybook, Postman, and Stagehand
3. **Development Integration**: Seamless integration with Git, JIRA, and Cursor IDE
4. **Code Quality Monitoring**: Complexity analysis and coverage tracking
5. **Real-time Feedback**: Live updates and notifications
6. **Flexible Configuration**: Comprehensive, extensible configuration system
7. **CI/CD Ready**: Built for integration with all major CI/CD platforms
8. **Developer Experience**: Optimized for modern development workflows

The agent transforms testing from a manual, reactive process into an intelligent, proactive system that enhances code quality and developer productivity.