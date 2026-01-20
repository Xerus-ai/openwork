/**
 * Agent Initializer
 *
 * Initializes the Claude Cowork agent with system prompt,
 * tools, and configuration.
 */
import Anthropic from "@anthropic-ai/sdk";
import { SystemPromptLoader, extendSystemPrompt, formatForApi, } from "./system-prompt.js";
/**
 * AgentInitializer handles complete agent setup including system prompt integration.
 */
export class AgentInitializer {
    systemPromptLoader;
    constructor(systemPromptConfig) {
        this.systemPromptLoader = new SystemPromptLoader(systemPromptConfig);
    }
    /**
     * Creates a new Anthropic client instance.
     */
    createClient(apiKey) {
        const key = apiKey ?? process.env["ANTHROPIC_API_KEY"];
        if (!key) {
            throw new Error("ANTHROPIC_API_KEY environment variable is required. " +
                "Set it to your Anthropic API key, or provide it in options.");
        }
        return new Anthropic({ apiKey: key });
    }
    /**
     * Builds the complete system prompt from file and additional instructions.
     */
    async buildSystemPrompt(options) {
        const warnings = [];
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
    async initialize(options = {}) {
        const warnings = [];
        // Create Anthropic client
        const client = this.createClient(options.apiKey);
        // Build system prompt
        const promptResult = await this.buildSystemPrompt(options);
        warnings.push(...promptResult.warnings);
        // Build configuration
        const config = {
            model: options.model ?? "claude-sonnet-4-20250514",
            maxTokens: options.maxTokens ?? 8192,
            systemPrompt: promptResult.prompt,
        };
        // Create agent state
        const state = {
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
    initializeSync(options = {}) {
        const warnings = [];
        // Create Anthropic client
        const client = this.createClient(options.apiKey);
        // Build system prompt synchronously
        let prompt = "";
        let loaded = false;
        let promptPath;
        if (options.customSystemPrompt) {
            prompt = options.customSystemPrompt;
            loaded = true;
        }
        else if (!options.skipSystemPrompt) {
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
        }
        else {
            warnings.push("System prompt loading skipped by configuration");
        }
        // Build configuration
        const config = {
            model: options.model ?? "claude-sonnet-4-20250514",
            maxTokens: options.maxTokens ?? 8192,
            systemPrompt: prompt,
        };
        // Create agent state
        const state = {
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
    async reloadSystemPrompt(state, additionalInstructions) {
        const warnings = [];
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
    getSystemPromptLoader() {
        return this.systemPromptLoader;
    }
}
/**
 * Creates and initializes an agent with default settings.
 * Convenience function for simple use cases.
 */
export async function createAgent(options = {}) {
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
export function createAgentSync(options = {}) {
    const initializer = new AgentInitializer();
    const result = initializer.initializeSync(options);
    if (result.warnings.length > 0) {
        console.warn("Agent initialization warnings:", result.warnings);
    }
    return result.state;
}
//# sourceMappingURL=agent-initializer.js.map