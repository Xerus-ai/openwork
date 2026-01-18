/**
 * Electron Main Process Error Handler.
 * Provides centralized error handling, logging, and error reporting for the main process.
 */

import { app, dialog, BrowserWindow } from 'electron';
import { AgentChannels } from './ipc/message-types.js';

/**
 * Error codes for categorizing main process errors.
 */
export type MainProcessErrorCode =
  | 'UNCAUGHT_EXCEPTION'
  | 'UNHANDLED_REJECTION'
  | 'IPC_ERROR'
  | 'AGENT_ERROR'
  | 'WINDOW_ERROR'
  | 'FILE_SYSTEM_ERROR'
  | 'CONFIGURATION_ERROR'
  | 'NETWORK_ERROR'
  | 'PERMISSION_ERROR'
  | 'UNKNOWN';

/**
 * Error severity levels.
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * Structured error for main process.
 */
export interface MainProcessError {
  /** Error code for categorization */
  code: MainProcessErrorCode;
  /** Technical error message */
  message: string;
  /** User-friendly message */
  userMessage: string;
  /** Error severity */
  severity: ErrorSeverity;
  /** Whether the app can continue */
  recoverable: boolean;
  /** Original error object */
  originalError?: Error;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Timestamp */
  timestamp: Date;
}

/**
 * Error handler configuration.
 */
interface ErrorHandlerConfig {
  /** Whether to show dialogs for errors */
  showDialogs: boolean;
  /** Minimum severity to show dialog */
  dialogSeverityThreshold: ErrorSeverity;
  /** Whether to log errors to console */
  logToConsole: boolean;
  /** Function to get the main window */
  getMainWindow: () => BrowserWindow | null;
}

/**
 * Default error handler configuration.
 */
const defaultConfig: ErrorHandlerConfig = {
  showDialogs: true,
  dialogSeverityThreshold: 'error',
  logToConsole: true,
  getMainWindow: () => null,
};

/**
 * Current configuration.
 */
let config: ErrorHandlerConfig = { ...defaultConfig };

/**
 * Map error codes to user-friendly messages.
 */
const ERROR_MESSAGES: Record<MainProcessErrorCode, { userMessage: string; severity: ErrorSeverity }> = {
  UNCAUGHT_EXCEPTION: {
    userMessage: 'An unexpected error occurred. The application may need to restart.',
    severity: 'critical',
  },
  UNHANDLED_REJECTION: {
    userMessage: 'An operation failed unexpectedly. Please try again.',
    severity: 'error',
  },
  IPC_ERROR: {
    userMessage: 'Communication error. Please try the operation again.',
    severity: 'error',
  },
  AGENT_ERROR: {
    userMessage: 'The AI assistant encountered an error. Please try again.',
    severity: 'error',
  },
  WINDOW_ERROR: {
    userMessage: 'A window error occurred. The application may need to restart.',
    severity: 'error',
  },
  FILE_SYSTEM_ERROR: {
    userMessage: 'Unable to access files. Please check permissions and try again.',
    severity: 'error',
  },
  CONFIGURATION_ERROR: {
    userMessage: 'Configuration error. Please check your settings.',
    severity: 'warning',
  },
  NETWORK_ERROR: {
    userMessage: 'Network error. Please check your internet connection.',
    severity: 'error',
  },
  PERMISSION_ERROR: {
    userMessage: 'Permission denied. Please check folder permissions.',
    severity: 'error',
  },
  UNKNOWN: {
    userMessage: 'An unexpected error occurred. Please try again.',
    severity: 'error',
  },
};

/**
 * Initialize the error handler with configuration.
 */
export function initializeErrorHandler(
  getMainWindow: () => BrowserWindow | null,
  options?: Partial<ErrorHandlerConfig>
): void {
  config = {
    ...defaultConfig,
    ...options,
    getMainWindow,
  };

  // Set up global error handlers
  setupGlobalHandlers();

  console.log('[ErrorHandler] Initialized');
}

/**
 * Set up global error handlers for uncaught exceptions and rejections.
 */
function setupGlobalHandlers(): void {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    handleMainProcessError(
      createMainProcessError(
        'UNCAUGHT_EXCEPTION',
        error.message,
        false,
        error
      )
    );
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    const originalError = reason instanceof Error ? reason : undefined;

    handleMainProcessError(
      createMainProcessError(
        'UNHANDLED_REJECTION',
        message,
        true,
        originalError
      )
    );
  });

  console.log('[ErrorHandler] Global handlers registered');
}

/**
 * Create a structured main process error.
 */
export function createMainProcessError(
  code: MainProcessErrorCode,
  message: string,
  recoverable: boolean,
  originalError?: Error,
  context?: Record<string, unknown>
): MainProcessError {
  const errorInfo = ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN;

  return {
    code,
    message,
    userMessage: errorInfo.userMessage,
    severity: errorInfo.severity,
    recoverable,
    originalError,
    context,
    timestamp: new Date(),
  };
}

/**
 * Handle a main process error.
 */
export function handleMainProcessError(error: MainProcessError): void {
  // Log to console
  if (config.logToConsole) {
    logError(error);
  }

  // Send error to renderer if possible
  sendErrorToRenderer(error);

  // Show dialog for critical errors
  if (shouldShowDialog(error)) {
    showErrorDialog(error);
  }
}

/**
 * Get the appropriate console method for a severity level.
 */
