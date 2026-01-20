/**
 * Workspace Module
 *
 * Public API for workspace validation and path management.
 * Provides security boundary enforcement for all file operations.
 */

// Export all types
export type {
  WorkspaceConfig,
  WorkspaceValidationResult,
  WorkspacePermissions,
  WorkspaceErrorCode,
  PathContainmentOptions,
  PathContainmentResult,
  ContainmentErrorCode,
} from "./types.js";

// Export error message maps
export {
  WORKSPACE_ERROR_MESSAGES,
  CONTAINMENT_ERROR_MESSAGES,
} from "./types.js";

// Export validator class and functions
export {
  WorkspaceValidator,
  createWorkspaceValidator,
  validateWorkspace,
  isPathInWorkspace,
} from "./workspace-validator.js";
