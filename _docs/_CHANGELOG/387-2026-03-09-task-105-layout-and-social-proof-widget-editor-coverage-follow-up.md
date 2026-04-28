# 387. TASK-105 Layout and Social-Proof Widget Editor Coverage Follow-Up

**Date:** 2026-03-09  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Added direct `happy-dom` coverage for `PricingPlansEditors`, `TeamEditors`, `TestimonialsEditors`, `FaqAccordionEditors`, `HeroEditors`, and `NavigationEditors`.
- Kept the suites editor-owned: wizard, visual, and advanced flows are exercised through real state transitions, async client mocks, ordering changes, normalization actions, and token updates instead of smoke-only render assertions.
- Extended the widget-editor wave beyond the earlier commerce/template cluster into layout, social proof, and navigation-heavy editors.

### Coverage Progress
- Previous authoritative snapshot after the product/template slice: `53.20% stmts`, `46.79% branch`, `49.74% funcs`, `55.83% lines`
- Current authoritative snapshot after this slice: `55.82% stmts`, `48.51% branch`, `53.95% funcs`, `58.65% lines`
- `PricingPlansEditors.tsx` moved to `97.18%` lines / `58.82%` branches
- `TeamEditors.tsx` moved to `97.67%` lines / `60.71%` branches
- `TestimonialsEditors.tsx` moved to `89.01%` lines / `63.33%` branches
- `FaqAccordionEditors.tsx` moved to `89.77%` lines / `60.00%` branches
- `HeroEditors.tsx` moved to `82.37%` lines / `82.26%` branches
- `NavigationEditors.tsx` moved to `91.73%` lines / `72.12%` branches
- Combined `core/admin/ui/widgets/editors/*` moved to `68.06%` lines / `59.06%` branches across `40` tracked files

### Remaining Focus
- The next low-line widget-editor hotspots are now `ContactEditors`, `LogoCloudEditors`, `RichTextSectionEditors`, `BookingCalendarEditors`, `CompareTimelineEditors`, and `FeatureGridEditors`.
- After those layout/content editors are reduced further, the wave can continue into the remaining utility and promotional editor clusters before returning to the broader non-wave admin backlog.
