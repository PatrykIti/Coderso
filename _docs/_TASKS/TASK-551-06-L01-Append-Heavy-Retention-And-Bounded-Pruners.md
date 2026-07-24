# TASK-551-06-L01: Append-Heavy Retention and Bounded Pruners
# FileName: TASK-551-06-L01-Append-Heavy-Retention-And-Bounded-Pruners.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Reliability / Privacy / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-03-L01 and TASK-551-05-L02
**Status:** ⏳ To Do
**Changelog:** 1263 (pinned; TASK-551-10-L02 closure only)

---

## Overview

Define a strict shared retention contract and bounded pruners for append-heavy
access/audit/email/search/integration/auth/assistant/analytics/submission/
webhook/session/solution-kit data. Remove inline global pruning from request hot
paths, preserve privacy/legal windows, and make assistant execution plus
undo-manifest persistence one transaction.

## Sub-Tasks

None; this is an executable leaf.

## Exact File Ownership

**Production:** `core/services/maintenance/retentionPolicy.ts`,
`core/services/maintenance/appendHeavyRetentionRegistry.ts`,
`core/services/access/accessLogService.ts`,
`core/services/audit/auditService.ts`,
`core/services/email/emailDeliveryRetentionService.ts`,
`core/services/search/searchHistoryContract.ts`,
`core/services/search/searchHistoryService.ts`,
`core/services/search/searchHistoryRetentionService.ts`,
`core/services/integrations/integrationRequestRetentionService.ts`,
`core/services/auth/expiredAuthArtifactRetentionService.ts`,
`core/services/pages/previewTokenRetentionService.ts`,
`core/services/assistant/actionExecutionStore.ts`,
`core/services/assistant/assistantRetentionService.ts`,
`core/services/analytics/trafficRepository.ts`,
`core/services/analytics/trafficRetentionService.ts`,
`core/services/forms/submissionRetentionService.ts`,
`core/services/webhooks/webhookRetentionService.ts`, and
`core/services/auth/sessionRetentionService.ts`, and
`core/services/kits/solutionKitRetentionService.ts`.

**Tests:** `tests/vitest/maintenance/retentionPolicy.test.ts`,
`tests/unit/access/accessLogService.test.ts`,
`tests/unit/audit/auditService.test.ts`,
`tests/vitest/search/searchHistoryContract.test.ts`,
`tests/unit/search/searchHistoryService.test.ts`,
`tests/integration/server/task551ActionExecutionStore.test.ts`,
`tests/integration/analytics/trafficRepository.test.ts`,
`tests/integration/analytics/trafficRetention.test.ts`,
`tests/integration/server/task551AppendHeavyRetention.test.ts`, and
`tests/perf/database-retention-batches.test.ts`.

No other file may be edited. In particular, L03 owns scheduler/startup;
TASK-551-03 owns `submissionService.ts`, `webhooksService.ts`, and
`sessionService.ts`; TASK-511 backup, TASK-517 entry/public-site, TASK-493 GSC,
TASK-518/schema/migrations, cache, task/changelog/workflow paths are forbidden.
This leaf is the sole TASK-551 writer of the whole `trafficRepository.ts` and
`searchHistoryService.ts`; it
removes the request-time `maybePruneExpiredTraffic` import/call and moves its
cutoff deletes into bounded `trafficRetentionService.ts` batches. It never edits
request-time retention from either write service: it also removes
the actual private `pruneHistory` helper and its `await pruneHistory(userId,
DEFAULT_LIMIT)` call from `recordSearch`, eliminating the inline newest-10/
global-delete path from `searchHistoryService.ts`. It then
creates `searchHistoryRetentionService.ts` with the `search_history`
table/cutoff/newest-10/`created_at ASC, id ASC` contract. TASK-551-04 lands
later and treats both search-history files as read-only. To keep the sequential
land compile-green while that later leaf removes the current GET call, L01 also
lands the final idempotent write command plus a temporary legacy string-input
branch that deliberately executes zero SQL. TASK-551-04 removes the only legacy
caller and source-guards zero production string-input calls.

