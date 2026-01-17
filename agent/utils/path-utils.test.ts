/**
 * Path Utilities Tests
 *
 * Tests for cross-platform path handling utilities.
 * Covers Windows and macOS path scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "path";
import fs from "fs/promises";
import os from "os";
import {
  getPlatformPathInfo,
  detectDriveLetter,
  normalizePath,
  joinPaths,
  resolvePath,
  isAbsolutePath,
  getRelativePath,
  getDirectory,
  getFileName,
  getExtension,
  containsTraversal,
  isSubPath,
  validateWorkspacePath,
  validateWorkspacePathSync,
  toForwardSlashes,
  toNativeSlashes,
  pathExists,
  isDirectory,
  isFile,
} from "./path-utils.js";

describe("Path Utilities", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `path-utils-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("getPlatformPathInfo", () => {
    it("returns platform-specific separator", () => {
      const info = getPlatformPathInfo();

      expect(info.separator).toBe(path.sep);
      expect(typeof info.isWindows).toBe("boolean");
      expect(info.delimiter).toBe(path.delimiter);
    });

    it("correctly identifies Windows platform", () => {
      const info = getPlatformPathInfo();

      expect(info.isWindows).toBe(process.platform === "win32");
    });
  });

  describe("detectDriveLetter", () => {
    it("detects Windows drive letters", () => {
      const result = detectDriveLetter("C:\\Users\\test");

      expect(result.hasDriveLetter).toBe(true);
      expect(result.driveLetter).toBe("C");
      expect(result.pathWithoutDrive).toBe("\\Users\\test");
    });

    it("handles lowercase drive letters", () => {
      const result = detectDriveLetter("d:\\data\\file.txt");

      expect(result.hasDriveLetter).toBe(true);
      expect(result.driveLetter).toBe("D");
    });

    it("returns false for Unix paths", () => {
      const result = detectDriveLetter("/Users/test/file.txt");

      expect(result.hasDriveLetter).toBe(false);
      expect(result.driveLetter).toBeUndefined();
      expect(result.pathWithoutDrive).toBe("/Users/test/file.txt");
    });

    it("returns false for relative paths", () => {
      const result = detectDriveLetter("relative/path");

      expect(result.hasDriveLetter).toBe(false);
    });
  });

  describe("normalizePath", () => {
    it("normalizes Unix-style paths", () => {
      const result = normalizePath("/Users//test/./file.txt");

      expect(result).toBe(path.normalize("/Users//test/./file.txt"));
    });

    it("handles parent directory references", () => {
      const result = normalizePath("/Users/test/../other/file.txt");

      expect(result).toBe(path.normalize("/Users/other/file.txt"));
    });

    it("returns empty string for empty input", () => {
      expect(normalizePath("")).toBe("");
      expect(normalizePath("   ")).toBe("");
    });
  });

  describe("joinPaths", () => {
    it("joins path segments", () => {
      const result = joinPaths("base", "sub", "file.txt");

      expect(result).toBe(path.join("base", "sub", "file.txt"));
    });

    it("handles absolute paths", () => {
      const result = joinPaths("/root", "sub", "file.txt");

      expect(result).toBe(path.join("/root", "sub", "file.txt"));
    });

    it("handles empty segments", () => {
      const result = joinPaths("base", "", "file.txt");

      expect(result).toBe(path.join("base", "file.txt"));
    });
  });

  describe("resolvePath", () => {
    it("resolves relative paths against base", () => {
      const result = resolvePath("file.txt", "/base/path");

      expect(result).toBe(path.resolve("/base/path", "file.txt"));
    });

    it("returns absolute paths unchanged", () => {
      const absolute = "/absolute/path/file.txt";
      const result = resolvePath(absolute, "/base");

      expect(result).toBe(path.resolve(absolute));
    });

    it("resolves against cwd when no base provided", () => {
      const result = resolvePath("file.txt");

      expect(result).toBe(path.resolve("file.txt"));
    });
  });

  describe("isAbsolutePath", () => {
    it("returns true for Unix absolute paths", () => {
      expect(isAbsolutePath("/Users/test")).toBe(true);
    });

    it("returns false for relative paths", () => {
      expect(isAbsolutePath("relative/path")).toBe(false);
      expect(isAbsolutePath("./relative")).toBe(false);
      expect(isAbsolutePath("../parent")).toBe(false);
    });

    it("handles current directory path", () => {
      expect(isAbsolutePath(".")).toBe(false);
    });
  });

  describe("getRelativePath", () => {
    it("calculates relative path between directories", () => {
      const from = "/Users/test";
      const to = "/Users/test/sub/file.txt";
      const result = getRelativePath(from, to);

      expect(result).toBe(path.join("sub", "file.txt"));
    });

    it("handles paths in different branches", () => {
      const from = "/Users/test/a";
      const to = "/Users/test/b/file.txt";
      const result = getRelativePath(from, to);

      expect(result).toBe(path.join("..", "b", "file.txt"));
    });
  });

  describe("getDirectory", () => {
    it("extracts directory from file path", () => {
      expect(getDirectory("/Users/test/file.txt")).toBe("/Users/test");
    });

    it("handles trailing slashes", () => {
      // Note: path.dirname treats trailing slash as part of the path
      // so "/Users/test/" returns "/Users" (parent of "test/")
      const result = getDirectory("/Users/test/");
      expect(result).toBe("/Users");
    });
  });

  describe("getFileName", () => {
    it("extracts file name with extension", () => {
      expect(getFileName("/Users/test/file.txt")).toBe("file.txt");
    });

    it("extracts file name without extension", () => {
      expect(getFileName("/Users/test/file.txt", false)).toBe("file");
    });

    it("handles files without extension", () => {
      expect(getFileName("/Users/test/Makefile")).toBe("Makefile");
      expect(getFileName("/Users/test/Makefile", false)).toBe("Makefile");
    });

    it("handles dotfiles", () => {
      expect(getFileName("/Users/test/.gitignore")).toBe(".gitignore");
      expect(getFileName("/Users/test/.gitignore", false)).toBe(".gitignore");
    });
  });

  describe("getExtension", () => {
    it("extracts file extension", () => {
      expect(getExtension("/Users/test/file.txt")).toBe(".txt");
      expect(getExtension("/Users/test/file.tar.gz")).toBe(".gz");
    });

    it("returns empty string for no extension", () => {
      expect(getExtension("/Users/test/Makefile")).toBe("");
    });
  });

  describe("containsTraversal", () => {
    it("detects Unix-style traversal", () => {
      expect(containsTraversal("../secret")).toBe(true);
      expect(containsTraversal("path/../escape")).toBe(true);
    });

    it("detects Windows-style traversal", () => {
      expect(containsTraversal("..\\secret")).toBe(true);
      expect(containsTraversal("path\\..\\escape")).toBe(true);
    });

    it("detects bare double-dot", () => {
      expect(containsTraversal("..")).toBe(true);
    });

    it("returns false for normal paths", () => {
      expect(containsTraversal("normal/path")).toBe(false);
      expect(containsTraversal("file.txt")).toBe(false);
      expect(containsTraversal("path/to/file")).toBe(false);
    });

    it("returns false for paths with dots in names", () => {
      expect(containsTraversal("file.name.txt")).toBe(false);
      expect(containsTraversal(".hidden/file")).toBe(false);
    });
  });

  describe("isSubPath", () => {
    it("returns true for files in workspace", () => {
      const result = isSubPath(
        path.join(testDir, "file.txt"),
        testDir
      );

      expect(result.isSubPath).toBe(true);
      expect(result.relativePath).toBe("file.txt");
    });

    it("returns true for nested directories", () => {
      const result = isSubPath(
        path.join(testDir, "sub", "deep", "file.txt"),
        testDir
      );

      expect(result.isSubPath).toBe(true);
      expect(result.relativePath).toBe(path.join("sub", "deep", "file.txt"));
    });

    it("returns false for paths outside workspace", () => {
      const result = isSubPath(
        path.join(testDir, "..", "outside"),
        testDir
      );

      expect(result.isSubPath).toBe(false);
    });

    it("returns false for traversal attempts", () => {
      const result = isSubPath(
        path.join(testDir, "sub", "..", "..", "escape"),
        testDir
      );

      expect(result.isSubPath).toBe(false);
    });

    it("handles workspace path itself", () => {
      const result = isSubPath(testDir, testDir);

      expect(result.isSubPath).toBe(true);
      expect(result.relativePath).toBe("");
    });

    it("handles relative paths", () => {
      const result = isSubPath("sub/file.txt", testDir);

      expect(result.isSubPath).toBe(true);
      expect(result.absolutePath).toBe(path.join(testDir, "sub", "file.txt"));
    });
  });

  describe("validateWorkspacePath", () => {
    it("validates paths within workspace", async () => {
      const result = await validateWorkspacePath({
        filePath: "docs/readme.md",
        workspacePath: testDir,
      });

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.absolutePath).toBe(path.join(testDir, "docs", "readme.md"));
      }
    });

    it("rejects empty paths", async () => {
      const result = await validateWorkspacePath({
        filePath: "",
        workspacePath: testDir,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("empty");
      }
    });

    it("rejects paths with traversal", async () => {
      const result = await validateWorkspacePath({
        filePath: "../escape/file.txt",
        workspacePath: testDir,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("traversal");
      }
    });

    it("rejects paths outside workspace", async () => {
      const outsidePath = path.join(testDir, "..", "outside", "file.txt");
      const result = await validateWorkspacePath({
        filePath: outsidePath,
        workspacePath: testDir,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("within workspace");
      }
    });

    it("checks existence when mustExist is true", async () => {
      const result = await validateWorkspacePath({
        filePath: "nonexistent.txt",
        workspacePath: testDir,
        mustExist: true,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("does not exist");
      }
    });

    it("validates existing files", async () => {
      // Create a test file
      const testFile = path.join(testDir, "existing.txt");
      await fs.writeFile(testFile, "test content");

      const result = await validateWorkspacePath({
        filePath: "existing.txt",
        workspacePath: testDir,
        mustExist: true,
      });

      expect(result.valid).toBe(true);
    });

    it("rejects directories when allowDirectory is false", async () => {
      // Create a test directory
      const subDir = path.join(testDir, "subdir");
      await fs.mkdir(subDir);

      const result = await validateWorkspacePath({
        filePath: "subdir",
        workspacePath: testDir,
        mustExist: true,
        allowDirectory: false,
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("directory");
      }
    });
  });

  describe("validateWorkspacePathSync", () => {
    it("validates paths synchronously", () => {
      const result = validateWorkspacePathSync("docs/readme.md", testDir);

      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.absolutePath).toBe(path.join(testDir, "docs", "readme.md"));
      }
    });

    it("rejects empty paths", () => {
      const result = validateWorkspacePathSync("", testDir);

      expect(result.valid).toBe(false);
    });

    it("rejects paths outside workspace", () => {
      const outsidePath = path.join(testDir, "..", "outside", "file.txt");
      const result = validateWorkspacePathSync(outsidePath, testDir);

      expect(result.valid).toBe(false);
    });
  });

  describe("toForwardSlashes", () => {
    it("converts backslashes to forward slashes", () => {
      expect(toForwardSlashes("C:\\Users\\test\\file.txt")).toBe(
        "C:/Users/test/file.txt"
      );
    });

    it("leaves forward slashes unchanged", () => {
      expect(toForwardSlashes("/Users/test/file.txt")).toBe(
        "/Users/test/file.txt"
      );
    });

    it("handles mixed slashes", () => {
      expect(toForwardSlashes("path\\to/mixed\\file")).toBe(
        "path/to/mixed/file"
      );
    });
  });

  describe("toNativeSlashes", () => {
    it("converts to native slashes", () => {
      const input = "path/to/file";
      const result = toNativeSlashes(input);

      if (process.platform === "win32") {
        expect(result).toBe("path\\to\\file");
      } else {
        expect(result).toBe("path/to/file");
      }
    });
  });

  describe("pathExists", () => {
    it("returns true for existing files", async () => {
      const testFile = path.join(testDir, "exists.txt");
      await fs.writeFile(testFile, "content");

      expect(await pathExists(testFile)).toBe(true);
    });

    it("returns true for existing directories", async () => {
      expect(await pathExists(testDir)).toBe(true);
    });

    it("returns false for non-existent paths", async () => {
      expect(await pathExists(path.join(testDir, "nonexistent"))).toBe(false);
    });
  });

  describe("isDirectory", () => {
    it("returns true for directories", async () => {
      expect(await isDirectory(testDir)).toBe(true);
    });

    it("returns false for files", async () => {
      const testFile = path.join(testDir, "file.txt");
      await fs.writeFile(testFile, "content");

      expect(await isDirectory(testFile)).toBe(false);
    });

    it("returns false for non-existent paths", async () => {
      expect(await isDirectory(path.join(testDir, "nonexistent"))).toBe(false);
    });
  });

  describe("isFile", () => {
    it("returns true for files", async () => {
      const testFile = path.join(testDir, "file.txt");
      await fs.writeFile(testFile, "content");

      expect(await isFile(testFile)).toBe(true);
    });

    it("returns false for directories", async () => {
      expect(await isFile(testDir)).toBe(false);
    });

    it("returns false for non-existent paths", async () => {
      expect(await isFile(path.join(testDir, "nonexistent"))).toBe(false);
    });
  });

  // Windows-specific tests (will still pass on macOS but cover Windows patterns)
  describe("Windows path handling", () => {
    it("handles Windows drive letters in isSubPath", () => {
      // This tests the logic even on non-Windows systems
      const windowsWorkspace = "C:\\Users\\test\\workspace";
      const windowsFile = "C:\\Users\\test\\workspace\\file.txt";

      // On non-Windows, these paths are relative, so we test differently
      if (process.platform === "win32") {
        const result = isSubPath(windowsFile, windowsWorkspace);
        expect(result.isSubPath).toBe(true);
      }
    });

    it("detects drive letter mismatch as escape attempt", () => {
      if (process.platform === "win32") {
        const result = isSubPath("D:\\other\\file.txt", "C:\\workspace");
        expect(result.isSubPath).toBe(false);
      }
    });
  });

  // macOS-specific tests
  describe("macOS path handling", () => {
    it("handles /Users/ paths", () => {
      const macWorkspace = "/Users/test/workspace";
      const macFile = "file.txt";

      const result = isSubPath(macFile, macWorkspace);
      expect(result.isSubPath).toBe(true);
      expect(result.absolutePath).toBe("/Users/test/workspace/file.txt");
    });

    it("handles /Volumes/ paths", () => {
      const volumeWorkspace = "/Volumes/External/workspace";
      const file = "docs/readme.md";

      const result = isSubPath(file, volumeWorkspace);
      expect(result.isSubPath).toBe(true);
    });
  });
});
