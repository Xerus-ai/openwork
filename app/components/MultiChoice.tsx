/**
 * MultiChoice Component
 *
 * Displays a list of selectable options for multi-choice questions.
 * Supports both single-select and multi-select modes.
 */

import type { ReactElement } from 'react';
import { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, Square, CheckSquare } from 'lucide-react';
import type { QuestionOption } from '@/lib/ipc-types';

/**
 * Props for the MultiChoice component.
 */
export interface MultiChoiceProps {
  /** Available options to select from */
  options: QuestionOption[];
  /** Currently selected values */
  selectedValues: string[];
  /** Callback when selection changes */
  onSelect: (values: string[]) => void;
  /** Whether multiple selections are allowed */
  multiSelect?: boolean;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Letter labels for options (A, B, C, etc.)
 */
const OPTION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * MultiChoice displays a list of selectable options.
 *
 * In single-select mode, clicking an option selects it and replaces
 * any previous selection. In multi-select mode, clicking toggles
 * the selection state of individual options.
 *
 * @example
 * // Single select
 * <MultiChoice
 *   options={[
 *     { label: "React", value: "react" },
 *     { label: "Vue", value: "vue" },
 *   ]}
 *   selectedValues={selectedValues}
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // Multi select
 * <MultiChoice
 *   options={options}
 *   selectedValues={selectedValues}
 *   onSelect={handleSelect}
 *   multiSelect={true}
 * />
 */
export const MultiChoice = memo(function MultiChoice({
  options,
  selectedValues,
  onSelect,
  multiSelect = false,
  disabled = false,
  className,
}: MultiChoiceProps): ReactElement {
  /**
   * Handle option click.
   */
  const handleOptionClick = useCallback(
    (value: string): void => {
      if (disabled) {
        return;
      }

      if (multiSelect) {
        // Toggle selection in multi-select mode
        if (selectedValues.includes(value)) {
          onSelect(selectedValues.filter((v) => v !== value));
        } else {
          onSelect([...selectedValues, value]);
        }
      } else {
        // Replace selection in single-select mode
        onSelect([value]);
      }
    },
    [disabled, multiSelect, selectedValues, onSelect]
  );

  /**
   * Handle keyboard navigation.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, value: string): void => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOptionClick(value);
      }
    },
    [handleOptionClick]
  );

  return (
    <div
      className={cn('space-y-2', className)}
      role="listbox"
      aria-multiselectable={multiSelect}
      aria-label="Select an option"
    >
      {options.map((option, index) => {
        const isSelected = selectedValues.includes(option.value);
        const letter = OPTION_LABELS[index] || String(index + 1);

        return (
          <ChoiceOption
            key={option.value}
            option={option}
            letter={letter}
            isSelected={isSelected}
            multiSelect={multiSelect}
            disabled={disabled}
            onClick={() => handleOptionClick(option.value)}
            onKeyDown={(e) => handleKeyDown(e, option.value)}
          />
        );
      })}
    </div>
  );
});

/**
 * Props for ChoiceOption sub-component.
 */
interface ChoiceOptionProps {
  option: QuestionOption;
  letter: string;
  isSelected: boolean;
  multiSelect: boolean;
  disabled: boolean;
  onClick: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

/**
 * Individual choice option.
 */
function ChoiceOption({
  option,
  letter,
  isSelected,
  multiSelect,
  disabled,
  onClick,
  onKeyDown,
}: ChoiceOptionProps): ReactElement {
  const SelectionIcon = getSelectionIcon(isSelected, multiSelect);

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* Letter badge */}
      <div
        className={cn(
          'flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-medium',
          isSelected
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {letter}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            isSelected ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {option.label}
        </p>
        {option.description && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {option.description}
          </p>
        )}
      </div>

      {/* Selection indicator */}
      <div className="flex-shrink-0 mt-0.5">
        <SelectionIcon
          className={cn(
            'w-5 h-5',
            isSelected ? 'text-primary' : 'text-muted-foreground/50'
          )}
        />
      </div>
    </div>
  );
}

/**
 * Get the appropriate selection icon based on state.
 */
function getSelectionIcon(
  isSelected: boolean,
  multiSelect: boolean
): React.ComponentType<{ className?: string }> {
  if (multiSelect) {
    return isSelected ? CheckSquare : Square;
  }
  return isSelected ? Check : Circle;
}
