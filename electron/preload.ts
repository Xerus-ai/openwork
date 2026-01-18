/**
 * Preload script for secure communication between main and renderer processes.
 * Uses contextBridge to expose a safe API to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import { IpcChannels, ElectronAPI, PongPayload, WindowState, WorkspaceValidationResult, FileListResult } from './types.js';

/**
 * Electron API exposed to renderer process via contextBridge.
 * This is the only way the renderer can communicate with the main process.
 */
const electronAPI: ElectronAPI = {
  // System - ping/pong test
  ping: async (message: string): Promise<PongPayload> => {
    return ipcRenderer.invoke(IpcChannels.PING, message);
  },

  // Window controls
  minimizeWindow: (): void => {
    ipcRenderer.send(IpcChannels.WINDOW_MINIMIZE);
  },

  maximizeWindow: (): void => {
    ipcRenderer.send(IpcChannels.WINDOW_MAXIMIZE);
  },

  closeWindow: (): void => {
    ipcRenderer.send(IpcChannels.WINDOW_CLOSE);
  },

  isWindowMaximized: async (): Promise<boolean> => {
    return ipcRenderer.invoke(IpcChannels.WINDOW_IS_MAXIMIZED);
  },

  // DevTools toggle
  toggleDevTools: (): void => {
    ipcRenderer.send(IpcChannels.DEVTOOLS_TOGGLE);
  },

  // Window state change listener
  onWindowStateChange: (callback: (state: WindowState) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, state: WindowState) => {
      callback(state);
    };
    ipcRenderer.on('window:state-changed', handler);

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('window:state-changed', handler);
    };
  },

  // Workspace operations
  selectWorkspaceFolder: async (): Promise<string | null> => {
    return ipcRenderer.invoke(IpcChannels.WORKSPACE_SELECT_FOLDER);
  },

  validateWorkspace: async (path: string): Promise<WorkspaceValidationResult> => {
    return ipcRenderer.invoke(IpcChannels.WORKSPACE_VALIDATE, path);
  },

  onWorkspaceChanged: (callback: (path: string | null) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, path: string | null) => {
      callback(path);
    };
    ipcRenderer.on(IpcChannels.WORKSPACE_CHANGED, handler);

    return () => {
      ipcRenderer.removeListener(IpcChannels.WORKSPACE_CHANGED, handler);
    };
  },

  // File operations
  listFiles: async (directoryPath: string): Promise<FileListResult> => {
    return ipcRenderer.invoke(IpcChannels.FILE_LIST, directoryPath);
  },

  // Platform info
  platform: process.platform,
  isDevelopment: process.env['NODE_ENV'] === 'development',
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Log that preload script has executed
console.log('[Preload] Electron API exposed to renderer');
