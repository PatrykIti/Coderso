# 373. TASK-105 Listings Editor Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Listings Editor
- Replaced the previous gap in `ListingEditorPage` coverage with direct `happy-dom` interaction tests for edit mode, create mode, preview, discard, save, cache-bus refresh, navigation, and load/preview error handling.
- Kept the existing `listings` route/domain Bun coverage untouched; the new work closes the admin/UI editor surface in the Vitest lane where it belongs.

### Coverage Progress
- Previous snapshot after the forms follow-up slices: `48.78% stmts`, `43.44% branch`, `43.52% funcs`, `51.40% lines`
- Current snapshot after this listings editor slice: `49.40% stmts`, `43.90% branch`, `44.26% funcs`, `52.03% lines`
- `ListingEditorPage.tsx` moved to `89.79%` lines / `72.99%` branches
- Aggregate `core/admin/ui/listings/*` moved to `85.98%` lines / `64.15%` branches

### Remaining Focus
- The `listings` cluster is now mostly blocked by `ListingTemplateManager.tsx` branch gaps and the still-low `BindingEditor.tsx`.
- The next highest-value open work in `TASK-105-04` remains `BookingPage.tsx`, `ThemeTemplateDrawer.tsx`, and `ThemesPage.tsx`.
