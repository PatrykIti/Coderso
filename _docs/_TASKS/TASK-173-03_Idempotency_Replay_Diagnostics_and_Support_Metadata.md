# TASK-173-03: Idempotency Replay Diagnostics and Support Metadata
# FileName: TASK-173-03_Idempotency_Replay_Diagnostics_and_Support_Metadata.md

**Priority:** High  
**Category:** Core/Assistant + Reliability  
**Estimated Effort:** Medium  
**Dependencies:** TASK-173-01, TASK-170-03  
**Status:** Done (2026-04-12)

---

## Overview

Harden support diagnostics for persistent assistant action idempotency without exposing sensitive payloads.

## Sub-Tasks

No child task files.

## Pseudocode

```ts
const replay = await executionStore.findByKey(actorId, key);

if (replay && replay.planHash === planHash) {
  return { replayed: true, result: replay.redactedResult };
}

if (replay) throw new AssistantError("assistant_action_idempotency_conflict");
```

## Files to Change

- `core/services/assistant/actionExecutionStore.ts`
- `core/services/assistant/actionExecutorService.ts`
- `tests/unit/assistant/actionExecutorService.db.test.ts`
- `tests/integration/routes/assistant.test.ts`
- migration files only if DB columns/indexes change

## Security Contract

- Visibility: internal execute diagnostics.
- Auth model: admin session.
- RBAC: diagnostics visible only to actor/request authorized for execute response.
- CSRF: existing execute CSRF.
- Rate-limit bucket: `assistant`.
- Reject-unknown validation: idempotency key validation remains strict.
- Anti-abuse: no public write path.
- Idempotency: replay/conflict diagnostics must remain actor/plan/hash scoped.
- Secret handling: stored result payloads and diagnostics must be redacted.

## Testing Requirements

- Vitest:
  - pure hash/redaction helpers if extracted.
- Bun:
  - DB-backed replay,
  - different actor conflict,
  - same key different plan hash conflict,
  - redacted diagnostics assertions.

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/SECURITY_SPEC.md`
- `_docs/ARCHITECTURE.md` if store contract changes.
- `_docs/_TASKS/README.md` on status change.

## Acceptance Criteria

1. Support metadata explains replay vs conflict without leaking payloads.
2. DB-backed tests cover conflict boundaries.
3. Any DB change includes migration artifacts and journal updates.

## Completion Notes (2026-04-12)

- Added optional execute result idempotency metadata: `replayed` plus `scope=actor_plan_hash`.
- Replay results are marked as `replayed=true`; fresh executions are marked `replayed=false`.
- DB-backed replay test now asserts replay metadata.
- No DB schema/migration change was required.
