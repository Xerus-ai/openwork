/**
 * Task Tool
 *
 * Tool for spawning sub-agent tasks with isolated contexts.
 * Provides parallel execution, timeout handling, and result aggregation.
 */

import {
  getTaskManager,
  setTaskBroadcaster,
  clearTaskBroadcaster,
  setTaskExecutor,
  clearTaskExecutor,
  TaskManager,
  type TaskBroadcaster,
  type SubAgentExecutor,
} from "../state/task-manager.js";
import type {
  TaskOptions,
  TaskResult,
  SubAgentContext,
  TaskSummary,
  ToolDefinition,
} from "./types.js";

/**
 * Default timeout for task execution (5 minutes).
 */
const DEFAULT_TIMEOUT_MS = 300000;

/**
 * Maximum timeout allowed (10 minutes).
 */
const MAX_TIMEOUT_MS = 600000;

/**
 * Spawns a new sub-agent task with the given options.
 *
 * @param options - Task configuration including instructions and input
 * @returns Promise resolving to the task result
 *
 * @example
 * ```typescript
 * const result = await spawnTask({
 *   instructions: "Analyze the following code for security issues",
 *   input: "function login(user, pass) { ... }",
 *   timeout: 60000
 * });
 *
 * if (result.success) {
 *   console.log("Analysis:", result.result);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export async function spawnTask(options: TaskOptions): Promise<TaskResult> {
  const { timeout = DEFAULT_TIMEOUT_MS } = options;

  // Validate timeout
  if (timeout > MAX_TIMEOUT_MS) {
    return {
      success: false,
      taskId: "",
      status: "failed",
      error: `Timeout cannot exceed ${MAX_TIMEOUT_MS}ms (${MAX_TIMEOUT_MS / 1000 / 60} minutes)`,
    };
  }

  if (timeout < 1000) {
    return {
      success: false,
      taskId: "",
      status: "failed",
      error: "Timeout must be at least 1000ms (1 second)",
    };
  }

  const manager = getTaskManager();
  return manager.spawnTask(options);
}

/**
 * Cancels a running or pending task.
 *
 * @param taskId - ID of the task to cancel
 * @returns Whether the cancellation was successful
 *
 * @example
 * ```typescript
 * const result = await spawnTask({ instructions: "Long running task" });
 * // Later...
 * const cancelled = cancelTask(result.taskId);
 * console.log("Cancelled:", cancelled);
 * ```
 */
export function cancelTask(taskId: string): boolean {
  const manager = getTaskManager();
  return manager.cancelTask(taskId);
}

/**
 * Gets the current status and details of a task.
 *
 * @param taskId - ID of the task to get
 * @returns The sub-agent context or undefined if not found
 */
export function getTask(taskId: string): SubAgentContext | undefined {
  const manager = getTaskManager();
  return manager.getTask(taskId);
}

/**
 * Gets all tasks tracked by the manager.
 *
 * @returns Array of all sub-agent contexts
 */
export function getAllTasks(): SubAgentContext[] {
  const manager = getTaskManager();
  return manager.getAllTasks();
}

/**
 * Gets summary statistics for all tasks.
 *
 * @returns Task summary with counts by status
 */
export function getTaskSummary(): TaskSummary {
  const manager = getTaskManager();
  return manager.getSummary();
}

/**
 * Clears all finished tasks (completed, failed, cancelled, timed out).
 * Running and pending tasks are preserved.
 *
 * @returns Number of tasks cleared
 */
export function clearFinishedTasks(): number {
  const manager = getTaskManager();
  return manager.clearFinishedTasks();
}

/**
 * Tool definition for the task tool, suitable for Claude API.
 */
export const taskToolDefinition: ToolDefinition = {
  name: "task",
  description: `Spawn a sub-agent to handle a complex, multi-step task autonomously.

Use this for:
- Complex analysis requiring multiple steps
- Tasks that can run in parallel
- Delegating work while continuing with other operations
- Breaking down large problems into smaller pieces

The sub-agent receives instructions and optional input, executes the task,
and returns the result. Tasks have a timeout limit and can be cancelled.

Maximum concurrent sub-agents: 3
Default timeout: ${DEFAULT_TIMEOUT_MS / 1000 / 60} minutes
Maximum timeout: ${MAX_TIMEOUT_MS / 1000 / 60} minutes`,
  input_schema: {
    type: "object",
    properties: {
      instructions: {
        type: "string",
        description: "Instructions for the sub-agent to execute. Be specific about what you want the sub-agent to accomplish.",
      },
      input: {
        type: "string",
        description: "Optional input data to provide to the sub-agent (e.g., code to analyze, data to process).",
      },
      timeout: {
        type: "number",
        description: `Timeout in milliseconds (default: ${DEFAULT_TIMEOUT_MS}, max: ${MAX_TIMEOUT_MS})`,
      },
      description: {
        type: "string",
        description: "Brief description of what this task does (for logging/display)",
      },
    },
    required: ["instructions"],
  },
};

/**
 * Creates a task tool handler function for use with Claude API.
 *
 * @returns A function that handles task tool calls
 *
 * @example
 * ```typescript
 * const handler = createTaskHandler();
 * const result = await handler({
 *   instructions: "Analyze the code for performance issues",
 *   input: "function slow() { ... }"
 * });
 * ```
 */
export function createTaskHandler(): (input: TaskOptions) => Promise<TaskResult> {
  return (input: TaskOptions) => spawnTask(input);
}

// Re-export manager utilities for external configuration
export {
  getTaskManager,
  setTaskBroadcaster,
  clearTaskBroadcaster,
  setTaskExecutor,
  clearTaskExecutor,
  TaskManager,
};

export type { TaskBroadcaster, SubAgentExecutor };
