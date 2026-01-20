/**
 * Preload script for secure communication between main and renderer processes.
 * Uses contextBridge to expose a safe API to the renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';
import {
  IpcChannels,
  ElectronAPI,
  PongPayload,
  WindowState,
  WorkspaceValidationResult,
  FileListResult,
  DownloadRequest,
  DownloadResult,
  DownloadAllRequest,
  DownloadAllResult,
  SavedWorkspaceData,
  AppSettings,
} from './types.js';
import {
  AgentChannels,
  AgentInitRequest,
  AgentInitResponse,
  AgentStatusResponse,
  AgentSendMessageRequest,
  AgentMessageChunk,
  AgentMessageComplete,
  AgentToolUse,
  AgentToolResult,
  AgentQuestion,
  AgentAnswer,
  AgentTodoUpdate,
  AgentArtifactCreated,
  AgentSkillLoaded,
  AgentStatusUpdate,
  AgentError,
  ElectronAgentAPI,
} from './ipc/message-types.js';

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

  getSavedWorkspace: async (): Promise<SavedWorkspaceData | null> => {
    return ipcRenderer.invoke(IpcChannels.WORKSPACE_GET_SAVED);
  },

  saveWorkspace: async (path: string): Promise<void> => {
    return ipcRenderer.invoke(IpcChannels.WORKSPACE_SAVE, path);
  },

  clearWorkspace: async (): Promise<void> => {
    return ipcRenderer.invoke(IpcChannels.WORKSPACE_CLEAR);
  },

  // File operations
  listFiles: async (directoryPath: string): Promise<FileListResult> => {
    return ipcRenderer.invoke(IpcChannels.FILE_LIST, directoryPath);
  },

  downloadArtifact: async (request: DownloadRequest): Promise<DownloadResult> => {
    return ipcRenderer.invoke(IpcChannels.FILE_DOWNLOAD, request);
  },

  downloadAllArtifacts: async (request: DownloadAllRequest): Promise<DownloadAllResult> => {
    return ipcRenderer.invoke(IpcChannels.FILE_DOWNLOAD_ALL, request);
  },

  // Settings operations
  getSettings: async (): Promise<AppSettings> => {
    return ipcRenderer.invoke(IpcChannels.SETTINGS_GET);
  },

  getApiKey: async (): Promise<string | null> => {
    return ipcRenderer.invoke(IpcChannels.SETTINGS_GET_API_KEY);
  },

  setApiKey: async (key: string | null): Promise<void> => {
    return ipcRenderer.invoke(IpcChannels.SETTINGS_SET_API_KEY, key);
  },

  getUserName: async (): Promise<string> => {
    return ipcRenderer.invoke(IpcChannels.SETTINGS_GET_USER_NAME);
  },

  setUserName: async (name: string): Promise<void> => {
    return ipcRenderer.invoke(IpcChannels.SETTINGS_SET_USER_NAME, name);
  },

  // Platform info
  platform: process.platform,
  isDevelopment: process.env['NODE_ENV'] === 'development',
};

/**
 * Agent API exposed to renderer process via contextBridge.
 * Handles all agent-related communication.
 */
const electronAgentAPI: ElectronAgentAPI = {
  // Agent initialization
  initAgent: async (request: AgentInitRequest): Promise<AgentInitResponse> => {
    return ipcRenderer.invoke(AgentChannels.AGENT_INIT, request);
  },

  // Get agent status
  getStatus: async (): Promise<AgentStatusResponse> => {
    return ipcRenderer.invoke(AgentChannels.AGENT_STATUS);
  },

  // Send message to agent
  sendMessage: async (request: AgentSendMessageRequest): Promise<{ requestId: string }> => {
    return ipcRenderer.invoke(AgentChannels.AGENT_SEND_MESSAGE, request);
  },

  // Stop agent processing
  stopAgent: async (): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(AgentChannels.AGENT_STOP);
  },

  // Answer agent question
  answerQuestion: async (answer: AgentAnswer): Promise<{ success: boolean }> => {
    return ipcRenderer.invoke(AgentChannels.AGENT_ANSWER, answer);
  },

  // Message streaming events
  onMessageChunk: (callback: (chunk: AgentMessageChunk) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, chunk: AgentMessageChunk) => {
      callback(chunk);
    };
    ipcRenderer.on(AgentChannels.AGENT_MESSAGE_CHUNK, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_MESSAGE_CHUNK, handler);
    };
  },

  onMessageComplete: (callback: (message: AgentMessageComplete) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, message: AgentMessageComplete) => {
      callback(message);
    };
    ipcRenderer.on(AgentChannels.AGENT_MESSAGE_COMPLETE, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_MESSAGE_COMPLETE, handler);
    };
  },

  // Tool events
  onToolUse: (callback: (toolUse: AgentToolUse) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, toolUse: AgentToolUse) => {
      callback(toolUse);
    };
    ipcRenderer.on(AgentChannels.AGENT_TOOL_USE, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_TOOL_USE, handler);
    };
  },

  onToolResult: (callback: (result: AgentToolResult) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: AgentToolResult) => {
      callback(result);
    };
    ipcRenderer.on(AgentChannels.AGENT_TOOL_RESULT, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_TOOL_RESULT, handler);
    };
  },

  // Question event
  onQuestion: (callback: (question: AgentQuestion) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, question: AgentQuestion) => {
      callback(question);
    };
    ipcRenderer.on(AgentChannels.AGENT_QUESTION, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_QUESTION, handler);
    };
  },

  // State update events
  onTodoUpdate: (callback: (update: AgentTodoUpdate) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, update: AgentTodoUpdate) => {
      callback(update);
    };
    ipcRenderer.on(AgentChannels.AGENT_TODO_UPDATE, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_TODO_UPDATE, handler);
    };
  },

  onArtifactCreated: (callback: (artifact: AgentArtifactCreated) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, artifact: AgentArtifactCreated) => {
      callback(artifact);
    };
    ipcRenderer.on(AgentChannels.AGENT_ARTIFACT_CREATED, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_ARTIFACT_CREATED, handler);
    };
  },

  onSkillLoaded: (callback: (skill: AgentSkillLoaded) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, skill: AgentSkillLoaded) => {
      callback(skill);
    };
    ipcRenderer.on(AgentChannels.AGENT_SKILL_LOADED, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_SKILL_LOADED, handler);
    };
  },

  // Status update events
  onStatusUpdate: (callback: (status: AgentStatusUpdate) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: AgentStatusUpdate) => {
      callback(status);
    };
    ipcRenderer.on(AgentChannels.AGENT_STATUS_UPDATE, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_STATUS_UPDATE, handler);
    };
  },

  // Error events
  onError: (callback: (error: AgentError) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, error: AgentError) => {
      callback(error);
    };
    ipcRenderer.on(AgentChannels.AGENT_ERROR, handler);
    return () => {
      ipcRenderer.removeListener(AgentChannels.AGENT_ERROR, handler);
    };
  },
};

// Expose the APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('electronAgentAPI', electronAgentAPI);

// Log that preload script has executed
console.log('[Preload] Electron API exposed to renderer');
console.log('[Preload] Agent API exposed to renderer');
