/**
 * Path Utility Types
 *
 * TypeScript type definitions for cross-platform path handling utilities.
 */

/**
 * Result of a path validation operation.
 * Either returns a valid absolute path or an error message.
 */
export type PathValidationResult =
  | { valid: true; absolutePath: string }
  | { valid: false; error: string };

/**
 * Options for validating a file path against a workspace.
 */
export interface PathValidationOptions {
  /** The path to validate (relative or absolute) */
  filePath: string;
  /** The workspace root directory */
  workspacePath: string;
  /** Whether the path must exist on disk (default: false) */
  mustExist?: boolean;
  /** Whether to allow directory paths (default: true) */
  allowDirectory?: boolean;
}

/**
 * Result of checking if a path is contained within a workspace.
 */
export interface SubPathCheckResult {
  /** Whether the path is within the workspace */
  isSubPath: boolean;
  /** The normalized absolute path */
  absolutePath: string;
  /** The relative path from workspace root */
  relativePath: string;
}

/**
 * Platform-specific path information.
 */
export interface PlatformPathInfo {
  /** The path separator for the current platform */
  separator: string;
  /** Whether the platform uses Windows-style paths (with drive letters) */
  isWindows: boolean;
  /** The path delimiter used in PATH environment variable */
  delimiter: string;
}

/**
 * Result of detecting a drive letter from a Windows path.
 */
export interface DriveLetterResult {
  /** Whether a valid drive letter was found */
  hasDriveLetter: boolean;
  /** The drive letter (e.g., "C") or undefined */
  driveLetter?: string;
  /** The path without the drive prefix */
  pathWithoutDrive: string;
}
