/**
 * AskUserQuestion Tool
 *
 * Gathers user input via IPC to the UI layer with support for text responses,
 * multi-choice selections, and yes/no confirmations.
 */

import type {
  AskUserQuestionOptions,
  AskUserQuestionResult,
  QuestionChoice,
  QuestionType,
  ToolDefinition,
} from "./types.js";

/**
 * Default timeout for questions (5 minutes).
 */
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Minimum allowed timeout (5 seconds).
 */
const MIN_TIMEOUT_MS = 5 * 1000;

/**
 * Maximum allowed timeout (30 minutes).
 */
const MAX_TIMEOUT_MS = 30 * 60 * 1000;

/**
 * Callback function type for sending questions to the UI.
 * Returns a promise that resolves with the user's answer or rejects on error/cancel/timeout.
 */
export type QuestionSender = (
  question: string,
  type: QuestionType,
  choices?: QuestionChoice[],
  context?: string,
  defaultAnswer?: string
) => Promise<UserResponse>;

/**
 * Response from the UI layer.
 */
export interface UserResponse {
  /** The raw answer from the user */
  answer: string;
  /** Whether the user cancelled the question */
  cancelled?: boolean;
}

/**
 * Pending question in the queue.
 */
interface PendingQuestion {
  options: AskUserQuestionOptions;
  resolve: (result: AskUserQuestionResult) => void;
}

/**
 * Question manager that handles queuing and concurrent question requests.
 */
export class QuestionManager {
  private questionSender: QuestionSender | null = null;
  private pendingQueue: PendingQuestion[] = [];
  private isProcessing = false;

  /**
   * Sets the callback function for sending questions to the UI.
   * Must be set before any questions can be asked.
   */
  setQuestionSender(sender: QuestionSender): void {
    this.questionSender = sender;
  }

  /**
   * Clears the question sender callback.
   */
  clearQuestionSender(): void {
    this.questionSender = null;
  }

  /**
   * Returns whether a question sender is configured.
   */
  hasQuestionSender(): boolean {
    return this.questionSender !== null;
  }

  /**
   * Returns the number of pending questions in the queue.
   */
  getPendingCount(): number {
    return this.pendingQueue.length;
  }

  /**
   * Clears all pending questions, rejecting them with cancellation.
   */
  clearPendingQuestions(): void {
    while (this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift();
      if (pending) {
        pending.resolve({
          success: false,
          type: pending.options.type,
          cancelled: true,
          error: "Question queue cleared",
        });
      }
    }
  }

  /**
   * Asks a question to the user via the configured sender.
   * Questions are queued and processed one at a time.
   */
  async askQuestion(options: AskUserQuestionOptions): Promise<AskUserQuestionResult> {
    // Validate options first
    const validationError = validateQuestionOptions(options);
    if (validationError) {
      return {
        success: false,
        type: options.type,
        error: validationError,
      };
    }

    // Check if sender is configured
    if (!this.questionSender) {
      return {
        success: false,
        type: options.type,
        error: "Question sender not configured. UI layer may not be connected.",
      };
    }

    // Add to queue and wait for processing
    return new Promise((resolve) => {
      this.pendingQueue.push({ options, resolve });
      this.processQueue();
    });
  }

  /**
   * Processes the question queue, one question at a time.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.pendingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.pendingQueue.length > 0) {
      const pending = this.pendingQueue.shift();
      if (!pending) {
        continue;
      }

      const result = await this.processQuestion(pending.options);
      pending.resolve(result);
    }

    this.isProcessing = false;
  }

  /**
   * Processes a single question with timeout handling.
   */
  private async processQuestion(
    options: AskUserQuestionOptions
  ): Promise<AskUserQuestionResult> {
    if (!this.questionSender) {
      return {
        success: false,
        type: options.type,
        error: "Question sender not configured",
      };
    }

    const timeout = clampTimeout(options.timeout ?? DEFAULT_TIMEOUT_MS);

    try {
      const response = await withTimeout(
        this.questionSender(
          options.question,
          options.type,
          options.choices,
          options.context,
          options.defaultAnswer
        ),
        timeout
      );

      if (response.cancelled) {
        return {
          success: false,
          type: options.type,
          cancelled: true,
          error: "User cancelled the question",
        };
      }

      return processResponse(options.type, response.answer);
    } catch (err) {
      if (err instanceof TimeoutError) {
        return {
          success: false,
          type: options.type,
          timedOut: true,
          error: `Question timed out after ${timeout / 1000} seconds`,
        };
      }

      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        type: options.type,
        error: `Failed to get user response: ${message}`,
      };
    }
  }
}

/**
 * Custom error for timeout conditions.
 */
class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

/**
 * Wraps a promise with a timeout.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Clamps timeout to valid range.
 */
function clampTimeout(timeout: number): number {
  if (timeout < MIN_TIMEOUT_MS) {
    return MIN_TIMEOUT_MS;
  }
  if (timeout > MAX_TIMEOUT_MS) {
    return MAX_TIMEOUT_MS;
  }
  return timeout;
}

/**
 * Validates question options.
 * Returns an error message if invalid, undefined if valid.
 */
