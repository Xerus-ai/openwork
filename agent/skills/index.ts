/**
 * Skills System Public API
 *
 * Exports the skills loading and caching system for use by the agent.
 */

// Re-export types
export type {
  SkillMetadata,
  LoadedSkill,
  SkillSummary,
  SkillLoadResult,
  SkillsLoaderConfig,
  SkillsLoadMetrics,
} from "./types.js";

// Re-export loader
export {
  SkillsLoader,
  createDefaultSkillsLoader,
} from "./skills-loader.js";
