import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentSkillLoaded } from '@/lib/ipc-types';

/**
 * Loading status for a skill.
 */
export type SkillLoadingStatus = 'loading' | 'loaded' | 'error';

/**
 * A skill with its loading state.
 */
export interface SkillState {
  /** Unique identifier for the skill */
  id: string;
  /** Skill name (directory name) */
  name: string;
  /** Display-friendly name (formatted) */
  displayName: string;
  /** Skill category for styling */
  category: string;
  /** Optional description */
  description?: string;
  /** Preview of skill content (truncated) */
  preview?: string;
  /** Current loading status */
  status: SkillLoadingStatus;
  /** Error message if status is 'error' */
  error?: string;
  /** ISO timestamp when the skill started loading */
  startedAt: string;
  /** ISO timestamp when the skill finished loading (if loaded) */
  loadedAt?: string;
}

/**
 * Summary statistics for skills.
 */
export interface SkillsSummary {
  /** Total number of skills being tracked */
  total: number;
  /** Number of skills currently loading */
  loading: number;
  /** Number of skills successfully loaded */
  loaded: number;
  /** Number of skills that failed to load */
  errored: number;
  /** Whether any skills are currently loading */
  isLoading: boolean;
}

/**
 * Actions for managing skills state.
 */
export interface SkillsActions {
  /** Mark a skill as loading */
  startLoading: (name: string) => string;
  /** Mark a skill as loaded */
  markLoaded: (name: string, preview?: string) => void;
  /** Mark a skill as failed */
  markError: (name: string, error: string) => void;
  /** Handle skill loaded event from IPC */
  handleSkillLoaded: (event: AgentSkillLoaded) => void;
  /** Clear a specific skill */
  removeSkill: (id: string) => void;
  /** Clear all skills */
  clearSkills: () => void;
}

/**
 * Formats a skill name for display.
 * Converts kebab-case to Title Case.
 */
function formatDisplayName(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Determines the category of a skill based on its name.
 */
function detectCategory(name: string): string {
  const lowered = name.toLowerCase();

  if (['docx', 'pdf', 'doc'].some((ext) => lowered.includes(ext))) {
    return 'document';
  }
  if (['xlsx', 'xls', 'csv', 'spreadsheet'].some((ext) => lowered.includes(ext))) {
    return 'spreadsheet';
  }
  if (['pptx', 'ppt', 'presentation', 'slides'].some((ext) => lowered.includes(ext))) {
    return 'presentation';
  }
  if (['frontend', 'web', 'html', 'css', 'react', 'vue'].some((ext) => lowered.includes(ext))) {
    return 'frontend';
  }
  if (['code', 'dev', 'build', 'test'].some((ext) => lowered.includes(ext))) {
    return 'code';
  }
  if (['data', 'database', 'sql', 'json'].some((ext) => lowered.includes(ext))) {
    return 'data';
  }
  if (['brand', 'design', 'theme', 'art'].some((ext) => lowered.includes(ext))) {
    return 'design';
  }
  if (['mcp', 'skill', 'plugin'].some((ext) => lowered.includes(ext))) {
    return 'config';
  }

  return 'default';
}

/**
 * Generates a unique ID for a skill.
 */
function generateSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing skills loading state.
 * Tracks skill loading progress and provides real-time updates for the UI.
 *
 * @returns Skills state, summary, and actions
 *
 * @example
 * const { skills, summary, startLoading, handleSkillLoaded } = useSkills();
 *
 * // Start loading a skill
 * startLoading('docx');
 *
 * // Handle skill loaded event from IPC
 * handleSkillLoaded(event);
 */
export function useSkills(): {
  skills: SkillState[];
  summary: SkillsSummary;
} & SkillsActions {
  const [skills, setSkills] = useState<SkillState[]>([]);

  /**
   * Calculates summary statistics.
   */
  const summary = useMemo((): SkillsSummary => {
    const loading = skills.filter((s) => s.status === 'loading').length;
    const loaded = skills.filter((s) => s.status === 'loaded').length;
    const errored = skills.filter((s) => s.status === 'error').length;

    return {
      total: skills.length,
      loading,
      loaded,
      errored,
      isLoading: loading > 0,
    };
  }, [skills]);

  /**
   * Starts loading a skill.
   * Creates a new skill entry with 'loading' status.
   */
  const startLoading = useCallback((name: string): string => {
    const id = generateSkillId();
    const now = new Date().toISOString();

    const newSkill: SkillState = {
      id,
      name,
      displayName: formatDisplayName(name),
      category: detectCategory(name),
      status: 'loading',
      startedAt: now,
    };

    setSkills((prev) => {
      // Check if skill is already being tracked
      const existing = prev.find((s) => s.name === name);
      if (existing) {
        // Update existing skill to loading state
        return prev.map((s) =>
          s.name === name
            ? { ...s, status: 'loading' as const, startedAt: now, error: undefined }
            : s
        );
      }
      return [...prev, newSkill];
    });

    return id;
  }, []);

  /**
   * Marks a skill as loaded.
   */
  const markLoaded = useCallback((name: string, preview?: string): void => {
    const now = new Date().toISOString();

    setSkills((prev) => {
      const existing = prev.find((s) => s.name === name);
      if (!existing) {
        // Skill was not in loading state, add it directly as loaded
        return [
          ...prev,
          {
            id: generateSkillId(),
            name,
            displayName: formatDisplayName(name),
            category: detectCategory(name),
            status: 'loaded' as const,
            preview,
            startedAt: now,
            loadedAt: now,
          },
        ];
      }

      return prev.map((s) =>
        s.name === name
          ? { ...s, status: 'loaded' as const, preview, loadedAt: now, error: undefined }
          : s
      );
    });
  }, []);

  /**
   * Marks a skill as failed.
   */
  const markError = useCallback((name: string, error: string): void => {
    setSkills((prev) =>
      prev.map((s) =>
        s.name === name ? { ...s, status: 'error' as const, error } : s
      )
    );
  }, []);

  /**
   * Handles skill loaded event from IPC.
   */
  const handleSkillLoaded = useCallback((event: AgentSkillLoaded): void => {
    const { skillName, skillPreview } = event;
    markLoaded(skillName, skillPreview);
  }, [markLoaded]);

  /**
   * Removes a specific skill.
   */
  const removeSkill = useCallback((id: string): void => {
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }, []);

  /**
   * Clears all skills.
   */
  const clearSkills = useCallback((): void => {
    setSkills([]);
  }, []);

  /**
   * Set up IPC listener for skill loaded events.
   */
  useEffect(() => {
    const api = window.electronAgentAPI;
    if (!api) {
      return;
    }

    const cleanup = api.onSkillLoaded((event) => {
      handleSkillLoaded(event);
    });

    return cleanup;
  }, [handleSkillLoaded]);

  return {
    skills,
    summary,
    startLoading,
    markLoaded,
    markError,
    handleSkillLoaded,
    removeSkill,
    clearSkills,
  };
}
