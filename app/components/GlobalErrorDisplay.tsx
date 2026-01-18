/**
 * Global Error Display Component.
 * Shows application-wide errors as toast notifications.
 */

import type { ReactElement } from 'react';
import { useEffect, useCallback } from 'react';
import { useErrorContext } from '@/hooks/useErrors';
import { ErrorMessage } from '@/components/ErrorMessage';
import { cn } from '@/lib/utils';
import type { AgentError } from '@/lib/ipc-types';

/**
 * Maximum number of visible error toasts.
 */
const MAX_VISIBLE_ERRORS = 3;

/**
 * Global error display that shows errors as toast notifications.
 * Positioned in the bottom-right corner of the screen.
 */
export function GlobalErrorDisplay(): ReactElement | null {
  const {
    errors,
    dismissError,
    handleRecoveryAction,
    handleAgentError,
  } = useErrorContext();

  /**
   * Listen for agent errors from IPC.
   */
  useEffect(() => {
    // Check if we're in Electron environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check for electronAgentAPI (type declared in ipc-client.ts)
    const api = window.electronAgentAPI;
    if (!api || !api.onError) {
      return;
    }

    // Subscribe to error events from the agent
    const cleanup = api.onError((error: AgentError) => {
      handleAgentError(error);
    });

    return cleanup;
  }, [handleAgentError]);

  /**
   * Handle recovery action clicks.
   */
  const handleAction = useCallback(
    (errorId: string, action: string) => {
      handleRecoveryAction(errorId, action);
    },
    [handleRecoveryAction]
  );

  // Get visible errors (limit to MAX_VISIBLE_ERRORS)
  const visibleErrors = errors.slice(-MAX_VISIBLE_ERRORS);

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col-reverse gap-2"
      aria-live="polite"
      aria-label="Error notifications"
    >
      {visibleErrors.map((error, index) => (
        <div
          key={error.id}
          className={cn(
            'animate-in slide-in-from-right-5 fade-in duration-300',
            'max-w-md shadow-lg rounded-lg'
          )}
          style={{
            // Stack errors with slight offset
            transform: `translateY(${(visibleErrors.length - 1 - index) * -4}px)`,
            zIndex: visibleErrors.length - index,
          }}
        >
          <ErrorMessage
            error={error}
            onDismiss={() => dismissError(error.id)}
            onAction={(action) => handleAction(error.id, action)}
          />
        </div>
      ))}

      {/* Show count if more errors than visible */}
      {errors.length > MAX_VISIBLE_ERRORS && (
        <div className="self-end text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
          +{errors.length - MAX_VISIBLE_ERRORS} more
        </div>
      )}
    </div>
  );
}

export default GlobalErrorDisplay;
