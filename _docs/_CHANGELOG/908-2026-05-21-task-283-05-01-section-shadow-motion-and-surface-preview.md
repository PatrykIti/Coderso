# 908. TASK-283-05-01 section shadow motion and surface preview

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-283-05-01

## Key Changes

### Section runtime and editor

- Section style schema now adds bounded `shadow` and `motion` tokens, keeps the legacy `contained -> shadow-sm` fallback when `style.shadow` is unset, and emits deterministic `data-section-shadow` / `data-section-motion` markers.
- The Visual editor now exposes `Surface shadow`, `Surface motion`, and a derived `Surface preview` swatch that reflects background, gradient, overlay, border, radius, and effective shadow without persisting extra state.
- Motion remains CSS-only with `motion-safe` / `motion-reduce` class pairs for `none`, `fade`, and `slide-up`; scroll observers and parallax stay out of the Section contract.

### Tests and docs

- Focused Section runtime/editor coverage now proves invalid token normalization, contained shadow fallback, explicit shadow overrides, preview rendering, and bounded motion output.
- TASK-283 tracking, the Section widget docs, the Playwright report, the task board, and the changelog index now record `TASK-283-05-01` as closed while `TASK-283-05-02` keeps the remaining post-`TASK-326` angle/opacity slider work.

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
