/**
 * Agent Initializer
 *
 * Initializes the Claude Cowork agent with system prompt,
 * tools, and configuration.
 */

import Anthropic from "@anthropic-ai/sdk";
import { AgentConfig, AgentState, ModelId } from "../types/index.js";
import {
  SystemPromptLoader,
  SystemPromptConfig,
  extendSystemPrompt,
  formatForApi,
} from "./system-prompt.js";

/**
 * Options for agent initialization.
 */
export interface AgentInitOptions {
  /** API key for Anthropic (defaults to ANTHROPIC_API_KEY env var) */
  apiKey?: string;
  /** Model to use for conversations */
  model?: ModelId;
  /** Maximum tokens for model responses */
  maxTokens?: number;
  /** Path to system prompt file (optional, uses default location) */
  systemPromptPath?: string;
  /** Additional instructions to append to system prompt */
  additionalInstructions?: string | string[];
  /** Custom system prompt (bypasses file loading entirely) */
  customSystemPrompt?: string;
  /** Whether to skip system prompt loading */
  skipSystemPrompt?: boolean;
}

/**
 * Result of agent initialization.
 */
export interface AgentInitResult {
  /** The initialized agent state */
  state: AgentState;
  /** Whether system prompt was loaded successfully */
  systemPromptLoaded: boolean;
  /** Path to the loaded system prompt file (if applicable) */
  systemPromptPath?: string;
  /** Any warnings during initialization */
  warnings: string[];
}

/**
 * AgentInitializer handles complete agent setup including system prompt integration.
 */
export class AgentInitializer {
  private systemPromptLoader: SystemPromptLoader;

  constructor(systemPromptConfig?: Partial<SystemPromptConfig>) {
    this.systemPromptLoader = new SystemPromptLoader(systemPromptConfig);
  }

  /**
   * Creates a new Anthropic client instance.
   * Supports both direct Anthropic API and OpenRouter.
   *
   * For OpenRouter:
   * - ANTHROPIC_API_KEY should be empty
   * - ANTHROPIC_AUTH_TOKEN contains the OpenRouter API key
   * - ANTHROPIC_BASE_URL should be https://openrouter.ai/api
   */
  private createClient(apiKey?: string): Anthropic {
    // Priority: explicit apiKey > ANTHROPIC_API_KEY > ANTHROPIC_AUTH_TOKEN
    const key = apiKey ?? process.env["ANTHROPIC_API_KEY"] ?? process.env["ANTHROPIC_AUTH_TOKEN"];
    const baseURL = process.env["ANTHROPIC_BASE_URL"];

    if (!key) {
      throw new Error(
        "API key not configured. Set ANTHROPIC_API_KEY for direct Anthropic access, " +
          "or ANTHROPIC_AUTH_TOKEN with ANTHROPIC_BASE_URL for OpenRouter."
      );
    }

    // Build client options
    const clientOptions: { apiKey: string; baseURL?: string } = { apiKey: key };
    if (baseURL) {
      clientOptions.baseURL = baseURL;
    }

    return new Anthropic(clientOptions);
  }

  /**
   * Builds the complete system prompt from file and additional instructions.
   */
  private async buildSystemPrompt(options: AgentInitOptions): Promise<{
    prompt: string;
    loaded: boolean;
    path?: string;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // If custom system prompt provided, use it directly
    if (options.customSystemPrompt) {
      return {
        prompt: options.customSystemPrompt,
        loaded: true,
        warnings,
      };
    }

    // If skipping system prompt, return empty
    if (options.skipSystemPrompt) {
      return {
        prompt: "",
        loaded: false,
        warnings: ["System prompt loading skipped by configuration"],
      };
    }

    // Load from file
    const loadResult = await this.systemPromptLoader.load();

    // Validate the loaded content
    const validation = this.systemPromptLoader.validate(loadResult.content);

    if (!validation.isValid) {
      warnings.push(...validation.issues);
    }

    // Format for API use
    let prompt = formatForApi(loadResult.content);

    // Add any additional instructions
    if (options.additionalInstructions) {
      prompt = extendSystemPrompt(prompt, options.additionalInstructions);
    }

    return {
      prompt,
      loaded: loadResult.content.length > 0,
      path: loadResult.sourcePath,
      warnings,
    };
  }

