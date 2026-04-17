# TASK-178-05: Generic Mutation Planning and Action Mapping
# FileName: TASK-178-05_Generic_Mutation_Planning_and_Action_Mapping.md

**Priority:** High
**Category:** Assistant/Core + Typed Actions
**Estimated Effort:** Large
**Dependencies:** TASK-178-01, TASK-178-02, TASK-178-03, TASK-178-04, TASK-170, TASK-174
**Status:** Done (2026-04-17)

---

## Overview

Map generic CMS operation drafts into existing strict typed actions instead of adding prompt-specific code paths.

Examples:

- page name/slug/status/settings edits -> `page.update`,
- page deletion by resolved target -> `page.delete`,
- entry metadata/data edit -> `entry.update`,
- custom screen metadata/sidebar edit -> `custom-screen.update`,
- form status/access edit or archive/delete -> `form.update` / `form.archive` / `form.delete`,
- listing query/template edits -> listing update/patch actions,
- menu/SEO edits -> menu/SEO update/delete actions.

Unsupported mutations must return gated/needs-input plans that explain the missing action family, not silently invent behavior.

## Sub-Tasks

No child task files.

## Architecture

Create a generic operation-to-action mapper:

`CmsOperationDraft + resolved target + registry contract -> AssistantPlannedAction[] | needs_input | gated`

The mapper must use registry metadata to:

- choose supported action type,
- build typed action input,
- preserve unrelated fields/config,
- add dependency/conflict expectations,
- attach destructive warnings,
- request clarification for ambiguous targets/fields/values.

Existing action-specific helpers can move behind the mapper as resource adapters, but prompt parsing must not live inside each adapter.

## Integration with Current Code

- The mapper must output existing `AssistantPlannedAction` variants and pass `normalizeAssistantActionPlan`.
- Reuse existing executor adapters in `actionExecutorService.ts`; do not duplicate mutation logic.
- Reuse `actionRegistry.ts` and `actionFamilyContracts.ts` for action allowlisting and permission declarations.
- Existing specific planner helpers may be retained temporarily as adapter implementations, but prompt parsing should move to operation draft + target resolver.
- New typed actions may be promoted only when a resource operation cannot be represented by existing action contracts, and must follow TASK-170/TASK-174 patterns.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionRegistry.ts`
- `core/services/assistant/actionFamilyContracts.ts`
- `core/services/assistant/cmsOperationActionMapper.ts` (new)
- `core/services/assistant/cmsResourceRegistry.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/actionExecutorService.ts` only for newly promoted action adapters
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts` (new)
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/unit/assistant/actionExecutorService.test.ts` when mapper promotes/exercises executable mutations
- `tests/integration/routes/assistant.test.ts`

## Acceptance Criteria

1. Generic drafts map to existing typed actions for supported page, entry, screen, form, listing, menu, SEO, and widget-template operations.
2. Unsupported drafts return gated/needs-input plans with a concrete missing action family.
3. Broad deletes/updates require explicit candidate review and expected count.
4. All mapped plans pass strict action schema and existing route permission checks.
5. Executor behavior remains centralized in current domain-service adapters.

## Security Contract

- Visibility: internal-only through `/admin/api/assistant/actions/*`.
- Auth model: existing admin session.
- RBAC:
  - mapping records required permissions per action,
  - route-level per-action permission checks remain authoritative.
- CSRF: existing assistant action route CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation:
  - mapper output must pass strict action plan schema,
  - resource adapter inputs must reject unknown fields.
- Anti-abuse:
  - no arbitrary patch paths unless registered for the resource family,
  - destructive broad operations require explicit count and candidate review,
  - provider/client target ids are rechecked before execute.
- Secret handling: mutation inputs must not contain secrets or privileged settings unless the resource contract explicitly supports backend-only secret handling and redaction.

## Testing Requirements

- Vitest mapping fixtures for supported resources and unsupported gaps.
- Bun executor smoke tests for mapped mutations that already have action adapters.
- Route permission matrix updates for any new promoted action families.
- Regression that broad destructive prompts stay `needs_input`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion

## Completion Notes (2026-04-17)

- Added `cmsOperationActionMapper.ts` as the generic operation-to-action mapper.
- Mapper outputs existing `AssistantPlannedAction` variants and reuses the current executor/domain-service layer.
- Generic drafts now map to existing typed actions for pages, content types, custom screens, forms, listing queries/templates, menu items, SEO documents, and widget templates where target/field data is sufficient.
- Broad or unsupported operations return `needs_input` with candidate context instead of guessing.
- Existing resource-specific planner paths remain in place and still take priority for active page/widget/template workflows.
- Added Vitest mapper coverage plus route/executor smoke validation.
