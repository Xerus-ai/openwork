/**
 * View Tool
 *
 * Reads file contents and lists directory structures with proper encoding
 * detection, large file handling, and cross-platform path support.
 */

import fs from "fs/promises";
import path from "path";
import type { FileEntry, ToolDefinition, ViewOptions, ViewResult } from "./types.js";

/**
 * Maximum file size in bytes for text reading (10MB).
 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Default maximum number of lines to return.
 */
const DEFAULT_MAX_LINES = 2000;

/**
 * Maximum line length before truncation.
 */
const MAX_LINE_LENGTH = 2000;

/**
 * Known text file extensions.
 */
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "json", "yaml", "yml", "xml", "html", "htm",
  "css", "scss", "sass", "less", "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "rb", "php", "java", "c", "cpp", "h", "hpp", "cs", "go", "rs",
  "swift", "kt", "kts", "scala", "sh", "bash", "zsh", "fish", "ps1",
  "psm1", "psd1", "bat", "cmd", "sql", "graphql", "gql", "vue", "svelte",
  "astro", "prisma", "env", "gitignore", "dockerignore", "editorconfig",
  "eslintrc", "prettierrc", "babelrc", "tsconfig", "jsconfig", "toml",
  "ini", "cfg", "conf", "config", "log", "csv", "tsv", "lock", "makefile",
  "dockerfile", "cmake", "gradle", "properties", "rst", "tex", "r", "rmd",
]);

/**
 * Known image file extensions.
 */
const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "ico", "bmp", "tiff", "tif",
  "heic", "heif", "avif",
]);

/**
 * Known binary file extensions.
 */
const BINARY_EXTENSIONS = new Set([
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "zip", "tar", "gz",
  "rar", "7z", "exe", "dll", "so", "dylib", "wasm", "bin", "dat", "db",
  "sqlite", "sqlite3", "mp3", "mp4", "wav", "flac", "avi", "mkv", "mov",
  "wmv", "ttf", "otf", "woff", "woff2", "eot",
]);

/**
 * Validates that a file path is within the workspace.
 * Returns the resolved absolute path if valid, or an error message.
 */
function validatePath(
  filePath: string,
  workspacePath: string
): { valid: true; absolutePath: string } | { valid: false; error: string } {
  if (!filePath || filePath.trim() === "") {
    return { valid: false, error: "Path cannot be empty" };
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
      error: `Path must be within workspace: ${workspacePath}`,
    };
  }

  return { valid: true, absolutePath };
}

/**
 * Detects the file type based on extension.
 */
function detectFileType(filePath: string): "text" | "binary" | "image" | "unknown" {
  const ext = path.extname(filePath).toLowerCase().slice(1);

  if (!ext) {
    // Files without extension - check common ones
    const basename = path.basename(filePath).toLowerCase();
    if (["makefile", "dockerfile", "jenkinsfile", "vagrantfile", "readme", "license", "authors", "changelog", "contributing"].includes(basename)) {
      return "text";
    }
    return "unknown";
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return "text";
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return "image";
  }

  if (BINARY_EXTENSIONS.has(ext)) {
    return "binary";
  }

  return "unknown";
}

/**
 * Checks if a buffer appears to contain binary content.
 * Returns true if the buffer contains null bytes or high ratio of non-printable chars.
 */
function isBinaryContent(buffer: Buffer): boolean {
  // Check for null bytes in the first 8KB
  const checkLength = Math.min(buffer.length, 8192);

  let nonPrintableCount = 0;
  for (let i = 0; i < checkLength; i++) {
    const byte = buffer[i] as number;
    // Null byte is a strong indicator of binary
    if (byte === 0) {
      return true;
    }
    // Count non-printable characters (excluding common whitespace)
    if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) {
      nonPrintableCount++;
    }
  }

  // If more than 10% non-printable, likely binary
  return nonPrintableCount / checkLength > 0.1;
}

/**
 * Reads a text file and returns content with line information.
 */
