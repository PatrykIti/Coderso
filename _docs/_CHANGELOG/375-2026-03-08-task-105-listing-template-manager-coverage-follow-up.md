# 375. TASK-105 Listing Template Manager Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-04

## Key Changes

### QA / Listing Templates
- Extended `ListingTemplateManager` coverage to exercise update flow, create/save errors, delete errors, and the loading/empty/load-error branches coming from `useListingTemplates`.
- Kept the newer `ListingEditorPage` and `BindingEditor` coverage intact while strengthening the remaining template-management shell in the same `listings` cluster.

### Coverage Progress
- Previous snapshot after the listings editor and binding-editor follow-up: `49.60% stmts`, `44.09% branch`, `44.61% funcs`, `52.22% lines`
- Current snapshot after this template-manager slice: `49.63% stmts`, `44.18% branch`, `44.63% funcs`, `52.25% lines`
- `ListingTemplateManager.tsx` moved to `86.20%` lines / `72.22%` branches
- Combined `core/admin/ui/listings/*` average moved to `87.53%` lines / `65.00%` branches

### Remaining Focus
- The `listings` cluster is now mostly down to residual list/page/runtime-preview branches rather than the core editor/template manager surfaces.
- The next highest-value open work in `TASK-105-04` remains `BookingPage.tsx`, `ThemeTemplateDrawer.tsx`, and `ThemesPage.tsx`.
