/**
 * String Replace Tool Tests
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createStrReplaceHandler,
  strReplace,
  strReplaceToolDefinition,
} from "./str-replace.js";

describe("strReplace", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "str-replace-test-"));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("basic replacement", () => {
    it("should replace first occurrence of string", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Hello foo, foo is great!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "foo", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.replacementCount).toBe(1);
      expect(result.filePath).toBe(filePath);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Hello bar, foo is great!");
    });

    it("should replace all occurrences when replaceAll is true", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Hello foo, foo is great, foo!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "foo", newString: "bar", replaceAll: true },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.replacementCount).toBe(3);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Hello bar, bar is great, bar!");
    });

    it("should replace with empty string", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Hello world!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "world", newString: "" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.replacementCount).toBe(1);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Hello !");
    });

    it("should handle replacement with longer string", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Say hi!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "hi", newString: "hello world" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Say hello world!");
    });

    it("should handle replacement with shorter string", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Say hello world!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "hello world", newString: "hi" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Say hi!");
    });

    it("should work with absolute paths", async () => {
      const absolutePath = path.join(tempDir, "absolute.txt");
      await fs.writeFile(absolutePath, "Original content");

      const result = await strReplace(
        { filePath: absolutePath, oldString: "Original", newString: "Modified" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(absolutePath);

      const content = await fs.readFile(absolutePath, "utf8");
      expect(content).toBe("Modified content");
    });
  });

  describe("error handling", () => {
    it("should fail if string not found", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Hello world!");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "nonexistent", newString: "replacement" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.replacementCount).toBe(0);
      expect(result.error).toContain("not found");

      // Verify original content unchanged
      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Hello world!");
    });

    it("should fail if file does not exist", async () => {
      const result = await strReplace(
        { filePath: "nonexistent.txt", oldString: "foo", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should fail if oldString is empty", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Content");

      const result = await strReplace(
        { filePath: "test.txt", oldString: "", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should fail if file path is empty", async () => {
      const result = await strReplace(
        { filePath: "", oldString: "foo", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });
  });

  describe("path validation", () => {
    it("should reject path escape with ..", async () => {
      const filePath = path.join(tempDir, "test.txt");
      await fs.writeFile(filePath, "Content");

      const result = await strReplace(
        { filePath: "../outside.txt", oldString: "foo", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("within workspace");
    });

    it("should reject absolute path outside workspace", async () => {
      const outsidePath = path.join(os.tmpdir(), "outside-workspace.txt");

      const result = await strReplace(
        { filePath: outsidePath, oldString: "foo", newString: "bar" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("within workspace");
    });
  });

  describe("line ending preservation", () => {
    it("should preserve CRLF line endings", async () => {
      const filePath = path.join(tempDir, "crlf.txt");
      await fs.writeFile(filePath, "Line 1\r\nLine 2\r\nLine 3\r\n");

      const result = await strReplace(
        { filePath: "crlf.txt", oldString: "Line 2", newString: "Modified Line 2" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Line 1\r\nModified Line 2\r\nLine 3\r\n");
      expect(content).toContain("\r\n");
      expect(content).not.toMatch(/(?<!\r)\n/);
    });

    it("should preserve LF line endings", async () => {
      const filePath = path.join(tempDir, "lf.txt");
      await fs.writeFile(filePath, "Line 1\nLine 2\nLine 3\n");

      const result = await strReplace(
        { filePath: "lf.txt", oldString: "Line 2", newString: "Modified Line 2" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Line 1\nModified Line 2\nLine 3\n");
      expect(content).not.toContain("\r\n");
    });

    it("should handle replacement introducing different line endings", async () => {
      const filePath = path.join(tempDir, "mixed.txt");
      await fs.writeFile(filePath, "Line 1\r\nLine 2\r\nLine 3\r\n");

      // Replace with content that has LF line endings
      const result = await strReplace(
        { filePath: "mixed.txt", oldString: "Line 2", newString: "New\nLine" },
        tempDir
      );

      expect(result.success).toBe(true);

      // The file should preserve CRLF endings
      const content = await fs.readFile(filePath, "utf8");
      expect(content).toContain("\r\n");
    });
  });

  describe("UTF-8 encoding", () => {
    it("should handle UTF-8 content", async () => {
      const filePath = path.join(tempDir, "utf8.txt");
      await fs.writeFile(filePath, "Hello world! Special chars here.");

      const result = await strReplace(
        { filePath: "utf8.txt", oldString: "world", newString: "Unicode world" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Hello Unicode world! Special chars here.");
    });

    it("should replace UTF-8 characters in search string", async () => {
      const filePath = path.join(tempDir, "utf8-search.txt");
      await fs.writeFile(filePath, "Find replacement for special word");

      const result = await strReplace(
        { filePath: "utf8-search.txt", oldString: "special word", newString: "regular" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Find replacement for regular");
    });
  });

  describe("special characters", () => {
    it("should handle regex special characters in old string", async () => {
      const filePath = path.join(tempDir, "regex.txt");
      await fs.writeFile(filePath, "Value is $100.00 (with tax)");

      const result = await strReplace(
        { filePath: "regex.txt", oldString: "$100.00 (with tax)", newString: "$150.00" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Value is $150.00");
    });

    it("should handle brackets and special chars", async () => {
      const filePath = path.join(tempDir, "brackets.txt");
      await fs.writeFile(filePath, "Array: [1, 2, 3]");

      const result = await strReplace(
        { filePath: "brackets.txt", oldString: "[1, 2, 3]", newString: "[4, 5, 6]" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Array: [4, 5, 6]");
    });

    it("should handle asterisks and dots", async () => {
      const filePath = path.join(tempDir, "glob.txt");
      await fs.writeFile(filePath, "Pattern: *.txt");

      const result = await strReplace(
        { filePath: "glob.txt", oldString: "*.txt", newString: "**/*.md" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Pattern: **/*.md");
    });
  });

  describe("multiline content", () => {
    it("should replace across multiple lines", async () => {
      const filePath = path.join(tempDir, "multiline.txt");
      await fs.writeFile(filePath, "function foo() {\n  return 1;\n}");

      const result = await strReplace(
        {
          filePath: "multiline.txt",
          oldString: "function foo() {\n  return 1;\n}",
          newString: "function bar() {\n  return 2;\n}",
        },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("function bar() {\n  return 2;\n}");
    });

    it("should replace only specific part of multiline content", async () => {
      const filePath = path.join(tempDir, "partial.txt");
      await fs.writeFile(
        filePath,
        "Line 1\nLine 2\nLine 3\nLine 4\n"
      );

      const result = await strReplace(
        { filePath: "partial.txt", oldString: "Line 2\nLine 3", newString: "Modified" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Line 1\nModified\nLine 4\n");
    });
  });

  describe("atomic write behavior", () => {
    it("should not leave temp files on success", async () => {
      const filePath = path.join(tempDir, "atomic.txt");
      await fs.writeFile(filePath, "Original content");

      await strReplace(
        { filePath: "atomic.txt", oldString: "Original", newString: "New" },
        tempDir
      );

      // Check no temp files remain
      const files = await fs.readdir(tempDir);
      const tempFiles = files.filter((f) => f.endsWith(".tmp"));
      expect(tempFiles).toHaveLength(0);
    });

    it("should preserve original on validation failure", async () => {
      const filePath = path.join(tempDir, "preserve.txt");
      const originalContent = "Original content";
      await fs.writeFile(filePath, originalContent);

      // Try to replace non-existent string
      await strReplace(
        { filePath: "preserve.txt", oldString: "nonexistent", newString: "new" },
        tempDir
      );

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe(originalContent);
    });
  });

  describe("nested directories", () => {
    it("should work with files in subdirectories", async () => {
      const subDir = path.join(tempDir, "sub", "nested");
      await fs.mkdir(subDir, { recursive: true });

      const filePath = path.join(subDir, "test.txt");
      await fs.writeFile(filePath, "Nested content");

      const result = await strReplace(
        { filePath: "sub/nested/test.txt", oldString: "Nested", newString: "Modified" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(filePath, "utf8");
      expect(content).toBe("Modified content");
    });
  });
});

describe("strReplaceToolDefinition", () => {
  it("should have correct name", () => {
    expect(strReplaceToolDefinition.name).toBe("str_replace");
  });

  it("should have description", () => {
    expect(strReplaceToolDefinition.description).toBeTruthy();
    expect(strReplaceToolDefinition.description.length).toBeGreaterThan(50);
  });

  it("should have input schema with required properties", () => {
    expect(strReplaceToolDefinition.input_schema.type).toBe("object");
    expect(strReplaceToolDefinition.input_schema.properties.filePath).toBeDefined();
    expect(strReplaceToolDefinition.input_schema.properties.oldString).toBeDefined();
    expect(strReplaceToolDefinition.input_schema.properties.newString).toBeDefined();
    expect(strReplaceToolDefinition.input_schema.required).toContain("filePath");
    expect(strReplaceToolDefinition.input_schema.required).toContain("oldString");
    expect(strReplaceToolDefinition.input_schema.required).toContain("newString");
  });

  it("should have optional replaceAll property", () => {
    expect(strReplaceToolDefinition.input_schema.properties.replaceAll).toBeDefined();
    expect(strReplaceToolDefinition.input_schema.required).not.toContain("replaceAll");
  });
});

describe("createStrReplaceHandler", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "str-replace-handler-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should create a handler function", () => {
    const handler = createStrReplaceHandler(tempDir);
    expect(typeof handler).toBe("function");
  });

  it("should replace strings via handler", async () => {
    const filePath = path.join(tempDir, "handler-test.txt");
    await fs.writeFile(filePath, "Handler content");

    const handler = createStrReplaceHandler(tempDir);
    const result = await handler({
      filePath: "handler-test.txt",
      oldString: "Handler",
      newString: "Modified",
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(filePath);

    const content = await fs.readFile(filePath, "utf8");
    expect(content).toBe("Modified content");
  });

  it("should validate workspace path when provided", async () => {
    const handler = createStrReplaceHandler(tempDir);
    const result = await handler({
      filePath: "/etc/passwd",
      oldString: "root",
      newString: "user",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("workspace");
  });
});
