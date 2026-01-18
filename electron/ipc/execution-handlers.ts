/**
 * Execution IPC Handlers for Tool Event Broadcasting.
 * Tracks file operations and bash commands from the agent,
 * broadcasting them to the renderer for display in ExecutionPane.
 */

import { getAgentBridge } from './agent-bridge.js';

/**
 * Current request ID for correlating execution events.
 */
let currentRequestId: string | null = null;

/**
 * Set the current request ID for execution events.
 * Call this when starting a new agent message processing.
 */
export function setExecutionRequestId(requestId: string | null): void {
  currentRequestId = requestId;
}

/**
 * Get the current request ID for execution events.
 */
export function getExecutionRequestId(): string | null {
  return currentRequestId;
}

/**
 * Broadcast a tool use event to the renderer.
 * Called when a tool is being invoked by the agent.
 *
 * @param toolName - Name of the tool being used
 * @param toolInput - Input parameters for the tool
 * @param toolUseId - Unique identifier for this tool use
 */
export function broadcastToolUse(
  toolName: string,
  toolInput: Record<string, unknown>,
  toolUseId: string
): void {
  const bridge = getAgentBridge();
  const requestId = currentRequestId;

  if (!requestId) {
    console.warn('[ExecutionHandlers] No request ID set for tool use broadcast');
    return;
  }

  console.log('[ExecutionHandlers] Broadcasting tool use:', {
    toolName,
    toolUseId,
    inputKeys: Object.keys(toolInput),
  });

  bridge.sendToolUse(requestId, toolName, toolInput, toolUseId);
}

/**
 * Broadcast a tool result event to the renderer.
 * Called when a tool completes execution.
 *
 * @param toolUseId - Unique identifier for the tool use this result corresponds to
 * @param success - Whether the tool execution succeeded
 * @param output - Tool output content
 * @param error - Error message if tool failed
 */
export function broadcastToolResult(
  toolUseId: string,
  success: boolean,
  output: string,
  error?: string
): void {
  const bridge = getAgentBridge();
  const requestId = currentRequestId;

  if (!requestId) {
    console.warn('[ExecutionHandlers] No request ID set for tool result broadcast');
    return;
  }

  console.log('[ExecutionHandlers] Broadcasting tool result:', {
    toolUseId,
    success,
    outputLength: output.length,
    hasError: !!error,
  });

  bridge.sendToolResult(requestId, toolUseId, success, output, error);
}

/**
 * Map of tool names to their display categories.
 */
export const TOOL_CATEGORIES = {
  // File operations
  file_create: 'file',
  file_write: 'file',
  file_read: 'file',
  file_edit: 'file',
  str_replace: 'file',
  view: 'file',

  // Shell commands
  bash: 'command',
  shell: 'command',

  // Web operations
  web_fetch: 'web',
  web_search: 'web',

  // Task management
  task: 'task',
  todo_write: 'task',
  todo_update: 'task',
  todo_read: 'task',

  // User interaction
  ask_user_question: 'interaction',
} as const;

/**
 * Get the category for a tool name.
 */
export function getToolCategory(toolName: string): string {
  const normalizedName = toolName.toLowerCase().replace(/-/g, '_');
  return TOOL_CATEGORIES[normalizedName as keyof typeof TOOL_CATEGORIES] || 'other';
}

/**
 * Format tool input for display.
 * Extracts the most relevant information for the UI.
 */
export function formatToolInputForDisplay(
  toolName: string,
  toolInput: Record<string, unknown>
): { label: string; detail: string } {
  const category = getToolCategory(toolName);

  switch (category) {
    case 'file': {
      const filePath = (toolInput['file_path'] || toolInput['path'] || toolInput['filePath'] || '') as string;
      const operation = getFileOperation(toolName);
      return {
        label: operation,
        detail: filePath,
      };
    }

    case 'command': {
      const command = (toolInput['command'] || '') as string;
      return {
        label: 'Command',
        detail: command,
      };
    }

    case 'web': {
      const url = (toolInput['url'] || '') as string;
      const query = (toolInput['query'] || '') as string;
      if (toolName.includes('search')) {
        return {
          label: 'Web Search',
          detail: query,
        };
      }
      return {
        label: 'Web Fetch',
        detail: url,
      };
    }

    case 'task': {
      const content = (toolInput['content'] || toolInput['task'] || '') as string;
      return {
        label: 'Task',
        detail: typeof content === 'string' ? content.slice(0, 100) : '',
      };
    }

    case 'interaction': {
      const question = (toolInput['question'] || '') as string;
      return {
        label: 'Question',
        detail: typeof question === 'string' ? question.slice(0, 100) : '',
      };
    }

    default:
      return {
        label: toolName,
        detail: JSON.stringify(toolInput).slice(0, 100),
      };
  }
}

/**
 * Get a human-readable file operation label.
 */
function getFileOperation(toolName: string): string {
  const normalized = toolName.toLowerCase().replace(/-/g, '_');

  if (normalized.includes('create') || normalized.includes('write')) {
    return 'Create File';
  }
  if (normalized.includes('read') || normalized.includes('view')) {
    return 'Read File';
  }
  if (normalized.includes('edit') || normalized.includes('replace')) {
    return 'Edit File';
  }
  return 'File Operation';
}

/**
 * Format tool output for display.
 * Truncates long outputs and handles special cases.
 *
 * @param _toolName - Tool name (reserved for tool-specific formatting)
 * @param output - Tool output content
 * @param maxLength - Maximum length before truncation
 */
export function formatToolOutputForDisplay(
  _toolName: string,
  output: string,
  maxLength: number = 2000
): string {
  // Truncate if too long
  if (output.length > maxLength) {
    return output.slice(0, maxLength) + '\n... (truncated)';
  }
  return output;
}

/**
 * Initialize execution handlers.
 * Sets up any required listeners or state.
 */
export function initializeExecutionHandlers(): void {
  console.log('[ExecutionHandlers] Initialized');
}

/**
 * Clean up execution handlers.
 * Clears state and removes listeners.
 */
export function cleanupExecutionHandlers(): void {
  currentRequestId = null;
  console.log('[ExecutionHandlers] Cleaned up');
}
