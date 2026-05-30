# 1027 - TASK-343-05 FAQ Accordion spacing and preview truthfulness

Date: 2026-05-30
Version: Unreleased
Tasks: TASK-343-05, TASK-343

## Key Changes

### Admin UI

- Added a real Visual `Spacing` control for `style.spacing` in the FAQ
  Accordion `Layout and typography` section.
- Kept Advanced read-only while making its layout summary match the selected
  spacing label.

### Runtime

- Removed static SSR `aria-expanded` from FAQ summaries so admin preview markup
  cannot expose stale expanded state when the runtime script is not executed.
- Kept public runtime ownership of `aria-expanded`; the runtime still sets and
  synchronizes it after binding.

### QA / Docs

- Added renderer coverage for spacing-owned gap/padding output and static
  preview ARIA behavior.
- Added editor coverage for writable spacing and Advanced summary truthfulness.
- Updated FAQ widget docs, Playwright report notes, task board, and TASK-343
  parent tracking.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- `git diff --cached --check`
- `bun scripts/playwright-widget-contract-smoke.ts --widget faq-accordion --session task-343-05-faq-accordion --admin http://localhost:5173/admin --front http://localhost:3000 --strict --output-json .tmp/task-343-05-faq-accordion-smoke.json --output-md .tmp/task-343-05-faq-accordion-smoke.md`

Strict smoke passed with `adminFailures=0`, `publicFailures=0`,
`fixtureGaps=0`, and `metadataGaps=0`.
