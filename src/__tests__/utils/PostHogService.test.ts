import { PostHog } from 'posthog-node';
import { PostHogService } from '../../utils/PostHogService.js';

jest.mock('posthog-node');

describe('PostHogService', () => {
  let service: PostHogService;
  let mockClient: jest.Mocked<PostHog>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockClient = {
      capture: jest.fn(),
      identify: jest.fn(),
      shutdown: jest.fn().mockResolvedValue(undefined),
    } as any;
    
    (PostHog as any).mockImplementation(() => mockClient);
    
    // Reset singleton
    (PostHogService as any).instance = undefined;
  });
  
  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
      };
      
      const instance1 = PostHogService.getInstance(config);
      const instance2 = PostHogService.getInstance(config);
      
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('initialize', () => {
    it('should initialize PostHog when enabled with API key', () => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        host: 'https://custom.posthog.com',
      };
      
      service = PostHogService.getInstance(config);
      service.initialize();
      
      expect(PostHog).toHaveBeenCalledWith('test-api-key', {
        host: 'https://custom.posthog.com',
      });
    });
    
    it('should use default host when not provided', () => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
      };
      
      service = PostHogService.getInstance(config);
      service.initialize();
      
      expect(PostHog).toHaveBeenCalledWith('test-api-key', {
        host: 'https://app.posthog.com',
      });
    });
    
    it('should not initialize when disabled', () => {
      const config = {
        enabled: false,
        apiKey: 'test-api-key',
      };
      
      service = PostHogService.getInstance(config);
      service.initialize();
      
      expect(PostHog).not.toHaveBeenCalled();
    });
    
    it('should not initialize when no API key provided', () => {
      const config = {
        enabled: true,
      };
      
      service = PostHogService.getInstance(config);
      service.initialize();
      
      expect(PostHog).not.toHaveBeenCalled();
    });
    
    it('should not initialize twice', () => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
      };
      
      service = PostHogService.getInstance(config);
      service.initialize();
      service.initialize();
      
      expect(PostHog).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('trackTestExecution', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableTestTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track test execution event', () => {
      service.trackTestExecution('unit', true, 1000, 5);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'test_execution',
        properties: {
          test_type: 'unit',
          success: true,
          duration_ms: 1000,
          files_triggered: 5,
          timestamp: expect.any(String),
        },
      });
    });
    
    it('should not track when test tracking disabled', () => {
      // Reset and create new instance
      (PostHogService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableTestTracking: false,
      };
      const newService = PostHogService.getInstance(config);
      newService.initialize();
      
      newService.trackTestExecution('unit', true, 1000, 5);
      
      expect(mockClient.capture).not.toHaveBeenCalled();
    });
  });
  
  describe('trackFileChange', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableUserTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track file change event', () => {
      service.trackFileChange('src/test.ts', 'modified', ['unit', 'integration']);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'file_change',
        properties: {
          file_extension: 'ts',
          change_type: 'modified',
          triggered_test_types: ['unit', 'integration'],
          timestamp: expect.any(String),
        },
      });
    });
    
    it('should not track when user tracking disabled', () => {
      // Reset and create new instance
      (PostHogService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableUserTracking: false,
      };
      const newService = PostHogService.getInstance(config);
      newService.initialize();
      
      newService.trackFileChange('src/test.ts', 'modified', ['unit']);
      
      expect(mockClient.capture).not.toHaveBeenCalled();
    });
  });
  
  describe('trackError', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableErrorTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track error event', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:10:5';
      const context = { component: 'test-component' };
      
      service.trackError(error, context);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'error_occurred',
        properties: {
          error_message: 'Test error',
          error_stack: error.stack,
          error_name: 'Error',
          component: 'test-component',
          timestamp: expect.any(String),
        },
      });
    });
    
    it('should not track when error tracking disabled', () => {
      // Reset and create new instance
      (PostHogService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableErrorTracking: false,
      };
      const newService = PostHogService.getInstance(config);
      newService.initialize();
      
      const error = new Error('Test error');
      newService.trackError(error, {});
      
      expect(mockClient.capture).not.toHaveBeenCalled();
    });
  });
  
  describe('trackAgentStart', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableUserTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track agent start event with sanitized config', () => {
      const config = {
        testSuites: ['unit', 'integration'],
        coverage: { enabled: true, threshold: 80 },
        jira: { enabled: true, apiKey: 'secret' },
        postman: { enabled: false },
        stagehand: { enabled: true },
        complexity: { enabled: true },
        criticalPaths: { enabled: false },
      };
      
      service.trackAgentStart(config);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'agent_start',
        properties: {
          test_suites_count: 2,
          has_coverage: true,
          has_jira: true,
          has_postman: false,
          has_stagehand: true,
          has_complexity: true,
          has_critical_paths: false,
          timestamp: expect.any(String),
        },
      });
    });
  });
  
  describe('trackPerformance', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableTestTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track performance metric', () => {
      const metadata = { component: 'test-component' };
      
      service.trackPerformance('test-operation', 500, true, metadata);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'performance_metric',
        properties: {
          operation: 'test-operation',
          duration_ms: 500,
          success: true,
          component: 'test-component',
          timestamp: expect.any(String),
        },
      });
    });
  });
  
  describe('identifyUser', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableUserTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should identify user with properties', () => {
      const properties = {
        project_root: '/test/project',
        config_file: 'test.config.js',
      };
      
      service.identifyUser(properties);
      
      expect(mockClient.identify).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        properties: {
          project_root: '/test/project',
          config_file: 'test.config.js',
          last_seen: expect.any(String),
        },
      });
    });
    
    it('should not identify when user tracking disabled', () => {
      // Reset and create new instance
      (PostHogService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableUserTracking: false,
      };
      const newService = PostHogService.getInstance(config);
      newService.initialize();
      
      newService.identifyUser({ project: 'test' });
      
      expect(mockClient.identify).not.toHaveBeenCalled();
    });
  });
  
  describe('trackCoverageAnalysis', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
        enableTestTracking: true,
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should track coverage analysis event', () => {
      service.trackCoverageAnalysis(80, 45, 50, 8);
      
      expect(mockClient.capture).toHaveBeenCalledWith({
        distinctId: expect.any(String),
        event: 'coverage_analysis',
        properties: {
          overall_coverage: 80,
          files_covered: 45,
          total_files: 50,
          critical_paths_covered: 8,
          timestamp: expect.any(String),
        },
      });
    });
  });
  
  describe('shutdown', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        apiKey: 'test-api-key',
      };
      service = PostHogService.getInstance(config);
      service.initialize();
    });
    
    it('should shutdown PostHog client', async () => {
      await service.shutdown();
      
      expect(mockClient.shutdown).toHaveBeenCalled();
    });
    
    it('should not shutdown when client not initialized', async () => {
      // Reset and create new instance
      (PostHogService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        apiKey: 'test-api-key',
      };
      const newService = PostHogService.getInstance(config);
      
      await newService.shutdown();
      
      expect(mockClient.shutdown).not.toHaveBeenCalled();
    });
  });
});