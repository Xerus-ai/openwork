import type { ReactElement } from 'react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
 * Model selector dropdown for choosing AI models.
 * Persists selection to localStorage.
 * Shows only model name when selected, full details in dropdown.
 */
export const ModelSelector = memo(function ModelSelector({
  className,
  disabled = false,
}: ModelSelectorProps): ReactElement {
  const { selectedModel, modelConfig, setModel } = useModel();

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
        className={cn('w-[180px] h-8 text-sm', className)}
        aria-label="Select AI model"
      >
        <span className="truncate">{modelConfig.name}</span>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {AVAILABLE_MODELS.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="flex flex-col items-start py-2"
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
