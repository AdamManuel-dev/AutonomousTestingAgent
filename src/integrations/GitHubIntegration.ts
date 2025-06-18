import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DebugContext } from '../utils/DebugContext.js';

export interface GitHubConfig {
  enabled?: boolean;
  token?: string;
  owner?: string;
  repo?: string;
  autoDetect?: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  body: string;
  state: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  head: {
    ref: string;
  };
  base: {
    ref: string;
  };
}

export interface PullRequestComment {
  id: number;
  body: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
  author_association: string;
}

export interface ReviewComment {
  id: number;
  body: string;
  path: string;
  line?: number;
  side?: string;
  user: {
    login: string;
  };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface PRAnalysis {
  pullRequest?: PullRequest;
  comments: PullRequestComment[];
  reviewComments: ReviewComment[];
  actionItems: string[];
  suggestions: string[];
  concerns: string[];
  requestedChanges: string[];
}

export interface PRCommentResolution {
  comment: string;
  type: 'action' | 'change' | 'concern' | 'suggestion';
  confidence: number;
  reasoning: string;
  relatedFiles?: string[];
}

export class GitHubIntegration {
  private octokit?: Octokit;
  private config: GitHubConfig;
  private owner: string = '';
  private repo: string = '';

  constructor(config: GitHubConfig) {
    this.config = config;
    
    if (config.enabled && config.token) {
      this.octokit = new Octokit({
        auth: config.token,
      });
      
      if (config.autoDetect) {
        this.detectRepository();
      } else if (config.owner && config.repo) {
        this.owner = config.owner;
        this.repo = config.repo;
      }
    }
  }

  private detectRepository(): void {
    try {
      // Get remote URL
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      
      // Parse GitHub URL formats
      const match = remoteUrl.match(/github\.com[:/]([^/]+)\/([^.]+)(\.git)?$/);
      if (match) {
        this.owner = match[1];
        this.repo = match[2];
        console.log(chalk.green(`✓ Auto-detected GitHub repository: ${this.owner}/${this.repo}`));
      } else {
        console.log(chalk.yellow('⚠️  Could not auto-detect GitHub repository from remote URL'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Could not detect GitHub repository (not a git repo or no remote)'));
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch (error) {
      return 'main';
    }
  }

  async getPullRequestForBranch(branch?: string): Promise<PullRequest | null> {
    if (!this.octokit || !this.owner || !this.repo) {
      return null;
    }

    const currentBranch = branch || await this.getCurrentBranch();

    try {
      const { data: pullRequests } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        head: `${this.owner}:${currentBranch}`,
        state: 'all',
      });

      if (pullRequests.length > 0) {
        // Return the most recent PR
        return pullRequests[0] as PullRequest;
      }

      return null;
    } catch (error) {
      DebugContext.captureError(error as Error, 'github-integration', 'get_pr_for_branch');
      return null;
    }
  }

  async getPullRequestComments(prNumber: number): Promise<PullRequestComment[]> {
    if (!this.octokit || !this.owner || !this.repo) {
      return [];
    }

    try {
      const { data: comments } = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: prNumber,
      });

      return comments as PullRequestComment[];
    } catch (error) {
      DebugContext.captureError(error as Error, 'github-integration', 'get_pr_comments');
      return [];
    }
  }

  async getReviewComments(prNumber: number): Promise<ReviewComment[]> {
    if (!this.octokit || !this.owner || !this.repo) {
      return [];
    }

    try {
      const { data: reviewComments } = await this.octokit.pulls.listReviewComments({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber,
      });

      return reviewComments as ReviewComment[];
    } catch (error) {
      DebugContext.captureError(error as Error, 'github-integration', 'get_review_comments');
      return [];
    }
  }

