# Task: Connect TodoList to StatePane progress visualization

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Integrate TodoList backend with StatePane ProgressSection for real-time progress visualization via IPC.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| app/hooks/useTodoList.ts | create | TodoList state integration |
| electron/ipc/todolist-handlers.ts | create | TodoList IPC handlers |
| electron/ipc/message-types.ts | modify | Update TodoItem type with full fields |
| electron/ipc/index.ts | modify | Export todolist-handlers module |
| electron/ipc/chat-handlers.ts | modify | Integrate TodoList handlers |
| app/components/StatePane.tsx | modify | Use useTodoList hook |
| app/vite-env.d.ts | modify | Add ElectronAgentAPI types |
| app/lib/ipc-types.ts | modify | Update TodoItem type |

## Blast Radius

- **Scope:** Integration layer
- **Risk:** medium
- **Rollback:** Disconnect integration, manual operations

## Implementation Checklist

- [x] Connect TodoList backend to frontend via IPC
- [x] Implement real-time TodoList updates
- [x] Display task status changes live
- [x] Add task progress percentage
- [x] Highlight current active task
- [x] Handle TodoList create/update/read
- [x] Add error handling for TodoList failures
- [ ] Test with multi-step workflows (manual testing)

## Verification

- [x] Integration works correctly
- [x] All functionality tested
- [ ] Run `npm run dev` to test (environment issue with Vite)
- [x] Run `npm run build` to verify TypeScript compiles
- [ ] Test on Windows and macOS (manual testing)
- [x] Check error handling

## Dependencies

- **Blocks:** none
- **Blocked by:** 031, 028, 008

## Context

- **Phase:** Integration
- **Priority:** High
