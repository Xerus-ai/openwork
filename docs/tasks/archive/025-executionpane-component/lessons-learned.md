# Lessons Learned

## What Went Well
- Followed existing patterns from ChatPane and useChat for consistency
- Separated concerns: hook for state, Output component for rendering, Pane for layout
- Used memo() for performance optimization on list items

## What Was Tricky
- Designing the entry type system to handle commands, outputs, errors, info, and file operations
- Syntax highlighting needed careful regex patterns to handle cross-platform paths

## Unexpected Discoveries
- Vite build environment has Node.js version constraints (needs 20.19+ or 22.12+)
- PostCSS/lightningcss requires platform-specific binaries

## Recommendations
- Keep output components simple and let the hook manage complexity
- Use color-coded backgrounds and icons for quick visual scanning
- Consider adding virtualization for very long execution histories in future
