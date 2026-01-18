/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment.
 * Provides typing for import.meta.env and other Vite-specific features.
 */

interface ImportMetaEnv {
  readonly VITE_DEV_SERVER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * Workspace validation result from Electron IPC.
 */
interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Window state from Electron IPC.
 */
interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
}

/**
 * Pong payload from ping/pong test.
 */
interface PongPayload {
  message: string;
  receivedAt: number;
}

/**
 * File entry from directory listing.
 */
interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  extension: string;
}

/**
 * File listing result from Electron IPC.
 */
interface FileListResult {
  success: boolean;
  entries: FileEntry[];
  error?: string;
}

/**
 * Electron API exposed via contextBridge in preload script.
 */
interface ElectronAPI {
  // System
  ping: (message: string) => Promise<PongPayload>;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isWindowMaximized: () => Promise<boolean>;

  // DevTools
  toggleDevTools: () => void;

  // Listeners
  onWindowStateChange: (callback: (state: WindowState) => void) => () => void;

  // Workspace operations
  selectWorkspaceFolder: () => Promise<string | null>;
  validateWorkspace: (path: string) => Promise<WorkspaceValidationResult>;
  onWorkspaceChanged: (callback: (path: string | null) => void) => () => void;

  // File operations
  listFiles: (directoryPath: string) => Promise<FileListResult>;

  // Platform info
  platform: NodeJS.Platform;
  isDevelopment: boolean;
}

/**
 * Extend the global Window interface for Electron API.
 */
interface Window {
  electronAPI: ElectronAPI;
}
