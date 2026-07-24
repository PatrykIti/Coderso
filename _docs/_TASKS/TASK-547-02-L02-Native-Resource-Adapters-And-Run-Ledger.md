# TASK-547-02-L02: Native Resource Adapters and Saga Execution (Ledger Consumer)
# FileName: TASK-547-02-L02-Native-Resource-Adapters-And-Run-Ledger.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Native Resources
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-02-L01
**Status:** 🚧 In Progress
**Validation:** Corrective adapter/executor work and fresh targeted/final gates
are pending.

## Overview

Add cohesive adapters for Page Templates, entries, listing templates/queries,
detail pages, form actions and allowlisted settings. Extend install item kinds,
snapshots and audit summaries without using the frozen widget-template phase.
Correct the crash window by durably preparing every exact native target and
every nondeterministic create ID before mutation, and replace adapter-level
multi-call repair with native domain-local atomic APIs.

The historical physical filename retains `Run-Ledger`, but this leaf is only a
ledger consumer. L01 exclusively owns the port, concrete persistence, locking and
listed-row types; L02 owns complete native snapshot capture and saga execution.

Consume L01's exported ledger port and concrete DB implementation by injection.
Do not create or edit a `ledger.ts`, redeclare the interface, add another
implementation, edit default legacy composition or directly write ledger tables.
Complete rollback snapshots store the native ID and canonical native-owner state
used only for exact recovery and restoration checks. They are never L01's
planner-equality `FullSiteInstallPlanItem.currentDesired` projection.

**Exact full-site production ownership:**

- `core/services/kits/fullSiteInstall/adapters.ts` becomes a bounded registry/
  compatibility facade;
- new `core/services/kits/fullSiteInstall/adapterTypes.ts` owns only adapter
  types, `FullSiteNativeSnapshot`, lifecycle-kind guards and Bun-free shared
  helpers;
- new `core/services/kits/fullSiteInstall/aggregateAdapters.ts` owns content
  type, Form, Page Template, listing template/query and settings adapters;
- new `core/services/kits/fullSiteInstall/lifecycleAdapters.ts` owns entry,
  detail Page, Page and Menu adapters;
- `core/services/kits/fullSiteInstall/execute.ts`, `staging.ts`, `preflight.ts`
  and `nestedValidation.ts`.

**Exact native-domain production ownership:**

- `core/services/forms/formActionsContract.ts`,
  `core/services/forms/formActionsService.ts`, and new
  `core/services/forms/formAggregateService.ts`;
- `core/services/menus/menuService.ts`;
- `core/services/pages/pageService.ts`;
- `core/services/content/detailPageDocumentService.ts`;
- `core/services/content/typeService.ts`,
  `core/services/pages/pageTemplateLibraryService.ts`,
  `core/services/content/listingTemplatesService.ts`, and
  `core/services/content/listingQueriesService.ts` own exact-ID atomic create,
  replace and conditional-delete paths for their native rows;
- `core/services/content/listingTemplateConfig.ts` owns the Bun-free strict
  `normalizeListingTemplateWriteInput` listing-template write normalizer used by
  `aggregateAdapters.ts`/`adapters.ts`;
- legacy `core/services/content/entryService.ts` plus new extracted
  `core/services/content/entryLifecycleMutationService.ts`. Preserve the public
  `entryService.ts` imports/re-exports while splitting it below 1,000 lines; and
- new `core/services/settings/fullSiteSettingsAtomicService.ts` owns exact raw
  setting capture plus validated apply and raw-restore compare-and-swap batches.
  It reuses `settingsService.ts`'s exported key/value normalizers and does not
  change TASK-547-04-L03 ownership of `settingsService.ts`.

**Exact test ownership:** existing
`tests/unit/kits/fullSiteResourceAdapters.test.ts`,
`tests/unit/kits/fullSiteAdapterAtomicity.test.ts`,
`tests/unit/kits/fullSiteLifecycleUpdates.test.ts`,
`tests/vitest/forms/formActionsContract.test.ts` and
`tests/unit/forms/formActionsService.test.ts`; plus new cohesive
`tests/unit/kits/fullSiteAggregateAdapters.test.ts`,
`tests/unit/kits/fullSiteLifecycleAdapters.test.ts`,
`tests/unit/forms/formAggregateService.test.ts`,
`tests/unit/menus/menuAggregateAtomicity.test.ts`,
`tests/unit/pages/pageLifecycleMutation.test.ts`,
`tests/unit/content/detailPageDocumentLifecycleMutation.test.ts` and
`tests/unit/content/entryLifecycleMutationService.test.ts`; existing
`tests/unit/content/typeService.test.ts`,
`tests/unit/pages/pageTemplateLibraryService.test.ts`,
`tests/unit/content/listingTemplatesService.test.ts`,
`tests/unit/content/listingQueriesService.test.ts`; and new
`tests/unit/settings/fullSiteSettingsAtomicService.test.ts`.

Split the two near-limit adapter suites by responsibility before adding cases;
every touched/created production and test file must close at most 1,000 physical
lines and every extracted suite remains independently runnable. L02-owned kit
tests may use an injected rollback adapter only to prove the executor seam; they
must not own dependency scheduling, rollback claims or managed-identity behavior.
Remove a duplicated cross-leaf case only after grounding equivalent coverage in
the already-present L01/L03-owned suite; do not weaken a unique assertion.

**Forbidden for L02:** L01 shared types/planner/ledger/current resolver/legacy
composition and their tests; L03 rollback/compensation/service split/dependency/
crash-worker tests; tasks/changelog/shared docs. No L02 file imports install-run
tables or implements a second ledger.

