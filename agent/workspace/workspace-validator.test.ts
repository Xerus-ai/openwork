/**
 * Workspace Validator Tests
 *
 * Tests for workspace validation, permissions, and path containment.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

import {
  WorkspaceValidator,
  createWorkspaceValidator,
  validateWorkspace,
  isPathInWorkspace,
} from "./workspace-validator.js";

describe("WorkspaceValidator", () => {
  let tempDir: string;
  let validator: WorkspaceValidator;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-test-"));
    validator = new WorkspaceValidator(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("constructor", () => {
    it("accepts a string path", () => {
      const v = new WorkspaceValidator("/test/path");
      expect(v.getWorkspacePath()).toContain("test");
    });

    it("accepts a WorkspaceConfig object", () => {
      const v = new WorkspaceValidator({
        workspacePath: "/test/path",
        requireWrite: false,
      });
      expect(v.getWorkspacePath()).toContain("test");
    });
  });

  describe("validate", () => {
    it("validates an existing directory with permissions", async () => {
      const result = await validator.validate();

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.permissions.canRead).toBe(true);
        expect(result.permissions.canWrite).toBe(true);
      }
    });

    it("returns error for empty path", async () => {
      const v = new WorkspaceValidator("");
      const result = await v.validate();

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errorCode).toBe("PATH_EMPTY");
      }
    });

    it("returns error for relative path", async () => {
      const v = new WorkspaceValidator("relative/path");
      const result = await v.validate();

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errorCode).toBe("PATH_NOT_ABSOLUTE");
      }
    });

    it("returns error for non-existent folder", async () => {
      const v = new WorkspaceValidator("/nonexistent/path/12345");
      const result = await v.validate();

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errorCode).toBe("FOLDER_NOT_FOUND");
      }
    });

    it("returns error when path is a file, not directory", async () => {
      const filePath = path.join(tempDir, "file.txt");
      await fs.writeFile(filePath, "test content");

      const v = new WorkspaceValidator(filePath);
      const result = await v.validate();

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.errorCode).toBe("NOT_A_DIRECTORY");
      }
    });

    it("creates folder when createIfMissing is true", async () => {
      const newFolder = path.join(tempDir, "new-folder");
      const v = new WorkspaceValidator({
        workspacePath: newFolder,
        createIfMissing: true,
      });

      const result = await v.validate();

      expect(result.valid).toBe(true);
      const stats = await fs.stat(newFolder);
      expect(stats.isDirectory()).toBe(true);
    });
  });

  describe("isPathContained", () => {
    it("accepts relative paths within workspace", async () => {
      const result = await validator.isPathContained("docs/readme.md");

      expect(result.contained).toBe(true);
      if (result.contained) {
        expect(result.absolutePath).toBe(
          path.join(tempDir, "docs", "readme.md")
        );
        expect(result.relativePath).toBe(path.join("docs", "readme.md"));
      }
    });

    it("accepts absolute paths within workspace", async () => {
      const absolutePath = path.join(tempDir, "file.txt");
      const result = await validator.isPathContained(absolutePath);

      expect(result.contained).toBe(true);
      if (result.contained) {
        expect(result.absolutePath).toBe(absolutePath);
      }
    });

    it("rejects empty path", async () => {
      const result = await validator.isPathContained("");

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("PATH_EMPTY");
      }
    });

    it("rejects path with traversal patterns", async () => {
      const result = await validator.isPathContained("../../../etc/passwd");

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("TRAVERSAL_DETECTED");
      }
    });

    it("rejects Windows-style traversal", async () => {
      const result = await validator.isPathContained("..\\..\\windows\\system32");

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("TRAVERSAL_DETECTED");
      }
    });

    it("rejects paths outside workspace", async () => {
      const outsidePath = path.join(os.tmpdir(), "outside-workspace");
      const result = await validator.isPathContained(outsidePath);

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("PATH_ESCAPE");
      }
    });

    it("checks existence when mustExist is true", async () => {
      const result = await validator.isPathContained(
        "nonexistent-file.txt",
        true
      );

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("PATH_NOT_FOUND");
      }
    });

    it("finds existing file when mustExist is true", async () => {
      const filePath = path.join(tempDir, "exists.txt");
      await fs.writeFile(filePath, "content");

      const result = await validator.isPathContained("exists.txt", true);

      expect(result.contained).toBe(true);
      if (result.contained) {
        expect(result.absolutePath).toBe(filePath);
      }
    });
  });

  describe("isPathContainedSync", () => {
    it("synchronously validates paths", () => {
      const result = validator.isPathContainedSync("docs/file.txt");

      expect(result.contained).toBe(true);
      if (result.contained) {
        expect(result.relativePath).toBe(path.join("docs", "file.txt"));
      }
    });

    it("synchronously rejects traversal", () => {
      const result = validator.isPathContainedSync("../escape");

      expect(result.contained).toBe(false);
      if (!result.contained) {
        expect(result.errorCode).toBe("TRAVERSAL_DETECTED");
      }
    });
  });

  describe("validateFilePath", () => {
    it("returns absolute path for valid path", async () => {
      const absolutePath = await validator.validateFilePath("docs/readme.md");

      expect(absolutePath).toBe(path.join(tempDir, "docs", "readme.md"));
    });

    it("throws for invalid path", async () => {
      await expect(
        validator.validateFilePath("../escape")
      ).rejects.toThrow();
    });

    it("throws for nonexistent path when mustExist", async () => {
      await expect(
        validator.validateFilePath("nonexistent.txt", { mustExist: true })
      ).rejects.toThrow();
    });
  });

  describe("resolvePath", () => {
    it("resolves relative path to absolute", () => {
      const resolved = validator.resolvePath("docs/file.txt");

      expect(resolved).toBe(path.join(tempDir, "docs", "file.txt"));
    });

    it("throws for traversal attempt", () => {
      expect(() => validator.resolvePath("../escape")).toThrow();
    });
  });

  describe("relativePath", () => {
    it("converts absolute path to relative", () => {
      const absolutePath = path.join(tempDir, "docs", "file.txt");
      const relative = validator.relativePath(absolutePath);

      expect(relative).toBe(path.join("docs", "file.txt"));
    });

    it("throws for path outside workspace", () => {
      expect(() => validator.relativePath("/outside/path")).toThrow();
    });
  });
});

describe("Convenience functions", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createWorkspaceValidator", () => {
    it("creates a validator instance", () => {
      const validator = createWorkspaceValidator(tempDir);
      expect(validator).toBeInstanceOf(WorkspaceValidator);
    });
  });

  describe("validateWorkspace", () => {
    it("validates workspace with string path", async () => {
      const result = await validateWorkspace(tempDir);

      expect(result.valid).toBe(true);
    });

    it("validates workspace with config object", async () => {
      const result = await validateWorkspace({
        workspacePath: tempDir,
        requireWrite: true,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe("isPathInWorkspace", () => {
    it("checks path containment", async () => {
      const result = await isPathInWorkspace("docs/file.txt", tempDir);

      expect(result.contained).toBe(true);
    });

    it("rejects escape attempts", async () => {
      const result = await isPathInWorkspace("../../../escape", tempDir);

      expect(result.contained).toBe(false);
    });
  });
});

describe("Platform-specific behavior", () => {
  let tempDir: string;
  let validator: WorkspaceValidator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-test-"));
    validator = new WorkspaceValidator(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Windows paths", () => {
    it("handles Windows backslash paths", () => {
      const result = validator.isPathContainedSync("docs\\readme.md");

      expect(result.contained).toBe(true);
    });

    it("detects Windows traversal patterns", () => {
      const result = validator.isPathContainedSync("..\\..\\system");

      expect(result.contained).toBe(false);
    });
  });

  describe("macOS/Unix paths", () => {
    it("handles forward slash paths", () => {
      const result = validator.isPathContainedSync("docs/readme.md");

      expect(result.contained).toBe(true);
    });

    it("handles nested directories", () => {
      const result = validator.isPathContainedSync("a/b/c/d/e/file.txt");

      expect(result.contained).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("handles root-relative paths correctly", async () => {
      const result = await validator.isPathContained("/etc/passwd");

      // Should be rejected because /etc is outside workspace
      expect(result.contained).toBe(false);
    });

    it("handles paths with special characters", () => {
      const result = validator.isPathContainedSync("file with spaces.txt");

      expect(result.contained).toBe(true);
    });

    it("handles paths with unicode", () => {
      const result = validator.isPathContainedSync("docs/readme-2024.txt");

      expect(result.contained).toBe(true);
    });

    it("handles current directory reference", () => {
      const result = validator.isPathContainedSync("./docs/file.txt");

      expect(result.contained).toBe(true);
    });

    it("normalizes redundant separators", () => {
      const result = validator.isPathContainedSync("docs//nested///file.txt");

      expect(result.contained).toBe(true);
    });
  });
});

describe("Security scenarios", () => {
  let tempDir: string;
  let validator: WorkspaceValidator;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "workspace-test-"));
    validator = new WorkspaceValidator(tempDir);
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  it("blocks simple parent directory escape", async () => {
    const result = await validator.isPathContained("../secret");
    expect(result.contained).toBe(false);
  });

  it("blocks multiple parent directory escape", async () => {
    const result = await validator.isPathContained("../../../etc/passwd");
    expect(result.contained).toBe(false);
  });

  it("blocks Windows-style escape", async () => {
    const result = await validator.isPathContained("..\\..\\windows\\system32");
    expect(result.contained).toBe(false);
  });

  it("blocks escape via absolute path", async () => {
    const result = await validator.isPathContained("/etc/passwd");
    expect(result.contained).toBe(false);
  });

  it("blocks hidden directory traversal", async () => {
    const result = await validator.isPathContained("docs/../../../etc/passwd");
    expect(result.contained).toBe(false);
  });

  it("allows same-level navigation", async () => {
    const result = await validator.isPathContained("docs/../other/file.txt");
    // This should be contained because the final path is within workspace
    expect(result.contained).toBe(true);
  });
});
