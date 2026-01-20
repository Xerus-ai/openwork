/**
 * Workspace Validator
 *
 * Validates workspace folders for existence, permissions, and path containment.
 * Provides security boundary enforcement for all file operations.
 */

import fs from "fs/promises";
import { constants as fsConstants } from "fs";

import type {
  WorkspaceConfig,
  WorkspaceValidationResult,
  WorkspacePermissions,
  PathContainmentOptions,
  PathContainmentResult,
} from "./types.js";

import {
  normalizePath,
  isAbsolutePath,
  containsTraversal,
  isSubPath,
} from "../utils/path-utils.js";

/**
 * Validates workspace folders and enforces path containment.
 *
 * Usage:
 * ```typescript
 * const validator = new WorkspaceValidator("/Users/name/project");
 * const result = await validator.validate();
 *
 * if (result.valid) {
 *   // Workspace is valid, check paths
 *   const pathCheck = await validator.isPathContained("docs/readme.md");
 *   if (pathCheck.contained) {
 *     // Safe to use pathCheck.absolutePath
 *   }
 * }
 * ```
 */
export class WorkspaceValidator {
  private readonly workspacePath: string;
  private readonly requireWrite: boolean;
  private readonly createIfMissing: boolean;

  constructor(config: WorkspaceConfig | string) {
    if (typeof config === "string") {
      this.workspacePath = config;
      this.requireWrite = true;
      this.createIfMissing = false;
    } else {
      this.workspacePath = config.workspacePath;
      this.requireWrite = config.requireWrite ?? true;
      this.createIfMissing = config.createIfMissing ?? false;
    }
  }

  /**
   * Gets the normalized workspace path.
   */
  getWorkspacePath(): string {
    return normalizePath(this.workspacePath);
  }

  /**
   * Validates the workspace folder.
   * Checks existence, type, and permissions.
   *
   * @returns Validation result with permissions or error
   */
  async validate(): Promise<WorkspaceValidationResult> {
    // Check for empty path
    if (!this.workspacePath || this.workspacePath.trim() === "") {
      return {
        valid: false,
        error: "Workspace path cannot be empty",
        errorCode: "PATH_EMPTY",
      };
    }

    const normalizedPath = normalizePath(this.workspacePath);

    // Check for absolute path
    if (!isAbsolutePath(normalizedPath)) {
      return {
        valid: false,
        error: `Workspace path must be absolute: ${normalizedPath}`,
        errorCode: "PATH_NOT_ABSOLUTE",
      };
    }

    // Check if folder exists
    const existsResult = await this.checkFolderExists(normalizedPath);
    if (!existsResult.valid) {
      return existsResult;
    }

    // Check permissions
    const permissions = await this.checkPermissions(normalizedPath);

    // Verify required permissions
    if (!permissions.canRead) {
      return {
        valid: false,
        error: `No read permission on workspace: ${normalizedPath}`,
        errorCode: "NO_READ_PERMISSION",
      };
    }

    if (this.requireWrite && !permissions.canWrite) {
      return {
        valid: false,
        error: `No write permission on workspace: ${normalizedPath}`,
        errorCode: "NO_WRITE_PERMISSION",
      };
    }

    return {
      valid: true,
      workspacePath: normalizedPath,
      permissions,
    };
  }

  /**
   * Checks if a folder exists, optionally creating it.
   */
  private async checkFolderExists(
    folderPath: string
  ): Promise<WorkspaceValidationResult> {
    try {
      const stats = await fs.stat(folderPath);

      if (!stats.isDirectory()) {
        return {
          valid: false,
          error: `Path is not a directory: ${folderPath}`,
          errorCode: "NOT_A_DIRECTORY",
        };
      }

      return {
        valid: true,
        workspacePath: folderPath,
        permissions: { canRead: false, canWrite: false, canExecute: false },
      };
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;

      // Folder doesn't exist
      if (nodeError.code === "ENOENT") {
        if (this.createIfMissing) {
          return await this.createFolder(folderPath);
        }

        return {
          valid: false,
          error: `Workspace folder does not exist: ${folderPath}`,
          errorCode: "FOLDER_NOT_FOUND",
        };
      }

      // Permission denied
      if (nodeError.code === "EACCES") {
        return {
          valid: false,
          error: `Permission denied accessing: ${folderPath}`,
          errorCode: "PERMISSION_CHECK_FAILED",
        };
      }

      // Other error
      return {
        valid: false,
        error: `Failed to access workspace: ${nodeError.message}`,
        errorCode: "PERMISSION_CHECK_FAILED",
      };
    }
  }

  /**
   * Creates the workspace folder if it doesn't exist.
   */
  private async createFolder(
    folderPath: string
  ): Promise<WorkspaceValidationResult> {
    try {
      await fs.mkdir(folderPath, { recursive: true });

      return {
        valid: true,
        workspacePath: folderPath,
        permissions: { canRead: true, canWrite: true, canExecute: true },
      };
    } catch (error: unknown) {
      const nodeError = error as NodeJS.ErrnoException;

      return {
        valid: false,
        error: `Failed to create workspace folder: ${nodeError.message}`,
        errorCode: "CREATION_FAILED",
      };
    }
  }

  /**
   * Checks read, write, and execute permissions on a folder.
   */
  private async checkPermissions(folderPath: string): Promise<WorkspacePermissions> {
    const permissions: WorkspacePermissions = {
      canRead: false,
      canWrite: false,
      canExecute: false,
    };

    // Check read permission
    try {
      await fs.access(folderPath, fsConstants.R_OK);
      permissions.canRead = true;
    } catch {
      // No read permission
    }

    // Check write permission
    try {
      await fs.access(folderPath, fsConstants.W_OK);
      permissions.canWrite = true;
    } catch {
      // No write permission
    }

    // Check execute permission (needed to list directory contents)
    try {
      await fs.access(folderPath, fsConstants.X_OK);
      permissions.canExecute = true;
    } catch {
      // No execute permission
    }

    return permissions;
  }

