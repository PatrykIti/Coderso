# TASK-551-08: Redis, Durable Invalidation, and Distributed Coalescing
# FileName: TASK-551-08-Redis-Durable-Invalidation-And-Distributed-Coalescing.md

**Parent Task:** TASK-551
**Priority:** Critical
**Category:** Cache / Redis / Reliability / Database
**Estimated Effort:** Very Large
**Dependencies:** L03 INITIAL header-only exception after TASK-551-02-L02;
all cache phases after TASK-551-07 complete plus TASK-551-05 schema/migration
and TASK-551-06 retention/lifecycle owners terminal; parent external dispatch gate
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
  and implements the store-internal one-or-two-entry
  `writeIfGenerationsMatch` parity used only by `ServerCache` when no distributed
  owner exists. No public/domain caller receives that primitive. `KEYS` and
  unbounded `SCAN` are forbidden.
- Redis-mode mutations persist one idempotent outbox event in the same DB
  transaction. An immediate after-commit bump reduces lag; the bounded worker
  retries. Every mutation awaits the sole runtime `applyAfterCommit(plan)` handle;
  that handle absorbs cache transport failures and resolves only after the local
  observation and any required affected-family force fence are visible. Rollback/
  no-op writes neither outbox nor invalidation.
- Global Redis/outbox health fences use source-bound observation watermarks so a
  delayed recovery cannot undo a newer force. Failed immediate delivery creates
  a bounded exact-event fence; only conditional durable completion of that same
  outbox row clears it. Pub/Sub and broad pending-age/health recovery clear no
  event fence. The controller retains only concurrently unresolved event tokens
  and active-attempt callback tokens, capped at 4,096 each with no settled
  tombstones. Saturation forces temporary all-family bypass without rejecting a
  callback and recovers only after both counts are at most 3,072; an active-
  attempt token settles only after no callback can report. Redis also
  keeps an independent durable outbox-drain fence until Redis is healthy and no
  pending or claimed row remains. Safe-integer epoch/drain-generation overflow
  alone remains fail-closed until process restart.
- The strict plan/outbox payload is only opaque bounded `eventKey` plus
  deduplicated finite `CacheTag[]`. The separate strict bounded Pub/Sub payload is
  only that `eventKey` plus the resulting generation digest—never tags or domain
  identity; a subscriber point-reads the outbox row to recover and normalize the
  finite tags. Record IDs, slugs, paths, domain payloads and raw/digested per-record
  tags are forbidden throughout.
- Generation bumps, not deletion scans, make old values unreachable; old bytes
  expire under their original TTL. Event insertion/claim is idempotent, while
  delivery is deliberately at-least-once and token bumps are monotonic-safe, not
  numerically/idempotently repeated. Pub/Sub cannot establish correctness.
- Distributed fill uses `SET NX PX`, a random owner token, jittered bounded
  wait/re-read and one L03-owned bounded Lua write that atomically proves both
  the exact owner token and every expected finite generation before writing one
  or two validated entries produced only from L01's typed valid `fill` result.
  Both Redis write paths first strictly decode every envelope, match entry/envelope
  `fillKind`, select the entry's positive or required non-null negative policy
  ceiling and recheck TTL/lifetime/bytes; a forged/malformed mismatch performs
  zero Redis commands. Positive companions keep their independently sampled TTL.
  A typed `no_fill` returns authoritatively and invokes no write Lua; an invalid
  negative/no-fill branch invokes no write either. `ServerCache.getOrLoad(request)` remains the sole fill-attempt,
  generation-capture, encoding and fill owner; consumers never call either Lua/
  store primitive. Every loader receives `{trigger, companion}`; disabled
  reasons are exactly `ineligible|singleflight_saturated|coherence_bypass|
  generation_unavailable|transport_unavailable|distributed_wait_timeout|
  coordinator_closed|not_published_retry`. Closed trigger
  outcomes map only to shared reasons: `store_absent` to
  `store_absent_no_publication`, every `store_value_rejected` reason to
  `store_value_rejected`, and every `fill_disabled` reason to `fill_disabled`;
  the trigger object is never reused as a reason. Only `written` authorizes the fill;
  `generation_changed`, `lease_lost`, and `unavailable` return the local owner's
  fresh authoritative bytes without fill and make each local joiner load for
  itself. The registry contains only an eligibility-scope-bound shared fill
  outcome; it never shares `TResult`, `no_fill`, token/nonce output or errors.
  Token-safe release runs afterward only as
  best-effort cleanup and cannot establish fill authority retroactively.
  A timeout/disconnect/malformed reply after dispatch has unknown physical
  outcome; it remains non-published even if Redis physically wrote bytes, which
  only a later independent strict generation-bound GET may consume.
