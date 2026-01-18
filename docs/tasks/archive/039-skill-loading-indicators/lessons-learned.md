# Lessons Learned

## What Went Well
- Existing infrastructure (AgentBridge, preload, IPC types) already supported skill loading events
- Just needed to wire up the frontend components and create the hook
- Type guards made it easy to support both old and new skill types for backward compatibility
- The artifact-handlers pattern was easy to follow for skill-handlers

## What Was Tricky
- Understanding the difference between LoadedSkill (from useSessionContext) and SkillState (new hook)
- Deciding whether to extend existing types or create new ones (chose new for separation of concerns)

## Unexpected Discoveries
- The sendSkillLoaded method already existed in AgentBridge but wasn't being used
- The IPC message type AgentSkillLoaded was already defined in message-types.ts
- The preload script already had the onSkillLoaded listener registered

## Recommendations
- When adding new IPC event types, check if the infrastructure already exists
- Use type guards to support multiple input types for backward compatibility
- Follow existing handler patterns (artifact-handlers, todolist-handlers) for consistency
- Keep hooks focused on single concerns (useSkills for skill loading state only)
