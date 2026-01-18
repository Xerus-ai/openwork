# Task: Add real-time skill loading indicators to context section

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Display loaded skills in StatePane context section with loading indicators and skill metadata.

## Effort
- **Effort:** S
- **Tier:** mini

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| app/hooks/useSkills.ts | create | Skill loading state integration |
| electron/ipc/skill-handlers.ts | create | Skill loading IPC |
| app/components/SkillBadge.tsx | modify | Add loading/error state display |
| app/components/ContextSection.tsx | modify | Support skill loading states |
| electron/ipc/index.ts | modify | Export skill handlers |

## Blast Radius

- **Scope:** Integration layer
- **Risk:** medium
- **Rollback:** Disconnect integration, manual operations

## Implementation Checklist

- [x] Capture skill loading events from agent
- [x] Display skill badges in context section
- [x] Add loading spinner during skill load
- [x] Show skill metadata on hover
- [x] Display skill load errors
- [x] Add skill count indicator
- [x] Test with automatic skill detection
- [x] Verify skills shown for docx, pptx workflows

## Verification

- [x] Integration works correctly
- [x] All functionality tested
- [x] Run `npm run dev` to test
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Test on Windows and macOS
- [x] Check error handling

## Dependencies

- **Blocks:** none
- **Blocked by:** 030, 012

## Context

- **Phase:** Integration
- **Priority:** Low
