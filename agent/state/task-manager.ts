/**
 * Task Manager
 *
 * Centralized state management for sub-agent tasks with lifecycle management.
 * Handles task spawning, execution, cancellation, and result aggregation.
 */

import type {
  SubAgentContext,
  SubAgentStatus,
  TaskOptions,
  TaskResult,
  TaskSummary,
} from "../tools/types.js";

/**
 * Callback function type for broadcasting task updates via IPC.
 * Called whenever a task's state changes.
 */
export type TaskBroadcaster = (task: SubAgentContext) => void;

/**
 * Interface for sub-agent executor.
 * Allows dependency injection for testing.
 */
export interface SubAgentExecutor {
  /**
   * Executes a sub-agent task with the given context.
   * @param context - The sub-agent context containing instructions and input
   * @returns Promise resolving to the result string
   */
  execute(context: SubAgentContext): Promise<string>;
}

/**
 * Default timeout for sub-agent execution (5 minutes).
 */
const DEFAULT_TIMEOUT_MS = 300000;

/**
 * Maximum number of concurrent sub-agents allowed.
 */
const MAX_CONCURRENT_AGENTS = 3;

/**
 * Generates a unique ID for a sub-agent task.
 * Uses timestamp with random suffix for uniqueness.
 */
function generateTaskId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
}

/**
 * Manages sub-agent task lifecycle with support for IPC broadcasting.
 */
export class TaskManager {
  private tasks: Map<string, SubAgentContext> = new Map();
  private broadcaster: TaskBroadcaster | null = null;
  private executor: SubAgentExecutor | null = null;
  private runningCount = 0;

  /**
   * Sets the broadcaster callback for IPC updates.
   * @param broadcaster - Function to call when a task changes
   */
  setBroadcaster(broadcaster: TaskBroadcaster): void {
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
   * Sets the sub-agent executor.
   * @param executor - Executor to use for running sub-agents
   */
  setExecutor(executor: SubAgentExecutor): void {
    this.executor = executor;
  }

  /**
   * Clears the sub-agent executor.
   */
  clearExecutor(): void {
    this.executor = null;
  }

  /**
   * Returns whether an executor is configured.
   */
  hasExecutor(): boolean {
    return this.executor !== null;
  }

  /**
   * Returns the current number of running tasks.
   */
  getRunningCount(): number {
    return this.runningCount;
  }

  /**
   * Returns the maximum number of concurrent agents allowed.
   */
  getMaxConcurrent(): number {
    return MAX_CONCURRENT_AGENTS;
  }

  /**
   * Creates and spawns a new sub-agent task.
   *
   * @param options - Task options including instructions and input
   * @returns Promise resolving to the task result
   * @throws Error if no executor is configured or max concurrent limit reached
   */
  async spawnTask(options: TaskOptions): Promise<TaskResult> {
    if (!this.executor) {
      return {
        success: false,
        taskId: "",
        status: "failed",
        error: "No executor configured. Set an executor before spawning tasks.",
      };
    }

    // Check concurrent limit
    if (this.runningCount >= MAX_CONCURRENT_AGENTS) {
      return {
        success: false,
        taskId: "",
        status: "failed",
        error: `Maximum concurrent agents (${MAX_CONCURRENT_AGENTS}) reached. Wait for running tasks to complete.`,
      };
    }

    const { instructions, input, timeout = DEFAULT_TIMEOUT_MS } = options;

    // Validate instructions
    if (!instructions || instructions.trim().length === 0) {
      return {
        success: false,
        taskId: "",
        status: "failed",
        error: "Instructions are required for spawning a task.",
      };
    }

    const taskId = generateTaskId();
    const now = new Date().toISOString();

    const context: SubAgentContext = {
      id: taskId,
      instructions: instructions.trim(),
      input: input?.trim(),
      status: "pending",
      createdAt: now,
    };

    this.tasks.set(taskId, context);
    this.broadcast(context);

    // Start execution
    return this.executeTask(context, timeout);
  }

  /**
   * Executes a task with timeout handling.
   *
   * @param context - The sub-agent context
   * @param timeout - Timeout in milliseconds
   * @returns Promise resolving to the task result
   */
  private async executeTask(
    context: SubAgentContext,
    timeout: number
  ): Promise<TaskResult> {
    const taskId = context.id;

    // Update status to running
    context.status = "running";
    context.startedAt = new Date().toISOString();
    this.tasks.set(taskId, context);
    this.runningCount++;
    this.broadcast(context);

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("TIMEOUT"));
        }, timeout);
      });

      // Execute with timeout
      const result = await Promise.race([
        this.executor!.execute(context),
        timeoutPromise,
      ]);

      // Update context with result
      context.status = "completed";
      context.completedAt = new Date().toISOString();
      context.result = result;
      this.tasks.set(taskId, context);
      this.runningCount--;
      this.broadcast(context);

      return {
        success: true,
        taskId,
        status: "completed",
        result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isTimeout = errorMessage === "TIMEOUT";

      context.status = isTimeout ? "timeout" : "failed";
      context.completedAt = new Date().toISOString();
      context.error = isTimeout ? "Task timed out" : errorMessage;
      this.tasks.set(taskId, context);
      this.runningCount--;
      this.broadcast(context);

      return {
        success: false,
        taskId,
        status: context.status,
        timedOut: isTimeout,
        error: context.error,
      };
    }
  }

  /**
   * Cancels a running or pending task.
   *
   * @param taskId - ID of the task to cancel
   * @returns Whether the cancellation was successful
   */
  cancelTask(taskId: string): boolean {
    const context = this.tasks.get(taskId);
    if (!context) {
      return false;
    }

    // Can only cancel pending or running tasks
    if (context.status !== "pending" && context.status !== "running") {
      return false;
    }

    const wasRunning = context.status === "running";
    context.status = "cancelled";
    context.completedAt = new Date().toISOString();
    context.error = "Task was cancelled";
    this.tasks.set(taskId, context);

    if (wasRunning) {
      this.runningCount--;
    }

    this.broadcast(context);
    return true;
  }

  /**
   * Gets a task by its ID.
   *
   * @param taskId - ID of the task to get
   * @returns The sub-agent context or undefined if not found
   */
  getTask(taskId: string): SubAgentContext | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Gets all tasks.
   *
   * @returns Array of all sub-agent contexts
   */
  getAllTasks(): SubAgentContext[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Gets tasks by status.
   *
   * @param status - Status to filter by
   * @returns Array of matching sub-agent contexts
   */
  getTasksByStatus(status: SubAgentStatus): SubAgentContext[] {
    return Array.from(this.tasks.values()).filter((task) => task.status === status);
  }

  /**
   * Returns summary statistics for all tasks.
   *
   * @returns Task summary statistics
   */
  getSummary(): TaskSummary {
    const summary: TaskSummary = {
      total: this.tasks.size,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      timedOut: 0,
    };

    for (const task of this.tasks.values()) {
      switch (task.status) {
        case "pending":
          summary.pending++;
          break;
        case "running":
          summary.running++;
          break;
        case "completed":
          summary.completed++;
          break;
        case "failed":
          summary.failed++;
          break;
        case "cancelled":
          summary.cancelled++;
          break;
        case "timeout":
          summary.timedOut++;
          break;
      }
    }

    return summary;
  }

  /**
   * Clears all completed, failed, cancelled, and timed out tasks.
   * Running and pending tasks are not cleared.
   *
   * @returns Number of tasks cleared
   */
  clearFinishedTasks(): number {
    const terminalStatuses: SubAgentStatus[] = ["completed", "failed", "cancelled", "timeout"];
    let cleared = 0;

    for (const [taskId, task] of this.tasks.entries()) {
      if (terminalStatuses.includes(task.status)) {
        this.tasks.delete(taskId);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Clears all tasks, including running ones.
   * Use with caution as this may leave running tasks orphaned.
   */
  clearAllTasks(): void {
    this.tasks.clear();
    this.runningCount = 0;
  }

  /**
   * Broadcasts a task update via the configured broadcaster.
   *
   * @param context - The task context to broadcast
   */
  private broadcast(context: SubAgentContext): void {
    if (this.broadcaster) {
      this.broadcaster(context);
    }
  }
}

/**
 * Global TaskManager instance.
 */
const globalTaskManager = new TaskManager();

/**
 * Returns the global TaskManager instance.
 */
export function getTaskManager(): TaskManager {
  return globalTaskManager;
}

/**
 * Sets the broadcaster for the global TaskManager.
 */
export function setTaskBroadcaster(broadcaster: TaskBroadcaster): void {
  globalTaskManager.setBroadcaster(broadcaster);
}

/**
 * Clears the broadcaster from the global TaskManager.
 */
export function clearTaskBroadcaster(): void {
  globalTaskManager.clearBroadcaster();
}

/**
 * Sets the executor for the global TaskManager.
 */
export function setTaskExecutor(executor: SubAgentExecutor): void {
  globalTaskManager.setExecutor(executor);
}

/**
 * Clears the executor from the global TaskManager.
 */
export function clearTaskExecutor(): void {
  globalTaskManager.clearExecutor();
}
