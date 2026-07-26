# TASK-547-02-L02: Native Resource Adapters and Saga Execution (Ledger Consumer)
# FileName: TASK-547-02-L02-Native-Resource-Adapters-And-Run-Ledger.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Native Resources
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-02-L01 plus the TASK-547-02-L03 pre-land
compatibility checkpoint
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
- `core/services/settings/settingsService.ts` owns the native setting key/value
  contract and object-shaped write normalizer;
- `core/services/settings/siteLocale.ts` owns the pure stored-write and public
  sink locale policies; and
- new `core/services/settings/fullSiteSettingsAtomicService.ts` owns exact raw
  capture plus validated apply and trusted raw-restore CAS batches.

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
`tests/unit/content/listingQueriesService.test.ts`; existing
`tests/unit/settings/settingsService.test.ts`; and new
`tests/unit/settings/fullSiteSettingsAtomicService.test.ts`.

Split the near-limit adapter suites by responsibility before adding cases.
`settingsService.ts` is already at the 1,000-line gate: replace/remove the weak
batch implementation before adding behavior, never append past the limit. Every
touched production/test file stays independently runnable and at most 1,000
lines. L02 kit tests may inject rollback adapters only for the executor seam;
dependency scheduling, claims and managed-identity behavior remain L03/L01.

**Forbidden for L02:** L01 shared types/planner/ledger/current resolver/legacy
composition and their tests; L03 rollback/compensation/service split/dependency/
crash-worker tests; tasks/changelog/shared docs. No L02 file imports install-run
tables or implements a second ledger.

The L03-owned `compensation.ts` bridge is already present before this leaf.
`execute.ts` imports its canonical `compensateItems` name and passes complete,
unfiltered source/prior sets freshly loaded through `listRawItems()`, plus the
locked `currentSource`. Raw DB rows remain immutable provenance; no phase overlay
becomes an item, parsed source, snapshot, action or outcome. L02 never imports an
L03 scheduler. The local input object may carry fields that the pre-land bridge
does not yet require; final L03 tightens the same entry point structurally.

The bridge is injected and fail-closed, not a native default. L02 `adapters.ts`
owns `FULL_SITE_ROLLBACK_ADAPTERS` and exact-ID nullable capture wrappers. For
the bridge it supplies per-item non-setting reversal plus one required
`reverseSettingsCompatibilityBatch({ items, actorId })` through the atomic settings
service; final L03 replaces it once with native `reverseSettingsBatch`. No per-key setting reversal, dummy/no-op, mutable
registration or import cycle is allowed. Missing adapters, malformed raw rows
and native failures throw. Deprecated base `AdapterApplyInput` and array
`recoverInterruptedSagaItems` exist only for this sequential gate; final L03
uses atomic restore/delete and `classifyInterruptedSagaItems` after preflight.

## Canonical Adapter And Form-Action Contract

`adapterTypes.ts` preserves the backward-compatible `AdapterApplyInput` shape for
the explicit pre-land bridge while adding exact discriminated
`FullSiteSagaAdapterPrepareInput` and `FullSiteSagaAdapterApplyInput` unions. A
create has `currentId:null`, a server-owned `intendedId:string` and
`expectedSnapshot:null`; an update has `currentId:string`, `intendedId:null` and
an immutable complete `expectedSnapshot` with the same ID. The apply union also
requires the exact complete `targetSnapshot` prepared and persisted before the
first native write. A create never overloads `currentId`. Validation-only calls
continue to use the base shape; every executor mutation constructs the strict
union.

The exact helpers `isFullSiteSagaAdapterApplyInput` and
`assertFullSiteSagaAdapterApplyInput` enforce own keys and the complete
operation/ID/target matrix before mutation. Only the pre-land bridge reaches the
deprecated base-input branch; executor/planner/preparation never do, and final
L03 uses atomic restore/delete. `adapterTypes.ts` also owns `FullSiteNativeSnapshot`,
`FullSitePreparedNativeTargets`, `RestoreSnapshotAtomicInput`,
`DeleteSnapshotAtomicInput`, `PublishSnapshotAtomicInput`,
`FullSiteNativeReversal`, `FullSiteSettingsApplyBatchInput`,
`ReverseSettingsBatchInput`, `ResourceAdapter`,
`LIFECYCLE_CAPABLE_PUBLISH_KINDS` and `isLifecycleCapablePublishKind`.
`adapters.ts` contains no domain implementation. It assembles and re-exports
`FULL_SITE_RESOURCE_ADAPTERS satisfies FullSiteResourceAdapterRegistry` plus
L02-owned `FULL_SITE_ROLLBACK_ADAPTERS`, including nullable exact-ID wrappers
that catch only each native owner's reviewed not-found code.

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

