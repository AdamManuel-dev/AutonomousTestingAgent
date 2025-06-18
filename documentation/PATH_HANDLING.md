# Path Handling in Test Running Agent

← [Back to README](../README.md) | [📋 Documentation Index](./DOCUMENTATION_INDEX.md)

The test-running agent now supports flexible path handling to work properly when monitoring code in different directories.

## Features

### 1. Configuration File Discovery

The agent will automatically search for `test-agent.config.json` in the following locations (in order):

1. Path specified by `TEST_AGENT_CONFIG` environment variable
2. Current working directory
3. Project root directory (if specified via `-p` option)
4. Parent directories (up to 3 levels)

Example:
```bash
# Using environment variable
export TEST_AGENT_CONFIG=/path/to/my/config.json
test-agent start

# Using explicit config path
test-agent start -c /path/to/config.json

# Using project directory
test-agent start -p /path/to/project

# Auto-discovery from current directory
cd /path/to/project
test-agent start
```

### 2. Relative Path Resolution

All relative paths in the configuration file are resolved relative to the config file's location, not the current working directory.

Example `test-agent.config.json`:
```json
{
  "projectRoot": "./",  // Resolved relative to config file location
  "coverage": {
    "persistPath": "./coverage"  // Resolved relative to projectRoot
  },
  "postman": {
    "collections": [
      "./postman/collection.json"  // Resolved relative to projectRoot
    ],
    "environment": "./postman/env.json"  // Resolved relative to projectRoot
  }
}
```

### 3. Project Root Override

You can override the project root at runtime:

```bash
# Override project root
test-agent start -p /different/project/path

# This will monitor the specified project, even if config file is elsewhere
```

### 4. File Path Normalization

The agent automatically normalizes all file paths:

- **Absolute paths**: Used as-is
- **Relative paths**: Resolved relative to the appropriate base directory
- **Coverage paths**: Resolved relative to project root
- **Test patterns**: Applied relative to project root
- **Watch patterns**: Applied relative to project root

### 5. Cross-Directory Monitoring

You can now run the agent from any directory and monitor a different project:

```bash
# From anywhere
test-agent start -c ~/configs/project-a.json -p ~/projects/project-a

# Using environment variable
export TEST_AGENT_CONFIG=~/configs/project-a.json
cd ~/any/directory
test-agent start -p ~/projects/project-a
```

## Configuration Examples

### Basic Setup
```json
{
  "projectRoot": "../my-project",
  "testSuites": [{
    "type": "jest",
    "pattern": ["src/**/*.test.ts"],
    "command": "npm test"
  }]
}
```

### Advanced Setup with Multiple Projects
```json
{
  "projectRoot": "/absolute/path/to/project",
  "coverage": {
    "persistPath": "./coverage"  // Relative to projectRoot
  },
  "postman": {
    "collections": [
      "/absolute/path/to/collection.json",  // Absolute path
      "./relative/collection.json"  // Relative to projectRoot
    ]
  }
}
```

## Best Practices

1. **Use relative paths in config files** for portability
2. **Set TEST_AGENT_CONFIG** environment variable for consistent configuration
3. **Use -p option** when running from different directories
4. **Keep config files with projects** for easier version control

## Troubleshooting

### Config file not found
- Check the console output for searched locations
- Ensure file permissions allow reading
- Use explicit -c option to specify path

### Paths not resolving correctly
- Check if paths in config are relative or absolute
- Verify projectRoot is set correctly
- Use absolute paths for debugging

### File watching not working
- Ensure projectRoot points to correct directory
- Check exclude patterns aren't too broad
- Verify watch patterns match your file structure