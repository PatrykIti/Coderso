# TASK-180-02: Assistant CMS Multi-Target Planning
# FileName: TASK-180-02_Assistant_CMS_Multi_Target_Planning.md

**Priority:** High
**Category:** Assistant/Core + CMS Planning
**Estimated Effort:** Large
**Dependencies:** TASK-180, TASK-178-05, TASK-174-03, TASK-174-04
**Status:** To Do

---

## Overview

Make counted and explicit multi-resource prompts plan through reviewed typed actions across CMS resource families.

This technical subtask owns planning only. It must not add new executor shortcuts or generic bulk action types.

## Sub-Tasks

- `TASK-180-02-01_Counted_Delete_and_Archive_Target_Planning.md`
- `TASK-180-02-02_Multi_Update_and_Create_Planning_Boundaries.md`

## Architecture

The planner already has the right high-level pieces:

- `CmsOperationDraft`
- `resolveCmsOperationTargets`
- `mapCmsOperationToActionPlan`
- existing typed action families

This wave makes the multi-target contract explicit and tested:

- counted destructive operations can map to many typed actions,
- multi-updates require one valid patch that applies to every exact target,
- multi-creates require explicit structured input for each requested resource,
- ambiguous broad prompts stay `needs_input`.

## Integration Points

- `core/services/assistant/cmsOperationDraftSchema.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/admin/ui/assistant/components/ActionPlanReview.tsx`

## Acceptance Criteria

1. Counted multi-target delete/archive works for safe supported families.
2. Multi-update works only when one bounded patch is valid for every target.
3. Multi-create works only through existing typed upsert/create actions with explicit validated inputs.
4. Unsupported or broad prompts return `needs_input`.
5. Generated plans remain normal reviewed action plans with one visible action per mutation.

## Security Contract

- Visibility: internal assistant planning only.
- Auth model: existing admin session.
- RBAC: planning is advisory; dry-run/execute still enforce family permissions.
- CSRF: no new route; existing POST planning remains CSRF-protected.
- Rate-limit bucket: existing `assistant`.
- Reject-unknown validation: operation drafts and generated action plans remain strict.
- Anti-abuse: no broad destructive mutation without exact count/targets and review.
- Secret handling: planner context and review metadata must not expose submissions, secrets, cookies, CSRF tokens, provider keys, or privileged settings.

## Testing Requirements

- Covered by leaf tests.
- Parent validation:
  - `bun --cwd core lint`
  - `bun --cwd core lint:types`
  - `bun run vitest run --config vitest.config.ts tests/vitest/assistant/cms-target-resolver.test.ts tests/vitest/assistant/cms-operation-action-mapper.test.ts`
  - UI review tests if rendering changes.

## Documentation Updates Required

- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md` if planning security boundaries change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and changelog entry on completion
