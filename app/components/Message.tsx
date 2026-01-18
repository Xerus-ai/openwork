import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage, MessageRole } from '@/hooks/useChat';
import { User, Bot } from 'lucide-react';

/**
 * Props for the Message component.
 */
export interface MessageProps {
  message: ChatMessage;
  className?: string;
}

/**
 * Formats a timestamp for display.
 * Shows time only for recent messages, date for older ones.
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Simple markdown-like text renderer.
 * Handles basic formatting: bold, italic, code, and code blocks.
 * Full markdown support will be added when backend integration is complete.
 */
function renderFormattedText(text: string): ReactElement[] {
  const elements: ReactElement[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  lines.forEach((line, lineIndex) => {
    // Check for code block start/end
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockContent = [];
      } else {
        // End of code block
        elements.push(
          <pre
            key={`code-block-${lineIndex}`}
            className="my-2 p-3 rounded-md bg-muted font-mono text-sm overflow-x-auto"
          >
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockContent = [];
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      return;
    }

    // Process inline formatting
    const processedLine = processInlineFormatting(line, lineIndex);
    elements.push(
      <span key={`line-${lineIndex}`}>
        {processedLine}
        {lineIndex < lines.length - 1 && <br />}
      </span>
    );
  });

  // Handle unclosed code block
  if (inCodeBlock && codeBlockContent.length > 0) {
    elements.push(
      <pre
        key="code-block-unclosed"
        className="my-2 p-3 rounded-md bg-muted font-mono text-sm overflow-x-auto"
      >
        <code>{codeBlockContent.join('\n')}</code>
      </pre>
    );
  }

  return elements;
}

/**
 * Processes inline formatting like bold, italic, and inline code.
 */
function processInlineFormatting(text: string, lineKey: number): ReactElement[] {
  const elements: ReactElement[] = [];
  // Regex to match: **bold**, *italic*, `code`
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let partIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      elements.push(
        <span key={`${lineKey}-${partIndex++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    const matchText = match[0];
    if (matchText.startsWith('**') && matchText.endsWith('**')) {
      // Bold
      elements.push(
        <strong key={`${lineKey}-${partIndex++}`}>
          {matchText.slice(2, -2)}
        </strong>
      );
    } else if (matchText.startsWith('*') && matchText.endsWith('*')) {
      // Italic
      elements.push(
        <em key={`${lineKey}-${partIndex++}`}>
          {matchText.slice(1, -1)}
        </em>
      );
    } else if (matchText.startsWith('`') && matchText.endsWith('`')) {
      // Inline code
      elements.push(
        <code
          key={`${lineKey}-${partIndex++}`}
          className="px-1 py-0.5 rounded bg-muted font-mono text-sm"
        >
          {matchText.slice(1, -1)}
        </code>
      );
    }

    lastIndex = match.index + matchText.length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(
      <span key={`${lineKey}-${partIndex++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  // Return just the text if no formatting was found
  if (elements.length === 0) {
    return [<span key={`${lineKey}-plain`}>{text}</span>];
  }

  return elements;
}

/**
 * Avatar component for message authors.
 */
function MessageAvatar({ role }: { role: MessageRole }): ReactElement {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground'
      )}
      aria-hidden="true"
    >
      {isUser ? (
        <User className="w-4 h-4" />
      ) : (
        <Bot className="w-4 h-4" />
      )}
    </div>
  );
}

/**
 * Renders a single chat message with user/assistant styling.
 * Supports basic markdown-like formatting for assistant messages.
 */
export const Message = memo(function Message({
  message,
  className,
}: MessageProps): ReactElement {
  const { role, content, timestamp, status } = message;
  const isUser = role === 'user';

  const formattedContent = useMemo(() => {
    if (isUser || !content) {
      return content;
    }
    return renderFormattedText(content);
  }, [content, isUser]);

  return (
    <div
      className={cn(
        'flex gap-3 py-4',
        isUser && 'flex-row-reverse',
        className
      )}
      role="article"
      aria-label={`${role} message`}
    >
      <MessageAvatar role={role} />

      <div
        className={cn(
          'flex-1 min-w-0',
          isUser && 'flex flex-col items-end'
        )}
      >
        {/* Message header */}
        <div
          className={cn(
            'flex items-center gap-2 mb-1',
            isUser && 'flex-row-reverse'
          )}
        >
          <span className="text-sm font-medium">
            {isUser ? 'You' : 'Claude'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(timestamp)}
          </span>
        </div>

        {/* Message content */}
        <div
          className={cn(
            'rounded-lg px-4 py-2 max-w-[85%]',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground',
            status === 'error' && 'border border-destructive'
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              {formattedContent}
            </div>
          )}
        </div>

        {/* Error indicator */}
        {status === 'error' && (
          <span className="text-xs text-destructive mt-1">
            Message failed to complete
          </span>
        )}
      </div>
    </div>
  );
});
