import type { ReactElement } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useAgentChat,
  type AgentChatState,
  type AgentChatActions,
  type ChatMessage,
  type PendingQuestion,
  type ToolExecution,
} from '@/hooks/useAgentChat';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePendingTask } from '@/contexts/PendingTaskContext';
import { Message } from './Message';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { QuestionPrompt } from './QuestionPrompt';
import { ToolCallGroup } from './ToolCallBlock';
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { AttachedFile } from '@/hooks/useFileUpload';
import type { FileAttachment } from '@/lib/ipc-types';

/**
 * Props for the ChatPane component.
 */
export interface ChatPaneProps {
  className?: string;
  /** Active session ID for syncing */
  activeSessionId?: string | null;
  /** Messages from the active session */
  sessionMessages?: ChatMessage[];
  /** Callback when messages change (for syncing back to session) */
  onMessagesChange?: (messages: ChatMessage[]) => void;
  /** Workspace path for the current session */
  sessionWorkspacePath?: string | null;
  /** Callback when user wants to change workspace */
  onWorkspaceChange?: () => void;
}

/**
 * Props for the MessageList component.
 */
interface MessageListProps {
  messages: ChatMessage[];
  streamingMessageId: string | null;
  toolExecutions: ToolExecution[];
  onScrollToBottom: () => void;
  isAtBottom: boolean;
}

/**
 * Threshold in pixels for considering the user "at bottom" of the chat.
 */
const SCROLL_THRESHOLD = 100;

/**
 * Number of messages to render before and after the visible area.
 * This provides smooth scrolling without rendering all messages.
 */
const VIRTUALIZATION_BUFFER = 5;

/**
 * Estimated height of a single message in pixels.
 * Used for virtualization calculations.
 */
const ESTIMATED_MESSAGE_HEIGHT = 100;

/**
 * Renders the list of messages with virtualization for performance.
 * Tool executions are displayed inline after assistant messages.
 */
