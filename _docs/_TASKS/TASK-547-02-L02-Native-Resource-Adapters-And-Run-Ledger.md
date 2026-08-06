# TASK-547-02-L02: Native Resource Adapters and Saga Execution (Ledger Consumer)
# FileName: TASK-547-02-L02-Native-Resource-Adapters-And-Run-Ledger.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Solution Kits / Native Resources
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-02-L01 plus the TASK-547-02-L03 pre-land
compatibility checkpoint
**Status:** 🚧 In Progress
**Validation:** Corrective adapter/executor work and fresh L02-owned targeted
gates are pending.

## Overview

Add cohesive adapters for Page Templates, entries, listing templates/queries,
detail pages, form actions and allowlisted settings. Extend install item kinds,
snapshots and audit summaries without using the frozen widget-template phase.
Correct the crash window by durably preparing every exact native target and
every nondeterministic create ID before mutation, and replace adapter-level
multi-call repair with native domain-local atomic APIs.

The historical physical filename retains `Run-Ledger`, but this leaf is only a
ledger consumer. L01 exclusively owns the port, concrete persistence, locking and
listed-row/initialization-plan types; L02 owns bounded dry-run orchestration,
complete native snapshot capture, prepared-row mapping and saga execution.

Consume L01's exported ledger port and concrete DB implementation by injection.
Do not create or edit a `ledger.ts`, redeclare the interface, add another
implementation, edit default legacy composition or directly write ledger tables.
Complete rollback snapshots store the native ID and canonical native-owner state
used only for exact recovery and restoration checks. They are never L01's
planner-equality `FullSiteInstallPlanItem.currentDesired` projection.

**Exact full-site production ownership:**

- `core/services/kits/fullSiteInstall/adapters.ts` becomes a bounded registry/compatibility facade;
- new `core/services/kits/fullSiteInstall/adapterTypes.ts` owns only adapter types, `FullSiteNativeSnapshot`, lifecycle-kind guards and Bun-free shared helpers;
- new `core/services/kits/fullSiteInstall/aggregateAdapters.ts` owns content type, Form, Page Template, listing template/query and settings adapters;
- new `core/services/kits/fullSiteInstall/lifecycleAdapters.ts` owns entry, detail Page, Page and Menu adapters; and
- `core/services/kits/fullSiteInstall/execute.ts`, `staging.ts`, `preflight.ts` and `nestedValidation.ts`.

**Exact native-domain production ownership:**

- `core/services/forms/formActionsContract.ts`, `core/services/forms/formActionsService.ts`, `core/services/forms/formsService.ts`, and new `core/services/forms/formAggregateService.ts`;
- `core/services/menus/menuService.ts`;
- `core/services/pages/pageService.ts` and `core/services/pages/revisionService.ts`;
- `core/services/content/detailPageDocumentService.ts` and `core/services/content/detailPageRevisionService.ts`;
- `core/services/content/typeService.ts`, `core/services/pages/pageTemplateLibraryService.ts`, `core/services/content/listingTemplatesService.ts`, and `core/services/content/listingQueriesService.ts` own exact-ID atomic create, replace and conditional-delete paths;
- `core/services/content/listingTemplateConfig.ts` owns the Bun-free strict `normalizeListingTemplateWriteInput` used by `aggregateAdapters.ts`/`adapters.ts`;
- legacy `core/services/content/entryService.ts` plus new extracted `core/services/content/entryLifecycleMutationService.ts`; preserve public imports/re-exports while splitting below 1,000 lines;
- `core/services/settings/settingsService.ts`, pure locale owner `core/services/settings/siteLocale.ts`, and new exact raw batch/CAS owner `core/services/settings/fullSiteSettingsAtomicService.ts`;
- live reverse-FK writer owners `core/services/themes/themeProfileService.ts`, `core/services/forms/submissionService.ts`, `core/services/customScreens/customScreenService.ts`, `core/services/customScreens/screenEntryPresentationOverrides.ts`, and `core/services/content/taxonomyService.ts`;
- `core/services/admin/usersService.ts` for the existing user-delete boundary; and
- `core/services/tools/importExportService.ts` and `core/services/backups/backupService.ts` for their existing whole-config transaction boundaries only.

**Exact test ownership:**

