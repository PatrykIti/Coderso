# TASK-551-10: Performance, Fault Gates, Documentation, and Closure
# FileName: TASK-551-10-Performance-Fault-Gates-Documentation-And-Closure.md

**Parent Task:** TASK-551
**Priority:** High
**Category:** Performance / Reliability / Security / Documentation / Closure
**Estimated Effort:** Very Large
**Dependencies:** TASK-551-01 through TASK-551-09 landed in declared order with
their targeted gates green; TASK-551-11 authoring-audit PASS and post-audit
handoffs; parent external dispatch gate reverified for TASK-511, TASK-493,
TASK-517, and TASK-518
**Status:** ⏳ To Do
**Changelog:** 1263 pinned (closure only)

---

## Overview

Prove the complete database/query/cache program against frozen small- and
large-data budgets, real PostgreSQL, the memory backend, and a real Redis 7.2+
service used by two independent Coderso processes. Exercise fault, security,
reliability, migration, invalidation, and stampede behavior; publish the
operational documentation; then close every TASK-551 descendant in terminal
order under changelog 1263.

This child is acceptance and closure only. It must not repair or reopen a
production contract owned by TASK-551-01..09. A failed budget, security
invariant, query plan, migration, cache parity check, or smoke scenario is routed
to the exact owning leaf; that owner fixes the source and reruns its targeted
gate before this child restarts the affected aggregate gate.

## Child Boundary

- **TASK-551-10-L01** exclusively owns aggregate load/fault/security/reliability
  harnesses, release-gate wiring, the CI Redis service contract, and final
  runtime-smoke evidence.
- **TASK-551-10-L02** exclusively owns final source-of-truth docs, deployment
  runbooks, `.env.example` after TASK-511's env writer is terminal, changelog
  1263, TASK-551 status-only transitions, and the TASK-551 board/statistics
  closeout.
- **TASK-551-11** owns workflow scripts and audit evidence. It may dispatch this
  child and verify hashes, but it cannot write L01 runtime evidence or L02 docs,
  task statuses, board, or changelog.
- No TASK-551-10 owner may edit `core/**` production modules, database schema or
  migrations, TASK-551-01..09 targeted tests, cache adapters, routes, services,
  Admin clients, or browser UI. Those paths remain forbidden even when an
  aggregate gate exposes a defect.

## Required Handoff Verification

Immediately before L01 runs and again before L02 closes:

1. Read every physical TASK-551 file, the live query-ownership inventory,
   current HEAD, complete dirty status/diff, migration journal, and all
   TASK-551-01..09 gate receipts.
2. Re-read TASK-511. Terminal is the default. If it remains active, require the
   same fresh exact serialized parent-gate handoff that already proved all
   schema/journal/env/publicSite/entry/SEO/import/lifecycle source and test paths
   byte-disjoint; a narrower active-owner note cannot produce a green receipt.
   Verify the bounded export/restore contract without claiming external work.
   TASK-551-10-L02 may not edit `.env.example` until TASK-511-07's literal-file
   ownership is terminal and its final bytes have been re-read; an active handoff
   is insufficient for that shared documentation file.
3. Re-read TASK-517 and its current public runtime. Private/password content,
   authenticated bypasses, previews, and nonce-bearing HTML must remain excluded
   from shared server-cache values in both memory and Redis modes.
4. Re-read TASK-493. Inventory any newly landed Search Console/indexing query
   path and either prove its final bounded/indexed/cache disposition or preserve
   TASK-493 as the explicit active owner; never overwrite its product behavior.
5. Re-read TASK-518 plus `core/db/migrations/meta/_journal.json`. Prove all
   TASK-551 migration numbers were allocated from fresh state and that the
   stable-admin-role migration, if landed, has no ordering or snapshot collision.

An active handoff is not a false green: it must be the parent's fresh exact
all-path serialized handoff with one named owner, exact bytes/paths/tests,
current status, tested boundary, land order, and follow-up disposition in the
final inventory and changelog. TASK-9999 cannot receive a performance, reliability,
security, persistence, migration, or test-integrity residual.

## Aggregate Acceptance Matrix

