/**
 * Task Tool Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelTask,
  clearFinishedTasks,
  clearTaskBroadcaster,
  clearTaskExecutor,
  createTaskHandler,
  getAllTasks,
  getTask,
  getTaskManager,
  getTaskSummary,
  setTaskBroadcaster,
  setTaskExecutor,
  spawnTask,
  taskToolDefinition,
  TaskManager,
} from "./task.js";
import type { SubAgentExecutor, TaskBroadcaster } from "./task.js";

/**
 * Creates a mock executor that resolves with the given result after a delay.
 */
function createMockExecutor(
  result: string,
  delayMs = 10
): SubAgentExecutor {
  return {
    execute: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return result;
    }),
  };
}

/**
 * Creates a mock executor that rejects with the given error after a delay.
 */
function createFailingExecutor(
  error: string,
  delayMs = 10
): SubAgentExecutor {
  return {
    execute: vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      throw new Error(error);
    }),
  };
}

describe("TaskManager", () => {
  let manager: TaskManager;

  beforeEach(() => {
    manager = new TaskManager();
  });

  describe("broadcaster configuration", () => {
    it("should start without a broadcaster", () => {
      expect(manager.hasBroadcaster()).toBe(false);
    });

    it("should register a broadcaster", () => {
      const broadcaster: TaskBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);

      expect(manager.hasBroadcaster()).toBe(true);
    });

    it("should clear the broadcaster", () => {
      const broadcaster: TaskBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);
      manager.clearBroadcaster();

      expect(manager.hasBroadcaster()).toBe(false);
    });
  });

  describe("executor configuration", () => {
    it("should start without an executor", () => {
      expect(manager.hasExecutor()).toBe(false);
    });

    it("should register an executor", () => {
      const executor = createMockExecutor("result");
      manager.setExecutor(executor);

      expect(manager.hasExecutor()).toBe(true);
    });

    it("should clear the executor", () => {
      const executor = createMockExecutor("result");
      manager.setExecutor(executor);
      manager.clearExecutor();

      expect(manager.hasExecutor()).toBe(false);
    });
  });

  describe("spawnTask", () => {
    it("should fail without an executor", async () => {
      const result = await manager.spawnTask({
        instructions: "Do something",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No executor configured");
    });

    it("should fail with empty instructions", async () => {
      manager.setExecutor(createMockExecutor("result"));

      const result = await manager.spawnTask({
        instructions: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Instructions are required");
    });

    it("should fail with whitespace-only instructions", async () => {
      manager.setExecutor(createMockExecutor("result"));

      const result = await manager.spawnTask({
        instructions: "   ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Instructions are required");
    });

    it("should spawn a task successfully", async () => {
      manager.setExecutor(createMockExecutor("Task completed successfully"));

      const result = await manager.spawnTask({
        instructions: "Analyze the code",
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe("completed");
      expect(result.result).toBe("Task completed successfully");
      expect(result.taskId).toBeTruthy();
    });

    it("should trim instructions and input", async () => {
      const executor = createMockExecutor("result");
      manager.setExecutor(executor);

      await manager.spawnTask({
        instructions: "  Analyze the code  ",
        input: "  some input  ",
      });

      const task = manager.getAllTasks()[0];
      expect(task?.instructions).toBe("Analyze the code");
      expect(task?.input).toBe("some input");
    });

    it("should handle task failure", async () => {
      manager.setExecutor(createFailingExecutor("Something went wrong"));

      const result = await manager.spawnTask({
        instructions: "Do something risky",
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("failed");
      expect(result.error).toBe("Something went wrong");
    });

    it("should handle task timeout", async () => {
      // Create an executor that takes too long
      const slowExecutor: SubAgentExecutor = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return "Too slow";
        }),
      };
      manager.setExecutor(slowExecutor);

      const result = await manager.spawnTask({
        instructions: "Slow task",
        timeout: 50,
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe("timeout");
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain("timed out");
    });

    it("should respect max concurrent agents limit", async () => {
      // Create a slow executor that takes longer to complete
      const slowExecutor: SubAgentExecutor = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return "result";
        }),
      };
      manager.setExecutor(slowExecutor);

      // Start max concurrent tasks (3)
      const promise1 = manager.spawnTask({ instructions: "Task 1" });
      const promise2 = manager.spawnTask({ instructions: "Task 2" });
      const promise3 = manager.spawnTask({ instructions: "Task 3" });

      // Wait a tick for tasks to start running
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to start a 4th task - should fail
      const result4 = await manager.spawnTask({ instructions: "Task 4" });

      expect(result4.success).toBe(false);
      expect(result4.error).toContain("Maximum concurrent agents");

      // Clean up by waiting for promises (they'll timeout but that's ok)
      await Promise.allSettled([promise1, promise2, promise3]);
    }, 10000);

    it("should broadcast task state changes", async () => {
      const broadcasts: { id: string; status: string }[] = [];
      const broadcaster: TaskBroadcaster = (context) => {
        broadcasts.push({ id: context.id, status: context.status });
      };
      manager.setBroadcaster(broadcaster);
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });

      // Should have broadcast state changes
      expect(broadcasts.length).toBeGreaterThanOrEqual(2);

      // Should have broadcast running and completed status
      const statuses = broadcasts.map((b) => b.status);
      expect(statuses).toContain("running");
      expect(statuses).toContain("completed");
    });
  });

  describe("cancelTask", () => {
    it("should return false for non-existent task", () => {
      const cancelled = manager.cancelTask("non-existent");
      expect(cancelled).toBe(false);
    });

    it("should cancel a pending task", async () => {
      const slowExecutor: SubAgentExecutor = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return "result";
        }),
      };
      manager.setExecutor(slowExecutor);

      // Start a task
      const spawnPromise = manager.spawnTask({ instructions: "Task 1" });

      // Wait a tick for task to be registered
      await new Promise((resolve) => setTimeout(resolve, 5));

      // Get the task ID
      const tasks = manager.getAllTasks();
      expect(tasks.length).toBeGreaterThan(0);
      const taskId = tasks[0]!.id;

      // Cancel the task
      const cancelled = manager.cancelTask(taskId);
      expect(cancelled).toBe(true);

      // Task should be in cancelled state
      const task = manager.getTask(taskId);
      expect(task?.status).toBe("cancelled");

      // Wait for spawn to complete
      await spawnPromise;
    }, 5000);

    it("should not cancel a completed task", async () => {
      manager.setExecutor(createMockExecutor("result"));

      const result = await manager.spawnTask({ instructions: "Task 1" });
      const cancelled = manager.cancelTask(result.taskId);

      expect(cancelled).toBe(false);
    });
  });

  describe("getTask", () => {
    it("should return undefined for non-existent task", () => {
      expect(manager.getTask("non-existent")).toBeUndefined();
    });

    it("should return task by ID", async () => {
      manager.setExecutor(createMockExecutor("result"));

      const result = await manager.spawnTask({ instructions: "Task 1" });
      const task = manager.getTask(result.taskId);

      expect(task).toBeDefined();
      expect(task?.id).toBe(result.taskId);
      expect(task?.instructions).toBe("Task 1");
    });
  });

  describe("getAllTasks", () => {
    it("should return empty array when no tasks", () => {
      expect(manager.getAllTasks()).toEqual([]);
    });

    it("should return all tasks", async () => {
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });
      await manager.spawnTask({ instructions: "Task 2" });

      const tasks = manager.getAllTasks();
      expect(tasks).toHaveLength(2);
    });
  });

  describe("getTasksByStatus", () => {
    it("should return tasks by status", async () => {
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });
      await manager.spawnTask({ instructions: "Task 2" });

      const completedTasks = manager.getTasksByStatus("completed");
      expect(completedTasks).toHaveLength(2);

      const pendingTasks = manager.getTasksByStatus("pending");
      expect(pendingTasks).toHaveLength(0);
    });
  });

  describe("getSummary", () => {
    it("should return zero counts when no tasks", () => {
      const summary = manager.getSummary();

      expect(summary).toEqual({
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        timedOut: 0,
      });
    });

    it("should return correct counts", async () => {
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });
      await manager.spawnTask({ instructions: "Task 2" });

      const summary = manager.getSummary();

      expect(summary.total).toBe(2);
      expect(summary.completed).toBe(2);
    });

    it("should count failed tasks correctly", async () => {
      manager.setExecutor(createFailingExecutor("error"));

      await manager.spawnTask({ instructions: "Failing task" });

      const summary = manager.getSummary();

      expect(summary.total).toBe(1);
      expect(summary.failed).toBe(1);
    });
  });

  describe("clearFinishedTasks", () => {
    it("should clear completed tasks", async () => {
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });
      await manager.spawnTask({ instructions: "Task 2" });

      expect(manager.getAllTasks()).toHaveLength(2);

      const cleared = manager.clearFinishedTasks();

      expect(cleared).toBe(2);
      expect(manager.getAllTasks()).toHaveLength(0);
    });

    it("should not clear running tasks", async () => {
      const slowExecutor: SubAgentExecutor = {
        execute: vi.fn().mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return "result";
        }),
      };
      manager.setExecutor(slowExecutor);

      // Start a task and don't await it
      const spawnPromise = manager.spawnTask({ instructions: "Slow task" });

      // Wait a tick for task to start
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Clear finished tasks
      const cleared = manager.clearFinishedTasks();

      expect(cleared).toBe(0);
      expect(manager.getAllTasks()).toHaveLength(1);

      // Cancel and wait for promise
      const task = manager.getAllTasks()[0];
      if (task) {
        manager.cancelTask(task.id);
      }
      await spawnPromise;
    }, 5000);
  });

  describe("clearAllTasks", () => {
    it("should clear all tasks", async () => {
      manager.setExecutor(createMockExecutor("result"));

      await manager.spawnTask({ instructions: "Task 1" });
      await manager.spawnTask({ instructions: "Task 2" });

      manager.clearAllTasks();

      expect(manager.getAllTasks()).toHaveLength(0);
      expect(manager.getRunningCount()).toBe(0);
    });
  });

  describe("running count", () => {
    it("should track running count correctly", async () => {
      manager.setExecutor(createMockExecutor("result"));

      expect(manager.getRunningCount()).toBe(0);

      await manager.spawnTask({ instructions: "Task 1" });

      expect(manager.getRunningCount()).toBe(0); // Task completed
    });

    it("should return max concurrent value", () => {
      expect(manager.getMaxConcurrent()).toBe(3);
    });
  });
});

