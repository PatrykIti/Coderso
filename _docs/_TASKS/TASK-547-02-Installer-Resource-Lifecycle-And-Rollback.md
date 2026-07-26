# TASK-547-02: Installer Resource Lifecycle and Rollback
# FileName: TASK-547-02-Installer-Resource-Lifecycle-And-Rollback.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Solution Kits / Installer / Data Integrity
**Estimated Effort:** Very Large
**Dependencies:** TASK-547-01
**Status:** 🚧 In Progress
**Validation:** Lifecycle/recovery remediation and all affected final gates are
pending on the current working tree.

---

## Overview

Extend the existing Solution Kit lifecycle to install the package’s missing
native resources without side-writing around the run ledger. Cover content
entries, form actions, Page Templates, listing templates/queries, detail pages,
content routes and safe settings in dependency order, with exact idempotency,
snapshots, reverse rollback and audit evidence.

The installer remains a compensation saga over native domain services. A fresh
crash/concurrency audit found that package-local locking, non-durable generated
IDs, multi-call aggregate writes and position-only rollback cannot prove the
required atomicity after process death or a native reversal failure. This
corrective contract is part of the original scope, not a smaller follow-up.

## Private Reference-Plan Boundary

`ApplyFullSitePackageInput` remains exactly package/actor/dry-run/takeover input;
it has no caller-supplied `referencePlan`, graph, edge or ordered-resource field.
`FullSiteInstallExecutorDeps` and the CLI dependency contract likewise gain no
such field. Its `package` is already-normalized `FullSitePackageV1`; this typed
service boundary never calls `normalizeFullSitePackageForWrite`. After actor
validation, public `applyFullSitePackage` must synchronously call
`buildReferencePlan(input.package)` exactly once before it selects or
acquires the ledger, creates a resolver, touches a DB-backed adapter, opens the
global/package lock or performs any ledger/domain read. A graph failure therefore
has zero lock/ledger/resolver/adapter/DB calls.

The returned `readonly PlannedPackageResource[]` is private to that invocation
and is closed over by the subsequent locked executor. L01 adds the internal
three-argument `planFullSiteInstall(pkg, referencePlan, deps)` overload; this
apply path consumes the exact array without rebuilding, cloning or mutating it.
The existing direct-call `planFullSiteInstall(pkg, deps)` overload remains
gate-compatible and builds its own graph exactly once before its first dependency
read, with zero normalizer calls; the supplied-plan overload builds zero times.
Apply uses only the three-argument overload. The CLI independently builds/
discards a plan before invoking its lazy `apply` dependency so an invalid file
cannot import DB code; the service then builds its own private plan rather than
trusting CLI structure.

The graph owner freezes an immutable desired snapshot plus typed reference
descriptors on every planned resource and exports the sole descriptor resolver.
The planner uses it with placeholders; pre-run preparation receives the exact
same `referencePlan` array and uses it with actual intended IDs. Neither phase
rescans ref-shaped values, duplicates the Page walker or rebuilds the graph.

After IDs are allocated/resolved, TASK-547-02 substitutes refs only at the
already-validated graph paths and runs every native owner validator over the
post-substitution desired snapshot before `createRun`, item initialization or
any native write. This task owns the malformed Page/Menu/Form/content/listing/
detail/setting desired regressions; TASK-547-01 deliberately does not claim
native-domain validity.

## Frozen Ownership And Land Order

Implementation lands strictly `L01 corrective completion -> L03 pre-land
compatibility checkpoint -> L02 -> L03 final completion`. The checkpoint edits
only L03-owned existing paths, leaves L03 `🚧 In Progress`, and is neither a new
leaf nor a new ownership path. Each phase reads its predecessor's on-disk state.

- **L01 -- shared lifecycle substrate:** TASK-547-01 package kind/identity aliases,
  shared install types/ledger port,
  concrete legacy persistence, legacy installer composition, deterministic
  planner whose apply overload consumes the caller-bound private reference plan
  without rebuilding while its gate-compatible direct overload builds pre-read,
  strict current-resource resolver, two-lock coordination and versioned
  dependency serialization in the existing `rollbackAction` JSON column. Its
  gate-safe type boundary keeps `FullSiteInstallLedgerItem` compatible for
  in-memory construction and owns `PersistedFullSiteInstallLedgerItem` for the
  compatibility `listItems()` projection plus `RawFullSiteInstallLedgerItem`
  and authoritative `listRawItems()`. Those raw contracts must actually be
  committed before the L03 checkpoint; the bridge may not redeclare them. L01
  owns planner/ledger/managed-identity tests and performs no native mutation.
- **L02 -- native mutation substrate:** staging/execute/preflight, the adapter
  facade and cohesive adapter splits, canonical Form-action normalization, and
  domain-local exact-ID create/replace/conditional-delete APIs plus complete
  native target/capture for all nine UUID-backed kinds and a new settings-domain
  locked apply/raw-restore batch. It owns `settingsService.ts`, `siteLocale.ts`
  and their existing settings-service test, plus the default rollback registry
  and exact-ID nullable capture wrappers in its adapter facade. It preserves the
  gate compatibility surfaces while adding the strict saga input and all-item
  classifier. It consumes L01 and never writes install-run tables directly.
- **L03 -- compensation and process evidence:** after L01, pre-land only the
  generic injected `compensateItems` bridge and its minimal existing-path test;
  this phase imports L01 contracts, never L02/native/settings/DB code. After L02,
  extend that same file with final rollback/compensation, dependency branches,
  process-death/SIGKILL evidence and shared-shell concurrency. L03 consumes,
  but cannot edit, the L02 adapter/default-registry owners.

