/**
 * System Prompt Loader
 *
 * Loads and caches the system prompt from bundled resources.
 * The system prompt defines core agent behaviors like TodoList usage,
 * skill-first approach, and transparency requirements.
 */
import fs from "fs";
import path from "path";
/**
 * SystemPromptLoader handles loading, caching, and validating the system prompt.
 */
export class SystemPromptLoader {
    cache = null;
    config;
    constructor(config = {}) {
        const defaultPath = this.findSystemPromptPath();
        this.config = {
            systemPromptPath: config.systemPromptPath ?? defaultPath,
            useCache: config.useCache ?? true,
        };
    }
    /**
     * Finds the default path to system_prompt.md by searching common locations.
     */
    findSystemPromptPath() {
        const possiblePaths = [
            // Relative to project root
            path.join(process.cwd(), "system_prompt.md"),
            // Relative to agent directory
            path.join(process.cwd(), "..", "system_prompt.md"),
            // Relative to this file's location (for bundled apps)
            path.join(__dirname, "..", "..", "system_prompt.md"),
            path.join(__dirname, "..", "..", "..", "system_prompt.md"),
        ];
        for (const promptPath of possiblePaths) {
            const normalizedPath = path.normalize(promptPath);
            if (fs.existsSync(normalizedPath)) {
                return normalizedPath;
            }
        }
        // Return first possible path as default (will be validated later)
        return possiblePaths[0] ?? path.join(process.cwd(), "system_prompt.md");
    }
    /**
     * Loads the system prompt from the configured path.
     * Uses cache if available and caching is enabled.
     */
    async load() {
        // Return cached version if available and caching is enabled
        if (this.cache && this.config.useCache) {
            return {
                content: this.cache.content,
                fromCache: true,
                sourcePath: this.cache.sourcePath,
                loadedAt: this.cache.loadedAt,
            };
        }
        const sourcePath = path.normalize(this.config.systemPromptPath);
        const content = await this.loadFromFile(sourcePath);
        const loadedAt = new Date();
        // Update cache
        this.cache = {
            content,
            loadedAt,
            sourcePath,
        };
        return {
            content,
            fromCache: false,
            sourcePath,
            loadedAt,
        };
    }
    /**
     * Loads the system prompt synchronously (useful for initialization).
     */
    loadSync() {
        // Return cached version if available and caching is enabled
        if (this.cache && this.config.useCache) {
            return {
                content: this.cache.content,
                fromCache: true,
                sourcePath: this.cache.sourcePath,
                loadedAt: this.cache.loadedAt,
            };
        }
        const sourcePath = path.normalize(this.config.systemPromptPath);
        const content = this.loadFromFileSync(sourcePath);
        const loadedAt = new Date();
        // Update cache
        this.cache = {
            content,
            loadedAt,
            sourcePath,
        };
        return {
            content,
            fromCache: false,
            sourcePath,
            loadedAt,
        };
    }
    /**
     * Loads file content asynchronously.
     */
    async loadFromFile(filePath) {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, "utf-8", (error, data) => {
                if (error) {
                    if (error.code === "ENOENT") {
                        // File not found - return empty string (graceful fallback)
                        resolve("");
                    }
                    else {
                        reject(new Error(`Failed to load system prompt: ${error.message}`));
                    }
                }
                else {
                    resolve(data);
                }
            });
        });
    }
    /**
     * Loads file content synchronously.
     */
    loadFromFileSync(filePath) {
        try {
            return fs.readFileSync(filePath, "utf-8");
        }
        catch (error) {
            if (error instanceof Error &&
                error.code === "ENOENT") {
                // File not found - return empty string (graceful fallback)
                return "";
            }
            throw new Error(`Failed to load system prompt: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Validates the system prompt content.
     * Returns validation results with any issues found.
     */
    validate(content) {
        const issues = [];
        // Check for empty content
        if (!content || content.trim().length === 0) {
            issues.push("System prompt is empty");
        }
        // Calculate character count
        const characterCount = content.length;
        // Approximate token count (rough estimate: ~4 characters per token)
        const approximateTokens = Math.ceil(characterCount / 4);
        // Count sections (lines starting with == or containing headers)
        const sectionPattern = /^==[^\n]+==|^#{1,6}\s+\S+/gm;
        const sectionMatches = content.match(sectionPattern);
        const sectionCount = sectionMatches ? sectionMatches.length : 0;
        // Warn if prompt is very large (over 50k tokens estimated)
        if (approximateTokens > 50000) {
            issues.push(`System prompt is very large (approximately ${approximateTokens} tokens)`);
        }
        // Warn if prompt appears malformed
        if (characterCount > 0 && sectionCount === 0) {
            issues.push("System prompt has no recognizable section markers");
        }
        return {
            isValid: issues.length === 0,
            issues,
            stats: {
                characterCount,
                approximateTokens,
                sectionCount,
            },
        };
    }
    /**
     * Clears the cached system prompt.
     * Call this to force a reload on next access.
     */
    clearCache() {
        this.cache = null;
    }
    /**
     * Checks if the system prompt file exists.
     */
    exists() {
        return fs.existsSync(this.config.systemPromptPath);
    }
    /**
     * Gets the configured system prompt path.
     */
    getPath() {
        return this.config.systemPromptPath;
    }
}
/**
 * Extends the base system prompt with additional instructions.
 * Properly formats the additions as new sections.
 */
export function extendSystemPrompt(basePrompt, additions) {
    const additionsList = Array.isArray(additions) ? additions : [additions];
    if (additionsList.length === 0) {
        return basePrompt;
    }
    // Filter out empty additions
    const validAdditions = additionsList.filter((a) => a && a.trim().length > 0);
    if (validAdditions.length === 0) {
        return basePrompt;
    }
    // Join additions with proper spacing
    const additionalContent = validAdditions.join("\n\n");
    // Add a separator and the additional content
    const separator = "\n\n==Additional Instructions==\n";
    return `${basePrompt}${separator}${additionalContent}`;
}
/**
 * Formats the system prompt for use with the Anthropic API.
 * Removes visual markers like == that are meant for human readability.
 */
export function formatForApi(content) {
    // Remove the visual == section markers but keep the section titles
    // Pattern: ==text== -> text
    const formatted = content.replace(/==([^=]+)==/g, "$1");
    return formatted.trim();
}
/**
 * Default singleton instance for convenience.
 */
let defaultLoader = null;
/**
 * Gets or creates the default SystemPromptLoader instance.
 */
export function getDefaultLoader() {
    if (!defaultLoader) {
        defaultLoader = new SystemPromptLoader();
    }
    return defaultLoader;
}
/**
 * Resets the default loader instance.
 * Useful for testing or when configuration changes.
 */
export function resetDefaultLoader() {
    defaultLoader = null;
}
//# sourceMappingURL=system-prompt.js.map