/**
 * IPC message handlers for main process.
 * Registers all handlers for communication with renderer process.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import path from 'path';
import { IpcChannels, PongPayload, WorkspaceValidationResult, FileListResult, FileEntry } from './types.js';
import { WindowStateManager } from './window-manager.js';

/**
 * Register all IPC handlers.
 * Call this once during app initialization.
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerSystemHandlers();
  registerWindowHandlers(getMainWindow);
  registerDevToolsHandlers(getMainWindow);
  registerWorkspaceHandlers(getMainWindow);
  registerFileHandlers();
}

/**
 * Register system-level handlers (ping/pong, etc.).
 */
function registerSystemHandlers(): void {
  // Ping/pong handler for testing IPC connection
  ipcMain.handle(IpcChannels.PING, (_event, message: string): PongPayload => {
    console.log(`[IPC] Received ping: ${message}`);
    return {
      message: `pong: ${message}`,
      receivedAt: Date.now(),
    };
  });
}

/**
 * Register window control handlers.
 */
function registerWindowHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Minimize window
  ipcMain.on(IpcChannels.WINDOW_MINIMIZE, () => {
    const window = getMainWindow();
    if (window) {
      WindowStateManager.minimize(window);
    }
  });

  // Maximize/unmaximize window
  ipcMain.on(IpcChannels.WINDOW_MAXIMIZE, () => {
    const window = getMainWindow();
    if (window) {
      WindowStateManager.maximize(window);
    }
  });

  // Close window
  ipcMain.on(IpcChannels.WINDOW_CLOSE, () => {
    const window = getMainWindow();
    if (window) {
      WindowStateManager.close(window);
    }
  });

  // Check if window is maximized
  ipcMain.handle(IpcChannels.WINDOW_IS_MAXIMIZED, (): boolean => {
    const window = getMainWindow();
    if (window) {
      return WindowStateManager.isMaximized(window);
    }
    return false;
  });
}

/**
 * Register DevTools handlers (development only).
 */
function registerDevToolsHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.on(IpcChannels.DEVTOOLS_TOGGLE, () => {
    const window = getMainWindow();
    if (window) {
      if (window.webContents.isDevToolsOpened()) {
        window.webContents.closeDevTools();
      } else {
        window.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });
}

/**
 * Register workspace handlers for folder selection and validation.
 */
function registerWorkspaceHandlers(getMainWindow: () => BrowserWindow | null): void {
  // Open folder picker dialog and return selected path
  ipcMain.handle(
    IpcChannels.WORKSPACE_SELECT_FOLDER,
    async (): Promise<string | null> => {
      const window = getMainWindow();
      if (!window) {
        console.error('[IPC] No main window available for folder dialog');
        return null;
      }

      const result = await dialog.showOpenDialog(window, {
        title: 'Select Workspace Folder',
        properties: ['openDirectory', 'createDirectory'],
        buttonLabel: 'Select Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        console.log('[IPC] Folder selection canceled');
        return null;
      }

      const selectedPath = result.filePaths[0] ?? null;
      if (selectedPath) {
        console.log(`[IPC] Folder selected: ${selectedPath}`);
      }
      return selectedPath;
    }
  );

  // Validate workspace folder permissions
  ipcMain.handle(
    IpcChannels.WORKSPACE_VALIDATE,
    async (_event, folderPath: string): Promise<WorkspaceValidationResult> => {
      console.log(`[IPC] Validating workspace: ${folderPath}`);

      if (!folderPath || folderPath.trim() === '') {
        return {
          valid: false,
          error: 'Workspace path cannot be empty',
          errorCode: 'PATH_EMPTY',
        };
      }

      try {
        // Check if path exists and is a directory
        const stats = await fs.stat(folderPath);
        if (!stats.isDirectory()) {
          return {
            valid: false,
            error: 'Selected path is not a directory',
            errorCode: 'NOT_A_DIRECTORY',
          };
        }

        // Check read permission
        try {
          await fs.access(folderPath, fsConstants.R_OK);
        } catch {
          return {
            valid: false,
            error: 'No read permission on folder',
            errorCode: 'NO_READ_PERMISSION',
          };
        }

        // Check write permission
        try {
          await fs.access(folderPath, fsConstants.W_OK);
        } catch {
          return {
            valid: false,
            error: 'No write permission on folder',
            errorCode: 'NO_WRITE_PERMISSION',
          };
        }

        console.log(`[IPC] Workspace validation successful: ${folderPath}`);
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
  );
}

/**
 * Register file operation handlers.
 */
function registerFileHandlers(): void {
  // List files in a directory
  ipcMain.handle(
    IpcChannels.FILE_LIST,
    async (_event, directoryPath: string): Promise<FileListResult> => {
      if (!directoryPath || directoryPath.trim() === '') {
        return {
          success: false,
          entries: [],
          error: 'Directory path cannot be empty',
        };
      }

      try {
        const dirEntries = await fs.readdir(directoryPath, { withFileTypes: true });
        const entries: FileEntry[] = [];

        for (const dirent of dirEntries) {
          // Skip hidden files and common ignored directories
          if (dirent.name.startsWith('.') ||
              dirent.name === 'node_modules' ||
              dirent.name === '__pycache__') {
            continue;
          }

          const fullPath = path.join(directoryPath, dirent.name);
          try {
            const stats = await fs.stat(fullPath);
            const extension = dirent.isDirectory() ? '' : path.extname(dirent.name).toLowerCase();

            entries.push({
              name: dirent.name,
              path: fullPath,
              isDirectory: dirent.isDirectory(),
              size: stats.size,
              modifiedAt: stats.mtimeMs,
              extension,
            });
          } catch {
            // Skip files we cannot stat (permission issues, etc.)
            continue;
          }
        }

        // Sort: directories first, then by name
        entries.sort((a, b) => {
          if (a.isDirectory && !b.isDirectory) return -1;
          if (!a.isDirectory && b.isDirectory) return 1;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        });

        return {
          success: true,
          entries,
        };
      } catch (error) {
        const nodeError = error as NodeJS.ErrnoException;
        return {
          success: false,
          entries: [],
          error: nodeError.message || 'Failed to read directory',
        };
      }
    }
  );
}

/**
 * Remove all IPC handlers.
 * Call this during app cleanup.
 */
export function removeIpcHandlers(): void {
  const channels = [
    IpcChannels.PING,
    IpcChannels.WINDOW_MINIMIZE,
    IpcChannels.WINDOW_MAXIMIZE,
    IpcChannels.WINDOW_CLOSE,
    IpcChannels.WINDOW_IS_MAXIMIZED,
    IpcChannels.DEVTOOLS_TOGGLE,
    IpcChannels.WORKSPACE_SELECT_FOLDER,
    IpcChannels.WORKSPACE_VALIDATE,
    IpcChannels.FILE_LIST,
  ];

  channels.forEach((channel) => {
    ipcMain.removeHandler(channel);
    ipcMain.removeAllListeners(channel);
  });
}

/**
 * Send window state change to renderer.
 */
export function notifyWindowStateChange(
  window: BrowserWindow,
  state: { isMaximized: boolean; isMinimized: boolean; isFullScreen: boolean }
): void {
  window.webContents.send('window:state-changed', state);
}

/**
 * Set up window state change listeners.
 */
export function setupWindowStateListeners(window: BrowserWindow): void {
  const sendState = () => {
    notifyWindowStateChange(window, {
      isMaximized: window.isMaximized(),
      isMinimized: window.isMinimized(),
      isFullScreen: window.isFullScreen(),
    });
  };

  window.on('maximize', sendState);
  window.on('unmaximize', sendState);
  window.on('minimize', sendState);
  window.on('restore', sendState);
  window.on('enter-full-screen', sendState);
  window.on('leave-full-screen', sendState);
}
