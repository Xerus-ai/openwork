import type { ReactElement } from 'react';
import { memo, useMemo } from 'react';
import {
  FolderOpen,
  Clock,
  Cpu,
  MessageSquare,
  Zap,
  Plug,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { LoadedSkill, McpConnector, SessionMetadata, ContextSummary } from '@/hooks/useSessionContext';
import type { SkillState } from '@/hooks/useSkills';
import { SkillBadge } from './SkillBadge';

/**
 * Unified skill type that works with both LoadedSkill and SkillState.
 */
type ContextSkill = LoadedSkill | SkillState;

/**
 * Type guard to check if a skill has a loading status.
 */
function hasLoadingStatus(skill: ContextSkill): skill is SkillState {
  return 'status' in skill;
}

/**
 * Extended summary with loading counts.
 */
interface ExtendedContextSummary extends ContextSummary {
  /** Number of skills currently loading */
  loadingSkillCount?: number;
  /** Number of skills that failed to load */
  erroredSkillCount?: number;
}

/**
 * Props for the ContextSection component.
 */
export interface ContextSectionProps {
  /** Current workspace folder path */
  workspacePath: string | null;
  /** List of loaded skills (supports both LoadedSkill and SkillState) */
  skills: ContextSkill[];
  /** Session metadata */
  session: SessionMetadata | null;
  /** MCP connectors */
  mcpConnectors: McpConnector[];
  /** Summary statistics */
  summary: ContextSummary | ExtendedContextSummary;
  /** Callback when workspace path is clicked */
  onWorkspaceClick?: () => void;
  /** Callback when a skill is clicked */
  onSkillClick?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats the workspace path for display.
 * Shows the folder name prominently with truncated full path.
 */
function formatWorkspaceDisplay(path: string): { name: string; fullPath: string } {
  const separator = path.includes('/') ? '/' : '\\';
  const parts = path.split(separator);
  const name = parts[parts.length - 1] || path;

  return { name, fullPath: path };
}

/**
 * Truncates a path for display with ellipsis in the middle.
 */
function truncatePath(path: string, maxLength = 35): string {
  if (path.length <= maxLength) {
    return path;
  }

  const separator = path.includes('/') ? '/' : '\\';
  const parts = path.split(separator);

  if (parts.length <= 2) {
    const startLen = Math.floor((maxLength - 3) / 2);
    const endLen = maxLength - 3 - startLen;
    return path.slice(0, startLen) + '...' + path.slice(-endLen);
  }

  const first = parts[0] + separator;
  const last = parts.slice(-2).join(separator);

  if (first.length + last.length + 3 <= maxLength) {
    return first + '...' + separator + last;
  }

  return path.slice(0, maxLength - 3) + '...';
}

/**
 * WorkspaceInfo displays the current workspace path.
 */
function WorkspaceInfo({
  path,
  onClick,
}: {
  path: string | null;
  onClick?: () => void;
}): ReactElement {
  if (!path) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <FolderOpen className="h-4 w-4" />
        <span className="text-xs italic">No workspace selected</span>
      </div>
    );
  }

  const { name, fullPath } = formatWorkspaceDisplay(path);
  const isClickable = Boolean(onClick);

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-md p-2 -mx-2',
        isClickable && 'cursor-pointer hover:bg-muted/50 transition-colors'
      )}
      onClick={onClick}
      title={fullPath}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <FolderOpen className="h-4 w-4 mt-0.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-xs text-muted-foreground truncate">{truncatePath(fullPath)}</p>
      </div>
    </div>
  );
}

/**
 * SkillsList displays loaded skills as badges with loading indicators.
 */
