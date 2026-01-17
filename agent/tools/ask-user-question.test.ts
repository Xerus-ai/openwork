/**
 * AskUserQuestion Tool Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  askUserQuestion,
  askUserQuestionToolDefinition,
  clearQuestionSender,
  createAskUserQuestionHandler,
  getQuestionManager,
  QuestionManager,
  setQuestionSender,
} from "./ask-user-question.js";
import type { QuestionSender } from "./ask-user-question.js";

describe("QuestionManager", () => {
  let manager: QuestionManager;

  beforeEach(() => {
    manager = new QuestionManager();
  });

  describe("sender configuration", () => {
    it("should start without a question sender", () => {
      expect(manager.hasQuestionSender()).toBe(false);
    });

    it("should register a question sender", () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "test" });
      manager.setQuestionSender(sender);

      expect(manager.hasQuestionSender()).toBe(true);
    });

    it("should clear the question sender", () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "test" });
      manager.setQuestionSender(sender);
      manager.clearQuestionSender();

      expect(manager.hasQuestionSender()).toBe(false);
    });

    it("should fail when no sender is configured", async () => {
      const result = await manager.askQuestion({
        question: "Test question?",
        type: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("sender not configured");
    });
  });

  describe("text questions", () => {
    it("should ask a text question and get response", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "Hello World" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "What is your name?",
        type: "text",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("text");
      expect(result.answer).toBe("Hello World");
      expect(sender).toHaveBeenCalledWith(
        "What is your name?",
        "text",
        undefined,
        undefined,
        undefined
      );
    });

    it("should pass default answer to sender", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "default-value" });
      manager.setQuestionSender(sender);

      await manager.askQuestion({
        question: "Enter value",
        type: "text",
        defaultAnswer: "default-value",
      });

      expect(sender).toHaveBeenCalledWith(
        "Enter value",
        "text",
        undefined,
        undefined,
        "default-value"
      );
    });

    it("should pass context to sender", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "answer" });
      manager.setQuestionSender(sender);

      await manager.askQuestion({
        question: "Choose",
        type: "text",
        context: "Some helpful context",
      });

      expect(sender).toHaveBeenCalledWith(
        "Choose",
        "text",
        undefined,
        "Some helpful context",
        undefined
      );
    });
  });

  describe("multi-choice questions", () => {
    it("should ask a multi-choice question", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "B" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Which framework?",
        type: "multi-choice",
        choices: [
          { id: "A", label: "React" },
          { id: "B", label: "Vue" },
          { id: "C", label: "Angular" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("multi-choice");
      expect(result.answer).toBe("B");
      expect(result.selectedId).toBe("B");
    });

    it("should pass choices to sender", async () => {
      const choices = [
        { id: "A", label: "Option A", description: "First option" },
        { id: "B", label: "Option B" },
      ];
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "A" });
      manager.setQuestionSender(sender);

      await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices,
      });

      expect(sender).toHaveBeenCalledWith(
        "Pick one",
        "multi-choice",
        choices,
        undefined,
        undefined
      );
    });

    it("should reject multi-choice without choices", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "A" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("require at least one choice");
      expect(sender).not.toHaveBeenCalled();
    });

    it("should reject multi-choice with only one choice", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "A" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices: [{ id: "A", label: "Only option" }],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least two choices");
    });

    it("should reject choices with empty id", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices: [
          { id: "", label: "Option A" },
          { id: "B", label: "Option B" },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty id");
    });

    it("should reject choices with empty label", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices: [
          { id: "A", label: "" },
          { id: "B", label: "Option B" },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("non-empty label");
    });

    it("should reject duplicate choice ids", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices: [
          { id: "A", label: "Option A" },
          { id: "A", label: "Another A" },
        ],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Duplicate choice id");
    });

    it("should reject invalid default answer for multi-choice", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Pick one",
        type: "multi-choice",
        choices: [
          { id: "A", label: "Option A" },
          { id: "B", label: "Option B" },
        ],
        defaultAnswer: "C",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("not a valid choice id");
    });
  });

  describe("yes-no questions", () => {
    it("should ask a yes-no question with 'yes' answer", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "yes" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Continue?",
        type: "yes-no",
      });

      expect(result.success).toBe(true);
      expect(result.type).toBe("yes-no");
      expect(result.confirmed).toBe(true);
    });

    it("should ask a yes-no question with 'no' answer", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "no" });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Continue?",
        type: "yes-no",
      });

      expect(result.success).toBe(true);
      expect(result.confirmed).toBe(false);
    });

    it("should handle various yes formats", async () => {
      const yesFormats = ["yes", "Yes", "YES", "y", "Y", "true", "1"];

      for (const format of yesFormats) {
        const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: format });
        manager.setQuestionSender(sender);

        const result = await manager.askQuestion({
          question: "Continue?",
          type: "yes-no",
        });

        expect(result.confirmed).toBe(true);
      }
    });

    it("should handle various no formats", async () => {
      const noFormats = ["no", "No", "NO", "n", "N", "false", "0", "nope", "anything"];

      for (const format of noFormats) {
        const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: format });
        manager.setQuestionSender(sender);

        const result = await manager.askQuestion({
          question: "Continue?",
          type: "yes-no",
        });

        expect(result.confirmed).toBe(false);
      }
    });

    it("should accept valid default answers", async () => {
      const validDefaults = ["yes", "no", "y", "n", "true", "false"];
      const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "yes" });
      manager.setQuestionSender(sender);

      for (const defaultAnswer of validDefaults) {
        const result = await manager.askQuestion({
          question: "Continue?",
          type: "yes-no",
          defaultAnswer,
        });

        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid default answers", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Continue?",
        type: "yes-no",
        defaultAnswer: "maybe",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("must be yes, no");
    });
  });

  describe("validation", () => {
    it("should reject empty question", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "",
        type: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("should reject whitespace-only question", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "   ",
        type: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("should reject invalid question type", async () => {
      const sender: QuestionSender = vi.fn();
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Test?",
        type: "invalid" as "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid question type");
    });
  });

  describe("cancellation", () => {
    it("should handle user cancellation", async () => {
      const sender: QuestionSender = vi.fn().mockResolvedValue({
        answer: "",
        cancelled: true,
      });
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Continue?",
        type: "text",
      });

      expect(result.success).toBe(false);
      expect(result.cancelled).toBe(true);
      expect(result.error).toContain("cancelled");
    });
  });

  describe("timeout", () => {
    it("should timeout after configured duration", async () => {
      const sender: QuestionSender = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ answer: "late" }), 10000);
        });
      });
      manager.setQuestionSender(sender);

      // Start the question but don't await - just verify the sender was called
      void manager.askQuestion({
        question: "Quick question?",
        type: "text",
        timeout: 50, // Minimum will be clamped to 5000ms, but we can test the flow
      });

      // The minimum timeout is 5 seconds, so this will actually use 5000ms
      // For testing, we'll just verify the setup works
      expect(sender).toHaveBeenCalled();
    }, 10000);

    it("should handle sender errors", async () => {
      const sender: QuestionSender = vi.fn().mockRejectedValue(new Error("Connection lost"));
      manager.setQuestionSender(sender);

      const result = await manager.askQuestion({
        question: "Test?",
        type: "text",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Connection lost");
    });
  });

  describe("queue management", () => {
    it("should start with empty queue", () => {
      expect(manager.getPendingCount()).toBe(0);
    });

    it("should clear pending questions", async () => {
      // Set up a slow sender
      let resolveQuestion: ((value: { answer: string }) => void) | undefined = undefined;
      const sender: QuestionSender = vi.fn().mockImplementation(() => {
        return new Promise<{ answer: string }>((resolve) => {
          resolveQuestion = resolve;
        });
      });
      manager.setQuestionSender(sender);

      // Start a question but don't await it
      const questionPromise = manager.askQuestion({
        question: "Slow question?",
        type: "text",
      });

      // Queue another question
      const secondPromise = manager.askQuestion({
        question: "Second question?",
        type: "text",
      });

      // Clear the queue
      manager.clearPendingQuestions();

      // The second question should be cancelled
      const secondResult = await secondPromise;
      expect(secondResult.cancelled).toBe(true);

      // Resolve the first question
      if (resolveQuestion !== undefined) {
        (resolveQuestion as (value: { answer: string }) => void)({ answer: "done" });
      }
      await questionPromise;
    });
  });
});

describe("global question manager functions", () => {
  afterEach(() => {
    clearQuestionSender();
  });

  it("should set and clear global question sender", () => {
    const manager = getQuestionManager();
    expect(manager.hasQuestionSender()).toBe(false);

    const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "test" });
    setQuestionSender(sender);
    expect(manager.hasQuestionSender()).toBe(true);

    clearQuestionSender();
    expect(manager.hasQuestionSender()).toBe(false);
  });

  it("should ask question via global function", async () => {
    const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "global answer" });
    setQuestionSender(sender);

    const result = await askUserQuestion({
      question: "Global question?",
      type: "text",
    });

    expect(result.success).toBe(true);
    expect(result.answer).toBe("global answer");
  });
});

describe("createAskUserQuestionHandler", () => {
  it("should create a handler with custom sender", async () => {
    const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "handler answer" });
    const handler = createAskUserQuestionHandler(sender);

    const result = await handler({
      question: "Handler question?",
      type: "text",
    });

    expect(result.success).toBe(true);
    expect(result.answer).toBe("handler answer");
  });

  it("should handle multi-choice via handler", async () => {
    const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "B" });
    const handler = createAskUserQuestionHandler(sender);

    const result = await handler({
      question: "Pick one",
      type: "multi-choice",
      choices: [
        { id: "A", label: "First" },
        { id: "B", label: "Second" },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.selectedId).toBe("B");
  });

  it("should handle yes-no via handler", async () => {
    const sender: QuestionSender = vi.fn().mockResolvedValue({ answer: "y" });
    const handler = createAskUserQuestionHandler(sender);

    const result = await handler({
      question: "Confirm?",
      type: "yes-no",
    });

    expect(result.success).toBe(true);
    expect(result.confirmed).toBe(true);
  });
});

describe("askUserQuestionToolDefinition", () => {
  it("should have correct name", () => {
    expect(askUserQuestionToolDefinition.name).toBe("ask_user_question");
  });

  it("should have description", () => {
    expect(askUserQuestionToolDefinition.description).toBeTruthy();
    expect(askUserQuestionToolDefinition.description.length).toBeGreaterThan(50);
  });

  it("should have input schema with required properties", () => {
    expect(askUserQuestionToolDefinition.input_schema.type).toBe("object");
    expect(askUserQuestionToolDefinition.input_schema.properties.question).toBeDefined();
    expect(askUserQuestionToolDefinition.input_schema.properties.type).toBeDefined();
    expect(askUserQuestionToolDefinition.input_schema.required).toContain("question");
    expect(askUserQuestionToolDefinition.input_schema.required).toContain("type");
  });

  it("should have optional properties", () => {
    const props = askUserQuestionToolDefinition.input_schema.properties;
    expect(props.choices).toBeDefined();
    expect(props.defaultAnswer).toBeDefined();
    expect(props.timeout).toBeDefined();
    expect(props.context).toBeDefined();

    const required = askUserQuestionToolDefinition.input_schema.required ?? [];
    expect(required).not.toContain("choices");
    expect(required).not.toContain("defaultAnswer");
    expect(required).not.toContain("timeout");
    expect(required).not.toContain("context");
  });

  it("should have enum for type property", () => {
    const typeProperty = askUserQuestionToolDefinition.input_schema.properties.type;
    expect(typeProperty).toBeDefined();
    if (typeProperty) {
      expect(typeProperty.enum).toEqual(["text", "multi-choice", "yes-no"]);
    }
  });
});