- kits: existing `tests/unit/kits/fullSiteResourceAdapters.test.ts`, `tests/unit/kits/fullSiteAdapterAtomicity.test.ts`, `tests/unit/kits/fullSiteLifecycleUpdates.test.ts`; new `tests/unit/kits/fullSiteAggregateAdapters.test.ts`, `tests/unit/kits/fullSiteLifecycleAdapters.test.ts`, and `tests/unit/kits/nativeCmsWriterFenceInventory.test.ts`;
- Forms/Menu: existing `tests/vitest/forms/formActionsContract.test.ts`, `tests/unit/forms/formsService.test.ts`, `tests/unit/forms/formActionsService.test.ts`, `tests/unit/menus/menuService.test.ts`; new `tests/unit/forms/formAggregateService.test.ts` and `tests/unit/menus/menuAggregateAtomicity.test.ts`;
- Page/content lifecycle: existing `tests/unit/pages/pageService.test.ts`, `tests/unit/pages/revisionService.test.ts`, `tests/unit/content/detailPageDocumentService.test.ts`; new `tests/unit/pages/pageLifecycleMutation.test.ts`, `tests/unit/content/detailPageRevisionService.test.ts`, `tests/unit/content/detailPageDocumentLifecycleMutation.test.ts`, and `tests/unit/content/entryLifecycleMutationService.test.ts`;
- aggregate/settings: existing `tests/unit/content/typeService.test.ts`, `tests/unit/pages/pageTemplateLibraryService.test.ts`, `tests/unit/content/listingTemplatesService.test.ts`, `tests/unit/content/listingQueriesService.test.ts`, `tests/unit/settings/settingsService.test.ts`; new `tests/unit/settings/fullSiteSettingsAtomicService.test.ts`; and
- live reverse-FK writers: existing `tests/unit/themes/themeProfileService.test.ts`, `tests/unit/forms/submissionService.test.ts`, `tests/vitest/customScreens/customScreenService.test.ts`, `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`, and `tests/unit/content/taxonomyService.test.ts`;
- foreign-key/fence races: existing `tests/unit/admin/usersService.test.ts`; new independently runnable serial `tests/integration/kits/fullSiteNativeForeignKeyRacesDb.test.ts` and focused `tests/integration/kits/fullSiteContentTypePseudoFkExplainDb.test.ts`; and
- whole-config transactions: existing `tests/unit/tools/importExport.test.ts` and `tests/unit/backups/backupService.test.ts`.

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
rollback-relevant revision rows under the native retention policy. Form includes base,
fields and canonical actions only after `assertFormActionsSafeForDurableSnapshot`
recursively checks every action string with L01's pure forbidden-value classifier,
including condition, email, webhook URL/header/body, template/mapping, redirect and
message strings. Only webhook header names use `isSensitiveFieldKey`; any match rejects.

A match in any before/staged/complete Form action set throws fresh cause-free
`site_package_invalid` before constructing an item snapshot or calling
`initializeReservedRun`, with zero domain/cache/audit writes. The already-created
owner reservation contains only L01's private lock metadata and is finalized
through the owner-gated failure path; it stores no Form/action value, ID, config,
snapshot or redacted/encrypted placeholder. Errors/logs disclose none of those
values. Allowed headers remain unchanged in canonical capture, CAS and restore.
Submissions and unrelated audit rows are excluded. Unowned timestamps are
excluded consistently; owned publication metadata and bounded revisions remain.

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

## Native CMS Writer Fence

L01's `core/db/nativeCmsWriterFence.ts` is the sole owner of advisory pair
`548/0`, its private owner-generation context, and exact export
`acquireNativeCmsWriterFence(tx)`. L02 imports that helper; it never redeclares
SQL, constants, marker codecs or context state. Closing/revoked/lost owner
context fails cause-free as `native_cms_writer_fence_lost` before executor/DB
I/O.

Every ordinary protected mutation owns one complete `READ COMMITTED`
domain-local transaction and invokes the L01 helper as callback statement one,
before validation reads, row locks or DML. The helper first runs
`pg_try_advisory_xact_lock_shared(548, 0)`: contention returns retryable
`native_cms_writer_fence_busy` immediately with zero census/later DB. A `true`
result keeps the shared lock and runs one bounded active-marker census: zero
allows domain work; any valid, malformed, impossible or duplicate marker throws
`native_cms_writer_recovery_required`; census executor/driver/result failure is
`native_cms_writer_fence_failed`. It never waits on a session lock. An installer
native transaction instead uses its private live
owner context; statement one locks the exact current
`solution_kit_install_runs` owner row `FOR SHARE`, validates its private
generation from reserved option
`nativeCmsWriterFenceV1:{schemaVersion:1,generation:<UUID>}` plus running/owned
status, and holds that row lock through commit. It does not skip SQL. Any
stale/missing/mismatched marker or fence failure is fresh, cause-free and
produces zero later domain/cache/audit effects. That private marker is preserved
by patches but stripped from all public reads, logs and audit.

All related reads and writes use the same transaction. A public writer owns exactly one transaction and statement-one acquisition; its `*Tx` body accepts that handle and opens neither another transaction nor another fence. This applies to every native atomic path and to the live reverse-FK families: all profile/route writers in `themeProfileService.ts`; `submitForm`; Custom Screen create/update/delete; override save plus every cleanup writer; and taxonomy config/term/assignment writers. `prepareEntryTaxonomyMutation`/`applyEntryTaxonomyMutation` remain Tx helpers used by the already-fenced entry mutation. `importConfig` and `restoreBackup` acquire once in their outer transaction, then call `importConfigTx`/`restoreArtifactTx`; backup may transitively call import but never nests.

After the fence and before FK DML, theme-route writers lock every referenced Page, submission writers the Form, Custom Screen and taxonomy writers the ContentType, and presentation-override/taxonomy-assignment writers the Entry `FOR KEY SHARE`; multiple roots use stable ascending ID order. The lock, validation reads and DML share the one transaction and missing/mismatched roots reject with the owner's safe domain code and zero DML/cache/audit effect. Deleting a reference row is still fenced; it does not invent an unnecessary parent lock.

The exhaustive `nativeCmsWriterFenceInventory.test.ts` classifies every direct Drizzle/raw DML, public-wrapper-to-Tx delegation, production Tx-helper caller and schema-derived incoming-FK/cascade effect. Its exact inventory includes the five families above; nine managed roots; Form fields/actions; Menu children; Page/entry/detail revisions; allowlisted settings; User deletion; root deletes for Page/Entry/Form/ContentType; and intended cascades. No wildcard, directory allowance or pending classification passes. L01/L03 foreign paths are explicit by land order. The fence rollout is mixed-version incompatible: drain old writers before reservations and deploy rollback on the coordinated boundary.

## Domain-Local Atomic APIs

