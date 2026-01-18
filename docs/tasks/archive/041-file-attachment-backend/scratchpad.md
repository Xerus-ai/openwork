# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Notes

Implemented file attachment backend processing:

1. **Frontend updates** (`app/hooks/useFileUpload.ts`, `app/components/ChatPane.tsx`):
   - Added `ElectronFile` interface to capture the `path` property from Electron File objects
   - Added `filePath` field to `AttachedFile` interface
   - Updated `addFiles` to capture the actual file path from Electron
   - Updated `convertAttachments` to use actual file path

2. **New electron/attachments module** (placed in electron/ to match tsconfig):
   - `file-reader.ts`: Reads various file formats (text, images, PDFs, Office docs)
     - Supports text-based files directly (.txt, .md, .json, .js, .ts, etc.)
     - Returns descriptive placeholders for binary files
     - Has size limits (10MB per file, 100K characters per file content)
   - `attachment-processor.ts`: Processes multiple attachments
     - Validates files exist and are readable
     - Builds context text to append to user messages
     - Has total size limit (50MB)
   - `index.ts`: Module exports

3. **Chat handler integration** (`electron/ipc/chat-handlers.ts`):
   - Import the attachment processor from `../attachments/index.js`
   - Process attachments and append context text to user message
   - Removed unused `formatBytes` method

### Architecture Decisions

- **Module location**: Placed in `electron/attachments/` instead of `agent/attachments/`
  - The electron tsconfig has `rootDir: './electron'` so imports from agent/ don't work
  - Both electron and agent compile separately, they don't share code directly

- **File reading approach**: Read file contents and append to message text
  - Simpler implementation
  - Works with current streaming setup
  - Avoids complexity of multi-part messages

- **No temporary file storage**: Files are read directly from their original location
  - Cleaner, no temp file cleanup needed
  - Files must exist when message is processed

- **Binary file handling**: Just include description, not attempting to extract content
  - PDF extraction would need pdf-parse or similar
  - Office docs would need mammoth or similar
  - Can be added later if needed

### Commands Run

```bash
mkdir -p "D:/cowork/cowork-windows/electron/attachments"
rm -rf "D:/cowork/cowork-windows/agent/attachments"  # cleaned up unused location
```

### Build Verification

```bash
npm run build:agent  # Passed
npm run build:electron  # Passed
# npm run build:app has pre-existing Node.js version issue with CSS tooling
```

### Open Questions

- Should we add PDF text extraction? Would need to add pdf-parse dependency
- Should we add Office document extraction? Would need mammoth dependency
- Consider image analysis with Claude's vision API for image attachments

### Files Modified

- `app/hooks/useFileUpload.ts` - Added filePath field and ElectronFile interface
- `app/components/ChatPane.tsx` - Updated convertAttachments to use filePath
- `electron/ipc/chat-handlers.ts` - Added attachment processing, removed unused formatBytes
- `electron/attachments/file-reader.ts` - NEW
- `electron/attachments/attachment-processor.ts` - NEW
- `electron/attachments/index.ts` - NEW
