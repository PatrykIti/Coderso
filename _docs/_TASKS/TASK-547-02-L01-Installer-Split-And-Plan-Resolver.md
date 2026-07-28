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

Split the 2,700+ line installer into cohesive bounded modules while preserving exports, then add deterministic create/update/noop/conflict planning. This leaf owns the shared ledger/types boundary but performs no native resource mutation.

Both planner overloads accept normalized `FullSitePackageV1` and never call `normalizeFullSitePackageForWrite`.
The two-argument form builds once before dependency reads; the three-argument form consumes the closed-over frozen plan with zero builds/clones/mutations.
Native `normalizeDesired` remains required for each existing-resource equality decision inside `buildOperations`.

Define the common legacy/full-site ledger port and concrete DB adapter here, preserve compatibility re-exports and wire default legacy composition. L02 consumes it only by injection; no second implementation or direct table write is allowed. Keep in-memory construction compatible while exposing the stricter persisted/listed item type.

**Exact production ownership:** this leaf alone owns
`core/db/nativeCmsWriterFence.ts`; `core/services/kits/fullSiteInstallTypes.ts`;
`fullSiteInstallPlanner.ts`; `fullSiteInstall/currentResourceResolver.ts`,
`plannerEqualitySelections.ts`, `planningSnapshot.ts` and
`planningResourceBatchReader.ts`; `legacyInstallRunPersistence.ts` plus
`legacyInstallRunPersistence/{runInitialization,readPersistence,
dryRunTerminalization}.ts`; and the bounded compatibility seams
`solutionKitsInstallService.ts`, `kitInstaller.ts`, `legacyInstallPlanning.ts`,
`legacyInstallResourceHandlers.ts`, `legacyInstallRollback.ts`. These respectively
own the fence/private context, shared types, deterministic planning/equality/batch
reads, holder/reservation/finalization ledger, and default legacy composition.

`solutionKitsInstallService.ts` remains a compatibility facade below 1,000 lines. No other leaf redeclares or implements the port, imports install-run tables, or edits these paths.

**Exact test/support ownership:** the three
`tests/vitest/kits/full-site-{install-planner,planning-snapshot,explain-metrics}.test.ts`
files; `tests/utils/fullSiteExplainMetrics.ts`; unit files
`fullSiteLegacyLedger{Composition,ReadPersistence,DryRunTerminalization,
RunInitialization}.test.ts` plus `nativeCmsWriterFence.test.ts`; and integration
files `fullSiteManagedOwnershipDb.test.ts`,
`fullSiteManagedEvidenceExplainDb.test.ts`, `fullSiteResolverBoundsDb.test.ts`,
`fullSitePlanning{BaseBatch,AggregateBatch,NativeExplain}Db.test.ts` under
`tests/integration/kits/`. Each remains independently runnable; the descriptions
and split responsibilities below are binding.

**Forbidden for L01:** every L02 adapter/executor/staging/domain-atomic path and test; L03 rollback/compensation/process worker/dependency/crash test paths; task board/changelog/shared docs. Land this leaf and its gates before L02 starts.

## Pooler-Safe Writer Fence and Reserved Owner Ledger

`core/db/nativeCmsWriterFence.ts` alone owns namespace/key `548/0` and reserved
option key `nativeCmsWriterFenceV1`; consumers never redeclare them. The marker is
exactly `{schemaVersion:1,generation:<fresh UUID>}`. Private WeakMap state behind
an unforgeable opaque lease holds state, owner ID and generation. ALS carries that
exact lease for descendants, but no callback/export reveals those values or lets a
caller construct reservation authority. Keep helper names
`assertNativeCmsWriterOwnerContextAbsent`, `runWithNativeCmsWriterOwnerContext`,
`beginNativeCmsWriterOwnerClosing`, `markNativeCmsWriterOwnerLost` and
`acquireNativeCmsWriterFence`.

An absent context means an ordinary native-CMS writer. It must open an explicit `READ COMMITTED` transaction and call `acquireNativeCmsWriterFence` as callback statement one. Statement one is exactly `select pg_try_advisory_xact_lock_shared(548, 0)`. `false` throws fresh cause-free `native_cms_writer_fence_busy` with zero later DB/effects; it never waits or performs a census. `true` is followed by one deterministic, narrow active-marker projection ordered by `created_at ASC, id ASC LIMIT 2`. Zero markers permits domain work; one valid, malformed/impossible or multiple markers throw `native_cms_writer_recovery_required`; census executor/driver/result-shape failure throws `native_cms_writer_fence_failed`. The shared transaction lock remains through commit/rollback, closing the census-to-write race.

An `active` context makes statement one select the exact owner run `FOR SHARE`
and validate running status plus byte-identical UUID generation before every
post-reservation installer native **or ledger** read/write. Missing/mismatch
mutates that lease to `lost` and throws fresh cause-free
`native_cms_writer_fence_lost`; inherited closing/revoked/lost throws it with zero
DB and never falls back to ordinary mode. Detached descendants cannot escape.

`withPackageLock` accepts strict `FullSiteInstallLockReservation`. It asserts
absent context at absolute entry before validation/environment/client/DB; nesting
throws fresh cause-free `site_package_lock_reentrant` with zero I/O. It validates
canonical package/actor/source identity, rejects the reserved key recursively and
proves holder/domain connection headroom of at least two before callback.

The concrete path creates one postgres.js client `{max:1,prepare:false}` and one
`begin()` holder transaction. It takes blocking transaction-exclusive global
`pg_advisory_xact_lock(548,0)` then package
`pg_advisory_xact_lock(547,hashtext(packageKey))`; no `reserve()`, session lock or
manual unlock exists. Global -> package is the sole order and locks auto-release
with the holder transaction, preserving PgBouncer transaction-pool compatibility.

Only after both locks succeed does the holder mint one unexported, unforgeable
authority bound to this invocation. The private `reserveOrTakeOverActualOwner`
uses it in a separate short domain transaction whose statement one is the narrow
marker-key projection ordered `created_at ASC,id ASC LIMIT 2 FOR UPDATE`. This is
the reservation census/row lock. It must never call
`acquireNativeCmsWriterFence` or try shared against its own holder connection;
the authority is accepted by no public port/helper/options/callback and is not a
general bypass. The transaction commits the actual owner plus fresh marker before
callback/planner DB access.