Every touched human-authored production or test module must finish at most 1,000
physical lines. In particular, L02 must split the legacy
`core/services/content/entryService.ts`, the adapter facade and any touched
near-limit adapter/test suite by cohesive responsibility before adding behavior.

## Required Order

`content type → form/fields/actions → Page Template → listing template → entries
→ listing query → detail page → Pages → menus → allowlisted site/design settings
(including `site.contentRoutes`)`.

Settings and shell references land last. Rollback uses exact reverse dependency
order with the frozen deterministic tie-break, and blocks unsafe prerequisite
branches after a reversal failure. Media is excluded unless a later task adds an
explicit trusted source contract.

Failure atomicity is a compensation saga: each successful domain operation
records enough safe prior state to compensate in reverse order. Do not introduce
a shared cross-domain transaction abstraction or expand every native service
with a common transaction parameter. Transactions added by this task are local
to one native domain and do not cross resource-owner boundaries.

The legacy installer and full-site executor must both depend on one exported
ledger port contract (run/item creation, completion, snapshot reads and rollback
state). L01 owns its single concrete DB implementation, compatibility re-export
and default legacy-installer composition. L02 consumes the injected port and
cannot edit legacy composition. No other module implements the port or
side-writes ledger tables.

The concrete port's existing `withPackageLock` consumer method is retained for
compatibility, but its DB implementation has a stronger frozen meaning: acquire
one session advisory lock for `GLOBAL_FULL_SITE` first and then the
package-key lock, on the same dedicated PostgreSQL connection; hold both across
source re-read, plan, pre-run preparation, durable item initialization, native mutations,
publish/settings, automatic compensation and run finalization; release in exact
reverse order. Apply, dry-run and explicit rollback use this same order. No code
path may acquire package then global. The global lock intentionally serializes
different packages because their shell settings are shared mutable state.

Each apply item persists a strict versioned dependency envelope in the existing
`solution_kit_install_items.rollback_action` JSON column (no migration):

```ts
type FullSiteRollbackActionV1 = {
  schemaVersion: 1;
  dependencies: FullSiteResourceIdentity[]; // alias of PackageResourceIdentity
};
```

L01 owns `buildFullSiteRollbackActionV1` and
`readFullSiteRollbackActionV1`. Dependencies are unique canonical identities
from the validated reference graph, never inferred from kind or position. Every
planned/success phase upsert preserves the same envelope. A caught item failure
does not upsert that item; it leaves the last durable row untouched and finalizes
only the source run failed. Missing, unknown-version, unknown-key or malformed
legacy evidence parses as unknown, never an empty dependency set.

The shared construction type remains gate-compatible:
`FullSiteInstallLedgerItem.rollbackAction` is optional because L02/L03-owned
in-memory literals already exist when L01 lands. L01 additionally owns the exact
`PersistedFullSiteInstallLedgerItem` type, which makes
`rollbackAction: JsonObject | null` required for compatibility, plus
`RawFullSiteInstallLedgerItem`, whose position/kind/key/operation/status/
snapshots/action/error fields are all `unknown`. `listRawItems()` is the only
rollback/compensation source/prior read: it returns every row without filtering
or coercion, ordered `position ASC, id ASC` with
`LIMIT PACKAGE_LIMITS.resourcesTotal + 1`; cap+1 fails closed;
`listItems()` is non-authoritative. L02
staging consumes the L01-owned `buildFullSiteRollbackActionV1` and always
supplies V1 for current apply items; the concrete upsert preserves it when later
writes omit the optional construction field. Only L03 raw preflights consume
`listRawItems()` results; graph/classifier APIs receive their strictly parsed
persisted items.

The strict rollout preserves sequential gate safety without weakening final
mutation authority. `AdapterApplyInput` retains its existing construction shape
for planner/preflight and the pre-land L03 compatibility bridge. L02 adds
discriminated `FullSiteSagaAdapterPrepareInput` and
`FullSiteSagaAdapterApplyInput`, requiring the operation-correct intended ID,
complete expected snapshot and already-durable complete target snapshot, plus
`isFullSiteSagaAdapterApplyInput` and
`assertFullSiteSagaAdapterApplyInput`; every new executor mutation must take that
strict branch. The base mutation branch is explicitly deprecated and exists only
until final L03 replaces the bridge call with `restoreSnapshotAtomic`.
Likewise, L02 retains array-returning `recoverInterruptedSagaItems` as a
deprecated wrapper so the pre-final rollback facade compiles at the L02 gate,
while the exact new `classifyInterruptedSagaItems` returns one classification per
strictly preflighted persisted source item. Final L03 scheduling uses only the
classifier after raw-field and graph validation. These are land-order
compatibility seams, not test or
production behavior fallbacks.

Managed identity requires both (1) a successful apply run that has not been
rolled back and (2) that run's snapshot ID matching the current native row.
Natural-key or normalized-payload equality without this ledger proof is an
unmanaged conflict and blocks before mutation.

The sole exception is the allowlisted site/design shell settings stage. An
operator may explicitly opt in to a narrow reversible takeover for those keys.
Without that opt-in, an existing setting without matching ledger proof is an
unmanaged conflict. With it, the executor snapshots the exact native value,
applies settings only after every other resource is staged and published, and
restores that exact prior value during compensation or explicit rollback. The
exception does not apply to any other resource kind and is never implicit.

