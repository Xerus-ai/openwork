import { useCallback, useRef, useState } from 'react';

/**
 * Maximum file size in bytes (10MB).
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Allowed file types for upload.
 * Supports common document, image, and code file types.
 */
const ALLOWED_FILE_TYPES = [
  // Documents
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Code and data
  'application/json',
  'application/xml',
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/typescript',
];

/**
 * File extensions allowed when MIME type detection fails.
 */
const ALLOWED_EXTENSIONS = [
  '.txt', '.md', '.csv', '.pdf', '.doc', '.docx',
  '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.json', '.xml', '.html', '.css', '.js', '.ts', '.tsx', '.jsx',
  '.py', '.rb', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.hpp',
  '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
  '.yaml', '.yml', '.toml', '.ini', '.env', '.conf', '.config',
];

/**
 * Extended File interface for Electron.
 * In Electron, files selected via file dialogs or drag-and-drop have a path property.
 */
interface ElectronFile extends File {
  path?: string;
}

/**
 * Represents an attached file with metadata.
 */
export interface AttachedFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  /** Full file path (available in Electron environment) */
  filePath?: string;
}

/**
 * Error information for file validation failures.
 */
export interface FileValidationError {
  fileName: string;
  error: string;
}

/**
 * State returned by the useFileUpload hook.
 */
export interface FileUploadState {
  attachedFiles: AttachedFile[];
  errors: FileValidationError[];
  isDragging: boolean;
}

/**
 * Actions returned by the useFileUpload hook.
 */
export interface FileUploadActions {
  addFiles: (files: FileList | File[]) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  clearErrors: () => void;
  setIsDragging: (isDragging: boolean) => void;
  openFilePicker: () => void;
}

/**
 * Result type for the useFileUpload hook.
 */
export type UseFileUploadResult = FileUploadState & FileUploadActions & {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
};

/**
 * Generates a unique ID for attached files.
 */
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Checks if a file type is allowed.
 */
function isFileTypeAllowed(file: File): boolean {
  // Check MIME type
  if (file.type && ALLOWED_FILE_TYPES.includes(file.type)) {
    return true;
  }

  // Check extension as fallback
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.includes(extension);
}

/**
 * Validates a file for upload.
 * @returns Error message if invalid, null if valid
 */
function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File exceeds 10MB limit (${formatFileSize(file.size)})`;
  }

  if (!isFileTypeAllowed(file)) {
    return `File type not supported`;
  }

  return null;
}

/**
 * Creates an image preview URL for image files.
 */
function createImagePreview(file: File): string | undefined {
  if (file.type.startsWith('image/')) {
    return URL.createObjectURL(file);
  }
  return undefined;
}

/**
 * Hook for managing file uploads with validation.
 * Handles file selection, drag-and-drop, validation, and cleanup.
 *
 * @returns File upload state and actions
 *
 * @example
 * const { attachedFiles, addFiles, removeFile, openFilePicker, fileInputRef } = useFileUpload();
 *
 * // Open native file picker
 * <button onClick={openFilePicker}>Attach File</button>
 *
 * // Hidden file input
 * <input type="file" ref={fileInputRef} onChange={e => addFiles(e.target.files)} />
 *
 * // Handle drag and drop
 * <div onDrop={e => addFiles(e.dataTransfer.files)} />
 */
export function useFileUpload(): UseFileUploadResult {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [errors, setErrors] = useState<FileValidationError[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Adds files to the attachment list after validation.
   */
  const addFiles = useCallback((files: FileList | File[]): void => {
    const fileArray = Array.from(files);
    const newFiles: AttachedFile[] = [];
    const newErrors: FileValidationError[] = [];

    for (const file of fileArray) {
      const error = validateFile(file);

      if (error) {
        newErrors.push({ fileName: file.name, error });
      } else {
        const preview = createImagePreview(file);
        // In Electron, File objects from file dialogs have a path property
        const electronFile = file as ElectronFile;
        newFiles.push({
          id: generateFileId(),
          file,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          preview,
          filePath: electronFile.path,
        });
      }
    }

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }

    if (newErrors.length > 0) {
      setErrors((prev) => [...prev, ...newErrors]);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Removes a file from the attachment list.
   */
  const removeFile = useCallback((fileId: string): void => {
    setAttachedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      // Revoke preview URL to prevent memory leaks
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  }, []);

  /**
   * Clears all attached files.
   */
  const clearFiles = useCallback((): void => {
    // Revoke all preview URLs
    attachedFiles.forEach((file) => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview);
      }
    });
    setAttachedFiles([]);
  }, [attachedFiles]);

  /**
   * Clears all validation errors.
   */
  const clearErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  /**
   * Opens the native file picker dialog.
   */
  const openFilePicker = useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  return {
    attachedFiles,
    errors,
    isDragging,
    addFiles,
    removeFile,
    clearFiles,
    clearErrors,
    setIsDragging,
    openFilePicker,
    fileInputRef,
  };
}
