/**
 * WelcomeScreen component displayed when no active task or in idle mode.
 * Features:
 * - Lightning bolt logo
 * - Welcome heading
 * - 6 Quick action cards in 3x2 grid
 * - Task input area with model selector
 */

import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, ArrowRight, FolderOpen, X, FileText, FileImage, FileCode, File } from 'lucide-react';
import { Button } from '@/components/ui';
import { ModelSelector } from './ModelSelector';
import { formatWorkspacePath, type WorkspaceEntry } from '@/hooks/useWorkspace';
import { useFileUpload, formatFileSize, type AttachedFile } from '@/hooks/useFileUpload';

/**
 * Checks if the Electron API is available.
 */
function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Custom icon components matching the reference design style.
 * Simple line-art icons with consistent stroke width.
 */
function DocumentIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="7" x2="16" y2="7" />
      <line x1="8" y1="11" x2="16" y2="11" />
      <line x1="8" y1="15" x2="12" y2="15" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <polyline points="7,14 10,10 14,13 17,9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PrototypeIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="8" x2="21" y2="8" />
      <circle cx="6" cy="5.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="5.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <path d="M3 6V18C3 19.1 3.9 20 5 20H19C20.1 20 21 19.1 21 18V8C21 6.9 20.1 6 19 6H11L9 4H5C3.9 4 3 4.9 3 6Z" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="16" y1="2" x2="16" y2="6" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} stroke="currentColor" strokeWidth="1.5">
      <path d="M21 12C21 16.4183 16.9706 20 12 20C10.5 20 9.1 19.7 7.8 19.2L3 21L4.5 16.5C3.6 15.2 3 13.6 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="10" x2="8" y2="10.01" strokeLinecap="round" />
      <line x1="12" y1="10" x2="12" y2="10.01" strokeLinecap="round" />
      <line x1="16" y1="10" x2="16" y2="10.01" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Quick action card definition.
 */
interface QuickActionCard {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

/**
 * Predefined quick action cards matching the reference design.
 */
const quickActionCards: QuickActionCard[] = [
  {
    id: 'create-file',
    label: 'Create a file',
    icon: DocumentIcon,
    prompt: 'Create a new document for me',
  },
  {
    id: 'crunch-data',
    label: 'Crunch data',
    icon: ChartIcon,
    prompt: 'Help me analyze some data',
  },
  {
    id: 'make-prototype',
    label: 'Make a prototype',
    icon: PrototypeIcon,
    prompt: 'Help me create a prototype',
  },
  {
    id: 'organize-files',
    label: 'Organize files',
    icon: FolderIcon,
    prompt: 'Help me organize my files',
  },
  {
    id: 'prep-for-day',
    label: 'Prep for the day',
    icon: CalendarIcon,
    prompt: 'Help me prepare for today',
  },
  {
    id: 'send-message',
    label: 'Send a message',
    icon: MessageIcon,
    prompt: 'Help me draft a message',
  },
];

/**
 * Workspace info to be passed when submitting a task.
 */
export interface TaskSubmitInfo {
  task: string;
  workspacePath: string | null;
  workspaceContents: WorkspaceEntry[];
  attachments?: AttachedFile[];
}

/**
 * Props for the WelcomeScreen component.
 */
export interface WelcomeScreenProps {
  /** Callback when a task is submitted with workspace info */
  onTaskSubmit: (info: TaskSubmitInfo) => void;
  /** Callback when a quick action is selected */
  onQuickAction?: (prompt: string) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the QuickActionTile component.
 */
interface QuickActionTileProps {
  card: QuickActionCard;
  onClick: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Individual quick action tile - matches reference design with
 * white background, rounded corners, icon in light rounded box.
 */
function QuickActionTile({ card, onClick, disabled }: QuickActionTileProps): ReactElement {
  const Icon = card.icon;

  const handleClick = useCallback(() => {
    if (!disabled) {
      onClick(card.prompt);
    }
  }, [card.prompt, onClick, disabled]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-4 px-5 py-4 rounded-2xl border border-cowork-border',
        'bg-white',
        'hover:border-cowork-border-hover hover:shadow-sm transition-all',
        'text-left',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-cowork-bg flex items-center justify-center">
        <Icon className="w-6 h-6 text-cowork-text-muted" />
      </div>
      <span className="text-base font-medium text-cowork-text">{card.label}</span>
    </button>
  );
}

/**
 * Lightning bolt logo SVG component - matches reference design.
 * Stylized bolt with highlight effect.
 */
function LightningLogo({ className }: { className?: string }): ReactElement {
  return (
    <svg
      viewBox="0 0 80 100"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Main bolt shape */}
      <path
        d="M45 5L12 55H35L28 95L68 40H42L45 5Z"
        fill="currentColor"
      />
      {/* Highlight/reflection effect */}
      <path
        d="M45 5L40 25L55 25L42 40H68L28 95L35 55H12L45 5Z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  );
}

/**
 * Props for the TaskInput component.
 */
interface TaskInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  workspacePath: string | null;
  onFolderSelect: (path: string, contents: WorkspaceEntry[]) => void;
  isPickerOpen: boolean;
  setIsPickerOpen: (open: boolean) => void;
  attachedFiles: AttachedFile[];
  onAddFiles: () => void;
  onRemoveFile: (fileId: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

/**
 * Task input area with workspace selector, plus button, model selector, and coral start button.
 * Matches reference design layout.
 */
/**
 * Get icon for attached file based on type.
 */
function getAttachmentIcon(file: AttachedFile): ReactElement {
  const iconClass = 'w-4 h-4';
  if (file.type.startsWith('image/')) {
    return <FileImage className={cn(iconClass, 'text-purple-500')} />;
  }
  if (file.type.includes('javascript') || file.type.includes('typescript') || file.name.match(/\.(js|ts|jsx|tsx|py|go|rs)$/)) {
    return <FileCode className={cn(iconClass, 'text-cyan-500')} />;
  }
  if (file.type.includes('text') || file.type.includes('pdf') || file.type.includes('document')) {
    return <FileText className={cn(iconClass, 'text-blue-500')} />;
  }
  return <File className={cn(iconClass, 'text-gray-500')} />;
}

function TaskInput({
  value,
  onChange,
  onSubmit,
  workspacePath,
  onFolderSelect,
  isPickerOpen,
  setIsPickerOpen,
  attachedFiles,
  onAddFiles,
  onRemoveFile,
  fileInputRef,
  onFileInputChange,
  disabled,
}: TaskInputProps): ReactElement {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && value.trim()) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, value]
  );

