# TASK-173-05: Observability, Audit, and Admin Diagnostics
# FileName: TASK-173-05_Observability_Audit_and_Admin_Diagnostics.md

**Priority:** Medium  
**Category:** Assistant + Observability + Admin/UI  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-03  
**Status:** To Do

---

## Overview

Improve observability for guide planning/execution only where existing metrics/audit output is insufficient for support and debugging.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
recordAssistantMetric("actions.execute", {
  status,
  actionTypes: summarizeActionTypes(plan.actions),
  durationMs,
  replayed,
});

audit("assistant.actions.execute", redactAuditPayload(summary));
```

## Files to Change

- `core/services/assistant/assistantMetrics.ts`
- `core/services/audit/auditService.ts` only if event schema changes
- `core/services/assistant/actionExecutorService.ts`
- optional admin diagnostics UI if an existing audit/metrics surface is extended
- `tests/vitest/assistant/assistantMetrics.test.ts`
- Bun audit tests if DB-backed audit behavior changes

## Security Contract

- Visibility: internal diagnostics/admin-only surfaces.
- Auth model: admin session.
- RBAC: diagnostics require existing audit/settings read permissions when surfaced.
- CSRF: unchanged.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: metrics/audit payloads are generated server-side.
- Anti-abuse: no public write path.
- Idempotency: replayed executions should be distinguishable without leaking stored result payloads.
- Secret handling: audit/metrics payloads are redacted and aggregate where possible.

## Testing Requirements

- Vitest:
  - metrics aggregation,
  - redacted event payload helpers.
- Bun:
  - audit persistence tests if event schema or DB path changes.

## Documentation Updates Required

- `_docs/ARCHITECTURE.md` if observability contract changes.
- `_docs/SECURITY_SPEC.md` for audit metadata redaction notes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Support can distinguish plan/dry-run/execute/fallback/replay outcomes.
2. Metrics and audit payloads remain redacted.
3. No new diagnostics leak privileged context to browser storage.