Keep the existing `execute.ts` import and call name `compensateItems`. L02 passes
that compatibility entry point complete source/prior sets freshly reloaded by
`ledger.listRawItems()`. The persisted raw source row is immutable provenance:
an in-memory phase overlay is diagnostic-only and never becomes `items`, a
preflight `persistedSourceItem`, or outcome operation/snapshots/action. L02 filters
nothing and never imports L03's scheduler directly; L03 validates the raw sets,
uses fresh exact native state for decisions, then invokes the shared scheduler.
L02 also derives the current apply source through `ledger.getRun(run.id)` and
passes it as `currentSource`. To keep the isolated L02 gate compatible with the
old L03 parameter type, it first assigns the object (including `currentSource`)
to a local variable and passes that variable; structural typing accepts it before
L03 and the field becomes required when L03 lands.

Two source-compatible bridges are required specifically so the mandatory L02
gate passes before L03 may edit its owned files. They are rollout compatibility,
not production fallbacks invented for tests:

- the existing base `AdapterApplyInput` construction shape remains accepted by
  `applyStaged`/`applyDesired` through one explicitly deprecated internal branch
  used only by the pre-L03 compensation module; the L02 executor must use the new
  strict saga input and can never reach that branch; and
- the existing array-returning `recoverInterruptedSagaItems` name remains a
  compatibility wrapper for the untouched pre-L03 rollback facade. The final L03
  implementation uses the new strict `classifyInterruptedSagaItems` API after
  raw-field and graph validation and never uses the wrapper as dependency evidence.

## Canonical Adapter And Form-Action Contract

`adapterTypes.ts` preserves the existing backward-compatible
`AdapterApplyInput` construction shape so current planner/preflight calls and the
untouched pre-L03 compensation module compile. It adds exact discriminated
`FullSiteSagaAdapterPrepareInput` and `FullSiteSagaAdapterApplyInput` unions. A
create has `currentId:null`, a server-owned `intendedId:string` and
`expectedSnapshot:null`; an update has `currentId:string`, `intendedId:null` and
an immutable complete `expectedSnapshot` with the same ID. The apply union also
requires the exact complete `targetSnapshot` prepared and persisted before the
first native write. A create never overloads `currentId`. Validation-only calls
continue to use the base shape; every executor mutation constructs the strict
union.

The same module owns exact helpers `isFullSiteSagaAdapterApplyInput` and
`assertFullSiteSagaAdapterApplyInput`. They require every strict key to be an own
property, validate null/snapshot forms and enforce the operation/ID/target
matrix. Adapters use that assertion before entering their domain-atomic mutation
path. Existing `applyStaged`/`applyDesired` keep accepting the base type only via
an explicitly deprecated internal compatibility branch for the old L03 restore
call; no L02 executor, planner or preflight path may use that branch. L03 removes
its call to the branch when it switches to `restoreSnapshotAtomic`; the branch is
retained only to make the sequential L02 gate source-compatible and is not a test
fallback. `adapterTypes.ts` also owns `FullSiteNativeSnapshot`,
`FullSitePreparedNativeTargets`, `RestoreSnapshotAtomicInput`,
`DeleteSnapshotAtomicInput`, `PublishSnapshotAtomicInput`,
`FullSiteNativeReversal`, `FullSiteSettingsApplyBatchInput`,
`ReverseSettingsBatchInput`, `ResourceAdapter`,
`LIFECYCLE_CAPABLE_PUBLISH_KINDS` and `isLifecycleCapablePublishKind`.
`adapters.ts` only assembles and re-exports
`FULL_SITE_RESOURCE_ADAPTERS satisfies FullSiteResourceAdapterRegistry`; it
contains no domain implementation.

Freeze the snapshot boundary separately from planner equality:

```ts
export type FullSiteNativeSnapshot = Readonly<{
  readonly id: string;
  readonly desired: JsonObject; // canonical deep-cloned native-owner state
}>;

export type RestoreSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  target: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type DeleteSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type PublishSnapshotAtomicInput = Readonly<{
  id: string;
  expectedCurrent: FullSiteNativeSnapshot;
  target: FullSiteNativeSnapshot;
  actorId: string;
}>;

export type AdapterApplyInput = Readonly<{
  operation: "create" | "update";
  currentId: string | null;
  key: string;
  desired: JsonObject;
  actorId: string;
}>;

export type FullSiteSagaAdapterPrepareInput =
  | (AdapterApplyInput & Readonly<{
      operation: "create";
      currentId: null;
      intendedId: string;
      expectedSnapshot: null;
    }>)
  | (AdapterApplyInput & Readonly<{
      operation: "update";
      currentId: string;
      intendedId: null;
      expectedSnapshot: FullSiteNativeSnapshot;
    }>);

export type FullSiteSagaAdapterApplyInput =
  FullSiteSagaAdapterPrepareInput & Readonly<{
    targetSnapshot: FullSiteNativeSnapshot;
  }>;

export type FullSitePreparedNativeTargets = Readonly<{
  staged: FullSiteNativeSnapshot | null;
  complete: FullSiteNativeSnapshot;
}>;

export type FullSiteNativeReversal =
  | Readonly<{
      operation: "create";
      id: string;
      expectedCurrent: FullSiteNativeSnapshot;
      target: null;
    }>
  | Readonly<{
      operation: "update";
      id: string;
      expectedCurrent: FullSiteNativeSnapshot;
      target: FullSiteNativeSnapshot;
    }>;

export type ReverseSettingsBatchInput = Readonly<{
  items: readonly FullSiteNativeReversal[];
  actorId: string;
}>;

export type FullSiteSettingsApplyBatchInput = Readonly<{
  items: readonly FullSiteSagaAdapterApplyInput[];
  actorId: string;
}>;

export function isFullSiteSagaAdapterApplyInput(
  input: AdapterApplyInput,
): input is FullSiteSagaAdapterApplyInput;

export function assertFullSiteSagaAdapterApplyInput(
  input: AdapterApplyInput,
): asserts input is FullSiteSagaAdapterApplyInput;

export type ResourceAdapter = {
  // existing validate/apply/publish members remain
  prepareNativeTargets(
    input: FullSiteSagaAdapterPrepareInput,
  ): Promise<FullSitePreparedNativeTargets>;
  captureSnapshotById(id: string): Promise<FullSiteNativeSnapshot>;
  deleteSnapshotAtomic(input: DeleteSnapshotAtomicInput): Promise<void>;
  restoreSnapshotAtomic(input: RestoreSnapshotAtomicInput): Promise<void>;
  publishSnapshotAtomic?(input: PublishSnapshotAtomicInput): Promise<void>;
  applySettingsBatchAtomic?(
    input: FullSiteSettingsApplyBatchInput,
  ): Promise<readonly FullSiteNativeSnapshot[]>;
  reverseSettingsBatch?(input: ReverseSettingsBatchInput): Promise<void>;
};

export type FullSiteResourceAdapterRegistry =
  Record<Exclude<FullSiteInstallResourceKind, "setting">, ResourceAdapter> & {
    setting: ResourceAdapter & Required<
      Pick<ResourceAdapter, "applySettingsBatchAtomic" | "reverseSettingsBatch">
    >;
  };
```

