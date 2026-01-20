/**
 * Hook for integrating chat with the agent backend.
 * Handles initialization, message sending, streaming responses,
 * and all agent events.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useChat, type ChatState, type ChatActions, type ChatMessage } from './useChat';
import { useModel } from './useModel';
import { useWorkspace } from './useWorkspace';
import { useQuestions, type PendingQuestion } from './useQuestions';
import {
  getIpcClient,
  type IpcClient,
} from '@/lib/ipc-client';
import type {
  AgentMessageChunk,
  AgentMessageComplete,
  AgentToolUse,
  AgentToolResult,
  AgentQuestion,
  AgentStatusUpdate,
  AgentError,
  FileAttachment,
  ProcessingStatus,
} from '@/lib/ipc-types';

/**
 * Agent connection state.
 */
export type AgentConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

/**
 * Tool execution record for display.
 */
export interface ToolExecution {
  id: string;
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  status: 'running' | 'success' | 'error';
  output?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Agent chat state.
 */
export interface AgentChatState extends ChatState {
  connectionState: AgentConnectionState;
  isAgentInitialized: boolean;
  currentRequestId: string | null;
  toolExecutions: ToolExecution[];
  lastError: AgentError | null;
  /** Currently active question (or null if none) */
  currentQuestion: PendingQuestion | null;
  /** Queue of pending questions */
  questionQueue: PendingQuestion[];
  /** Whether a question answer is being submitted */
  isSubmittingAnswer: boolean;
  /** Last question submission error */
  questionError: string | null;
  /** Current processing status */
  processingStatus: ProcessingStatus | null;
  /** Human-readable status message */
  statusMessage: string | null;
}

/**
 * Agent chat actions.
 */
export interface AgentChatActions extends Omit<ChatActions, 'addUserMessage'> {
  sendMessage: (content: string, attachments?: FileAttachment[]) => Promise<void>;
  initializeAgent: () => Promise<boolean>;
  stopAgent: () => Promise<void>;
  clearError: () => void;
  /** Submit an answer to the current question */
  submitQuestionAnswer: (selectedValues: string[]) => Promise<boolean>;
  /** Skip the current question */
  skipQuestion: () => Promise<boolean>;
  /** Clear question error */
  clearQuestionError: () => void;
  /** Load messages for a session */
  loadMessages: (messages: ChatMessage[]) => void;
}

/**
 * Options for useAgentChat hook.
 */
export interface UseAgentChatOptions {
  /** Override workspace path (e.g., from session). If provided, this takes precedence over global workspace. */
  workspacePathOverride?: string | null;
}

/**
 * Hook for managing agent chat integration.
 *
 * Connects the chat UI to the agent backend through IPC,
 * handling initialization, message streaming, and tool executions.
 *
 * @param options - Optional configuration including workspace path override
 * @returns Agent chat state and actions
 *
 * @example
 * const {
 *   messages,
 *   isStreaming,
 *   connectionState,
 *   sendMessage,
 *   initializeAgent,
 * } = useAgentChat({ workspacePathOverride: sessionWorkspacePath });
 *
 * // Initialize agent when workspace is selected
 * await initializeAgent();
 *
 * // Send a message
 * await sendMessage("Create a document about React");
 */
export function useAgentChat(options?: UseAgentChatOptions): AgentChatState & AgentChatActions {
  const chat = useChat();
  const { selectedModel } = useModel();
  const { workspacePath: globalWorkspacePath, validationResult } = useWorkspace();
  const questions = useQuestions();

  // Use the session workspace if provided, otherwise fall back to global workspace
  const workspacePath = options?.workspacePathOverride !== undefined
    ? options.workspacePathOverride
    : globalWorkspacePath;

  const [connectionState, setConnectionState] = useState<AgentConnectionState>('disconnected');
  const [isAgentInitialized, setIsAgentInitialized] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [lastError, setLastError] = useState<AgentError | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const clientRef = useRef<IpcClient | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  // Store chat functions in refs to avoid recreating handlers when chat state changes
  // This prevents IPC client from being cleaned up during message processing
  const chatRef = useRef(chat);
  chatRef.current = chat;

  /**
   * Handle streaming message chunks from the agent.
   * Uses ref to access chat functions to keep this callback stable.
   */
  const handleMessageChunk = useCallback(
    (chunk: AgentMessageChunk) => {
      if (!currentMessageIdRef.current) {
        // Start a new assistant message if we don't have one
        const messageId = chatRef.current.startAssistantMessage();
        currentMessageIdRef.current = messageId;
      }

      // Append content to the current message
      chatRef.current.appendToMessage(currentMessageIdRef.current, chunk.content);
    },
    [] // No dependencies - uses ref
  );

  /**
   * Handle message completion from the agent.
   * Uses ref to access chat functions to keep this callback stable.
   */
  const handleMessageComplete = useCallback(
    (message: AgentMessageComplete) => {
      if (currentMessageIdRef.current) {
        // Update the final message content
        chatRef.current.updateMessageContent(currentMessageIdRef.current, message.content);
        chatRef.current.completeMessage(currentMessageIdRef.current);
        currentMessageIdRef.current = null;
      }

      // Clear current request
      setCurrentRequestId(null);

      // Log token usage if available
      if (message.usage) {
        console.log(
          `[useAgentChat] Token usage - Input: ${message.usage.inputTokens}, Output: ${message.usage.outputTokens}`
        );
      }
    },
    [] // No dependencies - uses ref
  );

  /**
   * Handle tool use notifications.
   */
  const handleToolUse = useCallback((toolUse: AgentToolUse) => {
    const execution: ToolExecution = {
      id: toolUse.id,
      toolUseId: toolUse.toolUseId,
      toolName: toolUse.toolName,
      toolInput: toolUse.toolInput,
      status: 'running',
      startedAt: new Date(),
    };

    setToolExecutions((prev) => [...prev, execution]);

    console.log(`[useAgentChat] Tool use: ${toolUse.toolName}`, toolUse.toolInput);
  }, []);

  /**
   * Handle tool result notifications.
   */
  const handleToolResult = useCallback((result: AgentToolResult) => {
    setToolExecutions((prev) =>
      prev.map((exec) =>
        exec.toolUseId === result.toolUseId
          ? {
              ...exec,
              status: result.success ? 'success' : 'error',
              output: result.output,
              error: result.error,
              completedAt: new Date(),
            }
          : exec
      )
    );

    console.log(
      `[useAgentChat] Tool result for ${result.toolUseId}: ${result.success ? 'success' : 'error'}`
    );
  }, []);

  // Store questions handler in ref to keep callback stable
  const questionsRef = useRef(questions);
  questionsRef.current = questions;

  /**
   * Handle agent errors.
   * Uses ref to access chat functions to keep this callback stable.
   */
  const handleError = useCallback(
    (error: AgentError) => {
      console.error('[useAgentChat] Agent error:', error);
      setLastError(error);

      // Mark current message as error if streaming
      if (currentMessageIdRef.current) {
        chatRef.current.setMessageError(currentMessageIdRef.current);
        currentMessageIdRef.current = null;
      }

      // Update connection state for non-recoverable errors
      if (!error.recoverable) {
        setConnectionState('error');
      }

      // Clear current request
      setCurrentRequestId(null);
    },
    [] // No dependencies - uses ref
  );

  /**
   * Handle incoming questions from the agent.
   * Uses ref to keep this callback stable.
   */
  const handleQuestion = useCallback(
    (question: AgentQuestion) => {
      console.log('[useAgentChat] Received question:', question.questionId);
      questionsRef.current.handleQuestion(question);
    },
    [] // No dependencies - uses ref
  );

  /**
   * Handle status updates from the agent.
   */
  const handleStatusUpdate = useCallback(
    (update: AgentStatusUpdate) => {
      console.log('[useAgentChat] Status update:', update.status, update.message);
      setProcessingStatus(update.status);
      setStatusMessage(update.message);
    },
    []
  );

  /**
   * Initialize the IPC client for agent operations.
   * The client is used for sendMessage, initAgent, etc.
   */
  useEffect(() => {
    clientRef.current = getIpcClient();
  }, []);

  /**
   * Register IPC event listeners directly with electronAgentAPI.
   * This follows the same pattern as useTodoList which works correctly.
   * Each listener is registered with proper cleanup on unmount.
   */
  useEffect(() => {
    const agentAPI = window.electronAgentAPI;
    if (!agentAPI) {
      console.warn('[useAgentChat] electronAgentAPI not available');
      return;
    }

    // Register all event listeners
    const cleanupChunk = agentAPI.onMessageChunk(handleMessageChunk);
    const cleanupComplete = agentAPI.onMessageComplete(handleMessageComplete);
    const cleanupToolUse = agentAPI.onToolUse(handleToolUse);
    const cleanupToolResult = agentAPI.onToolResult(handleToolResult);
    const cleanupQuestion = agentAPI.onQuestion(handleQuestion);
    const cleanupStatusUpdate = agentAPI.onStatusUpdate(handleStatusUpdate);
    const cleanupError = agentAPI.onError(handleError);

    // Cleanup on unmount
    return () => {
      cleanupChunk();
      cleanupComplete();
      cleanupToolUse();
      cleanupToolResult();
      cleanupQuestion();
      cleanupStatusUpdate();
      cleanupError();
    };
  }, [
    handleMessageChunk,
    handleMessageComplete,
    handleToolUse,
    handleToolResult,
    handleQuestion,
    handleStatusUpdate,
    handleError,
  ]);

  /**
   * Initialize the agent with workspace and model.
   */
  const initializeAgent = useCallback(async (): Promise<boolean> => {
    // Workspace is now optional - agent will use default artifacts folder if not provided
    if (workspacePath && validationResult && !validationResult.valid) {
      console.warn('[useAgentChat] Cannot initialize: workspace validation failed');
      return false;
    }

    if (!clientRef.current) {
      console.warn('[useAgentChat] Cannot initialize: IPC client not ready');
      return false;
    }

    setConnectionState('connecting');
    setLastError(null);

    try {
      // Pass workspace path (empty string tells agent-bridge to use default)
      const response = await clientRef.current.initAgent(
        workspacePath || '',
        selectedModel
      );

      if (response.success) {
        setIsAgentInitialized(true);
        setConnectionState('connected');
        console.log('[useAgentChat] Agent initialized successfully');

        if (response.warnings && response.warnings.length > 0) {
          console.warn('[useAgentChat] Initialization warnings:', response.warnings);
        }

        return true;
      } else {
        setConnectionState('error');
        console.error('[useAgentChat] Agent initialization failed:', response.error);
        return false;
      }
    } catch (error) {
      setConnectionState('error');
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useAgentChat] Agent initialization error:', message);
      return false;
    }
  }, [workspacePath, validationResult, selectedModel]);

