# 1064 - FAQ Accordion widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-374, TASK-374-01

## Key Changes

- Added FAQ-owned disclosure sync helpers for `[data-coderso-faq="1"]` roots.
- Added an admin-safe widget preview runtime bridge so page-builder canvas,
  shared live preview, and custom-screen read-only widget preview FAQ
  disclosures sync `summary[aria-expanded]` after React preview render.
- Preserved public SSR behavior where static markup omits stale
  `aria-expanded`; public runtime still binds after load.
- Kept admin preview hardening intact by binding only the bounded FAQ disclosure
  contract rather than executing arbitrary persisted widget scripts.
- Updated FAQ docs, the 31-05 report, task board, and task closure notes.

## Validation

- Focused admin-preview regression failed before the fix because no FAQ preview
  bridge module existed.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/faq-accordion-editor-wave.test.tsx -t "admin preview bridge syncs"`
- `bun run test:vitest -- tests/vitest/widgets/faqAccordion.test.tsx tests/vitest/ui/faq-accordion-editor-wave.test.tsx`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/screenWidgets.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Claude staged review reported no blockers for the base page-builder bridge diff; final re-review after the custom-screen bridge delta was attempted twice but unavailable due budget/timeout.
