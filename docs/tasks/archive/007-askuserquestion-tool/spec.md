# Task: Implement AskUserQuestion tool with multi-choice support

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create AskUserQuestion tool to gather user input with support for text responses, multi-choice selections, and yes/no confirmations via IPC to the UI layer.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/tools/ask-user-question.ts | create | AskUserQuestion tool implementation |
| agent/tools/types.ts | modify | Add QuestionOptions, QuestionResult, QuestionType types |
| agent/tools/index.ts | modify | Export AskUserQuestion tool |
| agent/tools/ask-user-question.test.ts | create | Unit tests with mocked user responses |

## Blast Radius

- **Scope:** Agent tool layer, user interaction
- **Risk:** medium (blocking operations waiting for user input)
- **Rollback:** Remove tool, agent proceeds without clarification

## Implementation Checklist

- [x] Create AskUserQuestion tool class implementing Agent SDK interface
- [x] Support question types: text, multi-choice (A/B/C), yes/no
- [x] Implement IPC bridge to send questions to UI
- [x] Add timeout handling (default 5 minutes)
- [x] Add cancel/abort support from UI
- [x] Return structured response with question type and answer
- [x] Add validation for multi-choice options
- [x] Handle concurrent question requests (queue or block)
- [x] Write tests with mocked user responses

## Verification

- [x] Text question: agent asks question, waits for response
- [x] Multi-choice question: displays options A/B/C, returns selection
- [x] Yes/no question: returns boolean response
- [x] Timeout: question times out after configured duration
- [x] Cancel: user can cancel question from UI
- [x] Run `npm test` to verify AskUserQuestion tests pass
- [x] Run `npm run build` to verify TypeScript compiles
- [ ] Integration test with UI (Phase 3 task 033)

## Dependencies

- **Blocks:** 033 (UI integration for question widgets)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** High (important for user clarification workflow)
