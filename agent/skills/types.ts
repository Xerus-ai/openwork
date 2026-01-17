/**
 * Skills System Types
 *
 * Type definitions for the skills loading and caching system.
 */

/**
 * Metadata extracted from SKILL.md frontmatter.
 */
export interface SkillMetadata {
  /** Name of the skill (from frontmatter) */
  name: string;
  /** Description of the skill (from frontmatter) */
  description: string;
  /** License information (from frontmatter) */
  license: string;
}

/**
 * A loaded skill with metadata and content.
 */
export interface LoadedSkill {
  /** Skill metadata from frontmatter */
  metadata: SkillMetadata;
  /** Full content of the SKILL.md file (including frontmatter) */
  content: string;
  /** Markdown body content (without frontmatter) */
  body: string;
  /** Directory name where the skill lives */
  directoryName: string;
  /** Absolute path to the SKILL.md file */
  filePath: string;
  /** Timestamp when skill was loaded */
  loadedAt: Date;
}

/**
 * Summary of an available skill (without full content).
 */
export interface SkillSummary {
  /** Directory name of the skill */
  directoryName: string;
  /** Skill name from metadata */
  name: string;
  /** Skill description from metadata */
  description: string;
  /** Whether the skill is currently cached */
  isCached: boolean;
}

/**
 * Result of attempting to load a skill.
 */
export type SkillLoadResult =
  | { success: true; skill: LoadedSkill }
  | { success: false; error: string };

/**
 * Configuration for the skills loader.
 */
export interface SkillsLoaderConfig {
  /** Absolute path to the skills directory */
  skillsDirectory: string;
  /** Maximum number of skills to keep in cache (LRU eviction) */
  maxCacheSize: number;
  /** Whether to validate skill files on load */
  validateOnLoad: boolean;
}

/**
 * Performance metrics for skills loading operations.
 */
export interface SkillsLoadMetrics {
  /** Total number of skills discovered */
  totalSkillsDiscovered: number;
  /** Number of cache hits */
  cacheHits: number;
  /** Number of cache misses (disk reads) */
  cacheMisses: number;
  /** Average load time in milliseconds */
  averageLoadTimeMs: number;
  /** Total load operations performed */
  totalLoadOperations: number;
}
