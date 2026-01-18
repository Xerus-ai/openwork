/**
 * IPC message handlers for main process.
 * Registers all handlers for communication with renderer process.
 */

import { ipcMain, BrowserWindow, dialog } from 'electron';
import fs from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { IpcChannels, PongPayload, WorkspaceValidationResult } from './types.js';
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
