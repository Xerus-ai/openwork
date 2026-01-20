import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Props for the ActionTile component.
 */
export interface ActionTileProps {
  /** Unique identifier for the action */
  id: string;
  /** Display label for the tile */
  label: string;
  /** Lucide icon component to display */
  icon: LucideIcon;
  /** Callback when the tile is clicked */
  onClick: (id: string) => void;
  /** Optional description for accessibility */
  description?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether the tile is disabled */
  disabled?: boolean;
}

/**
 * Individual action tile component with icon and label.
 * Renders as a clickable button with hover effects.
 *
 * Design follows the UI reference:
 * - Rounded rectangle with subtle border
 * - Icon on the left, label on the right
 * - Hover state with slight background change
 * - Focus state for keyboard navigation
 */
export const ActionTile = memo(function ActionTile({
  id,
  label,
  icon: Icon,
  onClick,
  description,
  className,
  disabled = false,
}: ActionTileProps): ReactElement {
  const handleClick = useCallback((): void => {
    if (!disabled) {
      onClick(id);
    }
  }, [id, onClick, disabled]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!disabled) {
          onClick(id);
        }
      }
    },
    [id, onClick, disabled]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        // Base styles - cowork design with rounded corners and subtle border
        'flex items-center gap-3 w-full px-4 py-3.5',
        'rounded-2xl border border-cowork-border bg-cowork-input-bg shadow-sm',
        // Text styles
        'text-left text-sm font-medium text-cowork-text',
        // Transitions
        'transition-all duration-150 ease-in-out',
        // Hover state
        'hover:bg-cowork-hover hover:border-cowork-border-hover hover:shadow-md',
        // Focus state for accessibility
        'focus:outline-none focus:ring-2 focus:ring-cowork-accent/30 focus:ring-offset-2',
        // Active state
        'active:scale-[0.98]',
        // Disabled state
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-cowork-input-bg disabled:hover:shadow-sm',
        className
      )}
      aria-label={description || label}
      title={description || label}
    >
      <div
        className={cn(
          'flex items-center justify-center',
          'w-10 h-10 rounded-xl',
          'bg-cowork-card-bg border border-cowork-border text-cowork-text-muted'
        )}
      >
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <span className="flex-1 truncate">{label}</span>
    </button>
  );
});
