import chalk from 'chalk';
import { MCPConfig } from '../types/index.js';
import { MCPIntegration } from '../integrations/MCPIntegration.js';
import { DebugContext } from './DebugContext.js';

/**
 * Enhanced MCP integration with debugging context and monitoring
 */
export class EnhancedMCPIntegration extends MCPIntegration {
  private debugContext: boolean = false;

  constructor(config: MCPConfig, enableDebugContext: boolean = true) {
    super(config);
    this.debugContext = enableDebugContext;
  }

  /**
   * Connect to MCP with debugging context
   */
  async connect(): Promise<boolean> {
    return DebugContext.withContext('mcp_connect', 'mcp-integration', async () => {
      const result = await super.connect();

      if (result) {
        DebugContext.addBreadcrumb('MCP connected successfully', 'mcp-integration');
      } else {
        DebugContext.addBreadcrumb('MCP connection failed', 'mcp-integration');
      }

      return result;
    });
  }

  /**
   * Call MCP tool with debugging context and error tracking
   */
  async callTool(toolName: string, params: any): Promise<any> {
    const metadata = {
      tool_name: toolName,
      params_keys: Object.keys(params),
      params_size: JSON.stringify(params).length,
    };

    return DebugContext.withContext(
      `mcp_call_${toolName}`,
      'mcp-integration',
      async () => {
        const result = await super.callTool(toolName, params);

        if (!result.success) {
          DebugContext.addBreadcrumb(`MCP tool call failed: ${toolName}`, 'mcp-integration', {
            error: result.error,
            params,
          });
        }

        return result;
      },
      metadata,
    );
  }

  /**
   * Run Stagehand scenario with enhanced debugging
   */
  async runStagehandScenario(
    steps: string[],
    baseUrl?: string,
  ): Promise<{
    success: boolean;
    screenshots: string[];
    errors: string[];
    debugInfo?: any;
  }> {
    const metadata = {
      steps_count: steps.length,
      base_url: baseUrl,
      steps_preview: steps.slice(0, 3).join(', '),
    };

    return DebugContext.withContext(
      'stagehand_scenario',
      'stagehand-runner',
      async () => {
        DebugContext.addBreadcrumb('Starting Stagehand scenario', 'stagehand-runner', metadata);

        const result = await super.runStagehandScenario(steps, baseUrl);

        // Add debug information
        const debugInfo = this.debugContext
          ? {
              executionContext: {
                userAgent: 'stagehand-automation',
                timestamp: new Date().toISOString(),
                stepDetails: steps.map((step, index) => ({
                  index: index + 1,
                  step,
                  status: index < result.errors.length ? 'failed' : 'completed',
                })),
              },
              performanceMetrics: {
                totalSteps: steps.length,
                successfulSteps: steps.length - result.errors.length,
                screenshotCount: result.screenshots.length,
              },
            }
          : undefined;

        if (result.errors.length > 0) {
          DebugContext.addBreadcrumb(
            `Stagehand scenario had ${result.errors.length} errors`,
            'stagehand-runner',
            { errors: result.errors },
          );
        }

        return {
          ...result,
          debugInfo,
        };
      },
      metadata,
    );
  }

  /**
   * Enhanced Postman runner with debugging context
   */
  async runPostmanCollection(
    collectionPath: string,
    environment?: string,
    globals?: string,
    iterationCount?: number,
  ): Promise<{
    success: boolean;
    output: string;
    duration: number;
    debugInfo?: any;
  }> {
    const metadata = {
      collection_path: collectionPath,
      has_environment: !!environment,
      has_globals: !!globals,
      iteration_count: iterationCount || 1,
    };

    return DebugContext.withContext(
      'postman_collection',
      'postman-runner',
      async () => {
        const startTime = Date.now();

        DebugContext.addBreadcrumb('Starting Postman collection', 'postman-runner', metadata);

        try {
          let command = `npx newman run ${collectionPath}`;

          if (environment) {
            command += ` -e ${environment}`;
          }

          if (globals) {
            command += ` -g ${globals}`;
          }

          if (iterationCount) {
            command += ` -n ${iterationCount}`;
          }

          command += ' --reporters cli,json --reporter-json-export postman-results.json';

          // Use MCP to run the command if available
          const mcpResult = await this.callTool('mcp__postman__run-collection', {
            collection: collectionPath,
            environment,
            globals,
            iterationCount,
          });

          const duration = Date.now() - startTime;

          if (mcpResult.success) {
            DebugContext.addBreadcrumb(
              'Postman collection completed successfully',
              'postman-runner',
              {
                duration,
                collection: collectionPath,
              },
            );

            return {
              success: true,
              output: mcpResult.data?.output || 'Collection completed successfully',
              duration,
              debugInfo: this.debugContext
                ? {
                    command,
                    mcpUsed: true,
                    collectionMetrics: mcpResult.data?.metrics,
                  }
                : undefined,
            };
          } else {
            throw new Error(mcpResult.error || 'Postman collection failed');
          }
        } catch (error) {
          const duration = Date.now() - startTime;

          DebugContext.addBreadcrumb('Postman collection failed', 'postman-runner', {
            duration,
            error: (error as Error).message,
          });

          return {
            success: false,
            output: (error as Error).message || 'Unknown error',
            duration,
            debugInfo: this.debugContext
              ? {
                  error: (error as Error).stack,
                  failurePoint: 'execution',
                }
              : undefined,
          };
        }
      },
      metadata,
    );
  }

