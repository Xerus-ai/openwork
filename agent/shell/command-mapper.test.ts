/**
 * Command Mapper Tests
 */

import { describe, expect, it } from "vitest";
import {
  getCommandMappings,
  needsTranslation,
  translateCommand,
} from "./command-mapper.js";

describe("translateCommand", () => {
  describe("Unix shells (bash/zsh)", () => {
    it("should not translate commands for bash", () => {
      expect(translateCommand("ls -la", "bash")).toBe("ls -la");
      expect(translateCommand("cat file.txt", "bash")).toBe("cat file.txt");
      expect(translateCommand("mkdir test", "bash")).toBe("mkdir test");
    });

    it("should not translate commands for zsh", () => {
      expect(translateCommand("ls -la", "zsh")).toBe("ls -la");
      expect(translateCommand("cat file.txt", "zsh")).toBe("cat file.txt");
      expect(translateCommand("rm -rf dir", "zsh")).toBe("rm -rf dir");
    });
  });

  describe("PowerShell translation", () => {
    it("should translate ls to Get-ChildItem", () => {
      expect(translateCommand("ls", "powershell")).toBe("Get-ChildItem");
    });

    it("should translate ls with flags", () => {
      expect(translateCommand("ls -la", "powershell")).toBe("Get-ChildItem -Force");
      expect(translateCommand("ls -l", "powershell")).toBe("Get-ChildItem");
      expect(translateCommand("ls -a", "powershell")).toBe("Get-ChildItem -Force");
    });

    it("should translate ls with path argument", () => {
      expect(translateCommand("ls /home/user", "powershell")).toBe(
        "Get-ChildItem /home/user"
      );
    });

    it("should translate cat to Get-Content", () => {
      expect(translateCommand("cat", "powershell")).toBe("Get-Content");
      expect(translateCommand("cat file.txt", "powershell")).toBe(
        "Get-Content file.txt"
      );
    });

    it("should translate pwd to Get-Location", () => {
      expect(translateCommand("pwd", "powershell")).toBe("Get-Location");
    });

    it("should translate rm commands", () => {
      expect(translateCommand("rm file.txt", "powershell")).toBe(
        "Remove-Item file.txt"
      );
      expect(translateCommand("rm -rf dir", "powershell")).toBe(
        "Remove-Item -Recurse -Force dir"
      );
    });

    it("should translate mkdir", () => {
      expect(translateCommand("mkdir test", "powershell")).toBe(
        "New-Item -ItemType Directory -Name test"
      );
    });

    it("should translate cp and mv", () => {
      expect(translateCommand("cp src dest", "powershell")).toBe(
        "Copy-Item src dest"
      );
      expect(translateCommand("mv old new", "powershell")).toBe(
        "Move-Item old new"
      );
    });

    it("should translate grep to Select-String", () => {
      expect(translateCommand("grep pattern file.txt", "powershell")).toBe(
        "Select-String pattern file.txt"
      );
    });

    it("should translate echo to Write-Output", () => {
      expect(translateCommand("echo hello", "powershell")).toBe(
        "Write-Output hello"
      );
    });

    it("should translate clear to Clear-Host", () => {
      expect(translateCommand("clear", "powershell")).toBe("Clear-Host");
    });

    it("should pass through unknown commands", () => {
      expect(translateCommand("npm install", "powershell")).toBe("npm install");
      expect(translateCommand("node script.js", "powershell")).toBe(
        "node script.js"
      );
    });
  });

  describe("cmd translation", () => {
    it("should translate ls to dir", () => {
      expect(translateCommand("ls", "cmd")).toBe("dir");
    });

    it("should translate cat to type", () => {
      expect(translateCommand("cat file.txt", "cmd")).toBe("type file.txt");
    });

    it("should translate rm to del", () => {
      expect(translateCommand("rm file.txt", "cmd")).toBe("del file.txt");
    });

    it("should translate grep to findstr", () => {
      expect(translateCommand("grep pattern file.txt", "cmd")).toBe(
        "findstr pattern file.txt"
      );
    });

    it("should translate clear to cls", () => {
      expect(translateCommand("clear", "cmd")).toBe("cls");
    });
  });
});

describe("needsTranslation", () => {
  it("should return false for bash", () => {
    expect(needsTranslation("ls", "bash")).toBe(false);
    expect(needsTranslation("cat file.txt", "bash")).toBe(false);
  });

  it("should return false for zsh", () => {
    expect(needsTranslation("ls", "zsh")).toBe(false);
  });

  it("should return true for known commands on PowerShell", () => {
    expect(needsTranslation("ls", "powershell")).toBe(true);
    expect(needsTranslation("cat file.txt", "powershell")).toBe(true);
    expect(needsTranslation("grep pattern", "powershell")).toBe(true);
  });

  it("should return false for unknown commands on PowerShell", () => {
    expect(needsTranslation("npm install", "powershell")).toBe(false);
    expect(needsTranslation("node script.js", "powershell")).toBe(false);
  });

  it("should return true for known commands on cmd", () => {
    expect(needsTranslation("ls", "cmd")).toBe(true);
    expect(needsTranslation("cat file.txt", "cmd")).toBe(true);
  });
});

describe("getCommandMappings", () => {
  it("should return an array of mappings", () => {
    const mappings = getCommandMappings();
    expect(Array.isArray(mappings)).toBe(true);
    expect(mappings.length).toBeGreaterThan(0);
  });

  it("should have required properties for each mapping", () => {
    const mappings = getCommandMappings();
    for (const mapping of mappings) {
      expect(mapping).toHaveProperty("unix");
      expect(mapping).toHaveProperty("powershell");
      expect(mapping).toHaveProperty("cmd");
      expect(typeof mapping.unix).toBe("string");
      expect(typeof mapping.powershell).toBe("string");
      expect(typeof mapping.cmd).toBe("string");
    }
  });
});
