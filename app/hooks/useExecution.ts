import { useCallback, useRef, useState } from 'react';

/**
 * Type of execution output.
 * - command: Shell command execution
 * - output: Standard output from commands
 * - error: Error messages
 * - info: Informational messages
 * - file: File operation result
 */
export type ExecutionOutputType = 'command' | 'output' | 'error' | 'info' | 'file';

/**
 * Status of an execution entry.
 */
export type ExecutionStatus = 'running' | 'success' | 'error';

/**
 * A single execution output entry.
 */
export interface ExecutionEntry {
  id: string;
  type: ExecutionOutputType;
  content: string;
  timestamp: Date;
  status: ExecutionStatus;
  command?: string;
  exitCode?: number;
  filePath?: string;
}

/**
 * State returned by the useExecution hook.
 */
export interface ExecutionState {
  entries: ExecutionEntry[];
  isRunning: boolean;
  runningEntryId: string | null;
}

/**
 * Actions returned by the useExecution hook.
 */
export interface ExecutionActions {
  addCommand: (command: string) => string;
  addOutput: (content: string, type?: ExecutionOutputType) => string;
  appendToEntry: (entryId: string, content: string) => void;
  completeEntry: (entryId: string, exitCode?: number) => void;
  setEntryError: (entryId: string, errorMessage?: string) => void;
  addFileOperation: (filePath: string, operation: string) => string;
  clearEntries: () => void;
}

/**
 * Generates a unique ID for execution entries.
 */
function generateEntryId(): string {
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing execution output state.
 * Handles command execution, output streaming, and file operations.
 *
 * @returns Execution state and actions for managing outputs
 *
 * @example
 * const { entries, isRunning, addCommand, addOutput } = useExecution();
 *
 * // Add a command execution
 * const cmdId = addCommand("npm install");
 * appendToEntry(cmdId, "Installing dependencies...\n");
 * completeEntry(cmdId, 0);
 *
 * // Add informational output
 * addOutput("Task completed successfully", "info");
 */
export function useExecution(): ExecutionState & ExecutionActions {
  const [entries, setEntries] = useState<ExecutionEntry[]>([]);
  const [runningEntryId, setRunningEntryId] = useState<string | null>(null);

  // Use ref to avoid stale closures in streaming callbacks
  const entriesRef = useRef<ExecutionEntry[]>(entries);
  entriesRef.current = entries;

  /**
   * Adds a command execution entry.
   * @returns The ID of the new entry
   */
  const addCommand = useCallback((command: string): string => {
    const id = generateEntryId();
    const entry: ExecutionEntry = {
      id,
      type: 'command',
      content: '',
      command,
      timestamp: new Date(),
      status: 'running',
    };

    setEntries((prev) => [...prev, entry]);
    setRunningEntryId(id);
    return id;
  }, []);

  /**
   * Adds an output entry.
   * @returns The ID of the new entry
   */
  const addOutput = useCallback(
    (content: string, type: ExecutionOutputType = 'output'): string => {
      const id = generateEntryId();
      const entry: ExecutionEntry = {
        id,
        type,
        content,
        timestamp: new Date(),
        status: type === 'error' ? 'error' : 'success',
      };

      setEntries((prev) => [...prev, entry]);
      return id;
    },
    []
  );

  /**
   * Appends content to an existing entry (for streaming output).
   */
  const appendToEntry = useCallback((entryId: string, content: string): void => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, content: entry.content + content }
          : entry
      )
    );
  }, []);

  /**
   * Marks an entry as complete with optional exit code.
   */
  const completeEntry = useCallback((entryId: string, exitCode?: number): void => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              status: exitCode === 0 || exitCode === undefined ? 'success' : 'error',
              exitCode,
            }
          : entry
      )
    );
    setRunningEntryId((current) => (current === entryId ? null : current));
  }, []);

  /**
   * Marks an entry as having an error.
   */
  const setEntryError = useCallback(
    (entryId: string, errorMessage?: string): void => {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                status: 'error' as const,
                content: errorMessage ? entry.content + errorMessage : entry.content,
              }
            : entry
        )
      );
      setRunningEntryId((current) => (current === entryId ? null : current));
    },
    []
  );

  /**
   * Adds a file operation entry.
   * @returns The ID of the new entry
   */
  const addFileOperation = useCallback(
    (filePath: string, operation: string): string => {
      const id = generateEntryId();
      const entry: ExecutionEntry = {
        id,
        type: 'file',
        content: operation,
        filePath,
        timestamp: new Date(),
        status: 'success',
      };

      setEntries((prev) => [...prev, entry]);
      return id;
    },
    []
  );

  /**
   * Clears all entries from the execution history.
   */
  const clearEntries = useCallback((): void => {
    setEntries([]);
    setRunningEntryId(null);
  }, []);

  return {
    entries,
    isRunning: runningEntryId !== null,
    runningEntryId,
    addCommand,
    addOutput,
    appendToEntry,
    completeEntry,
    setEntryError,
    addFileOperation,
    clearEntries,
  };
}
