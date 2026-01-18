# Scratchpad

Working notes during implementation.

---

## Session 2026-01-18

### Notes

Implemented file preview capabilities for ExecutionPane with support for multiple file types.

### Components Created

1. **FilePreview.tsx** (Main component)
   - File type detection from extension
   - Support for markdown, code, image, text, and unsupported types
   - File size limit enforcement (5MB max)
   - Expand/collapse functionality
   - Header with file name, type badge, and close button

2. **MarkdownPreview.tsx**
   - Uses react-markdown with remark-gfm for GitHub Flavored Markdown
   - Custom styled components for headings, lists, tables, code blocks
   - External links open in new tab
   - Task lists support

3. **CodePreview.tsx**
   - Lightweight syntax highlighting without external dependencies
   - Supports JavaScript/TypeScript, Python, Rust, Go, and more
   - Token types: keywords, strings, comments, numbers, functions, operators, types
   - Line numbers with proper alignment
   - Copy to clipboard button
   - Language badge

4. **ImagePreview.tsx**
   - Zoom in/out with predefined levels (25% to 400%)
   - 90-degree rotation
   - Drag to pan when zoomed
   - Scroll wheel zoom
   - Keyboard shortcuts (+/- zoom, R rotate, 0 reset)
   - Download button
   - Error handling for broken images

5. **TextPreview.tsx**
   - Line numbers
   - Word wrap toggle
   - Copy to clipboard
   - Line and character count display

### Dependencies Added

- react-markdown: For markdown rendering
- remark-gfm: GitHub Flavored Markdown support (tables, task lists, etc.)

### Implementation Details

- Used helper functions `charAt` and `testAt` to handle TypeScript strict null checks in tokenizer
- File type detection based on extension mapping
- Zoom levels stored in constant array with safe index access
- All components use memo() for performance optimization
- Proper accessibility attributes (aria-label, role, keyboard navigation)

### Commands Run

```bash
npm install react-markdown remark-gfm --save
npm run typecheck
```

### Open Questions

None - all features implemented and verified.

### Verification

- [x] TypeScript compiles without errors (`npm run typecheck`)
- [x] All preview components created with proper exports
- [x] File type detection covers common formats
- [x] File size limit (5MB) enforced
- [x] Error handling for unsupported formats and broken images
