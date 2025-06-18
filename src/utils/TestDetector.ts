import { minimatch } from 'minimatch';
import { FileChange, TestSuite, Config } from '../types/index.js';

export class TestDetector {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Determines which test suites should run based on file changes
   */
  detectTestSuites(changes: FileChange[]): TestSuite[] {
    const suitesToRun = new Set<TestSuite>();
    const changedPaths = changes.map((change) => change.path);

    for (const suite of this.config.testSuites) {
      const patterns = Array.isArray(suite.pattern) ? suite.pattern : [suite.pattern];

      for (const changedPath of changedPaths) {
        if (this.matchesPattern(changedPath, patterns)) {
          suitesToRun.add(suite);
          break;
        }
      }
    }

    return Array.from(suitesToRun);
  }

  /**
   * Check if a file path matches any of the given patterns
   */
  private matchesPattern(filePath: string, patterns: string[]): boolean {
    return patterns.some((pattern) => minimatch(filePath, pattern, { dot: true }));
  }

  /**
   * Get test files that are related to source files
   */
  getRelatedTestFiles(sourceFile: string): string[] {
    const testPatterns = [
      sourceFile.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
      sourceFile.replace(/\.(ts|tsx|js|jsx)$/, '.spec.$1'),
      sourceFile.replace(/src\//, 'test/').replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
      sourceFile.replace(/src\//, '__tests__/').replace(/\.(ts|tsx|js|jsx)$/, '.test.$1'),
    ];

    return testPatterns;
  }

  /**
   * Determine if a file is a test file
   */
  isTestFile(filePath: string): boolean {
    const testPatterns = [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
      '**/test/**/*.{js,jsx,ts,tsx}',
      '**/*.cy.{js,jsx,ts,tsx}',
      '**/*.stories.{js,jsx,ts,tsx}',
    ];

    return testPatterns.some((pattern) => minimatch(filePath, pattern, { dot: true }));
  }
}
