/**
 * TodoList Tools Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearTodoListBroadcaster,
  createTodoReadHandler,
  createTodoUpdateHandler,
  createTodoWriteHandler,
  getTodoListManager,
  setTodoListBroadcaster,
  todoRead,
  todoReadToolDefinition,
  todoUpdate,
  todoUpdateToolDefinition,
  todoWrite,
  todoWriteToolDefinition,
  TodoListManager,
} from "./todolist.js";
import type { TodoListBroadcaster } from "./todolist.js";

describe("TodoListManager", () => {
  let manager: TodoListManager;

  beforeEach(() => {
    manager = new TodoListManager();
  });

  describe("broadcaster configuration", () => {
    it("should start without a broadcaster", () => {
      expect(manager.hasBroadcaster()).toBe(false);
    });

    it("should register a broadcaster", () => {
      const broadcaster: TodoListBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);

      expect(manager.hasBroadcaster()).toBe(true);
    });

    it("should clear the broadcaster", () => {
      const broadcaster: TodoListBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);
      manager.clearBroadcaster();

      expect(manager.hasBroadcaster()).toBe(false);
    });

    it("should broadcast on create", () => {
      const broadcaster: TodoListBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);

      manager.createTodoList(["Task 1", "Task 2"]);

      expect(broadcaster).toHaveBeenCalledTimes(1);
      const call = vi.mocked(broadcaster).mock.calls[0];
      expect(call).toBeDefined();
      expect(call![0].items).toHaveLength(2);
      expect(call![0].items[0]!.content).toBe("Task 1");
      expect(call![0].items[1]!.content).toBe("Task 2");
    });

    it("should broadcast on update", () => {
      const broadcaster: TodoListBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);

      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      manager.updateTaskStatus(taskId, "in_progress");

      expect(broadcaster).toHaveBeenCalledTimes(2);
    });
  });

  describe("createTodoList", () => {
    it("should create a todo list with tasks", () => {
      const todoList = manager.createTodoList([
        "Research patterns",
        "Design solution",
        "Implement code",
      ]);

      expect(todoList.items).toHaveLength(3);
      expect(todoList.items[0]!.content).toBe("Research patterns");
      expect(todoList.items[1]!.content).toBe("Design solution");
      expect(todoList.items[2]!.content).toBe("Implement code");
    });

    it("should create tasks with pending status", () => {
      const todoList = manager.createTodoList(["Task 1", "Task 2"]);

      expect(todoList.items[0]!.status).toBe("pending");
      expect(todoList.items[1]!.status).toBe("pending");
    });

    it("should generate unique IDs for each task", () => {
      const todoList = manager.createTodoList(["Task 1", "Task 2", "Task 3"]);

      const ids = todoList.items.map((item) => item.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("should set creation and update timestamps", () => {
      const todoList = manager.createTodoList(["Task 1"]);

      expect(todoList.createdAt).toBeTruthy();
      expect(todoList.updatedAt).toBeTruthy();
      expect(todoList.items[0]!.createdAt).toBeTruthy();
      expect(todoList.items[0]!.updatedAt).toBeTruthy();
    });

    it("should trim task content", () => {
      const todoList = manager.createTodoList(["  Task with spaces  "]);

      expect(todoList.items[0]!.content).toBe("Task with spaces");
    });

    it("should throw error for empty tasks array", () => {
      expect(() => manager.createTodoList([])).toThrow("no tasks");
    });

    it("should replace existing todo list", () => {
      manager.createTodoList(["Old task"]);
      const newList = manager.createTodoList(["New task"]);

      expect(newList.items).toHaveLength(1);
      expect(newList.items[0]!.content).toBe("New task");
      expect(manager.getTodoList()?.items).toHaveLength(1);
    });
  });

  describe("updateTaskStatus", () => {
    it("should update task from pending to in_progress", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      const updatedItem = manager.updateTaskStatus(taskId, "in_progress");

      expect(updatedItem.status).toBe("in_progress");
      expect(updatedItem.id).toBe(taskId);
    });

    it("should update task from in_progress to completed", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      manager.updateTaskStatus(taskId, "in_progress");
      const updatedItem = manager.updateTaskStatus(taskId, "completed");

      expect(updatedItem.status).toBe("completed");
      expect(updatedItem.completedAt).toBeTruthy();
    });

    it("should update task from pending to blocked with reason", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      const updatedItem = manager.updateTaskStatus(
        taskId,
        "blocked",
        "Waiting for API access"
      );

      expect(updatedItem.status).toBe("blocked");
      expect(updatedItem.blockedReason).toBe("Waiting for API access");
    });

    it("should update task from blocked to pending", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      manager.updateTaskStatus(taskId, "blocked", "Some reason");
      const updatedItem = manager.updateTaskStatus(taskId, "pending");

      expect(updatedItem.status).toBe("pending");
      expect(updatedItem.blockedReason).toBeUndefined();
    });

    it("should update task from completed to pending (reopen)", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      manager.updateTaskStatus(taskId, "in_progress");
      manager.updateTaskStatus(taskId, "completed");
      const updatedItem = manager.updateTaskStatus(taskId, "pending");

      expect(updatedItem.status).toBe("pending");
      expect(updatedItem.completedAt).toBeUndefined();
    });

    it("should throw error for invalid transition pending -> completed", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      expect(() => manager.updateTaskStatus(taskId, "completed")).toThrow(
        "Invalid state transition"
      );
    });

    it("should throw error for invalid transition blocked -> completed", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      manager.updateTaskStatus(taskId, "blocked", "reason");

      expect(() => manager.updateTaskStatus(taskId, "completed")).toThrow(
        "Invalid state transition"
      );
    });

    it("should throw error when blocking without reason", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      expect(() => manager.updateTaskStatus(taskId, "blocked")).toThrow(
        "blockedReason is required"
      );
    });

    it("should throw error for non-existent task", () => {
      manager.createTodoList(["Task 1"]);

      expect(() => manager.updateTaskStatus("invalid_id", "in_progress")).toThrow(
        "Task not found"
      );
    });

    it("should throw error when no todo list exists", () => {
      expect(() => manager.updateTaskStatus("task_1", "in_progress")).toThrow(
        "No TodoList exists"
      );
    });

    it("should update the updatedAt timestamp", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      // The updatedAt should be a valid ISO string
      const updatedItem = manager.updateTaskStatus(taskId, "in_progress");

      expect(updatedItem.updatedAt).toBeTruthy();
      expect(new Date(updatedItem.updatedAt).toISOString()).toBe(updatedItem.updatedAt);
    });
  });

  describe("getTodoList", () => {
    it("should return null when no list exists", () => {
      expect(manager.getTodoList()).toBeNull();
    });

    it("should return the current list", () => {
      manager.createTodoList(["Task 1"]);
      const todoList = manager.getTodoList();

      expect(todoList).not.toBeNull();
      expect(todoList?.items).toHaveLength(1);
    });
  });

  describe("getSummary", () => {
    it("should return null when no list exists", () => {
      expect(manager.getSummary()).toBeNull();
    });

    it("should return correct summary for all pending tasks", () => {
      manager.createTodoList(["Task 1", "Task 2", "Task 3"]);
      const summary = manager.getSummary();

      expect(summary).toEqual({
        total: 3,
        pending: 3,
        inProgress: 0,
        completed: 0,
        blocked: 0,
      });
    });

    it("should return correct summary for mixed statuses", () => {
      const todoList = manager.createTodoList(["Task 1", "Task 2", "Task 3", "Task 4"]);
      const task1 = todoList.items[0]!;
      const task2 = todoList.items[1]!;
      const task3 = todoList.items[2]!;

      manager.updateTaskStatus(task1.id, "in_progress");
      manager.updateTaskStatus(task1.id, "completed");
      manager.updateTaskStatus(task2.id, "in_progress");
      manager.updateTaskStatus(task3.id, "blocked", "reason");

      const summary = manager.getSummary();

      expect(summary).toEqual({
        total: 4,
        pending: 1,
        inProgress: 1,
        completed: 1,
        blocked: 1,
      });
    });
  });

  describe("getTaskById", () => {
    it("should return undefined when no list exists", () => {
      expect(manager.getTaskById("task_1")).toBeUndefined();
    });

    it("should return undefined for non-existent task", () => {
      manager.createTodoList(["Task 1"]);
      expect(manager.getTaskById("invalid_id")).toBeUndefined();
    });

    it("should return the task by ID", () => {
      const todoList = manager.createTodoList(["Task 1"]);
      const taskId = todoList.items[0]!.id;

      const task = manager.getTaskById(taskId);

      expect(task).toBeDefined();
      expect(task?.content).toBe("Task 1");
    });
  });

  describe("getTasksByStatus", () => {
    it("should return empty array when no list exists", () => {
      expect(manager.getTasksByStatus("pending")).toEqual([]);
    });

    it("should return tasks with matching status", () => {
      const todoList = manager.createTodoList(["Task 1", "Task 2", "Task 3"]);
      manager.updateTaskStatus(todoList.items[0]!.id, "in_progress");

      const pendingTasks = manager.getTasksByStatus("pending");
      const inProgressTasks = manager.getTasksByStatus("in_progress");

      expect(pendingTasks).toHaveLength(2);
      expect(inProgressTasks).toHaveLength(1);
    });
  });

  describe("clearTodoList", () => {
    it("should clear the todo list", () => {
      manager.createTodoList(["Task 1"]);
      manager.clearTodoList();

      expect(manager.getTodoList()).toBeNull();
    });

    it("should broadcast on clear", () => {
      const broadcaster: TodoListBroadcaster = vi.fn();
      manager.setBroadcaster(broadcaster);

      manager.createTodoList(["Task 1"]);
      manager.clearTodoList();

      // Called once on create, but not on clear (since todoList is null)
      expect(broadcaster).toHaveBeenCalledTimes(1);
    });
  });
});

describe("todoWrite", () => {
  beforeEach(() => {
    getTodoListManager().clearTodoList();
  });

  afterEach(() => {
    clearTodoListBroadcaster();
  });

  it("should create a todo list successfully", async () => {
    const result = await todoWrite({
      tasks: ["Task 1", "Task 2", "Task 3"],
    });

    expect(result.success).toBe(true);
    expect(result.taskCount).toBe(3);
    expect(result.todoList?.items).toHaveLength(3);
  });

  it("should fail with empty tasks array", async () => {
    const result = await todoWrite({ tasks: [] });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be empty");
  });

  it("should fail with missing tasks", async () => {
    const result = await todoWrite({} as { tasks: string[] });

    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should fail with non-array tasks", async () => {
    const result = await todoWrite({ tasks: "not an array" as unknown as string[] });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be an array");
  });

  it("should fail with empty string task", async () => {
    const result = await todoWrite({ tasks: ["Task 1", ""] });

    expect(result.success).toBe(false);
    expect(result.error).toContain("cannot be empty");
  });

  it("should fail with non-string task", async () => {
    const result = await todoWrite({
      tasks: ["Task 1", 123 as unknown as string],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be a string");
  });
});

describe("todoUpdate", () => {
  beforeEach(() => {
    getTodoListManager().clearTodoList();
  });

  afterEach(() => {
    clearTodoListBroadcaster();
  });

  it("should update task status successfully", async () => {
    const writeResult = await todoWrite({ tasks: ["Task 1"] });
    const taskId = writeResult.todoList!.items[0]!.id;

    const result = await todoUpdate({
      taskId,
      status: "in_progress",
    });

    expect(result.success).toBe(true);
    expect(result.updatedItem?.status).toBe("in_progress");
  });

  it("should fail with missing taskId", async () => {
    const result = await todoUpdate({
      taskId: "",
      status: "in_progress",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should fail with missing status", async () => {
    const result = await todoUpdate({
      taskId: "task_1",
      status: "" as "pending",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  it("should fail with invalid status", async () => {
    const result = await todoUpdate({
      taskId: "task_1",
      status: "invalid" as "pending",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("must be one of");
  });

  it("should fail with blocked status but no reason", async () => {
    await todoWrite({ tasks: ["Task 1"] });
    const result = await todoUpdate({
      taskId: "task_1",
      status: "blocked",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("blockedReason is required");
  });

  it("should fail when no todo list exists", async () => {
    const result = await todoUpdate({
      taskId: "task_1",
      status: "in_progress",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No TodoList exists");
  });

  it("should fail for non-existent task", async () => {
    await todoWrite({ tasks: ["Task 1"] });

    const result = await todoUpdate({
      taskId: "invalid_id",
      status: "in_progress",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Task not found");
  });
});

describe("todoRead", () => {
  beforeEach(() => {
    getTodoListManager().clearTodoList();
  });

  afterEach(() => {
    clearTodoListBroadcaster();
  });

  it("should return empty result when no list exists", async () => {
    const result = await todoRead();

    expect(result.success).toBe(true);
    expect(result.todoList).toBeUndefined();
    expect(result.summary).toBeUndefined();
  });

  it("should return todo list and summary", async () => {
    await todoWrite({ tasks: ["Task 1", "Task 2"] });

    const result = await todoRead();

    expect(result.success).toBe(true);
    expect(result.todoList?.items).toHaveLength(2);
    expect(result.summary).toEqual({
      total: 2,
      pending: 2,
      inProgress: 0,
      completed: 0,
      blocked: 0,
    });
  });
});

describe("global manager functions", () => {
  afterEach(() => {
    getTodoListManager().clearTodoList();
    clearTodoListBroadcaster();
  });

  it("should set and clear global broadcaster", () => {
    const manager = getTodoListManager();
    expect(manager.hasBroadcaster()).toBe(false);

    const broadcaster: TodoListBroadcaster = vi.fn();
    setTodoListBroadcaster(broadcaster);
    expect(manager.hasBroadcaster()).toBe(true);

    clearTodoListBroadcaster();
    expect(manager.hasBroadcaster()).toBe(false);
  });
});

describe("createTodoWriteHandler", () => {
  afterEach(() => {
    getTodoListManager().clearTodoList();
    clearTodoListBroadcaster();
  });

  it("should create a handler that sets broadcaster", async () => {
    const broadcaster: TodoListBroadcaster = vi.fn();
    const handler = createTodoWriteHandler(broadcaster);

    await handler({ tasks: ["Task 1"] });

    expect(broadcaster).toHaveBeenCalled();
  });

  it("should work without broadcaster", async () => {
    const handler = createTodoWriteHandler();

    const result = await handler({ tasks: ["Task 1"] });

    expect(result.success).toBe(true);
  });
});

describe("createTodoUpdateHandler", () => {
  afterEach(() => {
    getTodoListManager().clearTodoList();
    clearTodoListBroadcaster();
  });

  it("should create a handler that updates tasks", async () => {
    const writeResult = await todoWrite({ tasks: ["Task 1"] });
    const taskId = writeResult.todoList!.items[0]!.id;

    const handler = createTodoUpdateHandler();
    const result = await handler({ taskId, status: "in_progress" });

    expect(result.success).toBe(true);
    expect(result.updatedItem?.status).toBe("in_progress");
  });
});

describe("createTodoReadHandler", () => {
  afterEach(() => {
    getTodoListManager().clearTodoList();
  });

  it("should create a handler that reads the list", async () => {
    await todoWrite({ tasks: ["Task 1"] });

    const handler = createTodoReadHandler();
    const result = await handler();

    expect(result.success).toBe(true);
    expect(result.todoList?.items).toHaveLength(1);
  });
});

describe("tool definitions", () => {
  describe("todoWriteToolDefinition", () => {
    it("should have correct name", () => {
      expect(todoWriteToolDefinition.name).toBe("todo_write");
    });

    it("should have description", () => {
      expect(todoWriteToolDefinition.description).toBeTruthy();
      expect(todoWriteToolDefinition.description.length).toBeGreaterThan(50);
    });

    it("should have input schema with tasks property", () => {
      expect(todoWriteToolDefinition.input_schema.type).toBe("object");
      expect(todoWriteToolDefinition.input_schema.properties.tasks).toBeDefined();
      expect(todoWriteToolDefinition.input_schema.required).toContain("tasks");
    });
  });

  describe("todoUpdateToolDefinition", () => {
    it("should have correct name", () => {
      expect(todoUpdateToolDefinition.name).toBe("todo_update");
    });

    it("should have description with state transitions", () => {
      expect(todoUpdateToolDefinition.description).toContain("transition");
      expect(todoUpdateToolDefinition.description).toContain("pending");
      expect(todoUpdateToolDefinition.description).toContain("in_progress");
      expect(todoUpdateToolDefinition.description).toContain("completed");
    });

    it("should have input schema with required properties", () => {
      expect(todoUpdateToolDefinition.input_schema.type).toBe("object");
      expect(todoUpdateToolDefinition.input_schema.properties.taskId).toBeDefined();
      expect(todoUpdateToolDefinition.input_schema.properties.status).toBeDefined();
      expect(todoUpdateToolDefinition.input_schema.properties.blockedReason).toBeDefined();
      expect(todoUpdateToolDefinition.input_schema.required).toContain("taskId");
      expect(todoUpdateToolDefinition.input_schema.required).toContain("status");
    });

    it("should have enum for status property", () => {
      const statusProperty = todoUpdateToolDefinition.input_schema.properties.status;
      expect(statusProperty).toBeDefined();
      if (statusProperty) {
        expect(statusProperty.enum).toEqual([
          "pending",
          "in_progress",
          "completed",
          "blocked",
        ]);
      }
    });
  });

  describe("todoReadToolDefinition", () => {
    it("should have correct name", () => {
      expect(todoReadToolDefinition.name).toBe("todo_read");
    });

    it("should have description", () => {
      expect(todoReadToolDefinition.description).toBeTruthy();
      expect(todoReadToolDefinition.description.toLowerCase()).toContain("summary");
    });

    it("should have empty required array", () => {
      expect(todoReadToolDefinition.input_schema.type).toBe("object");
      expect(todoReadToolDefinition.input_schema.required).toEqual([]);
    });
  });
});
