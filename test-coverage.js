#!/usr/bin/env node

// Simple test script to demonstrate coverage-based decision making
import { TestRunningAgent } from './dist/Agent.js';
import { writeFileSync } from 'fs';

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

console.log('🧪 Coverage-Based Test Runner Demo\n');

const agent = new TestRunningAgent(config);

// Listen for test results
agent.on('test-results', (results) => {
  console.log('\n📊 Test Results:');
  results.forEach(result => {
    console.log(`- ${result.suite}: ${result.success ? '✅ Passed' : '❌ Failed'}`);
    if (result.coverage) {
      console.log(`  Coverage: ${result.coverage.lines.percentage}% lines`);
    }
  });
});

// Start the agent
agent.start();

console.log('\n🎯 Simulating file changes...\n');

// Simulate different file changes
setTimeout(() => {
  console.log('1️⃣ Changing high coverage file (math.ts)...');
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
  console.log('\n2️⃣ Changing critical auth file (api/auth.ts)...');
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
}, 6000);

setTimeout(() => {
  console.log('\n3️⃣ Changing low coverage file (utils/calculator.ts)...');
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
}, 10000);

// Stop after 15 seconds
setTimeout(() => {
  console.log('\n🛑 Stopping agent...');
  agent.stop();
  process.exit(0);
}, 15000);