  async analyzePullRequest(branch?: string): Promise<PRAnalysis> {
    const analysis: PRAnalysis = {
      comments: [],
      reviewComments: [],
      actionItems: [],
      suggestions: [],
      concerns: [],
      requestedChanges: [],
    };

    const pr = await this.getPullRequestForBranch(branch);
    if (!pr) {
      return analysis;
    }

    analysis.pullRequest = pr;

    // Fetch all comments
    const [comments, reviewComments] = await Promise.all([
      this.getPullRequestComments(pr.number),
      this.getReviewComments(pr.number),
    ]);

    analysis.comments = comments;
    analysis.reviewComments = reviewComments;

    // Analyze comments for action items
    this.analyzeComments(analysis);

    return analysis;
  }

  private analyzeComments(analysis: PRAnalysis): void {
    const actionKeywords = [
      'please', 'could you', 'can you', 'would you',
      'fix', 'change', 'update', 'modify', 'add', 'remove',
      'need', 'needs', 'require', 'required', 'must',
      'should', 'todo', 'TODO', 'FIXME',
    ];

    const suggestionKeywords = [
      'consider', 'suggest', 'recommend', 'maybe',
      'perhaps', 'might', 'could be', 'think about',
      'how about', 'what if',
    ];

    const concernKeywords = [
      'concern', 'worried', 'issue', 'problem',
      'bug', 'error', 'incorrect', 'wrong',
      'breaking', 'regression', 'failure',
    ];

    // Analyze PR comments
    for (const comment of analysis.comments) {
      const body = comment.body.toLowerCase();
      const originalBody = comment.body;

      // Check for action items
      if (actionKeywords.some(keyword => body.includes(keyword))) {
        analysis.actionItems.push(`@${comment.user.login}: ${originalBody}`);
      }

      // Check for suggestions
      if (suggestionKeywords.some(keyword => body.includes(keyword))) {
        analysis.suggestions.push(`@${comment.user.login}: ${originalBody}`);
      }

      // Check for concerns
      if (concernKeywords.some(keyword => body.includes(keyword))) {
        analysis.concerns.push(`@${comment.user.login}: ${originalBody}`);
      }
    }

    // Analyze review comments (inline code comments)
    for (const comment of analysis.reviewComments) {
      const body = comment.body.toLowerCase();
      const originalBody = comment.body;
      const location = `${comment.path}${comment.line ? `:${comment.line}` : ''}`;

      // Review comments are more likely to be requested changes
      if (actionKeywords.some(keyword => body.includes(keyword))) {
        analysis.requestedChanges.push(`@${comment.user.login} on ${location}: ${originalBody}`);
      } else {
        // Still check for suggestions and concerns
        if (suggestionKeywords.some(keyword => body.includes(keyword))) {
          analysis.suggestions.push(`@${comment.user.login} on ${location}: ${originalBody}`);
        }
        
        if (concernKeywords.some(keyword => body.includes(keyword))) {
          analysis.concerns.push(`@${comment.user.login} on ${location}: ${originalBody}`);
        }
      }
    }
  }

  async getUnresolvedComments(): Promise<string[]> {
    const analysis = await this.analyzePullRequest();
    
    const unresolved: string[] = [];
    
    if (analysis.actionItems.length > 0) {
      unresolved.push(`${analysis.actionItems.length} action items from PR comments`);
    }
    
    if (analysis.requestedChanges.length > 0) {
      unresolved.push(`${analysis.requestedChanges.length} requested changes in code review`);
    }
    
    if (analysis.concerns.length > 0) {
      unresolved.push(`${analysis.concerns.length} unresolved concerns`);
    }
    
    return unresolved;
  }

  async generateCommitContext(): Promise<string> {
    const analysis = await this.analyzePullRequest();
    
    if (!analysis.pullRequest) {
      return '';
    }
    
    let context = `\n\nPR #${analysis.pullRequest.number}: ${analysis.pullRequest.title}\n`;
    
    if (analysis.actionItems.length > 0) {
      context += '\nAddressed action items:\n';
      analysis.actionItems.forEach(item => {
        context += `- ${item.substring(0, 100)}${item.length > 100 ? '...' : ''}\n`;
      });
    }
    
    if (analysis.requestedChanges.length > 0) {
      context += '\nImplemented requested changes:\n';
      analysis.requestedChanges.forEach(change => {
        context += `- ${change.substring(0, 100)}${change.length > 100 ? '...' : ''}\n`;
      });
    }
    
    return context;
  }

