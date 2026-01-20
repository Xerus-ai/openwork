import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ChatMessage, MessageRole } from '@/hooks/useChat';

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
 * Renders a single chat message with user/assistant styling.
 * User messages: beige/tan bubble aligned right
 * Assistant messages: plain text on white/transparent background
 * Supports basic markdown-like formatting for assistant messages.
 */
export const Message = memo(function Message({
  message,
  className,
}: MessageProps): ReactElement {
  const { role, content, status } = message;
  const isUser = role === 'user';

  const formattedContent = useMemo(() => {
    if (isUser || !content) {
      return content;
    }
    return renderFormattedText(content);
  }, [content, isUser]);

  // User message: beige bubble aligned right
  if (isUser) {
    return (
      <div
        className={cn('flex justify-end py-2 px-4', className)}
        role="article"
        aria-label="User message"
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 max-w-[80%]',
            'bg-[#E8E4D9] text-cowork-text',
            status === 'error' && 'border border-destructive'
          )}
        >
          <p className="whitespace-pre-wrap break-words text-sm">{content}</p>
        </div>
      </div>
    );
  }

  // Assistant message: plain text, no bubble
  return (
    <div
      className={cn('py-2 px-4', className)}
      role="article"
      aria-label="Assistant message"
    >
      <div
        className={cn(
          'text-cowork-text text-sm',
          status === 'error' && 'text-destructive'
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none break-words">
          {formattedContent}
        </div>
      </div>
      {/* Error indicator */}
      {status === 'error' && (
        <span className="text-xs text-destructive mt-1 block">
          Message failed to complete
        </span>
      )}
    </div>
  );
});
