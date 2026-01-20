/**
 * IPC message types for agent communication.
 * Defines all message structures for bidirectional agent-UI communication.
 */

// Local type definitions to avoid cross-project imports

/**
 * Status of a todo item.
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * Todo item for progress tracking.
 */
export interface TodoItem {
  id: string;
  content: string;
  status: TodoStatus;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
}

/**
 * Artifact created during task execution.
 */
export interface Artifact {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

/**
 * Event types emitted by the agent.
 */
export type AgentEventType =
  | 'message'
  | 'tool_use'
  | 'tool_result'
  | 'error'
  | 'todo_update'
  | 'artifact_created'
  | 'question'
  | 'complete';

/**
 * IPC channel names for agent communication.
 */
export const AgentChannels = {
  // Agent lifecycle
  AGENT_INIT: 'agent:init',
  AGENT_START: 'agent:start',
  AGENT_STOP: 'agent:stop',
  AGENT_STATUS: 'agent:status',

  // Message handling
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_MESSAGE_CHUNK: 'agent:message-chunk',
  AGENT_MESSAGE_COMPLETE: 'agent:message-complete',

  // Tool and event updates
  AGENT_TOOL_USE: 'agent:tool-use',
  AGENT_TOOL_RESULT: 'agent:tool-result',
  AGENT_EVENT: 'agent:event',

  // User interaction
  AGENT_QUESTION: 'agent:question',
  AGENT_ANSWER: 'agent:answer',

  // State updates
  AGENT_TODO_UPDATE: 'agent:todo-update',
  AGENT_ARTIFACT_CREATED: 'agent:artifact-created',
  AGENT_SKILL_LOADED: 'agent:skill-loaded',
  AGENT_STATUS_UPDATE: 'agent:status-update',

  // Error handling
  AGENT_ERROR: 'agent:error',
} as const;

export type AgentChannel = typeof AgentChannels[keyof typeof AgentChannels];

/**
 * Base structure for all IPC messages.
 */
export interface IpcBaseMessage {
  /** Unique message identifier for correlation */
  id: string;
  /** Timestamp when message was created */
  timestamp: number;
}

/**
 * Agent initialization request.
 */
export interface AgentInitRequest extends IpcBaseMessage {
  /** Workspace path for agent operations */
  workspacePath: string;
  /** Model to use (claude-sonnet-4-20250514 or claude-opus-4-20250514) */
  model: string;
  /** Optional additional instructions */
  additionalInstructions?: string;
}

/**
 * Agent initialization response.
 */
export interface AgentInitResponse extends IpcBaseMessage {
  /** Whether initialization succeeded */
  success: boolean;
  /** Error message if initialization failed */
  error?: string;
  /** Warnings from initialization */
  warnings?: string[];
  /** Whether system prompt was loaded */
  systemPromptLoaded?: boolean;
}

/**
 * Agent status response.
 */
export interface AgentStatusResponse extends IpcBaseMessage {
  /** Whether agent is initialized */
  initialized: boolean;
  /** Whether agent is currently processing */
  isRunning: boolean;
  /** Current model */
  model?: string;
  /** Current workspace path */
  workspacePath?: string;
}

/**
 * User message sent to agent.
 */
export interface AgentSendMessageRequest extends IpcBaseMessage {
  /** The user's message text */
  content: string;
  /** Optional file attachments */
  attachments?: FileAttachment[];
}

/**
 * File attachment in a message.
 */
export interface FileAttachment {
  /** Original filename */
  name: string;
  /** Full file path */
  path: string;
  /** MIME type */
  mimeType: string;
  /** File size in bytes */
  size: number;
}

/**
 * Streaming message chunk from agent.
 */
export interface AgentMessageChunk extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Text chunk content */
  content: string;
  /** Whether this is the final chunk */
  isFinal: boolean;
}

/**
 * Complete message from agent.
 */
export interface AgentMessageComplete extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Full message content */
  content: string;
  /** Token usage for this message */
  usage?: TokenUsage;
}

/**
 * Token usage statistics.
 */
export interface TokenUsage {
  /** Input tokens used */
  inputTokens: number;
  /** Output tokens generated */
  outputTokens: number;
}

