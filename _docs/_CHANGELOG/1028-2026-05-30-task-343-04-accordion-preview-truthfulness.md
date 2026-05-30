# 1028 - TASK-343-04 Accordion preview truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-04, TASK-343

## Key Changes

### Admin UI

- Retired the misleading Wizard `Number of items` mutator and replaced it with
  a read-only slot-owned panel count summary.
- Kept Wizard default-open selection as the only writable setup control for
  Accordion.

### Runtime / Preview

- Scoped single-open `<details name>` groups per admin render instance so canvas
  and live/setup previews no longer close each other.
- Added React preview `onToggle` synchronization for `aria-expanded` when the
  injected public runtime script is not executed in admin preview.

### QA / Docs

- Added renderer coverage for preview group isolation and admin-preview ARIA
  synchronization.
- Added editor coverage for Wizard count truthfulness and slot-owned panel
  summaries.
- Updated Accordion widget docs, Playwright report notes, task board, and
  TASK-343 parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/accordionWidget.test.tsx tests/vitest/ui/accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget accordion --session task-343-04-accordion --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-04-accordion-smoke.json --output-md .tmp/task-343-04-accordion-smoke.md`

Strict smoke passed with `adminFailures=0`, `publicFailures=0`,
`fixtureGaps=0`, and `metadataGaps=0`.
