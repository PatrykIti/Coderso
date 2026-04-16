# TASK-178-01: Intent Operation Taxonomy and Planner Contract
# FileName: TASK-178-01_Intent_Operation_Taxonomy_and_Planner_Contract.md

**Priority:** High
**Category:** Assistant/Core + Planning Contract
**Estimated Effort:** Medium
**Dependencies:** TASK-178
**Status:** To Do

---

## Overview

Define a CMS-wide operation taxonomy for `LLM Guide` so prompts are classified by operation and resource intent before any resource-specific planning occurs.

This replaces the current pattern where many prompts are handled by narrow branches such as catalog setup, custom screen delete, page update, etc. Those branches can remain as adapters, but the first planning layer must become generic.

## Sub-Tasks

No child task files.

## Architecture

Create a strict planner contract for an intermediate operation draft, for example:

```ts
type CmsOperationDraft = {
  operation: "inspect" | "find" | "create" | "update" | "delete" | "archive" | "publish" | "configure" | "refine";
  resourceKind: string;
  targetQuery?: {
    text?: string;
    exactName?: string;
    prefix?: string;
    slug?: string;
    route?: string;
    active?: boolean;
  };
  mutation?: {
    fieldIntent?: string;
    value?: unknown;
    patch?: Record<string, unknown>;
  };
  constraints?: {
    expectedCount?: number;
    destructive?: boolean;
    requiresConfirmation?: boolean;
  };
};
```

The exact shape must be owned by assistant planner modules and validated strictly before mapping to executable typed actions.

## Integration with Current Code

- Extend `core/services/assistant/actionPlanTypes.ts` with operation draft types or import them from a new pure module.
- Add a pure strict schema/normalizer next to `core/services/assistant/actionPlanSchema.ts`; do not weaken the existing action plan schema.
- Update `core/services/assistant/actionPlannerService.ts` so `planAssistantActions` can call the generic operation draft layer before falling back to existing deterministic blueprint/resource branches.
- Keep `core/services/assistant/actionPlanHeuristics.ts` as fallback/helper logic only; do not grow it into another keyword tree.
- Existing `AssistantActionPlan` output remains the route response contract.

## Files to Change

- `core/services/assistant/actionPlanTypes.ts`
- `core/services/assistant/actionPlannerService.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `core/services/assistant/cmsOperationDraftSchema.ts` (new)
- `core/services/assistant/cmsOperationDraftTypes.ts` (new, if not colocated with schema)
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts` (new)
- `tests/vitest/assistant/action-plan-heuristics.test.ts`
- `tests/vitest/assistant/actionPlannerService.test.ts`

## Acceptance Criteria

1. Planner has one typed intermediate draft for `inspect/find/create/update/delete/archive/publish/configure/refine`.
2. Draft schema rejects unknown fields and unsafe operations.
3. Existing catalog blueprint prompts still return the same ready plans.
4. Existing resource operation prompts still return valid typed action plans through compatibility adapters.
5. Docs-only questions remain read-only and do not call mutation planning.

## Security Contract

- Visibility: internal-only through `/admin/api/assistant/actions/plan`.
- Auth model: existing admin session.
- RBAC: no new permissions beyond plan-time read permissions, but the draft must record the resource family so route-level permission checks can be applied later.
- CSRF: existing assistant action plan CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: all operation draft schemas reject unknown fields.
- Anti-abuse: draft operation cannot encode arbitrary code, SQL, filesystem paths, network calls, or unregistered action types.
- Secret handling: draft values and metadata must pass existing assistant redaction helpers before provider/audit exposure.

## Testing Requirements

- Vitest contract tests for valid/invalid draft shapes.
- Prompt fixture tests for Polish and English operations:
  - inspect/find,
  - delete,
  - update,
  - create/setup,
  - ambiguous follow-up.
- Regression that docs-only questions remain docs-only and do not become mutation plans.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- task/changelog entries on completion
