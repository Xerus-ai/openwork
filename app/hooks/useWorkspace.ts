import { useCallback, useEffect, useState } from 'react';

/**
 * Validation result for workspace path.
 */
export interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Saved workspace data from persistent storage.
 */
export interface SavedWorkspaceData {
  path: string;
  savedAt: number;
}

/**
 * Workspace state returned by the useWorkspace hook.
 */
export interface WorkspaceState {
  /** Currently selected workspace path, or null if none selected */
  workspacePath: string | null;
  /** Whether the workspace is currently being validated */
  isValidating: boolean;
  /** Validation result for the current workspace */
  validationResult: WorkspaceValidationResult | null;
  /** Whether a folder picker dialog is currently open */
  isPickerOpen: boolean;
  /** Whether the initial workspace is being loaded from storage */
  isLoading: boolean;
}

/**
 * Actions returned by the useWorkspace hook.
 */
export interface WorkspaceActions {
  /** Open the folder picker dialog to select a workspace */
  openFolderPicker: () => Promise<void>;
  /** Set the workspace path directly (for programmatic use) */
  setWorkspacePath: (path: string) => Promise<void>;
  /** Clear the current workspace */
  clearWorkspace: () => void;
  /** Re-validate the current workspace */
  revalidate: () => Promise<void>;
}

/**
 * Checks if the Electron API is available (running in Electron context).
 */
function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Hook for managing workspace folder selection and validation.
 *
 * Features:
 * - Opens native folder picker dialog via Electron
 * - Validates workspace permissions (read/write)
 * - Persists selection to Electron's app config (survives app restarts)
 * - Validates stored workspace on app launch
 * - Provides loading and error states
 *
 * @returns Workspace state and actions
 *
 * @example
 * const { workspacePath, isValidating, validationResult, openFolderPicker } = useWorkspace();
 *
 * // Open folder picker
 * await openFolderPicker();
 *
 * // Check validation
 * if (validationResult?.valid) {
 *   console.log('Workspace is ready:', workspacePath);
 * }
 */
