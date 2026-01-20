/**
 * StatePane - Updated state pane matching reference design.
 *
 * Three collapsible sections:
 * - Progress: Checklist of task steps with checkmarks
 * - Artifacts: File list with type icons
 * - Context: Selected folders, connectors, working files
 */

import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Check,
  FolderOpen,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileCode,
  File,
  BarChart3,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProgressItem } from '@/hooks/useProgress';
import type { Artifact } from '@/hooks/useArtifacts';
import type { AttachedFile } from '@/hooks/useFileUpload';

/**
 * Props for a collapsible section.
 */
interface CollapsibleSectionProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Collapsible section with header and content.
 */
function CollapsibleSection({
  title,
  isExpanded,
  onToggle,
  children,
  icon,
}: CollapsibleSectionProps): ReactElement {
  return (
    <div className="border-b border-cowork-border last:border-b-0">
      {/* Section header */}
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-cowork-hover transition-colors text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-cowork-text">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-cowork-text-muted" />
        ) : (
          <ChevronRight className="w-4 h-4 text-cowork-text-muted" />
        )}
      </button>

      {/* Section content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Props for the ProgressSection component.
 */
interface ProgressSectionContentProps {
  items: ProgressItem[];
}

/**
 * Progress section showing task steps with numbered circles.
 * Matches reference design:
 * - Completed: Green circle with white checkmark
 * - In-progress: Circle with number in coral/orange
 * - Pending: Circle with number in gray
 */
function ProgressSectionContent({ items }: ProgressSectionContentProps): ReactElement {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex items-center gap-2 text-cowork-text-muted mb-2">
          <div className="w-6 h-6 rounded-full border-2 border-cowork-border flex items-center justify-center">
            <Check className="w-3 h-3 text-cowork-border" />
          </div>
          <span className="text-xs">-</span>
          <div className="w-6 h-6 rounded-full border-2 border-cowork-border flex items-center justify-center">
            <Check className="w-3 h-3 text-cowork-border" />
          </div>
          <span className="text-xs">-</span>
          <div className="w-6 h-6 rounded-full border-2 border-dashed border-cowork-border" />
        </div>
        <p className="text-xs text-cowork-text-muted">
          Steps will show as the task unfolds.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <ProgressItemRow key={item.id} item={item} index={index + 1} />
      ))}
    </div>
  );
}

/**
 * Individual progress item row with numbered circles.
 * Matches reference design:
 * - Completed: Green circle with white checkmark
 * - In-progress: Coral/orange circle with white number
 * - Pending: Gray circle with gray number
 * - Blocked: Red circle with exclamation
 */
