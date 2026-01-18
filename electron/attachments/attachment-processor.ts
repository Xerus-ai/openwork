/**
 * Attachment processor for handling file uploads.
 * Processes uploaded files and prepares them for agent context.
 */

import * as fs from 'fs/promises';
import { readFileForContext, getFileInfo } from './file-reader.js';

/**
 * Represents a file attachment from IPC.
 */
export interface FileAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

/**
 * Result of processing an attachment.
 */
export interface ProcessedAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
  content?: string;
  error?: string;
  isText: boolean;
  isImage: boolean;
}

/**
 * Result of processing multiple attachments.
 */
export interface AttachmentProcessingResult {
  success: boolean;
  attachments: ProcessedAttachment[];
  errors: string[];
  contextText: string;
}

/**
 * Maximum total size for all attachments combined (50MB).
 */
const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

/**
 * Validate a file attachment.
 */
async function validateAttachment(attachment: FileAttachment): Promise<string | null> {
  // Check if path is provided
  if (!attachment.path) {
    return 'File path is missing';
  }

  // Check if file exists
  try {
    const stats = await fs.stat(attachment.path);
    if (!stats.isFile()) {
      return 'Path is not a file';
    }
  } catch {
    return `File not found: ${attachment.path}`;
  }

  return null;
}

/**
 * Process a single file attachment.
 */
async function processAttachment(attachment: FileAttachment): Promise<ProcessedAttachment> {
  // Validate the attachment
  const validationError = await validateAttachment(attachment);
  if (validationError) {
    return {
      name: attachment.name,
      path: attachment.path,
      mimeType: attachment.mimeType,
      size: attachment.size,
      error: validationError,
      isText: false,
      isImage: false,
    };
  }

  // Read the file content
  const readResult = await readFileForContext(attachment.path, attachment.mimeType);

  return {
    name: attachment.name,
    path: attachment.path,
    mimeType: attachment.mimeType,
    size: attachment.size,
    content: readResult.content,
    error: readResult.error,
    isText: readResult.isText,
    isImage: readResult.isImage,
  };
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
 * Build context text from processed attachments.
 */
function buildContextText(attachments: ProcessedAttachment[]): string {
  if (attachments.length === 0) {
    return '';
  }

  const sections: string[] = [];

  for (const attachment of attachments) {
    const info = getFileInfo(attachment.path, attachment.mimeType, attachment.size);

    if (attachment.error) {
      sections.push(`[Error reading ${info}: ${attachment.error}]`);
    } else if (attachment.isText && attachment.content) {
      sections.push(
        `--- File: ${info} ---\n${attachment.content}\n--- End of ${attachment.name} ---`
      );
    } else if (attachment.content) {
      sections.push(attachment.content);
    }
  }

  if (sections.length === 0) {
    return '';
  }

  return `\n\nAttached files:\n\n${sections.join('\n\n')}`;
}

/**
 * Process multiple file attachments.
 *
 * @param attachments - Array of file attachments to process
 * @returns Processing result with content and errors
 */
export async function processAttachments(
  attachments: FileAttachment[]
): Promise<AttachmentProcessingResult> {
  if (!attachments || attachments.length === 0) {
    return {
      success: true,
      attachments: [],
      errors: [],
      contextText: '',
    };
  }

  // Check total size
  const totalSize = attachments.reduce((sum, a) => sum + a.size, 0);
  if (totalSize > MAX_TOTAL_SIZE) {
    return {
      success: false,
      attachments: [],
      errors: [`Total attachment size (${formatBytes(totalSize)}) exceeds maximum (${formatBytes(MAX_TOTAL_SIZE)})`],
      contextText: '',
    };
  }

  // Process all attachments
  const processedAttachments: ProcessedAttachment[] = [];
  const errors: string[] = [];

  for (const attachment of attachments) {
    const processed = await processAttachment(attachment);
    processedAttachments.push(processed);

    if (processed.error) {
      errors.push(`${attachment.name}: ${processed.error}`);
    }
  }

  // Build context text
  const contextText = buildContextText(processedAttachments);

  return {
    success: errors.length === 0,
    attachments: processedAttachments,
    errors,
    contextText,
  };
}

/**
 * Create a summary of attachments for quick display.
 */
export function createAttachmentSummary(attachments: FileAttachment[]): string {
  if (!attachments || attachments.length === 0) {
    return '';
  }

  const summary = attachments
    .map((a) => getFileInfo(a.path, a.mimeType, a.size))
    .join(', ');

  return `Attached: ${summary}`;
}
