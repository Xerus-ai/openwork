import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_COLLAPSED_STATE,
  DEFAULT_PANE_SIZES,
  loadLayoutState,
  normalizePaneSizes,
  PANE_CONSTRAINTS,
  saveLayoutState,
  type PaneCollapsedState,
  type PaneSizes,
} from '@/lib/layout-storage';

/**
 * Pane identifiers for the three-pane layout.
 */
export type PaneId = 'chat' | 'execution' | 'state';

/**
 * Layout state returned by the useLayout hook.
 */
export interface LayoutState {
  sizes: PaneSizes;
  collapsed: PaneCollapsedState;
  isResizing: boolean;
}

/**
 * Actions available for layout manipulation.
 */
export interface LayoutActions {
  setPaneSize: (paneId: PaneId, size: number) => void;
  resizePanes: (leftPaneId: PaneId, rightPaneId: PaneId, delta: number) => void;
  toggleCollapse: (paneId: PaneId) => void;
  expandPane: (paneId: PaneId) => void;
  collapsePane: (paneId: PaneId) => void;
  resetLayout: () => void;
  setIsResizing: (isResizing: boolean) => void;
}

/**
 * Hook return type combining state and actions.
 */
export type UseLayoutReturn = LayoutState & LayoutActions;

/**
 * Minimum width in pixels before a pane collapses on responsive.
 */
export const MIN_PANE_WIDTH_PX = 200;

/**
 * Hook for managing the three-pane layout state.
 * Handles resizing, collapsing, and persisting layout preferences.
 */
export function useLayout(): UseLayoutReturn {
  const [sizes, setSizes] = useState<PaneSizes>(DEFAULT_PANE_SIZES);
  const [collapsed, setCollapsed] = useState<PaneCollapsedState>(DEFAULT_COLLAPSED_STATE);
  const [isResizing, setIsResizing] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadLayoutState();
    setSizes(savedState.sizes);
    setCollapsed(savedState.collapsed);
  }, []);

  // Save state when it changes
  useEffect(() => {
    saveLayoutState({ sizes, collapsed });
  }, [sizes, collapsed]);

  /**
   * Sets the size of a specific pane, adjusting others proportionally.
   */
  const setPaneSize = useCallback((paneId: PaneId, newSize: number): void => {
    setSizes((current) => {
      const constrainedSize = Math.max(
        PANE_CONSTRAINTS.min,
        Math.min(PANE_CONSTRAINTS.max, newSize)
      );

      const updated = { ...current, [paneId]: constrainedSize };
      return normalizePaneSizes(updated);
    });
  }, []);

  /**
   * Resizes two adjacent panes by moving the divider between them.
   * Delta is positive when moving right/down, negative when moving left/up.
   */
  const resizePanes = useCallback(
    (leftPaneId: PaneId, rightPaneId: PaneId, delta: number): void => {
      setSizes((current) => {
        const leftSize = current[leftPaneId] + delta;
        const rightSize = current[rightPaneId] - delta;

        // Check constraints before applying
        if (leftSize < PANE_CONSTRAINTS.min || rightSize < PANE_CONSTRAINTS.min) {
          return current;
        }
        if (leftSize > PANE_CONSTRAINTS.max || rightSize > PANE_CONSTRAINTS.max) {
          return current;
        }

        return {
          ...current,
          [leftPaneId]: leftSize,
          [rightPaneId]: rightSize,
        };
      });
    },
    []
  );

  /**
   * Toggles the collapsed state of a pane.
   */
  const toggleCollapse = useCallback((paneId: PaneId): void => {
    setCollapsed((current) => ({
      ...current,
      [paneId]: !current[paneId],
    }));
  }, []);

  /**
   * Expands a collapsed pane.
   */
  const expandPane = useCallback((paneId: PaneId): void => {
    setCollapsed((current) => ({
      ...current,
      [paneId]: false,
    }));
  }, []);

  /**
   * Collapses a pane.
   */
  const collapsePane = useCallback((paneId: PaneId): void => {
    setCollapsed((current) => ({
      ...current,
      [paneId]: true,
    }));
  }, []);

  /**
   * Resets layout to default sizes and expands all panes.
   */
  const resetLayout = useCallback((): void => {
    setSizes(DEFAULT_PANE_SIZES);
    setCollapsed(DEFAULT_COLLAPSED_STATE);
  }, []);

  return {
    sizes,
    collapsed,
    isResizing,
    setPaneSize,
    resizePanes,
    toggleCollapse,
    expandPane,
    collapsePane,
    resetLayout,
    setIsResizing,
  };
}