const MessageList = memo(function MessageList({
  messages,
  streamingMessageId,
  toolExecutions,
  onScrollToBottom,
  isAtBottom,
}: MessageListProps): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: messages.length });

  /**
   * Updates the visible range based on scroll position.
   * Implements simple virtualization for long message histories.
   */
  const updateVisibleRange = useCallback((): void => {
    const container = containerRef.current;
    if (!container || messages.length < 20) {
      // Skip virtualization for small lists
      setVisibleRange({ start: 0, end: messages.length });
      return;
    }

    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    const startIndex = Math.max(
      0,
      Math.floor(scrollTop / ESTIMATED_MESSAGE_HEIGHT) - VIRTUALIZATION_BUFFER
    );
    const endIndex = Math.min(
      messages.length,
      Math.ceil((scrollTop + containerHeight) / ESTIMATED_MESSAGE_HEIGHT) + VIRTUALIZATION_BUFFER
    );

    setVisibleRange({ start: startIndex, end: endIndex });
  }, [messages.length]);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = (): void => {
      updateVisibleRange();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [updateVisibleRange]);

  // Update visible range when messages change
  useEffect(() => {
    updateVisibleRange();
  }, [messages.length, updateVisibleRange]);

  // Calculate spacers for virtualization
  const topSpacerHeight = visibleRange.start * ESTIMATED_MESSAGE_HEIGHT;
  const bottomSpacerHeight = Math.max(
    0,
    (messages.length - visibleRange.end) * ESTIMATED_MESSAGE_HEIGHT
  );

  // Determine which messages to render
  const visibleMessages = messages.length < 20
    ? messages
    : messages.slice(visibleRange.start, visibleRange.end);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto scroll-smooth"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Top spacer for virtualization */}
      {messages.length >= 20 && topSpacerHeight > 0 && (
        <div style={{ height: topSpacerHeight }} aria-hidden="true" />
      )}

      {/* Message list with inline tool executions */}
      {visibleMessages.length > 0 && (
        visibleMessages.map((message, index) => {
          const isStreaming = message.id === streamingMessageId;
          const isLastAssistantMessage = message.role === 'assistant' &&
            (index === visibleMessages.length - 1 ||
             visibleMessages[index + 1]?.role === 'user');

          return (
            <div key={message.id}>
              {isStreaming ? (
                <StreamingMessage message={message} />
              ) : (
                <Message message={message} />
              )}
              {/* Show tool executions after the last assistant message (or streaming) */}
              {(isLastAssistantMessage || isStreaming) && toolExecutions.length > 0 && (
                <div className="px-4 pb-2">
                  <ToolCallGroup executions={toolExecutions} />
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Show tool executions even when there are no messages yet but tools are running */}
      {visibleMessages.length === 0 && toolExecutions.length > 0 && (
        <div className="px-4 py-2">
          <ToolCallGroup executions={toolExecutions} />
        </div>
      )}

      {/* Bottom spacer for virtualization */}
      {messages.length >= 20 && bottomSpacerHeight > 0 && (
        <div style={{ height: bottomSpacerHeight }} aria-hidden="true" />
      )}

      {/* Scroll to bottom button */}
      {!isAtBottom && messages.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 shadow-lg z-10"
          onClick={onScrollToBottom}
        >
          <ChevronDown className="w-4 h-4 mr-1" />
          New messages
        </Button>
      )}
    </div>
  );
});

/**
 * Chat pane component displaying message history with streaming support.
 * Features:
 * - Message history with user/assistant distinction
 * - Streaming message support with cursor animation
 * - Auto-scroll to bottom on new messages
 * - Virtualized scrolling for long histories
 * - Input with file attachment support
 * - Agent backend integration with IPC
 * - Connection state management
 * - Responsive layout
 */
export const ChatPane = memo(function ChatPane({
  className,
  activeSessionId,
  sessionMessages,
  onMessagesChange,
  sessionWorkspacePath,
  onWorkspaceChange,
}: ChatPaneProps): ReactElement {
  const agentChat = useAgentChat();
  const {
    messages,
    streamingMessageId,
    isStreaming,
    connectionState,
    isAgentInitialized,
    lastError,
    currentQuestion,
    isSubmittingAnswer,
    questionError,
    toolExecutions,
    processingStatus,
    statusMessage,
    sendMessage,
    initializeAgent,
    stopAgent,
    clearError,
    submitQuestionAnswer,
    skipQuestion,
    loadMessages,
  } = agentChat;

  // Track the last session ID to detect session changes
  const lastSessionIdRef = useRef<string | null>(null);

  /**
   * Load session messages when activeSessionId changes.
   */
  useEffect(() => {
    if (activeSessionId && activeSessionId !== lastSessionIdRef.current) {
      lastSessionIdRef.current = activeSessionId;
      // Load messages from the session
      if (sessionMessages) {
        loadMessages(sessionMessages);
      }
    }
  }, [activeSessionId, sessionMessages, loadMessages]);

  /**
   * Sync messages back to session when they change.
   * Syncs immediately to ensure user messages appear right away.
   */
  useEffect(() => {
    console.log('[ChatPane] Message sync effect - messages:', messages.length, 'hasCallback:', !!onMessagesChange, 'sessionId:', activeSessionId);
    if (onMessagesChange && messages.length > 0) {
      console.log('[ChatPane] Calling onMessagesChange with', messages.length, 'messages');
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange, activeSessionId]);

  const { workspacePath, validationResult } = useWorkspace();
  const { pendingTask, clearPendingTask } = usePendingTask();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Track which pending task we've already sent to prevent double-sending
  // when sendMessage callback changes during the effect
  const lastSentTaskRef = useRef<number | null>(null);
  // Track when we're processing a pending task to show loading state
  const [isProcessingTask, setIsProcessingTask] = useState(false);

  /**
   * Converts AttachedFile to FileAttachment format for IPC.
   * In Electron, File objects have a path property from file dialogs.
   * Defined early so it can be used in effects below.
   */
  const convertAttachments = useCallback((files: AttachedFile[]): FileAttachment[] => {
    return files.map((file) => ({
      name: file.name,
      path: file.filePath || file.name, // Use actual file path if available
      mimeType: file.type,
      size: file.size,
    }));
  }, []);

  /**
   * Auto-initialize agent when ready.
   * Workspace is optional - agent will use default artifacts folder if not provided.
   */
  useEffect(() => {
    // Initialize if not yet initialized and not currently connecting
    // Workspace validation only matters if a workspace is actually selected
    const canInitialize = !isAgentInitialized && connectionState === 'disconnected';
    const workspaceValid = !workspacePath || !validationResult || validationResult.valid;

    if (canInitialize && workspaceValid) {
      initializeAgent();
    }
  }, [workspacePath, validationResult, isAgentInitialized, connectionState, initializeAgent]);

  /**
   * Send pending task when it's set from WelcomeScreen.
   * This handles the transition from WelcomeScreen to ChatPane.
   * We send even if not connected - sendMessage will handle showing appropriate errors.
   * Uses lastSentTaskRef to prevent double-sending when sendMessage callback changes.
   */
  useEffect(() => {
    if (pendingTask && !isStreaming) {
      // Check if we've already sent this specific task (by timestamp)
      if (lastSentTaskRef.current === pendingTask.timestamp) {
        return;
      }
      // Mark this task as sent BEFORE calling sendMessage to prevent race conditions
      lastSentTaskRef.current = pendingTask.timestamp;
      // Show loading state while processing
      setIsProcessingTask(true);
      // Convert attachments if present
      const fileAttachments = pendingTask.attachments
        ? convertAttachments(pendingTask.attachments)
        : undefined;
      // Send the pending task message with attachments (will show error if agent unavailable)
      sendMessage(pendingTask.message, fileAttachments);
      // NOTE: Don't clear pendingTask here! Clearing it immediately causes showWelcome
      // to become true, which unmounts ChatPane before agent response arrives.
      // pendingTask will be cleared when messages arrive (see effect below).
      console.log('[ChatPane] Sent pending task:', pendingTask.message, 'attachments:', pendingTask.attachments?.length ?? 0);
    }
  }, [pendingTask, isStreaming, sendMessage, convertAttachments]);

  /**
   * Clear processing state and pending task when messages arrive.
   * This ensures ChatPane stays mounted until messages are received.
   */
  useEffect(() => {
    if (messages.length > 0) {
      if (isProcessingTask) {
        setIsProcessingTask(false);
      }
      // Clear pending task now that messages have arrived
      if (pendingTask) {
        clearPendingTask();
        console.log('[ChatPane] Cleared pending task after messages arrived');
      }
    }
  }, [messages.length, isProcessingTask, pendingTask, clearPendingTask]);

  /**
   * Scrolls to the bottom of the message list.
   */
  const scrollToBottom = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  /**
   * Checks if the user is scrolled near the bottom.
   */
  const checkIfAtBottom = useCallback((): void => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setIsAtBottom(distanceFromBottom < SCROLL_THRESHOLD);
  }, []);

  /**
   * Handles sending a message from the input.
   * Sends to agent backend with file attachments.
   */
  const handleSend = useCallback(
    async (message: string, attachments: AttachedFile[]): Promise<void> => {
      if (!message.trim() && attachments.length === 0) {
        return;
      }

      const fileAttachments = convertAttachments(attachments);
      await sendMessage(message, fileAttachments.length > 0 ? fileAttachments : undefined);
    },
    [sendMessage, convertAttachments]
  );

  /**
   * Handles stopping the agent.
   */
  const handleStop = useCallback(async (): Promise<void> => {
    await stopAgent();
  }, [stopAgent]);

  /**
   * Handles submitting an answer to the current question.
   */
  const handleQuestionSubmit = useCallback(
    async (selectedValues: string[]): Promise<void> => {
      await submitQuestionAnswer(selectedValues);
    },
    [submitQuestionAnswer]
  );

  /**
   * Handles skipping the current question.
   */
  const handleQuestionSkip = useCallback(async (): Promise<void> => {
    await skipQuestion();
  }, [skipQuestion]);

  // Auto-scroll to bottom when new messages arrive (if user is at bottom)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages.length, isAtBottom, scrollToBottom]);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && isAtBottom) {
      scrollToBottom();
    }
  }, [isStreaming, isAtBottom, scrollToBottom]);

  // Track scroll position
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', checkIfAtBottom, { passive: true });
    return () => container.removeEventListener('scroll', checkIfAtBottom);
  }, [checkIfAtBottom]);

  // Determine if input should be disabled
  // Disable input when streaming, connecting, or when a question is pending
  const isInputDisabled = isStreaming || connectionState === 'connecting' || currentQuestion !== null;

  return (
    <div className={cn('flex flex-col h-full bg-cowork-bg', className)}>
      {/* Connection status indicator - minimal, only shown when not connected */}
      {connectionState !== 'connected' && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-cowork-border bg-cowork-card-bg">
          <ConnectionIndicator
            state={connectionState}
            onRetry={initializeAgent}
          />
        </div>
      )}

      {/* Error banner */}
      {lastError && (
        <ErrorBanner error={lastError} onDismiss={clearError} />
      )}

      {/* Message list with scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {/* Show status indicator when processing */}
        {processingStatus && processingStatus !== 'idle' && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-cowork-border bg-cowork-card-bg">
            <Loader2 className="w-4 h-4 animate-spin text-cowork-accent" />
            <p className="text-sm text-cowork-text-muted">{statusMessage || 'Processing...'}</p>
          </div>
        )}

        {/* Show loading state when processing pending task with no messages yet */}
        {messages.length === 0 && isProcessingTask && !processingStatus ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cowork-text-muted mb-2" />
            <p className="text-sm text-cowork-text-muted">Processing your request...</p>
          </div>
        ) : (
          <MessageList
            messages={messages}
            streamingMessageId={streamingMessageId}
            toolExecutions={toolExecutions}
            onScrollToBottom={scrollToBottom}
            isAtBottom={isAtBottom}
          />
        )}

        {/* Question prompt - displayed at the end of message list */}
        {currentQuestion && (
          <div className="px-4">
            <QuestionPrompt
              question={currentQuestion}
              onSubmit={handleQuestionSubmit}
              onSkip={handleQuestionSkip}
              isSubmitting={isSubmittingAnswer}
              error={questionError}
            />
          </div>
        )}
      </div>

      {/* Chat input with file attachment support */}
      <ChatInput
        onSend={handleSend}
        disabled={isInputDisabled}
        placeholder={getPlaceholderText(connectionState, workspacePath, currentQuestion)}
        workspacePath={sessionWorkspacePath}
        onWorkspaceChange={onWorkspaceChange}
      />

      {/* Stop button when streaming */}
      {isStreaming && (
        <div className="absolute bottom-20 right-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStop}
            className="shadow-lg"
          >
            Stop
          </Button>
        </div>
      )}
    </div>
  );
});

