/**
 * Chat IPC Handlers for Agent Communication.
 * Uses Claude Agent SDK for automatic tool execution and agentic loop.
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { AgentBridge, getAgentBridge } from './agent-bridge.js';
import {
  setCurrentRequestId,
  initializeTodoListHandlers,
  cleanupTodoListHandlers,
  getTodoListBroadcaster,
} from './todolist-handlers.js';
import {
  setArtifactRequestId,
  initializeArtifactHandlers,
  cleanupArtifactHandlers,
} from './artifact-handlers.js';
import {
  setExecutionRequestId,
  broadcastToolUse,
  broadcastToolResult,
} from './execution-handlers.js';
import {
  processAttachments,
  type FileAttachment,
} from '../attachments/index.js';

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
 * ChatHandlerService manages the actual agent conversation.
 * Uses Claude Agent SDK for automatic tool execution.
 */
export class ChatHandlerService {
  private bridge: AgentBridge;
  private workspacePath: string = '';
  private sessionId?: string;
  private currentModel: string = 'claude-sonnet-4-20250514';
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;
  private additionalInstructions: string = '';

  constructor(_config: Partial<ChatHandlerConfig> = {}) {
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
    console.log('[ChatHandlerService] Initializing agent with Agent SDK...', {
      workspace: data.workspacePath,
      model: data.model,
    });

    try {
      // Store workspace path for Agent SDK
      this.workspacePath = data.workspacePath;
      this.currentModel = data.model || 'claude-sonnet-4-20250514';
      this.additionalInstructions = data.additionalInstructions || '';

      // Clear session for new initialization
      this.sessionId = undefined;

      // Initialize TodoList handlers for progress tracking
      initializeTodoListHandlers();

      // Initialize artifact handlers for file creation tracking
      initializeArtifactHandlers();

      // Mark bridge as initialized
      this.bridge.setInitialized(true);

      console.log('[ChatHandlerService] Agent SDK initialized successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Initialization failed';
      console.error('[ChatHandlerService] Initialization error:', message);
      this.bridge.setInitialized(false);
      this.bridge.sendError(undefined, 'INITIALIZATION_FAILED', message);
    }
  }

  /**
   * Handle incoming user messages using Agent SDK.
   */
  private async handleMessage(data: {
    requestId: string;
    content: string;
    attachments?: Array<{ name: string; path: string; mimeType: string; size: number }>;
  }): Promise<void> {
    const { requestId, content, attachments } = data;

    console.log('[ChatHandlerService] Processing message with Agent SDK:', {
      requestId,
      contentLength: content.length,
      attachments: attachments?.length ?? 0,
      isProcessing: this.isProcessing,
    });

    if (this.isProcessing) {
      console.log('[ChatHandlerService] Rejecting: isProcessing is true');
      this.bridge.sendError(requestId, 'AGENT_BUSY', 'Agent is currently processing another request');
      // IMPORTANT: Reset bridge state since we're rejecting this request
      // The bridge already set isRunning=true before emitting the event
      this.bridge.markComplete();
      return;
    }

    this.isProcessing = true;
    this.abortController = new AbortController();

    // Set current request ID for broadcasts
    setCurrentRequestId(requestId);
    setArtifactRequestId(requestId);
    setExecutionRequestId(requestId);

    try {
      // Build message content with processed attachments
      let messageContent = content;

      if (attachments && attachments.length > 0) {
        console.log('[ChatHandlerService] Processing attachments...');
        const result = await processAttachments(attachments as FileAttachment[]);

        if (result.errors.length > 0) {
          console.warn('[ChatHandlerService] Attachment processing warnings:', result.errors);
        }

        if (result.contextText) {
          messageContent += result.contextText;
        }
      }

      // Build system prompt
      let systemPrompt = `You are Claude Cowork, an AI assistant running in a desktop application.
You help users with various tasks in their workspace.

Current workspace: ${this.workspacePath}

Always be helpful, clear, and concise in your responses.
When performing actions, explain what you're doing.
If you encounter errors, explain them clearly and suggest solutions.`;

      if (this.additionalInstructions) {
        systemPrompt += `\n\nAdditional Instructions:\n${this.additionalInstructions}`;
      }

      // Use Agent SDK query() for automatic tool execution
      const result = query({
        prompt: messageContent,
        options: {
          cwd: this.workspacePath,
          // Load skills from user (~/.claude/skills/) and project (.claude/skills/) directories
          settingSources: ['user', 'project'],
          allowedTools: [
            // Skills - enables SDK to use SKILL.md files
            'Skill',
            // File operations
            'Read', 'Write', 'Edit', 'MultiEdit', 'NotebookEdit',
            // Shell operations
            'Bash', 'BashOutput', 'KillBash',
            // Search operations
            'Glob', 'Grep',
            // Web operations
            'WebFetch', 'WebSearch',
            // Task management
            'TodoWrite', 'Task',
            // Interactive tools
            'AskUserQuestion',
          ],
          permissionMode: 'default',
          // Handle tool permissions - especially AskUserQuestion which needs UI interaction
          canUseTool: async (toolName: string, input: Record<string, unknown>) => {
            // Handle AskUserQuestion specially - show UI and get user response
            if (toolName === 'AskUserQuestion') {
              try {
                const questions = input.questions as Array<{
                  question: string;
                  header: string;
                  options: Array<{ label: string; description: string }>;
                  multiSelect: boolean;
                }>;

                // Collect answers for all questions
                const answers: Record<string, string> = {};

                for (const q of questions) {
                  // Convert options to bridge format
                  const options = q.options.map((opt) => ({
                    label: opt.label,
                    value: opt.label,
                    description: opt.description,
                  }));

                  // Ask the user via the bridge
                  const selectedValues = await this.bridge.askQuestion(
                    requestId,
                    q.question,
                    options,
                    q.multiSelect
                  );

                  // Store answer - comma-separated for multi-select
                  answers[q.question] = selectedValues.join(', ');
                }

                // Return with answers populated
                return {
                  behavior: 'allow' as const,
                  updatedInput: {
                    questions: input.questions,
                    answers,
                  },
                };
              } catch (error) {
                const msg = error instanceof Error ? error.message : 'User cancelled';
                return {
                  behavior: 'deny' as const,
                  message: msg,
                };
              }
            }

            // Allow all other tools
            return { behavior: 'allow' as const };
          },
          model: this.currentModel,
          systemPrompt,
          resume: this.sessionId,
          abortController: this.abortController,
          maxTurns: 50,
        },
      });

      let fullContent = '';
      let inputTokens = 0;
      let outputTokens = 0;
      let messageCount = 0;

      console.log('[ChatHandlerService] Starting SDK message processing loop...');

      // Process Agent SDK messages
      for await (const message of result) {
        messageCount++;
        console.log(`[ChatHandlerService] SDK message #${messageCount}:`, {
          type: message.type,
          hasMessage: 'message' in message,
        });

        // Check for abort
        if (this.abortController?.signal.aborted) {
          console.log('[ChatHandlerService] Request aborted');
          break;
        }

        this.processAgentMessage(message, requestId, {
          onText: (text) => {
            console.log('[ChatHandlerService] Received text chunk:', text.substring(0, 100));
            fullContent += text;
            this.bridge.sendMessageChunk(requestId, text, false);
          },
          onSessionId: (id) => {
            console.log('[ChatHandlerService] Session ID:', id);
            this.sessionId = id;
          },
          onUsage: (input, output) => {
            console.log('[ChatHandlerService] Usage:', { input, output });
            inputTokens = input;
            outputTokens = output;
          },
        });
      }

      console.log('[ChatHandlerService] Loop complete. Total messages:', messageCount, 'Content length:', fullContent.length);

      // Send completion
      this.bridge.sendMessageComplete(requestId, fullContent, {
        inputTokens,
        outputTokens,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ChatHandlerService] Message processing error:', errorMessage);

      let errorCode: 'API_ERROR' | 'NETWORK_ERROR' | 'TIMEOUT' | 'UNKNOWN' = 'UNKNOWN';
      if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorCode = 'NETWORK_ERROR';
      } else if (errorMessage.includes('timeout')) {
        errorCode = 'TIMEOUT';
      } else if (errorMessage.includes('API') || errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Claude Code')) {
        errorCode = 'API_ERROR';
      }

      this.bridge.sendError(requestId, errorCode, errorMessage);
    } finally {
      this.isProcessing = false;
      this.abortController = null;
      setCurrentRequestId(null);
      setArtifactRequestId(null);
      setExecutionRequestId(null);
      this.bridge.markComplete();
    }
  }

  /**
   * Process Agent SDK message and dispatch to appropriate handlers.
   */
  private processAgentMessage(
    message: SDKMessage,
    _requestId: string,
    handlers: {
      onText: (text: string) => void;
      onSessionId: (id: string) => void;
      onUsage: (input: number, output: number) => void;
    }
  ): void {
    switch (message.type) {
      case 'system':
        // Capture session ID for conversation continuity
        if ('session_id' in message && message.session_id) {
          handlers.onSessionId(message.session_id);
        }
        break;

      case 'assistant':
        // Extract and stream text content
        if (message.message && 'content' in message.message) {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                handlers.onText(block.text);
              } else if (block.type === 'tool_use') {
                // Broadcast tool use to UI
                broadcastToolUse(
                  block.name,
                  block.input as Record<string, unknown>,
                  block.id
                );

                // Handle TodoWrite specifically to update Progress pane
                if (block.name === 'TodoWrite') {
                  const input = block.input as { todos?: Array<{
                    content: string;
                    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
                    activeForm?: string;
                  }> };

                  if (input.todos && Array.isArray(input.todos)) {
                    const broadcaster = getTodoListBroadcaster();
                    if (broadcaster) {
                      // Transform SDK todo format to our format
                      const now = new Date().toISOString();
                      const todoList = {
                        items: input.todos.map((todo, index) => ({
                          id: `todo-${Date.now()}-${index}`,
                          content: todo.content,
                          status: todo.status,
                          createdAt: now,
                          updatedAt: now,
                          completedAt: todo.status === 'completed' ? now : undefined,
                          blockedReason: undefined,
                        })),
                        createdAt: now,
                        updatedAt: now,
                      };

                      console.log('[ChatHandlerService] Broadcasting TodoWrite update:', {
                        itemCount: todoList.items.length,
                      });

                      broadcaster(todoList);
                    } else {
                      console.warn('[ChatHandlerService] TodoList broadcaster not available');
                    }
                  }
                }
              }
            }
          } else if (typeof content === 'string') {
            handlers.onText(content);
          }
        }
        break;

