# TASK-547-02-L01: Installer Split and Plan Resolver
# FileName: TASK-547-02-L01-Installer-Split-And-Plan-Resolver.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Installer Architecture
**Estimated Effort:** Large
**Dependencies:** TASK-547-01
**Status:** 🚧 In Progress
**Validation:** Corrective managed-evidence/planner work and final gates pending.

## Overview

Split the 2,700+ line installer into cohesive bounded modules while preserving
exports, then add deterministic create/update/noop/conflict planning. This leaf
owns the shared ledger/types boundary but performs no native resource mutation.

Both planner overloads accept normalized `FullSitePackageV1` and never call `normalizeFullSitePackageForWrite`.
The two-argument form builds once before dependency reads; the three-argument form consumes the closed-over frozen plan with zero builds/clones/mutations.
Native `normalizeDesired` remains required for each existing-resource equality decision inside `buildOperations`.

Define the common legacy/full-site ledger port and concrete DB adapter here,
preserve compatibility re-exports and wire default legacy composition. L02
consumes it only by injection; no second implementation or direct table write is
allowed. Keep in-memory construction compatible while exposing the stricter
persisted/listed item type.

**Exact production ownership:** this leaf alone owns:

- `core/services/kits/fullSiteInstallTypes.ts` -- package-owned kind/identity aliases,
  plan/ledger/snapshot/dependency types and safe error codes;
- `core/services/kits/fullSiteInstallPlanner.ts`;
- `core/services/kits/fullSiteInstall/currentResourceResolver.ts`;
- `core/services/kits/legacyInstallRunPersistence.ts` -- stable public facade, concrete-ledger composition, lock owner and compatibility re-exports;
- `core/services/kits/legacyInstallRunPersistence/readPersistence.ts` -- bounded raw/compatibility reads and managed-evidence query implementation;
- `core/services/kits/legacyInstallRunPersistence/dryRunTerminalization.ts` -- strict input/result validation and atomic dry-run terminal arbitration;
- `core/services/kits/solutionKitsInstallService.ts`, `kitInstaller.ts`,
  `legacyInstallPlanning.ts`, `legacyInstallResourceHandlers.ts` and `legacyInstallRollback.ts` -- bounded compatibility/default composition seams.

`solutionKitsInstallService.ts` remains a compatibility facade below 1,000 lines.
No other leaf redeclares or implements the port, imports install-run tables, or
edits these paths.

**Exact test ownership:**

- `tests/vitest/kits/full-site-install-planner.test.ts`;
- `tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts`;
- `tests/unit/kits/fullSiteLegacyLedgerReadPersistence.test.ts`;
- `tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts`;
- `tests/integration/kits/fullSiteManagedOwnershipDb.test.ts` (new, uniquely
  scoped and independently runnable DB ownership/resolver/history matrix; it
  contains no EXPLAIN profiles, helpers or budget test);
- `tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts` (new,
  cohesive and independently runnable DB EXPLAIN profile/helper/budget suite);
- `tests/integration/kits/fullSiteResolverBoundsDb.test.ts` (new, independently
  runnable exact-ID child-boundary suite with only scoped fixtures/cleanup).

**Forbidden for L01:** every L02 adapter/executor/staging/domain-atomic path and
test; L03 rollback/compensation/process worker/dependency/crash test paths; task
board/changelog/shared docs. Land this leaf and its gates before L02 starts.

## Two-Lock Ledger Contract

Keep `FullSiteInstallLedgerPort.withPackageLock` as the consumer-facing method so
existing fakes and imports stay compatible. The concrete implementation delegates
to the L01-owned `withFullSiteInstallLocks(packageKey, execute)` and guarantees:

1. require callers to validate actor before invocation and validate the bounded
   normalized package key before opening its lock connection;
2. acquire session advisory `GLOBAL_FULL_SITE` first;
3. acquire the package-key advisory lock second on that same connection;
4. hold both through the complete apply/dry-run/rollback or automatic-compensation
   lifecycle, including final ledger status;
5. release package then global in `finally`, including partial-acquisition errors.

The existing source-run claim transaction lock is acquired only after those two
session locks. No reverse ordering is allowed. The global lock is mandatory even
for distinct package keys because `site.*`/design shell settings share one store.

## Atomic Dry-Run Terminalization

L01 alone adds `terminalizeDryRun()` to the shared port and delegates its
concrete DB behavior to `legacyInstallRunPersistence/dryRunTerminalization.ts`.
Its runtime boundary accepts only a direct plain object with exact keys
`runId,status,error`: UUID run ID; `success` with `error:null`; or `failed` with
one safe error code. The returned direct plain object has exactly
`{outcome:"desired_terminal"}` or `{outcome:"different_terminal"}`; L02 validates
that exact result from injected fakes before using it. Unknown/missing keys,
invalid pairs and non-plain/proxy-trapping values fail cause-free as
`site_package_dry_run_finalize_failed`; a missing ID alone fails as
`site_package_run_not_found`.

The concrete method builds the bounded item summary, then executes one
`UPDATE solution_kit_install_runs ... WHERE id = <runId> AND mode = 'dry_run'
AND status = 'running' RETURNING status,error`. PostgreSQL row locking and
predicate recheck choose one winner. A returned row is
`desired_terminal`; otherwise a bounded same-ID re-read returns
`desired_terminal` only when both persisted status and safe error equal the
request, `different_terminal` for another `success|failed` pair, not-found for
absence, and the fixed finalize error for a non-dry-run or still-running row.
No terminal row is overwritten. Driver/shape failures expose only the fixed
finalize code, and no migration is permitted.

## Versioned Rollback Dependencies

`fullSiteInstallTypes.ts` imports `PackageResourceKind` from package `types` and
`PackageResourceIdentity` from `referenceRegistry`; it exports only aliases and
has no broader legacy union or reconstructed identity schema:

```ts
export type FullSiteInstallResourceKind = PackageResourceKind;
export type FullSiteResourceIdentity = PackageResourceIdentity;
export type FullSiteRollbackActionV1 = {
  schemaVersion: 1;
  dependencies: FullSiteResourceIdentity[];
};
export type FullSiteInstallLedgerItem = {
  position: number;
  kind: FullSiteInstallResourceKind;
  key: string;
  operation: FullSiteInstallOperation;
  status: "planned" | "success" | "failed" | "skipped";
  beforeSnapshot: JsonObject | null;
  afterSnapshot: JsonObject | null;
  rollbackAction?: JsonObject | null;
  error?: string | null;
};
export type PersistedFullSiteInstallLedgerItem =
  Omit<FullSiteInstallLedgerItem, "rollbackAction"> & {
    rollbackAction: JsonObject | null;
  };
export type RawFullSiteInstallLedgerItem = Readonly<{
  position: unknown; kind: unknown; key: unknown;
  operation: unknown; status: unknown;
  beforeSnapshot: unknown; afterSnapshot: unknown;
  rollbackAction: unknown; error: unknown;
}>;
export function buildFullSiteRollbackActionV1(
  input: {
    identity: FullSiteResourceIdentity;
    dependencies: readonly FullSiteResourceIdentity[];
  },
): JsonObject;
export function readFullSiteRollbackActionV1(
  value: unknown,
): FullSiteRollbackActionV1 | null;
export type FullSiteDryRunTerminalizationInput = Readonly<{
  runId: string;
  status: "success" | "failed";
  error: string | null;
}>;
export type FullSiteDryRunTerminalizationResult = Readonly<{
  outcome: "desired_terminal" | "different_terminal";
}>;
export type FullSiteInstallLedgerPort = {
  terminalizeDryRun(
    input: FullSiteDryRunTerminalizationInput,
  ): Promise<FullSiteDryRunTerminalizationResult>;
  listItems(runId: string): Promise<PersistedFullSiteInstallLedgerItem[]>;
  listRawItems(runId: string): Promise<readonly RawFullSiteInstallLedgerItem[]>;
};
```

The builder rejects self/invalid identities and emits unique sorted dependencies.
The strict reader allows only `schemaVersion`/`dependencies`, returns `null` for
missing/malformed/unknown V1, never coerces absence to `[]`, and leaves graph
closure to L03. It is total over revoked/hostile envelope or array Proxies,
including throwing prototype/keys/property/length/existence/descriptor/index
traps. In one guarded try it reads `dependencies` once, captures array and length,
requires a safe `0..4096`, reads exactly those guarded indices, then requires one
final equal length; no iterator or dynamic bound. Changing/string/throwing/
negative/fractional/`NaN`/unsafe lengths return `null`. Each hostile and exact
4,097 case is one captured `not.toThrow()` invocation returning `null`; a dense
4,096 succeeds and a counted getter proves one property read. All v18 cases stay.