Freeze these exact exported helpers and filenames; none accepts an installer or
cross-domain transaction object:

- content: `typeService.ts/mutateContentTypeAtomic`,
  `listingTemplatesService.ts/mutateListingTemplateAtomic`,
  `listingQueriesService.ts/mutateListingQueryAtomic`,
  `entryLifecycleMutationService.ts/mutateEntryLifecycleAtomic`, and
  `detailPageDocumentService.ts/mutateDetailPageDocumentLifecycleAtomic`;
- Form/Menu/Page: `formAggregateService.ts/mutateFormAggregateAtomic`,
  `menuService.ts/mutateMenuAggregateAtomic`,
  `pageService.ts/mutatePageLifecycleAtomic`, and
  `pageTemplateLibraryService.ts/mutatePageTemplateAtomic`; and
- settings: `fullSiteSettingsAtomicService.ts` exports
  `captureFullSiteSettingsBatchRaw`, `applyFullSiteSettingsBatchAtomic`, and
  `restoreFullSiteSettingsBatchRawAtomic`.

Each mutation input is the exact closed `create`/`replace`/`delete` union:
create has `{id,desired,actorId}`; replace adds `expectedCurrent`; delete has
`{id,expectedCurrent,actorId}`. The result is `{id,snapshot}`, where `snapshot`
is null only after conditional delete.

The domain owns distinct concrete `TDesired` and `TNativeSnapshot` types; it must not import full-site package types or pretend install desired data is a complete native snapshot. Every helper opens `db.transaction`, invokes the owner-aware fence helper first, then fully normalizes/validates the target, uses the caller-supplied ID on create, and locks/re-reads the exact row plus every owned aggregate/lifecycle row on replace or delete.
It canonical deep-compares that complete state with the immutable
`expectedCurrent`; any mismatch throws `site_package_state_changed` before the
first write. Create/replace consumes the exact precomputed target, including any
preallocated native child/revision identity or publication value, and returns the
same ID plus its complete canonical snapshot. Delete removes only the aggregate
whose complete locked state still equals `expectedCurrent` and returns null.
Cache invalidation/audit side effects occur only after commit.
An injected error at every internal write boundary leaves the exact pre-call
domain snapshot. No compensating catch sequence may emulate a transaction.

Every native replace/delete takes locks in one universal order: owner-row lock
or ordinary shared fence as SQL statement one; managed root `FOR UPDATE` (never
`FOR NO KEY UPDATE`); owned child/revision rows in stable order; exact snapshot
CAS; reverse-reference guards; then DML. FK inserters take `FOR KEY SHARE` on the
referenced root before their insert, making either race ordering safe.

- Page conditional delete rejects any `menu_items.page_id` or
  `theme_routes.page_id` reference with fresh cause-free
  `site_package_state_changed` and zero writes. Ordinary `deletePage` preserves
  its `SET NULL` behavior but is shared-first.
- Entry conditional delete rejects
  `custom_screen_entry_presentation_overrides` and
  `content_term_assignments`; ordinary delete preserves cascades but is
  shared-first.
- Form native delete rejects submissions/action runs. Replace diffs action IDs,
  updates retained rows in place, and locks each removed action `FOR UPDATE`
  before rejecting a `form_action_runs` reference. It never delete-all/reinserts;
  intended field/action cascades occur only after all guards.
- Content-type public/native delete and each slug-changing public/native replace move the root read and every guard into one owner-aware transaction, root `FOR UPDATE` first. Delete guards entries, custom screens, taxonomies, detail pages and listing-query JSON `contentTypeId`; delete and rename lock the exact `site.contentRoutes` settings row `FOR UPDATE` and reject a route using the old slug with cause-free `content_type_has_content_routes`. Neither path side-writes settings; an unchanged normalized slug skips only that rename guard, never its mutation's fence/root lock. Each listing-query create/update carrying `contentTypeId` locks that exact content-type row `FOR KEY SHARE` in the same fenced transaction and rejects missing before DML.
- `deleteUser` becomes one shared-first transaction: user `FOR UPDATE`, then
  role/last-admin checks and delete on the same handle. This serializes the
  `SET NULL` effects on `pages.authorId`, `content_entries.authorId` and
  `detail_page_revisions.createdBy`.
- Menu/Page/entry/detail mutation keeps its complete lifecycle ownership;
  publish compares the exact staged aggregate and consumes the durable target.
  Page Template, listing template/query and content type retain public wrappers
  over the same ordered native atomics. Settings restore stays one batch.
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

Every `site.contentRoutes` write uses one shared Tx helper: single `setSetting`/`deleteSetting`, batch `setSettings`, outer `setSettingsTx`, `importConfig`/`importConfigTx`, `restoreBackup`/`restoreArtifactTx`, and `applyFullSiteSettingsBatchAtomic`/`restoreFullSiteSettingsBatchRawAtomic`. For a present target, after the statement-one fence and before any settings-row lock/upsert, it extracts the unique ContentType slugs, resolves every existing row in one bounded query, rejects a missing/duplicate resolution with the safe settings/domain code and zero writes, then locks the exact rows `FOR KEY SHARE` in stable ascending ID order. The trusted raw restore inspects the exact target without canonicalizing or rewriting accepted JSON. A delete/absent target has no referenced roots but follows the same outer transaction and post-commit-only cache contract. Every wrapper and Tx caller is explicit in the static inventory; import and backup never reacquire.

