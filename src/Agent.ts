import chalk from 'chalk';
import { EventEmitter } from 'events';
import * as path from 'path';
import { FileWatcher } from './watchers/FileWatcher.js';
import { TestDetector } from './utils/TestDetector.js';
import { TestRunner } from './runners/TestRunner.js';
import { CursorIntegration } from './utils/CursorIntegration.js';
import { SmartTestSelector } from './utils/SmartTestSelector.js';
import { CoverageAnalyzer } from './utils/CoverageAnalyzer.js';
import { PostmanRunner } from './runners/PostmanRunner.js';
import { StagehandRunner } from './runners/StagehandRunner.js';
import { JiraIntegration } from './integrations/JiraIntegration.js';
import { GitIntegration } from './integrations/GitIntegration.js';
import { EnvironmentChecker } from './integrations/EnvironmentChecker.js';
import { MCPIntegration } from './integrations/MCPIntegration.js';
import { NotificationManager } from './utils/NotificationManager.js';
import { ComplexityAnalyzer } from './utils/ComplexityAnalyzer.js';
import { Config, FileChange } from './types/index.js';

export class TestRunningAgent extends EventEmitter {
  private config: Config;
  private fileWatcher: FileWatcher;
  private testDetector: TestDetector;
  private testRunner: TestRunner;
  private smartSelector: SmartTestSelector;
  private coverageAnalyzer: CoverageAnalyzer;
  private cursorIntegration: CursorIntegration | null = null;
  private postmanRunner: PostmanRunner | null = null;
  private stagehandRunner: StagehandRunner | null = null;
  private jiraIntegration: JiraIntegration | null = null;
  private gitIntegration: GitIntegration;
  private environmentChecker: EnvironmentChecker | null = null;
  private mcpIntegration: MCPIntegration | null = null;
  private notificationManager: NotificationManager;
  private complexityAnalyzer: ComplexityAnalyzer;
  private isRunning: boolean = false;

  constructor(config: Config) {
    super();
    this.config = config;
    this.fileWatcher = new FileWatcher(config);
    this.testDetector = new TestDetector(config);
    this.coverageAnalyzer = new CoverageAnalyzer(config);
    this.testRunner = new TestRunner(this.coverageAnalyzer);
    this.smartSelector = new SmartTestSelector(config);
    this.gitIntegration = new GitIntegration();
    this.notificationManager = new NotificationManager(config.notifications);
    this.complexityAnalyzer = new ComplexityAnalyzer(config.complexity);

    // Initialize optional integrations
    if (config.cursorPort) {
      this.cursorIntegration = new CursorIntegration(config.cursorPort);
    }

    if (config.postman?.enabled) {
      this.postmanRunner = new PostmanRunner(config.postman);
    }

    if (config.mcp?.enabled) {
      this.mcpIntegration = new MCPIntegration(config.mcp);
    }

    if (config.stagehand?.enabled) {
      this.stagehandRunner = new StagehandRunner(config.stagehand, this.mcpIntegration || undefined);
    }

    if (config.jira?.enabled) {
      this.jiraIntegration = new JiraIntegration(config.jira);
    }

    if (config.environments?.enabled) {
      this.environmentChecker = new EnvironmentChecker(config.environments);
    }

    this.setupEventHandlers();
    this.setupNotificationHandlers();
  }

  /**
   * Setup notification handlers for WebSocket and custom channels
   */
  private setupNotificationHandlers(): void {
    // Forward notifications to Cursor WebSocket
    this.notificationManager.on('notification', (notification) => {
      if (this.cursorIntegration) {
        this.cursorIntegration.broadcastNotification(notification);
      }
    });
  }

