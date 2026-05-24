# 939 - Hero editor ownership

Date: 2026-05-24
Version: unreleased
Tasks: TASK-336-11

## Key Changes

### CMS Widgets / Admin UI

- Added a strict v2 editor contract for `hero` with temporary Wizard seed
  duplicate allowances that expire with `TASK-336-16`.
- Reduced Hero Wizard to one-time setup seeds for goal, initial layout,
  headline, and primary CTA.
- Moved Hero layout, spacing, responsive media visibility, media/background,
  CTA, typography, appearance, colors, and borders into Visual.
- Converted Hero Advanced into read-only layout/style/media diagnostics,
  accessibility checks, runtime payload, and contract summary.

### QA / Docs

- Updated Hero widget docs, TASK-336 board state, Playwright smoke inventory,
  targeted Hero smoke evidence, and focused Hero Vitest coverage for the new
  ownership split.
