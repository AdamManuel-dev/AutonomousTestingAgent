import { PostHog } from 'posthog-node';
import { PostHogConfig } from '../types/index.js';

/**
 * Service for managing PostHog analytics and debugging context
 */
export class PostHogService {
  private static instance: PostHogService;
  private client: PostHog | null = null;
  private config: PostHogConfig;
  private userId: string | null = null;

  private constructor(config: PostHogConfig) {
    this.config = config;
  }

  static getInstance(config: PostHogConfig): PostHogService {
    if (!PostHogService.instance) {
      PostHogService.instance = new PostHogService(config);
    }
    return PostHogService.instance;
  }

  /**
   * Initialize PostHog client
   */
  initialize(): void {
    if (!this.config.enabled || !this.config.apiKey || this.client) {
      return;
    }

    this.client = new PostHog(this.config.apiKey, {
      host: this.config.host || 'https://app.posthog.com',
    });

    // Generate anonymous user ID based on machine/project
    this.userId = `test-agent-${Buffer.from(process.cwd()).toString('base64').slice(0, 8)}`;
  }

  /**
   * Track test execution events
   */
  trackTestExecution(
    testType: string,
    success: boolean,
    duration: number,
    fileCount: number,
  ): void {
    if (!this.client || !this.config.enableTestTracking) return;

    this.client.capture({
      distinctId: this.userId!,
      event: 'test_execution',
      properties: {
        test_type: testType,
        success,
        duration_ms: duration,
        files_triggered: fileCount,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track file change events
   */
  trackFileChange(filePath: string, changeType: string, triggeredTests: string[]): void {
    if (!this.client || !this.config.enableUserTracking) return;

    this.client.capture({
      distinctId: this.userId!,
      event: 'file_change',
      properties: {
        file_extension: filePath.split('.').pop(),
        change_type: changeType,
        triggered_test_types: triggeredTests,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track error events with context
   */
  trackError(error: Error, context: Record<string, any>): void {
    if (!this.client || !this.config.enableErrorTracking) return;

    this.client.capture({
      distinctId: this.userId!,
      event: 'error_occurred',
      properties: {
        error_message: error.message,
        error_stack: error.stack,
        error_name: error.name,
        ...context,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track coverage analysis results
   */
  trackCoverageAnalysis(
    overallCoverage: number,
    filesCovered: number,
    totalFiles: number,
    criticalPathsCovered: number,
  ): void {
    if (!this.client || !this.config.enableTestTracking) return;

    this.client.capture({
      distinctId: this.userId!,
      event: 'coverage_analysis',
      properties: {
        overall_coverage: overallCoverage,
        files_covered: filesCovered,
        total_files: totalFiles,
        critical_paths_covered: criticalPathsCovered,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track agent startup and configuration
   */
  trackAgentStart(config: Record<string, any>): void {
    if (!this.client || !this.config.enableUserTracking) return;

    // Remove sensitive data from config
    const sanitizedConfig = {
      test_suites_count: config.testSuites?.length || 0,
      has_coverage: !!config.coverage?.enabled,
      has_jira: !!config.jira?.enabled,
      has_postman: !!config.postman?.enabled,
      has_stagehand: !!config.stagehand?.enabled,
      has_complexity: !!config.complexity?.enabled,
      has_critical_paths: !!config.criticalPaths?.enabled,
    };

    this.client.capture({
      distinctId: this.userId!,
      event: 'agent_start',
      properties: {
        ...sanitizedConfig,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, any>,
  ): void {
    if (!this.client || !this.config.enableTestTracking) return;

    this.client.capture({
      distinctId: this.userId!,
      event: 'performance_metric',
      properties: {
        operation,
        duration_ms: duration,
        success,
        ...metadata,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Set user properties for better debugging context
   */
  identifyUser(properties: Record<string, any>): void {
    if (!this.client || !this.config.enableUserTracking) return;

    this.client.identify({
      distinctId: this.userId!,
      properties: {
        ...properties,
        last_seen: new Date().toISOString(),
      },
    });
  }

  /**
   * Shutdown PostHog client
   */
  async shutdown(): Promise<void> {
    if (!this.client) return;
    await this.client.shutdown();
  }
}
