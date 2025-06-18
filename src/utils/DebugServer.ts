import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TestRunningAgent } from '../Agent.js';
import { Config } from '../types/index.js';
import { DebugContext } from './DebugContext.js';
import chalk from 'chalk';

interface DebugServerOptions {
  port: number;
  agent: TestRunningAgent;
  config: Config;
  configPath: string;
}

export class DebugServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer;
  private agent: TestRunningAgent;
  private config: Config;
  private configPath: string;
  private port: number;
  private logs: any[] = [];
  private metrics: any = null;
  private testResults: any[] = [];

  constructor(options: DebugServerOptions) {
    this.port = options.port;
    this.agent = options.agent;
    this.config = options.config;
    this.configPath = options.configPath;

    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupAgentListeners();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.static('dist/debug-ui'));
  }

  private setupRoutes(): void {
    // API Routes
    this.app.get('/api/status', (req, res) => {
      const status = this.agent.getStatus();
      const systemInfo = this.getSystemInfo();
      
      res.json({
        ...status,
        systemInfo,
        lastActivity: new Date().toISOString(),
        performance: this.getPerformanceMetrics(),
      });
    });

    this.app.get('/api/config', (req, res) => {
      res.json(this.config);
    });

    this.app.put('/api/config', async (req, res) => {
      try {
        const newConfig = req.body;
        await this.saveConfig(newConfig);
        this.config = newConfig;
        
        // Broadcast config update
        this.broadcast({
          type: 'config-updated',
          payload: newConfig,
        });

        res.json(newConfig);
      } catch (error) {
        DebugContext.captureError(error as Error, 'debug-server', 'config_update');
        res.status(500).json({ error: 'Failed to update configuration' });
      }
    });

    this.app.post('/api/agent/:action', async (req: any, res: any) => {
      const { action } = req.params;
      
      try {
        switch (action) {
          case 'start':
            await this.agent.start();
            break;
          case 'stop':
            await this.agent.stop();
            break;
          case 'restart':
            await this.agent.stop();
            setTimeout(() => this.agent.start(), 1000);
            break;
          default:
            return res.status(400).json({ error: 'Invalid action' });
        }
        
        res.json({ success: true });
      } catch (error) {
        DebugContext.captureError(error as Error, 'debug-server', `agent_${action}`);
        res.status(500).json({ error: `Failed to ${action} agent` });
      }
    });

    this.app.get('/api/logs', (req, res) => {
      const { level, component, limit = 1000 } = req.query;
      
      let filteredLogs = this.logs;
      
      if (level && level !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.level === level);
      }
      
      if (component && component !== 'all') {
        filteredLogs = filteredLogs.filter(log => log.component === component);
      }
      
      res.json(filteredLogs.slice(-Number(limit)));
    });

    this.app.delete('/api/logs', (req, res) => {
      this.logs = [];
      this.broadcast({
        type: 'logs-cleared',
        payload: {},
      });
      res.json({ success: true });
    });

    this.app.get('/api/metrics', (req, res) => {
      res.json(this.generateMetrics());
    });

    this.app.get('/api/test-results', (req, res) => {
      res.json(this.testResults);
    });

    this.app.post('/api/run-tests', async (req, res) => {
      try {
        const { suites, files } = req.body;
        
        // Trigger test run through agent
        const results = await this.agent['testRunner'].runTestSuites(
          suites || this.config.testSuites,
          files?.map((f: string) => ({ path: f, type: 'change', timestamp: new Date() })) || [],
          this.config.projectRoot,
          this.config.coverage?.enabled || false
        );
        
        res.json(results);
      } catch (error) {
        DebugContext.captureError(error as Error, 'debug-server', 'run_tests');
        res.status(500).json({ error: 'Failed to run tests' });
      }
    });

    this.app.post('/api/prompt', async (req, res) => {
      try {
        const { prompt } = req.body;
        
        this.addLog('info', 'prompt', `User prompt: ${prompt}`);
        
        // Process the prompt and generate response
        const response = await this.processPrompt(prompt);
        
        this.addLog('info', 'prompt', `Agent response: ${response.response}`);
        
        res.json(response);
      } catch (error) {
        DebugContext.captureError(error as Error, 'debug-server', 'process_prompt');
        res.status(500).json({ 
          response: 'Sorry, I encountered an error processing your request.',
          error: (error as Error).message 
        });
      }
    });

    // Serve React app for all other routes
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist/debug-ui/index.html'));
    });
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const url = req.url;
      
      if (url === '/console') {
        console.log(chalk.blue('🔌 Console client connected'));
        this.setupConsoleWebSocket(ws);
      } else {
        console.log(chalk.blue('🔌 Debug UI client connected'));
        this.setupMainWebSocket(ws);
      }
    });
  }

  private setupMainWebSocket(ws: any): void {
    // Send initial data
    ws.send(JSON.stringify({
      type: 'initial-data',
      payload: {
        status: this.agent.getStatus(),
        config: this.config,
        logs: this.logs.slice(-100),
        testResults: this.testResults.slice(-20),
        metrics: this.generateMetrics(),
      },
    }));

    ws.on('close', () => {
      console.log(chalk.yellow('🔌 Debug UI client disconnected'));
    });

    ws.on('message', (data: any) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleWebSocketMessage(ws, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
  }

  private setupConsoleWebSocket(ws: any): void {
    // Send initial console entries
    ws.send(JSON.stringify({
      type: 'console-history',
      entries: this.logs.slice(-100).map(log => ({
        type: 'log',
        level: log.level,
        component: log.component,
        message: log.message,
        metadata: log.metadata,
        timestamp: log.timestamp,
      })),
    }));

    ws.on('close', () => {
      console.log(chalk.yellow('🔌 Console client disconnected'));
    });

    // Store reference for broadcasting console messages
    if (!this.consoleClients) {
      this.consoleClients = new Set();
    }
    this.consoleClients.add(ws);

    ws.on('close', () => {
      this.consoleClients?.delete(ws);
    });
  }

  private consoleClients?: Set<any>;

  private handleWebSocketMessage(ws: any, message: any): void {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'request-status':
        ws.send(JSON.stringify({
          type: 'agent-status',
          payload: this.agent.getStatus(),
        }));
        break;
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private setupAgentListeners(): void {
    // Listen to agent events and broadcast to connected clients
    this.agent.on('started', () => {
      this.addLog('info', 'agent', 'Agent started');
      this.broadcast({
        type: 'agent-status',
        payload: { running: true },
      });
    });

    this.agent.on('stopped', () => {
      this.addLog('info', 'agent', 'Agent stopped');
      this.broadcast({
        type: 'agent-status',
        payload: { running: false },
      });
    });

    this.agent.on('test-results', (results) => {
      const formattedResults = results.map((result: any) => ({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        ...result,
      }));
      
      this.testResults.push(...formattedResults);
      
      // Keep only last 100 results
      if (this.testResults.length > 100) {
        this.testResults = this.testResults.slice(-100);
      }

      // Log test results to console
      results.forEach((result: any) => {
        this.broadcastToConsole({
          type: 'test-complete',
          suite: result.suite,
          success: result.success,
          duration: result.duration,
          message: `${result.success ? '✅' : '❌'} ${result.suite} tests ${result.success ? 'passed' : 'failed'} (${result.duration}ms)`,
        });

        if (result.coverage) {
          this.broadcastToConsole({
            type: 'coverage-update',
            percentage: result.coverage.lines.percentage,
            message: `📊 Coverage: ${result.coverage.lines.percentage.toFixed(1)}%`,
          });
        }
      });

      this.broadcast({
        type: 'test-results',
        payload: formattedResults,
      });
    });

    this.agent.on('error', (error) => {
      this.addLog('error', 'agent', `Agent error: ${error.message}`, { stack: error.stack });
    });
  }

  private addLog(level: string, component: string, message: string, metadata?: any): void {
    const log = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      metadata,
    };

    this.logs.push(log);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Broadcast to main WebSocket clients
    this.broadcast({
      type: 'log',
      payload: log,
    });

    // Broadcast to console clients
    this.broadcastToConsole({
      type: 'log',
      level,
      component,
      message,
      metadata,
      timestamp: log.timestamp,
    });
  }

  private broadcastToConsole(message: any): void {
    if (this.consoleClients) {
      this.consoleClients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  private broadcast(message: any): void {
    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  private getSystemInfo(): any {
    return {
      cpu: Math.random() * 100, // Mock data - replace with actual system monitoring
      memory: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100,
      disk: Math.random() * 100,
      network: {
        rx: Math.random() * 1024 * 10,
        tx: Math.random() * 1024 * 5,
      },
    };
  }

  private getPerformanceMetrics(): any {
    const recentResults = this.testResults.slice(-20);
    
    if (recentResults.length === 0) {
      return {
        avgTestDuration: 0,
        successRate: 0,
        errorRate: 0,
      };
    }

    const avgDuration = recentResults.reduce((sum, r) => sum + (r.duration || 0), 0) / recentResults.length;
    const successCount = recentResults.filter(r => r.success).length;
    const successRate = (successCount / recentResults.length) * 100;
    const errorRate = 100 - successRate;

    return {
      avgTestDuration: avgDuration,
      successRate,
      errorRate,
    };
  }

  private generateMetrics(): any {
    const recentResults = this.testResults.slice(-50);
    const recentLogs = this.logs.slice(-100);
    
    return {
      testExecution: {
        totalTests: this.testResults.length,
        avgDuration: recentResults.reduce((sum, r) => sum + (r.duration || 0), 0) / Math.max(recentResults.length, 1),
        successRate: recentResults.length > 0 ? (recentResults.filter(r => r.success).length / recentResults.length) * 100 : 0,
        throughput: recentResults.length,
      },
      coverage: {
        overall: 75.5, // Mock data - replace with actual coverage calculation
        trend: 'up',
        files: 45,
        criticalPaths: 8,
      },
      complexity: {
        avgComplexity: 6.2,
        highComplexityFiles: 3,
        complexityTrend: 'stable',
      },
      system: this.getSystemInfo(),
      errors: {
        totalErrors: recentLogs.filter(log => log.level === 'error').length,
        errorRate: (recentLogs.filter(log => log.level === 'error').length / Math.max(recentLogs.length, 1)) * 100,
        topErrors: [
          { message: 'Test timeout', count: 5 },
          { message: 'Coverage threshold not met', count: 3 },
          { message: 'File not found', count: 2 },
        ],
      },
      fileChanges: {
        totalChanges: 24,
        avgFilesPerChange: 2.3,
        mostActiveFiles: [
          { file: 'src/components/Button.tsx', changes: 8 },
          { file: 'src/utils/helper.ts', changes: 5 },
          { file: 'src/api/auth.ts', changes: 4 },
        ],
      },
    };
  }

  private async processPrompt(prompt: string): Promise<{ response: string; metadata?: any }> {
    const lowerPrompt = prompt.toLowerCase().trim();
    
    // Status-related prompts
    if (lowerPrompt.includes('status') || lowerPrompt.includes('running')) {
      const status = this.agent.getStatus();
      return {
        response: `Agent is currently ${status.running ? 'running' : 'stopped'}. ${
          status.cursorConnected ? 'Cursor is connected.' : 'Cursor is not connected.'
        } Last activity: ${new Date().toLocaleTimeString()}`,
        metadata: { status }
      };
    }
    
    // Test-related prompts
    if (lowerPrompt.includes('test') && (lowerPrompt.includes('run') || lowerPrompt.includes('execute'))) {
      try {
        const results = await this.agent['testRunner'].runTestSuites(
          this.config.testSuites,
          [],
          this.config.projectRoot,
          this.config.coverage?.enabled || false
        );
        
        const passed = results.filter(r => r.success).length;
        const failed = results.length - passed;
        
        return {
          response: `Executed ${results.length} test suites. ${passed} passed, ${failed} failed.`,
          metadata: { results }
        };
      } catch (error) {
        return {
          response: `Failed to run tests: ${(error as Error).message}`,
          metadata: { error: (error as Error).message }
        };
      }
    }
    
    // Coverage-related prompts
    if (lowerPrompt.includes('coverage')) {
      const recentResults = this.testResults.slice(-10);
      const coverageResults = recentResults.filter(r => r.coverage);
      
      if (coverageResults.length > 0) {
        const avgCoverage = coverageResults.reduce((sum, r) => sum + r.coverage.lines.percentage, 0) / coverageResults.length;
        return {
          response: `Recent average coverage: ${avgCoverage.toFixed(1)}%. Based on ${coverageResults.length} test runs.`,
          metadata: { coverage: coverageResults }
        };
      } else {
        return {
          response: 'No recent coverage data available. Run tests with coverage enabled to get coverage information.',
          metadata: {}
        };
      }
    }
    
    // Configuration prompts
    if (lowerPrompt.includes('config') || lowerPrompt.includes('configuration')) {
      const enabledFeatures = [];
      if (this.config.coverage?.enabled) enabledFeatures.push('coverage analysis');
      if (this.config.complexity?.enabled) enabledFeatures.push('complexity monitoring');
      if (this.config.postman?.enabled) enabledFeatures.push('Postman API testing');
      if (this.config.stagehand?.enabled) enabledFeatures.push('Stagehand UI testing');
      if (this.config.jira?.enabled) enabledFeatures.push('JIRA integration');
      if (this.config.sentry?.enabled) enabledFeatures.push('Sentry error tracking');
      if (this.config.posthog?.enabled) enabledFeatures.push('PostHog analytics');
      
      return {
        response: `Current configuration includes: ${enabledFeatures.join(', ') || 'basic test running'}.`,
        metadata: { 
          features: enabledFeatures,
          testSuites: this.config.testSuites.length,
          projectRoot: this.config.projectRoot
        }
      };
    }
    
    // Metrics and performance
    if (lowerPrompt.includes('metric') || lowerPrompt.includes('performance')) {
      const metrics = this.generateMetrics();
      return {
        response: `Performance metrics: ${metrics.testExecution.totalTests} total tests, ${metrics.testExecution.successRate.toFixed(1)}% success rate, average duration: ${metrics.testExecution.avgDuration.toFixed(0)}ms.`,
        metadata: { metrics }
      };
    }
    
    // Logs and errors
    if (lowerPrompt.includes('error') || lowerPrompt.includes('log')) {
      const recentErrors = this.logs.filter(log => log.level === 'error').slice(-5);
      if (recentErrors.length > 0) {
        return {
          response: `Found ${recentErrors.length} recent errors. Most recent: ${recentErrors[recentErrors.length - 1].message}`,
          metadata: { errors: recentErrors }
        };
      } else {
        return {
          response: 'No recent errors found. System is running smoothly!',
          metadata: { errorCount: 0 }
        };
      }
    }
    
    // Help and capabilities
    if (lowerPrompt.includes('help') || lowerPrompt.includes('what can you')) {
      return {
        response: `I can help you with:
• Check agent status and configuration
• Run tests and analyze results
• Show coverage and performance metrics
• Display recent errors and logs
• Manage configuration settings
• Provide test recommendations

Try asking: "Run all tests", "Show coverage", "What's the current status?", or "Show recent errors"`,
        metadata: { capabilities: ['status', 'tests', 'coverage', 'metrics', 'errors', 'config'] }
      };
    }
    
    // Default response for unrecognized prompts
    return {
      response: `I'm not sure how to help with that. I can assist with agent status, running tests, checking coverage, viewing metrics, and configuration management. Type "help" to see what I can do.`,
      metadata: { unrecognized: true, originalPrompt: prompt }
    };
  }

  private async saveConfig(config: Config): Promise<void> {
    try {
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
      this.addLog('info', 'debug-server', 'Configuration saved successfully');
    } catch (error) {
      this.addLog('error', 'debug-server', `Failed to save configuration: ${(error as Error).message}`);
      throw error;
    }
  }

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        console.log(chalk.green(`🚀 Debug UI server started on http://localhost:${this.port}`));
        this.addLog('info', 'debug-server', `Debug server started on port ${this.port}`);
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      this.wss.close();
      this.server.close(() => {
        console.log(chalk.yellow('🛑 Debug UI server stopped'));
        this.addLog('info', 'debug-server', 'Debug server stopped');
        resolve();
      });
    });
  }
}