import { TestRunningAgent } from '../Agent.js';
import { FileChange } from '../types/index.js';

export interface WorkflowResult {
  success: boolean;
  results: { [key: string]: any };
  errors: { [key: string]: string };
  duration: number;
  summary: string;
}

export interface WorkflowStep {
  name: string;
  tool: string;
  args?: any;
  dependsOn?: string[];
  parallel?: boolean;
}

export class WorkflowOrchestrator {
  private agent: TestRunningAgent;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(agent: TestRunningAgent) {
    this.agent = agent;
  }

  /**
   * Execute a complete development workflow setup
   */
  async executeDevSetup(projectPath?: string): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};

    try {
      // Phase 1: Parallel status checks (independent operations)
      const statusChecks = await Promise.allSettled([
        this.checkGitStatus(),
        this.checkEnvironments(),
        this.checkJira(),
        this.checkGitHubPR(),
      ]);

      // Process status check results
      results.gitStatus = statusChecks[0].status === 'fulfilled' ? statusChecks[0].value : null;
      results.environments = statusChecks[1].status === 'fulfilled' ? statusChecks[1].value : null;
      results.jiraStatus = statusChecks[2].status === 'fulfilled' ? statusChecks[2].value : null;
      results.githubPR = statusChecks[3].status === 'fulfilled' ? statusChecks[3].value : null;

      // Record any errors from status checks
      statusChecks.forEach((result, index) => {
        if (result.status === 'rejected') {
          const tools = ['gitStatus', 'environments', 'jiraStatus', 'githubPR'];
          errors[tools[index]] = result.reason.message;
        }
      });

      // Phase 2: Start file watching (sequential, depends on project setup)
      try {
        results.watching = await this.startWatching(projectPath);
      } catch (error) {
        errors.watching = error instanceof Error ? error.message : 'Failed to start watching';
      }

      // Phase 3: Get final status
      try {
        results.finalStatus = await this.getStatus();
      } catch (error) {
        errors.finalStatus = error instanceof Error ? error.message : 'Failed to get status';
      }

      const duration = Date.now() - startTime;
      const success = Object.keys(errors).length === 0;

      return {
        success,
        results,
        errors,
        duration,
        summary: this.formatDevSetupSummary(results, errors, success),
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: { general: error instanceof Error ? error.message : 'Unknown error' },
        duration: Date.now() - startTime,
        summary: '❌ Development setup failed',
      };
    }
  }

  /**
   * Execute comprehensive testing workflow
   */
  async executeTestSuite(files: string[], includeE2E: boolean = false): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};

    try {
      // Phase 1: Run core tests (sequential - coverage depends on test results)
      try {
        results.testResults = await this.runTests(files);
      } catch (error) {
        errors.testResults = error instanceof Error ? error.message : 'Test execution failed';
      }

      // Phase 2: Parallel analysis (independent of each other, but may depend on test results)
      const analysisPromises = [];

      // Coverage analysis (if tests ran successfully)
      if (results.testResults && !errors.testResults) {
        analysisPromises.push(
          this.analyzeCoverage().catch((error) => ({ error: error.message, type: 'coverage' })),
        );
      }

      // Complexity analysis (independent of test results)
      analysisPromises.push(
        this.analyzeComplexity(files).catch((error) => ({
          error: error.message,
          type: 'complexity',
        })),
      );

      // E2E tests (if requested and independent)
      if (includeE2E) {
        analysisPromises.push(
          this.runE2E().catch((error) => ({ error: error.message, type: 'e2e' })),
        );
      }

      const analysisResults = await Promise.allSettled(analysisPromises);

      // Process analysis results
      analysisResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          if (data.error) {
            errors[data.type] = data.error;
          } else {
            if (index === 0 && results.testResults) results.coverage = data;
            else if ((index === 1 && !includeE2E) || (index === 1 && !results.testResults))
              results.complexity = data;
            else if (index === 1 && includeE2E) results.complexity = data;
            else if (index === 2) results.e2e = data;
          }
        }
      });

      const duration = Date.now() - startTime;
      const success = Object.keys(errors).length === 0;

      return {
        success,
        results,
        errors,
        duration,
        summary: this.formatTestSuiteSummary(results, errors, success, includeE2E),
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: { general: error instanceof Error ? error.message : 'Unknown error' },
        duration: Date.now() - startTime,
        summary: '❌ Test suite execution failed',
      };
    }
  }

  /**
   * Execute pre-commit validation workflow
   */
  async executePreCommit(): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};

    try {
      // Phase 1: Stop watching (if running)
      try {
        results.stopWatching = await this.stopWatching();
      } catch (error) {
        // Non-critical if already stopped
        results.stopWatching = { message: 'Already stopped or not running' };
      }

      // Phase 2: Parallel validation checks
      const validationChecks = await Promise.allSettled([
        this.checkGitStatus(),
        this.checkJira(),
        this.checkEnvironments(),
        this.checkGitHubPR(),
      ]);

      // Process validation results
      results.gitStatus =
        validationChecks[0].status === 'fulfilled' ? validationChecks[0].value : null;
      results.jiraStatus =
        validationChecks[1].status === 'fulfilled' ? validationChecks[1].value : null;
      results.environments =
        validationChecks[2].status === 'fulfilled' ? validationChecks[2].value : null;
      results.githubPR =
        validationChecks[3].status === 'fulfilled' ? validationChecks[3].value : null;

      validationChecks.forEach((result, index) => {
        if (result.status === 'rejected') {
          const tools = ['gitStatus', 'jiraStatus', 'environments', 'githubPR'];
          errors[tools[index]] = result.reason.message;
        }
      });

      // Phase 3: Generate commit message (depends on JIRA and git status)
      if (results.jiraStatus && results.gitStatus) {
        try {
          results.commitMessage = await this.generateCommitMessage();
        } catch (error) {
          errors.commitMessage =
            error instanceof Error ? error.message : 'Failed to generate commit message';
        }
      }

      const duration = Date.now() - startTime;
      const success = Object.keys(errors).length === 0;

      return {
        success,
        results,
        errors,
        duration,
        summary: this.formatPreCommitSummary(results, errors, success),
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: { general: error instanceof Error ? error.message : 'Unknown error' },
        duration: Date.now() - startTime,
        summary: '❌ Pre-commit validation failed',
      };
    }
  }

  /**
   * Execute project health check workflow
   */
  async executeHealthCheck(): Promise<WorkflowResult> {
    const startTime = Date.now();
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};

    try {
      // All health checks can run in parallel as they're independent
      const healthChecks = await Promise.allSettled([
        this.getStatus(),
        this.checkGitStatus(),
        this.checkEnvironments(),
        this.checkJira(),
        this.checkGitHubPR(),
        this.analyzeCoverage(),
      ]);

      const healthKeys = ['agentStatus', 'gitStatus', 'environments', 'jiraStatus', 'githubPR', 'coverage'];

      healthChecks.forEach((result, index) => {
        const key = healthKeys[index];
        if (result.status === 'fulfilled') {
          results[key] = result.value;
        } else {
          errors[key] = result.reason.message;
        }
      });

      const duration = Date.now() - startTime;
      const success = Object.keys(errors).length < healthChecks.length / 2; // Allow some failures

      return {
        success,
        results,
        errors,
        duration,
        summary: this.formatHealthCheckSummary(results, errors, success),
      };
    } catch (error) {
      return {
        success: false,
        results,
        errors: { general: error instanceof Error ? error.message : 'Unknown error' },
        duration: Date.now() - startTime,
        summary: '❌ Health check failed',
      };
    }
  }

  // Caching wrapper for expensive operations
  private async getCached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 30000,
  ): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    return data;
  }

  // Individual tool methods with caching
  private async checkGitStatus() {
    return this.getCached(
      'gitStatus',
      async () => {
        const gitIntegration = this.agent['gitIntegration'];
        const status = await gitIntegration.checkBranchUpToDate();
        const mergeStatus = await gitIntegration.checkMergeStatus();
        return {
          upToDate: status.isUpToDate,
          message: status.message,
          needsPull: mergeStatus.needsPull,
          needsMerge: mergeStatus.needsMerge,
          hasConflicts: mergeStatus.conflicts,
          details: mergeStatus.messages,
        };
      },
      30000,
    );
  }

  private async checkEnvironments() {
    return this.getCached(
      'environments',
      async () => {
        const envChecker = this.agent['environmentChecker'];
        if (!envChecker) {
          throw new Error('Environment checking not enabled');
        }
        const environments = await envChecker.checkEnvironments();
        const nonMaster = await envChecker.getnonMasterEnvironments();
        return {
          allEnvironments: environments,
          nonMasterEnvironments: nonMaster,
          warnings:
            nonMaster.length > 0
              ? `${nonMaster.length} non-master branches are deployed`
              : 'All environments are on master/main',
        };
      },
      300000,
    ); // Cache for 5 minutes
  }

  private async checkJira() {
    return this.getCached(
      'jira',
      async () => {
        const jiraIntegration = this.agent['jiraIntegration'];
        if (!jiraIntegration) {
          throw new Error('JIRA integration not enabled');
        }
        return await jiraIntegration.analyzeTicketCompleteness();
      },
      60000,
    ); // Cache for 1 minute
  }

  private async checkGitHubPR() {
    return this.getCached(
      'githubPR',
      async () => {
        const gitHubIntegration = this.agent['gitHubIntegration'];
        if (!gitHubIntegration) {
          throw new Error('GitHub integration not enabled');
        }
        
        const analysis = await gitHubIntegration.analyzePullRequest();
        const resolutionAnalysis = await gitHubIntegration.analyzeCommentResolution();
        
        return {
          pullRequest: analysis?.pullRequest || null,
          actionItems: analysis?.actionItems?.length || 0,
          requestedChanges: analysis?.requestedChanges?.length || 0,
          concerns: analysis?.concerns?.length || 0,
          suggestions: analysis?.suggestions?.length || 0,
          hasUnresolvedItems: resolutionAnalysis?.unresolvedCount > 0,
          resolutionConfidence: resolutionAnalysis?.overallConfidence || 0,
          resolvedCount: resolutionAnalysis?.resolvedCount || 0,
          partiallyResolvedCount: resolutionAnalysis?.partiallyResolvedCount || 0,
          unresolvedCount: resolutionAnalysis?.unresolvedCount || 0,
          resolutions: resolutionAnalysis?.resolutions || [],
        };
      },
      60000,
    ); // Cache for 1 minute
  }

  private async runTests(files: string[]) {
    const changes: FileChange[] = files.map((file: string) => ({
      path: file,
      type: 'change' as const,
      timestamp: new Date(),
    }));

    const testDecision = await this.agent['smartSelector'].selectTestSuites(changes);
    const results = await this.agent['testRunner'].runTestSuites(
      testDecision.suites,
      changes,
      this.agent['config'].projectRoot,
      true,
    );

    return {
      decision: testDecision,
      results: results,
    };
  }

  private async analyzeCoverage() {
    const coverageAnalyzer = this.agent['coverageAnalyzer'];
    const coverage = await coverageAnalyzer.loadCoverageFromFile(
      this.agent['config'].coverage?.persistPath || 'coverage',
    );

    if (!coverage) {
      throw new Error('No coverage data available');
    }

    const recommendations = this.agent['smartSelector'].getTestRecommendations(coverage);
    return {
      coverage: {
        lines: coverage.lines.percentage,
        statements: coverage.statements.percentage,
        functions: coverage.functions.percentage,
        branches: coverage.branches.percentage,
      },
      recommendations,
    };
  }

  private async analyzeComplexity(files?: string[]) {
    return await this.agent.getComplexityReport(files);
  }

  private async runE2E(scenario?: string) {
    const stagehandRunner = this.agent['stagehandRunner'];
    if (!stagehandRunner) {
      throw new Error('Stagehand integration not enabled');
    }

    if (scenario) {
      const scenarioObj = {
        name: scenario,
        description: 'Workflow-triggered scenario',
        steps: [],
      };
      const result = await stagehandRunner.runScenario(scenarioObj);
      return [{ scenario, ...result }];
    } else {
      return await stagehandRunner.runAllScenarios();
    }
  }

  private async startWatching(projectPath?: string) {
    if (projectPath) {
      this.agent['config'].projectRoot = projectPath;
    }

    const currentStatus = this.agent.getStatus();
    if (currentStatus.running) {
      return { message: 'Already watching files', alreadyRunning: true };
    }

    await this.agent.start();
    return { message: 'Started watching files', projectRoot: this.agent['config'].projectRoot };
  }

  private async stopWatching() {
    const currentStatus = this.agent.getStatus();
    if (!currentStatus.running) {
      return { message: 'Not currently running', alreadyStopped: true };
    }

    this.agent.stop();
    return { message: 'Stopped watching files' };
  }

  private async getStatus() {
    const status = this.agent.getStatus();
    const gitIntegration = this.agent['gitIntegration'];
    const currentBranch = await gitIntegration.getCurrentBranch();

    const enabledFeatures = [];
    if (this.agent['config'].postman?.enabled) enabledFeatures.push('Postman');
    if (this.agent['config'].stagehand?.enabled) enabledFeatures.push('Stagehand');
    if (this.agent['config'].jira?.enabled) enabledFeatures.push('JIRA');
    if (this.agent['config'].environments?.enabled) enabledFeatures.push('Environment Monitoring');
    if (this.agent['config'].mcp?.enabled) enabledFeatures.push('MCP');
    if (this.agent['config'].coverage?.enabled) enabledFeatures.push('Coverage Analysis');

    return {
      running: status.running,
      cursorConnected: status.cursorConnected,
      projectRoot: this.agent['config'].projectRoot,
      currentBranch,
      enabledFeatures,
      testSuites: this.agent['config'].testSuites
        .filter((suite) => suite.enabled !== false)
        .map((suite) => suite.type),
    };
  }

  private async generateCommitMessage() {
    return await this.agent.generateCommitMessage();
  }

  // Summary formatting methods
  private formatDevSetupSummary(results: any, errors: any, success: boolean): string {
    if (!success) {
      const errorCount = Object.keys(errors).length;
      return `❌ Development setup failed (${errorCount} errors)`;
    }

    const parts = ['🚀 Development setup complete'];

    if (results.gitStatus?.upToDate) parts.push('✅ Git up to date');
    else if (results.gitStatus) parts.push('⚠️ Git needs attention');

    if (results.environments && !results.environments.nonMasterEnvironments?.length) {
      parts.push('✅ Environments clean');
    } else if (results.environments) {
      parts.push('⚠️ Environment issues detected');
    }

    if (results.jiraStatus) parts.push('✅ JIRA checked');
    
    if (results.githubPR?.hasUnresolvedItems) {
      const confidence = Math.round(results.githubPR.resolutionConfidence * 100);
      parts.push(`⚠️ ${results.githubPR.unresolvedCount} PR items unresolved (${confidence}% confidence)`);
    } else if (results.githubPR && results.githubPR.resolutionConfidence >= 0.8) {
      parts.push(`✅ PR comments addressed (${Math.round(results.githubPR.resolutionConfidence * 100)}% confidence)`);
    } else if (results.githubPR) {
      parts.push(`🟡 PR partially addressed (${Math.round(results.githubPR.resolutionConfidence * 100)}% confidence)`);
    }
    
    if (results.watching) parts.push('🔍 File watching active');

    return parts.join(' | ');
  }

  private formatTestSuiteSummary(
    results: any,
    errors: any,
    success: boolean,
    includeE2E: boolean,
  ): string {
    if (!success) {
      const errorCount = Object.keys(errors).length;
      return `❌ Test suite failed (${errorCount} errors)`;
    }

    const parts = ['🧪 Test suite complete'];

    if (results.testResults) {
      const testCount = results.testResults.results?.length || 0;
      parts.push(`${testCount} suites run`);
    }

    if (results.coverage) {
      const coverage = results.coverage.coverage?.lines || 0;
      parts.push(`${coverage.toFixed(1)}% coverage`);
    }

    if (results.complexity) parts.push('📊 Complexity analyzed');
    if (includeE2E && results.e2e) parts.push('🎭 E2E tests complete');

    return parts.join(' | ');
  }

  private formatPreCommitSummary(results: any, errors: any, success: boolean): string {
    if (!success) {
      const errorCount = Object.keys(errors).length;
      return `❌ Pre-commit validation failed (${errorCount} errors)`;
    }

    const parts = ['✅ Pre-commit validation passed'];

    if (results.gitStatus?.upToDate) parts.push('Git ready');
    if (results.jiraStatus) parts.push('JIRA validated');
    if (results.environments) parts.push('Environments checked');
    
    if (results.githubPR?.hasUnresolvedItems) {
      parts.push(`⚠️ ${results.githubPR.unresolvedCount} unresolved, ${results.githubPR.partiallyResolvedCount} partial (${Math.round(results.githubPR.resolutionConfidence * 100)}% confidence)`);
    } else if (results.githubPR && results.githubPR.resolutionConfidence >= 0.8) {
      parts.push(`PR ready (${Math.round(results.githubPR.resolutionConfidence * 100)}% confidence)`);
    } else if (results.githubPR) {
      parts.push(`PR partially ready (${Math.round(results.githubPR.resolutionConfidence * 100)}% confidence)`);
    }
    
    if (results.commitMessage) parts.push('Commit message ready');

    return parts.join(' | ');
  }

  private formatHealthCheckSummary(results: any, errors: any, success: boolean): string {
    const totalChecks = Object.keys(results).length + Object.keys(errors).length;
    const successfulChecks = Object.keys(results).length;

    if (success) {
      return `💚 Health check passed (${successfulChecks}/${totalChecks} checks successful)`;
    } else {
      return `⚠️ Health check completed with issues (${successfulChecks}/${totalChecks} checks successful)`;
    }
  }
}
