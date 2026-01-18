# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Understanding the Architecture

The TodoList system has multiple layers:
1. **Agent Backend** (`agent/tools/todolist.ts`, `agent/state/todolist-manager.ts`):
   - TodoListManager handles task state (create, update, status transitions)
   - Broadcaster callback for IPC updates
   - todoWrite, todoUpdate, todoRead functions for tool handling

2. **IPC Layer** (`electron/ipc/`):
   - `message-types.ts`: Defines `AgentTodoUpdate` and `TodoItem` types
   - `agent-bridge.ts`: Has `sendTodoUpdate()` method to push updates to renderer
   - Channel: `AgentChannels.AGENT_TODO_UPDATE` = 'agent:todo-update'

3. **Preload** (`electron/preload.ts`):
   - Already exposes `onTodoUpdate` listener via `electronAgentAPI`

4. **Frontend** (`app/`):
   - `useProgress` hook provides local state management
   - `StatePane` uses `useProgress` for progress data
   - `ProgressSection` displays the task items

### Implementation Summary

#### Files Created
- `app/hooks/useTodoList.ts` - React hook for receiving TodoList updates via IPC
- `electron/ipc/todolist-handlers.ts` - TodoList IPC handlers for broadcasting updates

#### Files Modified
- `electron/ipc/message-types.ts` - Updated TodoItem type with full fields (status, createdAt, updatedAt, blockedReason)
- `electron/ipc/index.ts` - Export new todolist-handlers module
- `electron/ipc/chat-handlers.ts` - Integrate TodoList handlers (init, request ID tracking, cleanup)
- `app/components/StatePane.tsx` - Use useTodoList instead of useProgress
- `app/vite-env.d.ts` - Add ElectronAgentAPI types with full TodoItem definition
- `app/lib/ipc-types.ts` - Update TodoItem type to match backend

### Key Changes

1. **Type Alignment**: TodoItem now has consistent structure across all layers:
   - `status`: 'pending' | 'in_progress' | 'completed' | 'blocked'
   - `createdAt`: ISO timestamp
   - `updatedAt`: ISO timestamp
   - `completedAt`: Optional ISO timestamp
   - `blockedReason`: Optional string

2. **IPC Broadcasting**:
   - `setCurrentRequestId()` tracks active request for broadcasts
   - `createTodoListBroadcaster()` creates broadcaster that calls `bridge.sendTodoUpdate()`
   - `initializeTodoListHandlers()` called during agent initialization

3. **Frontend Integration**:
   - `useTodoList` hook subscribes to `electronAgentAPI.onTodoUpdate`
   - Transforms TodoItem[] to ProgressItem[] for ProgressSection compatibility
   - StatePane now uses useTodoList instead of useProgress

### Commands Run

```bash
npm run build:agent  # Success
npm run build:electron  # Success
npx tsc --project app/tsconfig.json --noEmit  # Success
```

### Verification Status

- [x] TypeScript compiles (agent, electron, app)
- [x] Types are consistent across all layers
- [x] IPC channel properly wired up
- [ ] Manual testing with running app (requires npm run dev)

### Open Questions

- None
