# Test Running Agent - API Reference

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [MCP Commands](#mcp-commands)
2. [CLI Commands](#cli-commands)
3. [WebSocket API](#websocket-api)
4. [Configuration API](#configuration-api)
5. [Event System](#event-system)
6. [Integration APIs](#integration-apis)

---

## MCP Commands

### Core Testing Commands

#### `start_watching`
Start monitoring files for changes and automatically run tests.

**Usage:**
```
@test-running-agent start_watching
@test-running-agent start_watching projectPath: "/path/to/project"
```

**Parameters:**
- `projectPath` (optional): Override project root directory

**Returns:**
- Status message confirming file watching has started
- Configuration summary
- Active integrations list

---

#### `stop_watching`
Stop file monitoring and test execution.

**Usage:**
```
@test-running-agent stop_watching
```

**Returns:**
- Confirmation that watching has stopped
- Summary of tests run during session

---

#### `run_tests`
Execute tests for specific files or all tests.

**Usage:**
```
@test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
@test-running-agent run_tests files: ["src/app.ts"] coverage: true
@test-running-agent run_tests suites: ["jest", "cypress"]
```

**Parameters:**
- `files` (optional): Array of files to target for testing
- `coverage` (optional): Enable coverage collection (default: true)
- `suites` (optional): Specific test suites to run

**Returns:**
- Test execution results for each suite
- Coverage information (if enabled)
- Duration and status summary

---

### Code Quality Commands

#### `analyze_complexity`
Analyze cyclomatic complexity of code files.

**Usage:**
```
@test-running-agent analyze_complexity
@test-running-agent analyze_complexity files: ["src/services/auth.ts"]
```

**Parameters:**
- `files` (optional): Specific files to analyze (defaults to changed files)

**Returns:**
- Complexity scores for functions, methods, and classes
- Files exceeding warning/error thresholds
- Complexity distribution summary
- Recommendations for refactoring

---

#### `compare_complexity`
Compare complexity with previous version using Git.

**Usage:**
```
@test-running-agent compare_complexity file: "src/services/auth.ts"
```

**Parameters:**
- `file` (required): File to compare

**Returns:**
- Before/after complexity comparison
- Functions with increased complexity
- Complexity change analysis
- Refactoring recommendations

---

#### `analyze_coverage`
Get comprehensive coverage analysis and recommendations.

**Usage:**
```
@test-running-agent analyze_coverage
```

**Returns:**
- Overall coverage percentage
- Files with low coverage
- Uncovered lines identification
- Test recommendations
- Coverage trends

---

### Development Workflow Commands

#### `check_git_status`
Check if branch needs updates or has conflicts.

**Usage:**
```
@test-running-agent check_git_status
```

**Returns:**
- Branch ahead/behind status
- Uncommitted changes
- Merge conflict warnings
- Pull/push recommendations

---

#### `check_jira`
Validate JIRA ticket requirements and completeness.

**Usage:**
```
@test-running-agent check_jira
@test-running-agent check_jira ticketKey: "DEV-1234"
```

**Parameters:**
- `ticketKey` (optional): Specific ticket to check (auto-detected from branch if not provided)

**Returns:**
- Ticket completeness analysis
- Missing requirements identification
- Unaddressed comments
- Ticket status summary

---

#### `check_environments`
Check deployment environment status.

**Usage:**
```
@test-running-agent check_environments
```

**Returns:**
- Current environment deployments
- Non-master branch deployments
- Environment status (up/down)
- Deployment warnings

---

#### `generate_commit_message`
Generate intelligent commit messages.

**Usage:**
```
@test-running-agent generate_commit_message
```

**Returns:**
- Generated commit message based on:
  - JIRA ticket information
  - File changes analysis
  - Change type categorization
  - Project conventions

---

### E2E Testing Commands

#### `run_e2e`
Execute Stagehand UI tests.

**Usage:**
```
@test-running-agent run_e2e
@test-running-agent run_e2e scenario: "User Login Flow"
@test-running-agent run_e2e baseUrl: "http://localhost:3000"
```

**Parameters:**
- `scenario` (optional): Specific scenario to run
- `baseUrl` (optional): Override base URL for testing

**Returns:**
- E2E test execution results
- Screenshots captured
- Step-by-step execution log
- Pass/fail status for each scenario

---

### Status and Information Commands

#### `get_status`
Get current agent status and configuration.

**Usage:**
```
@test-running-agent get_status
```

**Returns:**
- Agent running status
- Active configuration summary
- Enabled integrations
- Last test results
- Performance metrics

---

## CLI Commands

### Basic Commands

#### `start`
Start the test running agent.

**Usage:**
```bash
test-agent start [options]
test-agent start -c config.json -p /path/to/project
```

**Options:**
- `-c, --config <path>`: Configuration file path
- `-p, --project <path>`: Project root directory
- `--cursor-port <port>`: WebSocket port for Cursor IDE (default: 3456)
- `--ci-mode`: Run in CI mode (no file watching, exit after tests)
- `--debug`: Enable debug logging

---

#### `init`
Initialize configuration file.

**Usage:**
```bash
test-agent init [options]
```

**Options:**
- `--template <name>`: Use specific template (basic, advanced, ci)
- `--framework <name>`: Primary test framework (jest, cypress, etc.)
- `--interactive`: Interactive configuration setup

**Creates:**
- `test-agent.config.json` with appropriate defaults
- Sample test configurations
- Basic integration setup

---

#### `test`
Run tests without file watching.

**Usage:**
```bash
test-agent test [options]
test-agent test --files "src/app.ts,src/utils.ts"
test-agent test --suites jest,cypress --coverage
```

**Options:**
- `--files <list>`: Comma-separated list of files
- `--suites <list>`: Specific test suites to run
- `--coverage`: Enable coverage collection
- `--fail-fast`: Stop on first failure
- `--parallel`: Run suites in parallel

---

### Analysis Commands

#### `complexity`
Analyze code complexity.

**Usage:**
```bash
test-agent complexity [options]
test-agent complexity --files "src/**/*.ts" --threshold 15
```

**Options:**
- `--files <pattern>`: File patterns to analyze
- `--threshold <number>`: Complexity threshold
- `--format <format>`: Output format (text, json, html)
- `--output <path>`: Output file path
- `--compare`: Compare with previous version

---

#### `coverage`
Analyze test coverage.

**Usage:**
```bash
test-agent coverage [options]
test-agent coverage --check-thresholds --fail-under 80
```

**Options:**
- `--check-thresholds`: Validate against configured thresholds
- `--fail-under <percent>`: Fail if coverage below threshold
- `--format <format>`: Output format (text, json, lcov)
- `--output <path>`: Output file path

---

### Integration Commands

#### `jira`
JIRA integration commands.

**Usage:**
```bash
test-agent jira [subcommand] [options]
test-agent jira check --ticket DEV-123
test-agent jira commit-message
```

**Subcommands:**
- `check`: Check ticket completeness
- `commit-message`: Generate commit message from ticket

**Options:**
- `--ticket <key>`: Specific ticket key
- `--branch`: Auto-detect from current branch

---

#### `git`
Git integration commands.

**Usage:**
```bash
test-agent git [subcommand]
test-agent git status
test-agent git check-conflicts
```

**Subcommands:**
- `status`: Check branch status
- `check-conflicts`: Predict merge conflicts
- `changed-files`: List changed files

---

### Utility Commands

#### `validate`
Validate configuration and setup.

**Usage:**
```bash
test-agent validate [options]
test-agent validate --config-only --strict
```

**Options:**
- `--config-only`: Validate configuration file only
- `--strict`: Enable strict validation
- `--fix`: Automatically fix issues where possible

---

#### `doctor`
Diagnose installation and configuration issues.

**Usage:**
```bash
test-agent doctor
```

**Checks:**
- Node.js and npm versions
- Required dependencies
- Configuration file validity
- Integration connectivity
- File permissions

---

## WebSocket API

### Connection
Connect to the agent's WebSocket server for real-time updates.

**Endpoint:** `ws://localhost:3456` (default port)

### Message Types

#### Outbound Messages (Agent → Client)

**test-result**
```json
{
  "type": "test-result",
  "data": {
    "suite": "jest",
    "status": "passed|failed",
    "duration": 1234,
    "tests": {
      "total": 10,
      "passed": 8,
      "failed": 2
    },
    "coverage": {
      "lines": 85.5,
      "branches": 78.2
    }
  }
}
```

**file-change**
```json
{
  "type": "file-change",
  "data": {
    "path": "src/app.ts",
    "event": "change|add|delete",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**status**
```json
{
  "type": "status",
  "data": {
    "watching": true,
    "lastTest": "2024-01-01T12:00:00Z",
    "integrations": {
      "jira": "connected",
      "git": "connected"
    }
  }
}
```

#### Inbound Messages (Client → Agent)

**run-tests**
```json
{
  "type": "run-tests",
  "data": {
    "files": ["src/app.ts"],
    "coverage": true
  }
}
```

**stop-tests**
```json
{
  "type": "stop-tests"
}
```

**get-status**
```json
{
  "type": "get-status"
}
```

---

## Configuration API

### Configuration Schema

**Root Configuration:**
```typescript
interface TestAgentConfig {
  projectRoot: string;
  testSuites: TestSuite[];
  excludePatterns: string[];
  debounceMs: number;
  cursorPort: number;
  coverage?: CoverageConfig;
  criticalPaths?: CriticalPathsConfig;
  postman?: PostmanConfig;
  stagehand?: StagehandConfig;
  jira?: JiraConfig;
  environments?: EnvironmentConfig;
  mcp?: MCPConfig;
  notifications?: NotificationConfig;
  complexity?: ComplexityConfig;
}
```

**Test Suite Configuration:**
```typescript
interface TestSuite {
  type: 'jest' | 'cypress' | 'storybook' | 'postman' | 'stagehand';
  pattern: string[];
  command: string;
  coverageCommand?: string;
  watchPattern: string[];
  priority: number;
  enabled: boolean;
}
```

### Environment Variables

- `TEST_AGENT_CONFIG`: Path to configuration file
- `JIRA_API_TOKEN`: JIRA API token
- `SLACK_WEBHOOK`: Slack webhook URL
- `NODE_ENV`: Environment mode
- `DEBUG`: Debug logging patterns

---

## Event System

### Event Types

**file:change**
```typescript
{
  path: string;
  event: 'add' | 'change' | 'unlink';
  stats?: fs.Stats;
}
```

**test:start**
```typescript
{
  suite: string;
  files: string[];
  timestamp: Date;
}
```

**test:complete**
```typescript
{
  suite: string;
  status: 'passed' | 'failed';
  duration: number;
  coverage?: CoverageData;
}
```

**coverage:analysis**
```typescript
{
  overall: number;
  files: FileCoverage[];
  trends: CoverageTrend[];
}
```

**complexity:analysis**
```typescript
{
  files: FileComplexity[];
  violations: ComplexityViolation[];
  summary: ComplexitySummary;
}
```

---

## Integration APIs

### JIRA API Methods

```typescript
// Check ticket completeness
async checkTicketCompleteness(ticketKey: string): Promise<TicketAnalysis>

// Generate commit message
async generateCommitMessage(ticketKey: string): Promise<string>

// Get ticket details
async getTicketDetails(ticketKey: string): Promise<JiraTicket>
```

### Git API Methods

```typescript
// Get branch status
async getBranchStatus(): Promise<BranchStatus>

// Get changed files
async getChangedFiles(): Promise<string[]>

// Check for conflicts
async checkMergeConflicts(): Promise<ConflictInfo[]>
```

### Coverage API Methods

```typescript
// Load coverage data
async loadCoverageData(): Promise<CoverageData>

// Analyze coverage
async analyzeCoverage(): Promise<CoverageAnalysis>

// Get coverage trends
async getCoverageTrends(): Promise<CoverageTrend[]>
```

### Complexity API Methods

```typescript
// Analyze file complexity
async analyzeComplexity(files: string[]): Promise<ComplexityResult>

// Compare complexity
async compareComplexity(file: string): Promise<ComplexityComparison>

// Get complexity violations
async getComplexityViolations(): Promise<ComplexityViolation[]>
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Additional error context"
    }
  }
}
```

### Common Error Codes

- `CONFIG_NOT_FOUND`: Configuration file not found
- `INVALID_CONFIG`: Configuration validation failed
- `TEST_EXECUTION_FAILED`: Test execution failed
- `INTEGRATION_ERROR`: External integration error
- `PERMISSION_DENIED`: File system permission error
- `NETWORK_ERROR`: Network connectivity issue

---

## Rate Limiting

### File Watching
- Debounced to prevent excessive test runs
- Configurable debounce period (default: 1000ms)

### External API Calls
- JIRA: 100 requests per minute
- Git operations: No explicit limits
- MCP calls: Depends on MCP server limits

---

## Authentication

### JIRA Authentication
```json
{
  "jira": {
    "email": "user@company.com",
    "apiToken": "ATATT3xFfGF0..."
  }
}
```

### Slack Authentication
```json
{
  "notifications": {
    "slack": {
      "webhookUrl": "https://hooks.slack.com/services/..."
    }
  }
}
```

### Environment Variables
Store sensitive credentials as environment variables:
- `JIRA_API_TOKEN`
- `SLACK_WEBHOOK_URL`
- `FIGMA_API_TOKEN`

---

This API reference provides comprehensive coverage of all available commands, configurations, and integration points for the Test Running Agent.