- Both frozen fixture profiles from TASK-551-01 pass their exact non-weakened
  p50/p95/p99, rows-read/returned, query-count, pool-wait, cache-byte, hit/miss,
  coalescing, and invalidation-lag budgets.
- Warm eligible public HTML reads execute exactly zero PostgreSQL queries;
  cold/miss/bypass paths remain bounded and authoritative.
- Public Redis cache consistency is bounded-eventual, never linearizable.
  Globally unavailable Redis makes both processes bypass to PostgreSQL/render.
  Ambiguous/partial generation delivery may expose only safe public old-generation
  data until outbox delivery or measured hard TTL expiry. Worker poll is at most
  250 ms, healthy invalidation lag is p99 at most 1 second, and locally known
  incoherence/backlog older than 5 seconds alerts, degrades readiness, and bypasses
  cache where the barrier is visible. Public HTML TTL is at most 600 seconds and
  no server-cache policy exceeds 3,600 seconds.
- Admin post-write preview/readback bypasses shared public cache for read-after-
  write. Private/password, auth/RBAC, security, draft/preview, and nonce-bearing
  data remain fail-closed and DB-authoritative under every outage state.
- Memory and Redis backends pass the same envelope, TTL, expiry, oversize,
  malformed-value, generation, invalidation, and loader-result semantics.
- Commit, rollback, no-op, old/new slug, delete, dependency fan-out, outbox
  retry, Redis outage/reconnect, lease expiry, stale-generation fill, and process
  restart paths satisfy the bounded-eventual SLO. Outage recovery scenarios wait
  for outbox/generation recovery, then require the new value and record measured
  invalidation lag rather than claiming immediate linearizability.
- Security tests prove no credential, secret setting, password/hash, token,
  cookie, nonce, raw PII, private/draft/preview body, unrestricted URL, or bind
  value enters a cache key/value, Redis message/outbox payload, plan, metric,
  log, fixture, or persisted evidence.
- Migration-from-prior and clean-install paths pass with full artifacts and no
  unsafe task-owned table truncation or broad Redis cleanup.
- At least five distinct real-flow scenarios run through two independent app
  processes and one real Redis service; an in-memory mock does not qualify.
- Full Bun, Vitest, precommit, release, strict security, task-graph, diff, and
  touched-file line-count gates pass with no required skip.

## Structured Evidence Contract

L01 and TASK-551-11 use strict reject-unknown JSON evidence. L02 consumes it
read-only:

```ts
type Task551CommandEvidenceV1 = Readonly<{
  id: string;
  argv: readonly string[]; // allowlisted command words only; no env values
  exitCode: number;
  durationMs: number;
  skipped: boolean;
  skipReason: string | null;
}>;

type Task551AggregateGateEvidenceV1 = Readonly<{
  schema: "coderso.task551.aggregate-gates@v1";
  pass: boolean;
  summary: string;
  head: string;
  fixtureProfiles: readonly ("small" | "large")[];
  commands: readonly Task551CommandEvidenceV1[];
  metrics: readonly {
    id: string; profile: "small" | "large" | "redis-smoke";
    unit: "ms" | "count" | "bytes" | "ratio";
    value: number; budget: number; pass: boolean;
  }[];
  errors: readonly string[];
}>;

type Task551RedisSmokeEvidenceV1 = Readonly<{
  schema: "coderso.task551.redis-smoke@v1";
  pass: boolean;
  serverUp: Readonly<{ processA: boolean; processB: boolean;
    postgres: boolean; redis: boolean }>;
  redisVersion: string; // version only, no host/URL/auth
  namespaceDigest: string;
  publicConsistency: Readonly<{
    model: "bounded-eventual";
    workerPollMaxMs: 250;
    healthyP99LagBudgetMs: 1_000;
    readinessBypassThresholdMs: 5_000;
    publicHtmlHardTtlMs: 600_000;
    serverCacheHardTtlMs: 3_600_000;
  }>;
  scenarios: readonly {
    id: string; pass: boolean; assertions: readonly string[];
    processAQueries: number; processBQueries: number;
    invalidationLagMs: number | null;
  }[];
  consoleErrors: readonly string[];
  screenshots: readonly []; // non-UI smoke; leaf-specific UI smoke remains owned elsewhere
  failures: readonly string[];
}>;
```

