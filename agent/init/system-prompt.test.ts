/**
 * System Prompt Loader Tests
 *
 * Tests for loading, validating, and formatting the system prompt.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  SystemPromptLoader,
  extendSystemPrompt,
  formatForApi,
  getDefaultLoader,
  resetDefaultLoader,
} from "./system-prompt.js";

describe("SystemPromptLoader", () => {
  const testPromptDir = path.join(process.cwd(), "test-fixtures");
  const testPromptPath = path.join(testPromptDir, "test-system-prompt.md");

  const samplePrompt = `==Test Section==
This is a test system prompt.
It has multiple lines and sections.

==Another Section==
More content here.
`;

  beforeEach(() => {
    // Create test fixtures directory and sample prompt
    if (!fs.existsSync(testPromptDir)) {
      fs.mkdirSync(testPromptDir, { recursive: true });
    }
    fs.writeFileSync(testPromptPath, samplePrompt, "utf-8");
  });

  afterEach(() => {
    // Clean up test fixtures
    if (fs.existsSync(testPromptPath)) {
      fs.unlinkSync(testPromptPath);
    }
    if (fs.existsSync(testPromptDir)) {
      fs.rmdirSync(testPromptDir);
    }
    // Reset default loader between tests
    resetDefaultLoader();
  });

  describe("constructor", () => {
    it("should create loader with default configuration", () => {
      const loader = new SystemPromptLoader();
      expect(loader.getPath()).toBeDefined();
    });

    it("should accept custom path configuration", () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
      });
      expect(loader.getPath()).toBe(testPromptPath);
    });
  });

  describe("load", () => {
    it("should load system prompt from file", async () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
      });

      const result = await loader.load();

      expect(result.content).toBe(samplePrompt);
      expect(result.fromCache).toBe(false);
      expect(result.sourcePath).toBe(testPromptPath);
      expect(result.loadedAt).toBeInstanceOf(Date);
    });

    it("should return cached content on subsequent loads", async () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
        useCache: true,
      });

      const firstResult = await loader.load();
      const secondResult = await loader.load();

      expect(secondResult.fromCache).toBe(true);
      expect(secondResult.content).toBe(firstResult.content);
    });

    it("should return empty string for non-existent file", async () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: "/non/existent/path.md",
      });

      const result = await loader.load();

      expect(result.content).toBe("");
    });
  });

  describe("loadSync", () => {
    it("should load system prompt synchronously", () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
      });

      const result = loader.loadSync();

      expect(result.content).toBe(samplePrompt);
      expect(result.fromCache).toBe(false);
    });

    it("should return empty string for non-existent file", () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: "/non/existent/path.md",
      });

      const result = loader.loadSync();

      expect(result.content).toBe("");
    });
  });

  describe("validate", () => {
    it("should validate non-empty prompt with sections", () => {
      const loader = new SystemPromptLoader();
      const validation = loader.validate(samplePrompt);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      expect(validation.stats.characterCount).toBeGreaterThan(0);
      expect(validation.stats.sectionCount).toBe(2);
    });

    it("should detect empty prompt", () => {
      const loader = new SystemPromptLoader();
      const validation = loader.validate("");

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain("System prompt is empty");
    });

    it("should detect prompt without sections", () => {
      const loader = new SystemPromptLoader();
      const validation = loader.validate("Just some plain text without any section markers.");

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain("System prompt has no recognizable section markers");
    });

    it("should calculate approximate token count", () => {
      const loader = new SystemPromptLoader();
      const validation = loader.validate(samplePrompt);

      // Rough approximation: ~4 chars per token
      const expectedApprox = Math.ceil(samplePrompt.length / 4);
      expect(validation.stats.approximateTokens).toBe(expectedApprox);
    });
  });

  describe("clearCache", () => {
    it("should force reload after cache clear", async () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
        useCache: true,
      });

      // First load caches
      await loader.load();

      // Update the file
      const newContent = "==Updated Content==\nNew prompt content";
      fs.writeFileSync(testPromptPath, newContent, "utf-8");

      // Second load returns cached
      const cachedResult = await loader.load();
      expect(cachedResult.fromCache).toBe(true);
      expect(cachedResult.content).toBe(samplePrompt);

      // Clear cache
      loader.clearCache();

      // Third load reads fresh
      const freshResult = await loader.load();
      expect(freshResult.fromCache).toBe(false);
      expect(freshResult.content).toBe(newContent);
    });
  });

  describe("exists", () => {
    it("should return true for existing file", () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: testPromptPath,
      });

      expect(loader.exists()).toBe(true);
    });

    it("should return false for non-existent file", () => {
      const loader = new SystemPromptLoader({
        systemPromptPath: "/non/existent/path.md",
      });

      expect(loader.exists()).toBe(false);
    });
  });
});

describe("extendSystemPrompt", () => {
  it("should add single additional instruction", () => {
    const base = "Base prompt content";
    const addition = "Additional instruction";

    const result = extendSystemPrompt(base, addition);

    expect(result).toContain(base);
    expect(result).toContain(addition);
    expect(result).toContain("==Additional Instructions==");
  });

  it("should add multiple additional instructions", () => {
    const base = "Base prompt content";
    const additions = ["First instruction", "Second instruction"];

    const result = extendSystemPrompt(base, additions);

    expect(result).toContain("First instruction");
    expect(result).toContain("Second instruction");
  });

  it("should return base prompt for empty additions", () => {
    const base = "Base prompt content";

    expect(extendSystemPrompt(base, [])).toBe(base);
    expect(extendSystemPrompt(base, "")).toBe(base);
    expect(extendSystemPrompt(base, ["", "  "])).toBe(base);
  });
});

describe("formatForApi", () => {
  it("should remove == section markers", () => {
    const input = "==Section Title==\nContent here";
    const result = formatForApi(input);

    expect(result).toBe("Section Title\nContent here");
    expect(result).not.toContain("==");
  });

  it("should handle multiple section markers", () => {
    const input = `==First Section==
First content.

==Second Section==
Second content.`;

    const result = formatForApi(input);

    expect(result).toContain("First Section");
    expect(result).toContain("Second Section");
    expect(result).not.toContain("==");
  });

  it("should trim whitespace", () => {
    const input = "  \n==Section==\nContent  \n\n";
    const result = formatForApi(input);

    expect(result).toBe("Section\nContent");
  });
});

describe("getDefaultLoader", () => {
  it("should return singleton instance", () => {
    const first = getDefaultLoader();
    const second = getDefaultLoader();

    expect(first).toBe(second);
  });

  it("should create new instance after reset", () => {
    const first = getDefaultLoader();
    resetDefaultLoader();
    const second = getDefaultLoader();

    expect(first).not.toBe(second);
  });
});
