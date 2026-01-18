import { useCallback, useMemo, useState } from 'react';

/**
 * MCP connector status values.
 */
export type McpConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * A loaded skill with metadata.
 */
export interface LoadedSkill {
  /** Unique identifier for the skill */
  id: string;
  /** Display name of the skill */
  name: string;
  /** Category or type of the skill (e.g., 'document', 'data', 'frontend') */
  category: string;
  /** Short description of what the skill does */
  description?: string;
  /** ISO timestamp when the skill was loaded */
  loadedAt: string;
}

/**
 * MCP connector information.
 */
export interface McpConnector {
  /** Unique identifier for the connector */
  id: string;
  /** Display name of the connector */
  name: string;
  /** Current connection status */
  status: McpConnectorStatus;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Session metadata tracking.
 */
export interface SessionMetadata {
  /** Session unique identifier */
  sessionId: string;
  /** ISO timestamp when the session started */
  startedAt: string;
  /** Currently selected model ID */
  modelId: string;
  /** Model display name */
  modelName: string;
  /** Total number of messages exchanged */
  messageCount: number;
  /** Number of tokens used in this session (approximate) */
  tokenCount: number;
}

/**
 * Full context state for the agent session.
 */
export interface SessionContextState {
  /** Current workspace folder path */
  workspacePath: string | null;
  /** List of loaded skills */
  skills: LoadedSkill[];
  /** Session metadata */
  session: SessionMetadata | null;
  /** MCP connectors status (for future expansion) */
  mcpConnectors: McpConnector[];
}

/**
 * Summary statistics for context.
 */
export interface ContextSummary {
  /** Number of loaded skills */
  skillCount: number;
  /** Session duration in human-readable format */
  sessionDuration: string | null;
  /** Whether all MCP connectors are healthy */
  mcpHealthy: boolean;
  /** Number of active MCP connectors */
  activeMcpCount: number;
}

/**
 * Actions for managing session context.
 */
export interface SessionContextActions {
  /** Add a loaded skill */
  addSkill: (skill: Omit<LoadedSkill, 'id' | 'loadedAt'>) => string;
  /** Remove a skill by ID */
  removeSkill: (id: string) => void;
  /** Clear all skills */
  clearSkills: () => void;
  /** Set session metadata */
  setSession: (session: SessionMetadata) => void;
  /** Update session metadata partially */
  updateSession: (updates: Partial<Pick<SessionMetadata, 'messageCount' | 'tokenCount'>>) => void;
  /** Clear session */
  clearSession: () => void;
  /** Set workspace path */
  setWorkspacePath: (path: string | null) => void;
  /** Add or update an MCP connector */
  setMcpConnector: (connector: McpConnector) => void;
  /** Remove an MCP connector */
  removeMcpConnector: (id: string) => void;
}

/**
 * Generates a unique ID for skills.
 */
function generateSkillId(): string {
  return `skill-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Calculates session duration as a human-readable string.
 */
function formatSessionDuration(startedAt: string): string {
  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${seconds}s`;
}

/**
 * Calculates context summary statistics.
 */
function calculateSummary(state: SessionContextState): ContextSummary {
  const skillCount = state.skills.length;

  const sessionDuration = state.session
    ? formatSessionDuration(state.session.startedAt)
    : null;

  const connectedConnectors = state.mcpConnectors.filter(
    (c) => c.status === 'connected'
  );
  const mcpHealthy =
    state.mcpConnectors.length === 0 ||
    connectedConnectors.length === state.mcpConnectors.length;
  const activeMcpCount = connectedConnectors.length;

  return {
    skillCount,
    sessionDuration,
    mcpHealthy,
    activeMcpCount,
  };
}

/**
 * Default initial state for session context.
 */
function createInitialState(): SessionContextState {
  return {
    workspacePath: null,
    skills: [],
    session: null,
    mcpConnectors: [],
  };
}

/**
 * Hook for managing session context state.
 * Tracks workspace, loaded skills, session metadata, and MCP connectors.
 *
 * @param initialWorkspacePath - Optional initial workspace path
 * @returns Session context state, summary, and actions
 *
 * @example
 * const { skills, session, summary, addSkill, setSession } = useSessionContext();
 *
 * // Add a skill when loaded
 * addSkill({ name: 'DOCX', category: 'document', description: 'Word documents' });
 *
 * // Initialize session
 * setSession({
 *   sessionId: 'session-123',
 *   startedAt: new Date().toISOString(),
 *   modelId: 'claude-sonnet-4-5-20250514',
 *   modelName: 'Sonnet 4.5',
 *   messageCount: 0,
 *   tokenCount: 0,
 * });
 */
export function useSessionContext(
  initialWorkspacePath?: string | null
): SessionContextState & { summary: ContextSummary } & SessionContextActions {
  const [state, setState] = useState<SessionContextState>(() => ({
    ...createInitialState(),
    workspacePath: initialWorkspacePath ?? null,
  }));

  /**
   * Calculates summary statistics.
   */
  const summary = useMemo(() => calculateSummary(state), [state]);

  /**
   * Sets the workspace path.
   */
  const setWorkspacePath = useCallback((path: string | null): void => {
    setState((prev) => ({ ...prev, workspacePath: path }));
  }, []);

  /**
   * Adds a loaded skill.
   * @returns The ID of the new skill
   */
  const addSkill = useCallback(
    (skill: Omit<LoadedSkill, 'id' | 'loadedAt'>): string => {
      const id = generateSkillId();
      const now = new Date().toISOString();

      const newSkill: LoadedSkill = {
        id,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        loadedAt: now,
      };

      setState((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill],
      }));

      return id;
    },
    []
  );

  /**
   * Removes a skill by ID.
   */
  const removeSkill = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill.id !== id),
    }));
  }, []);

  /**
   * Clears all loaded skills.
   */
  const clearSkills = useCallback((): void => {
    setState((prev) => ({ ...prev, skills: [] }));
  }, []);

  /**
   * Sets the session metadata.
   */
  const setSession = useCallback((session: SessionMetadata): void => {
    setState((prev) => ({ ...prev, session }));
  }, []);

  /**
   * Updates session metadata partially.
   */
  const updateSession = useCallback(
    (updates: Partial<Pick<SessionMetadata, 'messageCount' | 'tokenCount'>>): void => {
      setState((prev) => {
        if (!prev.session) return prev;
        return {
          ...prev,
          session: { ...prev.session, ...updates },
        };
      });
    },
    []
  );

  /**
   * Clears the session.
   */
  const clearSession = useCallback((): void => {
    setState((prev) => ({ ...prev, session: null }));
  }, []);

  /**
   * Adds or updates an MCP connector.
   */
  const setMcpConnector = useCallback((connector: McpConnector): void => {
    setState((prev) => {
      const existing = prev.mcpConnectors.findIndex((c) => c.id === connector.id);
      if (existing >= 0) {
        const updated = [...prev.mcpConnectors];
        updated[existing] = connector;
        return { ...prev, mcpConnectors: updated };
      }
      return { ...prev, mcpConnectors: [...prev.mcpConnectors, connector] };
    });
  }, []);

  /**
   * Removes an MCP connector.
   */
  const removeMcpConnector = useCallback((id: string): void => {
    setState((prev) => ({
      ...prev,
      mcpConnectors: prev.mcpConnectors.filter((c) => c.id !== id),
    }));
  }, []);

  return {
    // State
    workspacePath: state.workspacePath,
    skills: state.skills,
    session: state.session,
    mcpConnectors: state.mcpConnectors,
    summary,
    // Actions
    setWorkspacePath,
    addSkill,
    removeSkill,
    clearSkills,
    setSession,
    updateSession,
    clearSession,
    setMcpConnector,
    removeMcpConnector,
  };
}
