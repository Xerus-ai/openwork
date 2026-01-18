# Lessons Learned

## What Went Well
- Using Electron's File.path property to get actual file paths worked correctly
- Reading text files directly is simpler than copying to temp location
- Modular design separates file reading from attachment processing

## What Was Tricky
- TypeScript project structure has separate tsconfigs for agent/ and electron/
- The electron tsconfig's rootDir is './electron' so it can't import from agent/
- Had to place attachment code in electron/attachments/ not agent/attachments/

## Unexpected Discoveries
- Electron File objects from file input/drag-drop have a path property (not standard browser)
- The agent and electron code compile completely separately - no shared code
- The app build has a Node.js version incompatibility with CSS tooling (unrelated issue)

## Recommendations
- Always check tsconfig.json structure before adding new module imports
- Keep file processing in the electron folder for main process operations
- For PDF/Office support, consider adding optional dependencies later
