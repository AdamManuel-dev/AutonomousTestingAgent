import * as ts from 'typescript';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

export interface ComplexityConfig {
  enabled?: boolean;
  warningThreshold?: number;
  errorThreshold?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface ComplexityNode {
  name: string;
  type: 'function' | 'method' | 'class' | 'module';
  complexity: number;
  line: number;
  column: number;
  children: ComplexityNode[];
}

export interface ComplexityReport {
  filePath: string;
  totalComplexity: number;
  nodes: ComplexityNode[];
  highComplexityNodes: ComplexityNode[];
}

export interface ComplexityComparison {
  filePath: string;
  previous: number;
  current: number;
  change: number;
  percentageChange: number;
  increased: boolean;
}

export class ComplexityAnalyzer {
  private config: ComplexityConfig;
  private complexityCache: Map<string, ComplexityReport> = new Map();

  constructor(config: ComplexityConfig = {}) {
    this.config = {
      enabled: true,
      warningThreshold: 10,
      errorThreshold: 20,
      ...config,
    };
  }

  /**
   * Analyze complexity of a TypeScript/JavaScript file
   */
  async analyzeFile(filePath: string): Promise<ComplexityReport> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      const nodes: ComplexityNode[] = [];
      this.visitNode(sourceFile, nodes, sourceFile);

      const totalComplexity = this.calculateTotalComplexity(nodes);
      const highComplexityNodes = this.findHighComplexityNodes(nodes);

      const report: ComplexityReport = {
        filePath,
        totalComplexity,
        nodes,
        highComplexityNodes,
      };

      // Cache the result
      this.complexityCache.set(filePath, report);