Planner equality and rollback snapshots are separate contracts. L01's current
resource resolver returns only the canonical equality projection used to decide
create/update/noop/conflict. L02's `ResourceAdapter.captureSnapshotById(id)`
captures the complete native-owner state immediately before durable saga
initialization and before any mutation. That complete snapshot, not
`FullSiteInstallPlanItem.currentDesired`, becomes the ledger `beforeSnapshot`.
For Page, entry and detail Page it includes distinct current/published state,
publication metadata and the bounded rollback-relevant revision state; Form and
Menu likewise include every owned aggregate row; content type, Page Template,
listing template/query and setting snapshots include their entire owner-defined
semantic/raw state. L03 restores that exact capture through
`restoreSnapshotAtomic({ id, expectedCurrent, target, actorId })`.

L02 preparation before `createRun` is two-pass and write-free. Pass one allocates
a server UUID for every create in all nine UUID-backed kinds, takes current IDs
for updates/noops and uses setting keys, then builds the complete identity-to-ID
registry. Pass two resolves every reference against that full registry, runs each
native strict normalizer, captures complete before state (or proves exact
create-time absence), and prepares exact complete staged/final targets. Create
absence is durably encoded as `beforeSnapshot:null`; an absent setting maps that
evidence to its native raw `{ key, present:false }` expectation. Only after the
all-item operation/snapshot/ID matrix validates may the executor create the run
and persist every exact before, staged/final after and V1 action. Every item must
be durable before the first native write; a partial initialization failure
therefore writes zero native resources.

`FullSiteDurableAfterSnapshotV1` keeps the exact final native snapshot at its
top-level `id`/`desired` and an optional exact staged snapshot plus phase
`prepared | staged | publish_prepared | complete`. Both targets are durable from
`prepared`; phase upserts never regenerate/replace them. Before publish, the item
is durably `publish_prepared`; the native owner atomically compares the complete
staged aggregate and consumes the already-durable complete target. A crash before
any phase upsert remains decidable from exact staged/final equality.

L02 `staging.ts` also owns
`canonicalizeFullSiteJsonValue(value: JsonValue): string` and
`fullSiteJsonValuesEqual(left: JsonValue, right: JsonValue): boolean`. Callers
strictly validate decoded JSONB before either helper; arrays retain order,
objects sort keys lexicographically at every depth, and primitives use JSON
encoding. L03 uses these helpers for prior source/outcome value equality.

Every update/replace carries the immutable complete snapshot captured before saga
initialization as its compare-and-swap expectation. Inside the owning domain
transaction, the helper locks and re-reads the complete aggregate/lifecycle
state, canonical-compares it with that expectation and throws
`site_package_state_changed` before writes on drift. Rollback likewise captures
the complete current native state immediately before restore and supplies it as
`expectedCurrent`; `restoreSnapshotAtomic` repeats the comparison under the same
domain lock before replacing the exact target snapshot. Recovery classification
alone is never mutation authority.

Create reversal uses
`deleteSnapshotAtomic({ id, expectedCurrent, actorId })`, never plain
`deleteById`: the native owner locks/re-reads and complete-compares before delete.
The same capture-to-write CAS applies to all nine create kinds. L02 owns
`settingsService.ts`, the pure `siteLocale.ts`,
`fullSiteSettingsAtomicService.ts` and both named settings tests. The settings
service exports the object-shaped native write normalizer. Stored locale writes
accept any non-blank string of at most `MAX_SITE_LOCALE_LENGTH = 255` UTF-16 code
units and store the accepted string unchanged; reads/lists preserve that raw
value. The
separate public resolver accepts only the bounded ASCII BCP-like grammar,
canonicalizes `pl`, `pl-PL`, `es-419` and `zh-Hant`, and falls back to `en` only
at a public sink. TASK-547-04-L03 consumes these exports read-only.

The atomic service supplies exact raw presence/value capture plus validated
apply and trusted raw restore. In one transaction it locks the settings table
(covering absent keys), re-reads/compares identical sorted unique key sets,
writes all or none, and invalidates once after commit. The weak
`applySettingsBatch` and `restoreSettingsBatchRaw` exports/imports are forbidden.
The setting adapter is statically required to expose both
`applySettingsBatchAtomic` and `reverseSettingsBatch`; per-key apply or reversal
fallback is forbidden.

A planned `noop` is never coerced to update. Preparation requires its current ID
and complete captured snapshot, registers that ID for downstream reference
resolution and persists the raw `afterSnapshot` as the
`FullSiteDurableAfterSnapshotV1` envelope: its top-level `id`/`desired` is
canonical-deep-equal to the complete `beforeSnapshot`, while
`recovery.schemaVersion` is `1`, `recovery.phase` is `prepared` and
`recovery.stagedSnapshot` is `null`. The raw before/after JSON values are therefore
not equal. Noop execution performs zero resolver/adapter/native reads or writes
and records success by changing only `recovery.phase` to `complete`; it never
regenerates or replaces either snapshot target or the unchanged V1 rollback
action. The noop item remains in the raw graph so transitive dependency validation
is complete.

Revision snapshots are fail-closed and never truncated. Entry and detail Page
own exported limits `ENTRY_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100` and
`DETAIL_PAGE_FULL_SITE_REVISION_SNAPSHOT_LIMIT = 100`; Page uses the existing
`MAX_PAGE_REVISION_RETENTION = 100`. Each capture queries `limit + 1`, rejects an
overflow with its domain-safe `*_revision_snapshot_too_large` code, and restore
atomically replaces the exact captured ordered revision set.

For `content_type`, `form`, `page_template`, `listing_template`,
`content_entry`, `listing_query`, `detail_page`, `page` and `menu` creates, L02
must generate and durably persist the intended UUID and every exact target before
the first native write. The corresponding native-owner atomic create inserts
that exact ID and the adapter rejects a different returned ID/state. Recovery
resolves only that expected ID. A prepared legacy create snapshot whose `id` is
null/malformed cannot prove ownership and fails closed before natural-key lookup,
delete or restore. `setting` uses its canonical key rather than a generated ID.

