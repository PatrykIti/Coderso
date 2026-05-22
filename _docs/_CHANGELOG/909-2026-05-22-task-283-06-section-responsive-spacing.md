# 909. TASK-283-06 section responsive spacing

Date: 2026-05-22
Version: Unreleased
Tasks: TASK-283-06

## Key Changes

### Section runtime and editor

- Section layout now owns optional `mobilePaddingBlock`, `mobilePaddingInline`, `desktopPaddingBlock`, and `desktopPaddingInline` tokens while keeping the existing base `paddingBlock` / `paddingInline` contract intact.
- Runtime padding output now stays deterministic through bounded class maps only: mobile overrides replace the base token on smaller screens, desktop overrides apply from `md` upward, and mobile-only overrides automatically restore the base token at `md`.
- The Visual editor now exposes `Mobile` and `Desktop` vertical/side padding controls with `Match base` sentinels so unset overrides stay absent from persisted payloads.

### Tests and docs

- Focused Section runtime/editor coverage now proves invalid responsive token normalization, mobile override rendering, desktop override rendering, full-bleed inline-padding suppression, and `Match base` clearing behavior.
- TASK-283 tracking, the Section widget docs, the Playwright report, the task board, and the changelog index now record `TASK-283-06` as closed while `TASK-283-07`, `TASK-283-08`, `TASK-283-05-02`, `TASK-326`, and `TASK-327` remain open.

## Validation

- `bunx vitest run --config vitest.config.ts tests/vitest/widgets/section.test.tsx`
- `bunx vitest run --config vitest.config.ts tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict` (expected to remain blocked by missing local `semgrep`, `trivy`, and `gitleaks` executables; `bun audit` still runs)
- `bun run precommit`
- `git diff --check`
