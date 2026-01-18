/**
 * App configuration storage using electron-store.
 * Provides persistent storage for application settings.
 */

import Store from 'electron-store';

/**
 * Schema for application configuration.
 */
export interface AppConfigSchema {
  /** Last selected workspace folder path */
  workspacePath: string | null;
  /** Timestamp of last workspace selection */
  workspaceSelectedAt: number | null;
  /** Window state for restoration */
  windowState: {
    width: number;
    height: number;
    x: number | undefined;
    y: number | undefined;
    isMaximized: boolean;
  } | null;
  /** Selected model ID */
  selectedModel: string;
}

/**
 * Default values for configuration.
 */
const defaults: AppConfigSchema = {
  workspacePath: null,
  workspaceSelectedAt: null,
  windowState: null,
  selectedModel: 'claude-sonnet-4-20250514',
};

/**
 * Electron store instance with typed schema.
 * Data is stored in the user's app data directory.
 */
const store = new Store<AppConfigSchema>({
  name: 'config',
  defaults,
  clearInvalidConfig: true,
});

/**
 * Get a configuration value.
 */
export function getConfig<K extends keyof AppConfigSchema>(
  key: K
): AppConfigSchema[K] {
  return store.get(key);
}

/**
 * Set a configuration value.
 */
export function setConfig<K extends keyof AppConfigSchema>(
  key: K,
  value: AppConfigSchema[K]
): void {
  store.set(key, value);
}

/**
 * Delete a configuration value (resets to default).
 */
export function deleteConfig<K extends keyof AppConfigSchema>(key: K): void {
  store.delete(key);
}

/**
 * Clear all configuration (reset to defaults).
 */
export function clearConfig(): void {
  store.clear();
}

/**
 * Get all configuration values.
 */
export function getAllConfig(): AppConfigSchema {
  return store.store;
}

/**
 * Get the path to the config file.
 */
export function getConfigPath(): string {
  return store.path;
}

export default store;