`prepareNativeTargets` is read/normalize/allocation-only: it performs zero native
writes and returns every exact complete state that a later transition may
commit. For a lifecycle resource requested as published, `staged` is its exact
draft aggregate and `complete` is its exact published aggregate, including
preallocated rollback-relevant revision/publication metadata. Otherwise
`staged:null` and `complete` is the sole target. Every nondeterministic value
owned by a complete target is allocated here; the native owner consumes that
persisted target rather than regenerating it.

The exhaustive registry uses `FullSiteResourceAdapterRegistry`; a setting batch
cannot silently fall back to per-key apply or reversal.

`captureSnapshotById` delegates to the native owner and returns its complete,
canonical, JSON-safe rollback state. It never uses a natural key and never returns
the L01 planner-equality projection. For Page, entry and detail Page it includes
current and published state, publication metadata, and the exact bounded
rollback-relevant revision rows under the native retention policy. Form includes
the base row, ordered fields and canonical actions; Menu includes the base row,
ordered items, document, appearance, extras and status. Secret values,
submissions and unrelated audit rows are excluded. `createdAt`/`updatedAt` values
that the restore contract does not own are excluded consistently; publication
metadata and bounded revision rows that it does restore are included and must be
prepared exactly.

Entry and detail Page owners export exact constants
`ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100` from
`entryLifecycleMutationService.ts` and
`DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100` from
`detailPageDocumentService.ts`. Page reuses the existing exported
`MAX_PAGE_REVISION_RETENTION = 100` from `revisionRetention.ts`; L02 does not edit
that owner merely to duplicate the value. Each Page/entry/detail capture query
requests deterministic `version DESC, id ASC` order with `limit + 1`. Exactly 100
is accepted; 101 throws `page_revision_snapshot_too_large`,
`entry_revision_snapshot_too_large` or
`detail_page_revision_snapshot_too_large` before that item is durably initialized
and before any native mutation. Capture never truncates, and atomic restore
deletes/replaces only that resource's revision rows with the exact captured
ordered set.

`normalizeFormActionsForWrite` in `formActionsContract.ts` is the sole canonical
native persistence/complete-snapshot normalizer. Extend its options with
`requireStableIds:true` for aggregate/package writes: every action ID must be a
non-empty explicit unique ID, ordering is `orderIndex` then ID followed by dense
canonical order indexes, and no random fallback is reachable. General authoring
may allocate an ID before invoking that strict path, but installer normalization,
aggregate `setFormActionsTx(..., { requireStableIds:true })`, aggregate mutation
and L02 native snapshot capture use that strict canonical path. L01's persisted
planner-equality projection is not a complete native snapshot: it remains on its
L01-owned `normalizeFormActionsInput` plus canonical sort/densification path, and
L02 does not edit it or make it import this helper. The existing general
`setFormActions` wrapper retains its authoring allocation policy but delegates
ordering/config normalization to the same owner. Unknown/malformed actions fail
before DB mutation.

`formActionsService.ts` owns exact export
`setFormActionsTx(tx, formId, input, { requireStableIds })`; the existing
`setFormActions` is a transaction-owning wrapper over the same internal writer.
The new Form aggregate service uses the Tx form so Form, fields and actions share
one native-domain transaction.

## Domain-Local Atomic APIs

Freeze these exact exported helpers and filenames; none accepts an installer or
cross-domain transaction object:

```ts
// core/services/content/typeService.ts
mutateContentTypeAtomic(input)

// core/services/forms/formAggregateService.ts
mutateFormAggregateAtomic(input)

// core/services/pages/pageTemplateLibraryService.ts
mutatePageTemplateAtomic(input)

// core/services/content/listingTemplatesService.ts
mutateListingTemplateAtomic(input)

// core/services/content/listingQueriesService.ts
mutateListingQueryAtomic(input)

// core/services/menus/menuService.ts
mutateMenuAggregateAtomic(input)

// core/services/pages/pageService.ts
mutatePageLifecycleAtomic(input)

// core/services/content/entryLifecycleMutationService.ts
mutateEntryLifecycleAtomic(input)

// core/services/content/detailPageDocumentService.ts
mutateDetailPageDocumentLifecycleAtomic(input)

// core/services/settings/fullSiteSettingsAtomicService.ts
captureFullSiteSettingsBatchRaw(keys)
applyFullSiteSettingsBatchAtomic(input)
restoreFullSiteSettingsBatchRawAtomic(input)
```

Each input is a closed discriminated union:

```ts
type NativeAtomicMutation<TDesired, TNativeSnapshot> =
  | { operation: "create"; id: string; desired: TDesired; actorId: string }
  | {
      operation: "replace";
      id: string;
      expectedCurrent: TNativeSnapshot;
      desired: TDesired;
      actorId: string;
    }
  | {
      operation: "delete";
      id: string;
      expectedCurrent: TNativeSnapshot;
      actorId: string;
    };

type NativeAtomicMutationResult<TNativeSnapshot> = {
  id: string;
  snapshot: TNativeSnapshot | null; // null only after conditional delete
};
```