## Complete Family Policy Matrix

Global knobs use prefix `RETENTION_`: `BATCH_SIZE` defaults to 500 and validates
`1..2000`; `MAX_BATCHES_PER_RUN` defaults to 10 and validates `1..100`; dry-run
is owned only by `RETENTION_DRY_RUN`, defaults false, and accepts exactly the
lowercase strings `true` or `false`; an empty value, whitespace, case variant,
`1`, `0`, or any other value fails startup. It applies to every family and has
no family/CLI override or alias, so no lower-precedence setting can turn a true
global dry-run into writes. Every enabled age except the legacy analytics key is an integer
and explicit out-of-range values are rejected, not silently clamped. `cutoff`
means `column < now - age` (the
boundary is retained), and every order finishes with immutable `id ASC`.
Analytics preserves its existing compatibility contract:
`ANALYTICS_RETENTION_DAYS` is the sole canonical analytics age variable, with
default `365` and inclusive bounds `30..1095`. Preserve the current parser
byte-for-byte in outcome by evaluating `Number(raw)` first: absent or a non-
finite result resolves to `365`; a finite result is floored and then clamped to
`[30,1095]` (so fractions and explicit out-of-range values do not reject
startup). This exact compatibility truth table is locked:

| Raw environment value | Result |
|---|---:|
| absent, `NaN`, `Infinity`, `-Infinity`, `not-a-number`, `1x` | 365 |
| empty string, whitespace, `0`, `-1`, `1.9` | 30 |
| `30.9` | 30 |
| `0x20` | 32 |
| `1e2` | 100 |
| `1095.9`, `1096` | 1095 |

`RETENTION_ANALYTICS_ENABLED` controls only whether the family runs.
`RETENTION_ANALYTICS_DAYS` and
`RETENTION_ANALYTICS_MAX_AGE_DAYS` are unsupported aliases and are rejected as
unknown even when the canonical variable is also present, so there is no
ambiguous precedence or silent rename.
The two existing inline seams, `ANALYTICS_PRUNE_INLINE_DISABLED` and
`ANALYTICS_PRUNE_INLINE_ENABLED`, remain accepted as deprecated no-ops because
inline pruning is removed unconditionally. Any present string, including an
empty or formerly malformed value, emits its exact warning token
`analytics_prune_inline_disabled_deprecated` or
`analytics_prune_inline_enabled_deprecated` at most once per key/process during
retention initialization and never per request. Neither key rejects startup or
changes behavior, and both present yields exactly two warnings. Neither can
alter scheduled retention; only `RETENTION_ANALYTICS_ENABLED` does so, and logs
never include either raw value.

