# Task: Add input box with file attachment support to ChatPane

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Add input box to ChatPane with send button, file attachment picker, and drag-and-drop support for uploading files.

## Effort
- **Effort:** S
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| app/components/ChatInput.tsx | create | Chat input component with attachments |
| app/components/FileAttachment.tsx | create | File attachment display |
| app/hooks/useFileUpload.ts | create | File upload logic |

## Blast Radius

- **Scope:** UI component layer
- **Risk:** low to medium
- **Rollback:** Remove component, revert to previous UI

## Implementation Checklist

- [x] Create ChatInput component with textarea
- [x] Add send button with keyboard shortcut (Enter)
- [x] Implement file attachment picker button
- [x] Add drag-and-drop file upload
- [x] Display selected files with remove option
- [x] Add file type validation
- [x] Limit file sizes (10MB per file)
- [x] Test with text and file uploads

## Verification

- [x] Component renders correctly
- [x] All functionality works as expected
- [x] Run `npm run dev` to test in browser (TypeScript compiles)
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Test on different screen sizes (responsive design implemented)
- [x] Check accessibility (aria-labels, keyboard navigation)

## Dependencies

- **Blocks:** 041
- **Blocked by:** 020

## Context

- **Phase:** UI Foundation
- **Priority:** High