Rollback remains reverse dependency order, not blind best-effort position order.
Ready nodes use exactly `position DESC, kind ASC, key ASC`; this comparator is
only the deterministic tie-break inside the reverse topological scheduler. If
reversing an item fails natively, L03 blocks that item's complete transitive
dependency closure so a still-live dependent cannot be left pointing at a
deleted/restored prerequisite, while continuing branches proven independent by
valid V1 evidence. Once a failure occurs, missing/malformed legacy dependency
evidence means no remaining branch is proven independent and all remaining
native reversals stop conservatively.

From the raw source read, L03 first runs one global zero-native evidence preflight
over every row (including completed/noop), before graph construction: strict operation-specific
complete before/final/staged snapshot parsing, phase/unknown-key rejection and ID
matrix validation. For `noop`, it strictly parses raw `afterSnapshot` through
`readFullSiteDurableAfterSnapshotV1`, derives the complete final target only from
the envelope's top-level `id`/`desired`, and requires that target to canonical-
deep-equal the non-null complete `beforeSnapshot` with the same exact ID.
`recovery.schemaVersion` must be `1`, `recovery.stagedSnapshot` must be `null`, and
the only valid status/phase pairs are `planned`/`prepared` and
`success`/`complete`; a `failed` or `skipped` source noop is invalid. The raw
before/after JSON values are not compared for equality because the latter retains
the recovery envelope. Any mismatch or malformed later item fails before
classification, resolver/adapter access or an earlier reversal. L02's classifier
then returns a hint only. For a valid non-completed noop it derives `noop` from the
source operation without invoking the current-resource resolver, but outcome
authority comes only from the globally preflighted source evidence. The scheduler
records that source-faithful noop with zero resolver/adapter/native read or write.
Every non-completed create/update hint, including `not_applied` and
`already_recovered`, receives fresh exact-ID complete-state refinement before the
scheduler can record or skip it.

L02's `FULL_SITE_DURABLE_SOURCE_STATUS_PHASES_V1` is the sole status/phase owner
consumed by both L02 and L03 tests. Its exact six rows are create/update
`planned/prepared`, `success/staged`, `success/publish_prepared`,
`success/complete`, plus noop `planned/prepared` and `success/complete`;
staged/publish requires a non-null staged target. Every source `failed` or
`skipped`, planned later phase, and staged/publish pair without a staged target
is invalid before native access.

Only exact complete state is authoritative. Update equality with before is
already recovered; equality with an allowed applied target is applied; every
other/absent state conflicts. Create absence at the exact durable ID is already
recovered; presence must equal an allowed applied target or conflicts. A
successful source allows only final after; running/failed sources may also allow
the already-durable staged target. Applied update calls locked atomic restore;
applied create calls locked atomic conditional delete. Settings follow equivalent
raw presence/value refinement for non-completed create/update items before one
locked compare-and-raw-restore batch. A preflight-authorized noop setting issues
no native read/write and never enters the native batch payload.
L02's default rollback registry owns
`captureSnapshotByIdOrNull(id)` over `captureSnapshotById(id)`; it converts only
the native owner's exact-ID not-found result to `null`, propagates every other
error and never performs a natural-key lookup. L03 consumes this facade.

Before any native reversal of a non-completed item whose refined state is
`applied`, a successful source run additionally requires managed-resource
evidence with `successful === true`, `rolledBack === false`,
`runId === currentSource.id` and
`resourceId === durableAfterSnapshot.id`. This ownership guard is not required
when create/update fresh refinement returns `already_recovered`, regardless of
the earlier hint. A preflight-authorized noop also requires no ownership guard
and no native read. The guard is not required when the current source is
`running` or `failed`; exact durable complete-snapshot equality remains mandatory
for every create/update decision. A successful prior rollback outcome removes
the identity before this check only after L03's zero-native
`preflightPriorRollbackSuccessOutcomes` proves an exact one-to-one match against
the raw source item: unique/non-extraneous identity, identical position and
original operation, swapped snapshots and `rollbackAction` canonical-deep-equal
as strictly validated decoded JSONB. Lexicographically reordered object keys are
equal, array order remains significant, and matching legacy-unknown
`rollbackAction:null` is legal. Duplicate, extra, malformed or unequal success
rows fail with `site_package_rollback_invalid_source` before classification,
adapter access or native reads. Valid failed/skipped prior outcomes remain
retryable and never enter the completed set. Every applied setting passes this
guard before the single batch write begins.

At the setting frontier, L03's dependency scheduler forms one group from every
ready non-completed setting in `position DESC, kind ASC, key ASC` order and
invokes the exact `reverseSettingsBatch` seam. That seam
accepts only the globally parsed operation-correct group: noop members are
source-evidence-authorized without a native read, create/update members are
fresh-refined, and every applied member is ownership-checked. It
rejects any wrong-kind/unsorted/conflicting member before native access, builds
every reversal, and calls L02's required `adapter.reverseSettingsBatch(...)`
exactly once for applied members. It returns source-associated native results;
the dependency scheduler records source-faithful outcomes only after any required
native success, or directly when the group contains only already-recovered/noop
members and therefore needs no native call. Batch failure or group conflict
blocks the union of every applied or
conflicting setting's transitive dependency closure. An outcome write failure
stops immediately; per-key native fallback is forbidden.

