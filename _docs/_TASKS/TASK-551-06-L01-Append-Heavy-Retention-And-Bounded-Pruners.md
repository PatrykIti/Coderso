# TASK-551-06-L01: Append-Heavy Retention and Bounded Pruners
# FileName: TASK-551-06-L01-Append-Heavy-Retention-And-Bounded-Pruners.md

**Parent Task:** TASK-551
**Parent Subtask:** TASK-551-06
**Priority:** Critical
**Category:** Database / Reliability / Privacy / Performance
**Estimated Effort:** Large
**Dependencies:** TASK-551-04-L02 and TASK-551-05-L02
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
`tests/integration/assistant/actionExecutionStore.test.ts`,
`tests/integration/analytics/trafficRepository.test.ts`,
`tests/integration/analytics/trafficRetention.test.ts`,
`tests/integration/database/appendHeavyRetention.test.ts`, and
`tests/perf/database-retention-batches.test.ts`.

No other file may be edited. In particular, L03 owns scheduler/startup;
TASK-551-03 owns `submissionService.ts`, `webhooksService.ts`, and
`sessionService.ts`; TASK-511 backup, TASK-517 entry/public-site, TASK-493 GSC,
TASK-518/schema/migrations, cache, task/changelog/workflow paths are forbidden.
This leaf is the sole TASK-551 writer of the whole `trafficRepository.ts`; it
removes the request-time `maybePruneExpiredTraffic` import/call and moves its
cutoff deletes into bounded `trafficRetentionService.ts` batches. It never edits
`searchHistoryService.ts`: TASK-551-04-L01 wholly owns that file, removes its
inline prune, and hands this leaf the `search_history` table/cutoff/newest-10/
`created_at ASC, id ASC` contract. This leaf solely creates
`searchHistoryRetentionService.ts`, so the two leaves share no written file.

## Complete Family Policy Matrix

Global knobs use prefix `RETENTION_`: `BATCH_SIZE` defaults to 500 and validates
`1..2000`; `MAX_BATCHES_PER_RUN` defaults to 10 and validates `1..100`; dry-run
defaults false. Every enabled age is an integer and explicit out-of-range values
are rejected, not silently clamped. `cutoff` means `column < now - age` (the
boundary is retained), and every order finishes with immutable `id ASC`.

| Tables/family | Environment prefix | Default and bounds | Cutoff and delete order |
|---|---|---|---|
| `access_logs` | `RETENTION_ACCESS_LOGS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `audit_logs` | `RETENTION_AUDIT_LOGS_` | enabled, 365 days, `30..2555` | `created_at ASC, id ASC` |
| `email_delivery_logs` | `RETENTION_EMAIL_DELIVERY_LOGS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `search_history` | `RETENTION_SEARCH_HISTORY_` | enabled, 90 days, `7..365`; keep newest 10/user | age first, then excess per user; `created_at ASC, id ASC` |
| `integration_requests` | `RETENTION_INTEGRATION_REQUESTS_` | enabled, 90 days, `7..365` | `created_at ASC, id ASC` |
| `password_resets` | `RETENTION_PASSWORD_RESETS_` | enabled, 7 days after expiry, `1..30` | only expired; `expires_at ASC, id ASC` |
| `preview_tokens`, `post_preview_tokens` | `RETENTION_PREVIEW_TOKENS_` | enabled, 1 day after expiry, `1..30` | only expired; page tokens then post tokens, `expires_at ASC, id ASC` |
| `assistant_doc_ingest_runs` | `RETENTION_ASSISTANT_INGEST_RUNS_` | enabled, 90 days, `7..365` | preserve newest successful run/source; `created_at ASC, id ASC` |
| `assistant_action_executions`, undo items | `RETENTION_ASSISTANT_ACTIONS_` | enabled, 180 days, `30..730` | undo children then executions; `created_at ASC, id ASC` |
| analytics sessions/pageviews | `RETENTION_ANALYTICS_` | enabled, 365 days, `30..1095` | pageviews by `created_at ASC, id ASC`, then sessions by `last_seen_at ASC, id ASC` |
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
  maxAgeDays: number;
  batchSize: number;       // default 500, max 2_000
  maxBatchesPerRun: number; // default 10, max 100
}>;

function normalizeRetentionPolicy(input: unknown, bounds: FamilyBounds): RetentionPolicy {
  // Reject unknowns/non-integers/out-of-range values; do not clamp explicit env.
}

