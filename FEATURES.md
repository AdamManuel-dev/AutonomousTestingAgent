# Test Running Agent - Feature Summary

## Core Features ✅
- **Smart Test Detection**: Automatically determines which test suites to run based on file changes
- **Coverage-Based Decisions**: Uses code coverage data to decide between unit tests and E2E tests
- **Intelligent Test Selection**: Prioritizes tests based on coverage gaps and file criticality
- **Multiple Test Runners**: Supports Jest, Cypress, Storybook, Postman, and Stagehand
- **Cursor IDE Integration**: Connect to Cursor IDE via WebSocket for real-time test feedback

## Optional Features (All Configurable)

### ✅ Critical Path Configuration
- Define critical code paths that trigger comprehensive testing
- Support for exact paths and glob patterns
- Automatically runs all test suites when critical paths are modified

### ✅ Postman Integration
- Run API tests from Postman collections
- Support for environments and globals
- Configurable iteration counts
- Automatically triggered when API files change

### ✅ Stagehand UI Testing
- Browser automation tests with MCP integration
- Support for scenario files in separate folders
- Automatic screenshot capture
- Prompt for clarification on unclear descriptions
- Integration with MCP tools for browser control

### ✅ JIRA Integration
- Automatically detects JIRA ticket from branch name
- Checks ticket description for missing requirements
- Reviews comments for unaddressed requests
- Generates commit messages based on ticket info
- Configurable branch pattern matching

### ✅ Git Integration (Always Enabled)
- Notifications when your branch is behind origin
- Alerts when master/main has new commits to merge
- Detects potential merge conflicts
- Warns about uncommitted changes
- Generates commit messages

### ✅ Environment Monitoring (Jenkins)
- Parses Jenkins environment pages
- Monitors which branches are deployed
- Alerts when non-master branches are deployed
- Notifies before pushing to avoid conflicts
- Tracks environment status

### ✅ MCP Integration
- Communication with JIRA through LLMs
- Stagehand browser automation via MCP
- Automated commit message generation
- Delegation of test running to Cursor agent
- Registration with Cursor MCP

### ⏳ Figma Visual Testing (Stub Implemented)
- Compare Storybook components with Figma designs
- Configurable comparison threshold
- API token support

## Configuration

All features are optional and can be enabled/disabled through the configuration file. See `test-agent.config.example.json` for a complete example.

## Usage

```bash
# Start the agent
npm start

# Create a config file
node dist/index.js init

# Generate commit message
node dist/index.js commit-message
```

## Integration Points

1. **File Changes** → Smart Test Selection → Test Execution
2. **Critical Paths** → Comprehensive Testing
3. **API Changes** → Postman Tests
4. **UI Changes** → Stagehand Tests
5. **Git Operations** → JIRA + Environment Checks
6. **MCP Tools** → Browser Automation + LLM Communication