Both atomic mutations require identical sorted unique key sets. After the shared-fence helper, one transaction takes `LOCK TABLE settings IN SHARE ROW EXCLUSIVE MODE`, re-reads exact raw presence/value, compares `expectedCurrent`, then writes all or none. Apply uses the object normalizer's `.key`/`.value`; trusted restore preserves raw JSON.
Mismatch throws `site_package_state_changed` with zero writes. Exactly one cache invalidation follows commit and none follows failure. Weak `applySettingsBatch`/`restoreSettingsBatchRaw` exports or imports are forbidden. The setting adapter exposes only required `applySettingsBatchAtomic` and `reverseSettingsBatch` paths over this service.

**Conditional JSON pseudo-FK no-migration gate:** `typeService.ts` owns one canonical builder for the bounded `LIMIT 1` listing-query reference SELECT using the exact production predicate ``listing_queries.query->'sourceConfig'->>'contentTypeId' = $id``; delete and the focused DB test compile that owner rather than duplicating JSON SQL. The current no-migration decision is valid only if sequential sanitized `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` runs against the exact bound production SELECT pass every budget:

| Profile | Owned fixture / absent target | Server execution | Root rows | Scanned-row work | Root shared buffers |
| --- | --- | ---: | ---: | ---: | ---: |
| Small | 64 listing queries | <= 100 ms | = 0 | <= 5,000 | <= 2,048 |
| Representative large | 10,000 listing queries | <= 250 ms | = 0 | <= 25,000 | <= 20,480 |

The test imports L01's pure `parseManagedEvidenceExplainMetrics` owner, emits only profile/count/four-number summaries, preallocates and cleans exact fixture IDs, and never records plans, SQL, parameters, UUIDs or JSON. It separately pins one matching reference and one absence result. Passing both profiles retains no schema change. Any latency/row/buffer failure blocks L02; only then may a separate reviewed index migration proceed, atomically including schema export, SQL, snapshot and journal artifacts plus fresh plans. Fixtures/ceilings may not be reduced or raised to preserve a no-migration claim.

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

L01's port derives and owns the strict initialization manifest from the same
cloned prepared rows it inserts. L02 supplies no manifest JSON and L03 imports
L01's strict reader. Any manifest/complete-row mismatch fails closed.

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
untouched. Because initialization committed, it enters durable automatic
compensation; only complete compensation may atomically fail the source/remove
its marker, while partial work leaves it running/marked. Completed items stay
success.

Pure package normalization and one frozen `referencePlan` build may precede the
lock because they perform no dependency/adapter/DB work. L01's richer
`withPackageLock` descriptor creates or claims the actual owner run marker under
its holder transaction locks before invoking the callback and before all DB
planning. Its discriminated apply callback receives only
`{intent:"apply",ownerRunId,resumePhase:"reserved"|"initialized"}`; generation
stays private. Apply/dry-run own their source marker. Automatic compensation has
no child marker and continues under that source owner's context.

Only `resumePhase:"reserved"` may plan and prepare; `prepareFullSiteSaga` receives
the planner's exact frozen `referencePlan`. Preparation is two-pass:

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
   ID invariant.

Only then may apply call required `initializeReservedRun` once with that exact
`ownerRunId` and complete prepared mapping. L01 validates the live context
generation, updates only the exact still-owned reservation and inserts all items
set-based in one transaction; there is no create/sequential fallback. It preserves
exact `native_cms_writer_fence_lost`/`native_cms_writer_fence_failed`; exact
ambiguous committed state returns success, confirmed rollback alone returns
`site_package_ledger_initialization_failed`, and partial/unresolved state retains
the marker. `resumePhase:"initialized"` skips planner, preparation,
`initializeReservedRun` and every native apply call and enters durable recovery
(dry-run terminal recovery or apply automatic compensation) from the exact
manifest/items.

One phase policy covers the entire callback. Deterministic validation/planning/
preparation failure, or confirmed-rolled-back initialization, has zero native
effects and finalizes the owner failed/removes its marker. Initialized, partial,
ambiguous or potentially native-effecting work enters/retains durable recovery
with the owner running/marked until compensation/finalization is exact. Every
later ledger write remains owner-gated. The caller's `finalizeOwnedRun`
invocation is the final callback DB invocation. L01's private captured-lease ambiguous-commit reread stays inside that same invocation; no caller recovery, ledger or native I/O occurs after closing. Successful callers map the result without DB I/O: only `desired_terminal` permits return; `different_terminal` throws fresh cause-free `site_package_recovery_conflict`.

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
  hint: "not_applied" | "applied" | "already_recovered" | "noop";
};
export async function classifyInterruptedSagaItems(input: { items: readonly PersistedFullSiteInstallLedgerItem[]; resolveCurrentResource: FullSiteCurrentResourceResolver }): Promise<readonly FullSiteSagaRecoveryClassification[]>;
export async function recoverInterruptedSagaItems(input: { items: readonly FullSiteInstallLedgerItem[]; resolveCurrentResource: FullSiteCurrentResourceResolver }): Promise<FullSiteInstallLedgerItem[]>; // deprecated pre-L03 gate only
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

The classifier branches on source operation: noop emits its ordered identity/item
with diagnostic `hint:"noop"` and no resolver/native access; create/update call
`classifyCreateOrUpdateHintByExactId`. L03 still performs all authoritative
evidence parsing and complete-state refinement.

At initialization, apply passes `rollbackDependencySchemaVersion:1`, package
metadata and the complete ordered rows to L01. L01 adds the derived manifest
atomically to that reservation. L03 accepts only the exact set; prefixes fail.

