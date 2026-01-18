# Lessons Learned

## What Went Well
- shadcn/ui Select component was already available and worked well
- Existing hook patterns (useChat, useFileUpload) provided clear templates to follow
- Small, focused task completed quickly

## What Was Tricky
- TypeScript strict mode flagged `AVAILABLE_MODELS[0]` as potentially undefined
- Required explicit type assertion to handle the fallback case
- Build environment has lightningcss native module issues blocking full vite build

## Unexpected Discoveries
- ChatPane already had isStreaming prop available, made it easy to disable model selector during streaming
- shadcn/ui Select handles all accessibility concerns (keyboard navigation, ARIA attributes)

## Recommendations
- For arrays with known content, use type assertions when TypeScript can't infer non-emptiness
- Use `npm run typecheck` when full build is blocked by environment issues
- Consider adding a "mini" model option in the future for simple tasks
