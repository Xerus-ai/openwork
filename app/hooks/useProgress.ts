import { useCallback, useMemo, useState } from 'react';

/**
 * Status of a progress item.
 * Matches TodoStatus from agent tools.
 */
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

/**
 * A single progress item representing a task.
 */
export interface ProgressItem {
  /** Unique identifier for the item */
  id: string;
  /** Description of the task */
  content: string;
  /** Current status */
  status: ProgressStatus;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
  /** ISO timestamp when completed (if completed) */
  completedAt?: string;
  /** Reason for being blocked (if blocked) */
  blockedReason?: string;
}

/**
 * Summary statistics for progress.
 */
export interface ProgressSummary {
  /** Total number of items */
  total: number;
  /** Number of pending items */
  pending: number;
  /** Number of in-progress items */
  inProgress: number;
  /** Number of completed items */
  completed: number;
  /** Number of blocked items */
  blocked: number;
  /** Completion percentage (0-100) */
  percentage: number;
}

/**
 * State returned by the useProgress hook.
 */
export interface ProgressState {
  items: ProgressItem[];
  summary: ProgressSummary;
  currentItemId: string | null;
}

/**
 * Actions returned by the useProgress hook.
 */
export interface ProgressActions {
  setItems: (items: ProgressItem[]) => void;
  addItem: (content: string) => string;
  updateStatus: (id: string, status: ProgressStatus, blockedReason?: string) => void;
  removeItem: (id: string) => void;
  clearItems: () => void;
}

/**
 * Generates a unique ID for progress items.
 */
function generateProgressId(): string {
  return `progress-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates summary statistics from a list of progress items.
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
 * Hook for managing progress/todo list state.
 * Provides items, summary statistics, and actions for manipulation.
 *
 * @returns Progress state and actions for managing items
 *
 * @example
 * const { items, summary, currentItemId, setItems, updateStatus } = useProgress();
 *
 * // Set items from backend
 * setItems(todoListFromBackend.items);
 *
 * // Update a task status
 * updateStatus('task-1', 'completed');
 */
export function useProgress(): ProgressState & ProgressActions {
  const [items, setItemsState] = useState<ProgressItem[]>([]);

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
   * Sets the entire items list (typically from backend sync).
   */
  const setItems = useCallback((newItems: ProgressItem[]): void => {
    setItemsState(newItems);
  }, []);

  /**
   * Adds a new item to the progress list.
   * @returns The ID of the new item
   */
  const addItem = useCallback((content: string): string => {
    const id = generateProgressId();
    const now = new Date().toISOString();

    const newItem: ProgressItem = {
      id,
      content,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    setItemsState((prev) => [...prev, newItem]);
    return id;
  }, []);

  /**
   * Updates the status of an item.
   */
  const updateStatus = useCallback(
    (id: string, status: ProgressStatus, blockedReason?: string): void => {
      const now = new Date().toISOString();

      setItemsState((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;

          const updates: Partial<ProgressItem> = {
            status,
            updatedAt: now,
          };

          if (status === 'completed') {
            updates.completedAt = now;
            updates.blockedReason = undefined;
          } else if (status === 'blocked') {
            updates.blockedReason = blockedReason;
            updates.completedAt = undefined;
          } else {
            updates.blockedReason = undefined;
            updates.completedAt = undefined;
          }

          return { ...item, ...updates };
        })
      );
    },
    []
  );

  /**
   * Removes an item from the list.
   */
  const removeItem = useCallback((id: string): void => {
    setItemsState((prev) => prev.filter((item) => item.id !== id));
  }, []);

  /**
   * Clears all items from the list.
   */
  const clearItems = useCallback((): void => {
    setItemsState([]);
  }, []);

  return {
    items,
    summary,
    currentItemId,
    setItems,
    addItem,
    updateStatus,
    removeItem,
    clearItems,
  };
}
