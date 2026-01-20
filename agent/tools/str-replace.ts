/**
 * String Replace Tool
 *
 * Performs targeted string replacements in files with exact match validation,
 * atomic writes, line ending preservation, and proper error handling.
 */

import fs from "fs/promises";
import path from "path";
import type { StrReplaceOptions, StrReplaceResult, ToolDefinition } from "./types.js";

/**
 * Maximum file size in bytes (10MB).
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Detects the line ending style used in a string.
 * Returns "CRLF" for Windows-style, "LF" for Unix-style, or "NONE" if no line endings.
 */
function detectLineEnding(content: string): "CRLF" | "LF" | "NONE" {
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const lfCount = (content.match(/(?<!\r)\n/g) || []).length;

  if (crlfCount === 0 && lfCount === 0) {
    return "NONE";
  }

  // Use the majority line ending style
  return crlfCount >= lfCount ? "CRLF" : "LF";
}

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
 * Escapes special regex characters in a string.
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Counts occurrences of a substring in a string.
 */
function countOccurrences(str: string, search: string): number {
  if (search === "") return 0;

  let count = 0;
  let position = 0;

  while ((position = str.indexOf(search, position)) !== -1) {
    count++;
    position += search.length;
  }

  return count;
}

/**
 * Replaces a string in file content with atomic file writes.
 *
 * @param options - String replacement options
 * @param workspacePath - Workspace root path for validation
 * @returns Replacement result with success status and count
 *
 * @example
 * ```typescript
 * const result = await strReplace(
 *   { filePath: "config.ts", oldString: "localhost", newString: "production.example.com" },
 *   "/home/user/workspace"
 * );
 *
 * if (result.success) {
 *   console.log(`Made ${result.replacementCount} replacements in ${result.filePath}`);
 * }
 * ```
 */
export async function strReplace(
  options: StrReplaceOptions,
  workspacePath: string
): Promise<StrReplaceResult> {
  const { filePath, oldString, newString, replaceAll = false } = options;

  // Validate file path is within workspace
  const pathValidation = validateFilePath(filePath, workspacePath);
  if (!pathValidation.valid) {
    return {
      success: false,
      filePath: "",
      replacementCount: 0,
      error: pathValidation.error,
    };
  }

  const absolutePath = pathValidation.absolutePath;

  // Validate oldString is not empty
  if (oldString === "") {
    return {
      success: false,
      filePath: absolutePath,
      replacementCount: 0,
      error: "Old string cannot be empty",
    };
  }

  // Read the file
  let content: string;
  try {
    const stats = await fs.stat(absolutePath);

    if (stats.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        filePath: absolutePath,
        replacementCount: 0,
        error: `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      };
    }

    content = await fs.readFile(absolutePath, "utf8");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        success: false,
        filePath: absolutePath,
        replacementCount: 0,
        error: `File not found: ${absolutePath}`,
      };
    }
    return {
      success: false,
      filePath: absolutePath,
      replacementCount: 0,
      error: `Failed to read file: ${message}`,
    };
  }

  // Check if oldString exists in the file
  const occurrences = countOccurrences(content, oldString);
  if (occurrences === 0) {
    return {
      success: false,
      filePath: absolutePath,
      replacementCount: 0,
      error: `String not found in file: "${oldString.length > 50 ? oldString.substring(0, 50) + "..." : oldString}"`,
    };
  }

  // Detect line ending style
  const lineEnding = detectLineEnding(content);

  // Perform replacement
  let newContent: string;
  let replacementCount: number;

  if (replaceAll) {
    // Replace all occurrences
    const escapedOldString = escapeRegExp(oldString);
    const regex = new RegExp(escapedOldString, "g");
    newContent = content.replace(regex, newString);
    replacementCount = occurrences;
  } else {
    // Replace first occurrence only
    const index = content.indexOf(oldString);
    newContent = content.substring(0, index) + newString + content.substring(index + oldString.length);
    replacementCount = 1;
  }

  // Preserve line ending style if the replacement changed it
  const newLineEnding = detectLineEnding(newContent);
  if (lineEnding !== "NONE" && newLineEnding !== lineEnding) {
    if (lineEnding === "CRLF") {
      newContent = newContent.replace(/(?<!\r)\n/g, "\r\n");
    } else if (lineEnding === "LF") {
      newContent = newContent.replace(/\r\n/g, "\n");
    }
  }

  // Write atomically: write to temp file, then rename
  const tempPath = getTempFilePath(absolutePath);

  try {
    // Write content to temp file
    await fs.writeFile(tempPath, newContent, { encoding: "utf8" });

    // Rename temp file to target (atomic on most file systems)
    await fs.rename(tempPath, absolutePath);

    return {
      success: true,
      filePath: absolutePath,
      replacementCount,
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
      replacementCount: 0,
      error: `Failed to write file: ${message}`,
    };
  }
}

/**
 * Tool definition for the str_replace tool, suitable for Claude API.
 */
export const strReplaceToolDefinition: ToolDefinition = {
  name: "str_replace",
  description: `Replace exact strings in a file.

Use this for:
- Modifying configuration values
- Updating code or text content
- Fixing typos or errors
- Renaming variables, functions, or identifiers

Features:
- Validates exact string match before replacement
- Uses atomic writes (write to temp, then rename) for safety
- Preserves file line endings (CRLF on Windows, LF on Unix)
- UTF-8 encoding
- Maximum file size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB

By default, replaces only the first occurrence. Set replaceAll: true to replace all.

Returns an error if the old string is not found in the file.`,
  input_schema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the file to modify (relative to workspace or absolute)",
      },
      oldString: {
        type: "string",
        description: "The exact string to search for and replace",
      },
      newString: {
        type: "string",
        description: "The string to replace with",
      },
      replaceAll: {
        type: "boolean",
        description: "Whether to replace all occurrences (default: false, replaces first only)",
      },
    },
    required: ["filePath", "oldString", "newString"],
  },
};

/**
 * Creates a str_replace tool handler function for use with Claude API.
 *
 * @param workspacePath - The workspace root path for validation
 * @returns A function that handles str_replace tool calls
 *
 * @example
 * ```typescript
 * const handler = createStrReplaceHandler("/home/user/project");
 * const result = await handler({ filePath: "config.ts", oldString: "foo", newString: "bar" });
 * ```
 */
export function createStrReplaceHandler(
  workspacePath: string
): (input: StrReplaceOptions) => Promise<StrReplaceResult> {
  return (input: StrReplaceOptions) => strReplace(input, workspacePath);
}
