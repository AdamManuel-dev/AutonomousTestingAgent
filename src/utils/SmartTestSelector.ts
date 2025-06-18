import { minimatch } from 'minimatch';
import { TestSuite, FileChange, CoverageData, TestDecision, Config } from '../types/index.js';
import { CoverageAnalyzer } from './CoverageAnalyzer.js';
import { TestDetector } from './TestDetector.js';

export class SmartTestSelector {
  private config: Config;
  private coverageAnalyzer: CoverageAnalyzer;
  private testDetector: TestDetector;
  private lastCoverage: CoverageData | null = null;

  constructor(config: Config) {
    this.config = config;
    this.coverageAnalyzer = new CoverageAnalyzer(config);
    this.testDetector = new TestDetector(config);
  }

  /**
   * Intelligently select which test suites to run based on changes and coverage
   */
  async selectTestSuites(changes: FileChange[]): Promise<TestDecision> {
    // Check if any critical paths are affected
    const criticalPathsAffected = this.checkCriticalPaths(changes);

    // For source file changes, we need to check watch patterns, not test patterns
    const matchedSuites = this.detectSuitesForSourceFiles(changes);

    if (criticalPathsAffected) {
      // Run all test suites for critical path changes
      const allSuites = this.config.testSuites.filter((suite) => suite.enabled !== false);
      return {
        suites: allSuites,
        reason: 'Critical path changes detected - running all test suites',
      };
    }

    if (!this.config.coverage?.enabled) {
      // If coverage is disabled, return matched suites
      return {
        suites: matchedSuites,
        reason: 'Coverage analysis disabled - running matched test suites',
      };
    }

    // Load latest coverage data
    const coveragePath = this.config.coverage.persistPath || 'coverage';
    const coverage =
      (await this.coverageAnalyzer.loadCoverageFromFile(coveragePath)) || this.lastCoverage;

    if (!coverage) {
      // No coverage data available, run all matched tests
      return {
        suites: matchedSuites,
        reason: 'No coverage data available - running all matched test suites',
      };
    }

    // Analyze coverage for changed files
    const lowCoverageFiles = this.coverageAnalyzer.analyzeFileCoverage(changes, coverage);
    const needsE2E = this.coverageAnalyzer.needsE2ETesting(changes, coverage);
    const coverageTrend = await this.coverageAnalyzer.getCoverageTrend(coverage);

    // Build test decision
    const decision = this.makeTestDecision(
      matchedSuites,
      lowCoverageFiles,
      needsE2E,
      coverageTrend,
      coverage,
    );

    return decision;
  }

  /**
   * Update coverage data after test run
   */
  async updateCoverage(coverage: CoverageData): Promise<void> {
    this.lastCoverage = coverage;
    await this.coverageAnalyzer.saveCoverage(coverage);
  }

  /**
   * Make intelligent decision about which tests to run
   */
  private makeTestDecision(
    matchedSuites: TestSuite[],
    lowCoverageFiles: string[],
    needsE2E: boolean,
    coverageTrend: { trend: string; delta: number },
    coverage: CoverageData,
  ): TestDecision {
    const suitesToRun: TestSuite[] = [];
    const reasons: string[] = [];

    // Categorize test suites
    const unitSuites = matchedSuites.filter((s) => s.type === 'jest');
    const e2eSuites = matchedSuites.filter((s) => s.type === 'cypress');
    const storybookSuites = matchedSuites.filter((s) => s.type === 'storybook');

    // Always run unit tests if files have low coverage
    if (lowCoverageFiles.length > 0) {
      suitesToRun.push(...unitSuites);
      reasons.push(
        `${lowCoverageFiles.length} files have low coverage (<${this.config.coverage?.thresholds.unit || 80}%)`,
      );
    }

    // Run E2E tests for critical changes or declining coverage
    if (needsE2E || coverageTrend.trend === 'declining') {
      suitesToRun.push(...e2eSuites);
      reasons.push(
        needsE2E
          ? 'Critical paths affected'
          : `Coverage declining by ${Math.abs(coverageTrend.delta).toFixed(1)}%`,
      );
    }

    // Run Storybook tests for UI component changes
    const uiChanges = matchedSuites.some((s) => s.type === 'storybook');
    if (uiChanges) {
      suitesToRun.push(...storybookSuites);
      reasons.push('UI components changed');
    }

    // If coverage is very low, run all tests
    if (coverage.lines.percentage < (this.config.coverage?.thresholds.e2e || 70)) {
      const allSuites = [...unitSuites, ...e2eSuites, ...storybookSuites];
      const additionalSuites = allSuites.filter((s) => !suitesToRun.includes(s));
      suitesToRun.push(...additionalSuites);
      reasons.push(
        `Overall coverage low (${coverage.lines.percentage.toFixed(1)}%) - running comprehensive tests`,
      );
    }

    // If no specific reason to run tests, run unit tests as default
    if (suitesToRun.length === 0 && matchedSuites.length > 0) {
      suitesToRun.push(...unitSuites.slice(0, 1)); // Run at least one unit test suite
      reasons.push('Running unit tests for changed files');
    }

    // Sort by priority if defined
    suitesToRun.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    return {
      suites: [...new Set(suitesToRun)], // Remove duplicates
      reason: reasons.join('; '),
      coverageGaps: lowCoverageFiles,
    };
  }

  /**
   * Check if any critical paths are affected by the changes
   */
  private checkCriticalPaths(changes: FileChange[]): boolean {
    if (!this.config.criticalPaths?.enabled) {
      return false;
    }

    const { paths = [], patterns = [] } = this.config.criticalPaths;

    for (const change of changes) {
      // Check exact paths
      if (paths.some((path) => change.path.includes(path))) {
        return true;
      }

      // Check patterns
      if (patterns.some((pattern) => minimatch(change.path, pattern))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get test recommendations based on coverage analysis
   */
  getTestRecommendations(coverage: CoverageData): string[] {
    const recommendations: string[] = [];
    const thresholds = this.config.coverage?.thresholds || { unit: 80, integration: 70, e2e: 60 };

    if (coverage.lines.percentage < thresholds.unit) {
      recommendations.push(
        `Increase unit test coverage to ${thresholds.unit}% (current: ${coverage.lines.percentage.toFixed(1)}%)`,
      );
    }

    if (coverage.branches.percentage < thresholds.integration) {
      recommendations.push(
        `Add integration tests for untested branches (${coverage.branches.percentage.toFixed(1)}% covered)`,
      );
    }

    // Find files with very low coverage
    const criticalFiles = Object.entries(coverage.files)
      .filter(([, file]) => file.coverage < 50)
      .map(([path]) => path);

    if (criticalFiles.length > 0) {
      recommendations.push(
        `Critical files need tests: ${criticalFiles.slice(0, 3).join(', ')}${criticalFiles.length > 3 ? ` and ${criticalFiles.length - 3} more` : ''}`,
      );
    }

    return recommendations;
  }

  /**
   * Detect which test suites should run for source file changes
   */
  private detectSuitesForSourceFiles(changes: FileChange[]): TestSuite[] {
    const suitesToRun = new Set<TestSuite>();
    const changedPaths = changes.map((change) => change.path);

    for (const suite of this.config.testSuites) {
      const watchPatterns = Array.isArray(suite.watchPattern)
        ? suite.watchPattern
        : [suite.watchPattern || '**/*'];

      for (const changedPath of changedPaths) {
        if (watchPatterns.some((pattern) => minimatch(changedPath, pattern, { dot: true }))) {
          suitesToRun.add(suite);
          break;
        }
      }
    }

    return Array.from(suitesToRun);
  }
}