The domain owns distinct concrete `TDesired` and `TNativeSnapshot` types; it must
not import full-site package types or pretend install desired data is a complete
native snapshot. Every helper fully normalizes and validates the target before
opening `db.transaction`, uses the caller-supplied ID on create, and locks and
re-reads the exact row plus every owned aggregate/lifecycle row on replace or
delete.
It canonical deep-compares that complete state with the immutable
`expectedCurrent`; any mismatch throws `site_package_state_changed` before the
first write. Create/replace consumes the exact precomputed target, including any
preallocated native child/revision identity or publication value, and returns the
same ID plus its complete canonical snapshot. Delete removes only the aggregate
whose complete locked state still equals `expectedCurrent` and returns null.
Cache invalidation/audit side effects occur only after commit.
An injected error at every internal write boundary leaves the exact pre-call
domain snapshot. No compensating catch sequence may emulate a transaction.

- Form mutation owns base Form + ordered fields + actions and stores its native
  target status directly.
- Menu mutation owns base row + items + document + appearance + extras + status;
  apply staging targets draft, while rollback can replace the exact prior
  published/draft snapshot atomically.
- Page, entry and detail mutation own their draft/current/published/revision state;
  apply staging targets draft, while rollback restores the exact prior lifecycle
  snapshot atomically. `publishSnapshotAtomic` uses the same owner transaction to
  compare the exact staged aggregate and install the already-durable published
  target; it never regenerates revision/publication evidence after the write.
- Content type, Page Template, listing template and listing query keep their
  existing public CRUD wrappers, while the new trusted atomic helpers add exact
  ID create, locked complete-state replace and locked conditional delete. The
  content-type conditional-delete variant refuses owned dependencies and does
  not side-write `site.contentRoutes`; settings are independently restored by the
  one settings batch.
- `entryService.ts` becomes a below-limit compatibility/read facade; lifecycle
  mutation internals move cohesively to `entryLifecycleMutationService.ts`, with
  stable re-exports for existing consumers.

Adapters call only these atomic helpers for all nine UUID-backed kinds.
Their snapshot methods are `captureSnapshotById(id)` and
`restoreSnapshotAtomic({ id, expectedCurrent, target, actorId })` or
`deleteSnapshotAtomic({ id, expectedCurrent, actorId })`; L03 consumes these
methods instead of plain `deleteById` or `applyStaged()` followed by publish.
Both validate snapshot IDs, lock and re-read the complete owned state,
canonical deep-compare it to `expectedCurrent`, and throw
`site_package_state_changed` with zero writes on drift before replacing `target`
or deleting atomically. The snapshot capture/mutation implementations share the
domain's concrete `TNativeSnapshot`, so the installer never reconstructs native
state itself.

Settings use presence-aware raw snapshots:

```ts
type FullSiteRawSettingState =
  | { key: SettingKey; present: false }
  | { key: SettingKey; present: true; value: JsonValue };

type FullSiteSettingsAtomicBatchInput = Readonly<{
  expectedCurrent: readonly FullSiteRawSettingState[];
  target: readonly FullSiteRawSettingState[];
}>;
```

Both settings mutation functions require identical unique sorted key sets. In
one transaction they take `LOCK TABLE settings IN SHARE ROW EXCLUSIVE MODE` (an
absent row cannot be protected by `FOR UPDATE` alone), re-read every raw key,
compare exact presence/value with every `expectedCurrent`, and only then write
all targets. Apply validates target values through the existing native setting
normalizer; restore preserves trusted raw JSON. A mismatch throws
`site_package_state_changed` with zero writes. Exactly one site-cache invalidation
runs after commit; none runs on conflict/failure. `aggregateAdapters.ts`
translates strict prepared apply inputs or shared `FullSiteNativeReversal[]` to
this domain-only batch and exposes the two paths as the setting adapter's
required `applySettingsBatchAtomic` and `reverseSettingsBatch` methods.

## Durable Create Intent

`staging.ts` owns exact export `DURABLE_CREATE_ID_KINDS` with every UUID-backed
package kind:

```ts
export const DURABLE_CREATE_ID_KINDS = [
  "content_type",
  "form",
  "page_template",
  "listing_template",
  "content_entry",
  "listing_query",
  "detail_page",
  "page",
  "menu",
] as const;
```

`setting` is excluded because its canonical key is already its durable identity.
The module also owns
`prepareDurableCreateIntent(operation, generateId)`,
`FullSiteDurableAfterSnapshotV1`, `buildFullSiteDurableAfterSnapshotV1`,
`readFullSiteDurableAfterSnapshotV1`,
`FullSiteSagaRecoveryClassification`, `classifyInterruptedSagaItems` and the
compatibility wrapper `recoverInterruptedSagaItems`.

```ts
export type FullSiteDurableAfterSnapshotV1 = FullSiteNativeSnapshot & Readonly<{
  recovery: Readonly<{
    schemaVersion: 1;
    phase: "prepared" | "staged" | "publish_prepared" | "complete";
    stagedSnapshot: FullSiteNativeSnapshot | null;
  }>;
}>;

export function canonicalizeFullSiteJsonValue(value: JsonValue): string;
export function fullSiteJsonValuesEqual(
  left: JsonValue,
  right: JsonValue,
): boolean;
```

The top-level `id`/`desired` is the exact complete final target. For a requested
published lifecycle resource, `recovery.stagedSnapshot` is the distinct exact
draft target; otherwise it is null. Phase updates never replace either target.
The reader is strict reject-unknown and validates every nested ID and JSON value.
For a noop, raw `afterSnapshot` always remains this envelope rather than becoming
the plain `beforeSnapshot`: its top-level `id`/`desired` canonical-deep-equals the
complete before snapshot with the identical exact ID,
`recovery.stagedSnapshot:null`, and `recovery.schemaVersion:1`. The only valid
noop status/phase pairs are `planned`/`prepared` and `success`/`complete`; noop
`failed` or `skipped` source rows are invalid. The success upsert changes only
`recovery.phase` and preserves the exact top-level target, null staged snapshot
and V1 action.

