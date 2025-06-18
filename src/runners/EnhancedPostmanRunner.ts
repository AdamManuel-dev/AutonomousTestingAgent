import { PostmanRunner } from './PostmanRunner.js';
import { PostmanConfig } from '../types/index.js';
import { DebugContext } from '../utils/DebugContext.js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface PostmanResult {
  collection: string;
  success: boolean;
  output: string;
  duration: number;
  debugInfo?: {
    collectionAnalysis?: any;
    environmentVariables?: string[];
    testMetrics?: any;
    errorDetails?: any;
  };
}

/**
 * Enhanced Postman runner with debugging context and detailed analysis
 */
export class EnhancedPostmanRunner extends PostmanRunner {
  private debugContext: boolean = true;

  constructor(config: PostmanConfig, enableDebugContext: boolean = true) {
    super(config);
    this.debugContext = enableDebugContext;
  }

  /**
   * Run collection with enhanced debugging and context
   */
  async runCollection(collectionPath: string): Promise<PostmanResult> {
    const metadata = {
      collection_path: collectionPath,
      collection_name: path.basename(collectionPath),
      has_environment: !!(this as any).config.environment,
      has_globals: !!(this as any).config.globals,
    };

    return DebugContext.withContext(
      'postman_collection',
      'postman-runner',
      async () => {
        // Analyze collection before running
        const collectionAnalysis = await this.analyzeCollection(collectionPath);

        DebugContext.addBreadcrumb('Starting Postman collection analysis', 'postman-runner', {
          ...metadata,
          request_count: collectionAnalysis?.requestCount,
          folder_count: collectionAnalysis?.folderCount,
        });

        const result = await super.runCollection(collectionPath);

        // Parse results for additional insights
        const testMetrics = await this.parseTestResults();
        const errorDetails = result.success ? null : await this.analyzeFailures(result.output);

        return {
          collection: path.basename(collectionPath),
          ...result,
          debugInfo: this.debugContext
            ? {
                collectionAnalysis,
                environmentVariables: await this.extractEnvironmentVariables(),
                testMetrics,
                errorDetails,
              }
            : undefined,
        };
      },
      metadata,
    );
  }

  /**
   * Run all collections with enhanced debugging
   */
  async runAllCollections(): Promise<PostmanResult[]> {
    const config = (this as any).config as PostmanConfig;

    if (!config.enabled || !config.collections || config.collections.length === 0) {
      return [];
    }

    return DebugContext.withContext('postman_all_collections', 'postman-runner', async () => {
      const results: PostmanResult[] = [];

      DebugContext.addBreadcrumb('Starting all Postman collections', 'postman-runner', {
        collection_count: config.collections!.length,
        collections: config.collections!.map((c) => path.basename(c)),
      });

      for (const [index, collection] of config.collections!.entries()) {
        DebugContext.addBreadcrumb(
          `Running collection ${index + 1}/${config.collections!.length}`,
          'postman-runner',
          {
            collection: path.basename(collection),
          },
        );

        const result = await this.runCollection(collection);
        results.push(result);

        // Track individual collection results
        DebugContext.trackPerformance(
          `postman_collection_${path.basename(collection)}`,
          'postman-runner',
          result.duration,
          result.success,
          {
            collection_name: path.basename(collection),
            test_count: result.debugInfo?.testMetrics?.totalTests,
            assertion_count: result.debugInfo?.testMetrics?.totalAssertions,
          },
        );
      }

      // Generate summary metrics
      const summary = this.generateSummary(results);
      DebugContext.addBreadcrumb('Completed all Postman collections', 'postman-runner', summary);

      return results;
    });
  }

  /**
   * Analyze Postman collection structure
   */
  private async analyzeCollection(collectionPath: string): Promise<any> {
    try {
      const collectionContent = await fs.readFile(collectionPath, 'utf-8');
      const collection = JSON.parse(collectionContent);

      const analysis = {
        name: collection.info?.name || 'Unknown',
        version: collection.info?.version || 'Unknown',
        requestCount: this.countRequests(collection.item || []),
        folderCount: this.countFolders(collection.item || []),
        authTypes: this.extractAuthTypes(collection),
        variables: collection.variable?.length || 0,
        testScripts: this.countTestScripts(collection.item || []),
        environments: this.extractEnvironmentReferences(collection),
      };

      return analysis;
    } catch (error) {
      DebugContext.captureError(error as Error, 'postman-runner', 'collection_analysis', {
        collection_path: collectionPath,
      });
      return null;
    }
  }

