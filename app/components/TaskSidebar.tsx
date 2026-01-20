/**
 * TaskSidebar component displaying the left sidebar with:
 * - Open Cowork branding
 * - New task button
 * - Task list with status indicators
 * - User profile section
 */

import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, Settings, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui';
import type { TaskSession, TaskSessionStatus } from '@/hooks/useTaskSessions';
import { formatRelativeTime } from '@/hooks/useTaskSessions';

/**
 * Props for the TaskSidebar component.
 */
export interface TaskSidebarProps {
  /** List of task sessions */
  sessions: TaskSession[];
  /** ID of the currently active session */
  activeSessionId: string | null;
  /** Callback when a session is selected */
  onSessionSelect: (id: string) => void;
  /** Callback when a session is deleted */
  onSessionDelete: (id: string) => void;
  /** Callback to create a new task */
  onNewTask: () => void;
  /** Callback when settings button is clicked */
  onSettingsClick?: () => void;
  /** User profile information */
  user?: {
    name: string;
    company?: string;
    avatarUrl?: string;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the TaskListItem component.
 */
interface TaskListItemProps {
  session: TaskSession;
  isActive: boolean;
  onClick: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Gets the status indicator element based on session status.
 */
function getStatusIndicator(status: TaskSessionStatus): ReactElement {
  switch (status) {
    case 'completed':
      return (
        <div className="w-5 h-5 rounded-full bg-cowork-success flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      );
    case 'active':
      return (
        <div className="w-5 h-5 rounded-full border-2 border-cowork-active flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-cowork-active" />
        </div>
      );
    case 'idle':
    default:
      return (
        <div className="w-5 h-5 rounded-full border-2 border-cowork-border" />
      );
  }
}

/**
 * Individual task item in the sidebar list.
 */
function TaskListItem({ session, isActive, onClick, onDelete }: TaskListItemProps): ReactElement {
  const handleClick = useCallback(() => {
    onClick(session.id);
  }, [onClick, session.id]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    onDelete(session.id);
  }, [onDelete, session.id]);

  // Generate subtitle based on session state
  const subtitle = session.status === 'active'
    ? session.subtitle
    : formatRelativeTime(session.updatedAt);

  return (
    <div
      className={cn(
        'group w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer',
        isActive
          ? 'bg-cowork-selected'
          : 'hover:bg-cowork-hover'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-current={isActive ? 'true' : undefined}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIndicator(session.status)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-cowork-text truncate">
          {session.title}
        </div>
        <div className="text-xs text-cowork-text-muted truncate">
          {subtitle}
        </div>
      </div>
      <button
        onClick={handleDelete}
        className="flex-shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-100 text-cowork-text-muted hover:text-red-600 transition-all"
        aria-label={`Delete ${session.title}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * Props for the UserProfile component.
 */
interface UserProfileProps {
  name: string;
  company?: string;
  avatarUrl?: string;
  onSettingsClick?: () => void;
}

/**
 * User profile section at the bottom of the sidebar.
 */
function UserProfile({ name, company, avatarUrl, onSettingsClick }: UserProfileProps): ReactElement {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center justify-between p-3 border-t border-cowork-border">
      <div className="flex items-center gap-3">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-cowork-accent flex items-center justify-center text-white text-xs font-medium">
            {initials}
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-cowork-text">{name}</span>
          {company && (
            <span className="text-xs text-cowork-text-muted">{company}</span>
          )}
        </div>
        <ChevronDown className="w-4 h-4 text-cowork-text-muted ml-1" />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-cowork-text-muted hover:text-cowork-text"
        aria-label="Settings"
        onClick={onSettingsClick}
      >
        <Settings className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * TaskSidebar displays the left navigation panel with task management.
 *
 * Features:
 * - Open Cowork branding header
 * - New task button with accent color
 * - Scrollable task list with status indicators
 * - User profile with avatar at bottom
 *
 * @example
 * <TaskSidebar
 *   sessions={sessions}
 *   activeSessionId={activeId}
 *   onSessionSelect={setActiveSession}
 *   onNewTask={createNewTask}
 *   user={{ name: "Test User" }}
 * />
 */
export const TaskSidebar = memo(function TaskSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onSessionDelete,
  onNewTask,
  onSettingsClick,
  user,
  className,
}: TaskSidebarProps): ReactElement {
  return (
    <div
      className={cn(
        'flex flex-col h-full bg-cowork-bg border-r border-cowork-border',
        className
      )}
    >
      {/* Header with Open Cowork branding */}
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-xl font-semibold text-cowork-text">Open Cowork</span>
        <button
          className="p-1.5 rounded hover:bg-cowork-hover"
          aria-label="Window controls"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-cowork-text-muted"
          >
            <rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </button>
      </div>

      {/* New task button - coral accent per reference design */}
      <div className="px-4 pb-4">
        <Button
          onClick={onNewTask}
          className="w-full justify-start gap-2 bg-cowork-accent hover:bg-cowork-accent-hover text-white border-0"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          New task
        </Button>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {sessions.map((session) => (
            <TaskListItem
              key={session.id}
              session={session}
              isActive={session.id === activeSessionId}
              onClick={onSessionSelect}
              onDelete={onSessionDelete}
            />
          ))}
        </div>

        {sessions.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-cowork-text-muted">
              No tasks yet. Click "New task" to get started.
            </p>
          </div>
        )}
      </div>

      {/* User profile */}
      {user && (
        <UserProfile
          name={user.name}
          company={user.company}
          avatarUrl={user.avatarUrl}
          onSettingsClick={onSettingsClick}
        />
      )}
    </div>
  );
});
