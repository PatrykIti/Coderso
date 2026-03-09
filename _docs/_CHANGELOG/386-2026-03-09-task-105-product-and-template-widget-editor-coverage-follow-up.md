# 386. TASK-105 Product and Template Widget Editor Coverage Follow-Up

**Date:** 2026-03-09  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct `happy-dom` coverage for `CommerceWidgetEditorShared`, `ProductCompareEditors`, `ProductGalleryEditors`, `ProductTableEditors`, and `TemplateSectionEditors`.
- Deepened `ListingFiltersEditors` coverage to cover query loading fallback, query reset, facet kind/operator fallbacks, option parsing, sort-mode transitions, and facet removal.
- Kept the new suites editor-owned: wizard, visual, and advanced flows are exercised through real state transitions instead of smoke-only render checks.

### Coverage Progress
- Previous authoritative program snapshot: `52.40% stmts`, `46.13% branch`, `48.07% funcs`, `55.01% lines`
- Current authoritative snapshot after this wave: `53.20% stmts`, `46.79% branch`, `49.74% funcs`, `55.83% lines`
- `ListingFiltersEditors.tsx` moved to `100.00%` lines / `74.59%` branches
- `ProductCompareEditors.tsx` moved to `100.00%` lines / `62.50%` branches
- `ProductGalleryEditors.tsx` moved to `95.00%` lines / `63.15%` branches
- `ProductTableEditors.tsx` moved to `100.00%` lines / `62.50%` branches
- `TemplateSectionEditors.tsx` moved to `100.00%` lines / `71.79%` branches
- `CommerceWidgetEditorShared.tsx` moved to `93.93%` lines / `73.33%` branches
- Combined `core/admin/ui/widgets/editors/*` moved to `50.54%` lines / `48.35%` branches across `40` tracked files

### Remaining Focus
- The `TASK-105-06` backlog is no longer concentrated in `Product*` editors.
- The next low-line widget-editor hotspots are now `PricingPlansEditors`, `TeamEditors`, `NavigationEditors`, `HeroEditors`, and `FaqAccordionEditors`.
- After those larger editor families are reduced further, the program can return to the broader non-wave admin backlog (`settings`, `audit`, `popups`, `users`).
