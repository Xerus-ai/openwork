/**
 * Shell Abstraction Types
 *
 * TypeScript interfaces for cross-platform shell operations.
 */

/**
 * Operating system platform type.
 */
export type Platform = "windows" | "macos" | "linux";

/**
 * Shell type for command execution.
 */
export type ShellType = "powershell" | "cmd" | "bash" | "zsh";

/**
 * Configuration for a specific shell.
 */
export interface ShellConfig {
  /** Type of shell */
  type: ShellType;
  /** Path to shell executable */
  executable: string;
  /** Arguments to pass to shell for command execution */
  args: string[];
}

/**
 * Options for shell command execution.
 */
export interface ShellExecuteOptions {
  /** Working directory for command execution */
  cwd?: string;
  /** Environment variables to set */
  env?: Record<string, string>;
  /** Timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** AbortSignal for cancellation */
  signal?: AbortSignal;
  /** Whether to merge stderr into stdout (default: false) */
  mergeStderr?: boolean;
}

/**
 * Result from shell command execution.
 */
export interface ShellResult {
  /** Whether the command executed successfully (exit code 0) */
  success: boolean;
  /** Exit code from the command */
  exitCode: number;
  /** Standard output from the command */
  stdout: string;
  /** Standard error output from the command */
  stderr: string;
  /** Error message if execution failed */
  error?: string;
  /** Whether the command was killed due to timeout */
  timedOut?: boolean;
  /** Whether the command was cancelled via AbortSignal */
  cancelled?: boolean;
}

/**
 * Information about detected shell environment.
 */
export interface ShellEnvironment {
  /** Current platform */
  platform: Platform;
  /** Available shells on this platform */
  availableShells: ShellConfig[];
  /** Preferred shell to use */
  preferredShell: ShellConfig;
}

/**
 * Mapping of Unix commands to Windows equivalents.
 */
export interface CommandMapping {
  /** Unix command name */
  unix: string;
  /** PowerShell equivalent */
  powershell: string;
  /** cmd.exe equivalent */
  cmd: string;
}