  /**
   * Parse test results from Newman output
   */
  private async parseTestResults(): Promise<any> {
    try {
      const resultsPath = 'postman-results.json';
      const resultsContent = await fs.readFile(resultsPath, 'utf-8');
      const results = JSON.parse(resultsContent);

      const metrics = {
        totalTests: results.run?.stats?.tests?.total || 0,
        passedTests: results.run?.stats?.tests?.passed || 0,
        failedTests: results.run?.stats?.tests?.failed || 0,
        totalAssertions: results.run?.stats?.assertions?.total || 0,
        passedAssertions: results.run?.stats?.assertions?.passed || 0,
        failedAssertions: results.run?.stats?.assertions?.failed || 0,
        totalRequests: results.run?.stats?.requests?.total || 0,
        averageResponseTime: this.calculateAverageResponseTime(results.run?.executions || []),
        slowestRequests: this.findSlowestRequests(results.run?.executions || []),
      };

      return metrics;
    } catch (error) {
      return null; // Results file might not exist or be malformed
    }
  }

  /**
   * Analyze failure patterns from output
   */
  private async analyzeFailures(output: string): Promise<any> {
    if (!output) return null;

    const failurePatterns = {
      networkErrors: output.match(/ECONNREFUSED|ENOTFOUND|ETIMEDOUT/g)?.length || 0,
      authErrors: output.match(/401|403|Unauthorized|Forbidden/g)?.length || 0,
      validationErrors: output.match(/expected|AssertionError/g)?.length || 0,
      serverErrors: output.match(/500|502|503|504/g)?.length || 0,
    };

    const errorLines = output
      .split('\n')
      .filter((line) => line.includes('✗') || line.includes('Error') || line.includes('Failed'));

    return {
      patterns: failurePatterns,
      errorSummary: errorLines.slice(0, 10), // First 10 error lines
      totalErrors: errorLines.length,
    };
  }

  /**
   * Extract environment variables being used
   */
  private async extractEnvironmentVariables(): Promise<string[]> {
    const config = (this as any).config as PostmanConfig;

    if (!config.environment) return [];

    try {
      const envContent = await fs.readFile(config.environment, 'utf-8');
      const env = JSON.parse(envContent);
      return env.values?.map((v: any) => v.key) || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate summary of all collection results
   */
  private generateSummary(results: PostmanResult[]): any {
    const summary = {
      totalCollections: results.length,
      successfulCollections: results.filter((r) => r.success).length,
      failedCollections: results.filter((r) => !r.success).length,
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
      averageDuration:
        results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0,
      totalTests: results.reduce((sum, r) => sum + (r.debugInfo?.testMetrics?.totalTests || 0), 0),
      totalAssertions: results.reduce(
        (sum, r) => sum + (r.debugInfo?.testMetrics?.totalAssertions || 0),
        0,
      ),
    };

    return summary;
  }

  // Helper methods for collection analysis
  private countRequests(items: any[]): number {
    return items.reduce((count, item) => {
      if (item.request) {
        return count + 1;
      } else if (item.item) {
        return count + this.countRequests(item.item);
      }
      return count;
    }, 0);
  }

  private countFolders(items: any[]): number {
    return items.reduce((count, item) => {
      if (item.item) {
        return count + 1 + this.countFolders(item.item);
      }
      return count;
    }, 0);
  }

  private extractAuthTypes(collection: any): string[] {
    const authTypes = new Set<string>();

    if (collection.auth?.type) {
      authTypes.add(collection.auth.type);
    }

    // This would recursively check all requests for auth types
    // Implementation simplified for brevity

    return Array.from(authTypes);
  }

  private countTestScripts(items: any[]): number {
    return items.reduce((count, item) => {
      let testCount = 0;

      if (item.event) {
        testCount += item.event.filter((e: any) => e.listen === 'test').length;
      }

      if (item.item) {
        testCount += this.countTestScripts(item.item);
      }

      return count + testCount;
    }, 0);
  }

  private extractEnvironmentReferences(collection: any): string[] {
    // This would analyze the collection for {{variable}} patterns
    // Implementation simplified for brevity
    return [];
  }

  private calculateAverageResponseTime(executions: any[]): number {
    if (executions.length === 0) return 0;

    const totalTime = executions.reduce((sum, exec) => {
      return sum + (exec.response?.responseTime || 0);
    }, 0);

    return totalTime / executions.length;
  }

  private findSlowestRequests(executions: any[]): any[] {
    return executions
      .filter((exec) => exec.response?.responseTime)
      .sort((a, b) => b.response.responseTime - a.response.responseTime)
      .slice(0, 5)
      .map((exec) => ({
        name: exec.item?.name || 'Unknown',
        responseTime: exec.response.responseTime,
        status: exec.response.code,
      }));
  }
}
