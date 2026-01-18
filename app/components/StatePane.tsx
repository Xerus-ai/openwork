import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useProgress } from '@/hooks/useProgress';
import { ProgressSection } from './ProgressSection';

/**
 * Props for the StatePane component.
 */
export interface StatePaneProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Placeholder component for artifacts section.
 * Will be replaced in task 029.
 */
function ArtifactsPlaceholder(): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Artifacts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
          <span className="text-muted-foreground text-lg">+</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Outputs created during the task land here.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * Placeholder component for context section.
 * Will be replaced in task 030.
 */
function ContextPlaceholder(): ReactElement {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Context</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">
          Track the tools and files in use as Claude works.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * StatePane displays the current state of the agent's work.
 * Contains three sections:
 * - Progress: TodoList visualization with checkmarks
 * - Artifacts: Created files and outputs (placeholder for now)
 * - Context: Active tools and files (placeholder for now)
 */
export const StatePane = memo(function StatePane({
  className,
}: StatePaneProps): ReactElement {
  const { items, summary, currentItemId } = useProgress();

  const handleItemClick = useCallback((id: string): void => {
    // Future: could scroll to related content in ExecutionPane
    // or highlight the task in some way
    console.log('Task clicked:', id);
  }, []);

  return (
    <div className={cn('h-full overflow-y-auto p-4 space-y-4', className)}>
      {/* Progress section */}
      <ProgressSection
        items={items}
        summary={summary}
        currentItemId={currentItemId}
        onItemClick={handleItemClick}
      />

      {/* Artifacts section placeholder */}
      <ArtifactsPlaceholder />

      {/* Context section placeholder */}
      <ContextPlaceholder />
    </div>
  );
});
