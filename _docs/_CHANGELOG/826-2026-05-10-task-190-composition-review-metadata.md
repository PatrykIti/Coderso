# 826 - TASK-190 composition review metadata

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-07, TASK-190-07-01, TASK-190-07-03

## Key Changes

### Assistant Review Metadata

- Added strict `metadata.blueprintComposition` support to assistant action-plan
  types and schema normalization.
- Added `blueprintCompositionMetadata.ts` to explain primary, adjunct, and gated
  capability choices, merged resource ownership, existing-resource reuse matches,
  conflicts, and deterministic candidate scores.
- Preserved existing planner/provider metadata and env-gated blueprint shadow
  diagnostics when composition metadata is present.

### Admin Review UI

- Rendered bounded composition diagnostics in the LLM Guide action review card.
- Kept review UI text redacted for secret-like dynamic metadata.

### Docs and Board

- Marked `TASK-190-07-03`, `TASK-190-07-01`, and `TASK-190-07` done.
- Updated TASK-190 task docs, architecture/security/assistant builder docs, task
  board, and changelog index.

## Validation

- `bun run test:vitest -- tests/vitest/assistant/blueprint-composition-metadata.test.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/ui/assistant-panel.test.tsx`
  - 5 files passed / 180 tests passed.
- `bun run lint`
  - Passed.
- `bun run test:vitest`
  - 580 files passed / 2586 tests passed.
- `bun run test:bun`
  - 754 tests passed outside sandbox.
- `bun run scan:security:strict`
  - Passed; container image scan skipped because `SECURITY_SCAN_IMAGE` was not set.
