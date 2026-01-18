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
