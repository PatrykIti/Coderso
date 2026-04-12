# TASK-171-03: Schema Repair and Clarification Questions
# FileName: TASK-171-03_Schema_Repair_and_Clarification_Questions.md

**Priority:** High  
**Category:** Core/Assistant + Planner Schema  
**Estimated Effort:** Medium  
**Dependencies:** TASK-171-02  
**Status:** Done (2026-04-12)

---

## Overview

Improve provider draft recovery so partially valid drafts become safe typed plans when possible, while underspecified or unsafe drafts return typed clarification questions.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const parsed = parseProviderDraft(draft);

if (hasUnsafeKeys(parsed) || hasUnsupportedActions(parsed)) {
  return needsInput("I need a safer, supported action scope.", questions);
}

const repaired = repairKnownDefaults(parsed, localContext);
const strict = normalizeAssistantActionPlan(repaired);

return strict.ok ? strict.plan : needsInput("Some required details are missing.", questions);
```

## Files to Change

- `core/services/assistant/actionPlanProviderAdapter.ts`
- `core/services/assistant/actionPlanSchema.ts`
- `core/services/assistant/actionPlanHeuristics.ts`
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts`
- `tests/vitest/assistant/action-plan-schema.test.ts`

## Security Contract

- Visibility: internal planning only.
- Auth model: admin session.
- RBAC: no execute permission granted by repair.
- CSRF: unchanged.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: repair may fill known defaults but must never preserve unknown fields/actions.
- Anti-abuse: unsafe drafts become typed questions or safe failure.
- Idempotency: not applicable.
- Secret handling: secret-like provider draft content is not surfaced to UI or persisted.

## Testing Requirements

- Vitest:
  - missing optional defaults are repaired,
  - missing required resource identity becomes question,
  - unknown action/field/secret-like key is rejected safely.
- Bun:
  - not required unless route error mapping changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` if recovery flow changes.
- `_docs/CMS_API.md` if `needs_input` response examples change.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Safe partial drafts can be repaired deterministically.
2. Unsafe drafts never become executable plans.
3. Clarification questions are typed and user-actionable.

## Completion Notes (2026-04-12)

- Provider drafts with missing optional action labels now repair deterministically through existing fallback id/title/description defaults.
- Provider drafts that fail strict schema can preserve typed provider questions instead of losing useful clarification context.
- Unsafe unknown actions and secret-like keys remain non-executable recovery paths.