/**
 * Get placeholder text based on connection state.
 */
function getPlaceholderText(
  connectionState: AgentChatState['connectionState'],
  workspacePath: string | null,
  currentQuestion: PendingQuestion | null
): string {
  if (currentQuestion) {
    return 'Please answer the question above...';
  }

  switch (connectionState) {
    case 'connecting':
      return 'Connecting to agent...';
    case 'error':
      return 'Connection error. Try again...';
    case 'disconnected':
      return 'Initializing...';
    default:
      // Show hint about workspace if not selected
      return workspacePath ? 'Type a message...' : 'Type a message (using default workspace)...';
  }
}


/**
 * Props for the ConnectionIndicator component.
 */
interface ConnectionIndicatorProps {
  state: AgentChatState['connectionState'];
  onRetry: () => void;
}

/**
 * Shows current connection state with visual indicator.
 */
function ConnectionIndicator({ state, onRetry }: ConnectionIndicatorProps): ReactElement | null {
  switch (state) {
    case 'connecting':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Connecting...</span>
        </div>
      );
    case 'connected':
      return (
        <div className="flex items-center gap-1.5 text-xs text-green-600">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>Connected</span>
        </div>
      );
    case 'error':
      return (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-destructive hover:underline"
        >
          <AlertCircle className="w-3 h-3" />
          <span>Connection error - Click to retry</span>
        </button>
      );
    case 'disconnected':
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-gray-400" />
          <span>Disconnected</span>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Props for the ErrorBanner component.
 */
interface ErrorBannerProps {
  error: { code: string; message: string; recoverable: boolean };
  onDismiss: () => void;
}

/**
 * Error banner shown when agent encounters an error.
 */
function ErrorBanner({ error, onDismiss }: ErrorBannerProps): ReactElement {
  return (
    <div className="flex-shrink-0 px-4 py-2 bg-red-50 border-b border-red-200">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error.code}:</span>
          <span className="truncate">{error.message}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="flex-shrink-0 h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-100"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/**
 * Export chat state and actions types for external use.
 */
export type { AgentChatState, AgentChatActions, ChatMessage };
