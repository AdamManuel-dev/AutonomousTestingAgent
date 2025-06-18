# Test Running Agent - Troubleshooting Guide

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

## Table of Contents

1. [Common Issues](#common-issues)
2. [Installation Problems](#installation-problems)
3. [Configuration Issues](#configuration-issues)
4. [Test Execution Problems](#test-execution-problems)
5. [Integration Issues](#integration-issues)
6. [Performance Problems](#performance-problems)
7. [Debugging Tools](#debugging-tools)
8. [FAQ](#faq)

---

## Common Issues

### 🔧 Agent Won't Start

**Symptoms:**
- Agent exits immediately
- "Configuration not found" error
- Permission denied errors

**Solutions:**

1. **Check Configuration File:**
```bash
# Verify config file exists and is readable
ls -la test-agent.config.json
cat test-agent.config.json | jq '.'  # Validate JSON
```

2. **Check File Permissions:**
```bash
# Fix permissions
chmod 644 test-agent.config.json
chmod +x node_modules/.bin/test-agent  # If using local install
```

3. **Validate Configuration:**
```bash
test-agent validate --config-only
```

4. **Use Explicit Paths:**
```bash
test-agent start -c /absolute/path/to/config.json -p /absolute/path/to/project
```

---

### 🧪 Tests Not Running

**Symptoms:**
- File changes detected but no tests execute
- Tests run but wrong test suites
- Tests execute but with errors

**Solutions:**

1. **Check Test Patterns:**
```json
{
  "testSuites": [
    {
      "type": "jest",
      "pattern": ["**/*.test.ts", "**/*.spec.ts"],  // Ensure patterns match your files
      "watchPattern": ["src/**/*.ts"]              // Check watch patterns
    }
  ]
}
```

2. **Verify Test Commands:**
```bash
# Test commands manually
npm test
npm test -- --coverage
npx jest --coverage
```

3. **Check File Matching:**
```bash
# Enable debug mode to see file matching
DEBUG=test-agent:* test-agent start
```

4. **Validate Test Framework Setup:**
```bash
# Ensure test framework is properly installed
npm list jest cypress @storybook/test-runner
```

---

### 📊 Coverage Not Working

**Symptoms:**
- Tests run but no coverage data
- Coverage data incomplete
- Coverage thresholds not enforced

**Solutions:**

1. **Check Coverage Commands:**
```json
{
  "testSuites": [
    {
      "coverageCommand": "npm test -- --coverage",  // Ensure correct command
      "enabled": true
    }
  ]
}
```

2. **Verify Coverage Output:**
```bash
# Check if coverage files are generated
ls -la coverage/
ls -la coverage/coverage-summary.json
```

3. **Test Coverage Command:**
```bash
# Run coverage command manually
npm test -- --coverage
cat coverage/coverage-summary.json
```

4. **Enable Coverage in Config:**
```json
{
  "coverage": {
    "enabled": true,
    "persistPath": "./coverage"
  }
}
```

---

## Installation Problems

### Node.js Version Issues

**Error:** `Error: Node.js version not supported`

**Solution:**
```bash
# Check Node.js version
node --version

# Install Node.js 18 or later
nvm install 18
nvm use 18

# Or using brew (macOS)
brew install node@18
```

---

### NPM Permission Issues

**Error:** `EACCES: permission denied`

**Solutions:**

1. **Use npx (Recommended):**
```bash
npx test-running-agent start
```

2. **Fix npm permissions:**
```bash
# Configure npm to use a different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

3. **Use sudo (Not recommended):**
```bash
sudo npm install -g test-running-agent
```

---

### Missing Dependencies

**Error:** `Cannot find module 'xyz'`

**Solutions:**

1. **Install missing dependencies:**
```bash
npm install
# Or clean install
rm -rf node_modules package-lock.json
npm install
```

2. **Check peer dependencies:**
```bash
npm list --depth=0
npm install missing-package
```

---

## Configuration Issues

### Invalid JSON Configuration

**Error:** `SyntaxError: Unexpected token`

**Solutions:**

1. **Validate JSON:**
```bash
cat test-agent.config.json | jq '.'
```

2. **Use JSON validator:**
```bash
# Online: jsonlint.com
# CLI: npm install -g jsonlint
jsonlint test-agent.config.json
```

3. **Common JSON issues:**
- Trailing commas
- Missing quotes around keys
- Unescaped characters in strings

---

### Path Resolution Problems

**Error:** `ENOENT: no such file or directory`

**Solutions:**

1. **Use absolute paths for debugging:**
```json
{
  "projectRoot": "/absolute/path/to/project",
  "coverage": {
    "persistPath": "/absolute/path/to/coverage"
  }
}
```

2. **Check working directory:**
```bash
pwd
ls -la
```

3. **Use relative paths correctly:**
```json
{
  "projectRoot": "./",  // Relative to config file
  "postman": {
    "collections": ["./postman/collection.json"]  // Relative to projectRoot
  }
}
```

---

### Missing Required Fields

**Error:** `Configuration validation failed`

**Solution:**
```json
{
  "projectRoot": "./",  // Required
  "testSuites": [       // Required, must have at least one
    {
      "type": "jest",   // Required
      "pattern": ["**/*.test.ts"],  // Required
      "command": "npm test"         // Required
    }
  ]
}
```

---

## Test Execution Problems

### Command Not Found

**Error:** `Command 'npm' not found` or `Command 'jest' not found`

**Solutions:**

1. **Check PATH:**
```bash
echo $PATH
which npm
which jest
```

2. **Use full paths:**
```json
{
  "command": "/full/path/to/npm test",
  "coverageCommand": "./node_modules/.bin/jest --coverage"
}
```

3. **Install missing tools:**
```bash
npm install jest cypress @storybook/test-runner
```

---

### Test Timeout Issues

**Error:** `Test timeout exceeded`

**Solutions:**

1. **Increase timeout in test configuration:**
```javascript
// jest.config.js
module.exports = {
  testTimeout: 30000  // 30 seconds
};
```

2. **Configure agent timeout:**
```json
{
  "testTimeout": 60000  // 60 seconds
}
```

---

### Memory Issues

**Error:** `JavaScript heap out of memory`

**Solutions:**

1. **Increase Node.js memory:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
test-agent start
```

2. **Use memory-efficient patterns:**
```json
{
  "excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/*.log"
  ]
}
```

---

## Integration Issues

### JIRA Connection Problems

**Error:** `JIRA authentication failed`

**Solutions:**

1. **Check credentials:**
```bash
# Test JIRA connection manually
curl -u "email@company.com:API_TOKEN" \
  "https://yourcompany.atlassian.net/rest/api/2/myself"
```

2. **Verify JIRA URL:**
```json
{
  "jira": {
    "baseUrl": "https://yourcompany.atlassian.net",  // No trailing slash
    "email": "your-email@company.com",
    "apiToken": "ATATT3xFfGF0..."
  }
}
```

3. **Check network connectivity:**
```bash
ping yourcompany.atlassian.net
curl -I https://yourcompany.atlassian.net
```

---

### Git Integration Issues

**Error:** `Git command failed`

**Solutions:**

1. **Check Git installation:**
```bash
git --version
which git
```

2. **Verify repository:**
```bash
git status
git remote -v
```

3. **Check permissions:**
```bash
git config --list
```

---

### Cursor IDE Connection Problems

**Error:** `WebSocket connection failed`

**Solutions:**

1. **Check port availability:**
```bash
lsof -i :3456
netstat -an | grep 3456
```

2. **Use different port:**
```json
{
  "cursorPort": 3457
}
```

3. **Check firewall settings:**
```bash
# macOS
sudo pfctl -sr | grep 3456

# Linux
sudo iptables -L | grep 3456
```

---

### MCP Integration Issues

**Error:** `MCP server not found`

**Solutions:**

1. **Check MCP installation:**
```bash
test-agent doctor
```

2. **Verify MCP registration:**
```bash
cat ~/.cursor/mcp.json
```

3. **Reinstall MCP:**
```bash
npm run uninstall-mcp
npm run install-mcp
```

---

## Performance Problems

### Slow File Watching

**Symptoms:**
- Tests take long time to trigger
- High CPU usage
- System becomes unresponsive

**Solutions:**

1. **Increase debounce time:**
```json
{
  "debounceMs": 2000  // Increase from 1000ms
}
```

2. **Optimize exclude patterns:**
```json
{
  "excludePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/*.log",
    "**/tmp/**"
  ]
}
```

3. **Use more specific watch patterns:**
```json
{
  "testSuites": [
    {
      "watchPattern": ["src/**/*.ts"]  // More specific than "**/*"
    }
  ]
}
```

---

### High Memory Usage

**Solutions:**

1. **Limit file watching scope:**
```json
{
  "excludePatterns": ["**/large-directory/**"]
}
```

2. **Reduce coverage history:**
```json
{
  "coverage": {
    "maxHistoryEntries": 10  // Reduce from 50
  }
}
```

3. **Disable unused features:**
```json
{
  "complexity": { "enabled": false },
  "figma": { "enabled": false }
}
```

---

## Debugging Tools

### Enable Debug Logging

```bash
# Enable all debug logs
DEBUG=test-agent:* test-agent start

# Enable specific components
DEBUG=test-agent:watcher,test-agent:runner test-agent start

# Enable Node.js debugging
node --inspect dist/index.js start
```

### Configuration Validation

```bash
# Validate configuration
test-agent validate

# Validate with strict mode
test-agent validate --strict

# Check configuration discovery
test-agent validate --debug
```

### Doctor Command

```bash
# Run comprehensive health check
test-agent doctor

# Check specific components
test-agent doctor --check-git --check-node
```

### Verbose Mode

```bash
# Run with verbose output
test-agent start --verbose

# Maximum verbosity
test-agent start --verbose --debug
```

---

## FAQ

### Q: Why are my tests not running automatically?

**A:** Check the following:
1. File patterns match your test files
2. Watch patterns include the files you're changing
3. Test commands are correct and executable
4. No syntax errors in configuration

### Q: How do I exclude large directories from watching?

**A:** Add patterns to `excludePatterns`:
```json
{
  "excludePatterns": [
    "**/node_modules/**",
    "**/large-data/**",
    "**/.git/**"
  ]
}
```

### Q: Can I use the agent with multiple projects?

**A:** Yes, use different configuration files:
```bash
test-agent start -c ~/configs/project-a.json -p ~/projects/project-a
test-agent start -c ~/configs/project-b.json -p ~/projects/project-b
```

### Q: How do I update the agent?

**A:** For global installation:
```bash
npm update -g test-running-agent
```

For local installation:
```bash
cd test-running-agent
git pull
npm install
npm run build
```

### Q: Why is the agent using high CPU?

**A:** Common causes:
1. Watching too many files (add exclusions)
2. Short debounce time (increase `debounceMs`)
3. Running too many tests simultaneously
4. System file indexing conflicts

### Q: How do I run only specific test suites?

**A:** Disable unwanted suites in configuration:
```json
{
  "testSuites": [
    {
      "type": "jest",
      "enabled": true
    },
    {
      "type": "cypress",
      "enabled": false
    }
  ]
}
```

### Q: Can I use custom test commands?

**A:** Yes, any command-line tool is supported:
```json
{
  "testSuites": [
    {
      "type": "custom",
      "command": "yarn test:custom",
      "pattern": ["**/*.custom.test.js"]
    }
  ]
}
```

### Q: How do I reset the agent configuration?

**A:** Delete and recreate:
```bash
rm test-agent.config.json
test-agent init --interactive
```

### Q: Why am I getting permission errors?

**A:** Check:
1. File permissions: `chmod 644 test-agent.config.json`
2. Directory permissions: `chmod 755 project-directory`
3. Node.js permissions: Use npx or fix npm permissions

---

## Getting Help

### Log Files
Check log files for detailed error information:
```bash
# Enable file logging
DEBUG=test-agent:* test-agent start 2>&1 | tee test-agent.log
```

### Issue Reporting
When reporting issues, include:
1. Node.js version (`node --version`)
2. Agent version (`test-agent --version`)
3. Operating system
4. Configuration file (sanitized)
5. Error messages and logs
6. Steps to reproduce

### Community Support
- GitHub Issues: [Repository Issues](https://github.com/your-org/test-running-agent/issues)
- Documentation: Check all `.md` files in the repository
- Examples: See `test-agent.config.example.json`

Remember to sanitize sensitive information (API tokens, URLs) when sharing configurations or logs!