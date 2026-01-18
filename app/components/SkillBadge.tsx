import type { ReactElement } from 'react';
import { memo } from 'react';
import {
  FileText,
  Table,
  Presentation,
  Code,
  Database,
  Globe,
  Palette,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Category color and icon mappings for skill badges.
 */
const CATEGORY_STYLES: Record<
  string,
  { color: string; icon: typeof FileText }
> = {
  document: {
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    icon: FileText,
  },
  spreadsheet: {
    color: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    icon: Table,
  },
  presentation: {
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    icon: Presentation,
  },
  code: {
    color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    icon: Code,
  },
  data: {
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    icon: Database,
  },
  web: {
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    icon: Globe,
  },
  frontend: {
    color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
    icon: Palette,
  },
  config: {
    color: 'bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300',
    icon: Settings,
  },
  default: {
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
    icon: Sparkles,
  },
};

/**
 * Default style configuration when category is not found.
 */
const DEFAULT_STYLE: { color: string; icon: typeof FileText } = {
  color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300',
  icon: Sparkles,
};

/**
 * Gets style configuration for a skill category.
 */
function getCategoryStyle(category: string): { color: string; icon: typeof FileText } {
  const normalized = category.toLowerCase();
  return CATEGORY_STYLES[normalized] ?? DEFAULT_STYLE;
}

/**
 * Props for the SkillBadge component.
 */
export interface SkillBadgeProps {
  /** Skill name to display */
  name: string;
  /** Skill category for styling */
  category: string;
  /** Optional description for tooltip */
  description?: string;
  /** Whether to show the category icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

/**
 * SkillBadge displays a loaded skill with category-based styling.
 *
 * Features:
 * - Category-specific colors and icons
 * - Tooltip with description
 * - Two size variants
 * - Click interaction support
 */
export const SkillBadge = memo(function SkillBadge({
  name,
  category,
  description,
  showIcon = true,
  size = 'sm',
  className,
  onClick,
}: SkillBadgeProps): ReactElement {
  const { color, icon: Icon } = getCategoryStyle(category);

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  const isClickable = Boolean(onClick);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium transition-colors',
        sizeClasses,
        color,
        isClickable && 'cursor-pointer hover:opacity-80',
        className
      )}
      title={description}
      onClick={onClick}
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
      {showIcon && <Icon className={iconSize} aria-hidden="true" />}
      <span>{name}</span>
    </span>
  );
});
