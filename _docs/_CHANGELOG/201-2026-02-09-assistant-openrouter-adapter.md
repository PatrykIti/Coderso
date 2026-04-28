# 201-2026-02-09 - Assistant OpenRouter provider adapter and llm-rag fallback

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-04, TASK-101

## Summary
- Added provider abstraction for Assistant LLM mode and OpenRouter adapter with safe fallback to docs-only.

## Key Changes
- Core/Assistant: Added provider contracts in `core/services/assistant/providers/providerTypes.ts`.
- Core/Assistant: Added OpenRouter adapter in `core/services/assistant/providers/openRouterProvider.ts`:
  - timeout guard (`AbortController`)
  - retry-once for retryable failures (`429`, `5xx`)
  - normalized response mapping (`text`, `usage`, `providerRequestId`)
- Core/Assistant: Added provider resolver in `core/services/assistant/providers/index.ts`.
- Core/Assistant: Updated `assistantService` to run `llm-rag` only with snippets and fallback to `docs-only` on provider missing/failure.
- Core/Integrations: Added `openrouter` integration definition and backend runtime secret resolver:
  - `apiKey` (secret), `baseUrl`, `siteUrl`, `appName`
  - runtime access via `getIntegrationRuntimeConfig`
- Tests: Added coverage for OpenRouter adapter, provider resolver, and `assistantService` fallback behavior.
- Docs: Added `_docs/INTEGRATIONS.md`, expanded `_docs/CMS_API.md` assistant chat contract (`llm` payload), and updated `_docs/SECURITY_SPEC.md` guardrails.
