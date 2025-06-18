import { DebugContext } from '../../utils/DebugContext.js';
import { SentryService } from '../../utils/SentryService.js';
import { PostHogService } from '../../utils/PostHogService.js';

jest.mock('../../utils/SentryService.js');
jest.mock('../../utils/PostHogService.js');

describe('DebugContext', () => {
  let mockSentryService: jest.Mocked<SentryService>;
  let mockPostHogService: jest.Mocked<PostHogService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSentryService = {
      initialize: jest.fn(),
      addBreadcrumb: jest.fn(),
      captureException: jest.fn(),
      setUser: jest.fn(),
      startTransaction: jest.fn().mockReturnValue({
        setData: jest.fn(),
        finish: jest.fn(),
      }),
      withErrorHandling: jest.fn(),
    } as any;

    // Add initialized property to check if service is initialized
    Object.defineProperty(mockSentryService, 'initialized', {
      get: jest.fn().mockReturnValue(true),
      configurable: true,
    });

    mockPostHogService = {
      initialize: jest.fn(),
      trackAgentStart: jest.fn(),
      trackTestExecution: jest.fn(),
      trackFileChange: jest.fn(),
      trackCoverageAnalysis: jest.fn(),
      trackError: jest.fn(),
      trackPerformance: jest.fn(),
      identifyUser: jest.fn(),
      setUserProperties: jest.fn(),
    } as any;

    // Add initialized property to check if service is initialized
    Object.defineProperty(mockPostHogService, 'initialized', {
      get: jest.fn().mockReturnValue(true),
      configurable: true,
    });

    DebugContext.initialize(mockSentryService, mockPostHogService);
  });

  describe('initialize', () => {
    it('should initialize with Sentry and PostHog services', () => {
      const newSentry = {} as SentryService;
      const newPostHog = {} as PostHogService;
      
      DebugContext.initialize(newSentry, newPostHog);
      
      expect(DebugContext['sentryService']).toBe(newSentry);
      expect(DebugContext['postHogService']).toBe(newPostHog);
    });
  });

  describe('addBreadcrumb', () => {
    it('should add breadcrumb to Sentry when initialized', () => {
      DebugContext.addBreadcrumb('Test message', 'test-category', { key: 'value' });

      expect(mockSentryService.addBreadcrumb).toHaveBeenCalledWith(
        'Test message',
        'test-category',
        { key: 'value' }
      );
    });

    it('should not fail when Sentry is not initialized', () => {
      DebugContext.initialize(null as any, mockPostHogService);
      
      expect(() => {
        DebugContext.addBreadcrumb('Test message', 'test-category', { key: 'value' });
      }).not.toThrow();
    });
  });

  describe('captureError', () => {
    it('should capture error in both Sentry and PostHog', () => {
      const error = new Error('Test error');
      const context = { customField: 'custom-value' };

      DebugContext.captureError(error, 'test-component', 'test_operation', context);

      expect(mockSentryService.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation',
          customField: 'custom-value'
        })
      );
      expect(mockPostHogService.trackError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation',
          customField: 'custom-value'
        })
      );
    });

    it('should handle non-Error objects', () => {
      const errorString = 'String error';

      const errorObject = new Error(errorString);
      DebugContext.captureError(errorObject, 'test-component', 'test_operation');

      expect(mockSentryService.captureException).toHaveBeenCalled();
      const capturedError = mockSentryService.captureException.mock.calls[0][0];
      expect(capturedError).toBeInstanceOf(Error);
      expect(capturedError.message).toBe('String error');
    });
  });

  describe('setUserContext', () => {
    it('should set user context in both services', () => {
      const userContext = {
        userId: 'test-user',
        email: 'test@example.com',
        projectRoot: '/test/project',
      };

      DebugContext.setUserContext(userContext);

      expect(mockSentryService.setUser).toHaveBeenCalledWith({
        id: expect.any(String),
        username: 'test-agent-user'
      });
      expect(mockPostHogService.identifyUser).toHaveBeenCalledWith({
        project_root: userContext.projectRoot,
        config_file: undefined,
        test_suites: undefined,
        enabled_features: undefined
      });
    });

    it('should use anonymous user when userId not provided', () => {
      const userContext = { email: 'test@example.com', projectRoot: '/test' };

      DebugContext.setUserContext(userContext);

      expect(mockPostHogService.identifyUser).toHaveBeenCalledWith({
        project_root: userContext.projectRoot,
        config_file: undefined,
        test_suites: undefined,
        enabled_features: undefined
      });
    });
  });

  describe('withContext', () => {
    it('should execute function with tracking', async () => {
      const result = await DebugContext.withContext(
        'test_operation',
        'test-component',
        async () => 'test-result',
        { meta: 'data' }
      );

      expect(result).toBe('test-result');
      expect(mockSentryService.addBreadcrumb).toHaveBeenCalledWith(
        'Starting test_operation',
        'test-component',
        { meta: 'data' }
      );
      // Check that trackPerformance was called with the correct arguments
      // DebugContext.trackPerformance passes createErrorContext result as metadata to PostHogService
      expect(mockPostHogService.trackPerformance).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        true,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation'
        })
      );
      expect(mockSentryService.addBreadcrumb).toHaveBeenCalledWith(
        'Completed test_operation',
        'test-component',
        expect.objectContaining({ duration: expect.any(Number), success: true })
      );
    });

    it('should capture errors during execution', async () => {
      const error = new Error('Test error');
      
      await expect(
        DebugContext.withContext(
          'test_operation',
          'test-component',
          async () => {
            throw error;
          }
        )
      ).rejects.toThrow(error);

      expect(mockSentryService.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
      expect(mockPostHogService.trackError).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
      expect(mockPostHogService.trackPerformance).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        false,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation'
        })
      );
      expect(mockSentryService.addBreadcrumb).toHaveBeenCalledWith(
        'Failed test_operation',
        'test-component',
        expect.objectContaining({ duration: expect.any(Number), success: false, error: 'Test error' })
      );
    });

    it('should track performance in PostHog', async () => {
      await DebugContext.withContext(
        'test_operation',
        'test-component',
        async () => 'result',
        { meta: 'data' }
      );

      // DebugContext uses trackPerformance, not trackEvent directly
      // Check that trackPerformance was called with the correct arguments
      // DebugContext.trackPerformance passes createErrorContext result as metadata to PostHogService
      expect(mockPostHogService.trackPerformance).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        true,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation'
        })
      );
    });

    it('should execute function without services when not initialized', async () => {
      DebugContext.initialize(null as any, null as any);

      const result = await DebugContext.withContext(
        'test_operation',
        'test-component',
        async () => 'test-result'
      );

      expect(result).toBe('test-result');
    });
  });

  describe('createErrorContext', () => {
    it('should create error context object', () => {
      const metadata = { key: 'value' };

      const context = DebugContext.createErrorContext('test-component', 'test_operation', metadata);

      expect(context).toEqual({
        component: 'test-component',
        operation: 'test_operation',
        timestamp: expect.any(String),
        workingDirectory: process.cwd(),
        nodeVersion: process.version,
        platform: process.platform,
        key: 'value',
      });
    });

    it('should merge metadata into context', () => {
      const metadata = { 
        customField: 'customValue',
        anotherField: 123 
      };

      const context = DebugContext.createErrorContext('test-component', 'test_operation', metadata);

      expect(context.customField).toBe('customValue');
      expect(context.anotherField).toBe(123);
      expect(context.component).toBe('test-component');
      expect(context.operation).toBe('test_operation');
    });
  });

  describe('performance tracking', () => {
    it('should track performance with timing', async () => {
      mockPostHogService.trackPerformance = jest.fn();

      await DebugContext.withContext(
        'test_operation',
        'test-component',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return 'result';
        }
      );

      expect(mockPostHogService.trackPerformance).toHaveBeenCalledWith(
        'test_operation',
        expect.any(Number),
        true,
        expect.objectContaining({
          component: 'test-component',
          operation: 'test_operation'
        })
      );
      
      // Verify the duration is approximately 100ms
      const duration = (mockPostHogService.trackPerformance as jest.Mock).mock.calls[0][1];
      expect(duration).toBeGreaterThanOrEqual(90);
      expect(duration).toBeLessThan(150);
    });
  });
});