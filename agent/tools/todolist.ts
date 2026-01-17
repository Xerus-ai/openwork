/**
 * TodoList Tools
 *
 * Implements TodoWrite, TodoUpdate, and TodoRead tools for agent progress tracking.
 * Uses the centralized TodoListManager for state management with IPC broadcasting.
 */

import {
  getTodoListManager,
  type TodoListBroadcaster,
} from "../state/todolist-manager.js";
import type {
  TodoReadResult,
  TodoStatus,
  TodoUpdateOptions,
  TodoUpdateResult,
  TodoWriteOptions,
  TodoWriteResult,
  ToolDefinition,
} from "./types.js";

/**
 * Validates TodoWrite options.
 * @returns Error message if invalid, undefined if valid
 */
function validateTodoWriteOptions(options: TodoWriteOptions): string | undefined {
  if (!options.tasks) {
    return "tasks is required";
  }

  if (!Array.isArray(options.tasks)) {
    return "tasks must be an array";
  }

  if (options.tasks.length === 0) {
    return "tasks array cannot be empty";
  }

  for (let i = 0; i < options.tasks.length; i++) {
    const task = options.tasks[i];
    if (typeof task !== "string") {
      return `tasks[${i}] must be a string`;
    }
    if (task.trim() === "") {
      return `tasks[${i}] cannot be empty`;
    }
  }

  return undefined;
}

/**
 * Validates TodoUpdate options.
 * @returns Error message if invalid, undefined if valid
 */
function validateTodoUpdateOptions(options: TodoUpdateOptions): string | undefined {
  if (!options.taskId) {
    return "taskId is required";
  }

  if (typeof options.taskId !== "string") {
    return "taskId must be a string";
  }

  if (!options.status) {
    return "status is required";
  }

  const validStatuses: TodoStatus[] = ["pending", "in_progress", "completed", "blocked"];
  if (!validStatuses.includes(options.status)) {
    return `status must be one of: ${validStatuses.join(", ")}`;
  }

  if (options.status === "blocked" && !options.blockedReason) {
    return "blockedReason is required when status is blocked";
  }

  return undefined;
}

/**
 * Creates a new TodoList with the specified tasks.
 *
 * @param options - TodoWrite options containing task descriptions
 * @returns Result with the created TodoList
 *
 * @example
 * ```typescript
 * const result = await todoWrite({
 *   tasks: [
 *     "Research existing patterns",
 *     "Design the solution",
 *     "Implement core functionality",
 *     "Write tests"
 *   ]
 * });
 * ```
 */
export async function todoWrite(options: TodoWriteOptions): Promise<TodoWriteResult> {
  const validationError = validateTodoWriteOptions(options);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  try {
    const manager = getTodoListManager();
    const todoList = manager.createTodoList(options.tasks);

    return {
      success: true,
      todoList,
      taskCount: todoList.items.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to create TodoList: ${message}`,
    };
  }
}

/**
 * Updates the status of a specific task in the TodoList.
 *
 * @param options - TodoUpdate options with taskId and new status
 * @returns Result with the updated TodoItem
 *
 * @example
 * ```typescript
 * // Start working on a task
 * const result = await todoUpdate({
 *   taskId: "todo_123_0",
 *   status: "in_progress"
 * });
 *
 * // Mark as completed
 * const result = await todoUpdate({
 *   taskId: "todo_123_0",
 *   status: "completed"
 * });
 *
 * // Mark as blocked
 * const result = await todoUpdate({
 *   taskId: "todo_123_1",
 *   status: "blocked",
 *   blockedReason: "Waiting for API access"
 * });
 * ```
 */
export async function todoUpdate(options: TodoUpdateOptions): Promise<TodoUpdateResult> {
  const validationError = validateTodoUpdateOptions(options);
  if (validationError) {
    return {
      success: false,
      error: validationError,
    };
  }

  try {
    const manager = getTodoListManager();
    const updatedItem = manager.updateTaskStatus(
      options.taskId,
      options.status,
      options.blockedReason
    );

    return {
      success: true,
      updatedItem,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Reads the current TodoList state.
 *
 * @returns Result with the current TodoList and summary statistics
 *
 * @example
 * ```typescript
 * const result = await todoRead();
 * if (result.success && result.todoList) {
 *   console.log(`Total tasks: ${result.summary.total}`);
 *   console.log(`Completed: ${result.summary.completed}`);
 * }
 * ```
 */
export async function todoRead(): Promise<TodoReadResult> {
  try {
    const manager = getTodoListManager();
    const todoList = manager.getTodoList();

    if (!todoList) {
      return {
        success: true,
        todoList: undefined,
        summary: undefined,
      };
    }

    const summary = manager.getSummary();

    return {
      success: true,
      todoList,
      summary: summary ?? undefined,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Failed to read TodoList: ${message}`,
    };
  }
}

