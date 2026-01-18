import type { ReactElement } from 'react';
import { memo, useMemo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, WrapText } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Props for the TextPreview component.
 */
export interface TextPreviewProps {
  /**
   * Text content to display.
   */
  content: string;

  /**
   * Whether to show line numbers.
   */
  showLineNumbers?: boolean;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Text preview component for displaying plain text files.
 *
 * Features:
 * - Line numbers (optional)
 * - Copy to clipboard button
 * - Word wrap toggle
 * - Line count display
 * - Character count display
 */
export const TextPreview = memo(function TextPreview({
  content,
  showLineNumbers = true,
  className,
}: TextPreviewProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);

  const lines = useMemo(() => content.split('\n'), [content]);
  const lineCount = lines.length;
  const charCount = content.length;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  const handleToggleWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

  const lineNumberWidth = useMemo(() => {
    const maxLineNumber = lines.length;
    return Math.max(2, String(maxLineNumber).length);
  }, [lines.length]);

  return (
    <div
      className={cn('flex flex-col h-full', className)}
      data-testid="text-preview"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{lineCount.toLocaleString()} lines</span>
          <span className="text-border">|</span>
          <span>{charCount.toLocaleString()} characters</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={wordWrap ? 'secondary' : 'ghost'}
            size="sm"
            className="h-8 px-2"
            onClick={handleToggleWrap}
            aria-label={wordWrap ? 'Disable word wrap' : 'Enable word wrap'}
          >
            <WrapText className="w-4 h-4 mr-1" />
            <span className="text-xs">Wrap</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy text'}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-1 text-green-500" />
                <span className="text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <pre
          className={cn(
            'p-4 text-sm font-mono leading-relaxed',
            !wordWrap && 'whitespace-pre overflow-x-auto'
          )}
        >
          <code>
            {lines.map((line, index) => (
              <div
                key={index}
                className={cn('flex', wordWrap && 'flex-wrap')}
              >
                {showLineNumbers && (
                  <span
                    className="select-none text-muted-foreground text-right pr-4 border-r border-border mr-4 flex-shrink-0"
                    style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                  >
                    {index + 1}
                  </span>
                )}
                <span
                  className={cn(
                    'flex-1',
                    wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'
                  )}
                >
                  {line || ' '}
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
});
