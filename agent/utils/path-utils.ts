/**
 * Cross-Platform Path Utilities
 *
 * Provides path handling utilities that work correctly on Windows and macOS.
 * Uses Node.js path module internally to handle platform-specific separators.
 */

import path from "path";
import fs from "fs/promises";
import type {
  PathValidationResult,
  PathValidationOptions,
  SubPathCheckResult,
  PlatformPathInfo,
  DriveLetterResult,
} from "./types.js";

/**
 * Windows drive letter pattern (e.g., "C:", "D:").
 */
const WINDOWS_DRIVE_PATTERN = /^([a-zA-Z]):(.*)$/;

/**
 * Patterns that indicate directory traversal attempts.
 */
const TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/g,
  /^\.\.$/,
];

/**
 * Gets platform-specific path information.
 *
 * @returns Platform path configuration
 *
 * @example
 * ```typescript
 * const info = getPlatformPathInfo();
 * console.log(info.separator); // "/" on macOS, "\\" on Windows
 * console.log(info.isWindows); // true on Windows, false elsewhere
 * ```
 */
export function getPlatformPathInfo(): PlatformPathInfo {
  return {
    separator: path.sep,
    isWindows: process.platform === "win32",
    delimiter: path.delimiter,
  };
}

/**
 * Detects and extracts a Windows drive letter from a path.
 *
 * @param filePath - The path to check
 * @returns Drive letter detection result
 *
 * @example
 * ```typescript
 * detectDriveLetter("C:\\Users\\test"); // { hasDriveLetter: true, driveLetter: "C", ... }
 * detectDriveLetter("/Users/test");     // { hasDriveLetter: false, ... }
 * ```
 */
export function detectDriveLetter(filePath: string): DriveLetterResult {
  const match = filePath.match(WINDOWS_DRIVE_PATTERN);

  if (match && match[1] !== undefined && match[2] !== undefined) {
    return {
      hasDriveLetter: true,
      driveLetter: match[1].toUpperCase(),
      pathWithoutDrive: match[2],
    };
  }

  return {
    hasDriveLetter: false,
    pathWithoutDrive: filePath,
  };
}

/**
 * Normalizes a path for consistent comparison across platforms.
 * Handles both Windows and macOS path styles.
 *
 * @param inputPath - The path to normalize
 * @returns Normalized path with consistent separators
 *
 * @example
 * ```typescript
 * normalizePath("C:\\Users\\test\\..\\test"); // "C:\\Users\\test" on Windows
 * normalizePath("/Users//test/./file");       // "/Users/test/file"
 * ```
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath || inputPath.trim() === "") {
    return "";
  }

  return path.normalize(inputPath);
}

/**
 * Joins path segments using the platform-appropriate separator.
 *
 * @param segments - Path segments to join
 * @returns Joined and normalized path
 *
 * @example
 * ```typescript
 * joinPaths("/Users", "test", "file.txt"); // "/Users/test/file.txt"
 * joinPaths("C:\\Users", "test");          // "C:\\Users\\test" on Windows
 * ```
 */
export function joinPaths(...segments: string[]): string {
  return path.join(...segments);
}

/**
 * Resolves a path to an absolute path.
 * Relative paths are resolved against the current working directory.
 *
 * @param inputPath - The path to resolve
 * @param basePath - Optional base path for resolution (default: cwd)
 * @returns Absolute path
 *
 * @example
 * ```typescript
 * resolvePath("./file.txt");           // Resolves from cwd
 * resolvePath("file.txt", "/base");    // "/base/file.txt"
 * resolvePath("/absolute/path");       // "/absolute/path" (unchanged)
 * ```
 */
export function resolvePath(inputPath: string, basePath?: string): string {
  if (basePath) {
    return path.resolve(basePath, inputPath);
  }
  return path.resolve(inputPath);
}

/**
 * Checks if a path is absolute (starts from root or drive letter).
 *
 * @param inputPath - The path to check
 * @returns true if the path is absolute
 *
 * @example
 * ```typescript
 * isAbsolutePath("/Users/test");     // true on macOS
 * isAbsolutePath("C:\\Users");       // true on Windows
 * isAbsolutePath("./relative");      // false
 * isAbsolutePath("relative/path");   // false
 * ```
 */
export function isAbsolutePath(inputPath: string): boolean {
  return path.isAbsolute(inputPath);
}

