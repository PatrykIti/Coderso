# TASK-179-03: Surface-Aware Target Resolver and Filtering
# FileName: TASK-179-03_Surface_Aware_Target_Resolver_and_Filtering.md

**Priority:** High
**Category:** Assistant/Core + Target Resolution
**Estimated Effort:** Large
**Dependencies:** TASK-179-01, TASK-179-02, TASK-178-02, TASK-178-05
**Status:** Done (2026-04-17)

---

## Overview

Teach `cmsTargetResolver` to use `surfaceHint` and filters correctly.

Examples:

- `surfaceHint=Screens` + `resourceKind=custom-screen` -> use custom screens catalog.
- `targetQuery.text=Screens` from older provider output should not hide all custom screens when the surface is obvious.
- `status=published` for custom screens maps to `status=active`.
- `visible=true` for custom screens maps to `showInSidebar=true` unless wording implies active status instead.

## Sub-Tasks

No child task files.

## Architecture

Add resource-family-specific filter interpreters:

- `custom-screen`:
  - `status=published` -> `active`,
  - `status=active` -> `active`,
  - `visibility/showInSidebar/visible=true` -> `showInSidebar=true`,
  - `surfaceHint=Screens` does not filter by name.
- `page`:
  - `status=published` stays `published`,
  - `visible` does not imply navigation unless explicitly stated.
- Unknown filters -> `needs_input` or ignored only for read-only inspection with clear assumptions.

## Integration with Current Code

- Update `core/services/assistant/cmsTargetResolver.ts`.
- Ensure `cmsOperationActionMapper.ts` receives filtered exact/candidate outputs only.
- Keep broad destructive operations guarded by expected count/candidate review.

## Files to Change

- `core/services/assistant/cmsTargetResolver.ts`
- `core/services/assistant/cmsOperationActionMapper.ts` only if filter outcomes affect actions
- `tests/vitest/assistant/cms-target-resolver.test.ts`
- `tests/vitest/assistant/cms-operation-action-mapper.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Acceptance Criteria

1. `no a jakies sa opublikowane w sekcji 'Screens'?` returns active custom screens.
2. `czy mozesz sprawdzic jakie ekrany customowe istnieja w admin ui?` returns all custom screens, not a `screen-` text search.
3. `widoczne w Screens` can filter by sidebar visibility when wording implies visibility.
4. Surface hints do not become target queries.
5. Destructive follow-ups still require exact/counted targets.

## Security Contract

- Visibility: internal planner resolver.
- Auth model: existing admin session.
- RBAC: filters only narrow authorized resource summaries.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: unknown filter fields/operators fail closed at schema layer.
- Anti-abuse: filters cannot bypass target count safeguards.
- Secret handling: resolver never reads secret-bearing payloads.

## Testing Requirements

- Vitest resolver tests for each natural prompt class.
- Planner tests with real context/resource catalog.
- Regression that resource-name queries still work.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion

## Completion Notes (2026-04-17)

- `cmsTargetResolver` now applies surface-aware read-only handling and allowlisted filters.
- Custom screens map `published/opublikowane` to `active`.
- Custom screens map `visible/widoczne/showInSidebar=true` to `showInSidebar=true`.
- Page `published` filters remain page-status specific.
- Surface-only read queries return visible candidates instead of treating UI surface names as resource names.