For apply/dry-run, that same transaction reads at most 513 owner items and derives
`resumePhase` atomically. Absent strict `initializationPlanV1` plus zero items is
`reserved`; a strict plan plus its complete one-to-one bounded item set with
identical position/kind/key/operation is `initialized`, including strict empty
plan plus zero rows. Prefix, cap+1, mismatch, malformed or impossible state fails
closed before generation rotation. New/claimed apply callback context is only
`{intent:"apply",ownerRunId,resumePhase}`. An initialized callback must enter
durable recovery (automatic compensation for apply) with zero planner,
preparation, initialization or native-reapply calls. Explicit rollback instead
uses `{intent:"explicit_rollback",ownerRunId}` and its separately frozen source +
incremental-outcome resume path. Its owner is marked; automatic compensation has
an unmarked child and keeps the apply source as owner.

postgres.js `onclose` closes over the exact private mutable lease and the captured
callback promise; it does not consult ALS or cancel JS work. Unexpected close
calls `markNativeCmsWriterOwnerLost(lease)`, signals the holder race, then the
outer path awaits callback settlement before `client.end()`. Normal completion
revokes before commit/end; `revoked` is never relabelled lost and `lost` remains
monotonic. Callback/acquisition/holder-loss primary errors outrank cleanup.
Abnormal work leaves the marker durable. Deployment drains old writers because
mixed fence-aware/unaware versions are unsafe.

DB-free fence tests pin constants, exact ordinary/owner SQL, `READ COMMITTED`,
state transitions and zero-I/O inherited rejection. Composition tests pin holder
configuration/order; private statement-one locking census with zero shared-fence
call; exact resume derivation/rejection; marker-before-planner; takeover rotation;
absent-ALS `onclose`; detached drain; normal end; callback settlement before end;
and primary-error precedence. L03 owns real-DB crash/two-client barriers.

## Reserved Initialization and Atomic Owner Finalization

`initializeReservedRun` replaces insert-new `createInitializedRun`. Its strict input is the exact reserved apply/dry-run owner plus 0..512 prepared items. Transaction statement one is the active owner `FOR SHARE` gate; it updates that row without replacing/removing its marker and set-based inserts all items atomically. Returned ID equals `ownerRunId`; there is no insert-new/sequential fallback.

Initialization error mapping never blankets the owner gate: exact `native_cms_writer_fence_lost` and `native_cms_writer_fence_failed` remain exact fresh cause-free errors. After other transaction/commit failure, one bounded exact reread returns committed success only for the strict derived plan plus complete matching item set; absent plan plus zero rows proves rollback and yields `site_package_ledger_initialization_failed`; partial/impossible evidence yields `native_cms_writer_recovery_required`; unresolved reread yields `native_cms_writer_fence_failed`. The latter two retain the running marker.

`finalizeOwnedRun` replaces dry-run-only terminalization for apply, dry-run and rollback. `beginNativeCmsWriterOwnerClosing` changes the exact lease to closing synchronously before its first await. The caller's invocation is its final callback DB invocation; caller code performs no recovery, ledger or native I/O after closing. The finalizer's primary transaction statement one locks that owner `FOR UPDATE`, drains prior `FOR SHARE`, validates generation, computes bounded summaries and removes the marker with its terminal update. Optional automatic compensation atomically closes its unmarked child/source. Optional `interruptedApplySource` is accepted only for an explicit rollback owner and exact related running apply source, with fixed transition `failed/site_package_apply_interrupted`; source failure, rollback-owner terminalization and marker removal are one transaction. Full-site code never calls legacy `finalizeRun`.

Ambiguous-commit recovery is private work inside that same finalizer operation. Its bounded exact owner/optional-related reread takes the captured private lease, locks the exact owner `FOR UPDATE` as its own transaction statement one, never calls `acquireNativeCmsWriterFence` or the ordinary path, and performs no native or ledger mutation. Identical desired terminals with marker absent return `desired_terminal`; an immutable different terminal returns `different_terminal`; no overwrite occurs. An otherwise-successful caller maps that result after the call with zero DB I/O: desired permits return and different throws fresh cause-free `site_package_recovery_conflict`. Deterministic failure cleanup may catch only the finalizer result/error to preserve its preexisting primary, then performs zero I/O. Missing/running/malformed/unresolved state remains marked and exposes only the fixed finalization/fence code. Success also requires the holder transaction to end cleanly.

The L02 whole-callback policy uses these primitives: deterministic validation/planning/preparation or initialization proven rolled back with zero native effects finalizes owner failed/removes marker; exact committed initialization enters recovery; partial/ambiguous/potentially native-effecting work remains running/marked. Repeated deterministic errors therefore cannot brick ordinary writers. The private marker is rejected from caller input, preserved by every options patch, stripped recursively from public/API/audit/log reads, and never copied to an automatic-compensation child. No migration is permitted.

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
export type FullSiteInstallLockReservation =
  | Readonly<{
      intent: "apply"; packageKey: string; actorId: string;
      dryRun: boolean; options: JsonObject;
    }>
  | Readonly<{
      intent: "explicit_rollback"; packageKey: string; actorId: string;
      sourceRunId: string; options: JsonObject;
    }>;
export type FullSiteInstallLockContext =
  | Readonly<{
      intent: "apply";
      ownerRunId: string;
      resumePhase: "reserved" | "initialized";
    }>
  | Readonly<{ intent: "explicit_rollback"; ownerRunId: string }>;
