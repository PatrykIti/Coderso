# 971 - Spacer and Stats KPI lint typecheck repair

Date: 2026-05-27
Version: Unreleased
Tasks: TASK-337

## Key Changes

- Repaired the failing root `bun run lint` lane by aligning Spacer Vitest suites
  with the current single-owner `normalizeSpacerData(data)` signature instead of
  restoring the retired variant-aware test calls.
- Updated the Spacer editor-wave mock to delegate to the live owner signature on
  its fallback path while preserving the missing-height and empty-height editor
  regression coverage.
- Broadened the local Stats KPI placeholder helper from `HTMLElement` to
  `ParentNode`, which matches the existing section-scoped DOM queries without
  weakening the assertions or adding unsafe casts.
- Synchronized task tracking and closure docs for the lint-driven repair.

## Validation

- `bun run lint`
- `bun run test:vitest -- tests/vitest/widgets/spacer.test.tsx tests/vitest/widgets/styleNoneTokens.test.tsx tests/vitest/ui/spacer-editor-wave.test.tsx tests/vitest/ui/stats-kpi-editor-wave.test.tsx`
