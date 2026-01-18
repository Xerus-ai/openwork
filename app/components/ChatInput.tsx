import type { ReactElement, KeyboardEvent, DragEvent, ChangeEvent } from 'react';
import { memo, useCallback, useRef, useState } from 'react';
import { Send, Paperclip, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useFileUpload, type AttachedFile } from '@/hooks/useFileUpload';
import { FileAttachmentList } from './FileAttachment';

/**
 * Props for the ChatInput component.
 */
export interface ChatInputProps {
  onSend: (message: string, attachments: AttachedFile[]) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Chat input component with textarea, send button, and file attachment support.
 * Features:
 * - Multi-line textarea that grows with content
 * - Send button with Enter keyboard shortcut (Shift+Enter for newline)
 * - File attachment picker button
 * - Drag-and-drop file upload
 * - File type and size validation (10MB limit)
 * - Display attached files with remove option
 */
export const ChatInput = memo(function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
  className,
}: ChatInputProps): ReactElement {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
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
  } = useFileUpload();

  /**
   * Handles message submission.
   */
  const handleSend = useCallback((): void => {
    const trimmedMessage = message.trim();

    // Require message or attachments
    if (!trimmedMessage && attachedFiles.length === 0) {
      return;
    }

    onSend(trimmedMessage, attachedFiles);
    setMessage('');
    clearFiles();

    // Refocus textarea
    textareaRef.current?.focus();
  }, [message, attachedFiles, onSend, clearFiles]);

  /**
   * Handles keyboard events in the textarea.
   * Enter sends, Shift+Enter creates newline.
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        if (!disabled) {
          handleSend();
        }
      }
    },
    [disabled, handleSend]
  );

  /**
   * Handles textarea value changes and auto-resize.
   */
  const handleChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>): void => {
    setMessage(event.target.value);

    // Auto-resize textarea
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, []);

  /**
   * Handles file input change event.
   */
  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>): void => {
      const files = event.target.files;
      if (files) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  /**
   * Handles drag enter event.
   */
  const handleDragEnter = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  /**
   * Handles drag leave event.
   */
  const handleDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      // Only set to false if leaving the drop zone entirely
      const relatedTarget = event.relatedTarget as Node | null;
      if (!event.currentTarget.contains(relatedTarget)) {
        setIsDragging(false);
      }
    },
    [setIsDragging]
  );

  /**
   * Handles drag over event.
   */
  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  /**
   * Handles drop event.
   */
  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>): void => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragging(false);

      const files = event.dataTransfer.files;
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles, setIsDragging]
  );

  const hasContent = message.trim().length > 0 || attachedFiles.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 border-t',
        isDragging && 'ring-2 ring-primary ring-inset bg-primary/5',
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-1">
          {errors.map((error, index) => (
            <div
              key={`${error.fileName}-${index}`}
              className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                <strong>{error.fileName}:</strong> {error.error}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => {
                  clearErrors();
                }}
                aria-label="Dismiss error"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Attached files */}
      <FileAttachmentList
        files={attachedFiles}
        onRemove={removeFile}
      />

      {/* Input area */}
      <div className="flex items-end gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          accept=".txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.sh,.bash,.zsh,.ps1,.bat,.cmd,.yaml,.yml,.toml,.ini,.env,.conf,.config"
        />

        {/* Attachment button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={openFilePicker}
          disabled={disabled}
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Textarea */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full resize-none rounded-lg border bg-background px-4 py-3 pr-12',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[48px] max-h-[200px]'
            )}
            aria-label="Message input"
          />

          {/* Drag overlay indicator */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10 pointer-events-none">
              <span className="text-sm font-medium text-primary">
                Drop files here
              </span>
            </div>
          )}
        </div>

        {/* Send button */}
        <Button
          variant="default"
          size="icon"
          onClick={handleSend}
          disabled={disabled || !hasContent}
          aria-label="Send message"
          title="Send message (Enter)"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground text-center">
        Press Enter to send, Shift+Enter for new line. Drag files to attach.
      </p>
    </div>
  );
});