`settingsService.ts` owns exact export
`normalizeSettingValueForWrite(key, value): { key: SettingKey; value:
SettingValueMap[SettingKey] }`; its union includes string/null/boolean/number/
array/object values. `siteLocale.ts` owns `DEFAULT_SITE_LOCALE = "en"` and
`MAX_SITE_LOCALE_LENGTH = 255`. `normalizeStoredSiteLocaleForWrite` rejects
wrong-type, blank and over-bound input but returns an accepted string unchanged.
`getSetting` and `listSettings` likewise preserve the raw stored locale.
`normalizePublicSiteLocale` alone trims, bounds and accepts
`^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{1,8})*$`, then canonicalizes primary/script/
region/other subtags so `pl`, `pl-PL`, `es-419` and `zh-Hant` work.
`resolvePublicDocumentLanguage` falls back to `en`; `resolvePrimarySiteLanguage`
uses that same parser. TASK-547-04-L03 consumes these pure exports without editing them.
`settingsService.test.ts` pins raw/canonical examples, blank/wrong-type,
254/255/256 bounds, full-union/cache invalidation and a `360_000` ms DB timeout.

Both atomic mutations require identical sorted unique key sets. One transaction
takes `LOCK TABLE settings IN SHARE ROW EXCLUSIVE MODE`, re-reads exact raw
presence/value, compares `expectedCurrent`, then writes all or none. Apply uses
the object normalizer's `.key`/`.value`; trusted restore preserves raw JSON.
Mismatch throws `site_package_state_changed` with zero writes. Exactly one cache
invalidation follows commit and none follows failure. Weak
`applySettingsBatch`/`restoreSettingsBatchRaw` exports or imports are forbidden.
The setting adapter exposes only required `applySettingsBatchAtomic` and
`reverseSettingsBatch` paths over this service.

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

`prepareFullSiteSaga` receives the planner's exact private frozen `referencePlan`; it is two-pass and completes before `createRun`:

1. Without native writes, allocate/validate create IDs, use `currentId` for
   update/noop and setting keys, then complete the ID map before resolving refs.
2. Require exact identity/order/desired/dependency parity between operations and
   planned resources. For each, use the graph owner's descriptor resolver with
   the full ID map, strictly normalize, capture complete before state and call
   `prepareNativeTargets`. A create first proves exact-ID/key absence and records
   that absence as `beforeSnapshot:null`; for an absent setting this maps to the
   native raw state `{ key, present:false }`. An update/noop records its complete
   native snapshot, including exact raw setting presence/value. Validate that
   every staged/final target has the registry ID. A noop requires a current ID and
   exact capture and uses that snapshot as both `beforeSnapshot` and the complete
   top-level `id`/`desired` target inside the durable after envelope; the raw
   before/after JSON values are not equal.
3. Build all durable after envelopes/V1 actions and validate every before/after/
   ID invariant; any error returns before `createRun` and ledger/domain writes.

Only then may apply create the run. `initializeFullSiteSaga` accepts validated
`prepared` plus `runId`/ledger, persists it and never prepares. Native writes wait.

Remove generic `resolveFullSiteRefs`/`preflightFullSitePlan`; `preflight.ts`
retains native/current-state helpers, but production never recursively rescans refs.

Thus all nine UUID-backed creates receive the exact prepared ID; no DB/Node
fallback is reachable. Returned ID/state must equal the persisted target before
a later phase upsert.

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
Prepared creates resolve only by exact ID; every create/update projection remains
a hint, and every non-completed item reaches L03's complete-snapshot parse plus
fresh exact-ID refinement. Null/malformed/mismatched intended IDs throw
`site_package_recovery_missing_intended_id` before native access, never use a
natural-key fallback, and retain the L03-parsed raw row as immutable provenance.

