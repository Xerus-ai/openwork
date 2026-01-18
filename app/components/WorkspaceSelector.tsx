import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { Folder, AlertCircle, Check, Loader2, X } from 'lucide-react';
import { useWorkspace, formatWorkspacePath } from '@/hooks/useWorkspace';

/**
 * Props for the WorkspaceSelector component.
 */
export interface WorkspaceSelectorProps {
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

/**
 * Workspace folder selector with browse dialog.
 *
 * Features:
 * - Opens native folder picker via Electron
 * - Validates folder permissions (read/write)
 * - Shows validation errors clearly
 * - Persists selection to localStorage
 * - Displays truncated path with tooltip
 */
export const WorkspaceSelector = memo(function WorkspaceSelector({
  className,
  disabled = false,
  compact = false,
}: WorkspaceSelectorProps): ReactElement {
  const {
    workspacePath,
    isValidating,
    validationResult,
    isPickerOpen,
    openFolderPicker,
    clearWorkspace,
  } = useWorkspace();

  /**
   * Handles browse button click.
   */
  const handleBrowse = useCallback(async (): Promise<void> => {
    if (disabled || isPickerOpen || isValidating) {
      return;
    }
    await openFolderPicker();
  }, [disabled, isPickerOpen, isValidating, openFolderPicker]);

  /**
   * Handles clear button click.
   */
  const handleClear = useCallback(
    (event: React.MouseEvent): void => {
      event.stopPropagation();
      clearWorkspace();
    },
    [clearWorkspace]
  );

  const isDisabled = disabled || isPickerOpen || isValidating;
  const hasError = validationResult && !validationResult.valid;
  const isValid = validationResult?.valid && workspacePath;

  // Compact mode: just show a button with icon and short path
  if (compact) {
    return (
      <Button
        variant={hasError ? 'destructive' : 'outline'}
        size="sm"
        onClick={handleBrowse}
        disabled={isDisabled}
        className={cn('gap-2', className)}
        title={workspacePath || 'Select workspace folder'}
        aria-label={workspacePath ? `Workspace: ${workspacePath}` : 'Select workspace folder'}
      >
        {isValidating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : hasError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Folder className="h-4 w-4" />
        )}
        <span className="max-w-[120px] truncate">
          {workspacePath ? formatWorkspacePath(workspacePath, 15) : 'Select folder'}
        </span>
      </Button>
    );
  }

  // Full mode: shows path display, status, and browse/clear buttons
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <WorkspacePathDisplay
          path={workspacePath}
          isValid={!!isValid}
          hasError={!!hasError}
          isValidating={isValidating}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={handleBrowse}
          disabled={isDisabled}
          className="shrink-0"
          aria-label="Browse for workspace folder"
        >
          {isValidating || isPickerOpen ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Folder className="h-4 w-4 mr-2" />
              Browse
            </>
          )}
        </Button>

        {workspacePath && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={isDisabled}
            className="shrink-0 h-8 w-8 p-0"
            aria-label="Clear workspace selection"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Validation error message */}
      {hasError && (
        <div
          className="flex items-center gap-2 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationResult.error}</span>
        </div>
      )}
    </div>
  );
});

/**
 * Props for the WorkspacePathDisplay component.
 */
interface WorkspacePathDisplayProps {
  path: string | null;
  isValid: boolean;
  hasError: boolean;
  isValidating: boolean;
}

/**
 * Displays the workspace path with status indicator.
 */
function WorkspacePathDisplay({
  path,
  isValid,
  hasError,
  isValidating,
}: WorkspacePathDisplayProps): ReactElement {
  const displayPath = path ? formatWorkspacePath(path, 40) : 'No workspace selected';

  return (
    <div
      className={cn(
        'flex-1 flex items-center gap-2 px-3 py-2 rounded-md border text-sm min-w-0',
        {
          'border-input bg-background': !hasError && !isValid,
          'border-green-500/50 bg-green-50/50 dark:bg-green-950/20': isValid,
          'border-destructive/50 bg-destructive/10': hasError,
        }
      )}
      title={path || undefined}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isValidating ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : isValid ? (
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
        ) : hasError ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      {/* Path text */}
      <span
        className={cn('truncate', {
          'text-muted-foreground': !path,
          'text-green-700 dark:text-green-300': isValid,
          'text-destructive': hasError,
        })}
      >
        {displayPath}
      </span>
    </div>
  );
}

/**
 * Minimal workspace indicator for use in headers.
 * Shows just an icon and abbreviated path.
 */
export const WorkspaceIndicator = memo(function WorkspaceIndicator({
  className,
}: {
  className?: string;
}): ReactElement {
  const { workspacePath, validationResult, openFolderPicker, isValidating } = useWorkspace();

  const hasError = validationResult && !validationResult.valid;
  const isValid = validationResult?.valid && workspacePath;

  const handleClick = useCallback(async (): Promise<void> => {
    await openFolderPicker();
  }, [openFolderPicker]);

  return (
    <button
      onClick={handleClick}
      disabled={isValidating}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors',
        'hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        {
          'text-muted-foreground': !workspacePath && !hasError,
          'text-green-600 dark:text-green-400': isValid,
          'text-destructive': hasError,
        },
        className
      )}
      title={workspacePath || 'Click to select workspace'}
      aria-label={workspacePath ? `Workspace: ${workspacePath}` : 'Select workspace'}
    >
      {isValidating ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isValid ? (
        <Check className="h-3 w-3" />
      ) : hasError ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Folder className="h-3 w-3" />
      )}
      <span className="max-w-[80px] truncate">
        {workspacePath ? formatWorkspacePath(workspacePath, 12) : 'Select'}
      </span>
    </button>
  );
});