function validateQuestionOptions(options: AskUserQuestionOptions): string | undefined {
  if (!options.question || options.question.trim() === "") {
    return "Question cannot be empty";
  }

  if (!["text", "multi-choice", "yes-no"].includes(options.type)) {
    return `Invalid question type: ${options.type}. Must be text, multi-choice, or yes-no`;
  }

  if (options.type === "multi-choice") {
    if (!options.choices || options.choices.length === 0) {
      return "Multi-choice questions require at least one choice";
    }

    if (options.choices.length < 2) {
      return "Multi-choice questions require at least two choices";
    }

    // Validate each choice
    const seenIds = new Set<string>();
    for (const choice of options.choices) {
      if (!choice.id || choice.id.trim() === "") {
        return "Each choice must have a non-empty id";
      }
      if (!choice.label || choice.label.trim() === "") {
        return "Each choice must have a non-empty label";
      }
      if (seenIds.has(choice.id)) {
        return `Duplicate choice id: ${choice.id}`;
      }
      seenIds.add(choice.id);
    }

    // Validate default answer if provided
    if (options.defaultAnswer && !seenIds.has(options.defaultAnswer)) {
      return `Default answer '${options.defaultAnswer}' is not a valid choice id`;
    }
  }

  if (options.type === "yes-no" && options.defaultAnswer) {
    const lower = options.defaultAnswer.toLowerCase();
    if (!["yes", "no", "y", "n", "true", "false"].includes(lower)) {
      return "Default answer for yes-no questions must be yes, no, y, n, true, or false";
    }
  }

  return undefined;
}

/**
 * Processes a raw user response into a structured result based on question type.
 */
function processResponse(type: QuestionType, answer: string): AskUserQuestionResult {
  switch (type) {
    case "text":
      return {
        success: true,
        type: "text",
        answer,
      };

    case "multi-choice":
      return {
        success: true,
        type: "multi-choice",
        answer,
        selectedId: answer,
      };

    case "yes-no": {
      const confirmed = parseYesNo(answer);
      return {
        success: true,
        type: "yes-no",
        answer,
        confirmed,
      };
    }

    default:
      return {
        success: false,
        type,
        error: `Unknown question type: ${type}`,
      };
  }
}

/**
 * Parses a yes/no answer to a boolean.
 */
function parseYesNo(answer: string): boolean {
  const lower = answer.toLowerCase().trim();
  return ["yes", "y", "true", "1"].includes(lower);
}

/**
 * Global question manager instance.
 */
const globalQuestionManager = new QuestionManager();

/**
 * Asks a question to the user using the global question manager.
 *
 * @param options - Question options
 * @returns Promise resolving to the question result
 *
 * @example
 * ```typescript
 * // Text question
 * const result = await askUserQuestion({
 *   question: "What is the project name?",
 *   type: "text",
 *   defaultAnswer: "my-project"
 * });
 *
 * // Multi-choice question
 * const result = await askUserQuestion({
 *   question: "Which framework do you prefer?",
 *   type: "multi-choice",
 *   choices: [
 *     { id: "A", label: "React" },
 *     { id: "B", label: "Vue" },
 *     { id: "C", label: "Angular" }
 *   ]
 * });
 *
 * // Yes/no question
 * const result = await askUserQuestion({
 *   question: "Do you want to continue?",
 *   type: "yes-no",
 *   defaultAnswer: "yes"
 * });
 * ```
 */
export async function askUserQuestion(
  options: AskUserQuestionOptions
): Promise<AskUserQuestionResult> {
  return globalQuestionManager.askQuestion(options);
}

/**
 * Sets the question sender for the global question manager.
 * Must be called with a valid sender before questions can be asked.
 */
export function setQuestionSender(sender: QuestionSender): void {
  globalQuestionManager.setQuestionSender(sender);
}

/**
 * Clears the question sender from the global question manager.
 */
export function clearQuestionSender(): void {
  globalQuestionManager.clearQuestionSender();
}

/**
 * Returns the global question manager instance for advanced usage.
 */
export function getQuestionManager(): QuestionManager {
  return globalQuestionManager;
}

/**
 * Tool definition for the ask_user_question tool, suitable for Claude API.
 */
export const askUserQuestionToolDefinition: ToolDefinition = {
  name: "ask_user_question",
  description: `Ask the user a question and wait for their response.

Use this for:
- Gathering clarification on requirements
- Getting user preferences or choices
- Confirming actions before proceeding
- Collecting text input needed for the task

Question types:
- text: Free-form text input
- multi-choice: Selection from predefined options (A, B, C, etc.)
- yes-no: Simple yes/no confirmation

Features:
- Configurable timeout (default 5 minutes)
- Support for default answers
- Contextual information can be provided
- Questions are queued and processed one at a time

The tool blocks until the user responds, times out, or cancels.`,
  input_schema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "The question to ask the user",
      },
      type: {
        type: "string",
        description: "Type of question: text, multi-choice, or yes-no",
        enum: ["text", "multi-choice", "yes-no"],
      },
      choices: {
        type: "array",
        description: "Choices for multi-choice questions (required for multi-choice type)",
      },
      defaultAnswer: {
        type: "string",
        description: "Default answer if user accepts without typing",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 300000 = 5 minutes)",
      },
      context: {
        type: "string",
        description: "Additional context to show with the question",
      },
    },
    required: ["question", "type"],
  },
};

/**
 * Creates an ask_user_question tool handler function for use with Claude API.
 *
 * @param questionSender - Callback function to send questions to the UI
 * @returns A function that handles ask_user_question tool calls
 *
 * @example
 * ```typescript
 * const handler = createAskUserQuestionHandler(async (question, type, choices) => {
 *   // Send question to UI and wait for response
 *   const answer = await ipc.invoke("ask-question", { question, type, choices });
 *   return { answer };
 * });
 *
 * const result = await handler({
 *   question: "Continue with deployment?",
 *   type: "yes-no"
 * });
 * ```
 */
export function createAskUserQuestionHandler(
  questionSender: QuestionSender
): (input: AskUserQuestionOptions) => Promise<AskUserQuestionResult> {
  const manager = new QuestionManager();
  manager.setQuestionSender(questionSender);

  return (input: AskUserQuestionOptions) => manager.askQuestion(input);
}
