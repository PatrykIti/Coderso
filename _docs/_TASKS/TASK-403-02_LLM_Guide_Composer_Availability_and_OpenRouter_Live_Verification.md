# TASK-403-02: LLM Guide Composer Availability and OpenRouter Live Verification
# FileName: TASK-403-02_LLM_Guide_Composer_Availability_and_OpenRouter_Live_Verification.md

**Priority:** High
**Category:** Assistant + Admin UI + OpenRouter
**Estimated Effort:** Medium
**Dependencies:** TASK-403, TASK-403-01
**Status:** Done (2026-06-04)

---

## Overview

Fix the floating assistant composer so LLM Guide mode is gated by LLM provider
availability instead of docs-only corpus readiness. Verify the behavior with
focused UI tests, Bun assistant route tests, and the explicit OpenRouter live
lanes.

## Sub-Tasks

- None. This is an execution leaf.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/assistant/AssistantPanel.tsx` | Make composer disabled/enabled state depend on selected assistant mode. |
| `core/services/assistant/actionPlanHeuristics.ts` | Route architecture-studio portfolio prompts away from the generic house-projects catalog. |
| `core/services/assistant/blueprints/blueprintCandidateResolver.ts` | Compose services-directory adjuncts when a setup prompt asks for an offer/services flow. |
| `core/services/assistant/blueprints/blueprintCompositionGraph.ts` | Build each composed blueprint fragment with its own intent family. |
| `core/widgets/core/formEmbed.tsx` | Accept transient runtime resolver fields used by public form rendering. |
| `core/admin/ui/assistant/components/ActionPlanReview.tsx` | Use stable unique keys for repeated preview warnings/conflicts. |
| `tests/vitest/ui/assistant-panel-lazy-load.test.tsx` | Add mode-aware composer regression coverage. |
| `tests/vitest/assistant/actionPlannerService.test.ts` | Cover architecture-studio setup composition. |
| `tests/vitest/widgets/formEmbed.test.tsx` | Cover transient resolved form runtime payload validation. |
| `tests/integration/routes/assistant.test.ts` | Cover backend assistant status/provider availability where route contract changes. |
| `tests/integration/assistant-live/pagesLiveMatrix.test.ts` | Keep live CMS fixture aligned with current widget schema. |

## Implementation Pseudocode

```ts
function resolveAssistantComposerState(status, currentMode) {
  if (!status?.enabled) return { disabled: true, reason: "assistant_disabled" };
  if (currentMode === "docs-only" && !status.indexReady) {
    return { disabled: true, reason: "docs_not_ready" };
  }
  if (currentMode === "llm-guide" && !status.llmAvailable) {
    return { disabled: true, reason: "llm_unavailable" };
  }
  return { disabled: false };
}
```

Data flow:

- Admin status payload exposes assistant enabled state and `llmAvailable`.
- The panel derives composer state from the current selected mode at render
  time.
- Docs-only readiness no longer blocks LLM Guide when the provider is
  configured and available.

Error handling:

- LLM Guide still fails closed when provider settings or encrypted integration
  secrets are missing.
- Docs-only mode still tells the user when the docs index is not ready.

## Security Contract

- Endpoint visibility: internal admin assistant routes only.
- Auth model: existing admin session.
- RBAC: `settings:read` for status/chat reads and existing content/resource
  permissions for LLM Guide planning flows.
- CSRF: required for assistant write/action POST routes; unchanged by this leaf.
- Rate-limit bucket: assistant bucket for chat/action calls.
- Reject unknown validation: existing assistant request schemas remain strict.
- Anti-abuse: no public write endpoint, no nonce/signature/HMAC, no reCAPTCHA.
- Secret handling: provider keys remain backend-only and are not serialized to
  browser state, localStorage, or transcript payloads.

## Testing Requirements

- `bun run vitest run --config vitest.config.ts tests/vitest/ui/assistant-panel.test.tsx tests/vitest/ui/assistant-panel-lazy-load.test.tsx`
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
- `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter`

## Validation Results

- Parent targeted Vitest assistant lane passed, 9 files / 90 tests.
- `bun run vitest run --config vitest.config.ts tests/vitest/assistant/actionPlannerService.test.ts tests/vitest/ui/assistant-panel-lazy-load.test.tsx tests/vitest/ui/assistant-panel-interaction.test.tsx tests/vitest/ui/assistant-panel.test.tsx tests/vitest/widgets/formEmbed.test.tsx`
  passed, 5 files / 161 tests after the full-service E2E follow-up.
- `playwright-cli -s=task403-assistant-full-service run-code --filename .tmp/task-403-assistant-full-service-e2e.js`
  passed after restarting `coderso-dev-core-host` on `3001/5175/5176`:
  settings remained `defaultMode=docs-only`, docs index was empty, LLM was
  available, the composer opened in LLM Guide, plan/dry-run/execute all returned
  200, 14 typed actions executed with 0 failures, and `/portfolio`, `/uslugi`,
  and `/kontakt` rendered with 200 and no console/page errors.
- Claude read-only UX/product review of the sanitized E2E result classified the
  output as a working typed scaffold, not a launch-ready full service site; the
  missing home/about/process/references/sample-content/media/navigation/SEO
  scope is recorded as a follow-up boundary, not claimed as complete here.
- `set -a && source .env && set +a && bun test tests/unit/assistant/assistantService.test.ts tests/integration/routes/assistant.test.ts`
  passed, 45 tests.
- `set -a && source .env && set +a && bun run test:assistant:live:openrouter`
  passed, 1 live OpenRouter test.
- `set -a && source .env && set +a && bun run test:assistant:live:cms:openrouter`
  passed, 15 live OpenRouter CMS matrix tests.

## Documentation Updates Required

- `docs/guide/screens/assistant-settings.md`
- `docs/develop/assistant.md`
- `_docs/ASSISTANT_GUIDE.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/1097-2026-06-04-task-403-assistant-docs-and-llm-guide-ux-repair.md`

## Acceptance Criteria

- LLM Guide input is usable when the LLM provider is available.
- Docs-only input still communicates docs index readiness.
- OpenRouter live smoke and CMS matrix lanes pass with env loaded.
