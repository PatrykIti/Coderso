# 487. TASK-105 Form Canvas and Theme Drawer Follow-Up Coverage

**Date:** 2026-03-14  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Forms
- Added direct `FormCanvas` DOM coverage for form and field selection, remove-action bubbling guards, invalid multi-step normalization, and checkbox fallback copy.

### QA / Themes
- Expanded `ThemeTemplateDrawer` coverage for color text-input normalization without hash prefixes across base, typography, input, topbar, card, and state token fields.

### Validation
- `bun --cwd core lint` passed.
- `bun --cwd core lint:types` passed.
- Targeted Vitest validation passed for:
  - `tests/vitest/ui/form-canvas.test.tsx`
  - `tests/vitest/ui/form-canvas-wave.test.tsx`
  - `tests/vitest/ui/theme-editor.test.tsx`
- Full `bun run test:coverage` passed with:
  - `460` files / `1708` tests
  - `% Stmts`: `69.10`
  - `% Branch`: `60.17`
  - `% Funcs`: `72.60`
  - `% Lines`: `72.26`
