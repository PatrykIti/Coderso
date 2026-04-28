# 376. TASK-105 Theme Template Drawer Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Theme Templates
- Replaced the previous `ThemeTemplateDrawer` smoke render with direct `happy-dom` coverage for create mode, edit mode, token editing, base-section invert, save, cancel, and saving-state branches.
- Kept the broader theme-page/theme-route coverage already in place while moving the drawer itself out of the lowest-coverage bucket.

### Coverage Progress
- Previous snapshot after the listings template manager follow-up: `49.63% stmts`, `44.18% branch`, `44.63% funcs`, `52.25% lines`
- Current snapshot after this theme drawer slice: `49.85% stmts`, `44.24% branch`, `44.91% funcs`, `52.48% lines`
- `ThemeTemplateDrawer.tsx` moved to `62.04%` lines / `71.79%` branches
- Combined `core/admin/ui/themes/*` average moved to `81.86%` lines / `64.99%` branches

### Remaining Focus
- The theme cluster is now mainly concentrated in `ThemesPage.tsx` and the remaining `ThemeProfileDrawer.tsx` branches.
- Across `TASK-105-04`, the next largest product hotspot is still `BookingPage.tsx`.