  async createPRComment(body: string, prNumber?: number): Promise<void> {
    if (!this.octokit || !this.owner || !this.repo) {
      return;
    }

    try {
      let pullNumber = prNumber;
      
      if (!pullNumber) {
        const pr = await this.getPullRequestForBranch();
        if (!pr) {
          console.log(chalk.yellow('⚠️  No pull request found for current branch'));
          return;
        }
        pullNumber = pr.number;
      }

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: pullNumber,
        body,
      });

      console.log(chalk.green('✓ Comment added to PR'));
    } catch (error) {
      DebugContext.captureError(error as Error, 'github-integration', 'create_pr_comment');
      console.log(chalk.red('✗ Failed to create PR comment'));
    }
  }

  async getRecentActivity(days: number = 7): Promise<any> {
    if (!this.octokit || !this.owner || !this.repo) {
      return null;
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
      const [pulls, issues] = await Promise.all([
        this.octokit.pulls.list({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          per_page: 10,
        }),
        this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          sort: 'updated',
          direction: 'desc',
          since: since.toISOString(),
          per_page: 10,
        }),
      ]);

      return {
        recentPulls: pulls.data,
        recentIssues: issues.data.filter(issue => !issue.pull_request),
      };
    } catch (error) {
      DebugContext.captureError(error as Error, 'github-integration', 'get_recent_activity');
      return null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled === true && !!this.octokit;
  }

  getRepositoryInfo(): { owner: string; repo: string } | null {
    if (this.owner && this.repo) {
      return { owner: this.owner, repo: this.repo };
    }
    return null;
  }

  async analyzeCommentResolution(changedFiles?: string[]): Promise<{
    overallConfidence: number;
    resolutions: PRCommentResolution[];
    unresolvedCount: number;
    partiallyResolvedCount: number;
    resolvedCount: number;
  }> {
    const analysis = await this.analyzePullRequest();
    
    if (!analysis.pullRequest) {
      return {
        overallConfidence: 0,
        resolutions: [],
        unresolvedCount: 0,
        partiallyResolvedCount: 0,
        resolvedCount: 0,
      };
    }

    // Get recent commits and their changes if not provided
    if (!changedFiles) {
      try {
        changedFiles = execSync('git diff --name-only HEAD~1', { encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(file => file.length > 0);
      } catch {
        changedFiles = [];
      }
    }

    const resolutions: PRCommentResolution[] = [];
    
    // Analyze action items
    for (const actionItem of analysis.actionItems) {
      const resolution = this.analyzeCommentAgainstChanges(actionItem, 'action', changedFiles, analysis.reviewComments);
      resolutions.push(resolution);
    }
    
    // Analyze requested changes
    for (const change of analysis.requestedChanges) {
      const resolution = this.analyzeCommentAgainstChanges(change, 'change', changedFiles, analysis.reviewComments);
      resolutions.push(resolution);
    }
    
    // Analyze concerns
    for (const concern of analysis.concerns) {
      const resolution = this.analyzeCommentAgainstChanges(concern, 'concern', changedFiles, analysis.reviewComments);
      resolutions.push(resolution);
    }
    
    // Calculate statistics
    const resolvedCount = resolutions.filter(r => r.confidence >= 0.8).length;
    const partiallyResolvedCount = resolutions.filter(r => r.confidence >= 0.5 && r.confidence < 0.8).length;
    const unresolvedCount = resolutions.filter(r => r.confidence < 0.5).length;
    
    const overallConfidence = resolutions.length > 0
      ? resolutions.reduce((sum, r) => sum + r.confidence, 0) / resolutions.length
      : 1.0; // If no comments, consider it resolved
    
    return {
      overallConfidence,
      resolutions,
      unresolvedCount,
      partiallyResolvedCount,
      resolvedCount,
    };
  }

  private analyzeCommentAgainstChanges(
    comment: string,
    type: 'action' | 'change' | 'concern' | 'suggestion',
    changedFiles: string[],
    reviewComments: ReviewComment[]
  ): PRCommentResolution {
    // Extract file references from the comment
    const fileReferences = this.extractFileReferences(comment);
    const relatedFiles: string[] = [];
    
    // Check if comment mentions specific files that were changed
    let fileMatchScore = 0;
    for (const fileRef of fileReferences) {
      const matchingFiles = changedFiles.filter(file => 
        file.toLowerCase().includes(fileRef.toLowerCase()) ||
        fileRef.toLowerCase().includes(file.toLowerCase())
      );
      
      if (matchingFiles.length > 0) {
        relatedFiles.push(...matchingFiles);
        fileMatchScore = 0.7;
      }
    }
    
    // Check if this is a review comment on a specific file
    const reviewComment = reviewComments.find(rc => rc.body === comment.split(': ').slice(1).join(': '));
    if (reviewComment && changedFiles.includes(reviewComment.path)) {
      relatedFiles.push(reviewComment.path);
      fileMatchScore = 0.9;
    }
    
    // Analyze keywords to determine if the comment might be resolved
    const resolutionKeywords = {
      resolved: ['fixed', 'done', 'completed', 'addressed', 'implemented', 'resolved'],
      partial: ['updated', 'changed', 'modified', 'improved', 'refactored'],
      unresolved: ['todo', 'pending', 'later', 'future', 'skip', 'wont'],
    };
    
    const commentLower = comment.toLowerCase();
    let keywordScore = 0.3; // Base score
    
    // Check recent commit messages for resolution indicators
    try {
      const recentCommits = execSync('git log --oneline -n 5', { encoding: 'utf-8' })
        .toLowerCase()
        .split('\n');
      
      for (const commit of recentCommits) {
        if (resolutionKeywords.resolved.some(keyword => commit.includes(keyword))) {
          keywordScore = Math.max(keywordScore, 0.6);
        }
        
        // Check if commit references the comment content
        const commentKeywords = comment.toLowerCase().split(/\s+/).filter(word => word.length > 4);
        const matchingKeywords = commentKeywords.filter(keyword => commit.includes(keyword));
        if (matchingKeywords.length >= 2) {
          keywordScore = Math.max(keywordScore, 0.7);
        }
      }
    } catch (error) {
      // Ignore git errors
    }
    
    // Calculate final confidence score
    const confidence = Math.min(1.0, fileMatchScore * 0.7 + keywordScore * 0.3);
    
    // Generate reasoning
    let reasoning = '';
    if (confidence >= 0.8) {
      reasoning = `High confidence: Changed files ${relatedFiles.join(', ')} directly address this ${type}.`;
    } else if (confidence >= 0.5) {
      reasoning = `Moderate confidence: Some related changes detected ${relatedFiles.length > 0 ? `in ${relatedFiles.join(', ')}` : 'but no direct file matches'}.`;
    } else {
      reasoning = `Low confidence: No clear evidence that this ${type} has been addressed in recent changes.`;
    }
    
    return {
      comment,
      type,
      confidence,
      reasoning,
      relatedFiles: relatedFiles.length > 0 ? relatedFiles : undefined,
    };
  }

  private extractFileReferences(text: string): string[] {
    const fileReferences: string[] = [];
    
    // Match file paths (e.g., src/components/Button.tsx)
    const pathMatches = text.match(/[\w\-\/]+\.\w+/g) || [];
    fileReferences.push(...pathMatches);
    
    // Match file names without extensions
    const fileNameMatches = text.match(/\b[A-Z]\w+(?:\.tsx?|\.jsx?|\.js|\.ts)?\b/g) || [];
    fileReferences.push(...fileNameMatches);
    
    // Match quoted strings that might be file names
    const quotedMatches = text.match(/['"`]([^'"`]+)['"`]/g) || [];
    fileReferences.push(...quotedMatches.map(match => match.slice(1, -1)));
    
    return [...new Set(fileReferences)];
  }
}