| Tables/family | Environment prefix | Default and bounds | Cutoff and delete order |
|---|---|---|---|
| `access_logs` | `RETENTION_ACCESS_LOGS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `audit_logs` | `RETENTION_AUDIT_LOGS_` | enabled, 365 days, `30..2555` | `created_at ASC, id ASC` |
| `email_delivery_logs` | `RETENTION_EMAIL_DELIVERY_LOGS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `search_history` | `RETENTION_SEARCH_HISTORY_` | enabled, 90 days, `7..365`; keep newest 10/user | age first, then excess per user; `created_at ASC, id ASC` |
| `integration_requests` | `RETENTION_INTEGRATION_REQUESTS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `password_resets` | `RETENTION_PASSWORD_RESETS_` | enabled, 7 days after expiry, `1..30` | only expired; `expires_at ASC, id ASC` |
| `preview_tokens`, `post_preview_tokens` | `RETENTION_PREVIEW_TOKENS_` | enabled, 1 day after expiry, `1..30` | only expired; page tokens then post tokens, `expires_at ASC, id ASC` |
| `assistant_doc_ingest_runs` | `RETENTION_ASSISTANT_INGEST_RUNS_` | enabled, 90 days, `7..365` | preserve newest successful run/source; `started_at ASC, id ASC` |
| `assistant_action_executions`, undo items | `RETENTION_ASSISTANT_ACTIONS_` | enabled, 180 days, `30..730` | undo children then executions; `created_at ASC, id ASC` |
| analytics sessions/pageviews | enable: `RETENTION_ANALYTICS_ENABLED`; age: canonical `ANALYTICS_RETENTION_DAYS` | enabled, 365 days, `30..1095` | pageviews by `created_at ASC, id ASC`, then sessions by `last_seen_at ASC, id ASC` |
| form submissions/action runs | `RETENTION_FORM_SUBMISSIONS_` | **disabled**, when enabled 365 days, `1..3650` | action-run children before submissions; `created_at ASC, id ASC` |
| webhook deliveries | `RETENTION_WEBHOOK_DELIVERIES_` | enabled, 30 days, `1..365` | terminal deliveries only; `created_at ASC, id ASC` |
| sessions | `RETENTION_SESSIONS_` | enabled, 30 days after expiry/revocation, `1..365` | only expired/revoked; effective cutoff then `id ASC` |
| solution-kit install runs/items | `RETENTION_SOLUTION_KIT_RUNS_` | **disabled**, when enabled 365 days, `30..3650` | preserve latest successful/rollback anchors; items before runs |

Revision tables are governed by L02's separate count-plus-age policy. Backups
remain TASK-511-owned and cache invalidation outbox cleanup remains owned by
TASK-551-08 because their recovery/coherence consumers determine safe deletion; both
must provide bounded cleanup before TASK-551 closes. Current assistant docs/
chunks, users/API keys, bookings/reviews, and authored CMS/media/configuration
tables are authoritative domain records, not disposable append logs, and are
explicitly exempt from automatic retention. The registry enumerates every row
above and rejects an unknown family; adding a future append-heavy table requires
a policy or explicit reviewed exemption in the same change.

## Implementation Pseudocode

```ts
type RetentionPolicy = StrictReadonly<{
  family: RetentionFamily;
  enabled: boolean;
  dryRun: boolean;          // sole source: strict RETENTION_DRY_RUN
  maxAgeDays: number;
  batchSize: number;       // default 500, max 2_000
  maxBatchesPerRun: number; // default 10, max 100
}>;

function normalizeRetentionPolicy(input: unknown, bounds: FamilyBounds): RetentionPolicy {
  // Parse RETENTION_DRY_RUN once: absent=false, exact "true"/"false" only.
  // Reject aliases, family overrides, unknowns, non-integers, and out-of-range
  // values; do not clamp explicit non-analytics environment values.
}

function loadAnalyticsRetentionPolicy(env: RuntimeEnv): RetentionPolicy {
  // Read age only from ANALYTICS_RETENTION_DAYS. Missing/non-finite/malformed
  // resolves to 365; finite numeric input is floor+clamp to inclusive 30..1095.
  // RETENTION_ANALYTICS_ENABLED controls enablement only. Reject unsupported
  // RETENTION_ANALYTICS_DAYS/MAX_AGE_DAYS aliases, including dual-key input.
  // Accept every present ANALYTICS_PRUNE_INLINE_DISABLED and
  // ANALYTICS_PRUNE_INLINE_ENABLED string as separate warning-once deprecated
  // no-ops; never alter age/enabled/reject and never log either raw value.
}

async function pruneOldestBatch(policy: RetentionPolicy, tx: Tx): Promise<PruneBatchResult> {
  // Indexed cutoff + id tie-breaker and LIMIT in both modes. dryRun performs
  // only the bounded candidate read, takes no delete lock, issues zero DELETE,
  // advances no high-water state, and returns { matched, deleted: 0, dryRun }.
  // Apply mode uses FOR UPDATE SKIP LOCKED plus a scoped DELETE.
}

