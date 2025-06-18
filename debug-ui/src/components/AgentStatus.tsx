import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, Square, RotateCcw, Activity, Cpu, HardDrive, Network } from 'lucide-react';

interface AgentStatusProps {
  state: {
    running: boolean;
    cursorConnected: boolean;
    lastActivity?: string;
    config?: any;
    systemInfo?: {
      cpu: number;
      memory: number;
      disk: number;
      network: { rx: number; tx: number };
    };
    performance?: {
      avgTestDuration: number;
      successRate: number;
      errorRate: number;
    };
  };
  onControl: (action: 'start' | 'stop' | 'restart') => void;
}

export const AgentStatus: React.FC<AgentStatusProps> = ({ state, onControl }) => {
  const { running, cursorConnected, lastActivity, systemInfo, performance } = state;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Agent Status</h1>
        <div className="flex gap-2">
          <Button
            variant={running ? "destructive" : "default"}
            onClick={() => onControl(running ? 'stop' : 'start')}
            className="flex items-center gap-2"
          >
            {running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {running ? 'Stop' : 'Start'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onControl('restart')}
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agent Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={running ? "success" : "destructive"}>
                {running ? 'Running' : 'Stopped'}
              </Badge>
            </div>
            {lastActivity && (
              <p className="text-xs text-muted-foreground mt-2">
                Last activity: {new Date(lastActivity).toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursor Connection</CardTitle>
            <Network className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={cursorConnected ? "success" : "secondary"}>
              {cursorConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </CardContent>
        </Card>

        {performance && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.successRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Avg test duration: {performance.avgTestDuration}ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{performance.errorRate.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {systemInfo && (
        <Card>
          <CardHeader>
            <CardTitle>System Resources</CardTitle>
            <CardDescription>Real-time system monitoring</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Cpu className="w-4 h-4" />
                    CPU Usage
                  </span>
                  <span className="text-sm text-muted-foreground">{systemInfo.cpu.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${systemInfo.cpu}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    Memory Usage
                  </span>
                  <span className="text-sm text-muted-foreground">{systemInfo.memory.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${systemInfo.memory}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Network className="w-4 h-4" />
                    Network
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ↓{(systemInfo.network.rx / 1024).toFixed(1)}KB/s ↑{(systemInfo.network.tx / 1024).toFixed(1)}KB/s
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common debugging operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="outline" size="sm">Clear Logs</Button>
            <Button variant="outline" size="sm">Reset Metrics</Button>
            <Button variant="outline" size="sm">Run Health Check</Button>
            <Button variant="outline" size="sm">Export Debug Data</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};