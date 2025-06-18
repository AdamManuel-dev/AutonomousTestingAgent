# Test Running Agent

An automated test runner that monitors file changes and intelligently runs the appropriate test suites based on code coverage analysis. Supports multiple testing frameworks and integrations with development tools.

## Features

### Core Features
- 🔍 **Smart Test Detection**: Automatically determines which test suites to run based on file changes
- 📊 **Coverage-Based Decisions**: Uses code coverage data to decide between unit tests and E2E tests
- 🎯 **Intelligent Test Selection**: Prioritizes tests based on coverage gaps and file criticality
- 🚀 **Multiple Test Runners**: Supports Jest, Cypress, Storybook, Postman, and Stagehand
- 🔌 **Cursor IDE Integration**: Connect to Cursor IDE via WebSocket for real-time test feedback
- ⚡ **Fast & Efficient**: Debounced file watching and parallel test execution
- 🛠️ **Fully Configurable**: All features are optional and configurable

### Optional Features
- 📮 **Postman Integration**: Run API tests from Postman collections
- 🎭 **Stagehand UI Testing**: Browser automation tests with MCP integration
- 🎫 **JIRA Integration**: Check ticket completeness and generate commit messages
- 🌍 **Environment Monitoring**: Track deployment environments and notify about non-master branches
- 🔄 **Git Integration**: Notify when you need to pull or merge master
- 🖼️ **Figma Visual Testing**: Compare Storybook components with Figma designs
- 🤖 **MCP Integration**: Communicate with tools through LLMs
- 🛤️ **Critical Path Configuration**: Define critical code paths for enhanced testing
- 📊 **Complexity Analysis**: Calculate cyclomatic complexity and track changes
- 📁 **Flexible Path Handling**: Monitor projects in different directories with smart config discovery

## Installation

### Standard Installation
```bash
cd test-running-agent
npm install
npm run build
```

### Cursor MCP Installation (Recommended)
```bash
cd test-running-agent
./setup-mcp.sh
```

Or manually:
```bash
npm install
npm run build

# Preview changes without modifying config
npm run install-mcp -- --dry-run

# Install to Cursor MCP
npm run install-mcp

# Uninstall
npm run uninstall-mcp
```

This will:
1. Install the test-running agent to Cursor's MCP registry (~/.cursor/mcp.json)
2. Make it available as `@test-running-agent` in Cursor
3. Enable all MCP commands for controlling the agent
4. Create automatic backups of your MCP configuration
5. Validate configuration before writing to prevent corruption

## Usage

### Quick Start

```bash
# Start the agent in the current directory
npm start

# Or use the CLI directly
node dist/index.js start
```

### With Custom Configuration

```bash
# Create a configuration file
node dist/index.js init

# Edit test-agent.config.json to customize

# Start with config
node dist/index.js start --config test-agent.config.json
```

### CLI Options

```bash
node dist/index.js start [options]

Options:
  -c, --config <path>      Path to configuration file
  -p, --project <path>     Project root directory (default: current directory)
  --cursor-port <port>     Port for Cursor IDE integration (default: 3456)
```

### Path Handling

The agent supports flexible path handling for monitoring projects in different directories. See [PATH_HANDLING.md](PATH_HANDLING.md) for detailed information on:

- Configuration file discovery
- Relative path resolution
- Cross-directory monitoring
- Environment variable support

## Configuration

Copy `test-agent.config.example.json` to `test-agent.config.json` and enable the features you need. All features are optional - enable only what you need for your project.

### Basic Configuration