  const handleFolderClick = useCallback(async () => {
    if (isPickerOpen) return;

    setIsPickerOpen(true);

    try {
      if (!isElectronAvailable()) {
        // Mock for browser testing
        const mockPath = 'C:\\Users\\Demo\\Documents\\Workspace';
        const mockContents: WorkspaceEntry[] = [
          { name: 'src', path: `${mockPath}/src`, isDirectory: true, size: 0, extension: '' },
          { name: 'package.json', path: `${mockPath}/package.json`, isDirectory: false, size: 1024, extension: 'json' },
        ];
        onFolderSelect(mockPath, mockContents);
        return;
      }

      const selectedPath = await window.electronAPI!.selectWorkspaceFolder();
      if (selectedPath) {
        // Fetch folder contents
        const result = await window.electronAPI!.listFiles(selectedPath);
        const contents: WorkspaceEntry[] = result.success && result.entries
          ? result.entries.slice(0, 8).map((entry) => ({
              name: entry.name,
              path: entry.path,
              isDirectory: entry.isDirectory,
              size: entry.size,
              extension: entry.extension,
            }))
          : [];
        onFolderSelect(selectedPath, contents);
      }
    } finally {
      setIsPickerOpen(false);
    }
  }, [isPickerOpen, setIsPickerOpen, onFolderSelect]);

  // Get display name for the folder
  const folderDisplayName = workspacePath
    ? formatWorkspacePath(workspacePath, 25)
    : 'Select folder';

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={onFileInputChange}
        multiple
        className="hidden"
        accept=".txt,.md,.csv,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif,.webp,.svg,.json,.xml,.html,.css,.js,.ts,.tsx,.jsx,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.hpp,.sh,.bash,.yaml,.yml,.toml,.ini,.env"
      />

