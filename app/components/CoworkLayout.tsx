/**
 * CoworkLayout - New 3-panel layout matching reference design.
 *
 * Structure:
 * [TaskSidebar (fixed 280px)] | [MainContent (flex-1)] | [StatePane (fixed 280px)]
 *
 * MainContent conditionally shows:
 * - WelcomeScreen when no active task or idle
 * - ChatArea + ArtifactPreview when task is active
 */

import type { ReactElement, ReactNode } from 'react';
import { memo, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { TaskSidebar } from './TaskSidebar';
import { WelcomeScreen, type TaskSubmitInfo } from './WelcomeScreen';
import { ArtifactPreview } from './ArtifactPreview';
import { ChatPane } from './ChatPane';
import { SettingsModal } from './SettingsModal';
import { useTaskSessions } from '@/hooks/useTaskSessions';
import { useArtifacts, type Artifact } from '@/hooks/useArtifacts';
import { usePendingTask } from '@/contexts/PendingTaskContext';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import type { ChatMessage } from '@/hooks/useChat';

/**
 * Width of the fixed sidebars in pixels.
 */
const SIDEBAR_WIDTH = 280;

/**
 * Props for the CoworkLayout component.
 */
export interface CoworkLayoutProps {
  /** Content for the state pane (right sidebar) */
  statePane?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the MainContent component.
 */
interface MainContentProps {
  showWelcome: boolean;
  activeSessionId: string | null;
  sessionMessages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
  selectedArtifact: Artifact | null;
  onTaskSubmit: (info: TaskSubmitInfo) => void;
  onArtifactClose: () => void;
  onArtifactDownload: (artifact: Artifact) => void;
  sessionWorkspacePath: string | null;
  onWorkspaceChange: () => void;
}

/**
 * Main content area that switches between welcome screen and active task view.
 */
function MainContent({
  showWelcome,
  activeSessionId,
  sessionMessages,
  onMessagesChange,
  selectedArtifact,
  onTaskSubmit,
  onArtifactClose,
  onArtifactDownload,
  sessionWorkspacePath,
  onWorkspaceChange,
}: MainContentProps): ReactElement {
  if (showWelcome) {
    return (
      <WelcomeScreen
        onTaskSubmit={onTaskSubmit}
        className="h-full"
      />
    );
  }

  // Active task view with chat and optional artifact preview
  return (
    <div className="flex h-full">
      {/* Chat area */}
      <div
        className={cn(
          'flex-1 min-w-0 h-full',
          selectedArtifact && 'border-r border-cowork-border'
        )}
      >
        <ChatPane
          activeSessionId={activeSessionId}
          sessionMessages={sessionMessages}
          onMessagesChange={onMessagesChange}
          sessionWorkspacePath={sessionWorkspacePath}
          onWorkspaceChange={onWorkspaceChange}
        />
      </div>

      {/* Artifact preview (when an artifact is selected) */}
      {selectedArtifact && (
        <div className="w-1/2 min-w-[300px] max-w-[600px] h-full">
          <ArtifactPreview
            artifact={selectedArtifact}
            onClose={onArtifactClose}
            onDownload={onArtifactDownload}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Props for the CollapsibleStatePane component.
 */
interface CollapsibleStatePaneProps {
  isCollapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * Collapsible right sidebar for the state pane.
 */
function CollapsibleStatePane({
  isCollapsed,
  onToggle,
  children,
}: CollapsibleStatePaneProps): ReactElement {
  return (
    <div
      className={cn(
        'relative flex-shrink-0 border-l border-cowork-border bg-white transition-all duration-200',
        isCollapsed ? 'w-0 overflow-hidden' : `w-[${SIDEBAR_WIDTH}px]`
      )}
      style={{ width: isCollapsed ? 0 : SIDEBAR_WIDTH }}
    >
      {/* Collapse toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute top-2 z-20 h-6 w-6 rounded-full bg-white border shadow-sm',
          'hover:bg-cowork-hover',
          isCollapsed ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'
        )}
        onClick={onToggle}
        aria-label={isCollapsed ? 'Expand state pane' : 'Collapse state pane'}
      >
        {isCollapsed ? (
          <ChevronLeft className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </Button>

      {/* State pane content */}
      <div className={cn('h-full overflow-hidden', isCollapsed && 'hidden')}>
        {children}
      </div>
    </div>
  );
}

/**
 * CoworkLayout provides the main application layout with:
 * - Fixed-width TaskSidebar on the left
 * - Flexible MainContent in the center
 * - Collapsible StatePane on the right
 *
 * @example
 * <CoworkLayout
 *   chatPane={<ChatPane />}
 *   statePane={<StatePane />}
 * />
 */
export const CoworkLayout = memo(function CoworkLayout({
  statePane,
  className,
}: CoworkLayoutProps): ReactElement {
  const [isStatePaneCollapsed, setIsStatePaneCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState('Test User');

  // Load user name from settings on mount
  useEffect(() => {
    const loadUserName = async () => {
      const api = window.electronAPI;
      if (!api) return;

      try {
        const name = await api.getUserName();
        setUserName(name);
      } catch (error) {
        console.error('[CoworkLayout] Failed to load user name:', error);
      }
    };

    loadUserName();
  }, []);

  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    getActiveSession,
    updateSessionMessages,
    deleteSession,
    setSessionWorkspace,
  } = useTaskSessions();

  const {
    artifacts,
    selectedId: selectedArtifactId,
    selectArtifact,
  } = useArtifacts();

  const { pendingTask, setPendingTask } = usePendingTask();

  // Get selected artifact
  const selectedArtifact = selectedArtifactId
    ? artifacts.find((a) => a.id === selectedArtifactId) ?? null
    : null;

  const activeSession = getActiveSession();
  const sessionMessages = activeSession?.messages ?? [];

  // Show chat view whenever a session is selected
  // Welcome screen only shows when no session exists
  const hasActiveSession = Boolean(activeSession);
  const showWelcome = !pendingTask && (!hasActiveSession || sessionMessages.length === 0);

  // Debug logging
  console.log('[CoworkLayout] Render - activeSessionId:', activeSessionId, 'hasActiveSession:', hasActiveSession, 'sessionMessages:', sessionMessages.length, 'pendingTask:', !!pendingTask, 'showWelcome:', showWelcome);

  /**
   * Handle creating a new task.
   * Just clears the active session to show WelcomeScreen.
   * The actual session is created when user submits their first message.
   */
  const handleNewTask = useCallback(() => {
    setActiveSession(null);
  }, [setActiveSession]);

  /**
   * Handle deleting a task session.
   */
  const handleSessionDelete = useCallback(
    (id: string) => {
      deleteSession(id);
    },
    [deleteSession]
  );

  /**
   * Handle session selection.
   */
  const handleSessionSelect = useCallback(
    (id: string) => {
      setActiveSession(id);
      // Clear artifact selection when switching sessions
      selectArtifact(null);
    },
    [setActiveSession, selectArtifact]
  );

  /**
   * Handle task submission from welcome screen.
   */
  const handleTaskSubmit = useCallback(
    (info: TaskSubmitInfo) => {
      const { task, workspacePath, workspaceContents, attachments } = info;
      // Create a new session with the task as the title, workspace path, and attachments
      const sessionId = createSession(task.slice(0, 50), workspacePath, attachments);
      // Set workspace contents for the session
      if (workspacePath) {
        setSessionWorkspace(sessionId, workspacePath, workspaceContents);
      }
      setActiveSession(sessionId);
      // Set the pending task to be sent by ChatPane (with attachments if any)
      setPendingTask(task, attachments);
      console.log('[CoworkLayout] Task submitted:', task, 'workspace:', workspacePath, 'attachments:', attachments?.length ?? 0);
    },
    [createSession, setActiveSession, setPendingTask, setSessionWorkspace]
  );

  /**
   * Handle artifact preview close.
   */
  const handleArtifactClose = useCallback(() => {
    selectArtifact(null);
  }, [selectArtifact]);

  /**
   * Handle artifact download.
   */
  const handleArtifactDownload = useCallback(async (artifact: Artifact): Promise<void> => {
    const api = window.electronAPI;
    if (!api) {
      console.warn('[CoworkLayout] electronAPI not available for download');
      return;
    }

    try {
      const result = await api.downloadArtifact({
        sourcePath: artifact.path,
        suggestedName: artifact.name,
      });

      if (result.success) {
        console.log('[CoworkLayout] Artifact downloaded:', result.savedPath);
      }
    } catch (error) {
      console.error('[CoworkLayout] Download error:', error);
    }
  }, []);

  /**
   * Toggle state pane collapse.
   */
  const handleStatePaneToggle = useCallback(() => {
    setIsStatePaneCollapsed((prev) => !prev);
  }, []);

  /**
   * Handle messages change from ChatPane to sync back to session.
   */
  const handleMessagesChange = useCallback(
    (messages: ChatMessage[]) => {
      console.log('[CoworkLayout] handleMessagesChange called - activeSessionId:', activeSessionId, 'messages:', messages.length);
      if (activeSessionId) {
        console.log('[CoworkLayout] Updating session messages for:', activeSessionId);
        updateSessionMessages(activeSessionId, messages);
      } else {
        console.warn('[CoworkLayout] No activeSessionId, cannot sync messages!');
      }
    },
    [activeSessionId, updateSessionMessages]
  );

  /**
   * Handle workspace change from ChatInput.
   * Opens folder picker and updates the session's workspace.
   */
  const handleWorkspaceChange = useCallback(async () => {
    const api = window.electronAPI;
    if (!api || !activeSessionId) return;

    try {
      const result = await api.selectFolder();
      if (result.path) {
        // Get folder contents
        const contentsResult = await api.listDirectory({ path: result.path });
        const contents = contentsResult.entries ?? [];
        // Update session workspace
        setSessionWorkspace(activeSessionId, result.path, contents);
        console.log('[CoworkLayout] Workspace changed to:', result.path);
      }
    } catch (error) {
      console.error('[CoworkLayout] Failed to change workspace:', error);
    }
  }, [activeSessionId, setSessionWorkspace]);

  // Get current session's workspace path
  const sessionWorkspacePath = activeSession?.workspacePath ?? null;

  // User info from settings
  const userInfo = {
    name: userName,
  };

  /**
   * Handle opening settings modal.
   */
  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  /**
   * Handle closing settings modal.
   */
  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  /**
   * Handle settings save - reload user name.
   */
  const handleSettingsSave = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    try {
      const name = await api.getUserName();
      setUserName(name);
    } catch (error) {
      console.error('[CoworkLayout] Failed to reload user name:', error);
    }
  }, []);

  return (
    <div className={cn('flex h-full w-full bg-cowork-bg', className)}>
      {/* Left sidebar - Task list */}
      <div
        className="flex-shrink-0 h-full"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <TaskSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSessionSelect={handleSessionSelect}
          onSessionDelete={handleSessionDelete}
          onNewTask={handleNewTask}
          onSettingsClick={handleSettingsOpen}
          user={userInfo}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 min-w-0 h-full">
        <MainContent
          showWelcome={showWelcome}
          activeSessionId={activeSessionId}
          sessionMessages={sessionMessages}
          onMessagesChange={handleMessagesChange}
          selectedArtifact={selectedArtifact}
          onTaskSubmit={handleTaskSubmit}
          onArtifactClose={handleArtifactClose}
          onArtifactDownload={handleArtifactDownload}
          sessionWorkspacePath={sessionWorkspacePath}
          onWorkspaceChange={handleWorkspaceChange}
        />
      </div>

      {/* Right sidebar - State pane */}
      <CollapsibleStatePane
        isCollapsed={isStatePaneCollapsed}
        onToggle={handleStatePaneToggle}
      >
        {statePane}
      </CollapsibleStatePane>

      {/* Collapsed state indicator */}
      {isStatePaneCollapsed && (
        <div className="w-8 flex-shrink-0 bg-cowork-hover border-l border-cowork-border flex items-start justify-center pt-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleStatePaneToggle}
            aria-label="Expand state pane"
          >
            <ChevronLeft className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Settings Modal */}
      <SettingsModal
        open={isSettingsOpen}
        onClose={handleSettingsClose}
        onSave={handleSettingsSave}
      />
    </div>
  );
});