async function readTextFile(
  absolutePath: string,
  maxLines: number,
  startLine: number
): Promise<{
  content: string;
  truncated: boolean;
  totalLines: number;
  linesReturned: number;
  encoding: "utf8";
}> {
  const fileContent = await fs.readFile(absolutePath, "utf8");
  const allLines = fileContent.split(/\r?\n/);
  const totalLines = allLines.length;

  // Adjust startLine (1-indexed input to 0-indexed)
  const adjustedStart = Math.max(0, startLine - 1);
  const endLine = Math.min(adjustedStart + maxLines, totalLines);

  // Extract lines in range
  const selectedLines = allLines.slice(adjustedStart, endLine);

  // Truncate long lines
  const truncatedLines = selectedLines.map(line => {
    if (line.length > MAX_LINE_LENGTH) {
      return line.substring(0, MAX_LINE_LENGTH) + "...";
    }
    return line;
  });

  const content = truncatedLines.join("\n");
  const linesReturned = truncatedLines.length;
  const truncated = endLine < totalLines || adjustedStart > 0;

  return {
    content,
    truncated,
    totalLines,
    linesReturned,
    encoding: "utf8",
  };
}

/**
 * Reads directory contents and returns file entries.
 */
async function readDirectory(
  absolutePath: string,
  workspacePath: string,
  currentDepth: number,
  maxDepth: number,
  includeHidden: boolean
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  const dirContents = await fs.readdir(absolutePath, { withFileTypes: true });

  for (const dirent of dirContents) {
    // Skip hidden files unless requested
    if (!includeHidden && dirent.name.startsWith(".")) {
      continue;
    }

    const entryPath = path.join(absolutePath, dirent.name);
    const isDirectory = dirent.isDirectory();

    const entry: FileEntry = {
      name: dirent.name,
      path: entryPath,
      isDirectory,
    };

    try {
      const stats = await fs.stat(entryPath);
      entry.modified = stats.mtime.toISOString();

      if (!isDirectory) {
        entry.size = stats.size;
        const ext = path.extname(dirent.name).slice(1).toLowerCase();
        if (ext) {
          entry.extension = ext;
        }
        entry.fileType = detectFileType(entryPath);
      }
    } catch {
      // If we can't stat, continue with basic info
    }

    entries.push(entry);

    // Recurse into subdirectories if within depth limit
    // With maxDepth=1, we only show immediate contents (no recursion)
    // With maxDepth=2, we show contents and one level of subdirectories
    if (isDirectory && currentDepth < maxDepth) {
      try {
        const subEntries = await readDirectory(
          entryPath,
          workspacePath,
          currentDepth + 1,
          maxDepth,
          includeHidden
        );
        entries.push(...subEntries);
      } catch {
        // Skip directories we can't read
      }
    }
  }

  return entries;
}

/**
 * Views a file or directory at the specified path.
 *
 * @param options - View options
 * @param workspacePath - Workspace root path for validation
 * @returns View result with content or directory listing
 *
 * @example
 * ```typescript
 * // Read a file
 * const result = await view({ path: "src/index.ts" }, "/home/user/project");
 * if (result.success && result.type === "file") {
 *   console.log(result.content);
 * }
 *
 * // List a directory
 * const result = await view({ path: "src", maxDepth: 2 }, "/home/user/project");
 * if (result.success && result.type === "directory") {
 *   result.entries?.forEach(e => console.log(e.name));
 * }
 * ```
 */