Add optional `rollbackAction?: JsonObject | null` to the compatible construction
shape and the exact required persisted and raw exports above; no leaf may redefine
them. `recordItem()` writes V1 and preserves it when a later upsert omits the field.
`listItems()` remains a compatibility projection and is never authoritative for
rollback/compensation. Their sole source/prior boundary is `listRawItems()`: one
bounded query selects every row without operation/status filtering or value
coercion, ordered by `position ASC, id ASC`, with
`LIMIT PACKAGE_LIMITS.resourcesTotal + 1` (513). A 513th row fails closed as
`site_package_rollback_invalid_source`; unknown/delete/restore operations and
scalar/array/null snapshot/action values must reach L03 unchanged. Only L03 may
strictly parse the raw fields into `PersistedFullSiteInstallLedgerItem`; a matching
legacy-unknown `rollbackAction:null` is legal. This reuses the JSON column, so no
migration, snapshot or journal change is permitted. Current apply options declare
`rollbackDependencySchemaVersion:1`; absence is legacy-unknown, never zero edges.
L01 also adds the safe codes `site_package_recovery_missing_intended_id`,
`site_package_rollback_dependency_invalid`,
`site_package_rollback_dependency_blocked` and
`site_package_rollback_ledger_failed`, plus
`site_package_dry_run_finalize_failed`,
`page_revision_snapshot_too_large`, `entry_revision_snapshot_too_large` and
`detail_page_revision_snapshot_too_large`, before L02/L03 consume them.

## Strict Current-Resource Resolution

Preserve the public `createFullSiteCurrentResourceResolver` name and split its
lookup internally into exact `resolveExpectedResourceIdStrict` and natural-key
`resolveNaturalResourceIdDeterministically` helpers:

```ts
export type FullSiteCurrentResourceResolver = (
  kind: FullSiteInstallResourceKind,
  seed: ResourceSeed,
  expectedId?: string,
  managedEvidence?: ManagedResourceEvidence | null,
) => Promise<CurrentResourceState | null>;
```

The optional fourth argument is a gate-compatible evidence handoff, not a new
authority source. Existing two-argument direct calls and three-argument
exact-ID calls remain source-compatible. Its frozen tri-state meaning is:

- omitted/`undefined`: legacy or direct resolver mode; the concrete resolver may
  perform its existing ledger lookup;
- a `ManagedResourceEvidence` object: the caller already completed the lookup
  and the concrete resolver must use exactly that result;
- explicit `null`: the caller already completed the lookup and proved there is
  no evidence; the concrete resolver must not query the ledger again.

The three-argument planner resolves evidence once per supplied identity; the
two-argument overload first builds once. Both retain object-or-null and call
`resolveCurrentResource(kind, inspectionSeed, undefined, evidence)`. The concrete
resolver performs zero evidence queries in that mode, including for entry parents.
Resolve the parent from the already-inspected dependency in canonical DAG order
(using an inspection-only seed/context and leaving the authored package seed
unchanged); do not turn the parent reference into another ledger read. Therefore
the planner plus the concrete resolver performs exactly `ordered.length`
`findManagedResourceEvidence` calls, not twice that count or one extra call per
entry dependency.

- when `expectedId` is supplied, query only that ID constrained by the seed's
  natural identity (and parent content-type identity for entries); return `null`
  on any mismatch and never fall back to evidence or a natural-key row. The
  fourth argument cannot authorize a fallback. L02/L03 keep their existing
  three-argument exact-ID calls and recovery semantics unchanged;
- without `expectedId`, check current ledger evidence by exact ID first, then use
  the natural-key query solely to expose unmanaged collisions during planning;
- every natural-key query has `ORDER BY id ASC LIMIT 1`, including JSON-name
  detail lookup, so duplicate-capable domains have a stable tie-break;
- managed-evidence selection remains total-order deterministic:
  run `createdAt DESC`, run `updatedAt DESC`, run ID DESC, item `createdAt DESC`,
  item ID DESC; a failed/rolled-back/noop/mismatched-ID row never manages state;
- native desired reads use the exact resolved ID and the canonical owner
  **planner-equality projection**; no natural key is used during recovery,
  rollback or restore. This projection is not a rollback snapshot and must never
  be persisted as the `beforeSnapshot` for an aggregate/lifecycle update. L02's
  `ResourceAdapter.captureSnapshotById(id)` is the sole complete native snapshot
  path.

The content-entry branch must replace its bare desired-row `select()` with these
exact source projections (equivalent `satisfies` typing is allowed, but the
selected columns are not negotiable):

```ts
const CONTENT_ENTRY_ID_SELECTION = {
  id: contentEntries.id,
} as const;
const CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION = {
  contentTypeId: contentEntries.typeId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  data: contentEntries.data,
} as const;
```

Both strict-ID and natural-key content-entry identity queries select only
`CONTENT_ENTRY_ID_SELECTION`; the exact-ID/type/slug and natural type/slug
predicates, `id ASC` order and `LIMIT 1` remain unchanged. The native desired
query selects `CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION` and passes that result
directly to `projectDesired`, without a whole-row spread or post-read `typeId`
rename. This preserves all five and only five allowed content-entry equality
fields (`contentTypeId`, `title`, `slug`, `status`, `data`). Across identity and
desired reads, the safe column union is exactly `id`, `typeId`, `slug`, `title`,
`status` and `data`. It never selects or materializes
`contentEntries.accessPassword` (a hashed credential), nor `authorId`,
`visibility`, `tags`, publish/schedule fields or timestamps.

The same evidence audit proves two other bare desired reads load unrelated wide
columns, so narrow them in this correction without changing desired semantics:

```ts
const PAGE_PLANNER_EQUALITY_SELECTION = {
  slug: pages.slug,
  title: pages.title,
  status: pages.status,
  currentData: pages.currentData,
} as const;
const DETAIL_PAGE_PLANNER_EQUALITY_SELECTION = {
  name: detailPageDocuments.name,
  contentTypeId: detailPageDocuments.contentTypeId,
  currentDocument: detailPageDocuments.currentDocument,
} as const;
```

`pages.currentData` is genuinely consumed as authored `document`; therefore it
stays, while `publishedData`, `authorId` and timestamps must not be selected.
`detailPageDocuments.currentDocument` is genuinely consumed by the dynamic
`projectDesired` spread and supplies the document-owned status/blocks/etc.; it
stays with row-owned `name` and `contentTypeId`, while `publishedDocument`, the
separate row status and timestamps must not be selected. Do not switch either
planner read to published/revision data.

The remaining bare desired reads have equally concrete consumed-field evidence,
so narrow them too; leaving IDs/timestamps or aggregate metadata materialized
would violate the repository query rule. Own one exact selection constant per
row shape:

| Selection | Exact selected fields |
| --- | --- |
| `CONTENT_TYPE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `schema`, `status`, `config` |
| `FORM_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `status`, `description`, `successMessage`, `successRedirectUrl`, `submissionAccess`, `settings` |
| `FORM_FIELD_PLANNER_EQUALITY_SELECTION` | `id`, `type`, `label`, `name`, `required`, `settings`, `orderIndex` |
| `FORM_ACTION_PLANNER_EQUALITY_SELECTION` | `id`, `type`, `label`, `enabled`, `continueOnError`, `condition`, `config`, `orderIndex` |
| `PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `description`, `category`, `status`, `document` |
| `LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `description`, `layout`, `config` |
| `LISTING_QUERY_PLANNER_EQUALITY_SELECTION` | `name`, `description`, `query` |
| `MENU_PLANNER_EQUALITY_SELECTION` | `name`, `location`, `status`, `settings` |
| `MENU_ITEM_PLANNER_EQUALITY_SELECTION` | `id`, `label`, `href`, `pageId`, `parentId`, `orderIndex`, `settings` |

Import `formFields`, `formActions` and `FORM_FIELD_SCHEMA_LIMITS`; reuse that
owner's exact `fields = 100` cap. Reuse
`PACKAGE_LIMITS.resourcesPerCollection = 256` for form actions and menu items.
The direct explicit child projections have these exact cap+1 reads:

| Child | Stable unique order | Read limit |
| --- | --- | ---: |
| form fields | `orderIndex ASC, id ASC` | `FORM_FIELD_SCHEMA_LIMITS.fields + 1` = 101 |
| form actions | `orderIndex ASC, id ASC` | `PACKAGE_LIMITS.resourcesPerCollection + 1` = 257 |
| menu items | `orderIndex ASC, id ASC` | `PACKAGE_LIMITS.resourcesPerCollection + 1` = 257 |

