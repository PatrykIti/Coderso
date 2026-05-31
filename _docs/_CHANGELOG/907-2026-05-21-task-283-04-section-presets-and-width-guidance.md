# 907. TASK-283-04 section presets and width guidance

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-283-04

## Key Changes

### Section editor

- The Section Wizard and Visual editors now share the same variant card UI and add local quick presets for `Standard content`, `Framed panel`, `Edge-to-edge`, `Hero band`, and `Two-column region group`.
- Preset application stays bounded to Section-owned `heading`, `layout`, `style`, and `variant` fields, preserves existing heading copy and region slot content, and uses the live block-patch path atomically when that editor contract is available.
- Width labels now expose friendly rem/px guidance while preserving the stored schema tokens, and the editor copy now explains the current `Wide`/`Bleed` truthfulness boundary plus the active gradient-over-background behavior.

### Tests and docs

- Focused Section editor coverage now proves the preset flows, Wizard/Visual parity, friendly width labels, gradient guidance, and the presence of current gradient Clear buttons so the stale W9 report note is retired instead of being reimplemented locally.
- Section widget docs, the TASK-283 tracker, the Playwright report, the task board, and the changelog index now reflect the shipped preset/guidance behavior and the remaining shared `TASK-326` truthfulness scope.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (expected to remain blocked by missing local `semgrep`, `trivy`, and `gitleaks` executables; `bun audit` still runs)
- `bun run precommit`
- `git diff --check`
