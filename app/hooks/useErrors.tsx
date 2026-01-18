/**
 * Hook for managing application-wide error state.
 * Provides error display, dismissal, and action handling.
 */

import { useState, useCallback, useEffect, createContext, useContext, type ReactNode } from 'react';
import {
  type AppError,
  createAgentError,
  createErrorFromUnknown,
  logError,
  shouldShowError,
} from '@/lib/error-handler';
import type { AgentError, AgentErrorCode } from '@/lib/ipc-types';

/**
 * Maximum number of errors to keep in the queue.
 */
const MAX_ERROR_QUEUE = 5;

/**
 * Auto-dismiss delay for non-critical errors (in milliseconds).
 */
const AUTO_DISMISS_DELAY = 8000;

/**
 * Error state and actions.
 */
export interface UseErrorsState {
  /** List of current errors */
  errors: AppError[];
  /** Most recent error (for display) */
  currentError: AppError | null;
}

/**
 * Error action handlers.
 */
export interface UseErrorsActions {
  /** Add an error to the queue */
  addError: (error: AppError) => void;
  /** Handle an agent error */
  handleAgentError: (error: AgentError) => void;
  /** Handle an unknown error */
  handleUnknownError: (error: unknown, category?: string) => void;
  /** Dismiss a specific error */
  dismissError: (errorId: string) => void;
  /** Dismiss all errors */
  dismissAllErrors: () => void;
  /** Handle a recovery action */
  handleRecoveryAction: (errorId: string, action: string) => void;
}

/**
 * Hook for managing application error state.
 *
 * @example
 * const { currentError, dismissError, handleAgentError } = useErrors();
 *
 * // In your component:
 * {currentError && (
 *   <ErrorMessage
 *     error={currentError}
 *     onDismiss={() => dismissError(currentError.id)}
 *   />
 * )}
 */
export function useErrors(): UseErrorsState & UseErrorsActions {
  const [errors, setErrors] = useState<AppError[]>([]);

  /**
   * Add an error to the queue.
   */
  const addError = useCallback((error: AppError): void => {
    // Log the error
    logError(error);

    // Only add if it should be shown
    if (!shouldShowError(error)) {
      return;
    }

    setErrors((prev) => {
      // Remove oldest if at max capacity
      const updated = prev.length >= MAX_ERROR_QUEUE
        ? [...prev.slice(1), error]
        : [...prev, error];
      return updated;
    });
  }, []);

  /**
   * Handle an agent error event.
   */
  const handleAgentError = useCallback((agentError: AgentError): void => {
    const appError = createAgentError(
      agentError.code as AgentErrorCode,
      agentError.message,
      agentError.recoverable,
      agentError.details ? { details: agentError.details } : undefined
    );

    addError(appError);
  }, [addError]);

  /**
   * Handle an unknown error.
   */
  const handleUnknownError = useCallback((error: unknown, category?: string): void => {
    const appError = createErrorFromUnknown(
      error,
      (category as AppError['category']) || 'unknown'
    );

    addError(appError);
  }, [addError]);

  /**
   * Dismiss a specific error.
   */
  const dismissError = useCallback((errorId: string): void => {
    setErrors((prev) => prev.filter((e) => e.id !== errorId));
  }, []);

  /**
   * Dismiss all errors.
   */
  const dismissAllErrors = useCallback((): void => {
    setErrors([]);
  }, []);

  /**
   * Handle a recovery action for an error.
   */
  const handleRecoveryAction = useCallback(
    (errorId: string, action: string): void => {
      // For now, dismiss the error after action
      // Specific actions can be handled by parent components
      if (action === 'dismiss') {
        dismissError(errorId);
      }

      // Other actions will be handled by event listeners
      window.dispatchEvent(
        new CustomEvent('error-recovery-action', {
          detail: { errorId, action },
        })
      );
    },
    [dismissError]
  );

  /**
   * Auto-dismiss non-critical errors after delay.
   */
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    errors.forEach((error) => {
      if (error.severity !== 'critical' && error.severity !== 'error') {
        const timer = setTimeout(() => {
          dismissError(error.id);
        }, AUTO_DISMISS_DELAY);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [errors, dismissError]);

  // Get the most recent error for display
  const currentError: AppError | null = errors.length > 0 ? (errors[errors.length - 1] ?? null) : null;

  return {
    errors,
    currentError,
    addError,
    handleAgentError,
    handleUnknownError,
    dismissError,
    dismissAllErrors,
    handleRecoveryAction,
  };
}

/**
 * Error context type.
 */
type ErrorContextType = UseErrorsState & UseErrorsActions;

/**
 * Error context.
 */
const ErrorContext = createContext<ErrorContextType | null>(null);

/**
 * Props for ErrorProvider component.
 */
interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Provider component for error state.
 *
 * @example
 * <ErrorProvider>
 *   <App />
 * </ErrorProvider>
 */
export function ErrorProvider({ children }: ErrorProviderProps): ReactNode {
  const errorState = useErrors();

  return (
    <ErrorContext.Provider value={errorState}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to access error context.
 *
 * @example
 * const { handleAgentError, currentError } = useErrorContext();
 */
export function useErrorContext(): ErrorContextType {
  const context = useContext(ErrorContext);

  if (!context) {
    throw new Error('useErrorContext must be used within an ErrorProvider');
  }

  return context;
}

export default useErrors;
