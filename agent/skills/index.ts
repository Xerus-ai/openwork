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
  SkillDetectionSource,
  DetectedSkill,
  FileAttachment,
  SkillDetectionInput,
  SkillDetectionResult,
} from "./types.js";

// Re-export loader
export {
  SkillsLoader,
  createDefaultSkillsLoader,
} from "./skills-loader.js";

// Re-export skill detector
export {
  SkillDetector,
  createSkillDetector,
} from "./skill-detector.js";

// Re-export docx skill integration
export type {
  TextFormatOptions,
  ParagraphOptions,
  TableCellOptions,
  TableOptions,
  ImageOptions,
  SectionOptions,
  DocumentParagraph,
  DocumentSection,
  DocxDocumentOptions,
  DocxCreateResult,
} from "./docx-integration.js";

export {
  createDocxBuffer,
  createDocxFile,
  createSimpleDocx,
  createFormattedDocx,
  createHyperlinkParagraph,
} from "./docx-integration.js";