      <div className="bg-white rounded-2xl border border-cowork-border overflow-hidden shadow-sm">
        {/* Text input area */}
        <div className="px-5 pt-5 pb-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a task here..."
            disabled={disabled}
            className={cn(
              'w-full min-h-[70px] resize-none bg-transparent text-cowork-text',
              'placeholder:text-cowork-text-muted focus:outline-none text-lg',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            rows={2}
          />

          {/* Attached files display */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-cowork-border">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cowork-bg rounded-lg text-sm"
                >
                  {getAttachmentIcon(file)}
                  <span className="text-cowork-text truncate max-w-[150px]">{file.name}</span>
                  <span className="text-cowork-text-muted text-xs">({formatFileSize(file.size)})</span>
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="p-0.5 hover:bg-cowork-hover rounded"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="w-3.5 h-3.5 text-cowork-text-muted" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom bar with controls */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-cowork-border bg-cowork-bg">
          <div className="flex items-center gap-3">
            {/* Workspace selector dropdown */}
            <button
              onClick={handleFolderClick}
              disabled={isPickerOpen}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-cowork-hover transition-colors',
                isPickerOpen && 'opacity-50 cursor-wait'
              )}
              aria-label="Select workspace folder"
              title={workspacePath || 'Click to select a folder'}
            >
              <FolderOpen className="w-4 h-4 text-cowork-text-muted" />
              <span className="text-sm font-medium text-cowork-text">{folderDisplayName}</span>
              <svg
                className="w-3 h-3 text-cowork-text-muted"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Plus button for attachments */}
            <button
              onClick={onAddFiles}
              disabled={disabled}
              className={cn(
                'p-2 rounded-lg hover:bg-cowork-hover transition-colors',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              aria-label="Add attachment"
            >
              <Plus className="w-5 h-5 text-cowork-text-muted" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {/* Model selector */}
            <ModelSelector disabled={disabled} />

            {/* Coral "Let's go" button with arrow */}
            <Button
              onClick={onSubmit}
              disabled={disabled || !value.trim()}
              className="bg-cowork-accent hover:bg-cowork-accent-hover text-white px-6 py-2.5 rounded-xl font-medium gap-2 text-base disabled:opacity-50"
            >
              Let's go
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WelcomeScreen displays the idle/welcome state with quick actions and task input.
 *
 * Matches the reference design with:
 * - Coral/terracotta lightning bolt logo
 * - Stylized "Let's knock something off your list" heading
 * - 3x2 grid of quick action cards
 * - Full-width task input with controls
 *
 * @example
 * <WelcomeScreen
 *   onTaskSubmit={(task) => startTask(task)}
 *   onQuickAction={(prompt) => setInput(prompt)}
 * />
 */
export const WelcomeScreen = memo(function WelcomeScreen({
  onTaskSubmit,
  onQuickAction,
  disabled = false,
  className,
}: WelcomeScreenProps): ReactElement {
  const [inputValue, setInputValue] = useState('');
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [workspaceContents, setWorkspaceContents] = useState<WorkspaceEntry[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // File upload handling
  const {
    attachedFiles,
    addFiles,
    removeFile,
    clearFiles,
    openFilePicker,
    fileInputRef,
  } = useFileUpload();

  const handleFolderSelect = useCallback((path: string, contents: WorkspaceEntry[]) => {
    setWorkspacePath(path);
    setWorkspaceContents(contents);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  }, [addFiles]);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      onTaskSubmit({
        task: inputValue.trim(),
        workspacePath,
        workspaceContents,
        attachments: attachedFiles.length > 0 ? attachedFiles : undefined,
      });
      setInputValue('');
      clearFiles();
      // Don't reset workspace - keep it for next task if user wants
    }
  }, [inputValue, workspacePath, workspaceContents, attachedFiles, onTaskSubmit, clearFiles]);

  const handleQuickAction = useCallback(
    (prompt: string) => {
      if (onQuickAction) {
        onQuickAction(prompt);
      }
      setInputValue(prompt);
    },
    [onQuickAction]
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center min-h-full p-8 pt-16 bg-cowork-bg',
        'bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)]',
        'bg-[size:24px_24px]',
        className
      )}
    >
      <div className="flex flex-col items-center max-w-5xl w-full">
        {/* Lightning bolt logo */}
        <LightningLogo className="w-20 h-24 text-cowork-accent mb-4" />

        {/* Welcome heading - italic serif style */}
        <h1 className="text-4xl md:text-5xl font-normal text-cowork-text mb-10 text-center italic" style={{ fontFamily: 'Georgia, serif' }}>
          Let's knock something off your list
        </h1>

        {/* Quick action cards - 3x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl mb-10">
          {quickActionCards.map((card) => (
            <QuickActionTile
              key={card.id}
              card={card}
              onClick={handleQuickAction}
              disabled={disabled}
            />
          ))}
        </div>

        {/* Task input */}
        <TaskInput
          value={inputValue}
          onChange={setInputValue}
          onSubmit={handleSubmit}
          workspacePath={workspacePath}
          onFolderSelect={handleFolderSelect}
          isPickerOpen={isPickerOpen}
          setIsPickerOpen={setIsPickerOpen}
          attachedFiles={attachedFiles}
          onAddFiles={openFilePicker}
          onRemoveFile={removeFile}
          fileInputRef={fileInputRef}
          onFileInputChange={handleFileInputChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
});
