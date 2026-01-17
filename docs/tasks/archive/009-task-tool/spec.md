# Task: Implement Task tool for sub-agent spawning

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create Task tool to spawn sub-agents for parallel operations with isolated contexts, result aggregation, and proper resource management.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/tools/task.ts | create | Task tool for sub-agent spawning |
| agent/tools/types.ts | modify | Add TaskOptions, TaskResult, SubAgentContext types |
| agent/tools/index.ts | modify | Export Task tool |
| agent/state/task-manager.ts | create | Sub-agent lifecycle management |
| agent/tools/task.test.ts | create | Unit tests for task operations |

## Blast Radius

- **Scope:** Agent tool layer, sub-agent orchestration
- **Risk:** high (spawns new agent instances, resource intensive)
- **Rollback:** Remove Task tool, sequential operations only

## Implementation Checklist

- [x] Create Task tool class implementing Agent SDK interface
- [x] Implement sub-agent spawning with isolated context
- [x] Add task instructions and input parameters
- [x] Implement result collection and aggregation
- [x] Add timeout and cancellation support
- [x] Implement resource limits (max concurrent sub-agents)
- [x] Add error handling for sub-agent failures
- [x] Track sub-agent state and progress
- [x] Write tests for spawning, results, errors, timeouts

## Verification

- [x] Spawn single sub-agent: executes task and returns result
- [x] Spawn multiple sub-agents: run in parallel correctly
- [x] Sub-agent timeout: terminates after timeout
- [x] Sub-agent error: main agent receives error
- [x] Resource limits: respects max concurrent agents
- [x] Run `npm test` to verify Task tests pass
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Integration test with multi-step workflow (via unit tests)

## Dependencies

- **Blocks:** 042 (e2e workflow testing needs sub-agents)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** High (enables advanced workflows)
