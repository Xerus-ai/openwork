/**
 * IPC message types for communication between main and renderer processes.
 * Uses contextBridge for secure communication.
 */

// IPC Channel names - centralized for consistency
export const IpcChannels = {
  // System channels
  PING: 'ipc:ping',
  PONG: 'ipc:pong',

  // App lifecycle
  APP_READY: 'app:ready',
  APP_QUIT: 'app:quit',

  // Window management
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  WINDOW_IS_MAXIMIZED: 'window:is-maximized',

  // DevTools
  DEVTOOLS_TOGGLE: 'devtools:toggle',

  // Agent communication (for future use)
  AGENT_MESSAGE: 'agent:message',
  AGENT_RESPONSE: 'agent:response',
  AGENT_ERROR: 'agent:error',
  AGENT_STREAM: 'agent:stream',

  // Workspace operations
  WORKSPACE_SELECT_FOLDER: 'workspace:select-folder',
  WORKSPACE_VALIDATE: 'workspace:validate',
  WORKSPACE_CHANGED: 'workspace:changed',
  WORKSPACE_GET_SAVED: 'workspace:get-saved',
  WORKSPACE_SAVE: 'workspace:save',
  WORKSPACE_CLEAR: 'workspace:clear',

  // File operations
  FILE_READ: 'file:read',
  FILE_WRITE: 'file:write',
  FILE_LIST: 'file:list',
  FILE_DOWNLOAD: 'file:download',
  FILE_DOWNLOAD_ALL: 'file:download-all',
} as const;

export type IpcChannel = typeof IpcChannels[keyof typeof IpcChannels];

// Base message structure for IPC communication
export interface IpcMessage<T = unknown> {
  channel: IpcChannel;
  payload: T;
  timestamp: number;
  id: string;
}

// Ping/pong test messages
export interface PingPayload {
  message: string;
}

export interface PongPayload {
  message: string;
  receivedAt: number;
}

// Window state
export interface WindowState {
  isMaximized: boolean;
  isMinimized: boolean;
  isFullScreen: boolean;
}

// Error response structure
export interface IpcError {
  code: string;
  message: string;
  details?: unknown;
}

// Result type for IPC operations
export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: IpcError };

// Workspace validation result
export interface WorkspaceValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

// Saved workspace data
export interface SavedWorkspaceData {
  path: string;
  savedAt: number;
}

// File entry for directory listing
export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  extension: string;
}

// File listing result
export interface FileListResult {
  success: boolean;
  entries: FileEntry[];
  error?: string;
}

// Download request for a single artifact
export interface DownloadRequest {
  sourcePath: string;
  suggestedName: string;
}

// Download result
export interface DownloadResult {
  success: boolean;
  savedPath?: string;
  error?: string;
  cancelled?: boolean;
}

// Download all request
export interface DownloadAllRequest {
  artifacts: DownloadRequest[];
}

// Download all result
export interface DownloadAllResult {
  success: boolean;
  savedDirectory?: string;
  savedCount: number;
  failedCount: number;
  errors?: string[];
  cancelled?: boolean;
}

// API exposed to renderer via contextBridge
export interface ElectronAPI {
  // System
  ping: (message: string) => Promise<PongPayload>;

  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isWindowMaximized: () => Promise<boolean>;

  // DevTools
  toggleDevTools: () => void;

  // Listeners for events from main process
  onWindowStateChange: (callback: (state: WindowState) => void) => () => void;

  // Workspace operations
  selectWorkspaceFolder: () => Promise<string | null>;
  validateWorkspace: (path: string) => Promise<WorkspaceValidationResult>;
  onWorkspaceChanged: (callback: (path: string | null) => void) => () => void;
  getSavedWorkspace: () => Promise<SavedWorkspaceData | null>;
  saveWorkspace: (path: string) => Promise<void>;
  clearWorkspace: () => Promise<void>;

  // File operations
  listFiles: (directoryPath: string) => Promise<FileListResult>;
  downloadArtifact: (request: DownloadRequest) => Promise<DownloadResult>;
  downloadAllArtifacts: (request: DownloadAllRequest) => Promise<DownloadAllResult>;

  // Platform info
  platform: NodeJS.Platform;
  isDevelopment: boolean;
}

// Augment the Window interface for TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
