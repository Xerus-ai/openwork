# Scratchpad

Working notes during implementation.

---

## Session 2026-01-17

### Notes

Implemented the AskUserQuestion tool with the following design:

1. **Types (types.ts)**:
   - `QuestionType`: "text" | "multi-choice" | "yes-no"
   - `QuestionChoice`: { id, label, description? }
   - `AskUserQuestionOptions`: question, type, choices?, defaultAnswer?, timeout?, context?
   - `AskUserQuestionResult`: success, type, answer?, selectedId?, confirmed?, timedOut?, cancelled?, error?

2. **Tool Implementation (ask-user-question.ts)**:
   - `QuestionManager` class handles queuing and concurrent question requests
   - Questions processed one at a time (sequential queue)
   - Timeout handling with configurable duration (default 5 minutes)
   - Cancel/abort support via `cancelled` flag in UserResponse
   - Validation for all question types, choice ids, and labels
   - Global manager instance for easy access
   - Factory function `createAskUserQuestionHandler` for custom integrations

3. **Key Design Decisions**:
   - IPC bridge via `QuestionSender` callback function (set by UI layer)
   - Questions are queued and processed sequentially
   - Timeout clamped to 5s-30min range
   - Multi-choice requires at least 2 choices
   - Yes/no parsing handles: yes/no/y/n/true/false/1

4. **Tests**: 39 tests covering all question types, validation, cancellation, timeout, queue management

### Commands Run

- `npm run build` - Passed
- `npm test` - All 211 tests pass (39 new for ask-user-question)

### Open Questions

None - implementation complete
