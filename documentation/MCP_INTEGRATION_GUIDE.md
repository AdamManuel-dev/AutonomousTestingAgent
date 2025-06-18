# MCP Integration Comprehensive Guide

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [MCP Overview](#mcp-overview)
2. [Installation and Setup](#installation-and-setup)
3. [Available MCP Tools](#available-mcp-tools)
4. [Tool Usage Examples](#tool-usage-examples)
5. [Advanced Integration Patterns](#advanced-integration-patterns)
6. [Cursor IDE Integration](#cursor-ide-integration)
7. [Tool Chaining Workflows](#tool-chaining-workflows)
8. [Configuration and Customization](#configuration-and-customization)
9. [Troubleshooting](#troubleshooting)
10. [Development and Extension](#development-and-extension)

---

## MCP Overview

The Test Running Agent implements a comprehensive MCP (Model Context Protocol) server that exposes 11 specialized tools for development workflow automation. This integration allows AI assistants like Claude in Cursor IDE to directly control and interact with the testing agent.

### What is MCP?

MCP (Model Context Protocol) is a standardized protocol that allows AI assistants to interact with external tools and services. In the context of the Test Running Agent, MCP enables:

- **Direct Tool Access**: AI can directly execute tests, analyze code, and check project status
- **Workflow Automation**: Chain multiple operations together intelligently
- **Real-time Integration**: Live interaction with development tools
- **Context Awareness**: AI understands project state and can make informed decisions

---

## Installation and Setup

### Automatic Setup (Recommended)

```bash
cd test-running-agent
./setup-mcp.sh
```

This script will:
1. Build the project
2. Install to Cursor's MCP registry
3. Create backup of existing MCP configuration
4. Validate installation

### Manual Setup

#### 1. Build the Project
```bash
npm install
npm run build
```

#### 2. Register with Cursor
```bash
# Preview changes (dry run)
npm run install-mcp -- --dry-run

# Install to Cursor
npm run install-mcp

# Uninstall if needed
npm run uninstall-mcp
```

#### 3. Manual Registration
Add to `~/.cursor/mcp.json`:
```json
{
  "servers": {
    "test-running-agent": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "cwd": "/path/to/test-running-agent",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

### Verification

Test the installation in Cursor:
```
@test-running-agent get_status
```

You should see agent status information.

---

## Available MCP Tools

### 1. Agent Control Tools

#### `start_watching`
**Purpose**: Start file monitoring and automatic test execution

**Parameters**:
- `projectPath` (optional): Project directory to monitor

**Usage**:
```
@test-running-agent start_watching
@test-running-agent start_watching projectPath: "/path/to/project"
```

**Response**:
```
✅ Started watching files in: /path/to/project
📊 Configuration: test-agent.config.json
🎯 Monitoring 3 test suites: jest, cypress, storybook
⚡ File changes will trigger automatic tests
```

#### `stop_watching`
**Purpose**: Stop file monitoring

**Usage**:
```
@test-running-agent stop_watching
```

#### `get_status`
**Purpose**: Get comprehensive agent status

**Usage**:
```
@test-running-agent get_status
```

**Response**:
```
🤖 Test Running Agent Status
Status: ✅ Active and watching files
Project: /Users/dev/my-project
Config: test-agent.config.json
Watching: src/**/*.ts, src/**/*.tsx, **/*.test.ts

📊 Test Suites:
✅ jest - Priority 3 - Unit tests
✅ cypress - Priority 1 - E2E tests
✅ storybook - Priority 2 - Component tests

🔌 Integrations:
✅ Git Integration - main branch, up to date
✅ Coverage Analysis - 84.2% overall coverage
⚠️  JIRA Integration - Disabled
✅ Cursor Integration - WebSocket on port 3456
```

### 2. Testing Tools

#### `run_tests`
**Purpose**: Execute tests with intelligent selection

**Parameters**:
- `files` (optional): Specific files to test
- `suites` (optional): Specific test suites to run

**Usage**:
```
@test-running-agent run_tests
@test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
@test-running-agent run_tests suites: ["jest", "cypress"]
```

**Response**:
```
🧪 Running intelligent test selection...

📊 Test Decision Analysis:
• Changed files: 2
• Coverage impact: Medium
• Critical paths: None
• Recommended strategy: Unit tests + Integration tests

🏃‍♂️ Executing Tests:
✅ Jest: 24 tests passed, 0 failed (2.3s)
✅ Coverage: 86.4% (+2.2%)

💡 Recommendations:
• src/utils.ts: Add integration tests (current coverage: 72%)
• Consider adding E2E tests for auth flow
```

#### `run_e2e`
**Purpose**: Execute Stagehand UI tests

**Parameters**:
- `scenario` (optional): Specific scenario name
- `baseUrl` (optional): Override base URL

**Usage**:
```
@test-running-agent run_e2e
@test-running-agent run_e2e scenario: "User Login Flow"
@test-running-agent run_e2e baseUrl: "http://localhost:3001"
```

### 3. Code Quality Tools

#### `analyze_coverage`
**Purpose**: Comprehensive coverage analysis with recommendations

**Usage**:
```
@test-running-agent analyze_coverage
```

**Response**:
```
📊 Coverage Analysis Report

Overall Coverage: 84.2% (Excellent)
Trend: ↗️ +3.1% from last run

📈 Coverage by Type:
• Unit Tests: 89.3% (Above threshold: 80%)
• Integration: 76.8% (Above threshold: 70%)
• E2E: 58.4% (Below threshold: 60%)

⚠️  Files Needing Attention:
• src/api/auth.ts: 67.2% - Add integration tests
• src/utils/validation.ts: 45.8% - Critical: Add unit tests
• src/components/Payment.tsx: 52.1% - Add component tests

💡 Recommendations:
1. Focus on auth module testing (critical path)
2. Add E2E tests to reach 60% threshold
3. Payment component needs Storybook tests
```

#### `analyze_complexity`
**Purpose**: Code complexity analysis

**Parameters**:
- `files` (optional): Specific files to analyze

**Usage**:
```
@test-running-agent analyze_complexity
@test-running-agent analyze_complexity files: ["src/app.ts", "src/complex.ts"]
```

#### `compare_complexity`
**Purpose**: Compare complexity with previous version

**Parameters**:
- `file`: File to compare

**Usage**:
```
@test-running-agent compare_complexity file: "src/utils/processor.ts"
```

**Response**:
```
📊 Complexity Comparison: src/utils/processor.ts

Function: processUserData
• Current: 15 (HIGH) ⚠️
• Previous: 9 (MEDIUM)
• Change: +6 (+67%) 📈

Function: validateInput  
• Current: 8 (MEDIUM)
• Previous: 8 (MEDIUM)
• Change: No change ✅

💡 Refactoring Suggestions:
• processUserData: Consider breaking into smaller functions
• High nesting level detected: Consider early returns
• 5 conditional branches: Consider strategy pattern
```

### 4. Project Management Tools

#### `check_jira`
**Purpose**: JIRA ticket analysis and validation

**Usage**:
```
@test-running-agent check_jira
```

**Response**:
```
🎫 JIRA Analysis: DEV-1234

Ticket: "Implement user authentication"
Status: In Progress
Type: Story

✅ Ticket Completeness (Score: 85/100):
• ✅ Has description
• ✅ Has acceptance criteria
• ⚠️  Missing: Definition of done
• ✅ Assigned and prioritized

📝 Unaddressed Comments (2):
• John Smith (2 days ago): "What about 2FA requirements?"
• Sarah Johnson (1 day ago): "Should support social login?"

💡 Recommendations:
1. Address John's question about 2FA implementation
2. Clarify social login requirements with Sarah
3. Add definition of done checklist
```

#### `generate_commit_message`
**Purpose**: Generate intelligent commit messages based on changes and JIRA ticket

**Usage**:
```
@test-running-agent generate_commit_message
```

**Response**:
```
📝 Generated Commit Message:

feat(DEV-1234): implement OAuth2 user authentication system

- Add OAuth2 provider integration with Google and GitHub
- Implement JWT token management and refresh logic
- Add user session persistence with secure storage
- Create authentication middleware for protected routes

Implements: DEV-1234 - Implement user authentication
Resolves acceptance criteria for secure login system

Co-authored-by: Test Running Agent <agent@test-runner.dev>
```

#### `check_git_status`
**Purpose**: Comprehensive Git repository analysis

**Usage**:
```
@test-running-agent check_git_status
```

**Response**:
```
🔄 Git Status Analysis

Branch: feature/DEV-1234-auth
Status: ⚠️ Needs attention

📊 Branch Status:
• Behind origin: 2 commits
• Ahead of main: 5 commits  
• Uncommitted changes: 3 files

⚠️  Potential Issues:
• main branch has 2 new commits since you started
• Possible merge conflicts in: src/config/auth.ts
• Large changes detected: Consider splitting commits

🔧 Recommendations:
1. Pull latest changes: git pull origin main
2. Review potential conflicts before merging
3. Consider rebasing for cleaner history
4. Run tests after merging main
```

#### `check_environments`
**Purpose**: Monitor deployment environments

**Usage**:
```
@test-running-agent check_environments
```

**Response**:
```
🌍 Environment Status

🟢 Production: main branch (healthy)
🟡 Staging: feature/payment-fix (⚠️ non-master branch)
🟢 QA: main branch (healthy)
🔴 Development: deploy-failed (deployment failed)

⚠️  Alerts:
• Staging has non-master branch deployed
• Development environment deployment failed
• Consider coordinating with team before pushing

💡 Recommendations:
1. Check with DevOps about staging deployment
2. Review development environment logs
3. Wait for staging tests before production deploy
```

---

## Tool Usage Examples

### Morning Workflow

```
# Check overall project status
@test-running-agent get_status

# Check git status for branch updates
@test-running-agent check_git_status

# Start file monitoring for the day
@test-running-agent start_watching

# Check if JIRA ticket needs attention
@test-running-agent check_jira
```

### Before Committing

```
# Run targeted tests
@test-running-agent run_tests

# Check code complexity
@test-running-agent analyze_complexity files: ["src/newfeature.ts"]

# Generate commit message
@test-running-agent generate_commit_message

# Final git status check
@test-running-agent check_git_status
```

### Code Review Preparation

```
# Comprehensive coverage analysis
@test-running-agent analyze_coverage

# Compare complexity changes
@test-running-agent compare_complexity file: "src/modified-file.ts"

# Run E2E tests
@test-running-agent run_e2e

# Check environment status
@test-running-agent check_environments
```

---

## Advanced Integration Patterns

### Conditional Workflows

#### Coverage-Driven Testing
```
# Claude can analyze coverage and decide which tests to run
@test-running-agent analyze_coverage

# Based on results, run specific test types
# If coverage < 60%: run E2E tests
# If unit coverage < 80%: focus on unit tests
@test-running-agent run_tests suites: ["jest"]
```

#### Git-Based Decisions
```
# Check git status first
@test-running-agent check_git_status

# If behind main, suggest pulling before testing
# If conflicts detected, run extra validation
@test-running-agent run_tests
```

### Smart Workflows

#### Pre-Push Workflow
```typescript
// Example: Claude's decision-making process
1. @test-running-agent check_git_status
   → If behind: suggest pull
   → If conflicts: warn and test thoroughly

2. @test-running-agent run_tests
   → Based on changed files

3. @test-running-agent analyze_coverage
   → Ensure coverage maintained

4. @test-running-agent generate_commit_message
   → Create meaningful commit

5. @test-running-agent check_environments
   → Verify deployment safety
```

#### Bug Investigation Workflow
```typescript
1. @test-running-agent analyze_complexity files: ["problematic-file.ts"]
   → Identify complexity hotspots

2. @test-running-agent compare_complexity file: "problematic-file.ts"
   → Check if complexity increased

3. @test-running-agent analyze_coverage
   → Find coverage gaps

4. @test-running-agent run_tests files: ["problematic-file.ts"]
   → Run targeted tests
```

---

## Cursor IDE Integration

### Using MCP Tools in Cursor

#### Basic Usage
```
# Prefix with @test-running-agent
@test-running-agent [tool_name] [parameters]
```

#### In Code Comments
```typescript
// Ask Claude to run tests for this file
// @test-running-agent run_tests files: ["src/current-file.ts"]

function complexFunction() {
  // Ask Claude to check complexity
  // @test-running-agent analyze_complexity files: ["src/current-file.ts"]
}
```

#### In Chat
```
Can you check the test coverage for the auth module and run appropriate tests?

Claude will use:
1. @test-running-agent analyze_coverage
2. @test-running-agent run_tests files: ["src/auth/**"]
```

### WebSocket Integration

The agent also provides real-time WebSocket integration with Cursor:

```typescript
// WebSocket messages to Cursor
{
  type: 'test-result',
  data: {
    suite: 'jest',
    status: 'passed',
    coverage: { overall: 86.4 }
  }
}
```

### Configuration in Cursor

#### Workspace Settings
```json
{
  "mcp.servers": {
    "test-running-agent": {
      "enabled": true,
      "autostart": true
    }
  }
}
```

---

## Tool Chaining Workflows

### Automatic Chaining Examples

#### Development Session Start
```typescript
// Claude can execute this sequence automatically
const morningWorkflow = [
  '@test-running-agent get_status',           // Check agent status
  '@test-running-agent check_git_status',     // Check git state
  '@test-running-agent check_jira',           // Review ticket
  '@test-running-agent start_watching'        // Begin monitoring
];
```

#### Pre-Deployment Checklist
```typescript
const deploymentChecklist = [
  '@test-running-agent run_tests',            // Full test run
  '@test-running-agent analyze_coverage',     // Coverage check
  '@test-running-agent check_environments',   // Environment status
  '@test-running-agent check_git_status',     // Git validation
  '@test-running-agent generate_commit_message' // Final commit
];
```

#### Code Quality Review
```typescript
const qualityReview = [
  '@test-running-agent analyze_complexity files: ["changed-files"]',
  '@test-running-agent compare_complexity file: "target-file"',
  '@test-running-agent analyze_coverage',
  '@test-running-agent run_tests suites: ["jest"]'
];
```

### Conditional Chaining

#### Smart Test Selection
```typescript
// Claude's decision logic
if (coverageBelow60) {
  await callTool('run_e2e');
} else if (complexityIncreased) {
  await callTool('run_tests', { suites: ['jest', 'integration'] });
} else {
  await callTool('run_tests', { files: changedFiles });
}
```

#### Git Workflow Automation
```typescript
// Adaptive git workflow
const gitStatus = await callTool('check_git_status');

if (gitStatus.behind) {
  suggest('Pull latest changes first');
} else if (gitStatus.conflicts) {
  await callTool('run_tests'); // Extra validation
  warn('Potential conflicts detected');
} else {
  await callTool('generate_commit_message');
}
```

---

## Configuration and Customization

### MCP Server Configuration

#### Environment Variables
```bash
# MCP server specific settings
export TEST_AGENT_MCP_PORT=3457
export TEST_AGENT_CONFIG=/path/to/config.json
export NODE_ENV=production
```

#### Advanced MCP Settings
```json
{
  "mcp": {
    "enabled": true,
    "registrationPath": "./mcp-registration.json",
    "actionName": "test-running-agent",
    "delegateToCursor": true,
    "timeoutMs": 30000,
    "maxRetries": 3
  }
}
```

### Tool Customization

#### Disable Specific Tools
```json
{
  "mcp": {
    "disabledTools": ["check_environments", "run_e2e"]
  }
}
```

#### Custom Tool Responses
```json
{
  "mcp": {
    "customResponses": {
      "run_tests": {
        "successTemplate": "✅ Tests completed: {passed} passed, {failed} failed",
        "includeRecommendations": true
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues

#### MCP Server Not Starting
```bash
# Check if MCP server is running
curl http://localhost:3457/health

# Check logs
tail -f ~/.cursor/logs/mcp-test-running-agent.log

# Restart MCP server
npm run restart-mcp
```

#### Tools Not Available in Cursor
```bash
# Verify registration
cat ~/.cursor/mcp.json | jq '.servers["test-running-agent"]'

# Re-register
npm run uninstall-mcp && npm run install-mcp

# Check Cursor MCP status
# In Cursor: Cmd+Shift+P → "MCP: Show Status"
```

#### Configuration Issues
```bash
# Validate configuration
npm run validate-config

# Test MCP tools
npm run test-mcp-tools

# Debug mode
DEBUG=mcp:* npm run start-mcp
```

### Error Messages

#### "Agent not initialized"
```bash
# Solution: Start the agent first
@test-running-agent start_watching
```

#### "Configuration not found"
```bash
# Solution: Initialize configuration
npm run init
# or
test-agent init
```

#### "JIRA integration disabled"
```bash
# Solution: Enable and configure JIRA
{
  "jira": {
    "enabled": true,
    "baseUrl": "https://your-company.atlassian.net",
    "apiToken": "your-token",
    "email": "your-email@company.com"
  }
}
```

### Debugging

#### Enable Debug Logging
```bash
export DEBUG=test-agent:*,mcp:*
npm run start-mcp
```

#### MCP Tool Testing
```bash
# Test individual tools
npm run test-mcp-tool -- run_tests
npm run test-mcp-tool -- check_jira
```

---

## Development and Extension

### Adding Custom MCP Tools

#### 1. Define Tool Schema
```typescript
const customTool = {
  name: 'custom_analysis',
  description: 'Perform custom project analysis',
  inputSchema: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        enum: ['security', 'performance', 'dependencies']
      }
    }
  }
};
```

#### 2. Implement Tool Handler
```typescript
async function handleCustomAnalysis(args: any): Promise<any> {
  const { analysisType } = args;
  
  switch (analysisType) {
    case 'security':
      return await performSecurityAnalysis();
    case 'performance':
      return await performPerformanceAnalysis();
    case 'dependencies':
      return await analyzeDependencies();
  }
}
```

#### 3. Register Tool
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === 'custom_analysis') {
    return { content: [{ type: 'text', text: await handleCustomAnalysis(args) }] };
  }
  
  // ... other tools
});
```

### MCP Tool Best Practices

#### Error Handling
```typescript
async function safeMCPTool(toolFunction: Function, args: any) {
  try {
    const result = await toolFunction(args);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message,
      recommendation: 'Check configuration and try again'
    };
  }
}
```

#### Response Formatting
```typescript
function formatMCPResponse(data: any, type: 'success' | 'warning' | 'error') {
  const icons = { success: '✅', warning: '⚠️', error: '❌' };
  
  return `${icons[type]} ${data.title}\n\n${data.details}`;
}
```

#### Tool Chaining Support
```typescript
interface ToolChainContext {
  previousResults: Map<string, any>;
  chainId: string;
  step: number;
}

async function chainableTool(args: any, context?: ToolChainContext) {
  // Use previous results if available
  const prevData = context?.previousResults.get('previous_tool');
  
  // Execute tool logic
  const result = await executeToolLogic(args, prevData);
  
  // Store result for next tool in chain
  if (context) {
    context.previousResults.set('current_tool', result);
  }
  
  return result;
}
```

---

This comprehensive MCP integration guide provides everything needed to effectively use and extend the Test Running Agent's MCP capabilities, enabling powerful AI-driven development workflows.