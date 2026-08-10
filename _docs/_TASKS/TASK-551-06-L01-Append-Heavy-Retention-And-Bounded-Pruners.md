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
`core/services/webhooks/webhookRetentionService.ts`,
`core/services/auth/sessionRetentionService.ts`,
`core/services/kits/legacyRollbackProgressDigest.ts` (new Bun-free pure owner), and
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
`tests/perf/database-retention-batches.test.ts`, plus new
`tests/vitest/kits/legacyRollbackProgressDigest.test.ts`.

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
| solution-kit install runs/items/owner/template-evidence/progress authority | `RETENTION_SOLUTION_KIT_RUNS_` | **disabled**, when enabled 365 days, `30..3650` | preserve the complete active/retry graph below; progress/owner/evidence/items and rollback children before source runs |

### Canonical legacy rollback combined-progress digest

This leaf owns the Bun-free
`core/services/kits/legacyRollbackProgressDigest.ts` contract before TASK-489 can
produce a terminal proof. It exports exactly
`buildLegacyRollbackInstallItemDigest`,
`buildLegacyTemplateStateDigest`,
`buildLegacyTemplateSourceEvidenceDigest`,
`buildLegacyTemplateRollbackProgressDigest`,
`buildLegacyCombinedPositionMap`,
`buildLegacyRollbackCombinedProgressDigest`, and their strict input/persisted
types. It
also owns the exact shared constants
`LEGACY_COMBINED_OPERATION_LIMIT=512`,
`LEGACY_TEMPLATE_OPERATION_LIMIT=100`,
`LEGACY_TEMPLATE_SEEDS_MAX_BYTES=4_194_304`,
`LEGACY_TEMPLATE_SNAPSHOT_MAX_BYTES=524_288`,
`LEGACY_TEMPLATE_ACTION_MAX_BYTES=1_049_600`,
`LEGACY_TEMPLATE_ACTIONS_MAX_BYTES=12_582_912`,
`STARTER_LIFECYCLE_ENVELOPE_MAX_BYTES=16_777_216`, and
`LEGACY_COMBINED_DIGEST_INPUT_MAX_BYTES=8_388_608`; TASK-489 imports these values
read-only and may re-export, but never redeclares them.

Every digest builder in this module hashes exactly the UTF-8 bytes of the strict
input object's canonical JSON. The input itself contains one required literal
`contract` member, which is the sole domain/version frame; there is no implicit
prefix, NUL separator, wrapper object, insertion-order encoding, or caller-selected
domain. Canonical JSON recursively sorts object keys by Unicode code point, so any
prose field list declares the closed member set only, never an alternate byte order.
The builders reject a missing or wrong contract before hashing.

The install-item input and normalized-row projection are exact:

```ts
type StrictJsonPrimitive = null | boolean | number | string;
type StrictJsonValue =
  | StrictJsonPrimitive
  | readonly StrictJsonValue[]
  | StrictJsonObject;
type StrictJsonObject = Readonly<{ [key: string]: StrictJsonValue }>;

type LegacyRollbackInstallItemDigestInputV1 = Readonly<{
  contract: "coderso.legacy-rollback-install-item@v1";
  id: string; runId: string; position: number;
  resourceType: "content_type" | "form" | "page" | "menu";
  resourceKey: string;
  operation: "create" | "update" | "noop" | "delete" | "restore";
  status: "planned" | "success" | "failed" | "skipped";
  beforeSnapshot: StrictJsonObject | null;
  afterSnapshot: StrictJsonObject | null;
  rollbackAction: StrictJsonObject | null;
}>;
type LegacyRollbackInstallItemRecordV1 = Omit<
  LegacyRollbackInstallItemDigestInputV1,
  "contract"
>;
```

The repository reconstructs the fixed contract literal from a strict explicit-column
row projection; it never reads a contract or digest from item JSON. Canonical UUIDs,
position `0..511`, normalized 1..128-byte resource keys, the closed enums above,
plain recursive JSON, and the owning snapshot/action byte caps are validated before
hashing. Timestamps and raw `error` are excluded. The helper hashes one bounded item
at a time, so aggregate snapshot bytes are never retained in memory. A terminal
combined-proof validator additionally requires source items to be successful and
every core rollback receipt to be terminal; hashing a planned row does not make it
terminal proof authority.

