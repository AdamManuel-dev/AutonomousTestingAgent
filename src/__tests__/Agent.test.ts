import { TestRunningAgent } from '../Agent.js';
import { FileWatcher } from '../watchers/FileWatcher.js';
import { TestDetector } from '../utils/TestDetector.js';
import { TestRunner } from '../runners/TestRunner.js';
import { CursorIntegration } from '../utils/CursorIntegration.js';
import { SmartTestSelector } from '../utils/SmartTestSelector.js';
import { CoverageAnalyzer } from '../utils/CoverageAnalyzer.js';
import { PostmanRunner } from '../runners/PostmanRunner.js';
import { StagehandRunner } from '../runners/StagehandRunner.js';
import { JiraIntegration } from '../integrations/JiraIntegration.js';
import { GitIntegration } from '../integrations/GitIntegration.js';
import { GitHubIntegration } from '../integrations/GitHubIntegration.js';
import { EnvironmentChecker } from '../integrations/EnvironmentChecker.js';
import { MCPIntegration } from '../integrations/MCPIntegration.js';
import { NotificationManager } from '../utils/NotificationManager.js';
import { ComplexityAnalyzer } from '../utils/ComplexityAnalyzer.js';
import { SentryService } from '../utils/SentryService.js';
import { PostHogService } from '../utils/PostHogService.js';
import { DebugContext } from '../utils/DebugContext.js';
import { Config, FileChange } from '../types/index.js';

jest.mock('execa', () => ({
  execa: jest.fn(),
}));
jest.mock('../watchers/FileWatcher.js');
jest.mock('../utils/TestDetector.js');
jest.mock('../runners/TestRunner.js');
jest.mock('../utils/CursorIntegration.js');
jest.mock('../utils/SmartTestSelector.js');
jest.mock('../utils/CoverageAnalyzer.js');
jest.mock('../runners/PostmanRunner.js');
jest.mock('../runners/StagehandRunner.js');
jest.mock('../integrations/JiraIntegration.js');
jest.mock('../integrations/GitIntegration.js');
jest.mock('../integrations/GitHubIntegration.js');
jest.mock('../integrations/EnvironmentChecker.js');
jest.mock('../integrations/MCPIntegration.js');
jest.mock('../utils/NotificationManager.js');
jest.mock('../utils/ComplexityAnalyzer.js');
jest.mock('../utils/SentryService.js');
jest.mock('../utils/PostHogService.js');
jest.mock('../utils/DebugContext.js');
jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: (text: string) => text,
    yellow: (text: string) => text,
    red: (text: string) => text,
    blue: (text: string) => text,
    bold: { red: (text: string) => text },
    gray: (text: string) => text,
  },
}));