async function pruneSearchHistoryBatch(policy: RetentionPolicy, tx: Tx): Promise<PruneBatchResult> {
  // Age cutoff first, preserve newest 10/user,
  // lock at most policy.batchSize oldest IDs, then delete only those IDs.
}

// Bun-free searchHistoryContract.ts; no db/client/service/runtime imports.
export type SearchHistoryWriteRequest = StrictReadonly<{
  query: string;
  limit: number;
  dateRange: SearchDateRange;
  idempotencyKey: string;
}>;
export type SearchHistoryWriteCommand = StrictReadonly<{
  query: string;
  filters: { limit: number; dateRange: SearchDateRange };
  idempotencyKey: string; // canonical UUID, validated again at service boundary
}>;

export function parseSearchHistoryWriteRequest(input: unknown): SearchHistoryWriteCommand {
  // Exact strict keys query,limit,dateRange,idempotencyKey; reject unknown and
  // coercion; normalize query length 2..200; integer limit 1..50; canonical
  // SearchDateRange enum; lowercase canonical UUID string.
}

export async function recordSearch(
  userId: string,
  command: SearchHistoryWriteCommand | string,
  _legacyFilters?: Record<string, unknown>,
): Promise<{ recorded: boolean }> {
  if (typeof command === "string") {
    // Transitional compatibility for the pre-L04 safe GET caller: zero query,
    // insert, delete, prune, or side effect. L04 removes that caller entirely.
    return { recorded: false };
  }
  const normalized = normalizeAndValidateSearchHistoryCommand(command);
  const id = uuidV5(SEARCH_HISTORY_IDEMPOTENCY_NAMESPACE,
    canonicalJson([userId, normalized.idempotencyKey]));
  return db.transaction(async (tx) => {
    const inserted = await insertSearchHistoryOnPrimaryKeyConflictDoNothing(
      tx, { id, userId, query: normalized.query, filters: normalized.filters });
    if (inserted) return { recorded: true };
    const existing = await selectSearchHistoryIdempotencyFields(tx, id);
    if (!constantShapeEqual(existing,
      { userId, query: normalized.query, filters: normalized.filters }))
      throw new Error("search_history_idempotency_conflict");
    return { recorded: false }; // exact replay
  });
}

async function recordTrafficEvent(input: TrafficEventInput, db: Db): Promise<TrafficResult> {
  // Persist session/pageview only. Never import or invoke retention/pruning.
}

