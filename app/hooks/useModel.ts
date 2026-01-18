import { useCallback, useEffect, useState } from 'react';

/**
 * Available Claude model identifiers.
 */
export type ModelId = 'claude-sonnet-4-5-20250514' | 'claude-opus-4-5-20250514';

/**
 * Model configuration with display information.
 */
export interface ModelConfig {
  id: ModelId;
  name: string;
  description: string;
}

/**
 * All available models with their configurations.
 */
export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'claude-sonnet-4-5-20250514',
    name: 'Sonnet 4.5',
    description: 'Fast and efficient for most tasks',
  },
  {
    id: 'claude-opus-4-5-20250514',
    name: 'Opus 4.5',
    description: 'Most capable for complex reasoning',
  },
];

/**
 * Default model to use when none is stored.
 */
export const DEFAULT_MODEL: ModelId = 'claude-sonnet-4-5-20250514';

/**
 * LocalStorage key for persisting model selection.
 */
const STORAGE_KEY = 'cowork-selected-model';

/**
 * State returned by the useModel hook.
 */
export interface ModelState {
  selectedModel: ModelId;
  modelConfig: ModelConfig;
}

/**
 * Actions returned by the useModel hook.
 */
export interface ModelActions {
  setModel: (modelId: ModelId) => void;
}

/**
 * Validates if a string is a valid model ID.
 */
function isValidModelId(value: string): value is ModelId {
  return AVAILABLE_MODELS.some((model) => model.id === value);
}

/**
 * Gets the stored model ID from localStorage, or returns default.
 */
function getStoredModelId(): ModelId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isValidModelId(stored)) {
      return stored;
    }
  } catch {
    // localStorage may not be available
  }
  return DEFAULT_MODEL;
}

/**
 * Stores the selected model ID in localStorage.
 */
function storeModelId(modelId: ModelId): void {
  try {
    localStorage.setItem(STORAGE_KEY, modelId);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Gets the model configuration for a given model ID.
 * Falls back to the first available model if not found (should never happen).
 */
function getModelConfig(modelId: ModelId): ModelConfig {
  const config = AVAILABLE_MODELS.find((model) => model.id === modelId);
  if (config) {
    return config;
  }
  // Fallback to first model - we know AVAILABLE_MODELS is non-empty
  return AVAILABLE_MODELS[0] as ModelConfig;
}

/**
 * Hook for managing model selection state with localStorage persistence.
 *
 * @returns Model state and actions for changing the selected model
 *
 * @example
 * const { selectedModel, modelConfig, setModel } = useModel();
 *
 * // Access current model info
 * console.log(modelConfig.name); // "Sonnet 4.5"
 *
 * // Change model
 * setModel('claude-opus-4-5-20250514');
 */
export function useModel(): ModelState & ModelActions {
  const [selectedModel, setSelectedModel] = useState<ModelId>(getStoredModelId);

  // Sync to localStorage whenever selectedModel changes
  useEffect(() => {
    storeModelId(selectedModel);
  }, [selectedModel]);

  /**
   * Updates the selected model.
   */
  const setModel = useCallback((modelId: ModelId): void => {
    if (isValidModelId(modelId)) {
      setSelectedModel(modelId);
    }
  }, []);

  return {
    selectedModel,
    modelConfig: getModelConfig(selectedModel),
    setModel,
  };
}
