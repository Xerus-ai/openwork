/**
 * File reader for processing various file formats.
 * Extracts text content from uploaded files for agent context.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Result of reading a file.
 */
export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  mimeType: string;
  isText: boolean;
  isImage: boolean;
}

/**
 * Text-based MIME types that can be read directly.
 */
const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  'text/xml',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
]);

/**
 * Image MIME types.
 */
const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

/**
 * File extensions for text files (when MIME type is not reliable).
 */
const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.csv', '.json', '.xml', '.html', '.css', '.js', '.ts',
  '.tsx', '.jsx', '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h',
  '.hpp', '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd', '.yaml', '.yml',
  '.toml', '.ini', '.env', '.conf', '.config', '.gitignore', '.dockerignore',
  '.editorconfig', '.eslintrc', '.prettierrc', '.babelrc',
]);

/**
 * Maximum file size to read (10MB).
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum content length to include in context (to prevent overwhelming the model).
 */
const MAX_CONTENT_LENGTH = 100000;

/**
 * Determine if a file is a text file based on MIME type and extension.
 */
function isTextFile(mimeType: string, filePath: string): boolean {
  if (TEXT_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

/**
 * Determine if a file is an image.
 */
function isImageFile(mimeType: string): boolean {
  return IMAGE_MIME_TYPES.has(mimeType);
}

/**
 * Read a text file and return its contents.
 */
async function readTextFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');

  // Truncate if too long
  if (content.length > MAX_CONTENT_LENGTH) {
    const truncated = content.substring(0, MAX_CONTENT_LENGTH);
    return `${truncated}\n\n[Content truncated - file exceeds ${MAX_CONTENT_LENGTH} characters]`;
  }

  return content;
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Read a file and extract its content for agent context.
 *
 * @param filePath - Path to the file
 * @param mimeType - MIME type of the file
 * @returns Result containing file content or error
 */
export async function readFileForContext(
  filePath: string,
  mimeType: string
): Promise<FileReadResult> {
  try {
    // Check if file exists
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      return {
        success: false,
        error: 'Path is not a file',
        mimeType,
        isText: false,
        isImage: false,
      };
    }

    // Check file size
    if (stats.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size (${formatBytes(stats.size)}) exceeds maximum allowed (${formatBytes(MAX_FILE_SIZE)})`,
        mimeType,
        isText: false,
        isImage: false,
      };
    }

    // Handle text files
    if (isTextFile(mimeType, filePath)) {
      const content = await readTextFile(filePath);
      return {
        success: true,
        content,
        mimeType,
        isText: true,
        isImage: false,
      };
    }

    // Handle image files (return description, actual image processing would require additional libraries)
    if (isImageFile(mimeType)) {
      return {
        success: true,
        content: `[Image file: ${path.basename(filePath)}, ${formatBytes(stats.size)}]`,
        mimeType,
        isText: false,
        isImage: true,
      };
    }

    // Handle PDF files (would require a library like pdf-parse)
    if (mimeType === 'application/pdf') {
      return {
        success: true,
        content: `[PDF file: ${path.basename(filePath)}, ${formatBytes(stats.size)} - PDF text extraction not implemented]`,
        mimeType,
        isText: false,
        isImage: false,
      };
    }

    // Handle Office documents (would require libraries like mammoth for docx)
    if (mimeType.includes('officedocument') || mimeType.includes('msword')) {
      return {
        success: true,
        content: `[Office document: ${path.basename(filePath)}, ${formatBytes(stats.size)} - document extraction not implemented]`,
        mimeType,
        isText: false,
        isImage: false,
      };
    }

    // Unknown file type
    return {
      success: true,
      content: `[Binary file: ${path.basename(filePath)}, ${formatBytes(stats.size)}]`,
      mimeType,
      isText: false,
      isImage: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error reading file';
    return {
      success: false,
      error: message,
      mimeType,
      isText: false,
      isImage: false,
    };
  }
}

/**
 * Get file info summary for display.
 */
export function getFileInfo(filePath: string, mimeType: string, size: number): string {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const sizeStr = formatBytes(size);

  return `${name} (${ext || mimeType}, ${sizeStr})`;
}
