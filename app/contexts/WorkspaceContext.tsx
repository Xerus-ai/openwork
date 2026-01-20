/**
 * WorkspaceContext provides shared workspace state across all components.
 * This ensures that when a workspace is selected, all components see the same state.
 */

import { createContext, useContext, useCallback, useEffect, useState, type ReactNode, type ReactElement } from 'react';

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
 * File or folder entry in workspace.
 */
export interface WorkspaceEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  extension: string;
}

/**
 * Workspace context state.
 */
export interface WorkspaceContextState {
  workspacePath: string | null;
  workspaceContents: WorkspaceEntry[];
  isValidating: boolean;
  validationResult: WorkspaceValidationResult | null;
  isPickerOpen: boolean;
  isLoading: boolean;
  isLoadingContents: boolean;
}

/**
 * Workspace context actions.
 */
export interface WorkspaceContextActions {
  openFolderPicker: () => Promise<void>;
  setWorkspacePath: (path: string) => Promise<void>;
  clearWorkspace: () => void;
  revalidate: () => Promise<void>;
}

/**
 * Combined workspace context type.
 */
export type WorkspaceContextType = WorkspaceContextState & WorkspaceContextActions;

/**
 * Default context value (throws if used outside provider).
 */
const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

/**
 * Checks if the Electron API is available.
 */
function isElectronAvailable(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window;
}

/**
 * Props for WorkspaceProvider.
 */
interface WorkspaceProviderProps {
  children: ReactNode;
}

/**
 * WorkspaceProvider component that manages workspace state.
 * Wrap your app with this provider to share workspace state across all components.
 */
