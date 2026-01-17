/**
 * Agent Entry Point
 *
 * Main entry point for the Claude Cowork agent.
 * Initializes the agent with tools, skills, and system prompt.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentConfig, AgentState } from "./types/index.js";

/**
 * Creates a new Anthropic client instance.
 * Requires ANTHROPIC_API_KEY environment variable to be set.
 */
function createClient(): Anthropic {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required. " +
        "Set it to your Anthropic API key."
    );
  }
  return new Anthropic({ apiKey });
}

/**
 * Default agent configuration.
 */
const defaultConfig: AgentConfig = {
  model: "claude-sonnet-4-20250514",
  maxTokens: 8192,
  systemPrompt: "",
};

/**
 * Initializes the agent with the given configuration.
 * Returns an agent state object that can be used to interact with the agent.
 */
export function initializeAgent(
  config: Partial<AgentConfig> = {}
): AgentState {
  const mergedConfig: AgentConfig = { ...defaultConfig, ...config };
  const client = createClient();

  return {
    client,
    config: mergedConfig,
    conversationHistory: [],
    isRunning: false,
  };
}

/**
 * Main function for standalone execution.
 */
async function main(): Promise<void> {
  console.log("Claude Cowork Agent initialized");
  console.log("Agent SDK version: @anthropic-ai/sdk");

  const agentState = initializeAgent();
  console.log("Agent state created successfully");
  console.log(`Model: ${agentState.config.model}`);
  console.log(`Max tokens: ${agentState.config.maxTokens}`);
}

// Run main function when executed directly
main().catch((error: unknown) => {
  console.error("Failed to initialize agent:", error);
  process.exit(1);
});
