/**
 * QuestionPrompt Component
 *
 * Displays agent questions with various input types (text, multi-choice, yes/no).
 * Handles user responses and submission to the agent.
 */

import type { ReactElement } from 'react';
import { memo, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { MultiChoice } from './MultiChoice';
import type { PendingQuestion } from '@/hooks/useQuestions';
import { HelpCircle, Loader2, X } from 'lucide-react';

/**
 * Props for the QuestionPrompt component.
 */
export interface QuestionPromptProps {
  /** The question to display */
  question: PendingQuestion;
  /** Callback when user submits an answer */
  onSubmit: (selectedValues: string[]) => void;
  /** Callback when user skips the question */
  onSkip?: () => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Determines the question type based on options.
 */
function getQuestionType(question: PendingQuestion): 'yes-no' | 'multi-choice' | 'text' {
  const { options } = question;

  // Check for yes/no pattern
  if (options.length === 2) {
    const values = options.map((o) => o.value.toLowerCase());
    const isYesNo =
      (values.includes('yes') && values.includes('no')) ||
      (values.includes('y') && values.includes('n')) ||
      (values.includes('true') && values.includes('false'));
    if (isYesNo) {
      return 'yes-no';
    }
  }

  // Multi-choice if options exist
  if (options.length > 0) {
    return 'multi-choice';
  }

  // Default to text input
  return 'text';
}

/**
 * QuestionPrompt displays a question from the agent and handles user input.
 *
 * Supports three modes:
 * - Text input for free-form responses
 * - Multi-choice for selecting from options (single or multiple)
 * - Yes/No for binary confirmations
 */
export const QuestionPrompt = memo(function QuestionPrompt({
  question,
  onSubmit,
  onSkip,
  isSubmitting = false,
  error,
  className,
}: QuestionPromptProps): ReactElement {
  const [textInput, setTextInput] = useState('');
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  const questionType = getQuestionType(question);

  /**
   * Handle text input submission.
   */
  const handleTextSubmit = useCallback((): void => {
    if (textInput.trim()) {
      onSubmit([textInput.trim()]);
      setTextInput('');
    }
  }, [textInput, onSubmit]);

  /**
   * Handle multi-choice selection.
   */
  const handleChoiceSelect = useCallback(
    (values: string[]): void => {
      setSelectedValues(values);
      // Auto-submit for single-select
      if (!question.multiSelect && values.length === 1) {
        onSubmit(values);
      }
    },
    [question.multiSelect, onSubmit]
  );

  /**
   * Handle multi-select submission.
   */
  const handleMultiSelectSubmit = useCallback((): void => {
    if (selectedValues.length > 0) {
      onSubmit(selectedValues);
      setSelectedValues([]);
    }
  }, [selectedValues, onSubmit]);

  /**
   * Handle yes/no selection.
   */
  const handleYesNoSelect = useCallback(
    (value: string): void => {
      onSubmit([value]);
    },
    [onSubmit]
  );

  /**
   * Handle skip button click.
   */
  const handleSkip = useCallback((): void => {
    if (onSkip) {
      onSkip();
    }
  }, [onSkip]);

  /**
   * Handle key press in text input.
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleTextSubmit();
      }
    },
    [handleTextSubmit]
  );

  return (
    <div
      className={cn(
        'bg-primary/5 border border-primary/20 rounded-lg p-4 my-4',
        className
      )}
      role="dialog"
      aria-labelledby="question-heading"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 mt-0.5">
          <HelpCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3
            id="question-heading"
            className="text-sm font-medium text-foreground"
          >
            {question.question}
          </h3>
        </div>
        {onSkip && !isSubmitting && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="flex-shrink-0 h-6 w-6 p-0"
            aria-label="Skip question"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Input area based on question type */}
      <div className="ml-8">
        {questionType === 'text' && (
          <TextInput
            value={textInput}
            onChange={setTextInput}
            onKeyDown={handleKeyDown}
            onSubmit={handleTextSubmit}
            isSubmitting={isSubmitting}
          />
        )}

        {questionType === 'yes-no' && (
          <YesNoButtons
            options={question.options}
            onSelect={handleYesNoSelect}
            isSubmitting={isSubmitting}
          />
        )}

        {questionType === 'multi-choice' && (
          <>
            <MultiChoice
              options={question.options}
              selectedValues={selectedValues}
              onSelect={handleChoiceSelect}
              multiSelect={question.multiSelect}
              disabled={isSubmitting}
            />
            {question.multiSelect && selectedValues.length > 0 && (
              <div className="mt-3">
                <Button
                  onClick={handleMultiSelectSubmit}
                  disabled={isSubmitting}
                  size="sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    `Submit (${selectedValues.length} selected)`
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Error display */}
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
});

/**
 * Props for TextInput sub-component.
 */
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

/**
 * Text input for free-form responses.
 */
function TextInput({
  value,
  onChange,
  onKeyDown,
  onSubmit,
  isSubmitting,
}: TextInputProps): ReactElement {
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type your answer..."
        disabled={isSubmitting}
        className="flex-1"
        autoFocus
      />
      <Button
        onClick={onSubmit}
        disabled={isSubmitting || !value.trim()}
        size="sm"
      >
        {isSubmitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Submit'
        )}
      </Button>
    </div>
  );
}

/**
 * Props for YesNoButtons sub-component.
 */
interface YesNoButtonsProps {
  options: PendingQuestion['options'];
  onSelect: (value: string) => void;
  isSubmitting: boolean;
}

/**
 * Yes/No buttons for binary choices.
 */
function YesNoButtons({
  options,
  onSelect,
  isSubmitting,
}: YesNoButtonsProps): ReactElement {
  // Sort to show Yes first, No second
  const sortedOptions = [...options].sort((a, b) => {
    const aIsYes = ['yes', 'y', 'true'].includes(a.value.toLowerCase());
    const bIsYes = ['yes', 'y', 'true'].includes(b.value.toLowerCase());
    if (aIsYes && !bIsYes) return -1;
    if (!aIsYes && bIsYes) return 1;
    return 0;
  });

  return (
    <div className="flex gap-2">
      {sortedOptions.map((option) => {
        const isYes = ['yes', 'y', 'true'].includes(option.value.toLowerCase());
        return (
          <Button
            key={option.value}
            variant={isYes ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(option.value)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              option.label
            )}
          </Button>
        );
      })}
    </div>
  );
}