export function useWorkspace(): WorkspaceState & WorkspaceActions {
  const [workspacePath, setWorkspacePathState] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<WorkspaceValidationResult | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Validates a workspace path by checking it exists and has proper permissions.
   */
  const validateWorkspace = useCallback(async (path: string): Promise<WorkspaceValidationResult> => {
    if (!path || !path.trim()) {
      return {
        valid: false,
        error: 'Workspace path cannot be empty',
        errorCode: 'PATH_EMPTY',
      };
    }

    if (!isElectronAvailable()) {
      // In browser context (dev mode), skip actual validation
      return { valid: true };
    }

    try {
      const result = await window.electronAPI.validateWorkspace(path);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Validation failed';
      return {
        valid: false,
        error: message,
        errorCode: 'VALIDATION_ERROR',
      };
    }
  }, []);

  /**
   * Saves the workspace path to persistent storage.
   */
  const saveWorkspaceToStorage = useCallback(async (path: string): Promise<void> => {
    if (!isElectronAvailable()) {
      // In browser context, skip saving (development mode)
      return;
    }

    try {
      await window.electronAPI.saveWorkspace(path);
    } catch (error) {
      console.error('[useWorkspace] Failed to save workspace:', error);
    }
  }, []);

  /**
   * Clears the workspace from persistent storage.
   */
  const clearWorkspaceFromStorage = useCallback(async (): Promise<void> => {
    if (!isElectronAvailable()) {
      // In browser context, skip clearing (development mode)
      return;
    }

    try {
      await window.electronAPI.clearWorkspace();
    } catch (error) {
      console.error('[useWorkspace] Failed to clear workspace:', error);
    }
  }, []);

  /**
   * Sets the workspace path and validates it.
   */
  const setWorkspacePath = useCallback(async (path: string): Promise<void> => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      const result = await validateWorkspace(path);
      setValidationResult(result);

      if (result.valid) {
        setWorkspacePathState(path);
        await saveWorkspaceToStorage(path);
      }
    } finally {
      setIsValidating(false);
    }
  }, [validateWorkspace, saveWorkspaceToStorage]);

  /**
   * Opens the native folder picker dialog.
   */
  const openFolderPicker = useCallback(async (): Promise<void> => {
    if (isPickerOpen) {
      return; // Prevent multiple dialogs
    }

    if (!isElectronAvailable()) {
      // In browser context, simulate folder selection for development
      console.warn('[useWorkspace] Electron not available, using mock folder picker');
      const mockPath = 'C:\\Users\\Demo\\Documents\\Workspace';
      await setWorkspacePath(mockPath);
      return;
    }

    setIsPickerOpen(true);

    try {
      const selectedPath = await window.electronAPI.selectWorkspaceFolder();

      if (selectedPath) {
        await setWorkspacePath(selectedPath);
      }
    } finally {
      setIsPickerOpen(false);
    }
  }, [isPickerOpen, setWorkspacePath]);

  /**
   * Clears the current workspace selection.
   */
  const clearWorkspace = useCallback((): void => {
    setWorkspacePathState(null);
    setValidationResult(null);
    clearWorkspaceFromStorage();
  }, [clearWorkspaceFromStorage]);

  /**
   * Re-validates the current workspace.
   */
  const revalidate = useCallback(async (): Promise<void> => {
    if (workspacePath) {
      setIsValidating(true);
      try {
        const result = await validateWorkspace(workspacePath);
        setValidationResult(result);

        // If validation fails, clear the workspace
        if (!result.valid) {
          setWorkspacePathState(null);
          await clearWorkspaceFromStorage();
        }
      } finally {
        setIsValidating(false);
      }
    }
  }, [workspacePath, validateWorkspace, clearWorkspaceFromStorage]);

  // Load saved workspace from persistent storage on mount
  useEffect(() => {
    const loadSavedWorkspace = async (): Promise<void> => {
      if (!isElectronAvailable()) {
        // In browser context, skip loading
        setIsLoading(false);
        return;
      }

      try {
        const saved = await window.electronAPI.getSavedWorkspace();

        if (saved && saved.path) {
          // Validate the saved path
          const result = await validateWorkspace(saved.path);
          setValidationResult(result);

          if (result.valid) {
            setWorkspacePathState(saved.path);
          } else {
            // Clear invalid workspace from storage
            console.log('[useWorkspace] Saved workspace invalid, clearing:', result.error);
            await clearWorkspaceFromStorage();
          }
        }
      } catch (error) {
        console.error('[useWorkspace] Failed to load saved workspace:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedWorkspace();
  }, [validateWorkspace, clearWorkspaceFromStorage]);

  return {
    // State
    workspacePath,
    isValidating,
    validationResult,
    isPickerOpen,
    isLoading,
    // Actions
    openFolderPicker,
    setWorkspacePath,
    clearWorkspace,
    revalidate,
  };
}

/**
 * Formats a workspace path for display.
 * Truncates long paths and adds ellipsis.
 *
 * @param path - The full workspace path
 * @param maxLength - Maximum display length (default: 40)
 * @returns Formatted path string
 */
export function formatWorkspacePath(path: string, maxLength = 40): string {
  if (!path) {
    return '';
  }

  if (path.length <= maxLength) {
    return path;
  }

  // Show the start and end of the path
  const separator = path.includes('/') ? '/' : '\\';
  const parts = path.split(separator);

  if (parts.length <= 2) {
    // Just truncate from the middle
    const startLen = Math.floor((maxLength - 3) / 2);
    const endLen = maxLength - 3 - startLen;
    return path.slice(0, startLen) + '...' + path.slice(-endLen);
  }

  // Show first and last parts with ellipsis
  const first = parts[0] + separator;
  const last = parts.slice(-2).join(separator);

  if (first.length + last.length + 3 <= maxLength) {
    return first + '...' + separator + last;
  }

  // Just truncate
  return path.slice(0, maxLength - 3) + '...';
}
