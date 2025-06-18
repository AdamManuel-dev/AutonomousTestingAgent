# Test Running Agent - Tutorials

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Workflows](#basic-workflows)
3. [Advanced Configuration](#advanced-configuration)
4. [Integration Setup](#integration-setup)
5. [Development Workflows](#development-workflows)
6. [Team Collaboration](#team-collaboration)
7. [CI/CD Integration](#cicd-integration)

---

## Getting Started

### 🚀 Tutorial 1: First Time Setup

**Goal:** Set up the Test Running Agent for a React project with Jest tests.

**Prerequisites:**
- Node.js 18+
- A React project with Jest tests
- Basic knowledge of npm/yarn

**Steps:**

1. **Install the Agent:**
```bash
cd your-react-project
npm install -g test-running-agent
# or use npx for one-time setup
npx test-running-agent init
```

2. **Initialize Configuration:**
```bash
test-agent init --interactive
```

3. **Review Generated Configuration:**
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
      "enabled": true
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80
    }
  }
}
```

4. **Start the Agent:**
```bash
test-agent start
```

5. **Test It Out:**
- Modify a file in `src/`
- Watch tests run automatically
- Check coverage reports

**Expected Results:**
- Agent starts successfully
- File changes trigger appropriate tests
- Coverage data is collected and analyzed

---

### 🧪 Tutorial 2: Adding Multiple Test Frameworks

**Goal:** Configure Jest, Cypress, and Storybook testing.

**Steps:**

1. **Install Dependencies:**
```bash
npm install --save-dev cypress @storybook/test-runner
```

2. **Update Configuration:**
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
      "enabled": true
    },
    {
      "type": "cypress",
      "pattern": ["cypress/e2e/**/*.cy.ts"],
      "command": "npm run cypress:run",
      "watchPattern": ["src/**/*.ts", "cypress/**/*.ts"],
      "priority": 1,
      "enabled": true
    },
    {
      "type": "storybook",
      "pattern": ["**/*.stories.tsx"],
      "command": "npm run test-storybook",
      "watchPattern": ["src/**/*.tsx", "**/*.stories.tsx"],
      "priority": 2,
      "enabled": true
    }
  ],
  "criticalPaths": {
    "enabled": true,
    "paths": ["src/components/auth", "src/api"],
    "patterns": ["**/auth/**", "**/api/**"]
  }
}
```

3. **Test Priority Behavior:**
- Change a component file → Jest tests run (priority 3)
- Change an API file → All tests run (critical path)
- Change a story file → Storybook tests run (priority 2)

**Learning Points:**
- Higher priority numbers run first
- Critical paths trigger all test suites
- Watch patterns determine which files trigger which tests

---

## Basic Workflows

### 📝 Tutorial 3: Development Workflow with Cursor IDE

**Goal:** Set up seamless integration with Cursor IDE.

**Steps:**

1. **Install MCP Integration:**
```bash
test-agent install-mcp
```

2. **Start Agent with Cursor Support:**
```bash
test-agent start --cursor-port 3456
```

3. **In Cursor IDE, use MCP commands:**

**Start Development Session:**
```
@test-running-agent start_watching
@test-running-agent check_git_status
```

**During Development:**
```
# After making changes
@test-running-agent run_tests files: ["src/components/Button.tsx"]

# Check code quality
@test-running-agent analyze_complexity files: ["src/components/Button.tsx"]
@test-running-agent analyze_coverage
```

**Before Committing:**
```
@test-running-agent check_git_status
@test-running-agent generate_commit_message
@test-running-agent stop_watching
```

**Expected Benefits:**
- Real-time test feedback in Cursor
- Automated code quality checks
- Intelligent commit message generation
- Seamless development workflow

---

### 🔄 Tutorial 4: Git-Based Testing Workflow

**Goal:** Learn how the agent responds to different Git operations.

**Scenario Setup:**
```bash
# Create feature branch
git checkout -b feature/user-authentication

# Make changes to auth-related files
touch src/auth/login.ts src/auth/login.test.ts
```

**Workflow:**

1. **File Changes Trigger Smart Tests:**
```bash
# Edit src/auth/login.ts
# Agent automatically:
# - Detects change in critical path (auth)
# - Runs all test suites
# - Collects coverage data
# - Analyzes complexity
```

2. **Check Integration Status:**
```bash
@test-running-agent check_git_status
# Output:
# ✅ Branch is up to date with origin
# 📝 2 uncommitted changes
# 🎯 Working on feature branch: feature/user-authentication
```

3. **Prepare for Commit:**
```bash
@test-running-agent generate_commit_message
# Output:
# feat: add user authentication system
# 
# Implements login functionality with password validation
# Adds comprehensive test coverage for auth module
# 
# Files changed:
# - src/auth/login.ts (new file)
# - src/auth/login.test.ts (new file)
```

**Learning Points:**
- Agent understands Git context
- Critical path changes trigger comprehensive testing
- Commit messages reflect actual changes made

---

## Advanced Configuration

### ⚙️ Tutorial 5: Complex Multi-Environment Setup

**Goal:** Configure different test strategies for different file types and environments.

**Configuration:**
```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["src/**/*.test.ts"],
      "command": "npm run test:unit",
      "coverageCommand": "npm run test:unit -- --coverage",
      "watchPattern": ["src/**/*.ts"],
      "priority": 4,
      "enabled": true
    },
    {
      "type": "jest",
      "pattern": ["src/**/*.integration.test.ts"],
      "command": "npm run test:integration",
      "watchPattern": ["src/api/**/*.ts", "src/services/**/*.ts"],
      "priority": 3,
      "enabled": true
    },
    {
      "type": "cypress",
      "pattern": ["cypress/e2e/**/*.cy.ts"],
      "command": "npm run cypress:run",
      "watchPattern": ["src/pages/**/*.tsx", "src/components/**/*.tsx"],
      "priority": 1,
      "enabled": true
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 85,
      "integration": 75,
      "e2e": 65
    }
  },
  "criticalPaths": {
    "enabled": true,
    "paths": [
      "src/api/auth",
      "src/api/payment",
      "src/services/security"
    ],
    "patterns": [
      "**/auth/**",
      "**/payment/**",
      "**/security/**"
    ]
  }
}
```

**Test Strategy Logic:**
- **Unit tests** for general source changes
- **Integration tests** for API/service changes
- **E2E tests** for UI component changes
- **All tests** for critical path changes

**Package.json Scripts:**
```json
{
  "scripts": {
    "test:unit": "jest src --testPathIgnorePatterns=integration",
    "test:integration": "jest src --testNamePattern=integration",
    "test:e2e": "cypress run",
    "cypress:run": "cypress run --headless"
  }
}
```

---

### 📊 Tutorial 6: Advanced Coverage and Complexity Analysis

**Goal:** Set up sophisticated code quality monitoring.

**Configuration:**
```json
{
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    },
    "persistPath": "./coverage-history"
  },
  "complexity": {
    "enabled": true,
    "warningThreshold": 8,
    "errorThreshold": 15,
    "includePatterns": ["src/**/*.ts", "src/**/*.tsx"],
    "excludePatterns": [
      "**/*.test.ts",
      "**/*.spec.ts",
      "**/*.stories.tsx",
      "**/types/**"
    ]
  },
  "notifications": {
    "enabled": true,
    "slack": {
      "webhookUrl": "${SLACK_WEBHOOK}",
      "channel": "#code-quality"
    }
  }
}
```

**Workflow:**

1. **Automatic Quality Checks:**
```bash
# Agent automatically analyzes:
# - Coverage trends
# - Complexity increases
# - Quality gate violations
```

2. **Manual Quality Analysis:**
```bash
@test-running-agent analyze_complexity
@test-running-agent compare_complexity file: "src/services/complex-logic.ts"
@test-running-agent analyze_coverage
```

3. **Quality Gate Integration:**
```bash
# In CI/CD pipeline
test-agent complexity --fail-on-high --threshold 15
test-agent coverage --check-thresholds --fail-under 80
```

**Expected Outcomes:**
- Continuous quality monitoring
- Early detection of code quality issues
- Team notifications for quality violations
- Historical quality trends

---

## Integration Setup

### 🎫 Tutorial 7: JIRA Integration Setup

**Goal:** Connect the agent to JIRA for ticket-driven development.

**Prerequisites:**
- JIRA Cloud account
- API token from JIRA
- Branch naming convention: `DEV-123-feature-description`

**Steps:**

1. **Get JIRA API Token:**
- Go to https://id.atlassian.com/manage-profile/security/api-tokens
- Create API token
- Save securely

2. **Configure JIRA Integration:**
```json
{
  "jira": {
    "enabled": true,
    "baseUrl": "https://yourcompany.atlassian.net",
    "email": "your-email@company.com",
    "apiToken": "${JIRA_API_TOKEN}",
    "projectKey": "DEV",
    "branchPattern": "DEV-\\d+"
  }
}
```

3. **Set Environment Variable:**
```bash
export JIRA_API_TOKEN="ATATT3xFfGF0..."
```

4. **Test JIRA Integration:**
```bash
# Create branch following pattern
git checkout -b DEV-123-user-authentication

# Check ticket completeness
@test-running-agent check_jira
```

**Example Output:**
```
🎫 JIRA Ticket Analysis: DEV-123
✅ Ticket found and accessible
✅ Description is complete
⚠️  Missing acceptance criteria
⚠️  2 unaddressed comments found
📝 Suggested commit message:
   feat(auth): implement user authentication system
   
   Resolves DEV-123: Add secure user login functionality
```

5. **Generate Commit Message:**
```bash
@test-running-agent generate_commit_message
```

**Integration Benefits:**
- Automatic ticket validation
- Context-aware commit messages
- Requirement completeness checking
- Action item tracking

---

### 🌐 Tutorial 8: API Testing with Postman

**Goal:** Set up automated API testing using Postman collections.

**Steps:**

1. **Export Postman Collection:**
- In Postman, export your collection as JSON
- Export environment files
- Save to `./postman/` directory

2. **Install Newman:**
```bash
npm install -g newman
```

3. **Configure Postman Integration:**
```json
{
  "postman": {
    "enabled": true,
    "collections": [
      "./postman/api-tests.postman_collection.json",
      "./postman/auth-tests.postman_collection.json"
    ],
    "environment": "./postman/dev-environment.json",
    "globals": "./postman/globals.json",
    "iterationCount": 1
  },
  "testSuites": [
    {
      "type": "postman",
      "pattern": ["src/api/**/*.ts", "src/controllers/**/*.ts"],
      "command": "newman run",
      "watchPattern": ["src/api/**/*.ts", "src/routes/**/*.ts"],
      "priority": 2,
      "enabled": true
    }
  ]
}
```

4. **Test API Change Detection:**
```bash
# Edit an API file
echo "// API change" >> src/api/users.ts

# Agent automatically runs Postman tests
# Output: Newman collection execution results
```

**Collection Structure:**
```
postman/
├── api-tests.postman_collection.json
├── auth-tests.postman_collection.json
├── dev-environment.json
└── globals.json
```

**Benefits:**
- Automatic API testing on code changes
- Environment-specific testing
- Integration with existing Postman workflows
- Detailed API test reporting

---

### 🎭 Tutorial 9: UI Testing with Stagehand

**Goal:** Set up end-to-end UI testing using natural language scenarios.

**Steps:**

1. **Configure Stagehand Integration:**
```json
{
  "stagehand": {
    "enabled": true,
    "baseUrl": "http://localhost:3000",
    "scenariosPath": "./e2e/scenarios",
    "scenarios": [
      {
        "name": "User Registration Flow",
        "description": "Complete user registration process with validation",
        "steps": [
          "Navigate to registration page",
          "Fill in user details form",
          "Submit registration",
          "Verify success message",
          "Check user is logged in"
        ]
      },
      {
        "name": "Shopping Cart Workflow",
        "description": "Add items to cart and checkout",
        "steps": [
          "Browse product catalog",
          "Add items to shopping cart",
          "Review cart contents",
          "Proceed to checkout",
          "Complete payment process"
        ]
      }
    ],
    "promptForClarification": true
  }
}
```

2. **Create External Scenario Files:**
```yaml
# e2e/scenarios/login-flow.yaml
name: "User Login Flow"
description: "Test complete login process with error handling"
steps:
  - "Navigate to login page"
  - "Enter valid email address"
  - "Enter correct password"
  - "Click login button"
  - "Verify dashboard loads"
  - "Check user menu is visible"
```

3. **Enable MCP for Advanced Features:**
```bash
test-agent install-mcp
```

4. **Test UI Change Detection:**
```bash
# Edit a React component
echo "// UI change" >> src/components/LoginForm.tsx

# Agent detects UI change and runs Stagehand tests
```

**Advanced Stagehand Features:**

1. **Dynamic Scenario Generation:**
```bash
@test-running-agent run_e2e scenario: "Test the checkout process with invalid credit card"
```

2. **Screenshot Documentation:**
- Before/after screenshots for each step
- Failure screenshots for debugging
- Visual regression detection

3. **Natural Language Flexibility:**
- Write scenarios in plain English
- Agent clarifies ambiguous instructions
- Adaptive to UI changes

**Benefits:**
- Natural language test scenarios
- Automatic UI testing on component changes
- Visual documentation of test execution
- Integration with development workflow

---

## Development Workflows

### 🔄 Tutorial 10: Feature Development Lifecycle

**Goal:** Complete workflow from feature start to deployment.

**Scenario:** Implementing a new user profile feature

**Workflow:**

1. **Start Feature Development:**
```bash
# Check current state
@test-running-agent check_git_status
@test-running-agent check_environments

# Create feature branch
git checkout -b DEV-456-user-profile-page

# Start agent
@test-running-agent start_watching
```

2. **Development Phase:**
```bash
# Create new files
touch src/components/UserProfile.tsx
touch src/components/UserProfile.test.tsx
touch src/api/userProfile.ts

# Agent automatically:
# - Runs Jest tests for new component
# - Analyzes complexity of new code
# - Tracks coverage for new files
```

3. **Integration Testing:**
```bash
# Add API integration
echo "export const fetchUserProfile = ..." >> src/api/userProfile.ts

# Agent detects API change and:
# - Runs Postman API tests
# - Executes integration tests
# - Updates coverage analysis
```

4. **UI Testing:**
```bash
# Add Storybook story
touch src/components/UserProfile.stories.tsx

# Agent runs Storybook tests
# Optionally runs Stagehand UI tests
```

5. **Quality Checks:**
```bash
# Before committing
@test-running-agent analyze_complexity
@test-running-agent analyze_coverage
@test-running-agent check_jira
```

6. **Commit and Push:**
```bash
@test-running-agent generate_commit_message
@test-running-agent stop_watching

git add .
git commit -m "$(generated message)"
git push origin DEV-456-user-profile-page
```

**Expected Results:**
- Comprehensive test coverage
- Quality gates passed
- JIRA ticket requirements met
- Ready for code review

---

### 🧪 Tutorial 11: Test-Driven Development (TDD) Workflow

**Goal:** Use the agent to support TDD practices.

**TDD Cycle with Agent:**

1. **Red Phase - Write Failing Test:**
```bash
# Create failing test
cat > src/utils/validator.test.ts << EOF
import { validateEmail } from './validator';

describe('validateEmail', () => {
  it('should validate correct email format', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
EOF

# Agent detects new test file and runs it
# Expected: Test fails (function doesn't exist)
```

2. **Green Phase - Make Test Pass:**
```bash
# Implement minimal functionality
cat > src/utils/validator.ts << EOF
export function validateEmail(email: string): boolean {
  return email.includes('@') && email.includes('.');
}
EOF

# Agent detects implementation and reruns tests
# Expected: Test passes
```

3. **Refactor Phase - Improve Code:**
```bash
# Improve implementation
cat > src/utils/validator.ts << EOF
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
EOF

# Agent reruns tests and analyzes complexity
# Expected: Tests still pass, complexity analyzed
```

**TDD Configuration:**
```json
{
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test -- --verbose",
      "watchPattern": ["src/**/*.ts"],
      "priority": 5,
      "enabled": true
    }
  ],
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 90  // Higher threshold for TDD
    }
  }
}
```

**Benefits for TDD:**
- Immediate feedback on test changes
- Automatic test execution on implementation changes
- Coverage tracking for TDD cycles
- Quality analysis during refactoring

---

## Team Collaboration

### 👥 Tutorial 12: Team Configuration Sharing

**Goal:** Set up consistent testing practices across team members.

**Approach 1: Shared Configuration Repository**

1. **Create Team Config Repository:**
```bash
mkdir team-test-configs
cd team-test-configs
git init

# Create base configuration
cat > base.json << EOF
{
  "projectRoot": "./",
  "coverage": {
    "enabled": true,
    "thresholds": {
      "unit": 80,
      "integration": 70,
      "e2e": 60
    }
  },
  "complexity": {
    "enabled": true,
    "warningThreshold": 10,
    "errorThreshold": 20
  },
  "notifications": {
    "slack": {
      "webhookUrl": "${SLACK_WEBHOOK}",
      "channel": "#test-notifications"
    }
  }
}
EOF

git add . && git commit -m "Add base team configuration"
git push origin main
```

2. **Project-Specific Configurations:**
```bash
# Frontend project config
cat > frontend.json << EOF
{
  "extends": "./base.json",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.tsx", "**/*.test.ts"],
      "command": "npm test",
      "coverageCommand": "npm test -- --coverage"
    },
    {
      "type": "storybook",
      "pattern": ["**/*.stories.tsx"],
      "command": "npm run test-storybook"
    }
  ]
}
EOF

# Backend project config
cat > backend.json << EOF
{
  "extends": "./base.json",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    },
    {
      "type": "postman",
      "pattern": ["src/api/**/*.ts"],
      "command": "newman run"
    }
  ]
}
EOF
```

**Approach 2: Environment-Based Configuration**

```bash
# Development environment
export TEST_AGENT_ENV=development
export SLACK_WEBHOOK="https://hooks.slack.com/dev-channel"

# Production environment  
export TEST_AGENT_ENV=production
export SLACK_WEBHOOK="https://hooks.slack.com/prod-channel"
```

**Configuration:**
```json
{
  "environment": "${TEST_AGENT_ENV}",
  "notifications": {
    "slack": {
      "webhookUrl": "${SLACK_WEBHOOK}"
    }
  },
  "coverage": {
    "thresholds": {
      "unit": "${TEST_AGENT_ENV === 'production' ? 90 : 80}"
    }
  }
}
```

---

### 📊 Tutorial 13: Team Dashboard and Monitoring

**Goal:** Set up team-wide visibility into testing metrics.

**Slack Integration Setup:**

1. **Create Slack Webhook:**
- Go to Slack App settings
- Create new webhook for #test-notifications channel
- Copy webhook URL

2. **Configure Team Notifications:**
```json
{
  "notifications": {
    "slack": {
      "webhookUrl": "${SLACK_WEBHOOK}",
      "channel": "#test-notifications",
      "templates": {
        "testSuccess": "✅ Tests passed for {project} - Coverage: {coverage}%",
        "testFailure": "❌ Tests failed for {project} - {failedCount} failures",
        "coverageDrop": "📉 Coverage dropped below threshold for {project}",
        "complexityHigh": "⚠️ High complexity detected in {files}"
      }
    }
  }
}
```

3. **Team Metrics Collection:**
```bash
# Aggregate metrics script
cat > scripts/collect-metrics.sh << EOF
#!/bin/bash

PROJECTS=("frontend" "backend" "mobile")
METRICS_FILE="team-metrics.json"

echo "{" > $METRICS_FILE
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> $METRICS_FILE
echo "  \"projects\": {" >> $METRICS_FILE

for project in "${PROJECTS[@]}"; do
  cd $project
  test-agent coverage --format json > coverage.json
  test-agent complexity --format json > complexity.json
  
  echo "    \"$project\": {" >> ../$METRICS_FILE
  echo "      \"coverage\": $(cat coverage.json)," >> ../$METRICS_FILE
  echo "      \"complexity\": $(cat complexity.json)" >> ../$METRICS_FILE
  echo "    }," >> ../$METRICS_FILE
  
  cd ..
done

echo "  }" >> $METRICS_FILE
echo "}" >> $METRICS_FILE
EOF

chmod +x scripts/collect-metrics.sh
```

**Dashboard Configuration:**
```json
{
  "dashboard": {
    "enabled": true,
    "port": 8080,
    "metrics": {
      "collectInterval": 300000,
      "retentionDays": 30
    },
    "projects": [
      {
        "name": "Frontend",
        "path": "./frontend",
        "configPath": "./team-configs/frontend.json"
      },
      {
        "name": "Backend", 
        "path": "./backend",
        "configPath": "./team-configs/backend.json"
      }
    ]
  }
}
```

---

## CI/CD Integration

### 🔄 Tutorial 14: GitHub Actions Integration

**Goal:** Integrate the agent into GitHub Actions workflow.

**Workflow File (.github/workflows/test-agent.yml):**
```yaml
name: Test Running Agent CI

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main ]

jobs:
  test-agent:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Test Running Agent
      run: npm install -g test-running-agent
    
    - name: Create CI Configuration
      run: |
        cat > test-agent-ci.config.json << EOF
        {
          "projectRoot": "./",
          "testSuites": [
            {
              "type": "jest",
              "pattern": ["**/*.test.ts"],
              "command": "npm test",
              "coverageCommand": "npm test -- --coverage --passWithNoTests"
            }
          ],
          "coverage": {
            "enabled": true,
            "thresholds": {
              "unit": 80
            }
          },
          "complexity": {
            "enabled": true,
            "errorThreshold": 20
          }
        }
        EOF
    
    - name: Run Smart Tests
      run: |
        # Get changed files
        CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E '\.(ts|tsx)$' | tr '\n' ',' | sed 's/,$//')
        
        if [ -n "$CHANGED_FILES" ]; then
          test-agent test --files "$CHANGED_FILES" --coverage
        else
          test-agent test --coverage
        fi
      env:
        CI: true
    
    - name: Check Quality Gates
      run: |
        test-agent coverage --check-thresholds --fail-under 80
        test-agent complexity --fail-on-high --max 20
    
    - name: Upload Coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        fail_ci_if_error: true
    
    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          
          let comment = '## Test Running Agent Report\n\n';
          
          try {
            const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
            comment += `### Coverage\n`;
            comment += `- Lines: ${coverage.total.lines.pct}%\n`;
            comment += `- Branches: ${coverage.total.branches.pct}%\n`;
            comment += `- Functions: ${coverage.total.functions.pct}%\n\n`;
          } catch (e) {
            comment += '### Coverage\nNo coverage data available\n\n';
          }
          
          try {
            const complexity = JSON.parse(fs.readFileSync('complexity-report.json', 'utf8'));
            comment += `### Complexity\n`;
            comment += `- Files analyzed: ${complexity.fileCount}\n`;
            comment += `- High complexity functions: ${complexity.highComplexityCount}\n`;
            comment += `- Average complexity: ${complexity.averageComplexity}\n\n`;
          } catch (e) {
            comment += '### Complexity\nNo complexity data available\n\n';
          }
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });

  notify-slack:
    needs: test-agent
    runs-on: ubuntu-latest
    if: always()
    
    steps:
    - name: Notify Slack
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        fields: repo,message,commit,author,action,eventName,ref,workflow
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Benefits:**
- Runs only relevant tests based on changed files
- Enforces quality gates
- Provides PR comments with metrics
- Integrates with existing tools (Codecov, Slack)

