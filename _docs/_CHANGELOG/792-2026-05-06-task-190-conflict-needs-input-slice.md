# 792 - TASK-190 conflict needs-input slice

**Date:** 2026-05-06
**Version:** Unreleased
**Tasks:** TASK-190-03, TASK-190-03-02, TASK-190-07, TASK-190-07-01

## Key Changes

### Typed conflict classification

- Extended the blueprint composition conflict resolver so duplicate resource
  collisions now classify into typed `route_conflict`,
  `resource_slug_conflict`, `field_type_conflict`, and blocking
  `gated_domain` cases for the current capability set.
- Tightened the conflict contract to a closed typed code/severity set and
  added regression coverage for explicit `resource_slug_conflict` handling.

### Needs-input composition fallback

- Wired the local setup planner into the composed blueprint path for supported
  mixed-capability and primary-plus-gated setup requests, while leaving
  single-pack setup/refinement routing and later detail/media cutover waves
  deferred.
- Changed the composed blueprint assembler to return typed `needs_input` or
  `gated` plans with concrete review questions when blocking conflicts exist,
  instead of collapsing to a null result.
- Fixed conflict dedupe so typed route/resource/schema conflicts do not surface
  a second generic duplicate question for the same target, and gated summaries
  now name the actual gated capability instead of only the primary pack.
- Restricted blueprint composition and shadow diagnostics to trusted
  server-injected resource catalogs via `includeResourceCatalog`, so
  client-authored catalog payloads no longer influence the cutover path.
- Kept the composed-plan path non-executable until the blocking conflict is
  resolved, which preserves the current strict action boundary.

### Docs and task sync

- Updated `TASK-190` source-of-truth notes, task board rows, architecture,
  and security docs to reflect the landed conflict-handling slice and the
  remaining media/permission/detail-page follow-up scope.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/blueprint-conflict-resolver.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts tests/vitest/assistant/blueprint-composition-graph.test.ts tests/vitest/assistant/blueprint-composer-shadow.test.ts tests/vitest/assistant/actionPlannerService.test.ts` - passed.
- Bun executor/no-duplicate lanes from the broader `TASK-190-07` parent remain
  deferred for this slice and were not run here.