Immediately after each `Promise.all`/child query resolves and before a parent-null
return, normalization or `projectDesired`, throw a fresh exact safe
`Error("site_package_too_large")` when its length is greater than its owner cap.
Never slice/truncate or return a false noop; equality at exactly 100/256 remains
valid. Retain `snapshotFormFieldsWriteShape` /
`normalizeFormFields`, `normalizeFormActionsInput`, canonical sorting and every
current normalized output field. This is query minimization/bounding only: do
not add desired keys, change normalizers or alter equality.
This persisted planner-equality projection is not L02's complete native
snapshot/write boundary: it intentionally remains on `normalizeFormActionsInput`.
L02 must not edit this L01-owned resolver or make it import the later
`normalizeFormActionsForWrite` helper.

An L01-owned source/query-shape regression isolates every native desired branch.
It proves exactly three `.from(contentEntries)` calls, two content-entry ID
selections and one equality selection. A reusable assertion extracts each whole
selection object body and compares all of it, in order, with the exact direct
`key: table.column` assignments above. It must fail before comparison on spread,
computed, shorthand, method, accessor, SQL/expression or any extra member; do not
filter regex matches and ignore unmatched text. Prove the helper rejects both a
synthetic malicious spread and a synthetic computed member. Retain the literal
forbidden-reference checks, reject every bare `.select()` in the resolver, and
keep strict expected-ID/null plus deterministic natural-lookup DB regressions.

## Bounded Managed-Evidence Query

`legacyInstallRunPersistence/readPersistence.ts` owns one testable query-builder seam,

```ts
export const buildManagedResourceEvidenceQuery = (input: {
  packageKey: string;
  kind: FullSiteInstallResourceKind;
  key: string;
}) => /* one executable Drizzle SELECT, bounded to zero or one row */;
```

`findManagedResourceEvidence(input)` awaits that builder exactly once. The
default query is one SQL statement per identity, not a candidate read followed
by rollback reads. Its frozen access path is run-driven: `candidateRun`, filtered
to the requested package plus `mode = apply` and `status = success`, is the
driving relation. For each such run, `innerJoinLateral` (or an exact Drizzle
equivalent that compiles to the same correlated `INNER JOIN LATERAL`) performs a
narrow `candidateItem` lookup correlated by
`candidateItem.runId = candidateRun.id`. That lookup filters the requested
resource kind/key, item `status = success` and operation `create|update`, orders
by item `createdAt DESC`, item ID DESC, and has `LIMIT 1`. It projects only the
item ID and the item ordering field required by the enclosing winner query,
explicitly SQL-aliased as `candidate_item_id` and
`candidate_item_created_at`; it must not materialize `afterSnapshot`.

The run-driven winner query contains exactly one combined correlated invalidation
anti-join: `NOT EXISTS` a rollback run correlated by
`rollbackOfRunId = candidateRun.id` with mode `rollback` where rollback status is
`success OR EXISTS` a rollback item belonging to that rollback run with the same
requested resource kind/key and status `success`. From the run plus its one
lateral item, the winner explicitly SQL-aliases its run ID as
`candidate_run_id`, carries the lateral `candidate_item_id` and
`candidate_item_created_at` fields as distinct derived columns, applies the
exact total order -- run `createdAt DESC`, run `updatedAt DESC`, run ID DESC,
item `createdAt DESC`, item ID DESC -- through qualified source fields or those
exact aliases, and has its own `LIMIT 1`. Only the outer fetch may select
`candidate_run_id`, join the winning item table row through
`candidate_item_id`, and project that one row's wide `afterSnapshot`.

The successful-run branch invalidates the whole source run even without an
outcome item. The nested matching-item branch invalidates that identity regardless
of whether its parent rollback run is `success`, `failed` or `running`. A
failed/running rollback without a successful matching item remains eligible. Do
not drive the winner from candidate items, build source-run ID arrays, use an
unbounded candidate result, load every `afterSnapshot`, or issue follow-up
rollback queries. The compiled
`buildManagedResourceEvidenceQuery(input).toSQL()` statement is the structural
regression seam for the candidate-run driving relation and filters, the
run-correlated `INNER JOIN LATERAL`, its item correlation/filters/two-field order
and per-run `LIMIT 1`, the one rollback-run-correlated `NOT EXISTS`, its
status-success `OR` nested matching-item `EXISTS`, the exact five-field winner
order and winner `LIMIT 1`, and the outer-only winning `afterSnapshot`
projection. The compiled-shape gate must assert the exact derived SQL aliases
`candidate_item_id`, `candidate_item_created_at` and `candidate_run_id`, and
must fail if derived-table construction/compilation reports duplicate `id`
columns or if the compiled lateral/winner projections expose duplicate or
unaliased generic `id` columns instead. The structural assertion locates the
two lateral item-order terms and proves `candidate_item_created_at DESC`
occurs before `candidate_item_id DESC`, before that lateral subquery's
`LIMIT 1`; merely proving that both strings occur is insufficient. Do not
depend on unavailable driver-level query counters. Runtime DB fixtures
separately prove selection semantics.

### Conditional No-Migration EXPLAIN Gate

The intended query-only/no-migration correction is conditional on measured plan
evidence, not an assumption. The current relevant schema indexes are
`solution_kit_install_items_run_idx(run_id)`,
`solution_kit_install_items_resource_idx(resource_type, resource_key)`,
`solution_kit_install_items_status_idx(status)`,
`solution_kit_install_items_run_resource_idx(run_id, resource_type, resource_key)`,
`solution_kit_install_runs_kit_idx(kit_id)`,
`solution_kit_install_runs_status_idx(status)`,
`solution_kit_install_runs_created_at_idx(created_at)`,
`solution_kit_install_runs_rollback_idx(rollback_of_run_id)` and the two primary
keys.

Query-only diagnostics (not frozen-gate completion) corrected the earlier
small-fixture conclusion. On the small fixture, the prior
two-separate-anti-join item-driven shape returned the expected winner with
6,233.54 scanned-row work and 755 root shared buffers, while the combined
rollback-run anti-join reduced those measurements to 504.08 and 83. However,
that combined item-driven shape passed only the small profile: the bounded-large
profile failed the frozen scan budget with 428,294.56 scanned-row work. A
run-driven correlated-`LATERAL` diagnostic returned the exact bounded-large
winner at ordinal 192 and measured 2.367 ms execution time, 1 root emitted row,
4,038.56 scanned-row work and 2,867 root shared buffers, all within the frozen
large-profile budgets. These sanitized diagnostics freeze the lateral access
path but do not complete the gate. They indicate that no new index is needed, so
no SQL migration, snapshot or journal artifact is added now. The no-migration
decision remains conditional and may be retained only after BOTH frozen profiles
below execute the exact production run-driven lateral query and pass every frozen
budget; a passing standalone diagnostic is insufficient.

Before retaining that conditional no-migration decision, extract every EXPLAIN
profile, type, parser, fixture helper and the named test from the 995-line
ownership matrix into the cohesive L01-owned
`tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts`. That file owns
the test `managed evidence SELECT satisfies no-migration EXPLAIN budgets`, backed
by `assertManagedResourceEvidenceExplainBudgets`; the original
`fullSiteManagedOwnershipDb.test.ts` remains the ownership/resolver/history
suite and contains no EXPLAIN-only code. Neither test imports the other or
depends on another test module's initialization, and each must run independently
and remain at most 1,000 physical lines.

