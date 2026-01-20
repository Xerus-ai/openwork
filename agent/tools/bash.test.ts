/**
 * Bash Tool Tests
 */

import { describe, expect, it } from "vitest";
import {
  bashToolDefinition,
  createBashToolHandler,
  executeBashCommand,
} from "./bash.js";
import { detectPlatform } from "../shell/index.js";

describe("executeBashCommand", () => {
  describe("basic execution", () => {
    it("should execute a simple echo command", async () => {
      const result = await executeBashCommand({
        command: 'echo "hello world"',
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toLowerCase()).toContain("hello");
      expect(result.output).toBeTruthy();
    });

    it("should execute a list directory command", async () => {
      const result = await executeBashCommand({
        command: "ls",
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBeTruthy();
    });

    it("should return stdout in output field", async () => {
      const result = await executeBashCommand({
        command: 'echo "test output"',
      });

      expect(result.output).toContain("test");
      expect(result.stdout).toContain("test");
    });
  });

  describe("error handling", () => {
    it("should return failure for invalid commands", async () => {
      const result = await executeBashCommand({
        command: "nonexistentcommand12345xyz",
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it("should return failure for commands that exit with non-zero", async () => {
      const result = await executeBashCommand({
        command: "exit 1",
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).toBe(1);
    });

    it("should capture stderr for failing commands", async () => {
      // Use a command that writes to stderr
      const platform = detectPlatform();
      const cmd =
        platform === "windows"
          ? "powershell -Command \"Write-Error 'error message' 2>&1\""
          : "ls /nonexistent_directory_12345";

      const result = await executeBashCommand({ command: cmd });

      expect(result.success).toBe(false);
      // Either stderr or output should contain error info
      expect(result.stderr || result.output).toBeTruthy();
    });
  });

  describe("timeout handling", () => {
    it("should timeout long-running commands", async () => {
      const platform = detectPlatform();
      const sleepCmd =
        platform === "windows" ? "ping -n 10 127.0.0.1" : "sleep 10";

      const result = await executeBashCommand({
        command: sleepCmd,
        timeout: 100,
      });

      expect(result.timedOut).toBe(true);
      expect(result.success).toBe(false);
    });

    it("should use default timeout of 120 seconds", async () => {
      // Just verify the command runs (not timing out with default)
      const result = await executeBashCommand({
        command: 'echo "quick"',
      });

      expect(result.success).toBe(true);
      expect(result.timedOut).toBeUndefined();
    });
  });

  describe("working directory", () => {
    it("should execute commands in specified working directory", async () => {
      const result = await executeBashCommand({
        command: "pwd",
        cwd: "/tmp",
      });

      expect(result.success).toBe(true);
      if (detectPlatform() !== "windows") {
        expect(result.stdout.trim()).toBe("/tmp");
      }
    });

    it("should reject cwd outside workspace when workspace is specified", async () => {
      const result = await executeBashCommand(
        {
          command: "echo test",
          cwd: "/etc",
        },
        "/home/user/project"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("must be within the workspace");
    });

    it("should allow cwd inside workspace", async () => {
      const tmpDir = "/tmp";
      const result = await executeBashCommand(
        {
          command: "pwd",
          cwd: tmpDir,
        },
        "/tmp" // workspace root
      );

      expect(result.success).toBe(true);
    });
  });

  describe("environment variables", () => {
    it("should pass environment variables to command", async () => {
      const platform = detectPlatform();
      const cmd =
        platform === "windows"
          ? "echo $env:MY_TEST_VAR"
          : 'echo "$MY_TEST_VAR"';

      const result = await executeBashCommand({
        command: cmd,
        env: { MY_TEST_VAR: "custom_value_12345" },
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain("custom_value_12345");
    });
  });

  describe("command validation", () => {
    it("should block dangerous format commands", async () => {
      const result = await executeBashCommand({
        command: "format c:",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should block dangerous mkfs commands", async () => {
      const result = await executeBashCommand({
        command: "mkfs.ext4 /dev/sda1",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should block dangerous dd commands", async () => {
      const result = await executeBashCommand({
        command: "dd if=/dev/zero of=/dev/sda",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should block recursive root deletion", async () => {
      const result = await executeBashCommand({
        command: "rm -rf /",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should block sudo rm commands", async () => {
      const result = await executeBashCommand({
        command: "sudo rm -rf /important",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should allow safe commands", async () => {
      const result = await executeBashCommand({
        command: "echo hello",
      });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should allow rm in specific directories", async () => {
      // rm without targeting root should be allowed
      const result = await executeBashCommand({
        command: "rm -rf ./test_temp_dir",
      });

      // Command may fail (dir doesn't exist) but should not be blocked
      // If there's an error, it shouldn't contain "blocked"
      if (result.error) {
        expect(result.error).not.toContain("blocked");
      } else {
        // No error means the command was not blocked
        expect(result.error).toBeUndefined();
      }
    });
  });

  describe("output truncation", () => {
    it("should truncate very long output", async () => {
      // Generate output longer than 30KB
      const platform = detectPlatform();
      const cmd =
        platform === "windows"
          ? "powershell -Command \"'x' * 35000\""
          : "python3 -c \"print('x' * 35000)\" || echo 'x'.repeat(35000) | head -c 35000";

      const result = await executeBashCommand({ command: cmd });

      // If the command succeeded, verify truncation
      if (result.success && result.stdout.length > 30000) {
        expect(result.output.length).toBeLessThanOrEqual(30100);
        expect(result.output).toContain("[Output truncated");
      }
    });
  });
});

describe("bashToolDefinition", () => {
  it("should have correct name", () => {
    expect(bashToolDefinition.name).toBe("bash");
  });

  it("should have description", () => {
    expect(bashToolDefinition.description).toBeTruthy();
    expect(bashToolDefinition.description.length).toBeGreaterThan(50);
  });

  it("should have input schema with required command property", () => {
    expect(bashToolDefinition.input_schema.type).toBe("object");
    expect(bashToolDefinition.input_schema.properties.command).toBeDefined();
    expect(bashToolDefinition.input_schema.required).toContain("command");
  });

  it("should have optional cwd property", () => {
    expect(bashToolDefinition.input_schema.properties.cwd).toBeDefined();
    expect(bashToolDefinition.input_schema.required).not.toContain("cwd");
  });

  it("should have optional timeout property", () => {
    expect(bashToolDefinition.input_schema.properties.timeout).toBeDefined();
    expect(bashToolDefinition.input_schema.required).not.toContain("timeout");
  });
});

describe("createBashToolHandler", () => {
  it("should create a handler function", () => {
    const handler = createBashToolHandler();
    expect(typeof handler).toBe("function");
  });

  it("should execute commands via handler", async () => {
    const handler = createBashToolHandler();
    const result = await handler({ command: 'echo "handler test"' });

    expect(result.success).toBe(true);
    expect(result.stdout.toLowerCase()).toContain("handler test");
  });

  it("should validate workspace path when provided", async () => {
    const handler = createBashToolHandler("/home/project");
    const result = await handler({
      command: "echo test",
      cwd: "/etc",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("workspace");
  });

  it("should allow execution without workspace restriction", async () => {
    const handler = createBashToolHandler();
    const result = await handler({
      command: "echo test",
      cwd: "/tmp",
    });

    expect(result.success).toBe(true);
  });
});
