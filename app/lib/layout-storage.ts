/**
 * Persists and retrieves pane layout sizes from localStorage.
 * Used to maintain user's preferred layout across sessions.
 */

const STORAGE_KEY = 'cowork-layout-sizes';

/**
 * Pane size configuration with percentages for each pane.
 * Values should sum to 100 (or close to it).
 */
export interface PaneSizes {
  chat: number;
  execution: number;
  state: number;
}

/**
 * Default pane sizes as specified in the design.
 * Chat: 30%, Execution: 40%, State: 30%
 */
export const DEFAULT_PANE_SIZES: PaneSizes = {
  chat: 30,
  execution: 40,
  state: 30,
};

/**
 * Minimum and maximum percentage constraints for each pane.
 * Prevents panes from becoming too small or too large.
 */
export const PANE_CONSTRAINTS = {
  min: 20,
  max: 60,
} as const;

/**
 * Collapsed state configuration for panes.
 */
export interface PaneCollapsedState {
  chat: boolean;
  execution: boolean;
  state: boolean;
}

/**
 * Default collapsed state - all panes visible.
 */
export const DEFAULT_COLLAPSED_STATE: PaneCollapsedState = {
  chat: false,
  execution: false,
  state: false,
};

/**
 * Complete layout state stored in localStorage.
 */
export interface StoredLayoutState {
  sizes: PaneSizes;
  collapsed: PaneCollapsedState;
}

/**
 * Validates that pane sizes are within acceptable constraints.
 * Returns true if all sizes are within bounds.
 */
function isValidPaneSizes(sizes: PaneSizes): boolean {
  const values = [sizes.chat, sizes.execution, sizes.state];

  for (const value of values) {
    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }
    if (value < PANE_CONSTRAINTS.min || value > PANE_CONSTRAINTS.max) {
      return false;
    }
  }

  return true;
}

/**
 * Validates that collapsed state has all required boolean fields.
 */
function isValidCollapsedState(collapsed: PaneCollapsedState): boolean {
  return (
    typeof collapsed.chat === 'boolean' &&
    typeof collapsed.execution === 'boolean' &&
    typeof collapsed.state === 'boolean'
  );
}

/**
 * Saves layout state to localStorage.
 * Silently fails if localStorage is unavailable.
 */
export function saveLayoutState(state: StoredLayoutState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch {
    // localStorage unavailable or quota exceeded, silently fail
  }
}

/**
 * Loads layout state from localStorage.
 * Returns default state if no saved state exists or state is invalid.
 */
export function loadLayoutState(): StoredLayoutState {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);

    if (!serialized) {
      return {
        sizes: DEFAULT_PANE_SIZES,
        collapsed: DEFAULT_COLLAPSED_STATE,
      };
    }

    const parsed = JSON.parse(serialized) as StoredLayoutState;

    // Validate parsed state
    if (!parsed.sizes || !isValidPaneSizes(parsed.sizes)) {
      return {
        sizes: DEFAULT_PANE_SIZES,
        collapsed: parsed.collapsed && isValidCollapsedState(parsed.collapsed)
          ? parsed.collapsed
          : DEFAULT_COLLAPSED_STATE,
      };
    }

    if (!parsed.collapsed || !isValidCollapsedState(parsed.collapsed)) {
      return {
        sizes: parsed.sizes,
        collapsed: DEFAULT_COLLAPSED_STATE,
      };
    }

    return parsed;
  } catch {
    // Parse error or localStorage unavailable
    return {
      sizes: DEFAULT_PANE_SIZES,
      collapsed: DEFAULT_COLLAPSED_STATE,
    };
  }
}

/**
 * Clears stored layout state, reverting to defaults on next load.
 */
export function clearLayoutState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable, silently fail
  }
}

/**
 * Normalizes pane sizes to ensure they sum to 100%.
 * Maintains proportions while adjusting for constraints.
 */
export function normalizePaneSizes(sizes: PaneSizes): PaneSizes {
  const total = sizes.chat + sizes.execution + sizes.state;

  if (total === 0) {
    return DEFAULT_PANE_SIZES;
  }

  // Scale to 100%
  const scale = 100 / total;
  let normalized: PaneSizes = {
    chat: Math.max(PANE_CONSTRAINTS.min, Math.min(PANE_CONSTRAINTS.max, sizes.chat * scale)),
    execution: Math.max(PANE_CONSTRAINTS.min, Math.min(PANE_CONSTRAINTS.max, sizes.execution * scale)),
    state: Math.max(PANE_CONSTRAINTS.min, Math.min(PANE_CONSTRAINTS.max, sizes.state * scale)),
  };

  // Re-normalize after applying constraints
  const constrainedTotal = normalized.chat + normalized.execution + normalized.state;
  if (Math.abs(constrainedTotal - 100) > 0.1) {
    const reScale = 100 / constrainedTotal;
    normalized = {
      chat: normalized.chat * reScale,
      execution: normalized.execution * reScale,
      state: normalized.state * reScale,
    };
  }

  return normalized;
}
