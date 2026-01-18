/**
 * Chat IPC Handlers for Agent Communication.
 * Connects the AgentBridge to the actual Claude agent for message processing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AgentBridge, getAgentBridge } from './agent-bridge.js';

/**
 * Configuration for the chat handler service.
 */
export interface ChatHandlerConfig {
  /** Maximum tokens for agent responses */
  maxTokens: number;
  /** Path to system prompt file */
  systemPromptPath?: string;
}

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: ChatHandlerConfig = {
  maxTokens: 8192,
};

/**
 * Message in the conversation history.
 */
interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * ChatHandlerService manages the actual agent conversation.
 * Listens to AgentBridge events and processes messages through the Claude API.
 */
export class ChatHandlerService {
  private config: ChatHandlerConfig;
  private bridge: AgentBridge;
  private client: Anthropic | null = null;
  private conversationHistory: ConversationMessage[] = [];
  private systemPrompt: string = '';
  private currentModel: string = 'claude-sonnet-4-20250514';
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;

  constructor(config: Partial<ChatHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.bridge = getAgentBridge();
    this.setupEventHandlers();
  }

  /**
   * Set up event handlers for the agent bridge.
   */
  private setupEventHandlers(): void {
    // Handle agent initialization
    this.bridge.on('agent:init', async (data: {
      workspacePath: string;
      model?: string;
      additionalInstructions?: string;
    }) => {
      await this.handleInit(data);
    });

    // Handle user messages
    this.bridge.on('agent:message', async (data: {
      requestId: string;
      content: string;
      attachments?: Array<{ name: string; path: string; mimeType: string; size: number }>;
    }) => {
      await this.handleMessage(data);
    });

    // Handle stop requests
    this.bridge.on('agent:stop', () => {
      this.handleStop();
    });

    // Handle question answers
    this.bridge.on('agent:answer', (data: {
      questionId: string;
      requestId: string;
      selectedValues: string[];
    }) => {
      this.handleAnswer(data);
    });
  }

  /**
   * Initialize the agent with workspace and model configuration.
   */
  private async handleInit(data: {
    workspacePath: string;
    model?: string;
    additionalInstructions?: string;
  }): Promise<void> {
    console.log('[ChatHandlerService] Initializing agent...', {
      workspace: data.workspacePath,
      model: data.model,
    });

    try {
      // Get API key from environment
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }

      // Create Anthropic client
      this.client = new Anthropic({ apiKey });

      // Store configuration
      this.currentModel = data.model || 'claude-sonnet-4-20250514';

      // Build system prompt
      this.systemPrompt = this.buildSystemPrompt(data.workspacePath, data.additionalInstructions);

      // Clear conversation history for new session
      this.conversationHistory = [];

      // Mark bridge as initialized
      this.bridge.setInitialized(true);

      console.log('[ChatHandlerService] Agent initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      console.error('[ChatHandlerService] Initialization error:', message);
      this.bridge.setInitialized(false);
      this.bridge.sendError(undefined, 'INITIALIZATION_FAILED', message);
    }
  }

  /**
   * Build the system prompt for the agent.
   */
  private buildSystemPrompt(workspacePath: string, additionalInstructions?: string): string {
    const basePrompt = `You are Claude Cowork, an AI assistant running in a desktop application.
You help users with various tasks in their workspace.

Current workspace: ${workspacePath}

You have access to various tools to help users:
- File operations (create, read, edit files)
- Shell commands (cross-platform)
- Web search and fetch
- Task management

Always be helpful, clear, and concise in your responses.
When performing actions, explain what you're doing.
If you encounter errors, explain them clearly and suggest solutions.`;

    if (additionalInstructions) {
      return `${basePrompt}\n\nAdditional Instructions:\n${additionalInstructions}`;
    }

    return basePrompt;
  }

  /**
   * Handle incoming user messages.
   */
  private async handleMessage(data: {
    requestId: string;
    content: string;
    attachments?: Array<{ name: string; path: string; mimeType: string; size: number }>;
  }): Promise<void> {
    const { requestId, content, attachments } = data;

    console.log('[ChatHandlerService] Processing message:', {
      requestId,
      contentLength: content.length,
      attachments: attachments?.length ?? 0,
    });

    if (!this.client) {
      this.bridge.sendError(requestId, 'AGENT_NOT_INITIALIZED', 'Agent client not initialized');
      return;
    }

    if (this.isProcessing) {
      this.bridge.sendError(requestId, 'AGENT_BUSY', 'Agent is currently processing another request');
      return;
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    try {
      // Build message content
      let messageContent = content;
      if (attachments && attachments.length > 0) {
        const attachmentInfo = attachments
          .map((a) => `- ${a.name} (${a.mimeType}, ${this.formatBytes(a.size)})`)
          .join('\n');
        messageContent += `\n\nAttached files:\n${attachmentInfo}`;
      }

      // Add to conversation history
      this.conversationHistory.push({
        role: 'user',
        content: messageContent,
      });

      // Send request to Claude with streaming
      const response = await this.client.messages.create({
        model: this.currentModel,
        max_tokens: this.config.maxTokens,
        system: this.systemPrompt,
        messages: this.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      });

      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let completionSent = false;

      // Process streaming response
      for await (const event of response) {
        // Check for abort
        if (this.abortController?.signal.aborted) {
          console.log('[ChatHandlerService] Request aborted');
          break;
        }

        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if ('text' in delta) {
            const text = delta.text;
            fullContent += text;

            // Send chunk to renderer
            this.bridge.sendMessageChunk(requestId, text, false);
          }
        }

        if (event.type === 'message_delta' && event.usage) {
          // Capture usage stats from message_delta
          outputTokens = event.usage.output_tokens;
        }

        if (event.type === 'message_start' && event.message) {
          // Capture input tokens from the start message
          inputTokens = event.message.usage?.input_tokens ?? 0;
        }

        if (event.type === 'message_stop') {
          // Add assistant response to history
          this.conversationHistory.push({
            role: 'assistant',
            content: fullContent,
          });

          // Send completion with accumulated usage
          this.bridge.sendMessageComplete(requestId, fullContent, {
            inputTokens,
            outputTokens,
          });
          completionSent = true;
        }
      }

      // Ensure completion is sent if not already
      if (fullContent && !this.abortController?.signal.aborted && !completionSent) {
        this.conversationHistory.push({
          role: 'assistant',
          content: fullContent,
        });
        this.bridge.sendMessageComplete(requestId, fullContent, {
          inputTokens,
          outputTokens,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ChatHandlerService] Message processing error:', errorMessage);

      // Determine error code
      let errorCode: 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN' = 'UNKNOWN';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
      } else if (errorMessage.includes('timeout')) {
        errorCode = 'TIMEOUT';
      } else if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403')) {
        errorCode = 'API_ERROR';
      }

      this.bridge.sendError(requestId, errorCode, errorMessage);
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      this.bridge.markComplete();
    }
  }

  /**
   * Handle stop requests.
   */
  private handleStop(): void {
    console.log('[ChatHandlerService] Stopping current processing');

    if (this.abortController) {
      this.abortController.abort();
    }

    this.isProcessing = false;
    this.bridge.markComplete();
  }

  /**
   * Handle answers to questions.
   */
  private handleAnswer(data: {
    questionId: string;
    requestId: string;
    selectedValues: string[];
  }): void {
    console.log('[ChatHandlerService] Received answer:', data);
    // Question handling is managed by the bridge's promise resolution
    // This is here for any additional processing if needed
  }

  /**
   * Format bytes to human-readable string.
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Get current processing state.
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get conversation history length.
   */
  getConversationLength(): number {
    return this.conversationHistory.length;
  }

  /**
   * Clear conversation history.
   */
  clearHistory(): void {
    this.conversationHistory = [];
    console.log('[ChatHandlerService] Conversation history cleared');
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this.handleStop();
    this.client = null;
    this.conversationHistory = [];
    this.systemPrompt = '';
    console.log('[ChatHandlerService] Cleaned up');
  }
}

// Singleton instance
let chatHandlerService: ChatHandlerService | null = null;

/**
 * Get or create the chat handler service singleton.
 */
export function getChatHandlerService(config?: Partial<ChatHandlerConfig>): ChatHandlerService {
  if (!chatHandlerService) {
    chatHandlerService = new ChatHandlerService(config);
  }
  return chatHandlerService;
}

/**
 * Initialize the chat handler service.
 */
export function initializeChatHandlerService(config?: Partial<ChatHandlerConfig>): ChatHandlerService {
  return getChatHandlerService(config);
}

/**
 * Clean up the chat handler service.
 */
export function cleanupChatHandlerService(): void {
  if (chatHandlerService) {
    chatHandlerService.cleanup();
    chatHandlerService = null;
  }
}
