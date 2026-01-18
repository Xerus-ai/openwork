import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { useProgress } from '@/hooks/useProgress';
import { useArtifacts } from '@/hooks/useArtifacts';
import { ProgressSection } from './ProgressSection';
import { ArtifactsSection } from './ArtifactsSection';

/**
 * Props for the StatePane component.
 */
export interface StatePaneProps {
  /** Additional CSS classes */
  className?: string;
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
 * - Artifacts: Created files and outputs
 * - Context: Active tools and files (placeholder for now)
 */
export const StatePane = memo(function StatePane({
  className,
}: StatePaneProps): ReactElement {
  const { items, summary: progressSummary, currentItemId } = useProgress();
  const {
    artifacts,
    summary: artifactsSummary,
    selectedId,
    selectArtifact,
    clearArtifacts,
  } = useArtifacts();

  const handleItemClick = useCallback((id: string): void => {
    // Future: could scroll to related content in ExecutionPane
    // or highlight the task in some way
    console.log('Task clicked:', id);
  }, []);

  const handleArtifactClick = useCallback((id: string): void => {
    selectArtifact(id);
    // Future: trigger preview in ExecutionPane
    console.log('Artifact clicked:', id);
  }, [selectArtifact]);

  const handleClearArtifacts = useCallback((): void => {
    clearArtifacts();
  }, [clearArtifacts]);

  return (
    <div className={cn('h-full overflow-y-auto p-4 space-y-4', className)}>
      {/* Progress section */}
      <ProgressSection
        items={items}
        summary={progressSummary}
        currentItemId={currentItemId}
        onItemClick={handleItemClick}
      />

      {/* Artifacts section */}
      <ArtifactsSection
        artifacts={artifacts}
        summary={artifactsSummary}
        selectedId={selectedId}
        onArtifactClick={handleArtifactClick}
        onClearAll={handleClearArtifacts}
      />

      {/* Context section placeholder */}
      <ContextPlaceholder />
    </div>
  );
});
