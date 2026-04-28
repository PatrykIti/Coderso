# 405. TASK-105 Stats Navigation Pricing Hero Follow-Up

**Date:** 2026-03-10  
**Version:** Unreleased  
**Tasks:** TASK-105, TASK-105-06

## Key Changes

### QA / Widget Editors
- Deepened `StatsKpiEditors`, `NavigationEditors`, `PricingPlansEditors`, and `HeroEditors` with small targeted follow-ups instead of another broad editor-wave rewrite.
- Focused the cases on the remaining line gaps: isolated wizard/value paths, visual divider and picker controls, API-flavored fallback handling, and the last unhit CTA/background-picker branches.

### Coverage Progress
- Previous canonical full-lane snapshot after the footer/team/navigation/logo/divider/entry batch: `60.84%` stmts / `51.45%` branch / `65.47%` funcs / `63.75%` lines
- Current canonical full-lane snapshot after this batch: `60.87%` stmts / `51.45%` branch / `65.55%` funcs / `63.78%` lines
- Updated widget-editor aggregate:
  - `core/admin/ui/widgets/editors/*` -> `99.97%` lines / `77.47%` branches across `40` tracked files
- Updated authoritative file snapshots:
  - `StatsKpiEditors.tsx` -> `100.00%` lines / `91.07%` branches
  - `NavigationEditors.tsx` -> `100.00%` lines / `76.54%` branches
  - `PricingPlansEditors.tsx` -> `100.00%` lines / `59.80%` branches
  - `HeroEditors.tsx` -> `100.00%` lines / `91.32%` branches

### Remaining Focus
- The widget-editor line-gap backlog is now effectively down to `TimelineEditors`.
- After that, the remaining work is branch-gap closure in `FeatureGridEditors`, `PricingPlansEditors`, `NewsletterEditors`, `TeamEditors`, `ProductCompareEditors`, `ProductTableEditors`, and `LogoCloudEditors`.
