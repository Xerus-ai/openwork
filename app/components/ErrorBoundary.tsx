/**
 * React Error Boundary Component.
 * Catches JavaScript errors in child components and displays a fallback UI.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import {
  createErrorFromException,
  logError,
  type AppError,
} from '@/lib/error-handler';

/**
 * Props for ErrorBoundary component.
 */
interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Custom fallback UI to render on error */
  fallback?: ReactNode | ((error: AppError, resetError: () => void) => ReactNode);
  /** Callback when an error is caught */
  onError?: (error: AppError) => void;
  /** Name of the component or section for error context */
  componentName?: string;
}

/**
 * State for ErrorBoundary component.
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * React Error Boundary that catches errors in child components.
 *
 * Provides a fallback UI when an error occurs and options to recover.
 * Use this to wrap sections of the UI that might fail independently.
 *
 * @example
 * <ErrorBoundary componentName="ChatPane">
 *   <ChatPane />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const appError = createErrorFromException(error, 'unknown', {
      source: 'ErrorBoundary',
    });

    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { componentName, onError } = this.props;

    const appError = createErrorFromException(error, 'unknown', {
      source: 'ErrorBoundary',
      componentName,
      componentStack: errorInfo.componentStack,
    });

    // Log the error
    logError(appError);

    // Notify parent if callback provided
    if (onError) {
      onError(appError);
    }
  }

  /**
   * Reset the error state to allow retry.
   */
  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, componentName } = this.props;

    if (hasError && error) {
      // Custom fallback renderer
      if (typeof fallback === 'function') {
        return fallback(error, this.resetError);
      }

      // Custom fallback element
      if (fallback) {
        return fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={error}
          componentName={componentName}
          onRetry={this.resetError}
        />
      );
    }

    return children;
  }
}

/**
 * Props for DefaultErrorFallback component.
 */
interface DefaultErrorFallbackProps {
  error: AppError;
  componentName?: string;
  onRetry: () => void;
}

/**
 * Default fallback UI for ErrorBoundary.
 */
function DefaultErrorFallback({
  error,
  componentName,
  onRetry,
}: DefaultErrorFallbackProps): ReactNode {
  const title = componentName
    ? `Error in ${componentName}`
    : 'Something went wrong';

  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-red-800">{title}</h2>
          <p className="mt-2 text-sm text-red-700">{error.userMessage}</p>
        </div>

        {error.severity !== 'critical' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-300 text-red-700 hover:bg-red-100"
            >
              Try Again
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
              className="text-red-600 hover:bg-red-100"
            >
              Reload App
            </Button>
          </div>
        )}

        {error.severity === 'critical' && (
          <div className="mt-4 text-sm text-red-600">
            <p>This error requires attention. Please reload the app or contact support.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-2 border-red-300 text-red-700 hover:bg-red-100"
            >
              Reload App
            </Button>
          </div>
        )}

        {/* Show technical details in development */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-red-600">
              Technical Details
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
              {JSON.stringify(
                {
                  code: error.code,
                  message: error.message,
                  category: error.category,
                  context: error.context,
                },
                null,
                2
              )}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

/**
 * Hook for creating error boundary wrapper.
 * Note: Error boundaries must be class components, so this returns props for ErrorBoundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: {
    componentName?: string;
    fallback?: ErrorBoundaryProps['fallback'];
    onError?: ErrorBoundaryProps['onError'];
  }
): React.ComponentType<P> {
  const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  function ComponentWithErrorBoundary(props: P): ReactNode {
    return (
      <ErrorBoundary
        componentName={options?.componentName || displayName}
        fallback={options?.fallback}
        onError={options?.onError}
      >
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }

  ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

  return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
