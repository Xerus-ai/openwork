import type { ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the ResizablePane component.
 */
export interface ResizablePaneProps {
  children: ReactNode;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  isCollapsed?: boolean;
  collapsedWidth?: number;
  showResizeHandle?: 'left' | 'right' | 'none';
  onResize?: (delta: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
  className?: string;
  testId?: string;
}

/**
 * Width of the resize handle in pixels.
 */
const HANDLE_WIDTH = 4;

/**
 * Width of a collapsed pane in pixels.
 */
const DEFAULT_COLLAPSED_WIDTH = 0;

/**
 * A resizable pane component with a draggable handle.
 * Supports collapse/expand and smooth resizing.
 */
export function ResizablePane({
  children,
  width,
  isCollapsed = false,
  collapsedWidth = DEFAULT_COLLAPSED_WIDTH,
  showResizeHandle = 'none',
  onResize,
  onResizeStart,
  onResizeEnd,
  className,
  testId,
}: ResizablePaneProps): ReactElement {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);
  const containerWidth = useRef<number>(0);

  /**
   * Handles mouse down on the resize handle.
   * Captures initial position for delta calculation.
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent): void => {
      event.preventDefault();
      setIsDragging(true);
      dragStartX.current = event.clientX;

      // Get parent container width for percentage calculations
      const parent = containerRef.current?.parentElement;
      if (parent) {
        containerWidth.current = parent.offsetWidth;
      }

      onResizeStart?.();
    },
    [onResizeStart]
  );

  /**
   * Handles mouse move during resize.
   * Calculates delta as percentage of parent width.
   */
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent): void => {
      const deltaPixels = event.clientX - dragStartX.current;
      dragStartX.current = event.clientX;

      // Convert pixel delta to percentage
      if (containerWidth.current > 0) {
        const deltaPercent = (deltaPixels / containerWidth.current) * 100;
        // Invert delta for left handle
        const adjustedDelta = showResizeHandle === 'left' ? -deltaPercent : deltaPercent;
        onResize?.(adjustedDelta);
      }
    };

    const handleMouseUp = (): void => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onResize, onResizeEnd, showResizeHandle]);

  // Prevent text selection during drag
  useEffect(() => {
    if (isDragging) {
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging]);

  const effectiveWidth = isCollapsed ? collapsedWidth : width;

  return (
    <div
      ref={containerRef}
      data-testid={testId}
      className={cn(
        'relative flex-shrink-0 h-full overflow-hidden transition-[width] duration-200',
        isCollapsed && 'duration-300',
        className
      )}
      style={{
        width: `${effectiveWidth}%`,
        minWidth: isCollapsed ? collapsedWidth : undefined,
      }}
    >
      {/* Left resize handle */}
      {showResizeHandle === 'left' && !isCollapsed && (
        <div
          className={cn(
            'absolute left-0 top-0 h-full z-10 cursor-col-resize',
            'hover:bg-primary/20 active:bg-primary/30',
            'transition-colors duration-150',
            isDragging && 'bg-primary/30'
          )}
          style={{ width: HANDLE_WIDTH }}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize pane"
        >
          {/* Visual indicator line */}
          <div
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-0.5 h-8 rounded-full bg-border',
              'opacity-0 hover:opacity-100 transition-opacity duration-150',
              isDragging && 'opacity-100'
            )}
          />
        </div>
      )}

      {/* Pane content */}
      <div
        className={cn(
          'h-full overflow-auto',
          showResizeHandle === 'left' && 'pl-1',
          showResizeHandle === 'right' && 'pr-1',
          isCollapsed && 'invisible'
        )}
      >
        {children}
      </div>

      {/* Right resize handle */}
      {showResizeHandle === 'right' && !isCollapsed && (
        <div
          className={cn(
            'absolute right-0 top-0 h-full z-10 cursor-col-resize',
            'hover:bg-primary/20 active:bg-primary/30',
            'transition-colors duration-150',
            isDragging && 'bg-primary/30'
          )}
          style={{ width: HANDLE_WIDTH }}
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize pane"
        >
          {/* Visual indicator line */}
          <div
            className={cn(
              'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'w-0.5 h-8 rounded-full bg-border',
              'opacity-0 hover:opacity-100 transition-opacity duration-150',
              isDragging && 'opacity-100'
            )}
          />
        </div>
      )}
    </div>
  );
}
