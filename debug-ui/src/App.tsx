import React, { useState, useEffect } from 'react';
import { AgentStatus } from './components/AgentStatus';
import { ConfigManager } from './components/ConfigManager';
import { TestResults } from './components/TestResults';
import { LogViewer } from './components/LogViewer';
import { PerformanceMetrics } from './components/PerformanceMetrics';
import { PromptInterface } from './components/PromptInterface';
import { AgentConsole } from './components/AgentConsole';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Badge } from './components/ui/badge';
import './styles/globals.css';

interface AgentState {
  running: boolean;
  cursorConnected: boolean;
  lastActivity?: string;
  config?: any;
  testResults?: any[];
  logs?: any[];
  metrics?: any;
}

const App: React.FC = () => {
  const [agentState, setAgentState] = useState<AgentState>({
    running: false,
    cursorConnected: false,
  });
  const [activeTab, setActiveTab] = useState('status');
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket for real-time updates
    const websocket = new WebSocket('ws://localhost:3001/ws');
    
    websocket.onopen = () => {
      console.log('Connected to debug server');
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    websocket.onclose = () => {
      console.log('Disconnected from debug server');
      setWs(null);
      // Attempt reconnection after 5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 5000);
    };

    // Initial data fetch
    fetchAgentStatus();
    fetchConfig();

    return () => {
      websocket.close();
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'agent-status':
        setAgentState(prev => ({ ...prev, ...data.payload }));
        break;
      case 'test-result':
        setAgentState(prev => ({
          ...prev,
          testResults: [...(prev.testResults || []), data.payload],
        }));
        break;
      case 'log':
        setAgentState(prev => ({
          ...prev,
          logs: [...(prev.logs || []), data.payload],
        }));
        break;
      case 'metrics':
        setAgentState(prev => ({ ...prev, metrics: data.payload }));
        break;
    }
  };

  const fetchAgentStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const status = await response.json();
      setAgentState(prev => ({ ...prev, ...status }));
    } catch (error) {
      console.error('Failed to fetch agent status:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const config = await response.json();
      setAgentState(prev => ({ ...prev, config }));
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
  };

  const updateConfig = async (newConfig: any) => {
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      
      if (response.ok) {
        const updatedConfig = await response.json();
        setAgentState(prev => ({ ...prev, config: updatedConfig }));
      }
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const controlAgent = async (action: 'start' | 'stop' | 'restart') => {
    try {
      await fetch(`/api/agent/${action}`, { method: 'POST' });
      setTimeout(fetchAgentStatus, 1000);
    } catch (error) {
      console.error(`Failed to ${action} agent:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Connection Status */}
      <div className="fixed top-4 right-4 z-50">
        <Badge variant={ws ? 'success' : 'destructive'}>
          {ws ? '🟢 Connected' : '🔴 Disconnected'}
        </Badge>
      </div>

      <div className="container mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Test Agent Debug Console</h1>
          <p className="text-muted-foreground">Monitor and configure your test running agent</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="status">🤖 Status</TabsTrigger>
            <TabsTrigger value="config">⚙️ Config</TabsTrigger>
            <TabsTrigger value="tests">🧪 Tests</TabsTrigger>
            <TabsTrigger value="console">🖥️ Console</TabsTrigger>
            <TabsTrigger value="logs">📋 Logs</TabsTrigger>
            <TabsTrigger value="metrics">📊 Metrics</TabsTrigger>
            <TabsTrigger value="prompt">💬 AI Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-6">
            <AgentStatus 
              state={agentState} 
              onControl={controlAgent}
            />
          </TabsContent>
          
          <TabsContent value="config" className="mt-6">
            <ConfigManager 
              config={agentState.config}
              onUpdate={updateConfig}
            />
          </TabsContent>
          
          <TabsContent value="tests" className="mt-6">
            <TestResults results={agentState.testResults || []} />
          </TabsContent>
          
          <TabsContent value="console" className="mt-6">
            <AgentConsole isConnected={!!ws} />
          </TabsContent>
          
          <TabsContent value="logs" className="mt-6">
            <LogViewer logs={agentState.logs || []} />
          </TabsContent>
          
          <TabsContent value="metrics" className="mt-6">
            <PerformanceMetrics metrics={agentState.metrics} />
          </TabsContent>
          
          <TabsContent value="prompt" className="mt-6">
            <PromptInterface agentRunning={agentState.running} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default App;