---

### 🚀 Tutorial 15: Advanced CI/CD with Multiple Environments

**Goal:** Set up environment-specific testing strategies.

**Environment Configurations:**

**Development (dev.config.json):**
```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test -- --maxWorkers=2"
    }
  ],
  "coverage": {
    "thresholds": {
      "unit": 70
    }
  },
  "complexity": {
    "warningThreshold": 15
  }
}
```

**Staging (staging.config.json):**
```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    },
    {
      "type": "cypress",
      "pattern": ["cypress/e2e/**/*.cy.ts"],
      "command": "npm run cypress:run"
    }
  ],
  "coverage": {
    "thresholds": {
      "unit": 80,
      "e2e": 60
    }
  }
}
```

**Production (prod.config.json):**
```json
{
  "projectRoot": "./",
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts"],
      "command": "npm test"
    },
    {
      "type": "cypress", 
      "pattern": ["cypress/e2e/**/*.cy.ts"],
      "command": "npm run cypress:run"
    },
    {
      "type": "postman",
      "pattern": ["postman/**/*.json"],
      "command": "newman run"
    }
  ],
  "coverage": {
    "thresholds": {
      "unit": 90,
      "integration": 80,
      "e2e": 70
    }
  },
  "complexity": {
    "errorThreshold": 15
  }
}
```

