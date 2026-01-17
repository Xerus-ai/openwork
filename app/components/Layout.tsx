import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLayout, type PaneId } from '@/hooks/useLayout';
import { ResizablePane } from './ResizablePane';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Props for the Layout component.
 */
export interface LayoutProps {
  chatPane: ReactNode;
  executionPane: ReactNode;
  statePane: ReactNode;
  className?: string;
}

/**
 * Breakpoint for responsive layout (in pixels).
 * Below this width, the layout switches to a stacked view.
 */
const RESPONSIVE_BREAKPOINT = 768;

/**
 * Collapse toggle button for a pane.
 */
interface CollapseButtonProps {
  paneId: PaneId;
  isCollapsed: boolean;
  position: 'left' | 'right';
  onToggle: () => void;
}

function CollapseButton({
  paneId,
  isCollapsed,
  position,
  onToggle,
}: CollapseButtonProps): ReactElement {
  const isLeftSide = position === 'left';
  const Icon = isCollapsed
    ? (isLeftSide ? ChevronRight : ChevronLeft)
    : (isLeftSide ? ChevronLeft : ChevronRight);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'absolute top-2 z-20 h-6 w-6 rounded-full bg-background border shadow-sm',
        'hover:bg-accent hover:text-accent-foreground',
        'transition-all duration-200',
        isLeftSide ? 'left-0 -translate-x-1/2' : 'right-0 translate-x-1/2',
        isCollapsed && isLeftSide && 'left-2 translate-x-0',
        isCollapsed && !isLeftSide && 'right-2 translate-x-0'
      )}
      onClick={onToggle}
      aria-label={isCollapsed ? `Expand ${paneId} pane` : `Collapse ${paneId} pane`}
    >
      <Icon className="h-3 w-3" />
    </Button>
  );
}

/**
 * Main three-pane layout component.
 * Displays Chat, Execution, and State panes with resizable dividers.
 */
export function Layout({
  chatPane,
  executionPane,
  statePane,
  className,
}: LayoutProps): ReactElement {
  const {
    sizes,
    collapsed,
    isResizing,
    resizePanes,
    toggleCollapse,
    resetLayout,
    setIsResizing,
  } = useLayout();

  const [isResponsive, setIsResponsive] = useState(false);

  // Check window size for responsive behavior
  useEffect(() => {
    const checkResponsive = (): void => {
      setIsResponsive(window.innerWidth < RESPONSIVE_BREAKPOINT);
    };

    checkResponsive();
    window.addEventListener('resize', checkResponsive);
    return () => window.removeEventListener('resize', checkResponsive);
  }, []);

  /**
   * Handles resize between chat and execution panes.
   */
  const handleChatExecutionResize = useCallback(
    (delta: number): void => {
      resizePanes('chat', 'execution', delta);
    },
    [resizePanes]
  );

  /**
   * Handles resize between execution and state panes.
   */
  const handleExecutionStateResize = useCallback(
    (delta: number): void => {
      resizePanes('execution', 'state', delta);
    },
    [resizePanes]
  );

  const handleResizeStart = useCallback((): void => {
    setIsResizing(true);
  }, [setIsResizing]);

  const handleResizeEnd = useCallback((): void => {
    setIsResizing(false);
  }, [setIsResizing]);

  // Responsive stacked layout for smaller screens
  if (isResponsive) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        {/* Chat pane - full width on small screens */}
        <div className="flex-1 overflow-auto border-b">
          {chatPane}
        </div>
        {/* Execution pane - shown in a tab or toggle */}
        <div className="flex-1 overflow-auto border-b">
          {executionPane}
        </div>
        {/* State pane - compact at bottom */}
        <div className="h-1/3 overflow-auto">
          {statePane}
        </div>
      </div>
    );
  }

  // Calculate effective widths based on collapsed state
  const chatWidth = collapsed.chat ? 0 : sizes.chat;
  const executionWidth = collapsed.execution ? 0 : sizes.execution;
  const stateWidth = collapsed.state ? 0 : sizes.state;

  // Redistribute space when panes are collapsed
  const visiblePanes = [
    !collapsed.chat,
    !collapsed.execution,
    !collapsed.state,
  ].filter(Boolean).length;

  const getAdjustedWidth = (width: number, isCollapsed: boolean): number => {
    if (isCollapsed) return 0;
    if (visiblePanes === 3) return width;

    // Redistribute collapsed pane space
    const collapsedSpace =
      (collapsed.chat ? sizes.chat : 0) +
      (collapsed.execution ? sizes.execution : 0) +
      (collapsed.state ? sizes.state : 0);

    return width + (collapsedSpace / visiblePanes);
  };

  return (
    <div
      className={cn(
        'flex h-full w-full overflow-hidden bg-background',
        isResizing && 'select-none',
        className
      )}
    >
      {/* Chat Pane (Left) */}
      <ResizablePane
        width={getAdjustedWidth(chatWidth, collapsed.chat)}
        isCollapsed={collapsed.chat}
        showResizeHandle={collapsed.chat ? 'none' : 'right'}
        onResize={handleChatExecutionResize}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
        testId="chat-pane"
        className="border-r"
      >
        <div className="relative h-full">
          <CollapseButton
            paneId="chat"
            isCollapsed={collapsed.chat}
            position="right"
            onToggle={() => toggleCollapse('chat')}
          />
          {chatPane}
        </div>
      </ResizablePane>

      {/* Collapsed chat indicator */}
      {collapsed.chat && (
        <div className="w-8 flex-shrink-0 bg-muted/30 border-r flex items-start justify-center pt-2">
          <CollapseButton
            paneId="chat"
            isCollapsed={true}
            position="left"
            onToggle={() => toggleCollapse('chat')}
          />
        </div>
      )}

      {/* Execution Pane (Center) */}
      <ResizablePane
        width={getAdjustedWidth(executionWidth, collapsed.execution)}
        isCollapsed={collapsed.execution}
        showResizeHandle={collapsed.execution ? 'none' : 'right'}
        onResize={handleExecutionStateResize}
        onResizeStart={handleResizeStart}
        onResizeEnd={handleResizeEnd}
        testId="execution-pane"
        className="border-r"
      >
        <div className="relative h-full">
          {executionPane}
        </div>
      </ResizablePane>

      {/* State Pane (Right) */}
      <ResizablePane
        width={getAdjustedWidth(stateWidth, collapsed.state)}
        isCollapsed={collapsed.state}
        showResizeHandle="none"
        testId="state-pane"
      >
        <div className="relative h-full">
          <CollapseButton
            paneId="state"
            isCollapsed={collapsed.state}
            position="left"
            onToggle={() => toggleCollapse('state')}
          />
          {statePane}
        </div>
      </ResizablePane>

      {/* Collapsed state indicator */}
      {collapsed.state && (
        <div className="w-8 flex-shrink-0 bg-muted/30 flex items-start justify-center pt-2">
          <CollapseButton
            paneId="state"
            isCollapsed={true}
            position="right"
            onToggle={() => toggleCollapse('state')}
          />
        </div>
      )}

      {/* Reset layout button - floating at bottom right */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed bottom-4 right-4 z-30 h-8 w-8 rounded-full bg-background border shadow-md hover:bg-accent"
        onClick={resetLayout}
        title="Reset layout"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
