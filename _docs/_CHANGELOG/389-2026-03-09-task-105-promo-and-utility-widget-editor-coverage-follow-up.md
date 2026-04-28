# 389. TASK-105 Promo and Utility Widget Editor Coverage Follow-Up

**Date:** 2026-03-09  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct `happy-dom` coverage for `GalleryMosaicEditors`, `CtaBannerEditors`, `TimelineEditors`, `NewsletterEditors`, `SearchBoxEditors`, and `SectionEditors`.
- Kept the suites editor-owned: wizard, visual, and advanced flows are exercised through real normalization paths, variant switching, ordering guards, token edits, async listing-query loading, and snapshot verification instead of smoke-only render assertions.
- Cleared another large chunk of the promo/layout/editor backlog after the previous content/contact batch.

### Coverage Progress
- Previous authoritative snapshot after the contact/content slice: `57.61% stmts`, `49.22% branch`, `57.58% funcs`, `60.53% lines`
- Current authoritative snapshot after this slice: `58.71% stmts`, `49.58% branch`, `60.26% funcs`, `61.64% lines`
- `GalleryMosaicEditors.tsx` moved to `95.74%` lines / `66.66%` branches
- `CtaBannerEditors.tsx` moved to `86.66%` lines / `62.50%` branches
- `TimelineEditors.tsx` moved to `99.10%` lines / `84.21%` branches
- `NewsletterEditors.tsx` moved to `93.65%` lines / `61.42%` branches
- `SearchBoxEditors.tsx` moved to `98.07%` lines / `64.28%` branches
- `SectionEditors.tsx` moved to `88.52%` lines / `57.14%` branches
- Combined `core/admin/ui/widgets/editors/*` moved to `86.63%` lines / `65.76%` branches across `40` tracked files

### Remaining Focus
- The next low-line widget-editor hotspots are now `GridColumnsEditors`, `AccordionEditors`, `ToggleBlockEditors`, `FormEmbedEditors`, `TabsEditors`, and `SplitLayoutEditors`.
- After those utility/layout editors are reduced further, the wave can move from broad backlog cutting into per-file closure work.