Every rollback outcome row uses the immutable raw DB source row: it preserves
the source item's original
`create | update | noop` operation, swaps its raw source snapshot columns
(`beforeSnapshot = source.afterSnapshot`,
`afterSnapshot = source.beforeSnapshot`) and copies the exact source
`rollbackAction`; rollback never records synthetic `delete` or `restore`
operations. An in-memory phase overlay is diagnostic-only and never becomes
outcome provenance; fresh exact native state alone decides reversal/recovery.
Any outcome-ledger write failure becomes
`site_package_rollback_ledger_failed`, stops all remaining native calls
immediately and fails the rollback run; retry uses exact complete-state capture
to recognize a native reversal that committed before its outcome write.

After compensation succeeds, an interrupted `running` source is finalized
`failed` with `site_package_apply_interrupted` first. Rollback `success`
finalization is the final fallible operation, after which `successCommitted` is
set and no catch path may rewrite that successful rollback. Every post-claim
failure before that commit, including interrupted-source finalization failure,
finalizes the owned/resumed rollback run `failed` with a safe code and remains
resumable from its durable successful outcomes.

The automatic apply-failure path obeys the same ordering. After claiming the
rollback, L02 freshly re-reads and passes `currentSource`, raw source items and
raw claimed-run `priorOutcomes` through `listRawItems()` to L03's
compatibility-named `compensateItems`; L03 derives completion only through the
same zero-native one-to-one preflight,
finalizes the source apply run `failed` with the safe apply code after native
compensation, then commits rollback success and immediately sets
`successCommitted`. It runs whenever the complete item set was durably
initialized, even if no in-memory success list is populated. A catch before that
commit may fail the owned rollback run; no catch may rewrite a committed
successful rollback.

## Security Contract

- **Endpoint visibility/auth/RBAC/CSRF/rate limit:** n/a; service + trusted local
  CLI only. Existing Solution Kit routes remain unchanged.
- **Validation:** only TASK-547-01-normalized packages reach apply; no route
  accepts raw package input.
- **Anti-abuse:** no public write; nonce/CAPTCHA n/a.
- **Actor validation:** apply, dry-run and rollback require a syntactically valid
  actor UUID before any ledger or domain DB access.
- **Secrets:** settings allowlist excludes auth, provider, assistant and secret
  namespaces; audit/log snapshots must not contain secret values or submissions.
- **Crash evidence:** worker stdout contains only safe phase, run ID, resource
  kind and intended UUID. Package payloads, setting values and DB URLs are never
  passed on argv or printed.
- **Scope:** no public endpoint is added. No database migration is added. There
  is no route/RBAC/CSRF/rate-limit change, media import or cross-domain
  transaction abstraction.

## Implementation Pseudocode

