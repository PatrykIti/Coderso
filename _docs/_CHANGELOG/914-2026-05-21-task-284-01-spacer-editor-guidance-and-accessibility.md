# 914. TASK-284-01 Spacer editor guidance and accessibility

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-284, TASK-284-01

## Key Changes

### Spacer author guidance

- Wizard now explains that `fixed` reuses the desktop height for tablet and mobile before the user leaves the beginner flow.
- Desktop, tablet, and mobile height controls now explain the active Tailwind breakpoint range directly beside the field instead of relying on implicit responsive knowledge.
- Spacer custom-height guidance now explicitly says `48` normalizes to `48px` while still accepting explicit `48px`.

### Spacer accessibility

- Spacer custom height inputs now use explicit `aria-label` and `aria-describedby` wiring through additive `TokenOrPixelField` hooks instead of placeholder-only context.
- Updated Spacer task docs, widget docs, and the Playwright report so TASK-284 now reflects the already-landed shared TASK-303 baseline and the completed `TASK-284-01` leaf.

## Validation

- `bun run test:vitest -- tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/spacer.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
