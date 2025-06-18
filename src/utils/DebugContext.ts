import { SentryService } from './SentryService.js';
import { PostHogService } from './PostHogService.js';

/**
 * Utility for adding consistent debugging context across the application
 */
export class DebugContext {
  private static sentryService: SentryService | null = null;
  private static postHogService: PostHogService | null = null;

  static initialize(sentryService: SentryService, postHogService: PostHogService): void {
    DebugContext.sentryService = sentryService;
    DebugContext.postHogService = postHogService;
  }

  /**
   * Create a standardized error context for debugging
   */
  static createErrorContext(
    component: string,
    operation: string,
    metadata: Record<string, any> = {},
  ): Record<string, any> {
    return {
      component,
      operation,
      timestamp: new Date().toISOString(),
      workingDirectory: process.cwd(),
      nodeVersion: process.version,
      platform: process.platform,
      ...metadata,
    };
  }

  /**
   * Capture an error with standardized context
   */
  static captureError(
    error: Error,
    component: string,
    operation: string,
    metadata: Record<string, any> = {},
  ): void {
    const context = DebugContext.createErrorContext(component, operation, metadata);

    if (DebugContext.sentryService) {
      DebugContext.sentryService.captureException(error, context);
    }

    if (DebugContext.postHogService) {
      DebugContext.postHogService.trackError(error, context);
    }
  }

  /**
   * Track performance metrics with context
   */
  static trackPerformance(
    operation: string,
    component: string,
    duration: number,
    success: boolean,
    metadata: Record<string, any> = {},
  ): void {
    const context = DebugContext.createErrorContext(component, operation, metadata);

    if (DebugContext.postHogService) {
      DebugContext.postHogService.trackPerformance(operation, duration, success, context);
    }
  }

  /**
   * Add a breadcrumb for debugging trail
   */
  static addBreadcrumb(message: string, component: string, data: Record<string, any> = {}): void {
    if (DebugContext.sentryService) {
      DebugContext.sentryService.addBreadcrumb(message, component, data);
    }
  }

  /**
   * Wrap async operations with error handling and performance tracking
   */
  static async withContext<T>(
    operation: string,
    component: string,
    fn: () => Promise<T>,
    metadata: Record<string, any> = {},
  ): Promise<T> {
    const startTime = Date.now();

    DebugContext.addBreadcrumb(`Starting ${operation}`, component, metadata);

    try {
      const result = await fn();
      const duration = Date.now() - startTime;

      DebugContext.trackPerformance(operation, component, duration, true, metadata);
      DebugContext.addBreadcrumb(`Completed ${operation}`, component, { duration, success: true });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      DebugContext.captureError(error as Error, component, operation, metadata);
      DebugContext.trackPerformance(operation, component, duration, false, metadata);
      DebugContext.addBreadcrumb(`Failed ${operation}`, component, {
        duration,
        success: false,
        error: (error as Error).message,
      });

      throw error;
    }
  }

  /**
   * Set user context for debugging
   */
  static setUserContext(context: {
    projectRoot?: string;
    configFile?: string;
    testSuites?: string[];
    features?: string[];
  }): void {
    if (DebugContext.sentryService) {
      DebugContext.sentryService.setUser({
        id: Buffer.from(context.projectRoot || process.cwd())
          .toString('base64')
          .slice(0, 12),
        username: 'test-agent-user',
      });
    }

    if (DebugContext.postHogService) {
      DebugContext.postHogService.identifyUser({
        project_root: context.projectRoot,
        config_file: context.configFile,
        test_suites: context.testSuites?.join(','),
        enabled_features: context.features?.join(','),
      });
    }
  }
}