L02 alone owns `assertExactOwnedRunFinalizationResult` and
`requireDesiredOwnedRunFinalization`; they consume L01's owner-gated
`finalizeOwnedRun` and never implement SQL. The validator accepts only a direct
plain exact-one-key `{outcome}` with the two frozen values. The second helper
returns only for `desired_terminal`; valid `different_terminal`, malformed result
or exhausted/ambiguous finalization never reports success, and the former maps
exactly to `site_package_recovery_conflict`. Dry-run body work never reruns or
writes native state; an initialized takeover uses its durable terminal-recovery
branch. Deterministic failure cleanup catches only the finalizer result/error to preserve the preexisting primary and performs zero I/O afterward.

## Security Contract

Service only. Resource-root ownership is strict and non-interchangeable. A package `page` desired value is a direct plain object with exactly `title,slug,status,data`; it rejects `document` even when that wrong-root value contains no refs.
A `page_template` keeps its own strict desired envelope, accepts `document` and rejects `data`. Neither adapter aliases, translates or falls back to the opposite root.
TASK-547-04-L01 native-normalizes Page placeholders before attaching refs. This service resolves graph-approved refs in `desired.data` first, then the PageDocumentV2 owner strictly validates that resolved `desired.data` before target preparation.
Native Page create/update receives exactly `title,slug,data`; package `status` is excluded from that payload and exclusively selects draft staging plus publish-last.
Nested preflight is reject-unknown. Form `settings.theme.submit` allows exactly `background,textColor,radius,fullWidth,label,supportingText`, preserving the latter and rejecting extras.
Listing-template root allows only `name,slug,description,layout,config`; config allows `fields,itemActions,emptyState,style`.
Its field/condition/action records allow only `key,source,label,fallback,format,conditions` / `id,field,op,value` / `id,label,kind,href,opensInNewTab`.
Its empty-state/style records allow only `title,description,ctaLabel,ctaHref` / `columns,gap,cardVariant`.
Detail bindings preserve `required:true` plus omitted (`undefined`) fallback; never synthesize null/static Aurora copy, so missing Aurora-only data fails closed as public 404.
Settings exclude secret/auth/provider namespaces; audit has safe keys/IDs/operations and intended IDs are server UUIDs, never package input.
Sensitive existing/planned Form strings or header names fail before item writes;
plaintext never reaches run options, snapshots, actions, errors or audit.
No endpoint, RBAC/CSRF/rate-limit change, media import or cross-domain transaction is added. No migration is retained only while the JSON pseudo-FK plan gate passes; failure requires the separate complete migration contract above.

## Implementation Pseudocode