/**
 * Tool use notification.
 */
export interface AgentToolUse extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Tool name being used */
  toolName: string;
  /** Tool input parameters */
  toolInput: Record<string, unknown>;
  /** Tool use ID for result correlation */
  toolUseId: string;
}

/**
 * Tool result notification.
 */
export interface AgentToolResult extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Tool use ID this result corresponds to */
  toolUseId: string;
  /** Whether tool execution succeeded */
  success: boolean;
  /** Tool output content */
  output: string;
  /** Error message if tool failed */
  error?: string;
}

/**
 * Question from agent requiring user response.
 */
export interface AgentQuestion extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Question text */
  question: string;
  /** Available answer options */
  options: QuestionOption[];
  /** Whether multiple selections allowed */
  multiSelect: boolean;
  /** Question ID for answer correlation */
  questionId: string;
}

/**
 * Question option.
 */
export interface QuestionOption {
  /** Display label */
  label: string;
  /** Value returned when selected */
  value: string;
  /** Optional description */
  description?: string;
}

/**
 * User answer to agent question.
 */
export interface AgentAnswer extends IpcBaseMessage {
  /** Question ID this answers */
  questionId: string;
  /** Correlation ID linking to original request */
  requestId: string;
  /** Selected answer(s) */
  selectedValues: string[];
}

/**
 * Todo list update notification.
 */
export interface AgentTodoUpdate extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Current todo items */
  todos: TodoItem[];
}

/**
 * Artifact creation notification.
 */
export interface AgentArtifactCreated extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Created artifact details */
  artifact: Artifact;
}

/**
 * Skill loaded notification.
 */
export interface AgentSkillLoaded extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Skill name that was loaded */
  skillName: string;
  /** Skill content (truncated for display) */
  skillPreview?: string;
}

/**
 * Processing status types.
 */
export type ProcessingStatus =
  | 'sending'
  | 'processing'
  | 'thinking'
  | 'responding'
  | 'idle';

/**
 * Processing status update from agent.
 */
export interface AgentStatusUpdate extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Current processing status */
  status: ProcessingStatus;
  /** Human-readable status message */
  message: string;
}

/**
 * Generic agent event notification.
 */
export interface AgentEvent extends IpcBaseMessage {
  /** Correlation ID linking to original request */
  requestId: string;
  /** Event type */
  eventType: AgentEventType;
  /** Event data */
  data: unknown;
}

/**
 * Error notification from agent.
 */
export interface AgentError extends IpcBaseMessage {
  /** Correlation ID linking to original request (if applicable) */
  requestId?: string;
  /** Error code for categorization */
  code: AgentErrorCode;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: unknown;
  /** Whether the error is recoverable */
  recoverable: boolean;
}

/**
 * Agent error codes.
 */
export type AgentErrorCode =
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
 * Message queue item for reliable delivery.
 */
export interface QueuedMessage {
  /** Message to be sent */
  message: IpcBaseMessage;
  /** Channel to send on */
  channel: AgentChannel;
  /** Number of delivery attempts */
  attempts: number;
  /** Maximum retry attempts */
  maxAttempts: number;
  /** Timeout in milliseconds */
  timeout: number;
  /** Callback for success */
  onSuccess?: () => void;
  /** Callback for failure */
  onFailure?: (error: Error) => void;
}

/**
 * Generate a unique message ID.
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a base message structure.
 */
export function createBaseMessage(): IpcBaseMessage {
  return {
    id: generateMessageId(),
    timestamp: Date.now(),
  };
}

/**
 * Type guard for checking if a message is an error.
 */
export function isAgentError(message: unknown): message is AgentError {
  return (
    typeof message === 'object' &&
    message !== null &&
    'code' in message &&
    'message' in message &&
    'recoverable' in message
  );
}

/**
 * Electron Agent API interface exposed to renderer via contextBridge.
 */
export interface ElectronAgentAPI {
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
  onStatusUpdate: (callback: (status: AgentStatusUpdate) => void) => () => void;
  onError: (callback: (error: AgentError) => void) => () => void;
}

// Augment Window interface for TypeScript
declare global {
  interface Window {
    electronAgentAPI?: ElectronAgentAPI;
  }
}