`staging.ts` owns both exact JSON helpers above. Callers strictly validate unknown
JSONB values as `JsonValue` before calling them. Canonicalization preserves array
order, sorts object keys lexicographically at every depth, and JSON-encodes
primitives (including `null`); equality compares those canonical strings. L03
uses decoded-JSONB value equality, never driver text or storage bytes.

`staging.ts` owns the exact frozen export
`FULL_SITE_DURABLE_SOURCE_STATUS_PHASES_V1` and
`isValidFullSiteDurableSourceStatusPhaseV1`; L02 and L03 tests import that owner
instead of duplicating expected pairs:

| Operation | Status | Phase | Additional invariant |
| --- | --- | --- | --- |
| create/update | `planned` | `prepared` | initialized |
| create/update | `success` | `staged` | non-null staged target |
| create/update | `success` | `publish_prepared` | non-null staged target |
| create/update | `success` | `complete` | exact final target verified |
| noop | `planned` | `prepared` | null staged target; before/final equality |
| noop | `success` | `complete` | null staged target; before/final equality |

These six rows are exhaustive. Every source `failed`/`skipped`, planned later
phase, or staged/publish phase without a non-null staged target is invalid. A
caught item failure performs no item upsert: the last durable item row remains
untouched and only the source run is finalized failed; completed items stay
success.

Preparation is deliberately two-pass:

1. Iterate the entire plan without native writes. Allocate and UUID-validate one
   intended ID for every create in `DURABLE_CREATE_ID_KINDS`; take each update/
   noop ID from `currentId`; use the canonical key for a setting. Build the full
   `Map<FullSiteResourceIdentity,string>` before resolving any reference.
2. For every operation, resolve all refs against that full map, run the owning
   strict normalizer, capture the exact complete before state by ID, and call
   `prepareNativeTargets`. A create first proves exact-ID/key absence and records
   that absence as `beforeSnapshot:null`; for an absent setting this maps to the
   native raw state `{ key, present:false }`. An update/noop records its complete
   native snapshot, including exact raw setting presence/value. Validate that
   every staged/final target has the registry ID. A noop requires a current ID and
   exact capture and uses that snapshot as both `beforeSnapshot` and the complete
   top-level `id`/`desired` target inside the durable after envelope; the raw
   before/after JSON values are not equal.
3. Build every strict durable after envelope and L01 V1 rollback action entirely
   in memory. Validate the complete all-item set, including operation-specific
   before/after/ID invariants, before the first ledger write.
4. Persist every item's exact before snapshot, exact final/staged after targets
   and exact V1 action with phase `prepared`. Only after all item upserts succeed
   may execution invoke any native write.

Thus content type, Form, Page Template, listing template, entry, listing query,
detail Page, Page and Menu creates all receive the exact prepared ID; no DB or
Node UUID fallback is reachable in their installer-owned atomic create path. The
returned ID and captured state must equal the persisted target before a later
phase upsert.

Lifecycle transitions remain recoverable at every crash point. After exact stage
commit the same item is upserted as `staged`. Before publish it is durably armed
as `publish_prepared`; `publishSnapshotAtomic` compares the complete staged state
and consumes the already-persisted complete target. After commit, the executor
captures and exact-compares the complete target and upserts `complete`. A crash
before any phase upsert is still classifiable because both exact staged and final
targets were durable before the first native write. Draft-final resources skip
`publish_prepared` and move from `prepared` to `complete` after their sole commit.

`FullSiteInstallPlanItem.currentDesired` remains planner equality evidence only;
it is never copied into a durable complete snapshot.

Freeze the exact final recovery classification without filtering persisted graph
nodes:

```ts
export type FullSiteSagaRecoveryClassification = {
  identity: FullSiteResourceIdentity;
  item: PersistedFullSiteInstallLedgerItem;
  // Diagnostic only. `noop` is source-operation-derived without resolver access.
  hint: "not_applied" | "applied" | "already_recovered" | "noop";
};

export async function classifyInterruptedSagaItems(input: {
  items: readonly PersistedFullSiteInstallLedgerItem[];
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<readonly FullSiteSagaRecoveryClassification[]>;

/** @deprecated Sequential-land compatibility for the pre-L03 rollback facade. */
export async function recoverInterruptedSagaItems(input: {
  items: readonly FullSiteInstallLedgerItem[];
  resolveCurrentResource: FullSiteCurrentResourceResolver;
}): Promise<FullSiteInstallLedgerItem[]>;
```

`classifyInterruptedSagaItems` returns one ordered classification for every
strictly parsed persisted input item and never builds, filters or reorders the
dependency graph. It
emits `hint:"noop"` directly from `item.operation === "noop"` without invoking
`resolveCurrentResource` or any adapter/native read. That diagnostic hint never
authorizes an outcome: final L03 first parses the source noop's raw
`afterSnapshot` with `readFullSiteDurableAfterSnapshotV1`, validates
`recovery.schemaVersion:1`, `recovery.stagedSnapshot:null` and the exact
`planned`/`prepared` or `success`/`complete` status/phase pair, then canonical-
deep-compares the complete `beforeSnapshot` with the envelope's top-level
`id`/`desired` target and identical exact ID in its global zero-native preflight.
The classifier resolves a prepared create only by
its exact ID, but every create/update equality-projection result is likewise only
a scheduling hint. Every non-completed create/update, including `not_applied`
and `already_recovered`, must later pass L03's complete-snapshot parse and fresh
exact-ID refinement. A required-kind prepared create
with `id:null`, malformed UUID or ID/natural-identity mismatch throws
`site_package_recovery_missing_intended_id` before adapter invocation; it never
searches/deletes/restores by natural key. Its `item` is the L03-parsed immutable
raw DB row; no in-memory phase/status overlay can replace source provenance.

