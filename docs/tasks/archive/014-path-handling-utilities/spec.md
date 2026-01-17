# Task: Add cross-platform path handling utilities

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create path handling utilities using Node.js path module to normalize separators, validate workspace paths, and handle Windows drive letters vs macOS root paths.

## Effort
- **Effort:** S
- **Tier:** mini

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/utils/path-utils.ts | create | Cross-platform path utilities |
| agent/utils/types.ts | create | Path utility types |
| agent/utils/index.ts | create | Public utils API |
| agent/utils/path-utils.test.ts | create | Unit tests for path operations |

## Blast Radius

- **Scope:** Agent utilities, used by all file operations
- **Risk:** low (isolated utility functions)
- **Rollback:** Remove utilities, manual path handling

## Implementation Checklist

- [x] Create pathUtils module with normalize, join, resolve functions
- [x] Add workspace path validation (prevent directory traversal)
- [x] Implement relative-to-absolute path conversion
- [x] Handle Windows drive letters (C:\, D:\)
- [x] Handle macOS root paths (/Users/, /Volumes/)
- [x] Add path separator detection and normalization
- [x] Create isSubPath validation for workspace containment
- [x] Write tests for Windows and macOS path scenarios

## Verification

- [x] Normalize Windows path: `C:\Users\test` works correctly
- [x] Normalize macOS path: `/Users/test` works correctly
- [x] Join paths: handles separators correctly on both platforms
- [x] Validate workspace: detects `../` escape attempts
- [x] isSubPath: correctly identifies contained paths
- [x] Run `npm test` to verify path util tests pass (66 new tests)
- [x] Run `npm run build` to verify TypeScript compiles
- [ ] Test on Windows and macOS with real paths (deferred to e2e testing)

## Dependencies

- **Blocks:** 004, 005, 006 (file tools need path utilities)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** High (foundation for file operations)
