# 1022 - TASK-343-13 Timeline truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-13, TASK-343

## Key Changes

### Widgets / Runtime

- Added Timeline runtime diagnostics for saved versus effective `maxWidth`
  behavior, including the intentional `6xl` to `5xl` narrowing for timelines
  with three or fewer steps.
- Exposed requested and effective marker display metadata so icon mode with
  missing per-step icons reports dot fallbacks instead of silently appearing as
  pure icon mode.
- Kept `descriptionSize="none"` as visible inherited-description typography and
  exposed the saved description-size state on the runtime container.

### Admin UI

- Unified Timeline mode cards and the `Timeline mode` select through the same
  mode updater so both paths update `data.mode` and the preferred legacy
  variant together.
- Added Visual and Advanced diagnostics for icon-marker fallbacks, inherited
  description sizing, and compact `6xl` width behavior.

### QA / Docs

- Added Timeline renderer and editor regression coverage for mode/variant
  parity, block-patch behavior, marker fallback diagnostics, inherited
  description sizing, and effective width reporting.
- Updated Timeline widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/timeline.test.tsx tests/vitest/ui/timeline-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `playwright-cli -s=task-343-13-manual run-code --filename .tmp/task-343-13-timeline-manual-smoke.js`
  after restarting `coderso-dev-core-host` once for the known blank-page Vite
  state; admin Visual and Advanced diagnostics passed.
- `playwright-cli -s=task-343-13-public run-code --filename .tmp/task-343-13-public-smoke.js`
  against a temporary published Timeline page; public runtime returned `200`
  with Timeline diagnostics present, then the temporary page was deleted.
- `claude -p --tools "" --input-format text --output-format text` (TASK-343-13
  drift review)

Existing `/ctr-timeline-2305` public fixture currently has an empty published
Timeline payload, so its public route returns `200` with an empty `<main>` and
was treated as a fixture gap rather than runtime evidence for this change.
