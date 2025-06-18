# Advanced Features Documentation

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Smart Test Selection Algorithm](#smart-test-selection-algorithm)
2. [Complexity Analysis System](#complexity-analysis-system)
3. [Coverage-Driven Decision Making](#coverage-driven-decision-making)
4. [MCP Integration Architecture](#mcp-integration-architecture)
5. [Stagehand UI Testing](#stagehand-ui-testing)
6. [Git Integration Advanced Features](#git-integration-advanced-features)
7. [JIRA Intelligence](#jira-intelligence)
8. [Environment Coordination](#environment-coordination)
9. [Configuration Discovery System](#configuration-discovery-system)
10. [Real-time Communication Protocol](#real-time-communication-protocol)

---

## Smart Test Selection Algorithm

### Overview
The Test Running Agent employs an intelligent algorithm that analyzes multiple factors to determine which tests to run, preventing over-testing while ensuring comprehensive coverage.

### Decision Factors

#### 1. **File Change Analysis**
```typescript
// Analyzes changed files and maps to test suites
const changedFiles = await this.detectChanges();
const relevantTests = this.mapFilesToTests(changedFiles);
```

**Mapping Logic:**
- **API Changes** (`**/api/**`, `**/controllers/**`) → Postman collections
- **Component Changes** (`**/*.tsx`, `**/*.jsx`) → Storybook tests
- **Critical Path Changes** (auth, payment) → Full test suite
- **Utility Changes** → Related unit tests only

#### 2. **Coverage-Based Prioritization**
```json
{
  "coverageThresholds": {
    "unit": 80,      // Below 80% → Run unit tests
    "integration": 70, // Below 70% → Run integration tests  
    "e2e": 60         // Below 60% → Run E2E tests
  }
}
```

**Coverage Decision Tree:**
1. **File coverage < 80%** → High priority unit tests
2. **Critical path coverage < 70%** → Integration tests
3. **Overall coverage < 60%** → Full E2E test suite
4. **Coverage declining** → Comprehensive testing

#### 3. **Critical Path Detection**
```json
{
  "criticalPaths": {
    "patterns": [
      "**/auth/**",
      "**/payment/**", 
      "**/api/security/**",
      "**/core/database/**"
    ]
  }
}
```

**Impact:** Any change to critical paths triggers comprehensive testing including E2E scenarios.

### Algorithm Implementation

```typescript
export class SmartTestSelector {
  async selectTests(changedFiles: string[]): Promise<TestDecision> {
    const coverage = await this.analyzeCoverage();
    const isCritical = this.containsCriticalChanges(changedFiles);
    const lowCoverageFiles = this.findLowCoverageFiles(coverage);
    
    if (isCritical) {
      return { suites: ['all'], reason: 'Critical path changes detected' };
    }
    
    if (coverage.overall < 0.6) {
      return { suites: ['e2e', 'integration', 'unit'], reason: 'Very low coverage' };
    }
    
    return this.buildIncrementalStrategy(changedFiles, coverage);
  }
}
```

---

## Complexity Analysis System

### Cyclomatic Complexity Calculation

The agent performs AST-based analysis of TypeScript code to calculate cyclomatic complexity:

#### **Complexity Factors**
```typescript
const complexityFactors = {
  ifStatement: 1,
  conditionalExpression: 1,  // ternary operators
  forStatement: 1,
  whileStatement: 1,
  doWhileStatement: 1,
  switchCase: 1,
  logicalExpression: 1,      // &&, ||, ??
  catchClause: 1
};
```

#### **Historical Comparison**
```bash
# Compare current file with previous git version
test-agent complexity --files src/utils/complex.ts --compare

# Output shows:
# Function: processData
#   Current:  12 (HIGH)
#   Previous: 8 (MEDIUM)  
#   Change:   +4 (+50%)
```

#### **Configuration**
```json
{
  "complexity": {
    "enabled": true,
    "warningThreshold": 10,
    "errorThreshold": 20,
    "includePatterns": ["src/**/*.ts"],
    "excludePatterns": ["**/*.test.ts"],
    "gitComparison": true
  }
}
```

### Advanced Analysis Features

#### **Function-Level Analysis**
```typescript
interface ComplexityResult {
  function: string;
  complexity: number;
  line: number;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

#### **Automatic Refactoring Suggestions**
- Functions with complexity > 15: "Consider breaking into smaller functions"
- High nesting detected: "Consider early returns to reduce nesting"
- Many conditionals: "Consider using strategy pattern or lookup tables"

---

## Coverage-Driven Decision Making

### Coverage Analysis Pipeline

#### 1. **Coverage Data Collection**
```typescript
// Supports multiple coverage formats
const coverageSource = [
  'coverage/coverage-summary.json',  // Jest
  'coverage/lcov.info',             // Standard LCOV
  'cypress-coverage/coverage.json'   // Cypress
];
```

#### 2. **Historical Trend Analysis**
```typescript
interface CoverageTrend {
  current: number;
  previous: number;
  trend: 'improving' | 'declining' | 'stable';
  changePercent: number;
}
```

#### 3. **File-Level Recommendations**
```typescript
interface CoverageRecommendation {
  file: string;
  currentCoverage: number;
  recommendation: 'add_unit_tests' | 'add_integration_tests' | 'add_e2e_coverage';
  priority: 'high' | 'medium' | 'low';
  suggestedTests: string[];
}
```

### Decision Logic

```typescript
export class CoverageAnalyzer {
  async analyzeAndRecommend(): Promise<TestDecision> {
    const coverage = await this.loadCoverage();
    const trends = this.analyzeTrends(coverage);
    
    // Critical decision points
    if (coverage.overall < 0.6) {
      return { strategy: 'comprehensive', suites: ['all'] };
    }
    
    if (trends.declining && trends.changePercent > -5) {
      return { strategy: 'recovery', suites: ['unit', 'integration'] };
    }
    
    return this.buildTargetedStrategy(coverage);
  }
}
```

---

## MCP Integration Architecture

### MCP Server Implementation

The agent implements a full MCP (Model Context Protocol) server with 11 specialized tools:

#### **Tool Categories**

1. **Development Workflow**
   - `start_watching` / `stop_watching`: File monitoring control
   - `run_tests`: Intelligent test execution
   - `get_status`: Comprehensive agent status

2. **Code Quality**
   - `analyze_coverage`: Coverage analysis with recommendations
   - `analyze_complexity`: Complexity analysis with git comparison
   - `compare_complexity`: Historical complexity comparison

3. **Project Management**
   - `check_jira`: JIRA ticket analysis and validation
   - `generate_commit_message`: Intelligent commit message generation
   - `check_git_status`: Git repository status and recommendations

4. **Testing & QA**
   - `run_e2e`: Stagehand UI test execution
   - `check_environments`: Jenkins environment monitoring

#### **MCP Registration Process**

```bash
# Automatic registration with Cursor IDE
npm run install-mcp

# Manual registration
{
  "servers": {
    "test-running-agent": {
      "command": "node",
      "args": ["dist/mcp-server.js"],
      "cwd": "/path/to/test-running-agent"
    }
  }
}
```

#### **Advanced MCP Features**

##### **Tool Chaining**
```typescript
// Example: Automatic workflow
@test-running-agent check_git_status
// If behind → suggests pull
@test-running-agent run_tests
// After tests → suggests commit
@test-running-agent generate_commit_message
```

##### **Cursor IDE Integration**
```typescript
// Available in Cursor as:
@test-running-agent start_watching projectPath: "/path/to/project"
@test-running-agent run_tests files: ["src/app.ts", "src/utils.ts"]
@test-running-agent check_jira
```

---

## Stagehand UI Testing

### Scenario Definition System

#### **JSON Scenarios**
```json
{
  "scenarios": [
    {
      "name": "User Login Flow",
      "description": "Complete user authentication process",
      "baseUrl": "http://localhost:3000",
      "steps": [
        "Navigate to /login",
        "Fill email field with 'test@example.com'",
        "Fill password field with secure password",
        "Click 'Sign In' button",
        "Verify redirect to dashboard",
        "Confirm user menu displays correct name"
      ]
    }
  ]
}
```

#### **YAML Scenarios**
```yaml
scenarios:
  - name: E-commerce Checkout
    description: Complete purchase flow
    steps:
      - "Add product to cart"
      - "Proceed to checkout"
      - "Fill shipping information"
      - "Select payment method"
      - "Complete purchase"
      - "Verify order confirmation"
```

### Advanced Stagehand Features

#### **Screenshot Management**
```typescript
interface StagehandConfig {
  screenshotMode: 'always' | 'on_failure' | 'never';
  screenshotPath: './e2e-screenshots';
  beforeAfterComparison: boolean;
}
```

#### **Scenario Validation**
```typescript
// Automatic scenario analysis
const validationResult = {
  clarity: 'good' | 'needs_improvement' | 'poor',
  suggestions: string[],
  missingSteps: string[]
};
```

#### **MCP Integration**
```typescript
// Execute through MCP
await mcpClient.callTool('stagehand-web-automation', {
  scenario: scenarioDefinition,
  baseUrl: config.stagehand.baseUrl,
  takeScreenshots: true
});
```

---

## Git Integration Advanced Features

### Branch Status Analysis

#### **Comprehensive Status Checking**
```typescript
interface GitStatus {
  branch: string;
  isMainBranch: boolean;
  aheadBy: number;      // Commits ahead of remote
  behindBy: number;     // Commits behind remote
  hasUncommitted: boolean;
  conflictPotential: 'low' | 'medium' | 'high';
  needsRebase: boolean;
}
```

#### **Merge Conflict Prediction**
```typescript
async checkConflictPotential(): Promise<ConflictAnalysis> {
  const changedFiles = await this.getChangedFiles();
  const mainChanges = await this.getMainBranchChanges();
  
  const overlapping = changedFiles.filter(file => 
    mainChanges.includes(file)
  );
  
  return {
    risk: overlapping.length > 0 ? 'high' : 'low',
    overlappingFiles: overlapping,
    recommendation: this.generateRecommendation(overlapping)
  };
}
```

### Smart Main Branch Detection

```typescript
async detectMainBranch(): Promise<string> {
  const branches = ['main', 'master', 'development', 'dev'];
  
  for (const branch of branches) {
    if (await this.branchExists(branch)) {
      return branch;
    }
  }
  
  throw new Error('Could not detect main branch');
}
```

---

## JIRA Intelligence

### Ticket Analysis System

#### **Requirement Completeness Check**
```typescript
interface RequirementAnalysis {
  hasAcceptanceCriteria: boolean;
  hasDescription: boolean;
  missingRequirements: string[];
  score: number; // 0-100
  suggestions: string[];
}
```

#### **Pattern Matching**
```typescript
const requirementPatterns = [
  /acceptance criteria/i,
  /definition of done/i,
  /requirements?/i,
  /should be able to/i,
  /user can/i,
  /system must/i
];
```

#### **Comment Analysis**
```typescript
interface ActionableComment {
  author: string;
  created: Date;
  body: string;
  isActionable: boolean;
  requiresResponse: boolean;
  category: 'question' | 'change_request' | 'feedback';
}
```

### Intelligent Commit Message Generation

#### **Message Templates**
```typescript
const commitTemplates = {
  feature: "feat({ticket}): {description}\n\nImplements {ticketTitle}\nResolves: {ticketKey}",
  bugfix: "fix({ticket}): {description}\n\nFixes {ticketTitle}\nCloses: {ticketKey}",
  improvement: "refactor({ticket}): {description}\n\nImproves {ticketTitle}\nRefs: {ticketKey}"
};
```

#### **Automatic Categorization**
```typescript
function categorizeTicket(ticket: JiraTicket): CommitType {
  const title = ticket.fields.summary.toLowerCase();
  const type = ticket.fields.issuetype.name.toLowerCase();
  
  if (type.includes('bug') || title.includes('fix')) return 'bugfix';
  if (type.includes('story') || title.includes('feature')) return 'feature';
  return 'improvement';
}
```

---

## Environment Coordination

### Jenkins Environment Monitoring

#### **HTML Parsing System**
```typescript
interface EnvironmentStatus {
  name: string;
  deployedBranch: string;
  status: 'healthy' | 'deploying' | 'failed' | 'unknown';
  lastDeployment: Date;
  isNonMaster: boolean;
}
```

#### **Conflict Detection**
```typescript
async checkDeploymentConflicts(): Promise<ConflictWarning[]> {
  const environments = await this.parseEnvironments();
  const conflicts = [];
  
  // Detect multiple branches deployed
  const deployedBranches = new Set(
    environments.map(env => env.deployedBranch)
  );
  
  if (deployedBranches.size > 1) {
    conflicts.push({
      type: 'multiple_branches',
      environments: environments,
      recommendation: 'Consider coordinating deployments'
    });
  }
  
  return conflicts;
}
```

### Multi-Environment Strategy

#### **Environment Priority**
```typescript
const environmentPriority = {
  'production': 10,
  'staging': 8,
  'pre-prod': 7,
  'qa': 5,
  'development': 3,
  'feature': 1
};
```

#### **Deployment Coordination**
```typescript
interface DeploymentCoordination {
  canDeploy: boolean;
  blockers: string[];
  recommendations: string[];
  affectedEnvironments: string[];
}
```

---

## Configuration Discovery System

### Multi-Location Search Algorithm

#### **Search Priority**
```typescript
const configSearchPaths = [
  process.env.TEST_AGENT_CONFIG,           // Environment variable
  './test-agent.config.json',              // Current directory
  '../test-agent.config.json',             // Parent directory
  '../../test-agent.config.json',          // Grandparent directory
  '~/.config/test-agent/config.json'       // User config directory
];
```

#### **Path Resolution**
```typescript
class ConfigLoader {
  resolvePaths(config: Config): Config {
    const configDir = path.dirname(this.configPath);
    
    // Resolve relative paths from config file location
    if (config.projectRoot && !path.isAbsolute(config.projectRoot)) {
      config.projectRoot = path.resolve(configDir, config.projectRoot);
    }
    
    return config;
  }
}
```

### Environment Variable Substitution

```json
{
  "jira": {
    "baseUrl": "${JIRA_BASE_URL}",
    "apiToken": "${JIRA_API_TOKEN}",
    "email": "${JIRA_EMAIL}"
  },
  "postman": {
    "environment": "${POSTMAN_ENV_PATH:-./postman/environment.json}"
  }
}
```

---

## Real-time Communication Protocol

### WebSocket Message Format

#### **Message Types**
```typescript
interface WebSocketMessage {
  type: 'test-result' | 'file-change' | 'status' | 'command';
  timestamp: string;
  data: any;
  id?: string;
}
```

#### **Test Result Messages**
```typescript
interface TestResultMessage {
  type: 'test-result';
  data: {
    suite: string;
    status: 'passed' | 'failed' | 'running';
    results: TestResult[];
    coverage?: CoverageData;
    duration: number;
  };
}
```

#### **Command Messages**
```typescript
interface CommandMessage {
  type: 'command';
  data: {
    action: 'run-tests' | 'stop-tests' | 'get-status';
    parameters?: any;
  };
}
```

### Multi-Client Support

```typescript
class CursorIntegration {
  private clients = new Map<string, WebSocket>();
  
  broadcast(message: WebSocketMessage): void {
    this.clients.forEach((client, id) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}
```

---

## Performance Optimizations

### Caching Strategy

#### **Coverage Data Caching**
```typescript
interface CoverageCache {
  timestamp: number;
  coverage: CoverageData;
  filesHash: string;  // Hash of watched files
}
```

#### **Complexity Analysis Caching**
```typescript
interface ComplexityCache {
  [filePath: string]: {
    hash: string;
    complexity: ComplexityResult;
    timestamp: number;
  };
}
```

### Debouncing and Throttling

#### **File Change Debouncing**
```typescript
class FileWatcher {
  private changeQueue = new Map<string, NodeJS.Timeout>();
  
  private debounceChange(filePath: string): void {
    if (this.changeQueue.has(filePath)) {
      clearTimeout(this.changeQueue.get(filePath)!);
    }
    
    const timeout = setTimeout(() => {
      this.processChange(filePath);
      this.changeQueue.delete(filePath);
    }, this.debounceMs);
    
    this.changeQueue.set(filePath, timeout);
  }
}
```

### Memory Management

#### **Historical Data Limits**
```typescript
const LIMITS = {
  COVERAGE_HISTORY: 50,    // Keep last 50 coverage runs
  COMPLEXITY_CACHE: 1000,  // Cache up to 1000 file analyses
  LOG_RETENTION: 100       // Keep last 100 log entries
};
```

---

## Security Considerations

### API Token Management

```typescript
interface SecureConfig {
  jira?: {
    apiToken: string;     // Encrypted or env var
    email: string;
  };
  slack?: {
    webhookUrl: string;   // Secured webhook URL
  };
}
```

### Input Validation

```typescript
function validateConfig(config: unknown): Config {
  // Comprehensive schema validation
  // Sanitize all user inputs
  // Validate file paths
  // Check URL formats
  return validatedConfig;
}
```

### Error Handling

```typescript
class SecureErrorHandler {
  sanitizeError(error: Error): Error {
    // Remove sensitive information
    // Sanitize stack traces
    // Log securely
    return sanitizedError;
  }
}
```

---

This advanced features documentation provides deep technical insights into the sophisticated capabilities of the Test Running Agent, enabling power users to leverage the full potential of the system.