```ts
async function ordinaryManagedWriter(input) {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx); // statement 1: try-shared or owner row
    return validateLockAndMutateTx(tx, input);
  });
}
export async function importConfig(bundle) {
  return db.transaction(async (tx) => {
    await acquireNativeCmsWriterFence(tx); // statement 1
    return importConfigTx(tx, bundle);
  });
}
// restoreBackup uses the same outer shape, then restoreArtifactTx(tx, artifact).
// Every native atomic helper uses it; installer context locks its owner row FOR SHARE.

async function reverseFkWriterTx(tx, referencedIds, input) {
  const roots = await selectRootIdsForKeyShare(tx, referencedIds, {
    orderBy: "id ASC",
  }); // owning domain selects its Page/Form/ContentType/Entry table
  assertExactReferencedRoots(roots, referencedIds); // safe missing code, zero DML
  return mutateReferenceRowsTx(tx, input);
}
async function writeContentRoutesTx(tx, exactTarget) {
  const slugs = readUniqueContentTypeSlugsWithoutRewriting(exactTarget);
  await lockExactContentTypesBySlugForKeyShare(tx, slugs, { orderBy: "id ASC" });
  return lockThenWriteSettingsRowTx(tx, "site.contentRoutes", exactTarget);
}
async function replaceContentTypeSlugTx(tx, id, target) {
  const current = await lockContentTypeForUpdate(tx, id); const routes = target.slug === current.slug ? null : await lockContentRoutesSettingForUpdate(tx); // root -> setting
  if (routes && routesReferenceSlug(routes, current.slug)) throw new Error("content_type_has_content_routes"); else return replaceContentTypeRowTx(tx, current, target); // never rewrites routes
}

export async function applyFullSitePackage(input, overrides = {}) {
  assertActorUuidBeforeDb(input.actorId);
  const referencePlan = buildReferencePlan(input.package); // once; zero normalization
  // No default/override dependency, lock, ledger, resolver, adapter or DB access yet.
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const adapters = overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS;
  const rollbackAdapters = overrides.rollbackAdapters ?? FULL_SITE_ROLLBACK_ADAPTERS;
  const reservationOptions = toSafeReservationOptions(input);
  const dryRun = input.dryRun === true;
  return ledger.withPackageLock({
    intent: "apply",
    packageKey: input.package.key,
    actorId: input.actorId,
    dryRun,
    options: reservationOptions,
  }, async (context) => {
    if (context.intent !== "apply") throw new Error("site_package_invalid");
    if (context.resumePhase === "initialized") {
      return recoverInitializedOwnerFromDurableLedger({
        input, dryRun, context, ledger, adapters: rollbackAdapters,
      }); // its `finalizeOwnedRun` call is the final callback DB invocation
    }
    let saga: PreparedFullSiteSaga;
    let run: Readonly<{ id: string }>;
    try {
      const plan = await planFullSiteInstall(
        input.package, referencePlan, createPlannerDeps(input, overrides, adapters),
      );
      saga = await prepareFullSiteSaga({ plan, referencePlan, adapters,
        actorId: input.actorId, generateId: () => crypto.randomUUID() });
      run = await ledger.initializeReservedRun({
        ownerRunId: context.ownerRunId, packageKey: input.package.key,
        actorId: input.actorId, dryRun,
        options: reservationOptions,
        items: saga.prepared.map(toInitializedLedgerItem),
      }); // exact ambiguous commit may return this same owner
    } catch (primary) {
      const safe = toSafeFullSiteErrorCode(primary);
      if (isDeterministicPreNativeFailure(safe) ||
          safe === "site_package_ledger_initialization_failed") {
        await finalizeFailedOwnerPreservingPrimary(ledger, {
          ownerRunId: context.ownerRunId, status: "failed", error: safe,
        }, primary);
      }
      throw primary; // fence/partial/unresolved state retains running marker
    }
    if (dryRun) {
      await requireDesiredOwnedRunFinalization(ledger, {
        ownerRunId: run.id, status: "success", error: null,
      }); // final callback DB invocation; only DB-free outcome mapping follows
      return toDryRunResult(run, saga);
    }
    let result: ApplyFullSitePackageResult;
    try {
      result = await executePreparedPlanWithDomainAtomicAdapters({
        input, run, saga, adapters, ledger, ownerRunId: context.ownerRunId,
      });
    } catch (primary) {
      return recoverInitializedOwnerFromDurableLedger({
        input, dryRun, context, ledger, adapters: rollbackAdapters, primary,
      });
    }
    await requireDesiredOwnedRunFinalization(ledger, {
      ownerRunId: run.id, status: "success", error: null,
    }); // final callback DB invocation; only DB-free outcome mapping follows
    return result;
  });
}

function createPlannerDeps(input, overrides, adapters) {
  return {
    loadPlanningSnapshot:
      overrides.loadPlanningSnapshot ??
      createDefaultFullSitePlanningSnapshotLoader(input.package.key),
    normalizeDesired: createAdapterPlanningNormalizer(input.actorId, adapters),
    allowSettingTakeover: input.allowSettingTakeover,
  }; // one required batch boundary; no per-resource production fallback
}
function createDefaultFullSitePlanningSnapshotLoader(packageKey) {
  return createFullSitePlanningSnapshotLoader({
    packageKey, withReadTransaction: (read) => db.transaction(async (tx) => {
      await acquireNativeCmsWriterFence(tx); // statement one
      return read({ findEvidence: (input) => findManagedResourceEvidenceBatch(tx, input),
        readNative: (input) => readFullSitePlanningResourcesBatch(tx, input) });
    }, { isolationLevel: "read committed" }),
  }); // one bound handle; no global reader fallback
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
function assertExactOwnedRunFinalizationResult(value: unknown): FullSiteOwnedRunFinalizationResult;
export async function requireDesiredOwnedRunFinalization(ledger, input): Promise<void> {
  const result = assertExactOwnedRunFinalizationResult(
    await ledger.finalizeOwnedRun(input), // caller's final callback DB invocation; later mapping is DB-free
  );
  if (result.outcome !== "desired_terminal") {
    throw new Error("site_package_recovery_conflict");
  }
}

await executePreparedNonSettings({
  prepared, adapters, ledger, actorId, ownerRunId,
}); // strict input, target CAS, returned-ID check, owner-gated phase upsert
await applyPreparedSettingsBeforePublish({
  prepared, settingAdapter: adapters.setting, ledger, actorId, ownerRunId,
}); // final reversible non-noop batch; noops are phase-only and never join it
await publishPreparedLifecycleLast({
  prepared, adapters, ledger, actorId, ownerRunId,
}); // final operation: durable publish_prepared -> exact publish target -> complete
```

The complete target was durable from reserved-run initialization; phase upserts only record
transition progress and preserve the same top-level complete snapshot, optional
staged snapshot and V1 action values.

L02 also freezes automatic apply-failure finalization:

```ts
async function compensateFailedApply(input: CompensateFailedApplyInput) {
  const source = await requireCurrentApplySource(input.ownerRunId, input.ledger);
  const claim = await claimAutomaticRollback(source, input);
  if (claim.state === "busy") throw new Error("site_package_rollback_in_progress");
  if (claim.state === "complete") return requireFailedSource(source.id, input.ledger);
  const currentSource = await requireCurrentApplySource(source.id, input.ledger);
  try {
    await compensateItems({
      ...toCompensationDeps(input, currentSource, claim.id),
      items: await input.ledger.listRawItems(currentSource.id),
      priorOutcomes: await input.ledger.listRawItems(claim.id),
      currentSource,
    });
  } catch (error) {
    await recordOwnedAutomaticCompensationFailure(input.ledger, {
      ownerRunId: currentSource.id, runId: claim.id, error,
    });
    throw error;
  }
  await requireDesiredOwnedRunFinalization(input.ledger, {
    ownerRunId: currentSource.id,
    status: "failed",
    error: input.safeApplyError,
    automaticCompensation: { runId: claim.id, status: "success", error: null },
  }); // final callback DB invocation: source owner + markerless child close atomically
}
```

After the claim, a fresh source read under the owner context drives compensation.
Both raw sets stay unchanged; no caller reduces identities, trusts status or
adds an overlay. The automatic child never owns a marker. Any incomplete
compensation or finalization failure leaves the source running owner marker
intact and resumable; only the atomic source-failed/child-success finalization
closes it. Tests reject pre-claim reuse.
The general apply catch invokes compensation only after complete item-set initialization, even with no success phase; durable evidence, not `completed.length`, decides reversal.
Confirmed-rolled-back initialization leaves the empty marked reservation, zero
native effects and the whole-callback policy closes it failed. Exact committed
initialization has the complete manifest-aligned set and enters recovery; any
prefix/ambiguity stays marked. Dry-run never reruns body work. A later
post-compensation finalization failure leaves recovery resumable.