describe("spawnTask", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
    setTaskExecutor(createMockExecutor("result"));
  });

  afterEach(() => {
    clearTaskBroadcaster();
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should spawn a task successfully", async () => {
    const result = await spawnTask({
      instructions: "Analyze the code",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
  });

  it("should fail with timeout too large", async () => {
    const result = await spawnTask({
      instructions: "Task",
      timeout: 700000, // > 600000 max
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot exceed");
  });

  it("should fail with timeout too small", async () => {
    const result = await spawnTask({
      instructions: "Task",
      timeout: 500, // < 1000 min
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("at least 1000ms");
  });
});

describe("cancelTask", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
  });

  afterEach(() => {
    clearTaskBroadcaster();
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should cancel a task", async () => {
    const slowExecutor: SubAgentExecutor = {
      execute: vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return "result";
      }),
    };
    setTaskExecutor(slowExecutor);

    const spawnPromise = spawnTask({ instructions: "Slow task" });

    // Wait a tick
    await new Promise((resolve) => setTimeout(resolve, 10));

    const tasks = getAllTasks();
    const taskId = tasks[0]?.id;
    if (taskId) {
      const cancelled = cancelTask(taskId);
      expect(cancelled).toBe(true);
    }

    await spawnPromise;
  }, 5000);
});

describe("getTask and getAllTasks", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
    setTaskExecutor(createMockExecutor("result"));
  });

  afterEach(() => {
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should get task by ID", async () => {
    const result = await spawnTask({ instructions: "Task 1" });
    const task = getTask(result.taskId);

    expect(task).toBeDefined();
    expect(task?.id).toBe(result.taskId);
  });

  it("should get all tasks", async () => {
    await spawnTask({ instructions: "Task 1" });
    await spawnTask({ instructions: "Task 2" });

    const tasks = getAllTasks();
    expect(tasks).toHaveLength(2);
  });
});

describe("getTaskSummary", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
    setTaskExecutor(createMockExecutor("result"));
  });

  afterEach(() => {
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should return task summary", async () => {
    await spawnTask({ instructions: "Task 1" });

    const summary = getTaskSummary();

    expect(summary.total).toBe(1);
    expect(summary.completed).toBe(1);
  });
});

describe("clearFinishedTasks", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
    setTaskExecutor(createMockExecutor("result"));
  });

  afterEach(() => {
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should clear finished tasks", async () => {
    await spawnTask({ instructions: "Task 1" });
    await spawnTask({ instructions: "Task 2" });

    expect(getAllTasks()).toHaveLength(2);

    const cleared = clearFinishedTasks();

    expect(cleared).toBe(2);
    expect(getAllTasks()).toHaveLength(0);
  });
});

describe("global manager functions", () => {
  afterEach(() => {
    getTaskManager().clearAllTasks();
    clearTaskBroadcaster();
    clearTaskExecutor();
  });

  it("should set and clear global broadcaster", () => {
    const manager = getTaskManager();
    expect(manager.hasBroadcaster()).toBe(false);

    const broadcaster: TaskBroadcaster = vi.fn();
    setTaskBroadcaster(broadcaster);
    expect(manager.hasBroadcaster()).toBe(true);

    clearTaskBroadcaster();
    expect(manager.hasBroadcaster()).toBe(false);
  });

  it("should set and clear global executor", () => {
    const manager = getTaskManager();
    expect(manager.hasExecutor()).toBe(false);

    const executor = createMockExecutor("result");
    setTaskExecutor(executor);
    expect(manager.hasExecutor()).toBe(true);

    clearTaskExecutor();
    expect(manager.hasExecutor()).toBe(false);
  });
});

describe("createTaskHandler", () => {
  beforeEach(() => {
    getTaskManager().clearAllTasks();
    setTaskExecutor(createMockExecutor("result"));
  });

  afterEach(() => {
    clearTaskExecutor();
    getTaskManager().clearAllTasks();
  });

  it("should create a handler that spawns tasks", async () => {
    const handler = createTaskHandler();

    const result = await handler({ instructions: "Do something" });

    expect(result.success).toBe(true);
    expect(result.status).toBe("completed");
  });
});

describe("taskToolDefinition", () => {
  it("should have correct name", () => {
    expect(taskToolDefinition.name).toBe("task");
  });

  it("should have description", () => {
    expect(taskToolDefinition.description).toBeTruthy();
    expect(taskToolDefinition.description.length).toBeGreaterThan(50);
  });

  it("should have input schema with instructions property", () => {
    expect(taskToolDefinition.input_schema.type).toBe("object");
    expect(taskToolDefinition.input_schema.properties.instructions).toBeDefined();
    expect(taskToolDefinition.input_schema.required).toContain("instructions");
  });

  it("should have input property for optional data", () => {
    expect(taskToolDefinition.input_schema.properties.input).toBeDefined();
  });

  it("should have timeout property", () => {
    expect(taskToolDefinition.input_schema.properties.timeout).toBeDefined();
  });

  it("should have description property", () => {
    expect(taskToolDefinition.input_schema.properties.description).toBeDefined();
  });
});