Raw environment values, connection strings, Redis keys, cached bodies, SQL/bind
values, cookies, user data, and provider credentials are forbidden evidence.
Only bounded sanitized fingerprints and aggregate metrics may persist.

## Security Contract

- **Endpoint visibility:** no endpoint is added or changed by this child. Tests
  exercise existing public reads and internal Admin/session routes only.
- **Auth/RBAC:** existing auth and permission checks remain authoritative in hit,
  miss, bypass, Redis-outage, and cross-process cases. No cache result may grant
  access or cross authenticated identities/permission epochs.
- **CSRF/rate limits:** existing Admin writes retain CSRF and their current
  buckets. Existing public-write nonce/HMAC/CAPTCHA and rate-limit paths are
  exercised but not modified.
- **Validation:** strict evidence schemas reject unknown fields; commands,
  profiles, page/batch sizes, timeouts, metrics, scenario IDs, namespace length,
  and evidence bytes are bounded.
- **Redis/DB isolation:** use a task-unique Redis namespace and uniquely scoped DB
  fixtures. Cleanup deletes only keys/rows created by this run. Never use Redis
  `KEYS`, unbounded `SCAN`, table truncation, or global destructive cleanup.
- **Secrets/privacy:** redact all connection/auth material before logs or
  evidence. A secret-like cache/evidence value is a hard security failure.
- **Anti-abuse:** no new public write exists. Cache outage cannot bypass existing
  rate limiting, nonce, signature, CAPTCHA, or bot policy.

## Sub-Tasks

1. [ ] **TASK-551-10-L01** — small/large performance budgets, fault/security/
   reliability/full gates, and at least five two-process Redis real-flow smokes.
2. [ ] **TASK-551-10-L02** — documentation/runbooks, final task-graph and
   changelog 1263 closure without reopening product source.

## Implementation Pseudocode

```ts
async function closeTask551Family(): Promise<void> {
  const handoffs = await verifyCurrentCollisionOwnerHandoffs([
    "TASK-511", "TASK-517", "TASK-493", "TASK-518",
  ]);
  const aggregate = await dispatchTask55110L01({ handoffs });
  requireAggregateGatePass(aggregate);

  const postAudit = await task551Sidecar.runFreshPostAuditLenses();
  if (!postAudit.pass) {
    await task551Sidecar.returnFindingsToExactOwnersOnce(postAudit.findings);
    await task551Sidecar.rerunAffectedTargetedGates();
    requireAggregateGatePass(await dispatchTask55110L01({ handoffs }));
  }

  const finalDrift = await task551Sidecar.runFreshFinalDrift();
  requireZeroUnresolvedFindings(finalDrift);
  await dispatchTask55110L02({ aggregate, postAudit, finalDrift });
}
```

**Data flow:** frozen budgets/inventory + landed receipts + current task/handoff
state → aggregate Bun/DB/Redis/security/reliability/full gates → five-lens
post-audit → exact owner fixes and affected reruns if needed → fresh final
drift → docs/changelog/status/board closeout.

**Error handling:** a missing/malformed result, skipped required lane, unavailable
DB/Redis, budget weakening, leaked sensitive value, dirty fixture cleanup,
unresolved collision, stale audit, task-graph mismatch, or file over 1,000 lines
blocks closure. Do not reinterpret infrastructure absence as a passing skip.

**Regression-test shape:** aggregate tests consume rather than duplicate each
owner's targeted tests; pin frozen budgets, exact query counts, backend parity,
fault transitions, security exclusions, two-process scenario identity/order,
clean scoped teardown, and release-gate registration.

## Testing Requirements

- All exact commands from TASK-551-10-L01.
- Workflow/audit/task-graph commands from TASK-551-11.
- `git diff --check` and physical-line counts for every file added or modified
  since the verified TASK-551 family baseline.
- No terminal metadata write until every required receipt is current and green.

## Documentation Updates Required

TASK-551-10-L02 owns the exact documentation and closure set declared in its
file. This child does not grant any other leaf shared-doc, task-board, status, or
changelog authority.
