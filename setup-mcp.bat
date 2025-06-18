@echo off
setlocal enabledelayedexpansion

echo.
echo Setting up Test Running Agent for Cursor MCP...
echo.

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed. Please install Node.js and npm first.
    exit /b 1
)

:: Install dependencies
echo Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    exit /b 1
)

:: Build the project
echo Building the project...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed. Please check for TypeScript errors.
    exit /b 1
)

:: Check if test-agent.config.json exists
if not exist "test-agent.config.json" (
    echo No configuration file found. Creating from example...
    if exist "test-agent.config.example.json" (
        copy "test-agent.config.example.json" "test-agent.config.json"
        echo Created test-agent.config.json from example
    ) else (
        echo Creating default configuration...
        call npm run init
    )
)

:: Install to Cursor MCP
echo Installing to Cursor MCP registry...
call npm run install-mcp
if %errorlevel% neq 0 (
    echo Error: Failed to install to Cursor MCP registry
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Edit test-agent.config.json to configure your settings
echo 2. Restart Cursor to load the MCP server
echo 3. Use the test running agent in Cursor with @test-running-agent
echo.
echo Available MCP commands:
echo   - start_watching - Start watching files for changes
echo   - stop_watching - Stop watching files
echo   - run_tests - Run tests for specific files
echo   - check_jira - Check JIRA ticket status
echo   - check_environments - Check deployment environments
echo   - generate_commit_message - Generate commit message
echo   - check_git_status - Check if branch needs pull/merge
echo   - get_status - Get current agent status

pause