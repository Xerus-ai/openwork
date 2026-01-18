import type { ReactElement } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useExecution,
  type ExecutionState,
  type ExecutionActions,
  type ExecutionEntry,
} from '@/hooks/useExecution';
import { ExecutionOutput } from './ExecutionOutput';
import { Button } from '@/components/ui';
import { Trash2, ChevronDown, Terminal } from 'lucide-react';

/**
 * Props for the ExecutionPane component.
 */
export interface ExecutionPaneProps {
  className?: string;
}

/**
 * Threshold in pixels for considering the user "at bottom" of the output.
 */
const SCROLL_THRESHOLD = 100;

/**
 * Props for the OutputList component.
 */
interface OutputListProps {
  entries: ExecutionEntry[];
  onScrollToBottom: () => void;
  isAtBottom: boolean;
}

/**
 * Renders the list of execution outputs with auto-scroll.
 */
const OutputList = memo(function OutputList({
  entries,
  onScrollToBottom,
  isAtBottom,
}: OutputListProps): ReactElement {
  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <ExecutionOutput key={entry.id} entry={entry} />
      ))}

      {/* Scroll to bottom button */}
      {!isAtBottom && entries.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 shadow-lg z-10"
          onClick={onScrollToBottom}
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          New output
        </Button>
      )}
    </div>
  );
});

/**
 * Empty state shown when there are no execution outputs.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <div className="text-6xl mb-4 text-muted-foreground">~</div>
      <h2 className="text-xl font-semibold mb-2">
        Let's knock something off your list
      </h2>
      <p className="text-sm text-muted-foreground max-w-md">
        Select a quick action or type a task to get started.
        Execution output and file previews will appear here.
      </p>
    </div>
  );
}

/**
 * Header for the execution pane with clear button.
 */
interface ExecutionHeaderProps {
  entryCount: number;
  isRunning: boolean;
  onClear: () => void;
}

function ExecutionHeader({
  entryCount,
  isRunning,
  onClear,
}: ExecutionHeaderProps): ReactElement {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Execution</span>
          {isRunning && (
            <span className="text-xs text-blue-400 animate-pulse">
              Running...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {entryCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
            </span>
          )}
          {entryCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              disabled={isRunning}
              className="h-7 px-2"
              aria-label="Clear execution output"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Execution pane component displaying command outputs, file operations,
 * and streaming results in a terminal-like format.
 *
 * Features:
 * - Command execution with timestamps
 * - Syntax highlighting for code and paths
 * - Output type indicators (success/error/info)
 * - Auto-scroll to latest output
 * - Clear output button
 * - Streaming output support
 */
export const ExecutionPane = memo(function ExecutionPane({
  className,
}: ExecutionPaneProps): ReactElement {
  const executionState = useExecution();
  const { entries, isRunning, clearEntries } = executionState;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  /**
   * Scrolls to the bottom of the output list.
   */
  const scrollToBottom = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  /**
   * Checks if the user is scrolled near the bottom.
   */
  const checkIfAtBottom = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom < SCROLL_THRESHOLD);
  }, []);

  /**
   * Handles the clear button click.
   */
  const handleClear = useCallback((): void => {
    clearEntries();
  }, [clearEntries]);

  // Auto-scroll to bottom when new entries arrive (if user is at bottom)
  useEffect(() => {
    if (isAtBottom && entries.length > 0) {
      scrollToBottom();
    }
  }, [entries.length, isAtBottom, scrollToBottom]);

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkIfAtBottom, { passive: true });
    return () => container.removeEventListener('scroll', checkIfAtBottom);
  }, [checkIfAtBottom]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Header */}
      <ExecutionHeader
        entryCount={entries.length}
        isRunning={isRunning}
        onClear={handleClear}
      />

      {/* Output area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
        role="log"
        aria-label="Execution output"
        aria-live="polite"
      >
        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <OutputList
            entries={entries}
            onScrollToBottom={scrollToBottom}
            isAtBottom={isAtBottom}
          />
        )}
      </div>
    </div>
  );
});

/**
 * Export execution state and actions types for external use.
 */
export type { ExecutionState, ExecutionActions, ExecutionEntry };
