import chalk from 'chalk';
import { EnvironmentConfig } from '../types/index.js';

// TEST CHANGE

interface Environment {
  name: string;
  branch: string;
  status: 'up' | 'down' | 'unknown';
  lastDeployment?: string;
  url?: string;
  buildNumber?: string;
  deployedBy?: string;
}

export class EnvironmentChecker {
  private config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  async checkEnvironments(): Promise<Environment[]> {
    if (!this.config.enabled || !this.config.checkUrl) {
      return [];
    }

    try {
      console.log(chalk.blue('🌍 Checking Jenkins deployment environments...'));

      const { default: fetch } = await import('node-fetch');
      const response = await fetch(this.config.checkUrl);
      const html = await response.text();

      // Parse Jenkins environment page HTML
      const environments = this.parseJenkinsEnvironments(html);

      return environments;
    } catch (error) {
      console.error(chalk.red('Failed to check Jenkins environments'), error);
      return [];
    }
  }

  private parseJenkinsEnvironments(html: string): Environment[] {
    const environments: Environment[] = [];

    // This is a simplified parser - adjust based on your actual Jenkins page structure
    // Look for environment blocks in the HTML
    const envRegex = /<div class="environment"[^>]*>[\s\S]*?<\/div>/g;
    const matches = html.match(envRegex) || [];

    for (const match of matches) {
      const nameMatch = match.match(/data-env-name="([^"]+)"/);
      const branchMatch = match.match(/data-branch="([^"]+)"/);
      const statusMatch = match.match(/data-status="([^"]+)"/);
      const urlMatch = match.match(/href="(https?:\/\/[^"]+)"/);
      const buildMatch = match.match(/Build #(\d+)/);

      if (nameMatch && branchMatch) {
        environments.push({
          name: nameMatch[1],
          branch: branchMatch[1],
          status: (statusMatch?.[1] as 'up' | 'down') || 'unknown',
          url: urlMatch?.[1],
          buildNumber: buildMatch?.[1],
        });
      }
    }

    // Alternative: Look for table rows if Jenkins uses a table format
    if (environments.length === 0) {
      const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/g;
      const rows = html.match(rowRegex) || [];

      for (const row of rows) {
        if (row.includes('environment') || row.includes('deployment')) {
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || [];
          if (cells.length >= 2) {
            const name = cells[0] ? this.extractText(cells[0]) : '';
            const branch = cells[1] ? this.extractText(cells[1]) : '';
            const status = cells[2] ? this.extractText(cells[2]) : 'unknown';

            if (name && branch) {
              environments.push({
                name,
                branch,
                status: status.toLowerCase().includes('running')
                  ? 'up'
                  : status.toLowerCase().includes('stopped')
                    ? 'down'
                    : 'unknown',
              });
            }
          }
        }
      }
    }

    return environments;
  }

  private extractText(html: string): string {
    // Remove HTML tags and get text content
    return html.replace(/<[^>]*>/g, '').trim();
  }

  async getnonMasterEnvironments(): Promise<Environment[]> {
    const environments = await this.checkEnvironments();
    return environments.filter(
      (env) => env.branch !== 'master' && env.branch !== 'main' && env.status === 'up',
    );
  }

  async notifyIfNeeded(currentBranch: string): Promise<string[]> {
    if (!this.config.enabled || !this.config.notifyOnNonMaster) {
      return [];
    }

    const nonMasterEnvs = await this.getnonMasterEnvironments();
    const messages: string[] = [];

    if (nonMasterEnvs.length > 0) {
      messages.push(chalk.yellow('\n⚠️  Non-master environments detected:'));

      for (const env of nonMasterEnvs) {
        messages.push(
          chalk.yellow(`  • ${env.name}: ${env.branch} ${env.url ? `(${env.url})` : ''}`),
        );
      }

      messages.push(
        chalk.gray('\nConsider coordinating with team members before pushing to avoid conflicts.'),
      );
    }

    // Check if current branch is deployed somewhere
    const currentBranchEnv = nonMasterEnvs.find((env) => env.branch === currentBranch);
    if (currentBranchEnv) {
      messages.push(
        chalk.cyan(
          `\n📍 Your branch "${currentBranch}" is currently deployed to: ${currentBranchEnv.name}`,
        ),
      );
    }

    return messages;
  }

  async checkBeforePush(currentBranch: string): Promise<{
    canPush: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    let canPush = true;

    if (!this.config.enabled) {
      return { canPush, warnings };
    }

    const nonMasterEnvs = await this.getnonMasterEnvironments();

    // Check if multiple non-master environments exist
    if (nonMasterEnvs.length > 2) {
      warnings.push('⚠️  Multiple feature branches are deployed. Coordinate with your team.');
    }

    // Check if a different branch is deployed to production-like environments
    const criticalEnvs = nonMasterEnvs.filter(
      (env) =>
        env.name.toLowerCase().includes('staging') || env.name.toLowerCase().includes('pre-prod'),
    );

    if (criticalEnvs.length > 0 && !criticalEnvs.some((env) => env.branch === currentBranch)) {
      warnings.push('🚨 Critical environments are using different branches:');
      criticalEnvs.forEach((env) => {
        warnings.push(`   • ${env.name}: ${env.branch}`);
      });
    }

    return { canPush, warnings };
  }

  formatEnvironmentStatus(environments: Environment[]): string {
    if (environments.length === 0) {
      return 'No environments found';
    }

    const lines: string[] = ['📊 Environment Status:'];

    environments.forEach((env) => {
      const statusIcon = env.status === 'up' ? '🟢' : env.status === 'down' ? '🔴' : '🟡';
      lines.push(
        `${statusIcon} ${env.name}: ${env.branch} ${env.lastDeployment ? `(deployed ${env.lastDeployment})` : ''}`,
      );
    });

    return lines.join('\n');
  }
}
