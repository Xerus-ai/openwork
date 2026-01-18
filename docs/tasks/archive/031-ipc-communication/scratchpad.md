# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Notes

Implemented the IPC communication layer for agent-UI communication.

**Architecture Decision**: The agent bridge is a pure IPC layer that emits events for the agent service to handle. This avoids cross-project TypeScript compilation issues between the electron and agent tsconfig files.

**Files Created**:
1. `electron/ipc/message-types.ts` - All IPC message type definitions
2. `electron/ipc/agent-bridge.ts` - Main process IPC bridge
3. `electron/ipc/index.ts` - Module exports
4. `app/lib/ipc-types.ts` - Frontend type definitions (mirrors message-types)
5. `app/lib/ipc-client.ts` - Frontend IPC client with mock support

**Files Modified**:
1. `electron/preload.ts` - Added agent API exposure
2. `electron/main.ts` - Added agent bridge registration

### Key Design Decisions

1. **Decoupled Architecture**: The bridge emits events (`agent:init`, `agent:message`, `agent:stop`, `agent:answer`) that a separate agent service will listen to. This allows the actual Anthropic API integration to be handled separately.

2. **Type Definitions**: Local type definitions in `message-types.ts` to avoid cross-project imports that break TypeScript compilation.

3. **Mock Support**: The frontend IPC client includes mock support for browser testing without Electron.

4. **Streaming**: Support for streaming message chunks from agent to UI.

5. **Question/Answer Flow**: Built-in support for agent questions with pending resolver pattern.

### Commands Run

```bash
npm run build:agent  # Success
npm run build:electron  # Success
npm test  # 66 tests, 1 pre-existing failure in path-utils
```

### Open Questions

1. The app build fails due to PostCSS/Tailwind configuration issue (unrelated to this task)
2. The actual agent integration (connecting to Anthropic API) will be handled in task 032