That helper compiles the exact production
`buildManagedResourceEvidenceQuery(input).toSQL()` SQL and parameters and runs
that same run-driven correlated-lateral bounded SELECT as
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <compiled SQL>`. Parameters remain bound
through the database driver; never interpolate fixture values into SQL. Run the
profiles sequentially, with deterministic ordering fields and a distinct random
scope for each package/resource identity:

| Profile | Owned history fixture | `Execution Time` | Root emitted rows | Scanned-row work | Root shared buffers |
| --- | --- | ---: | ---: | ---: | ---: |
| Small | 16 successful apply run/item candidates + 8 rollback runs / 6 rollback items | <= 100 ms | <= 1 | <= 2,000 | <= 2,048 |
| Bounded large | 512 successful apply run/item candidates + 256 rollback runs / 192 rollback items | <= 250 ms | <= 1 | <= 20,000 | <= 20,480 |

Split each rollback set evenly across: a successful rollback with no required
outcome item, a failed rollback with a matching successful item, a running
rollback with a matching successful item, and an alternating failed/running
rollback with a matching failed item (therefore no matching successful item).
Attach the three invalidating groups to the newest 6 small / 192 bounded-large
candidates and make the next candidate carry the first non-invalidating rollback,
so it is the deterministic eligible winner after bounded history traversal;
assert that exact winner before running EXPLAIN. Compare the returned winner
to the preallocated expected run/resource IDs without an assertion-library
object diff; any mismatch throws only the fixed sanitized
`managed_evidence_explain_winner_mismatch` code and must not expose UUIDs,
package/resource keys, snapshots or query data. The 512-candidate profile
is a conservative one-identity history stress fixture aligned with the package's
512-resource planning ceiling; it is an evidence bound, not a retention limit.

Parse the JSON plan through one pure `parseManagedEvidenceExplainMetrics`
boundary without asserting a planner node name. Its guarded implementation maps
every malformed document, record/property access, number, node or `Plans`
structure to a new error whose sole message is
`managed_evidence_explain_invalid` and whose `cause` is absent. It must not leak
a `TypeError`, Proxy/JSON error, raw value or assertion diff. Preserve both real
driver representations already accepted: an already-decoded JSON array and a
JSON string that decodes to that array. After optional string decoding, require
an exact one-element top-level array, then a result record with one required
`Plan` record; zero/multiple results or any other top-level shape are invalid.
Pure valid fixtures cover both decoded-array and JSON-string forms before the
malformed matrix. Split numeric reads into these contracts:

- `Execution Time` on the result and `Actual Rows` plus `Actual Loops` on every
  visited plan node are required finite non-negative numbers. Zero is a valid
  measured value; missing/wrong-type/`NaN`/infinite/negative values are invalid,
  never a zero default;
- `Rows Removed by Filter`, `Rows Removed by Join Filter`, `Rows Removed by Index
  Recheck` and the four root `Shared * Blocks` counters are explicitly optional.
  Absence alone defaults to zero; when present, each must also be a finite
  non-negative number. A present own property whose value is `undefined` is
  invalid for every required or optional numeric key; it is never absence;
- `Plan` is a required record. `Plans` may be absent only for a leaf; when
  present it must be a dense array of valid child records, and recursion validates
  every child. `null`, an object/string, a sparse array or a malformed child is
  invalid. Derived products and sums must remain finite and non-negative or the
  input is invalid rather than a budget failure.

`Root emitted rows` is root `Actual Rows * Actual Loops`. `Scanned-row work` is
the recursive sum over all plan nodes of `(Actual Rows + Rows Removed by Filter +
Rows Removed by Join Filter + Rows Removed by Index Recheck) * Actual Loops`.
`Root shared buffers` is the root plan's sum of Shared Hit/Read/Dirtied/Written
Blocks. Freeze one canonical nested positive fixture and pass the identical value
as both a decoded array and `JSON.stringify(decoded)`: top-level `Execution Time`
is `7`; the root has `Actual Rows = 2`, `Actual Loops = 3`, Rows Removed by
Filter/Join Filter/Index Recheck `= 5/7/11`, and Shared
Hit/Read/Dirtied/Written Blocks `= 13/17/19/23`, plus exactly one child. That
child has `Actual Rows = 29`, `Actual Loops = 2`, Rows Removed by Filter/Join
Filter/Index Recheck `= 31/37/41`, and an absent leaf `Plans`. Each form must
deep-equal exactly
`{ executionMs: 7, emittedRows: 6, scannedRows: 351, sharedBuffers: 72 }`, not
merely satisfy budget bounds, thereby pinning child contribution and every
optional counter.

The table-driven malformed numeric matrix has exactly these key sets and no
substitutions: required `Execution Time`, `Actual Rows`, `Actual Loops`; optional
`Rows Removed by Filter`, `Rows Removed by Join Filter`,
`Rows Removed by Index Recheck`, `Shared Hit Blocks`, `Shared Read Blocks`,
`Shared Dirtied Blocks`, `Shared Written Blocks`. It includes a present
`undefined` row for every key. Pure, DB-independent regressions also cover
missing, wrong-type, non-finite and negative required metrics; malformed present
optional counters; invalid root and child nodes; `Plans` as
`null`/object/string/sparse/malformed-child`; derived overflow; and a valid leaf
with omitted optional counters and omitted `Plans`. For every malformed case,
invoke the parser exactly once, explicitly fail if it returns, capture the thrown
value, then assert `Object.getPrototypeOf(thrown) === Error.prototype`, the exact
message `managed_evidence_explain_invalid`, no own `cause`, and no hostile row
sentinel text. A second parser call or a message-only `toThrow` assertion cannot
satisfy this gate. A planner-selected `Seq Scan` on the tiny relation remains
acceptable when all profile budgets pass; an `Index Scan`/`Bitmap Scan` node name
is not an acceptance criterion. The `Execution Time` field is PostgreSQL server
execution time and deliberately excludes the Render network round trip; give the
complete remote-DB test a separate `360_000` ms timeout for bounded bulk seed and
cleanup.

Emit or retain only a sanitized summary containing the profile label, fixture
counts and the four measured numbers. Do not print/store raw plans, SQL,
parameters, UUIDs, package keys, resource keys or snapshot values. Preallocate
every run and item UUID, add it to the profile's owned-ID sets before its bulk
insert, and use those IDs in the inserted rows. Each profile owns a `finally`
cleanup that deletes only those item IDs and then those run IDs, including a
partial-seed/assertion failure. Never clean up by a broad package/resource
predicate and never depend on global table emptiness.

This measured gate is additive: the source-level single-builder-execution guard,
compiled query-shape assertions and planner/concrete-resolver exact call-count
test remain mandatory. If either profile exceeds any budget or exposes an
unbounded plan, the no-migration claim fails: stop L01 and re-audit this contract
for the required index plus complete SQL/snapshot/journal artifacts. Do not make
the test pass by reducing fixtures, raising ceilings, weakening the scanned-row
formula, reverting to the item-driven shape or pinning a planner node name.

## Security Contract

Service only; no route. Planner consumes only normalized packages, reports safe
IDs/keys, rejects unmanaged collisions before writes and never logs payload data.
Actor validation precedes lock/ledger DB access. Dependency readers reject
unknown fields and unbounded arrays. The content-entry equality query never
selects or materializes the hashed `accessPassword`; a later projection/drop is
not sufficient. Page/detail equality reads omit unused published document bodies.
No public endpoint is added. This contract retains no database migration only
after the managed-evidence EXPLAIN gate above proves the current indexes stay
within every frozen budget; failure requires contract re-audit before
implementation continues. No RBAC/CSRF/rate-limit change, secret snapshot or
cross-domain transaction is introduced.

## Implementation Pseudocode

```ts
export async function withFullSiteInstallLocks(packageKey, execute) {
  return withDedicatedLockConnection(async (client) => {
    await acquireGlobalFullSiteLock(client);
    try {
      await acquirePackageLock(client, packageKey);
      try { return await execute(); }
      finally { await releasePackageLock(client, packageKey); }
    } finally {
      await releaseGlobalFullSiteLock(client);
    }
  });
}
export function planFullSiteInstall(pkg, deps): Promise<FullSiteInstallPlan>;
export function planFullSiteInstall(pkg, referencePlan: readonly PlannedPackageResource[], deps): Promise<FullSiteInstallPlan>;
export async function planFullSiteInstall(pkg, referencePlanOrDeps, maybeDeps) {
  const [ordered, deps] = maybeDeps === undefined
    ? [buildReferencePlan(pkg), referencePlanOrDeps]
    : [referencePlanOrDeps, maybeDeps];
  // `ordered` exists before the first deps read; the supplied array is used as-is.
  const evidenceByIdentity = new Map(await Promise.all(ordered.map(async (resource) => [
    resource.identity,
    await deps.ledger.findManagedResourceEvidence({
      packageKey: pkg.key,
      kind: resource.kind,
      key: resource.key,
    }),
  ])));
  const inspected = [];
  const resolvedDependencyIds = new Map();
  for (const resource of ordered) {
    const evidence = evidenceByIdentity.get(resource.identity) ?? null;
    const inspectionSeed = {
      key: resource.key,
      desired: resolvePlannedPackageResourceRefs(resource, resolvedDependencyIds),
    };
    const current = await deps.resolveCurrentResource(
      resource.kind,
      inspectionSeed,
      undefined,
      evidence,
    );
    inspected.push({ resource, current, evidence });
    resolvedDependencyIds.set(resource.identity, current?.id ?? stablePlanningPlaceholder(resource));
  }
  return buildOperations(inspected, {
    normalizeDesired: deps.normalizeDesired,
    createdResourceIdentities: new Set(inspected.filter(({ current }) => !current).map(({ resource }) => resource.identity)),
    unmanaged: "conflict",
    allowSettingTakeover: deps.allowSettingTakeover,
  });
}
```

