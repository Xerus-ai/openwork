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
      className="inline-block w-0.5 h-4 ml-0.5 bg-cowork-text animate-pulse"
      aria-hidden="true"
    />
  );
}

/**
 * Renders a streaming assistant message with a blinking cursor.
 * Shows a typing indicator when content is empty.
 * Matches the reference design with plain text (no bubble).
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
      <div className={cn('py-2 px-4', className)} role="article" aria-label="Assistant is typing">
        <TypingIndicator />
      </div>
    );
  }

  // Render message with cursor at the end (plain text style like reference)
  return (
    <div className={cn('py-2 px-4', className)} role="article" aria-label="Assistant message (streaming)">
      <div className="text-cowork-text text-sm">
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          <span className="whitespace-pre-wrap">{message.content}</span>
          <StreamingCursor />
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