- Redis adapters, immediate post-commit delivery, the worker and Pub/Sub report
  only L01's exact normalized coherence signals, including affected finite tags,
  reason and pending age. The single L02 coordinator-owned coherence controller
  combines those signals with backend health; no adapter or worker constructs an
  independent coherence snapshot or advances an epoch outside `report(...)`.
  Current-watermark state-identical force/recover reports are no-ops, but every
  accepted event-keyed local/PubSub observation advances affected epochs,
  including at-least-once duplicates; observations never clear fences or
  authorize stale/private values.
- The runtime's frozen consumer surface is only read-only `mode`, `cache`,
  awaited `invalidation.applyAfterCommit`, and `health`. Store/controller/worker/
  PubSub/lease/lifecycle internals stay private. Before listen, its closed four-
  policy v1 catalog must fit exact key-plus-envelope store capacity or startup
  fails.
- TASK-551-08-L03 has an early, header-only INITIAL phase after 02-L02. It is
  the sole writer of `router.ts` plus the route-response portion of
  `httpServer.ts` and installs a closed, request-local
  `RouteContext.setResponseHeader` contract for exactly the private/no-store,
  pragma and expires pairs. Success and caught route-error JSON responses carry
  those headers. This seam lands before 03-L02 and changes no route or cache
  runtime; L03 remains nonterminal until its FINAL phase after 08-L02 and the
  03-L02 consumption receipt.

## Sub-Tasks

| ID | Exclusive responsibility | Status |
|---|---|---|
| TASK-551-08-L01 | Native Redis store, atomic generation operations, timeouts and outage semantics | ⏳ To Do |
| TASK-551-08-L02 | Consume the TASK-551-05-owned outbox schema, implement idempotent insert/claim plus at-least-once generation delivery, optional Pub/Sub, and its exact lifecycle handle | ⏳ To Do |
| TASK-551-08-L03 | INITIAL strict route-response header seam; FINAL distributed lease, singleton runtime composition/accessor, lifecycle and multi-replica parity | ⏳ To Do |

**Phased land order:** `TASK-551-08-L03 INITIAL → TASK-551-03-L02 header
receipt → TASK-551-08-L01 → TASK-551-08-L02 → TASK-551-08-L03 FINAL`. The
INITIAL exception depends only on terminal TASK-551-02-L02 and the parent
external gate; it does not construct Redis/cache runtime and cannot mark L03 or
this parent complete.

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
- TASK-551-02-L02 is the sole writer of both `core/server/dev.ts` and
  `core/server/prod.ts`. L03 validates their terminal generic awaited lifecycle
  calls read-only and edits only the composition seam in `httpServer.ts`; drift
  in either caller returns to TASK-551-02-L02 instead of widening L03 ownership.
- L03 owns exact `registerComposedHttpRuntimeParticipants()` in `httpServer.ts`.
  Module evaluation invokes it before terminal 02 `runtimeEntrypoint.ts`—the sole
  signal/listen/HTTP-drain/lifecycle-start-and-close owner—starts participants.
  `prod.ts` and `dev.ts` remain thin `runRuntimeEntrypoint(...)` adapters with no
  direct lifecycle or signal calls. The registration seam preserves 03's already-registered pagination
  participant/keyring wiring, registers 06's
  `createRetentionSchedulerLifecycleParticipant(...)`, existing backup
  start/stop and the cache runtime, and never edits `prod.ts` or reloads the
  cursor keyring. L03 never calls lifecycle start/close or implements shutdown.
- L03 also solely owns `core/server/router.ts` and its own
  `httpServer.ts` bytes for the early response-header seam. TASK-551-03-L02
  consumes `ctx.setResponseHeader` read-only from `formsRoutes.ts`, returns a
  receipt, and never edits either shared transport file. L03 FINAL re-reads both
  files and preserves that validated header behavior while adding composition.