The deprecated `recoverInterruptedSagaItems` wrapper preserves the current base
item input and array result so untouched `rollback.ts` compiles during the L02
gate. It delegates hint construction to `classifyInterruptedSagaItems`, whose
noop branch performs no native-state read. The wrapper normalizes an omitted
legacy construction-time rollback action to `null`, then
projects the legacy array in input order: `not_applied` hints are omitted and
`applied`, `already_recovered` and `noop` hints return their classification item.
It never constructs or validates the dependency graph. After L03 lands, final
rollback and compensation call only `classifyInterruptedSagaItems` after raw-field
and graph validation; no alternate recovery alias is introduced.

The classifier's operation split is explicit:

```ts
for (const item of input.items) {
  if (item.operation === "noop") {
    classifications.push({
      identity: toFullSiteResourceIdentity(item),
      item,
      hint: "noop",
    });
    continue; // no resolver/adapter/native read; source evidence is not validated here
  }
  classifications.push(
    await classifyCreateOrUpdateHintByExactId(item, input.resolveCurrentResource),
  ); // still only a hint; L03 performs complete-state refinement
}
```

The apply run options written before initialization include
`rollbackDependencySchemaVersion:1` beside the package fingerprint, allowing L03
to distinguish current all-items-required evidence from legacy unknown evidence.

## Security Contract

Service only. Resolve typed refs immediately before each native strict normalizer.
Settings allowlist excludes secret/auth/provider namespaces. Audit contains safe
resource keys/IDs/operations only. Strict action/aggregate inputs reject unknown
keys and validate fully before transactions. Intended IDs are server-generated
UUIDs, never accepted from package JSON. No public endpoint is added. No database
migration is added. No RBAC/CSRF/rate-limit change, media import or cross-domain
transaction abstraction.

## Implementation Pseudocode

```ts
export async function initializeFullSiteSaga({ runId, plan, ledger, adapters, generateId }) {
  // Pass 1: allocate every identity before any ref is resolved.
  const intendedRegistry = new Map<FullSiteResourceIdentity, string>();
  const intents = new Map<FullSiteResourceIdentity, DurableCreateIntent>();
  for (const operation of plan.operations) {
    const intent = prepareDurableCreateIntent(operation, generateId);
    const id = operation.currentId ?? intent.intendedId ?? operation.key; // setting key
    assertPreparedIdentity(operation.kind, id);
    intendedRegistry.set(operation.identity, id);
    intents.set(operation.identity, intent);
  }

  // Pass 2: resolve/canonicalize every exact target while native writes are forbidden.
  const prepared = [];
  for (const operation of plan.operations) {
    const intent = intents.get(operation.identity)!;
    const intendedId = intendedRegistry.get(operation.identity)!;
    const beforeSnapshot = await captureCompleteBeforeSnapshot({ operation, intendedId, adapters });
    // null is allowed only after exact-ID/key absence was proven for a create.
    const resolved = resolveOperationRefs(operation.desired, intendedRegistry);
    const normalized = await validateFullSiteOperation({
      operation,
      desired: resolved,
      actorId,
      adapter: adapters[operation.kind],
    });
    const targets = operation.operation === "noop"
      ? { staged: null, complete: requireExactNoopSnapshot(operation, beforeSnapshot) }
      : await adapters[operation.kind].prepareNativeTargets(
          toSagaPrepareInput({ operation, intendedId, beforeSnapshot, normalized, actorId }),
        );
    assertPreparedTargetIds(intendedId, targets);
    const rollbackAction = buildFullSiteRollbackActionV1({
      identity: operation.identity,
      dependencies: operation.dependencies,
    });
    const afterSnapshot = buildFullSiteDurableAfterSnapshotV1({
      complete: targets.complete,
      staged: targets.staged,
      phase: "prepared",
    });
    prepared.push({ operation, intent, intendedId, beforeSnapshot, afterSnapshot,
      targets, normalized, rollbackAction });
  }
  assertCompletePreparedSagaEvidence(prepared);
  for (const item of prepared) {
    await ledger.recordItem(toPreparedLedgerItem(runId, item));
  }
  return { prepared, intendedRegistry };
}

for (const prepared of operationsBeforeSettings) {
  if (prepared.operation.operation === "noop") {
    await ledger.recordItem(toPhaseLedgerItem(prepared, "complete"));
    continue; // zero resolver/adapter/native reads or writes; same envelope targets/action
  }
  const adapter = adapters[prepared.operation.kind];
  const applyInput: FullSiteSagaAdapterApplyInput = {
    operation: prepared.operation.operation,
    currentId: prepared.operation.currentId,
    intendedId: prepared.intent.intendedId,
    expectedSnapshot: prepared.beforeSnapshot,
    targetSnapshot: prepared.targets.staged ?? prepared.targets.complete,
    key: prepared.operation.key,
    desired: prepared.normalized,
    actorId,
  };
  assertFullSiteSagaAdapterApplyInput(applyInput);
  const result = isLifecycleCapablePublishKind(prepared.operation.kind)
    ? await adapter.applyStaged(applyInput)
    : await adapter.applyDesired(applyInput);
  assertExpectedCreatedId(prepared, result.id);
  await assertExactTargetCurrent(adapter, applyInput.targetSnapshot);
  await ledger.recordItem(toPhaseLedgerItem(
    prepared,
    prepared.targets.staged ? "staged" : "complete",
  )); // targets/action remain the exact prepared values
}

for (const prepared of preparedPublishedLifecycleItems) {
  await ledger.recordItem(toPhaseLedgerItem(prepared, "publish_prepared"));
  await adapters[prepared.operation.kind].publishSnapshotAtomic!({
    id: prepared.intendedId,
    expectedCurrent: prepared.targets.staged!,
    target: prepared.targets.complete,
    actorId,
  });
  await assertExactTargetCurrent(
    adapters[prepared.operation.kind],
    prepared.targets.complete,
  );
  await ledger.recordItem(toPhaseLedgerItem(prepared, "complete"));
}

const settingMutations = preparedSettings.filter(
  (item) => item.operation.operation !== "noop",
);
for (const prepared of preparedSettings.filter(
  (item) => item.operation.operation === "noop",
)) {
  await ledger.recordItem(toPhaseLedgerItem(prepared, "complete"));
  // Preserve top-level id/desired, recovery.stagedSnapshot:null and V1 action.
}
if (settingMutations.length > 0) {
  const settingResults = await adapters.setting.applySettingsBatchAtomic({
    items: settingMutations.map(toStrictPreparedSettingApplyInput),
    actorId,
  }); // exactly one locked all-key apply call; no per-key fallback
  assertExactPreparedSettingTargets(settingMutations, settingResults);
  await recordPreparedSettingSuccesses(settingMutations);
}
// Noop settings took only the zero-read ledger branch and never join the native batch.
```

