/**
 * Skills Loader
 *
 * Loads SKILL.md files from the bundled skills directory with caching,
 * validation, and performance monitoring.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  LoadedSkill,
  SkillMetadata,
  SkillLoadResult,
  SkillSummary,
  SkillsLoaderConfig,
  SkillsLoadMetrics,
} from "./types.js";

const SKILL_FILE_NAME = "SKILL.md";
const DEFAULT_MAX_CACHE_SIZE = 20;

/**
 * LRU Cache for loaded skills.
 * Tracks access order to evict least recently used skills.
 */
class LRUCache<K, V> {
  private cache: Map<K, V> = new Map();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // Remove existing to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  keys(): IterableIterator<K> {
    return this.cache.keys();
  }
}

/**
 * Parses YAML frontmatter from SKILL.md content.
 * Frontmatter is enclosed in --- delimiters at the start of the file.
 */
function parseFrontmatter(content: string): {
  metadata: SkillMetadata | null;
  body: string;
  error?: string;
} {
  const trimmedContent = content.trim();

  // Check for frontmatter delimiter at start
  if (!trimmedContent.startsWith("---")) {
    return {
      metadata: null,
      body: content,
      error: "Missing frontmatter delimiter at start of file",
    };
  }

  // Find closing delimiter
  const secondDelimiterIndex = trimmedContent.indexOf("---", 3);
  if (secondDelimiterIndex === -1) {
    return {
      metadata: null,
      body: content,
      error: "Missing closing frontmatter delimiter",
    };
  }

  const frontmatterRaw = trimmedContent.slice(3, secondDelimiterIndex).trim();
  const body = trimmedContent.slice(secondDelimiterIndex + 3).trim();

  // Parse simple YAML (key: value format)
  const metadata: Partial<SkillMetadata> = {};
  const lines = frontmatterRaw.split("\n");

  for (const line of lines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    let value = line.slice(colonIndex + 1).trim();

    // Remove surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key === "name") {
      metadata.name = value;
    } else if (key === "description") {
      metadata.description = value;
    } else if (key === "license") {
      metadata.license = value;
    }
  }

  // Validate required fields
  if (!metadata.name) {
    return {
      metadata: null,
      body: content,
      error: "Missing required 'name' field in frontmatter",
    };
  }

  if (!metadata.description) {
    return {
      metadata: null,
      body: content,
      error: "Missing required 'description' field in frontmatter",
    };
  }

  return {
    metadata: {
      name: metadata.name,
      description: metadata.description,
      license: metadata.license || "Unknown",
    },
    body,
  };
}

/**
 * SkillsLoader manages loading and caching of SKILL.md files.
 */
export class SkillsLoader {
  private readonly config: SkillsLoaderConfig;
  private readonly cache: LRUCache<string, LoadedSkill>;
  private availableSkills: string[] | null = null;
  private metrics: SkillsLoadMetrics = {
    totalSkillsDiscovered: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageLoadTimeMs: 0,
    totalLoadOperations: 0,
  };
  private totalLoadTimeMs = 0;

  constructor(config: Partial<SkillsLoaderConfig> & { skillsDirectory: string }) {
    this.config = {
      skillsDirectory: config.skillsDirectory,
      maxCacheSize: config.maxCacheSize ?? DEFAULT_MAX_CACHE_SIZE,
      validateOnLoad: config.validateOnLoad ?? true,
    };
    this.cache = new LRUCache(this.config.maxCacheSize);
  }

  /**
   * Gets the configured skills directory path.
   */
  getSkillsDirectory(): string {
    return this.config.skillsDirectory;
  }

