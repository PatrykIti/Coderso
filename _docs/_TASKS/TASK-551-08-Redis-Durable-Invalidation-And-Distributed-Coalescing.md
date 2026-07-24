# TASK-551-08: Redis, Durable Invalidation, and Distributed Coalescing
# FileName: TASK-551-08-Redis-Durable-Invalidation-And-Distributed-Coalescing.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Cache / Redis / Reliability / Database
**Estimated Effort:** Very Large
**Dependencies:** TASK-551-07 complete; TASK-551-05 schema/migration and
TASK-551-06 retention/lifecycle owners terminal; parent external dispatch gate
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; closure only)

---

## Overview

Add optional Redis 7.2+ as the shared value/generation backend for horizontal
scale. Redis mode never keeps a persistent per-process value cache. Runtime
failure opens a bounded circuit and uses PostgreSQL/render; invalidation is
durable through an outbox committed with the mutation. Pub/Sub only accelerates
wakeup/telemetry, and a bounded distributed lease coalesces cold fills.

This public cache is explicitly **bounded-eventual**, not linearizable. Under a
healthy worker the poll interval is at most 250 ms, invalidation p99 target is at
most 1 second, and oldest-pending age `>5_000 ms` degrades health, alerts,
and transitions the local L01 `ServerCacheCoherence` state to
`forced_bypass`; runtime then skips Redis value GET/fill until the worker proves
recovery. A globally ambiguous network partition not locally known as degraded can
still serve already-safe public bytes until delivery or their policy TTL, which
is the hard stale ceiling. This is the deliberate CAP availability choice for
public cacheable output. Admin preview/read-after-write paths bypass until their
event is observed. Security/auth/private/password/nonce data never uses this
eventual model and remains uncached or fail-closed DB-backed.

## Locked Architecture

- Bun's supported native `RedisClient` is re-verified at implementation; no new
  Redis dependency or package-manifest edit is planned.
- `SERVER_CACHE_BACKEND=redis` requires valid `REDIS_URL` and
  `SERVER_CACHE_NAMESPACE`; malformed/missing configuration or unsupported
  Redis baseline fails startup. A transient runtime outage leaves HTTP ready in
  degraded DB-bypass mode and is visible in health/metrics.
- Values use L01 canonical keys and `SET ... PX`; generations use only L01's
  finite site/family tag keys. Missing generations atomically initialize fresh
  non-reusable opaque tokens before lookup; atomic Lua replaces tokens on bump
  and implements the one-or-two-entry `writeIfGenerationsMatch` parity. `KEYS`
  and unbounded `SCAN` are forbidden.
- Redis-mode mutations persist one idempotent outbox event in the same DB
  transaction. An immediate after-commit bump reduces lag; the bounded worker
  retries. Rollback/no-op writes neither outbox nor invalidation.
- The strict plan/outbox/PubSub payload is only opaque bounded `eventKey` plus
  deduplicated finite `CacheTag[]` (Pub/Sub may add the resulting generation
  digest). Record IDs, slugs, paths, domain payloads and raw/digested per-record
  tags are forbidden.
- Generation bumps, not deletion scans, make old values unreachable; old bytes
  expire under their original TTL. Event insertion/claim is idempotent, while
  delivery is deliberately at-least-once and token bumps are monotonic-safe, not
  numerically/idempotently repeated. Pub/Sub cannot establish correctness.
- Distributed fill uses `SET NX PX`, a random owner token, compare-and-delete
  Lua release, jittered bounded wait/re-read and generation recheck before fill.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-551-08-L01 | Native Redis store, atomic generation operations, timeouts and outage semantics | ⏳ To Do |
| TASK-551-08-L02 | Consume the TASK-551-05-owned outbox schema, implement idempotent insert/claim plus at-least-once generation delivery and optional Pub/Sub | ⏳ To Do |
| TASK-551-08-L03 | Distributed lease, runtime composition/lifecycle and multi-replica parity | ⏳ To Do |

**Land order:** `TASK-551-08-L01 → TASK-551-08-L02 → TASK-551-08-L03`.

## Collision Guards

- The parent external dispatch gate applies before all product work; terminal
  TASK-511/TASK-493/TASK-517/TASK-518 is the default and only its fresh exact
  serialized all-path handoff can substitute.
- L01–L03 use disjoint exact allowlists. They do not edit TASK-551-07 owners or
  any public/domain/Admin adoption file owned by TASK-551-09.
- TASK-551-05 is the sole schema/migration writer and must create/export
  `cache_invalidation_outbox` plus complete generated artifacts before L02.
  L02 consumes that terminal schema read-only and owns no schema, migration,
  snapshot, or journal byte.
- TASK-511 exclusively owns backup services. L03 may touch shared server
  lifecycle only after TASK-511 is terminal and must preserve its scheduler
  behavior; it never edits `core/services/backups/**`.
- L03 owns exact `registerComposedHttpRuntimeParticipants()`, consumes 02's
  lifecycle/prod seam, 03's `PaginationCursorKeyring` loader, and 06's
  `createRetentionSchedulerLifecycleParticipant(...)`; it registers existing
  backup start/stop and moves eager router creation behind validated composition.
- TASK-517 `publicSite.tsx` and TASK-493 SEO are forbidden throughout 08.
- Shared docs, task board, changelog 1263 and workflows belong to 10/11.

## Security Contract

- **Visibility/routes:** no public or Admin route is added. Health remains
  internal process telemetry unless a later route task defines RBAC/redaction.
- **Auth/RBAC/CSRF/rate limits:** unchanged; Redis failure cannot bypass request
  middleware or public-write anti-abuse.
- **Validation:** L01 strict envelope/key limits plus bounded commands, tags,
  outbox rows, batch, lease, waits, retries and diagnostics.
- **Secrets/privacy:** `REDIS_URL` stays server ENV and is always redacted. No
  secret/private/auth/PII payload enters Redis, outbox, Pub/Sub or logs.
- **Anti-abuse:** cache keys/commands are constructed internally; no endpoint
  accepts arbitrary Redis input.

## Testing Requirements

- Redis passes memory-store semantic parity plus two-client generation
  invalidation, conditional-write, outage/reconnect and malformed-value tests.
- Outbox proves commit/rollback, idempotent identical insert/conflicting insert,
  crashed claim recovery, at-least-once duplicate token replacement,
  retry/backoff, 250 ms worker polling, p99
  invalidation target, exact 5,000/5,001 ms health/forced-bypass threshold,
  zero value GET/fill while forced, bounded prune and no
  dropped pending event.
- 1/10/50 concurrent clients demonstrate one distributed owner while load
  completes inside the waiter budget. After timeout, availability permits at
  most one fallback loader per process through local promise-only single-flight;
  token-safe release and no stale-generation fill remain mandatory.
- Redis down never starts a persistent local value cache and never changes the
  authoritative loader or committed mutation result.
- All new/touched production and test files remain below 1,000 lines.

Targeted commands are specified per leaf. TASK-551-10 owns full load/fault
gates, `_docs/SERVER_CACHE.md`, deployment runbook and changelog 1263.

## Documentation Updates Required

No shared documentation is edited here. Supply Redis operations, CAP/coherence,
outbox, lifecycle, and validation evidence to TASK-551-10-L02.