```ts
export const applyFullSitePackage = async (
  input: ApplyFullSitePackageInput,
  overrides: FullSiteInstallExecutorDeps = {},
): Promise<ApplyFullSitePackageResult> => {
  assertActorUuidBeforeDb(input.actorId);
  const referencePlan = buildReferencePlan(input.package);
  // No ledger/default-resolver/adapter/DB acquisition or lock call precedes
  // the private graph build. ApplyFullSitePackageInput/deps expose no plan.
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const adapters = overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS;
  const rollbackAdapters =
    overrides.rollbackAdapters ?? FULL_SITE_ROLLBACK_ADAPTERS; // L02 facade owner
  const execute = async () => {
    const resolveCurrentResource =
      overrides.resolveCurrentResource ??
      createFullSiteCurrentResourceResolver(input.package.key, ledger);
    const plan = await planFullSiteInstall(
      input.package,
      referencePlan, // exact closed-over plan; planner never rebuilds it
      {
        ledger,
        resolveCurrentResource,
        normalizeDesired: async ({ kind, key, currentId, desired }) =>
          (await adapters[kind].validateDesired({
            operation: "update",
            currentId,
            key,
            desired,
            actorId: input.actorId,
          })) ?? desired,
        allowSettingTakeover: input.allowSettingTakeover,
      },
    );
    const { prepared, intendedRegistry } = await prepareFullSiteSaga({
      plan,
      referencePlan, // exact same frozen descriptors consumed by the planner
      actorId: input.actorId,
      adapters,
      generateId: () => crypto.randomUUID(),
    });
    // Before createRun: allocate the complete intended-ID registry, substitute
    // only graph-approved refs, validate every native desired snapshot and
    // capture complete CAS expectations. This preparation performs zero writes.
    const run = await ledger.createRun({
      packageKey: input.package.key,
      actorId: input.actorId,
      dryRun: input.dryRun === true,
      options: {
        fullSitePackage: true,
        packageFingerprint: fullSitePackageFingerprint(input.package),
        allowSettingTakeover: input.allowSettingTakeover === true,
        rollbackDependencySchemaVersion: 1,
      },
    });
    await initializeFullSiteSaga({
      ledger,
      runId: run.id,
      prepared,
    }); // persist only the already-validated snapshots/targets/actions
    // L02 staging owns all nine DURABLE_CREATE_ID_KINDS and consumes L01's
    // buildFullSiteRollbackActionV1; it never reallocates or revalidates here.
    if (input.dryRun) {
      await ledger.finalizeRun({ runId: run.id, status: "success" });
      return {
        runId: run.id,
        resources: prepared.map(({ operation, intendedId }) => ({
          identity: operation.identity,
          id: intendedRegistry.get(operation.identity) ?? intendedId,
          operation: operation.operation,
        })),
      };
    }
    return executePreparedPlanWithDomainAtomicAdapters({
      run,
      prepared,
      actorId: input.actorId,
      adapters,
      rollbackAdapters,
      publishLast: LIFECYCLE_CAPABLE_PUBLISH_KINDS,
      settingsLast: true,
    }); // zero-read/write noop skip + strict FullSiteSagaAdapterApplyInput for mutations
  };
  return ledger.withPackageLock
    ? ledger.withPackageLock(input.package.key, execute)
    : execute(); // pure injected fakes only; concrete DB paths always lock
};

const compareRollbackReadyNodes = (
  left: RefinedRollbackItem,
  right: RefinedRollbackItem,
): number => {
  // position DESC, kind ASC, key ASC
  return (
    right.classification.item.position - left.classification.item.position ||
    left.classification.item.kind.localeCompare(right.classification.item.kind) ||
    left.classification.item.key.localeCompare(right.classification.item.key)
  );
};

async function recordRollbackOutcome(input: RollbackOutcomeInput): Promise<void> {
  try {
    await input.ledger.recordItem({
      runId: input.rollbackRunId,
      position: input.persistedSourceItem.position,
      kind: input.persistedSourceItem.kind,
      key: input.persistedSourceItem.key,
      operation: input.persistedSourceItem.operation, // immutable raw-row provenance
      status: input.status,
      beforeSnapshot: input.persistedSourceItem.afterSnapshot,
      afterSnapshot: input.persistedSourceItem.beforeSnapshot,
      rollbackAction: input.persistedSourceItem.rollbackAction,
      error: input.error ?? null,
    });
  } catch {
    // The scheduler treats this as fatal, not as a branch-native failure.
    throw new Error("site_package_rollback_ledger_failed");
  }
}

async function reverseRefinedNativeSnapshot(input: ReverseOneInput) {
  if (input.refined.state === "noop") {
    return "noop"; // globally parsed source evidence; zero native read/write
  }
  if (input.refined.state === "already_recovered") {
    return "already_recovered"; // fresh exact-ID create/update result; zero native write
  }
  if (input.refined.state === "conflict") throw new Error(input.refined.error);
  const reversal = input.refined.reversal; // ownership was checked during refinement
  if (reversal.operation === "create") {
    await input.adapter.deleteSnapshotAtomic({
      id: reversal.id,
      expectedCurrent: reversal.expectedCurrent,
      actorId: input.actorId,
    });
  } else {
    await input.adapter.restoreSnapshotAtomic({
      id: reversal.id,
      expectedCurrent: reversal.expectedCurrent,
      target: reversal.target,
      actorId: input.actorId,
    });
  }
  return "reversed";
}

export async function rollbackFullSiteInstall(
  input: RollbackFullSiteInstallInput,
): Promise<{ runId: string }> {
  assertActorUuidBeforeDb(input.actorId);
  const ledger = input.ledger ?? defaultLegacyInstallLedger;
  const source = await requireApplySource(input.sourceRunId, ledger);
  const execute = async () => {
    const currentSource = await requireApplySource(input.sourceRunId, ledger);
    if (currentSource.packageKey !== source.packageKey) {
      throw new Error("site_package_rollback_invalid_source");
    }
    const automaticCompensation =
      await validateAutomaticCompensationSource(currentSource, ledger);

    let rollbackRunId: string;
    if (ledger.claimRollbackRun) {
      const claim = await ledger.claimRollbackRun({
        sourceRunId: currentSource.id,
        packageKey: currentSource.packageKey,
        actorId: input.actorId,
        ...(automaticCompensation
          ? {
              options: { automaticCompensation: true, fullSitePackage: true },
              resumeOnly: true,
            }
          : {}),
        resumeRunning: true,
      });
      if (claim.state === "busy") {
        throw new Error("site_package_rollback_in_progress");
      }
      if (claim.state === "complete") {
        throw new Error("site_package_already_rolled_back");
      }
      rollbackRunId = claim.id;
    } else {
      // Narrow injected fakes may omit the claim API. Concrete DB composition may not.
      if (automaticCompensation) {
        throw new Error("site_package_compensation_not_recoverable");
      }
      if (await ledger.hasSuccessfulRollback(currentSource.id)) {
        throw new Error("site_package_already_rolled_back");
      }
      rollbackRunId = (
        await ledger.createRollbackRun({
          sourceRunId: currentSource.id,
          packageKey: currentSource.packageKey,
          actorId: input.actorId,
          options: { fullSitePackage: true },
        })
      ).id;
    }

    let successCommitted = false;
    try {
      if (automaticCompensation && rollbackRunId !== automaticCompensation.id) {
        throw new Error("site_package_rollback_conflict");
      } // owned/resumed post-claim validation belongs to the failed-finalization catch
      const rawSourceItems = await ledger.listRawItems(currentSource.id);
      const rawPriorOutcomes = await ledger.listRawItems(rollbackRunId);
      const parsed = preflightRollbackEvidence({
        items: rawSourceItems,
      }); // validates every unknown raw field; no row may disappear
      const completedIdentities = preflightPriorRollbackSuccessOutcomes({
        sourceItems: rawSourceItems,
        priorOutcomes: rawPriorOutcomes,
      }); // exact zero-native one-to-one source/outcome proof
      const persistedSourceItems = parsed.map(
        (evidence) => evidence.persistedSourceItem,
      );
      const graph = buildRollbackDependencyGraph({
        items: persistedSourceItems,
        declaredVersion: currentSource.options?.rollbackDependencySchemaVersion,
        readAction: readFullSiteRollbackActionV1,
      });
      const classifications = await classifyInterruptedSagaItems({
        items: persistedSourceItems,
        resolveCurrentResource:
          input.resolveCurrentResource ??
          createFullSiteCurrentResourceResolver(currentSource.packageKey, ledger),
      }); // hints only; noop skips resolver access and is not outcome authority
      const adapters =
        input.adapters ?? FULL_SITE_ROLLBACK_ADAPTERS; // L02 facade owner
      const refinements = await refineAllRollbackStates({
        parsed,
        classifications,
        adapters,
        currentSource,
        ledger,
        completedIdentities,
      }); // noop from parsed source evidence; fresh exact-ID authority for create/update
      await compensateDependencyBranches({
        graph,
        refinements,
        actorId: input.actorId,
        adapters,
        ledger,
        rollbackRunId,
        completedIdentities,
        reverseOne: reverseRefinedNativeSnapshot,
        reverseSettingsBatch,
        readyComparator: compareRollbackReadyNodes,
        recordOutcome: recordRollbackOutcome,
        currentSource,
        onNativeFailure: "block-transitive-dependencies",
        onSettingsFailure: "block-union-transitive-dependencies",
        onOutcomeFailure: "stop-all",
        onUnknownDependencies: "stop-conservatively",
      });
      if (currentSource.status === "running") {
        await ledger.finalizeRun({
          runId: currentSource.id,
          status: "failed",
          error: "site_package_apply_interrupted",
        });
      }
      await ledger.finalizeRun({ runId: rollbackRunId, status: "success" });
      successCommitted = true; // no fallible work follows this assignment
      return { runId: rollbackRunId };
    } catch (error) {
      if (!successCommitted) {
        await ledger.finalizeRun({
          runId: rollbackRunId,
          status: "failed",
          error: toSafeFullSiteErrorCode(error, "site_package_rollback_failed"),
        });
      }
      throw error;
    }
  };
  return ledger.withPackageLock
    ? ledger.withPackageLock(source.packageKey, execute)
    : execute(); // pure injected fakes only; concrete DB paths always lock
}
```

