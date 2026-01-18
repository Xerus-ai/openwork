import type { ReactElement } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { CheckCircle2, ListTodo } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { ProgressItem, ProgressSummary } from '@/hooks/useProgress';
import { TaskItem } from './TaskItem';

/**
 * Props for the ProgressSection component.
 */
export interface ProgressSectionProps {
  /** List of progress items to display */
  items: ProgressItem[];
  /** Summary statistics for progress */
  summary: ProgressSummary;
  /** ID of the currently active item */
  currentItemId: string | null;
  /** Callback when an item is clicked */
  onItemClick?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Progress bar showing completion percentage.
 */
function ProgressBar({
  percentage,
  completed,
  total,
}: {
  percentage: number;
  completed: number;
  total: number;
}): ReactElement {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Progress</span>
        <span>
          {completed} / {total} tasks
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-300',
            percentage === 100
              ? 'bg-green-500 dark:bg-green-400'
              : 'bg-blue-500 dark:bg-blue-400'
          )}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percentage}% complete`}
        />
      </div>
    </div>
  );
}

/**
 * Summary badges showing counts by status.
 */
function StatusBadges({ summary }: { summary: ProgressSummary }): ReactElement {
  const badges = [
    { label: 'Pending', count: summary.pending, color: 'bg-muted text-muted-foreground' },
    { label: 'In Progress', count: summary.inProgress, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
    { label: 'Completed', count: summary.completed, color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' },
    { label: 'Blocked', count: summary.blocked, color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' },
  ].filter((badge) => badge.count > 0);

  if (badges.length === 0) {
    return <div />;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            badge.color
          )}
        >
          {badge.count} {badge.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Empty state when no tasks exist.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <ListTodo className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No tasks yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Steps will show as the task unfolds.
      </p>
    </div>
  );
}

/**
 * Completion state when all tasks are done.
 */
function CompletedState({ count }: { count: number }): ReactElement {
  return (
    <div className="flex items-center gap-2 py-3 px-2 rounded-lg bg-green-50 dark:bg-green-950/30">
      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
      <span className="text-sm font-medium text-green-700 dark:text-green-300">
        All {count} task{count !== 1 ? 's' : ''} completed
      </span>
    </div>
  );
}

/**
 * ProgressSection displays a list of tasks with progress visualization.
 * Shows progress bar, status badges, and expandable task items.
 */
export const ProgressSection = memo(function ProgressSection({
  items,
  summary,
  currentItemId,
  onItemClick,
  className,
}: ProgressSectionProps): ReactElement {
  /**
   * Sorts items: in_progress first, then pending, then completed, then blocked.
   */
  const sortedItems = useMemo(() => {
    const statusOrder: Record<string, number> = {
      in_progress: 0,
      pending: 1,
      completed: 2,
      blocked: 3,
    };

    return [...items].sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 4;
      const orderB = statusOrder[b.status] ?? 4;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }, [items]);

  const handleItemClick = useCallback(
    (id: string): void => {
      onItemClick?.(id);
    },
    [onItemClick]
  );

  const isAllCompleted =
    summary.total > 0 && summary.completed === summary.total;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Progress</span>
          {summary.total > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {summary.percentage}%
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        {summary.total > 0 && (
          <ProgressBar
            percentage={summary.percentage}
            completed={summary.completed}
            total={summary.total}
          />
        )}

        {/* Status badges */}
        {summary.total > 0 && <StatusBadges summary={summary} />}

        {/* Task list */}
        {summary.total === 0 ? (
          <EmptyState />
        ) : isAllCompleted ? (
          <CompletedState count={summary.total} />
        ) : (
          <div
            className="space-y-1 max-h-80 overflow-y-auto"
            role="list"
            aria-label="Task list"
          >
            {sortedItems.map((item) => (
              <TaskItem
                key={item.id}
                item={item}
                isActive={item.id === currentItemId}
                defaultExpanded={item.status === 'blocked'}
                onClick={handleItemClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
