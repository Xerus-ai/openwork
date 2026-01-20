/**
 * Agent Initialization Module
 *
 * Public API for initializing the Claude Cowork agent.
 * Exports the agent initializer, system prompt loader, and convenience functions.
 */

// System prompt loading and manipulation
export {
  SystemPromptLoader,
  SystemPromptConfig,
  SystemPromptResult,
  SystemPromptValidation,
  extendSystemPrompt,
  formatForApi,
  getDefaultLoader,
  resetDefaultLoader,
} from "./system-prompt.js";

// Agent initialization
export {
  AgentInitializer,
  AgentInitOptions,
  AgentInitResult,
  createAgent,
  createAgentSync,
} from "./agent-initializer.js";
