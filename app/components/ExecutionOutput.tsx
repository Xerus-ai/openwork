import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ExecutionEntry, ExecutionOutputType, ExecutionStatus } from '@/hooks/useExecution';
import { Terminal, CheckCircle, XCircle, Info, FileText, Loader, Globe, Wrench } from 'lucide-react';

/**
 * Props for the ExecutionOutput component.
 */
export interface ExecutionOutputProps {
  entry: ExecutionEntry;
  className?: string;
}

/**
 * Formats a timestamp for display.
 * Shows only time for terminal-like output.
 */
function formatTimestamp(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Gets the icon for an output type and status.
 */
function getOutputIcon(
  type: ExecutionOutputType,
  status: ExecutionStatus
): ReactElement {
  if (status === 'running') {
    return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
  }

  switch (type) {
    case 'command':
      if (status === 'success') {
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      }
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'info':
      return <Info className="w-4 h-4 text-blue-500" />;
    case 'file':
      return <FileText className="w-4 h-4 text-amber-500" />;
    case 'web':
      if (status === 'success') {
        return <Globe className="w-4 h-4 text-purple-500" />;
      }
      return <XCircle className="w-4 h-4 text-red-500" />;
    case 'tool':
      if (status === 'success') {
        return <Wrench className="w-4 h-4 text-cyan-500" />;
      }
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Terminal className="w-4 h-4 text-muted-foreground" />;
  }
}

/**
 * Gets the background color class for an output type.
 */
function getOutputBackground(type: ExecutionOutputType, status: ExecutionStatus): string {
  if (status === 'running') {
    return 'bg-blue-950/20 border-blue-900/30';
  }

  if (status === 'error') {
    return 'bg-red-950/20 border-red-900/30';
  }

  switch (type) {
    case 'error':
      return 'bg-red-950/20 border-red-900/30';
    case 'info':
      return 'bg-blue-950/20 border-blue-900/30';
    case 'file':
      return 'bg-amber-950/20 border-amber-900/30';
    case 'command':
      return 'bg-green-950/20 border-green-900/30';
    case 'web':
      return 'bg-purple-950/20 border-purple-900/30';
    case 'tool':
      return 'bg-cyan-950/20 border-cyan-900/30';
    default:
      return 'bg-muted/30 border-border';
  }
}

/**
 * Gets the text color class for output type.
 */
function getOutputTextColor(type: ExecutionOutputType, status: ExecutionStatus): string {
  if (status === 'error' || type === 'error') {
    return 'text-red-400';
  }
  if (type === 'info') {
    return 'text-blue-400';
  }
  if (type === 'file') {
    return 'text-amber-400';
  }
  if (type === 'web') {
    return 'text-purple-400';
  }
  if (type === 'tool') {
    return 'text-cyan-400';
  }
  return 'text-foreground';
}

/**
 * Renders syntax highlighting for code content.
 * Basic highlighting for common shell output patterns.
 */
function renderHighlightedContent(content: string): ReactElement[] {
  const lines = content.split('\n');

  return lines.map((line, index) => {
    const highlightedLine = highlightLine(line);
    return (
      <div key={index} className="leading-relaxed">
        {highlightedLine}
        {index < lines.length - 1 && line && <br />}
      </div>
    );
  });
}

/**
 * Applies syntax highlighting to a single line.
 */
function highlightLine(line: string): ReactElement {
  // Skip empty lines
  if (!line.trim()) {
    return <span className="h-4 block" />;
  }

  // Highlight error patterns
  if (/^(error|Error|ERROR|fatal|Fatal|FATAL):?/i.test(line)) {
    return <span className="text-red-400">{line}</span>;
  }

  // Highlight warning patterns
  if (/^(warn|warning|Warning|WARN|WARNING):?/i.test(line)) {
    return <span className="text-yellow-400">{line}</span>;
  }

  // Highlight success patterns
  if (/^(success|Success|SUCCESS|done|Done|DONE|ok|OK|passed|Passed|PASSED):?/i.test(line)) {
    return <span className="text-green-400">{line}</span>;
  }

  // Highlight info patterns
  if (/^(info|Info|INFO|note|Note|NOTE):?/i.test(line)) {
    return <span className="text-blue-400">{line}</span>;
  }

  // Highlight file paths
  const pathPattern = /([A-Za-z]:\\[^\s]+|\/[^\s]+\.[a-zA-Z]+)/g;
  const parts: ReactElement[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIndex = 0;

  while ((match = pathPattern.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={keyIndex++}>{line.slice(lastIndex, match.index)}</span>
      );
    }
    parts.push(
      <span key={keyIndex++} className="text-cyan-400 underline decoration-dotted">
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (parts.length > 0) {
    if (lastIndex < line.length) {
      parts.push(<span key={keyIndex}>{line.slice(lastIndex)}</span>);
    }
    return <>{parts}</>;
  }

  return <span>{line}</span>;
}

/**
 * Renders a command header with prompt symbol.
 */
function CommandHeader({
  command,
  timestamp,
  status,
  exitCode,
}: {
  command: string;
  timestamp: Date;
  status: ExecutionStatus;
  exitCode?: number;
}): ReactElement {
  return (
    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/50">
      <span className="text-green-400 font-bold">$</span>
      <code className="flex-1 text-sm font-mono text-foreground">{command}</code>
      <span className="text-xs text-muted-foreground">
        {formatTimestamp(timestamp)}
      </span>
      {status === 'running' && (
        <span className="text-xs text-blue-400">running...</span>
      )}
      {status !== 'running' && exitCode !== undefined && (
        <span
          className={cn(
            'text-xs font-mono',
            exitCode === 0 ? 'text-green-400' : 'text-red-400'
          )}
        >
          exit: {exitCode}
        </span>
      )}
    </div>
  );
}

/**
 * Renders a file operation header.
 */
function FileOperationHeader({
  filePath,
  operation,
  timestamp,
}: {
  filePath: string;
  operation: string;
  timestamp: Date;
}): ReactElement {
  return (
    <div className="flex items-center gap-2">
      <FileText className="w-4 h-4 text-amber-500" />
      <span className="text-sm text-amber-400">{operation}</span>
      <code className="flex-1 text-sm font-mono text-cyan-400 underline decoration-dotted">
        {filePath}
      </code>
      <span className="text-xs text-muted-foreground">
        {formatTimestamp(timestamp)}
      </span>
    </div>
  );
}

/**
 * Renders a single execution output entry.
 * Supports command execution, standard output, errors, info messages, and file operations.
 */
export const ExecutionOutput = memo(function ExecutionOutput({
  entry,
  className,
}: ExecutionOutputProps): ReactElement {
  const { type, content, timestamp, status, command, exitCode, filePath } = entry;

  const icon = useMemo(() => getOutputIcon(type, status), [type, status]);
  const background = useMemo(() => getOutputBackground(type, status), [type, status]);
  const textColor = useMemo(() => getOutputTextColor(type, status), [type, status]);

  const highlightedContent = useMemo(() => {
    if (!content) return null;
    return renderHighlightedContent(content);
  }, [content]);

  // Render command execution
  if (type === 'command' && command) {
    return (
      <div
        className={cn(
          'rounded-lg border p-3 font-mono text-sm',
          background,
          className
        )}
        role="log"
        aria-label={`Command: ${command}`}
      >
        <CommandHeader
          command={command}
          timestamp={timestamp}
          status={status}
          exitCode={exitCode}
        />
        {content && (
          <div className={cn('whitespace-pre-wrap break-all', textColor)}>
            {highlightedContent}
          </div>
        )}
      </div>
    );
  }

  // Render file operation
  if (type === 'file' && filePath) {
    return (
      <div
        className={cn(
          'rounded-lg border p-3',
          background,
          className
        )}
        role="log"
        aria-label={`File operation: ${content}`}
      >
        <FileOperationHeader
          filePath={filePath}
          operation={content}
          timestamp={timestamp}
        />
      </div>
    );
  }

  // Render standard output (output, error, info)
  return (
    <div
      className={cn(
        'rounded-lg border p-3 font-mono text-sm',
        background,
        className
      )}
      role="log"
      aria-label={`${type}: ${content.slice(0, 50)}`}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground capitalize">{type}</span>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(timestamp)}
            </span>
          </div>
          <div className={cn('whitespace-pre-wrap break-all', textColor)}>
            {highlightedContent}
          </div>
        </div>
      </div>
    </div>
  );
});