**Data flow:** valid actor -> private graph validation with zero dependency/DB
access -> acquire ledger -> global lock -> package lock -> source/current-state
re-read -> deterministic planning from that exact graph -> complete
pass-one allocation of all nine create-ID kinds -> complete identity/ID registry
-> pass-two graph-approved reference resolution, native-owner validation and
complete prior/staged/final snapshot preparation -> only then run/fingerprint
creation -> already-validated snapshots, targets and dependency envelopes
durably prepared -> one domain-local transaction per
aggregate mutation with locked expected-snapshot CAS -> success snapshot ->
publish dependencies at the end -> one
final reversible shell/settings stage -> cache invalidation -> audit/finalization
-> reverse lock release.

Explicit rollback keeps the same locks while it revalidates the source and any
automatic-compensation run, durably claims/creates or resumes the rollback run,
loads raw prior outcomes, validates them one-to-one against the raw source set
before deriving the completed-success set, validates the raw source graph, and
parses every raw item's complete evidence in one zero-native preflight. It
rejects any noop whose
strict durable after envelope, status/phase pair or null staged target is invalid,
or whose complete before snapshot and top-level final `id`/`desired` target differ,
and obtains only classifier hints without resolving noop native state.
It fresh-refines every
non-completed create/update by exact durable ID,
checks successful-source ownership only for authoritative applied reversals, and
schedules remaining branches with `position DESC, kind ASC, key ASC` as the exact
ready-node tie-break. Each outcome preserves the source operation, swaps the raw
snapshot columns and preserves the exact rollback action. Only narrow injected fakes may use
`hasSuccessfulRollback` plus `createRollbackRun` when `claimRollbackRun` is
absent. Any error after an owned or resumed claim and before committed success
finalizes that rollback run failed with a safe code; a contender does not
finalize `busy` or already-complete claims. After successful compensation, a
running interrupted source is finalized failed with
`site_package_apply_interrupted` before rollback success is committed as the
final fallible operation.

**Error handling:** conflict before mutation; known domain errors retain
machine-readable codes; unexpected errors are redacted. Failure must not leave a
new shell pointing at incomplete/deleted resources. Compensate every completed
saga branch in dependency-safe reverse order before returning failure and record
both the source failure and every success/failed/blocked compensation outcome.
`site_package_recovery_missing_intended_id`,
`site_package_rollback_dependency_invalid` and
`site_package_rollback_dependency_blocked`,
`site_package_rollback_ledger_failed`, plus
`page_revision_snapshot_too_large`, `entry_revision_snapshot_too_large` and
`detail_page_revision_snapshot_too_large`, are safe machine codes owned by L01.

