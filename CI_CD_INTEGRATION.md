# CI/CD Pipeline Integration Guide

This guide shows how to integrate the Test Running Agent into your CI/CD pipelines for automated testing, coverage analysis, and code quality checks.

## Overview

The Test Running Agent can enhance your CI/CD pipeline by:
- Running targeted tests based on changed files
- Enforcing coverage thresholds
- Checking code complexity
- Validating JIRA ticket requirements
- Generating commit messages
- Sending notifications to Slack/webhooks

## GitHub Actions

### Basic Setup

```yaml
name: Test Running Agent CI

on:
  pull_request:
    branches: [ main, develop ]
  push:
    branches: [ main, develop ]

jobs:
  test-agent:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0  # Full history for git comparisons
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Test Running Agent
      run: |
        npm install -g test-running-agent
        # Or install from source
        # git clone https://github.com/your-org/test-running-agent.git
        # cd test-running-agent && npm install && npm run build && npm link
    
    - name: Create CI Configuration
      run: |
        cat > test-agent-ci.config.json << EOF
        {
          "projectRoot": ".",
          "testSuites": [
            {
              "type": "jest",
              "pattern": ["**/*.test.ts"],
              "command": "npm test",
              "coverageCommand": "npm test -- --coverage"
            }
          ],
          "coverage": {
            "enabled": true,
            "thresholds": {
              "unit": 80,
              "integration": 70,
              "e2e": 60
            },
            "persistPath": "./coverage-data"
          },
          "complexity": {
            "enabled": true,
            "warningThreshold": 10,
            "errorThreshold": 20
          }
        }
        EOF
    
    - name: Run Test Agent
      run: |
        test-agent start -c test-agent-ci.config.json --ci-mode
      env:
        CI: true
```

### Advanced GitHub Actions Workflow

```yaml
name: Advanced Test Pipeline

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  analyze-changes:
    runs-on: ubuntu-latest
    outputs:
      changed-files: ${{ steps.changes.outputs.files }}
      needs-api-tests: ${{ steps.changes.outputs.api }}
      needs-ui-tests: ${{ steps.changes.outputs.ui }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Detect Changes
      id: changes
      run: |
        # Get changed files
        CHANGED_FILES=$(git diff --name-only origin/${{ github.base_ref }}...HEAD | jq -R -s -c 'split("\n")[:-1]')
        echo "files=$CHANGED_FILES" >> $GITHUB_OUTPUT
        
        # Check if API tests needed
        if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E "(api/|controllers/|routes/)" > /dev/null; then
          echo "api=true" >> $GITHUB_OUTPUT
        fi
        
        # Check if UI tests needed
        if git diff --name-only origin/${{ github.base_ref }}...HEAD | grep -E "(components/|pages/|\.tsx|\.jsx)" > /dev/null; then
          echo "ui=true" >> $GITHUB_OUTPUT
        fi

  test-with-agent:
    needs: analyze-changes
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Environment
      run: |
        npm ci
        npm install -g test-running-agent
    
    - name: Run Targeted Tests
      run: |
        # Use the agent to run only relevant tests
        test-agent test --files '${{ needs.analyze-changes.outputs.changed-files }}'
    
    - name: Check Coverage
      run: |
        test-agent coverage --fail-under 80
    
    - name: Analyze Complexity
      run: |
        test-agent complexity --files '${{ needs.analyze-changes.outputs.changed-files }}' --fail-on-high
    
    - name: Upload Coverage
      uses: actions/upload-artifact@v3
      with:
        name: coverage-report
        path: coverage/
    
    - name: Comment PR
      if: github.event_name == 'pull_request'
      uses: actions/github-script@v6
      with:
        script: |
          const fs = require('fs');
          const coverage = JSON.parse(fs.readFileSync('coverage-summary.json', 'utf8'));
          const complexity = JSON.parse(fs.readFileSync('complexity-report.json', 'utf8'));
          
          const comment = `## Test Running Agent Report
          
          ### Coverage
          - Lines: ${coverage.lines.percentage}%
          - Branches: ${coverage.branches.percentage}%
          - Functions: ${coverage.functions.percentage}%
          
          ### Complexity
          - High complexity functions: ${complexity.highComplexityCount}
          - Average complexity: ${complexity.averageComplexity}
          
          [View detailed report](https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }})`;
          
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: comment
          });

  api-tests:
    needs: [analyze-changes, test-with-agent]
    if: needs.analyze-changes.outputs.needs-api-tests == 'true'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run API Tests
      run: |
        test-agent test --suite postman --env ci

  ui-tests:
    needs: [analyze-changes, test-with-agent]
    if: needs.analyze-changes.outputs.needs-ui-tests == 'true'
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Run UI Tests
      run: |
        test-agent test --suite stagehand --headless
```

