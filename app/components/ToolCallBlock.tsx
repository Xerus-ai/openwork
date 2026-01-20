/**
 * ToolCallBlock - Expandable tool call display for chat messages.
 *
 * Displays tool executions inline with chat messages, matching the
 * reference design with:
 * - Terminal/tool icon on the left
 * - Tool name/action as header
 * - Expand/collapse chevron
 * - Request details when expanded
 * - Scroll indicator for long content
 */

import type { ReactElement } from 'react';
import { memo, useState, useCallback } from 'react';
import {
  Terminal,
  ChevronDown,
  ChevronRight,
  Globe,
  FileText,
  ListTodo,
  Search,
  Edit3,
  FolderOpen,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolExecution } from '@/hooks/useAgentChat';

/**
 * Props for the ToolCallBlock component.
 */
export interface ToolCallBlockProps {
  execution: ToolExecution;
  className?: string;
}

/**
 * Maps tool names to display names and icons.
 */
function getToolDisplay(toolName: string): { label: string; icon: ReactElement } {
  const iconClass = 'w-4 h-4';

  switch (toolName.toLowerCase()) {
    case 'bash':
    case 'execute':
    case 'shell':
      return {
        label: 'Running command',
        icon: <Terminal className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'websearch':
    case 'web_search':
    case 'search':
      return {
        label: 'Searching the web',
        icon: <Search className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'webfetch':
    case 'web_fetch':
    case 'fetch':
      return {
        label: 'Fetching from web',
        icon: <Globe className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'read':
    case 'readfile':
    case 'read_file':
      return {
        label: 'Reading file',
        icon: <FileText className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'write':
    case 'writefile':
    case 'write_file':
      return {
        label: 'Writing file',
        icon: <Edit3 className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'edit':
    case 'editfile':
    case 'edit_file':
      return {
        label: 'Editing file',
        icon: <Edit3 className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'glob':
    case 'list':
    case 'listfiles':
      return {
        label: 'Listing files',
        icon: <FolderOpen className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'grep':
    case 'search_files':
      return {
        label: 'Searching files',
        icon: <Search className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'todowrite':
    case 'todo_write':
    case 'todo':
      return {
        label: 'Updating todo list',
        icon: <ListTodo className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    case 'todoread':
    case 'todo_read':
      return {
        label: 'Reading todo list',
        icon: <ListTodo className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
    default:
      return {
        label: toolName,
        icon: <Terminal className={cn(iconClass, 'text-cowork-text-muted')} />,
      };
  }
}

/**
 * Format tool input for display.
 * Shows key parameters in a readable format.
 */
function formatToolInput(toolName: string, input: Record<string, unknown>): string {
  // For command tools, show the command
  if (toolName.toLowerCase() === 'bash' && input.command) {
    return String(input.command);
  }

  // For file tools, show the file path
  if (input.file_path || input.filePath || input.path) {
    return String(input.file_path || input.filePath || input.path);
  }

  // For search tools, show the query/pattern
  if (input.query || input.pattern) {
    return String(input.query || input.pattern);
  }

  // For todo tools, show the status
  if (input.todos && Array.isArray(input.todos)) {
    const count = input.todos.length;
    return `${count} item${count !== 1 ? 's' : ''}`;
  }

  // Default: show description if available, or first string value
  if (input.description) {
    return String(input.description);
  }

  // Find first meaningful string value
  for (const value of Object.values(input)) {
    if (typeof value === 'string' && value.length > 0 && value.length < 100) {
      return value;
    }
  }

  return '';
}

/**
 * Status indicator for tool execution.
 */
function StatusIndicator({ status }: { status: ToolExecution['status'] }): ReactElement {
  switch (status) {
    case 'running':
      return <Loader2 className="w-4 h-4 animate-spin text-cowork-active" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-cowork-success" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-destructive" />;
    default:
      return <div className="w-4 h-4" />;
  }
}

/**
 * ToolCallBlock displays a single tool execution in the chat.
 *
 * Features:
 * - Collapsible with expand/collapse button
 * - Shows tool icon and action name
 * - Displays brief description when collapsed
 * - Shows full request/response when expanded
 * - Scroll indicator for long content
 */
export const ToolCallBlock = memo(function ToolCallBlock({
  execution,
  className,
}: ToolCallBlockProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toolName, toolInput, status, output, error } = execution;
  const { label, icon } = getToolDisplay(toolName);
  const briefDescription = formatToolInput(toolName, toolInput);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Determine if content is long enough to show scroll indicator
  const hasLongContent = output && output.length > 500;

  return (
    <div
      className={cn(
        'border border-cowork-border rounded-lg overflow-hidden my-2',
        'bg-white',
        className
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-cowork-hover transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={`${label}: ${briefDescription}`}
      >
        {/* Tool icon */}
        <div className="flex-shrink-0">
          {icon}
        </div>

        {/* Tool label and brief description */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-cowork-text">{label}</span>
          {briefDescription && (
            <span className="text-sm text-cowork-text-muted ml-2 truncate">
              {briefDescription}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <StatusIndicator status={status} />

        {/* Expand/collapse chevron */}
        <div className="flex-shrink-0 text-cowork-text-muted">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-cowork-border">
          {/* Request section */}
          <div className="px-3 py-2 bg-cowork-bg-alt">
            <div className="text-xs text-cowork-text-muted mb-1">Request</div>
            <pre className="text-xs font-mono text-cowork-text overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          </div>

          {/* Output/Error section (if available) */}
          {(output || error) && (
            <div className="px-3 py-2 relative">
              <div className="text-xs text-cowork-text-muted mb-1">
                {error ? 'Error' : 'Output'}
              </div>
              <div
                className={cn(
                  'text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto',
                  error ? 'text-destructive' : 'text-cowork-text'
                )}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {error || output}
                </pre>
              </div>

              {/* Scroll indicator for long content */}
              {hasLongContent && (
                <div className="absolute bottom-2 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-cowork-border text-cowork-text-muted">
                  <ArrowDown className="w-3 h-3" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Props for the ToolCallList component.
 */
export interface ToolCallListProps {
  executions: ToolExecution[];
  className?: string;
}

/**
 * Renders a list of tool call blocks.
 */
export const ToolCallList = memo(function ToolCallList({
  executions,
  className,
}: ToolCallListProps): ReactElement | null {
  if (executions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-1', className)}>
      {executions.map((execution) => (
        <ToolCallBlock key={execution.id} execution={execution} />
      ))}
    </div>
  );
});

/**
 * Props for the ToolCallGroup component.
 */
export interface ToolCallGroupProps {
  executions: ToolExecution[];
  className?: string;
}

/**
 * ToolCallGroup displays multiple tool executions in a single container
 * with a collapsible "X steps" header, matching the reference design.
 *
 * Features:
 * - Single card containing all tool calls
 * - "X step(s)" header with collapse/expand
 * - Individual tool rows inside
 * - Each tool row has its own expand/collapse for details
 */
export const ToolCallGroup = memo(function ToolCallGroup({
  executions,
  className,
}: ToolCallGroupProps): ReactElement | null {
  const [isGroupExpanded, setIsGroupExpanded] = useState(true);

  const toggleGroup = useCallback(() => {
    setIsGroupExpanded((prev) => !prev);
  }, []);

  if (executions.length === 0) {
    return null;
  }

  const stepCount = executions.length;
  const stepLabel = stepCount === 1 ? '1 step' : `${stepCount} steps`;

  // Check if any tool is still running
  const hasRunningTool = executions.some((e) => e.status === 'running');

  return (
    <div
      className={cn(
        'border border-cowork-border rounded-lg overflow-hidden my-2',
        'bg-white',
        className
      )}
    >
      {/* Group header - "X steps" with collapse toggle */}
      <button
        onClick={toggleGroup}
        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-cowork-hover transition-colors text-left border-b border-cowork-border"
        aria-expanded={isGroupExpanded}
        aria-label={`${stepLabel} - click to ${isGroupExpanded ? 'collapse' : 'expand'}`}
      >
        {/* Chevron */}
        <div className="flex-shrink-0 text-cowork-text-muted">
          {isGroupExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>

        {/* Step count */}
        <span className="text-sm font-medium text-cowork-text">{stepLabel}</span>

        {/* Running indicator */}
        {hasRunningTool && (
          <Loader2 className="w-4 h-4 ml-auto animate-spin text-cowork-active" />
        )}
      </button>

      {/* Expanded content - list of tool rows */}
      {isGroupExpanded && (
        <div className="divide-y divide-cowork-border">
          {executions.map((execution) => (
            <ToolCallRow key={execution.id} execution={execution} />
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Props for the ToolCallRow component.
 */
interface ToolCallRowProps {
  execution: ToolExecution;
}

/**
 * ToolCallRow displays a single tool execution as a row within the group.
 * Has its own expand/collapse for showing request/response details.
 */
const ToolCallRow = memo(function ToolCallRow({
  execution,
}: ToolCallRowProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toolName, toolInput, status, output, error } = execution;
  const { label, icon } = getToolDisplay(toolName);
  const briefDescription = formatToolInput(toolName, toolInput);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const hasLongContent = output && output.length > 500;

  return (
    <div className="bg-white">
      {/* Row header */}
      <button
        onClick={toggleExpanded}
        className="flex items-center gap-3 w-full px-3 py-2 hover:bg-cowork-hover transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={`${label}: ${briefDescription}`}
      >
        {/* Tool icon */}
        <div className="flex-shrink-0">
          {icon}
        </div>

        {/* Tool label and brief description */}
        <div className="flex-1 min-w-0">
          <span className="text-sm text-cowork-text">{label}</span>
          {briefDescription && (
            <span className="text-sm text-cowork-text-muted ml-2 truncate">
              {briefDescription}
            </span>
          )}
        </div>

        {/* Status indicator */}
        <StatusIndicator status={status} />

        {/* Expand/collapse chevron */}
        <div className="flex-shrink-0 text-cowork-text-muted">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && (
        <div className="border-t border-cowork-border">
          {/* Request section */}
          <div className="px-3 py-2 bg-cowork-bg-alt">
            <div className="text-xs text-cowork-text-muted mb-1">Request</div>
            <pre className="text-xs font-mono text-cowork-text overflow-x-auto max-h-32 overflow-y-auto">
              {JSON.stringify(toolInput, null, 2)}
            </pre>
          </div>

          {/* Output/Error section */}
          {(output || error) && (
            <div className="px-3 py-2 relative">
              <div className="text-xs text-cowork-text-muted mb-1">
                {error ? 'Error' : 'Output'}
              </div>
              <div
                className={cn(
                  'text-xs font-mono overflow-x-auto max-h-48 overflow-y-auto',
                  error ? 'text-destructive' : 'text-cowork-text'
                )}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {error || output}
                </pre>
              </div>

              {/* Scroll indicator */}
              {hasLongContent && (
                <div className="absolute bottom-2 right-3 flex items-center justify-center w-6 h-6 rounded-full bg-cowork-border text-cowork-text-muted">
                  <ArrowDown className="w-3 h-3" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