export type FullSiteInitializedLedgerItemInput = Readonly<{
  position: number; kind: FullSiteInstallResourceKind; key: string;
  operation: "create" | "update" | "noop";
  beforeSnapshot: JsonObject | null; afterSnapshot: JsonObject;
  rollbackAction: JsonObject;
}>;
export type FullSiteReservedRunInitializationInput = Readonly<{
  ownerRunId: string; packageKey: string; actorId: string; dryRun: boolean;
  options: JsonObject;
  items: readonly FullSiteInitializedLedgerItemInput[];
}>;
export type FullSiteOwnedRunFinalizationInput = Readonly<{
  ownerRunId: string; status: "success" | "failed"; error: string | null;
  automaticCompensation?: Readonly<{
    runId: string; status: "success"; error: null;
  }> | null;
  interruptedApplySource?: Readonly<{
    runId: string;
    status: "failed";
    error: "site_package_apply_interrupted";
  }> | null;
}>;
export type FullSiteOwnedRunFinalizationResult = Readonly<{
  outcome: "desired_terminal" | "different_terminal";
}>;
export type FullSiteInitializationPlanV1 = readonly Readonly<{
  position: number; kind: FullSiteInstallResourceKind; key: string;
  operation: "create" | "update" | "noop";
}>[];
export function readStrictInitializationPlanV1(
  value: unknown,
): FullSiteInitializationPlanV1;
export type FullSiteInstallLedgerPortAdditions = {
  initializeReservedRun(
    input: FullSiteReservedRunInitializationInput,
  ): Promise<Readonly<{ id: string }>>;
  finalizeOwnedRun(
    input: FullSiteOwnedRunFinalizationInput,
  ): Promise<FullSiteOwnedRunFinalizationResult>;
  listRawItems(runId: string): Promise<readonly RawFullSiteInstallLedgerItem[]>;
};
```

`FullSiteInstallLedgerPortAdditions` is only the changed-member fragment, never a replacement port.
The final `FullSiteInstallLedgerPort` uses the exact descriptor/discriminated context above and adds all three members. Apply callbacks get `resumePhase`; explicit rollback callbacks do not pretend that incremental outcomes are initialization items. Full-site apply/rollback use reserved initialization/owned finalization only; legacy callers alone retain `createRun`/`finalizeRun`.
Type gates compile every read/facade `Pick` and the default full composition.

`initializeReservedRun(value: unknown)` has no insert-new/sequential fallback. Pre-DB validation safely rejects Proxy/accessor/cyclic or non-exact input; requires owner/actor UUIDs, canonical package key, boolean dry-run, plain JSON, 0..512 contiguous unique `kind:key` items; and forbids caller marker/plan ownership. Invalid/513 are exact cause-free `site_package_invalid`/`site_package_too_large`. It clones, derives the plan, owner-gates, updates the reservation and bulk-inserts on one handle. Its catch applies the exact reread/error matrix above rather than blanket rewriting owner-gate errors. Legacy `createRun`/`recordItem` remain compatibility-only.

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
`listItems()` remains a non-authoritative compatibility projection. Its caller-specific query selects at most 513 full rows in `position ASC, id ASC` order;
a 513th row fails cause-free as `site_package_too_large` before projection. The sole rollback source/prior boundary is `listRawItems()`: one bounded query
selects every row without operation/status filtering or value coercion, ordered
by `position ASC, id ASC`, with
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
`site_package_ledger_initialization_failed`, `site_package_recovery_conflict`,
`native_cms_writer_fence_busy`, `native_cms_writer_recovery_required`,
`native_cms_writer_fence_lost`, `native_cms_writer_fence_failed`,
`site_package_lock_reentrant`,
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

The optional fourth argument remains a direct/recovery compatibility handoff,
not a planning API. Existing two-argument direct calls and three-argument exact-
ID calls stay source-compatible. Omitted means the resolver may perform its
legacy single evidence lookup; object/null means the caller supplied the exact
result and no second lookup is allowed. The production planner never calls this
single-resource resolver and has no per-item fallback.

Planning instead owns this Bun-free injected boundary:

```ts
export type FullSitePlanningSnapshotRow = Readonly<{
  identity: FullSiteResourceIdentity;
  evidence: Readonly<{ runId: string; resourceId: string }> | null;
  current: CurrentResourceState | null;
}>;
export type FullSitePlanningSnapshotLoader = (
  resources: readonly PlannedPackageResource[],
) => Promise<readonly FullSitePlanningSnapshotRow[]>;
```

Both planner overloads call the loader exactly once after graph construction.
It accepts at most 512 unique ordered identities and returns the same cardinality,
identity and order; duplicates, omissions, extras or reorder fail closed before
operation construction. Bun-free `planningSnapshot.ts` receives both production
readers by injection and imports no DB/runtime module; L02 `execute.ts` owns the
default composition. Native reads use at most one
base statement per nonempty kind plus three aggregate-child statements, so the
complete plan costs at most 14 SQL statements independent of resource count.
Content entries form a bounded second wave after content-type IDs resolve; no
dependency causes a ledger lookup. Child rows use stable parent/order/id ordering
and per-parent cap+1 rejection before projection.

- when `expectedId` is supplied, query only that ID constrained by the seed's
  natural identity (and parent content-type identity for entries); return `null`
  on any mismatch and never fall back to evidence or a natural-key row. The
  fourth argument cannot authorize a fallback. L02/L03 keep their existing
  three-argument exact-ID calls and recovery semantics unchanged;
- without `expectedId`, direct compatibility mode checks evidence by exact ID,
  then a natural-key row; planning natural collisions belong only to the batch reader;
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

`plannerEqualitySelections.ts` is the only owner of every `*_PLANNER_EQUALITY_SELECTION` below. It exports direct `as const` Drizzle maps and imports no DB client/runtime module. `currentResourceResolver.ts` and `planningResourceBatchReader.ts` import the same applicable objects; neither may redeclare, clone, spread or reconstruct one. Resolver equality reads pass the object directly to `select`; batch reads nest it as `desired` beside only fixed ordinal/resolved-ID/parent transport fields, never a whole row.

The resolver keeps its local content-entry identity selection, while both
consumers use the shared equality selection (equivalent `satisfies` typing is
allowed, but selected columns are not negotiable):

```ts
const CONTENT_ENTRY_ID_SELECTION = {
  id: contentEntries.id,
} as const;
export const CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION = {
  contentTypeId: contentEntries.typeId,
  title: contentEntries.title,
  slug: contentEntries.slug,
  status: contentEntries.status,
  data: contentEntries.data,
} as const;
```

Both strict-ID and natural-key resolver identity queries select only
`CONTENT_ENTRY_ID_SELECTION`; the exact-ID/type/slug and natural type/slug
predicates, `id ASC` order and `LIMIT 1` remain unchanged. The native desired
queries in both consumers use `CONTENT_ENTRY_PLANNER_EQUALITY_SELECTION`; the resolver passes that result directly to `projectDesired` and the batch reader preserves it as `current.desired`, without a whole-row spread or post-read `typeId` rename. This preserves all five and only five equality fields
(`contentTypeId`, `title`, `slug`, `status`, `data`). Across resolver identity
and desired reads, the safe column union is exactly `id`, `typeId`, `slug`,
`title`, `status` and `data`. Neither consumer selects or materializes
`contentEntries.accessPassword` (a hashed credential), nor `authorId`,
`visibility`, `tags`, publish/schedule fields or timestamps.

The same evidence audit proves two other bare desired reads load unrelated wide
columns, so narrow them in this correction without changing desired semantics:

```ts
export const PAGE_PLANNER_EQUALITY_SELECTION = {
  slug: pages.slug,
  title: pages.title,
  status: pages.status,
  currentData: pages.currentData,
} as const;
export const DETAIL_PAGE_PLANNER_EQUALITY_SELECTION = {
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
| `SETTING_PLANNER_EQUALITY_SELECTION` | `value` |
| `CONTENT_TYPE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `schema`, `status`, `config` |
| `FORM_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `status`, `description`, `successMessage`, `successRedirectUrl`, `submissionAccess`, `settings` |
| `FORM_FIELD_PLANNER_EQUALITY_SELECTION` | `id`, `type`, `label`, `name`, `required`, `settings`, `orderIndex` |
| `FORM_ACTION_PLANNER_EQUALITY_SELECTION` | `id`, `type`, `label`, `enabled`, `continueOnError`, `condition`, `config`, `orderIndex` |
| `PAGE_TEMPLATE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `description`, `category`, `status`, `document` |
| `LISTING_TEMPLATE_PLANNER_EQUALITY_SELECTION` | `name`, `slug`, `description`, `layout`, `config` |
| `LISTING_QUERY_PLANNER_EQUALITY_SELECTION` | `name`, `description`, `query` |
| `MENU_PLANNER_EQUALITY_SELECTION` | `name`, `location`, `status`, `settings` |
| `MENU_ITEM_PLANNER_EQUALITY_SELECTION` | `id`, `label`, `href`, `pageId`, `parentId`, `orderIndex`, `settings` |

For each equality map, every owning-table column absent from its exact row is a forbidden equality output; tests derive that complete set from the schema column inventory so a later column addition fails closed. It includes setting `key/updatedAt`; every base/child `id`, parent FK and timestamp not listed above; Page `authorId/publishedData/publishedAt`; detail Page `status/publishedDocument/publishedAt`; Menu `publishedAt`; and content entry `authorId/visibility/accessPassword/tags/publishedAt/scheduledAt`. A documented batch transport key may appear only outside `desired`; it never expands that allowlist.

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

The source/query-shape regression in `tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts` reads the shared owner and both consumers. It proves exactly three resolver `.from(contentEntries)` calls, two ID selections and one equality selection, and proves every applicable resolver/batch `select` references the shared constant instead of a local map. Its reusable assertion compares each complete shared body, in order, to the exact direct `key: table.column` assignments and fails before comparison on spread, computed, shorthand, method, accessor, SQL/expression, unmatched text or extras; synthetic spread and computed fixtures fail. Retain resolver bare-select and literal-forbidden checks.

`tests/integration/kits/fullSitePlanningBaseBatchDb.test.ts` and `fullSitePlanningAggregateBatchDb.test.ts` compile every exported production batch query and compare its complete SELECT output with the fixed transport envelope plus the applicable shared map. For every projection they reject every inventory field above from `desired`, explicitly including `access_password`; an extra output fails even if later code drops it.

## Bounded Managed-Evidence Query

`legacyInstallRunPersistence/readPersistence.ts` owns one batch read-port seam:

```ts
export const findManagedResourceEvidenceBatch = async (input: Readonly<{
  packageKey: string;
  resources: readonly Readonly<{
    identity: FullSiteResourceIdentity;
    kind: FullSiteInstallResourceKind;
    key: string;
  }>[];
}>): Promise<readonly Readonly<{
  identity: FullSiteResourceIdentity;
  evidence: Readonly<{ runId: string; resourceId: string }> | null;
}>[]>;
```

Input validation accepts 0..512 unique canonical identities and preserves request
ordinal. One bound SQL statement materializes that request relation and performs
the existing run-driven correlated-lateral winner lookup per request. It keeps
the exact successful apply/item filters, five-field total order and combined
rollback invalidation rule: a successful rollback invalidates the source run;
a successful matching outcome invalidates that identity in a running/failed run.
Only the winning item's JSON `id` scalar is projected as `resourceId`; wide
`afterSnapshot`/desired JSON never leaves SQL. A left lateral join emits exactly
one ordered result per request, using explicit nulls for no evidence. Unknown,
duplicate, missing, extra or reordered results fail before planning.

Compatibility `findManagedResourceEvidence(input)` retains its separate bounded
single-identity read model and full legacy `desired` result for direct/recovery
callers; the planner never invokes it. Structural tests compile the production batch
statement and pin the bounded request CTE/ordinal, run-driven lateral limits,
combined invalidation anti-join, stable aliases/order and absence of follow-up
queries. Runtime fixtures prove winner semantics for 1 and 512 identities.

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
decision remains conditional and may be retained only after all frozen profiles
below execute the exact production run-driven lateral query and pass every frozen
budget; a passing standalone diagnostic is insufficient.

Before retaining that decision, move all evidence DB profiles, fixture helpers
and the named budget test from the 995-line ownership matrix into
`tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts`. It owns
`managed evidence SELECT satisfies no-migration EXPLAIN budgets` and
`assertManagedResourceEvidenceExplainBudgets`; `fullSiteManagedOwnershipDb.test.ts`
keeps only ownership/resolver/history behavior. Both run independently and stay
at most 1,000 lines.

`tests/utils/fullSiteExplainMetrics.ts` is the one independently importable
parser owner. It has no Bun, DB, fixture or test-runner import and exports only
`FullSiteExplainMetrics = Readonly<{ executionMs: number; emittedRows: number; scannedRows: number; sharedBuffers: number }>` plus `parseManagedEvidenceExplainMetrics(input: unknown): FullSiteExplainMetrics`. Both DB EXPLAIN suites import that helper
directly; neither defines a parser/metrics validator, duplicates its constants,
imports a sibling test, or relies on test registration/module state. All pure
positive/hostile parser regressions below live only in
`tests/vitest/kits/full-site-explain-metrics.test.ts`, which imports the helper
directly and performs no DB/environment setup.

The evidence budget helper compiles the exact production
`buildManagedResourceEvidenceBatchQuery(input).toSQL()` SQL and parameters and runs
that same run-driven correlated-lateral bounded SELECT as
`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) <compiled SQL>`. Parameters remain bound
through the database driver; never interpolate fixture values into SQL. Run the
profiles sequentially, with deterministic ordering fields and a distinct random
scope for each package/resource identity:

| Profile | Owned history fixture | `Execution Time` | Root emitted rows | Scanned-row work | Root shared buffers |
| --- | --- | ---: | ---: | ---: | ---: |
| Small | 16 successful apply run/item candidates + 8 rollback runs / 6 rollback items | <= 100 ms | <= 1 | <= 2,000 | <= 2,048 |
| Bounded large | 512 successful apply run/item candidates + 256 rollback runs / 192 rollback items | <= 250 ms | <= 1 | <= 20,000 | <= 20,480 |
| Batch width | 512 identities with one eligible candidate each | <= 1,000 ms | <= 512 | <= 100,000 | <= 100,000 |

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
is a conservative one-identity history stress fixture; the width profile separately
pins the package's
512-resource planning ceiling; it is an evidence bound, not a retention limit.

The shared helper parses JSON through `parseManagedEvidenceExplainMetrics`
without asserting a planner node name. Its guarded implementation maps
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

`fullSitePlanningNativeExplainDb.test.ts` independently compiles every production
base/child batch shape, including the detail JSON-name predicate, and measures
representative one-request plus 512-request fixtures. Each statement stays
within 1,000 ms server execution, its documented request/child cap, 100,000
scanned-row work and 100,000 root shared buffers. It imports the same parser from
`tests/utils/fullSiteExplainMetrics.ts`; summaries remain sanitized.

This measured gate is additive: compiled batch-shape assertions, exactly one
planner snapshot-loader call and the `<= 14` query-count regression remain
mandatory. If any profile exceeds a budget or exposes an
unbounded plan, the no-migration claim fails: stop L01 and re-audit this contract
for the required index plus complete SQL/snapshot/journal artifacts. Do not make
the test pass by reducing fixtures, raising ceilings, weakening the scanned-row
formula, reverting to the item-driven shape or pinning a planner node name.

## Security Contract

Service only; no route or RBAC/CSRF/rate-limit change. Actor validation precedes
DB; normalized inputs, bounded reject-unknown readers and safe IDs/codes only.
Never log payloads or select `accessPassword`/unused published bodies. No secret
snapshot or cross-domain transaction is introduced. No migration remains valid
only while every frozen EXPLAIN budget passes; failure requires contract re-audit.

## Implementation Pseudocode

```ts
// core/db/nativeCmsWriterFence.ts
import { AsyncLocalStorage } from "node:async_hooks";
export const NATIVE_CMS_WRITER_FENCE_NAMESPACE = 548 as const;
export const NATIVE_CMS_WRITER_FENCE_KEY = 0 as const;
export const NATIVE_CMS_WRITER_FENCE_OPTION_KEY = "nativeCmsWriterFenceV1" as const;
declare const ownerLeaseBrand: unique symbol;
export type NativeCmsWriterOwnerLease = Readonly<{ [ownerLeaseBrand]: true }>;
type PrivateOwnerState = {
  state: "active" | "closing" | "revoked" | "lost";
  ownerRunId: string;
  generation: string;
};
const leaseStates = new WeakMap<NativeCmsWriterOwnerLease, PrivateOwnerState>();
const ownerContext = new AsyncLocalStorage<NativeCmsWriterOwnerLease>();
export function assertNativeCmsWriterOwnerContextAbsent(): void;
export function runWithNativeCmsWriterOwnerContext<T>(lease, execute: (value: FullSiteInstallLockContext) => Promise<T>): Promise<T>;
export function beginNativeCmsWriterOwnerClosing(): NativeCmsWriterOwnerLease;
export function markNativeCmsWriterOwnerLost(lease: NativeCmsWriterOwnerLease): void {
  const owner = requirePrivateLeaseState(lease); // generation never leaves WeakMap
  if (owner.state === "active" || owner.state === "closing") owner.state = "lost";
  // revoked stays revoked; lost stays lost
}
export async function acquireNativeCmsWriterFence(tx): Promise<void> {
  const lease = ownerContext.getStore();
  if (!lease) return acquireOrdinaryTrySharedThenCensus(tx); // statement 1
  const owner = requirePrivateLeaseState(lease);
  if (owner.state !== "active") throw new Error("native_cms_writer_fence_lost"); // zero I/O
  return lockAndValidateOwnerForShare(tx, owner); // statement 1; marks lost on mismatch
}

