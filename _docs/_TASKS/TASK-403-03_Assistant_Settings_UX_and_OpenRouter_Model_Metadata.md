# TASK-403-03: Assistant Settings UX and OpenRouter Model Metadata
# FileName: TASK-403-03_Assistant_Settings_UX_and_OpenRouter_Model_Metadata.md

**Priority:** High
**Category:** Assistant + Admin UI + Settings + OpenRouter
**Estimated Effort:** Large
**Dependencies:** TASK-403, TASK-403-02
**Status:** Done (2026-06-04)

---

## Overview

Rework `Settings -> Assistant` so the default admin experience exposes routine
assistant controls first, keeps support-oriented settings collapsed in
Advanced, routes provider key setup through encrypted Integrations, and resolves
OpenRouter model token limits through provider metadata when available.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/settings/AssistantSettingsCard.tsx` | Simplify default layout and keep technical controls in collapsed Advanced. |
| `core/admin/ui/settings/AssistantSettingsPage.tsx` | Load model metadata and preserve save/cache behavior. |
| `core/admin/services/assistantClient.ts` | Add typed client call for provider model metadata. |
| `core/server/validation/assistantSchemas.ts` | Add strict model metadata request schema. |
| `core/server/routes/assistantRoutes.ts` | Register internal model metadata route with existing auth/RBAC/rate-limit patterns. |
| `core/services/assistant/providers/openRouterProvider.ts` | Fetch and normalize OpenRouter model metadata. |
| `core/services/assistant/providers/providerTypes.ts` | Extend provider contract with model metadata shape. |
| `tests/vitest/ui/assistant-settings.test.tsx` | Cover Advanced collapsed defaults and visible controls. |
| `tests/vitest/admin/assistantClient.test.ts` | Cover metadata client request/response handling. |
| `tests/vitest/assistant/openRouterProvider.test.ts` | Cover metadata parsing and fallback behavior. |

## Implementation Pseudocode

```ts
async function resolveAssistantModelLimits(provider, model) {
  const metadata = await provider.fetchModelMetadata?.({ model });
  return {
    maxInputTokens: metadata?.maxInputTokens ?? DEFAULT_SAFE_INPUT_TOKENS,
    maxOutputTokens: metadata?.maxOutputTokens ?? DEFAULT_SAFE_OUTPUT_TOKENS,
    source: metadata ? "provider" : "default",
  };
}
```

Data flow:

- Settings UI asks the internal assistant metadata route for the selected
  provider/model.
- Route validates provider/model strictly and delegates to provider adapter
  logic.
- The UI uses returned limits as defaults while leaving Advanced override fields
  editable.

Error handling:

- Provider metadata failures are bounded and non-fatal; safe defaults remain
  available.
- Unknown fields are rejected at the route boundary.
- Missing provider keys surface as unavailable provider state, not as leaked
  secret details.

## Security Contract

- Endpoint visibility: internal admin route only.
- Auth model: existing admin session.
- RBAC: `settings:read` for metadata reads, `settings:write` for settings
  writes.
- CSRF: existing settings write POST flows require CSRF; metadata read route is
  read-only.
- Rate-limit bucket: assistant bucket for provider metadata fetches.
- Reject unknown validation: strict schema rejects unknown model metadata
  request fields.
- Anti-abuse: no public write endpoint, no nonce/signature/HMAC, no reCAPTCHA.
- Secret handling: OpenRouter/OpenAI keys stay backend-only in integrations
  runtime config; no keys are stored in browser cache, localStorage, or debug
  payloads.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-settings.test.tsx tests/vitest/admin/assistantClient.test.ts tests/vitest/assistant/openRouterProvider.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/routes/assistant.test.ts`
- Playwright CLI authenticated walkthrough for `/admin/settings/assistant`.
- Claude read-only UX review for admin UI feeling and hierarchy.

## Validation Results

- Targeted settings/client/provider Vitest coverage passed in the parent
  9-file / 90-test lane.
- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-settings.test.tsx`
  passed, 1 file / 5 tests after final UX polish.
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
  passed, 45 tests.
- `playwright-cli -s=task403-assistant-2 run-code --filename .tmp/task-403-assistant-settings-probe.js`
  passed; authenticated UI probe confirmed default controls, collapsed Advanced
  behavior, and no console/page errors.
- `claude -p --effort max ...` read-only UX review with Playwright CLI returned
  overall PASS; final non-blocking ordering/corpus-copy nits were applied.

## Documentation Updates Required

- `docs/guide/screens/assistant-settings.md`
- `docs/guide/screens/integrations.md`
- `docs/develop/assistant.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/ARCHITECTURE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1097-2026-06-04-task-403-assistant-docs-and-llm-guide-ux-repair.md`

## Acceptance Criteria

- Routine Assistant Settings controls are visible without opening Advanced.
- Token limits, quotas, timeout, startup reindex override, and support reindex
  stay collapsed in Advanced by default.
- Provider key copy points admins to encrypted Integrations settings.
- OpenRouter model metadata is normalized and safely falls back when unavailable.
