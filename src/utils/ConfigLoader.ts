import { readFile, access } from 'fs/promises';
import { join, resolve, dirname, isAbsolute } from 'path';
import { constants } from 'fs';
import { Config, TestSuite } from '../types/index.js';

const DEFAULT_CONFIG: Config = {
  projectRoot: process.cwd(),
  testSuites: [
    {
      type: 'jest',
      pattern: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}'],
      command: 'npm test',
      coverageCommand: 'npm test -- --coverage',
      watchPattern: ['src/**/*.{js,jsx,ts,tsx}', '**/*.test.{js,jsx,ts,tsx}'],
      priority: 3,
    },
    {
      type: 'cypress',
      pattern: '**/*.cy.{js,jsx,ts,tsx}',
      command: 'npm run cypress:run',
      watchPattern: ['src/**/*.{js,jsx,ts,tsx}', 'cypress/**/*.{js,jsx,ts,tsx}'],
      priority: 1,
    },
    {
      type: 'storybook',
      pattern: '**/*.stories.{js,jsx,ts,tsx}',
      command: 'npm run test-storybook',
      watchPattern: ['src/**/*.{js,jsx,ts,tsx}', '**/*.stories.{js,jsx,ts,tsx}'],
      priority: 2,
    },
  ],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/.next/**',
    '**/.cache/**',
  ],
  debounceMs: 1000,
  coverage: {
    enabled: false,
    thresholds: {
      unit: 80,
      integration: 70,
      e2e: 60,
    },
    persistPath: './coverage',
  },
};

export class ConfigLoader {
  /**
   * Find configuration file in multiple locations
   */
  private static async findConfigFile(projectRoot?: string): Promise<string | null> {
    const possibleLocations = [
      // 1. Environment variable
      process.env.TEST_AGENT_CONFIG,
      // 2. Current working directory
      join(process.cwd(), 'test-agent.config.json'),
      // 3. Project root (if provided)
      projectRoot && join(projectRoot, 'test-agent.config.json'),
      // 4. Parent directories (up to 3 levels)
      join(process.cwd(), '..', 'test-agent.config.json'),
      join(process.cwd(), '..', '..', 'test-agent.config.json'),
      join(process.cwd(), '..', '..', '..', 'test-agent.config.json'),
    ].filter(Boolean) as string[];

    for (const location of possibleLocations) {
      try {
        await access(location, constants.R_OK);
        console.log(`Found config file at: ${location}`);
        return location;
      } catch {
        // File doesn't exist or not readable, continue
      }
    }

    return null;
  }

  /**
   * Load configuration from a file or use defaults
   */
  static async load(configPath?: string, projectRoot?: string): Promise<Config> {
    let resolvedConfigPath: string | null = configPath || null;

    // If no config path provided, try to find one
    if (!resolvedConfigPath) {
      resolvedConfigPath = await this.findConfigFile(projectRoot);
    }

    // If still no config found, use defaults
    if (!resolvedConfigPath) {
      console.log('No config file found, using defaults');
      return this.normalizeConfig(DEFAULT_CONFIG, process.cwd());
    }

    try {
      const configContent = await readFile(resolvedConfigPath, 'utf-8');
      const userConfig = JSON.parse(configContent);
      
      // Determine the base directory for resolving relative paths
      const configDir = dirname(resolvedConfigPath);
      
      // Merge configs
      const mergedConfig = this.mergeConfigs(DEFAULT_CONFIG, userConfig);
      
      // Normalize paths relative to config file location
      return this.normalizeConfig(mergedConfig, configDir);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('Config file not found, using defaults');
        return this.normalizeConfig(DEFAULT_CONFIG, process.cwd());
      }
      
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  /**
   * Normalize configuration paths
   */
  private static normalizeConfig(config: Config, baseDir: string): Config {
    // Resolve project root
    const projectRoot = isAbsolute(config.projectRoot)
      ? config.projectRoot
      : resolve(baseDir, config.projectRoot);

    const normalizedConfig: Config = {
      ...config,
      projectRoot,
    };

    // Normalize coverage persist path
    if (config.coverage?.persistPath) {
      normalizedConfig.coverage = {
        ...config.coverage,
        persistPath: isAbsolute(config.coverage.persistPath)
          ? config.coverage.persistPath
          : resolve(projectRoot, config.coverage.persistPath),
      };
    }

    // Normalize Postman collections
    if (config.postman?.collections) {
      normalizedConfig.postman = {
        ...config.postman,
        collections: config.postman.collections.map(collection =>
          isAbsolute(collection) ? collection : resolve(projectRoot, collection)
        ),
      };
      
      if (config.postman.environment) {
        normalizedConfig.postman.environment = isAbsolute(config.postman.environment)
          ? config.postman.environment
          : resolve(projectRoot, config.postman.environment);
      }
      
      if (config.postman.globals) {
        normalizedConfig.postman.globals = isAbsolute(config.postman.globals)
          ? config.postman.globals
          : resolve(projectRoot, config.postman.globals);
      }
    }

    // Normalize Stagehand scenarios path
    if (config.stagehand?.scenariosPath) {
      normalizedConfig.stagehand = {
        ...config.stagehand,
        scenariosPath: isAbsolute(config.stagehand.scenariosPath)
          ? config.stagehand.scenariosPath
          : resolve(projectRoot, config.stagehand.scenariosPath),
      };
    }

    // Normalize MCP registration path
    if (config.mcp?.registrationPath) {
      normalizedConfig.mcp = {
        ...config.mcp,
        registrationPath: isAbsolute(config.mcp.registrationPath)
          ? config.mcp.registrationPath
          : resolve(projectRoot, config.mcp.registrationPath),
      };
    }

    return normalizedConfig;
  }

  /**
   * Merge user config with defaults
   */
  private static mergeConfigs(defaultConfig: Config, userConfig: Partial<Config>): Config {
    const merged: Config = {
      ...defaultConfig,
      ...userConfig,
    };

    // Merge test suites if provided
    if (userConfig.testSuites) {
      merged.testSuites = userConfig.testSuites;
    }

    // Merge exclude patterns
    if (userConfig.excludePatterns) {
      merged.excludePatterns = [
        ...new Set([...defaultConfig.excludePatterns, ...userConfig.excludePatterns]),
      ];
    }

    return merged;
  }

  /**
   * Create a sample config file
   */
  static getSampleConfig(): string {
    const sample: Config = {
      projectRoot: './my-project',
      testSuites: [
        {
          type: 'jest',
          pattern: ['**/*.test.ts', '**/*.spec.ts'],
          command: 'npm test',
          coverageCommand: 'npm test -- --coverage',
          watchPattern: ['src/**/*.ts'],
          priority: 3,
        },
        {
          type: 'cypress',
          pattern: 'cypress/e2e/**/*.cy.ts',
          command: 'npm run cypress:run',
          watchPattern: ['src/**/*.ts', 'cypress/**/*.ts'],
          priority: 1,
        },
        {
          type: 'storybook',
          pattern: '**/*.stories.tsx',
          command: 'npm run test-storybook',
          watchPattern: ['src/**/*.tsx', '**/*.stories.tsx'],
          priority: 2,
        },
      ],
      excludePatterns: ['**/node_modules/**', '**/dist/**'],
      debounceMs: 1000,
      cursorPort: 3456,
      coverage: {
        enabled: true,
        thresholds: {
          unit: 80,
          integration: 70,
          e2e: 60,
        },
        persistPath: './coverage',
      },
    };

    return JSON.stringify(sample, null, 2);
  }
}