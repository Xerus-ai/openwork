/**
 * Frontend Error Handler.
 * Provides centralized error handling, logging, and user-friendly error messages.
 */

import type { AgentErrorCode } from './ipc-types';

/**
 * Error severity levels for display and handling decisions.
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Error category for grouping and filtering.
 */
export type ErrorCategory =
  | 'network'
  | 'agent'
  | 'workspace'
  | 'file'
  | 'permission'
  | 'validation'
  | 'unknown';

/**
 * Structured application error with user-friendly messaging.
 */
export interface AppError {
  /** Unique error ID for tracking */
  id: string;
  /** Error code for programmatic handling */
  code: string;
  /** Technical error message for developers */
  message: string;
  /** User-friendly message for display */
  userMessage: string;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Error category for grouping */
  category: ErrorCategory;
  /** Whether the error is recoverable */
  recoverable: boolean;
  /** Suggested recovery actions */
  recoveryActions?: RecoveryAction[];
  /** Original error for debugging */
  originalError?: unknown;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Action the user can take to recover from an error.
 */
export interface RecoveryAction {
  /** Button label */
  label: string;
  /** Action identifier */
  action: string;
  /** Whether this is the primary action */
  primary?: boolean;
}

/**
 * Map of agent error codes to user-friendly messages.
 */
const AGENT_ERROR_MESSAGES: Record<AgentErrorCode, { userMessage: string; severity: ErrorSeverity; category: ErrorCategory }> = {
  INITIALIZATION_FAILED: {
    userMessage: 'Failed to start the assistant. Please try again.',
    severity: 'error',
    category: 'agent',
  },
  API_KEY_MISSING: {
    userMessage: 'API key is not configured. Please set your ANTHROPIC_API_KEY environment variable.',
    severity: 'critical',
    category: 'agent',
  },
  API_ERROR: {
    userMessage: 'The AI service returned an error. Please try again in a moment.',
    severity: 'error',
    category: 'network',
  },
  NETWORK_ERROR: {
    userMessage: 'Unable to connect to the AI service. Please check your internet connection.',
    severity: 'error',
    category: 'network',
  },
  TIMEOUT: {
    userMessage: 'The request took too long. Please try again.',
    severity: 'warning',
    category: 'network',
  },
  TOOL_EXECUTION_FAILED: {
    userMessage: 'An operation failed to complete. The assistant will try to continue.',
    severity: 'warning',
    category: 'agent',
  },
  WORKSPACE_ERROR: {
    userMessage: 'There was a problem with the workspace folder. Please select a different folder.',
    severity: 'error',
    category: 'workspace',
  },
  INVALID_MESSAGE: {
    userMessage: 'The message could not be processed. Please try rephrasing.',
    severity: 'warning',
    category: 'validation',
  },
  AGENT_NOT_INITIALIZED: {
    userMessage: 'The assistant is not ready. Please select a workspace folder first.',
    severity: 'warning',
    category: 'agent',
  },
  AGENT_BUSY: {
    userMessage: 'The assistant is currently processing. Please wait for it to finish.',
    severity: 'info',
    category: 'agent',
  },
  UNKNOWN: {
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: 'error',
    category: 'unknown',
  },
};

/**
 * Generate a unique error ID.
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create an AppError from an agent error code.
 */
export function createAgentError(
  code: AgentErrorCode,
  message: string,
  recoverable: boolean,
  context?: Record<string, unknown>
): AppError {
  const errorInfo = AGENT_ERROR_MESSAGES[code] || AGENT_ERROR_MESSAGES.UNKNOWN;

  return {
    id: generateErrorId(),
    code,
    message,
    userMessage: errorInfo.userMessage,
    severity: errorInfo.severity,
    category: errorInfo.category,
    recoverable,
    recoveryActions: getRecoveryActions(code, recoverable),
    timestamp: new Date(),
    context,
  };
}

/**
 * Create an AppError from a JavaScript Error.
 */
export function createErrorFromException(
  error: Error,
  category: ErrorCategory = 'unknown',
  context?: Record<string, unknown>
): AppError {
  const severity = determineSeverity(error);

  return {
    id: generateErrorId(),
    code: error.name || 'Error',
    message: error.message,
    userMessage: getUserFriendlyMessage(error),
    severity,
    category,
    recoverable: severity !== 'critical',
    recoveryActions: getGenericRecoveryActions(severity),
    originalError: error,
    timestamp: new Date(),
    context,
  };
}

/**
 * Create an AppError from an unknown value.
 */
export function createErrorFromUnknown(
  value: unknown,
  category: ErrorCategory = 'unknown',
  context?: Record<string, unknown>
): AppError {
  if (value instanceof Error) {
    return createErrorFromException(value, category, context);
  }

  const message = typeof value === 'string' ? value : 'An unknown error occurred';

  return {
    id: generateErrorId(),
    code: 'UNKNOWN_ERROR',
    message,
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: 'error',
    category,
    recoverable: true,
    recoveryActions: getGenericRecoveryActions('error'),
    originalError: value,
    timestamp: new Date(),
    context,
  };
}

/**
 * Determine error severity based on error type and message.
 */
function determineSeverity(error: Error): ErrorSeverity {
  const message = error.message.toLowerCase();

  // Critical errors that require immediate attention
  if (
    message.includes('api key') ||
    message.includes('authentication') ||
    message.includes('permission denied')
  ) {
    return 'critical';
  }

  // Errors that prevent operation but might be temporary
  if (
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('timeout')
  ) {
    return 'error';
  }

  // Warnings for non-critical issues
  if (message.includes('retry') || message.includes('busy')) {
    return 'warning';
  }

  return 'error';
}

/**
 * Get a user-friendly message for a JavaScript Error.
 */
function getUserFriendlyMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return 'The operation took too long. Please try again.';
  }

  // Permission errors
  if (message.includes('permission') || message.includes('access denied')) {
    return 'You do not have permission to perform this action.';
  }

  // File errors
  if (message.includes('file not found') || message.includes('enoent')) {
    return 'The requested file could not be found.';
  }

  // Generic fallback
  return 'An error occurred. Please try again.';
}

