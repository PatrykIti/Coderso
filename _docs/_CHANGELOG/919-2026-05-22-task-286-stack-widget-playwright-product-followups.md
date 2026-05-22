# 919. TASK-286 Stack widget Playwright product followups

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-286, TASK-286-01, TASK-286-02, TASK-286-03, TASK-286-04, TASK-286-05

## Key Changes

### Final Stack report closure

- Closed the Stack Playwright follow-up family with one canonical finding matrix that classifies every BUG and ISSUE row as fixed, TASK-256-owned, or intentionally still shared.
- Replaced the stale report summary sections with a final state that keeps `BUG-02` and `ISSUE-02` routed to TASK-256 instead of re-claiming them inside Stack.

### Final shipped Stack contract

- Stack now supports responsive `align`, `justify`, and `wrap` values with legacy scalar compatibility, breakpoint-specific runtime markers, and the missing Stack-owned `baseline`, `around`, and `evenly` tokens.
- Wizard now explains when `gap`, `align`, and `justify` write all breakpoints together, Visual/Advanced expose per-breakpoint axis and wrap controls, and variant cards render miniatures plus editor-side `content` slot guidance.
- Public runtime keeps the neutral `Empty stack.` placeholder while admin guidance stays in editor surfaces only.

### Closure sync

- Moved `TASK-286` and `TASK-286-01` through `TASK-286-05` to `Done` and synchronized `_docs/_TASKS/README.md` statistics/tables.
- Added the final family changelog entry and backfilled the missing `914` through `918` rows in `_docs/_CHANGELOG/README.md` so the index matches the on-disk changelog files.

## Validation

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun test tests/unit/widgets/registry.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
