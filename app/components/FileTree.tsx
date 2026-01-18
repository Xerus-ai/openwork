import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useFileTree } from '@/hooks/useFileTree';
import { TreeNode } from './TreeNode';
import { Button } from '@/components/ui';
import { RefreshCw, Folder, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Props for the FileTree component.
 */
export interface FileTreeProps {
  /** The root workspace path to display */
  workspacePath: string | null;
  /** Callback when a file is selected */
  onFileSelect?: (filePath: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty state when no workspace is selected.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <Folder className="w-12 h-12 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">
        No workspace selected
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Select a workspace folder to view files
      </p>
    </div>
  );
}

/**
 * Loading state while fetching directory contents.
 */
function LoadingState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <Loader2 className="w-8 h-8 text-muted-foreground animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">
        Loading files...
      </p>
    </div>
  );
}

/**
 * Error state when directory listing fails.
 */
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <AlertCircle className="w-10 h-10 text-destructive/70 mb-3" />
      <p className="text-sm text-destructive mb-2">
        Failed to load files
      </p>
      <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
        {error}
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3 h-3 mr-1" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Empty directory state.
 */
function EmptyDirectoryState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <Folder className="w-10 h-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm text-muted-foreground">
        This folder is empty
      </p>
    </div>
  );
}

/**
 * Header for the file tree with title and refresh button.
 */
interface FileTreeHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
}

function FileTreeHeader({ isLoading, onRefresh }: FileTreeHeaderProps): ReactElement {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2">
        <Folder className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Files</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0"
        onClick={onRefresh}
        disabled={isLoading}
        aria-label="Refresh file tree"
      >
        <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
      </Button>
    </div>
  );
}

/**
 * FileTree component displays a collapsible file tree for the workspace.
 *
 * Features:
 * - Recursive tree rendering with expand/collapse
 * - File type icons based on extension
 * - Lazy loading of directory contents
 * - Selection highlighting
 * - Refresh functionality
 * - Empty, loading, and error states
 * - Keyboard navigation support
 */
export const FileTree = memo(function FileTree({
  workspacePath,
  onFileSelect,
  className,
}: FileTreeProps): ReactElement {
  const {
    nodes,
    isLoading,
    error,
    selectedPath,
    refresh,
    toggleExpand,
    selectNode,
  } = useFileTree(workspacePath);

  /**
   * Handles file selection and calls the callback.
   */
  const handleSelect = useCallback(
    (filePath: string): void => {
      selectNode(filePath);
      if (onFileSelect) {
        onFileSelect(filePath);
      }
    },
    [selectNode, onFileSelect]
  );

  /**
   * Handles refresh button click.
   */
  const handleRefresh = useCallback((): void => {
    refresh();
  }, [refresh]);

  // No workspace selected
  if (!workspacePath) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <FileTreeHeader isLoading={false} onRefresh={handleRefresh} />
        <EmptyState />
      </div>
    );
  }

  // Loading state
  if (isLoading && nodes.length === 0) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <FileTreeHeader isLoading={true} onRefresh={handleRefresh} />
        <LoadingState />
      </div>
    );
  }

  // Error state
  if (error && nodes.length === 0) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <FileTreeHeader isLoading={false} onRefresh={handleRefresh} />
        <ErrorState error={error} onRetry={handleRefresh} />
      </div>
    );
  }

  // Empty directory
  if (nodes.length === 0) {
    return (
      <div className={cn('flex flex-col h-full bg-background', className)}>
        <FileTreeHeader isLoading={isLoading} onRefresh={handleRefresh} />
        <EmptyDirectoryState />
      </div>
    );
  }

  // Tree view
  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      <FileTreeHeader isLoading={isLoading} onRefresh={handleRefresh} />
      <div
        className="flex-1 overflow-y-auto py-1"
        role="tree"
        aria-label="File tree"
      >
        {nodes.map((node) => (
          <TreeNode
            key={node.entry.path}
            node={node}
            selectedPath={selectedPath}
            onToggleExpand={toggleExpand}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Export types for external use.
 */
export type { FileEntry, TreeNode as TreeNodeType } from '@/hooks/useFileTree';