- TASK-517 `publicSite.tsx` and TASK-493 SEO are forbidden throughout 08.
- Shared docs, task board, changelog 1263 and workflows belong to 10/11.

## Security Contract

- **Visibility/routes:** no public or Admin route is added. Health remains
  internal process telemetry unless a later route task defines RBAC/redaction.
- **Auth/RBAC/CSRF/rate limits:** unchanged; Redis failure cannot bypass request
  middleware or public-write anti-abuse.
- **Validation:** L01 strict envelope/key limits plus bounded commands, tags,
  outbox rows, batch, lease, waits, retries and diagnostics.
- **Response-header seam:** only the exact closed private/no-store pairs are
  accepted; arbitrary names/values, CRLF and conflicting duplicates fail before
  mutation, and the request-local bag is not exposed to handlers.
- **Secrets/privacy:** `REDIS_URL` stays server ENV and is always redacted. No
  secret/private/auth/PII payload enters Redis, outbox, Pub/Sub or logs.
- **Anti-abuse:** cache keys/commands are constructed internally; no endpoint
  accepts arbitrary Redis input.

## Testing Requirements

- Redis passes memory-store semantic parity plus two-client generation
  invalidation, conditional-write, outage/reconnect and malformed-value tests.
  Pin strict pre-command positive/negative discriminator, nullable-negative
  ceiling, TTL/lifetime/byte validation and zero Redis commands for any forged or
  mismatched entry/envelope, including one bad entry in a two-entry bundle.
- Outbox proves commit/rollback, idempotent identical insert/conflicting insert,
  crashed claim recovery, at-least-once duplicate token replacement,
  retry/backoff, 250 ms worker polling, p99
  invalidation target, exact 5,000/5,001 ms health/forced-bypass threshold,
  zero value GET/fill while forced, bounded prune and no
  dropped pending event. Exercise 4,096/4,097 saturation and 3,073/3,072
  hysteresis independently for unresolved events and active attempts; more than
  100,000 sequential settled invalidations must remain bounded without bypass.
  Prove the independent Redis durable-drain fence stays forced through outage,
  pending and claimed rows, then clears only after healthy/no-pending/no-claimed.
- Lifecycle tests prove the L02 handle stops new claims, drains within its exact
  bound, closes Pub/Sub idempotently, and reports timeout without closing DB
  early. Coherence tests prove immediate failure includes affected finite tags,
  the awaited caller cannot resume before its exact event fence, no mutation
  detaches `applyAfterCommit`, global Redis/outbox fences recover independently,
  and no broad recovery clears an event fence.
- 1/10/50 concurrent clients demonstrate one distributed owner while load
  completes inside the waiter budget. Coupled primary-plus-companion tests use
  two processes and prove one winning render/load publishes both or neither.
  The owner's one Lua operation must prove
  lease-token plus generation identity before the all-or-nothing fill; pin
  `written`, `generation_changed`, `lease_lost`, and `unavailable`, with no fill
  for every non-`written` result and no generation-only store-write substitute.
  After timeout/non-publication, each waiting caller runs its own authoritative
  no-fill loader; only a successfully written shareable result can serve local
  joiners through their own `resolveCached`. Distinct share-scope and request-token
  cases never cross results. Token-safe post-attempt release is
  cleanup only; preventing stale-generation fill remains mandatory.
- Redis down never starts a persistent local value cache and never changes the
  authoritative loader or committed mutation result.
- `getServerCacheRuntime().cache` is TASK-551-09's canonical access to the one
  lifecycle-owned started cache; before start/after close the accessor fails with
  the exact stable unavailable code and never constructs a second instance.
- All new/touched production and test files remain below 1,000 lines.
- The L03 INITIAL HTTP test pins exact header propagation on success and mapped
  route errors plus request isolation; the later 03-L02 receipt pins the real
  submission-detail route without granting it ownership of the transport.

Targeted commands are specified per leaf. TASK-551-10 owns full load/fault
gates, `_docs/SERVER_CACHE.md`, deployment runbook and changelog 1263.

## Documentation Updates Required

No shared documentation is edited here. Supply Redis operations, CAP/coherence,
outbox, lifecycle, and validation evidence to TASK-551-10-L02.
