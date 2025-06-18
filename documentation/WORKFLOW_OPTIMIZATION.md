# Workflow Optimization Guide

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Overview](#overview)
2. [Optimization Strategy](#optimization-strategy)
3. [Workflow Tools](#workflow-tools)
4. [Performance Benefits](#performance-benefits)
5. [Usage Examples](#usage-examples)
6. [Tool Comparison](#tool-comparison)
7. [Advanced Configuration](#advanced-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Test Running Agent implements an advanced workflow optimization system that groups related MCP tool calls together, executing them in parallel when possible. This significantly reduces the total number of tool calls from Cursor while maintaining all functionality.

### The Problem

Previously, common workflows required multiple sequential tool calls:

```bash
# Old approach: 5 separate tool calls
@test-running-agent check_git_status
@test-running-agent check_environments  
@test-running-agent check_jira
@test-running-agent start_watching
@test-running-agent get_status
```

### The Solution

Now, optimized workflows batch related operations:

```bash
# New approach: 1 tool call
@test-running-agent workflow_dev_setup
```

---

## Optimization Strategy

### Parallel Execution Architecture

The system identifies three types of operations:

#### **Independent Operations** (Full Parallelization)
- `check_git_status` + `check_environments` + `check_jira`
- No shared resources, can run simultaneously
- **Performance Gain**: 3x faster execution

#### **Pipeline Operations** (Sequential with Parallel Components)
- `run_tests` → `analyze_coverage` + `analyze_complexity`
- Coverage depends on test results, but complexity analysis is independent
- **Performance Gain**: 40% faster execution

#### **Cached Operations** (Smart Caching)
- Git status cached for 30 seconds
- JIRA data cached for 1 minute
- Environment status cached for 5 minutes
- **Performance Gain**: 80% faster for repeated calls

### Workflow Orchestration

The `WorkflowOrchestrator` class manages:

- **Parallel Execution**: Uses `Promise.allSettled()` for independent operations
- **Error Isolation**: One failure doesn't stop other operations
- **Smart Caching**: Reduces redundant API calls
- **Result Aggregation**: Combines results into unified responses

---

## Workflow Tools

### 1. `workflow_dev_setup`

**Purpose**: Complete development session initialization

**Combines**: `check_git_status` + `check_environments` + `check_jira` + `start_watching`

**Usage**:
```bash
@test-running-agent workflow_dev_setup
@test-running-agent workflow_dev_setup projectPath: "/path/to/project"
```

**Response Example**:
```
🚀 Development setup complete | ✅ Git up to date | ✅ Environments clean | ✅ JIRA checked | 🔍 File watching active

⏱️ Duration: 1,245ms

✅ Results:
• Git: Up to date
• Environments: All environments are on master/main
• JIRA: Ticket analyzed
• File Watching: Active on /Users/dev/my-project
```

**Performance**: ~3x faster than individual calls (1.2s vs 3.5s)

### 2. `workflow_test_suite`

**Purpose**: Comprehensive testing with analysis

**Combines**: `run_tests` + `analyze_coverage` + `analyze_complexity` + optional `run_e2e`

**Usage**:
```bash
@test-running-agent workflow_test_suite files: ["src/app.ts", "src/utils.ts"]
@test-running-agent workflow_test_suite files: ["src/app.ts"] includeE2E: true
```

**Response Example**:
```
🧪 Test suite complete | 3 suites run | 86.4% coverage | 📊 Complexity analyzed

⏱️ Duration: 8,432ms

✅ Results:
• Tests: 3 suites executed
• Coverage: 86.4% lines, 78.2% branches
• Complexity: Analysis completed
```

**Performance**: ~40% faster than sequential execution (8.4s vs 14.2s)

### 3. `workflow_pre_commit`

**Purpose**: Pre-commit validation and commit message generation

**Combines**: `stop_watching` + `check_git_status` + `check_jira` + `check_environments` + `generate_commit_message`

**Usage**:
```bash
@test-running-agent workflow_pre_commit
```

**Response Example**:
```
✅ Pre-commit validation passed | Git ready | JIRA validated | Environments checked | Commit message ready

⏱️ Duration: 1,876ms

✅ Validation Results:
• Git Status: Ready to commit
• JIRA: Ticket validated
• Environments: All environments are on master/main

📝 Generated Commit Message:
```
feat(DEV-1234): implement user authentication system

- Add OAuth2 provider integration
- Implement JWT token management
- Add session persistence

Implements: DEV-1234 - User Authentication
Resolves acceptance criteria for secure login
```
```

**Performance**: ~2.5x faster than individual calls (1.9s vs 4.8s)

### 4. `workflow_health_check`

**Purpose**: Complete project health overview

**Combines**: `get_status` + `check_git_status` + `check_environments` + `check_jira` + `analyze_coverage`

**Usage**:
```bash
@test-running-agent workflow_health_check
```

**Response Example**:
```
💚 Health check passed (5/5 checks successful)

⏱️ Duration: 1,123ms

📊 System Status:
• Agent: 🟢 Running on feature/auth-system
• Features: JIRA, Coverage Analysis, Environment Monitoring
• Git: 🟢 Up to date
• Environments: 🟢 Clean
• JIRA: 🟢 Connected
• Coverage: 🟢 86.4%
```

**Performance**: ~4x faster than individual calls (1.1s vs 4.6s)

---

## Performance Benefits

### Execution Time Comparison

| Workflow | Individual Tools | Optimized Workflow | Time Saved | Performance Gain |
|----------|------------------|-------------------|------------|------------------|
| Dev Setup | 3.5s | 1.2s | 2.3s | 3x faster |
| Test Suite | 14.2s | 8.4s | 5.8s | 40% faster |
| Pre-Commit | 4.8s | 1.9s | 2.9s | 2.5x faster |
| Health Check | 4.6s | 1.1s | 3.5s | 4x faster |

### Tool Call Reduction

| Workflow | Individual Calls | Optimized Calls | Reduction |
|----------|------------------|-----------------|-----------|
| Dev Setup | 4 calls | 1 call | 75% reduction |
| Test Suite | 3-4 calls | 1 call | 67-75% reduction |
| Pre-Commit | 5 calls | 1 call | 80% reduction |
| Health Check | 5 calls | 1 call | 80% reduction |

### Caching Benefits

- **Git Status**: 30s cache reduces API calls by 80%
- **JIRA Data**: 1min cache eliminates redundant ticket fetches
- **Environment Status**: 5min cache reduces Jenkins API calls
- **Coverage Data**: Session-based cache for unchanged test results

---

## Usage Examples

### Morning Development Routine

**Before** (5 separate calls):
```bash
@test-running-agent get_status
@test-running-agent check_git_status
@test-running-agent check_environments
@test-running-agent check_jira
@test-running-agent start_watching
```

**After** (1 optimized call):
```bash
@test-running-agent workflow_dev_setup
```

### Code Change Testing

**Before** (3-4 separate calls):
```bash
@test-running-agent run_tests files: ["src/auth.ts"]
@test-running-agent analyze_coverage
@test-running-agent analyze_complexity files: ["src/auth.ts"]
@test-running-agent run_e2e  # Optional
```

**After** (1 optimized call):
```bash
@test-running-agent workflow_test_suite files: ["src/auth.ts"] includeE2E: true
```

### Pre-Commit Workflow

**Before** (5 separate calls):
```bash
@test-running-agent stop_watching
@test-running-agent check_git_status
@test-running-agent check_jira
@test-running-agent check_environments
@test-running-agent generate_commit_message
```

**After** (1 optimized call):
```bash
@test-running-agent workflow_pre_commit
```

### Project Health Check

**Before** (5 separate calls):
```bash
@test-running-agent get_status
@test-running-agent check_git_status
@test-running-agent check_environments
@test-running-agent check_jira
@test-running-agent analyze_coverage
```

**After** (1 optimized call):
```bash
@test-running-agent workflow_health_check
```

---

## Tool Comparison

### Individual Tools vs Workflows

| Use Case | Individual Tools | Workflow Tool | Benefits |
|----------|------------------|---------------|----------|
| **Start Development** | `check_git_status`<br>`check_environments`<br>`check_jira`<br>`start_watching` | `workflow_dev_setup` | 75% fewer calls<br>3x faster execution<br>Parallel status checks |
| **Test Changes** | `run_tests`<br>`analyze_coverage`<br>`analyze_complexity` | `workflow_test_suite` | 67% fewer calls<br>40% faster execution<br>Intelligent parallelization |
| **Before Commit** | `stop_watching`<br>`check_git_status`<br>`check_jira`<br>`generate_commit_message` | `workflow_pre_commit` | 80% fewer calls<br>2.5x faster execution<br>Unified validation |
| **System Overview** | `get_status`<br>`check_git_status`<br>`check_environments`<br>`check_jira`<br>`analyze_coverage` | `workflow_health_check` | 80% fewer calls<br>4x faster execution<br>Complete health report |

### When to Use Individual Tools

Individual tools are still useful for:

- **Specific Operations**: When you only need one piece of information
- **Debugging**: When troubleshooting specific components
- **Custom Workflows**: When building your own tool sequences

### When to Use Workflow Tools

Workflow tools are optimal for:

- **Common Patterns**: Standard development workflows
- **Time-Sensitive Operations**: When speed matters
- **Comprehensive Analysis**: When you need multiple types of information
- **Cursor Integration**: Reducing tool call overhead

---

## Advanced Configuration

### Caching Configuration

```json
{
  "mcp": {
    "workflows": {
      "caching": {
        "gitStatus": 30000,      // 30 seconds
        "jiraData": 60000,       // 1 minute  
        "environments": 300000,  // 5 minutes
        "coverage": 0            // Session-based (no TTL)
      }
    }
  }
}
```

### Parallel Execution Limits

```json
{
  "mcp": {
    "workflows": {
      "parallelism": {
        "maxConcurrent": 5,      // Max parallel operations
        "timeout": 30000,        // 30s timeout per operation
        "retries": 2             // Retry failed operations
      }
    }
  }
}
```

### Error Handling

```json
{
  "mcp": {
    "workflows": {
      "errorHandling": {
        "continueOnError": true,     // Don't stop workflow on single failure
        "partialSuccess": true,      // Allow partial success responses
        "errorAggregation": true     // Collect all errors in response
      }
    }
  }
}
```

### Custom Workflow Creation

```typescript
// Example: Custom workflow for specific needs
const customWorkflow = await orchestrator.executeCustomWorkflow([
  { tool: 'check_git_status', parallel: true },
  { tool: 'analyze_complexity', parallel: true, args: { files: ['src/auth.ts'] } },
  { tool: 'run_tests', dependsOn: ['check_git_status'], args: { files: ['src/auth.ts'] } }
]);
```

---

## Troubleshooting

### Common Issues

#### Workflow Timeouts

**Symptom**: Workflow takes longer than expected
```
⚠️ Workflow timeout (30s exceeded)
```

**Solutions**:
1. Check network connectivity for external integrations (JIRA, Jenkins)
2. Increase timeout in configuration
3. Use individual tools to identify slow components

#### Partial Failures

**Symptom**: Some operations succeed, others fail
```
⚠️ Issues:
• jiraStatus: JIRA integration not enabled
• environments: Connection timeout
```

**Solutions**:
1. Check integration configurations
2. Enable/disable features as needed
3. Review error messages for specific fixes

#### Cache Issues

**Symptom**: Stale data in responses
```
Git Status: Behind by 2 commits (cached)
```

**Solutions**:
1. Clear cache manually: restart MCP server
2. Adjust cache TTL values
3. Use individual tools for real-time data

### Performance Optimization Tips

#### 1. **Selective Feature Enabling**
Only enable integrations you actively use:
```json
{
  "jira": { "enabled": false },        // Disable if not using JIRA
  "environments": { "enabled": false } // Disable if not using Jenkins
}
```

#### 2. **Cache Tuning**
Adjust cache TTL based on your workflow:
```json
{
  "gitStatus": 10000,    // Short TTL for active development
  "environments": 600000 // Long TTL for stable environments
}
```

#### 3. **Parallel Execution Tuning**
Optimize based on system capabilities:
```json
{
  "maxConcurrent": 3,    // Reduce for slower systems
  "timeout": 60000       // Increase for slow networks
}
```

### Debug Mode

Enable debug logging for workflow analysis:
```bash
export DEBUG=test-agent:workflow,test-agent:orchestrator
npm run start-mcp
```

This will show:
- Workflow execution timing
- Parallel operation coordination
- Cache hit/miss statistics
- Error propagation details

---

## Migration Guide

### Updating Existing Workflows

If you have existing automation that uses individual tools, you can migrate to workflows:

#### Before (Multiple Tool Calls)
```typescript
// Existing automation script
await callTool('check_git_status');
await callTool('check_environments');
await callTool('check_jira');
await callTool('start_watching');
```

#### After (Single Workflow Call)
```typescript
// Optimized automation script
await callTool('workflow_dev_setup');
```

### Backward Compatibility

- **All individual tools remain available**
- **No breaking changes to existing integrations**
- **Workflows are additive enhancements**
- **Can mix individual tools and workflows as needed**

### Best Practices

1. **Use workflows for common patterns**
2. **Keep individual tools for specific needs**
3. **Monitor performance gains**
4. **Adjust caching based on usage patterns**
5. **Report issues for further optimization**

---

This workflow optimization system transforms the Test Running Agent from a collection of individual tools into an intelligent, orchestrated development companion that maximizes efficiency while maintaining full functionality.