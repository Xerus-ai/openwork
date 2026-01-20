/**
 * Re-exports workspace functionality from WorkspaceContext.
 * This maintains backwards compatibility with existing imports.
 */

export {
  useWorkspaceContext as useWorkspace,
  formatWorkspacePath,
  type WorkspaceValidationResult,
  type SavedWorkspaceData,
  type WorkspaceEntry,
  type WorkspaceContextState as WorkspaceState,
  type WorkspaceContextActions as WorkspaceActions,
} from '@/contexts/WorkspaceContext';
