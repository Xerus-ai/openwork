/**
 * Error Message Display Component.
 * Displays errors with appropriate styling and recovery actions.
 */

import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type AppError,
  type ErrorSeverity,
  type RecoveryAction,
  getErrorSeverityClasses,
} from '@/lib/error-handler';

/**
 * Props for ErrorMessage component.
 */
interface ErrorMessageProps {
  /** The error to display */
  error: AppError;
  /** Callback when a recovery action is clicked */
  onAction?: (action: string) => void;
  /** Callback to dismiss the error */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show in compact mode */
  compact?: boolean;
}

/**
 * Displays an error message with severity styling and recovery actions.
 *
 * @example
 * <ErrorMessage
 *   error={appError}
 *   onAction={(action) => handleAction(action)}
 *   onDismiss={() => clearError()}
 * />
 */
export function ErrorMessage({
  error,
  onAction,
  onDismiss,
  className,
  compact = false,
}: ErrorMessageProps): ReactElement {
  const severityClasses = getErrorSeverityClasses(error.severity);

  const handleAction = (action: string): void => {
    if (action === 'dismiss') {
      onDismiss?.();
    } else {
      onAction?.(action);
    }
  };

  if (compact) {
    return (
      <CompactErrorMessage
        error={error}
        onAction={handleAction}
        onDismiss={onDismiss}
        className={className}
      />
    );
  }

  return (
    <div
      role="alert"
      className={cn(
        'rounded-lg border p-4',
        severityClasses,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ErrorIcon severity={error.severity} />

        <div className="flex-1 min-w-0">
          <div className="font-medium">
            {getSeverityLabel(error.severity)}
          </div>
          <p className="mt-1 text-sm opacity-90">
            {error.userMessage}
          </p>

          {error.recoveryActions && error.recoveryActions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {error.recoveryActions.map((action) => (
                <RecoveryActionButton
                  key={action.action}
                  action={action}
                  severity={error.severity}
                  onClick={() => handleAction(action.action)}
                />
              ))}
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-2"
            aria-label="Dismiss error"
          >
            <CloseIcon />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Props for CompactErrorMessage component.
 */
interface CompactErrorMessageProps {
  error: AppError;
  onAction?: (action: string) => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Compact version of error message for inline display.
 */
function CompactErrorMessage({
  error,
  onAction,
  onDismiss,
  className,
}: CompactErrorMessageProps): ReactElement {
  const severityClasses = getErrorSeverityClasses(error.severity);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-center gap-2 rounded border px-3 py-2 text-sm',
        severityClasses,
        className
      )}
    >
      <ErrorIcon severity={error.severity} size="sm" />
      <span className="flex-1 truncate">{error.userMessage}</span>

      {error.recoveryActions && error.recoveryActions.find((a) => a.primary) && (
        <button
          type="button"
          onClick={() => {
            const primary = error.recoveryActions?.find((a) => a.primary);
            if (primary) {
              onAction?.(primary.action);
            }
          }}
          className="font-medium underline hover:no-underline"
        >
          {error.recoveryActions.find((a) => a.primary)?.label}
        </button>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="opacity-70 hover:opacity-100"
          aria-label="Dismiss"
        >
          <CloseIcon size="sm" />
        </button>
      )}
    </div>
  );
}

/**
 * Props for ErrorIcon component.
 */
interface ErrorIconProps {
  severity: ErrorSeverity;
  size?: 'sm' | 'md';
}

/**
 * Icon for error severity level.
 */
function ErrorIcon({ severity, size = 'md' }: ErrorIconProps): ReactElement {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  switch (severity) {
    case 'info':
      return (
        <svg
          className={cn(sizeClasses, 'text-blue-600')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

    case 'warning':
      return (
        <svg
          className={cn(sizeClasses, 'text-yellow-600')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      );

    case 'error':
      return (
        <svg
          className={cn(sizeClasses, 'text-red-600')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );

    case 'critical':
      return (
        <svg
          className={cn(sizeClasses, 'text-red-700')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M5.072 19A9 9 0 0118.928 5M18.928 5L12 12M5.072 19L12 12"
          />
        </svg>
      );

    default:
      return (
        <svg
          className={cn(sizeClasses, 'text-gray-600')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
  }
}

/**
 * Props for CloseIcon component.
 */
interface CloseIconProps {
  size?: 'sm' | 'md';
}

/**
 * Close/dismiss icon.
 */
function CloseIcon({ size = 'md' }: CloseIconProps): ReactElement {
  const sizeClasses = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <svg
      className={sizeClasses}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Props for RecoveryActionButton component.
 */
interface RecoveryActionButtonProps {
  action: RecoveryAction;
  severity: ErrorSeverity;
  onClick: () => void;
}

/**
 * Button for error recovery action.
 */
function RecoveryActionButton({
  action,
  severity,
  onClick,
}: RecoveryActionButtonProps): ReactElement {
  const variant = action.primary ? 'default' : 'outline';

  // Get colors based on severity
  const colorClasses = getButtonColorClasses(severity, action.primary);

  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      className={colorClasses}
    >
      {action.label}
    </Button>
  );
}

/**
 * Get button color classes based on severity.
 */
function getButtonColorClasses(severity: ErrorSeverity, isPrimary?: boolean): string {
  if (!isPrimary) {
    return '';
  }

  switch (severity) {
    case 'info':
      return 'bg-blue-600 hover:bg-blue-700 text-white';
    case 'warning':
      return 'bg-yellow-600 hover:bg-yellow-700 text-white';
    case 'error':
    case 'critical':
      return 'bg-red-600 hover:bg-red-700 text-white';
    default:
      return '';
  }
}

/**
 * Get label text for severity level.
 */
function getSeverityLabel(severity: ErrorSeverity): string {
  switch (severity) {
    case 'info':
      return 'Information';
    case 'warning':
      return 'Warning';
    case 'error':
      return 'Error';
    case 'critical':
      return 'Critical Error';
    default:
      return 'Notice';
  }
}

/**
 * Props for ErrorToast component.
 */
interface ErrorToastProps {
  error: AppError;
  onDismiss: () => void;
  onAction?: (action: string) => void;
}

/**
 * Toast-style error notification for transient errors.
 */
export function ErrorToast({
  error,
  onDismiss,
  onAction,
}: ErrorToastProps): ReactElement {
  return (
    <div
      role="alert"
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-md rounded-lg border shadow-lg',
        getErrorSeverityClasses(error.severity)
      )}
    >
      <ErrorMessage
        error={error}
        onDismiss={onDismiss}
        onAction={onAction}
      />
    </div>
  );
}

export default ErrorMessage;