`resolveManagedIdentity` returns managed only when a successful, non-rolled-back run snapshot records the same native ID as the current row.
Matching a natural key or full desired payload without this proof is `site_package_conflict`, not reuse/noop.

```ts
// legacyInstallRunPersistence/readPersistence.ts
import { aliasedTable, and, asc, desc, eq, exists, inArray, notExists, or, sql } from "drizzle-orm";
import { db } from "../../../db/client"; import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../db/schema";
import { isRecord } from "../legacyInstallPlanning"; import type { JsonRecord, SolutionKitInstallItemRecord, SolutionKitInstallItemRow, SolutionKitInstallSummary } from "../legacyInstallPlanning";
import type { FullSiteInstallLedgerPort, FullSiteInstallResourceKind, ManagedResourceEvidence, PersistedFullSiteInstallLedgerItem, RawFullSiteInstallLedgerItem } from "../fullSiteInstallTypes";
import { PACKAGE_LIMITS, type JsonObject } from "../fullSitePackage/types";
type ReadPersistence = Pick<FullSiteInstallLedgerPort, "listItems" | "listRawItems" | "findManagedResourceEvidence">;
type ManagedEvidenceInput = Parameters<FullSiteInstallLedgerPort["findManagedResourceEvidence"]>[0];
type PersistedResourceType = typeof solutionKitInstallItems.$inferSelect.resourceType;
export const normalizeItemRow = (row: SolutionKitInstallItemRow): SolutionKitInstallItemRecord => ({ id: row.id, runId: row.runId, position: row.position,
  resourceType: row.resourceType as SolutionKitInstallItemRecord["resourceType"], resourceKey: row.resourceKey, operation: row.operation as SolutionKitInstallItemRecord["operation"],
  status: row.status as SolutionKitInstallItemRecord["status"], beforeSnapshot: isRecord(row.beforeSnapshot) ? row.beforeSnapshot as JsonRecord : null, afterSnapshot: isRecord(row.afterSnapshot) ? row.afterSnapshot as JsonRecord : null, rollbackAction: (row.rollbackAction ?? null) as JsonRecord | null, error: row.error, createdAt: row.createdAt, updatedAt: row.updatedAt });
export const buildSummary = (items: Pick<SolutionKitInstallItemRecord, "operation" | "status">[]): SolutionKitInstallSummary => {
  const summary: SolutionKitInstallSummary = { total: 0, success: 0, failed: 0, planned: 0, skipped: 0, operations: { create: 0, update: 0, noop: 0, delete: 0, restore: 0 } };
  for (const item of items) { summary.total += 1; summary.operations[item.operation] += 1; if (item.status === "success") summary.success += 1; if (item.status === "failed") summary.failed += 1; if (item.status === "planned") summary.planned += 1; if (item.status === "skipped") summary.skipped += 1; } return summary;
};
export async function listSolutionKitInstallItems(runId: string): Promise<SolutionKitInstallItemRecord[]> {
  const rows = await db.select().from(solutionKitInstallItems).where(eq(solutionKitInstallItems.runId, runId)).orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.createdAt)); return rows.map(normalizeItemRow); }
const readSnapshotId = (value: unknown): string | null => isRecord(value) && typeof value.id === "string" ? value.id : null;
const readDesiredSnapshot = (value: unknown): JsonObject => isRecord(value) && isRecord(value.desired) ? value.desired as JsonObject : isRecord(value) ? value as JsonObject : {};
export const buildManagedResourceEvidenceQuery = (input: ManagedEvidenceInput) => {
  const candidateItem = aliasedTable(solutionKitInstallItems, "managed_candidate_item"); const candidateRun = aliasedTable(solutionKitInstallRuns, "managed_candidate_run");
  const rollbackRun = aliasedTable(solutionKitInstallRuns, "managed_rollback_run"); const rollbackItem = aliasedTable(solutionKitInstallItems, "managed_rollback_item");
  const candidateItemId = sql<string>`${candidateItem.id}`.as("candidate_item_id"); const candidateItemCreatedAt = sql<Date>`${candidateItem.createdAt}`.as("candidate_item_created_at");
  const candidateItemForRun = db.select({ candidateItemId, candidateItemCreatedAt }).from(candidateItem)
    .where(and(eq(candidateItem.runId, candidateRun.id), eq(candidateItem.resourceType, input.kind as PersistedResourceType),
      eq(candidateItem.resourceKey, input.key), eq(candidateItem.status, "success"), inArray(candidateItem.operation, ["create", "update"])))
    .orderBy(desc(candidateItemCreatedAt), desc(candidateItemId)).limit(1).as("managed_candidate_item_for_run");
  const matchingSuccessfulRollbackItem = db.select({ one: sql<number>`1` }).from(rollbackItem).where(and(eq(rollbackItem.runId, rollbackRun.id),
    eq(rollbackItem.resourceType, input.kind as PersistedResourceType), eq(rollbackItem.resourceKey, input.key), eq(rollbackItem.status, "success")));
  const invalidatingRollbackRun = db.select({ one: sql<number>`1` }).from(rollbackRun).where(and(eq(rollbackRun.rollbackOfRunId, candidateRun.id),
    eq(rollbackRun.mode, "rollback"), or(eq(rollbackRun.status, "success"), exists(matchingSuccessfulRollbackItem))));
  const candidateRunId = sql<string>`${candidateRun.id}`.as("candidate_run_id");
  const winner = db.select({ candidateRunId, candidateItemId: candidateItemForRun.candidateItemId, candidateItemCreatedAt: candidateItemForRun.candidateItemCreatedAt })
    .from(candidateRun).innerJoinLateral(candidateItemForRun, sql`true`).where(and(eq(candidateRun.kitId, input.packageKey), eq(candidateRun.mode, "apply"), eq(candidateRun.status, "success"), notExists(invalidatingRollbackRun)))
    .orderBy(desc(candidateRun.createdAt), desc(candidateRun.updatedAt), desc(candidateRunId), desc(candidateItemForRun.candidateItemCreatedAt), desc(candidateItemForRun.candidateItemId)).limit(1).as("managed_resource_winner");
  return db.select({ runId: winner.candidateRunId, afterSnapshot: solutionKitInstallItems.afterSnapshot }).from(winner).innerJoin(solutionKitInstallItems, eq(solutionKitInstallItems.id, winner.candidateItemId));
};
export const findManagedResourceEvidence = async (input: ManagedEvidenceInput): Promise<ManagedResourceEvidence | null> => {
  const [row] = await buildManagedResourceEvidenceQuery(input); if (!row) return null; const resourceId = readSnapshotId(row.afterSnapshot); if (!resourceId) return null;
  return { runId: row.runId, resourceId, desired: readDesiredSnapshot(row.afterSnapshot), successful: true, rolledBack: false };
};
const projectCompatibilityItems = (items: SolutionKitInstallItemRecord[]): PersistedFullSiteInstallLedgerItem[] => items
  .filter((item) => item.operation === "create" || item.operation === "update" || item.operation === "noop").map((item) => ({ position: item.position,
    kind: item.resourceType as FullSiteInstallResourceKind, key: item.resourceKey, operation: item.operation as "create" | "update" | "noop", status: item.status,
    beforeSnapshot: item.beforeSnapshot as JsonObject | null, afterSnapshot: item.afterSnapshot as JsonObject | null, rollbackAction: item.rollbackAction as JsonObject | null, error: item.error }));
export const createLegacyInstallReadPersistence = (): ReadPersistence => ({
  async listItems(runId) { return projectCompatibilityItems(await listSolutionKitInstallItems(runId)); },
  async listRawItems(runId): Promise<readonly RawFullSiteInstallLedgerItem[]> {
    const rows = await db.select({ position: solutionKitInstallItems.position, kind: solutionKitInstallItems.resourceType, key: solutionKitInstallItems.resourceKey,
      operation: solutionKitInstallItems.operation, status: solutionKitInstallItems.status, beforeSnapshot: solutionKitInstallItems.beforeSnapshot,
      afterSnapshot: solutionKitInstallItems.afterSnapshot, rollbackAction: solutionKitInstallItems.rollbackAction, error: solutionKitInstallItems.error })
      .from(solutionKitInstallItems).where(eq(solutionKitInstallItems.runId, runId)).orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id)).limit(PACKAGE_LIMITS.resourcesTotal + 1);
    if (rows.length > PACKAGE_LIMITS.resourcesTotal) throw new Error("site_package_rollback_invalid_source"); return rows;
  }, findManagedResourceEvidence,
});
// legacyInstallRunPersistence/dryRunTerminalization.ts; this is the only extracted child that imports readPersistence.ts.
import { and, asc, eq } from "drizzle-orm"; import { db } from "../../../db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../db/schema"; import { PACKAGE_LIMITS } from "../fullSitePackage/types";
import type { SolutionKitInstallItemRecord, SolutionKitInstallSummary } from "../legacyInstallPlanning";
import type { FullSiteDryRunTerminalizationInput, FullSiteDryRunTerminalizationResult, FullSiteInstallLedgerPort } from "../fullSiteInstallTypes";
import { buildSummary } from "./readPersistence";
type SummaryRow = Pick<SolutionKitInstallItemRecord, "operation" | "status">;
type DryRunDependencies = Readonly<{ readSummaryRows(runId: string, limit: number): Promise<readonly SummaryRow[]>; updateRunningDryRun(input: FullSiteDryRunTerminalizationInput, summary: SolutionKitInstallSummary): Promise<unknown>; readRunById(runId: string): Promise<unknown>; }>;
declare const readExactDryRunTerminalizationInput: (value: unknown) => FullSiteDryRunTerminalizationInput; declare const readExactUpdateResult: (value: unknown, input: FullSiteDryRunTerminalizationInput) => boolean;
declare const recoverExactTerminal: (value: unknown, input: FullSiteDryRunTerminalizationInput) => FullSiteDryRunTerminalizationResult; declare const freshFinalizeError: () => Error; declare const sanitizeDryRunTerminalizationError: (error: unknown) => Error;
const defaultDryRunDependencies = {
  readSummaryRows: async (runId: string, limit: number) => db.select({ operation: solutionKitInstallItems.operation, status: solutionKitInstallItems.status }).from(solutionKitInstallItems).where(eq(solutionKitInstallItems.runId, runId)).orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id)).limit(limit),
  updateRunningDryRun: async (input: FullSiteDryRunTerminalizationInput, summary: SolutionKitInstallSummary) => db.update(solutionKitInstallRuns).set({ status: input.status, error: input.error, summary, finishedAt: new Date() })
    .where(and(eq(solutionKitInstallRuns.id, input.runId), eq(solutionKitInstallRuns.mode, "dry_run"), eq(solutionKitInstallRuns.status, "running"))).returning({ status: solutionKitInstallRuns.status, error: solutionKitInstallRuns.error }),
  readRunById: async (runId: string) => (await db.select({ mode: solutionKitInstallRuns.mode, status: solutionKitInstallRuns.status,
    error: solutionKitInstallRuns.error }).from(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, runId)).limit(1))[0] ?? null,
} satisfies DryRunDependencies;
export const createDryRunTerminalization = (overrides: Partial<DryRunDependencies> = {}): Pick<FullSiteInstallLedgerPort, "terminalizeDryRun"> => {
  const deps: DryRunDependencies = { readSummaryRows: overrides.readSummaryRows ?? defaultDryRunDependencies.readSummaryRows, updateRunningDryRun: overrides.updateRunningDryRun ?? defaultDryRunDependencies.updateRunningDryRun, readRunById: overrides.readRunById ?? defaultDryRunDependencies.readRunById };
  return { async terminalizeDryRun(value: unknown) { try { const input = readExactDryRunTerminalizationInput(value); const rows = await deps.readSummaryRows(input.runId, PACKAGE_LIMITS.resourcesTotal + 1);
    if (rows.length > PACKAGE_LIMITS.resourcesTotal) throw freshFinalizeError();
    try { if (readExactUpdateResult(await deps.updateRunningDryRun(input, buildSummary([...rows])), input)) return { outcome: "desired_terminal" }; }
    catch { return recoverExactTerminal(await deps.readRunById(input.runId), input); }
    return recoverExactTerminal(await deps.readRunById(input.runId), input); } catch (error) { throw sanitizeDryRunTerminalizationError(error); } } };
};
// legacyInstallRunPersistence.ts: facade owns only the complementary Pick and imports both children; neither child imports it.
import type { FullSiteInstallLedgerPort } from "./fullSiteInstallTypes";
import { buildSummary, createLegacyInstallReadPersistence, listSolutionKitInstallItems, normalizeItemRow } from "./legacyInstallRunPersistence/readPersistence";
import { createDryRunTerminalization } from "./legacyInstallRunPersistence/dryRunTerminalization";
export { buildManagedResourceEvidenceQuery, buildSummary, findManagedResourceEvidence, listSolutionKitInstallItems, normalizeItemRow } from "./legacyInstallRunPersistence/readPersistence";
type FacadePersistence = Pick<FullSiteInstallLedgerPort, "withPackageLock" | "createRun" | "recordItem" | "finalizeRun" | "getRun" | "patchRunMetadata" | "findLatestSuccessfulApplyRun" | "createRollbackRun" | "claimRollbackRun" | "findAutomaticCompensationRun" | "hasSuccessfulRollback">;
type FacadeHandler<K extends keyof FacadePersistence> = NonNullable<FacadePersistence[K]>;
declare const createFullSiteRun: FacadeHandler<"createRun">; declare const recordFullSiteItem: FacadeHandler<"recordItem">; declare const finalizeFullSiteRun: FacadeHandler<"finalizeRun">; declare const getFullSiteRun: FacadeHandler<"getRun">;
declare const patchFullSiteRunMetadata: FacadeHandler<"patchRunMetadata">; declare const findLatestSuccessfulFullSiteApplyRun: FacadeHandler<"findLatestSuccessfulApplyRun">; declare const createFullSiteRollbackRun: FacadeHandler<"createRollbackRun">; declare const claimFullSiteRollbackRun: FacadeHandler<"claimRollbackRun">;
declare const findAutomaticFullSiteCompensationRun: FacadeHandler<"findAutomaticCompensationRun">; declare const hasSuccessfulFullSiteRollback: FacadeHandler<"hasSuccessfulRollback">;
const createLegacyWriteAndLockPersistence = (): FacadePersistence => ({ withPackageLock: withFullSiteInstallLocks,
  createRun: createFullSiteRun, recordItem: recordFullSiteItem, finalizeRun: finalizeFullSiteRun, getRun: getFullSiteRun, patchRunMetadata: patchFullSiteRunMetadata,
  findLatestSuccessfulApplyRun: findLatestSuccessfulFullSiteApplyRun, createRollbackRun: createFullSiteRollbackRun, claimRollbackRun: claimFullSiteRollbackRun,
  findAutomaticCompensationRun: findAutomaticFullSiteCompensationRun, hasSuccessfulRollback: hasSuccessfulFullSiteRollback });
type LegacyInstallLedgerOverrides = Readonly<{ dryRunTerminalization?: Parameters<typeof createDryRunTerminalization>[0] }>;
export const createLegacyInstallLedger = (overrides: LegacyInstallLedgerOverrides = {}): FullSiteInstallLedgerPort => ({ ...createLegacyWriteAndLockPersistence(),
  ...createLegacyInstallReadPersistence(), ...createDryRunTerminalization(overrides.dryRunTerminalization) });
export const defaultLegacyInstallLedger = createLegacyInstallLedger();
// fullSiteLegacyLedgerReadPersistence.test.ts moves (never copies) both named composition cases.
import { expect, test } from "bun:test"; import { randomUUID } from "node:crypto"; import { fileURLToPath } from "node:url";
const readSource = (path: string): Promise<string> => Bun.file(fileURLToPath(new URL(path, import.meta.url))).text();
type ReadPersistenceModule = typeof import("../../../core/services/kits/legacyInstallRunPersistence/readPersistence");
test("managed evidence uses one bounded executable SELECT", async () => {
  const readModule: ReadPersistenceModule = await import("../../../core/services/kits/legacyInstallRunPersistence/readPersistence");
  const sourcePath = "../../../core/services/kits/legacyInstallRunPersistence/readPersistence.ts"; const source = await readSource(sourcePath);
  const start = source.indexOf("export const findManagedResourceEvidence"); const end = source.indexOf("\nexport const createLegacyInstallReadPersistence", start); const implementation = source.slice(start, end);
  expect(start).toBeGreaterThanOrEqual(0); expect(end).toBeGreaterThan(start); expect(implementation.match(/buildManagedResourceEvidenceQuery/g)).toHaveLength(1); expect(implementation).toMatch(/const \[row\] = await buildManagedResourceEvidenceQuery\(input\)/);
  const query = readModule.buildManagedResourceEvidenceQuery({ packageKey: `query-shape-${randomUUID()}`, kind: "form", key: "bounded-evidence" }); // retain current lines 445-508 compiled assertions exactly
});
test("shared ledger preserves omitted V1 evidence and honors an explicit null clear", async () => { /* move current lines 734-772 exactly */ });
test("old construction literals and required rollbackAction remain compatible", async () => { /* exact matrix above */ }); test("listRawItems preserves hostile raw values/order and rejects row 513", async () => { /* exact matrix above */ });
// fullSiteLegacyLedgerDryRunTerminalization.test.ts owns hostile/state/race/ambiguousCommitMatrix with local clients/harness only.
```
Every declared `FacadeHandler` takes the matching current `createLegacyInstallLedger` method body from lines 709-939; only extraction and names change, and no child duplicates those bodies.
Allowed dependency edges are facade -> both modules and dry terminalization -> read persistence (`buildSummary`) only; reverse edges, sibling-test imports and duplicate helper/case bodies are forbidden.
The composition suite deletes rather than copies the named moved cases, retains facade/catalog, lock, resolver projection, metadata and DB-harness ownership, updates its exact L01-owned-file inventory with both child modules and focused suites, and neither focused suite imports the other or `fullSiteLegacyLedgerComposition.test.ts`. Both `full-site-install-planner.test.ts` construction literals add the new raw-read and dry-run methods with typed zero-write fakes; later-leaf fake ledgers remain untouched until their owning phase.

