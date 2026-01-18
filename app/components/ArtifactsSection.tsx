import type { ReactElement } from 'react';
import { memo, useCallback, useMemo } from 'react';
import { Package, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Artifact, ArtifactsSummary } from '@/hooks/useArtifacts';
import { ArtifactItem } from './ArtifactItem';

/**
 * Props for the ArtifactsSection component.
 */
export interface ArtifactsSectionProps {
  /** List of artifacts to display */
  artifacts: Artifact[];
  /** Summary statistics for artifacts */
  summary: ArtifactsSummary;
  /** ID of the currently selected artifact */
  selectedId: string | null;
  /** Callback when an artifact is clicked */
  onArtifactClick?: (id: string) => void;
  /** Callback to clear all artifacts */
  onClearAll?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats total size in a human-readable format.
 */
function formatTotalSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);

  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

/**
 * Empty state when no artifacts exist.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center mb-3">
        <span className="text-muted-foreground text-lg">+</span>
      </div>
      <p className="text-sm font-medium text-foreground">No artifacts yet</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Outputs created during the task land here.
      </p>
    </div>
  );
}

/**
 * Summary badges showing counts by type.
 */
function TypeSummaryBadges({ summary }: { summary: ArtifactsSummary }): ReactElement {
  const typeLabels: Record<string, string> = {
    document: 'Docs',
    spreadsheet: 'Sheets',
    presentation: 'Slides',
    image: 'Images',
    code: 'Code',
    data: 'Data',
    text: 'Text',
    archive: 'Archives',
    other: 'Other',
  };

  const typeColors: Record<string, string> = {
    document: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    spreadsheet: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    presentation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    image: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    code: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    data: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    text: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
    archive: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
    other: 'bg-muted text-muted-foreground',
  };

  const entries = Object.entries(summary.byType).filter(([, count]) => count > 0);

  if (entries.length === 0) {
    return <div />;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([type, count]) => (
        <span
          key={type}
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
            typeColors[type] ?? 'bg-muted text-muted-foreground'
          )}
        >
          {count} {typeLabels[type] ?? type}
        </span>
      ))}
    </div>
  );
}

/**
 * ArtifactsSection displays a list of created artifacts with type icons,
 * file info, and click-to-preview functionality.
 *
 * Features:
 * - File type icons based on extension
 * - File size and timestamp display
 * - Type badges for quick identification
 * - Click to preview file
 * - Clear all button
 * - Scrollable list for many artifacts
 */
export const ArtifactsSection = memo(function ArtifactsSection({
  artifacts,
  summary,
  selectedId,
  onArtifactClick,
  onClearAll,
  className,
}: ArtifactsSectionProps): ReactElement {
  /**
   * Sorts artifacts by creation time (newest first).
   */
  const sortedArtifacts = useMemo(() => {
    return [...artifacts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [artifacts]);

  const handleArtifactClick = useCallback(
    (id: string): void => {
      onArtifactClick?.(id);
    },
    [onArtifactClick]
  );

  const handleClearAll = useCallback((): void => {
    onClearAll?.();
  }, [onClearAll]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span>Artifacts</span>
          </div>
          {summary.total > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-normal text-muted-foreground">
                {summary.total} file{summary.total !== 1 ? 's' : ''} ({formatTotalSize(summary.totalSize)})
              </span>
              {onClearAll && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={handleClearAll}
                  aria-label="Clear all artifacts"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Type summary badges */}
        {summary.total > 0 && <TypeSummaryBadges summary={summary} />}

        {/* Artifacts list */}
        {summary.total === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="space-y-1 max-h-60 overflow-y-auto"
            role="list"
            aria-label="Artifacts list"
          >
            {sortedArtifacts.map((artifact) => (
              <ArtifactItem
                key={artifact.id}
                artifact={artifact}
                isSelected={artifact.id === selectedId}
                onClick={handleArtifactClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
