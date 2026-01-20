/**
 * Claude Code CLI Detection Utility.
 * Checks if Claude Code CLI is installed and provides install instructions.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if Claude Code CLI is installed on the system.
 * @returns Promise<boolean> - true if installed, false otherwise
 */
export async function isClaudeCodeInstalled(): Promise<boolean> {
  try {
    await execAsync('claude --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get Claude Code CLI version if installed.
 * @returns Promise<string | null> - version string or null if not installed
 */
export async function getClaudeCodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('claude --version');
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Get platform-specific install instructions for Claude Code CLI.
 */
export function getInstallInstructions(): {
  windows: string;
  mac: string;
  linux: string;
  current: string;
} {
  const instructions = {
    windows: 'winget install Anthropic.ClaudeCode',
    mac: 'brew install --cask claude-code',
    linux: 'curl -fsSL https://claude.ai/install.sh | bash',
  };

  // Detect current platform
  let current: string;
  switch (process.platform) {
    case 'win32':
      current = instructions.windows;
      break;
    case 'darwin':
      current = instructions.mac;
      break;
    default:
      current = instructions.linux;
  }

  return { ...instructions, current };
}
