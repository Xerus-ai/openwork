# CLAUDE.md

Development guide for OpenWork contributors.

## Code Quality Rules

**Hard Constraints**:
- **Maximum 500 lines per file** - Split into smaller modules if exceeded
- **No emojis** - Never use emojis in code, comments, or commit messages
- **Delete unused code** - Remove completely, don't comment out

## Coding Style

Follow **Easy Scan** principles - code should be readable at a glance.

### Naming
- Descriptive names, no abbreviations (`userInputText` not `txt`)
- Functions say what they do (`loadConfigFromDisk` not `load`)
- Booleans read as questions (`isValid`, `hasLoaded`, `shouldRetry`)

### TypeScript
- Strict mode enabled (no implicit any)
- Interfaces for object shapes
- Types for unions and primitives
- Avoid `any`, use `unknown` if truly needed

### React
- Functional components only
- Hooks for state and effects
- Props interfaces for every component
- Memoization for performance

### Comments
- Explain WHY, not WHAT
- No commented-out code
- TODO format: `// TODO(username, date): description`

## Commits

Use bracketed prefixes:

- `[FEAT]` - New functionality
- `[FIX]` - Bug fix
- `[DOCS]` - Documentation only
- `[REFACTOR]` - Internal change, no behavior change
- `[TEST]` - Add or update tests
- `[CHORE]` - Maintenance (dependencies, config, build)

## Cross-Platform Guidelines

### Path Handling
- Always use `import path from 'path'`
- Use `path.join()` and `path.normalize()`
- Never use string concatenation for paths

### Shell Execution
- Windows: PowerShell or cmd
- macOS: bash or zsh
- Detect available shell at runtime

### File Operations
- Atomic writes (write to temp, then rename)
- Handle line endings correctly (CRLF/LF)
- Default to UTF-8 encoding

## Project Structure

```
openwork/
├── agent/               # Agent SDK backend
│   ├── tools/           # Tool implementations
│   ├── shell/           # Shell abstraction
│   ├── utils/           # Utilities
│   └── index.ts
├── app/                 # React frontend
│   ├── components/      # UI components
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilities
├── electron/            # Electron main process
├── skills/              # Document skills (bundled)
└── scripts/             # Build scripts
```

## Testing

```bash
# Run all tests
npm test

# Build and type check
npm run build
npm run typecheck
```

## External References

- [Claude Agent SDK Docs](https://docs.anthropic.com/agent-sdk)
- [Electron Docs](https://www.electronjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React Docs](https://react.dev/)
