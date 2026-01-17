/**
 * Shell Abstraction Layer
 *
 * Cross-platform shell execution that works on Windows (PowerShell/cmd)
 * and macOS/Linux (bash/zsh).
 *
 * @example
 * ```typescript
 * import { getShellExecutor } from "./shell/index.js";
 *
 * const executor = getShellExecutor();
 * const result = await executor.execute("ls -la");
 *
 * if (result.success) {
 *   console.log(result.stdout);
 * } else {
 *   console.error(result.stderr);
 * }
 * ```
 */

// Re-export types
export type {
  CommandMapping,
  Platform,
  ShellConfig,
  ShellEnvironment,
  ShellExecuteOptions,
  ShellResult,
  ShellType,
} from "./types.js";

// Re-export command mapper functions
export {
  getCommandMappings,
  needsTranslation,
  translateCommand,
} from "./command-mapper.js";

// Re-export shell executor
export {
  createShellExecutor,
  detectPlatform,
  detectShellEnvironment,
  executeCommand,
  getShellExecutor,
  ShellExecutor,
} from "./shell-executor.js";
