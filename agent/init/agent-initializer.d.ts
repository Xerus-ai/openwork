/**
 * Agent Initializer
 *
 * Initializes the Claude Cowork agent with system prompt,
 * tools, and configuration.
 */
import { AgentState, ModelId } from "../types/index.js";
import { SystemPromptLoader, SystemPromptConfig } from "./system-prompt.js";
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
export declare class AgentInitializer {
    private systemPromptLoader;
    constructor(systemPromptConfig?: Partial<SystemPromptConfig>);
    /**
     * Creates a new Anthropic client instance.
     */
    private createClient;
    /**
     * Builds the complete system prompt from file and additional instructions.
     */
    private buildSystemPrompt;
    /**
     * Initializes the agent asynchronously.
     * Loads system prompt and creates agent state.
     */
    initialize(options?: AgentInitOptions): Promise<AgentInitResult>;
    /**
     * Initializes the agent synchronously.
     * Uses synchronous file reading for system prompt.
     */
    initializeSync(options?: AgentInitOptions): AgentInitResult;
    /**
     * Reloads the system prompt and updates an existing agent state.
     */
    reloadSystemPrompt(state: AgentState, additionalInstructions?: string | string[]): Promise<{
        success: boolean;
        warnings: string[];
    }>;
    /**
     * Gets the system prompt loader for direct access.
     */
    getSystemPromptLoader(): SystemPromptLoader;
}
/**
 * Creates and initializes an agent with default settings.
 * Convenience function for simple use cases.
 */
export declare function createAgent(options?: AgentInitOptions): Promise<AgentState>;
/**
 * Creates and initializes an agent synchronously.
 * Convenience function for simple use cases.
 */
export declare function createAgentSync(options?: AgentInitOptions): AgentState;
//# sourceMappingURL=agent-initializer.d.ts.map