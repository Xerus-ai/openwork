/**
 * IPC types for frontend agent communication.
 * Mirrors the Electron IPC types for renderer process use.
 */

/**
 * IPC channel names for agent communication.
 */
export const AgentChannels = {
  AGENT_INIT: 'agent:init',
  AGENT_START: 'agent:start',
  AGENT_STOP: 'agent:stop',
  AGENT_STATUS: 'agent:status',
  AGENT_SEND_MESSAGE: 'agent:send-message',
  AGENT_MESSAGE_CHUNK: 'agent:message-chunk',
  AGENT_MESSAGE_COMPLETE: 'agent:message-complete',
  AGENT_TOOL_USE: 'agent:tool-use',
  AGENT_TOOL_RESULT: 'agent:tool-result',
  AGENT_EVENT: 'agent:event',
  AGENT_QUESTION: 'agent:question',
  AGENT_ANSWER: 'agent:answer',
  AGENT_TODO_UPDATE: 'agent:todo-update',
  AGENT_ARTIFACT_CREATED: 'agent:artifact-created',
  AGENT_SKILL_LOADED: 'agent:skill-loaded',
  AGENT_ERROR: 'agent:error',
} as const;

export type AgentChannel = typeof AgentChannels[keyof typeof AgentChannels];

/**
 * Base structure for all IPC messages.
 */
export interface IpcBaseMessage {
  id: string;
  timestamp: number;
}

/**
 * Agent initialization request.
 */
export interface AgentInitRequest extends IpcBaseMessage {
  workspacePath: string;
  model: string;
  additionalInstructions?: string;
}

/**
 * Agent initialization response.
 */
export interface AgentInitResponse extends IpcBaseMessage {
  success: boolean;
  error?: string;
  warnings?: string[];
  systemPromptLoaded?: boolean;
}

/**
 * Agent status response.
 */
export interface AgentStatusResponse extends IpcBaseMessage {
  initialized: boolean;
  isRunning: boolean;
  model?: string;
  workspacePath?: string;
}

/**
 * User message sent to agent.
 */
export interface AgentSendMessageRequest extends IpcBaseMessage {
  content: string;
  attachments?: FileAttachment[];
}

/**
 * File attachment in a message.
 */
export interface FileAttachment {
  name: string;
  path: string;
  mimeType: string;
  size: number;
}

/**
 * Streaming message chunk from agent.
 */
export interface AgentMessageChunk extends IpcBaseMessage {
  requestId: string;
  content: string;
  isFinal: boolean;
}

/**
 * Complete message from agent.
 */
export interface AgentMessageComplete extends IpcBaseMessage {
  requestId: string;
  content: string;
  usage?: TokenUsage;
}

/**
 * Token usage statistics.
 */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Tool use notification.
 */
export interface AgentToolUse extends IpcBaseMessage {
  requestId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolUseId: string;
}

/**
 * Tool result notification.
 */
export interface AgentToolResult extends IpcBaseMessage {
  requestId: string;
  toolUseId: string;
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Question from agent requiring user response.
 */
export interface AgentQuestion extends IpcBaseMessage {
  requestId: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  questionId: string;
}

/**
 * Question option.
 */
export interface QuestionOption {
  label: string;
  value: string;
  description?: string;
}

/**
 * User answer to agent question.
 */
export interface AgentAnswer extends IpcBaseMessage {
  questionId: string;
  requestId: string;
  selectedValues: string[];
}

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
 * Todo list update notification.
 */
export interface AgentTodoUpdate extends IpcBaseMessage {
  requestId: string;
  todos: TodoItem[];
}

/**
 * Artifact created by agent.
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
 * Artifact creation notification.
 */
export interface AgentArtifactCreated extends IpcBaseMessage {
  requestId: string;
  artifact: Artifact;
}

/**
 * Skill loaded notification.
 */
export interface AgentSkillLoaded extends IpcBaseMessage {
  requestId: string;
  skillName: string;
  skillPreview?: string;
}

/**
 * Agent event types.
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
 * Generic agent event notification.
 */
export interface AgentEvent extends IpcBaseMessage {
  requestId: string;
  eventType: AgentEventType;
  data: unknown;
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
 * Error notification from agent.
 */
export interface AgentError extends IpcBaseMessage {
  requestId?: string;
  code: AgentErrorCode;
  message: string;
  details?: unknown;
  recoverable: boolean;
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