```json
{
  "projectRoot": "./my-project",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts", "**/*.spec.ts"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage",
      "watchPattern": ["src/**/*.ts"],
      "priority": 3
    },
    {
      "type": "cypress",
      "pattern": "cypress/e2e/**/*.cy.ts",
      "command": "npm run cypress:run",
      "watchPattern": ["src/**/*.ts", "cypress/**/*.ts"],
      "priority": 1
    },
    {
      "type": "storybook",
      "pattern": "**/*.stories.tsx",
      "command": "npm run test-storybook",
      "watchPattern": ["src/**/*.tsx", "**/*.stories.tsx"],
      "priority": 2
    }
  ],
  "excludePatterns": ["**/node_modules/**", "**/dist/**"],
  "debounceMs": 1000,
  "cursorPort": 3456,
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

### Coverage Configuration

- **enabled**: Enable/disable coverage-based test selection
- **thresholds**: Coverage percentage thresholds for different test types
  - **unit**: Minimum coverage for unit tests (default: 80%)
  - **integration**: Threshold for integration tests (default: 70%)
  - **e2e**: When to trigger E2E tests (default: 60%)
- **persistPath**: Directory to store coverage history

### Optional Features Configuration

#### Postman Integration
```json
"postman": {
  "enabled": true,
  "collections": ["./postman/collection.json"],
  "environment": "./postman/environment.json",
  "globals": "./postman/globals.json",
  "iterationCount": 1
}
```

#### Stagehand UI Testing
```json
"stagehand": {
  "enabled": true,
  "baseUrl": "http://localhost:3000",
  "scenariosPath": "./e2e/scenarios",
  "promptForClarification": true
}
```

Stagehand scenarios can be defined in JSON files:
```json
{
  "name": "User Login Flow",
  "description": "Test the complete user login process",
  "steps": [
    "Navigate to login page",
    "Type 'user@example.com' in email field",
    "Type password in password field",
    "Click login button",
    "Verify dashboard is loaded"
  ]
}
```

#### JIRA Integration
```json
"jira": {
  "enabled": true,
  "baseUrl": "https://yourcompany.atlassian.net",
  "email": "your-email@company.com",
  "apiToken": "YOUR_JIRA_API_TOKEN",
  "projectKey": "DEV",
  "branchPattern": "DEV-\\d+"
}
```

Features:
- Automatically detects JIRA ticket from branch name
- Checks ticket description for missing requirements
- Reviews comments for unaddressed requests
- Generates commit messages based on ticket info

#### Git Integration
The Git integration is always enabled and provides:
- Notifications when your branch is behind origin
- Alerts when master/main has new commits to merge
- Detects potential merge conflicts
- Warns about uncommitted changes

#### Environment Monitoring (Jenkins)
```json
"environments": {
  "enabled": true,
  "checkUrl": "https://jenkins.yourcompany.com/environments",
  "notifyOnNonMaster": true
}
```

The environment checker parses Jenkins environment pages to:
- Monitor which branches are deployed to which environments
- Alert when non-master branches are deployed
- Notify before pushing to avoid conflicts
- Track environment status (up/down)

#### MCP Integration
```json
"mcp": {
  "enabled": true,
  "registrationPath": "./mcp-registration.json",
  "actionName": "test-running-agent",
  "delegateToCursor": true
}
```

Enables:
- Communication with JIRA through LLMs
- Stagehand browser automation via MCP
- Automated commit message generation
- Delegation of test running to Cursor agent

#### Critical Paths
```json
"criticalPaths": {
  "enabled": true,
  "paths": ["src/api/auth", "src/api/payment"],
  "patterns": ["**/auth/**", "**/payment/**"]
}
```

Files matching these paths trigger more comprehensive testing.

#### Notifications
```json
"notifications": {
  "enabled": true,
  "consoleOutput": true,
  "systemNotifications": false,
  "webSocket": true,
  "slack": {
    "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
    "channel": "#test-notifications"
  }
}
```

Notification channels:
- **Console Output**: Colored terminal output (default)
- **System Notifications**: Native OS notifications (macOS, Windows, Linux)
- **WebSocket**: Send to connected Cursor IDE instances
- **Slack**: Post to Slack channels via webhook

Notification types:
- **Info**: File changes, test strategies
- **Success**: All tests passed
- **Warning**: Low coverage, git status issues
- **Error**: Test failures

#### Complexity Analysis
```json
"complexity": {
  "enabled": true,
  "warningThreshold": 10,
  "errorThreshold": 20,
  "includePatterns": ["src/**/*.ts"],
  "excludePatterns": ["**/*.test.ts", "**/*.spec.ts"]
}
```

Features:
- **Cyclomatic Complexity**: Calculates complexity for functions, methods, and classes
- **Change Tracking**: Compares complexity with previous versions
- **Thresholds**: Configurable warning and error thresholds
- **Notifications**: Alerts when complexity increases significantly

Complexity is calculated based on:
- Conditional statements (if, ternary)
- Loops (for, while, do-while)
- Switch cases
- Logical operators (&&, ||, ??)
- Exception handling (catch blocks)

## MCP Usage in Cursor

After installation, you can use the test-running agent directly in Cursor:

### Available MCP Commands

Use `@test-running-agent` followed by the command:

- **`start_watching`** - Start watching files for changes
  ```
  @test-running-agent start_watching
  @test-running-agent start_watching projectPath: "/path/to/project"
  ```

- **`stop_watching`** - Stop watching files
  ```
  @test-running-agent stop_watching
  ```

- **`get_status`** - Get current agent status
  ```
  @test-running-agent get_status
  ```

- **`run_tests`** - Run tests for specific files
  ```
  @test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
  ```

- **`check_jira`** - Check JIRA ticket status
  ```
  @test-running-agent check_jira
  ```

- **`check_environments`** - Check deployment environments
  ```
  @test-running-agent check_environments
  ```

- **`generate_commit_message`** - Generate commit message
  ```
  @test-running-agent generate_commit_message
  ```

- **`check_git_status`** - Check if branch needs pull/merge
  ```
  @test-running-agent check_git_status
  ```

- **`analyze_complexity`** - Analyze cyclomatic complexity
  ```
  @test-running-agent analyze_complexity
  @test-running-agent analyze_complexity files: ["src/app.ts", "src/utils.ts"]
  ```

- **`compare_complexity`** - Compare complexity with previous version
  ```
  @test-running-agent compare_complexity file: "src/app.ts"
  ```

### Example Workflow

1. Start watching files:
   ```
   @test-running-agent start_watching
   ```

2. Make changes to your code - tests will run automatically

3. Before committing, check git status:
   ```
   @test-running-agent check_git_status
   ```

4. Generate a commit message:
   ```
   @test-running-agent generate_commit_message
   ```

5. Stop watching when done:
   ```
   @test-running-agent stop_watching
   ```

## Cursor IDE Integration (WebSocket)

The agent can also connect to Cursor IDE via WebSocket to provide real-time test feedback:

1. Start the agent with Cursor integration enabled (default port: 3456)
2. In Cursor, connect to `ws://localhost:3456`
3. The agent will send test results and file change notifications
4. You can trigger test runs from Cursor

