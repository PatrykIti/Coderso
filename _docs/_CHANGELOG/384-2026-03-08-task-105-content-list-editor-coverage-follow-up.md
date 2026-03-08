# 384. TASK-105 Content List Editor Coverage Follow-Up

**Date:** 2026-03-08  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added the first direct `happy-dom` Vitest suite for `ContentListEditors`, covering legacy vs listing source wiring, listing query/template selection, variant/layout controls, runtime labels, facet-like state changes, and loader errors.
- This gives the file a direct Vitest owner instead of leaving it visible only through older broad widget coverage.

### Coverage Progress
- Current snapshot after the latest widget-editor follow-up remains `52.40% stmts`, `46.13% branch`, `48.07% funcs`, `55.01% lines`
- `ContentListEditors.tsx` currently sits at `50.76%` lines / `35.33%` branches after this first direct suite
- Combined `core/admin/ui/widgets/editors/*` average remains `48.38%` lines / `48.45%` branches

### Remaining Focus
- `ContentListEditors` still needs deeper follow-up for the more complex layout and branch combinations.
- The next biggest widget-editor surfaces remain `StatsKpiEditors` and the `Product*` family.