`buildLegacyCombinedPositionMap({coreCount,templateCount})` validates integer
counts, template count `<=100`, and total `<=512`, then returns deeply frozen
core/template entries. Core local position `c` maps to global
`sourcePosition=c` and `rollbackPosition=templateCount+(coreCount-1-c)`.
Template local position `t` maps to global `sourcePosition=coreCount+t` and
`rollbackPosition=templateCount-1-t`. Thus apply order is core then template and
rollback order is exact reverse; both global position sets are contiguous
`0..total-1`. Existing core source/rollback item rows keep their native local
positions; TASK-489 uses this map when constructing combined proof members and
persists template evidence/progress with global positions. No consumer may infer a
second offset formula.

The module also owns the exact strict normalized template types used by its source,
state, and progress digests. `StrictTemplateSnapshot` has only
`id,name,description,category,status,blocks,settings`: canonical UUID `id`, bounded
NFC strings, `description:string|null`, `status:"draft"|"published"`, recursively
plain JSON `blocks`, and exact normalized `{layout:...}` settings. Blocks/settings
must already be the strict output of their owning write normalizers; this Bun-free
module revalidates the closed snapshot top level, recursive JSON grammar, and byte
caps without importing the runtime widget registry. `StrictTemplateDeleteRollbackAction`
has exactly `key,operation:"create",templateId,beforeSnapshot:null,afterSnapshot`;
`StrictTemplateRestoreRollbackAction` has exactly
`key,operation:"update",templateId,beforeSnapshot,afterSnapshot`. Both snapshots in
an action are strict snapshots, key/ID parity with the evidence row is mandatory,
and the applied `afterSnapshot` can never be omitted.

```ts
type StrictTemplateSnapshot = Readonly<{
  id: string;
  name: string;
  description: string | null;
  category: string;
  status: "draft" | "published";
  blocks: readonly StrictJsonObject[];
  settings: Readonly<{ layout: StrictJsonObject }>;
}>;
type StrictTemplateDeleteRollbackAction = Readonly<{
  key: string;
  operation: "create";
  templateId: string;
  beforeSnapshot: null;
  afterSnapshot: StrictTemplateSnapshot;
}>;
type StrictTemplateRestoreRollbackAction = Readonly<{
  key: string;
  operation: "update";
  templateId: string;
  beforeSnapshot: StrictTemplateSnapshot;
  afterSnapshot: StrictTemplateSnapshot;
}>;
```

`buildLegacyTemplateStateDigest` accepts exactly this tagged input:

```ts
type LegacyTemplateStateDigestInputV1 = Readonly<{
  contract: "coderso.legacy-template-state@v1";
  state:
    | Readonly<{ present: false }>
    | Readonly<{ present: true; snapshot: StrictTemplateSnapshot }>;
}>;
```

`sourceAfterDigest` is always
`buildLegacyTemplateStateDigest({contract:"coderso.legacy-template-state@v1",
state:{present:true,snapshot:afterSnapshot}})` from the successful source-evidence
row. For create rollback, `rollbackTargetDigest` is
`buildLegacyTemplateStateDigest({contract:"coderso.legacy-template-state@v1",
state:{present:false}})`; for update rollback it is
`buildLegacyTemplateStateDigest({contract:"coderso.legacy-template-state@v1",
state:{present:true,snapshot:beforeSnapshot}})`. The tagged outer object is always
part of the preimage; an untagged state object is invalid. Noop/failed/skipped source
evidence has no mutation target and can only use the null target state allowed below.
The progress parser and retention path recompute both values from locked source
evidence/current-state projections; a caller-provided 64-hex value is comparison
data only.

The source-evidence input is the strict closed union over
`contract,sourceRunId,sourcePosition,templateKey,templateId,planDigest,operation,
beforeSnapshot,status,afterSnapshot,rollbackAction,safeErrorCode`; its create/
update/noop and success/failed/skipped matrix is exactly the SQL-enforceable matrix
from TASK-551-05-L01 plus recursive snapshot/action schemas and the constants
above. Its required contract is `coderso.legacy-template-evidence@v1`, and its digest
uses only the canonical code-point key ordering defined above. The rollback-progress input is exactly
`contract:"coderso.legacy-template-rollback-progress@v1",rollbackRunId,
sourceRunId,sourceEvidenceId,sourcePosition,rollbackPosition,sourceStatus:
"success",state,sourceEvidenceDigest,sourceAfterDigest,rollbackTargetDigest,
mutationInvalidationEventKey,compensationInvalidationEventKey`; its state/event
matrix is the L05 check, and its digest covers every listed field. Both builders
strictly parse unknown keys, canonical IDs/NFC strings, byte caps, lowercase
digests, and cross-field state before returning lowercase SHA-256. Persisted
`evidence_digest` and `progress_digest` are comparison values and are never part of
their own digest preimages.

