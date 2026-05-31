# 965 - Logo Cloud editor drift cleanup

Date: 2026-05-26
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Tightened Logo Cloud mode ownership: Wizard now seeds only starter layout,
  section title, logo count, and logo names; Visual owns daily logo media,
  accessible descriptions, destinations, CTA, motion, tile presentation, and
  swatch-only colors.
- Replaced Visual raw CSS/token color text inputs with swatch controls that
  summarize saved custom colors and support clear/replace flows.
- Converted Advanced from raw JSON plus normalize/reset mutations into
  read-only layout, content, presentation, and authoring-boundary summaries.
- Removed fake default destinations from new Logo Cloud defaults so logo links
  are absent and the CTA destination is empty until an author chooses one.

## Validation

- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx tests/vitest/widgets/logoCloud.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run precommit`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-logo-cloud-2026-05-26.*`
- `_docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-logo-cloud-focused-2026-05-26.*`
