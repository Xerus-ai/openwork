/**
 * IPC module exports.
 * Provides agent communication functionality for Electron main process.
 */

// Message types and interfaces
export * from './message-types.js';

// Agent bridge for main process
export {
  AgentBridge,
  AgentBridgeConfig,
  getAgentBridge,
  registerAgentBridge,
  removeAgentBridge,
} from './agent-bridge.js';

// Chat handler service for processing messages
export {
  ChatHandlerService,
  ChatHandlerConfig,
  getChatHandlerService,
  initializeChatHandlerService,
  cleanupChatHandlerService,
} from './chat-handlers.js';

// TodoList handlers for progress tracking
export {
  createTodoListBroadcaster,
  setCurrentRequestId,
  getCurrentRequestId,
  getTodoListBroadcaster,
  initializeTodoListHandlers,
  cleanupTodoListHandlers,
} from './todolist-handlers.js';

// Artifact handlers for file creation tracking
export {
  createArtifactBroadcaster,
  setArtifactRequestId,
  getArtifactRequestId,
  getArtifactBroadcaster,
  initializeArtifactHandlers,
  cleanupArtifactHandlers,
} from './artifact-handlers.js';

// Execution handlers for tool event broadcasting
export {
  setExecutionRequestId,
  getExecutionRequestId,
  broadcastToolUse,
  broadcastToolResult,
  getToolCategory,
  formatToolInputForDisplay,
  formatToolOutputForDisplay,
  initializeExecutionHandlers,
  cleanupExecutionHandlers,
  TOOL_CATEGORIES,
} from './execution-handlers.js';
