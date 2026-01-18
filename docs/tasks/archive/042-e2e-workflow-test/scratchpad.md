# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Notes

**Build Dependency Issues Fixed**
The project had npm optional dependency issues on Windows. The package-lock.json was originally created on Linux, causing these modules to not install on Windows:
- `@rollup/rollup-win32-x64-msvc`
- `lightningcss-win32-x64-msvc`
- `@tailwindcss/oxide-win32-x64-msvc`

Fixed by explicitly installing these as devDependencies in package.json.

**Application Startup Verified**
- Vite dev server starts successfully on http://localhost:5173
- Electron app starts and initializes correctly
- AgentBridge initialized successfully
- Window created and rendered properly

**Unit Tests**
- 578/579 tests passing
- 1 test fails due to platform-specific path handling (macOS test on Windows - expected)

**Blocking Issue: API Key**
The ANTHROPIC_API_KEY environment variable is not set, which blocks testing of:
- Chat functionality
- File creation workflows
- TodoList progress tracking
- AskUserQuestion clarifications

### Commands Run

```bash
# Verified build
npm run build  # All 3 stages pass (agent, electron, app)

# Installed Windows native modules
npm install --save-dev @rollup/rollup-win32-x64-msvc@4.55.1 lightningcss-win32-x64-msvc@1.30.2
npm install --save-dev @tailwindcss/oxide-win32-x64-msvc

# Run unit tests
npm test  # 578/579 passing

# Start dev server
npm run dev  # Starts on localhost:5173

# Start electron app
npm run electron:dev  # Window opens, agent bridge initializes
```

### Test Results Created

- `docs/testing/e2e-test-plan.md` - Detailed test plan with 15 test scenarios
- `docs/testing/workflow-results.md` - Current test results and status

### Completed Verifications

1. Build compiles successfully (TypeScript for agent, electron, and Vite for app)
2. Unit tests run (578/579 passing)
3. Vite dev server starts
4. Electron app launches
5. AgentBridge initializes
6. Window renders three-pane layout
7. Model selector visible
8. Workspace selector visible

### Open Questions (Resolved)

1. ~~Need to test if the app starts successfully in dev mode~~ - YES
2. ~~Need to verify the agent backend starts~~ - YES
3. Need to test the integration between UI and agent - BLOCKED (needs API key)

---

## Recommendations for Future Testing

1. **Set ANTHROPIC_API_KEY**: Required for full integration testing
2. **Create test harness**: Mock API responses for automated testing
3. **Add skip conditions**: Skip macOS tests on Windows and vice versa
4. **Document manual steps**: For tests that require visual verification
