/**
 * Agent Entry Point
 *
 * Main entry point for the Claude Cowork agent.
 * Initializes the agent with tools, skills, and system prompt.
 */

import { AgentState } from "./types/index.js";
import {
  AgentInitializer,
  createAgent,
  createAgentSync,
  AgentInitOptions,
} from "./init/index.js";

// Re-export initialization functions for convenience
export {
  AgentInitializer,
  createAgent,
  createAgentSync,
  AgentInitOptions,
} from "./init/index.js";

// Re-export system prompt utilities
export {
  SystemPromptLoader,
  extendSystemPrompt,
  formatForApi,
} from "./init/index.js";

// Re-export types
export * from "./types/index.js";

/**
 * Initializes the agent with the given options.
 * Loads system prompt from bundled resources.
 * Returns an agent state object that can be used to interact with the agent.
 */
export async function initializeAgent(
  options: AgentInitOptions = {}
): Promise<AgentState> {
  return createAgent(options);
}

/**
 * Initializes the agent synchronously.
 * Useful for contexts where async initialization is not possible.
 */
export function initializeAgentSync(
  options: AgentInitOptions = {}
): AgentState {
  return createAgentSync(options);
}

/**
 * Main function for standalone execution.
 */
async function main(): Promise<void> {
  console.log("Claude Cowork Agent initialized");
  console.log("Agent SDK version: @anthropic-ai/sdk");

  const initializer = new AgentInitializer();
  const result = await initializer.initialize();

  console.log("Agent state created successfully");
  console.log(`Model: ${result.state.config.model}`);
  console.log(`Max tokens: ${result.state.config.maxTokens}`);
  console.log(`System prompt loaded: ${result.systemPromptLoaded}`);

  if (result.systemPromptPath) {
    console.log(`System prompt path: ${result.systemPromptPath}`);
  }

  if (result.warnings.length > 0) {
    console.log("Warnings:", result.warnings);
  }

  const promptLength = result.state.config.systemPrompt.length;
  console.log(`System prompt length: ${promptLength} characters`);
}

// Run main function when executed directly
main().catch((error: unknown) => {
  console.error("Failed to initialize agent:", error);
  process.exit(1);
});
