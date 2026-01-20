/**
 * Hook for managing multiple task sessions.
 * Each session represents a distinct task/conversation with its own messages and artifacts.
 */

import { useCallback, useEffect, useState } from 'react';
import type { ChatMessage } from './useChat';
import type { WorkspaceEntry } from '@/contexts/WorkspaceContext';
import type { AttachedFile } from './useFileUpload';

/**
 * Status of a task session.
 */
export type TaskSessionStatus = 'idle' | 'active' | 'completed';

/**
 * A task session representing a single task/conversation.
 */
export interface TaskSession {
  /** Unique identifier for the session */
  id: string;
  /** Display title for the session */
  title: string;
  /** Current status of the session */
  status: TaskSessionStatus;
  /** Subtitle text (e.g., "Step 2 of 4" or "3 days ago") */
  subtitle: string;
  /** When the session was created */
  createdAt: Date;
  /** When the session was last updated */
  updatedAt: Date;
  /** Messages in this session */
  messages: ChatMessage[];
  /** IDs of artifacts created in this session */
  artifactIds: string[];
  /** Workspace path for this session */
  workspacePath?: string | null;
  /** Cached workspace contents (files/folders) */
  workspaceContents?: WorkspaceEntry[];
  /** Files attached to this task */
  attachments?: AttachedFile[];
}

/**
 * State for task sessions.
 */
export interface TaskSessionsState {
  /** All task sessions */
  sessions: TaskSession[];
  /** ID of the currently active session */
  activeSessionId: string | null;
  /** Whether sessions are being loaded */
  isLoading: boolean;
}

/**
 * Actions for managing task sessions.
 */
export interface TaskSessionsActions {
  /** Create a new task session */
  createSession: (title?: string, workspacePath?: string | null, attachments?: AttachedFile[]) => string;
  /** Update a session's properties */
  updateSession: (id: string, updates: Partial<Omit<TaskSession, 'id' | 'createdAt'>>) => void;
  /** Delete a session */
  deleteSession: (id: string) => void;
  /** Set the active session */
  setActiveSession: (id: string | null) => void;
  /** Add a message to a session */
  addMessageToSession: (sessionId: string, message: ChatMessage) => void;
  /** Update messages in a session */
  updateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  /** Add an artifact ID to a session */
  addArtifactToSession: (sessionId: string, artifactId: string) => void;
  /** Clear all sessions */
  clearAllSessions: () => void;
  /** Get a session by ID */
  getSession: (id: string) => TaskSession | undefined;
  /** Get the active session */
  getActiveSession: () => TaskSession | undefined;
  /** Set workspace for a session */
  setSessionWorkspace: (sessionId: string, workspacePath: string | null, workspaceContents?: WorkspaceEntry[]) => void;
  /** Get workspace for a session */
  getSessionWorkspace: (sessionId: string) => { path: string | null; contents: WorkspaceEntry[] };
  /** Get workspace for active session */
  getActiveSessionWorkspace: () => { path: string | null; contents: WorkspaceEntry[] };
  /** Get attachments for active session */
  getActiveSessionAttachments: () => AttachedFile[];
}

/**
 * Storage key for persisting sessions.
 */
const STORAGE_KEY = 'claude-cowork-sessions';

/**
 * Generates a unique session ID.
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a default session title based on order.
 */
function createDefaultTitle(sessionCount: number): string {
  return `Task ${sessionCount + 1}`;
}

/**
 * Loads sessions from localStorage.
 */
function loadSessionsFromStorage(): TaskSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as TaskSession[];
    // Convert date strings back to Date objects
    return parsed.map((session) => ({
      ...session,
      createdAt: new Date(session.createdAt),
      updatedAt: new Date(session.updatedAt),
      messages: session.messages.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      })),
    }));
  } catch (error) {
    console.error('[useTaskSessions] Failed to load sessions:', error);
    return [];
  }
}

/**
 * Saves sessions to localStorage.
 */
function saveSessionsToStorage(sessions: TaskSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('[useTaskSessions] Failed to save sessions:', error);
  }
}

/**
 * Formats a relative time string for display.
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

/**
 * Hook for managing multiple task sessions.
 *
 * @returns Task sessions state and actions
 *
 * @example
 * const { sessions, activeSessionId, createSession, setActiveSession } = useTaskSessions();
 *
 * // Create a new session
 * const newId = createSession("Analyze sales data");
 *
 * // Switch to a session
 * setActiveSession(newId);
 */
