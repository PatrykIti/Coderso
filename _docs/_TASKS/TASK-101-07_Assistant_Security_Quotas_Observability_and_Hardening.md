# TASK-101-07: Assistant Security, Quotas, Observability and Hardening
# FileName: TASK-101-07_Assistant_Security_Quotas_Observability_and_Hardening.md

**Priority:** High  
**Category:** Core/Security + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-03, TASK-101-04, TASK-101-08, TASK-020  
**Status:** Done (2026-02-09)

---

## Overview

Hardening warstwy asystenta:
- limity per user i global,
- telemetry i audit trail,
- redaction danych wrazliwych,
- playbook na awarie providera LLM.

---

## Scope

### Security
- Input sanitization (control chars, oversized payloads, policy violations).
- Secret redaction w logach provider integration.
- RBAC validation dla endpointow asystenta.
- Ingest hardening: frontmatter/section contract validation + chunk size guard.

### Quotas and rate limits
- per-minute i per-day limity requestow.
- optional token budget (for `llm-rag`).
- clear error codes (`assistant_rate_limited`, `assistant_budget_exceeded`).

### Observability
- metrics: request count, latency, fallback rate, no-hit rate.
- audit events: mode switch, reindex trigger, provider failure.
- ingest metrics: files scanned, docs/chunks upserted, validation errors.

---

## Implementation Checklist

| File | Action | Notes |
| --- | --- | --- |
| `core/server/middleware/rateLimit.ts` | update | assistant bucket(s) |
| `core/services/assistant/assistantService.ts` | update | quota checks + telemetry hooks |
| `core/services/assistant/docsIngestService.ts` | update | ingest validation hardening + structured errors |
| `core/services/audit/auditService.ts` | update | assistant event metadata redaction |
| `core/server/routes/assistantRoutes.ts` | update | consistent error mapping |
| `tests/unit/assistant/assistantQuota.test.ts` | new | quota logic |
| `tests/integration/routes/assistant-rate-limit.test.ts` | new | rate-limit behavior |
| `tests/unit/assistant/assistantRedaction.test.ts` | new | secret redaction |
| `tests/unit/assistant/docsIngestService.test.ts` | update | contract validation + oversized chunk checks |

---

## Hardening Rules

1. No raw provider payloads in logs.
2. Max message size guard before retrieval/provider call.
3. If provider exceeds timeout, immediate fallback to docs-only.
4. Reindex endpoint protected and audit logged.

---

## Testing Requirements

- Unit: quota counters and reset windows.
- Unit: sensitive fields are redacted.
- Integration: rate-limited requests return expected code.
- Integration: provider timeout still returns docs-only answer with fallback flag.
- Integration: ingest partial failure returns structured validation errors.

---

## Documentation Updates Required

- `_docs/SECURITY_SPEC.md` (assistant hardening policy)
- `_docs/ARCHITECTURE.md` (observability flows)
- `_docs/CMS_API.md` (error codes and fallback flags)
- `_docs/_internal/README.md` (content quality policy and validation rules)

---

## Changelog Entry

- `_docs/_CHANGELOG/204-2026-02-09-assistant-security-quotas-observability.md`

---

## Implementation Notes (Done)

- Added assistant quotas module `core/services/assistant/assistantQuota.ts`:
  - per-user minute/day request limits
  - optional global minute/day request limits
  - optional LLM token budget checks
  - explicit error codes: `assistant_rate_limited`, `assistant_budget_exceeded`
- Added assistant observability module `core/services/assistant/assistantMetrics.ts`:
  - request/error/fallback/no-hit counters
  - LLM request/failure counters
  - latency totals/average/max
- Added assistant redaction module `core/services/assistant/assistantRedaction.ts`:
  - token/jwt/bearer pattern redaction
  - sensitive key redaction for structured metadata
- Updated `core/services/assistant/assistantService.ts`:
  - enforces quotas before retrieval/provider calls
  - records metrics on every request path
  - writes audit events for provider failures (`assistant.provider.failure`) and runtime mode fallback (`assistant.mode.fallback`)
  - keeps docs-only fallback behavior when LLM path fails
- Updated `core/server/routes/assistantRoutes.ts` error mapping:
  - `assistant_rate_limited` -> HTTP 429
  - `assistant_budget_exceeded` -> HTTP 429
  - passes `actorId` from authenticated user into assistant runtime
- Updated global rate limiting flow:
  - `core/server/middleware/rateLimit.ts` now supports `assistant` bucket and emits `assistant_rate_limited`
  - `core/server/httpServer.ts` maps `/assistant*` routes to assistant rate-limit bucket
- Hardened internal docs ingest `core/services/assistant/docsIngestService.ts`:
  - max body size validation (`doc_body_too_large`)
  - chunk limit validation (`assistant_doc_chunk_limit_invalid`)
  - oversized line guard (`assistant_doc_chunk_oversized`)
  - max chunks-per-doc guard (`assistant_doc_chunks_excessive`)
  - structured ingest validation error (`chunk_build_failed`)
- Enhanced global audit metadata redaction in `core/services/audit/auditService.ts` (nested + token-like values).
- Added tests:
  - `tests/unit/assistant/assistantQuota.test.ts`
  - `tests/unit/assistant/assistantMetrics.test.ts`
  - `tests/unit/assistant/assistantRedaction.test.ts`
  - `tests/integration/routes/assistant-rate-limit.test.ts`
  - updates in `tests/unit/assistant/assistantService.test.ts`
  - updates in `tests/unit/assistant/docsIngestService.test.ts`
  - updates in `tests/unit/security/rateLimit.test.ts`
  - updates in `tests/unit/audit/auditService.test.ts`
