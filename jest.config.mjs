/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^chalk$': '<rootDir>/src/__tests__/__mocks__/chalk.ts',
    '^#ansi-styles$': '<rootDir>/src/__tests__/__mocks__/ansi-styles.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(chalk|#ansi-styles|ansi-styles|execa)/)',
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/index.ts',
    '!src/mcp-server.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
};