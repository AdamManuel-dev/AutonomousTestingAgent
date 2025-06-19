import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Send, Terminal, Bot, User, Copy, Download, Trash2 } from 'lucide-react';

interface PromptMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface PromptInterfaceProps {
  agentRunning: boolean;
}

export const PromptInterface: React.FC<PromptInterfaceProps> = ({ agentRunning }) => {
  const [messages, setMessages] = useState<PromptMessage[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendPrompt = async () => {
    if (!currentPrompt.trim() || isLoading) return;

    const userMessage: PromptMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: currentPrompt,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setCurrentPrompt('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      });

      const result = await response.json();

      const agentMessage: PromptMessage = {
        id: `agent-${Date.now()}`,
        type: 'agent',
        content: result.response || 'No response from agent',
        timestamp: new Date().toISOString(),
        metadata: result.metadata,
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      const errorMessage: PromptMessage = {
        id: `error-${Date.now()}`,
        type: 'system',
        content: `Error: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const exportChat = () => {
    const chatData = messages.map((msg) => ({
      timestamp: msg.timestamp,
      type: msg.type,
      content: msg.content,
      metadata: msg.metadata,
    }));

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-agent-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'agent':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <Terminal className="w-4 h-4" />;
      default:
        return <Terminal className="w-4 h-4" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'user':
        return 'border-blue-200 bg-blue-500 text-white';
      case 'agent':
        return 'border-green-200 bg-green-500 text-white';
      case 'system':
        return 'border-red-200 bg-red-500 text-white';
      default:
        return 'border-gray-200 bg-gray-500 text-white';
    }
  };

  const commonPrompts = [
    'Show current test status',
    'Analyze test coverage gaps',
    'Run all unit tests',
    'Check for complexity issues',
    'Generate test recommendations',
    'Show recent test failures',
    'Export current configuration',
    'Run integration tests',
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">AI Assistant</h1>
        <div className="flex flex-wrap gap-2">
          <Badge variant={agentRunning ? 'success' : 'secondary'} className="text-xs md:text-sm">
            {agentRunning ? '🤖 Agent Online' : '⚠️ Agent Offline'}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportChat} className="text-xs md:text-sm">
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearMessages}
            className="text-xs md:text-sm"
          >
            <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Quick Prompts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg md:text-xl">Quick Actions</CardTitle>
          <CardDescription className="text-sm">
            Click on common prompts to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {commonPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setCurrentPrompt(prompt)}
                className="text-left h-auto p-3 text-wrap text-xs md:text-sm justify-start hover:bg-accent"
                disabled={!agentRunning}
              >
                {prompt}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
            <Terminal className="w-4 h-4 md:w-5 md:h-5" />
            Agent Console
          </CardTitle>
          <CardDescription className="text-sm">
            Interact with the test agent using natural language commands
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Messages */}
          <div className="h-64 md:h-96 overflow-y-auto mb-4 space-y-3 p-3 md:p-4 bg-muted/20 rounded-lg border scrollbar-thin">
            {messages.length === 0 ? (
              <div className="text-center text-muted-foreground py-8 md:py-12">
                <Bot className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm md:text-base">Start a conversation with the test agent</p>
                <p className="text-xs md:text-sm mt-1">
                  Ask about test status, coverage, or request actions
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg border ${getMessageColor(message.type)} transition-all hover:shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex-shrink-0">{getMessageIcon(message.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          {message.type}
                        </Badge>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-background/50"
                            onClick={() => copyMessage(message.content)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                        {message.content}
                      </div>
                      {message.metadata && (
                        <details className="mt-3">
                          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                            View metadata →
                          </summary>
                          <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto border">
                            {JSON.stringify(message.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-muted bg-muted/50">
                <Bot className="w-4 h-4 animate-pulse" />
                <div className="flex-1">
                  <Badge variant="outline" className="text-xs mb-1">
                    agent
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      Thinking...
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                        <div className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:0.2s]" />
                        <div className="w-1 h-1 bg-current rounded-full animate-pulse [animation-delay:0.4s]" />
                      </div>
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder={agentRunning ? 'Ask the agent anything...' : 'Agent is offline'}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={!agentRunning || isLoading}
              className="flex-1 text-sm md:text-base"
            />
            <Button
              onClick={sendPrompt}
              disabled={!agentRunning || !currentPrompt.trim() || isLoading}
              className="flex items-center gap-2 text-sm md:text-base whitespace-nowrap"
              size="default"
            >
              <Send className="w-3 h-3 md:w-4 md:h-4" />
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>

          {!agentRunning && (
            <div className="mt-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-warning-foreground">
                <span className="text-base">⚠️</span>
                <span>The agent must be running to process prompts</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
