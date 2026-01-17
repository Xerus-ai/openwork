/**
 * Tool Types
 *
 * TypeScript interfaces for agent tools.
 */

/**
 * Options for bash tool execution.
 */
export interface BashToolOptions {
  /** The command to execute */
  command: string;
  /** Working directory for command execution */
  cwd?: string;
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeout?: number;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Description of what the command does (for logging) */
  description?: string;
}

/**
 * Result from bash tool execution.
 */
export interface BashToolResult {
  /** Whether the command executed successfully (exit code 0) */
  success: boolean;
  /** Exit code from the command */
  exitCode: number;
  /** Combined output (stdout, or error message) */
  output: string;
  /** Standard output from the command */
  stdout: string;
  /** Standard error output from the command */
  stderr: string;
  /** Whether the command was killed due to timeout */
  timedOut?: boolean;
  /** Whether the command was cancelled */
  cancelled?: boolean;
  /** Error message if validation or execution failed */
  error?: string;
}

/**
 * Base interface for tool parameter schemas.
 */
export interface ToolParameterSchema {
  type: "object";
  properties: Record<string, PropertySchema>;
  required?: string[];
}

/**
 * Individual property schema definition.
 */
export interface PropertySchema {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  default?: unknown;
  enum?: string[];
}

/**
 * Tool definition for Claude API.
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolParameterSchema;
}

/**
 * Options for file_create tool execution.
 */
export interface FileCreateOptions {
  /** Path to the file to create (relative to workspace or absolute) */
  filePath: string;
  /** Content to write to the file */
  content: string;
  /** Whether to overwrite if file exists (default: false) */
  overwrite?: boolean;
}

/**
 * Result from file_create tool execution.
 */
export interface FileCreateResult {
  /** Whether the file was created successfully */
  success: boolean;
  /** Absolute path to the created file */
  filePath: string;
  /** Number of bytes written */
  bytesWritten: number;
  /** Whether the file was overwritten (only if overwrite was true) */
  overwritten?: boolean;
  /** Error message if creation failed */
  error?: string;
}

/**
 * Options for str_replace tool execution.
 */
export interface StrReplaceOptions {
  /** Path to the file to modify (relative to workspace or absolute) */
  filePath: string;
  /** The exact string to search for and replace */
  oldString: string;
  /** The string to replace with */
  newString: string;
  /** Whether to replace all occurrences (default: false, replaces first only) */
  replaceAll?: boolean;
}

/**
 * Result from str_replace tool execution.
 */
export interface StrReplaceResult {
  /** Whether the replacement was successful */
  success: boolean;
  /** Absolute path to the modified file */
  filePath: string;
  /** Number of replacements made */
  replacementCount: number;
  /** Error message if replacement failed */
  error?: string;
}

/**
 * Options for view tool execution.
 */
export interface ViewOptions {
  /** Path to the file or directory to view (relative to workspace or absolute) */
  path: string;
  /** Maximum number of lines to return for file content (default: 2000) */
  maxLines?: number;
  /** Line number to start reading from (1-indexed, default: 1) */
  startLine?: number;
  /** Maximum depth for recursive directory listing (default: 1) */
  maxDepth?: number;
  /** Include hidden files and directories (default: false) */
  includeHidden?: boolean;
}

/**
 * Metadata for a single file or directory entry.
 */
export interface FileEntry {
  /** File or directory name */
  name: string;
  /** Full path to the entry */
  path: string;
  /** Whether this is a directory */
  isDirectory: boolean;
  /** File size in bytes (files only) */
  size?: number;
  /** Last modified date as ISO string */
  modified?: string;
  /** File extension (files only, without dot) */
  extension?: string;
  /** Detected file type for rendering hints */
  fileType?: "text" | "binary" | "image" | "unknown";
}

/**
 * Result from view tool execution.
 */
export interface ViewResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Type of the viewed path */
  type: "file" | "directory" | "error";
  /** Absolute path that was viewed */
  path: string;
  /** File content (for files only, may be truncated) */
  content?: string;
  /** Whether the file content was truncated */
  truncated?: boolean;
  /** Total number of lines in file (before truncation) */
  totalLines?: number;
  /** Line number where reading started */
  startLine?: number;
  /** Number of lines returned */
  linesReturned?: number;
  /** Detected encoding (for files) */
  encoding?: "utf8" | "binary";
  /** Detected file type for rendering hints */
  fileType?: "text" | "binary" | "image" | "unknown";
  /** Directory entries (for directories only) */
  entries?: FileEntry[];
  /** Total number of entries in directory (before any limits) */
  totalEntries?: number;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Type of question to ask the user.
 */
export type QuestionType = "text" | "multi-choice" | "yes-no";

/**
 * A single choice option for multi-choice questions.
 */
export interface QuestionChoice {
  /** Unique identifier for this choice (e.g., "A", "B", "C") */
  id: string;
  /** Display label for the choice */
  label: string;
  /** Optional longer description */
  description?: string;
}

/**
 * Options for AskUserQuestion tool execution.
 */
export interface AskUserQuestionOptions {
  /** The question to ask the user */
  question: string;
  /** Type of question: text, multi-choice, or yes-no */
  type: QuestionType;
  /** Choices for multi-choice questions (required if type is multi-choice) */
  choices?: QuestionChoice[];
  /** Default answer (for text questions) or default choice id (for multi-choice/yes-no) */
  defaultAnswer?: string;
  /** Timeout in milliseconds (default: 300000 = 5 minutes) */
  timeout?: number;
  /** Context to provide with the question */
  context?: string;
}

/**
 * Result from AskUserQuestion tool execution.
 */
export interface AskUserQuestionResult {
  /** Whether the question was answered successfully */
  success: boolean;
  /** Type of question that was asked */
  type: QuestionType;
  /** The answer provided by the user */
  answer?: string;
  /** For multi-choice: the selected choice id */
  selectedId?: string;
  /** For yes-no: boolean representation of the answer */
  confirmed?: boolean;
  /** Whether the question timed out */
  timedOut?: boolean;
  /** Whether the user cancelled the question */
  cancelled?: boolean;
  /** Error message if the question failed */
  error?: string;
}
