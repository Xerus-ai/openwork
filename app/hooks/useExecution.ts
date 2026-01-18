import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Type of execution output.
 * - command: Shell command execution
 * - output: Standard output from commands
 * - error: Error messages
 * - info: Informational messages
 * - file: File operation result
 * - tool: Generic tool execution
 * - web: Web fetch/search operation
 */
export type ExecutionOutputType = 'command' | 'output' | 'error' | 'info' | 'file' | 'tool' | 'web';

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
  toolName?: string;
  toolUseId?: string;
  toolInput?: Record<string, unknown>;
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
 * Map tool names to execution output types.
 */
function getExecutionTypeForTool(toolName: string): ExecutionOutputType {
  const normalized = toolName.toLowerCase().replace(/-/g, '_');

  // File operations
  if (
    normalized.includes('file') ||
    normalized.includes('str_replace') ||
    normalized.includes('view') ||
    normalized === 'read' ||
    normalized === 'write' ||
    normalized === 'edit'
  ) {
    return 'file';
  }

  // Shell commands
  if (normalized === 'bash' || normalized === 'shell' || normalized === 'command') {
    return 'command';
  }

  // Web operations
  if (normalized.includes('web') || normalized.includes('fetch') || normalized.includes('search')) {
    return 'web';
  }

  return 'tool';
}

/**
 * Get a human-readable label for a tool.
 */
function getToolLabel(toolName: string): string {
  const normalized = toolName.toLowerCase().replace(/-/g, '_');

  switch (normalized) {
    case 'file_create':
    case 'file_write':
    case 'write':
      return 'Create File';
    case 'file_read':
    case 'view':
    case 'read':
      return 'Read File';
    case 'str_replace':
    case 'file_edit':
    case 'edit':
      return 'Edit File';
    case 'bash':
    case 'shell':
      return 'Run Command';
    case 'web_fetch':
      return 'Fetch URL';
    case 'web_search':
      return 'Web Search';
    case 'todo_write':
    case 'todo_update':
      return 'Update Tasks';
    case 'todo_read':
      return 'Read Tasks';
    case 'ask_user_question':
      return 'Ask Question';
    default:
      return toolName;
  }
}

/**
 * Extract the most relevant detail from tool input.
 */
function getToolDetail(toolName: string, toolInput: Record<string, unknown>): string {
  const normalized = toolName.toLowerCase().replace(/-/g, '_');

  // File operations - get file path
  if (
    normalized.includes('file') ||
    normalized.includes('str_replace') ||
    normalized.includes('view') ||
    normalized === 'read' ||
    normalized === 'write' ||
    normalized === 'edit'
  ) {
    return (
      (toolInput['file_path'] as string) ||
      (toolInput['path'] as string) ||
      (toolInput['filePath'] as string) ||
      ''
    );
  }

  // Shell commands - get command
  if (normalized === 'bash' || normalized === 'shell') {
    return (toolInput['command'] as string) || '';
  }

  // Web operations
  if (normalized.includes('web') || normalized.includes('fetch')) {
    return (toolInput['url'] as string) || (toolInput['query'] as string) || '';
  }

  // Default to JSON preview
  const str = JSON.stringify(toolInput);
  return str.length > 100 ? str.slice(0, 100) + '...' : str;
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

  // Map tool use IDs to entry IDs for result correlation
  const toolUseToEntryRef = useRef<Map<string, string>>(new Map());

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
    toolUseToEntryRef.current.clear();
  }, []);

  /**
   * Subscribe to tool use and result events from the agent.
   */
  useEffect(() => {
    const api = window.electronAgentAPI;
    if (!api) {
      console.warn('[useExecution] electronAgentAPI not available');
      return;
    }

    // Handle tool use events - create a new entry for the tool
    const cleanupToolUse = api.onToolUse((toolUse) => {
      const { toolName, toolInput, toolUseId } = toolUse;
      const execType = getExecutionTypeForTool(toolName);
      const label = getToolLabel(toolName);
      const detail = getToolDetail(toolName, toolInput);

      const id = generateEntryId();

      // Store mapping for result correlation
      toolUseToEntryRef.current.set(toolUseId, id);

      // Create entry based on tool type
      if (execType === 'command') {
        // For bash commands, use the command display format
        const entry: ExecutionEntry = {
          id,
          type: 'command',
          content: '',
          command: detail,
          timestamp: new Date(),
          status: 'running',
          toolName,
          toolUseId,
          toolInput,
        };
        setEntries((prev) => [...prev, entry]);
        setRunningEntryId(id);
      } else if (execType === 'file') {
        // For file operations, show file path
        const entry: ExecutionEntry = {
          id,
          type: 'file',
          content: label,
          filePath: detail,
          timestamp: new Date(),
          status: 'running',
          toolName,
          toolUseId,
          toolInput,
        };
        setEntries((prev) => [...prev, entry]);
        setRunningEntryId(id);
      } else {
        // For other tools, use generic format
        const entry: ExecutionEntry = {
          id,
          type: execType,
          content: `${label}: ${detail}`,
          timestamp: new Date(),
          status: 'running',
          toolName,
          toolUseId,
          toolInput,
        };
        setEntries((prev) => [...prev, entry]);
        setRunningEntryId(id);
      }
    });

    // Handle tool result events - update the corresponding entry
    const cleanupToolResult = api.onToolResult((result) => {
      const { toolUseId, success, output, error } = result;

      // Find the entry ID for this tool use
      const entryId = toolUseToEntryRef.current.get(toolUseId);
      if (!entryId) {
        console.warn('[useExecution] No entry found for tool use:', toolUseId);
        return;
      }

      // Update the entry with the result
      setEntries((prev) =>
        prev.map((entry) => {
          if (entry.id !== entryId) return entry;

          // For commands, append output
          if (entry.type === 'command') {
            return {
              ...entry,
              content: output || '',
              status: success ? 'success' : 'error',
              exitCode: success ? 0 : 1,
            };
          }

          // For file operations, mark complete (content is already the operation label)
          if (entry.type === 'file') {
            return {
              ...entry,
              status: success ? 'success' : 'error',
              content: success ? entry.content : `${entry.content} (failed)`,
            };
          }

          // For other types, update content and status
          return {
            ...entry,
            content: error ? `Error: ${error}` : output || entry.content,
            status: success ? 'success' : 'error',
          };
        })
      );

      // Clear running state if this was the running entry
      setRunningEntryId((current) => (current === entryId ? null : current));

      // Clean up the mapping
      toolUseToEntryRef.current.delete(toolUseId);
    });

    // Cleanup subscriptions on unmount
    return () => {
      cleanupToolUse();
      cleanupToolResult();
    };
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
