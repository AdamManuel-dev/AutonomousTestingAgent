#!/usr/bin/env node

// Complete test demonstrating coverage-based decision making
import { TestRunningAgent } from './dist/Agent.js';
import { writeFileSync, mkdirSync } from 'fs';
import chalk from 'chalk';

// Create mock coverage data
const mockCoverageData = {
  "total": {
    "lines": { "total": 100, "covered": 65, "skipped": 0, "pct": 65.5 },
    "statements": { "total": 100, "covered": 65, "skipped": 0, "pct": 65.5 },
    "functions": { "total": 20, "covered": 14, "skipped": 0, "pct": 70.0 },
    "branches": { "total": 40, "covered": 22, "skipped": 0, "pct": 55.0 }
  },
  "src/math.ts": {
    "lines": { "total": 10, "covered": 9, "skipped": 0, "pct": 95.0 },
    "statements": { "total": 10, "covered": 9, "skipped": 0, "pct": 95.0 },
    "functions": { "total": 2, "covered": 2, "skipped": 0, "pct": 100.0 },
    "branches": { "total": 2, "covered": 2, "skipped": 0, "pct": 90.0 }
  },
  "src/api/auth.ts": {
    "lines": { "total": 20, "covered": 9, "skipped": 0, "pct": 45.0 },
    "statements": { "total": 20, "covered": 9, "skipped": 0, "pct": 45.0 },
    "functions": { "total": 2, "covered": 1, "skipped": 0, "pct": 50.0 },
    "branches": { "total": 8, "covered": 2, "skipped": 0, "pct": 30.0 }
  },
  "src/utils/calculator.ts": {
    "lines": { "total": 30, "covered": 10, "skipped": 0, "pct": 35.0 },
    "statements": { "total": 30, "covered": 10, "skipped": 0, "pct": 35.0 },
    "functions": { "total": 3, "covered": 1, "skipped": 0, "pct": 40.0 },
    "branches": { "total": 10, "covered": 2, "skipped": 0, "pct": 25.0 }
  }
};

// Create coverage directory and file
mkdirSync('./coverage', { recursive: true });
writeFileSync('./coverage/coverage-summary.json', JSON.stringify(mockCoverageData, null, 2));

const config = {
  projectRoot: './test-example',
  testSuites: [
    {
      type: 'jest',
      pattern: ['**/*.test.ts', '**/*.spec.ts'],
      command: 'npm test',
      coverageCommand: `echo 'Running tests with coverage...' && npm test && echo '
Coverage summary:
Statements   : 65.5% ( 65/100 )
Branches     : 55.0% ( 22/40 )
Functions    : 70.0% ( 14/20 )
Lines        : 65.5% ( 65/100 )

src/math.ts           |    95.0 |    90.0 |   100.0 |    95.0 |
src/api/auth.ts       |    45.0 |    30.0 |    50.0 |    45.0 |
src/utils/calculator.ts |    35.0 |    25.0 |    40.0 |    35.0 |'`,
      watchPattern: ['**/*.ts'],
      priority: 3,
    },
    {
      type: 'cypress',
      pattern: ['**/*.cy.ts'],
      command: `echo 'Running Cypress E2E tests...' && echo '✓ Authentication flow (2543ms)' && echo '✓ User dashboard (1832ms)'`,
      watchPattern: ['**/*.ts'],
      priority: 1,
    }
  ],
  excludePatterns: ['**/node_modules/**', '**/dist/**'],
  debounceMs: 1000,
  coverage: {
    enabled: true,
    thresholds: {
      unit: 80,
      integration: 70,
      e2e: 60
    },
    persistPath: './coverage'
  }
};

console.log(chalk.bold.cyan('🧪 Coverage-Based Test Runner Demo\n'));
console.log(chalk.gray('Mock coverage data created:'));
console.log(chalk.gray('- Overall: 65.5% (below E2E threshold)'));
console.log(chalk.gray('- math.ts: 95% (good coverage)'));
console.log(chalk.gray('- auth.ts: 45% (critical file, low coverage)'));
console.log(chalk.gray('- calculator.ts: 35% (very low coverage)\n'));

const agent = new TestRunningAgent(config);

// Listen for test results
agent.on('test-results', (results) => {
  console.log(chalk.bold('\n📊 Test Results:'));
  results.forEach(result => {
    console.log(`- ${result.suite}: ${result.success ? '✅ Passed' : '❌ Failed'}`);
    if (result.coverage) {
      console.log(`  Coverage: ${result.coverage.lines.percentage}% lines`);
    }
  });
});

// Start the agent
agent.start();

console.log(chalk.bold('\n🎯 Simulating file changes...\n'));

// Test scenarios
setTimeout(() => {
  console.log(chalk.bold.yellow('\n1️⃣  Scenario 1: Changing high coverage file (math.ts)'));
  console.log(chalk.gray('Expected: Should run unit tests only\n'));
  const mathContent = `export function add(a: number, b: number): number {
  return a + b;
}

export function subtract(a: number, b: number): number {
  return a - b;
}

// Modified: ${new Date().toISOString()}`;
  writeFileSync('./test-example/src/math.ts', mathContent);
}, 2000);

setTimeout(() => {
  console.log(chalk.bold.yellow('\n2️⃣  Scenario 2: Changing critical auth file (low coverage)'));
  console.log(chalk.gray('Expected: Should run both unit and E2E tests\n'));
  const authContent = `export function authenticate(username: string, password: string): boolean {
  if (!username || !password) {
    return false;
  }
  return username === 'admin' && password === 'secret';
}

export function validateToken(token: string): boolean {
  return token.length > 10;
}

// Modified: ${new Date().toISOString()}`;
  writeFileSync('./test-example/src/api/auth.ts', authContent);
}, 7000);

setTimeout(() => {
  console.log(chalk.bold.yellow('\n3️⃣  Scenario 3: Changing very low coverage file (calculator.ts)'));
  console.log(chalk.gray('Expected: Should run all tests due to low coverage\n'));
  const calcContent = `export function multiply(a: number, b: number): number {
  return a * b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

export function complexCalculation(x: number, y: number, z: number): number {
  if (x > 10) {
    if (y > 5) {
      return x * y + z;
    }
    return x + y - z;
  }
  
  if (z === 0) {
    return 0;
  }
  
  return x / z + y;
}

// Modified: ${new Date().toISOString()}`;
  writeFileSync('./test-example/src/utils/calculator.ts', calcContent);
}, 12000);

// Stop after 17 seconds
setTimeout(() => {
  console.log(chalk.bold.red('\n🛑 Stopping agent...'));
  agent.stop();
  
  // Cleanup
  try {
    require('fs').unlinkSync('./coverage/coverage-summary.json');
    require('fs').rmdirSync('./coverage');
  } catch (e) {}
  
  process.exit(0);
}, 17000);