/**
 * Bash Tool
 *
 * Cross-platform shell command execution tool using the shell abstraction layer.
 * Executes commands via PowerShell/cmd on Windows and bash/zsh on macOS/Linux.
 */

import path from "path";
import { getShellExecutor, type ShellExecuteOptions } from "../shell/index.js";
import type { BashToolOptions, BashToolResult, ToolDefinition } from "./types.js";

/**
 * Default timeout for command execution (2 minutes).
 */
const DEFAULT_TIMEOUT_MS = 120000;

/**
 * Maximum output size in characters (30KB).
 */
const MAX_OUTPUT_SIZE = 30000;

/**
 * Patterns that indicate potentially dangerous commands.
 * These are blocked to prevent workspace escape or system damage.
 */
const DANGEROUS_PATTERNS = [
  // Format/destroy operations
  /\bformat\b/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  // Privilege escalation
  /\bsudo\s+rm\b/i,
  /\bsudo\s+shutdown\b/i,
  /\bsudo\s+reboot\b/i,
  // Registry manipulation on Windows
  /\breg\s+delete\b/i,
  // Recursive force delete at root
  /rm\s+-rf?\s+\/(?:\s|$)/i,
  /del\s+\/s\s+\/q\s+[a-z]:\\\\/i,
];

/**
 * Validates a command to prevent dangerous operations.
 * Returns an error message if the command is dangerous, undefined otherwise.
 */
function validateCommand(command: string): string | undefined {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return `Command blocked: potentially dangerous operation detected`;
    }
  }
  return undefined;
}

/**
 * Validates that a working directory is within the workspace.
 * Returns an error message if validation fails, undefined otherwise.
 */
function validateWorkingDirectory(
  cwd: string | undefined,
  workspacePath: string | undefined
): string | undefined {
  if (!cwd) {
    return undefined;
  }

  if (!workspacePath) {
    return undefined;
  }

  const normalizedCwd = path.normalize(path.resolve(cwd));
  const normalizedWorkspace = path.normalize(path.resolve(workspacePath));

  if (!normalizedCwd.startsWith(normalizedWorkspace)) {
    return `Working directory must be within the workspace: ${workspacePath}`;
  }

  return undefined;
}

/**
 * Truncates output if it exceeds the maximum size.
 */
function truncateOutput(output: string): string {
  if (output.length <= MAX_OUTPUT_SIZE) {
    return output;
  }

  const truncatedLength = MAX_OUTPUT_SIZE - 100;
  const truncationMessage = `\n\n[Output truncated: ${output.length} characters, showing first ${truncatedLength}]`;
  return output.substring(0, truncatedLength) + truncationMessage;
}

/**
 * Executes a shell command with the given options.
 *
 * @param options - Command execution options
 * @param workspacePath - Optional workspace path for cwd validation
 * @returns Execution result with output and status
 *
 * @example
 * ```typescript
 * const result = await executeBashCommand({
 *   command: 'echo "hello"',
 *   timeout: 5000
 * });
 *
 * if (result.success) {
 *   console.log(result.stdout);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export async function executeBashCommand(
  options: BashToolOptions,
  workspacePath?: string
): Promise<BashToolResult> {
  const { command, cwd, timeout = DEFAULT_TIMEOUT_MS, env } = options;

  // Validate command for dangerous patterns
  const commandError = validateCommand(command);
  if (commandError) {
    return {
      success: false,
      exitCode: -1,
      output: commandError,
      stdout: "",
      stderr: "",
      error: commandError,
    };
  }

  // Validate working directory is within workspace
  const cwdError = validateWorkingDirectory(cwd, workspacePath);
  if (cwdError) {
    return {
      success: false,
      exitCode: -1,
      output: cwdError,
      stdout: "",
      stderr: "",
      error: cwdError,
    };
  }

  const executor = getShellExecutor();

  const executeOptions: ShellExecuteOptions = {
    cwd,
    timeout,
    env,
  };

  const result = await executor.execute(command, executeOptions);

  // Build output: prefer stdout, fall back to stderr or error message
  let output = result.stdout;
  if (!output && result.stderr) {
    output = result.stderr;
  }
  if (!output && result.error) {
    output = result.error;
  }

  // Truncate if necessary
  output = truncateOutput(output);
  const stdout = truncateOutput(result.stdout);
  const stderr = truncateOutput(result.stderr);

  return {
    success: result.success,
    exitCode: result.exitCode,
    output,
    stdout,
    stderr,
    timedOut: result.timedOut,
    cancelled: result.cancelled,
    error: result.error,
  };
}

/**
 * Tool definition for the bash tool, suitable for Claude API.
 */
export const bashToolDefinition: ToolDefinition = {
  name: "bash",
  description: `Execute a shell command. On Windows, uses PowerShell; on macOS/Linux, uses bash.

Use this for:
- Running build commands (npm, yarn, cargo, etc.)
- Git operations
- File system operations (ls, cat, grep, etc.)
- Installing packages
- Running tests
- Any terminal/shell operation

Commands are validated to prevent dangerous operations. Output is truncated at ${MAX_OUTPUT_SIZE} characters.

Timeout: ${DEFAULT_TIMEOUT_MS / 1000} seconds by default.`,
  input_schema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to execute",
      },
      cwd: {
        type: "string",
        description: "Working directory for command execution (must be within workspace)",
      },
      timeout: {
        type: "number",
        description: `Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS}, max: 600000)`,
      },
      description: {
        type: "string",
        description: "Brief description of what the command does (for logging)",
      },
    },
    required: ["command"],
  },
};

/**
 * Creates a bash tool handler function for use with Claude API.
 *
 * @param workspacePath - The workspace root path for validation
 * @returns A function that handles bash tool calls
 *
 * @example
 * ```typescript
 * const handler = createBashToolHandler("/home/user/project");
 * const result = await handler({ command: "ls -la" });
 * ```
 */
export function createBashToolHandler(
  workspacePath?: string
): (input: BashToolOptions) => Promise<BashToolResult> {
  return (input: BashToolOptions) => executeBashCommand(input, workspacePath);
}