## GitLab CI/CD

### .gitlab-ci.yml

```yaml
stages:
  - analyze
  - test
  - quality
  - notify

variables:
  TEST_AGENT_CONFIG: ci/test-agent.config.json

before_script:
  - npm ci
  - npm install -g test-running-agent

analyze:changes:
  stage: analyze
  script:
    - |
      # Detect what changed
      export CHANGED_FILES=$(git diff --name-only origin/$CI_MERGE_REQUEST_TARGET_BRANCH_NAME...HEAD)
      echo "$CHANGED_FILES" > changed-files.txt
  artifacts:
    paths:
      - changed-files.txt
    expire_in: 1 hour
  only:
    - merge_requests

test:smart:
  stage: test
  dependencies:
    - analyze:changes
  script:
    - |
      # Run tests based on changes
      CHANGED_FILES=$(cat changed-files.txt)
      test-agent test --files "$CHANGED_FILES" --coverage
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
      junit: test-results.xml
  only:
    - merge_requests

quality:complexity:
  stage: quality
  dependencies:
    - analyze:changes
  script:
    - |
      CHANGED_FILES=$(cat changed-files.txt)
      test-agent complexity --files "$CHANGED_FILES" --format json > complexity.json
      
      # Fail if high complexity
      HIGH_COMPLEXITY=$(jq '.highComplexityCount' complexity.json)
      if [ "$HIGH_COMPLEXITY" -gt 0 ]; then
        echo "❌ Found $HIGH_COMPLEXITY high complexity functions"
        exit 1
      fi
  artifacts:
    reports:
      codequality: complexity.json
  only:
    - merge_requests

quality:coverage-gate:
  stage: quality
  dependencies:
    - test:smart
  script:
    - |
      # Check coverage thresholds
      test-agent coverage --check-thresholds
  only:
    - merge_requests

notify:slack:
  stage: notify
  script:
    - |
      # Send results to Slack
      test-agent notify --slack-webhook $SLACK_WEBHOOK \
        --include-coverage \
        --include-complexity
  only:
    - main
  when: on_success
```

## Jenkins Pipeline

### Jenkinsfile

```groovy
pipeline {
    agent any
    
    environment {
        TEST_AGENT_CONFIG = 'ci/test-agent.config.json'
        NODE_ENV = 'ci'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'npm install -g test-running-agent'
            }
        }
        
        stage('Detect Changes') {
            when {
                changeRequest()
            }
            steps {
                script {
                    def changeLogSets = currentBuild.changeSets
                    def changedFiles = []
                    
                    for (int i = 0; i < changeLogSets.size(); i++) {
                        def entries = changeLogSets[i].items
                        for (int j = 0; j < entries.length; j++) {
                            def entry = entries[j]
                            def files = new ArrayList(entry.affectedFiles)
                            for (int k = 0; k < files.size(); k++) {
                                def file = files[k]
                                changedFiles.add(file.path)
                            }
                        }
                    }
                    
                    env.CHANGED_FILES = changedFiles.join(',')
                }
            }
        }
        
        stage('Smart Test Execution') {
            steps {
                sh """
                    test-agent test \
                        --files "${env.CHANGED_FILES}" \
                        --coverage \
                        --junit-output test-results.xml
                """
            }
            post {
                always {
                    junit 'test-results.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        
        stage('Code Quality Gates') {
            parallel {
                stage('Coverage Check') {
                    steps {
                        sh 'test-agent coverage --check-thresholds --fail-under 80'
                    }
                }
                
                stage('Complexity Check') {
                    steps {
                        sh """
                            test-agent complexity \
                                --files "${env.CHANGED_FILES}" \
                                --max-complexity 20 \
                                --format checkstyle > complexity-report.xml
                        """
                        recordIssues(
                            enabledForFailure: true,
                            tools: [checkStyle(pattern: 'complexity-report.xml')]
                        )
                    }
                }
                
                stage('JIRA Validation') {
                    when {
                        changeRequest()
                    }
                    steps {
                        sh 'test-agent jira --check-requirements'
                    }
                }
            }
        }
        
        stage('API Tests') {
            when {
                expression {
                    return env.CHANGED_FILES?.contains('api/') || 
                           env.CHANGED_FILES?.contains('controllers/')
                }
            }
            steps {
                sh 'test-agent test --suite postman --env jenkins'
            }
        }
        
        stage('E2E Tests') {
            when {
                branch 'main'
            }
            steps {
                sh 'test-agent test --suite cypress --headless'
            }
        }
    }
    
    post {
        always {
            archiveArtifacts artifacts: 'coverage/**/*', fingerprint: true
            
            // Send notifications
            sh """
                test-agent notify \
                    --slack-webhook ${SLACK_WEBHOOK} \
                    --include-coverage \
                    --include-complexity \
                    --build-url ${BUILD_URL}
            """
        }
        
        failure {
            emailext(
                subject: "Test Agent: Build Failed - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: '''
                    Test Running Agent detected issues:
                    
                    Check the build at: ${BUILD_URL}
                    
                    Failed tests: ${TEST_FAILURES}
                    Coverage: ${COVERAGE_PERCENTAGE}%
                ''',
                to: '${CHANGE_AUTHOR_EMAIL}'
            )
        }
    }
}
```

