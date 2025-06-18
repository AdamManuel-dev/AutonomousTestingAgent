#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { TestRunningAgent } from './Agent.js';
import { ConfigLoader } from './utils/ConfigLoader.js';
import { WorkflowOrchestrator } from './utils/WorkflowOrchestrator.js';
import { FileChange } from './types/index.js';
import * as path from 'path';

// Get config path from environment or let ConfigLoader find it
const configPath = process.env.TEST_AGENT_CONFIG || undefined;

class TestRunningAgentMCPServer {
  private server: Server;
  private agent: TestRunningAgent | null = null;
  private orchestrator: WorkflowOrchestrator | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'test-running-agent',
        version: '1.0.0',
        description: 'Automated test runner that monitors file changes and intelligently runs appropriate test suites with coverage analysis',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async initializeAgent(projectPath?: string) {
    if (!this.agent) {
      const config = await ConfigLoader.load(configPath, projectPath);
      this.agent = new TestRunningAgent(config);
      this.orchestrator = new WorkflowOrchestrator(this.agent);
      await this.agent.start();
    }
    return this.agent;
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'run_tests',
            description: 'Run test suites (Jest, Cypress, Storybook) for specific files. The agent intelligently selects which test suites to run based on the file types and coverage data. Use this when you want to test specific files after making changes.',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of file paths that changed (e.g., ["src/app.ts", "src/components/Button.tsx"])',
                },
                coverage: {
                  type: 'boolean',
                  description: 'Enable coverage collection and analysis',
                  default: true,
                },
              },
              required: ['files'],
            },
          },
          {
            name: 'analyze_coverage',
            description: 'Analyze current test coverage data and get recommendations for improving coverage. Shows which files have low coverage and suggests where to add tests. Use this to understand your project\'s test coverage status.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'check_jira',
            description: 'Check JIRA ticket status and requirements. Analyzes the ticket description for missing requirements and reviews comments for unaddressed requests. Automatically detects ticket from branch name if not provided. Use this to ensure all ticket requirements are met before pushing.',
            inputSchema: {
              type: 'object',
              properties: {
                ticketKey: {
                  type: 'string',
                  description: 'JIRA ticket key like "DEV-1234" (optional, auto-detects from branch name)',
                },
              },
            },
          },
          {
            name: 'run_e2e',
            description: 'Run end-to-end UI tests using Stagehand browser automation. Can run specific scenarios or all configured scenarios. Use this to test user workflows and UI interactions.',
            inputSchema: {
              type: 'object',
              properties: {
                scenario: {
                  type: 'string',
                  description: 'Name of specific scenario to run (optional, runs all if not specified)',
                },
                baseUrl: {
                  type: 'string',
                  description: 'Base URL for testing (e.g., "http://localhost:3000")',
                },
              },
            },
          },
          {
            name: 'check_environments',
            description: 'Check Jenkins deployment environments to see which branches are deployed where. Alerts about non-master branches in production-like environments. Use this before pushing to avoid deployment conflicts.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'generate_commit_message',
            description: 'Generate an intelligent commit message based on current file changes and JIRA ticket information. Analyzes the changes and creates a descriptive commit message following conventional commit standards.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'check_git_status',
            description: 'Check if your branch is up to date with origin and if master/main has new commits to merge. Detects potential merge conflicts and uncommitted changes. Use this before starting work or pushing changes.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'start_watching',
            description: 'Start the file watcher to automatically run tests when files change. The agent will monitor your project files and intelligently run the appropriate test suites based on what changed. Use this for continuous testing during development.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Absolute path to project directory to watch (optional, uses configured project root)',
                },
              },
            },
          },
          {
            name: 'stop_watching',
            description: 'Stop the file watcher. Use this when you\'re done with development and want to stop automatic test runs.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_status',
            description: 'Get the current status of the test running agent including: whether it\'s watching files, which features are enabled, current branch, and project configuration. Use this to check the agent\'s state.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'analyze_complexity',
            description: 'Analyze cyclomatic complexity of TypeScript/JavaScript files. Shows complexity scores for functions, methods, and classes. Highlights functions with high complexity that may need refactoring. Use this to identify complex code that needs simplification.',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of file paths to analyze (e.g., ["src/utils/parser.ts"]) - if not provided, analyzes all changed files',
                },
              },
            },
          },
          {
            name: 'compare_complexity',
            description: 'Compare the cyclomatic complexity of a file between its current version and the previous git version. Shows if complexity increased or decreased. Use this to ensure refactoring actually reduces complexity.',
            inputSchema: {
              type: 'object',
              properties: {
                file: {
                  type: 'string',
                  description: 'File path to compare (e.g., "src/services/auth.ts")',
                },
              },
              required: ['file'],
            },
          },
          // Optimized Workflow Tools - Batch multiple operations
          {
            name: 'workflow_dev_setup',
            description: 'Complete development setup workflow that runs all status checks in parallel and starts file watching. Combines check_git_status + check_environments + check_jira + start_watching. Use this at the beginning of your development session.',
            inputSchema: {
              type: 'object',
              properties: {
                projectPath: {
                  type: 'string',
                  description: 'Absolute path to project directory to watch (optional)',
                },
              },
            },
          },
          {
            name: 'workflow_test_suite',
            description: 'Complete testing workflow that runs tests, analyzes coverage, and checks complexity in parallel. Combines run_tests + analyze_coverage + analyze_complexity. Optionally includes E2E tests. Use this for comprehensive testing.',
            inputSchema: {
              type: 'object',
              properties: {
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of file paths that changed (e.g., ["src/app.ts", "src/components/Button.tsx"])',
                },
                includeE2E: {
                  type: 'boolean',
                  description: 'Include end-to-end tests in the workflow',
                  default: false,
                },
              },
              required: ['files'],
            },
          },
          {
            name: 'workflow_pre_commit',
            description: 'Pre-commit validation workflow that checks project status, validates JIRA ticket, and generates commit message. Combines check_git_status + check_jira + check_environments + generate_commit_message. Use this before committing.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'workflow_health_check',
            description: 'Complete project health check that runs all status checks in parallel. Combines get_status + check_git_status + check_environments + check_jira + analyze_coverage. Use this to get a complete project overview.',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      // Extract projectPath if provided in certain commands
      let projectPath: string | undefined;
      if (request.params.name === 'start_watching' && request.params.arguments) {
        projectPath = (request.params.arguments as any).projectPath;
      }
      
      const agent = await this.initializeAgent(projectPath);

      switch (request.params.name) {
        case 'run_tests': {
          const { files = [], coverage = true } = request.params.arguments as any;
          
          if (files.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Please provide files to test. Example: files: ["src/app.ts", "src/utils.ts"]',
                },
              ],
            };
          }

          // Convert file paths to FileChange objects
          const changes: FileChange[] = files.map((file: string) => ({
            path: file,
            type: 'change' as const,
            timestamp: new Date(),
          }));

          // Trigger test execution
          const testDecision = await agent['smartSelector'].selectTestSuites(changes);
          const results = await agent['testRunner'].runTestSuites(
            testDecision.suites,
            changes,
            agent['config'].projectRoot,
            coverage
          );

          // Format response in a user-friendly way
          let response = `🧪 Test Results\n\n`;
          response += `Strategy: ${testDecision.reason}\n`;
          
          if (testDecision.coverageGaps && testDecision.coverageGaps.length > 0) {
            response += `\n⚠️ Low coverage files: ${testDecision.coverageGaps.join(', ')}\n`;
          }
          
          response += `\n📊 Test Suites Run:\n`;
          for (const result of results) {
            const icon = result.success ? '✅' : '❌';
            response += `${icon} ${result.suite} - ${result.duration}ms\n`;
            
            if (!result.success && result.output) {
              response += `   Error: ${result.output.substring(0, 200)}...\n`;
            }
            
            if (result.coverage) {
              response += `   Coverage: ${result.coverage.lines.percentage.toFixed(1)}% lines, ${result.coverage.branches.percentage.toFixed(1)}% branches\n`;
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }

        case 'analyze_coverage': {
          const coverageAnalyzer = agent['coverageAnalyzer'];
          const coverage = await coverageAnalyzer.loadCoverageFromFile(
            agent['config'].coverage?.persistPath || 'coverage'
          );

          if (!coverage) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No coverage data available. Run tests with coverage enabled first.',
                },
              ],
            };
          }

          const recommendations = agent['smartSelector'].getTestRecommendations(coverage);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  coverage: {
                    lines: coverage.lines.percentage,
                    statements: coverage.statements.percentage,
                    functions: coverage.functions.percentage,
                    branches: coverage.branches.percentage,
                  },
                  recommendations,
                }, null, 2),
              },
            ],
          };
        }

        case 'check_jira': {
          const jiraIntegration = agent['jiraIntegration'];
          if (!jiraIntegration) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'JIRA integration is not enabled. Enable it in test-agent.config.json',
                },
              ],
            };
          }

          const analysis = await jiraIntegration.analyzeTicketCompleteness();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(analysis, null, 2),
              },
            ],
          };
        }

        case 'run_e2e': {
          const { scenario, baseUrl } = request.params.arguments as any;
          const stagehandRunner = agent['stagehandRunner'];
          
          if (!stagehandRunner) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Stagehand integration is not enabled. Enable it in test-agent.config.json',
                },
              ],
            };
          }

          // Run specific scenario or all scenarios
          let results;
          if (scenario) {
            const scenarioObj = {
              name: scenario,
              description: 'MCP-triggered scenario',
              steps: [], // Would be loaded from file or config
            };
            const result = await stagehandRunner.runScenario(scenarioObj);
            results = [{ scenario, ...result }];
          } else {
            results = await stagehandRunner.runAllScenarios();
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(results, null, 2),
              },
            ],
          };
        }

        case 'check_environments': {
          const envChecker = agent['environmentChecker'];
          if (!envChecker) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Environment checking is not enabled. Enable it in test-agent.config.json',
                },
              ],
            };
          }

          const environments = await envChecker.checkEnvironments();
          const nonMaster = await envChecker.getnonMasterEnvironments();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  allEnvironments: environments,
                  nonMasterEnvironments: nonMaster,
                  warnings: nonMaster.length > 0 
                    ? `${nonMaster.length} non-master branches are deployed`
                    : 'All environments are on master/main',
                }, null, 2),
              },
            ],
          };
        }

        case 'generate_commit_message': {
          const message = await agent.generateCommitMessage();
          
          return {
            content: [
              {
                type: 'text',
                text: message || 'No changes to commit or unable to generate message',
              },
            ],
          };
        }

        case 'check_git_status': {
          const gitIntegration = agent['gitIntegration'];
          const status = await gitIntegration.checkBranchUpToDate();
          const mergeStatus = await gitIntegration.checkMergeStatus();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  upToDate: status.isUpToDate,
                  message: status.message,
                  needsPull: mergeStatus.needsPull,
                  needsMerge: mergeStatus.needsMerge,
                  hasConflicts: mergeStatus.conflicts,
                  details: mergeStatus.messages,
                }, null, 2),
              },
            ],
          };
        }

        case 'start_watching': {
          const { projectPath } = request.params.arguments as any;
          
          // Update project path if provided
          if (projectPath) {
            agent['config'].projectRoot = projectPath;
          }

          // Check if already running
          const currentStatus = agent.getStatus();
          if (currentStatus.running) {
            return {
              content: [
                {
                  type: 'text',
                  text: '⚠️ Test agent is already watching files.\n\nTo change the project path, stop watching first with: @test-running-agent stop_watching',
                },
              ],
            };
          }

          // Start the agent
          await agent.start();

          const enabledFeatures = [];
          if (agent['config'].coverage?.enabled) enabledFeatures.push('Coverage Analysis');
          if (agent['config'].complexity?.enabled) enabledFeatures.push('Complexity Analysis');
          if (agent['config'].jira?.enabled) enabledFeatures.push('JIRA Integration');

          return {
            content: [
              {
                type: 'text',
                text: `🚀 Started Test Running Agent\n\n` +
                      `📁 Watching: ${agent['config'].projectRoot}\n` +
                      `✅ Enabled features: ${enabledFeatures.join(', ') || 'Basic testing'}\n\n` +
                      `File changes will automatically trigger appropriate tests.\n` +
                      `Use @test-running-agent stop_watching to stop.`,
              },
            ],
          };
        }

        case 'stop_watching': {
          const currentStatus = agent.getStatus();
          if (!currentStatus.running) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Test agent is not currently running.',
                },
              ],
            };
          }

          agent.stop();

          return {
            content: [
              {
                type: 'text',
                text: 'Stopped watching files. Test agent is now idle.',
              },
            ],
          };
        }

        case 'get_status': {
          const status = agent.getStatus();
          const gitIntegration = agent['gitIntegration'];
          const currentBranch = await gitIntegration.getCurrentBranch();
          
          // Get enabled features
          const enabledFeatures = [];
          if (agent['config'].postman?.enabled) enabledFeatures.push('Postman');
          if (agent['config'].stagehand?.enabled) enabledFeatures.push('Stagehand');
          if (agent['config'].jira?.enabled) enabledFeatures.push('JIRA');
          if (agent['config'].environments?.enabled) enabledFeatures.push('Environment Monitoring');
          if (agent['config'].mcp?.enabled) enabledFeatures.push('MCP');
          if (agent['config'].coverage?.enabled) enabledFeatures.push('Coverage Analysis');

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  running: status.running,
                  cursorConnected: status.cursorConnected,
                  projectRoot: agent['config'].projectRoot,
                  currentBranch,
                  enabledFeatures,
                  testSuites: agent['config'].testSuites
                    .filter(suite => suite.enabled !== false)
                    .map(suite => suite.type),
                }, null, 2),
              },
            ],
          };
        }

        case 'analyze_complexity': {
          const { files } = request.params.arguments as any;
          const report = await agent.getComplexityReport(files);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(report, null, 2),
              },
            ],
          };
        }

        case 'compare_complexity': {
          const { file } = request.params.arguments as any;
          const complexityAnalyzer = agent['complexityAnalyzer'];
          
          if (!complexityAnalyzer.shouldAnalyzeFile(file)) {
            return {
              content: [
                {
                  type: 'text',
                  text: `File ${file} is not a TypeScript or JavaScript file.`,
                },
              ],
            };
          }

          const comparison = await complexityAnalyzer.compareComplexity(file);
          
          if (!comparison) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Unable to compare complexity. No previous version found.',
                },
              ],
            };
          }

          const icon = comparison.increased ? '📈' : '📉';
          const changeStr = comparison.increased ? `+${comparison.change}` : comparison.change.toString();
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ...comparison,
                  summary: `${icon} Complexity: ${comparison.previous} → ${comparison.current} (${changeStr}, ${comparison.percentageChange.toFixed(1)}%)`,
                }, null, 2),
              },
            ],
          };
        }

        // Optimized Workflow Tools
        case 'workflow_dev_setup': {
          const { projectPath } = request.params.arguments as any;
          
          if (!this.orchestrator) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Orchestrator not initialized',
                },
              ],
            };
          }

          const result = await this.orchestrator.executeDevSetup(projectPath);
          
          let response = `${result.summary}\n\n`;
          response += `⏱️ Duration: ${result.duration}ms\n\n`;
          
          if (result.success) {
            response += `✅ **Results:**\n`;
            if (result.results.gitStatus) {
              response += `• Git: ${result.results.gitStatus.upToDate ? 'Up to date' : 'Needs attention'}\n`;
            }
            if (result.results.environments) {
              response += `• Environments: ${result.results.environments.warnings}\n`;
            }
            if (result.results.jiraStatus) {
              response += `• JIRA: Ticket analyzed\n`;
            }
            if (result.results.watching) {
              response += `• File Watching: Active on ${result.results.finalStatus?.projectRoot || 'project'}\n`;
            }
          }
          
          if (Object.keys(result.errors).length > 0) {
            response += `\n⚠️ **Issues:**\n`;
            Object.entries(result.errors).forEach(([tool, error]) => {
              response += `• ${tool}: ${error}\n`;
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }

        case 'workflow_test_suite': {
          const { files = [], includeE2E = false } = request.params.arguments as any;
          
          if (!this.orchestrator) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Orchestrator not initialized',
                },
              ],
            };
          }

          if (files.length === 0) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Please provide files to test. Example: files: ["src/app.ts", "src/utils.ts"]',
                },
              ],
            };
          }

          const result = await this.orchestrator.executeTestSuite(files, includeE2E);
          
          let response = `${result.summary}\n\n`;
          response += `⏱️ Duration: ${result.duration}ms\n\n`;
          
          if (result.success) {
            response += `✅ **Results:**\n`;
            if (result.results.testResults) {
              const testCount = result.results.testResults.results?.length || 0;
              response += `• Tests: ${testCount} suites executed\n`;
            }
            if (result.results.coverage) {
              const coverage = result.results.coverage.coverage;
              response += `• Coverage: ${coverage.lines.toFixed(1)}% lines, ${coverage.branches.toFixed(1)}% branches\n`;
            }
            if (result.results.complexity) {
              response += `• Complexity: Analysis completed\n`;
            }
            if (includeE2E && result.results.e2e) {
              response += `• E2E Tests: Completed\n`;
            }
          }
          
          if (Object.keys(result.errors).length > 0) {
            response += `\n⚠️ **Issues:**\n`;
            Object.entries(result.errors).forEach(([tool, error]) => {
              response += `• ${tool}: ${error}\n`;
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }

        case 'workflow_pre_commit': {
          if (!this.orchestrator) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Orchestrator not initialized',
                },
              ],
            };
          }

          const result = await this.orchestrator.executePreCommit();
          
          let response = `${result.summary}\n\n`;
          response += `⏱️ Duration: ${result.duration}ms\n\n`;
          
          if (result.success) {
            response += `✅ **Validation Results:**\n`;
            if (result.results.gitStatus) {
              response += `• Git Status: ${result.results.gitStatus.upToDate ? 'Ready to commit' : 'Needs attention'}\n`;
            }
            if (result.results.jiraStatus) {
              response += `• JIRA: Ticket validated\n`;
            }
            if (result.results.environments) {
              response += `• Environments: ${result.results.environments.warnings}\n`;
            }
            if (result.results.commitMessage) {
              response += `\n📝 **Generated Commit Message:**\n\`\`\`\n${result.results.commitMessage}\n\`\`\`\n`;
            }
          }
          
          if (Object.keys(result.errors).length > 0) {
            response += `\n❌ **Validation Issues:**\n`;
            Object.entries(result.errors).forEach(([tool, error]) => {
              response += `• ${tool}: ${error}\n`;
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }

        case 'workflow_health_check': {
          if (!this.orchestrator) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'Orchestrator not initialized',
                },
              ],
            };
          }

          const result = await this.orchestrator.executeHealthCheck();
          
          let response = `${result.summary}\n\n`;
          response += `⏱️ Duration: ${result.duration}ms\n\n`;
          
          response += `📊 **System Status:**\n`;
          if (result.results.agentStatus) {
            const status = result.results.agentStatus;
            response += `• Agent: ${status.running ? '🟢 Running' : '🔴 Stopped'} on ${status.currentBranch}\n`;
            response += `• Features: ${status.enabledFeatures.join(', ') || 'Basic'}\n`;
          }
          
          if (result.results.gitStatus) {
            response += `• Git: ${result.results.gitStatus.upToDate ? '🟢 Up to date' : '🟡 Needs attention'}\n`;
          }
          
          if (result.results.environments) {
            const envWarnings = result.results.environments.nonMasterEnvironments?.length || 0;
            response += `• Environments: ${envWarnings === 0 ? '🟢 Clean' : `🟡 ${envWarnings} non-master deployments`}\n`;
          }
          
          if (result.results.jiraStatus) {
            response += `• JIRA: 🟢 Connected\n`;
          }
          
          if (result.results.coverage) {
            const coverage = result.results.coverage.coverage.lines;
            const icon = coverage >= 80 ? '🟢' : coverage >= 60 ? '🟡' : '🔴';
            response += `• Coverage: ${icon} ${coverage.toFixed(1)}%\n`;
          }
          
          if (Object.keys(result.errors).length > 0) {
            response += `\n⚠️ **Issues Detected:**\n`;
            Object.entries(result.errors).forEach(([component, error]) => {
              response += `• ${component}: ${error}\n`;
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Cleanup on exit
    process.on('SIGINT', async () => {
      if (this.agent) {
        this.agent.stop();
      }
      await this.server.close();
      process.exit(0);
    });
  }
}

// Start the server
const server = new TestRunningAgentMCPServer();
server.run().catch(console.error);