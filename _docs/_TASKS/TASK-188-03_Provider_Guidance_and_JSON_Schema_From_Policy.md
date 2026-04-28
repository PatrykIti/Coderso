# TASK-188-03: Provider Guidance and JSON Schema From Policy
# FileName: TASK-188-03_Provider_Guidance_and_JSON_Schema_From_Policy.md

**Priority:** High
**Category:** Assistant/Provider + Structured Output
**Estimated Effort:** Medium
**Dependencies:** TASK-188-01, TASK-188-02
**Status:** Done (2026-04-19)

---

## Overview

Generate provider guidance and CMS operation draft schema details from `assistantOperationPolicy`.

## Sub-Tasks

No child task files.

## Acceptance Criteria

1. Provider prompt no longer hardcodes resource/filter/field guidance in free text.
2. JSON schema remains strict and provider-safe.
3. Generated guidance includes only supported/gated policy surfaces.
4. Secret-bearing surfaces are described as redacted/gated.

## Files to Change

- `core/services/assistant/operationPolicy/providerGuidance.ts` (new)
- `core/services/assistant/cmsOperationDraftSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/operation-policy-provider-guidance.test.ts`
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts`

## Pseudocode

```ts
export function buildProviderPolicyGuidance(policy: AssistantOperationPolicy) {
  return {
    resources: Object.values(policy.resources).map(toProviderResourceGuidance),
    safety: buildProviderSafetyGuidance(policy),
    createContracts: buildCreateItemGuidance(policy),
  };
}

const providerPlannerSystemPrompt = [
  baseInstructions,
  JSON.stringify(buildProviderPolicyGuidance(assistantOperationPolicy)),
].join("\n");
```

## Replacement Notes

Remove hard-coded provider prompt lines for filters, create item fields, and destructive safety after generated guidance is green.

## Security Contract

- Visibility: provider prompt package only.
- Auth model: no runtime change.
- RBAC: provider guidance cannot grant permissions.
- CSRF: no route change.
- Rate-limit bucket: existing provider route behavior.
- Reject-unknown validation: provider schema remains strict.
- Anti-abuse: broad destructive rules are included in guidance.
- Secret handling: generated prompt must not include secret values.

## Testing Requirements

- Snapshot/structured tests for provider guidance generated from policy.
- Existing OpenAI/OpenRouter unit/live smokes remain green.

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- changelog on completion

## Completion Notes (2026-04-19)

- Added `operationPolicy/providerGuidance.ts` to derive provider registry entries, provider guidance, operation draft guidance, create contracts, safety notes, and provider system prompt policy JSON from `assistantOperationPolicy`.
- Updated provider planning prompt packages to include `policyGuidance` and policy-derived `operationDraftGuidance`.
- Updated the provider planner system prompt and structured output schema request to use `assistantOperationPolicy` as the source for allowed resource kinds, operations, filter fields, gated modes, and redacted surfaces.
- Kept runtime resolver/action mapper behavior unchanged; this task only changes provider prompt/schema metadata sources.

## Validation (2026-04-19)

- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/operation-policy-provider-guidance.test.ts tests/vitest/assistant/provider-planning-context.test.ts tests/vitest/assistant/cms-operation-draft-schema.test.ts tests/vitest/assistant/provider-planner-fixtures.test.ts tests/vitest/assistant/openAiProvider.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
