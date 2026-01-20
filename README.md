# OpenWork

**OpenWork** is an open-source implementation of Claude Cowork, with one-click installers for Windows and macOS—no coding required.

It provides a sandboxed workspace where AI can manage files, read documents, and generate professional outputs like PPTX, DOCX, XLSX, and PDF.

> **Warning**
> Disclaimer: OpenWork is an AI tool. Please exercise caution with its operations, especially when authorizing file modifications or deletions.

## Demo

See OpenWork in action:

1. **Folder Organization & Cleanup**
2. **Generate PPT from Files**
3. **Generate XLSX Spreadsheets**

*(Demo videos coming soon)*

## Installation

### Option 1: Download Installer (Recommended)

Get the latest version from our [Releases Page](https://github.com/Xerus-ai/openwork/releases).

| Platform | File Type |
|----------|-----------|
| Windows | `.exe` |
| macOS | `.dmg` |

### Option 2: Build from Source

For developers who want to contribute or modify the codebase:

```bash
git clone https://github.com/Xerus-ai/openwork.git
cd openwork
npm install
```

## Quick Start Guide

### 1. Get an API Key

You need an OpenRouter API key to access models. Get one at [openrouter.ai/keys](https://openrouter.ai/keys).

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
OPENROUTER_API_KEY=your-openrouter-api-key
ANTHROPIC_BASE_URL=https://openrouter.ai/api
ANTHROPIC_AUTH_TOKEN=your-openrouter-api-key
AGENT_MODEL=anthropic/claude-sonnet-4-20250514
```

### 3. Supported Models

OpenRouter provides access to multiple models:

| Provider | Model |
|----------|-------|
| Anthropic | `anthropic/claude-sonnet-4-20250514`, `anthropic/claude-opus-4-20250514` |
| OpenAI | `openai/gpt-4.1` |
| Google | `google/gemini-2.5-pro` |
| Qwen | `qwen/qwen3-235b` |
| Moonshot | `moonshot/kimi-k2` |
| Zhipu | `zhipu/glm-4-long` |

### 4. Run the App

You need to run both the frontend dev server and Electron:

```bash
# Terminal 1: Start the Vite dev server
npm run dev

# Terminal 2: Start Electron (in a separate terminal)
npm run electron:dev
```

### 5. Start Coworking

1. **Select a Workspace**: Choose a folder where the AI is allowed to work.
2. **Enter a Prompt** and let the AI work.

## Important Notes

- **macOS Installation**: If you see a security warning when opening the app, go to System Settings > Privacy & Security and click "Open Anyway".
- **Windows Installation**: You may need to click "More info" and "Run anyway" on the SmartScreen warning.

## Architecture

```
openwork/
├── agent/                       # Agent SDK Backend (TypeScript)
│   ├── index.ts                 # Agent entry point
│   ├── init/                    # Initialization & system prompt
│   ├── shell/                   # Cross-platform shell abstraction
│   ├── state/                   # State management
│   ├── tools/                   # Tool implementations
│   ├── utils/                   # Utilities
│   └── workspace/               # Workspace validation
├── app/                         # Frontend UI (React + Tailwind)
│   ├── App.tsx                  # Root component
│   ├── components/              # UI Components
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utilities
├── electron/                    # Electron Main Process
│   ├── main.ts                  # Main entry point
│   ├── preload.ts               # Context bridge setup
│   ├── ipc/                     # IPC handlers
│   └── config/                  # Configuration
├── skills/                      # Built-in Skill Definitions
└── scripts/                     # Build scripts
```

## Contributing

Contributions are welcome! Please see [CLAUDE.md](CLAUDE.md) for development guidelines.

```bash
# Run tests
npm test

# Type check
npm run typecheck

# Build
npm run build
```

## License

MIT

## Acknowledgments

Built with [Claude Agent SDK](https://docs.anthropic.com/agent-sdk) by Anthropic.
