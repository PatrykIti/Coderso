# 1066 - Testimonials widget 31-05 UI audit remediation

Date: 2026-06-01
Version: Unreleased
Tasks: TASK-376, TASK-376-01

## Key Changes

- Updated the Testimonials rich quote sanitizer so sanitized HTML with no
  readable text, including `<br>`-only and whitespace-only clear states,
  normalizes to empty.
- Preserved the plain quote fallback when formatted quote HTML is empty.
- Added renderer/domain regression coverage for `<br>`, `<p><br></p>`, and
  whitespace/`&nbsp;` rich quote cases.
- Added Visual editor regression coverage proving a cleared rich quote keeps the
  preview on the plain quote path.
- Updated Testimonials docs, the 31-05 report, task board, and task closure
  notes.

## Validation

- Focused widget/UI regressions failed before the sanitizer fix: `<br>` was
  treated as active rich quote HTML and preview rendering selected HTML mode.
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/widgets/testimonials.test.tsx -t "br-only rich quote"`
- `NODE_ENV=test ./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/testimonials-editor-wave.test.tsx -t "rich quote clear keeps"`
- `bun run test:vitest -- tests/vitest/widgets/testimonials.test.tsx tests/vitest/ui/testimonials-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`
- Aquinas sidecar inspection: no drift or blockers in the owner-side sanitizer
  fix shape.
- `timeout 240s claude -p --dangerously-skip-permissions --max-budget-usd 1.2 "Review the current staged TASK-376 Testimonials diff only..."` -
  no blockers.