  /**
   * Start the test running agent
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(chalk.yellow('Agent is already running'));
      return;
    }

    await this.notificationManager.info('Starting Test Running Agent', `Project root: ${this.config.projectRoot}`);

    // Check git status
    const gitStatus = await this.gitIntegration.checkBranchUpToDate();
    if (!gitStatus.isUpToDate) {
      await this.notificationManager.warning('Git Status', gitStatus.message);
    }

    // Check environments if enabled
    if (this.environmentChecker) {
      const currentBranch = await this.gitIntegration.getCurrentBranch();
      const envMessages = await this.environmentChecker.notifyIfNeeded(currentBranch);
      if (envMessages.length > 0) {
        await this.notificationManager.warning('Environment Status', envMessages.join('\n'));
      }
    }

    // Check JIRA ticket if enabled
    if (this.jiraIntegration) {
      const analysis = await this.jiraIntegration.analyzeTicketCompleteness();
      if (analysis.ticketKey) {
        if (analysis.issues.length > 0) {
          await this.notificationManager.warning(
            `JIRA Ticket: ${analysis.ticketKey}`,
            `Issues found:\n${analysis.issues.map(issue => `• ${issue}`).join('\n')}`
          );
        } else {
          await this.notificationManager.info(`Working on JIRA ticket: ${analysis.ticketKey}`);
        }
      }
    }

    // Connect MCP if enabled
    if (this.mcpIntegration) {
      await this.mcpIntegration.connect();
      await this.mcpIntegration.registerWithCursor();
    }

    this.fileWatcher.start();
    
    if (this.cursorIntegration) {
      this.cursorIntegration.start();
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Stop the test running agent
   */
  stop(): void {
    if (!this.isRunning) {
      console.log(chalk.yellow('Agent is not running'));
      return;
    }

    console.log(chalk.bold.red('\n🛑 Stopping Test Running Agent\n'));

    this.fileWatcher.stop();
    this.testRunner.cancelAll();
    
    if (this.cursorIntegration) {
      this.cursorIntegration.stop();
    }

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Setup event handlers for file changes and test execution
   */
  private setupEventHandlers(): void {
    // Handle file changes
    this.fileWatcher.on('changes', async (changes: FileChange[]) => {
      await this.notificationManager.info(
        `Detected ${changes.length} file change(s)`,
        `Files: ${changes.slice(0, 3).map(c => c.path).join(', ')}${changes.length > 3 ? '...' : ''}`
      );
      
      // Use smart test selector if coverage is enabled
      const testDecision = await this.smartSelector.selectTestSuites(changes);
      
      if (testDecision.suites.length === 0) {
        await this.notificationManager.info('No test suites selected');
        return;
      }

      await this.notificationManager.info('Test Strategy', testDecision.reason);
      
      if (testDecision.coverageGaps && testDecision.coverageGaps.length > 0) {
        await this.notificationManager.warning(
          'Low coverage files',
          testDecision.coverageGaps.join(', ')
        );
      }

      // Notify Cursor about file changes
      if (this.cursorIntegration) {
        this.cursorIntegration.broadcastFileChange(changes.map((c) => c.path));
      }

      // Run the selected test suites with coverage collection
      const results = await this.testRunner.runTestSuites(
        testDecision.suites,
        changes,
        this.config.projectRoot,
        this.config.coverage?.enabled || false,
      );

      // Run additional test suites if enabled
      await this.runAdditionalTestSuites(changes);

      // Analyze complexity if enabled
      if (this.config.complexity?.enabled) {
        await this.analyzeComplexity(changes);
      }

      // Process test results
      await this.processTestResults(results);

      // Broadcast results to Cursor
      if (this.cursorIntegration) {
        this.cursorIntegration.broadcastTestResults(results);
      }

      this.emit('test-results', results);
    });

    // Handle errors
    this.fileWatcher.on('error', (error) => {
      console.error(chalk.red('File watcher error:'), error);
      this.emit('error', error);
    });

    // Handle Cursor integration events
    if (this.cursorIntegration) {
      this.cursorIntegration.on('run-tests', async (data) => {
        console.log(chalk.blue('Running tests requested from Cursor IDE'));
        
        const allSuites = this.config.testSuites;
        const results = await this.testRunner.runTestSuites(
          allSuites,
          [],
          this.config.projectRoot,
        );

        this.cursorIntegration!.broadcastTestResults(results);
      });

      this.cursorIntegration.on('stop-tests', () => {
        console.log(chalk.yellow('Stopping tests requested from Cursor IDE'));
        this.testRunner.cancelAll();
      });
    }
  }

  /**
   * Run additional test suites (Postman, Stagehand, etc.)
   */
  private async runAdditionalTestSuites(changes: FileChange[]): Promise<void> {
    // Check if we should run Postman tests
    if (this.postmanRunner && this.shouldRunPostmanTests(changes)) {
      console.log(chalk.blue('\n📮 Running Postman collections...'));
      const postmanResults = await this.postmanRunner.runAllCollections();
      
      for (const result of postmanResults) {
        if (result.success) {
          console.log(chalk.green(`✅ ${result.collection} passed`));
        } else {
          console.log(chalk.red(`❌ ${result.collection} failed`));
          console.log(chalk.gray(result.output.substring(0, 200) + '...'));
        }
      }
    }

    // Check if we should run Stagehand UI tests
    if (this.stagehandRunner && this.shouldRunUITests(changes)) {
      console.log(chalk.blue('\n🎭 Running Stagehand UI tests...'));
      const scenarios = await this.stagehandRunner.runAllScenarios();
      
      for (const result of scenarios) {
        if (result.success) {
          console.log(chalk.green(`✅ ${result.scenario} passed`));
          if (result.screenshots && result.screenshots.length > 0) {
            console.log(chalk.gray(`   Screenshots: ${result.screenshots.length} captured`));
          }
        } else {
          console.log(chalk.red(`❌ ${result.scenario} failed: ${result.output}`));
        }
      }
    }
  }

  /**
   * Determine if Postman tests should run based on file changes
   */
  private shouldRunPostmanTests(changes: FileChange[]): boolean {
    // Run if API files changed
    return changes.some(change => 
      change.path.includes('/api/') ||
      change.path.includes('/routes/') ||
      change.path.includes('/controllers/') ||
      change.path.includes('.controller.') ||
      change.path.includes('.route.')
    );
  }

  /**
   * Determine if UI tests should run based on file changes
   */
  private shouldRunUITests(changes: FileChange[]): boolean {
    // Run if frontend files changed
    return changes.some(change => 
      change.path.includes('/components/') ||
      change.path.includes('/pages/') ||
      change.path.includes('/views/') ||
      change.path.includes('.tsx') ||
      change.path.includes('.jsx') ||
      change.path.includes('.vue')
    );
  }

  /**
   * Get the current status of the agent
   */
  getStatus(): { running: boolean; cursorConnected: boolean } {
    return {
      running: this.isRunning,
      cursorConnected: this.cursorIntegration ? true : false,
    };
  }

  /**
   * Process test results and send notifications
   */
  private async processTestResults(results: any[]): Promise<void> {
    let totalPassed = 0;
    let totalFailed = 0;
    const failedSuites: string[] = [];

    for (const result of results) {
      if (result.success) {
        totalPassed++;
      } else {
        totalFailed++;
        failedSuites.push(result.suite);
      }

      // Update coverage data
      if (result.coverage) {
        await this.smartSelector.updateCoverage(result.coverage);
        
        // Get recommendations
        const recommendations = this.smartSelector.getTestRecommendations(result.coverage);
        if (recommendations.length > 0) {
          await this.notificationManager.info(
            'Test Recommendations',
            recommendations.join('\n• ')
          );
        }

        // Check coverage thresholds
        const thresholds = this.config.coverage?.thresholds;
        if (thresholds && result.coverage.lines.percentage < thresholds.unit) {
          await this.notificationManager.warning(
            'Low Coverage',
            `Line coverage is ${result.coverage.lines.percentage.toFixed(1)}% (threshold: ${thresholds.unit}%)`
          );
        }
      }
    }

    // Send summary notification
    if (totalFailed === 0 && totalPassed > 0) {
      await this.notificationManager.success(
        'All Tests Passed',
        `${totalPassed} test suite(s) completed successfully`
      );
    } else if (totalFailed > 0) {
      await this.notificationManager.error(
        'Tests Failed',
        `${totalFailed} suite(s) failed: ${failedSuites.join(', ')}`
      );
    }
  }

  /**
   * Analyze complexity of changed files
   */
  private async analyzeComplexity(changes: FileChange[]): Promise<void> {
    const reports = [];
    const comparisons = [];

    for (const change of changes) {
      // Resolve file path relative to project root
      const filePath = path.isAbsolute(change.path) 
        ? change.path 
        : path.join(this.config.projectRoot, change.path);
      
      if (!this.complexityAnalyzer.shouldAnalyzeFile(filePath)) {
        continue;
      }

      // Analyze current complexity
      const report = await this.complexityAnalyzer.analyzeFile(filePath);
      reports.push(report);

      // Compare with previous version if file was changed (not added)
      if (change.type === 'change') {
        const comparison = await this.complexityAnalyzer.compareComplexity(filePath);
        if (comparison) {
          comparisons.push(comparison);
        }
      }
    }

    if (reports.length === 0) return;

    // Generate and show summary
    const summary = this.complexityAnalyzer.generateSummary(reports);
    await this.notificationManager.info('Complexity Analysis', summary);

    // Show comparisons if any
    if (comparisons.length > 0) {
      const significantChanges = comparisons.filter(c => 
        Math.abs(c.change) >= 3 || Math.abs(c.percentageChange) >= 20
      );

      if (significantChanges.length > 0) {
        const messages = significantChanges.map(c => {
          const icon = c.increased ? '📈' : '📉';
          const changeStr = c.increased ? `+${c.change}` : c.change.toString();
          return `${icon} ${path.basename(c.filePath)}: ${c.previous} → ${c.current} (${changeStr}, ${c.percentageChange.toFixed(1)}%)`;
        });

        await this.notificationManager.warning(
          'Significant Complexity Changes',
          messages.join('\n')
        );
      }
    }

    // Check for high complexity warnings
    const highComplexityCount = reports.reduce((sum, r) => sum + r.highComplexityNodes.length, 0);
    if (highComplexityCount > 0) {
      await this.notificationManager.warning(
        'High Complexity Warning',
        `Found ${highComplexityCount} function(s) with high complexity. Consider refactoring.`
      );
    }
  }

  /**
   * Get complexity report for specific files
   */
  async getComplexityReport(filePaths?: string[]): Promise<any> {
    const files = filePaths || await this.gitIntegration.getChangedFiles();
    const reports = [];
    const errors: string[] = [];

    for (const filePath of files) {
      // Ensure we have an absolute path
      const absolutePath = path.isAbsolute(filePath) 
        ? filePath 
        : path.join(this.config.projectRoot, filePath);
      
      if (this.complexityAnalyzer.shouldAnalyzeFile(absolutePath)) {
        const report = await this.complexityAnalyzer.analyzeFile(absolutePath);
        // Only include reports with actual complexity data
        if (report.totalComplexity > 0 || report.nodes.length > 0) {
          reports.push(report);
        }
      }
    }

    return {
      files: reports.length,
      reports,
      summary: this.complexityAnalyzer.generateSummary(reports),
    };
  }

  /**
   * Generate a commit message based on current changes
   */
  async generateCommitMessage(): Promise<string> {
    const changedFiles = await this.gitIntegration.getChangedFiles();
    
    if (changedFiles.length === 0) {
      return '';
    }

    // Use JIRA integration if available
    if (this.jiraIntegration) {
      const ticketKey = await this.jiraIntegration.findTicketInBranch();
      if (ticketKey) {
        return await this.jiraIntegration.createCommitMessage(ticketKey, changedFiles);
      }
    }

    // Use MCP integration if available
    if (this.mcpIntegration) {
      return await this.mcpIntegration.generateCommitMessage({
        files: changedFiles,
      });
    }

    // Default commit message
    return `Update ${changedFiles.length} files`;
  }
}