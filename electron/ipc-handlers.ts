/**
 * IPC message handlers for main process.
 * Registers all handlers for communication with renderer process.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IpcChannels, PongPayload } from './types.js';
import { WindowStateManager } from './window-manager.js';

/**
 * Register all IPC handlers.
 * Call this once during app initialization.
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
  registerSystemHandlers();
  registerWindowHandlers(getMainWindow);
  registerDevToolsHandlers(getMainWindow);
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
