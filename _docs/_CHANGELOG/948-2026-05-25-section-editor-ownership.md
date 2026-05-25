# 948 - Section editor ownership

Date: 2026-05-25
Version: Unreleased
Tasks: TASK-336-19

## Key Changes

- Cleaned the `section` editor mode split so Wizard only seeds starter variant
  and heading copy, Visual owns daily layout/surface/media/link authoring, and
  Advanced is read-only diagnostics.
- Replaced normal Section color and background-media authoring with
  nontechnical controls: swatches, Media Library pickers, and replace-or-clear
  compatibility notices for saved custom/external values.
- Updated Section widget docs, Playwright report notes, smoke inventory, and
  focused Vitest coverage for the corrected ownership contract.

## Validation

- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx tests/vitest/widgets/section.test.tsx tests/vitest/widgets/editorContract.test.ts`
- `bun test tests/unit/playwright-widget-contract-smoke.test.ts`
- `bun scripts/playwright-widget-contract-smoke.ts --session task-336-19-section-final6 --widget section --admin http://localhost:5173/admin --front http://localhost:3000 --output-json _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-section-advanced-readonly-2026-05-25.json --output-md _docs/PLAYWRIGHT/widget-contract-smoke-task-336-19-section-advanced-readonly-2026-05-25.md --strict`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