The deprecated `recoverInterruptedSagaItems` keeps the base input/array result for
the isolated L02 gate and delegates hint construction to the classifier. It maps
an omitted legacy action to `null`, preserves input order, omits `not_applied`,
and returns the item for other hints without graph work. Final L03 rollback/
compensation calls only the classifier after raw-field and graph validation.

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

After preparation succeeds, apply creates the run with
`rollbackDependencySchemaVersion:1` beside the package fingerprint, then invokes
persistence-only initialization. L03 distinguishes current all-items-required evidence from legacy unknown evidence.

## Security Contract

Service only; resolve typed refs immediately before each native strict normalizer.
Nested preflight is reject-unknown. Form `settings.theme.submit` allows exactly `background,textColor,radius,fullWidth,label,supportingText`, preserving the latter and rejecting extras.
Listing-template root allows only `name,slug,description,layout,config`; config allows `fields,itemActions,emptyState,style`.
Its field/condition/action records allow only `key,source,label,fallback,format,conditions` / `id,field,op,value` / `id,label,kind,href,opensInNewTab`.
Its empty-state/style records allow only `title,description,ctaLabel,ctaHref` / `columns,gap,cardVariant`.
Detail bindings preserve `required:true` plus omitted (`undefined`) fallback; never synthesize null/static Aurora copy, so missing Aurora-only data fails closed as public 404.
Settings exclude secret/auth/provider namespaces; audit has safe keys/IDs/operations and intended IDs are server UUIDs, never package input.
No endpoint, migration, RBAC/CSRF/rate-limit change, media import or cross-domain transaction is added.

## Implementation Pseudocode

