/**
 * Workspace Types
 *
 * TypeScript type definitions for workspace validation and management.
 */

/**
 * Configuration for workspace validation.
 */
export interface WorkspaceConfig {
  /** The absolute path to the workspace directory */
  workspacePath: string;
  /** Whether to require write permissions (default: true) */
  requireWrite?: boolean;
  /** Whether to create the directory if it doesn't exist (default: false) */
  createIfMissing?: boolean;
}

/**
 * Result of workspace validation.
 * Either returns valid workspace info or an error.
 */
export type WorkspaceValidationResult =
  | {
      valid: true;
      workspacePath: string;
      permissions: WorkspacePermissions;
    }
  | {
      valid: false;
      error: string;
      errorCode: WorkspaceErrorCode;
    };

/**
 * Permissions available on the workspace directory.
 */
export interface WorkspacePermissions {
  /** Can read files and list directories */
  canRead: boolean;
  /** Can create, modify, and delete files */
  canWrite: boolean;
  /** Can execute files (scripts, binaries) */
  canExecute: boolean;
}

/**
 * Error codes for workspace validation failures.
 */
export type WorkspaceErrorCode =
  | "PATH_EMPTY"
  | "PATH_NOT_ABSOLUTE"
  | "FOLDER_NOT_FOUND"
  | "NOT_A_DIRECTORY"
  | "NO_READ_PERMISSION"
  | "NO_WRITE_PERMISSION"
  | "PERMISSION_CHECK_FAILED"
  | "CREATION_FAILED";

/**
 * Options for path containment checks.
 */
export interface PathContainmentOptions {
  /** The path to validate */
  targetPath: string;
  /** The workspace root path */
  workspacePath: string;
  /** Whether the path must exist on disk (default: false) */
  mustExist?: boolean;
}

/**
 * Result of path containment check.
 */
export type PathContainmentResult =
  | {
      contained: true;
      absolutePath: string;
      relativePath: string;
    }
  | {
      contained: false;
      error: string;
      errorCode: ContainmentErrorCode;
    };

/**
 * Error codes for path containment failures.
 */
export type ContainmentErrorCode =
  | "PATH_EMPTY"
  | "PATH_ESCAPE"
  | "PATH_NOT_FOUND"
  | "TRAVERSAL_DETECTED";

/**
 * Human-readable error messages for workspace error codes.
 */
export const WORKSPACE_ERROR_MESSAGES: Record<WorkspaceErrorCode, string> = {
  PATH_EMPTY: "Workspace path cannot be empty",
  PATH_NOT_ABSOLUTE: "Workspace path must be an absolute path",
  FOLDER_NOT_FOUND: "Workspace folder does not exist",
  NOT_A_DIRECTORY: "Workspace path is not a directory",
  NO_READ_PERMISSION: "No read permission on workspace folder",
  NO_WRITE_PERMISSION: "No write permission on workspace folder",
  PERMISSION_CHECK_FAILED: "Failed to check workspace permissions",
  CREATION_FAILED: "Failed to create workspace folder",
};

/**
 * Human-readable error messages for containment error codes.
 */
export const CONTAINMENT_ERROR_MESSAGES: Record<ContainmentErrorCode, string> = {
  PATH_EMPTY: "File path cannot be empty",
  PATH_ESCAPE: "Path attempts to escape workspace boundary",
  PATH_NOT_FOUND: "Path does not exist",
  TRAVERSAL_DETECTED: "Path contains directory traversal patterns",
};
