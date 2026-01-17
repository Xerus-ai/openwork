# Task: Implement cross-platform shell abstraction layer

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create a shell abstraction layer that detects and executes commands on PowerShell/cmd (Windows) and bash/zsh (macOS) transparently, handling platform-specific command translation and path separators.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/shell/shell-executor.ts | create | Core shell detection and execution logic |
| agent/shell/command-mapper.ts | create | Platform-specific command translation |
| agent/shell/types.ts | create | TypeScript interfaces for shell operations |
| agent/shell/index.ts | create | Public API exports |
| agent/shell/command-mapper.test.ts | create | Unit tests for command mapper |
| agent/shell/shell-executor.test.ts | create | Unit tests for shell executor |

## Blast Radius

- **Scope:** Core agent layer, affects all bash tool operations
- **Risk:** high (impacts all shell commands)
- **Rollback:** Remove shell abstraction, fall back to direct shell execution

## Implementation Checklist

- [x] Detect available shell at runtime (PowerShell/cmd on Windows, bash/zsh on macOS)
- [x] Create ShellExecutor class with platform-specific handlers
- [x] Implement command mapper for common commands (ls, cd, mkdir, rm, etc.)
- [x] Handle path separator conversion using Node.js path module
- [x] Add error handling for shell detection failures
- [x] Add timeout and cancellation support for long-running commands
- [x] Create TypeScript types for ShellResult, ShellOptions, ShellType
- [x] Write unit tests for shell detection and command translation

## Verification

- [x] Shell detection works on Windows (PowerShell or cmd)
- [x] Shell detection works on macOS (bash or zsh)
- [x] Common commands execute correctly on both platforms
- [x] Path separators are handled transparently
- [x] Run `npm test` to verify shell abstraction tests pass (47 tests pass)
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Test with actual commands: `ls`, `mkdir test`, `cd test`

## Dependencies

- **Blocks:** 003 (bash tool depends on shell abstraction)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** Critical (foundational for cross-platform support)