export async function view(
  options: ViewOptions,
  workspacePath: string
): Promise<ViewResult> {
  const {
    path: viewPath,
    maxLines = DEFAULT_MAX_LINES,
    startLine = 1,
    maxDepth = 1,
    includeHidden = false,
  } = options;

  // Validate path is within workspace
  const pathValidation = validatePath(viewPath, workspacePath);
  if (!pathValidation.valid) {
    return {
      success: false,
      type: "error",
      path: "",
      error: pathValidation.error,
    };
  }

  const absolutePath = pathValidation.absolutePath;

  // Get file/directory stats
  let stats;
  try {
    stats = await fs.stat(absolutePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return {
        success: false,
        type: "error",
        path: absolutePath,
        error: `Path not found: ${absolutePath}`,
      };
    }
    if ((err as NodeJS.ErrnoException).code === "EACCES") {
      return {
        success: false,
        type: "error",
        path: absolutePath,
        error: `Permission denied: ${absolutePath}`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      type: "error",
      path: absolutePath,
      error: `Failed to access path: ${message}`,
    };
  }

  // Handle directory
  if (stats.isDirectory()) {
    try {
      const entries = await readDirectory(
        absolutePath,
        workspacePath,
        1,
        maxDepth,
        includeHidden
      );

      // Sort entries: directories first, then by name
      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

      return {
        success: true,
        type: "directory",
        path: absolutePath,
        entries,
        totalEntries: entries.length,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        type: "error",
        path: absolutePath,
        error: `Failed to read directory: ${message}`,
      };
    }
  }

  // Handle file
  const fileType = detectFileType(absolutePath);

  // Check file size
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      type: "error",
      path: absolutePath,
      error: `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB (${(stats.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  // For binary files, return metadata only
  if (fileType === "binary") {
    return {
      success: true,
      type: "file",
      path: absolutePath,
      fileType: "binary",
      encoding: "binary",
      error: "Binary file cannot be displayed as text. Use appropriate viewer for this file type.",
    };
  }

  // For images, return metadata only
  if (fileType === "image") {
    return {
      success: true,
      type: "file",
      path: absolutePath,
      fileType: "image",
      encoding: "binary",
      error: "Image file cannot be displayed as text. File path can be used for viewing.",
    };
  }

  // Try to read as text
  try {
    // First check if it's actually binary content
    const buffer = await fs.readFile(absolutePath);
    if (isBinaryContent(buffer)) {
      return {
        success: true,
        type: "file",
        path: absolutePath,
        fileType: "binary",
        encoding: "binary",
        error: "File appears to contain binary content and cannot be displayed as text.",
      };
    }

    // Read as text
    const textResult = await readTextFile(absolutePath, maxLines, startLine);

    return {
      success: true,
      type: "file",
      path: absolutePath,
      content: textResult.content,
      truncated: textResult.truncated,
      totalLines: textResult.totalLines,
      startLine: Math.max(1, startLine),
      linesReturned: textResult.linesReturned,
      encoding: textResult.encoding,
      fileType: fileType === "unknown" ? "text" : fileType,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      type: "error",
      path: absolutePath,
      error: `Failed to read file: ${message}`,
    };
  }
}

/**
 * Tool definition for the view tool, suitable for Claude API.
 */
export const viewToolDefinition: ToolDefinition = {
  name: "view",
  description: `Read file contents or list directory structures.

Use this for:
- Reading source code files
- Viewing configuration files
- Listing directory contents
- Exploring project structure
- Inspecting any text-based file

Features:
- Automatic text/binary detection
- Line-based reading with offset and limit
- Recursive directory listing with depth control
- File metadata (size, modified date, type)
- UTF-8 encoding for text files
- Maximum file size: ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB
- Maximum ${DEFAULT_MAX_LINES} lines per request (configurable)

For binary files (images, PDFs, etc.), returns metadata only.`,
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Path to the file or directory (relative to workspace or absolute)",
      },
      maxLines: {
        type: "number",
        description: `Maximum lines to return for files (default: ${DEFAULT_MAX_LINES})`,
      },
      startLine: {
        type: "number",
        description: "Line number to start reading from, 1-indexed (default: 1)",
      },
      maxDepth: {
        type: "number",
        description: "Maximum depth for recursive directory listing (default: 1)",
      },
      includeHidden: {
        type: "boolean",
        description: "Include hidden files and directories (default: false)",
      },
    },
    required: ["path"],
  },
};

/**
 * Creates a view tool handler function for use with Claude API.
 *
 * @param workspacePath - The workspace root path for validation
 * @returns A function that handles view tool calls
 *
 * @example
 * ```typescript
 * const handler = createViewHandler("/home/user/project");
 * const result = await handler({ path: "src/index.ts" });
 * ```
 */
export function createViewHandler(
  workspacePath: string
): (input: ViewOptions) => Promise<ViewResult> {
  return (input: ViewOptions) => view(input, workspacePath);
}
