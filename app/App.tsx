import type { ReactElement, ReactNode } from 'react';
import { Layout } from '@/components/Layout';
import { ChatPane } from '@/components/ChatPane';
import { ExecutionPane } from '@/components/ExecutionPane';
import { StatePane } from '@/components/StatePane';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorProvider } from '@/hooks/useErrors';
import { GlobalErrorDisplay } from '@/components/GlobalErrorDisplay';

/**
 * Pane-specific error fallback component.
 */
function PaneErrorFallback({
  paneName,
  onRetry,
}: {
  paneName: string;
  onRetry: () => void;
}): ReactElement {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-muted/50 p-4 text-center">
      <div className="text-destructive">
        <svg
          className="h-12 w-12 mx-auto"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div>
        <h3 className="font-medium text-foreground">{paneName} Error</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This section encountered an error.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Wraps a pane component with an error boundary.
 */
function WrappedPane({
  children,
  paneName,
}: {
  children: ReactNode;
  paneName: string;
}): ReactElement {
  return (
    <ErrorBoundary
      componentName={paneName}
      fallback={(_error, resetError) => (
        <PaneErrorFallback paneName={paneName} onRetry={resetError} />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Inner app content with error boundaries for each pane.
 */
function AppContent(): ReactElement {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Layout
        chatPane={
          <WrappedPane paneName="Chat">
            <ChatPane />
          </WrappedPane>
        }
        executionPane={
          <WrappedPane paneName="Execution">
            <ExecutionPane />
          </WrappedPane>
        }
        statePane={
          <WrappedPane paneName="State">
            <StatePane />
          </WrappedPane>
        }
      />
      <GlobalErrorDisplay />
    </div>
  );
}

/**
 * Root React component for Claude Cowork.
 * Renders the three-pane layout with Chat, Execution, and State sections.
 * Wrapped with error handling providers.
 */
function App(): ReactElement {
  return (
    <ErrorBoundary componentName="App">
      <ErrorProvider>
        <AppContent />
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
