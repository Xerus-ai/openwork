import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { useCallback, useState } from 'react';

/**
 * Props for the CodePreview component.
 */
export interface CodePreviewProps {
  /**
   * Code content to display.
   */
  content: string;

  /**
   * Language for syntax highlighting hints.
   */
  language?: string;

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
 * Token types for syntax highlighting.
 */
type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'function'
  | 'operator'
  | 'punctuation'
  | 'type'
  | 'variable'
  | 'property'
  | 'default';

/**
 * Token with its text and type.
 */
interface Token {
  text: string;
  type: TokenType;
}

/**
 * Color classes for each token type.
 */
const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'text-purple-400',
  string: 'text-green-400',
  comment: 'text-gray-500 italic',
  number: 'text-orange-400',
  function: 'text-blue-400',
  operator: 'text-cyan-300',
  punctuation: 'text-gray-400',
  type: 'text-yellow-400',
  variable: 'text-red-400',
  property: 'text-cyan-400',
  default: 'text-foreground',
};

/**
 * Common programming keywords across languages.
 */
const KEYWORDS = new Set([
  // JavaScript/TypeScript
  'const', 'let', 'var', 'function', 'class', 'extends', 'implements',
  'interface', 'type', 'enum', 'namespace', 'module', 'import', 'export',
  'from', 'as', 'default', 'return', 'if', 'else', 'switch', 'case',
  'break', 'continue', 'for', 'while', 'do', 'try', 'catch', 'finally',
  'throw', 'new', 'this', 'super', 'async', 'await', 'yield', 'static',
  'public', 'private', 'protected', 'readonly', 'abstract', 'override',
  // Python
  'def', 'class', 'import', 'from', 'as', 'if', 'elif', 'else', 'for',
  'while', 'try', 'except', 'finally', 'with', 'return', 'yield', 'pass',
  'raise', 'assert', 'lambda', 'and', 'or', 'not', 'in', 'is', 'True',
  'False', 'None', 'self', 'cls',
  // Rust
  'fn', 'let', 'mut', 'const', 'static', 'struct', 'enum', 'trait', 'impl',
  'mod', 'use', 'pub', 'crate', 'self', 'super', 'where', 'async', 'await',
  'move', 'ref', 'match', 'loop',
  // Go
  'func', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan',
  'go', 'defer', 'select', 'range', 'fallthrough', 'package',
  // Common
  'true', 'false', 'null', 'undefined', 'void', 'typeof', 'instanceof',
  'delete', 'in', 'of', 'debugger',
]);

/**
 * Built-in types across languages.
 */
const TYPES = new Set([
  'string', 'number', 'boolean', 'object', 'any', 'unknown', 'never', 'void',
  'null', 'undefined', 'symbol', 'bigint', 'Array', 'Object', 'String',
  'Number', 'Boolean', 'Function', 'Promise', 'Map', 'Set', 'WeakMap',
  'WeakSet', 'Date', 'RegExp', 'Error', 'int', 'float', 'double', 'long',
  'short', 'byte', 'char', 'bool', 'i8', 'i16', 'i32', 'i64', 'i128',
  'u8', 'u16', 'u32', 'u64', 'u128', 'f32', 'f64', 'usize', 'isize',
  'str', 'Vec', 'Box', 'Option', 'Result', 'Self',
]);

/**
 * Gets a character at index, returning empty string if out of bounds.
 */
function charAt(line: string, index: number): string {
  if (index >= 0 && index < line.length) {
    const char = line[index];
    return char !== undefined ? char : '';
  }
  return '';
}

/**
 * Tests a regex against a character at an index.
 */
function testAt(line: string, index: number, pattern: RegExp): boolean {
  const char = charAt(line, index);
  return char !== '' && pattern.test(char);
}

