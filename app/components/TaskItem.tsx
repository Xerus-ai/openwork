import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Circle, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressItem, ProgressStatus } from '@/hooks/useProgress';

/**
 * Props for the TaskItem component.
 */
export interface TaskItemProps {
  /** The task item to display */
  item: ProgressItem;
  /** Whether this task is the currently active one */
  isActive?: boolean;
  /** Whether the item starts expanded */
  defaultExpanded?: boolean;
  /** Callback when the item is clicked */
  onClick?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status icon component for different task states.
 */
function StatusIcon({ status }: { status: ProgressStatus }): ReactElement {
  switch (status) {
    case 'completed':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
        </div>
      );
    case 'in_progress':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
        </div>
      );
    case 'blocked':
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
        </div>
      );
    case 'pending':
    default:
      return (
        <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
          <Circle className="h-2 w-2 text-transparent" />
        </div>
      );
  }
}

/**
 * Maps status to human-readable label.
 */
function getStatusLabel(status: ProgressStatus): string {
  switch (status) {
    case 'completed':
      return 'Completed';
    case 'in_progress':
      return 'In Progress';
    case 'blocked':
      return 'Blocked';
    case 'pending':
    default:
      return 'Pending';
  }
}

/**
 * Formats a date string relative to now.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  return `${diffDay}d ago`;
}

/**
 * TaskItem displays a single task with status icon, content, and expandable details.
 * Supports expand/collapse for additional information like timestamps and blocked reasons.
 */
export const TaskItem = memo(function TaskItem({
  item,
  isActive = false,
  defaultExpanded = false,
  onClick,
  className,
}: TaskItemProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleClick = useCallback((): void => {
    onClick?.(item.id);
  }, [item.id, onClick]);

  const handleToggleExpand = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation();
      setIsExpanded((prev) => !prev);
    },
    []
  );

  const hasExpandableContent =
    item.blockedReason !== undefined ||
    item.completedAt !== undefined ||
    item.status === 'blocked';

  return (
    <div
      className={cn(
        'group rounded-lg border transition-colors',
        isActive
          ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-transparent hover:bg-muted/50',
        className
      )}
      role="listitem"
      aria-current={isActive ? 'step' : undefined}
    >
      <div
        className="flex items-start gap-3 p-2 cursor-pointer"
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
      >
        {/* Expand/Collapse button */}
        {hasExpandableContent ? (
          <button
            type="button"
            className="mt-0.5 p-0.5 rounded hover:bg-muted"
            onClick={handleToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {/* Status icon */}
        <StatusIcon status={item.status} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm leading-tight',
              item.status === 'completed' && 'text-muted-foreground line-through',
              item.status === 'blocked' && 'text-muted-foreground'
            )}
          >
            {item.content}
          </p>

          {/* Inline status and time for compact view */}
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn(
                'font-medium',
                item.status === 'completed' && 'text-green-600 dark:text-green-400',
                item.status === 'in_progress' && 'text-blue-600 dark:text-blue-400',
                item.status === 'blocked' && 'text-red-600 dark:text-red-400'
              )}
            >
              {getStatusLabel(item.status)}
            </span>
            <span>-</span>
            <span>{formatRelativeTime(item.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && hasExpandableContent && (
        <div className="px-2 pb-2 pl-11">
          <div className="rounded bg-muted/50 p-2 text-xs text-muted-foreground space-y-1">
            {item.blockedReason && (
              <p>
                <span className="font-medium text-red-600 dark:text-red-400">
                  Blocked:
                </span>{' '}
                {item.blockedReason}
              </p>
            )}
            {item.completedAt && (
              <p>
                <span className="font-medium">Completed:</span>{' '}
                {formatRelativeTime(item.completedAt)}
              </p>
            )}
            <p>
              <span className="font-medium">Created:</span>{' '}
              {formatRelativeTime(item.createdAt)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
