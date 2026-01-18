import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProgressItem, ProgressStatus, ProgressSummary } from './useProgress';

/**
 * Calculates summary statistics from progress items.
 */
function calculateSummary(items: ProgressItem[]): ProgressSummary {
  const total = items.length;
  const pending = items.filter((item) => item.status === 'pending').length;
  const inProgress = items.filter((item) => item.status === 'in_progress').length;
  const completed = items.filter((item) => item.status === 'completed').length;
  const blocked = items.filter((item) => item.status === 'blocked').length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    pending,
    inProgress,
    completed,
    blocked,
    percentage,
  };
}

/**
 * Transforms IPC TodoItem to frontend ProgressItem.
 */
function transformTodoItem(todo: TodoItem): ProgressItem {
  return {
    id: todo.id,
    content: todo.content,
    status: todo.status as ProgressStatus,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
    completedAt: todo.completedAt,
    blockedReason: todo.blockedReason,
  };
}

/**
 * State returned by the useTodoList hook.
 */
export interface TodoListState {
  items: ProgressItem[];
  summary: ProgressSummary;
  currentItemId: string | null;
  isConnected: boolean;
  lastUpdateRequestId: string | null;
}

/**
 * Actions returned by the useTodoList hook.
 */
export interface TodoListActions {
  clearItems: () => void;
}

/**
 * Hook for receiving TodoList updates from the agent via IPC.
 * Listens to agent:todo-update events and transforms them to ProgressItem format.
 *
 * This hook connects to the Electron IPC bridge to receive real-time
 * TodoList updates from the agent backend.
 *
 * @returns TodoList state and actions
 *
 * @example
 * const { items, summary, currentItemId } = useTodoList();
 *
 * // Display progress in UI
 * <ProgressSection items={items} summary={summary} currentItemId={currentItemId} />
 */
export function useTodoList(): TodoListState & TodoListActions {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdateRequestId, setLastUpdateRequestId] = useState<string | null>(null);

  /**
   * Subscribe to TodoList updates from IPC on mount.
   */
  useEffect(() => {
    const agentAPI = window.electronAgentAPI;

    if (!agentAPI) {
      console.warn('[useTodoList] electronAgentAPI not available');
      return;
    }

    setIsConnected(true);

    // Handle TodoList updates from the agent
    const unsubscribe = agentAPI.onTodoUpdate((update: AgentTodoUpdate) => {
      console.log('[useTodoList] Received todo update:', {
        requestId: update.requestId,
        todoCount: update.todos.length,
      });

      const progressItems = update.todos.map(transformTodoItem);
      setItems(progressItems);
      setLastUpdateRequestId(update.requestId);
    });

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, []);

  /**
   * Calculates the current in-progress item ID.
   */
  const currentItemId = useMemo(() => {
    const inProgressItem = items.find((item) => item.status === 'in_progress');
    return inProgressItem?.id ?? null;
  }, [items]);

  /**
   * Calculates summary statistics.
   */
  const summary = useMemo(() => calculateSummary(items), [items]);

  /**
   * Clears all items from local state.
   * Note: This only clears the UI state, not the backend TodoList.
   */
  const clearItems = useCallback((): void => {
    setItems([]);
    setLastUpdateRequestId(null);
  }, []);

  return {
    items,
    summary,
    currentItemId,
    isConnected,
    lastUpdateRequestId,
    clearItems,
  };
}
