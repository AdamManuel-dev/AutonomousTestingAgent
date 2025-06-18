import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { PostmanConfig } from '../types/index.js';

const execAsync = promisify(exec);

export class PostmanRunner {
  private config: PostmanConfig;

  constructor(config: PostmanConfig) {
    this.config = config;
  }

  async runCollection(collectionPath: string): Promise<{
    success: boolean;
    output: string;
    duration: number;
  }> {
    if (!this.config.enabled) {
      return {
        success: true,
        output: 'Postman tests are disabled',
        duration: 0,
      };
    }

    const startTime = Date.now();
    
    try {
      console.log(chalk.blue(`\n📮 Running Postman collection: ${collectionPath}`));
      
      let command = `npx newman run ${collectionPath}`;
      
      if (this.config.environment) {
        command += ` -e ${this.config.environment}`;
      }
      
      if (this.config.globals) {
        command += ` -g ${this.config.globals}`;
      }
      
      if (this.config.iterationCount) {
        command += ` -n ${this.config.iterationCount}`;
      }
      
      command += ' --reporters cli,json --reporter-json-export postman-results.json';
      
      const { stdout, stderr } = await execAsync(command);
      
      const duration = Date.now() - startTime;
      const output = stdout + (stderr ? `\n\nErrors:\n${stderr}` : '');
      
      console.log(chalk.green(`✅ Postman collection completed in ${duration}ms`));
      
      return {
        success: !stderr,
        output,
        duration,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`❌ Postman collection failed`));
      
      return {
        success: false,
        output: error.message || 'Unknown error',
        duration,
      };
    }
  }

  async runAllCollections(): Promise<Array<{
    collection: string;
    success: boolean;
    output: string;
    duration: number;
  }>> {
    if (!this.config.enabled || !this.config.collections || this.config.collections.length === 0) {
      return [];
    }

    const results = [];
    
    for (const collection of this.config.collections) {
      const result = await this.runCollection(collection);
      results.push({
        collection,
        ...result,
      });
    }
    
    return results;
  }
}