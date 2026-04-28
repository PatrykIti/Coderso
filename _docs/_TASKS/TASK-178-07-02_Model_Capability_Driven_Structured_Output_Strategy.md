# TASK-178-07-02: Model Capability Driven Structured Output Strategy
# FileName: TASK-178-07-02_Model_Capability_Driven_Structured_Output_Strategy.md

**Priority:** High
**Category:** Assistant/Core + LLM Provider Integration
**Estimated Effort:** Medium
**Dependencies:** TASK-178-07-01, TASK-178-03, TASK-178-05
**Status:** Done (2026-04-17)

---

## Overview

Add a provider-agnostic structured output strategy for `LLM Guide` planning.

The planner must not hardcode OpenRouter-specific behavior or inline model-name checks. Instead, it should ask for a generic output contract, and a model capability layer should choose the best response strategy for the configured provider/model family.

Goal:

`model id + provider -> capability profile -> structured output strategy -> provider adapter payload -> strict local validation`

This is needed because smaller models can understand CMS intent but often drift from the expected JSON shape unless the provider/model supports schema-constrained output.

## Sub-Tasks

No child task files.

## Architecture

Introduce a model capability layer:

```ts
type StructuredOutputMode =
  | "json_schema_strict"
  | "json_object"
  | "tool_call_strict"
  | "prompt_json_only"
  | "none";

type ModelCapabilityProfile = {
  provider: string;
  modelPattern: string | RegExp;
  family: "gpt" | "gemini" | "qwen" | "llama" | "mistral" | "claude" | "unknown";
  structuredOutput: {
    preferred: StructuredOutputMode;
    supportsStrictSchema: boolean;
    supportsJsonObject: boolean;
    supportsToolCalling: boolean;
    requiresProviderParam: boolean;
  };
};
```

The planner request should remain provider-agnostic:

```ts
responseContract: {
  kind: "cms_operation_draft";
  schema: CmsOperationDraftJsonSchema;
  strict: true;
}
```

Provider adapters translate this generic contract into provider-specific request payloads. For OpenRouter this may become `response_format` plus provider routing options when the selected model/provider supports those parameters. Other providers can map the same contract to their own structured-output or tool-call mechanism.

Fallback strategy:

1. Preferred strict schema output when capability says it is supported.
2. JSON object mode when strict schema is unsupported but JSON mode is supported.
3. Prompt-only JSON instruction with repair + strict local validation.
4. Safe `needs_input` or deterministic local fallback if output remains invalid.

## Integration with Current Code

- Keep `planAssistantActionsWithProviderDraft` as the provider-aware planner boundary.
- Extend `AssistantProviderRequest` with provider-agnostic structured output fields.
- Add `modelCapabilities.ts` or equivalent pure capability resolver.
- Add `buildCmsOperationDraftJsonSchema()` next to `cmsOperationDraftSchema.ts`.
- Update `openRouterProvider.ts` and `openAiProvider.ts` to translate generic response contracts into provider payload shape.
- Do not move provider-specific request details into `actionPlannerService.ts`.
- Keep `repairCmsOperationDraft` as fallback, not the primary strategy when strict schema is supported.

## Files to Change

- `core/services/assistant/providers/providerTypes.ts`
- `core/services/assistant/providers/openAiProvider.ts`
- `core/services/assistant/providers/openRouterProvider.ts`
- `core/services/assistant/modelCapabilities.ts` (new)
- `core/services/assistant/cmsOperationDraftSchema.ts`
- `core/services/assistant/actionPlannerService.ts`
- `tests/vitest/assistant/model-capabilities.test.ts` (new)
- `tests/vitest/assistant/openAiProvider.test.ts`
- `tests/vitest/assistant/openRouterProvider.test.ts`
- `tests/vitest/assistant/cms-operation-draft-schema.test.ts`
- `tests/integration/routes/assistant-openai-live.test.ts`
- `tests/integration/routes/assistant-openrouter-live.test.ts`

## Acceptance Criteria

1. Planner asks for a generic `cms_operation_draft` output contract, not provider-specific JSON.
2. Capability resolver chooses strategy by provider/model family with explicit unknown fallback.
3. OpenRouter and OpenAI adapters support strict JSON schema when the resolved capability allows it.
4. Unknown/unsupported models fall back to prompt JSON + repair + strict local validation.
5. Live OpenRouter/OpenAI smokes use the capability resolver and structured strategy when supported.
6. Backend validation remains authoritative even when provider structured output is used.

## Security Contract

- Visibility: internal assistant provider boundary only.
- Auth model: existing admin session for route-triggered planning; provider tests may inject test-only providers.
- RBAC: structured-output strategy does not change resource permissions or action execution permissions.
- CSRF: unchanged; planning still enters through current action plan route.
- Rate-limit bucket: `assistant` for route-triggered planning; external provider limits apply for opt-in live smoke.
- Reject-unknown validation: structured provider output still passes `normalizeCmsOperationDraft`.
- Anti-abuse:
  - no direct provider-to-executor path,
  - no arbitrary tool/function execution,
  - unsupported provider/model structured-output modes fail closed or fallback safely.
- Secret handling:
  - provider request contracts must not include API keys or secret config in payload metadata,
  - live test variables remain test-only and must never be serialized into plans.

## Testing Requirements

- Vitest:
  - model capability resolver for GPT/Gemini/Qwen/unknown families,
  - provider request contract mapping for OpenRouter and OpenAI,
  - JSON Schema builder matches accepted `CmsOperationDraft` shape,
  - fallback selection when strict schema is unsupported.
- Bun integration:
  - opt-in OpenRouter smoke using `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`,
  - opt-in OpenAI smoke using `TEST_OPENAI_API_KEY` and `TEST_OPENAI_MODEL`.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/LLM_GUIDE_ACCEPTANCE_MATRIX.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` on completion

## Completion Notes (2026-04-17)

- Added provider-agnostic response contracts to `AssistantProviderRequest`.
- Added `modelCapabilities.ts` for provider/model-family structured output strategy selection.
- Added `buildCmsOperationDraftJsonSchema()` and made it compatible with strict structured-output providers that require all object properties to be listed in `required` with nullable optional values.
- OpenRouter adapter now maps generic JSON schema contracts into provider payload `response_format`.
- Added direct OpenAI provider adapter and integration/settings support behind the same provider-agnostic response contract.
- `planAssistantActionsWithProviderDraft` now asks for `cms_operation_draft` through the model capability strategy.
- Live OpenRouter planner smoke passes with `TEST_OPENROUTER_API_KEY` and `TEST_OPENROUTER_MODEL`.
- Added opt-in OpenAI live smoke using `TEST_OPENAI_API_KEY` and `TEST_OPENAI_MODEL`; local run skips when these env vars are absent.
