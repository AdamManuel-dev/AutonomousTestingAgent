import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { CoverageData, FileCoverage, FileChange, Config } from '../types/index.js';

export class CoverageAnalyzer {
  private config: Config;
  private coverageCache: Map<string, CoverageData> = new Map();

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Parse coverage output from test runners
   */
  parseCoverageOutput(output: string, type: 'jest' | 'cypress' | 'storybook'): CoverageData | null {
    try {
      if (type === 'jest') {
        return this.parseJestCoverage(output);
      }
      // Add other parsers as needed
      return null;
    } catch (error) {
      console.error('Failed to parse coverage:', error);
      return null;
    }
  }

  /**
   * Parse Jest coverage output
   */
  private parseJestCoverage(output: string): CoverageData | null {
    // Look for coverage summary in Jest output
    const coverageMatch = output.match(
      /Coverage summary[\s\S]*?Statements\s*:\s*([\d.]+)%.*?Branches\s*:\s*([\d.]+)%.*?Functions\s*:\s*([\d.]+)%.*?Lines\s*:\s*([\d.]+)%/,
    );

    if (!coverageMatch) {
      return null;
    }

    const [, statements, branches, functions, lines] = coverageMatch;

    // Parse file-level coverage if available
    const files: Record<string, FileCoverage> = {};
    const fileMatches = output.matchAll(
      /^\s*(.+?\.[jt]sx?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/gm,
    );

    for (const match of fileMatches) {
      const [, filePath, stmtCov, branchCov, funcCov, lineCov] = match;
      files[filePath] = {
        path: filePath,
        lines: [],
        uncoveredLines: [],
        coverage: parseFloat(lineCov),
      };
    }

    return {
      statements: {
        total: 100,
        covered: parseFloat(statements),
        percentage: parseFloat(statements),
      },
      branches: {
        total: 100,
        covered: parseFloat(branches),
        percentage: parseFloat(branches),
      },
      functions: {
        total: 100,
        covered: parseFloat(functions),
        percentage: parseFloat(functions),
      },
      lines: {
        total: 100,
        covered: parseFloat(lines),
        percentage: parseFloat(lines),
      },
      files,
    };
  }

  /**
   * Load coverage data from JSON files (Jest, NYC format)
   */
  async loadCoverageFromFile(coveragePath: string): Promise<CoverageData | null> {
    try {
      const coverageJson = await readFile(join(coveragePath, 'coverage-summary.json'), 'utf-8');
      const summary = JSON.parse(coverageJson);

      const files: Record<string, FileCoverage> = {};

      for (const [filePath, fileData] of Object.entries(summary)) {
        if (filePath === 'total') continue;

        const data = fileData as any;
        files[filePath] = {
          path: filePath,
          lines: [],
          uncoveredLines: data.lines.uncovered || [],
          coverage: data.lines.pct,
        };
      }

      const total = summary.total;
      return {
        lines: {
          total: total.lines.total,
          covered: total.lines.covered,
          percentage: total.lines.pct,
        },
        statements: {
          total: total.statements.total,
          covered: total.statements.covered,
          percentage: total.statements.pct,
        },
        functions: {
          total: total.functions.total,
          covered: total.functions.covered,
          percentage: total.functions.pct,
        },
        branches: {
          total: total.branches.total,
          covered: total.branches.covered,
          percentage: total.branches.pct,
        },
        files,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze which files have low coverage and need more testing
   */
  analyzeFileCoverage(changes: FileChange[], coverage: CoverageData): string[] {
    const lowCoverageFiles: string[] = [];
    const threshold = this.config.coverage?.thresholds.unit || 80;

    for (const change of changes) {
      const fileCoverage = coverage.files[change.path];
      if (fileCoverage && fileCoverage.coverage < threshold) {
        lowCoverageFiles.push(change.path);
      } else if (!fileCoverage) {
        // File not covered at all
        lowCoverageFiles.push(change.path);
      }
    }

    return lowCoverageFiles;
  }

  /**
   * Determine if changes affect critical paths that need E2E testing
   */
  needsE2ETesting(changes: FileChange[], coverage: CoverageData): boolean {
    const criticalPatterns = [
      '**/api/**',
      '**/auth/**',
      '**/payment/**',
      '**/core/**',
      '**/*route*',
      '**/*controller*',
    ];

    const criticalChanges = changes.some((change) =>
      criticalPatterns.some((pattern) => change.path.includes(pattern.replace(/\*/g, ''))),
    );

    // Need E2E if critical files changed or overall coverage is low
    const overallCoverage = coverage.lines.percentage;
    const e2eThreshold = this.config.coverage?.thresholds.e2e || 70;

    return criticalChanges || overallCoverage < e2eThreshold;
  }

  /**
   * Get coverage trends by comparing with previous runs
   */
  async getCoverageTrend(currentCoverage: CoverageData): Promise<{
    trend: 'improving' | 'declining' | 'stable';
    delta: number;
  }> {
    const previousCoverage = await this.loadPreviousCoverage();

    if (!previousCoverage) {
      return { trend: 'stable', delta: 0 };
    }

    const delta = currentCoverage.lines.percentage - previousCoverage.lines.percentage;

    if (delta > 1) return { trend: 'improving', delta };
    if (delta < -1) return { trend: 'declining', delta };
    return { trend: 'stable', delta };
  }

  /**
   * Save coverage data for future comparison
   */
  async saveCoverage(coverage: CoverageData): Promise<void> {
    if (!this.config.coverage?.persistPath) return;

    const coveragePath = join(this.config.coverage.persistPath, 'coverage-history.json');

    try {
      await mkdir(dirname(coveragePath), { recursive: true });

      const history = await this.loadCoverageHistory();
      history.push({
        timestamp: new Date().toISOString(),
        coverage,
      });

      // Keep last 50 entries
      if (history.length > 50) {
        history.shift();
      }

      await writeFile(coveragePath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Failed to save coverage:', error);
    }
  }

  /**
   * Load previous coverage data
   */
  private async loadPreviousCoverage(): Promise<CoverageData | null> {
    const history = await this.loadCoverageHistory();
    return history.length > 0 ? history[history.length - 1].coverage : null;
  }

  /**
   * Load coverage history
   */
  private async loadCoverageHistory(): Promise<
    Array<{ timestamp: string; coverage: CoverageData }>
  > {
    if (!this.config.coverage?.persistPath) return [];

    const coveragePath = join(this.config.coverage.persistPath, 'coverage-history.json');

    try {
      const data = await readFile(coveragePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
}
