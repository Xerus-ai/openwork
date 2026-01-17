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
