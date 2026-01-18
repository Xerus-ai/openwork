/**
 * Configuration module exports.
 */

export {
  getConfig,
  setConfig,
  deleteConfig,
  clearConfig,
  getAllConfig,
  getConfigPath,
} from './app-config.js';

export type { AppConfigSchema } from './app-config.js';

export {
  getSavedWorkspace,
  saveWorkspace,
  clearSavedWorkspace,
  validateWorkspacePath,
  loadAndValidateSavedWorkspace,
} from './workspace-config.js';

export type {
  WorkspaceValidationResult,
  SavedWorkspace,
} from './workspace-config.js';
