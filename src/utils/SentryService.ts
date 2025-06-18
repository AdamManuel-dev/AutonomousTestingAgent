import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { SentryConfig } from '../types/index.js';

/**
 * Service for managing Sentry error tracking and performance monitoring
 */
export class SentryService {
  private static instance: SentryService;
  private initialized = false;
  private config: SentryConfig;

  private constructor(config: SentryConfig) {
    this.config = config;
  }

  static getInstance(config: SentryConfig): SentryService {
    if (!SentryService.instance) {
      SentryService.instance = new SentryService(config);
    }
    return SentryService.instance;
  }

  /**
   * Initialize Sentry with configuration
   */
  initialize(): void {
    if (this.initialized || !this.config.enabled || !this.config.dsn) {
      return;
    }

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment || 'development',
      release: this.config.release,
      tracesSampleRate: this.config.tracesSampleRate || 0.1,
      profilesSampleRate: this.config.profilesSampleRate || 0.1,
      debug: this.config.debug || false,
      integrations: [nodeProfilingIntegration()],
    });

    this.initialized = true;
  }

  /**
   * Capture an exception with context
   */
  captureException(error: Error, context?: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      Sentry.captureException(error);
    });
  }

  /**
   * Capture a message with context
   */
  captureMessage(
    message: string,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
    context?: Record<string, any>,
  ): void {
    if (!this.initialized) return;

    Sentry.withScope((scope) => {
      if (context) {
        Object.entries(context).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      Sentry.captureMessage(message, level);
    });
  }

  /**
   * Set user context for debugging
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (!this.initialized) return;
    Sentry.setUser(user);
  }

  /**
   * Add breadcrumb for debugging trail
   */
  addBreadcrumb(message: string, category: string, data?: Record<string, any>): void {
    if (!this.initialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      data,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Start a transaction for performance monitoring
   */
  startTransaction(name: string, operation: string): any {
    if (!this.initialized) return undefined;
    // Note: Transaction API has changed in newer Sentry versions
    // This is a simplified implementation
    return {
      setName: (n: string) => {},
      setOp: (op: string) => {},
      finish: () => {},
    };
  }

  /**
   * Wrap async function with error handling
   */
  async withErrorHandling<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Record<string, any>,
  ): Promise<T> {
    const transaction = this.startTransaction(operation, 'test-runner');

    try {
      this.addBreadcrumb(`Starting ${operation}`, 'test-runner', context);
      const result = await fn();
      this.addBreadcrumb(`Completed ${operation}`, 'test-runner', { success: true });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.addBreadcrumb(`Failed ${operation}`, 'test-runner', { error: errorMessage });
      this.captureException(error as Error, { operation, ...context });
      throw error;
    } finally {
      transaction?.finish();
    }
  }

  /**
   * Close Sentry and clean up
   */
  async close(): Promise<void> {
    if (!this.initialized) return;
    await Sentry.close(2000);
  }
}
