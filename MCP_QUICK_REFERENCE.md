# Test Running Agent - Quick Reference

## Essential Commands

### 🚀 Start Development
```
@test-running-agent start_watching
```

### 🛑 Stop Development
```
@test-running-agent stop_watching
```

### 🧪 Run Tests
```
@test-running-agent run_tests files: ["src/app.ts"]
```

### 📊 Check Coverage
```
@test-running-agent analyze_coverage
```

### 🔍 Check Complexity
```
@test-running-agent analyze_complexity
```

### 📝 Generate Commit
```
@test-running-agent generate_commit_message
```

### 🔄 Check Git Status
```
@test-running-agent check_git_status
```

### 🎫 Check JIRA
```
@test-running-agent check_jira
```

## Common Patterns

### Test after changes
```
@test-running-agent run_tests files: ["src/components/Button.tsx", "src/components/Button.test.tsx"]
```

### Check specific file complexity
```
@test-running-agent compare_complexity file: "src/utils/parser.ts"
```

### Run E2E tests
```
@test-running-agent run_e2e baseUrl: "http://localhost:3000"
```

### Check everything before commit
```
@test-running-agent check_git_status
@test-running-agent check_jira
@test-running-agent analyze_coverage
@test-running-agent generate_commit_message
```

## Tips
- Always include file extensions in paths
- Use forward slashes (/) even on Windows
- Files should be relative to project root
- Arrays need square brackets: ["file1", "file2"]