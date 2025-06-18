import * as Sentry from '@sentry/node';
import { SentryService } from '../../utils/SentryService.js';

jest.mock('@sentry/node');
jest.mock('@sentry/profiling-node');

describe('SentryService', () => {
  let service: SentryService;
  let mockTransaction: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTransaction = {
      setData: jest.fn(),
      finish: jest.fn(),
    };
    
    (Sentry.init as jest.Mock).mockImplementation(() => {});
    (Sentry.captureException as jest.Mock).mockImplementation(() => {});
    (Sentry.addBreadcrumb as jest.Mock).mockImplementation(() => {});
    (Sentry.setUser as jest.Mock).mockImplementation(() => {});
    (Sentry.captureMessage as jest.Mock).mockImplementation(() => {});
    (Sentry.close as jest.Mock).mockResolvedValue(true);
    (Sentry.withScope as jest.Mock).mockImplementation((callback) => {
      const scope = {
        setContext: jest.fn(),
        setExtra: jest.fn(),
        setTag: jest.fn(),
      };
      callback(scope);
    });
    
    // Reset singleton
    (SentryService as any).instance = undefined;
  });
  
  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      
      const instance1 = SentryService.getInstance(config);
      const instance2 = SentryService.getInstance(config);
      
      expect(instance1).toBe(instance2);
    });
  });
  
  describe('initialize', () => {
    it('should initialize Sentry when enabled with DSN', () => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
        environment: 'test',
        release: 'v1.0.0',
        tracesSampleRate: 0.5,
        profilesSampleRate: 0.3,
        debug: true,
      };
      
      service = SentryService.getInstance(config);
      service.initialize();
      
      expect(Sentry.init).toHaveBeenCalledWith({
        dsn: config.dsn,
        environment: config.environment,
        release: config.release,
        tracesSampleRate: config.tracesSampleRate,
        profilesSampleRate: config.profilesSampleRate,
        debug: config.debug,
        integrations: expect.any(Array),
      });
    });
    
    it('should not initialize when disabled', () => {
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      
      service = SentryService.getInstance(config);
      service.initialize();
      
      expect(Sentry.init).not.toHaveBeenCalled();
    });
    
    it('should not initialize when no DSN provided', () => {
      const config = {
        enabled: true,
      };
      
      service = SentryService.getInstance(config);
      service.initialize();
      
      expect(Sentry.init).not.toHaveBeenCalled();
    });
    
    it('should not initialize twice', () => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      
      service = SentryService.getInstance(config);
      service.initialize();
      service.initialize();
      
      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
    
    it('should use default values when not provided', () => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      
      service = SentryService.getInstance(config);
      service.initialize();
      
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: 'development',
          tracesSampleRate: 0.1,
          profilesSampleRate: 0.1,
          debug: false,
        })
      );
    });
  });
  
  describe('captureException', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should capture exception with context', () => {
      const error = new Error('Test error');
      const context = {
        component: 'test-component',
        operation: 'test-operation',
      };
      
      service.captureException(error, context);
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
    
    it('should not capture exception when not initialized', () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      // Create new service without initializing
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      const error = new Error('Test error');
      newService.captureException(error);
      
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
  
  describe('addBreadcrumb', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should add breadcrumb with category and data', () => {
      service.addBreadcrumb('Test message', 'test-category', { key: 'value' });
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test message',
        category: 'test-category',
        data: { key: 'value' },
        timestamp: expect.any(Number),
      });
    });
    
    it('should add breadcrumb without data', () => {
      service.addBreadcrumb('Test message', 'test-category');
      
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Test message',
        category: 'test-category',
        data: undefined,
        timestamp: expect.any(Number),
      });
    });
    
    it('should not add breadcrumb when not initialized', () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      newService.addBreadcrumb('Test message', 'test-category');
      
      expect(Sentry.addBreadcrumb).not.toHaveBeenCalled();
    });
  });
  
  describe('setUser', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should set user context', () => {
      const user = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
      };
      
      service.setUser(user);
      
      expect(Sentry.setUser).toHaveBeenCalledWith(user);
    });
    
    it('should not set user when not initialized', () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      newService.setUser({ id: 'test' });
      
      expect(Sentry.setUser).not.toHaveBeenCalled();
    });
  });
  
  describe('captureMessage', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should capture message with level and context', () => {
      const context = { key: 'value' };
      
      service.captureMessage('Test message', 'error', context);
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'error');
    });
    
    it('should capture message with default info level', () => {
      service.captureMessage('Test message');
      
      expect(Sentry.captureMessage).toHaveBeenCalledWith('Test message', 'info');
    });
    
    it('should not capture message when not initialized', () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      newService.captureMessage('Test message');
      
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });
  });
  
  describe('startTransaction', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should start a transaction', () => {
      const transaction = service.startTransaction('test-name', 'test-operation');
      
      expect(transaction).toHaveProperty('setName');
      expect(transaction).toHaveProperty('setOp');
      expect(transaction).toHaveProperty('finish');
    });
    
    it('should return undefined when not initialized', () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      const transaction = newService.startTransaction('test-name', 'test-operation');
      
      expect(transaction).toBeUndefined();
    });
  });
  
  describe('withErrorHandling', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should execute function and return result', async () => {
      const result = await service.withErrorHandling(
        'test-operation',
        async () => 'test-result',
        { extra: 'context' }
      );
      
      expect(result).toBe('test-result');
    });
    
    it('should capture error and rethrow', async () => {
      const error = new Error('Test error');
      
      await expect(
        service.withErrorHandling(
          'test-operation',
          async () => {
            throw error;
          },
          { extra: 'context' }
        )
      ).rejects.toThrow(error);
      
      expect(Sentry.withScope).toHaveBeenCalled();
      expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });
    
    it('should execute function without capturing when not initialized', async () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      const result = await newService.withErrorHandling(
        'test-operation',
        async () => 'test-result'
      );
      
      expect(result).toBe('test-result');
      expect(Sentry.captureException).not.toHaveBeenCalled();
    });
  });
  
  describe('close', () => {
    beforeEach(() => {
      const config = {
        enabled: true,
        dsn: 'https://test@sentry.io/123',
      };
      service = SentryService.getInstance(config);
      service.initialize();
    });
    
    it('should close Sentry', async () => {
      await service.close();
      
      expect(Sentry.close).toHaveBeenCalledWith(2000);
    });
    
    it('should not close when not initialized', async () => {
      // Reset singleton to force new instance
      (SentryService as any).instance = undefined;
      jest.clearAllMocks();
      
      const config = {
        enabled: false,
        dsn: 'https://test@sentry.io/123',
      };
      const newService = SentryService.getInstance(config);
      
      await newService.close();
      
      expect(Sentry.close).not.toHaveBeenCalled();
    });
  });
});