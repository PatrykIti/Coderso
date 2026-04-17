# TASK-179-02: Provider Prompt and Structured Output Surface Hints
# FileName: TASK-179-02_Provider_Prompt_and_Structured_Output_Surface_Hints.md

**Priority:** High
**Category:** Assistant/Core + Provider Planning
**Estimated Effort:** Medium
**Dependencies:** TASK-179-01, TASK-178-07-02
**Status:** To Do

---

## Overview

Update provider planning instructions and structured output contract so models learn the difference between surface hints and resource target names.

The model should put `Screens`, `Admin UI`, `menu`, `Pages`, and similar UI locations into `surfaceHint`, not `targetQuery`.

## Sub-Tasks

No child task files.

## Architecture

Provider instructions must include examples:

- `jakie ekrany customowe istnieja w admin ui` -> `resourceKind=custom-screen`, no target query.
- `opublikowane w sekcji Screens` -> `surfaceHint=Screens`, `filters=[status active]`.
- `House Projects` -> target query only when it names an actual resource.
- Engine/content types: Engine is `surfaceHint`, content type names are targets.
- Entries/custom content: Entries is `surfaceHint`, content type or record names are targets depending on wording.
- Forms/Listings/Menus/SEO/Widgets: product area names are `surfaceHint`; concrete labels/slugs/hrefs/template names are targets.
- Relation-oriented prompts should prefer inspect/needs-input until relation action contracts are explicit.

## Integration with Current Code

- Update `providerPlanningContext.ts` and/or `actionPlannerService` provider system prompt.
- Update `buildCmsOperationDraftJsonSchema()` through `TASK-179-01`.
- Keep provider-specific payload logic in provider adapters only.
- Keep backend validation authoritative.

## Files to Change

- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/providerPlanningContext.ts`
- `tests/vitest/assistant/provider-planning-context.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/vitest/assistant/fixtures/providerPlannerFixtures.ts`

## Acceptance Criteria

1. Provider prompt explicitly says UI surface names are not resource target names.
2. Fake provider fixtures cover natural prompts using `Screens` as a surface.
3. Provider structured output examples include `surfaceHint` and filters.
4. Existing provider action-plan fallback remains safe.

## Security Contract

- Visibility: internal provider prompt package only.
- Auth model: existing admin session context.
- RBAC: prompt package includes only authorized bounded context.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: model output still passes strict local schema.
- Anti-abuse: prompt examples cannot imply autonomous mutation or arbitrary tools.
- Secret handling: examples and context do not include secrets.

## Testing Requirements

- Vitest prompt package assertions.
- Fake provider fixtures for natural prompts.
- Redaction assertions remain green.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/SECURITY_SPEC.md`
- task/changelog entries on completion
