import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ActionTile } from './ActionTile';
import { getDisplayActions, type QuickAction } from '@/lib/quick-actions';

/**
 * Props for the QuickActions component.
 */
export interface QuickActionsProps {
  /** Callback when an action tile is clicked, receives the prompt text */
  onActionSelect: (prompt: string) => void;
  /** Number of actions to display (default: 6) */
  actionCount?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the actions are disabled */
  disabled?: boolean;
}

/**
 * Quick actions grid component displaying common task tiles.
 * Renders a responsive grid of action tiles that populate the chat input.
 *
 * Grid layout:
 * - Desktop: 3 columns
 * - Tablet: 2 columns
 * - Mobile: 1 column
 *
 * Default shows 6 tiles in a 3x2 grid matching the UI reference.
 */
export const QuickActions = memo(function QuickActions({
  onActionSelect,
  actionCount = 6,
  className,
  disabled = false,
}: QuickActionsProps): ReactElement {
  const actions = getDisplayActions(actionCount);

  const handleActionClick = useCallback(
    (actionId: string): void => {
      const action = actions.find((a) => a.id === actionId);
      if (action) {
        onActionSelect(action.prompt);
      }
    },
    [actions, onActionSelect]
  );

  return (
    <div
      className={cn(
        // Grid layout - responsive columns
        'grid gap-3',
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        // Max width to prevent tiles from stretching too wide
        'max-w-3xl mx-auto w-full',
        className
      )}
      role="group"
      aria-label="Quick actions"
    >
      {actions.map((action) => (
        <ActionTile
          key={action.id}
          id={action.id}
          label={action.label}
          icon={action.icon}
          description={action.description}
          onClick={handleActionClick}
          disabled={disabled}
        />
      ))}
    </div>
  );
});

/**
 * Re-export types for external use.
 */
export type { QuickAction };