  /**
   * Re-initialize when model or workspace changes (if already initialized).
   * This ensures the agent uses the correct workspace path when it changes.
   */
  useEffect(() => {
    if (isAgentInitialized) {
      // Re-initialize with new model or workspace
      console.log('[useAgentChat] Re-initializing agent - model or workspace changed');
      initializeAgent();
    }
  }, [selectedModel, workspacePath]); // Watch both model and workspace changes

  /**
   * Send a message to the agent.
   */
  const sendMessage = useCallback(
    async (content: string, attachments?: FileAttachment[]): Promise<void> => {
      // Capture client reference BEFORE any state changes to avoid race conditions
      // (state changes can trigger re-renders that cleanup the client)
      const client = clientRef.current;

      if (chat.isStreaming) {
        console.warn('[useAgentChat] Cannot send: already streaming');
        return;
      }

      // Add user message to chat FIRST for immediate UI feedback
      chat.addUserMessage(content);

      // Clear previous tool executions
      setToolExecutions([]);
      setLastError(null);

      if (!client) {
        console.error('[useAgentChat] Cannot send: IPC client not ready');
        // Add error message to chat
        const errorMsgId = chat.startAssistantMessage();
        chat.updateMessageContent(errorMsgId, 'Error: Agent not available. Please run in Electron mode.');
        chat.setMessageError(errorMsgId);
        return;
      }

      if (!isAgentInitialized) {
        // Auto-initialize if workspace is ready
        if (workspacePath && (!validationResult || validationResult.valid)) {
          const initialized = await initializeAgent();
          if (!initialized) {
            console.error('[useAgentChat] Cannot send: agent initialization failed');
            // Add error message to chat
            const errorMsgId = chat.startAssistantMessage();
            chat.updateMessageContent(errorMsgId, 'Error: Could not initialize agent. Please check workspace settings.');
            chat.setMessageError(errorMsgId);
            return;
          }
        } else {
          console.error('[useAgentChat] Cannot send: agent not initialized');
          // Add error message to chat
          const errorMsgId = chat.startAssistantMessage();
          chat.updateMessageContent(errorMsgId, 'Error: Please select a workspace folder first.');
          chat.setMessageError(errorMsgId);
          return;
        }
      }

      try {
        const { requestId } = await client.sendMessage(content, attachments);
        setCurrentRequestId(requestId);
        console.log('[useAgentChat] Message sent, requestId:', requestId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send message';
        console.error('[useAgentChat] Send error:', message);

        // Add error message to chat
        const errorMsgId = chat.startAssistantMessage();
        chat.updateMessageContent(errorMsgId, `Error: ${message}`);
        chat.setMessageError(errorMsgId);
      }
    },
    [
      chat,
      isAgentInitialized,
      workspacePath,
      validationResult,
      initializeAgent,
    ]
  );

  /**
   * Stop the agent's current processing.
   */
  const stopAgent = useCallback(async (): Promise<void> => {
    if (!clientRef.current) {
      return;
    }

    try {
      await clientRef.current.stopAgent();

      // Complete any streaming message
      if (currentMessageIdRef.current) {
        chat.completeMessage(currentMessageIdRef.current);
        currentMessageIdRef.current = null;
      }

      setCurrentRequestId(null);
      console.log('[useAgentChat] Agent stopped');
    } catch (error) {
      console.error('[useAgentChat] Stop error:', error);
    }
  }, [chat]);

  /**
   * Clear the last error.
   */
  const clearError = useCallback((): void => {
    setLastError(null);
    if (connectionState === 'error') {
      setConnectionState(isAgentInitialized ? 'connected' : 'disconnected');
    }
  }, [connectionState, isAgentInitialized]);

  return {
    // Chat state
    messages: chat.messages,
    isStreaming: chat.isStreaming,
    streamingMessageId: chat.streamingMessageId,

    // Agent state
    connectionState,
    isAgentInitialized,
    currentRequestId,
    toolExecutions,
    lastError,
    processingStatus,
    statusMessage,

    // Question state
    currentQuestion: questions.currentQuestion,
    questionQueue: questions.questionQueue,
    isSubmittingAnswer: questions.isSubmitting,
    questionError: questions.lastError,

    // Chat actions (excluding addUserMessage which is replaced by sendMessage)
    startAssistantMessage: chat.startAssistantMessage,
    appendToMessage: chat.appendToMessage,
    completeMessage: chat.completeMessage,
    setMessageError: chat.setMessageError,
    clearMessages: chat.clearMessages,
    updateMessageContent: chat.updateMessageContent,
    setMessages: chat.setMessages,

    // Agent actions
    sendMessage,
    initializeAgent,
    stopAgent,
    clearError,
    loadMessages: chat.setMessages,

    // Question actions
    submitQuestionAnswer: questions.submitAnswer,
    skipQuestion: questions.skipQuestion,
    clearQuestionError: questions.clearError,
  };
}

/**
 * Export types for external use.
 */
export type {
  ChatMessage,
  ChatState,
  FileAttachment,
  PendingQuestion,
};
