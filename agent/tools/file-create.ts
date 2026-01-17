/**
 * File Create Tool
 *
 * Creates files in the workspace with atomic writes, path validation,
 * and automatic parent directory creation.
 */

import fs from "fs/promises";
import path from "path";
import type { FileCreateOptions, FileCreateResult, ToolDefinition } from "./types.js";

/**
 * Maximum file size in bytes (10MB).
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Validates that a file path is within the workspace.
 * Returns the resolved absolute path if valid, or an error message.
 */
function validateFilePath(
  filePath: string,
  workspacePath: string
): { valid: true; absolutePath: string } | { valid: false; error: string } {
  if (!filePath || filePath.trim() === "") {
    return { valid: false, error: "File path cannot be empty" };
  }

  // Resolve to absolute path
  let absolutePath: string;
  if (path.isAbsolute(filePath)) {
    absolutePath = path.normalize(filePath);
  } else {
    absolutePath = path.normalize(path.join(workspacePath, filePath));
  }

  // Normalize workspace path for comparison
  const normalizedWorkspace = path.normalize(path.resolve(workspacePath));

  // Check that resolved path is within workspace
  if (!absolutePath.startsWith(normalizedWorkspace + path.sep) && absolutePath !== normalizedWorkspace) {
    return {
      valid: false,
      error: `File path must be within workspace: ${workspacePath}`,
    };
  }

  return { valid: true, absolutePath };
}

/**
 * Validates content size is within limits.
 */
function validateContent(content: string): string | undefined {
  const sizeBytes = Buffer.byteLength(content, "utf8");
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `Content exceeds maximum size of ${MAX_FILE_SIZE_BYTES} bytes (${sizeBytes} bytes provided)`;
  }
  return undefined;
}

/**
 * Creates parent directories for a file path if they don't exist.
 */
async function ensureParentDirectories(filePath: string): Promise<void> {
  const parentDir = path.dirname(filePath);
  await fs.mkdir(parentDir, { recursive: true });
}

/**
 * Checks if a file exists.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a temporary file path in the same directory as the target.
 */
function getTempFilePath(targetPath: string): string {
  const dir = path.dirname(targetPath);
  const baseName = path.basename(targetPath);
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return path.join(dir, `.${baseName}.${timestamp}.${random}.tmp`);
}

/**
 * Creates a file with the given content.
 * Uses atomic writes (write to temp, then rename) for safety.
 *
 * @param options - File creation options
 * @param workspacePath - Workspace root path for validation
 * @returns Creation result with success status and file info
 *
 * @example
 * ```typescript
 * const result = await createFile(
 *   { filePath: "docs/readme.md", content: "# My Project" },
 *   "/home/user/workspace"
 * );
 *
 * if (result.success) {
 *   console.log(`Created ${result.filePath}`);
 * }
 * ```
 */
export async function createFile(
  options: FileCreateOptions,
  workspacePath: string
): Promise<FileCreateResult> {
  const { filePath, content, overwrite = false } = options;

  // Validate file path is within workspace
  const pathValidation = validateFilePath(filePath, workspacePath);
  if (!pathValidation.valid) {
    return {
      success: false,
      filePath: "",
      bytesWritten: 0,
      error: pathValidation.error,
    };
  }

  const absolutePath = pathValidation.absolutePath;

  // Validate content size
  const contentError = validateContent(content);
  if (contentError) {
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: contentError,
    };
  }

  // Check if file exists
  const exists = await fileExists(absolutePath);
  if (exists && !overwrite) {
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: `File already exists: ${absolutePath}. Use overwrite: true to replace.`,
    };
  }

  // Create parent directories
  try {
    await ensureParentDirectories(absolutePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: `Failed to create parent directories: ${message}`,
    };
  }

  // Write atomically: write to temp file, then rename
  const tempPath = getTempFilePath(absolutePath);

  try {
    // Write content to temp file
    await fs.writeFile(tempPath, content, { encoding: "utf8" });

    // Rename temp file to target (atomic on most file systems)
    await fs.rename(tempPath, absolutePath);

    const bytesWritten = Buffer.byteLength(content, "utf8");

    return {
      success: true,
      filePath: absolutePath,
      bytesWritten,
      overwritten: exists && overwrite,
    };
  } catch (err) {
    // Clean up temp file if it exists
    try {
      await fs.unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }

    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: `Failed to write file: ${message}`,
    };
  }
}

/**
 * Tool definition for the file_create tool, suitable for Claude API.
 */
export const fileCreateToolDefinition: ToolDefinition = {
  name: "file_create",
  description: `Create a new file with the specified content.

Use this for:
- Creating new source code files
- Writing configuration files
- Generating documentation files
- Creating any text-based file

Features:
- Automatically creates parent directories if they don't exist
- Uses atomic writes (write to temp, then rename) for safety
- Validates that the file path is within the workspace
- UTF-8 encoding by default
- Maximum file size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB

By default, this tool will NOT overwrite existing files. Set overwrite: true to replace.`,
  input_schema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to create (relative to workspace or absolute)",
      },
      content: {
        type: "string",
        description: "Content to write to the file (UTF-8 encoded)",
      },
      overwrite: {
        type: "boolean",
        description: "Whether to overwrite if file already exists (default: false)",
      },
    },
    required: ["filePath", "content"],
  },
};

/**
 * Creates a file_create tool handler function for use with Claude API.
 *
 * @param workspacePath - The workspace root path for validation
 * @returns A function that handles file_create tool calls
 *
 * @example
 * ```typescript
 * const handler = createFileCreateHandler("/home/user/project");
 * const result = await handler({ filePath: "test.txt", content: "Hello" });
 * ```
 */
export function createFileCreateHandler(
  workspacePath: string
): (input: FileCreateOptions) => Promise<FileCreateResult> {
  return (input: FileCreateOptions) => createFile(input, workspacePath);
}
