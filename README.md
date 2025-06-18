# Test Running Agent

![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)
![Tests](https://img.shields.io/badge/tests-passing-brightgreen)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)
![ESLint](https://img.shields.io/badge/code_style-eslint-purple)

An intelligent automated test runner that monitors file changes and executes appropriate test suites based on coverage analysis, complexity monitoring, and development workflow integration. Features comprehensive support for multiple testing frameworks and seamless integration with development tools.

## 🚀 Quick Start

```bash
# Install and set up for Cursor IDE
npm install -g test-running-agent
test-agent init --interactive
test-agent install-mcp  # For Cursor integration

# Start monitoring your project
test-agent start
```

## 📖 Documentation

All comprehensive documentation is available in the [`/documentation`](./documentation/) folder.

### 📋 Core Documentation
| Document | Description |
|----------|-------------|
| **[📋 Documentation Index](./documentation/DOCUMENTATION_INDEX.md)** | Complete navigation guide and learning paths |
| **[🚀 Comprehensive Features](./documentation/COMPREHENSIVE_FEATURES.md)** | Complete feature overview and technical details |
| **[📘 API Reference](./documentation/API_REFERENCE.md)** | MCP commands, CLI usage, and API documentation |
| **[🎓 Tutorials](./documentation/TUTORIALS.md)** | Step-by-step guides for all use cases |
| **[🔧 Troubleshooting](./documentation/TROUBLESHOOTING.md)** | Common issues and solutions |

### 🔧 Setup & Configuration
| Document | Description |
|----------|-------------|
| **[⚙️ Configuration Reference](./documentation/CONFIGURATION_REFERENCE.md)** | Complete configuration guide with all options |
| **[🎯 Cursor MCP Guide](./documentation/CURSOR_MCP_GUIDE.md)** | Cursor IDE integration and MCP commands |
| **[📁 Path Handling](./documentation/PATH_HANDLING.md)** | Configuration discovery and path resolution |
| **[🗂️ Cross Directory Usage](./documentation/CROSS_DIRECTORY_USAGE.md)** | Multi-project monitoring setup |

### 🚀 Advanced Features
| Document | Description |
|----------|-------------|
| **[🔬 Advanced Features](./documentation/ADVANCED_FEATURES.md)** | Deep dive into sophisticated capabilities |
| **[🤖 MCP Integration Guide](./documentation/MCP_INTEGRATION_GUIDE.md)** | Comprehensive MCP setup and usage |
| **[🔄 CI/CD Integration](./documentation/CI_CD_INTEGRATION.md)** | GitHub Actions, GitLab CI, Jenkins integration |
| **[🐳 Docker Guide](./documentation/DOCKER_GUIDE.md)** | Docker deployment and containerization |
| **[📋 Features Overview](./documentation/FEATURES.md)** | High-level feature summary and status |

### 📚 Quick Reference
| Document | Description |
|----------|-------------|
| **[⚡ MCP Quick Reference](./documentation/MCP_QUICK_REFERENCE.md)** | Essential MCP commands for quick access |

## 🔍 Debug UI

The Test Running Agent includes a comprehensive web-based debug interface that provides real-time monitoring, configuration management, and interactive control of your test automation.

### 🚀 Quick Start with Debug UI

```bash
# Start the agent with debug UI enabled
test-agent start --debug

# Or specify a custom port
test-agent start --debug --debug-port 3002
```

The debug UI will be available at `http://localhost:3001` (or your specified port).

### 📊 Debug UI Features

#### 🤖 Agent Status & Control
- **Real-time Status**: View agent running state, file watching status, and last activity
- **System Metrics**: Monitor CPU, memory, and disk usage
- **Quick Actions**: Start, stop, and restart the agent from the web interface
- **Connection Status**: See Cursor IDE and WebSocket connection status

#### ⚙️ Configuration Management
- **Visual Editor**: Modify all configuration settings through a user-friendly interface
- **Secrets Management**: Securely input and manage API keys for:
  - Sentry DSN for error tracking
  - PostHog API key for analytics
  - JIRA credentials for issue tracking
  - Slack webhook URLs for notifications
- **Feature Toggles**: Enable/disable integrations with visual toggles
- **Real-time Updates**: Configuration changes are applied immediately

#### 🧪 Test Management
- **Test Results**: View detailed test execution results with timestamps
- **Coverage Metrics**: Monitor coverage percentages and trends
- **Test Filtering**: Filter results by test suite, status, or time range
- **Manual Test Execution**: Trigger specific test suites on demand

#### 🖥️ Real-time Console
- **Live Output**: Stream agent output in real-time with terminal-style interface
- **Log Filtering**: Filter by log level (error, warn, info, debug, success)
- **Message History**: Persistent log history with timestamps
- **Export Logs**: Download console output as JSON

#### 📋 Advanced Logging
- **Structured Logs**: View detailed logs with component-based organization
- **Search & Filter**: Search through logs and filter by component or level
- **Log Levels**: Comprehensive logging with proper categorization
- **Export Capability**: Export logs for analysis or debugging

#### 📊 Performance Metrics
- **Test Performance**: Average test duration, success rates, and throughput
- **Coverage Analysis**: Coverage trends, critical path analysis, and file statistics
- **System Performance**: Resource utilization and performance bottlenecks
- **Error Analysis**: Error frequency, types, and resolution tracking

#### 💬 AI Assistant
- **Natural Language Interface**: Interact with the agent using plain English
- **Quick Actions**: Pre-built prompts for common operations
- **Smart Responses**: Get detailed information about test status, coverage, and errors
- **Command History**: Track your interactions with the agent

### 🔐 Security Features

- **Local Only**: Debug UI runs locally and doesn't expose sensitive data
- **Secrets Masking**: API keys and tokens are properly masked in the interface
- **Session Management**: Secure WebSocket connections with automatic reconnection
- **Input Validation**: All configuration inputs are validated before saving

### 🛠️ Technical Details

#### Architecture
- **Frontend**: React with TypeScript and shadcn/ui components
- **Backend**: Express.js server with WebSocket support
- **Real-time Updates**: WebSocket connections for live data streaming
- **Build System**: Vite for fast development and optimized builds

#### API Endpoints
- `GET /api/status` - Agent status and system information
- `GET /api/config` - Current configuration
- `PUT /api/config` - Update configuration
- `POST /api/agent/:action` - Control agent (start/stop/restart)
- `GET /api/logs` - Retrieve filtered logs
- `POST /api/run-tests` - Trigger test execution
- `POST /api/prompt` - Send natural language commands

#### WebSocket Events
- **Main Connection** (`ws://localhost:3001/ws`): Status updates, config changes, test results
- **Console Connection** (`ws://localhost:3001/console`): Real-time log streaming

### 📱 Usage Examples

#### Basic Monitoring
```bash
# Start with debug UI
test-agent start --debug

# Open browser to http://localhost:3001
# Navigate to Status tab to see real-time agent status
```

#### Configuration Management
```bash
# Start debug UI
test-agent start --debug

# Go to Config tab
# Add your Sentry DSN: https://your-dsn@sentry.io/project-id
# Add PostHog API key: phc_your-api-key
# Enable desired integrations
# Click Save - changes apply immediately
```

#### Interactive Testing
```bash
# Start debug UI
test-agent start --debug

# Use AI Chat tab:
# "Run all unit tests"
# "Show me the current coverage"
# "What errors occurred in the last hour?"
# "Generate a test report"
```

#### Real-time Debugging
```bash
# Start debug UI
test-agent start --debug

# Monitor Console tab while making code changes
# Watch real-time test execution and results
# Filter logs by component or level
# Export logs when issues occur
```

### 🎯 Advanced Configuration

#### Custom Port Configuration
```json
{
  "debug": {
    "enabled": true,
    "port": 3001,
    "cors": {
      "origin": ["http://localhost:3000", "http://localhost:3001"]
    }
  }
}
```

#### Integration with Monitoring Tools

The debug UI integrates seamlessly with your existing monitoring setup:

- **Sentry**: Error tracking and performance monitoring
- **PostHog**: User analytics and feature usage tracking
- **JIRA**: Issue tracking and project management
- **Slack**: Team notifications and alerts

### 🔧 Troubleshooting Debug UI

#### Common Issues

**Port Already in Use**
```bash
# Use a different port
test-agent start --debug --debug-port 3002
```

**WebSocket Connection Issues**
```bash
# Check firewall settings
# Ensure port is not blocked
# Try restarting the agent
```

**UI Not Loading**
```bash
# Ensure debug UI was built
npm run build:debug

# Check if dist/debug-ui exists
ls -la dist/debug-ui
```

**Configuration Not Saving**
- Check file permissions on config file
- Ensure JSON syntax is valid
- Check browser console for errors

## ⭐ Key Features

### 🧠 Intelligent Test Execution
- **Smart Test Selection**: Coverage-driven test prioritization
- **Critical Path Detection**: Enhanced testing for important code areas
- **Multi-Framework Support**: Jest, Cypress, Storybook, Postman, Stagehand
- **Parallel Execution**: Efficient concurrent test running

### 📊 Code Quality Monitoring
- **Coverage Analysis**: Comprehensive coverage tracking and trends
- **Complexity Analysis**: Cyclomatic complexity monitoring with Git comparison
- **Quality Gates**: Configurable thresholds and automated enforcement
- **Historical Tracking**: Trend analysis and quality metrics over time

### 🔗 Development Workflow Integration
- **Cursor IDE**: Real-time integration with WebSocket and MCP
- **JIRA Integration**: Ticket validation and commit message generation
- **Git Integration**: Branch status monitoring and conflict detection
- **Environment Monitoring**: Deployment status tracking

### 🎯 Advanced Testing Features
- **API Testing**: Postman collection automation
- **UI Testing**: Natural language Stagehand scenarios
- **Visual Testing**: Figma design comparison (planned)
- **Cross-Directory Monitoring**: Flexible project structure support

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
  --debug                  Enable debug UI on http://localhost:3001
  --debug-port <port>      Port for debug UI (default: 3001)
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

#### Error Tracking and Analytics
```json
"sentry": {
  "enabled": true,
  "dsn": "https://your-dsn@sentry.io/project-id",
  "environment": "development",
  "release": "1.0.0",
  "tracesSampleRate": 0.1,
  "profilesSampleRate": 0.1,
  "debug": false
},
"posthog": {
  "enabled": true,
  "apiKey": "phc_your-api-key-here",
  "host": "https://app.posthog.com",
  "enableUserTracking": true,
  "enableTestTracking": true,
  "enableErrorTracking": true
}
```

Features:
- **Sentry**: Comprehensive error tracking, performance monitoring, and release tracking
- **PostHog**: Test execution analytics, user behavior tracking, and feature usage metrics
- **Debug Context**: Automated error context collection with stack traces and breadcrumbs
- **Performance Monitoring**: Transaction tracking and performance bottleneck identification

#### GitHub Integration
```json
"github": {
  "enabled": true,
  "token": "ghp_your-github-personal-access-token",
  "owner": "your-github-username",
  "repo": "your-repo-name",
  "autoDetect": true
}
```

Features:
- **PR Comment Analysis**: Automatically fetches and analyzes pull request comments
- **Action Item Tracking**: Identifies action items, requested changes, and concerns from PR comments
- **Resolution Confidence**: Analyzes recent changes against PR comments to determine resolution confidence
- **Commit Context**: Includes PR context in commit messages automatically
- **Auto-Detection**: Automatically detects repository information from git remotes when `autoDetect` is true

The GitHub integration analyzes PR comments using keyword detection to categorize them as:
- **Action Items**: Comments containing words like "please", "fix", "change", "must", "TODO"
- **Requested Changes**: Inline code review comments requesting specific modifications
- **Concerns**: Comments mentioning "issue", "problem", "bug", "error", "regression"
- **Suggestions**: Comments with "consider", "suggest", "recommend", "maybe"

Resolution confidence is calculated based on:
- File matching between comments and recent changes (70% weight)
- Keyword analysis in commit messages (30% weight)
- Provides high (≥80%), moderate (≥50%), or low (<50%) confidence scores

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

- **`check_github_pr`** - Check GitHub PR comments and resolution status
  ```
  @test-running-agent check_github_pr
  @test-running-agent check_github_pr branch: "feature/new-feature"
  ```

- **`analyze_pr_resolutions`** - Analyze how well recent changes address PR comments
  ```
  @test-running-agent analyze_pr_resolutions
  @test-running-agent analyze_pr_resolutions changedFiles: ["src/app.ts", "src/utils.ts"]
  ```

### Example Workflow

1. Start watching files:
   ```
   @test-running-agent start_watching
   ```

2. Make changes to your code - tests will run automatically

3. Before committing, check git status and PR comments:
   ```
   @test-running-agent check_git_status
   @test-running-agent check_github_pr
   ```

4. Verify PR comments are addressed:
   ```
   @test-running-agent analyze_pr_resolutions
   ```

5. Generate a commit message:
   ```
   @test-running-agent generate_commit_message
   ```

6. Stop watching when done:
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
