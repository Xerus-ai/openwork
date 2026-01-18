import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import type { TreeNode as TreeNodeType } from '@/hooks/useFileTree';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  File,
  FileText,
  FileImage,
  FileCode,
  FileSpreadsheet,
  Presentation,
  FileType,
  Loader2,
} from 'lucide-react';

/**
 * Props for the TreeNode component.
 */
export interface TreeNodeProps {
  node: TreeNodeType;
  selectedPath: string | null;
  onToggleExpand: (path: string) => void;
  onSelect: (path: string) => void;
}

/**
 * Indentation width per depth level in pixels.
 */
const INDENT_WIDTH = 16;

/**
 * Returns the appropriate icon for a file based on its extension.
 */
function getFileIcon(extension: string): ReactElement {
  const iconClass = 'w-4 h-4 flex-shrink-0';

  switch (extension) {
    // Documents
    case '.docx':
    case '.doc':
    case '.rtf':
    case '.odt':
      return <FileText className={cn(iconClass, 'text-blue-500')} />;

    // Presentations
    case '.pptx':
    case '.ppt':
    case '.odp':
      return <Presentation className={cn(iconClass, 'text-orange-500')} />;

    // Spreadsheets
    case '.xlsx':
    case '.xls':
    case '.csv':
    case '.ods':
      return <FileSpreadsheet className={cn(iconClass, 'text-green-500')} />;

    // PDFs
    case '.pdf':
      return <FileType className={cn(iconClass, 'text-red-500')} />;

    // Images
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.webp':
    case '.bmp':
    case '.ico':
      return <FileImage className={cn(iconClass, 'text-purple-500')} />;

    // Code and config
    case '.js':
    case '.ts':
    case '.jsx':
    case '.tsx':
    case '.json':
    case '.html':
    case '.css':
    case '.scss':
    case '.py':
    case '.java':
    case '.go':
    case '.rs':
    case '.c':
    case '.cpp':
    case '.h':
    case '.yaml':
    case '.yml':
    case '.xml':
    case '.sh':
    case '.bat':
    case '.ps1':
      return <FileCode className={cn(iconClass, 'text-yellow-500')} />;

    // Text files
    case '.txt':
    case '.md':
    case '.log':
      return <FileText className={cn(iconClass, 'text-gray-500')} />;

    // Default
    default:
      return <File className={cn(iconClass, 'text-gray-400')} />;
  }
}

/**
 * Formats file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * TreeNode component renders a single file or directory in the tree.
 *
 * Features:
 * - Expand/collapse directories with chevron icon
 * - File type icons based on extension
 * - Loading state for lazy-loaded directories
 * - Selection highlighting
 * - Keyboard navigation support
 */
export const TreeNode = memo(function TreeNode({
  node,
  selectedPath,
  onToggleExpand,
  onSelect,
}: TreeNodeProps): ReactElement {
  const { entry, children, isExpanded, isLoading, depth } = node;
  const isSelected = selectedPath === entry.path;
  const isDirectory = entry.isDirectory;

  /**
   * Handles click on the node.
   */
  const handleClick = useCallback((): void => {
    onSelect(entry.path);
    if (isDirectory) {
      onToggleExpand(entry.path);
    }
  }, [entry.path, isDirectory, onSelect, onToggleExpand]);

  /**
   * Handles keyboard interaction.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
      if (event.key === 'ArrowRight' && isDirectory && !isExpanded) {
        event.preventDefault();
        onToggleExpand(entry.path);
      }
      if (event.key === 'ArrowLeft' && isDirectory && isExpanded) {
        event.preventDefault();
        onToggleExpand(entry.path);
      }
    },
    [handleClick, isDirectory, isExpanded, entry.path, onToggleExpand]
  );

  /**
   * Handles toggle expand click (on chevron only).
   */
  const handleToggleClick = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation();
      if (isDirectory) {
        onToggleExpand(entry.path);
      }
    },
    [entry.path, isDirectory, onToggleExpand]
  );

  // Calculate indentation
  const indentStyle = { paddingLeft: `${depth * INDENT_WIDTH}px` };

  return (
    <div role="treeitem" aria-expanded={isDirectory ? isExpanded : undefined}>
      {/* Node row */}
      <div
        className={cn(
          'flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm',
          'hover:bg-accent/50 transition-colors',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          isSelected && 'bg-accent'
        )}
        style={indentStyle}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`${isDirectory ? 'Folder' : 'File'}: ${entry.name}`}
      >
        {/* Expand/collapse indicator */}
        <span
          className={cn(
            'w-4 h-4 flex items-center justify-center flex-shrink-0',
            !isDirectory && 'invisible'
          )}
          onClick={handleToggleClick}
          role={isDirectory ? 'button' : undefined}
          aria-label={isDirectory ? (isExpanded ? 'Collapse' : 'Expand') : undefined}
        >
          {isLoading ? (
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          ) : isDirectory ? (
            isExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )
          ) : null}
        </span>

        {/* Icon */}
        {isDirectory ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          )
        ) : (
          getFileIcon(entry.extension)
        )}

        {/* Name */}
        <span className="truncate flex-1 text-sm">{entry.name}</span>

        {/* File size (for files only) */}
        {!isDirectory && entry.size > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatFileSize(entry.size)}
          </span>
        )}
      </div>

      {/* Children (for expanded directories) */}
      {isDirectory && isExpanded && children.length > 0 && (
        <div role="group">
          {children.map((childNode) => (
            <TreeNode
              key={childNode.entry.path}
              node={childNode}
              selectedPath={selectedPath}
              onToggleExpand={onToggleExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}

      {/* Empty directory indicator */}
      {isDirectory && isExpanded && children.length === 0 && !isLoading && (
        <div
          className="text-xs text-muted-foreground italic py-1 px-2"
          style={{ paddingLeft: `${(depth + 1) * INDENT_WIDTH + 8}px` }}
        >
          Empty folder
        </div>
      )}
    </div>
  );
});