  /**
   * Checks if the skills directory exists and is accessible.
   */
  isSkillsDirectoryAccessible(): boolean {
    try {
      fs.accessSync(this.config.skillsDirectory, fs.constants.R_OK);
      const stats = fs.statSync(this.config.skillsDirectory);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Discovers all available skill directories.
   * Caches the result for subsequent calls.
   */
  discoverSkills(): string[] {
    if (this.availableSkills !== null) {
      return this.availableSkills;
    }

    if (!this.isSkillsDirectoryAccessible()) {
      this.availableSkills = [];
      return this.availableSkills;
    }

    try {
      const entries = fs.readdirSync(this.config.skillsDirectory, {
        withFileTypes: true,
      });

      this.availableSkills = entries
        .filter((entry) => {
          if (!entry.isDirectory()) return false;
          const skillFilePath = path.join(
            this.config.skillsDirectory,
            entry.name,
            SKILL_FILE_NAME
          );
          return fs.existsSync(skillFilePath);
        })
        .map((entry) => entry.name);

      this.metrics.totalSkillsDiscovered = this.availableSkills.length;
      return this.availableSkills;
    } catch {
      this.availableSkills = [];
      return this.availableSkills;
    }
  }

  /**
   * Loads a skill by directory name.
   * Returns from cache if available, otherwise reads from disk.
   */
  loadSkill(skillDirectoryName: string): SkillLoadResult {
    const startTime = performance.now();
    this.metrics.totalLoadOperations++;

    // Check cache first
    const cached = this.cache.get(skillDirectoryName);
    if (cached) {
      this.metrics.cacheHits++;
      this.updateAverageLoadTime(performance.now() - startTime);
      return { success: true, skill: cached };
    }

    this.metrics.cacheMisses++;

    // Validate skill exists
    const skillFilePath = path.join(
      this.config.skillsDirectory,
      skillDirectoryName,
      SKILL_FILE_NAME
    );

    if (!fs.existsSync(skillFilePath)) {
      this.updateAverageLoadTime(performance.now() - startTime);
      return {
        success: false,
        error: `Skill not found: ${skillDirectoryName}. File does not exist: ${skillFilePath}`,
      };
    }

    // Read file content
    let content: string;
    try {
      content = fs.readFileSync(skillFilePath, "utf-8");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.updateAverageLoadTime(performance.now() - startTime);
      return {
        success: false,
        error: `Failed to read skill file ${skillFilePath}: ${message}`,
      };
    }

    // Parse frontmatter
    const parsed = parseFrontmatter(content);
    if (!parsed.metadata) {
      this.updateAverageLoadTime(performance.now() - startTime);
      if (this.config.validateOnLoad) {
        return {
          success: false,
          error: `Invalid skill file ${skillDirectoryName}: ${parsed.error}`,
        };
      }
      // Create minimal metadata if validation is off
      const loadedSkill: LoadedSkill = {
        metadata: {
          name: skillDirectoryName,
          description: "No description available",
          license: "Unknown",
        },
        content,
        body: content,
        directoryName: skillDirectoryName,
        filePath: skillFilePath,
        loadedAt: new Date(),
      };
      this.cache.set(skillDirectoryName, loadedSkill);
      return { success: true, skill: loadedSkill };
    }

    // Create loaded skill
    const loadedSkill: LoadedSkill = {
      metadata: parsed.metadata,
      content,
      body: parsed.body,
      directoryName: skillDirectoryName,
      filePath: skillFilePath,
      loadedAt: new Date(),
    };

    // Cache the skill
    this.cache.set(skillDirectoryName, loadedSkill);

    this.updateAverageLoadTime(performance.now() - startTime);
    return { success: true, skill: loadedSkill };
  }

  /**
   * Loads multiple skills at once.
   * Returns successfully loaded skills and errors separately.
   */
  loadSkills(
    skillDirectoryNames: string[]
  ): { loaded: LoadedSkill[]; errors: Array<{ name: string; error: string }> } {
    const loaded: LoadedSkill[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const name of skillDirectoryNames) {
      const result = this.loadSkill(name);
      if (result.success) {
        loaded.push(result.skill);
      } else {
        errors.push({ name, error: result.error });
      }
    }

    return { loaded, errors };
  }

  /**
   * Gets summaries of all available skills.
   * Does not load full content, only metadata from cache or disk.
   */
  getSkillSummaries(): SkillSummary[] {
    const skillNames = this.discoverSkills();
    const summaries: SkillSummary[] = [];

    for (const directoryName of skillNames) {
      const cached = this.cache.get(directoryName);
      if (cached) {
        summaries.push({
          directoryName,
          name: cached.metadata.name,
          description: cached.metadata.description,
          isCached: true,
        });
      } else {
        // Read just the frontmatter for uncached skills
        const skillFilePath = path.join(
          this.config.skillsDirectory,
          directoryName,
          SKILL_FILE_NAME
        );
        try {
          const content = fs.readFileSync(skillFilePath, "utf-8");
          const parsed = parseFrontmatter(content);
          if (parsed.metadata) {
            summaries.push({
              directoryName,
              name: parsed.metadata.name,
              description: parsed.metadata.description,
              isCached: false,
            });
          } else {
            summaries.push({
              directoryName,
              name: directoryName,
              description: "Unable to parse metadata",
              isCached: false,
            });
          }
        } catch {
          summaries.push({
            directoryName,
            name: directoryName,
            description: "Unable to read skill file",
            isCached: false,
          });
        }
      }
    }

    return summaries;
  }

  /**
   * Checks if a skill is currently in the cache.
   */
  isSkillCached(skillDirectoryName: string): boolean {
    return this.cache.has(skillDirectoryName);
  }

  /**
   * Evicts a skill from the cache.
   */
  evictSkill(skillDirectoryName: string): boolean {
    return this.cache.delete(skillDirectoryName);
  }

  /**
   * Clears the entire cache.
   */
  clearCache(): void {
    this.cache.clear();
    // Reset discovery cache too
    this.availableSkills = null;
  }

  /**
   * Gets current cache size.
   */
  getCacheSize(): number {
    return this.cache.size();
  }

  /**
   * Gets performance metrics for load operations.
   */
  getMetrics(): SkillsLoadMetrics {
    return { ...this.metrics };
  }

  /**
   * Resets performance metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      totalSkillsDiscovered: this.availableSkills?.length ?? 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageLoadTimeMs: 0,
      totalLoadOperations: 0,
    };
    this.totalLoadTimeMs = 0;
  }

  private updateAverageLoadTime(loadTimeMs: number): void {
    this.totalLoadTimeMs += loadTimeMs;
    this.metrics.averageLoadTimeMs =
      this.totalLoadTimeMs / this.metrics.totalLoadOperations;
  }
}

/**
 * Creates a SkillsLoader with the default skills directory.
 * Uses the bundled skills directory relative to the project root.
 */
export function createDefaultSkillsLoader(
  projectRoot: string,
  config: Partial<Omit<SkillsLoaderConfig, "skillsDirectory">> = {}
): SkillsLoader {
  const skillsDirectory = path.join(projectRoot, "skills");
  return new SkillsLoader({ skillsDirectory, ...config });
}

/**
 * Exported for testing purposes.
 */
export { parseFrontmatter, LRUCache };
