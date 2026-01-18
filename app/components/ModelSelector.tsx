import type { ReactElement } from 'react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import {
  useModel,
  AVAILABLE_MODELS,
  type ModelId,
} from '@/hooks/useModel';

/**
 * Props for the ModelSelector component.
 */
export interface ModelSelectorProps {
  className?: string;
  disabled?: boolean;
}

/**
 * Model selector dropdown for choosing between Claude models.
 * Persists selection to localStorage and displays model name and description.
 *
 * Available models:
 * - Sonnet 4.5: Fast and efficient for most tasks
 * - Opus 4.5: Most capable for complex reasoning
 */
export const ModelSelector = memo(function ModelSelector({
  className,
  disabled = false,
}: ModelSelectorProps): ReactElement {
  const { selectedModel, setModel } = useModel();

  /**
   * Handles model selection change.
   */
  const handleValueChange = (value: string): void => {
    setModel(value as ModelId);
  };

  return (
    <Select
      value={selectedModel}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn('w-[160px] h-8 text-sm', className)}
        aria-label="Select Claude model"
      >
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="flex flex-col items-start"
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{model.name}</span>
              <span className="text-xs text-muted-foreground">
                {model.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});