/**
 * Get recovery actions for an agent error code.
 */
function getRecoveryActions(code: AgentErrorCode, recoverable: boolean): RecoveryAction[] {
  if (!recoverable) {
    return [{ label: 'Dismiss', action: 'dismiss' }];
  }

  switch (code) {
    case 'API_KEY_MISSING':
      return [
        { label: 'Learn More', action: 'open-docs', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    case 'NETWORK_ERROR':
    case 'TIMEOUT':
      return [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    case 'WORKSPACE_ERROR':
      return [
        { label: 'Select Folder', action: 'select-workspace', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    case 'AGENT_NOT_INITIALIZED':
      return [
        { label: 'Initialize', action: 'initialize-agent', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    case 'AGENT_BUSY':
      return [
        { label: 'Stop', action: 'stop-agent', primary: true },
        { label: 'Wait', action: 'dismiss' },
      ];

    default:
      return [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];
  }
}

/**
 * Get generic recovery actions based on severity.
 */
function getGenericRecoveryActions(severity: ErrorSeverity): RecoveryAction[] {
  switch (severity) {
    case 'info':
      return [{ label: 'OK', action: 'dismiss', primary: true }];

    case 'warning':
      return [
        { label: 'Continue', action: 'dismiss', primary: true },
        { label: 'Learn More', action: 'open-docs' },
      ];

    case 'error':
      return [
        { label: 'Retry', action: 'retry', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    case 'critical':
      return [
        { label: 'Get Help', action: 'open-docs', primary: true },
        { label: 'Dismiss', action: 'dismiss' },
      ];

    default:
      return [{ label: 'Dismiss', action: 'dismiss', primary: true }];
  }
}

/**
 * Error handler interface for components to implement.
 */
export interface ErrorHandler {
  handleError(error: AppError): void;
  clearError(errorId: string): void;
  clearAllErrors(): void;
}

/**
 * Get the appropriate console method for a severity level.
 */
function getConsoleMethod(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
  switch (severity) {
    case 'info':
      return 'log';
    case 'warning':
      return 'warn';
    case 'error':
    case 'critical':
      return 'error';
    default:
      return 'log';
  }
}

/**
 * Log an error to the console with structured formatting.
 */
export function logError(error: AppError): void {
  const logMethod = getConsoleMethod(error.severity);
  const prefix = `[Error:${error.category}]`;

  console[logMethod](
    prefix,
    error.code,
    '-',
    error.message,
    error.context ? { context: error.context } : ''
  );

  if (error.originalError) {
    console[logMethod](prefix, 'Original error:', error.originalError);
  }
}

/**
 * Check if an error should be shown to the user.
 * Some errors are for logging only.
 */
export function shouldShowError(error: AppError): boolean {
  // Always show critical errors
  if (error.severity === 'critical') {
    return true;
  }

  // Show errors and warnings
  if (error.severity === 'error' || error.severity === 'warning') {
    return true;
  }

  // Show info only for user-actionable items
  if (error.severity === 'info' && error.recoveryActions && error.recoveryActions.length > 1) {
    return true;
  }

  return false;
}

/**
 * Get CSS classes for error severity styling.
 */
export function getErrorSeverityClasses(severity: ErrorSeverity): string {
  switch (severity) {
    case 'info':
      return 'border-blue-500 bg-blue-50 text-blue-800';
    case 'warning':
      return 'border-yellow-500 bg-yellow-50 text-yellow-800';
    case 'error':
      return 'border-red-500 bg-red-50 text-red-800';
    case 'critical':
      return 'border-red-700 bg-red-100 text-red-900';
    default:
      return 'border-gray-500 bg-gray-50 text-gray-800';
  }
}

/**
 * Get icon name for error severity.
 */
export function getErrorSeverityIcon(severity: ErrorSeverity): string {
  switch (severity) {
    case 'info':
      return 'info';
    case 'warning':
      return 'alert-triangle';
    case 'error':
      return 'x-circle';
    case 'critical':
      return 'alert-octagon';
    default:
      return 'alert-circle';
  }
}
