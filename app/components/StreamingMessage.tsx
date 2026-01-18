import type { ReactElement } from 'react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/hooks/useChat';
import { Message } from './Message';

/**
 * Props for the StreamingMessage component.
 */
export interface StreamingMessageProps {
  message: ChatMessage;
  className?: string;
}

/**
 * Blinking cursor component for streaming messages.
 */
function StreamingCursor(): ReactElement {
  return (
    <span
      className="inline-block w-2 h-4 ml-0.5 bg-foreground animate-pulse"
      aria-hidden="true"
    />
  );
}

/**
 * Renders a streaming assistant message with a blinking cursor.
 * Shows a typing indicator when content is empty.
 */
export const StreamingMessage = memo(function StreamingMessage({
  message,
  className,
}: StreamingMessageProps): ReactElement {
  const isStreaming = message.status === 'streaming';
  const hasContent = message.content.length > 0;

  // If not streaming or complete, render as normal message
  if (!isStreaming) {
    return <Message message={message} className={className} />;
  }

  // Show typing indicator when no content yet
  if (!hasContent) {
    return (
      <div className={cn('flex gap-3 py-4', className)} role="article" aria-label="Assistant is typing">
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground"
          aria-hidden="true"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Typing indicator */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">Claude</span>
            <span className="text-xs text-muted-foreground">typing...</span>
          </div>
          <div className="rounded-lg px-4 py-3 bg-muted inline-block">
            <TypingIndicator />
          </div>
        </div>
      </div>
    );
  }

  // Render message with cursor at the end
  return (
    <div className={cn('flex gap-3 py-4', className)} role="article" aria-label="Assistant message (streaming)">
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground"
        aria-hidden="true"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </div>

      {/* Message content with cursor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">Claude</span>
          <span className="text-xs text-muted-foreground">
            {new Date(message.timestamp).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className="rounded-lg px-4 py-2 bg-muted text-foreground max-w-[85%]">
          <div className="prose prose-sm dark:prose-invert max-w-none break-words">
            <span className="whitespace-pre-wrap">{message.content}</span>
            <StreamingCursor />
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * Animated typing indicator with three bouncing dots.
 */
function TypingIndicator(): ReactElement {
  return (
    <div className="flex items-center gap-1" aria-label="Typing">
      <span
        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="w-2 h-2 rounded-full bg-foreground/60 animate-bounce"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}
