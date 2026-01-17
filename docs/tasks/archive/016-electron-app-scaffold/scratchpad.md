# Scratchpad

Working notes during implementation.

---

## Session 2026-01-17

### Approach

Created the Electron app scaffold with these key components:
1. **electron/types.ts** - IPC channel constants and TypeScript types for communication
2. **electron/window-manager.ts** - Window creation with security settings (CSP, sandbox, context isolation)
3. **electron/ipc-handlers.ts** - Main process IPC handlers (ping/pong, window controls, devtools)
4. **electron/preload.ts** - contextBridge API exposed to renderer
5. **electron/main.ts** - App lifecycle management, initialization, security hardening

### Key Decisions

1. **Separate tsconfig files**: Created `tsconfig.agent.json` and `tsconfig.electron.json` with proper rootDir/outDir settings to output to `dist/agent/` and `dist/electron/`

2. **Security-first approach**:
   - `nodeIntegration: false` - No Node.js in renderer
   - `contextIsolation: true` - Isolated context for security
   - `sandbox: true` - Sandboxed renderer process
   - Content Security Policy headers set

3. **Single instance lock**: Prevents multiple app instances, focuses existing window when second instance attempted

4. **ESM compatibility**: Using `fileURLToPath` and `import.meta.url` for __dirname

### Commands Run

```bash
# Install Electron and dependencies
npm install --save-dev electron electron-builder cross-env

# Build and test
npm run build:electron  # TypeScript compiles successfully
npm run build           # Full build (agent + electron) succeeds
npm test                # All 579 tests pass
```

### Open Questions

1. The app cannot be tested in this headless environment (no display). Verification will need to happen on a real Windows/macOS machine with a display.

2. The React frontend (tasks 017-018) needs to be created before the Electron app can fully function - currently it will try to load from Vite dev server or a file that doesn't exist.

### Files Created

| File | Purpose |
|------|---------|
| electron/types.ts | IPC types and channel constants |
| electron/window-manager.ts | Window creation and management |
| electron/ipc-handlers.ts | IPC message handlers |
| electron/preload.ts | contextBridge API |
| electron/main.ts | Main process entry point |
| tsconfig.electron.json | Electron TypeScript config |

### Verification Status

- [x] TypeScript compiles without errors
- [x] All existing tests pass
- [ ] App launches successfully (requires display)
- [ ] IPC ping/pong works (requires display)
- [ ] Window displays correctly (requires display)
