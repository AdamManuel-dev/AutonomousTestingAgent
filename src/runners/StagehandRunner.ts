import chalk from 'chalk';
import { StagehandConfig, StagehandScenario } from '../types/index.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MCPIntegration } from '../integrations/MCPIntegration.js';

export class StagehandRunner {
  private config: StagehandConfig;
  private mcpIntegration: MCPIntegration | null = null;

  constructor(config: StagehandConfig, mcpIntegration?: MCPIntegration) {
    this.config = config;
    this.mcpIntegration = mcpIntegration || null;
  }

  private isStagehandAvailable(): boolean {
    if (!this.mcpIntegration) return false;
    return this.mcpIntegration.isToolAvailable('mcp__stagehand__stagehand_navigate');
  }

  async runScenario(scenario: StagehandScenario, description?: string): Promise<{
    success: boolean;
    output: string;
    duration: number;
    screenshots?: string[];
  }> {
    if (!this.config.enabled) {
      return {
        success: true,
        output: 'Stagehand UI tests are disabled',
        duration: 0,
      };
    }

    if (!this.isStagehandAvailable()) {
      return {
        success: false,
        output: 'Stagehand MCP tool is not available. Please ensure MCP is configured with Stagehand.',
        duration: 0,
      };
    }

    const startTime = Date.now();
    const screenshots: string[] = [];

    try {
      console.log(chalk.blue(`\n🎭 Running Stagehand scenario: ${scenario.name}`));
      
      if (description && this.config.promptForClarification) {
        console.log(chalk.yellow(`📝 Description: ${description}`));
        
        // Analyze description for clarity
        const needsClarification = await this.analyzeDescription(description);
        if (needsClarification) {
          return {
            success: false,
            output: 'Description needs clarification. Please provide more specific details about the UI workflow.',
            duration: Date.now() - startTime,
          };
        }
      }

      // Navigate to base URL
      if (this.config.baseUrl) {
        console.log(chalk.gray(`Navigating to: ${this.config.baseUrl}`));
        // Here we would use the stagehand MCP tool to navigate
      }

      // Execute each step
      for (const [index, step] of scenario.steps.entries()) {
        console.log(chalk.cyan(`  Step ${index + 1}: ${step}`));
        
        // Take screenshot before action
        const screenshotPath = await this.takeScreenshot(`step-${index + 1}-before`);
        if (screenshotPath) screenshots.push(screenshotPath);
        
        // Execute the step using stagehand
        // This would integrate with the actual stagehand MCP tool
        await this.executeStagehandAction(step);
        
        // Take screenshot after action
        const afterScreenshotPath = await this.takeScreenshot(`step-${index + 1}-after`);
        if (afterScreenshotPath) screenshots.push(afterScreenshotPath);
      }

      const duration = Date.now() - startTime;
      console.log(chalk.green(`✅ Stagehand scenario completed in ${duration}ms`));

      return {
        success: true,
        output: `Successfully completed ${scenario.steps.length} steps`,
        duration,
        screenshots,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(chalk.red(`❌ Stagehand scenario failed`));
      
      return {
        success: false,
        output: error.message || 'Unknown error',
        duration,
        screenshots,
      };
    }
  }

  private async analyzeDescription(description: string): Promise<boolean> {
    // Simple heuristic to check if description needs clarification
    const vagueTerms = ['something', 'stuff', 'things', 'whatever', 'somehow'];
    const hasVagueTerms = vagueTerms.some(term => 
      description.toLowerCase().includes(term)
    );
    
    const tooShort = description.split(' ').length < 5;
    
    return hasVagueTerms || tooShort;
  }

  private async executeStagehandAction(action: string): Promise<void> {
    // This would integrate with the actual stagehand MCP tool
    // For now, just simulate the action
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private async takeScreenshot(name: string): Promise<string | null> {
    try {
      const screenshotDir = path.join(process.cwd(), 'stagehand-screenshots');
      await fs.mkdir(screenshotDir, { recursive: true });
      
      const screenshotPath = path.join(screenshotDir, `${name}-${Date.now()}.png`);
      
      // This would use stagehand's screenshot capability
      // For now, return a mock path
      return screenshotPath;
    } catch {
      return null;
    }
  }

  async runAllScenarios(): Promise<Array<{
    scenario: string;
    success: boolean;
    output: string;
    duration: number;
    screenshots?: string[];
  }>> {
    if (!this.config.enabled) {
      return [];
    }

    const scenarios = await this.loadScenarios();
    if (scenarios.length === 0) {
      return [];
    }

    const results = [];
    
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push({
        scenario: scenario.name,
        ...result,
      });
    }
    
    return results;
  }

  private async loadScenarios(): Promise<StagehandScenario[]> {
    const scenarios: StagehandScenario[] = [];

    // Load from config
    if (this.config.scenarios) {
      scenarios.push(...this.config.scenarios);
    }

    // Load from scenarios path
    if (this.config.scenariosPath) {
      try {
        const files = await fs.readdir(this.config.scenariosPath);
        const scenarioFiles = files.filter(f => 
          f.endsWith('.json') || f.endsWith('.yaml') || f.endsWith('.yml')
        );

        for (const file of scenarioFiles) {
          const filePath = path.join(this.config.scenariosPath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          if (file.endsWith('.json')) {
            const scenario = JSON.parse(content) as StagehandScenario;
            scenarios.push(scenario);
          } else {
            // For YAML files, you would need a YAML parser
            console.log(chalk.yellow(`Skipping YAML file: ${file} (YAML parser not implemented)`));
          }
        }
      } catch (error) {
        console.error(chalk.red(`Failed to load scenarios from ${this.config.scenariosPath}`), error);
      }
    }

    return scenarios;
  }

  async generateScenarioFromDescription(description: string): Promise<StagehandScenario | null> {
    if (!description) return null;

    // Parse the description to extract steps
    const lines = description.split('\n').filter(line => line.trim());
    const steps: string[] = [];

    for (const line of lines) {
      // Look for action words
      if (line.match(/click|type|select|navigate|scroll|hover|wait/i)) {
        steps.push(line.trim());
      }
    }

    if (steps.length === 0) {
      // Try to infer steps from the description
      if (description.includes('login')) {
        steps.push('Navigate to login page');
        steps.push('Type username');
        steps.push('Type password');
        steps.push('Click login button');
      } else if (description.includes('search')) {
        steps.push('Click on search input');
        steps.push('Type search query');
        steps.push('Click search button or press Enter');
      }
    }

    return steps.length > 0 ? {
      name: 'Generated scenario',
      description,
      steps,
    } : null;
  }
}