export function useTaskSessions(): TaskSessionsState & TaskSessionsActions {
  const [sessions, setSessions] = useState<TaskSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions from storage on mount
  useEffect(() => {
    const loaded = loadSessionsFromStorage();
    setSessions(loaded);
    // Set the most recent session as active if any exist
    if (loaded.length > 0) {
      const mostRecent = loaded.reduce((latest, session) =>
        session.updatedAt > latest.updatedAt ? session : latest
      );
      setActiveSessionId(mostRecent.id);
    }
    setIsLoading(false);
  }, []);

  // Save sessions to storage when they change
  useEffect(() => {
    if (!isLoading) {
      saveSessionsToStorage(sessions);
    }
  }, [sessions, isLoading]);

  /**
   * Creates a new task session.
   */
  const createSession = useCallback((title?: string, workspacePath?: string | null, attachments?: AttachedFile[]): string => {
    const id = generateSessionId();
    const now = new Date();

    const newSession: TaskSession = {
      id,
      title: title ?? createDefaultTitle(sessions.length),
      status: 'idle',
      subtitle: 'New task',
      createdAt: now,
      updatedAt: now,
      messages: [],
      artifactIds: [],
      workspacePath: workspacePath ?? null,
      workspaceContents: [],
      attachments: attachments ?? [],
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);

    return id;
  }, [sessions.length]);

  /**
   * Updates a session's properties.
   */
  const updateSession = useCallback(
    (id: string, updates: Partial<Omit<TaskSession, 'id' | 'createdAt'>>): void => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === id
            ? { ...session, ...updates, updatedAt: new Date() }
            : session
        )
      );
    },
    []
  );

  /**
   * Deletes a session.
   */
  const deleteSession = useCallback(
    (id: string): void => {
      setSessions((prev) => {
        const filtered = prev.filter((session) => session.id !== id);
        // If we deleted the active session, switch to another
        const firstSession = filtered[0];
        if (activeSessionId === id && firstSession) {
          setActiveSessionId(firstSession.id);
        } else if (filtered.length === 0) {
          setActiveSessionId(null);
        }
        return filtered;
      });
    },
    [activeSessionId]
  );

  /**
   * Sets the active session.
   */
  const setActiveSession = useCallback((id: string | null): void => {
    setActiveSessionId(id);
  }, []);

  /**
   * Adds a message to a session.
   */
  const addMessageToSession = useCallback(
    (sessionId: string, message: ChatMessage): void => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                messages: [...session.messages, message],
                updatedAt: new Date(),
                status: 'active' as TaskSessionStatus,
              }
            : session
        )
      );
    },
    []
  );

  /**
   * Updates all messages in a session.
   */
  const updateSessionMessages = useCallback(
    (sessionId: string, messages: ChatMessage[]): void => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? { ...session, messages, updatedAt: new Date() }
            : session
        )
      );
    },
    []
  );

  /**
   * Adds an artifact ID to a session.
   */
  const addArtifactToSession = useCallback(
    (sessionId: string, artifactId: string): void => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                artifactIds: [...session.artifactIds, artifactId],
                updatedAt: new Date(),
              }
            : session
        )
      );
    },
    []
  );

  /**
   * Clears all sessions.
   */
  const clearAllSessions = useCallback((): void => {
    setSessions([]);
    setActiveSessionId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  /**
   * Gets a session by ID.
   */
  const getSession = useCallback(
    (id: string): TaskSession | undefined => {
      return sessions.find((session) => session.id === id);
    },
    [sessions]
  );

  /**
   * Gets the active session.
   */
  const getActiveSession = useCallback((): TaskSession | undefined => {
    if (!activeSessionId) return undefined;
    return sessions.find((session) => session.id === activeSessionId);
  }, [sessions, activeSessionId]);

  /**
   * Sets workspace for a session.
   */
  const setSessionWorkspace = useCallback(
    (sessionId: string, workspacePath: string | null, workspaceContents?: WorkspaceEntry[]): void => {
      setSessions((prev) =>
        prev.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                workspacePath,
                workspaceContents: workspaceContents ?? session.workspaceContents ?? [],
                updatedAt: new Date(),
              }
            : session
        )
      );
    },
    []
  );

  /**
   * Gets workspace for a session.
   */
  const getSessionWorkspace = useCallback(
    (sessionId: string): { path: string | null; contents: WorkspaceEntry[] } => {
      const session = sessions.find((s) => s.id === sessionId);
      return {
        path: session?.workspacePath ?? null,
        contents: session?.workspaceContents ?? [],
      };
    },
    [sessions]
  );

  /**
   * Gets workspace for the active session.
   */
  const getActiveSessionWorkspace = useCallback((): { path: string | null; contents: WorkspaceEntry[] } => {
    if (!activeSessionId) {
      return { path: null, contents: [] };
    }
    return getSessionWorkspace(activeSessionId);
  }, [activeSessionId, getSessionWorkspace]);

  /**
   * Gets attachments for the active session.
   */
  const getActiveSessionAttachments = useCallback((): AttachedFile[] => {
    if (!activeSessionId) {
      return [];
    }
    const session = sessions.find((s) => s.id === activeSessionId);
    return session?.attachments ?? [];
  }, [activeSessionId, sessions]);

  return {
    sessions,
    activeSessionId,
    isLoading,
    createSession,
    updateSession,
    deleteSession,
    setActiveSession,
    addMessageToSession,
    updateSessionMessages,
    addArtifactToSession,
    clearAllSessions,
    getSession,
    getActiveSession,
    setSessionWorkspace,
    getSessionWorkspace,
    getActiveSessionWorkspace,
    getActiveSessionAttachments,
  };
}