**Regression-test shape:** first apply complete; second apply no duplicates;
intended managed update with matching successful ledger ID; natural-key equality
without ledger proof conflicts as unmanaged; injected failure restores prior
state; rollback restores previous shell/settings and only owned rows;
invalid/dangling/bad-path refs perform zero lock, ledger, resolver, adapter and
DB calls; the public input/deps reject a structural `referencePlan`; one private
plan and zero normalizations occur at typed apply before dependencies; the
planner consumes the same array identity without calling the builder again, then
preparation consumes those same frozen descriptors without a second walker. The
two-argument planner separately builds once/normalizes zero times. Malformed post-substitution desired
snapshots for every native kind fail before `createRun`, item/domain writes or
publish, including discriminator-valid refs embedded in an otherwise invalid
Page/Menu document. Drafts are not published early,
menu is completely wired before publish, and shell settings are the last stage.
Also prove exact expected-ID resolution with no natural fallback; deterministic
natural-collision handling; atomic Form/Menu/Page/entry/detail mutations; a real
SIGKILL after each of the nine exact-ID native commits and before ledger success;
dependency failure blocks only its transitive prerequisites; legacy missing
dependency evidence stops after failure; and two different packages cannot
interleave shared-shell apply/rollback or lose exact prior values. Page and detail
Page tests must begin with divergent current versus published documents and
non-empty revision histories, then prove byte/value-identical restoration.
For Page, entry and detail Page, also prove exactly 100 revisions capture/restore,
101 fails before mutation without truncation, replace detects drift after capture,
and restore detects a race after recovery/current-state capture with zero partial
writes.
Pin that every executor mutation supplies `FullSiteSagaAdapterApplyInput`, the
deprecated base-input mutation branch is reachable only by the pre-L03
compatibility call, an apply-time noop performs zero resolver/adapter/native reads
or writes while retaining its graph node and phase-updating the same durable after
envelope from `prepared` to `complete`, and final L03 scheduling calls
`classifyInterruptedSagaItems` only
after raw-field and graph validation. Claim/resume/busy/complete and every post-claim error
must preserve durable outcomes, safe finalization and the actual returned rollback
run ID. Grounded rollback cases must additionally prove: planner-projection
equality cannot authorize update restore or create deletion; exact complete
before/after/other-state comparisons produce recovered/restore/conflict with no
partial write; missing/malformed complete snapshots and snapshot-ID mismatch fail
before native access; a non-completed noop requires a strict
`FullSiteDurableAfterSnapshotV1` raw `afterSnapshot` whose top-level `id`/`desired`
canonical-deep-equals the complete before snapshot with the identical exact ID,
whose `recovery.stagedSnapshot` is `null`, and whose status/phase is
`planned`/`prepared`; a successful noop instead requires `success`/`complete`, and
`failed`/`skipped` noops fail the same global boundary. A valid non-completed noop
bypasses the resolver and all adapter/native reads and records the source-faithful
noop outcome without a native write; a present create is deleted only after its
exact-ID fresh
snapshot equals durable after, while absence is recovered; successful-source
applied reversals require all four managed-evidence predicates, but running/
failed sources do not. An already-recovered create/update needs no guard after
fresh refinement. A preflight-authorized noop needs neither guard nor native
read. No classifier hint, including `not_applied` or
`already_recovered`, may bypass create/update refinement or applied ownership.
Pin ready-node ordering as
`position DESC, kind ASC, key ASC`; outcome rows retain original
`create | update | noop`, swapped snapshot values and the immutable raw source
`rollbackAction`, without `delete | restore`; an outcome-ledger failure reports
`site_package_rollback_ledger_failed` and prevents every later native call.
Prior-success resume tests reject duplicate/extraneous identities, position or
operation drift, unswapped/unequal decoded JSONB, and unequal action as
`site_package_rollback_invalid_source` before native access; reordered object
keys and matching legacy-null action pass, but reordered arrays do not. L02/L03
status/phase tests import the shared frozen V1 matrix, accept exactly its six
rows, and reject every `failed`/`skipped` source row plus the Cartesian
complement.
Inject interrupted-source finalization failure after compensation, assert the
rollback run is failed rather than first committed success, then resume from
durable outcomes and prove source-failed precedes the single final rollback-
success commit without a catch rewrite.
Pin that malformed complete evidence in any raw source item, including a noop
with a raw/plain final snapshot instead of the strict durable envelope, an invalid
status/phase pair or a non-null `recovery.stagedSnapshot`, fails before the
classifier, resolver or adapter is touched; every non-completed create/update
classifier hint, including `not_applied` and `already_recovered`, is
fresh-refined before any outcome.
Valid noops use only the global source-evidence preflight, compare the complete
before snapshot with the envelope's top-level `id`/`desired` rather than comparing
the raw before/after JSON, and issue zero resolver/adapter/native reads or writes.
Settings tests group the ready frontier exactly once, preflight all keys
before one locked batch call, persist outcomes only after native success and
block the union dependency closure on a batch conflict/failure. Race every
native conditional delete plus both shared settings apply/raw-restore batches
after outer capture to prove the owner re-read rejects drift with zero partial
writes. Raw-reader tests prove unknown/delete/restore operations and scalar/
array/null fields reach L03 rather than disappearing. Catch tests prove an item
failure leaves the last durable row untouched and only the source run becomes
failed. Stage-commit and publish-commit/phase-upsert failures prove an outcome is
derived from the immutable raw row, then a later resume consumes that outcome
without using an in-memory overlay.

## Sub-Tasks

- [ ] **TASK-547-02-L01** — installer split and deterministic plan resolver.
- [ ] **TASK-547-02-L02** — native resource adapters, ref resolution, complete
  snapshot capture, no-read noop classification and saga execution; consumes the
  L01 ledger.
- [ ] **TASK-547-02-L03** — failure atomicity, reverse rollback and DB/security
  tests, including strict noop source-evidence preflight and source-faithful
  zero-read/write noop outcomes.

## Testing Requirements

- `set -a && source /home/coder/project/Coderso/.env && set +a`
- Use that command only to load DB/settings validation variables; never inspect,
  print, copy, hash or persist `.env` contents.
- `bun test --timeout 360000 tests/unit/kits/installService.test.ts tests/integration/routes/solutionKitsRoutes.test.ts`
- `bun test --timeout 360000 tests/unit/content/typeService.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/unit/content/listingTemplatesService.test.ts tests/unit/content/listingQueriesService.test.ts tests/unit/settings/settingsService.test.ts tests/unit/settings/fullSiteSettingsAtomicService.test.ts`
- targeted Form/Menu/Page/entry/detail aggregate/lifecycle and full-site adapter
  suites from L02, including all nine exact-ID replace/delete race cases
- `bun test --timeout 360000 tests/integration/kits/fullSiteManagedOwnershipDb.test.ts`
- `bun test --timeout 360000 tests/unit/kits/fullSiteCompensationDependencies.test.ts`
- `bun test --timeout 360000 tests/integration/kits/fullSiteCrashRecoveryDb.test.ts` (real SIGKILL
  matrix and two-package shared-shell concurrency)
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run scan:security:strict`
- touched-file line counts

## Documentation Updates Required

Provide verified contract deltas to TASK-547-06, the sole shared-doc writer.