export function WorkspaceProvider({ children }: WorkspaceProviderProps): ReactElement {
  const [workspacePath, setWorkspacePathState] = useState<string | null>(null);
  const [workspaceContents, setWorkspaceContents] = useState<WorkspaceEntry[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<WorkspaceValidationResult | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingContents, setIsLoadingContents] = useState(false);

  /**
   * Maximum number of entries to show in workspace preview.
   */
  const MAX_PREVIEW_ENTRIES = 8;

  /**
   * Fetches workspace contents (files and folders).
   */
  const fetchWorkspaceContents = useCallback(async (path: string): Promise<void> => {
    if (!isElectronAvailable()) {
      // Mock data for browser testing
      setWorkspaceContents([
        { name: 'src', path: `${path}/src`, isDirectory: true, size: 0, extension: '' },
        { name: 'package.json', path: `${path}/package.json`, isDirectory: false, size: 1024, extension: 'json' },
        { name: 'README.md', path: `${path}/README.md`, isDirectory: false, size: 2048, extension: 'md' },
      ]);
      return;
    }

    setIsLoadingContents(true);
    try {
      const result = await window.electronAPI!.listFiles(path);
      if (result.success && result.entries) {
        // Sort: directories first, then files, alphabetically
        const sorted = [...result.entries].sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) {
            return a.isDirectory ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        // Limit to preview count
        const preview = sorted.slice(0, MAX_PREVIEW_ENTRIES);
        setWorkspaceContents(preview.map((entry) => ({
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory,
          size: entry.size,
          extension: entry.extension,
        })));
      } else {
        setWorkspaceContents([]);
      }
    } catch (error) {
      console.error('[WorkspaceContext] Failed to fetch workspace contents:', error);
      setWorkspaceContents([]);
    } finally {
      setIsLoadingContents(false);
    }
  }, []);

  /**
   * Validates a workspace path.
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
      // In browser context, skip actual validation
      return { valid: true };
    }

    try {
      const result = await window.electronAPI!.validateWorkspace(path);
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
   * Saves workspace to storage.
   */
  const saveWorkspaceToStorage = useCallback(async (path: string): Promise<void> => {
    if (!isElectronAvailable()) {
      return;
    }

    try {
      await window.electronAPI!.saveWorkspace(path);
    } catch (error) {
      console.error('[WorkspaceContext] Failed to save workspace:', error);
    }
  }, []);

  /**
   * Clears workspace from storage.
   */
  const clearWorkspaceFromStorage = useCallback(async (): Promise<void> => {
    if (!isElectronAvailable()) {
      return;
    }

    try {
      await window.electronAPI!.clearWorkspace();
    } catch (error) {
      console.error('[WorkspaceContext] Failed to clear workspace:', error);
    }
  }, []);

  /**
   * Sets and validates workspace path.
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
        // Fetch folder contents after setting workspace
        await fetchWorkspaceContents(path);
        console.log('[WorkspaceContext] Workspace set:', path);
      }
    } finally {
      setIsValidating(false);
    }
  }, [validateWorkspace, saveWorkspaceToStorage, fetchWorkspaceContents]);

  /**
   * Opens folder picker dialog.
   */
  const openFolderPicker = useCallback(async (): Promise<void> => {
    if (isPickerOpen) {
      return;
    }

    if (!isElectronAvailable()) {
      console.warn('[WorkspaceContext] Electron not available, using mock folder picker');
      const mockPath = 'C:\\Users\\Demo\\Documents\\Workspace';
      await setWorkspacePath(mockPath);
      return;
    }

    setIsPickerOpen(true);

    try {
      const selectedPath = await window.electronAPI!.selectWorkspaceFolder();

      if (selectedPath) {
        await setWorkspacePath(selectedPath);
      }
    } finally {
      setIsPickerOpen(false);
    }
  }, [isPickerOpen, setWorkspacePath]);

  /**
   * Clears workspace selection.
   */
  const clearWorkspace = useCallback((): void => {
    setWorkspacePathState(null);
    setWorkspaceContents([]);
    setValidationResult(null);
    clearWorkspaceFromStorage();
    console.log('[WorkspaceContext] Workspace cleared');
  }, [clearWorkspaceFromStorage]);

  /**
   * Re-validates current workspace.
   */
  const revalidate = useCallback(async (): Promise<void> => {
    if (workspacePath) {
      setIsValidating(true);
      try {
        const result = await validateWorkspace(workspacePath);
        setValidationResult(result);

        if (!result.valid) {
          setWorkspacePathState(null);
          await clearWorkspaceFromStorage();
        }
      } finally {
        setIsValidating(false);
      }
    }
  }, [workspacePath, validateWorkspace, clearWorkspaceFromStorage]);

  // Load saved workspace on mount
  useEffect(() => {
    const loadSavedWorkspace = async (): Promise<void> => {
      if (!isElectronAvailable()) {
        setIsLoading(false);
        return;
      }

      try {
        const saved = await window.electronAPI!.getSavedWorkspace();

        if (saved && saved.path) {
          const result = await validateWorkspace(saved.path);
          setValidationResult(result);

          if (result.valid) {
            setWorkspacePathState(saved.path);
            // Fetch folder contents for saved workspace
            await fetchWorkspaceContents(saved.path);
            console.log('[WorkspaceContext] Loaded saved workspace:', saved.path);
          } else {
            console.log('[WorkspaceContext] Saved workspace invalid:', result.error);
            await clearWorkspaceFromStorage();
          }
        }
      } catch (error) {
        console.error('[WorkspaceContext] Failed to load saved workspace:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedWorkspace();
  }, [validateWorkspace, clearWorkspaceFromStorage, fetchWorkspaceContents]);

  const value: WorkspaceContextType = {
    // State
    workspacePath,
    workspaceContents,
    isValidating,
    validationResult,
    isPickerOpen,
    isLoading,
    isLoadingContents,
    // Actions
    openFolderPicker,
    setWorkspacePath,
    clearWorkspace,
    revalidate,
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Hook to access workspace context.
 * Must be used within a WorkspaceProvider.
 */
export function useWorkspaceContext(): WorkspaceContextType {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspaceContext must be used within a WorkspaceProvider');
  }

  return context;
}

/**
 * Formats a workspace path for display.
 */
export function formatWorkspacePath(path: string, maxLength = 40): string {
  if (!path) {
    return '';
  }

  if (path.length <= maxLength) {
    return path;
  }

  const separator = path.includes('/') ? '/' : '\\';
  const parts = path.split(separator);

  if (parts.length <= 2) {
    const startLen = Math.floor((maxLength - 3) / 2);
    const endLen = maxLength - 3 - startLen;
    return path.slice(0, startLen) + '...' + path.slice(-endLen);
  }

  const first = parts[0] + separator;
  const last = parts.slice(-2).join(separator);

  if (first.length + last.length + 3 <= maxLength) {
    return first + '...' + separator + last;
  }

  return path.slice(0, maxLength - 3) + '...';
}
