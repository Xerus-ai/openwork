/**
 * TodoList IPC Handlers.
 * Connects the TodoListManager to the IPC bridge for real-time UI updates.
 */

import { AgentBridge, getAgentBridge } from './agent-bridge.js';
import type { TodoItem as IpcTodoItem } from './message-types.js';

/**
 * TodoItem from the agent backend.
 * This matches the structure in agent/tools/types.ts.
 */
interface AgentTodoItem {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  blockedReason?: string;
}

/**
 * TodoList from the agent backend.
 */
interface AgentTodoList {
  items: AgentTodoItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Current request ID for correlating TodoList updates with the active request.
 */
let currentRequestId: string | null = null;

/**
 * Sets the current request ID for TodoList broadcasts.
 * Call this when starting to process a new message.
 */
export function setCurrentRequestId(requestId: string | null): void {
  currentRequestId = requestId;
}

/**
 * Gets the current request ID.
 */
export function getCurrentRequestId(): string | null {
  return currentRequestId;
}

/**
 * Transforms an agent TodoItem to an IPC TodoItem.
 */
function transformTodoItem(item: AgentTodoItem): IpcTodoItem {
  return {
    id: item.id,
    content: item.content,
    status: item.status,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    completedAt: item.completedAt,
    blockedReason: item.blockedReason,
  };
}

/**
 * Creates a broadcaster function for the TodoListManager.
 * The broadcaster sends TodoList updates to the renderer via IPC.
 *
 * @param bridge - The AgentBridge to use for sending updates
 * @returns A broadcaster function compatible with TodoListManager.setBroadcaster()
 */
export function createTodoListBroadcaster(
  bridge: AgentBridge
): (todoList: AgentTodoList) => void {
  return (todoList: AgentTodoList): void => {
    const requestId = currentRequestId;

    if (!requestId) {
      console.warn('[TodoListHandlers] No current request ID for todo broadcast');
      return;
    }

    console.log('[TodoListHandlers] Broadcasting todo update:', {
      requestId,
      itemCount: todoList.items.length,
    });

    // Transform and send the update
    const ipcTodos = todoList.items.map(transformTodoItem);
    bridge.sendTodoUpdate(requestId, ipcTodos);
  };
}

/**
 * Initializes TodoList IPC handlers.
 * Sets up the broadcaster on the global TodoListManager.
 *
 * Note: This requires dynamic import of the agent module since it's
 * a separate TypeScript project.
 */
export function initializeTodoListHandlers(): void {
  const bridge = getAgentBridge();
  const broadcaster = createTodoListBroadcaster(bridge);

  console.log('[TodoListHandlers] TodoList broadcaster ready');
  console.log('[TodoListHandlers] Note: Broadcaster must be set on TodoListManager');

  // Export the broadcaster for use by the chat handler
  (global as Record<string, unknown>).__todoListBroadcaster = broadcaster;
}

/**
 * Gets the TodoList broadcaster for use by other modules.
 */
export function getTodoListBroadcaster(): ((todoList: AgentTodoList) => void) | undefined {
  return (global as Record<string, unknown>).__todoListBroadcaster as
    | ((todoList: AgentTodoList) => void)
    | undefined;
}

/**
 * Cleans up TodoList handlers.
 */
export function cleanupTodoListHandlers(): void {
  currentRequestId = null;
  delete (global as Record<string, unknown>).__todoListBroadcaster;
  console.log('[TodoListHandlers] Cleaned up');
}