      return report;
    } catch (error: any) {
      // Only log if it's not a file not found error
      if (error.code !== 'ENOENT') {
        console.error(`Failed to analyze ${filePath}:`, error);
      }
      return {
        filePath,
        totalComplexity: 0,
        nodes: [],
        highComplexityNodes: [],
      };
    }
  }

  /**
   * Visit TypeScript AST nodes and calculate complexity
   */
  private visitNode(
    node: ts.Node,
    nodes: ComplexityNode[],
    sourceFile: ts.SourceFile,
    parent?: ComplexityNode,
  ): void {
    let currentNode: ComplexityNode | undefined;

    // Check if this node creates a new scope
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isFunctionExpression(node) ||
      ts.isArrowFunction(node)
    ) {
      const name = this.getFunctionName(node) || 'anonymous';
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      currentNode = {
        name,
        type: 'function',
        complexity: 1, // Base complexity
        line: line + 1,
        column: character + 1,
        children: [],
      };

      if (parent) {
        parent.children.push(currentNode);
      } else {
        nodes.push(currentNode);
      }
    } else if (ts.isMethodDeclaration(node)) {
      const name = node.name?.getText() || 'anonymous';
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      currentNode = {
        name,
        type: 'method',
        complexity: 1, // Base complexity
        line: line + 1,
        column: character + 1,
        children: [],
      };

      if (parent) {
        parent.children.push(currentNode);
      } else {
        nodes.push(currentNode);
      }
    } else if (ts.isClassDeclaration(node)) {
      const name = node.name?.getText() || 'anonymous';
      const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());

      currentNode = {
        name,
        type: 'class',
        complexity: 0, // Classes have max complexity of children
        line: line + 1,
        column: character + 1,
        children: [],
      };

      nodes.push(currentNode);
    }

    // Calculate complexity increments
    const complexityIncrement = this.getComplexityIncrement(node);
    if (complexityIncrement > 0 && (currentNode || parent)) {
      const targetNode = currentNode || parent;
      if (targetNode) {
        targetNode.complexity += complexityIncrement;
      }
    }

    // Visit children
    ts.forEachChild(node, (child) => {
      this.visitNode(child, nodes, sourceFile, currentNode || parent);
    });

    // For classes, set complexity to max of children
    if (currentNode && currentNode.type === 'class' && currentNode.children.length > 0) {
      currentNode.complexity = Math.max(...currentNode.children.map((child) => child.complexity));
    }
  }

  /**
   * Get complexity increment for different node types
   */
  private getComplexityIncrement(node: ts.Node): number {
    // Branching statements add complexity
    if (ts.isIfStatement(node)) return 1;
    if (ts.isConditionalExpression(node)) return 1; // ternary
    if (ts.isSwitchStatement(node)) return 0; // Complexity added by cases
    if (ts.isCaseClause(node)) return 1;
    if (ts.isDefaultClause(node)) return 1;

    // Loops add complexity
    if (ts.isForStatement(node)) return 1;
    if (ts.isForInStatement(node)) return 1;
    if (ts.isForOfStatement(node)) return 1;
    if (ts.isWhileStatement(node)) return 1;
    if (ts.isDoStatement(node)) return 1;

    // Exception handling
    if (ts.isCatchClause(node)) return 1;

    // Logical operators in conditions
    if (ts.isBinaryExpression(node)) {
      const operator = node.operatorToken.kind;
      if (
        operator === ts.SyntaxKind.AmpersandAmpersandToken || // &&
        operator === ts.SyntaxKind.BarBarToken || // ||
        operator === ts.SyntaxKind.QuestionQuestionToken
      ) {
        // ??
        return 1;
      }
    }

    return 0;
  }

  /**
   * Get function name from various function node types
   */
  private getFunctionName(
    node: ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction,
  ): string {
    if (ts.isFunctionDeclaration(node) && node.name) {
      return node.name.getText();
    }

    if (ts.isFunctionExpression(node) && node.name) {
      return node.name.getText();
    }

    // For arrow functions, try to get the variable name
    const parent = node.parent;
    if (ts.isVariableDeclaration(parent) && parent.name) {
      return parent.name.getText();
    }

    if (ts.isPropertyAssignment(parent) && parent.name) {
      return parent.name.getText();
    }

    return 'anonymous';
  }

  /**
   * Calculate total complexity for a set of nodes
   */
  private calculateTotalComplexity(nodes: ComplexityNode[]): number {
    let total = 0;

    const visit = (node: ComplexityNode) => {
      if (node.type !== 'class') {
        total += node.complexity;
      }
      node.children.forEach(visit);
    };

    nodes.forEach(visit);
    return total;
  }

  /**
   * Find nodes that exceed complexity thresholds
   */
  private findHighComplexityNodes(nodes: ComplexityNode[]): ComplexityNode[] {
    const highComplexityNodes: ComplexityNode[] = [];

    const visit = (node: ComplexityNode) => {
      if (node.complexity >= (this.config.warningThreshold || 10)) {
        highComplexityNodes.push(node);
      }
      node.children.forEach(visit);
    };

    nodes.forEach(visit);
    return highComplexityNodes;
  }

  /**
   * Compare complexity between current and previous versions
   */
  async compareComplexity(
    filePath: string,
    previousContent?: string,
  ): Promise<ComplexityComparison | null> {
    const currentReport = await this.analyzeFile(filePath);

    if (!previousContent) {
      // Try to get previous version from git
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const { stdout } = await execAsync(`git show HEAD:${filePath}`);
        previousContent = stdout;
      } catch {
        // No previous version available
        return null;
      }
    }

    if (!previousContent) return null;

    // Analyze previous version
    const tempFile = path.join(path.dirname(filePath), `.temp-${path.basename(filePath)}`);
    await fs.writeFile(tempFile, previousContent);

    const previousReport = await this.analyzeFile(tempFile);

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

    const change = currentReport.totalComplexity - previousReport.totalComplexity;
    const percentageChange =
      previousReport.totalComplexity > 0 ? (change / previousReport.totalComplexity) * 100 : 0;

    return {
      filePath,
      previous: previousReport.totalComplexity,
      current: currentReport.totalComplexity,
      change,
      percentageChange,
      increased: change > 0,
    };
  }

  /**
   * Generate complexity report summary
   */
  generateSummary(reports: ComplexityReport[]): string {
    const lines: string[] = [];

    for (const report of reports) {
      lines.push(`\n${chalk.bold(report.filePath)}`);
      lines.push(`Total Complexity: ${this.getComplexityColor(report.totalComplexity)}`);

      if (report.highComplexityNodes.length > 0) {
        lines.push(chalk.yellow('\nHigh Complexity Functions:'));

        for (const node of report.highComplexityNodes) {
          const complexity = this.getComplexityColor(node.complexity);
          lines.push(`  ${node.name} (${node.type}) - ${complexity} at line ${node.line}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get colored complexity value based on thresholds
   */
  private getComplexityColor(complexity: number): string {
    const value = complexity.toString();

    if (complexity >= (this.config.errorThreshold || 20)) {
      return chalk.red(value);
    } else if (complexity >= (this.config.warningThreshold || 10)) {
      return chalk.yellow(value);
    } else {
      return chalk.green(value);
    }
  }

  /**
   * Check if file should be analyzed based on patterns
   */
  shouldAnalyzeFile(filePath: string): boolean {
    const ext = path.extname(filePath);

    // Only analyze TypeScript and JavaScript files
    if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
      return false;
    }

    // Check exclude patterns
    if (this.config.excludePatterns) {
      for (const pattern of this.config.excludePatterns) {
        if (filePath.includes(pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    if (this.config.includePatterns && this.config.includePatterns.length > 0) {
      for (const pattern of this.config.includePatterns) {
        if (filePath.includes(pattern)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  /**
   * Clear complexity cache
   */
  clearCache(): void {
    this.complexityCache.clear();
  }
}