```ts
type LegacyTemplateEvidenceIdentityV1 = Readonly<{
  contract: "coderso.legacy-template-evidence@v1";
  sourceRunId: string; sourcePosition: number; templateKey: string;
  planDigest: string;
}>;
type LegacyTemplateSourceEvidenceDigestInputV1 =
  | (LegacyTemplateEvidenceIdentityV1 & Readonly<{
      templateId: string; operation: "create"; beforeSnapshot: null; status: "success";
      afterSnapshot: StrictTemplateSnapshot;
      rollbackAction: StrictTemplateDeleteRollbackAction; safeErrorCode: null;
    }>)
  | (LegacyTemplateEvidenceIdentityV1 & Readonly<{
      templateId: string; operation: "update";
      beforeSnapshot: StrictTemplateSnapshot; status: "success";
      afterSnapshot: StrictTemplateSnapshot;
      rollbackAction: StrictTemplateRestoreRollbackAction; safeErrorCode: null;
    }>)
  | (LegacyTemplateEvidenceIdentityV1 & Readonly<{
      templateId: string; operation: "noop";
      beforeSnapshot: StrictTemplateSnapshot; status: "success";
      afterSnapshot: StrictTemplateSnapshot; rollbackAction: null; safeErrorCode: null;
    }>)
  | (LegacyTemplateEvidenceIdentityV1 & Readonly<{
      templateId: string | null;
      operation: "create" | "update" | "noop";
      beforeSnapshot: StrictTemplateSnapshot | null; status: "failed";
      afterSnapshot: null; rollbackAction: null; safeErrorCode: string;
    }>)
  | (LegacyTemplateEvidenceIdentityV1 & Readonly<{
      templateId: string | null;
      operation: "create" | "update" | "noop";
      beforeSnapshot: StrictTemplateSnapshot | null; status: "skipped";
      afterSnapshot: null; rollbackAction: null; safeErrorCode: null;
    }>);
type WithoutContract<T> = T extends unknown ? Omit<T, "contract"> : never;
type WithEvidenceDigest<T> = T extends unknown
  ? T & Readonly<{ evidenceDigest: string }>
  : never;
type LegacyTemplateSourceEvidenceRecordV1 = WithEvidenceDigest<
  WithoutContract<LegacyTemplateSourceEvidenceDigestInputV1>
>;

type LegacyTemplateRollbackProgressBaseV1 = Readonly<{
  contract: "coderso.legacy-template-rollback-progress@v1";
  rollbackRunId: string; sourceRunId: string; sourceEvidenceId: string;
  sourcePosition: number; rollbackPosition: number; sourceStatus: "success";
  sourceEvidenceDigest: string; sourceAfterDigest: string;
}>;
type LegacyTemplateRollbackProgressDigestInputV1 =
  | (LegacyTemplateRollbackProgressBaseV1 & Readonly<{
      state: "failed_no_mutation"; rollbackTargetDigest: null;
      mutationInvalidationEventKey: null; compensationInvalidationEventKey: null;
    }>)
  | (LegacyTemplateRollbackProgressBaseV1 & Readonly<{
      state: "rollback_committed"; rollbackTargetDigest: string;
      mutationInvalidationEventKey: string; compensationInvalidationEventKey: null;
    }>)
  | (LegacyTemplateRollbackProgressBaseV1 & Readonly<{
      state: "source_restored"; rollbackTargetDigest: string;
      mutationInvalidationEventKey: string; compensationInvalidationEventKey: string;
    }>);
type LegacyTemplateRollbackProgressRecordV1 =
  LegacyTemplateRollbackProgressDigestInputV1 & Readonly<{ progressDigest: string }>;
```