Data flow: apply-supplied or direct-call-pre-read DAG -> total-order ledger evidence -> strict expected-ID/deterministic collision read -> native desired projection -> stable create/update/noop/conflict with unchanged dependencies.
Errors: existing conflict/not-found/invalid codes plus exact safe `site_package_too_large`; zero planning writes except requested dry-run evidence.

L01 uses the graph-owner descriptor resolver/`normalizeDesired`; any descriptor targeting a planned create forces update even on placeholder equality; native preparation reuses the plan with actual IDs.

Pure planner regressions pin two-arg pre-dependency build, three-arg frozen-array identity/no build, and false-noop prevention when current desired equals a create target's deterministic placeholder; L02 proves no public plan field.
DB-backed managed-identity cases belong exclusively to L01's `tests/integration/kits/fullSiteManagedOwnershipDb.test.ts`: natural-key-only conflict, strict expected ID with no natural fallback, deterministic duplicate natural-key tie-break, mismatched snapshot ID, noop/failed/rolled-back runs, timestamp-tied evidence, matching successful ID plus normalized full-desired noop, intended managed update, and setting-takeover isolation.
Add a bounded historical matrix with many successful apply candidates and mixed rollback runs: exclude newest invalid candidates through either branch of the same combined predicate -- a successful rollback run without an item, or a matching successful item in a failed/running rollback run -- while a failed/running rollback without a successful matching item remains eligible and the exact ordered winner is returned.
Assert the compiled single-statement seam above rather than opaque driver instrumentation. Separately owned `tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts` contains only the extracted EXPLAIN profiles, metrics/parsers, fixture helper, named budget test and sanitized summary.
Preserve the exact measured profiles, budgets, production query compilation and parameter binding during extraction; do not re-baseline or simplify them.
The independent `fullSiteResolverBoundsDb.test.ts` invokes the concrete resolver through strict exact parent IDs and owns six boundary cases: form fields, form actions and menu items at exact 100/256 cap succeed with the complete canonical desired child set, while each cap+1 fixture rejects only with exact `Error("site_package_too_large")`, never a truncated/noop result.
It imports no sibling test/fixture; each case enters `try/finally` before its first write, preallocates and records exact table-specific parent/child IDs before bulk inserts, and cleans only those child IDs then parent IDs. Partial seed failure is safe, no broad predicate/global-empty assumption is allowed, and the file/direct Bun command uses `360_000`/`360000` ms.
The planner/concrete-resolver integration counts
`findManagedResourceEvidence` calls for a dependency-bearing package and proves
the count equals the number of planned resource identities, with both explicit
object and explicit-null handoffs represented. A separate concrete-resolver
regression wraps `findManagedResourceEvidence`, invokes the concrete resolver
directly with exactly two arguments `(kind, seed)`, and proves exactly one
self-evidence lookup; a planner wrapper or a three/four-argument call does not
satisfy this compatibility gate. The pure reader suite retains every v18 case
and adds the revoked dependencies array, three throwing envelope traps, four
invalid numeric length classes and exact-4,096 success described above. Each
hostile input captures one call under `not.toThrow` and then asserts the captured
result is `null`; calling the reader a second time is not an equivalent totality
proof. The counted valid envelope still proves one dependency-property read.
The three resolver projection source-shape assertions belong in the Bun-owned
`fullSiteLegacyLedgerComposition.test.ts`; do not import the DB-coupled resolver
into the pure Vitest planner lane merely to inspect its source.
The independently runnable `fullSiteLegacyLedgerReadPersistence.test.ts` gate
compiles old construction literals, proves `listItems()`
still returns required `rollbackAction`, and proves an omitted phase field cannot
clear V1. It also assigns every raw field directly to `unknown`, then seeds
unknown/delete/restore operations plus scalar, array and null snapshot/action
values and proves `listRawItems()` returns every row unchanged in
`position ASC, id ASC` order. The query is one bounded 513-row read, rejects the
513th row, and never calls a normalizer/filter. A direct assignment
`const requiredAction: JsonObject | null = listed.rollbackAction` (without
optional chaining, fallback or cast) pins the compatibility projection; L03 tests
alone pin raw-to-persisted validation and matching legacy-null action semantics.
The independently runnable `fullSiteLegacyLedgerDryRunTerminalization.test.ts`
calls `terminalizeDryRun` through hostile unknown inputs/results,
pins exact-key/pair/result rejection and cause-free codes, and uses two independent
DB clients to race `success/null` against `failed/<safe-code>`. Exactly one
conditional update wins; its caller observes `desired_terminal`, the loser
observes `different_terminal`, an identical repeat is idempotent, and the stored
summary/status/error never changes afterward. Missing ID, apply-mode ID and a
still-running fault seam produce only their specified errors. An injected
post-commit transport throw followed by a second call proves ambiguous commit
recovery observes `desired_terminal` rather than overwriting or duplicating work.

