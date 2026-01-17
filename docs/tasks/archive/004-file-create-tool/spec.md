# Task: Implement file_create tool for workspace operations

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create the file_create tool to atomically create new files in the workspace with proper path validation, directory creation, and error handling.

## Effort
- **Effort:** S
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/tools/file-create.ts | create | File creation tool implementation |
| agent/tools/types.ts | modify | Add FileCreateOptions and FileCreateResult types |
| agent/tools/index.ts | modify | Export file_create tool |
| agent/tools/file-create.test.ts | create | Unit tests for file creation |

## Blast Radius

- **Scope:** Agent tool layer, file operations
- **Risk:** medium (isolated to file creation)
- **Rollback:** Remove file_create tool, manual file creation only

## Implementation Checklist

- [ ] Create file_create tool class implementing Agent SDK interface
- [ ] Add workspace path validation to prevent escape
- [ ] Implement atomic file writes (write to temp, then rename)
- [ ] Create parent directories automatically if missing
- [ ] Add UTF-8 encoding by default
- [ ] Handle file already exists error gracefully
- [ ] Add file size limits for safety
- [ ] Use Node.js path module for cross-platform paths
- [ ] Write tests for creation, validation, errors

## Verification

- [ ] Create file in workspace root: `test.txt` with content
- [ ] Create file in subdirectory: `subdir/test.txt` (creates directory)
- [ ] Attempt to create outside workspace: returns error
- [ ] Attempt to overwrite existing file: returns error or overwrites based on flag
- [ ] Run `npm test` to verify file_create tests pass
- [ ] Run `npm run build` to verify TypeScript compiles
- [ ] Test on Windows and macOS with different path separators

## Dependencies

- **Blocks:** 037 (execution view needs file operations)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** Critical (core file operation)
