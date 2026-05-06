# 791 - TASK-190 provider and shadow diagnostics slice

**Date:** 2026-05-06
**Version:** Unreleased
**Tasks:** TASK-190-02, TASK-190-02-02, TASK-190-02-03

## Key Changes

### Provider capability context

- Added bounded blueprint capability summaries to the provider planning package
  so setup/composer evaluation can reference current packs, adjunct modules, and
  latent gated/detail-page metadata without exposing action payloads.
- Added a strict capability-id composition draft schema for shadow/dev use that
  rejects unknown capability ids, duplicate ids, and provider-authored action
  arrays.

### Planner shadow diagnostics

- Added env-gated blueprint candidate shadow diagnostics that compare the
  current returned plan against primary/adjunct/gated capability selection
  without changing normal user-visible planner routing.
- Kept the current production generic provider contract on
  `cms_operation_draft`; no silent cutover to composed plan routing landed in
  this slice.

### Docs and task closure

- Updated `TASK-190-02*`, assistant architecture/site-builder/security/testing
  docs, task-board counts, and closure notes for the delivered provider/shadow
  stage.

## Validation

- `bun --cwd core lint` - passed.
- `bun --cwd core lint:types` - passed.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/action-plan-schema.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/blueprint-provider-context.test.ts tests/vitest/assistant/blueprint-composer-shadow.test.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/assistant/blueprint-capability-registry.test.ts tests/vitest/assistant/blueprint-candidate-resolver.test.ts tests/vitest/assistant/blueprint-composition-graph.test.ts tests/vitest/assistant/blueprint-conflict-resolver.test.ts tests/vitest/assistant/blueprint-action-assembler.test.ts` - passed.
