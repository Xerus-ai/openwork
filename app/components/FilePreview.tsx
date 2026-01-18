import type { ReactElement } from 'react';
import { memo, useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ImagePreview } from './ImagePreview';
import { MarkdownPreview } from './MarkdownPreview';
import { CodePreview } from './CodePreview';
import { TextPreview } from './TextPreview';
import { X, FileText, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Maximum file size for preview (5MB).
 */
const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;

/**
 * Supported file types for preview.
 */
export type PreviewType = 'markdown' | 'code' | 'image' | 'text' | 'unsupported';

/**
 * File extension to preview type mapping.
 */
const EXTENSION_TYPE_MAP: Record<string, PreviewType> = {
  // Markdown
  md: 'markdown',
  mdx: 'markdown',
  markdown: 'markdown',

  // Images
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  gif: 'image',
  webp: 'image',
  svg: 'image',
  ico: 'image',
  bmp: 'image',

  // Code files
  js: 'code',
  jsx: 'code',
  ts: 'code',
  tsx: 'code',
  json: 'code',
  html: 'code',
  css: 'code',
  scss: 'code',
  less: 'code',
  xml: 'code',
  yaml: 'code',
  yml: 'code',
  toml: 'code',
  py: 'code',
  rb: 'code',
  go: 'code',
  rs: 'code',
  java: 'code',
  kt: 'code',
  swift: 'code',
  c: 'code',
  cpp: 'code',
  h: 'code',
  hpp: 'code',
  cs: 'code',
  php: 'code',
  sh: 'code',
  bash: 'code',
  zsh: 'code',
  ps1: 'code',
  bat: 'code',
  cmd: 'code',
  sql: 'code',
  graphql: 'code',
  vue: 'code',
  svelte: 'code',

  // Text files
  txt: 'text',
  log: 'text',
  csv: 'text',
  tsv: 'text',
  env: 'text',
  gitignore: 'text',
  dockerignore: 'text',
  editorconfig: 'text',
  ini: 'text',
  conf: 'text',
  cfg: 'text',
};

/**
 * Detects the preview type from a file path.
 */
export function detectPreviewType(filePath: string): PreviewType {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPE_MAP[extension] ?? 'unsupported';
}

/**
 * Gets language identifier for syntax highlighting from file extension.
 */
export function getLanguageFromPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';

  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    ps1: 'powershell',
    bat: 'batch',
    cmd: 'batch',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    xml: 'xml',
    yaml: 'yaml',
    yml: 'yaml',
    json: 'json',
    toml: 'toml',
    graphql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
  };

  return languageMap[extension] ?? 'text';
}

/**
 * Props for the FilePreview component.
 */
export interface FilePreviewProps {
  /**
   * Path to the file being previewed.
   */
  filePath: string;

  /**
   * Content of the file to preview.
   */
  content: string;

  /**
   * Size of the file in bytes.
   */
  fileSize?: number;

  /**
   * Callback when the preview is closed.
   */
  onClose?: () => void;

  /**
   * Additional CSS classes.
   */
  className?: string;
}

/**
 * Error state component for unsupported or oversized files.
 */
function PreviewError({
  message,
  filePath,
}: {
  message: string;
  filePath: string;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center p-6">
      <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
      <p className="text-sm text-muted-foreground mb-2">{message}</p>
      <code className="text-xs text-cyan-400 bg-muted/50 px-2 py-1 rounded">
        {filePath}
      </code>
    </div>
  );
}

/**
 * Header component for the file preview panel.
 */
function PreviewHeader({
  filePath,
  previewType,
  isExpanded,
  onToggleExpand,
  onClose,
}: {
  filePath: string;
  previewType: PreviewType;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onClose?: () => void;
}): ReactElement {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm font-medium truncate" title={filePath}>
          {fileName}
        </span>
        <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
          {previewType}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Collapse preview' : 'Expand preview'}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * File preview component with support for markdown, code, images, and text files.
 *
 * Features:
 * - Automatic file type detection from extension
 * - Markdown rendering with GFM support
 * - Syntax highlighting for code files
 * - Image preview with zoom
 * - Plain text display for other text files
 * - File size limit enforcement
 * - Expand/collapse functionality
 */
export const FilePreview = memo(function FilePreview({
  filePath,
  content,
  fileSize,
  onClose,
  className,
}: FilePreviewProps): ReactElement {
  const [isExpanded, setIsExpanded] = useState(false);

  const previewType = useMemo(() => detectPreviewType(filePath), [filePath]);
  const language = useMemo(() => getLanguageFromPath(filePath), [filePath]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Check file size limit
  const isTooLarge = fileSize !== undefined && fileSize > MAX_PREVIEW_SIZE;

  // Render preview content based on type
  const renderPreviewContent = useCallback((): ReactElement => {
    if (isTooLarge) {
      return (
        <PreviewError
          message={`File too large for preview (${Math.round((fileSize ?? 0) / 1024 / 1024)}MB). Maximum size is 5MB.`}
          filePath={filePath}
        />
      );
    }

    switch (previewType) {
      case 'markdown':
        return <MarkdownPreview content={content} />;
      case 'code':
        return <CodePreview content={content} language={language} />;
      case 'image':
        return <ImagePreview src={content} alt={filePath} />;
      case 'text':
        return <TextPreview content={content} />;
      case 'unsupported':
      default:
        return (
          <PreviewError
            message="Preview not available for this file type."
            filePath={filePath}
          />
        );
    }
  }, [content, filePath, fileSize, isTooLarge, language, previewType]);

  return (
    <div
      className={cn(
        'flex flex-col border rounded-lg bg-background overflow-hidden',
        isExpanded && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
      role="region"
      aria-label={`File preview: ${filePath}`}
    >
      <PreviewHeader
        filePath={filePath}
        previewType={previewType}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        onClose={onClose}
      />
      <div className="flex-1 overflow-auto">{renderPreviewContent()}</div>
    </div>
  );
});
