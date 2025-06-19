import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { BarChart3, TrendingUp, Clock, Zap, Download, RefreshCw } from 'lucide-react';

interface PerformanceMetrics {
  testExecution: {
    totalTests: number;
    avgDuration: number;
    successRate: number;
    throughput: number; // tests per minute
  };
  coverage: {
    overall: number;
    trend: 'up' | 'down' | 'stable';
    files: number;
    criticalPaths: number;
  };
  complexity: {
    avgComplexity: number;
    highComplexityFiles: number;
    complexityTrend: 'up' | 'down' | 'stable';
  };
  system: {
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    uptime: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    topErrors: Array<{ message: string; count: number }>;
  };
  fileChanges: {
    totalChanges: number;
    avgFilesPerChange: number;
    mostActiveFiles: Array<{ file: string; changes: number }>;
  };
}

interface PerformanceMetricsProps {
  metrics?: PerformanceMetrics;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics: initialMetrics,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | undefined>(initialMetrics);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setMetrics(initialMetrics);
    if (initialMetrics) {
      setLastUpdated(new Date());
    }
  }, [initialMetrics]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/metrics');
        if (response.ok) {
          const newMetrics = await response.json();
          setMetrics(newMetrics);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const newMetrics = await response.json();
        setMetrics(newMetrics);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Performance Metrics</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <Card className="cursor-default">
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              No metrics available yet. Start the agent to begin collecting performance data.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      case 'stable':
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Performance Metrics</h1>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Test Execution Metrics */}
      <Card className="cursor-default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Test Execution Performance
          </CardTitle>
          <CardDescription>Metrics about test execution and performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Total Tests</div>
              <div className="text-2xl font-bold">{metrics.testExecution.totalTests}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Avg Duration</div>
              <div className="text-2xl font-bold">{metrics.testExecution.avgDuration}ms</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Success Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {(metrics.testExecution.successRate ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Throughput</div>
              <div className="text-2xl font-bold">{metrics.testExecution.throughput} tests/min</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Metrics */}
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Coverage Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Overall Coverage</div>
                <div className="text-2xl font-bold">
                  {(metrics.coverage.overall ?? 0).toFixed(1)}%
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(metrics.coverage.trend)}
                <Badge
                  variant={
                    metrics.coverage.trend === 'up'
                      ? 'success'
                      : metrics.coverage.trend === 'down'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {metrics.coverage.trend}
                </Badge>
              </div>
            </div>

            <div className="w-full bg-secondary rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all"
                style={{ width: `${metrics.coverage.overall ?? 0}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <div className="text-sm text-muted-foreground">Files Covered</div>
                <div className="text-xl font-semibold">{metrics.coverage.files}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Critical Paths</div>
                <div className="text-xl font-semibold">{metrics.coverage.criticalPaths}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complexity Metrics */}
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Code Complexity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Avg Complexity</div>
                <div className="text-2xl font-bold">
                  {(metrics.complexity.avgComplexity ?? 0).toFixed(1)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(metrics.complexity.complexityTrend)}
                <Badge
                  variant={
                    metrics.complexity.complexityTrend === 'down'
                      ? 'success'
                      : metrics.complexity.complexityTrend === 'up'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {metrics.complexity.complexityTrend}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground">High Complexity Files</div>
              <div className="text-xl font-semibold text-orange-600">
                {metrics.complexity.highComplexityFiles}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card className="cursor-default">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            System Resources
          </CardTitle>
          <CardDescription>Current system resource usage and uptime</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Memory Usage</div>
              <div className="text-xl font-bold">
                {(metrics.system.memoryUsage ?? 0).toFixed(1)}%
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metrics.system.memoryUsage > 80
                      ? 'bg-red-500'
                      : metrics.system.memoryUsage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.system.memoryUsage ?? 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">CPU Usage</div>
              <div className="text-xl font-bold">{(metrics.system.cpuUsage ?? 0).toFixed(1)}%</div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metrics.system.cpuUsage > 80
                      ? 'bg-red-500'
                      : metrics.system.cpuUsage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.system.cpuUsage ?? 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Disk Usage</div>
              <div className="text-xl font-bold">{(metrics.system.diskUsage ?? 0).toFixed(1)}%</div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    metrics.system.diskUsage > 80
                      ? 'bg-red-500'
                      : metrics.system.diskUsage > 60
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{ width: `${metrics.system.diskUsage ?? 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Uptime</div>
              <div className="text-xl font-bold">{formatUptime(metrics.system.uptime)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Error Analysis */}
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle>Error Analysis</CardTitle>
            <CardDescription>Error tracking and patterns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Errors</div>
                <div className="text-2xl font-bold text-red-600">{metrics.errors.totalErrors}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
                <div className="text-2xl font-bold text-red-600">
                  {(metrics.errors.errorRate ?? 0).toFixed(2)}%
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Top Errors</div>
              <div className="space-y-2">
                {metrics.errors.topErrors.slice(0, 3).map((error, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-muted rounded hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <div className="text-sm truncate flex-1 mr-2">{error.message}</div>
                    <Badge variant="destructive">{error.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Changes */}
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle>File Activity</CardTitle>
            <CardDescription>File change patterns and hot spots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Total Changes</div>
                <div className="text-2xl font-bold">{metrics.fileChanges.totalChanges}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Avg Files/Change</div>
                <div className="text-2xl font-bold">
                  {metrics.fileChanges.avgFilesPerChange.toFixed(1)}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Most Active Files</div>
              <div className="space-y-2">
                {metrics.fileChanges.mostActiveFiles.slice(0, 3).map((file, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-2 bg-muted rounded hover:bg-muted/80 transition-colors cursor-pointer"
                  >
                    <div className="text-sm truncate flex-1 mr-2">{file.file}</div>
                    <Badge variant="outline">{file.changes}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