async function saveAssistantActionExecutionResult(input: SaveInput, db: Db): Promise<void> {
  await db.transaction(async tx => {
    const execution = await insertOrLoadIdempotentExecution(input, tx);
    assertSameActorPlanHash(execution, input);
    await insertUndoItems(execution.id, input.undoItems, tx);
  });
}
```

Use the exact child-first/cutoff order in the matrix. Preserve the canonical
`ANALYTICS_RETENTION_DAYS` name, default 365 days, and inclusive `[30,1095]`
bounds while removing the process-local inline gate; never reinterpret a
`RETENTION_ANALYTICS_*` age alias. Disabled legal/business families require
explicit enablement. Optimize append inserts to avoid broad
`RETURNING *` only where callers do not consume it. Errors are stable
`retention_policy_invalid`, `retention_batch_failed`, and existing assistant
idempotency conflict codes. Search-history command errors are
`search_history_invalid`, `search_history_idempotency_required`, and
`search_history_idempotency_conflict`. The UUIDv5 primary key is derived from a
fixed code-owned namespace plus actor/idempotency key; the raw key is not stored
or logged. Remove the old latest-query preflight read as well as `pruneHistory`:
distinct keys may append duplicate query text, while the existing bounded recent
read deduplicates query strings and scheduled retention owns physical cleanup.

`RETENTION_DRY_RUN` is parsed once by the policy owner and propagated as the
required typed `RetentionPolicy.dryRun`; L03 consumes that value and may not
reparse or override it. Dry-run executes the same cutoff, eligibility,
preservation, ordering, and `LIMIT <= 2,000` candidate query as apply mode, but
executes zero `DELETE`/`UPDATE`, takes no destructive row lock, publishes no
cache/outbox event, and advances no persisted high-water mark. Counts are
observational and may change under concurrent writes; that limitation is
reported without exposing row data. Direct calls to these family services do
not acquire L03's scheduler advisory lock; a scheduled invocation is separately
serialized by L03 before it calls the same dry-run service path.

## Testing Requirements

- Policy matrix covers defaults, min/max, unknown fields, disabled/dry-run,
  batch/max-batch bounds, and deterministic cutoff at fixed clocks.
- Dry-run tests pin absent/`true`/`false`, reject empty/whitespace/case variants/
  `1`/`0`, reject every family or CLI alias, and prove global true cannot be
  overridden. Every family reads at most `batchSize` eligible IDs with exact
  preservation/order semantics and executes zero deletes, updates, destructive
  row locks, outbox/cache publication, or persisted high-water writes across
  repeated direct-service runs; those tests do not assert absence of L03's
  separate scheduler advisory lock.
- Analytics policy tests prove `ANALYTICS_RETENTION_DAYS` remains the only age
  source and pins every row of the exact `Number(raw)` truth table, including
  empty/whitespace, hexadecimal, exponent, fractional, non-finite, and malformed
  strings. Both unsupported age aliases reject alone or beside the canonical key.
- Compatibility tests prove absent and arbitrary strings for both
  `ANALYTICS_PRUNE_INLINE_DISABLED` and `ANALYTICS_PRUNE_INLINE_ENABLED` yield
  identical scheduled policy and zero request-path prune calls; each present key
  warns once across repeated initialization, both keys yield exactly two warning
  codes, no value rejects startup, and no warning contains either value.
- Registry coverage compares every append-heavy schema table with this policy/
  exemption list and fails when a table is unclassified. For each enabled family
  seed uniquely prefixed old/boundary/new rows; one invocation
  deletes at most the configured batch, preserves boundary/new/unowned rows,
  orders oldest first, and repeated runs converge idempotently.
- Consume TASK-551-01-L02's frozen `2036-01-01` retention scenarios verbatim:
  password resets `3,000/60,000`; page and post preview tokens independently
  `1,500/30,000`; assistant ingest `3,000/60,000` with `100/1,000` newest-success
  anchors; form child/parent `3,600/180,000` and `1,200/60,000`; solution-kit
  item/run `3,000/300,000` and `600/60,000` with newest success/rollback anchors.
  Run `499/500/501/2,000/2,001` candidates and ten-batch convergence. Literal
  cutoff-boundary rows survive, disabled families do zero writes until enabled,
  child-first ordering holds, and dry-run matched/deleted counts are exact.
- Instrument analytics traffic ingestion and search-history writes and prove
  zero prune SQL on either request path. Verify both write services contain no
  retention import/call and both dedicated retention services use bounded
  oldest-ID deletes only.
- Search-history source guards anchor the real implementation: the private
  `pruneHistory` declaration and exact `await pruneHistory(userId,
  DEFAULT_LIMIT)` call are absent after the change.
  The transitional string-input branch performs exactly zero SQL. The strict
  command path validates actor/query/dateRange/limit/UUID, inserts by deterministic
  UUIDv5 primary key, returns `recorded:false` for 50 concurrent exact replays,
  and returns `search_history_idempotency_conflict` when the same actor/key is
  reused with different canonical query/filters. Different keys append safely,
  with zero latest-query preflight and zero inline DELETE/prune statement.
- The Bun-free contract suite pins exact reject-unknown keys, normalization,
  date-range enum, finite integer limit bounds, canonical UUID syntax, deep
  frozen output, and import isolation from DB/runtime. TASK-551-04 route and
  browser client import this one owner instead of duplicating a payload type.
- Inject assistant failure between execution and undo inserts; neither persists.
  Race same/different actor-plan-hash idempotency keys and prove replay/conflict
  semantics with no orphan/partial undo rows.
- Perf fixture proves every named family/batch edge scans bounded indexed rows,
  stays under timeout, and query count does not grow with table cardinality; a
  policy family absent from the frozen fixture/budget registry fails the suite.

## Security Contract

- Service/database changes only; existing admin access/audit/session and
  assistant routes retain session/API-key auth, RBAC, CSRF on writes, current
  rate-limit/quota buckets, and strict request validation.
- L01 creates no endpoint. Its command is designed for L04's internal session-
  authenticated `content:read`, CSRF-protected, admin-write-rate-limited strict
  POST. The temporary pre-L04 GET compatibility branch is deliberately
  non-mutating and is removed as a caller by L04.
- No new public route/write; existing analytics/form anti-abuse and webhook
  signature/HMAC/replay controls remain authoritative.
- Pruners are internal allowlisted functions, not arbitrary table/filter APIs.
  Logs/metrics include family, duration, counts, and synthetic error code only;
  never deleted PII/content, SQL binds, tokens, hashes, or secrets.
- Test cleanup is fixture-scoped; never truncate or globally delete shared DB
  data outside the explicit production retention job under test.

## Validation Commands

- `bunx vitest run tests/vitest/maintenance/retentionPolicy.test.ts`
- `bunx vitest run tests/vitest/search/searchHistoryContract.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/access/accessLogService.test.ts tests/unit/audit/auditService.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/search/searchHistoryService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/server/task551ActionExecutionStore.test.ts tests/integration/analytics/trafficRepository.test.ts tests/integration/analytics/trafficRetention.test.ts tests/integration/server/task551AppendHeavyRetention.test.ts tests/perf/database-retention-batches.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

