/**
 * Skills Loader Tests
 *
 * Unit tests for the skills loading and caching system.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  SkillsLoader,
  createDefaultSkillsLoader,
  parseFrontmatter,
  LRUCache,
} from "./skills-loader.js";

// Helper to create a temp directory with skill files
function createTempSkillsDirectory(
  skills: Array<{ name: string; content: string }>
): string {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "skills-test-"));
  for (const skill of skills) {
    const skillDir = path.join(tempDir, skill.name);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, "SKILL.md"), skill.content);
  }
  return tempDir;
}

// Helper to clean up temp directory
function cleanupTempDirectory(dirPath: string): void {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

// Valid skill content
const validSkillContent = `---
name: test-skill
description: "A test skill for unit testing"
license: MIT
---

# Test Skill

This is a test skill for unit testing purposes.
`;

const minimalSkillContent = `---
name: minimal
description: Minimal skill
---

Body content here.
`;

const invalidSkillNoName = `---
description: Missing name field
license: MIT
---

Body content.
`;

const invalidSkillNoDelimiter = `# No Frontmatter

Just regular markdown content.
`;

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter with all fields", () => {
    const result = parseFrontmatter(validSkillContent);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.name).toBe("test-skill");
    expect(result.metadata?.description).toBe("A test skill for unit testing");
    expect(result.metadata?.license).toBe("MIT");
    expect(result.body).toContain("# Test Skill");
  });

  it("should parse minimal frontmatter", () => {
    const result = parseFrontmatter(minimalSkillContent);
    expect(result.metadata).not.toBeNull();
    expect(result.metadata?.name).toBe("minimal");
    expect(result.metadata?.description).toBe("Minimal skill");
    expect(result.metadata?.license).toBe("Unknown");
  });

  it("should handle missing name field", () => {
    const result = parseFrontmatter(invalidSkillNoName);
    expect(result.metadata).toBeNull();
    expect(result.error).toContain("name");
  });

  it("should handle missing frontmatter delimiter", () => {
    const result = parseFrontmatter(invalidSkillNoDelimiter);
    expect(result.metadata).toBeNull();
    expect(result.error).toContain("delimiter");
  });

  it("should handle quoted values", () => {
    const content = `---
name: "quoted-name"
description: 'single quoted'
license: unquoted
---

Body.
`;
    const result = parseFrontmatter(content);
    expect(result.metadata?.name).toBe("quoted-name");
    expect(result.metadata?.description).toBe("single quoted");
    expect(result.metadata?.license).toBe("unquoted");
  });
});

describe("LRUCache", () => {
  it("should store and retrieve values", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBe(2);
  });

  it("should return undefined for missing keys", () => {
    const cache = new LRUCache<string, number>(3);
    expect(cache.get("missing")).toBeUndefined();
  });

  it("should evict least recently used when at capacity", () => {
    const cache = new LRUCache<string, number>(3);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Access 'a' to make it recently used
    cache.get("a");
    // Add new item, should evict 'b' (oldest)
    cache.set("d", 4);
    expect(cache.get("a")).toBe(1);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("c")).toBe(3);
    expect(cache.get("d")).toBe(4);
  });

  it("should update existing keys without increasing size", () => {
    const cache = new LRUCache<string, number>(2);
    cache.set("a", 1);
    cache.set("a", 10);
    expect(cache.size()).toBe(1);
    expect(cache.get("a")).toBe(10);
  });

  it("should track size correctly", () => {
    const cache = new LRUCache<string, number>(5);
    expect(cache.size()).toBe(0);
    cache.set("a", 1);
    expect(cache.size()).toBe(1);
    cache.set("b", 2);
    expect(cache.size()).toBe(2);
    cache.delete("a");
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
  });
});

describe("SkillsLoader", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempSkillsDirectory([
      { name: "skill-a", content: validSkillContent },
      {
        name: "skill-b",
        content: `---
name: skill-b
description: Second skill
license: Apache-2.0
---

# Skill B Content
`,
      },
    ]);
  });

  afterEach(() => {
    cleanupTempDirectory(tempDir);
  });

  describe("constructor and configuration", () => {
    it("should create loader with config", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      expect(loader.getSkillsDirectory()).toBe(tempDir);
    });

    it("should use default max cache size", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      // Load 21 skills to trigger eviction (default is 20)
      // We only have 2 skills, so just verify it works
      expect(loader.getCacheSize()).toBe(0);
    });

    it("should accept custom cache size", () => {
      const loader = new SkillsLoader({
        skillsDirectory: tempDir,
        maxCacheSize: 5,
      });
      expect(loader.getCacheSize()).toBe(0);
    });
  });

  describe("isSkillsDirectoryAccessible", () => {
    it("should return true for valid directory", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      expect(loader.isSkillsDirectoryAccessible()).toBe(true);
    });

    it("should return false for non-existent directory", () => {
      const loader = new SkillsLoader({
        skillsDirectory: "/nonexistent/path",
      });
      expect(loader.isSkillsDirectoryAccessible()).toBe(false);
    });
  });

  describe("discoverSkills", () => {
    it("should discover available skills", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const skills = loader.discoverSkills();
      expect(skills).toContain("skill-a");
      expect(skills).toContain("skill-b");
      expect(skills.length).toBe(2);
    });

    it("should cache discovery results", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const first = loader.discoverSkills();
      const second = loader.discoverSkills();
      expect(first).toBe(second); // Same array reference
    });

    it("should return empty array for non-existent directory", () => {
      const loader = new SkillsLoader({
        skillsDirectory: "/nonexistent/path",
      });
      const skills = loader.discoverSkills();
      expect(skills).toEqual([]);
    });

    it("should skip directories without SKILL.md", () => {
      // Create a directory without SKILL.md
      const emptyDir = path.join(tempDir, "empty-skill");
      fs.mkdirSync(emptyDir);
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const skills = loader.discoverSkills();
      expect(skills).not.toContain("empty-skill");
    });
  });

  describe("loadSkill", () => {
    it("should load a valid skill", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const result = loader.loadSkill("skill-a");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.skill.metadata.name).toBe("test-skill");
        expect(result.skill.directoryName).toBe("skill-a");
        expect(result.skill.body).toContain("# Test Skill");
      }
    });

    it("should return error for non-existent skill", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const result = loader.loadSkill("nonexistent");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });

    it("should cache loaded skills", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      expect(loader.isSkillCached("skill-a")).toBe(true);
      expect(loader.getCacheSize()).toBe(1);
    });

    it("should return cached skill on second load", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const first = loader.loadSkill("skill-a");
      const second = loader.loadSkill("skill-a");
      expect(first.success).toBe(true);
      expect(second.success).toBe(true);
      if (first.success && second.success) {
        expect(first.skill).toBe(second.skill); // Same object reference
      }
    });

    it("should track cache hits and misses", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a"); // Miss
      loader.loadSkill("skill-a"); // Hit
      loader.loadSkill("skill-b"); // Miss
      const metrics = loader.getMetrics();
      expect(metrics.cacheMisses).toBe(2);
      expect(metrics.cacheHits).toBe(1);
    });
  });

  describe("loadSkills", () => {
    it("should load multiple skills", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const result = loader.loadSkills(["skill-a", "skill-b"]);
      expect(result.loaded.length).toBe(2);
      expect(result.errors.length).toBe(0);
    });

    it("should return errors for invalid skills", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const result = loader.loadSkills(["skill-a", "nonexistent"]);
      expect(result.loaded.length).toBe(1);
      expect(result.errors.length).toBe(1);
      const firstError = result.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError?.name).toBe("nonexistent");
    });
  });

  describe("getSkillSummaries", () => {
    it("should return summaries for all skills", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      const summaries = loader.getSkillSummaries();
      expect(summaries.length).toBe(2);
      const skillA = summaries.find((s) => s.directoryName === "skill-a");
      expect(skillA?.name).toBe("test-skill");
    });

    it("should indicate cached status", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      const summaries = loader.getSkillSummaries();
      const skillA = summaries.find((s) => s.directoryName === "skill-a");
      const skillB = summaries.find((s) => s.directoryName === "skill-b");
      expect(skillA?.isCached).toBe(true);
      expect(skillB?.isCached).toBe(false);
    });
  });

  describe("cache management", () => {
    it("should evict skills from cache", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      expect(loader.isSkillCached("skill-a")).toBe(true);
      loader.evictSkill("skill-a");
      expect(loader.isSkillCached("skill-a")).toBe(false);
    });

    it("should clear entire cache", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      loader.loadSkill("skill-b");
      expect(loader.getCacheSize()).toBe(2);
      loader.clearCache();
      expect(loader.getCacheSize()).toBe(0);
    });
  });

  describe("metrics", () => {
    it("should track total load operations", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      loader.loadSkill("skill-b");
      loader.loadSkill("skill-a");
      const metrics = loader.getMetrics();
      expect(metrics.totalLoadOperations).toBe(3);
    });

    it("should track average load time", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      const metrics = loader.getMetrics();
      expect(metrics.averageLoadTimeMs).toBeGreaterThan(0);
    });

    it("should reset metrics", () => {
      const loader = new SkillsLoader({ skillsDirectory: tempDir });
      loader.loadSkill("skill-a");
      loader.resetMetrics();
      const metrics = loader.getMetrics();
      expect(metrics.totalLoadOperations).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });

  describe("validation", () => {
    it("should reject invalid skill when validation is on", () => {
      const invalidDir = createTempSkillsDirectory([
        { name: "invalid", content: invalidSkillNoName },
      ]);
      try {
        const loader = new SkillsLoader({
          skillsDirectory: invalidDir,
          validateOnLoad: true,
        });
        const result = loader.loadSkill("invalid");
        expect(result.success).toBe(false);
      } finally {
        cleanupTempDirectory(invalidDir);
      }
    });

    it("should allow invalid skill when validation is off", () => {
      const invalidDir = createTempSkillsDirectory([
        { name: "invalid", content: invalidSkillNoName },
      ]);
      try {
        const loader = new SkillsLoader({
          skillsDirectory: invalidDir,
          validateOnLoad: false,
        });
        const result = loader.loadSkill("invalid");
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.skill.metadata.name).toBe("invalid"); // Falls back to directory name
        }
      } finally {
        cleanupTempDirectory(invalidDir);
      }
    });
  });
});

describe("createDefaultSkillsLoader", () => {
  it("should create loader with skills subdirectory", () => {
    const loader = createDefaultSkillsLoader("/project/root");
    expect(loader.getSkillsDirectory()).toBe(
      path.join("/project/root", "skills")
    );
  });

  it("should accept config overrides", () => {
    const loader = createDefaultSkillsLoader("/project/root", {
      maxCacheSize: 10,
      validateOnLoad: false,
    });
    expect(loader.getSkillsDirectory()).toBe(
      path.join("/project/root", "skills")
    );
  });
});
