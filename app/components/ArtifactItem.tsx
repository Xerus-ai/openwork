import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image,
  Code,
  Database,
  FileArchive,
  File,
  Download,
  Check,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import type { Artifact, ArtifactType } from '@/hooks/useArtifacts';

/**
 * Download status for tracking button state.
 */
type DownloadStatus = 'idle' | 'downloading' | 'success' | 'error';

/**
 * Props for the ArtifactItem component.
 */
export interface ArtifactItemProps {
  /** The artifact to display */
  artifact: Artifact;
  /** Whether this artifact is selected */
  isSelected?: boolean;
  /** Callback when the artifact is clicked */
  onClick?: (id: string) => void;
  /** Callback when download is requested */
  onDownload?: (artifact: Artifact) => Promise<boolean>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Icon component for different artifact types.
 */
function ArtifactIcon({ type }: { type: ArtifactType }): ReactElement {
  const iconClass = 'h-5 w-5';

  switch (type) {
    case 'document':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;
    case 'presentation':
      return <Presentation className={cn(iconClass, 'text-orange-500')} />;
    case 'image':
      return <Image className={cn(iconClass, 'text-purple-500')} />;
    case 'code':
      return <Code className={cn(iconClass, 'text-cyan-500')} />;
    case 'data':
      return <Database className={cn(iconClass, 'text-amber-500')} />;
    case 'archive':
      return <FileArchive className={cn(iconClass, 'text-slate-500')} />;
    case 'text':
      return <FileText className={cn(iconClass, 'text-gray-500')} />;
    case 'other':
    default:
      return <File className={cn(iconClass, 'text-muted-foreground')} />;
  }
}

/**
 * Type badge component showing the file extension.
 */
function TypeBadge({ extension, type }: { extension: string; type: ArtifactType }): ReactElement {
  const badgeColors: Record<ArtifactType, string> = {
    document: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    spreadsheet: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    presentation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    image: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    code: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    data: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    archive: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
    text: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
    other: 'bg-muted text-muted-foreground',
  };

  if (!extension) {
    return <div />;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium uppercase',
        badgeColors[type]
      )}
    >
      {extension}
    </span>
  );
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Formats a date string relative to now.
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  if (diffHour < 24) {
    return `${diffHour}h ago`;
  }
  return `${diffDay}d ago`;
}

/**
 * ArtifactItem displays a single artifact with icon, name, type badge,
 * size, and timestamp. Supports click to preview and download.
 */
export const ArtifactItem = memo(function ArtifactItem({
  artifact,
  isSelected = false,
  onClick,
  onDownload,
  className,
}: ArtifactItemProps): ReactElement {
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus>('idle');

  const handleClick = useCallback((): void => {
    onClick?.(artifact.id);
  }, [artifact.id, onClick]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  const handleDownload = useCallback(
    async (event: React.MouseEvent): Promise<void> => {
      event.stopPropagation();

      if (!onDownload || downloadStatus === 'downloading') {
        return;
      }

      setDownloadStatus('downloading');

      try {
        const success = await onDownload(artifact);
        if (success) {
          setDownloadStatus('success');
          // Reset to idle after showing success
          setTimeout(() => setDownloadStatus('idle'), 2000);
        } else {
          setDownloadStatus('idle');
        }
      } catch {
        setDownloadStatus('error');
        setTimeout(() => setDownloadStatus('idle'), 2000);
      }
    },
    [artifact, onDownload, downloadStatus]
  );

  const getDownloadIcon = (): ReactElement => {
    switch (downloadStatus) {
      case 'downloading':
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case 'success':
        return <Check className="h-3.5 w-3.5 text-green-500" />;
      default:
        return <Download className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div
      className={cn(
        'group flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
        isSelected
          ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30'
          : 'border-transparent hover:bg-muted/50',
        className
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-selected={isSelected}
      aria-label={`${artifact.name}, ${formatFileSize(artifact.size)}, created ${formatRelativeTime(artifact.createdAt)}`}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        <ArtifactIcon type={artifact.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate" title={artifact.name}>
            {artifact.name}
          </p>
          <TypeBadge extension={artifact.extension} type={artifact.type} />
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
          <span>{formatFileSize(artifact.size)}</span>
          <span>-</span>
          <span>{formatRelativeTime(artifact.createdAt)}</span>
        </div>
      </div>

      {/* Download button */}
      {onDownload && (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity',
            downloadStatus !== 'idle' && 'opacity-100'
          )}
          onClick={handleDownload}
          disabled={downloadStatus === 'downloading'}
          aria-label={`Download ${artifact.name}`}
        >
          {getDownloadIcon()}
        </Button>
      )}
    </div>
  );
});
