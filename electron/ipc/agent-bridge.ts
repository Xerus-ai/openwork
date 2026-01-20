/**
 * Agent Bridge for IPC Communication.
 * Handles bidirectional communication between the Electron main process
 * and the Claude Cowork agent.
 *
 * This is a pure IPC layer - the actual agent interaction will be handled
 * by a separate agent service that listens to bridge events.
 */

import { ipcMain, BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { EventEmitter } from 'events';
import {
  AgentChannels,
  AgentChannel,
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
  ProcessingStatus,
  AgentError,
  AgentErrorCode,
  TodoItem,
  Artifact,
  generateMessageId,
  createBaseMessage,
} from './message-types.js';

/**
 * Configuration for the agent bridge.
 */
export interface AgentBridgeConfig {
  /** Default timeout for requests in milliseconds */
  defaultTimeout: number;
  /** Maximum retry attempts for failed messages */
  maxRetries: number;
  /** Delay between retries in milliseconds */
  retryDelay: number;
  /** Maximum queue size for pending messages */
  maxQueueSize: number;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: AgentBridgeConfig = {
  defaultTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  maxQueueSize: 100,
};

/**
 * Agent state tracked by the bridge.
 */
interface AgentBridgeState {
  initialized: boolean;
  isRunning: boolean;
  model: string | undefined;
  workspacePath: string | undefined;
}

/**
 * Agent Bridge manages the IPC layer between Electron and the agent.
 * The bridge coordinates communication and state management.
 *
 * Events emitted:
 * - 'agent:init' - Agent initialization requested
 * - 'agent:message' - User message sent
 * - 'agent:stop' - Stop processing requested
 * - 'agent:answer' - User answered a question
 */
export class AgentBridge extends EventEmitter {
  private config: AgentBridgeConfig;
  private state: AgentBridgeState = {
    initialized: false,
    isRunning: false,
    model: undefined,
    workspacePath: undefined,
  };
  private mainWindow: BrowserWindow | null = null;
  private pendingQuestions: Map<string, (values: string[]) => void> = new Map();

  constructor(config: Partial<AgentBridgeConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the bridge and register IPC handlers.
   */
  initialize(getMainWindow: () => BrowserWindow | null): void {
    console.log('[AgentBridge] Initializing...');
    this.registerHandlers(getMainWindow);
    console.log('[AgentBridge] Initialized successfully');
  }

  /**
   * Register all IPC handlers for agent communication.
   */
  private registerHandlers(getMainWindow: () => BrowserWindow | null): void {
    // Agent initialization
    ipcMain.handle(
      AgentChannels.AGENT_INIT,
      async (_event, request: AgentInitRequest): Promise<AgentInitResponse> => {
        return this.handleAgentInit(request, getMainWindow);
      }
    );

    // Agent status
    ipcMain.handle(
      AgentChannels.AGENT_STATUS,
      async (): Promise<AgentStatusResponse> => {
        return this.handleAgentStatus();
      }
    );

    // Send message to agent
    ipcMain.handle(
      AgentChannels.AGENT_SEND_MESSAGE,
      async (_event, request: AgentSendMessageRequest): Promise<{ requestId: string }> => {
        return this.handleSendMessage(request);
      }
    );

    // Stop agent processing
    ipcMain.handle(
      AgentChannels.AGENT_STOP,
      async (): Promise<{ success: boolean }> => {
        return this.handleAgentStop();
      }
    );

    // Answer to question
    ipcMain.handle(
      AgentChannels.AGENT_ANSWER,
      async (_event, answer: AgentAnswer): Promise<{ success: boolean }> => {
        return this.handleAgentAnswer(answer);
      }
    );
  }

  /**
   * Handle agent initialization request.
   */
  private async handleAgentInit(
    request: AgentInitRequest,
    getMainWindow: () => BrowserWindow | null
  ): Promise<AgentInitResponse> {
    console.log('[AgentBridge] Initializing agent...', {
      workspacePath: request.workspacePath,
      model: request.model,
    });

    try {
      // Store main window reference
      this.mainWindow = getMainWindow();

      // Use provided workspace or default to app's artifacts folder
      let workspacePath = request.workspacePath;
      if (!workspacePath) {
        // Create a default artifacts folder in user data directory
        const defaultArtifactsPath = path.join(app.getPath('userData'), 'artifacts');
        if (!fs.existsSync(defaultArtifactsPath)) {
          fs.mkdirSync(defaultArtifactsPath, { recursive: true });
        }
        workspacePath = defaultArtifactsPath;
        console.log('[AgentBridge] No workspace provided, using default:', workspacePath);
      }

      // Update state
      this.state.workspacePath = workspacePath;
      this.state.model = request.model;

      // Emit init event for the agent service to handle
      this.emit('agent:init', {
        workspacePath,
        model: request.model,
        additionalInstructions: request.additionalInstructions,
      });

      // Mark as initialized
      this.state.initialized = true;

      console.log('[AgentBridge] Agent initialization requested');

      return {
        id: request.id,
        timestamp: Date.now(),
        success: true,
        systemPromptLoaded: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AgentBridge] Agent initialization failed:', errorMessage);

      return this.createErrorResponse(request.id, errorMessage);
    }
  }

  /**
   * Handle agent status request.
   */
  private handleAgentStatus(): AgentStatusResponse {
    return {
      id: generateMessageId(),
      timestamp: Date.now(),
      initialized: this.state.initialized,
      isRunning: this.state.isRunning,
      model: this.state.model,
      workspacePath: this.state.workspacePath,
    };
  }

  /**
   * Handle send message request.
   */
  private handleSendMessage(
    request: AgentSendMessageRequest
  ): { requestId: string } {
    console.log('[AgentBridge] Received message:', {
      contentLength: request.content.length,
      attachments: request.attachments?.length ?? 0,
      currentState: { isRunning: this.state.isRunning, initialized: this.state.initialized },
    });

    // Validate agent is initialized
    if (!this.state.initialized) {
      console.log('[AgentBridge] Rejecting: not initialized');
      this.sendError(request.id, 'AGENT_NOT_INITIALIZED', 'Agent has not been initialized');
      return { requestId: request.id };
    }

    // Check if agent is busy
    if (this.state.isRunning) {
      console.log('[AgentBridge] Rejecting: already running');
      this.sendError(request.id, 'AGENT_BUSY', 'Agent is currently processing another request');
      return { requestId: request.id };
    }

    // Mark as running
    console.log('[AgentBridge] Setting isRunning = true');
    this.state.isRunning = true;

    // Send initial status update to indicate processing has started
    this.sendStatusUpdate(request.id, 'processing', 'Processing your request...');

    // Emit message event for agent to handle
    this.emit('agent:message', {
      requestId: request.id,
      content: request.content,
      attachments: request.attachments,
    });

    return { requestId: request.id };
  }

  /**
   * Handle agent stop request.
   */
  private handleAgentStop(): { success: boolean } {
    console.log('[AgentBridge] Stopping agent...');

    // Emit stop event
    this.emit('agent:stop');

    // Clear state
    this.state.isRunning = false;
    this.pendingQuestions.clear();

    return { success: true };
  }

  /**
   * Handle answer to agent question.
   */
  private handleAgentAnswer(answer: AgentAnswer): { success: boolean } {
    console.log('[AgentBridge] Received answer:', {
      questionId: answer.questionId,
      selectedValues: answer.selectedValues,
    });

    const resolver = this.pendingQuestions.get(answer.questionId);
    if (resolver) {
      resolver(answer.selectedValues);
      this.pendingQuestions.delete(answer.questionId);

      // Emit answer event
      this.emit('agent:answer', {
        questionId: answer.questionId,
        requestId: answer.requestId,
        selectedValues: answer.selectedValues,
      });

      return { success: true };
    }

    console.warn('[AgentBridge] No pending question found for ID:', answer.questionId);
    return { success: false };
  }

  /**
   * Mark message processing as complete.
   * Should be called by the agent service when done processing.
   */
  markComplete(): void {
    console.log('[AgentBridge] markComplete() called, setting isRunning = false');
    this.state.isRunning = false;
  }

  /**
   * Set initialization status.
   * Called after actual agent initialization completes.
   */
  setInitialized(success: boolean): void {
    this.state.initialized = success;
  }

  /**
   * Send a streaming message chunk to the renderer.
   */
  sendMessageChunk(requestId: string, content: string, isFinal: boolean): void {
    const chunk: AgentMessageChunk = {
      ...createBaseMessage(),
      requestId,
      content,
      isFinal,
    };
    this.sendToRenderer(AgentChannels.AGENT_MESSAGE_CHUNK, chunk);
  }

  /**
   * Send a complete message to the renderer.
   */
  sendMessageComplete(
    requestId: string,
    content: string,
    usage?: { inputTokens: number; outputTokens: number }
  ): void {
    const complete: AgentMessageComplete = {
      ...createBaseMessage(),
      requestId,
      content,
      usage,
    };
    this.sendToRenderer(AgentChannels.AGENT_MESSAGE_COMPLETE, complete);
    // Send idle status to clear any status indicator
    this.sendStatusUpdate(requestId, 'idle', '');
    this.markComplete();
  }

  /**
   * Send a tool use notification to the renderer.
   */
  sendToolUse(
    requestId: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    toolUseId: string
  ): void {
    const toolUse: AgentToolUse = {
      ...createBaseMessage(),
      requestId,
      toolName,
      toolInput,
      toolUseId,
    };
    this.sendToRenderer(AgentChannels.AGENT_TOOL_USE, toolUse);
  }

  /**
   * Send a tool result notification to the renderer.
   */
  sendToolResult(
    requestId: string,
    toolUseId: string,
    success: boolean,
    output: string,
    error?: string
  ): void {
    const result: AgentToolResult = {
      ...createBaseMessage(),
      requestId,
      toolUseId,
      success,
      output,
      error,
    };
    this.sendToRenderer(AgentChannels.AGENT_TOOL_RESULT, result);
  }

  /**
   * Send a question to the user and wait for response.
   */
  async askQuestion(
    requestId: string,
    question: string,
    options: { label: string; value: string; description?: string }[],
    multiSelect: boolean = false
  ): Promise<string[]> {
    const questionId = generateMessageId();

    return new Promise((resolve) => {
      // Store resolver for later
      this.pendingQuestions.set(questionId, resolve);

      // Send question to renderer
      const questionMsg: AgentQuestion = {
        ...createBaseMessage(),
        requestId,
        question,
        options,
        multiSelect,
        questionId,
      };
      this.sendToRenderer(AgentChannels.AGENT_QUESTION, questionMsg);
    });
  }

  /**
   * Send a todo update notification to the renderer.
   */
  sendTodoUpdate(requestId: string, todos: TodoItem[]): void {
    const update: AgentTodoUpdate = {
      ...createBaseMessage(),
      requestId,
      todos,
    };
    this.sendToRenderer(AgentChannels.AGENT_TODO_UPDATE, update);
  }

  /**
   * Send an artifact created notification to the renderer.
   */
  sendArtifactCreated(requestId: string, artifact: Artifact): void {
    const notification: AgentArtifactCreated = {
      ...createBaseMessage(),
      requestId,
      artifact,
    };
    this.sendToRenderer(AgentChannels.AGENT_ARTIFACT_CREATED, notification);
  }

  /**
   * Send a skill loaded notification to the renderer.
   */
  sendSkillLoaded(requestId: string, skillName: string, skillPreview?: string): void {
    const notification: AgentSkillLoaded = {
      ...createBaseMessage(),
      requestId,
      skillName,
      skillPreview,
    };
    this.sendToRenderer(AgentChannels.AGENT_SKILL_LOADED, notification);
  }

  /**
   * Send a processing status update to the renderer.
   * Used to indicate what the agent is currently doing.
   */
  sendStatusUpdate(requestId: string, status: ProcessingStatus, message: string): void {
    const update: AgentStatusUpdate = {
      ...createBaseMessage(),
      requestId,
      status,
      message,
    };
    this.sendToRenderer(AgentChannels.AGENT_STATUS_UPDATE, update);
  }

  /**
   * Send an error notification to the renderer.
   */
  sendError(
    requestId: string | undefined,
    code: AgentErrorCode,
    message: string,
    details?: unknown
  ): void {
    const error: AgentError = {
      ...createBaseMessage(),
      requestId,
      code,
      message,
      details,
      recoverable: this.isRecoverableError(code),
    };
    this.sendToRenderer(AgentChannels.AGENT_ERROR, error);

    // Mark as not running on non-recoverable error
    if (!this.isRecoverableError(code)) {
      this.markComplete();
    }
  }

  /**
   * Send a message to the renderer process.
   */
  private sendToRenderer(channel: AgentChannel, data: unknown): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn('[AgentBridge] Cannot send to renderer: window not available');
      return;
    }

    try {
      this.mainWindow.webContents.send(channel, data);
    } catch (error) {
      console.error('[AgentBridge] Failed to send to renderer:', error);
    }
  }

  /**
   * Create an error response for initialization.
   */
  private createErrorResponse(requestId: string, message: string): AgentInitResponse {
    return {
      id: requestId,
      timestamp: Date.now(),
      success: false,
      error: message,
    };
  }

  /**
   * Check if an error code represents a recoverable error.
   */
  private isRecoverableError(code: AgentErrorCode): boolean {
    const recoverableErrors: AgentErrorCode[] = [
      'TIMEOUT',
      'NETWORK_ERROR',
      'AGENT_BUSY',
    ];
    return recoverableErrors.includes(code);
  }

  /**
   * Get current configuration.
   */
  getConfig(): AgentBridgeConfig {
    return { ...this.config };
  }

  /**
   * Get current state.
   */
  getState(): AgentBridgeState {
    return { ...this.state };
  }

  /**
   * Get workspace path.
   */
  getWorkspacePath(): string | undefined {
    return this.state.workspacePath;
  }

  /**
   * Remove all IPC handlers.
   */
  cleanup(): void {
    console.log('[AgentBridge] Cleaning up...');

    const channels = Object.values(AgentChannels);
    channels.forEach((channel) => {
      ipcMain.removeHandler(channel);
    });

    this.state = {
      initialized: false,
      isRunning: false,
      model: undefined,
      workspacePath: undefined,
    };
    this.mainWindow = null;
    this.pendingQuestions.clear();

    console.log('[AgentBridge] Cleanup complete');
  }
}

// Singleton instance
let agentBridge: AgentBridge | null = null;

/**
 * Get or create the agent bridge singleton.
 */
export function getAgentBridge(config?: Partial<AgentBridgeConfig>): AgentBridge {
  if (!agentBridge) {
    agentBridge = new AgentBridge(config);
  }
  return agentBridge;
}

/**
 * Register agent bridge handlers.
 */
export function registerAgentBridge(
  getMainWindow: () => BrowserWindow | null,
  config?: Partial<AgentBridgeConfig>
): AgentBridge {
  const bridge = getAgentBridge(config);
  bridge.initialize(getMainWindow);
  return bridge;
}

/**
 * Remove agent bridge handlers.
 */
export function removeAgentBridge(): void {
  if (agentBridge) {
    agentBridge.cleanup();
    agentBridge = null;
  }
}