No shared docs. Pass the family policy table, request-hook removals, privacy
defaults (including the canonical `ANALYTICS_RETENTION_DAYS` compatibility
truth table, strict `RETENTION_DRY_RUN`, and both deprecated analytics inline
flag no-op/removal notices),
SQL/index assumptions, and recovery/error behavior to
TASK-551-10-L02.

## Quantified Acceptance

- Every invocation deletes at most 2,000 rows per family/batch and at most 100
  batches; defaults are 500 rows and 10 batches.
- Every append-heavy table is classified by the registry as bounded or explicitly
  exempt, with the exact env prefix/default/min/max/cutoff/order above.
- Analytics age configuration accepts only `ANALYTICS_RETENTION_DAYS`; absent,
  malformed, or non-finite input resolves to 365, and finite `Number(raw)` input
  is floored then clamped to `30..1095` exactly as the truth table specifies.
  Unsupported aliases cannot override it.
- Every present `ANALYTICS_PRUNE_INLINE_DISABLED` or
  `ANALYTICS_PRUNE_INLINE_ENABLED` value is a per-key warning-once deprecated
  no-op; no value rejects startup and inline prune SQL remains zero.
- `RETENTION_DRY_RUN=true` performs bounded candidate reads for every family and
  exactly zero database/cache/outbox mutation; any noncanonical boolean fails
  before scheduling.
- Request-path writes execute exactly 0 retention/prune statements.
- Search-history persistence is concurrency-idempotent by actor/key: one of 50
  exact replays inserts, all others are no-op replays, and mismatched key reuse
  fails without mutation. The pre-L04 safe-method compatibility call writes zero
  rows and TASK-551-04 leaves zero production callers of that branch.
- All old fixture rows converge to zero while 100% of boundary/new/unowned rows
  survive; repeated completed runs delete zero.
- Assistant execution and undo rows are atomic under 50 concurrent replay/
  conflict attempts, with zero orphan/partial manifests.
- Every touched production/test file is at most 1,000 physical lines.
