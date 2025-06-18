import chalk from 'chalk';
import { JiraConfig } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface JiraTicket {
  key: string;
  summary: string;
  description: string;
  status: string;
  comments: JiraComment[];
}

interface JiraComment {
  author: string;
  body: string;
  created: string;
}

export class JiraIntegration {
  private config: JiraConfig;

  constructor(config: JiraConfig) {
    this.config = config;
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      return stdout.trim();
    } catch {
      return '';
    }
  }

  async findTicketInBranch(): Promise<string | null> {
    if (!this.config.enabled || !this.config.branchPattern) {
      return null;
    }

    const branch = await this.getCurrentBranch();
    if (!branch) return null;

    // Default pattern for JIRA tickets like DEV-1234
    const pattern = new RegExp(this.config.branchPattern || '[A-Z]+-\\d+', 'i');
    const match = branch.match(pattern);
    
    return match ? match[0].toUpperCase() : null;
  }

  async getTicketDetails(ticketKey: string): Promise<JiraTicket | null> {
    if (!this.config.enabled || !this.config.baseUrl || !this.config.email || !this.config.apiToken) {
      console.log(chalk.yellow('JIRA integration is not properly configured'));
      return null;
    }

    try {
      console.log(chalk.blue(`\n🎫 Fetching JIRA ticket: ${ticketKey}`));
      
      // Using curl as a simple way to make the API call
      const command = `curl -s -u ${this.config.email}:${this.config.apiToken} \
        -H "Accept: application/json" \
        "${this.config.baseUrl}/rest/api/2/issue/${ticketKey}?expand=comments"`;
      
      const { stdout } = await execAsync(command);
      const data = JSON.parse(stdout);
      
      const ticket: JiraTicket = {
        key: data.key,
        summary: data.fields.summary,
        description: data.fields.description || '',
        status: data.fields.status.name,
        comments: data.fields.comment.comments.map((c: any) => ({
          author: c.author.displayName,
          body: c.body,
          created: c.created,
        })),
      };
      
      return ticket;
    } catch (error) {
      console.error(chalk.red(`Failed to fetch JIRA ticket ${ticketKey}`), error);
      return null;
    }
  }

  async checkMissingRequirements(ticket: JiraTicket): Promise<string[]> {
    const issues: string[] = [];
    
    if (!ticket.description) {
      issues.push('Ticket has no description');
      return issues;
    }

    // Check for common requirement patterns in description
    const requirementPatterns = [
      /acceptance criteria/i,
      /requirements?:/i,
      /must have/i,
      /should have/i,
      /user story/i,
    ];

    const hasRequirements = requirementPatterns.some(pattern => 
      ticket.description.match(pattern)
    );

    if (!hasRequirements) {
      issues.push('Ticket description may be missing acceptance criteria or requirements');
    }

    // Check if all comments have been addressed
    const actionableComments = ticket.comments.filter(comment => {
      const lowerBody = comment.body.toLowerCase();
      return lowerBody.includes('please') || 
             lowerBody.includes('need') ||
             lowerBody.includes('should') ||
             lowerBody.includes('must') ||
             lowerBody.includes('fix') ||
             lowerBody.includes('change');
    });

    if (actionableComments.length > 0) {
      issues.push(`Found ${actionableComments.length} potentially unaddressed comments`);
      
      // Show recent actionable comments
      const recentComments = actionableComments.slice(-3);
      recentComments.forEach(comment => {
        const preview = comment.body.substring(0, 100) + (comment.body.length > 100 ? '...' : '');
        issues.push(`  - ${comment.author}: "${preview}"`);
      });
    }

    return issues;
  }

  async analyzeTicketCompleteness(): Promise<{
    ticketKey: string | null;
    ticket: JiraTicket | null;
    issues: string[];
  }> {
    const ticketKey = await this.findTicketInBranch();
    
    if (!ticketKey) {
      const branch = await this.getCurrentBranch();
      if (branch && this.config.branchPattern) {
        return {
          ticketKey: null,
          ticket: null,
          issues: [`No JIRA ticket found in branch name: ${branch}`],
        };
      }
      return {
        ticketKey: null,
        ticket: null,
        issues: [],
      };
    }

    const ticket = await this.getTicketDetails(ticketKey);
    
    if (!ticket) {
      return {
        ticketKey,
        ticket: null,
        issues: [`Failed to fetch JIRA ticket: ${ticketKey}`],
      };
    }

    const issues = await this.checkMissingRequirements(ticket);
    
    return {
      ticketKey,
      ticket,
      issues,
    };
  }

  async createCommitMessage(ticketKey: string, changes: string[]): Promise<string> {
    if (!this.config.enabled || !ticketKey) {
      return '';
    }

    const ticket = await this.getTicketDetails(ticketKey);
    
    if (!ticket) {
      return `[${ticketKey}] Update ${changes.length} files`;
    }

    // Generate a smart commit message based on ticket and changes
    const fileTypes = this.categorizeChanges(changes);
    let action = 'Update';
    
    if (fileTypes.includes('test')) {
      action = 'Add tests for';
    } else if (fileTypes.includes('fix')) {
      action = 'Fix';
    } else if (fileTypes.includes('feat')) {
      action = 'Implement';
    }

    const summary = ticket.summary.length > 50 
      ? ticket.summary.substring(0, 47) + '...'
      : ticket.summary;

    return `[${ticketKey}] ${action} ${summary}`;
  }

  private categorizeChanges(files: string[]): string[] {
    const categories: string[] = [];
    
    if (files.some(f => f.includes('.test.') || f.includes('.spec.'))) {
      categories.push('test');
    }
    if (files.some(f => f.includes('fix') || f.includes('bug'))) {
      categories.push('fix');
    }
    if (files.some(f => f.includes('feat') || f.includes('feature'))) {
      categories.push('feat');
    }
    
    return categories;
  }
}