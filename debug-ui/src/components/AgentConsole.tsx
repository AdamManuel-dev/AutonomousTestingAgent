import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Terminal, Pause, Play, Download, Trash2, Filter } from 'lucide-react';

interface ConsoleEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'success';
  source: string;
  message: string;
  data?: any;
}

interface AgentConsoleProps {
  isConnected: boolean;
}

export const AgentConsole: React.FC<AgentConsoleProps> = ({ isConnected }) => {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isConnected) {
      connectWebSocket();
    }

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isConnected]);

  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const connectWebSocket = () => {
    if (ws.current) {
      ws.current.close();
    }

    ws.current = new WebSocket('ws://localhost:3001/console');
    
    ws.current.onopen = () => {
      addEntry('success', 'console', '🟢 Connected to agent console');
    };

    ws.current.onmessage = (event) => {
      if (isPaused) return;
      
      try {
        const data = JSON.parse(event.data);
        handleConsoleMessage(data);
      } catch (error) {
        addEntry('error', 'console', `Failed to parse message: ${event.data}`);
      }
    };

    ws.current.onclose = () => {
      addEntry('warn', 'console', '🔴 Disconnected from agent console');
    };

    ws.current.onerror = (error) => {
      addEntry('error', 'console', `WebSocket error: ${error}`);
    };
  };

  const handleConsoleMessage = (data: any) => {
    switch (data.type) {
      case 'console':
        addEntry(data.level || 'info', data.source || 'agent', data.message, data.data);
        break;
      case 'test-start':
        addEntry('info', 'test-runner', `🧪 Starting ${data.suite} tests...`);
        break;
      case 'test-complete':
        addEntry(
          data.success ? 'success' : 'error',
          'test-runner',
          `${data.success ? '✅' : '❌'} ${data.suite} tests ${data.success ? 'passed' : 'failed'} (${data.duration}ms)`
        );
        break;
      case 'file-change':
        addEntry('info', 'file-watcher', `📝 File changed: ${data.file}`);
        break;
      case 'coverage-update':
        addEntry('info', 'coverage', `📊 Coverage: ${data.percentage.toFixed(1)}%`);
        break;
      case 'error':
        addEntry('error', data.component || 'agent', `❌ ${data.message}`, data.stack);
        break;
      case 'log':
        addEntry(data.level, data.component, data.message, data.metadata);
        break;
      default:
        addEntry('debug', 'unknown', `Unknown message type: ${data.type}`, data);
    }
  };

  const addEntry = (level: string, source: string, message: string, data?: any) => {
    const entry: ConsoleEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level: level as any,
      source,
      message,
      data,
    };

    setEntries(prev => {
      const newEntries = [...prev, entry];
      // Keep only last 500 entries for performance
      return newEntries.slice(-500);
    });
  };

  const clearEntries = () => {
    setEntries([]);
  };

  const exportEntries = () => {
    const exportData = entries.map(entry => ({
      timestamp: entry.timestamp,
      level: entry.level,
      source: entry.source,
      message: entry.message,
      data: entry.data,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-console-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true;
    return entry.level === filter;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'success': return 'text-green-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-400';
      default: return 'text-gray-300';
    }
  };

  const getLevelSymbol = (level: string) => {
    switch (level) {
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'success': return '✅';
      case 'info': return 'ℹ️';
      case 'debug': return '🔍';
      default: return '•';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Agent Console</h2>
          <Badge variant={isConnected ? 'success' : 'destructive'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="cursor-pointer"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          
          <Button variant="outline" size="sm" onClick={exportEntries} className="cursor-pointer">
            <Download className="w-4 h-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={clearEntries} className="cursor-pointer">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-8 rounded border border-input bg-background px-2 text-sm cursor-pointer hover:border-primary transition-colors"
          >
            <option value="all">All</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="success">Success</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded cursor-pointer"
          />
          Auto-scroll
        </label>

        <div className="text-sm text-muted-foreground">
          {filteredEntries.length} / {entries.length} entries
        </div>
      </div>

      {/* Console */}
      <Card>
        <CardContent className="p-0">
          <div
            ref={consoleRef}
            className="h-96 overflow-y-auto bg-black text-green-400 font-mono text-sm p-4 space-y-1"
          >
            {filteredEntries.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                {isPaused ? 'Console paused - click Resume to continue' : 'Waiting for agent output...'}
              </div>
            ) : (
              filteredEntries.map((entry) => (
                <div key={entry.id} className="flex gap-2 hover:bg-gray-900 px-2 py-1 rounded transition-colors cursor-default">
                  <span className="text-gray-500 shrink-0 w-16">
                    {new Date(entry.timestamp).toLocaleTimeString().slice(0, -3)}
                  </span>
                  
                  <span className="shrink-0 w-4">
                    {getLevelSymbol(entry.level)}
                  </span>
                  
                  <span className="text-gray-400 shrink-0 w-20 truncate">
                    {entry.source}
                  </span>
                  
                  <span className={`flex-1 ${getLevelColor(entry.level)}`}>
                    {entry.message}
                  </span>
                  
                  {entry.data && (
                    <details className="shrink-0 text-gray-500">
                      <summary className="cursor-pointer hover:text-gray-300 transition-colors">...</summary>
                      <pre className="text-xs mt-1 whitespace-pre-wrap max-w-md">
                        {JSON.stringify(entry.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {['error', 'warn', 'success', 'info', 'debug'].map((level) => {
          const count = entries.filter(entry => entry.level === level).length;
          return (
            <Card key={level} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilter(level)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm capitalize">{level}</span>
                  <span className={`font-bold ${getLevelColor(level)}`}>{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};