## CircleCI

### .circleci/config.yml

```yaml
version: 2.1

orbs:
  node: circleci/node@5.0.2

executors:
  test-agent-executor:
    docker:
      - image: cimg/node:18.0
    working_directory: ~/repo

jobs:
  smart-test:
    executor: test-agent-executor
    steps:
      - checkout
      
      - run:
          name: Install Test Agent
          command: |
            sudo npm install -g test-running-agent
      
      - run:
          name: Detect Changed Files
          command: |
            if [ -n "$CIRCLE_PULL_REQUEST" ]; then
              # For PRs, compare against base branch
              git diff --name-only origin/$CIRCLE_BRANCH..HEAD > changed-files.txt
            else
              # For regular commits
              git diff --name-only HEAD~1..HEAD > changed-files.txt
            fi
      
      - run:
          name: Run Smart Tests
          command: |
            test-agent test \
              --files "$(cat changed-files.txt)" \
              --coverage \
              --junit test-results/junit.xml
      
      - run:
          name: Check Quality Gates
          command: |
            test-agent coverage --check-thresholds
            test-agent complexity --files "$(cat changed-files.txt)" --fail-on-high
      
      - store_test_results:
          path: test-results
      
      - store_artifacts:
          path: coverage
          destination: coverage
      
      - run:
          name: Upload Coverage
          command: |
            bash <(curl -s https://codecov.io/bash) -f coverage/lcov.info

  integration-test:
    executor: test-agent-executor
    steps:
      - checkout
      
      - run:
          name: Run Integration Tests
          command: |
            test-agent test --suite integration --env ci
            test-agent test --suite postman --env ci

workflows:
  version: 2
  test-and-deploy:
    jobs:
      - smart-test:
          filters:
            branches:
              ignore: none
      
      - integration-test:
          requires:
            - smart-test
          filters:
            branches:
              only:
                - main
                - develop
```

## Azure DevOps

### azure-pipelines.yml

