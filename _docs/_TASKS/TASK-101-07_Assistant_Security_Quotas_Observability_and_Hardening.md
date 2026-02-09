# TASK-101-07: Assistant Security, Quotas, Observability and Hardening
# FileName: TASK-101-07_Assistant_Security_Quotas_Observability_and_Hardening.md

**Priority:** High  
**Category:** Core/Security + Platform  
**Estimated Effort:** Medium  
**Dependencies:** TASK-101-03, TASK-101-04, TASK-101-08, TASK-020  
**Status:** To Do

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
| `core/services/auditLogService.ts` | update | assistant events |
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

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-assistant-security-quotas-observability.md`
