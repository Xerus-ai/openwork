/**
 * TodoList Manager
 *
 * Centralized state management for the TodoList with IPC broadcasting support.
 * Handles task lifecycle, state transitions, and real-time UI updates.
 */

import type {
  TodoItem,
  TodoList,
  TodoStatus,
  TodoSummary,
} from "../tools/types.js";

/**
 * Callback function type for broadcasting TodoList updates via IPC.
 * Called whenever the TodoList state changes.
 */
export type TodoListBroadcaster = (todoList: TodoList) => void;

/**
 * Valid state transitions for todo items.
 * Only allowed transitions:
 * - pending -> in_progress, blocked
 * - in_progress -> completed, blocked, pending (revert)
 * - blocked -> pending (unblock)
 * - completed -> pending (reopen)
 */
const VALID_TRANSITIONS: Record<TodoStatus, TodoStatus[]> = {
  pending: ["in_progress", "blocked"],
  in_progress: ["completed", "blocked", "pending"],
  blocked: ["pending"],
  completed: ["pending"],
};

/**
 * Generates a unique ID for a todo item.
 * Uses a simple counter-based approach with timestamp prefix for uniqueness.
 */
function generateTodoId(index: number): string {
  return `todo_${Date.now()}_${index}`;
}

/**
 * Manages the TodoList state with support for IPC broadcasting.
 */
export class TodoListManager {
  private todoList: TodoList | null = null;
  private broadcaster: TodoListBroadcaster | null = null;

  /**
   * Sets the broadcaster callback for IPC updates.
   * @param broadcaster - Function to call when the TodoList changes
   */
  setBroadcaster(broadcaster: TodoListBroadcaster): void {
    this.broadcaster = broadcaster;
  }

  /**
   * Clears the broadcaster callback.
   */
  clearBroadcaster(): void {
    this.broadcaster = null;
  }

  /**
   * Returns whether a broadcaster is configured.
   */
  hasBroadcaster(): boolean {
    return this.broadcaster !== null;
  }

  /**
   * Creates a new TodoList with the specified tasks.
   * Replaces any existing TodoList.
   *
   * @param tasks - Array of task descriptions
   * @returns The created TodoList
   * @throws Error if tasks array is empty
   */
  createTodoList(tasks: string[]): TodoList {
    if (tasks.length === 0) {
      throw new Error("Cannot create TodoList with no tasks");
    }

    const now = new Date().toISOString();
    const items: TodoItem[] = tasks.map((content, index) => ({
      id: generateTodoId(index),
      content: content.trim(),
      status: "pending" as TodoStatus,
      createdAt: now,
      updatedAt: now,
    }));

    this.todoList = {
      items,
      createdAt: now,
      updatedAt: now,
    };

    this.broadcast();
    return this.todoList;
  }

  /**
   * Updates the status of a specific todo item.
   *
   * @param taskId - ID of the task to update
   * @param newStatus - New status for the task
   * @param blockedReason - Required reason if status is 'blocked'
   * @returns The updated TodoItem
   * @throws Error if no TodoList exists, task not found, or invalid transition
   */
  updateTaskStatus(
    taskId: string,
    newStatus: TodoStatus,
    blockedReason?: string
  ): TodoItem {
    if (!this.todoList) {
      throw new Error("No TodoList exists. Create one first with TodoWrite.");
    }

    const itemIndex = this.todoList.items.findIndex((item) => item.id === taskId);
    if (itemIndex === -1) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const item = this.todoList.items[itemIndex] as TodoItem;
    const currentStatus = item.status;

    // Validate state transition
    if (!VALID_TRANSITIONS[currentStatus].includes(newStatus)) {
      throw new Error(
        `Invalid state transition: ${currentStatus} -> ${newStatus}. ` +
        `Allowed transitions from ${currentStatus}: ${VALID_TRANSITIONS[currentStatus].join(", ")}`
      );
    }

    // Validate blocked reason
    if (newStatus === "blocked" && !blockedReason) {
      throw new Error("blockedReason is required when setting status to blocked");
    }

    const now = new Date().toISOString();
    const updatedItem: TodoItem = {
      id: item.id,
      content: item.content,
      createdAt: item.createdAt,
      status: newStatus,
      updatedAt: now,
    };

    // Set completedAt for completed status
    if (newStatus === "completed") {
      updatedItem.completedAt = now;
    }

    // Set blockedReason if blocked
    if (newStatus === "blocked") {
      updatedItem.blockedReason = blockedReason;
    }

    // Update the item in the list
    this.todoList.items[itemIndex] = updatedItem;
    this.todoList.updatedAt = now;

    this.broadcast();
    return updatedItem;
  }

  /**
   * Returns the current TodoList.
   * @returns The current TodoList or null if none exists
   */
  getTodoList(): TodoList | null {
    return this.todoList;
  }

  /**
   * Returns summary statistics for the current TodoList.
   * @returns Summary statistics or null if no TodoList exists
   */
  getSummary(): TodoSummary | null {
    if (!this.todoList) {
      return null;
    }

    const summary: TodoSummary = {
      total: this.todoList.items.length,
      pending: 0,
      inProgress: 0,
      completed: 0,
      blocked: 0,
    };

    for (const item of this.todoList.items) {
      switch (item.status) {
        case "pending":
          summary.pending++;
          break;
        case "in_progress":
          summary.inProgress++;
          break;
        case "completed":
          summary.completed++;
          break;
        case "blocked":
          summary.blocked++;
          break;
      }
    }

    return summary;
  }

  /**
   * Finds a task by its ID.
   * @param taskId - ID of the task to find
   * @returns The TodoItem or undefined if not found
   */
  getTaskById(taskId: string): TodoItem | undefined {
    return this.todoList?.items.find((item) => item.id === taskId);
  }

  /**
   * Returns tasks with a specific status.
   * @param status - Status to filter by
   * @returns Array of matching TodoItems
   */
  getTasksByStatus(status: TodoStatus): TodoItem[] {
    if (!this.todoList) {
      return [];
    }
    return this.todoList.items.filter((item) => item.status === status);
  }

  /**
   * Clears the current TodoList.
   */
  clearTodoList(): void {
    this.todoList = null;
    this.broadcast();
  }

  /**
   * Broadcasts the current TodoList state via the configured broadcaster.
   */
  private broadcast(): void {
    if (this.broadcaster && this.todoList) {
      this.broadcaster(this.todoList);
    }
  }
}

/**
 * Global TodoListManager instance.
 */
const globalTodoListManager = new TodoListManager();

/**
 * Returns the global TodoListManager instance.
 */
export function getTodoListManager(): TodoListManager {
  return globalTodoListManager;
}

/**
 * Sets the broadcaster for the global TodoListManager.
 */
export function setTodoListBroadcaster(broadcaster: TodoListBroadcaster): void {
  globalTodoListManager.setBroadcaster(broadcaster);
}

/**
 * Clears the broadcaster from the global TodoListManager.
 */
export function clearTodoListBroadcaster(): void {
  globalTodoListManager.clearBroadcaster();
}
