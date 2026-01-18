# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Notes

Implemented workspace folder persistence using electron-store:

1. **Installed electron-store** - Provides simple key-value storage with JSON serialization
2. **Created config module** (`electron/config/`):
   - `app-config.ts` - Generic config storage with typed schema
   - `workspace-config.ts` - Workspace-specific functions (save, load, validate)
   - `index.ts` - Re-exports for clean imports
3. **Added new IPC channels**:
   - `workspace:get-saved` - Get saved workspace from storage
   - `workspace:save` - Save workspace path
   - `workspace:clear` - Clear saved workspace
4. **Updated preload.ts** - Exposed new methods to renderer
5. **Updated useWorkspace hook**:
   - Removed localStorage usage
   - Added `isLoading` state for initial load
   - Loads/validates saved workspace on mount
   - Saves to Electron config on workspace selection
   - Clears config when workspace is cleared

### Commands Run

```bash
npm install electron-store
npm run build:agent && npm run build:electron  # TypeScript compiles
npm run typecheck  # All checks pass
npm test  # 578/579 tests pass (1 pre-existing failure)
```

### Key Design Decisions

1. **electron-store over localStorage**: Electron-store persists to user's app data directory, survives browser storage clearing, and is available to main process
2. **Validation on load**: Always validate saved workspace exists and has permissions on app launch
3. **Clear invalid workspaces**: Auto-clear workspace from storage if validation fails
4. **Async loading**: Added `isLoading` state to handle initial workspace loading

### Files Changed

- `electron/config/app-config.ts` (new)
- `electron/config/workspace-config.ts` (new)
- `electron/config/index.ts` (new)
- `electron/types.ts` (added new types/channels)
- `electron/ipc-handlers.ts` (added handlers, used config module)
- `electron/preload.ts` (exposed new methods)
- `app/hooks/useWorkspace.ts` (rewrote to use Electron config)
- `app/vite-env.d.ts` (added new types)
- `package.json` (added electron-store dependency)

### Open Questions

None - implementation complete.