/**
 * Tokenizes a line of code for syntax highlighting.
 * This is a simplified tokenizer that handles common patterns.
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    const currentChar = charAt(line, i);
    const nextChar = charAt(line, i + 1);
    const prevChar = charAt(line, i - 1);

    // Skip whitespace
    if (/\s/.test(currentChar)) {
      let ws = '';
      while (i < line.length && testAt(line, i, /\s/)) {
        ws += charAt(line, i);
        i++;
      }
      tokens.push({ text: ws, type: 'default' });
      continue;
    }

    // Single-line comments (// or #)
    if (
      (currentChar === '/' && nextChar === '/') ||
      (currentChar === '#' && (i === 0 || /\s/.test(prevChar)))
    ) {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // Multi-line comment start
    if (currentChar === '/' && nextChar === '*') {
      let comment = '/*';
      i += 2;
      while (i < line.length && !(charAt(line, i) === '*' && charAt(line, i + 1) === '/')) {
        comment += charAt(line, i);
        i++;
      }
      if (i < line.length) {
        comment += '*/';
        i += 2;
      }
      tokens.push({ text: comment, type: 'comment' });
      continue;
    }

    // Strings (single, double, template)
    if (currentChar === '"' || currentChar === "'" || currentChar === '`') {
      const quote = currentChar;
      let str = quote;
      i++;
      while (i < line.length && charAt(line, i) !== quote) {
        const ch = charAt(line, i);
        if (ch === '\\' && i + 1 < line.length) {
          str += ch + charAt(line, i + 1);
          i += 2;
        } else {
          str += ch;
          i++;
        }
      }
      if (i < line.length) {
        str += charAt(line, i);
        i++;
      }
      tokens.push({ text: str, type: 'string' });
      continue;
    }

    // Numbers (including hex, binary, octal)
    if (/[0-9]/.test(currentChar) || (currentChar === '.' && /[0-9]/.test(nextChar))) {
      let num = '';
      // Handle hex, binary, octal prefixes
      if (charAt(line, i) === '0' && /[xXbBoO]/.test(charAt(line, i + 1))) {
        num = charAt(line, i) + charAt(line, i + 1);
        i += 2;
      }
      while (i < line.length && testAt(line, i, /[0-9a-fA-F._]/)) {
        num += charAt(line, i);
        i++;
      }
      // Handle exponent notation
      if (i < line.length && testAt(line, i, /[eE]/)) {
        num += charAt(line, i);
        i++;
        if (i < line.length && testAt(line, i, /[+-]/)) {
          num += charAt(line, i);
          i++;
        }
        while (i < line.length && testAt(line, i, /[0-9]/)) {
          num += charAt(line, i);
          i++;
        }
      }
      tokens.push({ text: num, type: 'number' });
      continue;
    }

    // Identifiers (keywords, types, functions, variables)
    if (/[a-zA-Z_$]/.test(currentChar)) {
      let ident = '';
      while (i < line.length && testAt(line, i, /[a-zA-Z0-9_$]/)) {
        ident += charAt(line, i);
        i++;
      }

      // Check if followed by ( for function call
      let lookAhead = i;
      while (lookAhead < line.length && testAt(line, lookAhead, /\s/)) {
        lookAhead++;
      }
      const isFunction = charAt(line, lookAhead) === '(';

      if (KEYWORDS.has(ident)) {
        tokens.push({ text: ident, type: 'keyword' });
      } else if (TYPES.has(ident)) {
        tokens.push({ text: ident, type: 'type' });
      } else if (isFunction) {
        tokens.push({ text: ident, type: 'function' });
      } else if (ident.length > 0) {
        const firstChar = ident[0];
        if (firstChar && firstChar === firstChar.toUpperCase() && /[a-z]/.test(ident)) {
          // PascalCase likely a type or class
          tokens.push({ text: ident, type: 'type' });
        } else {
          tokens.push({ text: ident, type: 'variable' });
        }
      } else {
        tokens.push({ text: ident, type: 'variable' });
      }
      continue;
    }

    // Operators
    if (/[+\-*/%=<>!&|^~?:]/.test(currentChar)) {
      let op = currentChar;
      i++;
      // Multi-character operators
      while (
        i < line.length &&
        testAt(line, i, /[+\-*/%=<>!&|^~?:]/) &&
        op.length < 3
      ) {
        op += charAt(line, i);
        i++;
      }
      tokens.push({ text: op, type: 'operator' });
      continue;
    }

    // Punctuation
    if (/[{}[\]();,.]/.test(currentChar)) {
      tokens.push({ text: currentChar, type: 'punctuation' });
      i++;
      continue;
    }

    // Property access (after .)
    if (currentChar === '.') {
      tokens.push({ text: '.', type: 'punctuation' });
      i++;
      if (i < line.length && testAt(line, i, /[a-zA-Z_$]/)) {
        let prop = '';
        while (i < line.length && testAt(line, i, /[a-zA-Z0-9_$]/)) {
          prop += charAt(line, i);
          i++;
        }
        tokens.push({ text: prop, type: 'property' });
      }
      continue;
    }

    // Default: single character
    tokens.push({ text: currentChar, type: 'default' });
    i++;
  }

  return tokens;
}

/**
 * Renders a tokenized line with syntax highlighting.
 */
function renderLine(tokens: Token[]): ReactElement[] {
  return tokens.map((token, index) => (
    <span key={index} className={TOKEN_COLORS[token.type]}>
      {token.text}
    </span>
  ));
}

/**
 * Code preview component with syntax highlighting and line numbers.
 *
 * Features:
 * - Basic syntax highlighting for common languages
 * - Line numbers (optional)
 * - Copy to clipboard button
 * - Horizontal scrolling for long lines
 * - Monospace font with proper formatting
 */
export const CodePreview = memo(function CodePreview({
  content,
  language,
  showLineNumbers = true,
  className,
}: CodePreviewProps): ReactElement {
  const [copied, setCopied] = useState(false);

  const lines = useMemo(() => content.split('\n'), [content]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [content]);

  const lineNumberWidth = useMemo(() => {
    const maxLineNumber = lines.length;
    return Math.max(2, String(maxLineNumber).length);
  }, [lines.length]);

  return (
    <div
      className={cn('relative group', className)}
      data-testid="code-preview"
      data-language={language}
    >
      {/* Copy button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'absolute top-2 right-2 h-8 px-2 opacity-0 group-hover:opacity-100 transition-opacity',
          'bg-muted/80 hover:bg-muted'
        )}
        onClick={handleCopy}
        aria-label={copied ? 'Copied!' : 'Copy code'}
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

      {/* Language badge */}
      {language && (
        <span className="absolute top-2 left-2 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
          {language}
        </span>
      )}

      {/* Code content */}
      <pre className="p-4 pt-10 overflow-x-auto text-sm font-mono leading-relaxed bg-muted/30">
        <code>
          {lines.map((line, index) => (
            <div key={index} className="flex">
              {showLineNumbers && (
                <span
                  className="select-none text-muted-foreground text-right pr-4 border-r border-border mr-4"
                  style={{ minWidth: `${lineNumberWidth + 1}ch` }}
                >
                  {index + 1}
                </span>
              )}
              <span className="flex-1">{renderLine(tokenizeLine(line))}</span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
});
