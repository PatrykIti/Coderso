# 853 - TASK-263 CTA banner follow-up closure

Date: 2026-05-17
Version: Unreleased
Tasks: TASK-263, TASK-263-01, TASK-263-02, TASK-263-03, TASK-263-04, TASK-263-05, TASK-263-06

## Key Changes

### CMS Widgets

- Closed the CTA Banner Playwright follow-up family by hardening runtime output:
  empty badges are suppressed, section labelling now uses `blockId`, description
  color follows the configured CTA text path, zero-width borders drop the
  semantic `border` class, and CTA links now expose local `focus-visible`
  treatment.
- Rebuilt CTA Banner editor flows for beginner-safe conversion authoring:
  Wizard now uses variant cards plus primary and secondary URL fields, Visual
  now exposes explicit `Label` and `URL` fields, inline invalid-URL feedback,
  persisted enable toggles for secondary and tertiary CTAs, new-tab policy,
  icon enums, description visibility, button border/radius/size controls, and
  bounded background/media/motion controls.
- Kept full-width ownership on the shared block Layout panel
  (`WidgetBlock.layout.container`) and closed BF-05 by removing CTA Banner’s
  redundant inner `max-w-6xl` wrapper instead of adding a competing widget-local
  width schema.

### QA and Documentation

- Added focused runtime/editor coverage for the expanded CTA contract in
  `tests/vitest/widgets/ctaBanner.test.tsx` and
  `tests/vitest/ui/cta-banner-editor-wave.test.tsx`, while preserving shared
  renderer coverage in `tests/vitest/widgets/renderer.test.tsx`.
- Refreshed `_docs/PLAYWRIGHT/REPORT_CTA_BANNER_WIDGET.md`,
  `_docs/_WIDGETS/CTA_BANNER.md`, `_docs/_TASKS/TASK-263*.md`,
  `_docs/_TASKS/README.md`, and `_docs/_CHANGELOG/README.md` so report routing,
  widget contract docs, board state, and final closure evidence are aligned.
- Validation:
  - `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
  - `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
  - `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx`
  - `bun test tests/unit/widgets/validator.test.ts`
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run gates:coderso`
  - `bun run scan:security:strict`
  - `bun run precommit`