/**
 * Gets the relative path from one path to another.
 *
 * @param fromPath - The starting path
 * @param toPath - The target path
 * @returns Relative path from start to target
 *
 * @example
 * ```typescript
 * getRelativePath("/Users/test", "/Users/test/sub/file.txt");
 * // Returns: "sub/file.txt"
 * ```
 */
export function getRelativePath(fromPath: string, toPath: string): string {
  return path.relative(fromPath, toPath);
}

/**
 * Extracts the directory portion of a path.
 *
 * @param inputPath - The path to get directory from
 * @returns Directory portion of the path
 *
 * @example
 * ```typescript
 * getDirectory("/Users/test/file.txt"); // "/Users/test"
 * ```
 */
export function getDirectory(inputPath: string): string {
  return path.dirname(inputPath);
}

/**
 * Extracts the file name from a path.
 *
 * @param inputPath - The path to get file name from
 * @param includeExtension - Whether to include the extension (default: true)
 * @returns File name with or without extension
 *
 * @example
 * ```typescript
 * getFileName("/Users/test/file.txt");        // "file.txt"
 * getFileName("/Users/test/file.txt", false); // "file"
 * ```
 */
export function getFileName(inputPath: string, includeExtension = true): string {
  if (includeExtension) {
    return path.basename(inputPath);
  }
  const ext = path.extname(inputPath);
  return path.basename(inputPath, ext);
}

/**
 * Gets the file extension from a path.
 *
 * @param inputPath - The path to get extension from
 * @returns File extension including the dot, or empty string
 *
 * @example
 * ```typescript
 * getExtension("/Users/test/file.txt");  // ".txt"
 * getExtension("/Users/test/Makefile");  // ""
 * ```
 */
export function getExtension(inputPath: string): string {
  return path.extname(inputPath);
}

/**
 * Checks if a path contains directory traversal patterns.
 * This is a security check to prevent escaping the workspace.
 *
 * @param inputPath - The path to check
 * @returns true if the path contains traversal attempts
 *
 * @example
 * ```typescript
 * containsTraversal("../secret/file");     // true
 * containsTraversal("..\\windows\\file");  // true
 * containsTraversal("normal/path/file");   // false
 * ```
 */
export function containsTraversal(inputPath: string): boolean {
  return TRAVERSAL_PATTERNS.some((pattern) => pattern.test(inputPath));
}

/**
 * Checks if a path is contained within a workspace directory.
 * This is the primary security check for workspace containment.
 *
 * @param targetPath - The path to check
 * @param workspacePath - The workspace root path
 * @returns SubPathCheckResult with containment status and normalized paths
 *
 * @example
 * ```typescript
 * const result = isSubPath("/workspace/user/file.txt", "/workspace/user");
 * // { isSubPath: true, absolutePath: "...", relativePath: "file.txt" }
 *
 * const escape = isSubPath("/workspace/user/../other/file", "/workspace/user");
 * // { isSubPath: false, ... }
 * ```
 */
export function isSubPath(targetPath: string, workspacePath: string): SubPathCheckResult {
  // Normalize and resolve both paths to absolute
  const normalizedWorkspace = path.normalize(path.resolve(workspacePath));

  let absoluteTarget: string;
  if (path.isAbsolute(targetPath)) {
    absoluteTarget = path.normalize(targetPath);
  } else {
    absoluteTarget = path.normalize(path.join(normalizedWorkspace, targetPath));
  }

  // Calculate relative path
  const relativePath = path.relative(normalizedWorkspace, absoluteTarget);

  // Check if the path escapes the workspace
  // A path escapes if:
  // 1. The relative path starts with ".." (goes up from workspace)
  // 2. The relative path is absolute (on Windows, could be different drive)
  const escapesWorkspace =
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath);

  // Also ensure the absolute path starts with the workspace path
  const startsWithWorkspace =
    absoluteTarget === normalizedWorkspace ||
    absoluteTarget.startsWith(normalizedWorkspace + path.sep);

  return {
    isSubPath: !escapesWorkspace && startsWithWorkspace,
    absolutePath: absoluteTarget,
    relativePath: escapesWorkspace ? "" : relativePath,
  };
}