The complete target was durable from initialization; phase upserts only record
transition progress and preserve the same top-level complete snapshot, optional
staged snapshot and V1 action values.

L02 also freezes automatic apply-failure finalization:

```ts
async function compensateFailedApply(input: CompensateFailedApplyInput) {
  const currentSource = await requireCurrentApplySource(input.run.id, input.ledger);
  const claim = await claimAutomaticRollback(currentSource, input);
  if (claim.state === "busy") throw new Error("site_package_rollback_in_progress");
  if (claim.state === "complete") {
    if (currentSource.status !== "failed") {
      throw new Error("site_package_rollback_conflict");
    }
    return;
  }

  let successCommitted = false;
  try {
    const sourceItems = await input.ledger.listRawItems(currentSource.id);
    const priorOutcomes = await input.ledger.listRawItems(claim.id);
    const compensationInput = { // local variable keeps the pre-L03 gate compatible
      items: sourceItems,
      actorId: input.actorId,
      adapters: input.rollbackAdapters,
      ledger: input.ledger,
      rollbackRunId: claim.id,
      packageKey: currentSource.packageKey,
      resolveCurrentResource: input.resolveCurrentResource,
      priorOutcomes,
      currentSource,
    };
    await compensateItems(compensationInput);
    await input.ledger.finalizeRun({
      runId: currentSource.id,
      status: "failed",
      error: input.safeApplyError,
    }); // source failure is durable before rollback success
    await input.ledger.finalizeRun({ runId: claim.id, status: "success" });
    successCommitted = true; // immediately after commit; no fallible work follows
  } catch (error) {
    if (!successCommitted) {
      await input.ledger.finalizeRun({
        runId: claim.id,
        status: "failed",
        error: toSafeFullSiteErrorCode(error, "site_package_compensation_failed"),
      });
    }
    throw error; // never rewrite a committed rollback success
  }
}
```

Both raw sets are reloaded only after the rollback claim and flow unchanged into
L03's zero-native preflight. No caller reduces them to identities, trusts status
alone, or substitutes an in-memory phase overlay; the pre-L03 compatibility
callee may ignore these added fields until L03 lands.

The apply catch invokes this helper whenever the complete item set was durably
initialized, even when no item has a success phase; global source-evidence
validation for noops and fresh create/update refinement, not an in-memory
`completed.length`, determine whether native reversal is needed.
If initialization itself failed, it finalizes only the source run failed because
no native write was permitted. A failure finalizing the source after successful
native compensation leaves the rollback run failed/resumable; retry consumes its
durable outcomes and still commits source-failed before rollback-success.

Menu Page/item references are resolved before `validateDesired`; the complete
resolved Menu (base row, items, document, appearance, extras and draft status) is
passed once to `mutateMenuAggregateAtomic`. There is no executor-level Menu
wiring write before or after that call. Publish is the only later Menu mutation.

Data flow: plan -> allocate all nine UUID create IDs -> full intended-ID registry
-> ref substitution -> native canonical complete before/staged/final targets ->
all exact targets/dependency envelopes durable -> one
domain-local transaction with locked expected-snapshot CAS (including complete
Menu wiring) -> exact target verification -> prepared/staged/publish-prepared/
complete phase evidence -> publish-last -> single
reversible shell/settings stage -> post-commit cache/audit. Known native
errors retain codes; unexpected errors redact.
This executor participates in L03's compensation saga and does not require a
shared cross-domain transaction.