**Multi-Environment Pipeline:**
```yaml
name: Multi-Environment Testing

on:
  push:
    branches: [ develop, staging, main ]

jobs:
  determine-environment:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.env.outputs.environment }}
      config: ${{ steps.env.outputs.config }}
    steps:
    - id: env
      run: |
        if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
          echo "environment=production" >> $GITHUB_OUTPUT
          echo "config=prod.config.json" >> $GITHUB_OUTPUT
        elif [[ "${{ github.ref }}" == "refs/heads/staging" ]]; then
          echo "environment=staging" >> $GITHUB_OUTPUT
          echo "config=staging.config.json" >> $GITHUB_OUTPUT
        else
          echo "environment=development" >> $GITHUB_OUTPUT
          echo "config=dev.config.json" >> $GITHUB_OUTPUT
        fi

  test:
    needs: determine-environment
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-environment.outputs.environment }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run Environment-Specific Tests
      run: |
        test-agent start \
          --config ${{ needs.determine-environment.outputs.config }} \
          --ci-mode \
          --environment ${{ needs.determine-environment.outputs.environment }}
```

**Expected Results:**
- Different quality gates for different environments
- Progressive testing rigor (dev → staging → prod)
- Environment-specific test suites
- Appropriate feedback for each environment

---

This tutorial collection provides comprehensive guidance for using the Test Running Agent in various scenarios, from basic setup to advanced enterprise workflows. Each tutorial builds upon previous concepts while introducing new features and best practices.