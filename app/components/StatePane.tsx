import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTodoList } from '@/hooks/useTodoList';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useSessionContext } from '@/hooks/useSessionContext';
import { ProgressSection } from './ProgressSection';
import { ArtifactsSection } from './ArtifactsSection';
import { ContextSection } from './ContextSection';

/**
 * Props for the StatePane component.
 */
export interface StatePaneProps {
  /** Additional CSS classes */
  className?: string;
}


/**
 * StatePane displays the current state of the agent's work.
 * Contains three sections:
 * - Progress: TodoList visualization with checkmarks
 * - Artifacts: Created files and outputs
 * - Context: Workspace, loaded skills, and session metadata
 */
export const StatePane = memo(function StatePane({
  className,
}: StatePaneProps): ReactElement {
  const { items, summary: progressSummary, currentItemId } = useTodoList();
  const {
    artifacts,
    summary: artifactsSummary,
    selectedId,
    selectArtifact,
    clearArtifacts,
  } = useArtifacts();
  const {
    workspacePath,
    skills,
    session,
    mcpConnectors,
    summary: contextSummary,
  } = useSessionContext();

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

  const handleWorkspaceClick = useCallback((): void => {
    // Future: open workspace selector or show workspace details
    console.log('Workspace clicked:', workspacePath);
  }, [workspacePath]);

  const handleSkillClick = useCallback((id: string): void => {
    // Future: show skill details or documentation
    console.log('Skill clicked:', id);
  }, []);

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

      {/* Context section */}
      <ContextSection
        workspacePath={workspacePath}
        skills={skills}
        session={session}
        mcpConnectors={mcpConnectors}
        summary={contextSummary}
        onWorkspaceClick={handleWorkspaceClick}
        onSkillClick={handleSkillClick}
      />
    </div>
  );
});