Regression tests: during apply, each resource create/update/noop; every noop
requires its current ID plus complete capture, performs zero adapter/native
writes, registers that current ID, persists a raw durable after envelope rather
than the plain before snapshot, and remains in automatic-compensation graph
evidence. Pin top-level `id`/`desired` canonical equality with the complete before
snapshot and identical exact ID, `recovery.schemaVersion:1`,
`recovery.stagedSnapshot:null`, planned phase `prepared`, success phase `complete`,
unchanged targets/V1 action across the phase-only upsert, and zero resolver/
adapter/native reads or writes in the noop execution branch.
L02 and L03 tests import the shared frozen V1 status/phase export, accept every
one of the exact six rows, and reject its remaining Cartesian product and
staged-target violations; neither suite duplicates a local matrix. The item-fail
catch proves no `failed` item upsert occurs and only run finalization changes.
Form fields/actions nested;
Page/footer/menu/query/detail refs persist as IDs; complete desired equality.
Every kind has an apply adapter, while only the frozen lifecycle-capable subset
(`page`, `content_entry`, `detail_page`, `menu`) participates in publish-last.
Page/entry/detail/menu remain draft until dependencies are wired; menu
items/document/appearance precede publish; settings land in one last reversible
stage through one required `applySettingsBatchAtomic` call with no per-key
fallback; legacy and full-site runs use the same ledger port.
Inject failure at each Form/Menu/Page/entry/detail internal mutation boundary and
prove zero partial rows/revisions/cache effects. Prove exact intended IDs survive
kill-window recovery for all nine UUID-backed kinds; a returned-ID mismatch and
every legacy `id:null` prepared snapshot fail closed with zero natural-key
recovery. Assert the full intended-ID registry resolves forward and backward
package refs before canonical target preparation, and every item's exact before,
staged/final after and V1 action is durable before the first adapter write. Pin
both JSON helper exports with reordered object keys, ordered-array mismatch,
primitives/null and nested values, including a real JSONB round trip. Pin
canonical Form action
ID/order/round-trip behavior and facade/split export parity. Start Page and detail
Page update/rollback cases with different current and published documents plus
non-empty revision histories; after injected failure and explicit rollback,
assert exact current/published/publication/revision restoration. Pin that
`classifyInterruptedSagaItems` returns a hint for every preflighted item,
including noop and not-applied nodes, derives noop only from the source operation
without calling the resolver or an adapter/native read, and never exposes any
hint as mutation or outcome authority. Final L03 tests pin that every non-
completed create/update hint still reaches fresh exact-ID refinement, while noop
authority remains the global preflight's strict envelope, status/phase/null-staged
matrix and canonical equality between the complete before snapshot and top-level
final `id`/`desired` target with identical ID. Compatibility tests pin the legacy
array projection from `recoverInterruptedSagaItems`, while final L03 tests prove
that neither rollback nor `compensateItems` uses it for graph scheduling. Adapter
tests prove every executor mutation supplies a strict saga input and that only
the explicitly deprecated pre-L03 compensation shape reaches the base-input
compatibility branch.
For Page, entry and detail Page, pin the exact 100-revision acceptance boundary,
`limit + 1` rejection with the three safe overflow codes and no truncation, and
exact ordered revision restoration. For all nine atomic owners, mutate native
state after initial capture but before replace and prove locked CAS returns
`site_package_state_changed` with zero writes. Also mutate after rollback's fresh
expected-current capture but before `restoreSnapshotAtomic` and before
`deleteSnapshotAtomic`; prove the same fail-closed result with no partial restore/
delete, cache invalidation or audit effect. Race a direct settings writer after
capture but before both the apply batch and the raw restore batch; the table
lock/re-read must either serialize it or reject the batch before all writes, with
exactly one post-commit cache invalidation only on success. Crash-point tests pin
`prepared`, `staged`,
`publish_prepared` and `complete`: fresh state can equal only the durable before,
exact staged target or exact final target. Stage-commit and publish-commit cases
fail the next phase upsert, derive outcomes only from the unchanged raw DB row,
then resume from that durable outcome without using the in-memory overlay.

## Sub-Tasks

- [x] Implement an exhaustive
  `satisfies FullSiteResourceAdapterRegistry` map without
  editing L01's union/types file; add compile/runtime kind-coverage tests.
- [x] Add safe snapshots/equality/run items/cache effects.
- [x] Add targeted adapter DB tests.
- [ ] Split the adapter facade/tests and legacy entry service by the frozen
  cohesive ownership map; preserve public imports and keep every touched file at
  most 1,000 lines.
- [ ] Implement all nine exact-ID native atomic APIs, atomic conditional delete,
  canonical Form-action Tx path and the locked settings apply/raw-restore batch
  with failure-boundary and race tests.
- [ ] Persist two-pass durable intended UUIDs, complete target snapshots and
  dependency envelopes before mutation and
  make recovery reject every required-kind `id:null` snapshot fail-closed;
  classify noop directly from its source operation with zero resolver/native
  read and leave outcome authority to L03's global evidence preflight.
- [ ] Capture complete native-owner before snapshots independently of planner
  equality and prove divergent current/published/revision restoration, the exact
  revision cap/overflow behavior and locked replace/restore CAS races.

## Testing Requirements

- `set -a && source /home/coder/project/Coderso/.env && set +a`
- Use that command only to load DB/settings validation variables; never inspect,
  print, copy, hash or persist `.env` contents.
- `bunx vitest run --config vitest.config.ts tests/vitest/forms/formActionsContract.test.ts`
- `formActionsService.test.ts` uses unique per-test IDs and child-before-parent
  `finally` cleanup limited to its exact Form IDs; unqualified table deletes are
  forbidden.
- `bun test --timeout 360000 tests/unit/forms/formActionsService.test.ts tests/unit/forms/formAggregateService.test.ts tests/unit/menus/menuAggregateAtomicity.test.ts tests/unit/pages/pageLifecycleMutation.test.ts tests/unit/content/entryLifecycleMutationService.test.ts tests/unit/content/detailPageDocumentLifecycleMutation.test.ts`
- `bun test --timeout 360000 tests/unit/content/typeService.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/unit/content/listingTemplatesService.test.ts tests/unit/content/listingQueriesService.test.ts tests/unit/settings/fullSiteSettingsAtomicService.test.ts`
- `bun test --timeout 360000 tests/unit/kits/fullSiteResourceAdapters.test.ts tests/unit/kits/fullSiteAggregateAdapters.test.ts tests/unit/kits/fullSiteLifecycleAdapters.test.ts tests/unit/kits/fullSiteAdapterAtomicity.test.ts tests/unit/kits/fullSiteLifecycleUpdates.test.ts`
- the three native Page/entry/detail lifecycle suites above pin divergent
  current/published state, exact 100 and `limit + 1`; all nine native atomic
  suites pin replace/delete CAS, and the lifecycle adapter suites pin the
  capture-to-restore race with zero writes/effects
- existing Forms/Menu/Page/entry/detail service and runtime suites, read-only where
  their files are not L02-owned
- `bun --cwd core lint`, `bun --cwd core lint:types`, targeted strict security
  scan, and fresh `wc -l` over every L02-owned changed production/test file.

## Documentation Updates Required

Send resource lifecycle/snapshot notes to TASK-547-06.
