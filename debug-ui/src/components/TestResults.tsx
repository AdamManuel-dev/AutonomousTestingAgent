import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { CheckCircle, XCircle, Clock, FileText, Play, Download } from 'lucide-react';

interface TestResult {
  id: string;
  suite: string;
  success: boolean;
  duration: number;
  timestamp: string;
  filesTriggered: string[];
  output?: string;
  coverage?: {
    lines: { percentage: number };
    branches: { percentage: number };
  };
}

interface TestResultsProps {
  results: TestResult[];
}

export const TestResults: React.FC<TestResultsProps> = ({ results }) => {
  const [selectedResult, setSelectedResult] = React.useState<TestResult | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'success' | 'failed'>('all');

  const filteredResults = results.filter(result => {
    if (filter === 'success') return result.success;
    if (filter === 'failed') return !result.success;
    return true;
  });

  const successRate = results.length > 0 
    ? (results.filter(r => r.success).length / results.length) * 100 
    : 0;

  const avgDuration = results.length > 0
    ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Test Results</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" size="sm" className="cursor-pointer">
            <Play className="w-4 h-4 mr-2" />
            Run All Tests
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-default stats-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{results.length}</div>
          </CardContent>
        </Card>

        <Card className="cursor-default stats-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{successRate.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card className="cursor-default stats-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDuration.toFixed(0)}ms</div>
          </CardContent>
        </Card>

        <Card className="cursor-default stats-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Tests</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {results.filter(r => !r.success).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="cursor-pointer"
        >
          All ({results.length})
        </Button>
        <Button
          variant={filter === 'success' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('success')}
          className="cursor-pointer"
        >
          Passed ({results.filter(r => r.success).length})
        </Button>
        <Button
          variant={filter === 'failed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('failed')}
          className="cursor-pointer"
        >
          Failed ({results.filter(r => !r.success).length})
        </Button>
      </div>

      {/* Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle>Recent Test Runs</CardTitle>
            <CardDescription>Click on a test to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredResults.map((result) => (
                <div
                  key={result.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedResult?.id === result.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.suite}</span>
                      <Badge variant={result.success ? 'success' : 'destructive'} className="text-xs">
                        {result.success ? 'PASS' : 'FAIL'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.duration}ms
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                  {result.filesTriggered.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Files: {result.filesTriggered.slice(0, 2).join(', ')}
                      {result.filesTriggered.length > 2 && ` +${result.filesTriggered.length - 2} more`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Test Details */}
        <Card className="cursor-default">
          <CardHeader>
            <CardTitle>Test Details</CardTitle>
            <CardDescription>
              {selectedResult ? `Details for ${selectedResult.suite}` : 'Select a test to view details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant={selectedResult.success ? 'success' : 'destructive'}>
                        {selectedResult.success ? 'PASSED' : 'FAILED'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration</label>
                    <div className="text-lg font-semibold mt-1">{selectedResult.duration}ms</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Triggered Files</label>
                  <div className="mt-1 space-y-1">
                    {selectedResult.filesTriggered.map((file, index) => (
                      <div key={index} className="text-sm bg-muted px-2 py-1 rounded hover:bg-muted/80 transition-colors cursor-pointer">
                        {file}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedResult.coverage && (
                  <div>
                    <label className="text-sm font-medium">Coverage</label>
                    <div className="mt-1 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Lines</span>
                        <span>{selectedResult.coverage.lines.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${selectedResult.coverage.lines.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Branches</span>
                        <span>{selectedResult.coverage.branches.percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${selectedResult.coverage.branches.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedResult.output && (
                  <div>
                    <label className="text-sm font-medium">Output</label>
                    <div className="mt-1 bg-muted p-3 rounded-md text-sm font-mono max-h-64 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{selectedResult.output}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a test result to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};