// legacyInstallRunPersistence.ts
export async function withFullSiteInstallLocks(reservation, execute) {
  assertNativeCmsWriterOwnerContextAbsent();
  const input = readExactLockReservationAndHeadroom(reservation);
  let lease: NativeCmsWriterOwnerLease | null = null;
  let callbackPromise: Promise<unknown> | null = null;
  const holderClosed = createLossSignal();
  const holder = postgres(readDatabaseUrl(), {
    max: 1,
    prepare: false,
    onclose: () => {
      if (lease) markNativeCmsWriterOwnerLost(lease); // works outside ALS
      holderClosed.signal();
    },
  });
  let primary: unknown;
  try {
    const beginPromise = holder.begin(async (sql) => {
      await sql`select pg_advisory_xact_lock(548, 0)`;
      await sql`select pg_advisory_xact_lock(547, hashtext(${input.packageKey}))`;
      const authority = mintPrivateHolderReservationAuthority(sql, input);
      lease = await reserveOrTakeOverActualOwner(input, authority);
      // Its short tx statement 1 is ordered LIMIT 2 FOR UPDATE; never shared-fences.
      callbackPromise = runWithNativeCmsWriterOwnerContext(lease, execute);
      return callbackPromise;
    });
    return await raceBeginAgainstUnexpectedClose(beginPromise, holderClosed);
  } catch (error) {
    primary = error;
    throw sanitizePrimaryHolderError(error);
  } finally {
    await settleCapturedCallbackWithoutMasking(callbackPromise, primary);
    await endHolderWithoutMasking(holder, primary);
  }
}
export function planFullSiteInstall(pkg, deps): Promise<FullSiteInstallPlan>;
export function planFullSiteInstall(pkg, referencePlan: readonly PlannedPackageResource[], deps): Promise<FullSiteInstallPlan>;
export async function planFullSiteInstall(pkg, referencePlanOrDeps, maybeDeps) {
  const [ordered, deps] = maybeDeps === undefined
    ? [buildReferencePlan(pkg), referencePlanOrDeps]
    : [referencePlanOrDeps, maybeDeps];
  // `ordered` exists before the first deps read; the supplied array is used as-is.
  const snapshot = assertExactPlanningSnapshot(
    ordered,
    await deps.loadPlanningSnapshot(ordered), // exactly one call; no fallback
  );
  const inspected = snapshot.map((row, index) => ({
    resource: ordered[index], current: row.current, evidence: row.evidence,
  }));
  return buildOperations(inspected, {
    normalizeDesired: deps.normalizeDesired,
    createdResourceIdentities: new Set(inspected.filter(({ current }) => !current).map(({ resource }) => resource.identity)),
    unmanaged: "conflict",
    allowSettingTakeover: deps.allowSettingTakeover,
  });
}

