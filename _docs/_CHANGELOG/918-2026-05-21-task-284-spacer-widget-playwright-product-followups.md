# 918. TASK-284 Spacer widget Playwright product followups

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-284, TASK-284-01, TASK-284-02, TASK-284-03, TASK-284-04, TASK-284-05

## Key Changes

### Final Spacer report closure

- Closed the Spacer Playwright follow-up family with one final report table that classifies every BUG, UX, functional-gap, and accessibility row.
- Kept shared fixes attributed to `TASK-256-05-03` and `TASK-303` instead of re-claiming them inside `TASK-284`.
- Recorded `UX-04`, `A1`, and `A3` as `no-action`, and kept BF-05 explicitly deferred to `TASK-328`.

### Final shipped Spacer contract

- Spacer remains a vertical-only layout primitive with bounded token, px, viewport, and fluid-height inputs plus transient rhythm presets.
- Guide behavior is now documented as preview/editor-preview only and remains decorative inside the `aria-hidden` Spacer shell.
- Horizontal Spacer support remains out of scope for the current widget until the shared nested row-flow rendering task lands.

### Closure sync

- Moved `TASK-284` and `TASK-284-05` to `Done` and synchronized `_docs/_TASKS/README.md` statistics/tables.
- Added the final family changelog entry and kept the new shared `TASK-328` follow-up open as the future owner for honest horizontal Spacer support.

## Validation

- `git diff --check`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/widgets/renderer.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
