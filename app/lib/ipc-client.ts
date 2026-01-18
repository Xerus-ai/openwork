/**
 * IPC Client for Agent Communication.
 * Provides a typed interface for communicating with the agent from the renderer process.
 */

import {
  AgentInitResponse,
  AgentStatusResponse,
  AgentMessageChunk,
  AgentMessageComplete,
  AgentToolUse,
  AgentToolResult,
  AgentQuestion,
  AgentTodoUpdate,
  AgentArtifactCreated,
  AgentSkillLoaded,
  AgentError,
  FileAttachment,
  generateMessageId,
} from './ipc-types';

/**
 * Event handler types for agent events.
 */
export interface AgentEventHandlers {
  onMessageChunk?: (chunk: AgentMessageChunk) => void;
  onMessageComplete?: (message: AgentMessageComplete) => void;
  onToolUse?: (toolUse: AgentToolUse) => void;
  onToolResult?: (result: AgentToolResult) => void;
  onQuestion?: (question: AgentQuestion) => void;
  onTodoUpdate?: (update: AgentTodoUpdate) => void;
  onArtifactCreated?: (artifact: AgentArtifactCreated) => void;
  onSkillLoaded?: (skill: AgentSkillLoaded) => void;
  onError?: (error: AgentError) => void;
}

/**
 * Configuration for the IPC client.
 */
export interface IpcClientConfig {
  /** Default timeout for requests in milliseconds */
  defaultTimeout: number;
}

/**
 * IPC Client for agent communication from the renderer process.
 */
export class IpcClient {
  private eventHandlers: AgentEventHandlers = {};
  private cleanupFunctions: (() => void)[] = [];
  private isInitialized = false;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config?: Partial<IpcClientConfig>) {
    // Config parameter available for future timeout implementation
  }

  /**
   * Check if the Electron API is available.
   */
  private checkElectronApi(): boolean {
    return typeof window !== 'undefined' && 'electronAgentAPI' in window;
  }

  /**
   * Get the Electron agent API.
   */
  private getApi(): ElectronAgentAPI {
    if (!this.checkElectronApi()) {
      throw new Error('Electron agent API not available');
    }
    return (window as WindowWithAgentAPI).electronAgentAPI;
  }

  /**
   * Initialize the IPC client and set up event listeners.
   */
  initialize(handlers: AgentEventHandlers = {}): void {
    if (this.isInitialized) {
      console.warn('[IpcClient] Already initialized');
      return;
    }

    this.eventHandlers = handlers;

    if (!this.checkElectronApi()) {
      console.warn('[IpcClient] Electron agent API not available, running in browser mode');
      this.isInitialized = true;
      return;
    }

    const api = this.getApi();

    // Set up event listeners
    if (handlers.onMessageChunk) {
      const cleanup = api.onMessageChunk(handlers.onMessageChunk);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onMessageComplete) {
      const cleanup = api.onMessageComplete(handlers.onMessageComplete);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onToolUse) {
      const cleanup = api.onToolUse(handlers.onToolUse);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onToolResult) {
      const cleanup = api.onToolResult(handlers.onToolResult);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onQuestion) {
      const cleanup = api.onQuestion(handlers.onQuestion);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onTodoUpdate) {
      const cleanup = api.onTodoUpdate(handlers.onTodoUpdate);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onArtifactCreated) {
      const cleanup = api.onArtifactCreated(handlers.onArtifactCreated);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onSkillLoaded) {
      const cleanup = api.onSkillLoaded(handlers.onSkillLoaded);
      this.cleanupFunctions.push(cleanup);
    }

    if (handlers.onError) {
      const cleanup = api.onError(handlers.onError);
      this.cleanupFunctions.push(cleanup);
    }

    this.isInitialized = true;
    console.log('[IpcClient] Initialized successfully');
  }

  /**
   * Initialize the agent with workspace and model configuration.
   */
  async initAgent(
    workspacePath: string,
    model: string,
    additionalInstructions?: string
  ): Promise<AgentInitResponse> {
    if (!this.checkElectronApi()) {
      return this.createMockInitResponse(workspacePath);
    }

    const api = this.getApi();
    return api.initAgent({
      id: generateMessageId(),
      timestamp: Date.now(),
      workspacePath,
      model,
      additionalInstructions,
    });
  }

  /**
   * Get the current agent status.
   */
  async getStatus(): Promise<AgentStatusResponse> {
    if (!this.checkElectronApi()) {
      return this.createMockStatusResponse();
    }

    const api = this.getApi();
    return api.getStatus();
  }

  /**
   * Send a message to the agent.
   */
  async sendMessage(
    content: string,
    attachments?: FileAttachment[]
  ): Promise<{ requestId: string }> {
    if (!this.checkElectronApi()) {
      return this.simulateMockMessage(content);
    }

    const api = this.getApi();
    return api.sendMessage({
      id: generateMessageId(),
      timestamp: Date.now(),
      content,
      attachments,
    });
  }

  /**
   * Stop the agent's current processing.
   */
  async stopAgent(): Promise<{ success: boolean }> {
    if (!this.checkElectronApi()) {
      return { success: true };
    }

    const api = this.getApi();
    return api.stopAgent();
  }

  /**
   * Answer a question from the agent.
   */
  async answerQuestion(
    questionId: string,
    requestId: string,
    selectedValues: string[]
  ): Promise<{ success: boolean }> {
    if (!this.checkElectronApi()) {
      return { success: true };
    }

    const api = this.getApi();
    return api.answerQuestion({
      id: generateMessageId(),
      timestamp: Date.now(),
      questionId,
      requestId,
      selectedValues,
    });
  }

  /**
   * Clean up event listeners.
   */
  cleanup(): void {
    this.cleanupFunctions.forEach((cleanup) => cleanup());
    this.cleanupFunctions = [];
    this.eventHandlers = {};
    this.isInitialized = false;
    console.log('[IpcClient] Cleaned up');
  }

  /**
   * Create a mock init response for browser testing.
   */
  private createMockInitResponse(workspacePath: string): AgentInitResponse {
    console.log('[IpcClient] Mock: Agent initialized with workspace:', workspacePath);
    return {
      id: generateMessageId(),
      timestamp: Date.now(),
      success: true,
      systemPromptLoaded: true,
      warnings: ['Running in browser mock mode'],
    };
  }

  /**
   * Create a mock status response for browser testing.
   */
  private createMockStatusResponse(): AgentStatusResponse {
    return {
      id: generateMessageId(),
      timestamp: Date.now(),
      initialized: true,
      isRunning: false,
      model: 'claude-sonnet-4-20250514',
      workspacePath: '/mock/workspace',
    };
  }

  /**
   * Simulate a mock message response for browser testing.
   */
  private simulateMockMessage(content: string): { requestId: string } {
    const requestId = generateMessageId();

    // Simulate streaming response
    setTimeout(() => {
      if (this.eventHandlers.onMessageChunk) {
        this.eventHandlers.onMessageChunk({
          id: generateMessageId(),
          timestamp: Date.now(),
          requestId,
          content: 'This is a mock response to: ',
          isFinal: false,
        });
      }
    }, 100);

    setTimeout(() => {
      if (this.eventHandlers.onMessageChunk) {
        this.eventHandlers.onMessageChunk({
          id: generateMessageId(),
          timestamp: Date.now(),
          requestId,
          content: `"${content}"`,
          isFinal: false,
        });
      }
    }, 200);

    setTimeout(() => {
      if (this.eventHandlers.onMessageComplete) {
        this.eventHandlers.onMessageComplete({
          id: generateMessageId(),
          timestamp: Date.now(),
          requestId,
          content: `This is a mock response to: "${content}"`,
          usage: { inputTokens: 100, outputTokens: 50 },
        });
      }
    }, 300);

    return { requestId };
  }
}

