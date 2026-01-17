/**
 * Agent Utilities
 *
 * Public API for cross-platform path handling and other utilities.
 */

// Export all types
export type {
  PathValidationResult,
  PathValidationOptions,
  SubPathCheckResult,
  PlatformPathInfo,
  DriveLetterResult,
} from "./types.js";

// Export all path utilities
export {
  // Platform info
  getPlatformPathInfo,
  detectDriveLetter,

  // Path manipulation
  normalizePath,
  joinPaths,
  resolvePath,
  isAbsolutePath,
  getRelativePath,
  getDirectory,
  getFileName,
  getExtension,

  // Security checks
  containsTraversal,
  isSubPath,

  // Workspace validation
  validateWorkspacePath,
  validateWorkspacePathSync,

  // Slash conversion
  toForwardSlashes,
  toNativeSlashes,

  // File system checks
  pathExists,
  isDirectory,
  isFile,
} from "./path-utils.js";
