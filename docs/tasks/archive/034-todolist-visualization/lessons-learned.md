# Lessons Learned

## What Went Well
- Existing IPC infrastructure (AgentBridge, preload) was well-designed for extension
- TodoListManager already had broadcaster support - just needed to connect it
- Type definitions in multiple places (electron/ipc, app/lib, app/vite-env.d.ts) were consistent
- The ProgressSection component worked as a drop-in replacement (same props interface)

## What Was Tricky
- Type consistency across three TypeScript projects (agent, electron, app)
- The app/vite-env.d.ts needed the full ElectronAgentAPI type definitions
- Duplicate type definitions in app/lib/ipc-types.ts needed to be updated along with electron/ipc/message-types.ts
- Understanding the request ID tracking for correlating broadcasts with active requests

## Unexpected Discoveries
- The TodoItem type in IPC was missing several fields (createdAt, updatedAt, blocked status)
- The preload script already had onTodoUpdate exposed, just needed the types aligned
- The broadcaster pattern in TodoListManager is elegant - single callback handles all updates

## Recommendations
- Consider generating types from a single source (e.g., using zod or io-ts for shared schemas)
- Add integration tests that verify IPC message flow end-to-end
- Document the request ID tracking pattern for future integrations
- The useTodoList hook could be extended to support optimistic updates
