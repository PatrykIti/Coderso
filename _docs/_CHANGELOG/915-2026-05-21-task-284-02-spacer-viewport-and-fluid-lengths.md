# 915. TASK-284-02 Spacer viewport and fluid lengths

Date: 2026-05-21
Version: Unreleased
Tasks: TASK-284, TASK-284-02

## Key Changes

### Spacer runtime contract

- Spacer now accepts bounded viewport custom heights using `vh`, `dvh`, `svh`, and `vw`, while preserving the existing token and bare-number-to-pixel behavior.
- Spacer now accepts canonical fluid `clamp(min, preferred, max)` values only when `min` and `max` use `px|rem` and the `preferred` slot uses a viewport unit.
- Unsafe strings such as standalone `rem`, malformed `clamp()`, `calc(...)`, CSS variables, URLs, semicolons, and unsupported units now fall back before they reach runtime CSS variables or public `data-spacer-*` markers.

### Spacer editor and shared-helper coverage

- Spacer height controls now use truthful custom-length copy and the Spacer-owned normalizer for viewport and fluid values.
- `TokenOrPixelField` remains px-only by default for Divider and other existing consumers; Spacer opts into the wider grammar through additive hooks only.
- Added regression coverage for Spacer runtime markers, fixed-mode hidden-value preservation, Spacer editor custom-length entry, and Divider's unchanged px-only validation path.

## Validation

- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/divider-editor-wave.test.tsx tests/vitest/ui/widget-template-editor.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run gates:coderso`
- `bun run scan:security:strict` (fails locally because `semgrep`, `trivy`, and `gitleaks` are not installed in `$PATH`; `bun audit` still ran inside the same command)
- `bun run precommit`