The noop builder additionally requires canonical `beforeSnapshot` and
`afterSnapshot` equality; static discrimination owns presence/type while the
strict parser owns value equality. The two builders accept only their `*DigestInputV1`
types. Repository reads parse the `*RecordV1` shape, add only the code-owned source-
evidence contract literal where that table has no contract column, project away the
stored digest, recompute it, and compare in constant time before returning the record.
Every successful evidence branch requires a canonical non-null `templateId` matching
its snapshots/actions. Failed/skipped evidence may carry a canonical known ID or null;
null means no native template identity was authoritatively obtained before failure and
can never be referenced by rollback progress because progress requires source success.

The combined input and reconstructed persisted comparison record are exact:

```ts
type LegacyRollbackCombinedCoreMemberV1 = Readonly<{
  kind: "core";
  sourcePosition: number; rollbackPosition: number;
  sourceItemId: string; sourceItemDigest: string;
  rollbackItemId: string; rollbackItemDigest: string;
}>;
type LegacyRollbackCombinedTemplateMemberV1 = Readonly<{
  kind: "template";
  sourcePosition: number; rollbackPosition: number;
  sourceEvidenceId: string; sourceEvidenceDigest: string;
  progressDigest: string;
}>;
type LegacyRollbackCombinedProgressMemberV1 =
  | LegacyRollbackCombinedCoreMemberV1
  | LegacyRollbackCombinedTemplateMemberV1;
type LegacyRollbackCombinedProgressDigestInputV1 = Readonly<{
  contract: "coderso.legacy-rollback-combined-progress@v1";
  sourceRunId: string; rollbackRunId: string;
  members: readonly LegacyRollbackCombinedProgressMemberV1[];
}>;
type LegacyRollbackCombinedProgressRecordV1 = Omit<
  LegacyRollbackCombinedProgressDigestInputV1,
  "contract"
> & Readonly<{ rollbackProofDigest: string }>;
```

`LegacyRollbackCombinedProgressRecordV1` is a strict reconstructed projection, not
a JSON authority column: the repository builds its members from locked normalized
rows and reads `rollbackProofDigest` only from the typed run column, adds the
code-owned contract literal, projects the comparison digest away, recomputes, and
compares in constant time. Members are in exact `sourcePosition ASC` order. Core
rollback IDs/digests are canonical and non-null; template members carry the exact
source-evidence/progress identity above. The parser requires `0..512` members,
canonical UUIDs, lowercase-64-hex digests, integer positions in `0..511`, unique
source identities, and both source/rollback position sets exactly contiguous
`0..members.length-1`. It recomputes every core item, template source-evidence,
and template rollback-progress digest from the strict persisted row projection before hashing the
combined object; caller-supplied digest strings are comparison inputs, never
authority. This combined input is terminal-proof-only: every core member must name a
verified terminal rollback item and every template member must name verified terminal
progress. A nullable rollback receipt is not a valid nonterminal shorthand and can
never populate `rollback_proof_digest`.

Canonical JSON recursively sorts object keys by code point, preserves array order,
requires NFC strings and finite JSON primitives, rejects unknown keys/accessors/
non-plain objects, and UTF-8 encodes once. The final lowercase SHA-256 is the only
valid combined-progress digest and the only legacy value permitted in
`solution_kit_install_runs.rollback_proof_digest`. TASK-489 imports all five digest
helpers plus the position-map builder read-only for locked finalization. Retention independently rebuilds the same input
from source/rollback items plus normalized template evidence/progress and compares
it with the typed run proof before treating terminal failed as zero-net. A missing,
oversized, contradictory, or digest-mismatched graph is
`solution_kit_retention_proof_invalid` and is skipped without deletion.

Solution Kit retention has one fail-closed graph predicate, not a newest-anchor
heuristic. Before selecting/deleting a candidate run, one bounded transaction
locks/rechecks and skips the complete connected graph when any of these holds:

- an unreleased `solution_kit_starter_apply_owners` row references the source;
- a running rollback owner references the source, or any terminal failed owner
  lacks typed `rollback_proof_kind='zero_net'` plus a matching independently
  recomputed combined-progress digest;
- normalized legacy template evidence/progress, source core items, historical
  envelope/options needed only for pre-normalized rows, or mutation/compensation
  invalidation receipt evidence is still
  needed to resume, prove zero net, or replay the terminal response;
- a newer same-package successful apply or its exact successful rollback relation
  can still affect active-source/restored-predecessor eligibility within the
  bounded 512-plus-sentinel classifier.

