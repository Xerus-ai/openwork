# Lessons Learned

## What Went Well
- Following existing codebase patterns (useChat, useModel hooks) made implementation consistent
- Using memo for TaskItem and ProgressSection provides good performance
- Status icons using lucide-react icons match the existing app style
- TypeScript compilation passes cleanly with strict mode enabled

## What Was Tricky
- Node.js version incompatibility (22.9.0 vs required 22.12+) causes Vite build to fail
- This is a system environment issue, not a code problem
- Dev server still works, TypeScript checks pass

## Unexpected Discoveries
- The existing TodoItem types in agent/tools/types.ts already have blockedReason and completedAt fields
- The ProgressItem interface mirrors TodoItem to maintain compatibility for future integration
- Card components from shadcn/ui have consistent styling that makes sections look cohesive

## Recommendations
- For task 034 (connect TodoList to StatePane), use the setItems action from useProgress hook
- The useProgress hook will need to be lifted up or use context for cross-component state sharing
- Consider adding a ProgressContext provider in the future for app-wide progress state
- Upgrade Node.js to 22.12+ to fix build issues
