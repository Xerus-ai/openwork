/**
 * File Create Tool Tests
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createFile,
  createFileCreateHandler,
  fileCreateToolDefinition,
} from "./file-create.js";

describe("createFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-create-test-"));
  });

  afterEach(async () => {
    // Clean up temporary directory after each test
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("basic file creation", () => {
    it("should create a file in workspace root", async () => {
      const result = await createFile(
        { filePath: "test.txt", content: "Hello, World!" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBe(13);
      expect(result.filePath).toBe(path.join(tempDir, "test.txt"));

      // Verify file exists and has correct content
      const content = await fs.readFile(path.join(tempDir, "test.txt"), "utf8");
      expect(content).toBe("Hello, World!");
    });

    it("should create a file with absolute path", async () => {
      const absolutePath = path.join(tempDir, "absolute.txt");
      const result = await createFile(
        { filePath: absolutePath, content: "Absolute path content" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(absolutePath);

      const content = await fs.readFile(absolutePath, "utf8");
      expect(content).toBe("Absolute path content");
    });

    it("should create file with empty content", async () => {
      const result = await createFile(
        { filePath: "empty.txt", content: "" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBe(0);

      const content = await fs.readFile(path.join(tempDir, "empty.txt"), "utf8");
      expect(content).toBe("");
    });

    it("should create file with UTF-8 content", async () => {
      const unicodeContent = "Hello, World! Contains Unicode characters: Japanese, Chinese, Korean, German, and Spanish.";
      const result = await createFile(
        { filePath: "unicode.txt", content: unicodeContent },
        tempDir
      );

      expect(result.success).toBe(true);
      const content = await fs.readFile(path.join(tempDir, "unicode.txt"), "utf8");
      expect(content).toBe(unicodeContent);
    });
  });

  describe("directory creation", () => {
    it("should create parent directories if missing", async () => {
      const result = await createFile(
        { filePath: "subdir/nested/deep/file.txt", content: "Nested content" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(
        path.join(tempDir, "subdir", "nested", "deep", "file.txt")
      );

      const content = await fs.readFile(
        path.join(tempDir, "subdir", "nested", "deep", "file.txt"),
        "utf8"
      );
      expect(content).toBe("Nested content");
    });

    it("should work when parent directory already exists", async () => {
      // Create parent directory first
      await fs.mkdir(path.join(tempDir, "existing"), { recursive: true });

      const result = await createFile(
        { filePath: "existing/file.txt", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(true);
    });
  });

  describe("path validation", () => {
    it("should reject path escape with ..", async () => {
      const result = await createFile(
        { filePath: "../outside.txt", content: "Escape attempt" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("within workspace");
    });

    it("should reject absolute path outside workspace", async () => {
      const outsidePath = path.join(os.tmpdir(), "outside-workspace.txt");
      const result = await createFile(
        { filePath: outsidePath, content: "Outside workspace" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("within workspace");
    });

    it("should reject empty file path", async () => {
      const result = await createFile(
        { filePath: "", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should reject whitespace-only file path", async () => {
      const result = await createFile(
        { filePath: "   ", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should normalize path separators", async () => {
      // Use forward slashes even on Windows
      const result = await createFile(
        { filePath: "subdir/file.txt", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.filePath).toContain("subdir");
    });
  });

  describe("overwrite behavior", () => {
    it("should fail when file exists and overwrite is false", async () => {
      // Create existing file
      await fs.writeFile(path.join(tempDir, "existing.txt"), "Original content");

      const result = await createFile(
        { filePath: "existing.txt", content: "New content", overwrite: false },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");

      // Verify original content unchanged
      const content = await fs.readFile(path.join(tempDir, "existing.txt"), "utf8");
      expect(content).toBe("Original content");
    });

    it("should overwrite when file exists and overwrite is true", async () => {
      // Create existing file
      await fs.writeFile(path.join(tempDir, "existing.txt"), "Original content");

      const result = await createFile(
        { filePath: "existing.txt", content: "New content", overwrite: true },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.overwritten).toBe(true);

      // Verify new content
      const content = await fs.readFile(path.join(tempDir, "existing.txt"), "utf8");
      expect(content).toBe("New content");
    });

    it("should set overwritten to false when creating new file with overwrite true", async () => {
      const result = await createFile(
        { filePath: "new.txt", content: "Content", overwrite: true },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.overwritten).toBe(false);
    });

    it("should default overwrite to false", async () => {
      // Create existing file
      await fs.writeFile(path.join(tempDir, "default.txt"), "Original");

      const result = await createFile(
        { filePath: "default.txt", content: "New" },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("already exists");
    });
  });

  describe("content size limits", () => {
    it("should reject content exceeding size limit", async () => {
      // Create content larger than 10MB
      const largeContent = "x".repeat(11 * 1024 * 1024);

      const result = await createFile(
        { filePath: "large.txt", content: largeContent },
        tempDir
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("exceeds maximum size");
    });

    it("should accept content at size limit", async () => {
      // Create content exactly at 10MB limit
      const maxContent = "x".repeat(10 * 1024 * 1024);

      const result = await createFile(
        { filePath: "max.txt", content: maxContent },
        tempDir
      );

      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBe(10 * 1024 * 1024);
    });
  });

  describe("special file names", () => {
    it("should handle files with spaces in name", async () => {
      const result = await createFile(
        { filePath: "file with spaces.txt", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(
        path.join(tempDir, "file with spaces.txt"),
        "utf8"
      );
      expect(content).toBe("Content");
    });

    it("should handle files with special characters", async () => {
      const result = await createFile(
        { filePath: "file-name_v1.2.3.txt", content: "Content" },
        tempDir
      );

      expect(result.success).toBe(true);
    });

    it("should handle hidden files (starting with dot)", async () => {
      const result = await createFile(
        { filePath: ".hidden", content: "Hidden content" },
        tempDir
      );

      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tempDir, ".hidden"), "utf8");
      expect(content).toBe("Hidden content");
    });
  });
});

describe("fileCreateToolDefinition", () => {
  it("should have correct name", () => {
    expect(fileCreateToolDefinition.name).toBe("file_create");
  });

  it("should have description", () => {
    expect(fileCreateToolDefinition.description).toBeTruthy();
    expect(fileCreateToolDefinition.description.length).toBeGreaterThan(50);
  });

  it("should have input schema with required properties", () => {
    expect(fileCreateToolDefinition.input_schema.type).toBe("object");
    expect(fileCreateToolDefinition.input_schema.properties.filePath).toBeDefined();
    expect(fileCreateToolDefinition.input_schema.properties.content).toBeDefined();
    expect(fileCreateToolDefinition.input_schema.required).toContain("filePath");
    expect(fileCreateToolDefinition.input_schema.required).toContain("content");
  });

  it("should have optional overwrite property", () => {
    expect(fileCreateToolDefinition.input_schema.properties.overwrite).toBeDefined();
    expect(fileCreateToolDefinition.input_schema.required).not.toContain("overwrite");
  });
});

describe("createFileCreateHandler", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-create-handler-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("should create a handler function", () => {
    const handler = createFileCreateHandler(tempDir);
    expect(typeof handler).toBe("function");
  });

  it("should create files via handler", async () => {
    const handler = createFileCreateHandler(tempDir);
    const result = await handler({ filePath: "handler-test.txt", content: "Handler content" });

    expect(result.success).toBe(true);
    expect(result.filePath).toBe(path.join(tempDir, "handler-test.txt"));
  });

  it("should validate workspace path when provided", async () => {
    const handler = createFileCreateHandler(tempDir);
    const result = await handler({
      filePath: "/etc/passwd",
      content: "Escape attempt",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("workspace");
  });
});
