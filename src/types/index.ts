export interface TestSuite {
  type: 'jest' | 'cypress' | 'storybook' | 'postman' | 'stagehand';
  pattern: string | string[];
  command: string;
  watchPattern?: string[];
  coverageCommand?: string;
  priority?: number;
  enabled?: boolean;
}

export interface PostmanConfig {
  enabled?: boolean;
  collections?: string[];
  environment?: string;
  globals?: string;
  iterationCount?: number;
}

export interface StagehandConfig {
  enabled?: boolean;
  baseUrl?: string;
  scenarios?: StagehandScenario[];
  scenariosPath?: string;
  promptForClarification?: boolean;
}

export interface StagehandScenario {
  name: string;
  description: string;
  steps: string[];
}

export interface FigmaConfig {
  enabled?: boolean;
  apiToken?: string;
  projectId?: string;
  compareThreshold?: number;
}

export interface JiraConfig {
  enabled?: boolean;
  baseUrl?: string;
  email?: string;
  apiToken?: string;
  projectKey?: string;
  branchPattern?: string;
}

export interface EnvironmentConfig {
  enabled?: boolean;
  checkUrl?: string;
  notifyOnNonMaster?: boolean;
}

export interface MCPConfig {
  enabled?: boolean;
  registrationPath?: string;
  actionName?: string;
  delegateToCursor?: boolean;
}

export interface CriticalPathConfig {
  enabled?: boolean;
  paths?: string[];
  patterns?: string[];
}

export interface NotificationConfig {
  enabled?: boolean;
  systemNotifications?: boolean;
  consoleOutput?: boolean;
  webSocket?: boolean;
  slack?: {
    webhookUrl?: string;
    channel?: string;
  };
}

export interface ComplexityConfig {
  enabled?: boolean;
  warningThreshold?: number;
  errorThreshold?: number;
  includePatterns?: string[];
  excludePatterns?: string[];
}

export interface SentryConfig {
  enabled?: boolean;
  dsn?: string;
  environment?: string;
  release?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  debug?: boolean;
}

export interface PostHogConfig {
  enabled?: boolean;
  apiKey?: string;
  host?: string;
  enableUserTracking?: boolean;
  enableTestTracking?: boolean;
  enableErrorTracking?: boolean;
}

export interface GitHubConfig {
  enabled?: boolean;
  token?: string;
  owner?: string;
  repo?: string;
  autoDetect?: boolean;
}

export interface Config {
  projectRoot: string;
  testSuites: TestSuite[];
  excludePatterns: string[];
  debounceMs: number;
  cursorPort?: number;
  coverage?: {
    enabled: boolean;
    thresholds: {
      unit: number;
      integration: number;
      e2e: number;
    };
    persistPath?: string;
  };
  criticalPaths?: CriticalPathConfig;
  postman?: PostmanConfig;
  stagehand?: StagehandConfig;
  figma?: FigmaConfig;
  jira?: JiraConfig;
  environments?: EnvironmentConfig;
  mcp?: MCPConfig;
  notifications?: NotificationConfig;
  complexity?: ComplexityConfig;
  sentry?: SentryConfig;
  posthog?: PostHogConfig;
  github?: GitHubConfig;
}

export interface FileChange {
  path: string;
  type: 'add' | 'change' | 'unlink';
  timestamp: Date;
}

export interface TestResult {
  suite: TestSuite['type'];
  success: boolean;
  duration: number;
  output: string;
  filesTriggered: string[];
  coverage?: CoverageData;
}

export interface CoverageData {
  lines: {
    total: number;
    covered: number;
    percentage: number;
  };
  statements: {
    total: number;
    covered: number;
    percentage: number;
  };
  functions: {
    total: number;
    covered: number;
    percentage: number;
  };
  branches: {
    total: number;
    covered: number;
    percentage: number;
  };
  files: Record<string, FileCoverage>;
}

export interface FileCoverage {
  path: string;
  lines: number[];
  uncoveredLines: number[];
  coverage: number;
}

export interface TestDecision {
  suites: TestSuite[];
  reason: string;
  coverageGaps?: string[];
}