/**
 * Tool definition for the todo_write tool.
 */
export const todoWriteToolDefinition: ToolDefinition = {
  name: "todo_write",
  description: `Create a new TodoList with tasks to track progress.

Use this when:
- Starting a new multi-step task
- Planning work that needs to be tracked
- Breaking down a complex task into subtasks

The TodoList replaces any existing list. Each task starts with 'pending' status.
Tasks are displayed in the UI's progress section for user visibility.`,
  input_schema: {
    type: "object",
    properties: {
      tasks: {
        type: "array",
        description: "List of task descriptions to create",
      },
    },
    required: ["tasks"],
  },
};

/**
 * Tool definition for the todo_update tool.
 */
export const todoUpdateToolDefinition: ToolDefinition = {
  name: "todo_update",
  description: `Update the status of a task in the TodoList.

Valid status transitions:
- pending -> in_progress, blocked
- in_progress -> completed, blocked, pending (revert)
- blocked -> pending (unblock)
- completed -> pending (reopen)

Important:
- Only ONE task should be in_progress at a time
- Mark tasks as completed immediately after finishing
- Provide blockedReason when setting status to 'blocked'`,
  input_schema: {
    type: "object",
    properties: {
      taskId: {
        type: "string",
        description: "ID of the task to update",
      },
      status: {
        type: "string",
        description: "New status: pending, in_progress, completed, or blocked",
        enum: ["pending", "in_progress", "completed", "blocked"],
      },
      blockedReason: {
        type: "string",
        description: "Reason for blocking (required if status is blocked)",
      },
    },
    required: ["taskId", "status"],
  },
};

/**
 * Tool definition for the todo_read tool.
 */
export const todoReadToolDefinition: ToolDefinition = {
  name: "todo_read",
  description: `Read the current TodoList state.

Returns:
- All tasks with their current status
- Summary statistics (total, pending, in_progress, completed, blocked)

Use this to:
- Check current progress
- Find the next pending task to work on
- Review what's been completed`,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

/**
 * Creates a TodoWrite tool handler.
 *
 * @param broadcaster - Optional callback to broadcast TodoList updates
 * @returns Handler function for todo_write tool calls
 */
export function createTodoWriteHandler(
  broadcaster?: TodoListBroadcaster
): (input: TodoWriteOptions) => Promise<TodoWriteResult> {
  if (broadcaster) {
    const manager = getTodoListManager();
    manager.setBroadcaster(broadcaster);
  }

  return todoWrite;
}

/**
 * Creates a TodoUpdate tool handler.
 *
 * @param broadcaster - Optional callback to broadcast TodoList updates
 * @returns Handler function for todo_update tool calls
 */
export function createTodoUpdateHandler(
  broadcaster?: TodoListBroadcaster
): (input: TodoUpdateOptions) => Promise<TodoUpdateResult> {
  if (broadcaster) {
    const manager = getTodoListManager();
    manager.setBroadcaster(broadcaster);
  }

  return todoUpdate;
}

/**
 * Creates a TodoRead tool handler.
 *
 * @returns Handler function for todo_read tool calls
 */
export function createTodoReadHandler(): () => Promise<TodoReadResult> {
  return todoRead;
}

// Re-export types and manager functions for convenience
export type { TodoListBroadcaster };
export {
  clearTodoListBroadcaster,
  getTodoListManager,
  setTodoListBroadcaster,
  TodoListManager,
} from "../state/todolist-manager.js";
