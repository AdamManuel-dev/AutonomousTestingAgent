#!/usr/bin/env node

// Debug script to test the smart selector
import { SmartTestSelector } from './dist/utils/SmartTestSelector.js';
import { TestDetector } from './dist/utils/TestDetector.js';

const config = {
  projectRoot: './test-example',
  testSuites: [
    {
      type: 'jest',
      pattern: ['**/*.test.ts', '**/*.spec.ts'],
      command: 'npm test',
      coverageCommand: 'echo "test with coverage"',
      watchPattern: ['**/*.ts'],
      priority: 3,
    },
    {
      type: 'cypress',
      pattern: ['**/*.cy.ts'],
      command: 'echo "cypress tests"',
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

const selector = new SmartTestSelector(config);
const detector = new TestDetector(config);

const changes = [
  { path: 'src/api/auth.ts', type: 'change', timestamp: new Date() }
];

console.log('Testing with changes:', changes);

// Test detector
const detected = detector.detectTestSuites(changes);
console.log('\nTest Detector found:', detected.length, 'suites');

// Test smart selector
selector.selectTestSuites(changes).then(decision => {
  console.log('\nSmart Selector decision:');
  console.log('- Suites to run:', decision.suites.map(s => s.type));
  console.log('- Reason:', decision.reason);
  console.log('- Coverage gaps:', decision.coverageGaps);
});