import type { ReactElement } from 'react';
import { memo } from 'react';
import { X, FileText, Image, FileSpreadsheet, Presentation, FileCode, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { formatFileSize, type AttachedFile } from '@/hooks/useFileUpload';

/**
 * Props for the FileAttachment component.
 */
export interface FileAttachmentProps {
  file: AttachedFile;
  onRemove: (fileId: string) => void;
  className?: string;
}

/**
 * Gets the appropriate icon component for a file type.
 */
function getFileIcon(type: string, name: string): typeof FileText {
  // Check by MIME type first
  if (type.startsWith('image/')) {
    return Image;
  }
  if (type.includes('spreadsheet') || type.includes('excel')) {
    return FileSpreadsheet;
  }
  if (type.includes('presentation') || type.includes('powerpoint')) {
    return Presentation;
  }
  if (type.includes('javascript') || type.includes('typescript') || type.includes('json')) {
    return FileCode;
  }

  // Check by extension
  const extension = name.split('.').pop()?.toLowerCase();
  if (extension) {
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) {
      return Image;
    }
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return FileSpreadsheet;
    }
    if (['ppt', 'pptx'].includes(extension)) {
      return Presentation;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h'].includes(extension)) {
      return FileCode;
    }
    if (['txt', 'md', 'doc', 'docx', 'pdf'].includes(extension)) {
      return FileText;
    }
  }

  return File;
}

/**
 * Displays a single attached file with preview, metadata, and remove button.
 * Shows image thumbnails for image files, and icons for other file types.
 */
export const FileAttachment = memo(function FileAttachment({
  file,
  onRemove,
  className,
}: FileAttachmentProps): ReactElement {
  const IconComponent = getFileIcon(file.type, file.name);
  const isImage = file.type.startsWith('image/') && file.preview;

  const handleRemove = (): void => {
    onRemove(file.id);
  };

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg border bg-muted/30 p-2 pr-8',
        'hover:bg-muted/50 transition-colors',
        className
      )}
    >
      {/* Thumbnail or icon */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded bg-background border">
        {isImage ? (
          <img
            src={file.preview}
            alt={file.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <IconComponent className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)}
        </p>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        onClick={handleRemove}
        aria-label={`Remove ${file.name}`}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
});

/**
 * Props for the FileAttachmentList component.
 */
export interface FileAttachmentListProps {
  files: AttachedFile[];
  onRemove: (fileId: string) => void;
  className?: string;
}

/**
 * Displays a list of attached files.
 */
export const FileAttachmentList = memo(function FileAttachmentList({
  files,
  onRemove,
  className,
}: FileAttachmentListProps): ReactElement | null {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {files.map((file) => (
        <FileAttachment
          key={file.id}
          file={file}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
});
