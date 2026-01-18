import type { ReactElement } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  useAgentChat,
  type AgentChatState,
  type AgentChatActions,
  type ChatMessage,
} from '@/hooks/useAgentChat';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Message } from './Message';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { QuickActions } from './QuickActions';
import { ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { AttachedFile } from '@/hooks/useFileUpload';
import { ModelSelector } from './ModelSelector';
import type { FileAttachment } from '@/lib/ipc-types';

/**
 * Props for the ChatPane component.
 */
export interface ChatPaneProps {
  className?: string;
}

/**
 * Props for the MessageList component.
 */
interface MessageListProps {
  messages: ChatMessage[];
  streamingMessageId: string | null;
  onScrollToBottom: () => void;
  isAtBottom: boolean;
  onActionSelect: (prompt: string) => void;
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
 */
const MessageList = memo(function MessageList({
  messages,
  streamingMessageId,
  onScrollToBottom,
  isAtBottom,
  onActionSelect,
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
      className="flex-1 overflow-y-auto px-4 scroll-smooth"
      role="log"
      aria-label="Chat messages"
      aria-live="polite"
    >
      {/* Top spacer for virtualization */}
      {messages.length >= 20 && topSpacerHeight > 0 && (
        <div style={{ height: topSpacerHeight }} aria-hidden="true" />
      )}

      {/* Message list */}
      {visibleMessages.length === 0 ? (
        <EmptyState onActionSelect={onActionSelect} />
      ) : (
        visibleMessages.map((message) => {
          const isStreaming = message.id === streamingMessageId;
          return isStreaming ? (
            <StreamingMessage
              key={message.id}
              message={message}
            />
          ) : (
            <Message
              key={message.id}
              message={message}
            />
          );
        })
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
 * Props for the EmptyState component.
 */
interface EmptyStateProps {
  onActionSelect: (prompt: string) => void;
}

/**
 * Empty state shown when there are no messages.
 * Displays a welcome message and quick action tiles.
 */
function EmptyState({ onActionSelect }: EmptyStateProps): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
      <h2 className="text-2xl font-semibold mb-2">
        Let's knock something off your list
      </h2>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        Choose a quick action below or type a message to get started.
      </p>
      <QuickActions
        onActionSelect={onActionSelect}
        actionCount={6}
        className="mb-4"
      />
    </div>
  );
}

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
}: ChatPaneProps): ReactElement {
  const agentChat = useAgentChat();
  const {
    messages,
    streamingMessageId,
    isStreaming,
    connectionState,
    isAgentInitialized,
    lastError,
    sendMessage,
    initializeAgent,
    stopAgent,
    clearError,
  } = agentChat;

  const { workspacePath, validationResult } = useWorkspace();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>(undefined);

  /**
   * Auto-initialize agent when workspace is ready.
   */
  useEffect(() => {
    if (workspacePath && validationResult?.valid && !isAgentInitialized && connectionState === 'disconnected') {
      initializeAgent();
    }
  }, [workspacePath, validationResult, isAgentInitialized, connectionState, initializeAgent]);

  /**
   * Handles quick action selection by setting the input prompt.
   * Uses a key to ensure React re-renders when the same action is clicked twice.
   */
  const handleActionSelect = useCallback((prompt: string): void => {
    // Append a timestamp to force re-render if the same prompt is selected
    setSelectedPrompt(`${prompt}__${Date.now()}`);
  }, []);

  /**
   * Extracts the actual prompt text from the selected prompt (removes timestamp).
   */
  const getPromptText = useCallback((prompt: string | undefined): string | undefined => {
    if (!prompt) return undefined;
    const parts = prompt.split('__');
    parts.pop(); // Remove timestamp
    return parts.join('__');
  }, []);

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
   * Converts AttachedFile to FileAttachment format for IPC.
   */
  const convertAttachments = useCallback((files: AttachedFile[]): FileAttachment[] => {
    return files.map((file) => ({
      name: file.name,
      path: file.path,
      mimeType: file.type,
      size: file.size,
    }));
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
  const isInputDisabled = isStreaming || connectionState === 'connecting';

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header with model selector and connection status */}
      <ChatHeader
        messageCount={messages.length}
        isStreaming={isStreaming}
        connectionState={connectionState}
        onRetryConnection={initializeAgent}
      />

      {/* Error banner */}
      {lastError && (
        <ErrorBanner error={lastError} onDismiss={clearError} />
      )}

      {/* Message list with scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <MessageList
          messages={messages}
          streamingMessageId={streamingMessageId}
          onScrollToBottom={scrollToBottom}
          isAtBottom={isAtBottom}
          onActionSelect={handleActionSelect}
        />
      </div>

      {/* Chat input with file attachment support */}
      <ChatInput
        onSend={handleSend}
        disabled={isInputDisabled}
        placeholder={getPlaceholderText(connectionState, workspacePath)}
        initialMessage={getPromptText(selectedPrompt)}
        key={selectedPrompt}
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
  workspacePath: string | null
): string {
  if (!workspacePath) {
    return 'Select a workspace folder to start...';
  }

  switch (connectionState) {
    case 'connecting':
      return 'Connecting to agent...';
    case 'error':
      return 'Connection error. Try again...';
    case 'disconnected':
      return 'Initializing...';
    default:
      return 'Type a message...';
  }
}

/**
 * Props for the ChatHeader component.
 */
interface ChatHeaderProps {
  messageCount: number;
  isStreaming: boolean;
  connectionState: AgentChatState['connectionState'];
  onRetryConnection: () => void;
}

/**
 * Header for the chat pane showing model selector, connection status, and message count.
 */
function ChatHeader({
  messageCount,
  isStreaming,
  connectionState,
  onRetryConnection,
}: ChatHeaderProps): ReactElement {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ModelSelector disabled={isStreaming || connectionState === 'connecting'} />
          <ConnectionIndicator
            state={connectionState}
            onRetry={onRetryConnection}
          />
        </div>
        {messageCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {messageCount} message{messageCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
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
    <div className="flex-shrink-0 px-4 py-2 bg-destructive/10 border-b border-destructive/20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{error.code}:</span>
          <span className="truncate">{error.message}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="flex-shrink-0 h-6 px-2 text-xs"
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
