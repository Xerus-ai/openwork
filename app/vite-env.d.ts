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
 * Download request for a single artifact.
 */
interface DownloadRequest {
  sourcePath: string;
  suggestedName: string;
}

/**
 * Download result from Electron IPC.
 */
interface DownloadResult {
  success: boolean;
  savedPath?: string;
  error?: string;
  cancelled?: boolean;
}

/**
 * Download all request for multiple artifacts.
 */
interface DownloadAllRequest {
  artifacts: DownloadRequest[];
}

/**
 * Download all result from Electron IPC.
 */
interface DownloadAllResult {
  success: boolean;
  savedDirectory?: string;
  savedCount: number;
  failedCount: number;
  errors?: string[];
  cancelled?: boolean;
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
  downloadArtifact: (request: DownloadRequest) => Promise<DownloadResult>;
  downloadAllArtifacts: (request: DownloadAllRequest) => Promise<DownloadAllResult>;

  // Platform info
  platform: NodeJS.Platform;
  isDevelopment: boolean;
}

/**
 * Status of a todo item.
 */
type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * Todo item from agent backend.
 */
interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
}

/**
 * Token usage statistics.
 */
interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * File attachment in a message.
 */
interface FileAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

/**
 * Base IPC message structure.
 */
interface IpcBaseMessage {
  id: string;
  timestamp: number;
}

/**
 * Agent initialization request.
 */
interface AgentInitRequest extends IpcBaseMessage {
  workspacePath: string;
  model: string;
  additionalInstructions?: string;
}

/**
 * Agent initialization response.
 */
interface AgentInitResponse extends IpcBaseMessage {
  success: boolean;
  error?: string;
  warnings?: string[];
  systemPromptLoaded?: boolean;
}

/**
 * Agent status response.
 */
interface AgentStatusResponse extends IpcBaseMessage {
  initialized: boolean;
  isRunning: boolean;
  model?: string;
  workspacePath?: string;
}

/**
 * User message to agent.
 */
interface AgentSendMessageRequest extends IpcBaseMessage {
  content: string;
  attachments?: FileAttachment[];
}

/**
 * Streaming message chunk from agent.
 */
interface AgentMessageChunk extends IpcBaseMessage {
  requestId: string;
  content: string;
  isFinal: boolean;
}

/**
 * Complete message from agent.
 */
interface AgentMessageComplete extends IpcBaseMessage {
  requestId: string;
  content: string;
  usage?: TokenUsage;
}

/**
 * Tool use notification.
 */
interface AgentToolUse extends IpcBaseMessage {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
}

/**
 * Tool result notification.
 */
interface AgentToolResult extends IpcBaseMessage {
  requestId: string;
  toolUseId: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Question option.
 */
interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

/**
 * Question from agent.
 */
interface AgentQuestion extends IpcBaseMessage {
  requestId: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  questionId: string;
}

/**
 * User answer to agent question.
 */
interface AgentAnswer extends IpcBaseMessage {
  questionId: string;
  requestId: string;
  selectedValues: string[];
}

/**
 * Todo update notification.
 */
interface AgentTodoUpdate extends IpcBaseMessage {
  requestId: string;
  todos: TodoItem[];
}

/**
 * Artifact for created files.
 */
interface Artifact {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

/**
 * Artifact created notification.
 */
interface AgentArtifactCreated extends IpcBaseMessage {
  requestId: string;
  artifact: Artifact;
}

/**
 * Skill loaded notification.
 */
interface AgentSkillLoaded extends IpcBaseMessage {
  requestId: string;
  skillName: string;
  skillPreview?: string;
}

/**
 * Agent error codes.
 */
type AgentErrorCode =
  | 'INITIALIZATION_FAILED'
  | 'API_KEY_MISSING'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'TOOL_EXECUTION_FAILED'
  | 'WORKSPACE_ERROR'
  | 'INVALID_MESSAGE'
  | 'AGENT_NOT_INITIALIZED'
  | 'AGENT_BUSY'
  | 'UNKNOWN';

/**
 * Error notification.
 */
interface AgentError extends IpcBaseMessage {
  requestId?: string;
  code: AgentErrorCode;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

/**
 * Electron Agent API exposed via contextBridge.
 */
interface ElectronAgentAPI {
  // Agent lifecycle
  initAgent: (request: AgentInitRequest) => Promise<AgentInitResponse>;
  getStatus: () => Promise<AgentStatusResponse>;
  sendMessage: (request: AgentSendMessageRequest) => Promise<{ requestId: string }>;
  stopAgent: () => Promise<{ success: boolean }>;
  answerQuestion: (answer: AgentAnswer) => Promise<{ success: boolean }>;

  // Event listeners (return cleanup functions)
  onMessageChunk: (callback: (chunk: AgentMessageChunk) => void) => () => void;
  onMessageComplete: (callback: (message: AgentMessageComplete) => void) => () => void;
  onToolUse: (callback: (toolUse: AgentToolUse) => void) => () => void;
  onToolResult: (callback: (result: AgentToolResult) => void) => () => void;
  onQuestion: (callback: (question: AgentQuestion) => void) => () => void;
  onTodoUpdate: (callback: (update: AgentTodoUpdate) => void) => () => void;
  onArtifactCreated: (callback: (artifact: AgentArtifactCreated) => void) => () => void;
  onSkillLoaded: (callback: (skill: AgentSkillLoaded) => void) => () => void;
  onError: (callback: (error: AgentError) => void) => () => void;
}

/**
 * Extend the global Window interface for Electron API.
 */
interface Window {
  electronAPI: ElectronAPI;
  electronAgentAPI?: ElectronAgentAPI;
}
