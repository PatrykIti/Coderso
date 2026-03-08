# 381. TASK-105 Entry Teaser Editor Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct Vitest coverage for `EntryTeaserEditors` across legacy/manual and listing source modes, CTA behavior, style tokens, fallback copy, runtime snapshot, and loading-error branches.
- This moves the file out of the near-zero bucket and starts the real `TASK-105-06` widget-editor wave in the proper Vitest lane instead of relying on the older Bun-owned widget test.

### Coverage Progress
- Previous snapshot after the theme-focused follow-up slices: `54.10% stmts`, `45.23% branch`, `46.41% funcs`, `54.10% lines`
- Current snapshot after this widget-editor slice: `54.70% stmts`, `45.87% branch`, `47.32% funcs`, `54.70% lines`
- `EntryTeaserEditors.tsx` moved to `90.84%` lines / `66.04%` branches
- Combined `core/admin/ui/widgets/editors/*` average now sits at `46.82%` lines / `47.25%` branches

### Remaining Focus
- The widget-editor cluster is still the biggest remaining Vitest-owned backlog, with `ListingFiltersEditors`, `ContentListEditors`, `PostsFeedEditors`, `StatsKpiEditors`, and the `Product*` family still substantially open.
