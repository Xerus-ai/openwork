/**
 * System Prompt Loader
 *
 * Loads and caches the system prompt from bundled resources.
 * The system prompt defines core agent behaviors like TodoList usage,
 * skill-first approach, and transparency requirements.
 */
/**
 * Configuration for the system prompt loader.
 */
export interface SystemPromptConfig {
    /** Path to the system_prompt.md file */
    systemPromptPath: string;
    /** Whether to use cached version if available */
    useCache: boolean;
}
/**
 * Result of loading the system prompt.
 */
export interface SystemPromptResult {
    /** The loaded system prompt content */
    content: string;
    /** Whether the prompt was loaded from cache */
    fromCache: boolean;
    /** Path where the prompt was loaded from */
    sourcePath: string;
    /** Timestamp when the prompt was loaded */
    loadedAt: Date;
}
/**
 * Validation result for system prompt content.
 */
export interface SystemPromptValidation {
    /** Whether the prompt is valid */
    isValid: boolean;
    /** List of validation issues found */
    issues: string[];
    /** Statistics about the prompt content */
    stats: {
        /** Total character count */
        characterCount: number;
        /** Approximate token count */
        approximateTokens: number;
        /** Number of sections detected */
        sectionCount: number;
    };
}
/**
 * SystemPromptLoader handles loading, caching, and validating the system prompt.
 */
export declare class SystemPromptLoader {
    private cache;
    private readonly config;
    constructor(config?: Partial<SystemPromptConfig>);
    /**
     * Finds the default path to system_prompt.md by searching common locations.
     */
    private findSystemPromptPath;
    /**
     * Loads the system prompt from the configured path.
     * Uses cache if available and caching is enabled.
     */
    load(): Promise<SystemPromptResult>;
    /**
     * Loads the system prompt synchronously (useful for initialization).
     */
    loadSync(): SystemPromptResult;
    /**
     * Loads file content asynchronously.
     */
    private loadFromFile;
    /**
     * Loads file content synchronously.
     */
    private loadFromFileSync;
    /**
     * Validates the system prompt content.
     * Returns validation results with any issues found.
     */
    validate(content: string): SystemPromptValidation;
    /**
     * Clears the cached system prompt.
     * Call this to force a reload on next access.
     */
    clearCache(): void;
    /**
     * Checks if the system prompt file exists.
     */
    exists(): boolean;
    /**
     * Gets the configured system prompt path.
     */
    getPath(): string;
}
/**
 * Extends the base system prompt with additional instructions.
 * Properly formats the additions as new sections.
 */
export declare function extendSystemPrompt(basePrompt: string, additions: string | string[]): string;
/**
 * Formats the system prompt for use with the Anthropic API.
 * Removes visual markers like == that are meant for human readability.
 */
export declare function formatForApi(content: string): string;
/**
 * Gets or creates the default SystemPromptLoader instance.
 */
export declare function getDefaultLoader(): SystemPromptLoader;
/**
 * Resets the default loader instance.
 * Useful for testing or when configuration changes.
 */
export declare function resetDefaultLoader(): void;
//# sourceMappingURL=system-prompt.d.ts.map