Menu Page/item references are resolved before `validateDesired`; the complete resolved Menu (base row, items, document, appearance, extras and draft status) is passed once to `mutateMenuAggregateAtomic`.
There is no executor-level Menu wiring write before or after that call. Publish is the only later Menu mutation.

Existing `tests/unit/kits/fullSiteLifecycleAdapters.test.ts` pins Page `data` acceptance, a no-ref `document:{ sections:[] }` wrong-root rejection with no alias, resolved-ID validation under `data`, exact create/update `title,slug,data` payloads and status-only draft/publish-last behavior.
Existing `tests/unit/kits/fullSiteAggregateAdapters.test.ts` pins Page Template `document` acceptance plus no-ref `data:{ sections:[] }` rejection with no opposite-root alias. No additional adapter suite is introduced.

Data flow: normalized input -> actor -> one private graph build -> dependency/lock acquisition -> planning -> UUID registry -> allowlisted substitution/native targets -> run/durable evidence -> local CAS/phases -> reversible settings -> publication last. Known errors retain codes; unexpected errors redact; L03 owns compensation.

Regression tests cover every operation. A noop first performs mandatory resolution/native validation/complete capture and durable initialization; only its execution branch performs zero resolver/adapter/native reads or writes.
It registers the current ID and persists equal top-level final state, V1 recovery, null staged target and the `prepared`→`complete` phase-only change.
L02 and L03 import the shared frozen V1 status/phase export, accept exactly its six rows and reject the remaining Cartesian product/staged-target violations; neither duplicates a local matrix.
The item-fail catch leaves the last durable item untouched and enters automatic
recovery. Initialization tests prove one required atomic call, no sequential
fallback, exact fence-code preservation and the committed/rolled-back/partial/
unresolved reread matrix. Dry-run tests require desired terminal, no body retry, final-callback DB ordering, DB-free result mapping and zero-I/O primary preservation; L01 owns the private reread.
The L02-owned `tests/unit/kits/fullSiteLifecycleUpdates.test.ts` proves typed apply performs zero normalizations and one graph build before any default/override dependency, lock or DB access; graph failure makes zero planner/dependency/lock/DB calls, public input/deps reject a plan field, one L01 snapshot loader replaces per-item planning reads through one explicit READ COMMITTED transaction with statement-one fence, one bound handle and the 14-domain/15-total budget, a post-claim source mutation is observed, and an injected rollback registry reaches compensation without default fallback.
The exact frozen array reaches three-argument planning/preparation with zero rebuild/clone/second walker; this suite does not assert CLI call counts.
Before initialization, deterministic preparation failure proves zero item/native
writes and desired failed owner closure; ambiguous dependency/fence failure keeps
the marker. Pin complete prepared rows and that retired generic preflight/resolver
stays unused. Nested refs persist as IDs.
Form preflight round-trips `submit.supportingText` and rejects a sibling extra; listing tests reject an extra at every nested record above. Form tests table-pin `Authorization`, authorization/material-suffixed and `X-API-Key` header names plus Basic/Bearer/JWT, PEM, credential-URL and data-URL material under safe names. Separate before/staged/complete fixtures put a sentinel in `webhook.config.url` and representative non-header action strings; each returns only `site_package_invalid`, leaks no sentinel and reaches neither initialization, native nor audit write. A safe-header fixture proves capture, CAS replace and restore preserve the exact canonical action/header map. Detail tests keep `required:true` plus absent fallback through normalize/target persistence and fail a missing value rather than painting Aurora defaults.
Every kind has an apply adapter, while only `page`, `content_entry`, `detail_page` and `menu` participate in publish-last. They remain draft until dependencies are wired; menu items/document/appearance precede publish.
Settings land in the final reversible stage before publication through one required `applySettingsBatchAtomic` call with no per-key fallback; lifecycle publication is the final operation, and legacy/full-site runs use the same ledger port.
Additional focused regressions pin:

- every Form/Menu/Page/entry/detail internal failure leaves zero partial rows, revisions or cache effects;
- all nine exact intended IDs survive kill recovery; returned-ID drift and legacy `id:null` fail without natural-key fallback;
- bidirectional ref resolution and complete before/staged/final/action evidence are durable before the first adapter write;
- canonical decoded JSON/JSONB equality, ordered-array drift, Form-action round trips and facade/split export parity;
- divergent Page/detail current, published, publication and ordered revisions, including exact 100 acceptance and safe `limit + 1` rejection;
- classifier hints for every item, noop's zero-read diagnostic and L03-only complete-state/outcome authority for create/update/noop, while the legacy recovery projection/base-input bridge compile but final L03 never calls either;
- exact inventory coverage for all protected DML and every wrapper/Tx-helper caller, including the five live reverse-FK families and import/backup same-transaction delegation;
- every ordinary writer's first DB statement is the try-shared fence; busy,
  recovery-required and driver failure stay distinct safe codes with zero later
  reads/writes/effects;
- every installer native transaction's first statement locks its exact owner row
  `FOR SHARE`; closing/revoked/lost context fails with zero I/O, and a direct
  call takes the ordinary try-shared path;
