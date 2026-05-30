# 1017 - TASK-343-22 CTA Banner truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-22, TASK-343

## Key Changes

### Admin UI

- Added inline missing-destination guidance when an enabled CTA has a label but
  no safe destination.
- Added Visual guidance for the `With Badge` variant's framed badge treatment.
- Added inline status feedback after Advanced `Normalize now` and
  `Reset to defaults` actions.

### Widgets / Runtime

- Added `resolveCtaBannerVariantPresentation` and rendered `with-badge` through
  a distinct `badge-panel` presentation with deterministic data markers.
- Added `resolveCtaBannerActionRenderState` and rendered enabled label-only CTA
  actions as disabled missing-destination hints instead of silently dropping
  them.
- Preserved existing `resolveWidgetLinkAttrs` safe-link and new-tab behavior for
  valid CTA destinations.

### QA / Docs

- Added CTA Banner regression coverage for variant presentation, missing
  destination runtime/editor states, and Advanced repair feedback.
- Updated CTA Banner widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-22
  drift review: no blockers)
