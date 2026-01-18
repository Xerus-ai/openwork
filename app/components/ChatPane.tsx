import type { ReactElement } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useChat, type ChatMessage, type ChatState, type ChatActions } from '@/hooks/useChat';
import { Message } from './Message';
import { StreamingMessage } from './StreamingMessage';
import { ChatInput } from './ChatInput';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui';
import type { AttachedFile } from '@/hooks/useFileUpload';

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
        <EmptyState />
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
 * Empty state shown when there are no messages.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-4">
      <div className="text-4xl mb-4 text-muted-foreground">~</div>
      <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        Type a message below to start chatting with Claude.
        You can ask questions, request tasks, or explore ideas together.
      </p>
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
 * - Responsive layout
 */
export const ChatPane = memo(function ChatPane({
  className,
}: ChatPaneProps): ReactElement {
  const chatState = useChat();
  const { messages, streamingMessageId, isStreaming, addUserMessage } = chatState;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

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
   * Currently adds the user message to chat history.
   * File attachments will be handled in task 041.
   */
  const handleSend = useCallback(
    (message: string, attachments: AttachedFile[]): void => {
      // Build message content
      let content = message;

      // Append attachment info to message for now
      // Full attachment handling comes in task 041
      if (attachments.length > 0) {
        const attachmentNames = attachments.map((f) => f.name).join(', ');
        if (content) {
          content += `\n\n[Attachments: ${attachmentNames}]`;
        } else {
          content = `[Attachments: ${attachmentNames}]`;
        }
      }

      if (content) {
        addUserMessage(content);
      }
    },
    [addUserMessage]
  );

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

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <ChatHeader messageCount={messages.length} />

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
        />
      </div>

      {/* Chat input with file attachment support */}
      <ChatInput
        onSend={handleSend}
        disabled={isStreaming}
        placeholder="Type a message..."
      />
    </div>
  );
});

/**
 * Header for the chat pane showing title and message count.
 */
function ChatHeader({ messageCount }: { messageCount: number }): ReactElement {
  return (
    <div className="flex-shrink-0 px-4 py-3 border-b">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Chat</h2>
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
 * Export chat state and actions types for external use.
 */
export type { ChatState, ChatActions, ChatMessage };