  /**
   * Checks if a path is contained within the workspace.
   * This is the primary security boundary for file operations.
   *
   * @param targetPath - The path to validate (relative or absolute)
   * @param mustExist - Whether the path must exist on disk
   * @returns Containment result with absolute path or error
   *
   * @example
   * ```typescript
   * const result = await validator.isPathContained("docs/readme.md");
   * if (result.contained) {
   *   console.log(result.absolutePath); // "/workspace/docs/readme.md"
   * }
   *
   * const escape = await validator.isPathContained("../../../etc/passwd");
   * // { contained: false, error: "Path attempts to escape workspace" }
   * ```
   */
  async isPathContained(
    targetPath: string,
    mustExist = false
  ): Promise<PathContainmentResult> {
    return this.checkPathContainment({
      targetPath,
      workspacePath: this.workspacePath,
      mustExist,
    });
  }

  /**
   * Synchronous version of isPathContained.
   * Does not check if the path exists on disk.
   */
  isPathContainedSync(targetPath: string): PathContainmentResult {
    // Check for empty path
    if (!targetPath || targetPath.trim() === "") {
      return {
        contained: false,
        error: "File path cannot be empty",
        errorCode: "PATH_EMPTY",
      };
    }

    // Check for traversal patterns in raw input
    if (containsTraversal(targetPath)) {
      return {
        contained: false,
        error: `Path contains directory traversal patterns: ${targetPath}`,
        errorCode: "TRAVERSAL_DETECTED",
      };
    }

    const normalizedWorkspace = normalizePath(this.workspacePath);

    // Use path utilities to check containment
    const subPathResult = isSubPath(targetPath, normalizedWorkspace);

    if (!subPathResult.isSubPath) {
      return {
        contained: false,
        error: `Path escapes workspace boundary: ${targetPath}`,
        errorCode: "PATH_ESCAPE",
      };
    }

    return {
      contained: true,
      absolutePath: subPathResult.absolutePath,
      relativePath: subPathResult.relativePath,
    };
  }

  /**
   * Full path containment check with optional existence verification.
   */
  private async checkPathContainment(
    options: PathContainmentOptions
  ): Promise<PathContainmentResult> {
    const { targetPath, mustExist } = options;

    // Run synchronous checks first
    const syncResult = this.isPathContainedSync(targetPath);

    if (!syncResult.contained) {
      return syncResult;
    }

    // Optionally verify path exists
    if (mustExist) {
      try {
        await fs.access(syncResult.absolutePath);
      } catch {
        return {
          contained: false,
          error: `Path does not exist: ${syncResult.absolutePath}`,
          errorCode: "PATH_NOT_FOUND",
        };
      }
    }

    return syncResult;
  }

  /**
   * Validates a file path for workspace operations.
   * Combines containment check with optional existence check.
   *
   * @param filePath - The path to validate
   * @param options - Validation options
   * @returns Absolute path if valid, throws if invalid
   */
  async validateFilePath(
    filePath: string,
    options: { mustExist?: boolean } = {}
  ): Promise<string> {
    const result = await this.isPathContained(filePath, options.mustExist);

    if (!result.contained) {
      throw new Error(result.error);
    }

    return result.absolutePath;
  }

  /**
   * Creates a resolved absolute path within the workspace.
   * Does not verify the path exists.
   *
   * @param relativePath - A relative path from workspace root
   * @returns The absolute path
   * @throws If the path would escape the workspace
   */
  resolvePath(relativePath: string): string {
    const result = this.isPathContainedSync(relativePath);

    if (!result.contained) {
      throw new Error(result.error);
    }

    return result.absolutePath;
  }

  /**
   * Creates a relative path from the workspace root.
   *
   * @param absolutePath - An absolute path within the workspace
   * @returns The relative path from workspace root
   * @throws If the path is not within the workspace
   */
  relativePath(absolutePath: string): string {
    const result = this.isPathContainedSync(absolutePath);

    if (!result.contained) {
      throw new Error(result.error);
    }

    return result.relativePath;
  }
}

/**
 * Creates a WorkspaceValidator instance.
 * Convenience function for one-off validation.
 *
 * @param workspacePath - The workspace directory path
 * @returns A new WorkspaceValidator instance
 */
export function createWorkspaceValidator(
  workspacePath: string
): WorkspaceValidator {
  return new WorkspaceValidator(workspacePath);
}

/**
 * Validates a workspace and returns the result.
 * Convenience function for one-off validation.
 *
 * @param config - Workspace configuration
 * @returns Validation result
 */
export async function validateWorkspace(
  config: WorkspaceConfig | string
): Promise<WorkspaceValidationResult> {
  const validator = new WorkspaceValidator(config);
  return validator.validate();
}

/**
 * Checks if a path is contained within a workspace.
 * Convenience function for one-off containment checks.
 *
 * @param targetPath - The path to check
 * @param workspacePath - The workspace root path
 * @param mustExist - Whether the path must exist
 * @returns Containment result
 */
export async function isPathInWorkspace(
  targetPath: string,
  workspacePath: string,
  mustExist = false
): Promise<PathContainmentResult> {
  const validator = new WorkspaceValidator(workspacePath);
  return validator.isPathContained(targetPath, mustExist);
}