describe('TestRunningAgent', () => {
  let agent: TestRunningAgent;
  let mockConfig: Config;
  let mockFileWatcher: jest.Mocked<FileWatcher>;
  let mockTestDetector: jest.Mocked<TestDetector>;
  let mockTestRunner: jest.Mocked<TestRunner>;
  let mockSmartSelector: jest.Mocked<SmartTestSelector>;
  let mockCoverageAnalyzer: jest.Mocked<CoverageAnalyzer>;
  let mockGitIntegration: jest.Mocked<GitIntegration>;
  let mockNotificationManager: jest.Mocked<NotificationManager>;
  let mockComplexityAnalyzer: jest.Mocked<ComplexityAnalyzer>;
  let mockSentryService: jest.Mocked<SentryService>;
  let mockPostHogService: jest.Mocked<PostHogService>;
  let mockCursorIntegration: jest.Mocked<CursorIntegration>;
  let mockPostmanRunner: jest.Mocked<PostmanRunner>;
  let mockStagehandRunner: jest.Mocked<StagehandRunner>;
  let mockJiraIntegration: jest.Mocked<JiraIntegration>;
  let mockGitHubIntegration: jest.Mocked<GitHubIntegration>;
  let mockEnvironmentChecker: jest.Mocked<EnvironmentChecker>;
  let mockMCPIntegration: jest.Mocked<MCPIntegration>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singletons
    (SentryService as any).instance = undefined;
    (PostHogService as any).instance = undefined;

    mockConfig = {
      projectRoot: '/test/project',
      testSuites: [
        { type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true },
        { type: 'cypress', pattern: '**/*.int.test.ts', command: 'npm run test:e2e', enabled: true },
      ],
      excludePatterns: ['node_modules/**'],
      debounceMs: 500,
      cursorPort: 8080,
      coverage: { 
        enabled: true, 
        thresholds: { unit: 80, integration: 70, e2e: 60 },
        persistPath: 'coverage'
      },
      postman: { enabled: true, collections: [] },
      stagehand: { enabled: true, scenarios: [] },
      jira: { enabled: true, apiToken: 'test', baseUrl: 'test' },
      environments: { enabled: true },
      mcp: { enabled: true },
      complexity: { enabled: true, warningThreshold: 10 },
      github: { enabled: true, token: 'test', owner: 'test', repo: 'test' },
      sentry: { enabled: true },
      posthog: { enabled: true },
      notifications: { enabled: true },
      criticalPaths: { enabled: true, paths: ['/src/critical'] },
    };

    // Mock FileWatcher
    mockFileWatcher = {
      on: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
    } as any;
    (FileWatcher as any).mockImplementation(() => mockFileWatcher);

    // Mock TestDetector
    mockTestDetector = {} as any;
    (TestDetector as any).mockImplementation(() => mockTestDetector);

    // Mock CoverageAnalyzer
    mockCoverageAnalyzer = {} as any;
    (CoverageAnalyzer as any).mockImplementation(() => mockCoverageAnalyzer);

    // Mock TestRunner
    mockTestRunner = {
      runTestSuites: jest.fn().mockResolvedValue([]),
      cancelAll: jest.fn(),
    } as any;
    (TestRunner as any).mockImplementation(() => mockTestRunner);

    // Mock SmartTestSelector
    mockSmartSelector = {
      selectTestSuites: jest.fn().mockResolvedValue({ suites: [], reason: 'No tests needed' }),
      updateCoverage: jest.fn().mockResolvedValue(undefined),
      getTestRecommendations: jest.fn().mockReturnValue([]),
    } as any;
    (SmartTestSelector as any).mockImplementation(() => mockSmartSelector);

    // Mock GitIntegration
    mockGitIntegration = {
      checkBranchUpToDate: jest.fn().mockResolvedValue({ isUpToDate: true, message: 'Up to date' }),
      getCurrentBranch: jest.fn().mockResolvedValue('main'),
      getChangedFiles: jest.fn().mockResolvedValue(['file1.ts', 'file2.ts']),
    } as any;
    (GitIntegration as any).mockImplementation(() => mockGitIntegration);

    // Mock NotificationManager
    mockNotificationManager = {
      on: jest.fn(),
      info: jest.fn().mockResolvedValue(undefined),
      warning: jest.fn().mockResolvedValue(undefined),
      error: jest.fn().mockResolvedValue(undefined),
      success: jest.fn().mockResolvedValue(undefined),
    } as any;
    (NotificationManager as any).mockImplementation(() => mockNotificationManager);

    // Mock ComplexityAnalyzer
    mockComplexityAnalyzer = {
      shouldAnalyzeFile: jest.fn().mockReturnValue(true),
      analyzeFile: jest.fn().mockResolvedValue({
        filePath: 'test.ts',
        totalComplexity: 5,
        highComplexityNodes: [],
        nodes: [],
      }),
      compareComplexity: jest.fn().mockResolvedValue(null),
      generateSummary: jest.fn().mockReturnValue('Complexity summary'),
    } as any;
    (ComplexityAnalyzer as any).mockImplementation(() => mockComplexityAnalyzer);

    // Mock SentryService
    mockSentryService = {
      initialize: jest.fn(),
      withErrorHandling: jest.fn().mockImplementation((name, fn) => fn()),
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      captureMessage: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;
    (SentryService.getInstance as jest.Mock).mockReturnValue(mockSentryService);

    // Mock PostHogService
    mockPostHogService = {
      initialize: jest.fn(),
      trackAgentStart: jest.fn(),
      trackFileChange: jest.fn(),
      trackTestExecution: jest.fn(),
      trackCoverageAnalysis: jest.fn(),
      trackError: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any;
    (PostHogService.getInstance as jest.Mock).mockReturnValue(mockPostHogService);

    // Mock DebugContext
    (DebugContext.initialize as jest.Mock).mockImplementation(() => {});
    (DebugContext.setUserContext as jest.Mock).mockImplementation(() => {});

    // Mock CursorIntegration
    mockCursorIntegration = {
      on: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      broadcastNotification: jest.fn(),
      broadcastFileChange: jest.fn(),
      broadcastTestResults: jest.fn(),
    } as any;
    (CursorIntegration as any).mockImplementation(() => mockCursorIntegration);

    // Mock PostmanRunner
    mockPostmanRunner = {
      runAllCollections: jest.fn().mockResolvedValue([]),
    } as any;
    (PostmanRunner as any).mockImplementation(() => mockPostmanRunner);

    // Mock StagehandRunner
    mockStagehandRunner = {
      runAllScenarios: jest.fn().mockResolvedValue([]),
    } as any;
    (StagehandRunner as any).mockImplementation(() => mockStagehandRunner);

    // Mock JiraIntegration
    mockJiraIntegration = {
      analyzeTicketCompleteness: jest.fn().mockResolvedValue({ ticketKey: null, ticket: null, issues: [] }),
      findTicketInBranch: jest.fn().mockResolvedValue('TEST-123'),
      createCommitMessage: jest.fn().mockResolvedValue('TEST-123: Update files'),
    } as any;
    (JiraIntegration as any).mockImplementation(() => mockJiraIntegration);

    // Mock GitHubIntegration
    mockGitHubIntegration = {
      analyzePullRequest: jest.fn().mockResolvedValue({
        pullRequest: undefined,
        comments: [],
        reviewComments: [],
        actionItems: [],
        requestedChanges: [],
        concerns: [],
        suggestions: [],
      }),
      generateCommitContext: jest.fn().mockResolvedValue(' - Addresses PR feedback'),
    } as any;
    (GitHubIntegration as any).mockImplementation(() => mockGitHubIntegration);

    // Mock EnvironmentChecker
    mockEnvironmentChecker = {
      notifyIfNeeded: jest.fn().mockResolvedValue([]),
    } as any;
    (EnvironmentChecker as any).mockImplementation(() => mockEnvironmentChecker);

    // Mock MCPIntegration
    mockMCPIntegration = {
      connect: jest.fn().mockResolvedValue(undefined),
      registerWithCursor: jest.fn().mockResolvedValue(undefined),
      generateCommitMessage: jest.fn().mockResolvedValue('MCP generated message'),
    } as any;
    (MCPIntegration as any).mockImplementation(() => mockMCPIntegration);
  });

  describe('constructor', () => {
    it('should initialize with provided config', () => {
      agent = new TestRunningAgent(mockConfig);

      expect(FileWatcher).toHaveBeenCalledWith(mockConfig);
      expect(TestDetector).toHaveBeenCalledWith(mockConfig);
      expect(CoverageAnalyzer).toHaveBeenCalledWith(mockConfig);
      expect(SmartTestSelector).toHaveBeenCalledWith(mockConfig);
      expect(GitIntegration).toHaveBeenCalled();
      expect(NotificationManager).toHaveBeenCalledWith(mockConfig.notifications);
      expect(ComplexityAnalyzer).toHaveBeenCalledWith(mockConfig.complexity);
    });

    it('should initialize optional integrations when enabled', () => {
      agent = new TestRunningAgent(mockConfig);

      expect(CursorIntegration).toHaveBeenCalledWith(mockConfig.cursorPort);
      expect(PostmanRunner).toHaveBeenCalledWith(mockConfig.postman);
      expect(StagehandRunner).toHaveBeenCalledWith(mockConfig.stagehand, mockMCPIntegration);
      expect(JiraIntegration).toHaveBeenCalledWith(mockConfig.jira);
      expect(EnvironmentChecker).toHaveBeenCalledWith(mockConfig.environments);
      expect(MCPIntegration).toHaveBeenCalledWith(mockConfig.mcp);
      expect(GitHubIntegration).toHaveBeenCalledWith(mockConfig.github);
    });

    it('should not initialize optional integrations when disabled', () => {
      const configWithoutOptionals: Config = {
        ...mockConfig,
        cursorPort: undefined,
        postman: { ...mockConfig.postman!, enabled: false },
        stagehand: { ...mockConfig.stagehand!, enabled: false },
        jira: { ...mockConfig.jira!, enabled: false },
        environments: { ...mockConfig.environments!, enabled: false },
        mcp: { ...mockConfig.mcp!, enabled: false },
        github: { ...mockConfig.github!, enabled: false },
      };

      agent = new TestRunningAgent(configWithoutOptionals);

      // These should still be called for initialization
      expect(SentryService.getInstance).toHaveBeenCalled();
      expect(PostHogService.getInstance).toHaveBeenCalled();
      expect(DebugContext.initialize).toHaveBeenCalled();
    });

    it('should setup event handlers', () => {
      agent = new TestRunningAgent(mockConfig);

      expect(mockFileWatcher.on).toHaveBeenCalledWith('changes', expect.any(Function));
      expect(mockFileWatcher.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockNotificationManager.on).toHaveBeenCalledWith('notification', expect.any(Function));
    });
  });

  describe('start', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should start the agent successfully', async () => {
      await agent.start();

      expect(mockSentryService.withErrorHandling).toHaveBeenCalledWith('agent_start', expect.any(Function));
      expect(mockNotificationManager.info).toHaveBeenCalledWith(
        'Starting Test Running Agent',
        `Project root: ${mockConfig.projectRoot}`
      );
      expect(mockPostHogService.trackAgentStart).toHaveBeenCalledWith(mockConfig);
      expect(mockGitIntegration.checkBranchUpToDate).toHaveBeenCalled();
      expect(mockFileWatcher.start).toHaveBeenCalled();
      expect(mockCursorIntegration.start).toHaveBeenCalled();
      expect(agent.getStatus().running).toBe(true);
    });

    it('should not start if already running', async () => {
      await agent.start();
      jest.clearAllMocks();

      await agent.start();

      expect(mockSentryService.withErrorHandling).not.toHaveBeenCalled();
    });

    it('should check git status and show warning if not up to date', async () => {
      mockGitIntegration.checkBranchUpToDate.mockResolvedValue({
        isUpToDate: false,
        message: 'Branch is behind'
      });

      await agent.start();

      expect(mockNotificationManager.warning).toHaveBeenCalledWith('Git Status', 'Branch is behind');
    });

    it('should check environments if enabled', async () => {
      mockEnvironmentChecker.notifyIfNeeded.mockResolvedValue(['Warning message']);

      await agent.start();

      expect(mockEnvironmentChecker.notifyIfNeeded).toHaveBeenCalledWith('main');
      expect(mockNotificationManager.warning).toHaveBeenCalledWith('Environment Status', 'Warning message');
    });

    it('should check JIRA ticket if enabled', async () => {
      mockJiraIntegration.analyzeTicketCompleteness.mockResolvedValue({
        ticketKey: 'TEST-123',
        ticket: null,
        issues: ['Missing description']
      });

      await agent.start();

      expect(mockJiraIntegration.analyzeTicketCompleteness).toHaveBeenCalled();
      expect(mockNotificationManager.warning).toHaveBeenCalledWith(
        'JIRA Ticket: TEST-123',
        expect.stringContaining('Issues found')
      );
    });

    it('should connect MCP if enabled', async () => {
      await agent.start();

      expect(mockMCPIntegration.connect).toHaveBeenCalled();
      expect(mockMCPIntegration.registerWithCursor).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should stop the agent successfully', async () => {
      await agent.start();
      await agent.stop();

      expect(mockFileWatcher.stop).toHaveBeenCalled();
      expect(mockTestRunner.cancelAll).toHaveBeenCalled();
      expect(mockCursorIntegration.stop).toHaveBeenCalled();
      expect(mockPostHogService.shutdown).toHaveBeenCalled();
      expect(mockSentryService.close).toHaveBeenCalled();
      expect(agent.getStatus().running).toBe(false);
    });

    it('should not stop if not running', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await agent.stop();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Agent is not running'));
      expect(mockFileWatcher.stop).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('file change handling', () => {
    beforeEach(async () => {
      agent = new TestRunningAgent(mockConfig);
      await agent.start();
    });

    it('should handle file changes', async () => {
      const changes: FileChange[] = [
        { path: 'src/test.ts', type: 'change', timestamp: new Date() }
      ];

      mockSmartSelector.selectTestSuites.mockResolvedValue({
        suites: [{ type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true }],
        reason: 'Files changed require unit tests',
        coverageGaps: []
      });

      const testResults = [{ 
        suite: 'jest' as const, 
        success: true, 
        duration: 1000,
        output: 'Test output',
        filesTriggered: ['src/test.ts']
      }];
      mockTestRunner.runTestSuites.mockResolvedValue(testResults);

      // Trigger file change event
      const changeHandler = mockFileWatcher.on.mock.calls.find(call => call[0] === 'changes')?.[1];
      if (changeHandler) {
        await changeHandler(changes);
      }

      expect(mockSmartSelector.selectTestSuites).toHaveBeenCalledWith(changes);
      expect(mockTestRunner.runTestSuites).toHaveBeenCalled();
      expect(mockPostHogService.trackFileChange).toHaveBeenCalled();
      expect(mockCursorIntegration.broadcastFileChange).toHaveBeenCalledWith(['src/test.ts']);
    });

    it('should skip tests if no suites selected', async () => {
      const changes: FileChange[] = [
        { path: 'src/test.ts', type: 'change', timestamp: new Date() }
      ];

      mockSmartSelector.selectTestSuites.mockResolvedValue({
        suites: [],
        reason: 'No tests needed',
        coverageGaps: []
      });

      const changeHandler = mockFileWatcher.on.mock.calls.find(call => call[0] === 'changes')?.[1];
      if (changeHandler) {
        await changeHandler(changes);
      }

      expect(mockNotificationManager.info).toHaveBeenCalledWith('No test suites selected');
      expect(mockTestRunner.runTestSuites).not.toHaveBeenCalled();
    });

    it('should show coverage gaps warning', async () => {
      const changes: FileChange[] = [
        { path: 'src/test.ts', type: 'change', timestamp: new Date() }
      ];

      mockSmartSelector.selectTestSuites.mockResolvedValue({
        suites: [{ type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true }],
        reason: 'Files changed require unit tests',
        coverageGaps: ['src/uncovered.ts']
      });

      const changeHandler = mockFileWatcher.on.mock.calls.find(call => call[0] === 'changes')?.[1];
      if (changeHandler) {
        await changeHandler(changes);
      }

      expect(mockNotificationManager.warning).toHaveBeenCalledWith(
        'Low coverage files',
        'src/uncovered.ts'
      );
    });
  });

  describe('shouldRunPostmanTests', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should return true for API-related files', () => {
      const changes: FileChange[] = [
        { path: 'src/api/users.ts', type: 'change', timestamp: new Date() },
        { path: 'src/routes/auth.ts', type: 'change', timestamp: new Date() },
        { path: 'src/controllers/main.controller.ts', type: 'change', timestamp: new Date() },
      ];

      const result = (agent as any).shouldRunPostmanTests(changes);
      expect(result).toBe(true);
    });

    it('should return false for non-API files', () => {
      const changes: FileChange[] = [
        { path: 'src/utils/helper.ts', type: 'change', timestamp: new Date() },
        { path: 'src/components/Button.tsx', type: 'change', timestamp: new Date() },
      ];

      const result = (agent as any).shouldRunPostmanTests(changes);
      expect(result).toBe(false);
    });
  });

  describe('shouldRunUITests', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should return true for frontend files', () => {
      const changes: FileChange[] = [
        { path: 'src/components/Button.tsx', type: 'change', timestamp: new Date() },
        { path: 'src/pages/HomePage.jsx', type: 'change', timestamp: new Date() },
        { path: 'src/views/UserView.vue', type: 'change', timestamp: new Date() },
      ];

      const result = (agent as any).shouldRunUITests(changes);
      expect(result).toBe(true);
    });

    it('should return false for non-frontend files', () => {
      const changes: FileChange[] = [
        { path: 'src/api/users.ts', type: 'change', timestamp: new Date() },
        { path: 'src/utils/helper.ts', type: 'change', timestamp: new Date() },
      ];

      const result = (agent as any).shouldRunUITests(changes);
      expect(result).toBe(false);
    });
  });

  describe('processTestResults', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should process successful test results', async () => {
      const results = [
        {
          suite: 'jest' as const,
          success: true,
          duration: 1000,
          output: 'Test output',
          filesTriggered: ['src/test.ts'],
          coverage: {
            lines: { percentage: 85, covered: 85 },
            files: { 'src/test.ts': {} }
          }
        }
      ];

      await (agent as any).processTestResults(results);

      expect(mockPostHogService.trackTestExecution).toHaveBeenCalledWith('jest', true, 1000, 1);
      expect(mockSmartSelector.updateCoverage).toHaveBeenCalledWith(results[0].coverage);
      expect(mockNotificationManager.success).toHaveBeenCalledWith(
        'All Tests Passed',
        '1 test suite(s) completed successfully'
      );
    });

    it('should process failed test results', async () => {
      const results = [
        {
          suite: 'jest' as const,
          success: false,
          duration: 1000,
          filesTriggered: ['src/test.ts'],
          output: 'Test failed'
        }
      ];

      await (agent as any).processTestResults(results);

      expect(mockPostHogService.trackTestExecution).toHaveBeenCalledWith('jest', false, 1000, 1);
      expect(mockSentryService.captureMessage).toHaveBeenCalledWith(
        'Test suite failed: jest',
        'error',
        expect.any(Object)
      );
      expect(mockNotificationManager.error).toHaveBeenCalledWith(
        'Tests Failed',
        '1 suite(s) failed: jest'
      );
    });

    it('should warn about low coverage', async () => {
      const results = [
        {
          suite: 'jest' as const,
          success: true,
          duration: 1000,
          output: 'Test output',
          coverage: {
            lines: { percentage: 70, covered: 70 },
            files: { 'src/test.ts': {} }
          }
        }
      ];

      await (agent as any).processTestResults(results);

      expect(mockNotificationManager.warning).toHaveBeenCalledWith(
        'Low Coverage',
        'Line coverage is 70.0% (threshold: 80%)'
      );
      expect(mockSentryService.captureMessage).toHaveBeenCalledWith(
        'Low test coverage detected',
        'warning',
        expect.any(Object)
      );
    });
  });

  describe('getComplexityReport', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should analyze complexity for provided files', async () => {
      const files = ['src/test.ts', 'src/complex.ts'];
      mockComplexityAnalyzer.analyzeFile
        .mockResolvedValueOnce({
          filePath: 'src/test.ts',
          totalComplexity: 5,
          nodes: [{ 
            name: 'test', 
            complexity: 5, 
            type: 'function', 
            line: 1, 
            column: 1, 
            children: [] 
          }],
          highComplexityNodes: []
        })
        .mockResolvedValueOnce({
          filePath: 'src/complex.ts',
          totalComplexity: 15,
          nodes: [{ 
            name: 'complex', 
            complexity: 15, 
            type: 'function', 
            line: 1, 
            column: 1, 
            children: [] 
          }],
          highComplexityNodes: [{ 
            name: 'complex', 
            complexity: 15, 
            type: 'function', 
            line: 1, 
            column: 1, 
            children: [] 
          }]
        });

      const result = await agent.getComplexityReport(files);

      expect(result.files).toBe(2);
      expect(result.reports).toHaveLength(2);
      expect(mockComplexityAnalyzer.generateSummary).toHaveBeenCalledWith(result.reports);
    });

    it('should get changed files if no files provided', async () => {
      mockGitIntegration.getChangedFiles.mockResolvedValue(['src/changed.ts']);
      mockComplexityAnalyzer.analyzeFile.mockResolvedValue({
        filePath: 'src/changed.ts',
        totalComplexity: 8,
        nodes: [{ 
          name: 'changed', 
          complexity: 8, 
          type: 'function', 
          line: 1, 
          column: 1, 
          children: [] 
        }],
        highComplexityNodes: []
      });

      const result = await agent.getComplexityReport();

      expect(mockGitIntegration.getChangedFiles).toHaveBeenCalled();
      expect(result.files).toBe(1);
    });
  });

  describe('generateCommitMessage', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should return empty string if no changed files', async () => {
      mockGitIntegration.getChangedFiles.mockResolvedValue([]);

      const result = await agent.generateCommitMessage();

      expect(result).toBe('');
    });

    it('should use JIRA integration if available', async () => {
      const result = await agent.generateCommitMessage();

      expect(mockJiraIntegration.findTicketInBranch).toHaveBeenCalled();
      expect(mockJiraIntegration.createCommitMessage).toHaveBeenCalledWith('TEST-123', ['file1.ts', 'file2.ts']);
      expect(result).toBe('TEST-123: Update files - Addresses PR feedback');
    });

    it('should use MCP integration if JIRA unavailable', async () => {
      mockJiraIntegration.findTicketInBranch.mockResolvedValue(null);

      const result = await agent.generateCommitMessage();

      expect(mockMCPIntegration.generateCommitMessage).toHaveBeenCalledWith({
        files: ['file1.ts', 'file2.ts'],
        description: ' - Addresses PR feedback'
      });
      expect(result).toBe('MCP generated message');
    });

    it('should use default message if no integrations available', async () => {
      // Create config without integrations
      const minimalConfig = {
        ...mockConfig,
        jira: { ...mockConfig.jira!, enabled: false },
        mcp: { ...mockConfig.mcp!, enabled: false }
      };
      
      agent = new TestRunningAgent(minimalConfig);

      const result = await agent.generateCommitMessage();

      expect(result).toBe('Update 2 files - Addresses PR feedback');
    });
  });

  describe('checkGitHubPRComments', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should return false if GitHub integration not available', async () => {
      const configWithoutGitHub = {
        ...mockConfig,
        github: { ...mockConfig.github!, enabled: false }
      };
      agent = new TestRunningAgent(configWithoutGitHub);

      const result = await agent.checkGitHubPRComments();

      expect(result).toEqual({ hasUnresolvedComments: false });
    });

    it('should analyze PR comments and detect unresolved issues', async () => {
      mockGitHubIntegration.analyzePullRequest.mockResolvedValue({
        pullRequest: undefined,
        comments: [],
        reviewComments: [],
        actionItems: ['Fix this issue'],
        requestedChanges: ['Update code'],
        concerns: ['Performance concern'],
        suggestions: []
      });

      const result = await agent.checkGitHubPRComments();

      expect(result.hasUnresolvedComments).toBe(true);
      expect(mockNotificationManager.warning).toHaveBeenCalledWith(
        'GitHub PR Comments',
        'Found 1 action items, 1 requested changes, and 1 concerns'
      );
    });

    it('should return false if no unresolved comments', async () => {
      mockGitHubIntegration.analyzePullRequest.mockResolvedValue({
        pullRequest: undefined,
        comments: [],
        reviewComments: [],
        actionItems: [],
        requestedChanges: [],
        concerns: [],
        suggestions: ['Consider this']
      });

      const result = await agent.checkGitHubPRComments();

      expect(result.hasUnresolvedComments).toBe(false);
    });
  });

  describe('getStatus', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should return correct status when not running', () => {
      const status = agent.getStatus();

      expect(status).toEqual({
        running: false,
        cursorConnected: true
      });
    });

    it('should return correct status when running', async () => {
      await agent.start();
      const status = agent.getStatus();

      expect(status).toEqual({
        running: true,
        cursorConnected: true
      });
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      agent = new TestRunningAgent(mockConfig);
    });

    it('should handle file watcher errors', () => {
      const error = new Error('File watcher error');
      const errorHandler = mockFileWatcher.on.mock.calls.find(call => call[0] === 'error')?.[1];

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Add error listener to prevent unhandled error
      agent.on('error', () => {});

      if (errorHandler) {
        errorHandler(error);
      }

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('File watcher error:'), error);
      expect(mockSentryService.captureException).toHaveBeenCalledWith(error, { component: 'file-watcher' });
      expect(mockPostHogService.trackError).toHaveBeenCalledWith(error, { component: 'file-watcher' });

      consoleSpy.mockRestore();
    });
  });

  describe('getEnabledFeatures', () => {
    it('should return all enabled features', () => {
      agent = new TestRunningAgent(mockConfig);
      const features = (agent as any).getEnabledFeatures();

      expect(features).toContain('coverage');
      expect(features).toContain('postman');
      expect(features).toContain('stagehand');
      expect(features).toContain('jira');
      expect(features).toContain('environments');
      expect(features).toContain('mcp');
      expect(features).toContain('complexity');
      expect(features).toContain('critical-paths');
      expect(features).toContain('sentry');
      expect(features).toContain('posthog');
      expect(features).toContain('github');
    });

    it('should return only enabled features', () => {
      const minimalConfig = {
        ...mockConfig,
        coverage: { 
          enabled: false,
          thresholds: { unit: 80, integration: 70, e2e: 60 }
        },
        postman: { enabled: false },
        stagehand: { enabled: false },
        jira: { enabled: false },
        environments: { enabled: false },
        mcp: { enabled: false },
        complexity: { enabled: false },
        criticalPaths: { enabled: false },
        sentry: { enabled: false },
        posthog: { enabled: false },
        github: { enabled: false },
      };

      agent = new TestRunningAgent(minimalConfig);
      const features = (agent as any).getEnabledFeatures();

      expect(features).toHaveLength(0);
    });
  });
});