  /**
   * Query JIRA with enhanced context
   */
  async queryJIRA(
    query: string,
    ticketKey?: string,
  ): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    debugInfo?: any;
  }> {
    const metadata = {
      query_length: query.length,
      has_ticket_key: !!ticketKey,
      query_type: this.inferQueryType(query),
    };

    return DebugContext.withContext(
      'jira_query',
      'jira-integration',
      async () => {
        DebugContext.addBreadcrumb('Querying JIRA', 'jira-integration', metadata);

        const result = await super.queryJIRA(query);

        if (result.success) {
          DebugContext.addBreadcrumb('JIRA query successful', 'jira-integration', {
            ticket: result.data?.ticket,
            status: result.data?.status,
          });
        }

        return {
          ...result,
          debugInfo: this.debugContext
            ? {
                queryAnalysis: {
                  query,
                  inferredType: metadata.query_type,
                  timestamp: new Date().toISOString(),
                },
                responseMetrics: result.data
                  ? {
                      hasTicket: !!result.data.ticket,
                      hasDescription: !!result.data.description,
                      dataKeys: Object.keys(result.data),
                    }
                  : undefined,
              }
            : undefined,
        };
      },
      metadata,
    );
  }

  /**
   * Generate commit message with enhanced context
   */
  async generateCommitMessageWithDebug(context: {
    files: string[];
    ticket?: string;
    description?: string;
    complexity?: any;
    testResults?: any;
  }): Promise<{
    message: string;
    debugInfo?: any;
  }> {
    const metadata = {
      files_count: context.files.length,
      has_ticket: !!context.ticket,
      has_description: !!context.description,
      has_complexity: !!context.complexity,
      has_test_results: !!context.testResults,
    };

    return DebugContext.withContext(
      'generate_commit_message',
      'mcp-integration',
      async () => {
        DebugContext.addBreadcrumb('Generating commit message', 'mcp-integration', metadata);

        // Enhanced prompt with debugging context
        const enhancedContext = {
          ...context,
          debugInfo: this.debugContext
            ? {
                fileTypes: context.files.map((f) => f.split('.').pop()).filter(Boolean),
                projectContext: process.cwd(),
                timestamp: new Date().toISOString(),
              }
            : undefined,
        };

        const message = await super.generateCommitMessage(enhancedContext);

        DebugContext.addBreadcrumb('Commit message generated', 'mcp-integration', {
          message_length: message.length,
          includes_ticket: message.includes(context.ticket || ''),
        });

        return {
          message,
          debugInfo: this.debugContext
            ? {
                generationContext: enhancedContext,
                messageAnalysis: {
                  length: message.length,
                  includesTicket: message.includes(context.ticket || ''),
                  includesFiles: context.files.some((f) => message.includes(f)),
                },
              }
            : undefined,
        };
      },
      metadata,
    );
  }

  /**
   * Infer the type of JIRA query for better debugging
   */
  private inferQueryType(query: string): string {
    if (query.includes('status')) return 'status_check';
    if (query.includes('comment')) return 'comment_analysis';
    if (query.includes('description')) return 'description_check';
    if (query.includes('requirement')) return 'requirement_check';
    return 'general_query';
  }
}