The planner's pure no-write test gives every planner-visible ledger mutation
method installed on the fake a counting implementation that increments and
throws if called, rather than a silent no-op. Pin `withPackageLock`, `createRun`,
`recordItem`, `finalizeRun`, `terminalizeDryRun`, `patchRunMetadata`,
`createRollbackRun` and `claimRollbackRun`; after planning, assert every
individual mutation count and their sum are exactly zero. Evidence reads remain separately counted.

The DB harness in `fullSiteLegacyLedgerComposition.test.ts` owns a testable
`isDatabaseUrlConfigured(value)` helper: only `undefined` returns false, while
the empty string returns true and therefore fails initialization rather than
skipping. `initializeDbHarness` owns one outer `try/catch` and runs exactly four
sequential stages before returning the harness:

1. dynamic import/load of DB, persistence, schema and both install tables;
2. connection probe `SELECT 1`;
3. a zero-row (`LIMIT 0`) explicit run-schema projection of all 12 required
   columns: `id`, `kitId`, `mode`, `status`, `actorId`, `rollbackOfRunId`,
   `options`, `summary`, `error`, `createdAt`, `updatedAt`, `finishedAt`;
4. a zero-row (`LIMIT 0`) explicit install-item projection of all 13 required
   columns: `id`, `runId`, `position`, `resourceType`, `resourceKey`, `operation`,
   `status`, `beforeSnapshot`, `afterSnapshot`, `rollbackAction`, `error`,
   `createdAt`, `updatedAt`.

One typed `createDbHarnessStages` factory accepts the narrow injected
load/connection/run/item functions and returns them in that exact order;
production `DB_HARNESS_STAGES` and every pure failure case must call that same
factory, never hand-build unrelated tuples. Pin production construction plus the
complete ordered run/item selection bodies as direct `key: table.column`
assignments, their matching `.from(...)`, and `LIMIT 0`; the run keys/columns are
exactly the 12 above and item keys/columns exactly the 13 above, with no
spread/computed/extra field. Do not fake a production Drizzle DB through `any`,
a cast or an asserted production type.

