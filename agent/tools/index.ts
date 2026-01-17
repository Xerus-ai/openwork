/**
 * Agent Tools
 *
 * Export all tool implementations and types for the Claude Cowork agent.
 */

// Types
export type {
  AskUserQuestionOptions,
  AskUserQuestionResult,
  BashToolOptions,
  BashToolResult,
  FileCreateOptions,
  FileCreateResult,
  FileEntry,
  PropertySchema,
  QuestionChoice,
  QuestionType,
  StrReplaceOptions,
  StrReplaceResult,
  SubAgentContext,
  SubAgentStatus,
  TaskOptions,
  TaskResult,
  TaskSummary,
  TodoItem,
  TodoList,
  TodoReadResult,
  TodoStatus,
  TodoSummary,
  TodoUpdateOptions,
  TodoUpdateResult,
  TodoWriteOptions,
  TodoWriteResult,
  ToolDefinition,
  ToolParameterSchema,
  ViewOptions,
  ViewResult,
} from "./types.js";

// Bash tool
export {
  bashToolDefinition,
  createBashToolHandler,
  executeBashCommand,
} from "./bash.js";

// File create tool
export {
  createFile,
  createFileCreateHandler,
  fileCreateToolDefinition,
} from "./file-create.js";

// String replace tool
export {
  createStrReplaceHandler,
  strReplace,
  strReplaceToolDefinition,
} from "./str-replace.js";

// View tool
export {
  createViewHandler,
  view,
  viewToolDefinition,
} from "./view.js";

// Ask user question tool
export {
  askUserQuestion,
  askUserQuestionToolDefinition,
  clearQuestionSender,
  createAskUserQuestionHandler,
  getQuestionManager,
  QuestionManager,
  setQuestionSender,
} from "./ask-user-question.js";

export type { QuestionSender, UserResponse } from "./ask-user-question.js";

// TodoList tools
export {
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

export type { TodoListBroadcaster } from "./todolist.js";

// Task tool
export {
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

export type { SubAgentExecutor, TaskBroadcaster } from "./task.js";
