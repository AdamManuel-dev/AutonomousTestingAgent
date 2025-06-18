import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Save, Eye, EyeOff, Key, Settings, Database, Zap } from 'lucide-react';

interface ConfigManagerProps {
  config: any;
  onUpdate: (config: any) => void;
}

export const ConfigManager: React.FC<ConfigManagerProps> = ({ config, onUpdate }) => {
  const [localConfig, setLocalConfig] = useState(config || {});
  const [showSecrets, setShowSecrets] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const updateLocalConfig = (path: string, value: any) => {
    const newConfig = { ...localConfig };
    const keys = path.split('.');
    let current = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    setLocalConfig(newConfig);
    setIsDirty(true);
  };

  const handleSave = () => {
    onUpdate(localConfig);
    setIsDirty(false);
  };

  const SecretInput: React.FC<{ label: string; path: string; placeholder: string }> = ({
    label,
    path,
    placeholder,
  }) => {
    const getValue = (obj: any, path: string) => {
      return path.split('.').reduce((o, k) => o?.[k], obj) || '';
    };

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2">
          <Key className="w-4 h-4" />
          {label}
        </label>
        <div className="flex gap-2">
          <Input
            type={showSecrets ? 'text' : 'password'}
            value={getValue(localConfig, path)}
            onChange={(e) => updateLocalConfig(path, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSecrets(!showSecrets)}
          >
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  };

  const ToggleConfig: React.FC<{ label: string; path: string; description?: string }> = ({
    label,
    path,
    description,
  }) => {
    const getValue = (obj: any, path: string) => {
      return path.split('.').reduce((o, k) => o?.[k], obj) || false;
    };

    const isEnabled = getValue(localConfig, path);

    return (
      <div className="flex items-center justify-between py-2">
        <div>
          <div className="font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        <Button
          variant={isEnabled ? "default" : "outline"}
          size="sm"
          onClick={() => updateLocalConfig(path, !isEnabled)}
        >
          {isEnabled ? 'Enabled' : 'Disabled'}
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuration</h1>
        <div className="flex gap-2">
          {isDirty && (
            <Badge variant="warning">Unsaved Changes</Badge>
          )}
          <Button onClick={handleSave} disabled={!isDirty} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </div>

      <Tabs defaultValue="secrets">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="secrets" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Secrets
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Advanced
          </TabsTrigger>
        </TabsList>

        <TabsContent value="secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Analytics</CardTitle>
              <CardDescription>Configure error tracking and analytics services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleConfig
                label="Sentry Error Tracking"
                path="sentry.enabled"
                description="Enable detailed error tracking and performance monitoring"
              />
              
              {localConfig.sentry?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <SecretInput
                    label="Sentry DSN"
                    path="sentry.dsn"
                    placeholder="https://your-dsn@sentry.io/project-id"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Environment</label>
                      <Input
                        value={localConfig.sentry?.environment || ''}
                        onChange={(e) => updateLocalConfig('sentry.environment', e.target.value)}
                        placeholder="development"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Release</label>
                      <Input
                        value={localConfig.sentry?.release || ''}
                        onChange={(e) => updateLocalConfig('sentry.release', e.target.value)}
                        placeholder="1.0.0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <ToggleConfig
                label="PostHog Analytics"
                path="posthog.enabled"
                description="Enable usage analytics and user behavior tracking"
              />
              
              {localConfig.posthog?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <SecretInput
                    label="PostHog API Key"
                    path="posthog.apiKey"
                    placeholder="phc_your_api_key_here"
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Host</label>
                    <Input
                      value={localConfig.posthog?.host || ''}
                      onChange={(e) => updateLocalConfig('posthog.host', e.target.value)}
                      placeholder="https://app.posthog.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <ToggleConfig
                      label="User Tracking"
                      path="posthog.enableUserTracking"
                      description="Track user interactions and workflows"
                    />
                    <ToggleConfig
                      label="Test Tracking"
                      path="posthog.enableTestTracking"
                      description="Track test execution metrics"
                    />
                    <ToggleConfig
                      label="Error Tracking"
                      path="posthog.enableErrorTracking"
                      description="Track error events and patterns"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integration Secrets</CardTitle>
              <CardDescription>API keys and tokens for external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleConfig
                label="JIRA Integration"
                path="jira.enabled"
                description="Connect to JIRA for ticket tracking"
              />
              
              {localConfig.jira?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Base URL</label>
                    <Input
                      value={localConfig.jira?.baseUrl || ''}
                      onChange={(e) => updateLocalConfig('jira.baseUrl', e.target.value)}
                      placeholder="https://yourcompany.atlassian.net"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={localConfig.jira?.email || ''}
                      onChange={(e) => updateLocalConfig('jira.email', e.target.value)}
                      placeholder="your-email@company.com"
                    />
                  </div>
                  <SecretInput
                    label="API Token"
                    path="jira.apiToken"
                    placeholder="Your JIRA API token"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Testing Features</CardTitle>
              <CardDescription>Configure test execution and monitoring features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleConfig
                label="Coverage Analysis"
                path="coverage.enabled"
                description="Track and analyze test coverage"
              />
              <ToggleConfig
                label="Complexity Analysis"
                path="complexity.enabled"
                description="Monitor code complexity changes"
              />
              <ToggleConfig
                label="Critical Path Monitoring"
                path="criticalPaths.enabled"
                description="Enhanced testing for critical code paths"
              />
              <ToggleConfig
                label="Postman API Testing"
                path="postman.enabled"
                description="Automated API testing with Postman collections"
              />
              <ToggleConfig
                label="Stagehand UI Testing"
                path="stagehand.enabled"
                description="Natural language UI testing automation"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Development Tool Integrations</CardTitle>
              <CardDescription>Configure connections to development tools</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ToggleConfig
                label="MCP Integration"
                path="mcp.enabled"
                description="Model Context Protocol for enhanced AI capabilities"
              />
              <ToggleConfig
                label="Environment Monitoring"
                path="environments.enabled"
                description="Monitor deployment environments"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">Cursor Port</label>
                <Input
                  type="number"
                  value={localConfig.cursorPort || ''}
                  onChange={(e) => updateLocalConfig('cursorPort', parseInt(e.target.value))}
                  placeholder="3456"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Configuration</CardTitle>
              <CardDescription>Fine-tune agent behavior and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Debounce Time (ms)</label>
                  <Input
                    type="number"
                    value={localConfig.debounceMs || ''}
                    onChange={(e) => updateLocalConfig('debounceMs', parseInt(e.target.value))}
                    placeholder="1000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Root</label>
                  <Input
                    value={localConfig.projectRoot || ''}
                    onChange={(e) => updateLocalConfig('projectRoot', e.target.value)}
                    placeholder="./project"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Exclude Patterns (comma-separated)</label>
                <Input
                  value={localConfig.excludePatterns?.join(', ') || ''}
                  onChange={(e) => updateLocalConfig('excludePatterns', e.target.value.split(', '))}
                  placeholder="**/node_modules/**, **/dist/**"
                />
              </div>

              <ToggleConfig
                label="Debug Mode"
                path="debug"
                description="Enable verbose logging and debug output"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};