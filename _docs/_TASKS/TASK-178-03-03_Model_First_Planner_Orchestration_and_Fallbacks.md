# TASK-178-03-03: Model-First Planner Orchestration and Fallbacks
# FileName: TASK-178-03-03_Model_First_Planner_Orchestration_and_Fallbacks.md

**Priority:** High
**Category:** Assistant/Core + Planner Orchestration
**Estimated Effort:** Large
**Dependencies:** TASK-178-03-01, TASK-178-03-02, TASK-178-04, TASK-178-05
**Status:** In Progress (2026-04-16)

---

## Overview

Wire provider-first CMS operation planning into the existing `planAssistantActions` orchestration.

The model becomes the primary semantic parser in `LLM Guide`, while deterministic local planning becomes fallback and compatibility support.

## Sub-Tasks

No child task files.

## Architecture

Target orchestration:

1. `AssistantPanel` calls `/assistant/actions/plan`.
2. Route builds trusted resource/active context.
3. If LLM Guide provider is available, build provider prompt package.
4. Provider returns operation draft.
5. Server validates draft.
6. Target resolver resolves candidates.
7. Action mapper or inspection builder returns strict `AssistantActionPlan`.
8. Provider failure/malformed/unsafe output falls back to local deterministic planner or safe `needs_input`.

## Integration with Current Code

- Keep `planAssistantActions` as the local deterministic planner.
- Extend `planAssistantActionsWithProviderDraft` or add a provider-aware wrapper used by `assistantRoutes.ts`.
- Keep route permission checks in `assistantRoutes.ts`.
- Reuse `buildAssistantResourceCatalogSnapshotWithDefaultDeps`.
- Reuse `hydrateAssistantActiveSurfaceContext`.
- Reuse strict `normalizeAssistantActionPlan`.
- Do not execute provider output directly.

## Files to Change

- `core/server/routes/assistantRoutes.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts` if created by `TASK-178-05`
- `tests/integration/routes/assistant.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`

## Acceptance Criteria

1. `/assistant/actions/plan` uses provider-first planning when LLM Guide is available.
2. Provider output must pass operation draft validation, target resolution, and strict action plan validation.
3. Provider unavailable or unsafe output falls back deterministically.
4. Existing house-projects, site-kit, and current resource-operation regressions remain green.
5. No new route or duplicate execution path is introduced.

## Security Contract

- Visibility: internal-only `/admin/api/assistant/actions/plan`.
- Auth model: existing admin session.
- RBAC: route-level plan permissions remain authoritative.
- CSRF: existing plan endpoint CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: provider draft, target resolver input, and final action plan all reject unknown fields.
- Anti-abuse: provider cannot bypass review, dry-run, execute permissions, idempotency, or domain service checks.
- Secret handling: provider prompt and fallback error metadata are redacted.

## Testing Requirements

- Bun route tests for provider-enabled planning and fallback.
- Vitest fake-provider orchestration fixtures.
- Regression tests for local deterministic fallback paths.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion

## Progress Notes

- 2026-04-16: `/assistant/actions/plan` default service now uses `planAssistantActionsWithProviderDraft` with the configured provider when available.
- 2026-04-16: Provider operation drafts pass through strict local draft validation and target resolution before producing read-only/action/needs-input plans.
- Remaining work: route-level provider fixtures that exercise configured provider resolution and full fallback/error matrix.
