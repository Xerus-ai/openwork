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
  initializeIpcClient,
  cleanupIpcClient,
  type AgentEventHandlers,
  type IpcClient,
} from '@/lib/ipc-client';
import type {
  AgentMessageChunk,
  AgentMessageComplete,
  AgentToolUse,
  AgentToolResult,
  AgentQuestion,
  AgentError,
  FileAttachment,
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
}

/**
 * Hook for managing agent chat integration.
 *
 * Connects the chat UI to the agent backend through IPC,
 * handling initialization, message streaming, and tool executions.
 *
 * @returns Agent chat state and actions
 *
 * @example
 * const {
 *   messages,
 *   isStreaming,
 *   connectionState,
 *   sendMessage,
 *   initializeAgent,
 * } = useAgentChat();
 *
 * // Initialize agent when workspace is selected
 * await initializeAgent();
 *
 * // Send a message
 * await sendMessage("Create a document about React");
 */
export function useAgentChat(): AgentChatState & AgentChatActions {
  const chat = useChat();
  const { selectedModel } = useModel();
  const { workspacePath, validationResult } = useWorkspace();
  const questions = useQuestions();

  const [connectionState, setConnectionState] = useState<AgentConnectionState>('disconnected');
  const [isAgentInitialized, setIsAgentInitialized] = useState(false);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [toolExecutions, setToolExecutions] = useState<ToolExecution[]>([]);
  const [lastError, setLastError] = useState<AgentError | null>(null);

  const clientRef = useRef<IpcClient | null>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  /**
   * Handle streaming message chunks from the agent.
   */
  const handleMessageChunk = useCallback(
    (chunk: AgentMessageChunk) => {
      if (!currentMessageIdRef.current) {
        // Start a new assistant message if we don't have one
        const messageId = chat.startAssistantMessage();
        currentMessageIdRef.current = messageId;
      }

      // Append content to the current message
      chat.appendToMessage(currentMessageIdRef.current, chunk.content);
    },
    [chat]
  );

  /**
   * Handle message completion from the agent.
   */
  const handleMessageComplete = useCallback(
    (message: AgentMessageComplete) => {
      if (currentMessageIdRef.current) {
        // Update the final message content
        chat.updateMessageContent(currentMessageIdRef.current, message.content);
        chat.completeMessage(currentMessageIdRef.current);
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
    [chat]
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

  /**
   * Handle agent errors.
   */
  const handleError = useCallback(
    (error: AgentError) => {
      console.error('[useAgentChat] Agent error:', error);
      setLastError(error);

      // Mark current message as error if streaming
      if (currentMessageIdRef.current) {
        chat.setMessageError(currentMessageIdRef.current);
        currentMessageIdRef.current = null;
      }

      // Update connection state for non-recoverable errors
      if (!error.recoverable) {
        setConnectionState('error');
      }

      // Clear current request
      setCurrentRequestId(null);
    },
    [chat]
  );

  /**
   * Handle incoming questions from the agent.
   */
  const handleQuestion = useCallback(
    (question: AgentQuestion) => {
      console.log('[useAgentChat] Received question:', question.questionId);
      questions.handleQuestion(question);
    },
    [questions]
  );

  /**
   * Initialize the IPC client with event handlers.
   */
  useEffect(() => {
    const handlers: AgentEventHandlers = {
      onMessageChunk: handleMessageChunk,
      onMessageComplete: handleMessageComplete,
      onToolUse: handleToolUse,
      onToolResult: handleToolResult,
      onQuestion: handleQuestion,
      onError: handleError,
    };

    clientRef.current = initializeIpcClient(handlers);

    return () => {
      cleanupIpcClient();
      clientRef.current = null;
    };
  }, [handleMessageChunk, handleMessageComplete, handleToolUse, handleToolResult, handleQuestion, handleError]);

  /**
   * Initialize the agent with workspace and model.
   */
  const initializeAgent = useCallback(async (): Promise<boolean> => {
    if (!workspacePath) {
      console.warn('[useAgentChat] Cannot initialize: no workspace selected');
      return false;
    }

    if (validationResult && !validationResult.valid) {
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
      const response = await clientRef.current.initAgent(
        workspacePath,
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
   * Re-initialize when model changes (if already initialized).
   */
  useEffect(() => {
    if (isAgentInitialized && workspacePath) {
      // Re-initialize with new model
      initializeAgent();
    }
  }, [selectedModel]); // Intentionally excluding other deps to avoid loops

  /**
   * Send a message to the agent.
   */
  const sendMessage = useCallback(
    async (content: string, attachments?: FileAttachment[]): Promise<void> => {
      if (!clientRef.current) {
        console.error('[useAgentChat] Cannot send: IPC client not ready');
        return;
      }

      if (!isAgentInitialized) {
        // Auto-initialize if workspace is ready
        if (workspacePath && (!validationResult || validationResult.valid)) {
          const initialized = await initializeAgent();
          if (!initialized) {
            console.error('[useAgentChat] Cannot send: agent initialization failed');
            return;
          }
        } else {
          console.error('[useAgentChat] Cannot send: agent not initialized');
          return;
        }
      }

      if (chat.isStreaming) {
        console.warn('[useAgentChat] Cannot send: already streaming');
        return;
      }

      // Add user message to chat
      chat.addUserMessage(content);

      // Clear previous tool executions
      setToolExecutions([]);
      setLastError(null);

      try {
        const { requestId } = await clientRef.current.sendMessage(content, attachments);
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

    // Agent actions
    sendMessage,
    initializeAgent,
    stopAgent,
    clearError,

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
