/**
 * Shell Executor Tests
 */

import { describe, expect, it, beforeEach } from "vitest";
import {
  createShellExecutor,
  detectPlatform,
  detectShellEnvironment,
  getShellExecutor,
  ShellExecutor,
} from "./shell-executor.js";

describe("detectPlatform", () => {
  it("should return a valid platform", () => {
    const platform = detectPlatform();
    expect(["windows", "macos", "linux"]).toContain(platform);
  });

  it("should match process.platform", () => {
    const platform = detectPlatform();
    if (process.platform === "win32") {
      expect(platform).toBe("windows");
    } else if (process.platform === "darwin") {
      expect(platform).toBe("macos");
    } else {
      expect(platform).toBe("linux");
    }
  });
});

describe("detectShellEnvironment", () => {
  it("should detect available shells", async () => {
    const env = await detectShellEnvironment();

    expect(env).toHaveProperty("platform");
    expect(env).toHaveProperty("availableShells");
    expect(env).toHaveProperty("preferredShell");
    expect(Array.isArray(env.availableShells)).toBe(true);
    expect(env.availableShells.length).toBeGreaterThan(0);
  });

  it("should have a valid preferred shell", async () => {
    const env = await detectShellEnvironment();

    expect(env.preferredShell).toHaveProperty("type");
    expect(env.preferredShell).toHaveProperty("executable");
    expect(env.preferredShell).toHaveProperty("args");
    expect(Array.isArray(env.preferredShell.args)).toBe(true);
  });

  it("should have correct shell types for platform", async () => {
    const env = await detectShellEnvironment();

    if (env.platform === "windows") {
      const types = env.availableShells.map((s) => s.type);
      expect(types.some((t) => t === "powershell" || t === "cmd")).toBe(true);
    } else {
      const types = env.availableShells.map((s) => s.type);
      expect(types.some((t) => t === "bash" || t === "zsh")).toBe(true);
    }
  });
});

describe("ShellExecutor", () => {
  let executor: ShellExecutor;

  beforeEach(() => {
    executor = createShellExecutor();
  });

  describe("initialization", () => {
    it("should not be initialized before first command", () => {
      expect(executor.isInitialized()).toBe(false);
    });

    it("should be initialized after calling initialize()", async () => {
      await executor.initialize();
      expect(executor.isInitialized()).toBe(true);
    });

    it("should only initialize once", async () => {
      await executor.initialize();
      await executor.initialize();
      expect(executor.isInitialized()).toBe(true);
    });
  });

  describe("execute", () => {
    it("should execute a simple echo command", async () => {
      const result = await executor.execute('echo "hello"');

      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("exitCode");
      expect(result).toHaveProperty("stdout");
      expect(result).toHaveProperty("stderr");

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("hello");
    });

    it("should return failure for invalid commands", async () => {
      const result = await executor.execute("nonexistentcommand12345");

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it("should respect timeout option", async () => {
      // Use a command that takes a while
      const platform = detectPlatform();
      const sleepCmd =
        platform === "windows" ? "ping -n 5 127.0.0.1" : "sleep 5";

      const result = await executor.execute(sleepCmd, { timeout: 100 });

      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
    });

    it("should respect cwd option", async () => {
      const result = await executor.execute("pwd", { cwd: "/tmp" });

      expect(result.success).toBe(true);
      // On Unix, pwd should output /tmp
      // On Windows, the translation will vary
      if (detectPlatform() !== "windows") {
        expect(result.stdout.trim()).toBe("/tmp");
      }
    });

    it("should handle environment variables", async () => {
      const result = await executor.execute('echo "$TEST_VAR"', {
        env: { TEST_VAR: "test_value" },
      });

      expect(result.success).toBe(true);
      // Behavior varies by shell, just check command ran
      expect(result.exitCode).toBe(0);
    });

    it("should support cancellation via AbortSignal", async () => {
      const controller = new AbortController();

      // Start a long-running command
      const platform = detectPlatform();
      const sleepCmd =
        platform === "windows" ? "ping -n 10 127.0.0.1" : "sleep 10";

      const executePromise = executor.execute(sleepCmd, {
        signal: controller.signal,
      });

      // Cancel after a short delay
      setTimeout(() => controller.abort(), 50);

      const result = await executePromise;

      expect(result.cancelled).toBe(true);
      expect(result.success).toBe(false);
    });
  });

  describe("getEnvironment", () => {
    it("should throw if not initialized", () => {
      expect(() => executor.getEnvironment()).toThrow(
        "ShellExecutor not initialized"
      );
    });

    it("should return environment after initialization", async () => {
      await executor.initialize();
      const env = executor.getEnvironment();

      expect(env).toHaveProperty("platform");
      expect(env).toHaveProperty("availableShells");
      expect(env).toHaveProperty("preferredShell");
    });
  });

  describe("getPlatform", () => {
    it("should return platform after initialization", async () => {
      await executor.initialize();
      const platform = executor.getPlatform();

      expect(["windows", "macos", "linux"]).toContain(platform);
    });
  });

  describe("getPreferredShell", () => {
    it("should return preferred shell after initialization", async () => {
      await executor.initialize();
      const shell = executor.getPreferredShell();

      expect(shell).toHaveProperty("type");
      expect(shell).toHaveProperty("executable");
      expect(shell).toHaveProperty("args");
    });
  });
});

describe("getShellExecutor", () => {
  it("should return a ShellExecutor instance", () => {
    const executor = getShellExecutor();
    expect(executor).toBeInstanceOf(ShellExecutor);
  });

  it("should return the same instance on multiple calls", () => {
    const executor1 = getShellExecutor();
    const executor2 = getShellExecutor();
    expect(executor1).toBe(executor2);
  });
});

describe("createShellExecutor", () => {
  it("should create a new instance each time", () => {
    const executor1 = createShellExecutor();
    const executor2 = createShellExecutor();
    expect(executor1).not.toBe(executor2);
  });
});
