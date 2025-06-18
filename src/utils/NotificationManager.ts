import chalk from 'chalk';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

export interface NotificationConfig {
  enabled?: boolean;
  channels?: NotificationChannel[];
  systemNotifications?: boolean;
  consoleOutput?: boolean;
  webSocket?: boolean;
  slack?: {
    webhookUrl?: string;
    channel?: string;
  };
}

export interface NotificationChannel {
  type: 'console' | 'system' | 'websocket' | 'slack' | 'custom';
  enabled: boolean;
  config?: any;
}

export interface Notification {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  icon?: string;
  timestamp: Date;
  data?: any;
}

export class NotificationManager extends EventEmitter {
  private config: NotificationConfig;
  private platform: string;

  constructor(config: NotificationConfig = {}) {
    super();
    this.config = {
      enabled: true,
      consoleOutput: true,
      systemNotifications: false,
      webSocket: true,
      ...config,
    };
    this.platform = os.platform();
  }

  async notify(notification: Notification): Promise<void> {
    if (!this.config.enabled) return;

    // Console output
    if (this.config.consoleOutput) {
      this.consoleNotify(notification);
    }

    // System notifications
    if (this.config.systemNotifications) {
      await this.systemNotify(notification);
    }

    // WebSocket notifications (emit event for CursorIntegration)
    if (this.config.webSocket) {
      this.emit('notification', notification);
    }

    // Slack notifications
    if (this.config.slack?.webhookUrl) {
      await this.slackNotify(notification);
    }

    // Custom channels
    if (this.config.channels) {
      for (const channel of this.config.channels) {
        if (channel.enabled && channel.type === 'custom') {
          this.emit('custom-notification', { channel, notification });
        }
      }
    }
  }

  private consoleNotify(notification: Notification): void {
    const icon = notification.icon || this.getIcon(notification.type);
    const color = this.getColor(notification.type);

    console.log(color(`\n${icon} ${notification.title}`));
    if (notification.message) {
      console.log(chalk.gray(notification.message));
    }
  }

  private async systemNotify(notification: Notification): Promise<void> {
    try {
      const icon = notification.icon || this.getIcon(notification.type);
      const title = `${icon} ${notification.title}`;

      switch (this.platform) {
        case 'darwin': // macOS
          await execAsync(
            `osascript -e 'display notification "${notification.message}" with title "${title}"'`,
          );
          break;

        case 'linux':
          // Check if notify-send is available
          try {
            await execAsync('which notify-send');
            await execAsync(`notify-send "${title}" "${notification.message}"`);
          } catch {
            // Fall back to console if notify-send not available
            console.log(chalk.yellow('System notifications not available - install libnotify-bin'));
          }
          break;

        case 'win32': // Windows
          // Use PowerShell for Windows notifications
          const psCommand = `
            [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
            [Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
            [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
            
            $APP_ID = 'Test Running Agent'
            
            $template = @"
            <toast>
              <visual>
                <binding template="ToastText02">
                  <text id="1">${title}</text>
                  <text id="2">${notification.message}</text>
                </binding>
              </visual>
            </toast>
"@
            
            $xml = New-Object Windows.Data.Xml.Dom.XmlDocument
            $xml.LoadXml($template)
            $toast = New-Object Windows.UI.Notifications.ToastNotification $xml
            [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($APP_ID).Show($toast)
          `;

          await execAsync(`powershell -Command "${psCommand.replace(/\n/g, ' ')}"`);
          break;
      }
    } catch (error) {
      // Silently fail for system notifications
      console.debug('System notification failed:', error);
    }
  }

  private async slackNotify(notification: Notification): Promise<void> {
    if (!this.config.slack?.webhookUrl) return;

    try {
      const { default: fetch } = await import('node-fetch');

      const color = {
        info: '#36a64f',
        success: '#2eb886',
        warning: '#ff9800',
        error: '#ff5252',
      }[notification.type];

      const payload = {
        channel: this.config.slack.channel,
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            footer: 'Test Running Agent',
            ts: Math.floor(notification.timestamp.getTime() / 1000),
          },
        ],
      };

      await fetch(this.config.slack.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.debug('Slack notification failed:', error);
    }
  }

  private getIcon(type: Notification['type']): string {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  }

  private getColor(type: Notification['type']): (text: string) => string {
    switch (type) {
      case 'success':
        return chalk.green;
      case 'error':
        return chalk.red;
      case 'warning':
        return chalk.yellow;
      case 'info':
      default:
        return chalk.blue;
    }
  }

  // Convenience methods
  info(title: string, message?: string, data?: any): Promise<void> {
    return this.notify({
      title,
      message: message || '',
      type: 'info',
      timestamp: new Date(),
      data,
    });
  }

  success(title: string, message?: string, data?: any): Promise<void> {
    return this.notify({
      title,
      message: message || '',
      type: 'success',
      timestamp: new Date(),
      data,
    });
  }

  warning(title: string, message?: string, data?: any): Promise<void> {
    return this.notify({
      title,
      message: message || '',
      type: 'warning',
      timestamp: new Date(),
      data,
    });
  }

  error(title: string, message?: string, data?: any): Promise<void> {
    return this.notify({
      title,
      message: message || '',
      type: 'error',
      timestamp: new Date(),
      data,
    });
  }

  // Test notification
  async testNotifications(): Promise<void> {
    await this.info('Test Notification', 'Testing all notification channels');
    await this.success('Tests Passed', 'All 42 tests passed successfully');
    await this.warning('Low Coverage', 'Code coverage is below threshold (65%)');
    await this.error('Test Failed', 'Authentication test suite failed');
  }
}
