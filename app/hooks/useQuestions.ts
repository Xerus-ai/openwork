/**
 * Hook for managing agent question state and responses.
 * Handles question display, user interaction, and answer submission.
 */

import { useCallback, useState } from 'react';
import type { AgentQuestion, QuestionOption } from '@/lib/ipc-types';
import { getIpcClient } from '@/lib/ipc-client';

/**
 * A pending question awaiting user response.
 */
export interface PendingQuestion {
  id: string;
  questionId: string;
  requestId: string;
  question: string;
  options: QuestionOption[];
  multiSelect: boolean;
  receivedAt: Date;
}

/**
 * Question state.
 */
export interface QuestionState {
  /** Currently active question (or null if none) */
  currentQuestion: PendingQuestion | null;
  /** Queue of pending questions */
  questionQueue: PendingQuestion[];
  /** Whether an answer is being submitted */
  isSubmitting: boolean;
  /** Last submission error (if any) */
  lastError: string | null;
}

/**
 * Question actions.
 */
export interface QuestionActions {
  /** Handle an incoming question from the agent */
  handleQuestion: (question: AgentQuestion) => void;
  /** Submit an answer to the current question */
  submitAnswer: (selectedValues: string[]) => Promise<boolean>;
  /** Skip the current question (submits empty response) */
  skipQuestion: () => Promise<boolean>;
  /** Clear all pending questions */
  clearQuestions: () => void;
  /** Clear the last error */
  clearError: () => void;
}

/**
 * Hook for managing agent questions.
 *
 * Questions are queued and displayed one at a time. When a question is
 * answered, the next one in the queue becomes current.
 *
 * @returns Question state and actions
 *
 * @example
 * const {
 *   currentQuestion,
 *   isSubmitting,
 *   handleQuestion,
 *   submitAnswer,
 *   skipQuestion,
 * } = useQuestions();
 *
 * // Handle incoming question from agent
 * useEffect(() => {
 *   if (agentQuestion) {
 *     handleQuestion(agentQuestion);
 *   }
 * }, [agentQuestion]);
 *
 * // Submit user's answer
 * await submitAnswer(['option-a', 'option-b']);
 */
export function useQuestions(): QuestionState & QuestionActions {
  const [currentQuestion, setCurrentQuestion] = useState<PendingQuestion | null>(null);
  const [questionQueue, setQuestionQueue] = useState<PendingQuestion[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  /**
   * Handle an incoming question from the agent.
   * Adds it to the queue or sets as current if no question is active.
   */
  const handleQuestion = useCallback((question: AgentQuestion): void => {
    const pending: PendingQuestion = {
      id: question.id,
      questionId: question.questionId,
      requestId: question.requestId,
      question: question.question,
      options: question.options,
      multiSelect: question.multiSelect,
      receivedAt: new Date(),
    };

    console.log('[useQuestions] Received question:', pending.questionId);

    setCurrentQuestion((current) => {
      if (current === null) {
        // No active question, set this one as current
        return pending;
      }
      // Already have an active question, add to queue
      setQuestionQueue((queue) => [...queue, pending]);
      return current;
    });
  }, []);

  /**
   * Move to the next question in the queue.
   */
  const advanceToNextQuestion = useCallback((): void => {
    setQuestionQueue((queue) => {
      if (queue.length === 0) {
        setCurrentQuestion(null);
        return queue;
      }
      const [next, ...rest] = queue;
      // next is guaranteed to exist because queue.length > 0
      setCurrentQuestion(next ?? null);
      return rest;
    });
  }, []);

  /**
   * Submit an answer to the current question.
   */
  const submitAnswer = useCallback(
    async (selectedValues: string[]): Promise<boolean> => {
      if (!currentQuestion) {
        console.warn('[useQuestions] No question to answer');
        return false;
      }

      setIsSubmitting(true);
      setLastError(null);

      try {
        const client = getIpcClient();
        const result = await client.answerQuestion(
          currentQuestion.questionId,
          currentQuestion.requestId,
          selectedValues
        );

        if (result.success) {
          console.log('[useQuestions] Answer submitted:', currentQuestion.questionId);
          advanceToNextQuestion();
          return true;
        } else {
          setLastError('Failed to submit answer');
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('[useQuestions] Submit error:', message);
        setLastError(message);
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentQuestion, advanceToNextQuestion]
  );

  /**
   * Skip the current question by submitting an empty response.
   */
  const skipQuestion = useCallback(async (): Promise<boolean> => {
    return submitAnswer([]);
  }, [submitAnswer]);

  /**
   * Clear all pending questions.
   */
  const clearQuestions = useCallback((): void => {
    setCurrentQuestion(null);
    setQuestionQueue([]);
    setLastError(null);
    console.log('[useQuestions] Questions cleared');
  }, []);

  /**
   * Clear the last error.
   */
  const clearError = useCallback((): void => {
    setLastError(null);
  }, []);

  return {
    // State
    currentQuestion,
    questionQueue,
    isSubmitting,
    lastError,

    // Actions
    handleQuestion,
    submitAnswer,
    skipQuestion,
    clearQuestions,
    clearError,
  };
}