export const createFullSitePlanningSnapshotLoader = (deps: Readonly<{
  packageKey: string;
  findManagedResourceEvidenceBatch: ManagedResourceEvidenceBatchReader;
  readFullSitePlanningResourcesBatch: FullSitePlanningResourceBatchReader;
}>) => async (resources) => {
  const requests = readExactPlanningRequests(resources); // max 512, unique/order
  const evidence = await deps.findManagedResourceEvidenceBatch({
    packageKey: deps.packageKey,
    resources: requests.map(toEvidenceRequest),
  }); // exactly one SQL statement
  const current = await deps.readFullSitePlanningResourcesBatch({
    resources: requests,
    evidence,
  }); // <= one base query/kind + three child queries
  return freezeAndValidatePlanningSnapshot(requests, evidence, current);
};

export async function readFullSitePlanningResourcesBatch(input) {
  const grouped = groupBoundedRequestsByKind(input); // authored array stays unchanged
  const baseRows = await readNonEmptyKindGroups(grouped); // fixed query shapes
  const entryRows = await readEntriesAfterContentTypeIds(grouped, baseRows);
  const children = await readAggregateChildrenCapPlusOne(baseRows);
  return projectExactOrderedCurrentStates(input.resources, baseRows, entryRows, children);
}
```

`resolveManagedIdentity` returns managed only when a successful, non-rolled-back run snapshot records the same native ID as the current row.
Matching a natural key or full desired payload without this proof is `site_package_conflict`, not reuse/noop.

```ts
// legacyInstallRunPersistence/readPersistence.ts
export async function listSolutionKitInstallItems(runId: string): Promise<SolutionKitInstallItemRecord[]> {
  const rows = await readOrderedItemRows(runId, PACKAGE_LIMITS.resourcesTotal + 1);
  if (rows.length > PACKAGE_LIMITS.resourcesTotal) throw freshError("site_package_too_large");
  return rows.map(normalizeItemRow);
}
export const buildManagedResourceEvidenceBatchQuery = (input: ManagedEvidenceBatchInput) =>
  buildRequestOrdinalCte(input.resources)
    .leftJoinLateral(buildRunDrivenWinnerForRequest(input.packageKey))
    .select(narrowOrdinalRunAndSnapshotId)
    .orderBy(asc(request.ordinal));
