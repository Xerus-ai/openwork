/**
 * Command Mapper
 *
 * Maps common Unix commands to their Windows equivalents.
 * Handles platform-specific command translation.
 */

import type { CommandMapping, ShellType } from "./types.js";

/**
 * Mapping of common Unix commands to Windows equivalents.
 * Commands not in this list are passed through unchanged.
 */
const COMMAND_MAPPINGS: CommandMapping[] = [
  // Directory listing
  { unix: "ls", powershell: "Get-ChildItem", cmd: "dir" },
  { unix: "ls -la", powershell: "Get-ChildItem -Force", cmd: "dir /a" },
  { unix: "ls -l", powershell: "Get-ChildItem", cmd: "dir" },
  { unix: "ls -a", powershell: "Get-ChildItem -Force", cmd: "dir /a" },

  // Directory operations
  { unix: "pwd", powershell: "Get-Location", cmd: "cd" },
  { unix: "mkdir", powershell: "New-Item -ItemType Directory -Name", cmd: "mkdir" },
  { unix: "rmdir", powershell: "Remove-Item -Recurse", cmd: "rmdir /s /q" },

  // File operations
  { unix: "cat", powershell: "Get-Content", cmd: "type" },
  { unix: "rm", powershell: "Remove-Item", cmd: "del" },
  { unix: "rm -rf", powershell: "Remove-Item -Recurse -Force", cmd: "rmdir /s /q" },
  { unix: "rm -r", powershell: "Remove-Item -Recurse", cmd: "rmdir /s /q" },
  { unix: "cp", powershell: "Copy-Item", cmd: "copy" },
  { unix: "cp -r", powershell: "Copy-Item -Recurse", cmd: "xcopy /e" },
  { unix: "mv", powershell: "Move-Item", cmd: "move" },
  { unix: "touch", powershell: "New-Item -ItemType File -Name", cmd: "type nul >" },

  // Text processing
  { unix: "head", powershell: "Get-Content -Head", cmd: "more" },
  { unix: "tail", powershell: "Get-Content -Tail", cmd: "more" },
  { unix: "grep", powershell: "Select-String", cmd: "findstr" },
  { unix: "wc -l", powershell: "(Get-Content).Count", cmd: "find /c /v \"\"" },

  // System
  { unix: "clear", powershell: "Clear-Host", cmd: "cls" },
  { unix: "echo", powershell: "Write-Output", cmd: "echo" },
  { unix: "env", powershell: "Get-ChildItem Env:", cmd: "set" },
  { unix: "which", powershell: "Get-Command", cmd: "where" },
  { unix: "whoami", powershell: "$env:USERNAME", cmd: "whoami" },

  // Process
  { unix: "ps", powershell: "Get-Process", cmd: "tasklist" },
  { unix: "kill", powershell: "Stop-Process", cmd: "taskkill /PID" },

  // Network
  { unix: "curl", powershell: "Invoke-WebRequest", cmd: "curl" },
  { unix: "wget", powershell: "Invoke-WebRequest -OutFile", cmd: "curl -o" },
];

/**
 * Parses a command string into command name and arguments.
 */
function parseCommand(command: string): { name: string; args: string } {
  const trimmed = command.trim();
  const spaceIndex = trimmed.indexOf(" ");

  if (spaceIndex === -1) {
    return { name: trimmed, args: "" };
  }

  return {
    name: trimmed.substring(0, spaceIndex),
    args: trimmed.substring(spaceIndex + 1),
  };
}

/**
 * Finds the best matching command mapping for a given Unix command.
 * Prefers more specific matches (longer patterns) over less specific ones.
 * Returns undefined if no mapping is found.
 */
function findMapping(command: string): CommandMapping | undefined {
  const trimmed = command.trim();

  // Sort mappings by specificity (longer patterns first) to find best match
  const sortedMappings = [...COMMAND_MAPPINGS].sort(
    (a, b) => b.unix.length - a.unix.length
  );

  // Try to find a match where the command starts with the mapping pattern
  for (const mapping of sortedMappings) {
    if (trimmed === mapping.unix || trimmed.startsWith(mapping.unix + " ")) {
      return mapping;
    }
  }

  // No match found
  return undefined;
}

/**
 * Translates a Unix command to the equivalent for the target shell.
 * Returns the original command if no translation is needed.
 *
 * @param command - The Unix command to translate
 * @param targetShell - The target shell type
 * @returns Translated command string
 */
export function translateCommand(command: string, targetShell: ShellType): string {
  // No translation needed for Unix shells
  if (targetShell === "bash" || targetShell === "zsh") {
    return command;
  }

  const mapping = findMapping(command);
  if (!mapping) {
    return command;
  }

  const translated = targetShell === "powershell" ? mapping.powershell : mapping.cmd;

  // If the command has additional arguments beyond the mapped portion,
  // append them to the translated command
  const trimmed = command.trim();
  if (trimmed.startsWith(mapping.unix + " ")) {
    const remainingArgs = trimmed.substring(mapping.unix.length + 1);
    return `${translated} ${remainingArgs}`;
  }

  if (trimmed === mapping.unix) {
    return translated;
  }

  // For base command match with flags, append original args
  const { args } = parseCommand(trimmed);
  if (args) {
    return `${translated} ${args}`;
  }

  return translated;
}

/**
 * Checks if a command needs translation for the target shell.
 *
 * @param command - The command to check
 * @param targetShell - The target shell type
 * @returns true if the command would be translated
 */
export function needsTranslation(command: string, targetShell: ShellType): boolean {
  if (targetShell === "bash" || targetShell === "zsh") {
    return false;
  }
  return findMapping(command) !== undefined;
}

/**
 * Gets all available command mappings.
 * Useful for documentation and debugging.
 */
export function getCommandMappings(): readonly CommandMapping[] {
  return COMMAND_MAPPINGS;
}
