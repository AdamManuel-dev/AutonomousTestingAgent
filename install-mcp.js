#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import chalk from 'chalk';

const MCP_CONFIG_PATH = path.join(homedir(), '.cursor', 'mcp.json');
const MCP_SERVERS_PATH = path.join(homedir(), '.cursor', 'mcp', 'servers');

async function ensureDirectoryExists(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }
}

async function readMCPConfig() {
  try {
    const content = await fs.readFile(MCP_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // If file doesn't exist, return default config
    return {
      mcpServers: {}
    };
  }
}

async function writeMCPConfig(config) {
  await ensureDirectoryExists(path.dirname(MCP_CONFIG_PATH));
  
  // Create backup of existing config
  try {
    const exists = await fs.access(MCP_CONFIG_PATH).then(() => true).catch(() => false);
    if (exists) {
      const backupPath = MCP_CONFIG_PATH + '.backup-' + Date.now();
      await fs.copyFile(MCP_CONFIG_PATH, backupPath);
      console.log(chalk.gray(`Backup created at: ${backupPath}`));
    }
  } catch (error) {
    console.error(chalk.yellow('Warning: Could not create backup of MCP config'));
  }
  
  // Write the config with proper formatting
  await fs.writeFile(MCP_CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function installTestRunningAgent() {
  console.log(chalk.blue('🚀 Installing Test Running Agent to Cursor MCP Registry...\n'));

  // Check if the project is built
  const distPath = path.join(process.cwd(), 'dist');
  const mcpServerPath = path.join(distPath, 'mcp-server.js');
  
  try {
    await fs.access(mcpServerPath);
  } catch {
    console.error(chalk.red('❌ Build files not found. Please run "npm run build" first.'));
    process.exit(1);
  }

  // Get the absolute path to the test-running agent
  const agentPath = process.cwd();
  const agentConfigPath = path.join(agentPath, 'mcp-server.json');

  // Create MCP server configuration
  const serverConfig = {
    command: 'node',
    args: [path.join(agentPath, 'dist', 'mcp-server.js')],
    name: 'Test Running Agent',
    description: 'Automated test runner with coverage analysis and multiple integrations',
    version: '1.0.0',
    capabilities: {
      tools: [
        {
          name: 'run_tests',
          description: 'Run test suites based on file changes',
          inputSchema: {
            type: 'object',
            properties: {
              files: {
                type: 'array',
                items: { type: 'string' },
                description: 'Files that changed'
              },
              coverage: {
                type: 'boolean',
                description: 'Enable coverage collection'
              }
            }
          }
        },
        {
          name: 'analyze_coverage',
          description: 'Analyze test coverage and provide recommendations',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'check_jira',
          description: 'Check JIRA ticket status and requirements',
          inputSchema: {
            type: 'object',
            properties: {
              ticketKey: {
                type: 'string',
                description: 'JIRA ticket key (optional, will detect from branch)'
              }
            }
          }
        },
        {
          name: 'run_e2e',
          description: 'Run E2E tests with Stagehand',
          inputSchema: {
            type: 'object',
            properties: {
              scenario: {
                type: 'string',
                description: 'Scenario name or path'
              },
              baseUrl: {
                type: 'string',
                description: 'Base URL for testing'
              }
            }
          }
        },
        {
          name: 'check_environments',
          description: 'Check deployment environments',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'generate_commit_message',
          description: 'Generate commit message based on changes',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    }
  };

  // Write the MCP server configuration
  await fs.writeFile(agentConfigPath, JSON.stringify(serverConfig, null, 2));
  console.log(chalk.green('✅ Created MCP server configuration'));

  // Read current MCP config
  const mcpConfig = await readMCPConfig();

  // Validate the config structure
  if (!mcpConfig || typeof mcpConfig !== 'object') {
    console.error(chalk.red('❌ Invalid MCP configuration format'));
    process.exit(1);
  }

  // Ensure mcpServers exists
  if (!mcpConfig.mcpServers) {
    mcpConfig.mcpServers = {};
  }

  // Check if test-running-agent already exists
  if (mcpConfig.mcpServers['test-running-agent']) {
    console.log(chalk.yellow('⚠️  Test Running Agent already exists in MCP configuration'));
    console.log(chalk.yellow('   Updating existing configuration...'));
  }

  // Add test-running-agent to the config
  mcpConfig.mcpServers['test-running-agent'] = {
    command: serverConfig.command,
    args: serverConfig.args,
    env: {
      NODE_ENV: 'production',
      TEST_AGENT_CONFIG: path.join(agentPath, 'test-agent.config.json')
    }
  };

  // Validate the final config before writing
  try {
    JSON.stringify(mcpConfig);
  } catch (error) {
    console.error(chalk.red('❌ Invalid configuration object. Installation aborted.'));
    process.exit(1);
  }

  // Write updated config
  await writeMCPConfig(mcpConfig);
  console.log(chalk.green('✅ Updated Cursor MCP configuration'));
  
  // Verify the write was successful
  try {
    const verifyConfig = await readMCPConfig();
    if (!verifyConfig.mcpServers || !verifyConfig.mcpServers['test-running-agent']) {
      throw new Error('Configuration verification failed');
    }
  } catch (error) {
    console.error(chalk.red('❌ Failed to verify configuration write'));
    console.log(chalk.yellow('   You may need to manually restore from backup'));
    process.exit(1);
  }

  // Create a symlink in the MCP servers directory (optional)
  await ensureDirectoryExists(MCP_SERVERS_PATH);
  const symlinkPath = path.join(MCP_SERVERS_PATH, 'test-running-agent');
  
  try {
    await fs.unlink(symlinkPath); // Remove existing symlink if any
  } catch {
    // Ignore error if symlink doesn't exist
  }

  try {
    await fs.symlink(agentPath, symlinkPath, 'dir');
    console.log(chalk.green('✅ Created symlink in MCP servers directory'));
  } catch (error) {
    console.log(chalk.yellow('⚠️  Could not create symlink (may require admin privileges)'));
  }

  console.log(chalk.blue('\n📝 Next steps:'));
  console.log(chalk.gray('1. Build the project: npm run build'));
  console.log(chalk.gray('2. Configure test-agent.config.json with your settings'));
  console.log(chalk.gray('3. Restart Cursor to load the MCP server'));
  console.log(chalk.gray('4. Use the MCP tools in Cursor with @test-running-agent'));
}

async function uninstallTestRunningAgent() {
  console.log(chalk.red('🗑️  Uninstalling Test Running Agent from Cursor MCP Registry...\n'));

  try {
    // Read current MCP config
    const mcpConfig = await readMCPConfig();

    // Remove test-running-agent from the config
    if (mcpConfig.mcpServers && mcpConfig.mcpServers['test-running-agent']) {
      delete mcpConfig.mcpServers['test-running-agent'];
      await writeMCPConfig(mcpConfig);
      console.log(chalk.green('✅ Removed from Cursor MCP configuration'));
    } else {
      console.log(chalk.yellow('⚠️  Test Running Agent not found in MCP configuration'));
    }
  } catch (error) {
    console.error(chalk.red('Failed to read MCP configuration:'), error.message);
    process.exit(1);
  }

  // Remove symlink
  const symlinkPath = path.join(MCP_SERVERS_PATH, 'test-running-agent');
  try {
    await fs.unlink(symlinkPath);
    console.log(chalk.green('✅ Removed symlink'));
  } catch {
    // Ignore if doesn't exist
  }

  console.log(chalk.green('\n✅ Test Running Agent uninstalled successfully'));
}

// Check command line arguments
const command = process.argv[2];
const dryRun = process.argv.includes('--dry-run');

async function main() {
  if (dryRun) {
    console.log(chalk.yellow('🔍 DRY RUN MODE - No changes will be made\n'));
  }

  if (command === 'uninstall') {
    if (dryRun) {
      const mcpConfig = await readMCPConfig();
      if (mcpConfig.mcpServers && mcpConfig.mcpServers['test-running-agent']) {
        console.log(chalk.blue('Would remove test-running-agent from MCP configuration'));
        console.log(chalk.gray('Current config:'));
        console.log(JSON.stringify(mcpConfig.mcpServers['test-running-agent'], null, 2));
      } else {
        console.log(chalk.yellow('Test Running Agent not found in MCP configuration'));
      }
    } else {
      await uninstallTestRunningAgent();
    }
  } else {
    if (dryRun) {
      const mcpConfig = await readMCPConfig();
      console.log(chalk.blue('Current MCP configuration:'));
      console.log(chalk.gray(`Total servers: ${Object.keys(mcpConfig.mcpServers || {}).length}`));
      
      if (mcpConfig.mcpServers && mcpConfig.mcpServers['test-running-agent']) {
        console.log(chalk.yellow('\nTest Running Agent already exists and would be updated'));
      } else {
        console.log(chalk.green('\nTest Running Agent would be added'));
      }
      
      console.log(chalk.blue('\nConfiguration to be added:'));
      console.log(JSON.stringify({
        'test-running-agent': {
          command: 'node',
          args: [path.join(process.cwd(), 'dist', 'mcp-server.js')],
          env: {
            NODE_ENV: 'production',
            TEST_AGENT_CONFIG: path.join(process.cwd(), 'test-agent.config.json')
          }
        }
      }, null, 2));
    } else {
      await installTestRunningAgent();
    }
  }
}

main().catch(console.error);