The pruner begins from at most `batchSize` age candidates and uses indexed existence/
count probes plus `LIMIT 2001` physical-row sentinels; it never materializes an
unbounded descendant graph. Under the canonical package/source lock it selects at
most one oldest terminal failed rollback owner at a time. That owner is retry-neutral
only after its complete bounded item/progress graph independently recomputes the typed
zero-net proof. One transaction then deletes all of that owner's progress/items and
the failed rollback run child-first. The combined-operation cap keeps this atomic unit
below 2,000 rows. No proof row is ever deleted in a transaction that leaves its owner
behind, so a crash yields either the complete verifiable owner or no owner.

Repeated batches drain arbitrarily many terminal failed retries one atomic owner at
a time. Running, recovery, unproven, successful, or contradictory rollback owners
are never selected by that path. Once no failed child remains, the pruner locks and
recomputes the complete source plus sole successful rollback graph and deletes its
progress/items, released owner, normalized template evidence, source items,
successful rollback run, and source run child-first in one final transaction. The
two combined-operation vectors plus owner/evidence/run rows remain below 2,000 by
contract; an observed `LIMIT 2001` sentinel is corruption and is skipped with
`solution_kit_retention_graph_limit_exceeded`. `batchSize` limits root candidate/
atomic-owner units, while the hard 2,000 cap limits physical deletes. The self-FK
remains `ON DELETE RESTRICT`, never `SET NULL`, and no partial transaction can make a
source eligible. Disabled mode and dry-run execute the same sentinel classification
with zero writes or persisted cursor.

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

async function pruneSolutionKitRunBatch(policy: RetentionPolicy, tx: Tx): Promise<PruneBatchResult> {
  // Read <=batchSize age candidates, lock one package/source graph, and use
  // indexed existence/count probes with LIMIT 2001 sentinels. Recompute every
  // terminal failed combined-progress digest through the Bun-free helper.
  // Delete at most one fully reverified terminal failed owner plus all its own
  // bounded children atomically, or delete the final successful relation/source
  // closed graph atomically. Never partially delete proof rows. Repeated batches
  // handle unbounded failed retries; fail closed on active/proof/cycle/gap/overflow.
  // Never inspect options for new authority; historical options are only a
  // fail-closed retention signal.
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
- Solution Kit retention additionally seeds an unreleased Setup owner, running
  rollback owner, failed-without-proof owner, failed `zero_net` proof graph,
  template progress in all three states, and 0/1/511/512/513 successor relations.
  It proves every active/recovery/restored-predecessor member survives, an eligible
  released/proof-complete graph deletes child-first, concurrent claim/release
  recheck cannot race deletion, and no authority query uses JSON predicates. The
  pure digest suite pins every literal contract frame, canonical code-point key
  ordering/NFC/UUID/position/digest grammar, strict template snapshot/action and
  present/absent state preimages, item-by-item hashing, and exact position-map vectors for empty, core-only,
  template-only, mixed 512-member, and rejected 513-member plans. It pins
  core-first source/template-first rollback ordering and exact known SHA-256
  vectors, including the exact `members:[]` digest with both contiguous position
  sets vacuously empty and retention recomputation of a zero-total terminal proof;
  a nonempty core member with a null rollback receipt is rejected before hashing;
  one changed snapshot/progress/event/position or arbitrary valid 64-hex
  run proof makes retention skip with `solution_kit_retention_proof_invalid`.
- Seed more than 2,000 terminal failed zero-net rollback descendants for one old
  source. Repeated batches recompute and delete one complete failed owner plus all
  its children atomically; crash injection before every delete commits nothing and
  after commit leaves no orphan owner/proof. The successful rollback relation,
  source, and their evidence delete together only in the final transaction.
  Running, recovery, unproven, multiple-success, gap/cycle, and a 2,001-row atomic
  owner/final graph delete nothing and expose the stable graph-limit/corruption outcome.
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
- `bunx vitest run tests/vitest/kits/legacyRollbackProgressDigest.test.ts`
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
- Solution Kit retention preserves 100% of normalized active/retry/progress/
  relation evidence and prunes only a locked complete released graph. It recomputes
  the terminal combined-progress digest, drains unbounded terminal failed retries
  as complete <=2,000-row owner transactions, and atomically deletes the successful
  relation with its source last; FK-restrict, digest-tamper, crash-atomicity, and
  512-plus-sentinel tests fail any unsafe partial graph deletion.
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
