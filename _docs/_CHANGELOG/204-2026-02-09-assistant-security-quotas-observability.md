# 204-2026-02-09 - Assistant security, quotas, observability and hardening

Date: 2026-02-09
Version: Unreleased
Tasks: TASK-101-07, TASK-101

## Summary
- Hardened assistant runtime with quota enforcement, observability metrics, and stronger redaction in assistant/audit flows.

## Key Changes
- Core/Assistant:
  - Added `core/services/assistant/assistantQuota.ts` with per-user limits, optional global limits, and optional LLM token budget checks.
  - Added `core/services/assistant/assistantMetrics.ts` for request/fallback/no-hit/error/latency metrics.
  - Added `core/services/assistant/assistantRedaction.ts` for secret/token redaction in assistant metadata.
  - Updated `core/services/assistant/assistantService.ts` with:
    - quota checks before retrieval/provider call
    - metrics recording on every request
    - audit events for provider failure (`assistant.provider.failure`)
    - audit events for mode fallback (`assistant.mode.fallback`)
- Core/Security:
  - Updated `core/server/middleware/rateLimit.ts` with dedicated `assistant` bucket (`assistant_rate_limited`).
  - Updated `core/server/httpServer.ts` to route `/assistant*` requests through assistant rate-limit bucket.
  - Updated `core/services/audit/auditService.ts` to sanitize nested metadata and redact token-like values.
- Core/Assistant Ingest:
  - Updated `core/services/assistant/docsIngestService.ts` with extra hardening:
    - max body size validation
    - chunk limit validation
    - oversized-line chunk guard
    - max chunks-per-doc guard
    - structured chunk build error entries
- Core/API:
  - Updated `core/server/routes/assistantRoutes.ts` error mapping:
    - `assistant_rate_limited` -> HTTP 429
    - `assistant_budget_exceeded` -> HTTP 429
  - Route now forwards authenticated `actorId` to assistant runtime.
- Tests:
  - Added `tests/unit/assistant/assistantQuota.test.ts`
  - Added `tests/unit/assistant/assistantMetrics.test.ts`
  - Added `tests/unit/assistant/assistantRedaction.test.ts`
  - Added `tests/integration/routes/assistant-rate-limit.test.ts`
  - Updated:
    - `tests/unit/assistant/assistantService.test.ts`
    - `tests/unit/assistant/docsIngestService.test.ts`
    - `tests/unit/security/rateLimit.test.ts`
    - `tests/unit/audit/auditService.test.ts`