function SkillsList({
  skills,
  onSkillClick,
  loadingCount,
}: {
  skills: ContextSkill[];
  onSkillClick?: (id: string) => void;
  loadingCount?: number;
}): ReactElement {
  if (skills.length === 0 && !loadingCount) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs italic">No skills loaded</span>
      </div>
    );
  }

  // Count skills by status
  const loadedSkills = skills.filter((s) => !hasLoadingStatus(s) || s.status === 'loaded');
  const loadingSkills = skills.filter((s) => hasLoadingStatus(s) && s.status === 'loading');
  const erroredSkills = skills.filter((s) => hasLoadingStatus(s) && s.status === 'error');

  // Build status indicator text
  const statusParts: string[] = [];
  if (loadedSkills.length > 0) {
    statusParts.push(`${loadedSkills.length} loaded`);
  }
  if (loadingSkills.length > 0 || (loadingCount && loadingCount > 0)) {
    const loadingTotal = loadingSkills.length + (loadingCount ?? 0);
    statusParts.push(`${loadingTotal} loading`);
  }
  if (erroredSkills.length > 0) {
    statusParts.push(`${erroredSkills.length} failed`);
  }

  const statusText = statusParts.length > 0 ? statusParts.join(', ') : `${skills.length} skill${skills.length !== 1 ? 's' : ''}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5" />
          <span className="text-xs">Skills</span>
        </div>
        <span className="text-xs">{statusText}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {skills.map((skill) => {
          // Get display name - SkillState uses displayName, LoadedSkill uses name
          const displayName = hasLoadingStatus(skill) ? skill.displayName : skill.name;
          const status = hasLoadingStatus(skill) ? skill.status : 'loaded';
          const error = hasLoadingStatus(skill) ? skill.error : undefined;

          return (
            <SkillBadge
              key={skill.id}
              name={displayName}
              category={skill.category}
              description={skill.description}
              status={status}
              error={error}
              onClick={onSkillClick ? () => onSkillClick(skill.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * SessionInfo displays session metadata.
 */
function SessionInfo({
  session,
  duration,
}: {
  session: SessionMetadata | null;
  duration: string | null;
}): ReactElement {
  if (!session) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-xs italic">No active session</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Model info */}
      <div className="flex items-center gap-2">
        <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium">{session.modelName}</span>
      </div>

      {/* Duration and messages */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        {duration && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{duration}</span>
          </div>
        )}
        {session.messageCount > 0 && (
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            <span>{session.messageCount} msg{session.messageCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * McpConnectorItem displays a single MCP connector status.
 */
function McpConnectorItem({ connector }: { connector: McpConnector }): ReactElement {
  const statusConfig = {
    disconnected: {
      icon: Plug,
      color: 'text-muted-foreground',
      label: 'Disconnected',
    },
    connecting: {
      icon: Loader2,
      color: 'text-blue-500 animate-spin',
      label: 'Connecting',
    },
    connected: {
      icon: CheckCircle2,
      color: 'text-green-500',
      label: 'Connected',
    },
    error: {
      icon: AlertCircle,
      color: 'text-red-500',
      label: 'Error',
    },
  };

  const config = statusConfig[connector.status];
  const Icon = config.icon;

  return (
    <div
      className="flex items-center justify-between py-1"
      title={connector.error ?? config.label}
    >
      <span className="text-xs">{connector.name}</span>
      <Icon className={cn('h-3.5 w-3.5', config.color)} />
    </div>
  );
}

/**
 * McpConnectorsList displays all MCP connectors with their status.
 */
function McpConnectorsList({
  connectors,
  healthy,
  activeCount,
}: {
  connectors: McpConnector[];
  healthy: boolean;
  activeCount: number;
}): ReactElement | null {
  if (connectors.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Plug className="h-3.5 w-3.5" />
          <span className="text-xs">MCP Connectors</span>
        </div>
        <span
          className={cn(
            'text-xs',
            healthy ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {activeCount}/{connectors.length} active
        </span>
      </div>
      <div className="divide-y divide-border">
        {connectors.map((connector) => (
          <McpConnectorItem key={connector.id} connector={connector} />
        ))}
      </div>
    </div>
  );
}

/**
 * EmptyState when no context is available.
 */
function EmptyState(): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <div className="rounded-full bg-muted p-3 mb-3">
        <FolderOpen className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">No context loaded</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Select a workspace to get started.
      </p>
    </div>
  );
}

/**
 * ContextSection displays session context information including:
 * - Current workspace path
 * - Loaded skills as badges with loading indicators
 * - Session metadata (model, duration, messages)
 * - MCP connector status (for future use)
 *
 * Features:
 * - Clear visual hierarchy
 * - Real-time skill loading indicators
 * - Tooltips for more info
 * - Click interactions for workspace and skills
 * - Responsive layout
 */
export const ContextSection = memo(function ContextSection({
  workspacePath,
  skills,
  session,
  mcpConnectors,
  summary,
  onWorkspaceClick,
  onSkillClick,
  className,
}: ContextSectionProps): ReactElement {
  // Get extended summary with loading counts if available
  const extendedSummary = summary as ExtendedContextSummary;
  const loadingSkillCount = extendedSummary.loadingSkillCount;

  /**
   * Determines if context is empty (nothing to show).
   */
  const isEmpty = useMemo(() => {
    return !workspacePath && skills.length === 0 && !session && mcpConnectors.length === 0;
  }, [workspacePath, skills, session, mcpConnectors]);

  /**
   * Build header subtitle showing skill status.
   */
  const skillStatusText = useMemo(() => {
    if (skills.length === 0 && !loadingSkillCount) {
      return null;
    }

    const loadedCount = skills.filter((s) => !hasLoadingStatus(s) || s.status === 'loaded').length;
    const loadingCount = skills.filter((s) => hasLoadingStatus(s) && s.status === 'loading').length + (loadingSkillCount ?? 0);

    if (loadingCount > 0) {
      return `${loadedCount} loaded, ${loadingCount} loading`;
    }

    return `${loadedCount} skill${loadedCount !== 1 ? 's' : ''}`;
  }, [skills, loadingSkillCount]);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>Context</span>
          {skillStatusText && (
            <span className="text-xs font-normal text-muted-foreground">
              {skillStatusText}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <EmptyState />
        ) : (
          <>
            {/* Workspace info */}
            <WorkspaceInfo path={workspacePath} onClick={onWorkspaceClick} />

            {/* Loaded skills with loading indicators */}
            <SkillsList
              skills={skills}
              onSkillClick={onSkillClick}
              loadingCount={loadingSkillCount}
            />

            {/* Session metadata */}
            {session && (
              <SessionInfo session={session} duration={summary.sessionDuration} />
            )}

            {/* MCP connectors */}
            <McpConnectorsList
              connectors={mcpConnectors}
              healthy={summary.mcpHealthy}
              activeCount={summary.activeMcpCount}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
});
