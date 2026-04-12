# TASK-101-09-03-03: Provider Draft Plan Adapter and Malformed Output Recovery
# FileName: TASK-101-09-03-03_Provider_Draft_Plan_Adapter_and_Malformed_Output_Recovery.md

**Priority:** High
**Category:** Core/Assistant + LLM Provider Safety
**Estimated Effort:** Medium
**Dependencies:** TASK-101-09-03-01, TASK-101-09-03-02
**Status:** To Do

---

## Overview

Dodac adapter provider draft -> local strict draft plan. Ten leaf nie robi live network calli; testy uzywaja mocked provider JSON.

Provider moze pomoc w przyszlym generowaniu planu, ale nie moze ominac lokalnego schema/repair layer.

## Security Contract

- Visibility: internal planner module only.
- Auth/RBAC/CSRF/rate-limit: inherited from `/assistant/actions/plan`; no new route.
- Provider secrets: never included in prompts/debug payloads.
- Prompt context: use redacted `resourceCatalog` and advisory `runtimeSnapshot` only.
- Provider draft must be treated as untrusted input:
  - reject unknown actions,
  - reject unknown fields,
  - reject unsafe URLs/secrets,
  - convert unrecoverable output into typed questions, not executable actions.

## Files to Change

- `core/services/assistant/actionPlanProviderAdapter.ts` (new)
- `core/services/assistant/actionPlannerService.ts` (update only if adapter is wired behind a flag/deps)
- `tests/vitest/assistant/action-plan-provider-adapter.test.ts` (new)

## Pseudocode

```ts
const draft = parseProviderDraftJson(providerText);
const normalized = normalizeProviderDraft(draft);
const repaired = repairPlannerDraft(normalized, adminContext);
return normalizeAssistantActionPlan(repaired);
```

## Sub-Tasks

1. Define provider draft shape separate from executable action plan.
2. Parse and validate mocked provider output as untrusted JSON.
3. Map valid draft families to local typed action draft.
4. Return typed questions for malformed/unsupported output.
5. Add redaction checks for secret-like draft fields.

## Testing Requirements

- `bunx vitest run tests/vitest/assistant/action-plan-provider-adapter.test.ts --config vitest.config.ts`
- No network tests.
- Cover malformed JSON, unknown action type, extra fields, secret-like keys, valid catalog draft, valid refinement draft.

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` if provider draft behavior is wired into production planner.