      case 'user':
        // Handle tool results in user messages (SDK sends tool results this way)
        if (message.message && 'content' in message.message) {
          const content = message.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'tool_result') {
                // Extract tool result data
                const toolUseId = block.tool_use_id;
                const isError = block.is_error === true;
                let output = '';

                // Extract output content
                if (typeof block.content === 'string') {
                  output = block.content;
                } else if (Array.isArray(block.content)) {
                  const textBlocks: string[] = [];
                  for (const contentBlock of block.content) {
                    if (contentBlock.type === 'text' && 'text' in contentBlock) {
                      textBlocks.push(String(contentBlock.text));
                    }
                  }
                  output = textBlocks.join('\n');
                }

                console.log('[ChatHandlerService] Tool result from user message:', {
                  toolUseId,
                  isError,
                  outputLength: output.length,
                });

                broadcastToolResult(
                  toolUseId,
                  !isError,
                  output,
                  isError ? output : undefined
                );
              }
            }
          }
        }
        break;

      case 'result':
        // Capture usage stats
        if ('usage' in message && message.usage) {
          const usage = message.usage as { input_tokens?: number; output_tokens?: number };
          handlers.onUsage(
            usage.input_tokens ?? 0,
            usage.output_tokens ?? 0
          );
        }

        // Handle tool results if present (alternative format)
        if ('tool_results' in message) {
          const results = message.tool_results as Array<{
            tool_use_id: string;
            success: boolean;
            output: string;
            error?: string;
          }>;
          for (const result of results) {
            broadcastToolResult(
              result.tool_use_id,
              result.success,
              result.output,
              result.error
            );
          }
        }
        break;

      default:
        // Log unhandled message types for debugging
        console.log('[ChatHandlerService] Unhandled message type:', message.type, JSON.stringify(message).substring(0, 200));
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
  }

  /**
   * Get current processing state.
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Clear session to start fresh conversation.
   */
  clearSession(): void {
    this.sessionId = undefined;
    console.log('[ChatHandlerService] Session cleared');
  }

  /**
   * Clean up resources.
   */
  cleanup(): void {
    this.handleStop();
    this.sessionId = undefined;
    this.workspacePath = '';
    this.additionalInstructions = '';
    cleanupTodoListHandlers();
    cleanupArtifactHandlers();
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
