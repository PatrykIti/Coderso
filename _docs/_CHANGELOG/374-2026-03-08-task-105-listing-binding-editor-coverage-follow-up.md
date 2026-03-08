# 374. TASK-105 Listing Binding Editor Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Listing Bindings
- Replaced the old `BindingEditor` smoke test with direct `happy-dom` coverage for adding bindings, editing key/source/fallback/format, adding and editing conditions, parsing `in` and `exists` condition values, reordering bindings, removing conditions, and deleting bindings.
- Kept the broader `listings` route/runtime coverage unchanged in Bun while closing this editor-owned component in the Vitest lane.

### Coverage Progress
- Previous snapshot after the listings editor follow-up: `49.40% stmts`, `43.90% branch`, `44.26% funcs`, `52.03% lines`
- Current snapshot after this binding-editor slice: `49.60% stmts`, `44.09% branch`, `44.61% funcs`, `52.22% lines`
- `BindingEditor.tsx` moved to `91.04%` lines / `74.13%` branches
- Combined `core/admin/ui/listings/*` average now sits at `85.96%` lines / `60.00%` branches

### Remaining Focus
- The `listings` cluster is now mainly blocked by `ListingTemplateManager.tsx` branches and the remaining list/runtime-preview/list-page branches.
- The next product-level blockers in `TASK-105-04` remain `BookingPage.tsx`, `ThemeTemplateDrawer.tsx`, and `ThemesPage.tsx`.
