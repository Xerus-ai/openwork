/**
 * Shell Executor
 *
 * Cross-platform shell abstraction that handles command execution
 * on PowerShell/cmd (Windows) and bash/zsh (macOS/Linux).
 */

import { spawn, type SpawnOptions } from "child_process";
import { access, constants } from "fs/promises";
import path from "path";
import type {
  Platform,
  ShellConfig,
  ShellEnvironment,
  ShellExecuteOptions,
  ShellResult,
  ShellType,
} from "./types.js";
import { translateCommand } from "./command-mapper.js";

/**
 * Default timeout for command execution (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Known shell configurations for each platform.
 */
const SHELL_CONFIGS: Record<ShellType, Omit<ShellConfig, "executable">> = {
  powershell: {
    type: "powershell",
    args: ["-NoProfile", "-NonInteractive", "-Command"],
  },
  cmd: {
    type: "cmd",
    args: ["/c"],
  },
  bash: {
    type: "bash",
    args: ["-c"],
  },
  zsh: {
    type: "zsh",
    args: ["-c"],
  },
};

/**
 * Shell executable paths to check for each shell type.
 */
const SHELL_PATHS: Record<ShellType, string[]> = {
  powershell: [
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "C:\\Program Files\\PowerShell\\7\\pwsh.exe",
    "pwsh",
    "powershell",
  ],
  cmd: ["C:\\Windows\\System32\\cmd.exe", "cmd"],
  bash: ["/bin/bash", "/usr/bin/bash", "bash"],
  zsh: ["/bin/zsh", "/usr/bin/zsh", "zsh"],
};

/**
 * Detects the current operating system platform.
 */
export function detectPlatform(): Platform {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    default:
      return "linux";
  }
}

/**
 * Checks if a file exists and is executable.
 */
async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Finds the first available executable from a list of paths.
 */
async function findExecutable(paths: string[]): Promise<string | undefined> {
  for (const execPath of paths) {
    if (path.isAbsolute(execPath)) {
      if (await isExecutable(execPath)) {
        return execPath;
      }
    } else {
      // For non-absolute paths, just return the command name
      // and let the shell resolve it via PATH
      return execPath;
    }
  }
  return undefined;
}

/**
 * Detects available shells on the current platform.
 */
async function detectAvailableShells(platform: Platform): Promise<ShellConfig[]> {
  const shellTypes: ShellType[] =
    platform === "windows" ? ["powershell", "cmd"] : ["bash", "zsh"];

  const available: ShellConfig[] = [];

  for (const shellType of shellTypes) {
    const paths = SHELL_PATHS[shellType];
    const executable = await findExecutable(paths);

    if (executable) {
      const config = SHELL_CONFIGS[shellType];
      available.push({
        ...config,
        executable,
      });
    }
  }

  return available;
}

/**
 * Detects the shell environment on the current system.
 * Returns information about available shells and the preferred one.
 */
export async function detectShellEnvironment(): Promise<ShellEnvironment> {
  const platform = detectPlatform();
  const availableShells = await detectAvailableShells(platform);

  if (availableShells.length === 0) {
    throw new Error(
      `No supported shell found on ${platform}. ` +
        "Expected PowerShell or cmd on Windows, bash or zsh on macOS/Linux."
    );
  }

  // Prefer PowerShell on Windows, bash on Unix
  const preferred = availableShells[0];
  if (!preferred) {
    throw new Error("No preferred shell available");
  }

  return {
    platform,
    availableShells,
    preferredShell: preferred,
  };
}

/**
 * Executes a shell command and returns the result.
 *
 * @param command - The command to execute
 * @param shell - The shell configuration to use
 * @param options - Execution options (cwd, timeout, etc.)
 * @returns Shell execution result
 */
export async function executeCommand(
  command: string,
  shell: ShellConfig,
  options: ShellExecuteOptions = {}
): Promise<ShellResult> {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
  const translatedCommand = translateCommand(command, shell.type);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let cancelled = false;

    const spawnOptions: SpawnOptions = {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: false,
    };

    const args = [...shell.args, translatedCommand];
    const child = spawn(shell.executable, args, spawnOptions);

    // Handle timeout
    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeout);

    // Handle abort signal
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        cancelled = true;
        child.kill("SIGTERM");
      });
    }

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr?.on("data", (data: Buffer) => {
      if (options.mergeStderr) {
        stdout += data.toString();
      } else {
        stderr += data.toString();
      }
    });

    child.on("error", (error: Error) => {
      clearTimeout(timeoutId);
      resolve({
        success: false,
        exitCode: -1,
        stdout,
        stderr,
        error: error.message,
      });
    });

    child.on("close", (code: number | null) => {
      clearTimeout(timeoutId);

      const exitCode = code ?? -1;

      resolve({
        success: exitCode === 0,
        exitCode,
        stdout,
        stderr,
        timedOut: timedOut ? true : undefined,
        cancelled: cancelled ? true : undefined,
      });
    });
  });
}

/**
 * ShellExecutor class provides a high-level API for shell operations.
 * Automatically detects the shell environment and handles command translation.
 */
export class ShellExecutor {
  private environment: ShellEnvironment | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes the shell executor by detecting the environment.
   * Called automatically on first command execution.
   */
  async initialize(): Promise<void> {
    if (this.environment) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.environment = await detectShellEnvironment();
    })();

    return this.initPromise;
  }

  /**
   * Gets the detected shell environment.
   * Throws if not initialized.
   */
  getEnvironment(): ShellEnvironment {
    if (!this.environment) {
      throw new Error("ShellExecutor not initialized. Call initialize() first.");
    }
    return this.environment;
  }

  /**
   * Checks if the executor has been initialized.
   */
  isInitialized(): boolean {
    return this.environment !== null;
  }

  /**
   * Gets the current platform.
   */
  getPlatform(): Platform {
    return this.getEnvironment().platform;
  }

  /**
   * Gets the preferred shell configuration.
   */
  getPreferredShell(): ShellConfig {
    return this.getEnvironment().preferredShell;
  }

  /**
   * Executes a command using the preferred shell.
   * Automatically initializes if not already done.
   *
   * @param command - The command to execute
   * @param options - Execution options
   * @returns Shell execution result
   */
  async execute(
    command: string,
    options: ShellExecuteOptions = {}
  ): Promise<ShellResult> {
    await this.initialize();
    const shell = this.getPreferredShell();
    return executeCommand(command, shell, options);
  }

  /**
   * Executes a command using a specific shell type.
   * Falls back to preferred shell if requested type is not available.
   *
   * @param command - The command to execute
   * @param shellType - The shell type to use
   * @param options - Execution options
   * @returns Shell execution result
   */
  async executeWith(
    command: string,
    shellType: ShellType,
    options: ShellExecuteOptions = {}
  ): Promise<ShellResult> {
    await this.initialize();
    const env = this.getEnvironment();

    const shell = env.availableShells.find((s) => s.type === shellType);
    if (!shell) {
      // Fall back to preferred shell
      return this.execute(command, options);
    }

    return executeCommand(command, shell, options);
  }
}

/**
 * Creates a new ShellExecutor instance.
 * For most use cases, prefer using the singleton via getShellExecutor().
 */
export function createShellExecutor(): ShellExecutor {
  return new ShellExecutor();
}

/**
 * Global singleton ShellExecutor instance.
 */
let globalExecutor: ShellExecutor | null = null;

/**
 * Gets the global ShellExecutor singleton.
 * Creates it on first call.
 */
export function getShellExecutor(): ShellExecutor {
  if (!globalExecutor) {
    globalExecutor = createShellExecutor();
  }
  return globalExecutor;
}
