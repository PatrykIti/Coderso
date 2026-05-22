# 917. TASK-284-04 Spacer horizontal orientation decision

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-284, TASK-284-04

## Key Changes

### BF-05 decision

- `TASK-284-04` closes BF-05 as an explicit defer instead of adding a misleading width-only Spacer toggle.
- Spacer remains a vertical-only primitive because the current shared `WidgetRenderer` shell still renders nested widgets as full-width blocks.
- Honest horizontal Spacer support now has a concrete future owner: shared `TASK-328`, which will own nested row-flow/container-aware widget rendering truthfulness.

### Docs and planning sync

- Updated Spacer docs and the Playwright report to record BF-05 as deferred with a concrete blocker.
- Synced `TASK-284-04`, the parent TASK-284 file, and the task board so the next Spacer family leaf is `TASK-284-05`.
- Added `TASK-328` as the new shared follow-up task instead of patching the shared drift locally inside Spacer.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx`
- `git diff --check`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