```yaml
trigger:
  branches:
    include:
    - main
    - develop
  paths:
    exclude:
    - docs/*
    - README.md

pr:
  branches:
    include:
    - main
    - develop

pool:
  vmImage: 'ubuntu-latest'

variables:
  - name: node_version
    value: '18.x'
  - name: test_agent_config
    value: 'ci/test-agent.config.json'

stages:
- stage: Analysis
  jobs:
  - job: DetectChanges
    steps:
    - checkout: self
      fetchDepth: 0
    
    - script: |
        # Detect changed files
        if [ -n "$(System.PullRequest.PullRequestId)" ]; then
          git diff --name-only origin/$(System.PullRequest.TargetBranch)...HEAD > $(Pipeline.Workspace)/changed-files.txt
        else
          git diff --name-only HEAD~1...HEAD > $(Pipeline.Workspace)/changed-files.txt
        fi
      displayName: 'Detect Changed Files'
    
    - publish: $(Pipeline.Workspace)/changed-files.txt
      artifact: ChangedFiles

- stage: Test
  dependsOn: Analysis
  jobs:
  - job: SmartTest
    steps:
    - checkout: self
    
    - task: NodeTool@0
      inputs:
        versionSpec: $(node_version)
    
    - download: current
      artifact: ChangedFiles
    
    - script: |
        npm ci
        npm install -g test-running-agent
      displayName: 'Install Dependencies'
    
    - script: |
        CHANGED_FILES=$(cat $(Pipeline.Workspace)/ChangedFiles/changed-files.txt)
        test-agent test \
          --files "$CHANGED_FILES" \
          --coverage \
          --junit test-results.xml
      displayName: 'Run Smart Tests'
    
    - task: PublishTestResults@2
      inputs:
        testResultsFormat: 'JUnit'
        testResultsFiles: 'test-results.xml'
        failTaskOnFailedTests: true
    
    - task: PublishCodeCoverageResults@1
      inputs:
        codeCoverageTool: 'Cobertura'
        summaryFileLocation: 'coverage/cobertura-coverage.xml'
        reportDirectory: 'coverage'

- stage: Quality
  dependsOn: Test
  jobs:
  - job: QualityGates
    steps:
    - checkout: self
    
    - download: current
      artifact: ChangedFiles
    
    - script: |
        npm install -g test-running-agent
        CHANGED_FILES=$(cat $(Pipeline.Workspace)/ChangedFiles/changed-files.txt)
        
        # Check coverage
        test-agent coverage --check-thresholds
        
        # Check complexity
        test-agent complexity --files "$CHANGED_FILES" --fail-on-high
        
        # Validate JIRA
        if [ -n "$(System.PullRequest.PullRequestId)" ]; then
          test-agent jira --check-requirements
        fi
      displayName: 'Quality Checks'

- stage: Notify
  dependsOn: 
  - Test
  - Quality
  condition: always()
  jobs:
  - job: SendNotifications
    steps:
    - script: |
        test-agent notify \
          --slack-webhook $(SLACK_WEBHOOK) \
          --build-url "$(System.CollectionUri)$(System.TeamProject)/_build/results?buildId=$(Build.BuildId)" \
          --status $AGENT_JOBSTATUS
      displayName: 'Send Notifications'
```

## Bitbucket Pipelines

### bitbucket-pipelines.yml

```yaml
image: node:18

definitions:
  caches:
    test-agent: ~/.test-agent
  
  services:
    docker:
      memory: 2048
  
  steps:
    - step: &install-agent
        name: Install Test Agent
        caches:
          - node
          - test-agent
        script:
          - npm ci
          - npm install -g test-running-agent
          - test-agent --version
    
    - step: &smart-test
        name: Smart Test Execution
        caches:
          - node
        script:
          - |
            # Detect changed files
            if [ -n "$BITBUCKET_PR_ID" ]; then
              CHANGED_FILES=$(git diff --name-only origin/$BITBUCKET_PR_DESTINATION_BRANCH...HEAD)
            else
              CHANGED_FILES=$(git diff --name-only HEAD~1...HEAD)
            fi
            
            # Run tests
            test-agent test \
              --files "$CHANGED_FILES" \
              --coverage \
              --junit test-results.xml
        artifacts:
          - coverage/**
          - test-results.xml
    
    - step: &quality-check
        name: Quality Gates
        script:
          - test-agent coverage --check-thresholds
          - test-agent complexity --fail-on-high

pipelines:
  pull-requests:
    '**':
      - step: *install-agent
      - step: *smart-test
      - step: *quality-check
      - step:
          name: PR Validation
          script:
            - test-agent jira --check-requirements
            - test-agent pr-comment --coverage --complexity
  
  branches:
    main:
      - step: *install-agent
      - step: *smart-test
      - parallel:
        - step:
            name: API Tests
            script:
              - test-agent test --suite postman
        - step:
            name: E2E Tests
            script:
              - test-agent test --suite cypress --headless
      - step:
          name: Deploy & Notify
          deployment: production
          script:
            - test-agent notify --slack --include-all
```

## Docker Integration for CI/CD

### Dockerfile.ci

```dockerfile
FROM node:18-alpine

# Install dependencies
RUN apk add --no-cache git bash

# Install test-running-agent globally
RUN npm install -g test-running-agent

# Create app directory
WORKDIR /app

# Copy configuration
COPY ci/test-agent.config.json ./test-agent.config.json

# Set environment
ENV CI=true
ENV NODE_ENV=ci

# Default command
CMD ["test-agent", "start", "--ci-mode"]
```

### docker-compose.ci.yml

