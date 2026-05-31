# 790 - TASK-190 blueprint composer foundation slice 1

**Date:** 2026-05-05
**Version:** Unreleased
**Tasks:** TASK-190, TASK-190-01, TASK-190-01-01, TASK-190-01-02, TASK-190-02, TASK-190-02-01, TASK-190-03, TASK-190-03-01, TASK-190-03-02, TASK-190-07, TASK-190-07-01

## Key Changes

### Capability registry and prompt routing foundation

- Added a strict blueprint capability schema and registry for the current
  catalog packs, lead capture, editorial hub, product inquiry, booking, and
  checkout/payment modules.
- Added a first-class `content-route` capability resource kind so
  `setting.content-route.upsert` metadata stays separate from the explicit
  `site-kit.*` flow.
- Registered latent `detail-page` intent as capability metadata for the current
  catalog families without pretending that detail-page runtime/admin flows are
  already executable.
- Introduced deterministic prompt-signal routing for mixed setup requests so
  the foundation layer can rank primary, adjunct, and gated capability
  candidates without changing the current user-visible planner route yet.

### Composition graph and typed action assembly

- Added a deterministic composition graph for the current capability set plus
  stable conflict detection for incompatible duplicate typed actions.
- Implemented the first composed action assembler over existing typed action
  families, including merge-safe resource deduplication and dependency-safe
  `form.upsert` before `page.upsert` ordering.
- Kept user-visible setup planning on the current single-blueprint path while
  the new graph/assembler foundation stays behind the deferred shadow/cutover
  leaves.

### Docs and task-board sync

- Updated assistant architecture/site-builder source-of-truth docs, acceptance
  matrix coverage notes, `TASK-190*` statuses, and task board counts to reflect
  the delivered foundation slice, deferred cutover, and remaining follow-up
  waves.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-capability-schema.test.ts tests/vitest/assistant/blueprint-capability-registry.test.ts tests/vitest/assistant/blueprint-candidate-resolver.test.ts tests/vitest/assistant/blueprint-composition-graph.test.ts tests/vitest/assistant/blueprint-conflict-resolver.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/actionPlannerService.test.ts` - passed.
