import type { ReactElement, KeyboardEvent, DragEvent, ChangeEvent } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Plus, AlertCircle, X, Circle, ListPlus, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useFileUpload, type AttachedFile } from '@/hooks/useFileUpload';
import { FileAttachmentList } from './FileAttachment';
import { ModelSelector } from './ModelSelector';

/**
 * Props for the ChatInput component.
 */
export interface ChatInputProps {
  onSend: (message: string, attachments: AttachedFile[]) => void | Promise<void>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Initial message to populate the input (used by quick actions) */
  initialMessage?: string;
  /** Current workspace path (for display) */
  workspacePath?: string | null;
  /** Callback when user wants to change workspace */
  onWorkspaceChange?: () => void;
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
  initialMessage,
  workspacePath,
  onWorkspaceChange,
}: ChatInputProps): ReactElement {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * Handles initial message from quick actions.
   * Sets the message and focuses the textarea.
   */
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
      // Focus and resize textarea after setting message
      const textarea = textareaRef.current;
      if (textarea) {
        textarea.focus();
        // Trigger resize
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
      }
    }
  }, [initialMessage]);

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
        'flex flex-col gap-2 px-4 py-3 bg-cowork-bg',
        isDragging && 'ring-2 ring-cowork-accent ring-inset bg-cowork-accent/5',
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
              className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">
                <strong>{error.fileName}:</strong> {error.error}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-red-600 hover:text-red-700 hover:bg-red-100"
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
        accept=".txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.sh,.bash,.zsh,.ps1,.bat,.cmd,.yaml,.yml,.toml,.ini,.env,.conf,.config"
      />

      {/* Input container - rounded with two-row layout */}
      <div
        className={cn(
          'flex flex-col rounded-2xl border border-cowork-border bg-white',
          'px-4 py-3 min-h-[100px]',
          'focus-within:ring-2 focus-within:ring-cowork-accent/20 focus-within:border-cowork-accent/30'
        )}
      >
        {/* Row 1: Textarea */}
        <div className="flex-1 relative min-w-0 mb-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={2}
            className={cn(
              'w-full resize-none bg-transparent border-none outline-none',
              'text-base text-cowork-text placeholder:text-cowork-text-muted',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[48px] max-h-[150px]'
            )}
            aria-label="Message input"
          />

          {/* Drag overlay indicator */}
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-cowork-accent bg-cowork-accent/10 pointer-events-none">
              <span className="text-sm font-medium text-cowork-accent">
                Drop files here
              </span>
            </div>
          )}
        </div>

        {/* Row 2: Controls */}
        <div className="flex items-center gap-2">
          {/* Plus/Add button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openFilePicker}
            disabled={disabled}
            className="h-9 w-9 flex-shrink-0 text-cowork-text-muted hover:text-cowork-text hover:bg-cowork-hover rounded-full"
            aria-label="Add attachment"
            title="Add attachment"
          >
            <Plus className="w-5 h-5" />
          </Button>

          {/* Workspace folder indicator */}
          {onWorkspaceChange && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onWorkspaceChange}
              disabled={disabled}
              className="h-9 flex-shrink-0 text-cowork-text-muted hover:text-cowork-text hover:bg-cowork-hover rounded-full px-3 gap-1.5 max-w-[200px]"
              aria-label="Change workspace folder"
              title={workspacePath || 'Select workspace folder'}
            >
              <FolderOpen className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm truncate">
                {workspacePath ? workspacePath.split(/[/\\]/).pop() : 'Select folder'}
              </span>
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Model selector */}
          <ModelSelector
            className="flex-shrink-0 h-9 w-auto border-0 bg-transparent shadow-none text-cowork-text-muted hover:text-cowork-text"
            disabled={disabled}
          />

          {/* Stop button - circle with filled dot */}
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="h-9 w-9 flex-shrink-0 text-cowork-text-muted hover:text-cowork-text hover:bg-cowork-hover rounded-full border border-cowork-border"
            aria-label="Stop"
            title="Stop"
          >
            <Circle className="w-4 h-4 fill-current" />
          </Button>

          {/* Queue button - coral/salmon with list icon */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSend}
            disabled={disabled || !hasContent}
            className={cn(
              'h-9 flex-shrink-0 rounded-full px-4 gap-1.5',
              'bg-cowork-accent hover:bg-cowork-accent-hover text-white',
              'disabled:opacity-40 disabled:bg-cowork-border'
            )}
            aria-label="Queue message"
            title="Queue message (Enter)"
          >
            <ListPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Queue</span>
          </Button>
        </div>
      </div>

      {/* Disclaimer text */}
      <p className="text-xs text-cowork-text-muted text-center">
        AI can make mistakes. Please double-check responses.
      </p>
    </div>
  );
});