function ProgressItemRow({ item, index }: { item: ProgressItem; index: number }): ReactElement {
  const getStatusIcon = (): ReactElement => {
    switch (item.status) {
      case 'completed':
        return (
          <div className="w-5 h-5 rounded-full bg-cowork-success flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        );
      case 'in_progress':
        return (
          <div className="w-5 h-5 rounded-full bg-cowork-accent flex items-center justify-center">
            <span className="text-white text-xs font-medium">{index}</span>
          </div>
        );
      case 'blocked':
        return (
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs font-medium">!</span>
          </div>
        );
      default:
        // Pending - gray circle with gray number
        return (
          <div className="w-5 h-5 rounded-full bg-cowork-border flex items-center justify-center">
            <span className="text-cowork-text-muted text-xs font-medium">{index}</span>
          </div>
        );
    }
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      <span
        className={cn(
          'text-sm',
          item.status === 'completed' && 'text-cowork-text',
          item.status === 'in_progress' && 'text-cowork-text font-medium',
          item.status === 'pending' && 'text-cowork-text-muted',
          item.status === 'blocked' && 'text-red-600'
        )}
      >
        {item.content}
      </span>
    </div>
  );
}

/**
 * Props for the ArtifactsSection component.
 */
interface ArtifactsSectionContentProps {
  artifacts: Artifact[];
  onArtifactClick?: (id: string) => void;
}

/**
 * Get file icon based on artifact type.
 */
function getFileIcon(artifact: Artifact): ReactElement {
  const ext = artifact.name.split('.').pop()?.toLowerCase();
  const iconClass = 'w-4 h-4';

  switch (ext) {
    case 'pptx':
    case 'ppt':
      return <FileText className={cn(iconClass, 'text-orange-500')} />;
    case 'docx':
    case 'doc':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <FileImage className={cn(iconClass, 'text-purple-500')} />;
    case 'js':
    case 'ts':
    case 'py':
    case 'html':
    case 'css':
      return <FileCode className={cn(iconClass, 'text-cyan-500')} />;
    default:
      return <File className={cn(iconClass, 'text-cowork-text-muted')} />;
  }
}

/**
 * Artifacts section showing created files.
 * Empty state shows a bar chart icon placeholder matching reference design.
 */
function ArtifactsSectionContent({
  artifacts,
  onArtifactClick,
}: ArtifactsSectionContentProps): ReactElement {
  if (artifacts.length === 0) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-cowork-border flex items-center justify-center mb-2">
          <BarChart3 className="w-6 h-6 text-cowork-border" />
        </div>
        <p className="text-xs text-cowork-text-muted">
          Outputs created during the task land here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {artifacts.map((artifact) => (
        <button
          key={artifact.id}
          onClick={() => onArtifactClick?.(artifact.id)}
          className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-cowork-hover transition-colors text-left"
        >
          {getFileIcon(artifact)}
          <span className="text-sm text-cowork-text truncate flex-1">
            {artifact.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/**
 * Connector item in the context section.
 */
export interface ConnectorItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'active' | 'inactive';
}

/**
 * Working file item.
 */
export interface WorkingFile {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

/**
 * Folder content entry (file or subfolder).
 */
export interface FolderEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

/**
 * Props for the ContextSection component.
 */
interface ContextSectionContentProps {
  folders: string[];
  folderContents: FolderEntry[];
  connectors: ConnectorItem[];
  workingFiles: WorkingFile[];
  attachments: AttachedFile[];
  onFolderClick?: (path: string) => void;
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Get file icon for attachment based on type.
 */
function getAttachmentIcon(file: AttachedFile): ReactElement {
  const iconClass = 'w-4 h-4';
  const ext = file.name.split('.').pop()?.toLowerCase();

  // Check MIME type first
  if (file.type.startsWith('image/')) {
    return <FileImage className={cn(iconClass, 'text-purple-500')} />;
  }
  if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
    return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
  }
  if (file.type.includes('pdf')) {
    return <FileText className={cn(iconClass, 'text-red-500')} />;
  }

  // Fallback to extension
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'webp':
      return <FileImage className={cn(iconClass, 'text-purple-500')} />;
    case 'xlsx':
    case 'xls':
    case 'csv':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
    case 'pdf':
      return <FileText className={cn(iconClass, 'text-red-500')} />;
    case 'docx':
    case 'doc':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'js':
    case 'ts':
    case 'py':
    case 'html':
    case 'css':
      return <FileCode className={cn(iconClass, 'text-cyan-500')} />;
    default:
      return <File className={cn(iconClass, 'text-cowork-text-muted')} />;
  }
}

/**
 * Context section showing folders, connectors, working files, and attachments.
 */
function ContextSectionContent({
  folders,
  folderContents,
  connectors,
  workingFiles,
  attachments,
  onFolderClick,
}: ContextSectionContentProps): ReactElement {
  const isEmpty = folders.length === 0 && connectors.length === 0 && workingFiles.length === 0 && attachments.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <div className="w-12 h-12 rounded-lg border-2 border-dashed border-cowork-border flex items-center justify-center mb-2">
          <FolderOpen className="w-6 h-6 text-cowork-border" />
        </div>
        <p className="text-xs text-cowork-text-muted">
          Track the tools and files in use as the assistant works.
        </p>
      </div>
    );
  }

  // Get the folder name from path for display
  const getFolderName = (path: string): string => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  return (
    <div className="space-y-4">
      {/* Selected folders with contents */}
      {folders.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-cowork-text-muted mb-1">
            <ChevronDown className="w-3 h-3" />
            <span>Selected folders</span>
            <span className="ml-auto">{folders.length}</span>
          </div>
          {folders.map((folder, index) => (
            <div key={index}>
              {/* Main folder */}
              <button
                onClick={() => onFolderClick?.(folder)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-cowork-hover transition-colors text-left"
                title={folder}
              >
                <FolderOpen className="w-4 h-4 text-cowork-accent" />
                <span className="text-sm text-cowork-text font-medium truncate">{getFolderName(folder)}</span>
              </button>
              {/* Folder contents */}
              {folderContents.length > 0 && (
                <div className="ml-4 border-l border-cowork-border pl-2 space-y-0.5">
                  {folderContents.map((entry, entryIndex) => (
                    <div
                      key={entryIndex}
                      className="flex items-center gap-2 px-2 py-1 text-left"
                      title={entry.path}
                    >
                      {entry.isDirectory ? (
                        <FolderOpen className="w-3.5 h-3.5 text-cowork-text-muted" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-cowork-text-muted" />
                      )}
                      <span className="text-xs text-cowork-text-muted truncate">{entry.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Connectors */}
      {connectors.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-cowork-text-muted mb-1">Connectors</div>
          {connectors.map((connector) => {
            const Icon = connector.icon;
            return (
              <div
                key={connector.id}
                className="flex items-center gap-2 px-2 py-1.5"
              >
                <Icon className="w-4 h-4 text-cowork-text-muted" />
                <span className="text-sm text-cowork-text">{connector.name}</span>
                <div
                  className={cn(
                    'w-2 h-2 rounded-full ml-auto',
                    connector.status === 'active' ? 'bg-cowork-success' : 'bg-cowork-border'
                  )}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Working files */}
      {workingFiles.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-cowork-text-muted mb-1">Working files</div>
          {workingFiles.map((file) => {
            const Icon = file.icon;
            return (
              <div
                key={file.id}
                className="flex items-center gap-2 px-2 py-1.5"
              >
                <Icon className="w-4 h-4 text-cowork-text-muted" />
                <span className="text-sm text-cowork-text truncate">{file.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Attached files */}
      {attachments.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-cowork-text-muted mb-1">
            <Paperclip className="w-3 h-3" />
            <span>Attached files</span>
            <span className="ml-auto">{attachments.length}</span>
          </div>
          {attachments.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2 py-1.5"
              title={file.name}
            >
              {getAttachmentIcon(file)}
              <span className="text-sm text-cowork-text truncate flex-1">{file.name}</span>
              <span className="text-xs text-cowork-text-muted">{formatFileSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Props for the StatePane component.
 */
export interface StatePaneProps {
  /** Progress items for the current task */
  progressItems?: ProgressItem[];
  /** Artifacts created during the task */
  artifacts?: Artifact[];
  /** Selected workspace folders */
  folders?: string[];
  /** Contents of the selected folder (files and subfolders) */
  folderContents?: FolderEntry[];
  /** Active connectors */
  connectors?: ConnectorItem[];
  /** Files currently being worked on */
  workingFiles?: WorkingFile[];
  /** Files attached to the task */
  attachments?: AttachedFile[];
  /** Callback when an artifact is clicked */
  onArtifactClick?: (id: string) => void;
  /** Callback when a folder is clicked */
  onFolderClick?: (path: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * StatePane displays the right sidebar with task state information.
 *
 * Features:
 * - Collapsible Progress section with step checkmarks
 * - Collapsible Artifacts section with file list
 * - Collapsible Context section with folders and connectors
 *
 * @example
 * <StatePane
 *   progressItems={todoItems}
 *   artifacts={artifacts}
 *   folders={['Claude Cowork']}
 *   onArtifactClick={handleArtifactClick}
 * />
 */
export const StatePane = memo(function StatePane({
  progressItems = [],
  artifacts = [],
  folders = [],
  folderContents = [],
  connectors = [],
  workingFiles = [],
  attachments = [],
  onArtifactClick,
  onFolderClick,
  className,
}: StatePaneProps): ReactElement {
  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    progress: true,
    artifacts: true,
    context: true,
  });

  const toggleSection = useCallback((section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  return (
    <div className={cn('h-full overflow-y-auto bg-white', className)}>
      {/* Progress section */}
      <CollapsibleSection
        title="Progress"
        isExpanded={expandedSections.progress}
        onToggle={() => toggleSection('progress')}
      >
        <ProgressSectionContent items={progressItems} />
      </CollapsibleSection>

      {/* Artifacts section */}
      <CollapsibleSection
        title="Artifacts"
        isExpanded={expandedSections.artifacts}
        onToggle={() => toggleSection('artifacts')}
      >
        <ArtifactsSectionContent
          artifacts={artifacts}
          onArtifactClick={onArtifactClick}
        />
      </CollapsibleSection>

      {/* Context section */}
      <CollapsibleSection
        title="Context"
        isExpanded={expandedSections.context}
        onToggle={() => toggleSection('context')}
      >
        <ContextSectionContent
          folders={folders}
          folderContents={folderContents}
          connectors={connectors}
          workingFiles={workingFiles}
          attachments={attachments}
          onFolderClick={onFolderClick}
        />
      </CollapsibleSection>
    </div>
  );
});
