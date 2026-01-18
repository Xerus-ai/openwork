import type { ReactElement } from 'react';
import { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

/**
 * Props for the MarkdownPreview component.
 */
export interface MarkdownPreviewProps {
  /**
   * Markdown content to render.
   */
  content: string;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Custom components for rendering markdown elements with Tailwind styling.
 */
const markdownComponents = {
  // Headings
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-2xl font-bold mb-4 mt-6 pb-2 border-b">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-xl font-semibold mb-3 mt-5 pb-1 border-b">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4">{children}</h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-base font-semibold mb-2 mt-3">{children}</h4>
  ),
  h5: ({ children }: { children?: React.ReactNode }) => (
    <h5 className="text-sm font-semibold mb-1 mt-2">{children}</h5>
  ),
  h6: ({ children }: { children?: React.ReactNode }) => (
    <h6 className="text-sm font-medium mb-1 mt-2 text-muted-foreground">{children}</h6>
  ),

  // Paragraphs and text
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-4 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-4 ml-6 list-disc space-y-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-4 ml-6 list-decimal space-y-1">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Links
  a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
    <a
      href={href}
      className="text-blue-400 hover:text-blue-300 underline decoration-dotted"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),

  // Code
  code: ({
    inline,
    className,
    children,
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 bg-muted rounded text-sm font-mono text-cyan-400">
          {children}
        </code>
      );
    }
    return (
      <code className={cn('font-mono text-sm', className)}>{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="mb-4 p-4 bg-muted/50 rounded-lg overflow-x-auto border">
      {children}
    </pre>
  ),

  // Blockquotes
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="mb-4 pl-4 border-l-4 border-muted-foreground/30 italic text-muted-foreground">
      {children}
    </blockquote>
  ),

  // Tables (GFM)
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-border">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-4 py-2 text-left font-semibold border-r border-border last:border-r-0">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-4 py-2 border-r border-border last:border-r-0">
      {children}
    </td>
  ),

  // Horizontal rule
  hr: () => <hr className="my-6 border-t border-border" />,

  // Images
  img: ({ src, alt }: { src?: string; alt?: string }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
    />
  ),

  // Task lists (GFM)
  input: ({ checked }: { checked?: boolean }) => (
    <input
      type="checkbox"
      checked={checked}
      readOnly
      className="mr-2 rounded border-border"
    />
  ),
};

/**
 * Markdown preview component with GitHub Flavored Markdown support.
 *
 * Features:
 * - Full GFM support (tables, task lists, strikethrough, autolinks)
 * - Syntax highlighting for code blocks
 * - Styled headings, lists, blockquotes
 * - Responsive images
 * - External links open in new tab
 */
export const MarkdownPreview = memo(function MarkdownPreview({
  content,
  className,
}: MarkdownPreviewProps): ReactElement {
  return (
    <div
      className={cn('p-6 prose prose-invert max-w-none', className)}
      data-testid="markdown-preview"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </Markdown>
    </div>
  );
});