- reverse-FK and `site.contentRoutes` writer/delete-or-slug-rename races fail closed with zero partial effect; writer-first makes rename reject, rename-first makes the old-slug writer reject, neither side-writes routes, and only a successful settings commit invalidates once; and
- all four durable phases plus failed stage/publish upserts resume solely from immutable raw rows and durable outcomes.

## Sub-Tasks

- [x] Implement exhaustive `satisfies FullSiteResourceAdapterRegistry` without editing L01 types; test every kind.
- [x] Add safe snapshots/equality/run items/cache effects.
- [x] Add targeted adapter DB tests.
- [ ] Split facade/tests/legacy entry service by frozen ownership; preserve public imports and 1,000-line gate.
- [ ] Enforce strict listing/`submit.supportingText` preflight and raw stored-locale versus canonical public resolution.
- [ ] Build one pre-lock graph; reserved apply plans/prepares/initializes once, while initialized apply enters durable recovery.
- [ ] Implement all nine exact-ID atomic APIs, conditional deletes, Form-action Tx and locked settings batches with races.
- [ ] Fence ordinary writers shared-first and installer work owner-first; lock all live reverse-FK/content-route targets and exhaust inventory.
- [ ] Persist intended IDs/dependencies/targets/complete captures; reject null IDs, overflow and CAS races; keep L03 outcome authority.

## Testing Requirements

- `set -a && source /home/coder/project/Coderso/.env && set +a`
- Use that command only to load DB/settings validation variables; never inspect,
  print/copy/hash/persist them; every DB command and test-local timeout is at least `360000`.
- `bunx vitest run --config vitest.config.ts --testTimeout=360000 tests/vitest/forms/formActionsContract.test.ts tests/vitest/customScreens/customScreenService.test.ts tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`
- `formActionsService.test.ts` uses unique per-test IDs and child-before-parent
  `finally` cleanup limited to its exact Form IDs; unqualified table deletes are
  forbidden.
- `bun test --parallel=1 --timeout 360000 tests/unit/forms/formsService.test.ts tests/unit/forms/formActionsService.test.ts tests/unit/forms/formAggregateService.test.ts tests/unit/menus/menuService.test.ts tests/unit/menus/menuAggregateAtomicity.test.ts tests/unit/pages/pageService.test.ts tests/unit/pages/revisionService.test.ts tests/unit/pages/pageLifecycleMutation.test.ts tests/unit/content/detailPageDocumentService.test.ts tests/unit/content/detailPageRevisionService.test.ts tests/unit/content/detailPageDocumentLifecycleMutation.test.ts tests/unit/content/entryLifecycleMutationService.test.ts`
- `bun test --parallel=1 --timeout 360000 tests/unit/content/typeService.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/unit/content/listingTemplatesService.test.ts tests/unit/content/listingQueriesService.test.ts tests/unit/content/taxonomyService.test.ts tests/unit/settings/settingsService.test.ts tests/unit/settings/fullSiteSettingsAtomicService.test.ts tests/unit/themes/themeProfileService.test.ts tests/unit/forms/submissionService.test.ts tests/unit/admin/usersService.test.ts tests/unit/tools/importExport.test.ts tests/unit/backups/backupService.test.ts`
- `bun test --parallel=1 --timeout 360000 tests/unit/kits/nativeCmsWriterFenceInventory.test.ts tests/unit/kits/fullSiteResourceAdapters.test.ts tests/unit/kits/fullSiteAggregateAdapters.test.ts tests/unit/kits/fullSiteLifecycleAdapters.test.ts tests/unit/kits/fullSiteAdapterAtomicity.test.ts tests/unit/kits/fullSiteLifecycleUpdates.test.ts`
- `bun test --parallel=1 --timeout 360000 tests/integration/kits/fullSiteNativeForeignKeyRacesDb.test.ts tests/integration/kits/fullSiteContentTypePseudoFkExplainDb.test.ts`
- the owning suites pin statement-one fence, same-transaction Tx delegation, every Page/Form/ContentType/Entry `FOR KEY SHARE` before FK DML, stable multi-root order, missing-root rejection, `site.contentRoutes` coverage across single/batch/Tx/import/backup/full-site raw restore, safe codes and zero-DML/effect failures
- the serial FK suite table-drives writer-first and delete-first for every live edge plus listing-query/content-route pseudo-FKs, and writer-first versus rename-first for `site.contentRoutes`/ContentType slug changes. It obtains both backend PIDs, releases neither barrier until `pg_stat_activity.wait_event_type = 'Lock'`, a same-waiter ungranted `pg_locks` row, and `pg_blocking_pids(waiterPid)` containing the holder PID agree; sleeps, elapsed-time and promise-nonsettlement assertions are forbidden. Writer-first commits the reference then guarded delete/rename rejects; delete/rename-first commits then the blocked old-reference writer rejects missing, with exact roots/references/cache/audit state asserted. The pseudo-FK suite compiles production SQL, passes the exact sanitized 64/10,000-row budgets and owns exact-ID cleanup; failure blocks no-migration for a separate complete migration contract.
- the three native Page/entry/detail lifecycle suites above pin divergent
  current/published state, exact 100 and `limit + 1`; all nine native atomic
  suites pin replace/delete CAS, and the lifecycle adapter suites pin the
  capture-to-restore race with zero writes/effects
- existing Forms/Menu/Page/entry/detail service and runtime suites, read-only where
  their files are not L02-owned
- `bun --cwd core lint`, `bun --cwd core lint:types`, targeted strict security
  scan, and fresh `wc -l` over every L02-owned changed production/test file.
