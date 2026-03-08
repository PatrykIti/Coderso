# 378. TASK-105 Themes Page Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Themes Page
- Replaced the old `ThemesPage` smoke render with direct `happy-dom` coverage for template search, export dialog, create/edit template flows, create/edit profile flows, profile activation, cache-bus refresh, and empty/error branches.
- Kept the more focused drawer tests in place while finally covering the top-level page orchestration that binds the theme template/profile surfaces together.

### Coverage Progress
- Previous snapshot after the theme drawer follow-up: `51.04% stmts`, `44.91% branch`, `45.79% funcs`, `53.66% lines`
- Current snapshot after this page-level theme slice: `53.66% stmts`, `45.14% branch`, `46.16% funcs`, `53.99% lines`
- `ThemesPage.tsx` moved to `90.67%` lines / `75.71%` branches
- Combined `core/admin/ui/themes/*` average moved to `87.33%` lines / `69.80%` branches

### Remaining Focus
- The theme cluster is now mostly down to `ThemeProfileDrawer.tsx` and any residual page-adjacent branches rather than the page shell itself.
- Across `TASK-105-04`, the next practical target after this is either `ThemeProfileDrawer` or moving beyond wave `04` into the broader non-wave admin backlog.
