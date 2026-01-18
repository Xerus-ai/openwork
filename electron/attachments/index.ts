/**
 * Attachments module exports.
 * Provides file attachment processing for the electron main process.
 */

export {
  processAttachments,
  createAttachmentSummary,
  type FileAttachment,
  type ProcessedAttachment,
  type AttachmentProcessingResult,
} from './attachment-processor.js';

export {
  readFileForContext,
  getFileInfo,
  type FileReadResult,
} from './file-reader.js';
