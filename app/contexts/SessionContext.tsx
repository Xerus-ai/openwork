/**
 * SessionContext provides shared session state across all components.
 * Tracks MCP connectors and working files during task execution.
 */

import { createContext, useContext, useCallback, useState, type ReactNode, type ReactElement } from 'react';

/**
 * MCP connector status values.
 */
export type McpConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * MCP connector information.
 */
export interface McpConnector {
  id: string;
  name: string;
  status: McpConnectorStatus;
  error?: string;
}

/**
 * Working file being accessed during task execution.
 */
export interface WorkingFile {
  id: string;
  name: string;
  path: string;
  operation: 'read' | 'write' | 'edit';
  timestamp: number;
}

/**
 * Session context state.
 */
export interface SessionContextState {
  mcpConnectors: McpConnector[];
  workingFiles: WorkingFile[];
}

/**
 * Session context actions.
 */
export interface SessionContextActions {
  addConnector: (connector: Omit<McpConnector, 'id'>) => string;
  updateConnector: (id: string, updates: Partial<Omit<McpConnector, 'id'>>) => void;
  removeConnector: (id: string) => void;
  clearConnectors: () => void;
  addWorkingFile: (file: Omit<WorkingFile, 'id' | 'timestamp'>) => string;
  removeWorkingFile: (id: string) => void;
  clearWorkingFiles: () => void;
}

/**
 * Combined session context type.
 */
export type SessionContextType = SessionContextState & SessionContextActions;

/**
 * Default context value (throws if used outside provider).
 */
const SessionContext = createContext<SessionContextType | null>(null);

/**
 * Generates a unique ID.
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Props for SessionProvider.
 */
interface SessionProviderProps {
  children: ReactNode;
}

/**
 * SessionProvider component that manages session state.
 * Wrap your app with this provider to share session state across all components.
 */
export function SessionProvider({ children }: SessionProviderProps): ReactElement {
  const [mcpConnectors, setMcpConnectors] = useState<McpConnector[]>([]);
  const [workingFiles, setWorkingFiles] = useState<WorkingFile[]>([]);

  /**
   * Adds a new MCP connector.
   */
  const addConnector = useCallback((connector: Omit<McpConnector, 'id'>): string => {
    const id = generateId('mcp');
    setMcpConnectors((prev) => [...prev, { ...connector, id }]);
    return id;
  }, []);

  /**
   * Updates an existing MCP connector.
   */
  const updateConnector = useCallback((id: string, updates: Partial<Omit<McpConnector, 'id'>>): void => {
    setMcpConnectors((prev) =>
      prev.map((connector) =>
        connector.id === id ? { ...connector, ...updates } : connector
      )
    );
  }, []);

  /**
   * Removes an MCP connector.
   */
  const removeConnector = useCallback((id: string): void => {
    setMcpConnectors((prev) => prev.filter((connector) => connector.id !== id));
  }, []);

  /**
   * Clears all MCP connectors.
   */
  const clearConnectors = useCallback((): void => {
    setMcpConnectors([]);
  }, []);

  /**
   * Adds a working file.
   */
  const addWorkingFile = useCallback((file: Omit<WorkingFile, 'id' | 'timestamp'>): string => {
    const id = generateId('file');
    const timestamp = Date.now();

    setWorkingFiles((prev) => {
      // Check if file already exists by path, update it instead
      const existingIndex = prev.findIndex((f) => f.path === file.path);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...file, id: prev[existingIndex].id, timestamp };
        return updated;
      }
      // Keep only last 10 working files
      const newFiles = [...prev, { ...file, id, timestamp }];
      if (newFiles.length > 10) {
        return newFiles.slice(-10);
      }
      return newFiles;
    });

    return id;
  }, []);

  /**
   * Removes a working file.
   */
  const removeWorkingFile = useCallback((id: string): void => {
    setWorkingFiles((prev) => prev.filter((file) => file.id !== id));
  }, []);

  /**
   * Clears all working files.
   */
  const clearWorkingFiles = useCallback((): void => {
    setWorkingFiles([]);
  }, []);

  const value: SessionContextType = {
    // State
    mcpConnectors,
    workingFiles,
    // Actions
    addConnector,
    updateConnector,
    removeConnector,
    clearConnectors,
    addWorkingFile,
    removeWorkingFile,
    clearWorkingFiles,
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session context.
 * Must be used within a SessionProvider.
 */
export function useSessionContext(): SessionContextType {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSessionContext must be used within a SessionProvider');
  }

  return context;
}
