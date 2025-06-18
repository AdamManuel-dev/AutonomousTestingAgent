#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { TestRunningAgent } from './Agent.js';
import { ConfigLoader } from './utils/ConfigLoader.js';
import { writeFile } from 'fs/promises';

program
  .name('test-agent')
  .description('Automated test runner that monitors file changes')
  .version('1.0.0');

program
  .command('start')
  .description('Start the test running agent')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('--cursor-port <port>', 'Port for Cursor IDE integration', '3456')
  .action(async (options) => {
    try {
      const config = await ConfigLoader.load(options.config, options.project);
      
      // Override config with CLI options
      if (options.project) {
        config.projectRoot = options.project;
      }
      if (options.cursorPort) {
        config.cursorPort = parseInt(options.cursorPort, 10);
      }

      const agent = new TestRunningAgent(config);
      
      // Handle graceful shutdown
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\nReceived SIGINT, shutting down gracefully...'));
        agent.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log(chalk.yellow('\n\nReceived SIGTERM, shutting down gracefully...'));
        agent.stop();
        process.exit(0);
      });

      agent.start();
    } catch (error: any) {
      console.error(chalk.red('Failed to start agent:'), error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample configuration file')
  .action(async () => {
    try {
      const sampleConfig = ConfigLoader.getSampleConfig();
      await writeFile('test-agent.config.json', sampleConfig);
      console.log(chalk.green('✅ Created test-agent.config.json'));
      console.log(chalk.gray('Edit this file to customize your test configuration'));
    } catch (error: any) {
      console.error(chalk.red('Failed to create config file:'), error.message);
      process.exit(1);
    }
  });

program
  .command('commit-message')
  .description('Generate a commit message based on current changes')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .action(async (options) => {
    try {
      const config = await ConfigLoader.load(options.config, options.project);
      const agent = new TestRunningAgent(config);
      
      const message = await agent.generateCommitMessage();
      
      if (message) {
        console.log(chalk.green('\n📝 Suggested commit message:'));
        console.log(chalk.white(message));
      } else {
        console.log(chalk.yellow('No changes to commit or unable to generate message'));
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to generate commit message:'), error.message);
      process.exit(1);
    }
  });

program
  .command('test-notifications')
  .description('Test all configured notification channels')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .action(async (options) => {
    try {
      const config = await ConfigLoader.load(options.config, options.project);
      const { NotificationManager } = await import('./utils/NotificationManager.js');
      
      const notificationManager = new NotificationManager(config.notifications);
      
      console.log(chalk.blue('\n🔔 Testing notification channels...\n'));
      
      await notificationManager.testNotifications();
      
      console.log(chalk.green('\n✅ Notification test complete'));
      console.log(chalk.gray('Check your configured notification channels'));
    } catch (error: any) {
      console.error(chalk.red('Failed to test notifications:'), error.message);
      process.exit(1);
    }
  });

program
  .command('complexity')
  .description('Analyze code complexity')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('-f, --files <files...>', 'Specific files to analyze')
  .option('--compare', 'Compare with previous versions')
  .action(async (options) => {
    try {
      const config = await ConfigLoader.load(options.config, options.project);
      const agent = new TestRunningAgent(config);
      
      if (options.compare && options.files?.length === 1) {
        // Compare single file
        const { ComplexityAnalyzer } = await import('./utils/ComplexityAnalyzer.js');
        const analyzer = new ComplexityAnalyzer(config.complexity);
        
        const comparison = await analyzer.compareComplexity(options.files[0]);
        if (comparison) {
          const icon = comparison.increased ? '📈' : '📉';
          const changeStr = comparison.increased ? `+${comparison.change}` : comparison.change.toString();
          console.log(chalk.bold(`\n${icon} Complexity Analysis: ${options.files[0]}`));
          console.log(`Previous: ${comparison.previous}`);
          console.log(`Current: ${comparison.current}`);
          console.log(`Change: ${changeStr} (${comparison.percentageChange.toFixed(1)}%)`);
        } else {
          console.log(chalk.yellow('No previous version found for comparison'));
        }
      } else {
        // Analyze files
        const report = await agent.getComplexityReport(options.files);
        
        if (report.files === 0) {
          console.log(chalk.yellow('\n⚠️  No files to analyze'));
          if (options.files) {
            console.log(chalk.gray('Make sure the file paths are correct and the files exist.'));
          } else {
            console.log(chalk.gray('No changed files found. Make some changes or specify files with --files option.'));
          }
        } else {
          console.log(chalk.bold('\n📊 Complexity Analysis Report\n'));
          console.log(report.summary);
          
          if (report.reports.length > 0) {
            const totalHighComplexity = report.reports.reduce((sum: number, r: any) => 
              sum + r.highComplexityNodes.length, 0
            );
            
            if (totalHighComplexity > 0) {
              console.log(chalk.yellow(`\n⚠️  Found ${totalHighComplexity} high complexity functions`));
            }
          }
        }
      }
    } catch (error: any) {
      console.error(chalk.red('Failed to analyze complexity:'), error.message);
      process.exit(1);
    }
  });

program.parse();