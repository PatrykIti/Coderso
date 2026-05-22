# 910. TASK-283-07 section region labels and structure UX

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-283-07

## Key Changes

### Section metadata and shared builder surfaces

- Section now owns optional editor-only `regions[]` metadata keyed by stable repeatable region instance ids while preserving the existing `region:<id>` slot storage contract.
- `BlockSettings` now syncs that metadata through add, remove, reorder, and rename flows, and `VisualPanelSlotControls` now exposes inline region-label inputs without creating a second Section-specific structure owner.
- `BlockList` and `buildSlotOptions` now reuse the same Section label resolver so canvas slot headers, empty-slot add buttons, and insert-target selectors stay truthful after a region is renamed.

### Tests and docs

- Focused Section and builder coverage now proves normalization, orphan pruning, rename callbacks, slot-label propagation, and the absence of public runtime label leakage.
- TASK-283 tracking, the Section widget docs, and the Playwright report now record W4 as closed while `TASK-283-05-02`, `TASK-283-08`, `TASK-326`, and `TASK-327` remain open.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx tests/vitest/pageBuilder/blockSettings-wave.test.tsx tests/vitest/pageBuilder/visualPanel.test.tsx tests/vitest/pageBuilder/blockList.test.tsx tests/vitest/ui/widgetInsertUtils.test.ts`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `set -a && source .env && set +a && bun run gates:coderso`
- `bun run scan:security:strict` (local `semgrep`, `trivy`, and `gitleaks` executables are still missing; `bun audit` ran successfully inside the command)
- `bun run precommit`
- `git diff --check`
