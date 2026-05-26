# 967 - Gallery Mosaic and Team editor cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Tightened Gallery Mosaic mode ownership: Visual owns media, links, layout,
  interaction, and swatch-only overlay authoring; Advanced keeps bounded support
  import/export, read-only runtime summaries, and confirm-gated support actions.
- Added the missing strict Team editor contract and aligned Team UI with the
  shared split: Wizard seeds starter members, Visual owns daily member/content/
  style authoring, and Advanced is diagnostics-only.
- Removed Team Advanced token editors and raw payload output, replacing them
  with read-only layout, surface, and content summaries plus confirm-gated
  normalize/reset actions.
- Added visible color chips to swatch-only controls and explicit Gallery Mosaic
  overlay opacity guidance after Claude's post-implementation UX review.
- Updated widget docs, task notes, and regression tests so raw CSS/token fields,
  raw payload snapshots, and unconfirmed Advanced mutations do not regress.

## Validation

- `bun run test:vitest -- tests/vitest/ui/team-editor-wave.test.tsx tests/vitest/widgets/team.test.tsx tests/vitest/ui/gallery-mosaic-editor-wave.test.tsx tests/vitest/widgets/galleryMosaic.test.tsx tests/vitest/ui/shared-color-control.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-gallery-mosaic-advanced-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-team-advanced-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-gallery-mosaic-team-focused-2026-05-26.*`
