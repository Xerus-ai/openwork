/**
 * Workspace configuration persistence.
 * Handles saving and loading workspace folder settings.
 */

import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { getConfig, setConfig, deleteConfig } from './app-config.js';

/**
 * Result of workspace validation.
 */
export interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Saved workspace data.
 */
export interface SavedWorkspace {
  path: string;
  savedAt: number;
}

/**
 * Get the saved workspace path.
 * Returns null if no workspace is saved.
 */
export function getSavedWorkspace(): SavedWorkspace | null {
  const path = getConfig('workspacePath');
  const savedAt = getConfig('workspaceSelectedAt');

  if (path && savedAt) {
    return { path, savedAt };
  }
  return null;
}

/**
 * Save the workspace path to persistent storage.
 */
export function saveWorkspace(workspacePath: string): void {
  setConfig('workspacePath', workspacePath);
  setConfig('workspaceSelectedAt', Date.now());
  console.log(`[WorkspaceConfig] Saved workspace: ${workspacePath}`);
}

/**
 * Clear the saved workspace.
 */
export function clearSavedWorkspace(): void {
  deleteConfig('workspacePath');
  deleteConfig('workspaceSelectedAt');
  console.log('[WorkspaceConfig] Cleared saved workspace');
}

/**
 * Validate that a workspace path exists and has proper permissions.
 */
export async function validateWorkspacePath(
  workspacePath: string
): Promise<WorkspaceValidationResult> {
  if (!workspacePath || workspacePath.trim() === '') {
    return {
      valid: false,
      error: 'Workspace path cannot be empty',
      errorCode: 'PATH_EMPTY',
    };
  }

  try {
    // Check if path exists and is a directory
    const stats = await fs.stat(workspacePath);
    if (!stats.isDirectory()) {
      return {
        valid: false,
        error: 'Selected path is not a directory',
        errorCode: 'NOT_A_DIRECTORY',
      };
    }

    // Check read permission
    try {
      await fs.access(workspacePath, fsConstants.R_OK);
    } catch {
      return {
        valid: false,
        error: 'No read permission on folder',
        errorCode: 'NO_READ_PERMISSION',
      };
    }

    // Check write permission
    try {
      await fs.access(workspacePath, fsConstants.W_OK);
    } catch {
      return {
        valid: false,
        error: 'No write permission on folder',
        errorCode: 'NO_WRITE_PERMISSION',
      };
    }

    return { valid: true };
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === 'ENOENT') {
      return {
        valid: false,
        error: 'Folder does not exist',
        errorCode: 'FOLDER_NOT_FOUND',
      };
    }
    return {
      valid: false,
      error: `Failed to validate folder: ${nodeError.message}`,
      errorCode: 'VALIDATION_ERROR',
    };
  }
}

/**
 * Load and validate the saved workspace on app launch.
 * Returns the workspace path if valid, null otherwise.
 * Clears the saved workspace if validation fails.
 */
export async function loadAndValidateSavedWorkspace(): Promise<string | null> {
  const saved = getSavedWorkspace();

  if (!saved) {
    console.log('[WorkspaceConfig] No saved workspace found');
    return null;
  }

  console.log(`[WorkspaceConfig] Loading saved workspace: ${saved.path}`);

  const result = await validateWorkspacePath(saved.path);

  if (result.valid) {
    console.log('[WorkspaceConfig] Saved workspace is valid');
    return saved.path;
  }

  // Workspace is invalid, clear it
  console.log(
    `[WorkspaceConfig] Saved workspace invalid: ${result.error}. Clearing.`
  );
  clearSavedWorkspace();
  return null;
}
