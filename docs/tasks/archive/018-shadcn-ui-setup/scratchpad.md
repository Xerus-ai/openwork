# Scratchpad

Working notes during implementation.

---

## Session 2026-01-17

### Notes

- Used Tailwind CSS v4 with `@tailwindcss/postcss` plugin
- Created shadcn/ui-compatible CSS variables using OKLCH color space (Tailwind v4 format)
- Used `@theme` directive for theme configuration instead of `tailwind.config.js` (v4 approach)
- Added dark mode support via `.dark` class on document element
- Fixed `@rollup/rollup-win32-x64-msvc` issue by moving it to `optionalDependencies`

### Dependencies Added

- `tailwindcss@^4.1.11` - Tailwind CSS v4
- `@tailwindcss/postcss@^4.1.11` - PostCSS plugin for Tailwind v4
- `class-variance-authority@^0.7.1` - For component variants
- `clsx@^2.1.1` - Class name utility
- `tailwind-merge@^3.3.0` - Merge Tailwind classes
- `lucide-react@^0.511.0` - Icon library
- `@radix-ui/react-slot@^1.2.2` - For Button asChild prop
- `@radix-ui/react-select@^2.2.2` - For Select component

### Files Created

- `postcss.config.js` - PostCSS configuration with @tailwindcss/postcss
- `components.json` - shadcn/ui configuration
- `app/lib/utils.ts` - cn() utility function
- `app/components/ui/button.tsx` - Button component with variants
- `app/components/ui/input.tsx` - Input component
- `app/components/ui/card.tsx` - Card component with subcomponents
- `app/components/ui/select.tsx` - Select component
- `app/components/ui/index.ts` - Export barrel file

### Files Modified

- `app/index.css` - Updated with Tailwind v4 imports and theme variables
- `app/App.tsx` - Updated to demo shadcn/ui components
- `package.json` - Added dependencies

### Commands Run

```bash
npm install --cache /tmp/.npm-cache --ignore-optional
npm run build:app
npm run typecheck
npm run lint
```

### Verification

- Build succeeded: 25.99 kB CSS, 255.32 kB JS
- TypeScript typecheck passed
- ESLint passed with no errors
- Components available: Button, Input, Card, Select

### Open Questions

None - task complete.