function getLogMethod(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
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
 * Log error to console with structured formatting.
 */
function logError(error: MainProcessError): void {
  const logMethod = getLogMethod(error.severity);
  const prefix = `[Error:${error.code}]`;

  console[logMethod](
    prefix,
    error.message,
    error.context ? { context: error.context } : ''
  );

  if (error.originalError?.stack) {
    console[logMethod](prefix, 'Stack:', error.originalError.stack);
  }
}

/**
 * Check if a dialog should be shown for this error.
 */
function shouldShowDialog(error: MainProcessError): boolean {
  if (!config.showDialogs) {
    return false;
  }

  const severityOrder: ErrorSeverity[] = ['info', 'warning', 'error', 'critical'];
  const errorLevel = severityOrder.indexOf(error.severity);
  const thresholdLevel = severityOrder.indexOf(config.dialogSeverityThreshold);

  return errorLevel >= thresholdLevel;
}

/**
 * Show error dialog to user.
 */
function showErrorDialog(error: MainProcessError): void {
  const mainWindow = config.getMainWindow();

  const dialogOptions: Electron.MessageBoxOptions = {
    type: error.severity === 'critical' ? 'error' : 'warning',
    title: getDialogTitle(error.severity),
    message: error.userMessage,
    detail: error.recoverable
      ? 'You can try the operation again.'
      : 'The application may need to restart.',
    buttons: getDialogButtons(error),
    defaultId: 0,
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    dialog.showMessageBox(mainWindow, dialogOptions).then((result) => {
      handleDialogResponse(error, result.response);
    });
  } else {
    dialog.showMessageBox(dialogOptions).then((result) => {
      handleDialogResponse(error, result.response);
    });
  }
}

/**
 * Get dialog title based on severity.
 */
function getDialogTitle(severity: ErrorSeverity): string {
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
      return 'Error';
  }
}

/**
 * Get dialog buttons based on error type.
 */
function getDialogButtons(error: MainProcessError): string[] {
  if (!error.recoverable) {
    return ['Restart App', 'Close'];
  }

  return ['OK', 'More Info'];
}

/**
 * Handle dialog button response.
 */
function handleDialogResponse(error: MainProcessError, buttonIndex: number): void {
  if (!error.recoverable && buttonIndex === 0) {
    // Restart the app
    app.relaunch();
    app.exit(0);
  }
}

/**
 * Send error to renderer process.
 */
function sendErrorToRenderer(error: MainProcessError): void {
  const mainWindow = config.getMainWindow();

  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.webContents.send(AgentChannels.AGENT_ERROR, {
        id: generateErrorId(),
        timestamp: Date.now(),
        code: mapToAgentErrorCode(error.code),
        message: error.message,
        details: error.context,
        recoverable: error.recoverable,
      });
    } catch (sendError) {
      // Failed to send to renderer, just log
      console.error('[ErrorHandler] Failed to send error to renderer:', sendError);
    }
  }
}

/**
 * Map main process error code to agent error code.
 */
function mapToAgentErrorCode(code: MainProcessErrorCode): string {
  switch (code) {
    case 'NETWORK_ERROR':
      return 'NETWORK_ERROR';
    case 'FILE_SYSTEM_ERROR':
      return 'WORKSPACE_ERROR';
    case 'PERMISSION_ERROR':
      return 'WORKSPACE_ERROR';
    case 'AGENT_ERROR':
      return 'API_ERROR';
    case 'CONFIGURATION_ERROR':
      return 'INITIALIZATION_FAILED';
    default:
      return 'UNKNOWN';
  }
}

/**
 * Generate a unique error ID.
 */
function generateErrorId(): string {
  return `main_err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create error for IPC handler failures.
 */
export function createIpcError(
  message: string,
  context?: Record<string, unknown>
): MainProcessError {
  return createMainProcessError('IPC_ERROR', message, true, undefined, context);
}

/**
 * Create error for file system operations.
 */
export function createFileSystemError(
  message: string,
  originalError?: Error,
  context?: Record<string, unknown>
): MainProcessError {
  return createMainProcessError(
    'FILE_SYSTEM_ERROR',
    message,
    true,
    originalError,
    context
  );
}

/**
 * Create error for agent operations.
 */
export function createAgentOperationError(
  message: string,
  originalError?: Error,
  context?: Record<string, unknown>
): MainProcessError {
  return createMainProcessError(
    'AGENT_ERROR',
    message,
    true,
    originalError,
    context
  );
}

/**
 * Create error for permission issues.
 */
export function createPermissionError(
  message: string,
  context?: Record<string, unknown>
): MainProcessError {
  return createMainProcessError('PERMISSION_ERROR', message, true, undefined, context);
}

/**
 * Wrap an async IPC handler with error handling.
 */
export function wrapIpcHandler<T, R>(
  handler: (event: Electron.IpcMainInvokeEvent, arg: T) => Promise<R>,
  handlerName: string
): (event: Electron.IpcMainInvokeEvent, arg: T) => Promise<R> {
  return async (event: Electron.IpcMainInvokeEvent, arg: T): Promise<R> => {
    try {
      return await handler(event, arg);
    } catch (error) {
      const mainError = createIpcError(
        error instanceof Error ? error.message : String(error),
        { handler: handlerName }
      );

      handleMainProcessError(mainError);

      // Re-throw so the IPC call fails properly
      throw error;
    }
  };
}

/**
 * Clean up error handler resources.
 */
export function cleanupErrorHandler(): void {
  // Remove global handlers - note: this is primarily for completeness
  // In practice, you typically don't remove these handlers
  console.log('[ErrorHandler] Cleanup complete');
}
