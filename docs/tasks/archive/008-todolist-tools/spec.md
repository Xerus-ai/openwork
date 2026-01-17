# Task: Implement TodoList tools (TodoWrite, TodoUpdate, TodoRead)

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create TodoList management tools (TodoWrite, TodoUpdate, TodoRead) for agent progress tracking with state persistence, IPC broadcasting, and proper task lifecycle management.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/tools/todolist.ts | create | TodoList tools implementation |
| agent/tools/types.ts | modify | Add TodoItem, TodoList, TodoState types |
| agent/tools/index.ts | modify | Export TodoList tools |
| agent/state/todolist-manager.ts | create | Centralized TodoList state management |
| agent/tools/todolist.test.ts | create | Unit tests for TodoList operations |

## Blast Radius

- **Scope:** Agent tool and state layer, progress tracking
- **Risk:** medium (central to agent transparency)
- **Rollback:** Remove TodoList tools, no progress visualization

## Implementation Checklist

- [x] Create TodoWrite tool for creating new TodoList
- [x] Create TodoUpdate tool for updating task status
- [x] Create TodoRead tool for retrieving current TodoList
- [x] Implement TodoListManager for centralized state
- [x] Add task states: pending, in_progress, completed, blocked
- [x] Add IPC broadcasting for real-time UI updates
- [x] Implement task validation and conflict resolution
- [x] Add timestamp tracking for task lifecycle
- [x] Write tests for create, update, read, state transitions

## Verification

- [x] TodoWrite: creates new TodoList with tasks
- [x] TodoUpdate: updates task status correctly
- [x] TodoRead: returns current TodoList state
- [x] State transitions: pending -> in_progress -> completed
- [x] IPC broadcast: UI receives updates in real-time (broadcaster pattern implemented)
- [x] Run `npm test` to verify TodoList tests pass (276 tests pass)
- [x] Run `npm run build` to verify TypeScript compiles
- [ ] Integration test with UI (Phase 3 task 034)

## Dependencies

- **Blocks:** 034 (TodoList visualization in StatePane)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** Critical (core transparency feature)
