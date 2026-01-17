/**
 * Shared TypeScript Types for Claude Cowork Agent
 *
 * Contains all type definitions used across the agent codebase.
 */

import Anthropic from "@anthropic-ai/sdk";

/**
 * Supported Claude model identifiers.
 */
export type ModelId =
  | "claude-sonnet-4-20250514"
  | "claude-opus-4-20250514";

/**
 * Agent configuration options.
 */
export interface AgentConfig {
  /** Claude model to use for conversations */
  model: ModelId;
  /** Maximum tokens for model responses */
  maxTokens: number;
  /** System prompt to guide agent behavior */
  systemPrompt: string;
}

/**
 * Message in the conversation history.
 */
export interface ConversationMessage {
  /** Role of the message sender */
  role: "user" | "assistant";
  /** Content of the message */
  content: string;
  /** Timestamp when message was created */
  timestamp: Date;
}

/**
 * Agent runtime state.
 */
export interface AgentState {
  /** Anthropic API client instance */
  client: Anthropic;
  /** Current agent configuration */
  config: AgentConfig;
  /** Conversation history for context */
  conversationHistory: ConversationMessage[];
  /** Whether the agent is currently processing a request */
  isRunning: boolean;
}

/**
 * Tool execution result.
 */
export interface ToolResult {
  /** Whether the tool execution succeeded */
  success: boolean;
  /** Output from the tool execution */
  output: string;
  /** Error message if execution failed */
  error?: string;
}

/**
 * Base interface for all tools.
 */
export interface BaseTool {
  /** Unique name of the tool */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON schema for tool parameters */
  inputSchema: Record<string, unknown>;
}

/**
 * Workspace information.
 */
export interface Workspace {
  /** Absolute path to the workspace directory */
  path: string;
  /** Whether the workspace exists and is accessible */
  isValid: boolean;
  /** Platform-specific path separator */
  separator: string;
}

/**
 * Operating system platform type.
 */
export type Platform = "windows" | "macos" | "linux";

/**
 * Shell type for command execution.
 */
export type ShellType = "powershell" | "cmd" | "bash" | "zsh";

/**
 * Shell execution configuration.
 */
export interface ShellConfig {
  /** Type of shell to use */
  shell: ShellType;
  /** Path to shell executable */
  executable: string;
  /** Arguments to pass to shell for command execution */
  args: string[];
}

/**
 * Todo item for progress tracking.
 */
export interface TodoItem {
  /** Unique identifier for the todo */
  id: string;
  /** Description of the task */
  content: string;
  /** Current status of the todo */
  status: "pending" | "in_progress" | "completed";
  /** Optional sub-tasks */
  children?: TodoItem[];
}

/**
 * Skill definition loaded from skills directory.
 */
export interface Skill {
  /** Name of the skill (directory name) */
  name: string;
  /** Path to the SKILL.md file */
  path: string;
  /** Content of the SKILL.md file */
  content: string;
  /** Keywords for skill detection */
  keywords: string[];
  /** Whether the skill is currently loaded in context */
  isLoaded: boolean;
}

/**
 * Artifact created during task execution.
 */
export interface Artifact {
  /** Unique identifier for the artifact */
  id: string;
  /** File name of the artifact */
  name: string;
  /** Absolute path to the artifact file */
  path: string;
  /** MIME type of the artifact */
  mimeType: string;
  /** Size in bytes */
  size: number;
  /** Timestamp when artifact was created */
  createdAt: Date;
}

/**
 * User question with multiple choice options.
 */
export interface UserQuestion {
  /** Question text to display */
  question: string;
  /** Available answer options */
  options: QuestionOption[];
  /** Whether multiple selections are allowed */
  multiSelect: boolean;
}

/**
 * Single option for a user question.
 */
export interface QuestionOption {
  /** Option label displayed to user */
  label: string;
  /** Value returned when option is selected */
  value: string;
  /** Optional description for the option */
  description?: string;
}

/**
 * Event types emitted by the agent.
 */
export type AgentEventType =
  | "message"
  | "tool_use"
  | "tool_result"
  | "error"
  | "todo_update"
  | "artifact_created"
  | "question"
  | "complete";

/**
 * Event emitted by the agent during execution.
 */
export interface AgentEvent {
  /** Type of event */
  type: AgentEventType;
  /** Event payload data */
  data: unknown;
  /** Timestamp when event occurred */
  timestamp: Date;
}
