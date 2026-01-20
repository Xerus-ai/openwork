/**
 * App - Application root using CoworkLayout.
 *
 * Layout structure:
 * - TaskSidebar on the left
 * - Main content area in the center (Welcome screen or Chat + Preview)
 * - State pane on the right
 */

import type { ReactElement, ReactNode } from 'react';
import { CoworkLayout } from '@/components/CoworkLayout';
import { StatePane, type ConnectorItem, type WorkingFile as StatePaneWorkingFile, type FolderEntry } from '@/components/StatePane';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorProvider } from '@/hooks/useErrors';
import { WorkspaceProvider } from '@/contexts/WorkspaceContext';
import { PendingTaskProvider } from '@/contexts/PendingTaskContext';
import { SessionProvider, useSessionContext } from '@/contexts/SessionContext';
import { GlobalErrorDisplay } from '@/components/GlobalErrorDisplay';
import { useTodoList } from '@/hooks/useTodoList';
import { useArtifacts } from '@/hooks/useArtifacts';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { Globe, Chrome, FileText, FileCode, FileSpreadsheet, File } from 'lucide-react';

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
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-cowork-hover p-4 text-center">
      <div className="text-red-500">
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
        <h3 className="font-medium text-cowork-text">{paneName} Error</h3>
        <p className="mt-1 text-sm text-cowork-text-muted">
          This section encountered an error.
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg bg-cowork-accent px-4 py-2 text-sm text-white hover:bg-cowork-accent-hover"
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
 * Gets the appropriate icon for a file based on its extension.
 */
function getFileIcon(filename: string): React.ComponentType<{ className?: string }> {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx':
    case 'py':
    case 'go':
    case 'rs':
      return FileCode;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return FileSpreadsheet;
    case 'md':
    case 'txt':
    case 'json':
      return FileText;
    default:
      return File;
  }
}

/**
 * Gets the icon for an MCP connector based on its name.
 */
function getConnectorIcon(name: string): React.ComponentType<{ className?: string }> {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('chrome') || lowerName.includes('browser')) {
    return Chrome;
  }
  if (lowerName.includes('web') || lowerName.includes('search')) {
    return Globe;
  }
  return Globe;
}

/**
 * State pane wrapper that provides data from hooks.
 * Uses per-session workspace instead of global workspace.
 */
function StatePaneWrapper(): ReactElement {
  const { items: progressItems } = useTodoList();
  const { artifacts, selectArtifact } = useArtifacts();
  const { getActiveSessionWorkspace, getActiveSessionAttachments } = useTaskSessions();
  const { mcpConnectors, workingFiles } = useSessionContext();

  // Get workspace from active session (per-task workspace)
  const { path: workspacePath, contents: workspaceContents } = getActiveSessionWorkspace();

  // Get attachments from active session
  const sessionAttachments = getActiveSessionAttachments();

  // Pass the full workspace path to show in context section
  const folders = workspacePath ? [workspacePath] : [];

  // Map workspace contents to FolderEntry format
  const folderContents: FolderEntry[] = workspaceContents.map((entry) => ({
    name: entry.name,
    path: entry.path,
    isDirectory: entry.isDirectory,
  }));

  // Map MCP connectors to StatePane's ConnectorItem format
  const connectors: ConnectorItem[] = mcpConnectors.map((connector) => ({
    id: connector.id,
    name: connector.name,
    icon: getConnectorIcon(connector.name),
    status: connector.status === 'connected' ? 'active' : 'inactive',
  }));

  // Map working files to StatePane's WorkingFile format
  const mappedWorkingFiles: StatePaneWorkingFile[] = workingFiles.map((file) => ({
    id: file.id,
    name: file.name,
    icon: getFileIcon(file.name),
  }));

  return (
    <StatePane
      progressItems={progressItems}
      artifacts={artifacts}
      folders={folders}
      folderContents={folderContents}
      connectors={connectors}
      workingFiles={mappedWorkingFiles}
      attachments={sessionAttachments}
      onArtifactClick={selectArtifact}
    />
  );
}

/**
 * Inner app content with the new CoworkLayout.
 */
function AppContent(): ReactElement {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <CoworkLayout
        statePane={
          <WrappedPane paneName="State">
            <StatePaneWrapper />
          </WrappedPane>
        }
      />
      <GlobalErrorDisplay />
    </div>
  );
}

/**
 * Root React component for Open Cowork.
 * Uses CoworkLayout with TaskSidebar, main content, and StatePane.
 */
function App(): ReactElement {
  return (
    <ErrorBoundary componentName="App">
      <ErrorProvider>
        <WorkspaceProvider>
          <SessionProvider>
            <PendingTaskProvider>
              <AppContent />
            </PendingTaskProvider>
          </SessionProvider>
        </WorkspaceProvider>
      </ErrorProvider>
    </ErrorBoundary>
  );
}

export default App;
