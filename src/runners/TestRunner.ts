import { execa } from 'execa';
import chalk from 'chalk';
import { EventEmitter } from 'events';
import { TestSuite, TestResult, FileChange, CoverageData } from '../types/index.js';
import { CoverageAnalyzer } from '../utils/CoverageAnalyzer.js';

export class TestRunner extends EventEmitter {
  private runningTests: Map<string, AbortController> = new Map();
  private coverageAnalyzer: CoverageAnalyzer;

  constructor(coverageAnalyzer: CoverageAnalyzer) {
    super();
    this.coverageAnalyzer = coverageAnalyzer;
  }

  /**
   * Run a specific test suite
   */
  async runTestSuite(
    suite: TestSuite,
    triggeredFiles: string[],
    projectRoot: string,
    collectCoverage: boolean = false,
  ): Promise<TestResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    const suiteKey = `${suite.type}-${Date.now()}`;

    this.runningTests.set(suiteKey, abortController);

    console.log(chalk.blue(`\n🧪 Running ${suite.type} tests...`));
    console.log(chalk.gray(`Triggered by: ${triggeredFiles.join(', ')}`));

    try {
      // Use coverage command if available and coverage is enabled
      const command =
        collectCoverage && suite.coverageCommand ? suite.coverageCommand : suite.command;

      const { stdout, stderr } = await execa(command, {
        cwd: projectRoot,
        shell: true,
        signal: abortController.signal,
      });

      const output = stdout + stderr;
      const duration = Date.now() - startTime;
      const success = true;

      // Parse coverage data if available
      let coverage: CoverageData | undefined;
      if (collectCoverage && ['jest', 'cypress', 'storybook'].includes(suite.type)) {
        coverage =
          this.coverageAnalyzer.parseCoverageOutput(
            output,
            suite.type as 'jest' | 'cypress' | 'storybook',
          ) || undefined;
        if (coverage) {
          console.log(
            chalk.cyan(
              `📊 Coverage: ${coverage.lines.percentage.toFixed(1)}% lines, ${coverage.branches.percentage.toFixed(1)}% branches`,
            ),
          );
        }
      }

      console.log(chalk.green(`✅ ${suite.type} tests passed (${duration}ms)`));

      return {
        suite: suite.type,
        success,
        duration,
        output,
        filesTriggered: triggeredFiles,
        coverage,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const output = error.stdout + error.stderr;

      if (error.name === 'AbortError') {
        console.log(chalk.yellow(`⚠️  ${suite.type} tests cancelled`));
      } else {
        console.log(chalk.red(`❌ ${suite.type} tests failed (${duration}ms)`));
      }

      return {
        suite: suite.type,
        success: false,
        duration,
        output,
        filesTriggered: triggeredFiles,
      };
    } finally {
      this.runningTests.delete(suiteKey);
    }
  }

  /**
   * Run multiple test suites in parallel
   */
  async runTestSuites(
    suites: TestSuite[],
    changes: FileChange[],
    projectRoot: string,
    collectCoverage: boolean = false,
  ): Promise<TestResult[]> {
    const triggeredFiles = changes.map((change) => change.path);

    const promises = suites.map((suite) =>
      this.runTestSuite(suite, triggeredFiles, projectRoot, collectCoverage),
    );

    return Promise.all(promises);
  }

  /**
   * Cancel all running tests
   */
  cancelAll(): void {
    for (const [key, controller] of this.runningTests) {
      controller.abort();
      this.runningTests.delete(key);
    }
  }

  /**
   * Format test command with specific files if supported
   */
  formatCommand(suite: TestSuite, files: string[]): string {
    let command = suite.command;

    // Add file-specific patterns for different test runners
    if (suite.type === 'jest' && files.length > 0) {
      const testFiles = files.filter((f) => f.match(/\.(test|spec)\.(ts|tsx|js|jsx)$/));
      if (testFiles.length > 0) {
        command = `${command} ${testFiles.join(' ')}`;
      }
    } else if (suite.type === 'cypress' && files.length > 0) {
      const specFiles = files.filter((f) => f.match(/\.cy\.(ts|tsx|js|jsx)$/));
      if (specFiles.length > 0) {
        command = `${command} --spec ${specFiles.join(',')}`;
      }
    }

    return command;
  }
}