  /**
   * Initializes the agent asynchronously.
   * Loads system prompt and creates agent state.
   */
  async initialize(options: AgentInitOptions = {}): Promise<AgentInitResult> {
    const warnings: string[] = [];

    // Create Anthropic client
    const client = this.createClient(options.apiKey);

    // Build system prompt
    const promptResult = await this.buildSystemPrompt(options);
    warnings.push(...promptResult.warnings);

    // Build configuration
    const config: AgentConfig = {
      model: options.model ?? "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens ?? 8192,
      systemPrompt: promptResult.prompt,
    };

    // Create agent state
    const state: AgentState = {
      client,
      config,
      conversationHistory: [],
      isRunning: false,
    };

    return {
      state,
      systemPromptLoaded: promptResult.loaded,
      systemPromptPath: promptResult.path,
      warnings,
    };
  }

  /**
   * Initializes the agent synchronously.
   * Uses synchronous file reading for system prompt.
   */
  initializeSync(options: AgentInitOptions = {}): AgentInitResult {
    const warnings: string[] = [];

    // Create Anthropic client
    const client = this.createClient(options.apiKey);

    // Build system prompt synchronously
    let prompt = "";
    let loaded = false;
    let promptPath: string | undefined;

    if (options.customSystemPrompt) {
      prompt = options.customSystemPrompt;
      loaded = true;
    } else if (!options.skipSystemPrompt) {
      const loadResult = this.systemPromptLoader.loadSync();
      const validation = this.systemPromptLoader.validate(loadResult.content);

      if (!validation.isValid) {
        warnings.push(...validation.issues);
      }

      prompt = formatForApi(loadResult.content);
      loaded = loadResult.content.length > 0;
      promptPath = loadResult.sourcePath;

      if (options.additionalInstructions) {
        prompt = extendSystemPrompt(prompt, options.additionalInstructions);
      }
    } else {
      warnings.push("System prompt loading skipped by configuration");
    }

    // Build configuration
    const config: AgentConfig = {
      model: options.model ?? "claude-sonnet-4-20250514",
      maxTokens: options.maxTokens ?? 8192,
      systemPrompt: prompt,
    };

    // Create agent state
    const state: AgentState = {
      client,
      config,
      conversationHistory: [],
      isRunning: false,
    };

    return {
      state,
      systemPromptLoaded: loaded,
      systemPromptPath: promptPath,
      warnings,
    };
  }

  /**
   * Reloads the system prompt and updates an existing agent state.
   */
  async reloadSystemPrompt(
    state: AgentState,
    additionalInstructions?: string | string[]
  ): Promise<{
    success: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Clear cache to force reload
    this.systemPromptLoader.clearCache();

    // Load fresh prompt
    const loadResult = await this.systemPromptLoader.load();
    const validation = this.systemPromptLoader.validate(loadResult.content);

    if (!validation.isValid) {
      warnings.push(...validation.issues);
    }

    let prompt = formatForApi(loadResult.content);

    if (additionalInstructions) {
      prompt = extendSystemPrompt(prompt, additionalInstructions);
    }

    // Update agent config
    state.config.systemPrompt = prompt;

    return {
      success: loadResult.content.length > 0,
      warnings,
    };
  }

  /**
   * Gets the system prompt loader for direct access.
   */
  getSystemPromptLoader(): SystemPromptLoader {
    return this.systemPromptLoader;
  }
}

/**
 * Creates and initializes an agent with default settings.
 * Convenience function for simple use cases.
 */
export async function createAgent(
  options: AgentInitOptions = {}
): Promise<AgentState> {
  const initializer = new AgentInitializer();
  const result = await initializer.initialize(options);

  if (result.warnings.length > 0) {
    console.warn("Agent initialization warnings:", result.warnings);
  }

  return result.state;
}

/**
 * Creates and initializes an agent synchronously.
 * Convenience function for simple use cases.
 */
export function createAgentSync(options: AgentInitOptions = {}): AgentState {
  const initializer = new AgentInitializer();
  const result = initializer.initializeSync(options);

  if (result.warnings.length > 0) {
    console.warn("Agent initialization warnings:", result.warnings);
  }

  return result.state;
}