```ts
export async function applyFullSitePackage(input, overrides = {}) {
  assertActorUuidBeforeDb(input.actorId);
  const referencePlan = buildReferencePlan(input.package); // once; zero normalization
  // No default/override dependency, lock, ledger, resolver, adapter or DB access yet.
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const adapters = overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS;
  const execute = async () => {
    const plan = await planFullSiteInstall(
      input.package, referencePlan, createPlannerDeps(input, overrides, ledger, adapters),
    ); // supplied-plan overload: zero builds, exact array identity
    const saga = await prepareFullSiteSaga({ plan, referencePlan, adapters,
      actorId: input.actorId, generateId: () => crypto.randomUUID() });
    const run = await ledger.createRun(toRunInput(input));
    await initializeFullSiteSaga({ runId: run.id, prepared: saga.prepared, ledger });
    return finishPreparedApply({ input, run, saga, adapters, ledger });
  };
  return ledger.withPackageLock ? ledger.withPackageLock(input.package.key, execute) : execute();
}

export async function prepareFullSiteSaga({ plan, referencePlan, adapters, generateId, actorId }) {
  assertExactPlanAlignment(plan.operations, referencePlan);
  const intendedRegistry = new Map<FullSiteResourceIdentity, string>();
  const intents = new Map<FullSiteResourceIdentity, DurableCreateIntent>();
  for (const operation of plan.operations) {
    const intent = prepareDurableCreateIntent(operation, generateId);
    const id = operation.currentId ?? intent.intendedId ?? operation.key; // setting key
    assertPreparedIdentity(operation.kind, id);
    intendedRegistry.set(operation.identity, id);
    intents.set(operation.identity, intent);
  }

  const prepared = [];
  for (const [index, operation] of plan.operations.entries()) {
    const plannedResource = referencePlan[index]!;
    const intent = intents.get(operation.identity)!;
    const intendedId = intendedRegistry.get(operation.identity)!;
    const resolved = resolvePlannedPackageResourceRefs(plannedResource, intendedRegistry);
    const normalized = await validateFullSiteOperation({
      operation, plan,
      desired: resolved,
      actorId,
      adapter: adapters[operation.kind],
    });
    const beforeSnapshot = await captureCompleteBeforeSnapshot({ operation, intendedId, adapters });
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
  return { prepared, intendedRegistry };
}
export async function initializeFullSiteSaga({ runId, prepared, ledger }) {
  for (const item of prepared) {
    await ledger.recordItem(toPreparedLedgerItem(runId, item));
  }
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

The complete target was durable from persistence-only initialization; phase upserts only record
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

After the claim, both raw sets flow unchanged into L03's zero-native preflight;
no caller reduces identities, trusts status alone or installs a phase overlay.
The apply catch invokes compensation after complete item-set initialization even
with no success phase; durable evidence, not `completed.length`, decides reversal.
Initialization failure marks only the source failed. A later source-finalization
failure leaves rollback resumable; retry still orders source-failed before success.

Menu Page/item references are resolved before `validateDesired`; the complete
resolved Menu (base row, items, document, appearance, extras and draft status) is
passed once to `mutateMenuAggregateAtomic`. There is no executor-level Menu
wiring write before or after that call. Publish is the only later Menu mutation.

Data flow: normalized input -> actor -> one private graph build -> dependency/lock
acquisition -> planning -> UUID registry -> allowlisted substitution/native targets
-> run/durable evidence -> local CAS/phases -> publish-last/reversible settings.
Known errors retain codes; unexpected errors redact; L03 owns compensation.

Regression tests cover every operation. A noop requires current ID/complete
capture, registers that ID, performs zero native work and persists a durable
envelope with equal top-level final state, V1 recovery, null staged target and
`prepared`→`complete` phase-only change while staying in compensation evidence.
L02 and L03 tests import the shared frozen V1 status/phase export, accept every
one of the exact six rows, and reject its remaining Cartesian product and
staged-target violations; neither suite duplicates a local matrix. The item-fail
catch proves no `failed` item upsert occurs and only run finalization changes.
The L02-owned `tests/unit/kits/fullSiteLifecycleUpdates.test.ts` proves typed
apply performs zero normalizations and one graph build before any default/
override dependency, lock or DB access; graph failure makes zero planner/
dependency/lock/DB calls, and public input/deps reject a plan field. The exact
frozen array reaches three-argument planning/preparation with zero rebuild/clone/
second walker; this suite does not assert CLI call counts.
Before `createRun`, every preparation failure proves zero writes; pin complete
prepared rows and that retired generic preflight/resolver stays unused. Nested refs
persist as IDs. Form preflight round-trips `submit.supportingText` and rejects a sibling extra; listing tests reject an extra at every nested record above.
Detail tests keep `required:true` plus absent fallback through normalize/target persistence and fail a missing value rather than painting Aurora defaults.
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
  cohesive ownership map; preserve public imports and the 1,000-line gate.
- [ ] Make nested full-site preflight strict for listing records and
  `submit.supportingText`; split raw stored-locale writes/reads from canonical
  public locale resolution, with exact boundary and compatibility tests.
- [ ] Build the reference graph before ledger/default/lock access, then pass that
  exact array through three-argument planning, two-pass pre-run preparation and
  persistence-only initialization.
- [ ] Implement all nine exact-ID native atomic APIs, atomic conditional delete,
  canonical Form-action Tx path and the locked settings apply/raw-restore batch
  with failure-boundary and race tests.
- [ ] Persist durable intended UUIDs/dependency envelopes/complete targets;
  classify source noops with zero resolver/native read; capture complete owner
  before snapshots; reject required-kind `id:null`, revision overflow and CAS
  races fail-closed while leaving outcome authority to L03's global preflight.

## Testing Requirements

- `set -a && source /home/coder/project/Coderso/.env && set +a`
- Use that command only to load DB/settings validation variables; never inspect,
  print/copy/hash/persist them; every DB command and test-local timeout is at least `360000`.
- `bunx vitest run --config vitest.config.ts tests/vitest/forms/formActionsContract.test.ts`
- `formActionsService.test.ts` uses unique per-test IDs and child-before-parent
  `finally` cleanup limited to its exact Form IDs; unqualified table deletes are
  forbidden.
- `bun test --timeout 360000 tests/unit/forms/formActionsService.test.ts tests/unit/forms/formAggregateService.test.ts tests/unit/menus/menuAggregateAtomicity.test.ts tests/unit/pages/pageLifecycleMutation.test.ts tests/unit/content/entryLifecycleMutationService.test.ts tests/unit/content/detailPageDocumentLifecycleMutation.test.ts`
- `bun test --timeout 360000 tests/unit/content/typeService.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/unit/content/listingTemplatesService.test.ts tests/unit/content/listingQueriesService.test.ts tests/unit/settings/settingsService.test.ts tests/unit/settings/fullSiteSettingsAtomicService.test.ts`
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