export const findManagedResourceEvidenceBatch = async (value: unknown) => {
  const input = readExactManagedEvidenceBatchInput(value, PACKAGE_LIMITS.resourcesTotal);
  return readExactOrderedManagedEvidenceBatch(
    await buildManagedResourceEvidenceBatchQuery(input), input.resources,
  );
};
export const createLegacyInstallReadPersistence = (): ReadPersistence => ({
  async listItems(runId) {
    return projectCompatibilityItems(await listSolutionKitInstallItems(runId));
  },
  async listRawItems(runId): Promise<readonly RawFullSiteInstallLedgerItem[]> {
    const rows = await readRawOrderedItemRows(runId, PACKAGE_LIMITS.resourcesTotal + 1);
    if (rows.length > PACKAGE_LIMITS.resourcesTotal) {
      throw freshError("site_package_rollback_invalid_source");
    }
    return rows; // no operation/status/value coercion
  },
  findManagedResourceEvidence, // unchanged direct/recovery compatibility query
});
// legacyInstallRunPersistence/runInitialization.ts
export const createRunInitialization = (
  database: Pick<typeof db, "transaction"> = db,
): Pick<FullSiteInstallLedgerPort, "initializeReservedRun"> => ({
  async initializeReservedRun(value: unknown) {
    const input = cloneAndValidateReservedRunInput(value); // 0..512, exact order
    const options = withDerivedInitializationPlan(input.options, input.items);
    try {
      return await database.transaction(async (tx) => {
        await acquireNativeCmsWriterFence(tx); // statement 1: owner FOR SHARE
        const run = await validateAndUpdateReservedOwner(tx, input, options);
        const now = new Date();
        if (input.items.length > 0) await tx.insert(solutionKitInstallItems)
          .values(input.items.map((item) => toInitializedItemRow(input.ownerRunId, item, now)));
        if (run.id !== input.ownerRunId) throw new Error("site_package_ledger_initialization_failed");
        return Object.freeze({ id: input.ownerRunId });
      });
    } catch (error) {
      if (hasExactFenceCode(error, "native_cms_writer_fence_lost")) {
        throw freshError("native_cms_writer_fence_lost");
      }
      if (hasExactFenceCode(error, "native_cms_writer_fence_failed")) {
        throw freshError("native_cms_writer_fence_failed");
      }
      const state = await rereadExactReservedInitialization(input.ownerRunId);
      if (state === "initialized") return Object.freeze({ id: input.ownerRunId });
      if (state === "reserved") {
        throw freshError("site_package_ledger_initialization_failed");
      }
      if (state === "partial_or_impossible") {
        throw freshError("native_cms_writer_recovery_required");
      }
      throw freshError("native_cms_writer_fence_failed"); // unresolved; marker stays
    }
  },
});
// legacyInstallRunPersistence/dryRunTerminalization.ts (historical path)
export const createOwnedRunFinalization = (
  database: Pick<typeof db, "transaction"> = db,
): Pick<FullSiteInstallLedgerPort, "finalizeOwnedRun"> => ({
  async finalizeOwnedRun(value: unknown) {
    const input = readExactOwnedRunFinalization(value);
    const lease = beginNativeCmsWriterOwnerClosing(); // synchronous before await
    try {
      return await database.transaction(async (tx) => {
        const owner = await lockExactOwnerForUpdate(tx, lease); // statement 1, drains FOR SHARE
        const related = await readAndValidateBoundedRelatedTransitions(
          tx,
          owner,
          input, // optional compensation child OR interrupted apply source
        );
        return atomicallyTerminalizeAndRemoveMarker(tx, owner, input, related);
      });
    } catch (error) {
      // Same finalizer operation: private tx statement 1 locks exact owner FOR UPDATE;
      // read-only classification, never acquireNativeCmsWriterFence/ordinary path.
      return recoverExactTerminalOwnerAndChild(error, input, lease);
    }
  },
});
// legacyInstallRunPersistence.ts: facade owns only the complementary Pick and imports both children; neither child imports it.
import type { FullSiteInstallLedgerPort } from "./fullSiteInstallTypes";
import { buildSummary, createLegacyInstallReadPersistence, listSolutionKitInstallItems, normalizeItemRow } from "./legacyInstallRunPersistence/readPersistence";
import { createOwnedRunFinalization } from "./legacyInstallRunPersistence/dryRunTerminalization";
import { createRunInitialization } from "./legacyInstallRunPersistence/runInitialization";
export { buildManagedResourceEvidenceBatchQuery, buildManagedResourceEvidenceQuery, buildSummary, findManagedResourceEvidence, findManagedResourceEvidenceBatch, listSolutionKitInstallItems, normalizeItemRow } from "./legacyInstallRunPersistence/readPersistence";
type FacadePersistence = Pick<FullSiteInstallLedgerPort, "withPackageLock" | "createRun" | "recordItem" | "finalizeRun" | "getRun" | "patchRunMetadata" | "findLatestSuccessfulApplyRun" | "createRollbackRun" | "claimRollbackRun" | "findAutomaticCompensationRun" | "hasSuccessfulRollback">;
type FacadeHandler<K extends keyof FacadePersistence> = NonNullable<FacadePersistence[K]>;
declare const createFullSiteRun: FacadeHandler<"createRun">; declare const recordFullSiteItem: FacadeHandler<"recordItem">; declare const finalizeFullSiteRun: FacadeHandler<"finalizeRun">; declare const getFullSiteRun: FacadeHandler<"getRun">;
declare const patchFullSiteRunMetadata: FacadeHandler<"patchRunMetadata">; declare const findLatestSuccessfulFullSiteApplyRun: FacadeHandler<"findLatestSuccessfulApplyRun">; declare const createFullSiteRollbackRun: FacadeHandler<"createRollbackRun">; declare const claimFullSiteRollbackRun: FacadeHandler<"claimRollbackRun">;
declare const findAutomaticFullSiteCompensationRun: FacadeHandler<"findAutomaticCompensationRun">; declare const hasSuccessfulFullSiteRollback: FacadeHandler<"hasSuccessfulRollback">;
const createLegacyWriteAndLockPersistence = (): FacadePersistence => ({ withPackageLock: withFullSiteInstallLocks,
  createRun: createFullSiteRun, recordItem: recordFullSiteItem, finalizeRun: finalizeFullSiteRun, getRun: getFullSiteRun, patchRunMetadata: patchFullSiteRunMetadata,
  findLatestSuccessfulApplyRun: findLatestSuccessfulFullSiteApplyRun, createRollbackRun: createFullSiteRollbackRun, claimRollbackRun: claimFullSiteRollbackRun,
  findAutomaticCompensationRun: findAutomaticFullSiteCompensationRun, hasSuccessfulRollback: hasSuccessfulFullSiteRollback });