async function pruneOldestBatch(policy: RetentionPolicy, tx: Tx): Promise<PruneBatchResult> {
  // Indexed cutoff + id tie-breaker, LIMIT, FOR UPDATE SKIP LOCKED, scoped DELETE.
  // Return counts/high-water mark only; no deleted content/PII.
}

async function pruneSearchHistoryBatch(policy: RetentionPolicy, tx: Tx): Promise<PruneBatchResult> {
  // Consume L04-L01's table contract: age cutoff first, preserve newest 10/user,
  // lock at most policy.batchSize oldest IDs, then delete only those IDs.
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

Use the exact child-first/cutoff order in the matrix. Preserve analytics default
365 days and its [30,1095] bounds while removing the process-local inline gate;
disabled legal/business families require explicit enablement. Optimize append inserts to avoid broad
`RETURNING *` only where callers do not consume it. Errors are stable
`retention_policy_invalid`, `retention_batch_failed`, and existing assistant
idempotency conflict codes.

## Testing Requirements

- Policy matrix covers defaults, min/max, unknown fields, disabled/dry-run,
  batch/max-batch bounds, and deterministic cutoff at fixed clocks.
- Registry coverage compares every append-heavy schema table with this policy/
  exemption list and fails when a table is unclassified. For each enabled family
  seed uniquely prefixed old/boundary/new rows; one invocation
  deletes at most the configured batch, preserves boundary/new/unowned rows,
  orders oldest first, and repeated runs converge idempotently.
- Instrument analytics traffic ingestion and TASK-551-04's search-history write
  handoff and prove zero prune SQL on either request path. Verify the traffic
  repository contains no retention import/call and both dedicated services use
  bounded oldest-ID deletes only.
- Inject assistant failure between execution and undo inserts; neither persists.
  Race same/different actor-plan-hash idempotency keys and prove replay/conflict
  semantics with no orphan/partial undo rows.
- Perf fixture proves each batch scans bounded indexed rows, stays under timeout,
  and query count does not grow with table cardinality.

## Security Contract

- Service/database changes only; existing admin access/audit/session and
  assistant routes retain session/API-key auth, RBAC, CSRF on writes, current
  rate-limit/quota buckets, and strict request validation.
- No new public route/write; existing analytics/form anti-abuse and webhook
  signature/HMAC/replay controls remain authoritative.
- Pruners are internal allowlisted functions, not arbitrary table/filter APIs.
  Logs/metrics include family, duration, counts, and synthetic error code only;
  never deleted PII/content, SQL binds, tokens, hashes, or secrets.
- Test cleanup is fixture-scoped; never truncate or globally delete shared DB
  data outside the explicit production retention job under test.

## Validation Commands

- `bunx vitest run tests/vitest/maintenance/retentionPolicy.test.ts`
- `set -a && source .env && set +a && bun test tests/unit/access/accessLogService.test.ts tests/unit/audit/auditService.test.ts`
- `set -a && source .env && set +a && bun test tests/integration/assistant/actionExecutionStore.test.ts tests/integration/analytics/trafficRepository.test.ts tests/integration/analytics/trafficRetention.test.ts tests/integration/database/appendHeavyRetention.test.ts tests/perf/database-retention-batches.test.ts`
- `bun --cwd core lint:types`
- `bun --cwd core lint`
- `bun run gates:coderso`
- `bun run gates:coderso:perf`
- `bun run scan:security`

## Documentation Updates Required

No shared docs. Pass the family policy table, request-hook removals, privacy
defaults, SQL/index assumptions, and recovery/error behavior to TASK-551-10-L02.

## Quantified Acceptance

- Every invocation deletes at most 2,000 rows per family/batch and at most 100
  batches; defaults are 500 rows and 10 batches.
- Every append-heavy table is classified by the registry as bounded or explicitly
  exempt, with the exact env prefix/default/min/max/cutoff/order above.
- Request-path writes execute exactly 0 retention/prune statements.
- All old fixture rows converge to zero while 100% of boundary/new/unowned rows
  survive; repeated completed runs delete zero.
- Assistant execution and undo rows are atomic under 50 concurrent replay/
  conflict attempts, with zero orphan/partial manifests.
- Every touched production/test file is at most 1,000 physical lines.
