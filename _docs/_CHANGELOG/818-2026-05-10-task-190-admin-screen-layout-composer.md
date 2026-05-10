# 818 - TASK-190 admin screen layout composer

**Date:** 2026-05-10
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-06, TASK-190-06-01

## Key Changes

### Admin surface composition

- Added a shared `blueprintAdminSurfaceComposer` for composing custom-screen
  review layouts from admin groups without introducing a parallel screen schema.
- Moved catalog-family screen block generation onto that helper while preserving
  the current `custom-screen.upsert` `blocks` / `bindings` transport shape.
- Validated referenced content schema fields, secret-like field rejection,
  deterministic block ids, and `custom-screen-builder` widget surface ownership.

### Docs and board

- Marked `TASK-190-06-01` done and moved the `TASK-190-06` umbrella into
  progress for the remaining binding, permission, and workspace leaves.
- Updated the assistant composer docs and board counts for the new admin-screen
  layout seam.

## Validation

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-admin-surface-composer.test.ts`
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-admin-surface-composer.test.ts tests/vitest/assistant/catalogBlueprintEngine.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/actionPlannerService.test.ts`
- `bun run test:vitest`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run lint`
- `bun run scan:security:strict` blocked in the local sandbox on Semgrep X509
  trust-anchor initialization and `bun audit` network access; Trivy and
  Gitleaks sub-scans completed cleanly.