```yaml
version: '3.8'

services:
  test-agent:
    build:
      context: .
      dockerfile: Dockerfile.ci
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - CI=true
      - TEST_AGENT_CONFIG=/app/ci/test-agent.config.json
      - SLACK_WEBHOOK=${SLACK_WEBHOOK}
    command: >
      sh -c "
        test-agent test --coverage &&
        test-agent complexity --fail-on-high &&
        test-agent coverage --check-thresholds
      "

  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
    
  redis-test:
    image: redis:7-alpine
```

## Best Practices for CI/CD

### 1. Optimize for Speed

```json
{
  "ci": {
    "parallelJobs": 4,
    "testTimeout": 300000,
    "skipSlowTests": true,
    "cacheDirectory": "/tmp/test-cache"
  }
}
```

### 2. Fail Fast Strategy

```bash
#!/bin/bash
# ci-test.sh

# Run critical tests first
test-agent test --suite unit --fail-fast || exit 1

# Then run other tests
test-agent test --suite integration
test-agent test --suite e2e
```

### 3. Progressive Testing

```yaml
# Only run affected tests on PRs
on_pr:
  - smart_test_selection
  - coverage_check
  - complexity_check

# Run full suite on main
on_main:
  - full_test_suite
  - integration_tests
  - e2e_tests
  - performance_tests
```

### 4. Caching Strategy

```yaml
cache:
  key: test-agent-${{ checksum "package-lock.json" }}
  paths:
    - node_modules
    - coverage-data
    - .test-cache
```

### 5. Notification Configuration

```json
{
  "notifications": {
    "ci": {
      "slack": {
        "enabled": true,
        "channels": {
          "success": "#ci-success",
          "failure": "#ci-failures",
          "coverage-drop": "#qa-alerts"
        }
      },
      "email": {
        "on": ["failure", "coverage-drop"],
        "to": ["team@example.com"]
      }
    }
  }
}
```

## Common CI/CD Commands

```bash
# Run only changed tests
test-agent test --changed-only

# Run with coverage thresholds
test-agent test --coverage --fail-under 80

# Check complexity
test-agent complexity --max-warning 10 --max-error 20

# Generate reports
test-agent report --format junit --output test-results.xml
test-agent report --format html --output coverage/

# CI-specific mode
test-agent start --ci-mode --no-watch --exit-on-failure

# Validate without running tests
test-agent validate --config-only

# Compare with base branch
test-agent compare --base main --coverage --complexity
```

## Integration with Other Tools

### SonarQube

```bash
# Generate SonarQube report
test-agent report --format sonar --output sonar-report.json

# In CI pipeline
sonar-scanner \
  -Dsonar.projectKey=my-project \
  -Dsonar.sources=src \
  -Dsonar.tests=tests \
  -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info \
  -Dsonar.testExecutionReportPaths=sonar-report.json
```

### Codecov

```bash
# After test-agent execution
bash <(curl -s https://codecov.io/bash) -f coverage/lcov.info
```

### Slack Notifications

```json
{
  "notifications": {
    "slack": {
      "webhook": "$SLACK_WEBHOOK",
      "template": {
        "success": "✅ Tests passed! Coverage: {{coverage}}%",
        "failure": "❌ Tests failed! {{failedCount}} tests failed",
        "complexity": "⚠️ High complexity detected in {{fileCount}} files"
      }
    }
  }
}
```

## Troubleshooting CI/CD Issues

### 1. Timeouts

```json
{
  "ci": {
    "testTimeout": 600000,  // 10 minutes
    "globalTimeout": 1800000 // 30 minutes
  }
}
```

### 2. Memory Issues

```bash
# Increase Node memory
export NODE_OPTIONS="--max-old-space-size=4096"
test-agent test --coverage
```

### 3. Flaky Tests

```json
{
  "ci": {
    "retryFailedTests": 3,
    "flakyTestPatterns": ["**/e2e/**/*.test.js"]
  }
}
```

### 4. Debugging

```bash
# Enable debug logging
export DEBUG=test-agent:*
test-agent test --verbose --log-level debug
```

## Summary

The Test Running Agent enhances CI/CD pipelines by:
- Running only relevant tests based on changes
- Enforcing quality gates (coverage, complexity)
- Providing detailed reports and notifications
- Integrating with all major CI/CD platforms
- Supporting containerized environments
- Enabling parallel and distributed testing

This makes your CI/CD pipeline faster, more efficient, and more reliable.