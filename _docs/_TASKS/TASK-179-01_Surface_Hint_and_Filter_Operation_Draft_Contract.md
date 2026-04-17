# TASK-179-01: Surface Hint and Filter Operation Draft Contract
# FileName: TASK-179-01_Surface_Hint_and_Filter_Operation_Draft_Contract.md

**Priority:** High
**Category:** Assistant/Core + Schema
**Estimated Effort:** Medium
**Dependencies:** TASK-179, TASK-178-01, TASK-178-07-02
**Status:** To Do

---

## Overview

Extend `CmsOperationDraft` with safe `surfaceHint` and `filters` support.

This prevents UI location names such as `Screens`, `Admin UI`, `menu`, or `Pages` from being misused as `targetQuery.text`.

## Sub-Tasks

No child task files.

## Architecture

Add fields:

```ts
type CmsOperationFilter = {
  field: "status" | "visibility" | "showInSidebar";
  operator: "eq" | "in";
  value: string | boolean | string[];
};

type CmsOperationDraft = {
  surfaceHint?: string | null;
  filters?: CmsOperationFilter[];
};
```

The JSON Schema builder must remain compatible with strict structured-output providers, including nullable optional values where required.

## Integration with Current Code

- Extend `core/services/assistant/cmsOperationDraftSchema.ts`.
- Update `buildCmsOperationDraftJsonSchema()`.
- Update `repairCmsOperationDraft()` so safe model-provided `filters` can survive repair.
- Do not allow arbitrary filter fields/operators.
- Do not change action plan schema unless needed for inspection metadata.

## Files to Change

- `core/services/assistant/cmsOperationDraftSchema.ts`
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `tests/vitest/assistant/provider-planner-fixtures.test.ts`
- `tests/vitest/assistant/fixtures/providerPlannerFixtures.ts`

## Acceptance Criteria

1. `surfaceHint` is accepted as a separate field and never merged into `targetQuery`.
2. Only allowlisted filter fields/operators validate.
3. `showInSidebar`, `status`, and `visibility` filters validate.
4. Unknown filter fields fail closed.
5. Provider draft repair keeps safe filters and drops unsafe extras.

## Security Contract

- Visibility: internal planner schema only.
- Auth model: existing admin session through action plan route.
- RBAC: no permission change; filters only narrow already authorized resource summaries.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: strict schema rejects unknown fields/operators.
- Anti-abuse: filters cannot encode DB paths, SQL, relation paths, or arbitrary field names.
- Secret handling: filter values cannot contain secret-like markers.

## Testing Requirements

- Vitest schema tests for valid/invalid filters.
- Repair tests for model-shaped filter output.
- Structured schema snapshot/assertion for `surfaceHint` and `filters`.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion
