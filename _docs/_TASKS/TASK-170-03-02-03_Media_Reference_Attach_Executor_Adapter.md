# TASK-170-03-02-03: Media Reference Attach Executor Adapter
# FileName: TASK-170-03-02-03_Media_Reference_Attach_Executor_Adapter.md

**Priority:** High  
**Category:** Core/Assistant + Media  
**Estimated Effort:** Large  
**Dependencies:** TASK-170-03-02-01, TASK-170-03-02-02  
**Status:** Done (2026-04-12)

---

## Overview

Promote `media.reference.attach` only after target-specific patch semantics are explicit. This action must reference existing media assets and must not transport upload bytes.

## Sub-Tasks

No child task files yet. Split by target type if entries/pages require different patch helpers.

## Pseudocode

```ts
const media = await deps.getMediaById(action.input.mediaId);
if (!media) throw new Error("assistant_action_dependency_missing");

const target = await loadSupportedMediaTarget(action.input.targetType, action.input.targetId);
const next = attachExistingMediaReference(target, action.input.field, media.id);
return saveTargetThroughDomainService(next);
```

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/actionExecutorService.ts`
- `core/services/media/mediaService.ts` only if lookup helper is missing
- target domain service helpers for entry/page references
- targeted Vitest/Bun tests

## Security Contract

- Visibility: internal only.
- Auth model: admin session.
- RBAC: `media:read` plus target resource write permission.
- CSRF: existing action endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unknown target type, unknown field, and raw upload payloads are rejected.
- Anti-abuse: no public write endpoint and no raw upload transport.
- Idempotency: repeated attach must not duplicate media references.
- Secret handling: no signed URLs, private storage keys, or credentials in preview/result metadata.

## Testing Requirements

- Vitest:
  - pure target patch helper if extracted.
- Bun:
  - executor tests for supported target types,
  - media missing/target missing validation,
  - no duplicate attach behavior.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry when completed

## Acceptance Criteria

1. Action attaches existing media only.
2. Raw upload bytes never enter assistant action payloads.
3. Target writes use existing domain services.

## Completion Notes (2026-04-12)

- Promoted `media.reference.attach` from contract-only to executable assistant action type for `entry` targets.
- Added strict input normalization for `mediaId`, `targetType=entry`, `targetId`, and `field`.
- Added dry-run/execute adapter logic through existing `getMediaById`, `getEntry`, and `updateEntry`.
- Kept page/media-block attachment out of scope until a page-specific patch contract lands.
- Added Vitest schema/provider/registry contract coverage and Bun executor coverage for attach/noop behavior.