/**
 * Validates a file path for workspace operations.
 * Combines multiple checks: non-empty, within workspace, no traversal.
 *
 * @param options - Validation options
 * @returns PathValidationResult with valid absolute path or error
 *
 * @example
 * ```typescript
 * const result = validateWorkspacePath({
 *   filePath: "docs/readme.md",
 *   workspacePath: "/home/user/project"
 * });
 *
 * if (result.valid) {
 *   console.log(result.absolutePath); // "/home/user/project/docs/readme.md"
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function validateWorkspacePath(
  options: PathValidationOptions
): Promise<PathValidationResult> {
  const { filePath, workspacePath, mustExist = false, allowDirectory = true } = options;

  // Check for empty path
  if (!filePath || filePath.trim() === "") {
    return { valid: false, error: "File path cannot be empty" };
  }

  // Check for traversal patterns in the raw input
  if (containsTraversal(filePath)) {
    return { valid: false, error: "Path contains directory traversal patterns" };
  }

  // Check workspace containment
  const subPathResult = isSubPath(filePath, workspacePath);
  if (!subPathResult.isSubPath) {
    return {
      valid: false,
      error: `Path must be within workspace: ${workspacePath}`,
    };
  }

  // Optionally check if path exists
  if (mustExist) {
    try {
      const stats = await fs.stat(subPathResult.absolutePath);

      if (!allowDirectory && stats.isDirectory()) {
        return {
          valid: false,
          error: "Path points to a directory, but a file is required",
        };
      }
    } catch {
      return {
        valid: false,
        error: `Path does not exist: ${subPathResult.absolutePath}`,
      };
    }
  }

  return { valid: true, absolutePath: subPathResult.absolutePath };
}

/**
 * Synchronous version of validateWorkspacePath.
 * Does not check if the path exists on disk.
 *
 * @param filePath - The path to validate
 * @param workspacePath - The workspace root path
 * @returns PathValidationResult with valid absolute path or error
 *
 * @example
 * ```typescript
 * const result = validateWorkspacePathSync("docs/readme.md", "/home/user/project");
 * if (result.valid) {
 *   // Use result.absolutePath
 * }
 * ```
 */
export function validateWorkspacePathSync(
  filePath: string,
  workspacePath: string
): PathValidationResult {
  // Check for empty path
  if (!filePath || filePath.trim() === "") {
    return { valid: false, error: "File path cannot be empty" };
  }

  // Check workspace containment
  const subPathResult = isSubPath(filePath, workspacePath);
  if (!subPathResult.isSubPath) {
    return {
      valid: false,
      error: `Path must be within workspace: ${workspacePath}`,
    };
  }

  return { valid: true, absolutePath: subPathResult.absolutePath };
}

/**
 * Converts a path to use forward slashes (for display or URLs).
 * This is useful for consistent display across platforms.
 *
 * @param inputPath - The path to convert
 * @returns Path with forward slashes
 *
 * @example
 * ```typescript
 * toForwardSlashes("C:\\Users\\test\\file.txt");
 * // Returns: "C:/Users/test/file.txt"
 * ```
 */
export function toForwardSlashes(inputPath: string): string {
  return inputPath.replace(/\\/g, "/");
}

/**
 * Converts a path to use platform-native slashes.
 *
 * @param inputPath - The path to convert
 * @returns Path with platform-native separators
 *
 * @example
 * ```typescript
 * toNativeSlashes("C:/Users/test/file.txt");
 * // Returns: "C:\\Users\\test\\file.txt" on Windows
 * // Returns: "C:/Users/test/file.txt" on macOS (unchanged)
 * ```
 */
export function toNativeSlashes(inputPath: string): string {
  if (process.platform === "win32") {
    return inputPath.replace(/\//g, "\\");
  }
  return inputPath;
}

/**
 * Checks if a path points to a file or directory that exists.
 *
 * @param inputPath - The path to check
 * @returns true if the path exists
 *
 * @example
 * ```typescript
 * await pathExists("/Users/test/file.txt"); // true if file exists
 * ```
 */
export async function pathExists(inputPath: string): Promise<boolean> {
  try {
    await fs.access(inputPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a path points to a directory.
 *
 * @param inputPath - The path to check
 * @returns true if the path is an existing directory
 *
 * @example
 * ```typescript
 * await isDirectory("/Users/test");      // true
 * await isDirectory("/Users/test/file"); // false
 * ```
 */
export async function isDirectory(inputPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(inputPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Checks if a path points to a file.
 *
 * @param inputPath - The path to check
 * @returns true if the path is an existing file
 *
 * @example
 * ```typescript
 * await isFile("/Users/test/file.txt"); // true
 * await isFile("/Users/test");          // false (it's a directory)
 * ```
 */
export async function isFile(inputPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(inputPath);
    return stats.isFile();
  } catch {
    return false;
  }
}
