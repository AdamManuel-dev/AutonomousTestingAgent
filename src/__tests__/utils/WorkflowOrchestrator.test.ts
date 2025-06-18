import { WorkflowOrchestrator, WorkflowResult } from '../../utils/WorkflowOrchestrator.js';
import { TestRunningAgent } from '../../Agent.js';
import { GitHubIntegration } from '../../integrations/GitHubIntegration.js';
import { FileChange } from '../../types/index.js';

jest.mock('chalk', () => ({
  __esModule: true,
  default: {
    green: (text: string) => text,
    yellow: (text: string) => text,
    red: (text: string) => text,
    blue: (text: string) => text,
    cyan: (text: string) => text,
    magenta: (text: string) => text,
    bold: (text: string) => text,
  },
}));

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockAgent: jest.Mocked<TestRunningAgent>;
  let mockGitHubIntegration: jest.Mocked<GitHubIntegration>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Mock GitHubIntegration
    mockGitHubIntegration = {
      analyzePullRequest: jest.fn(),
      analyzeCommentResolution: jest.fn(),
      isEnabled: jest.fn().mockReturnValue(true),
    } as any;
    
    // Mock Agent
    mockAgent = {
      getComplexityReport: jest.fn(),
      runTests: jest.fn(),
    } as any;
    
    // Set up private properties
    (mockAgent as any).gitHubIntegration = mockGitHubIntegration;
    (mockAgent as any).smartSelector = {
      selectTestSuites: jest.fn(),
      getTestRecommendations: jest.fn(),
    };
    (mockAgent as any).testRunner = {
      runTestSuites: jest.fn(),
    };
    (mockAgent as any).coverageAnalyzer = {
      loadCoverageFromFile: jest.fn(),
    };
    (mockAgent as any).config = {
      projectRoot: '/test/project',
      coverage: { persistPath: 'coverage' },
    };
    
    orchestrator = new WorkflowOrchestrator(mockAgent);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('checkGitHubPR', () => {
    it('should analyze pull request and return comprehensive data', async () => {
      const mockPRAnalysis = {
        pullRequest: {
          number: 123,
          title: 'Test PR',
          body: 'Test description',
          state: 'open',
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test/repo/pull/123',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
        },
        comments: [],
        reviewComments: [],
        actionItems: ['Please fix this', 'Update that'],
        requestedChanges: ['Change line 10'],
        concerns: ['Performance issue'],
        suggestions: ['Consider using X'],
      };
      
      const mockResolutionAnalysis = {
        overallConfidence: 0.75,
        unresolvedCount: 1,
        partiallyResolvedCount: 1,
        resolvedCount: 2,
        resolutions: [
          { 
            comment: 'Please fix this', 
            type: 'action' as const, 
            confidence: 0.9, 
            reasoning: 'File was changed',
          },
        ],
      };
      
      mockGitHubIntegration.analyzePullRequest.mockResolvedValue(mockPRAnalysis);
      mockGitHubIntegration.analyzeCommentResolution.mockResolvedValue(mockResolutionAnalysis);
      
      // Access private method for testing
      const result = await (orchestrator as any).checkGitHubPR();
      
      expect(mockGitHubIntegration.analyzePullRequest).toHaveBeenCalled();
      expect(mockGitHubIntegration.analyzeCommentResolution).toHaveBeenCalled();
      
      expect(result).toEqual({
        pullRequest: mockPRAnalysis.pullRequest,
        actionItems: 2,
        requestedChanges: 1,
        concerns: 1,
        suggestions: 1,
        hasUnresolvedItems: true,
        resolutionConfidence: 0.75,
        resolvedCount: 2,
        partiallyResolvedCount: 1,
        unresolvedCount: 1,
        resolutions: mockResolutionAnalysis.resolutions,
      });
    });
    
    it('should throw error when GitHub integration not enabled', async () => {
      (mockAgent as any).gitHubIntegration = null;
      
      await expect(
        (orchestrator as any).checkGitHubPR()
      ).rejects.toThrow('GitHub integration not enabled');
    });
    
    it('should cache results for 1 minute', async () => {
      const mockPRAnalysis = {
        pullRequest: { 
          number: 123, 
          title: 'Test PR', 
          body: 'Test',
          state: 'open',
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test/repo/pull/123',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
        },
        comments: [],
        reviewComments: [],
        actionItems: [],
        requestedChanges: [],
        concerns: [],
        suggestions: [],
      };
      
      const mockResolutionAnalysis = {
        overallConfidence: 1.0,
        unresolvedCount: 0,
        partiallyResolvedCount: 0,
        resolvedCount: 0,
        resolutions: [],
      };
      
      mockGitHubIntegration.analyzePullRequest.mockResolvedValue(mockPRAnalysis);
      mockGitHubIntegration.analyzeCommentResolution.mockResolvedValue(mockResolutionAnalysis);
      
      // Call twice
      await (orchestrator as any).checkGitHubPR();
      await (orchestrator as any).checkGitHubPR();
      
      // Should only call the integration once due to caching
      expect(mockGitHubIntegration.analyzePullRequest).toHaveBeenCalledTimes(1);
      expect(mockGitHubIntegration.analyzeCommentResolution).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('GitHub integration caching', () => {
    it('should cache GitHub PR results', async () => {
      const mockPRAnalysis = {
        pullRequest: { 
          number: 456, 
          title: 'Test Updates', 
          body: 'Updating tests',
          state: 'open',
          user: { login: 'testuser' },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          html_url: 'https://github.com/test/repo/pull/456',
          head: { ref: 'feature-branch' },
          base: { ref: 'main' },
        },
        comments: [],
        reviewComments: [],
        actionItems: ['Add more tests'],
        requestedChanges: [],
        concerns: [],
        suggestions: [],
      };
      
      const mockResolutionAnalysis = {
        overallConfidence: 0.5,
        unresolvedCount: 1,
        partiallyResolvedCount: 0,
        resolvedCount: 0,
        resolutions: [],
      };
      
      mockGitHubIntegration.analyzePullRequest.mockResolvedValue(mockPRAnalysis);
      mockGitHubIntegration.analyzeCommentResolution.mockResolvedValue(mockResolutionAnalysis);
      
      // Call the method directly to test caching
      const result1 = await (orchestrator as any).checkGitHubPR();
      const result2 = await (orchestrator as any).checkGitHubPR();
      
      expect(result1).toEqual(result2);
      expect(mockGitHubIntegration.analyzePullRequest).toHaveBeenCalledTimes(1);
      expect(mockGitHubIntegration.analyzeCommentResolution).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('error handling', () => {
    it('should handle GitHub integration errors gracefully', async () => {
      mockGitHubIntegration.analyzePullRequest.mockRejectedValue(new Error('GitHub API error'));
      
      await expect(
        (orchestrator as any).checkGitHubPR()
      ).rejects.toThrow('GitHub API error');
    });
  });

  describe('executeDevSetup', () => {
    beforeEach(() => {
      // Mock all integrations for dev setup
      (mockAgent as any).gitIntegration = {
        checkBranchUpToDate: jest.fn().mockResolvedValue({ isUpToDate: true, message: 'Up to date' }),
        checkMergeStatus: jest.fn().mockResolvedValue({ needsPull: false, needsMerge: false, conflicts: false, messages: [] }),
        getCurrentBranch: jest.fn().mockResolvedValue('main'),
      };

      (mockAgent as any).environmentChecker = {
        checkEnvironments: jest.fn().mockResolvedValue(['env1', 'env2']),
        getnonMasterEnvironments: jest.fn().mockResolvedValue([]),
      };

      (mockAgent as any).jiraIntegration = {
        analyzeTicketCompleteness: jest.fn().mockResolvedValue({ ticketKey: 'TEST-123', issues: [] }),
      };

      (mockAgent as any).config = {
        projectRoot: '/test/project',
        coverage: { persistPath: 'coverage' },
        postman: { enabled: false },
        stagehand: { enabled: false },
        jira: { enabled: true },
        environments: { enabled: true },
        mcp: { enabled: false },
        complexity: { enabled: false },
        criticalPaths: { enabled: false },
        testSuites: [
          { type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true }
        ]
      };

      mockAgent.start = jest.fn().mockResolvedValue(undefined);
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: false, cursorConnected: false });

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should execute dev setup successfully', async () => {
      const result = await orchestrator.executeDevSetup();

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('gitStatus');
      expect(result.results).toHaveProperty('environments');
      expect(result.results).toHaveProperty('jiraStatus');
      expect(result.results).toHaveProperty('githubPR');
      expect(result.results).toHaveProperty('watching');
      expect(result.results).toHaveProperty('finalStatus');
      expect(result.summary).toContain('🚀 Development setup complete');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should execute dev setup with project path', async () => {
      const projectPath = '/custom/project';
      
      const result = await orchestrator.executeDevSetup(projectPath);

      expect(result.success).toBe(true);
      expect(mockAgent.start).toHaveBeenCalled();
    });

    it('should handle errors in status checks', async () => {
      (mockAgent as any).gitIntegration.checkBranchUpToDate.mockRejectedValue(new Error('Git error'));
      (mockAgent as any).environmentChecker.checkEnvironments.mockRejectedValue(new Error('Env error'));

      const result = await orchestrator.executeDevSetup();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('gitStatus', 'Git error');
      expect(result.errors).toHaveProperty('environments', 'Env error');
    });

    it('should handle watching start errors', async () => {
      mockAgent.start.mockRejectedValue(new Error('Start failed'));

      const result = await orchestrator.executeDevSetup();

      expect(result.errors).toHaveProperty('watching', 'Start failed');
    });

    it('should handle general errors', async () => {
      // Mock a method to throw during the main try block
      jest.spyOn(Promise, 'allSettled').mockRejectedValue(new Error('Promise.allSettled failed'));

      const result = await orchestrator.executeDevSetup();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('general');
      expect(result.summary).toBe('❌ Development setup failed');

      jest.restoreAllMocks();
    });
  });

  describe('executeTestSuite', () => {
    beforeEach(() => {
      (mockAgent as any).smartSelector = {
        selectTestSuites: jest.fn().mockResolvedValue({
          suites: [{ type: 'jest', pattern: '**/*.test.ts', command: 'npm test' }],
          reason: 'Test reason'
        }),
        getTestRecommendations: jest.fn().mockReturnValue(['Recommendation 1']),
      };

      (mockAgent as any).testRunner = {
        runTestSuites: jest.fn().mockResolvedValue([{
          suite: 'jest',
          success: true,
          duration: 1000,
          output: 'Test output',
          coverage: {
            lines: { percentage: 85, covered: 85, total: 100 },
            statements: { percentage: 85, covered: 85, total: 100 },
            functions: { percentage: 85, covered: 85, total: 100 },
            branches: { percentage: 85, covered: 85, total: 100 },
            files: { 'test.ts': {} }
          }
        }]),
      };

      (mockAgent as any).coverageAnalyzer = {
        loadCoverageFromFile: jest.fn().mockResolvedValue({
          lines: { percentage: 85, covered: 85, total: 100 },
          statements: { percentage: 85, covered: 85, total: 100 },
          functions: { percentage: 85, covered: 85, total: 100 },
          branches: { percentage: 85, covered: 85, total: 100 },
          files: { 'test.ts': {} }
        }),
      };

      (mockAgent as any).config = {
        projectRoot: '/test/project',
        coverage: { persistPath: 'coverage' },
        criticalPaths: { paths: ['/src/critical'] }
      };

      mockAgent.getComplexityReport = jest.fn().mockResolvedValue({
        files: 2,
        reports: [],
        summary: 'Complexity summary'
      });

      (mockAgent as any).stagehandRunner = {
        runAllScenarios: jest.fn().mockResolvedValue([{
          scenario: 'test-scenario',
          success: true,
          output: 'E2E output'
        }]),
      };

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should execute test suite successfully', async () => {
      const files = ['src/test.ts', 'src/other.ts'];
      
      const result = await orchestrator.executeTestSuite(files);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('testResults');
      expect(result.results).toHaveProperty('coverage');
      expect(result.results).toHaveProperty('complexity');
      expect(result.summary).toContain('🧪 Test suite complete');
    });

    it('should execute test suite with E2E tests', async () => {
      const files = ['src/test.ts'];
      
      const result = await orchestrator.executeTestSuite(files, true);

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('e2e');
      expect((mockAgent as any).stagehandRunner.runAllScenarios).toHaveBeenCalled();
    });

    it('should handle test execution errors', async () => {
      (mockAgent as any).testRunner.runTestSuites.mockRejectedValue(new Error('Test failed'));

      const result = await orchestrator.executeTestSuite(['test.ts']);

      expect(result.errors).toHaveProperty('testResults', 'Test failed');
    });

    it('should handle coverage analysis errors', async () => {
      (mockAgent as any).coverageAnalyzer.loadCoverageFromFile.mockRejectedValue(new Error('Coverage failed'));

      const result = await orchestrator.executeTestSuite(['test.ts']);

      expect(result.errors).toHaveProperty('coverage', 'Coverage failed');
    });

    it('should handle complexity analysis errors', async () => {
      mockAgent.getComplexityReport.mockRejectedValue(new Error('Complexity failed'));

      const result = await orchestrator.executeTestSuite(['test.ts']);

      expect(result.errors).toHaveProperty('complexity', 'Complexity failed');
    });

    it('should handle E2E test errors', async () => {
      (mockAgent as any).stagehandRunner.runAllScenarios.mockRejectedValue(new Error('E2E failed'));

      const result = await orchestrator.executeTestSuite(['test.ts'], true);

      expect(result.errors).toHaveProperty('e2e', 'E2E failed');
    });

    it('should handle general errors', async () => {
      // Mock testRunner.runTestSuites to throw an error
      (mockAgent as any).testRunner.runTestSuites.mockRejectedValue(new Error('Test execution failed'));

      const result = await orchestrator.executeTestSuite(['test.ts']);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('testResults', 'Test execution failed');
    });
  });

  describe('executePreCommit', () => {
    beforeEach(() => {
      (mockAgent as any).gitIntegration = {
        checkBranchUpToDate: jest.fn().mockResolvedValue({ isUpToDate: true, message: 'Up to date' }),
        checkMergeStatus: jest.fn().mockResolvedValue({ needsPull: false, needsMerge: false, conflicts: false, messages: [] }),
      };

      (mockAgent as any).environmentChecker = {
        checkEnvironments: jest.fn().mockResolvedValue(['env1', 'env2']),
        getnonMasterEnvironments: jest.fn().mockResolvedValue([]),
      };

      (mockAgent as any).jiraIntegration = {
        analyzeTicketCompleteness: jest.fn().mockResolvedValue({ ticketKey: 'TEST-123', issues: [] }),
      };

      mockAgent.stop = jest.fn();
      mockAgent.generateCommitMessage = jest.fn().mockResolvedValue('feat: add new feature');
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: true, cursorConnected: false });

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should execute pre-commit validation successfully', async () => {
      const result = await orchestrator.executePreCommit();

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('stopWatching');
      expect(result.results).toHaveProperty('gitStatus');
      expect(result.results).toHaveProperty('jiraStatus');
      expect(result.results).toHaveProperty('environments');
      expect(result.results).toHaveProperty('githubPR');
      expect(result.results).toHaveProperty('commitMessage');
      expect(result.summary).toContain('✅ Pre-commit validation passed');
    });

    it('should handle stop watching when already stopped', async () => {
      mockAgent.getStatus.mockReturnValue({ running: false, cursorConnected: false });

      const result = await orchestrator.executePreCommit();

      expect(result.results.stopWatching).toHaveProperty('message', 'Not currently running');
    });

    it('should handle validation errors', async () => {
      (mockAgent as any).gitIntegration.checkBranchUpToDate.mockRejectedValue(new Error('Git validation failed'));
      (mockAgent as any).jiraIntegration.analyzeTicketCompleteness.mockRejectedValue(new Error('JIRA validation failed'));

      const result = await orchestrator.executePreCommit();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('gitStatus', 'Git validation failed');
      expect(result.errors).toHaveProperty('jiraStatus', 'JIRA validation failed');
    });

    it('should handle commit message generation errors', async () => {
      mockAgent.generateCommitMessage.mockRejectedValue(new Error('Commit message failed'));

      const result = await orchestrator.executePreCommit();

      expect(result.errors).toHaveProperty('commitMessage', 'Commit message failed');
    });

    it('should skip commit message when no jira or git status', async () => {
      (mockAgent as any).jiraIntegration = null;

      const result = await orchestrator.executePreCommit();

      expect(result.results).not.toHaveProperty('commitMessage');
    });

    it('should handle general errors', async () => {
      // Mock gitIntegration.checkBranchUpToDate to throw an error
      (mockAgent as any).gitIntegration.checkBranchUpToDate.mockRejectedValue(new Error('Git status failed'));

      const result = await orchestrator.executePreCommit();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('gitStatus', 'Git status failed');
    });
  });

  describe('executeHealthCheck', () => {
    beforeEach(() => {
      (mockAgent as any).gitIntegration = {
        checkBranchUpToDate: jest.fn().mockResolvedValue({ isUpToDate: true, message: 'Up to date' }),
        checkMergeStatus: jest.fn().mockResolvedValue({ needsPull: false, needsMerge: false, conflicts: false, messages: [] }),
        getCurrentBranch: jest.fn().mockResolvedValue('main'),
      };

      (mockAgent as any).environmentChecker = {
        checkEnvironments: jest.fn().mockResolvedValue(['env1', 'env2']),
        getnonMasterEnvironments: jest.fn().mockResolvedValue([]),
      };

      (mockAgent as any).jiraIntegration = {
        analyzeTicketCompleteness: jest.fn().mockResolvedValue({ ticketKey: 'TEST-123', issues: [] }),
      };

      (mockAgent as any).coverageAnalyzer = {
        loadCoverageFromFile: jest.fn().mockResolvedValue({
          lines: { percentage: 85 },
          statements: { percentage: 85 },
          functions: { percentage: 85 },
          branches: { percentage: 85 },
        }),
      };

      (mockAgent as any).config = {
        projectRoot: '/test/project',
        coverage: { persistPath: 'coverage' },
        postman: { enabled: false },
        stagehand: { enabled: false },
        jira: { enabled: true },
        environments: { enabled: true },
        mcp: { enabled: false },
        complexity: { enabled: false },
        criticalPaths: { enabled: false },
        testSuites: [
          { type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true }
        ]
      };

      mockAgent.getStatus = jest.fn().mockReturnValue({ 
        running: true, 
        cursorConnected: true,
        projectRoot: '/test/project',
        currentBranch: 'main',
        enabledFeatures: ['JIRA', 'Environment Monitoring'],
        testSuites: ['jest']
      });

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should execute health check successfully', async () => {
      const result = await orchestrator.executeHealthCheck();

      expect(result.success).toBe(true);
      expect(result.results).toHaveProperty('agentStatus');
      expect(result.results).toHaveProperty('gitStatus');
      expect(result.results).toHaveProperty('environments');
      expect(result.results).toHaveProperty('jiraStatus');
      expect(result.results).toHaveProperty('githubPR');
      expect(result.results).toHaveProperty('coverage');
      expect(result.summary).toContain('💚 Health check passed');
    });

    it('should handle partial failures in health check', async () => {
      (mockAgent as any).gitIntegration.checkBranchUpToDate.mockRejectedValue(new Error('Git error'));
      (mockAgent as any).coverageAnalyzer.loadCoverageFromFile.mockRejectedValue(new Error('Coverage error'));

      const result = await orchestrator.executeHealthCheck();

      expect(result.success).toBe(true); // Should still succeed with partial failures
      expect(result.errors).toHaveProperty('gitStatus', 'Git error');
      expect(result.errors).toHaveProperty('coverage', 'Coverage error');
      expect(result.summary).toContain('Health check passed');
    });

    it('should handle major failures in health check', async () => {
      // Mock most checks to fail
      (mockAgent as any).gitIntegration.checkBranchUpToDate.mockRejectedValue(new Error('Git error'));
      (mockAgent as any).environmentChecker.checkEnvironments.mockRejectedValue(new Error('Env error'));
      (mockAgent as any).jiraIntegration.analyzeTicketCompleteness.mockRejectedValue(new Error('JIRA error'));
      mockGitHubIntegration.analyzePullRequest.mockRejectedValue(new Error('GitHub error'));
      (mockAgent as any).coverageAnalyzer.loadCoverageFromFile.mockRejectedValue(new Error('Coverage error'));

      const result = await orchestrator.executeHealthCheck();

      expect(result.success).toBe(false);
      expect(result.summary).toContain('⚠️ Health check completed with issues');
    });

    it('should handle general errors', async () => {
      jest.spyOn(Promise, 'allSettled').mockRejectedValue(new Error('Promise.allSettled failed'));

      const result = await orchestrator.executeHealthCheck();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveProperty('general');

      jest.restoreAllMocks();
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      (mockAgent as any).gitIntegration = {
        checkBranchUpToDate: jest.fn().mockResolvedValue({ isUpToDate: true, message: 'Up to date' }),
        checkMergeStatus: jest.fn().mockResolvedValue({ needsPull: false, needsMerge: false, conflicts: false, messages: [] }),
      };

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should cache git status results', async () => {
      // Call twice
      await (orchestrator as any).checkGitStatus();
      await (orchestrator as any).checkGitStatus();

      // Should only call the integration once due to caching
      expect((mockAgent as any).gitIntegration.checkBranchUpToDate).toHaveBeenCalledTimes(1);
      expect((mockAgent as any).gitIntegration.checkMergeStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle environments when not enabled', async () => {
      (mockAgent as any).environmentChecker = null;

      await expect((orchestrator as any).checkEnvironments()).rejects.toThrow('Environment checking not enabled');
    });

    it('should handle JIRA when not enabled', async () => {
      (mockAgent as any).jiraIntegration = null;

      await expect((orchestrator as any).checkJira()).rejects.toThrow('JIRA integration not enabled');
    });
  });

  describe('helper methods', () => {
    beforeEach(() => {
      (mockAgent as any).smartSelector = {
        selectTestSuites: jest.fn().mockResolvedValue({
          suites: [{ type: 'jest', pattern: '**/*.test.ts', command: 'npm test' }],
          reason: 'Test reason'
        }),
      };

      (mockAgent as any).testRunner = {
        runTestSuites: jest.fn().mockResolvedValue([{
          suite: 'jest',
          success: true,
          duration: 1000,
          output: 'Test output'
        }]),
      };

      (mockAgent as any).config = {
        projectRoot: '/test/project',
      };

      orchestrator = new WorkflowOrchestrator(mockAgent);
    });

    it('should run tests with file changes', async () => {
      const files = ['src/test.ts'];
      
      const result = await (orchestrator as any).runTests(files);

      expect(result).toHaveProperty('decision');
      expect(result).toHaveProperty('results');
      expect((mockAgent as any).smartSelector.selectTestSuites).toHaveBeenCalled();
      expect((mockAgent as any).testRunner.runTestSuites).toHaveBeenCalled();
    });

    it('should analyze coverage when available', async () => {
      (mockAgent as any).coverageAnalyzer = {
        loadCoverageFromFile: jest.fn().mockResolvedValue({
          lines: { percentage: 85 },
          statements: { percentage: 85 },
          functions: { percentage: 85 },
          branches: { percentage: 85 },
        }),
      };

      (mockAgent as any).smartSelector.getTestRecommendations = jest.fn().mockReturnValue(['Recommendation']);

      (mockAgent as any).config.coverage = { persistPath: 'coverage' };

      const result = await (orchestrator as any).analyzeCoverage();

      expect(result).toHaveProperty('coverage');
      expect(result).toHaveProperty('recommendations');
    });

    it('should throw error when no coverage available', async () => {
      (mockAgent as any).coverageAnalyzer = {
        loadCoverageFromFile: jest.fn().mockResolvedValue(null),
      };

      (mockAgent as any).config.coverage = { persistPath: 'coverage' };

      await expect((orchestrator as any).analyzeCoverage()).rejects.toThrow('No coverage data available');
    });

    it('should start watching files', async () => {
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: false });
      mockAgent.start = jest.fn().mockResolvedValue(undefined);
      (mockAgent as any).config = { projectRoot: '/test/project' };

      const result = await (orchestrator as any).startWatching();

      expect(result.message).toBe('Started watching files');
      expect(mockAgent.start).toHaveBeenCalled();
    });

    it('should handle already running when starting watch', async () => {
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: true });

      const result = await (orchestrator as any).startWatching();

      expect(result.message).toBe('Already watching files');
      expect(result.alreadyRunning).toBe(true);
    });

    it('should stop watching files', async () => {
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: true });
      mockAgent.stop = jest.fn();

      const result = await (orchestrator as any).stopWatching();

      expect(result.message).toBe('Stopped watching files');
      expect(mockAgent.stop).toHaveBeenCalled();
    });

    it('should handle already stopped when stopping watch', async () => {
      mockAgent.getStatus = jest.fn().mockReturnValue({ running: false });

      const result = await (orchestrator as any).stopWatching();

      expect(result.message).toBe('Not currently running');
      expect(result.alreadyStopped).toBe(true);
    });

    it('should get status with enabled features', async () => {
      (mockAgent as any).gitIntegration = {
        getCurrentBranch: jest.fn().mockResolvedValue('main'),
      };

      (mockAgent as any).config = {
        projectRoot: '/test/project',
        postman: { enabled: true },
        stagehand: { enabled: true },
        jira: { enabled: true },
        environments: { enabled: true },
        mcp: { enabled: true },
        coverage: { enabled: true },
        testSuites: [
          { type: 'jest', pattern: '**/*.test.ts', command: 'npm test', enabled: true }
        ]
      };

      mockAgent.getStatus = jest.fn().mockReturnValue({ running: true, cursorConnected: true });

      const result = await (orchestrator as any).getStatus();

      expect(result).toHaveProperty('running', true);
      expect(result).toHaveProperty('cursorConnected', true);
      expect(result).toHaveProperty('projectRoot', '/test/project');
      expect(result).toHaveProperty('currentBranch', 'main');
      expect(result).toHaveProperty('enabledFeatures');
      expect(result).toHaveProperty('testSuites');
      expect(result.enabledFeatures).toContain('Postman');
      expect(result.enabledFeatures).toContain('Stagehand');
      expect(result.enabledFeatures).toContain('JIRA');
      expect(result.enabledFeatures).toContain('Environment Monitoring');
      expect(result.enabledFeatures).toContain('MCP');
      expect(result.enabledFeatures).toContain('Coverage Analysis');
    });

    it('should generate commit message', async () => {
      mockAgent.generateCommitMessage = jest.fn().mockResolvedValue('feat: add new feature');

      const result = await (orchestrator as any).generateCommitMessage();

      expect(result).toBe('feat: add new feature');
      expect(mockAgent.generateCommitMessage).toHaveBeenCalled();
    });
  });

  describe('GitHub Integration', () => {
    // Add GitHub integration tests here
  });
});