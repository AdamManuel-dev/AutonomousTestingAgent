import { WebSocket, WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import chalk from 'chalk';
import { TestResult } from '../types/index.js';

interface CursorMessage {
  type: 'test-result' | 'file-change' | 'status' | 'notification';
  data: any;
}

export class CursorIntegration extends EventEmitter {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private port: number;

  constructor(port: number = 3456) {
    super();
    this.port = port;
  }

  /**
   * Start the WebSocket server for Cursor IDE integration
   */
  start(): void {
    if (this.wss) {
      console.log('Cursor integration server is already running');
      return;
    }

    this.wss = new WebSocketServer({ port: this.port });

    this.wss.on('connection', (ws) => {
      console.log(chalk.green('✅ Cursor IDE connected'));
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(data, ws);
        } catch (error) {
          console.error('Failed to parse message from Cursor:', error);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(chalk.yellow('⚠️  Cursor IDE disconnected'));
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      // Send initial status
      this.sendMessage(ws, {
        type: 'status',
        data: { connected: true, agentReady: true },
      });
    });

    console.log(chalk.blue(`🔌 Cursor integration server listening on port ${this.port}`));
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.wss) {
      for (const client of this.clients) {
        client.close();
      }
      this.clients.clear();
      
      this.wss.close(() => {
        console.log('Cursor integration server stopped');
      });
      this.wss = null;
    }
  }

  /**
   * Send test results to all connected Cursor instances
   */
  broadcastTestResults(results: TestResult[]): void {
    const message: CursorMessage = {
      type: 'test-result',
      data: results,
    };

    this.broadcast(message);
  }

  /**
   * Send file change notifications to Cursor
   */
  broadcastFileChange(files: string[]): void {
    const message: CursorMessage = {
      type: 'file-change',
      data: { files, timestamp: new Date() },
    };

    this.broadcast(message);
  }

  /**
   * Handle incoming messages from Cursor
   */
  private handleMessage(message: any, ws: WebSocket): void {
    switch (message.type) {
      case 'run-tests':
        this.emit('run-tests', message.data);
        break;
      case 'stop-tests':
        this.emit('stop-tests');
        break;
      case 'get-status':
        this.sendMessage(ws, {
          type: 'status',
          data: { connected: true, agentReady: true },
        });
        break;
      default:
        console.warn('Unknown message type from Cursor:', message.type);
    }
  }

  /**
   * Send a message to a specific client
   */
  private sendMessage(ws: WebSocket, message: CursorMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send notification to all connected Cursor instances
   */
  broadcastNotification(notification: any): void {
    const message: CursorMessage = {
      type: 'notification',
      data: notification,
    };

    this.broadcast(message);
  }

  /**
   * Broadcast a message to all connected clients
   */
  private broadcast(message: CursorMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    }
  }
}