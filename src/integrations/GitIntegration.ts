import chalk from 'chalk';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  hasUncommittedChanges: boolean;
  hasUntrackedFiles: boolean;
}

export class GitIntegration {
  async getCurrentBranch(): Promise<string> {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      return stdout.trim();
    } catch {
      return '';
    }
  }

  async getMainBranch(): Promise<string> {
    try {
      // Try to get the main branch (could be main or master)
      const { stdout: remoteHead } = await execAsync('git symbolic-ref refs/remotes/origin/HEAD');
      const mainBranch = remoteHead.trim().replace('refs/remotes/origin/', '');
      return mainBranch;
    } catch {
      // Fallback to common names
      try {
        await execAsync('git show-ref --verify --quiet refs/heads/main');
        return 'main';
      } catch {
        return 'master';
      }
    }
  }

  async fetchLatest(): Promise<void> {
    try {
      console.log(chalk.gray('Fetching latest changes from remote...'));
      await execAsync('git fetch origin');
    } catch (error) {
      console.error(chalk.red('Failed to fetch from remote'), error);
    }
  }

  async getStatus(): Promise<GitStatus> {
    const branch = await this.getCurrentBranch();
    const mainBranch = await this.getMainBranch();

    // Fetch latest to ensure we have up-to-date info
    await this.fetchLatest();

    let ahead = 0;
    let behind = 0;

    try {
      // Check how many commits ahead/behind we are from origin
      const { stdout: aheadBehind } = await execAsync(
        `git rev-list --left-right --count origin/${branch}...HEAD 2>/dev/null || echo "0 0"`,
      );
      const [behindStr, aheadStr] = aheadBehind.trim().split('\t');
      behind = parseInt(behindStr) || 0;
      ahead = parseInt(aheadStr) || 0;
    } catch {
      // Branch might not exist on remote yet
    }

    // Check for uncommitted changes
    const { stdout: statusOutput } = await execAsync('git status --porcelain');
    const statusLines = statusOutput
      .trim()
      .split('\n')
      .filter((line) => line);

    const hasUncommittedChanges = statusLines.some(
      (line) =>
        line.startsWith(' M') ||
        line.startsWith('M ') ||
        line.startsWith('A ') ||
        line.startsWith('D '),
    );

    const hasUntrackedFiles = statusLines.some((line) => line.startsWith('??'));

    return {
      branch,
      ahead,
      behind,
      hasUncommittedChanges,
      hasUntrackedFiles,
    };
  }

  async checkMergeStatus(): Promise<{
    needsPull: boolean;
    needsMerge: boolean;
    conflicts: boolean;
    messages: string[];
  }> {
    const messages: string[] = [];
    const status = await this.getStatus();
    const mainBranch = await this.getMainBranch();

    // Check if we need to pull
    const needsPull = status.behind > 0;
    if (needsPull) {
      messages.push(
        `⬇️  Your branch is ${status.behind} commit(s) behind origin/${status.branch}. Run 'git pull' to update.`,
      );
    }

    // Check if we need to merge main/master
    let needsMerge = false;
    let conflicts = false;

    if (status.branch !== mainBranch) {
      try {
        // Check how many commits main is ahead of our branch
        const { stdout } = await execAsync(
          `git rev-list --count ${status.branch}..origin/${mainBranch}`,
        );
        const commitsAhead = parseInt(stdout.trim()) || 0;

        if (commitsAhead > 0) {
          needsMerge = true;
          messages.push(
            `🔄 The ${mainBranch} branch is ${commitsAhead} commit(s) ahead. Consider merging or rebasing.`,
          );

          // Check for potential conflicts
          try {
            await execAsync(
              `git merge-tree $(git merge-base HEAD origin/${mainBranch}) HEAD origin/${mainBranch}`,
            );
          } catch {
            conflicts = true;
            messages.push(`⚠️  Potential merge conflicts detected with ${mainBranch}.`);
          }
        }
      } catch (error) {
        console.error(chalk.yellow('Could not check merge status with main branch'));
      }
    }

    // Check for uncommitted changes
    if (status.hasUncommittedChanges) {
      messages.push(
        '📝 You have uncommitted changes. Commit or stash them before pulling/merging.',
      );
    }

    return {
      needsPull,
      needsMerge,
      conflicts,
      messages,
    };
  }

  async getRecentCommits(limit: number = 5): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`git log --oneline -n ${limit}`);
      return stdout
        .trim()
        .split('\n')
        .filter((line) => line);
    } catch {
      return [];
    }
  }

  async getChangedFiles(): Promise<string[]> {
    try {
      // Get the root of the git repository
      const { stdout: gitRoot } = await execAsync('git rev-parse --show-toplevel');
      const repoRoot = gitRoot.trim();

      // Get current working directory
      const cwd = process.cwd();

      // Get unstaged changes
      const { stdout } = await execAsync('git diff --name-only HEAD');
      const unstaged = stdout
        .trim()
        .split('\n')
        .filter((line) => line);

      // Get staged changes
      const { stdout: staged } = await execAsync('git diff --name-only --cached');
      const stagedFiles = staged
        .trim()
        .split('\n')
        .filter((line) => line);

      // Combine and deduplicate
      const allFiles = [...new Set([...unstaged, ...stagedFiles])];

      // If we're in a subdirectory of the repo, adjust the paths
      if (cwd !== repoRoot && cwd.startsWith(repoRoot)) {
        const relativePath = cwd.substring(repoRoot.length + 1);
        return allFiles
          .filter((file) => file.startsWith(relativePath + '/'))
          .map((file) => file.substring(relativePath.length + 1));
      }

      return allFiles;
    } catch {
      return [];
    }
  }

  async checkBranchUpToDate(): Promise<{
    isUpToDate: boolean;
    message: string;
  }> {
    const status = await this.checkMergeStatus();

    if (status.messages.length === 0) {
      return {
        isUpToDate: true,
        message: '✅ Your branch is up to date',
      };
    }

    return {
      isUpToDate: false,
      message: status.messages.join('\n'),
    };
  }
}