The zero-row probes resolve every named column without materializing snapshots.
Keep the bounded managed-evidence SELECT separate; do not add a fifth stage.
For each failure position, invoke `initializeDbHarness(createDbHarnessStages(...))`
twice and pin both exact sequential call traces through only the failed stage.
Capture two distinct fresh values whose prototype is exactly `Error.prototype`,
message is only `full_site_legacy_ledger_db_harness_failed`, and own properties
are only ordinary `Error` message/stack (no `cause` or extra property); neither
error nor its safe observable fields may contain the sentinel, URL, secret,
driver or schema text. A configured failure never becomes `null` or a skip.

Every mutating test that remains in
`tests/integration/kits/fullSiteManagedOwnershipDb.test.ts` enters its
`try/finally` before the first insert, update, upsert, ledger mutation or other
write. It preallocates every owned UUID and records it in a table-specific owned
ID set before the corresponding insert; the evidence fixture likewise accepts
or creates preallocated run/item IDs, records them before writing, and returns
no untracked generated row. Each `finally` is partial-setup-safe and deletes only
recorded child IDs and then recorded parent IDs in dependency order (install
items before install runs, domain children before their parents). Empty owned
sets are skipped explicitly. Remove package-key/resource-key cleanup helpers and
all other broad predicates. The global setting case records/restores the exact
prior row or deletes only its one test-owned key when no prior row existed.
Cleanup never assumes a globally empty table.

Both managed-evidence integration files are independently runnable and at most
1,000 physical lines. They may share production imports, but neither may import
the sibling test file or depend on its test registration, fixtures or module
state.
The L01-owned `tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts` safe-code
regression list must include `site_package_rollback_ledger_failed` and assert
that `toSafeFullSiteErrorCode(code) === code`.
The existing named Bun legacy-parity gate proves the concrete DB/default
composition remains usable before L02 lands.

## Sub-Tasks

- [x] Extract the initial bounded legacy modules, ledger port + DB implementation,
  default legacy composition and compatibility facade above.
- [x] Add the planner and its initial pure Vitest coverage.
- [ ] Re-run and pin the delivered two-lock, strict V1 rollback-action,
  hostile-envelope/Proxy-array and managed-evidence query/harness work against
  the fresh corrective gate.
- [ ] Replace the reconstructed install identity with an exact
  `PackageResourceIdentity` alias; add `RawFullSiteInstallLedgerItem` plus
  `listRawItems()` with the immutable single-read boundary and regression matrix.
- [ ] Add the three-argument frozen-plan planner overload with zero graph rebuild,
  while retaining the direct two-argument resolver's one self-lookup and zero
  planner writes.
- [ ] Replace native reads with the exact evidence-backed planner-equality
  projections, strict whole-body source-shape gates and bounded child reads.
- [ ] Replace the item-driven candidate/follow-up rollback reads with the
  one-statement candidate-run-driven correlated-lateral query, retaining the
  combined invalidation anti-join, and land the complete managed-identity
  DB/query-shape matrix plus the independently runnable extracted EXPLAIN suite
  with both frozen production-query profiles and the strict pure plan parser.
- [ ] Make configured ledger DB-harness failures fail with the fixed sanitized
  code across the exact four-stage initializer, and rebuild every managed-ownership
  fixture around preallocated exact-ID ownership with `try/finally` active before
  its first mutation.
- [ ] Before adding raw reads or dry-run arbitration, split the 945-line facade
  into the two cohesive modules above, preserve public facade imports/exports, move
  (not duplicate) each focused matrix out of the 1,000-line composition test, then add exact terminalization concurrency/ambiguous-commit coverage.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-install-planner.test.ts`
- Freshly prefix every Bun DB command below in its own shell with `set -a && source /home/coder/project/Coderso/.env && set +a`; never inspect, print, copy, hash or persist its contents.
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/installService.test.ts tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerReadPersistence.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteManagedOwnershipDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteResolverBoundsDb.test.ts`
- `bun --cwd core lint` and `bun --cwd core lint:types`
- Every other TASK-547 DB-targeted command/test timeout is likewise at least
  `--timeout 360000` / `360_000` ms; do not raise unrelated non-DB timeouts.
- Replace both `15_000` DB-lock overrides in
  `fullSiteLegacyLedgerComposition.test.ts` and the EXPLAIN suite's `120_000`
  override with `360_000`; no L01 DB test may retain a lower hard timeout.
- After the focused-test move, replace `pollUntil`'s 100 × 20 ms limit with a
  monotonic `DB_EVENTUALLY_DEADLINE_MS = 360_000` deadline; retain bounded
  polling/`db_lock_state_timeout`, stay below 1,000 lines and duplicate no moved cases.
- Corrective L01 completion must first commit its promised
  `RawFullSiteInstallLedgerItem` and `listRawItems()` owners. The L03 pre-land
  bridge may then consume them but may never redeclare them. After that bridge
  checkpoint and before TASK-547-02-L02 dispatch, the orchestrator executes the
  exact root-test type gate `./node_modules/.bin/tsc -p tsconfig.json --noEmit`
  from the repository root. Capture the same command once before sequential leaf
  dispatch as the baseline, parse every located TypeScript diagnostic, and
  require zero diagnostics owned by L01 or any already-landed TASK-547 phase.
  A non-zero root exit may preserve dependency order only when every remaining
  located diagnostic is classified either to a strictly later declared leaf or
  has the same normalized path, location, TypeScript code and headline as an
  unowned diagnostic in that pre-dispatch baseline;
  unlocated/unparsed diagnostics, new unowned diagnostics and ambiguous owners
  block TASK-547-02-L02 dispatch/checkpoint progression. The gate reports the remaining later-leaf and unchanged-baseline
  counts explicitly and must not describe a non-zero global run as clean. The generic record validator admits nonzero only for exact command ID `root-typecheck`; the phase passes only after this classifier, and no other command receives that exception.
- Reader/type/planner gate: execute the exact hostile/4,096/4,097 matrix above;
  keep the required `rollbackAction` direct assignment without `?.`, `??` or cast,
  throwing zero-call planner-write spies, and one self-evidence lookup for a
  direct concrete two-argument resolver call.
- Dry-run terminalization gate: exact hostile input/result rejection, SQL
  `id + mode=dry_run + status=running` predicate, two-client opposite-terminal
  race, identical retry, missing/wrong-mode/still-running errors, one immutable
  winner and post-commit-throw recovery; no terminal overwrite or driver detail.
- Resolver projection gate: the Bun source-shape test pins the exact content
  type, form/field/action, template/query, content-entry, detail, Page and
  menu/item selection constants by comparing each complete body to only ordered
  direct assignments; malicious spread/computed fixtures and every unmatched or
  extra member fail. It proves the two content-entry identity selects plus one
  desired select, rejects bare selects, retains all literal forbidden-reference
  checks, and pins child cap imports, `orderIndex,id`, cap+1 limits and pre-project
  oversize guards. DB behavior preserves exact-ID/natural lookup and proves all six exact-cap/cap+1 child boundaries without truncation.
- Source/query-shape gate: one compiled builder SELECT must retain the exact
  run-driven lateral winner, filters, anti-join, aliases, ordering, limits and
  outer fetch defined above. Reject item-driven winners, duplicate/unaliased IDs,
  split anti-joins and opaque counters.
- Conditional no-migration plan gate: run both frozen production-query EXPLAIN
  profiles and budgets above with sanitized winner mismatch. Pure parsing retains
  both positive forms/four outputs, finite metrics, only specified optional
  absences, and fixed one-invocation errors for every malformed/overflow shape.
- L01 planner regression gate: one evidence lookup per identity; both overloads call `normalizeFullSitePackageForWrite` zero times while `normalizeDesired` remains required for existing-resource comparisons;
  two-arg builds once before deps, and three-arg planning consumes L02's unchanged plan with zero builds before any dependency.
- DB test-integrity gate: the URL helper returns false only for `undefined` and
  true for `""`; production and failure tests use the same injectable four-stage
  factory. Pin exact stage order, complete direct 12/13-column projections and
  `LIMIT 0`. Invoke each injected stage failure twice: exact traces stop at that
  stage and yield two distinct fresh exact sanitized `Error` objects with no
  cause/extra property/secret. No fake production DB cast/`any`; the bounded
  production query stays separate. Every managed-ownership and resolver-bound
  fixture activates `try/finally` before its first mutation, records preallocated
  table-specific IDs before inserts and cleans exact children before parents with
  no broad predicate.
- Only after both plan profiles pass, confirm `git diff --name-only` contains no
  DB migration, snapshot or journal artifact for this correction. A budget
  failure instead blocks L01 for index-migration contract re-audit.
- Run the two new focused tests and all three L01 DB integration files independently,
  then `wc -l` every changed L01 production/test file; each must be at most 1,000 lines.