/**
 * Extended window interface with agent API.
 */
interface WindowWithAgentAPI extends Window {
  electronAgentAPI: ElectronAgentAPI;
}

/**
 * Electron agent API exposed via preload script.
 */
interface ElectronAgentAPI {
  // Agent operations
  initAgent: (request: {
    id: string;
    timestamp: number;
    workspacePath: string;
    model: string;
    additionalInstructions?: string;
  }) => Promise<AgentInitResponse>;

  getStatus: () => Promise<AgentStatusResponse>;

  sendMessage: (request: {
    id: string;
    timestamp: number;
    content: string;
    attachments?: FileAttachment[];
  }) => Promise<{ requestId: string }>;

  stopAgent: () => Promise<{ success: boolean }>;

  answerQuestion: (answer: {
    id: string;
    timestamp: number;
    questionId: string;
    requestId: string;
    selectedValues: string[];
  }) => Promise<{ success: boolean }>;

  // Event listeners
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

// Singleton instance
let ipcClient: IpcClient | null = null;

/**
 * Get or create the IPC client singleton.
 */
export function getIpcClient(config?: Partial<IpcClientConfig>): IpcClient {
  if (!ipcClient) {
    ipcClient = new IpcClient(config);
  }
  return ipcClient;
}

/**
 * Initialize the IPC client with event handlers.
 */
export function initializeIpcClient(handlers: AgentEventHandlers = {}): IpcClient {
  const client = getIpcClient();
  client.initialize(handlers);
  return client;
}

/**
 * Clean up the IPC client.
 */
export function cleanupIpcClient(): void {
  if (ipcClient) {
    ipcClient.cleanup();
    ipcClient = null;
  }
}

// Type augmentation for window object
declare global {
  interface Window {
    electronAgentAPI?: ElectronAgentAPI;
  }
}
