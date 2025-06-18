import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Trash2, Download, Search, Filter, Pause, Play } from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  message: string;
  metadata?: any;
}

interface LogViewerProps {
  logs: LogEntry[];
}

export const LogViewer: React.FC<LogViewerProps> = ({ logs }) => {
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(logs);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [componentFilter, setComponentFilter] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const logLevels = ['all', 'info', 'warn', 'error', 'debug'];
  const components = ['all', ...Array.from(new Set(logs.map(log => log.component)))];

  useEffect(() => {
    if (!isPaused) {
      let filtered = logs;

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(log =>
          log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.component.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by level
      if (levelFilter !== 'all') {
        filtered = filtered.filter(log => log.level === levelFilter);
      }

      // Filter by component
      if (componentFilter !== 'all') {
        filtered = filtered.filter(log => log.component === componentFilter);
      }

      setFilteredLogs(filtered);
    }
  }, [logs, searchTerm, levelFilter, componentFilter, isPaused]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const clearLogs = async () => {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  const exportLogs = () => {
    const logData = filteredLogs.map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      component: log.component,
      message: log.message,
      metadata: log.metadata,
    }));

    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-agent-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warn': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      case 'debug': return 'text-gray-600';
      default: return 'text-foreground';
    }
  };

  const getLevelBadgeVariant = (level: string) => {
    switch (level) {
      case 'error': return 'destructive' as const;
      case 'warn': return 'warning' as const;
      case 'info': return 'default' as const;
      case 'debug': return 'secondary' as const;
      default: return 'default' as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Log Viewer</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-2"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={exportLogs}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {logLevels.slice(1).map((level) => {
          const count = logs.filter(log => log.level === level).length;
          return (
            <Card key={level}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Badge variant={getLevelBadgeVariant(level)} className="capitalize">
                    {level}
                  </Badge>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Level</label>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {logLevels.map((level) => (
                  <option key={level} value={level} className="capitalize">
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Component</label>
              <select
                value={componentFilter}
                onChange={(e) => setComponentFilter(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {components.map((component) => (
                  <option key={component} value={component}>
                    {component}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span>Auto-scroll to bottom</span>
            </label>
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Log Display */}
      <Card>
        <CardHeader>
          <CardTitle>Live Logs</CardTitle>
          <CardDescription>
            Real-time log output from the test running agent
            {isPaused && <Badge variant="warning" className="ml-2">Paused</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            ref={logContainerRef}
            className="h-96 overflow-y-auto border rounded-md p-4 bg-muted/20 font-mono text-sm space-y-1"
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No logs match the current filters
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-2 hover:bg-muted/50 px-2 py-1 rounded">
                  <span className="text-muted-foreground shrink-0 w-20">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <Badge variant={getLevelBadgeVariant(log.level)} className="shrink-0 text-xs">
                    {log.level.toUpperCase()}
                  </Badge>
                  <span className="text-muted-foreground shrink-0 w-24 truncate">
                    {log.component}
                  </span>
                  <span className={`flex-1 ${getLevelColor(log.level)}`}>
                    {log.message}
                  </span>
                  {log.metadata && (
                    <details className="shrink-0">
                      <summary className="cursor-pointer text-muted-foreground">...</summary>
                      <pre className="text-xs mt-1 whitespace-pre-wrap">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};