export const createLegacyInstallLedger = (): FullSiteInstallLedgerPort => ({ ...createLegacyWriteAndLockPersistence(),
  ...createLegacyInstallReadPersistence(), ...createRunInitialization(),
  ...createOwnedRunFinalization() });
export const defaultLegacyInstallLedger = createLegacyInstallLedger();
// fullSiteLegacyLedgerReadPersistence.test.ts moves (never copies) both named composition cases.
import { expect, test } from "bun:test"; import { randomUUID } from "node:crypto"; import { fileURLToPath } from "node:url";
const readSource = (path: string): Promise<string> => Bun.file(fileURLToPath(new URL(path, import.meta.url))).text();
type ReadPersistenceModule = typeof import("../../../core/services/kits/legacyInstallRunPersistence/readPersistence");
test("managed evidence batch uses one bounded ordered SELECT", async () => {
  const readModule: ReadPersistenceModule = await import("../../../core/services/kits/legacyInstallRunPersistence/readPersistence");
  const sourcePath = "../../../core/services/kits/legacyInstallRunPersistence/readPersistence.ts"; const source = await readSource(sourcePath);
  const query = readModule.buildManagedResourceEvidenceBatchQuery({
    packageKey: `query-shape-${randomUUID()}`,
    resources: makeCanonicalRequests(512),
  });
  assertCompiledBatchShape(query.toSQL());
});
test("shared ledger preserves omitted V1 evidence and honors an explicit null clear", async () => { /* move current lines 734-772 exactly */ });
test("old construction literals and required rollbackAction remain compatible", async () => { /* exact matrix above */ }); test("listRawItems preserves hostile raw values/order and rejects row 513", async () => { /* exact matrix above */ });
// fullSiteLegacyLedgerDryRunTerminalization.test.ts owns all-mode owner finalization/race/ambiguous-commit matrices.
// fullSiteLegacyLedgerRunInitialization.test.ts owns 0/1/512, exact-key/scalar/
// Proxy/accessor/cycle/513, two-DML rollback and exact cause-free errors.
```
Every declared `FacadeHandler` takes the matching current `createLegacyInstallLedger` method body from lines 709-939; only extraction and names change, and no child duplicates those bodies.
Allowed dependency edges are facade -> three persistence children and owner finalization -> read persistence (`buildSummary`) only; reverse edges, sibling-test imports and duplicate bodies are forbidden.
The composition suite moves rather than copies focused cases, retains facade/catalog, lock, resolver projection, metadata and DB-harness ownership, and updates its exact inventory. Planner fake ledgers add raw-read, dry-run and required atomic-initialization methods; later-leaf fakes update in their owning phases.

Data flow: DAG -> one ordered batch snapshot -> strict managed/natural current state -> stable create/update/noop/conflict; direct exact-ID resolution stays separate.
Errors: existing conflict/not-found/invalid codes plus exact safe `site_package_too_large`; zero planning writes except requested dry-run evidence.

L01 uses the graph-owner descriptor resolver/`normalizeDesired`; any descriptor targeting a planned create forces update even on placeholder equality; native preparation reuses the plan with actual IDs.

- Planner tests pin both overloads, frozen supplied-plan identity, placeholder
  false-noop prevention, one snapshot load, zero per-item fallback and zero
  writes; mutation spies include `initializeReservedRun`/`finalizeOwnedRun`.
- Managed-ownership tests retain natural/expected-ID semantics, deterministic
  ties, invalidating histories, managed noop/update and setting isolation. The
  direct two-argument resolver still performs its one compatibility evidence read.
- Base/aggregate batch suites cover all ten kinds, entry second wave, exact
  0/1/512 order, Form/Menu child caps and zero partial projection. Resolver bounds
  retain exact-ID 100/256 cap+1 cases. Native/evidence EXPLAIN suites compile
  production bound queries and emit only sanitized metrics.
- Snapshot/V1/read suites reject hostile cardinality/order and 4,097 entries,
  accept exact 4,096 once, pin the 14-query cap, preserve raw unknown/delete/
  restore/scalar/array/null fields and enforce stable 512/513 boundaries.
- The historical dry-run-named suite owns all-mode desired/different finalization,
  paired compensation, interrupted-source atomic transition, races/idempotence and
  private ambiguous recovery with captured lease, statement-one exact owner `FOR
  UPDATE`, zero ordinary/shared-fence path and zero mutation. It also pins DB-free
  caller mapping and primary-preserving cleanup with zero I/O after closing.
  Fence/composition suites own the reservation, resume and `onclose` matrices above.
- The DB harness keeps exact load -> `SELECT 1` -> 12-column run `LIMIT 0` ->
  13-column item `LIMIT 0`, direct projections, and twice-invoked fresh sanitized
  stage failures. Every mutating fixture enters `try/finally` before its first
  write, pre-registers exact table IDs, deletes children before parents, uses no
  broad predicate and exactly restores/deletes its setting.
- DB files are independently runnable, never import sibling tests and stay at
  most 1,000 lines. Safe-code tests round-trip ledger initialization/recovery
  conflict, rollback-ledger, all four fence codes and reentrant lock while
  sanitizing unknown sentinels. The named legacy-parity gate remains green.

## Sub-Tasks

- [x] Extract the bounded legacy modules, ledger DB implementation, default composition and facade.
- [x] Add the planner and its initial pure Vitest coverage.
- [ ] Land aliases, bounded raw reads, strict V1/manifest readers and pooler-safe xact/owner fence without facade drift.
- [ ] Replace planner N+1 reads with one snapshot loader, batch evidence and <=14-query native reader; retain direct/exact-ID compatibility.
- [ ] Land atomic `initializeReservedRun`/`finalizeOwnedRun`; retain legacy-only `createRun`/`recordItem`/`finalizeRun`.
- [ ] Split near-limit facade/tests into declared cohesive children, then land managed/native and EXPLAIN suites.
- [ ] Pass pure, DB, type/lint, query-budget and touched-file line gates.

## Testing Requirements

- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-install-planner.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-planning-snapshot.test.ts`
- `bunx vitest run --config vitest.config.ts tests/vitest/kits/full-site-explain-metrics.test.ts`
- `bun test --parallel=1 tests/unit/kits/nativeCmsWriterFence.test.ts`
- Freshly prefix every Bun DB command below in its own shell with `set -a && source /home/coder/project/Coderso/.env && set +a`; never inspect, print, copy, hash or persist its contents.
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/installService.test.ts tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerReadPersistence.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerRunInitialization.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteManagedOwnershipDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteManagedEvidenceExplainDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteResolverBoundsDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSitePlanningBaseBatchDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSitePlanningAggregateBatchDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSitePlanningNativeExplainDb.test.ts`
- `bun --cwd core lint` and `bun --cwd core lint:types`
- Every TASK-547 DB test uses at least `360000`/`360_000` ms; replace the two `15_000` lock overrides, EXPLAIN `120_000`, and 100 × 20 ms poll with monotonic `DB_EVENTUALLY_DEADLINE_MS = 360_000` while retaining bounded `db_lock_state_timeout`. Do not raise unrelated timeouts or duplicate moved cases.
- L01 first lands `RawFullSiteInstallLedgerItem`/`listRawItems`; L03 pre-land consumes but never redeclares them. Baseline and post-bridge root run `./node_modules/.bin/tsc -p tsconfig.json --noEmit`; zero located diagnostics may belong to L01/already-landed phases.
- A nonzero root typecheck may proceed only when every parsed diagnostic belongs to a later leaf or exactly matches baseline path/location/code/headline. Unlocated/unparsed/new-unowned/ambiguous diagnostics block; report later-leaf and unchanged-baseline counts and never call nonzero clean. Only command ID `root-typecheck` may use this classifier.
- Reader/type/planner gate: execute the exact hostile/4,096/4,097 matrix above;
  keep the required `rollbackAction` direct assignment without `?.`, `??` or cast,
  throwing zero-call planner-write spies, and one self-evidence lookup for a
  direct concrete two-argument resolver call.
- Initialization/finalization gate: exact 0/1/512 plan/items, owner-gate code preservation, confirmed-rollback generic failure, exact ambiguous-commit success and unresolved marker retention; synchronous closing, primary and private-reread statement-one owner `FOR UPDATE`, captured lease, zero ordinary fence/mutation, bounded all-mode summaries, automatic child and interrupted-source atomic transitions, desired/different outcomes, marker removal and immutable winner. Every success requires desired; caller mapping is DB-free, deterministic cleanup catches only finalizer result/error with zero later I/O, and partial failure preserves owner.
- Writer-fence gate: exact 548/0 ordinary `READ COMMITTED` try-shared/census and installer owner `FOR SHARE`; private holder-authorized statement-one ordered `LIMIT 2 FOR UPDATE` reservation census with zero shared-fence call/public bypass; rich resume derivation/rejection and marker-before-planner. Pin global -> package xact SQL, `{max:1,prepare:false}` `begin`, rotation, inherited/detached zero-I/O, absent-ALS `onclose`, normal revoke/end, callback settlement before end, primary precedence and no reserve/session/manual-unlock SQL.
- Planner-projection gate: the Bun source test pins the shared exact constants and both consumers' imports/uses; malicious spread/computed/unmatched/extra members, local copies and bare selects fail. The base/aggregate DB suites compile every batch projection, compare its full transport-plus-`desired` SELECT shape and reject every non-allowlisted output for that projection, explicitly `access_password`. Retain two content-entry ID selects/one resolver desired select, literal forbidden checks, child cap imports/order/limits/pre-project guards, exact-ID/natural behavior and all six cap/cap+1 boundaries without truncation.
- Evidence query-shape gate: the one compiled batch SELECT retains request ordinal,
  run-driven lateral winner, combined anti-join, stable aliases/order/limits and
  narrow resource ID result; native base/child batches retain exact caps.
- Conditional no-migration plan gate: both DB suites import the one pure helper and run every evidence/native profile and budget with sanitized winner mismatch; the focused Vitest file owns both positive forms/four outputs, finite metrics, specified optional absences and fixed one-invocation errors for every malformed/overflow shape. Sibling-test imports and duplicate parser/type/validator bodies fail.
- L01 planner regression gate: exactly one snapshot-loader call and zero per-item
  DB fallbacks; both overloads call `normalizeFullSitePackageForWrite` zero times while `normalizeDesired` remains required for existing-resource comparisons;
  two-arg builds once before deps, and three-arg planning consumes L02's unchanged plan with zero builds before any dependency.
- DB test-integrity gate: URL helper false only for `undefined` and true for `""`; one injected factory pins load/`SELECT 1`/direct 12- and 13-column `LIMIT 0` stages. Each stage fails twice with distinct fresh cause-free sanitized errors and exact stop traces. No fake production DB cast/`any`; fixtures start `try/finally` before writes, pre-register exact IDs, clean children first and use no broad predicate.
- Only after both plan profiles pass, confirm `git diff --name-only` contains no
  DB migration, snapshot or journal artifact for this correction. A budget
  failure instead blocks L01 for index-migration contract re-audit.
- Run every listed focused test and DB file independently,
  then `wc -l` every changed L01 production/test file; each must be at most 1,000 lines.