### WebSocket API

**Messages from Agent to Cursor:**
- `test-result`: Test execution results
- `file-change`: File change notifications
- `status`: Agent status updates

**Messages from Cursor to Agent:**
- `run-tests`: Trigger all test suites
- `stop-tests`: Cancel running tests
- `get-status`: Request agent status

## How It Works

1. **File Watching**: Monitors your project files for changes using chokidar
2. **Coverage Analysis**: Loads existing coverage data to understand test gaps
3. **Smart Test Selection**: Based on:
   - File coverage levels
   - Critical path detection (API, auth, payment files)
   - Coverage trends (improving/declining)
   - File change patterns
4. **Test Execution**: Runs selected tests with coverage collection
5. **Coverage Updates**: Saves coverage data for future decisions
6. **Recommendations**: Provides actionable suggestions to improve coverage
7. **Result Broadcasting**: Sends results to connected Cursor IDE instances

### Test Selection Logic

The agent makes intelligent decisions about which tests to run:

- **Low Coverage Files**: Runs unit tests when changed files have < 80% coverage
- **Critical Changes**: Triggers E2E tests for changes in critical paths (API, auth, payments)
- **Declining Coverage**: Runs comprehensive tests if coverage is dropping
- **UI Changes**: Runs Storybook tests for component changes
- **Very Low Coverage**: Runs all test suites if overall coverage < 60%

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Build for production
npm run build
```

## Troubleshooting

- **Tests not running**: Check that your test patterns match your file structure
- **Connection issues**: Ensure the WebSocket port is not in use
- **Performance**: Adjust `debounceMs` for less frequent test runs

## License

MIT# AutonomousTestingAgent
