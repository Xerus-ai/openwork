/**
 * Context for managing pending task messages between components.
 * Used to pass the initial task from WelcomeScreen to ChatPane.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import type { AttachedFile } from '@/hooks/useFileUpload';

/**
 * Pending task message structure.
 */
export interface PendingTask {
  message: string;
  timestamp: number;
  attachments?: AttachedFile[];
}

/**
 * Context value shape.
 */
interface PendingTaskContextValue {
  /** The pending task to be sent */
  pendingTask: PendingTask | null;
  /** Set a pending task to be sent by the chat */
  setPendingTask: (message: string, attachments?: AttachedFile[]) => void;
  /** Clear the pending task after it's been sent */
  clearPendingTask: () => void;
}

/**
 * Context instance.
 */
const PendingTaskContext = createContext<PendingTaskContextValue | null>(null);

/**
 * Provider props.
 */
interface PendingTaskProviderProps {
  children: ReactNode;
}

/**
 * Provider component for pending task context.
 *
 * @example
 * <PendingTaskProvider>
 *   <App />
 * </PendingTaskProvider>
 */
export function PendingTaskProvider({ children }: PendingTaskProviderProps) {
  const [pendingTask, setPendingTaskState] = useState<PendingTask | null>(null);

  const setPendingTask = useCallback((message: string, attachments?: AttachedFile[]) => {
    setPendingTaskState({
      message,
      timestamp: Date.now(),
      attachments,
    });
  }, []);

  const clearPendingTask = useCallback(() => {
    setPendingTaskState(null);
  }, []);

  return (
    <PendingTaskContext.Provider
      value={{
        pendingTask,
        setPendingTask,
        clearPendingTask,
      }}
    >
      {children}
    </PendingTaskContext.Provider>
  );
}

/**
 * Hook to access pending task context.
 *
 * @returns Pending task context value
 * @throws Error if used outside of PendingTaskProvider
 *
 * @example
 * const { pendingTask, setPendingTask, clearPendingTask } = usePendingTask();
 *
 * // Set a pending task with optional attachments (from WelcomeScreen)
 * setPendingTask("Create a document about React", attachedFiles);
 *
 * // Clear after sending (in ChatPane)
 * clearPendingTask();
 */
export function usePendingTask(): PendingTaskContextValue {
  const context = useContext(PendingTaskContext);
  if (!context) {
    throw new Error('usePendingTask must be used within a PendingTaskProvider');
  }
  return context;
}
