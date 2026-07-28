# TASK-547-02-L03: Failure Atomicity, Rollback and Security Tests
# FileName: TASK-547-02-L03-Failure-Atomicity-Rollback-And-Security-Tests.md

**Parent Subtask:** TASK-547-02
**Priority:** Critical
**Category:** Reliability / Security Testing
**Estimated Effort:** Large
**Dependencies:** TASK-547-02-L01 for the pre-land bridge;
TASK-547-02-L02 for final completion
**Status:** 🚧 In Progress
**Validation:** Corrective crash-recovery/rollback work and fresh DB/security
evidence are pending.

## Overview

Complete reverse rollback, failure compensation and DB-backed lifecycle/security
coverage. Replace position-only continuation with dependency-aware branch safety,
and prove recovery after real process death rather than only an injected throw.

Atomicity is frozen as a compensation saga. Do not add a cross-domain
transaction abstraction or transaction parameters to all native services.
Pre-run `prepareFullSiteSaga` failures create no source run and never enter L03.
L01 atomically creates the source run and its complete prepared item set; a
failed initialization transaction leaves neither row family durable and cannot
enter compensation. L02 never calls native code until that atomic commit
returns. L03 therefore accepts only an absent legacy manifest or a manifest
that exactly describes the complete source-row set; partial initialization is
corrupt evidence, not a recoverable saga state.

## Count-Neutral Pre-Land Compatibility Checkpoint

After corrective L01 completion and before L02, land only the pure
`compensation.ts`, minimum compatibility wiring in the already-owned
`rollback.ts`, and DB-free injected cases in the already-owned service test.
L03 stays `🚧 In Progress`; this adds no leaf/path/owner. `compensation.ts` may
import only committed L01 install/package types and standard-library utilities;
it must not import L02 adapters/types/staging, settings/native/DB/runtime modules.

The bridge exports `compensateItems` plus injected adapter types. Non-setting
kinds retain per-item reversal; setting is a required all-or-none batch:

```ts
type CompatibilityItemRollbackAdapter = Readonly<{
  reverseCompatibility(input: Readonly<{
    item: RawFullSiteInstallLedgerItem;
    actorId: string;
  }>): Promise<void>;
}>;
type CompatibilitySettingsRollbackAdapter = Readonly<{
  reverseSettingsCompatibilityBatch(input: Readonly<{
    items: readonly RawFullSiteInstallLedgerItem[];
    actorId: string;
  }>): Promise<void>;
}>;
type CompatibilityRollbackAdapters = Readonly<Record<
  Exclude<FullSiteInstallResourceKind, "setting">,
  CompatibilityItemRollbackAdapter
>> & Readonly<{ setting: CompatibilitySettingsRollbackAdapter }>;
export async function compensateItems(input: Readonly<{
  items: readonly RawFullSiteInstallLedgerItem[];
  priorOutcomes: readonly RawFullSiteInstallLedgerItem[];
  currentSource: FullSiteInstallRun;
  actorId: string;
  adapters: CompatibilityRollbackAdapters;
  ledger: FullSiteInstallLedgerPort;
  rollbackRunId: string;
}>): Promise<void>;
```

Before any adapter/native call, validate the complete raw source/prior sets, all
registry entries and the setting callback's function shape. Duplicate setting
identity/key or malformed setting evidence fails in that zero-call preflight.
Group every setting and sort it by the shared `position DESC, kind ASC, key ASC`
comparator. Call `reverseSettingsCompatibilityBatch` exactly once when nonempty,
never per key; its atomic contract rejects with fake/native state byte-identical.
Only after the whole promise resolves may the bridge write each setting success
outcome. Propagate failure with zero setting-success outcomes. Non-setting
reversals remain deterministic per-item calls. `compensation.ts` has no native
default registry, mutable registration, dummy/no-op fallback or L02 import.

The minimal suite also pins a successful nonempty setting group to one batch,
callback resolution before all setting outcomes, and zero batch calls when
empty. `rollback.ts` alone retains the current compatibility default wiring;
the checkpoint runs root/core gates. Final L03 replaces it with L02's native
`reverseSettingsBatch` once, never another bridge or per-key setting path.

**Exact production ownership:** only
`core/services/kits/fullSiteInstall/rollback.ts` and
`core/services/kits/fullSiteInstall/compensation.ts`; both existing paths are
writable during preland. Preserve canonical `rollbackFullSiteInstall(input)`;
`rollback.ts` owns that function and the exact exported
`RollbackFullSiteInstallInput` type below. Do not introduce a renamed
replacement.

**Exact test/fixture ownership:**

- split and retain `tests/unit/kits/fullSiteInstallService.test.ts` below 1,000
  lines for service/claim/resume/snapshot behavior;
- new `tests/unit/kits/fullSiteCompensationDependencies.test.ts` for the pure
  dependency scheduler and failure branches;
- new `tests/integration/kits/fullSiteCrashRecoveryDb.test.ts` for real process
  death and two-package shared-shell coordination;
- new `tests/fixtures/task547/fullSiteCrashWorker.ts` as the only child-process
  worker.

The current near-limit service suite must be split before adding cases; every
touched/created production and test file remains independently runnable and at
most 1,000 physical lines. During the split, remove its old DB managed-identity
cases only after confirming the L01-owned
`fullSiteManagedOwnershipDb.test.ts` carries each equivalent assertion; retain
all unique rollback/claim/resume/recovery behavior under L03.

**Forbidden for L03 edits:** every L01 planner/types/ledger/current-resource
resolver/legacy path and test; every L02 adapter/executor/staging/domain service
and test; task board/changelog/shared docs. Final L03 may import committed L02
contracts/default registry read-only. Cross-leaf fixes return to their writer.

## Dependency-Aware Compensation Contract

`compensation.ts` owns exact exports `buildRollbackDependencyGraph`,
`collectTransitiveRollbackDependencies`,
`preflightPriorRollbackSuccessOutcomes`, `preflightRollbackEvidence`,
`refineAllRollbackStates`, `reverseSettingsBatch`,
`compensateDependencyBranches` and the existing gate-safe compatibility name
`compensateItems`. It reads, but never redefines, L01's
`readFullSiteRollbackActionV1`. Its two global preflights alone consume L01's
`RawFullSiteInstallLedgerItem`; graph/classifier APIs receive the strict
`PersistedFullSiteInstallLedgerItem` produced from every raw row.

Final `compensateItems(input)` extends the pre-land export used by L02
`execute.ts`; it is not a second position-only algorithm. Its `items` input is the complete raw
source set freshly reloaded from the DB after the rollback claim. Persisted raw
rows are immutable provenance; any in-memory phase overlay is diagnostic-only
and never becomes an input item, preflight `persistedSourceItem`, outcome snapshots,
operation or action. This path requires V1 evidence for every current item,
strictly validates every raw row before building the graph and calling L02's
`classifyInterruptedSagaItems`, then delegates to
`compensateDependencyBranches`. It must not filter noop, planned or not-applied
items before graph validation. The checkpoint lets L02 pass its gate; final L03
upgrades that same function to the shared scheduler.
Its final `CompensateItemsInput` requires `currentSource: FullSiteInstallRun` and
`items`/`priorOutcomes: readonly RawFullSiteInstallLedgerItem[]`;
L02 supplies the fresh validated source through the structural local-variable
bridge plus the raw claimed-run outcomes frozen in L02, and explicit rollback
passes its locked source re-read and raw outcomes. No caller constructs the
completed-identity set.

Both automatic compensation and explicit rollback pass
`currentSource.options?.initializationPlanV1` into the same
`preflightRollbackEvidence` boundary. An absent manifest selects the existing
legacy/general validation path. A present manifest is parsed with L01's
`readStrictInitializationPlanV1` and must match the complete raw row set exactly
by length, contiguous position, kind, key and operation. A missing row, gap,
reorder, duplicate, extra row or malformed manifest throws cause-free
`site_package_rollback_invalid_source` before classification, outcome writes or
native access. A complete prepared set continues through the ordinary shared
preflight/classifier/scheduler; when native state still equals every before
snapshot it records source-faithful recovered/noop outcomes with zero native
reversals.

L02 deliberately retains two checkpoint surfaces: the base-shape
`AdapterApplyInput` branch used only by `reverseCompatibility`, and the array
`recoverInterruptedSagaItems` wrapper used by the pre-final rollback facade.
Final L03 removes production calls to the former through
`restoreSnapshotAtomic`; compensation/rollback imports only
`classifyInterruptedSagaItems`. It does not use the deprecated recovery wrapper,
does not treat its projected array as graph evidence and does not introduce a
third recovery alias.

The graph includes every persisted plan item, including noop items needed to
connect transitive paths. For current runs whose options declare
`rollbackDependencySchemaVersion:1`, every item must carry a valid V1 action;
missing target identities, self edges, duplicates, cycles, unknown kinds or
malformed evidence cause `site_package_rollback_dependency_invalid` before the
first native reversal. A legacy run without that option is marked
`dependencyKnowledge:"legacy-unknown"`; missing evidence is never treated as an
empty dependency list.

The boundary always begins with the complete raw result of
`ledger.listRawItems(sourceRunId)`. While native access is forbidden,
`preflightRollbackEvidence` strictly parses every field of every raw source row,
including completed/noop items, as operation-specific L02 complete evidence:
before plus raw `afterSnapshot` through
`readFullSiteDurableAfterSnapshotV1`, whose exact fields are top-level
`id`/`desired` and `recovery.schemaVersion`, `recovery.phase` and
`recovery.stagedSnapshot`. Missing/unknown keys, malformed JSON, invalid phase,
create/update/noop matrix violations, unknown/delete/restore operations, invalid
scalar/array fields or a snapshot ID mismatch fail the whole run before graph,
classification, exact-ID capture or reversal. No row may be filtered, normalized
to null or otherwise disappear. The resulting persisted items alone feed graph
and classifier APIs.
The operation matrix requires a create's exact prior absence as
`beforeSnapshot:null` (mapped to `{ key, present:false }` for settings), an
update's complete non-null prior snapshot with the durable ID, and a noop's
non-null canonical complete `beforeSnapshot` plus a strict durable after
envelope. For noop, the envelope's top-level `id`/`desired` complete final target
must canonical-deep-equal the before snapshot with the identical exact ID,
`recovery.schemaVersion` must be `1`, and `recovery.stagedSnapshot` must be
`null`; raw before/after JSON is intentionally unequal because only the latter
contains `recovery`. The only valid source status/phase pairs are
`planned`/`prepared` and `success`/`complete`; a noop source row with `failed` or
`skipped` status is invalid. Any envelope, equality, ID, staged or status/phase
mismatch fails before classification/resolver/adapter/native access. Completed
rollback identities receive this same parse; they are excluded only from later
operation-specific handling.

For every source operation, this pass imports L02's exact
`isValidFullSiteDurableSourceStatusPhaseV1` owner. The only six rows are
create/update `planned/prepared`, `success/staged`,
`success/publish_prepared`, `success/complete`, and noop `planned/prepared`,
`success/complete`; staged/publish requires a non-null staged target. Every
source `failed`/`skipped` row is invalid. Both suites import and exhaust this
single frozen matrix rather than copying pair lists.

Only after raw preflight and complete graph validation does L03 call L02's exact
`classifyInterruptedSagaItems({ items, resolveCurrentResource })`. That helper
returns one ordered `FullSiteSagaRecoveryClassification` per persisted item; the
scheduler treats each `hint` as diagnostic/scheduling input only and never as an
outcome or mutation decision. For a source noop it emits the operation-derived
diagnostic `noop` without invoking the current-resource resolver. A valid
non-completed noop becomes authoritative only from the already-preflighted source
operation plus equality between the complete before snapshot and the envelope's
top-level final target, is recorded as a source-faithful noop outcome and issues
zero resolver/adapter/native read or write. Every
non-completed create/update hint, including `not_applied` and
`already_recovered`, proceeds through fresh exact-ID capture and the exact
`refineAllRollbackStates` pass. Graph nodes/dependency evidence are never
removed. The deprecated array-returning
`recoverInterruptedSagaItems` remains only to make the earlier L02 gate compile
against the then-untouched rollback facade.

Execute successful create/update mutations in deterministic reverse topological
order. Ready nodes use exactly `position DESC, kind ASC, key ASC`; this comparator
is only the deterministic tie-break inside the reverse topological scheduler.
Settings retain one atomic raw-restore batch through the exact
`reverseSettingsBatch` seam below; per-setting restore/delete fallback is
forbidden. A batch failure is a native failure for every affected setting item.

After a native reversal failure for identity `X`:

1. durably record `X` failed with the safe native code;
2. compute `X`'s complete transitive dependency closure (the prerequisites that
   must remain because the failed dependent may still point at them);
3. record those not-yet-mutated items `skipped` with
   `site_package_rollback_dependency_blocked` and never invoke their adapters;
4. continue ready items outside that closure only when their complete V1 paths
   prove independence;
5. finalize the rollback run failed after all provably independent branches are
   attempted.

If a native failure occurs in `legacy-unknown` mode, no remaining branch is
proven independent: stop all remaining native calls conservatively and finalize
failed. Only durable `success` outcomes enter the completed set; a
blocked/skipped item is never mistaken for completed.

Before constructing that set, the zero-native exact export
`preflightPriorRollbackSuccessOutcomes({ sourceItems, priorOutcomes })` validates
every raw prior row against one unique raw source item. Kind/key identity and
position must be unique and non-extraneous, operation must equal the source
`create | update | noop`, `beforeSnapshot` must equal the raw source
`afterSnapshot`, `afterSnapshot` must equal the raw source `beforeSnapshot`, and
`rollbackAction` must equal its source counterpart. Each raw field first passes
its strict operation/schema shape (snapshots/actions object-or-null as
applicable); its decoded values are then validated as `JsonValue` and compared
with L02's
`fullSiteJsonValuesEqual`; object keys are lexicographically canonicalized,
arrays remain ordered, and primitives/null use JSON encoding. Matching
legacy-unknown `rollbackAction:null` is legal; no value is defaulted or rebuilt.
A source identity may have zero or one outcome. Prior `planned`, duplicate/extra
or unequal rows throw the existing safe
`site_package_rollback_invalid_source` before graph/classifier/native access.
Strict valid failed/skipped outcomes remain retryable; only valid success rows
enter the returned completed set.

After global evidence parsing and L02 hint classification, L03 obtains a fresh
complete snapshot for every non-completed create/update by the durable final-
after ID only. A noop performs no native-state lookup because its apply path made
no native mutation; the preflighted source operation and canonical equality of
the complete before snapshot with the durable envelope's top-level final target
are its sole outcome authority, never its classifier hint. The planner/
current-resource equality projection never proves complete native state and never
authorizes a recorded outcome, skip or reversal. For an update, fresh equality
with the exact durable before is `already_recovered`; equality with an allowed
exact durable applied target is `applied`; absence or every other state is
`site_package_rollback_conflict`. For a create, absence at the exact durable ID
is `already_recovered`; a present row must equal an allowed exact durable applied
target or it conflicts. A successful source permits only the final after target;
a running/failed source may also match the exact staged target because it can
have died between stage and publish. These complete comparisons override every
classifier hint.

An applied update calls
`restoreSnapshotAtomic({ id, expectedCurrent:fresh, target:before, actorId })`.
An applied create calls
`deleteSnapshotAtomic({ id, expectedCurrent:fresh, actorId })`; plain
`deleteById` is forbidden. Each native owner locks and re-reads the complete
aggregate and compares the same `expectedCurrent` inside its transaction, so a
capture-to-delete/restore race throws `site_package_state_changed` before any
write. Settings use equivalent presence-aware raw before/final-after authority
and L02's one locked compare-and-raw-restore batch.
L02's `FULL_SITE_ROLLBACK_ADAPTERS` owns
`captureSnapshotByIdOrNull(id)` over `captureSnapshotById(id)`; it converts only
the native owner's exact-ID not-found result to `null`, propagates every other
error and never performs a natural-key lookup. L03 consumes it read-only.

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
the identity before this check. Every applied setting in the atomic batch passes
this guard before the single batch write begins. No guard can convert a hint or
non-equal complete state into applied authority.

Freeze the settings scheduler seam and sequence:

```ts
export type ReverseSettingsBatchSchedulerInput = Readonly<{
  items: readonly RefinedRollbackItem[];
  actorId: string;
  adapter: FullSiteRollbackAdapters["setting"];
}>;
export type RollbackNativeResult = Readonly<{
  refined: Exclude<RefinedRollbackItem, { state: "conflict" }>;
  outcome: "reversed" | "already_recovered" | "noop";
}>;
export async function reverseSettingsBatch(
  input: ReverseSettingsBatchSchedulerInput,
): Promise<readonly RollbackNativeResult[]>;
```

At the settings frontier, `compensateDependencyBranches` sorts every ready
non-completed setting by the frozen comparator and forms exactly one group. The
global pass has source-evidence-authorized every noop without native access,
fresh-captured every create/update member and checked every applicable
successful-source ownership predicate. `reverseSettingsBatch` rejects a
wrong-kind, unsorted or conflict-bearing group before native access, constructs
all `FullSiteNativeReversal` values, and, when at least one member is applied,
invokes the required L02
`adapter.reverseSettingsBatch({ items:appliedReversals, actorId })` exactly once.
It returns source-associated native results but never writes outcomes. The L02
batch locks/re-reads all keys and either restores the whole raw batch or writes
nothing. Only after that call returns (or when every member is exactly already
recovered/noop) does `compensateDependencyBranches` persist source-faithful
outcomes in comparator order. Any outcome write failure stops immediately; retry
repeats global source-evidence preflight/noop authorization and fresh create/
update refinement. A group conflict or native batch failure
performs zero per-key fallback and blocks the union of the transitive dependency
closures of every applied/conflicting setting in that group; it is never reduced
to one arbitrarily selected setting branch.

Every rollback outcome row is derived from the immutable raw DB source row, not
from a merged/in-memory phase overlay. It preserves the source item's original
`create | update | noop` operation, swaps its raw source snapshot columns
(`beforeSnapshot = source.afterSnapshot`,
`afterSnapshot = source.beforeSnapshot`) and copies the exact source
`rollbackAction`; rollback never records synthetic `delete` or `restore`
operations. The overlay is diagnostic-only; fresh exact native state owns the
reversal/recovery decision. Any outcome-ledger write failure becomes
`site_package_rollback_ledger_failed`, stops all remaining native calls
immediately and fails the rollback run; retry uses exact complete-state capture
to recognize a native reversal that committed before its outcome write.

After compensation succeeds, an interrupted `running` source is finalized
`failed` with `site_package_apply_interrupted` first. Rollback `success`
finalization is the final fallible operation, after which `successCommitted` is
set and no catch path may rewrite that successful rollback. Every created/resumed
post-claim failure before that commit, including interrupted-source finalization
failure, finalizes the owned rollback run `failed` with a safe code and remains
resumable from its durable successful outcomes.

L03 rollback adapters call L02's `restoreSnapshotAtomic` or
`deleteSnapshotAtomic` for all nine UUID-backed resource kinds. They never
implement the old `applyStaged` then publish sequence or call a plain native
delete. Every prepared required-kind create with missing/null/malformed ID
fails before any native adapter call and cannot fall back to a natural key. For
Page, entry and detail Page, both durable and fresh complete snapshots include
distinct current/published state, publication metadata and the exact bounded
ordered revision rows; restore never truncates them. The native owner locks and
re-reads its complete state, canonical-compares it to `expectedCurrent`, and
throws `site_package_state_changed` before writes if state raced between fresh
capture and restore.

## Atomic Initialization Evidence

There is no partial-initialization rollback branch. L01 owns the strict
`initializationPlanV1` reader and the transaction that writes a run plus all of
its prepared items. L03 consumes that reader only inside the shared global raw
preflight used by automatic compensation and explicit rollback.

No manifest selects legacy/general behavior. A present manifest requires an
apply-mode source and must match the entire raw source set exactly by count,
contiguous position, kind, key and operation. Empty is valid only for an empty
manifest. Missing, extra, reordered, gapped or duplicate rows, a partial set,
or hostile/malformed manifest evidence fails
`site_package_rollback_invalid_source` before outcomes, classifier/resolver,
adapter or native access. The boundary never fills a missing tail, treats a
partial set as success or emits synthetic outcomes for absent rows.

A valid complete set follows the same operation/evidence preflight, dependency
graph, classifier, fresh exact-ID refinement and scheduler as every other run.
Thus a crash after atomic initialization commit but before native I/O produces
one source-faithful recovered/noop outcome per item and zero native reversals.
Prior rollback outcomes still pass the ordinary exact one-to-one preflight;
source and rollback finalization keep the normal resumable ordering.

## Security Contract

Service only. A syntactically valid actor UUID is required and validated before
DB access for apply/dry-run/rollback. Never delete reused or unmanaged rows.
Dry-run may persist safe ledger evidence but writes zero domain resources/settings.
All DB fixtures use unique package/resource/actor markers and delete only exact
owned rows in dependency-safe order; never truncate shared tables. The suite split
removes the inherited `site.locale` singleton mutation: L02 owns real atomic-settings
DB restoration coverage and L03 retains an injected-adapter unit assertion only. Worker argv/
stdout excludes DB URLs, package payloads, settings values, submissions and
secrets. No public endpoint is added. No database migration is added. No RBAC/
CSRF/rate-limit change, scanner suppression or cross-domain transaction
abstraction.

## Implementation Pseudocode

```ts
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
      operation: input.persistedSourceItem.operation, // raw-row provenance
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

export type RollbackResourceAdapter = Pick<
  ResourceAdapter,
  "restoreSnapshotAtomic" | "deleteSnapshotAtomic"
> & {
  captureSnapshotByIdOrNull(id: string): Promise<FullSiteNativeSnapshot | null>;
};

export type FullSiteRollbackAdapters =
  Record<Exclude<FullSiteInstallResourceKind, "setting">, RollbackResourceAdapter> & {
    setting: RollbackResourceAdapter & Required<
      Pick<ResourceAdapter, "reverseSettingsBatch">
    >;
  };

// The structural type is finalized here; the concrete
// FULL_SITE_ROLLBACK_ADAPTERS value is owned/exported by L02 adapters.ts.

type PreflightedRollbackEvidenceBase = Readonly<{
  identity: FullSiteResourceIdentity;
  persistedSourceItem: PersistedFullSiteInstallLedgerItem;
  durableAfter: FullSiteDurableAfterSnapshotV1;
  finalTarget: FullSiteNativeSnapshot;
  phase: "prepared" | "staged" | "publish_prepared" | "complete";
}>;
export type PreflightedRollbackEvidence = PreflightedRollbackEvidenceBase & (
  | Readonly<{ operation: "create"; before: null;
      stagedTarget: FullSiteNativeSnapshot | null }>
  | Readonly<{ operation: "update"; before: FullSiteNativeSnapshot;
      stagedTarget: FullSiteNativeSnapshot | null }>
  | Readonly<{ operation: "noop"; before: FullSiteNativeSnapshot;
      stagedTarget: null }>
);

export function preflightRollbackEvidence(input: Readonly<{
  items: readonly RawFullSiteInstallLedgerItem[];
  initializationPlanV1: unknown;
}>): readonly PreflightedRollbackEvidence[];

export function preflightPriorRollbackSuccessOutcomes(input: Readonly<{
  sourceItems: readonly RawFullSiteInstallLedgerItem[];
  priorOutcomes: readonly RawFullSiteInstallLedgerItem[];
}>): ReadonlySet<FullSiteResourceIdentity>;

export type RefinedRollbackItem =
  | Readonly<{
      state: "noop";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Extract<PreflightedRollbackEvidence, { operation: "noop" }>;
    }>
  | Readonly<{
      state: "already_recovered";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
    }>
  | Readonly<{
      state: "applied";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
      reversal: FullSiteNativeReversal;
    }>
  | Readonly<{
      state: "conflict";
      classification: FullSiteSagaRecoveryClassification;
      evidence: Exclude<PreflightedRollbackEvidence, { operation: "noop" }>;
      error: "site_package_rollback_conflict";
    }>;

export async function refineAllRollbackStates(input: Readonly<{
  parsed: readonly PreflightedRollbackEvidence[];
  classifications: readonly FullSiteSagaRecoveryClassification[];
  adapters: FullSiteRollbackAdapters;
  currentSource: FullSiteInstallRun;
  ledger: FullSiteInstallLedgerPort;
  completedIdentities: ReadonlySet<FullSiteResourceIdentity>;
}>): Promise<readonly RefinedRollbackItem[]>;

export async function compensateItems(input: CompensateItemsInput) {
  const parsed = preflightRollbackEvidence({
    items: input.items,
    initializationPlanV1: input.currentSource.options?.initializationPlanV1,
  }); // strict unknown-to-persisted parse of every row; zero native access
  const completedIdentities = preflightPriorRollbackSuccessOutcomes({
    sourceItems: input.items,
    priorOutcomes: input.priorOutcomes,
  }); // exact decoded-JSONB one-to-one proof; zero native access
  const persistedSourceItems = parsed.map(
    (evidence) => evidence.persistedSourceItem,
  );
  const graph = buildRollbackDependencyGraph({
    items: persistedSourceItems,
    declaredVersion: 1,
    readAction: readFullSiteRollbackActionV1,
  });
  const classifications = await classifyInterruptedSagaItems({
    items: persistedSourceItems,
    resolveCurrentResource: input.resolveCurrentResource,
  }); // noop is operation-derived and invokes no resolver/native read
  const refinements = await refineAllRollbackStates({
    parsed,
    classifications, // never authority, including not_applied/already_recovered
    adapters: input.adapters,
    currentSource: input.currentSource,
    ledger: input.ledger,
    completedIdentities,
  }); // parsed-evidence noops; fresh exact-ID refinement for create/update only
  return compensateDependencyBranches({
    ...input,
    graph,
    refinements,
    completedIdentities,
    reverseOne: reverseRefinedNativeSnapshot,
    reverseSettingsBatch,
    readyComparator: compareRollbackReadyNodes,
    recordOutcome: recordRollbackOutcome,
    onNativeFailure: "block-transitive-dependencies",
    onSettingsFailure: "block-union-transitive-dependencies",
    onOutcomeFailure: "stop-all",
    onUnknownDependencies: "stop-conservatively",
  });
}

async function reverseRefinedNativeSnapshot(input: ReverseOneInput) {
  if (input.refined.state === "noop") {
    return "noop"; // globally parsed source evidence; zero native read/write
  }
  if (input.refined.state === "already_recovered") {
    return "already_recovered"; // fresh exact-ID create/update; zero native write
  }
  if (input.refined.state === "conflict") throw new Error(input.refined.error);
  if (input.refined.reversal.operation === "create") {
    await input.adapter.deleteSnapshotAtomic({
      id: input.refined.reversal.id,
      expectedCurrent: input.refined.reversal.expectedCurrent,
      actorId: input.actorId,
    });
  } else {
    await input.adapter.restoreSnapshotAtomic({
      id: input.refined.reversal.id,
      expectedCurrent: input.refined.reversal.expectedCurrent,
      target: input.refined.reversal.target,
      actorId: input.actorId,
    });
  }
  return "reversed";
}

export type RollbackFullSiteInstallInput = {
  sourceRunId: string;
  actorId: string;
  ledger?: FullSiteInstallLedgerPort;
  adapters?: FullSiteRollbackAdapters;
  resolveCurrentResource?: FullSiteCurrentResourceResolver;
};

export async function rollbackFullSiteInstall(
  input: RollbackFullSiteInstallInput,
): Promise<{ runId: string }> {
  assertActorUuidBeforeDb(input.actorId);
  const ledger = input.ledger ?? defaultLegacyInstallLedger;
  const source = await requireApplySource(input.sourceRunId, ledger);
  const execute = async () => {
    const preClaimSource = await requireApplySource(input.sourceRunId, ledger);
    if (preClaimSource.packageKey !== source.packageKey) {
      throw new Error("site_package_rollback_invalid_source");
    }
    const automaticCompensation =
      await validateAutomaticCompensationSource(preClaimSource, ledger);

    let rollbackRunId: string;
    let completedClaim = false;
    if (ledger.claimRollbackRun) {
      const claim = await ledger.claimRollbackRun({
        sourceRunId: preClaimSource.id,
        packageKey: preClaimSource.packageKey,
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
      rollbackRunId = claim.id;
      completedClaim = claim.state === "complete";
    } else {
      // Narrow injected fakes may omit the claim API. Concrete DB composition may not.
      if (automaticCompensation) {
        throw new Error("site_package_compensation_not_recoverable");
      }
      if (await ledger.hasSuccessfulRollback(preClaimSource.id)) {
        throw new Error("site_package_already_rolled_back");
      }
      rollbackRunId = (
        await ledger.createRollbackRun({
          sourceRunId: preClaimSource.id,
          packageKey: preClaimSource.packageKey,
          actorId: input.actorId,
          options: { fullSitePackage: true },
        })
      ).id;
    }

    if (completedClaim) {
      const completedSource = await requireApplySource(input.sourceRunId, ledger);
      if (completedSource.packageKey !== source.packageKey) {
        throw new Error("site_package_rollback_invalid_source");
      }
      throw new Error("site_package_already_rolled_back");
    }
    let successCommitted = false;
    try {
      const postClaimSource = await requireApplySource(input.sourceRunId, ledger);
      if (postClaimSource.packageKey !== source.packageKey) {
        throw new Error("site_package_rollback_invalid_source");
      }
      const postClaimCompensation =
        await validateAutomaticCompensationSource(postClaimSource, ledger);
      if (postClaimCompensation && rollbackRunId !== postClaimCompensation.id) {
        throw new Error("site_package_rollback_conflict");
      } // owned/resumed post-claim validation belongs to the failed-finalization catch
      const rawSourceItems = await ledger.listRawItems(postClaimSource.id);
      const rawPriorOutcomes = await ledger.listRawItems(rollbackRunId);
      const parsed = preflightRollbackEvidence({
        items: rawSourceItems,
        initializationPlanV1: postClaimSource.options?.initializationPlanV1,
      }); // a present manifest must match the complete row set; partial is invalid
      const completedIdentities = preflightPriorRollbackSuccessOutcomes({
        sourceItems: rawSourceItems,
        priorOutcomes: rawPriorOutcomes,
      }); // exact zero-native one-to-one source/outcome proof
      const persistedSourceItems = parsed.map(
        (evidence) => evidence.persistedSourceItem,
      );
      const graph = buildRollbackDependencyGraph({
        items: persistedSourceItems,
        declaredVersion: postClaimSource.options?.rollbackDependencySchemaVersion,
        readAction: readFullSiteRollbackActionV1,
      });
      const classifications = await classifyInterruptedSagaItems({
        items: persistedSourceItems,
        resolveCurrentResource:
          input.resolveCurrentResource ??
          createFullSiteCurrentResourceResolver(postClaimSource.packageKey, ledger),
      }); // noop skips resolver access; no hint is outcome authority
      const adapters = input.adapters ?? FULL_SITE_ROLLBACK_ADAPTERS;
      const refinements = await refineAllRollbackStates({
        parsed,
        classifications,
        adapters, // L02 owner
        currentSource: postClaimSource,
        ledger,
        completedIdentities,
      }); // source-evidence noops; fresh complete capture for create/update only
      await compensateDependencyBranches({
        graph,
        refinements,
        actorId: input.actorId,
        adapters, // L02 owner
        ledger,
        rollbackRunId,
        completedIdentities,
        reverseOne: reverseRefinedNativeSnapshot,
        reverseSettingsBatch,
        readyComparator: compareRollbackReadyNodes,
        recordOutcome: recordRollbackOutcome,
        currentSource: postClaimSource,
        onNativeFailure: "block-transitive-dependencies",
        onSettingsFailure: "block-union-transitive-dependencies",
        onOutcomeFailure: "stop-all",
        onUnknownDependencies: "stop-conservatively",
      });
      if (postClaimSource.status === "running") {
        await ledger.finalizeRun({
          runId: postClaimSource.id,
          status: "failed",
          error: "site_package_apply_interrupted",
        });
      }
      await ledger.finalizeRun({ runId: rollbackRunId, status: "success" });
      successCommitted = true; // no fallible work follows this assignment
      return { runId: rollbackRunId };
    } catch (error) {
      if (!successCommitted) await finalizeOwnedRollbackFailedBestEffort(
        ledger, rollbackRunId, error,
      ); // suppress secondary finalization failure; primary safe error wins
      throw error;
    }
  };
  return ledger.withPackageLock
    ? ledger.withPackageLock(source.packageKey, execute)
    : execute(); // pure injected fakes only; concrete DB paths always lock
}
```

Data flow: actor validation -> L01 global/package locks -> pre-claim source read
used only to choose the claim/options -> durable rollback claim/create/resume ->
fresh post-claim source read after every non-busy claim -> prior raw outcomes plus
raw source items -> complete-manifest and global zero-native
unknown-to-persisted source parsing -> canonical decoded-JSONB one-to-one outcome
preflight and completed-success set -> strict complete V1/legacy graph validation -> exact
prepared-ID hint classification without node filtering or noop resolver access ->
source-evidence-authorized noops with zero native read/write plus exact-ID fresh
native capture for every non-completed create/update ->
already-recovered/applied/conflict refinement -> successful-source ownership guard
for applied native reversals only -> locked native restore/conditional-delete CAS
-> one preflighted locked raw settings reversal -> dependency-safe native branch reversals
with exact `position DESC, kind ASC, key ASC` ready ordering -> source-faithful
durable outcomes -> running-source failed finalization -> rollback success as the
final fallible operation. There is no separate `priorSettings` restore path. On
apply failure, the same scheduler owns automatic compensation before returning
the redacted source error. Any error after this invocation owns or resumes a
rollback run and before `successCommitted` finalizes that run failed with a safe
code; `busy` and already-complete claims are never finalized by the contender.
An already-complete claim still performs its fresh source validation, then
terminates as already rolled back without rewriting either run.

Regression tests: first apply, second noop, managed update, injected failure,
explicit rollback, prior shell restoration, malicious settings, dangling refs,
missing/malformed actor UUID performs zero DB calls,
each prior setting restored exactly once, one intended settings cache invalidation,
owned fixture cleanup, interrupted and mismatched intended-ID snapshots fail
closed, publish does not occur before dependencies/menu state are complete, and
failure at the final shell stage restores every previous shell/settings value.
L01 owns the separate DB managed-identity matrix. L03 tests consume that contract
and focus only on compensation, recovery and concurrency. Lifecycle rollback
tests use L02-captured Page/detail states with divergent current and published
documents plus non-empty revision histories and assert exact restoration.
They also prove the scheduler passes distinct complete expected-current and target
snapshots to L02's restore API and records `site_package_state_changed` without a
partial reversal when native state changes after the fresh capture. Create cases
prove the same race is rejected inside `deleteSnapshotAtomic`, and settings prove
all keys are re-read under the one native batch lock before any raw write.
The service suite pins claim states `created|resumed|busy|complete`, runs the
zero-native one-to-one prior-outcome preflight and loads only its validated
durable success rows into the completed set, preserves the narrow-fake
`hasSuccessfulRollback`/`createRollbackRun` path, finalizes every owned post-claim
error failed with a safe code, marks an interrupted running source
`site_package_apply_interrupted`, and returns the actual created/resumed rollback
run ID. Claim fakes mutate source metadata immediately after returning: every
non-busy state must trigger a fresh source read. A completed claim validates that
fresh source and reports already rolled back with zero finalization rewrite;
created/resumed claims use only the fresh source inside the failed-finalization
`try`, so a changed package, automatic-compensation link or manifest fails safely
with zero native/outcome calls and one owned rollback-failed finalization. It also
proves final L03 restore never invokes the deprecated base-input adapter branch.

The L03 service/dependency suites prove absent `initializationPlanV1` retains the
legacy/general path, while a present manifest accepts only the exact complete
row set. Empty manifest plus zero rows is complete. Missing, extra, reordered,
gapped, duplicate or incomplete rows and hostile/malformed manifests reject as
`site_package_rollback_invalid_source` before outcomes, classifier/resolver,
adapter or native access. A complete all-prepared set follows generic recovery,
records one source-faithful outcome per row and makes zero native reversals when
state still equals each before snapshot. Ordinary valid prior successes resume;
inject failure at the next outcome, source terminalization and rollback-success
commits to pin primary safe-error order, rollback-failed-before-success behavior
and resume.
Grounded rollback cases must additionally prove: planner-projection equality
cannot authorize update restore or create deletion; exact complete
before/after/other-state comparisons produce recovered/restore/conflict with no
partial write; a malformed snapshot anywhere in the raw source set fails global
preflight before classifier/resolver/adapter access; a noop whose raw
`afterSnapshot` is not a strict `FullSiteDurableAfterSnapshotV1`, whose
`recovery.stagedSnapshot` is non-null, whose status/phase is not
`planned`/`prepared` or `success`/`complete`, or whose complete before snapshot
and top-level final target are missing, canonically unequal or carry different
exact IDs fails at that same boundary. `failed`/`skipped` noop source rows are
invalid, and so are `failed`/`skipped` create/update source rows. A valid
non-completed noop bypasses the resolver and every adapter/native read/write and
records a source-faithful noop
outcome; a present create is deleted
only after its exact-ID fresh snapshot equals an allowed durable applied target
and the owner rechecks it under lock, while absence is recovered; successful-
source applied reversals require all four managed-evidence predicates, but
running/failed sources do not. An already-recovered create/update needs no guard
after fresh refinement. A preflight-authorized noop needs neither guard nor
native read. No `not_applied`, `already_recovered` or `noop`
classifier hint can supply outcome authority or bypass create/update refinement
and applied ownership. Pin ready-node ordering as
`position DESC, kind ASC, key ASC`; outcome rows retain original
`create | update | noop`, snapshot values copied/swapped from the immutable
raw source row and its exact action, without `delete | restore`; an outcome-
ledger failure reports
`site_package_rollback_ledger_failed` and prevents every later native call.
Prior-outcome cases reject duplicate/extraneous identity, position or operation
drift, unswapped/unequal decoded JSONB, unequal actions and `planned` outcome
rows as `site_package_rollback_invalid_source` before native access. Reordered
object keys, nested values and matching legacy-null actions pass; array reordering
fails. L02/L03 suites import `FULL_SITE_DURABLE_SOURCE_STATUS_PHASES_V1`, accept
its exact six rows and reject every other status/phase pair.
Inject interrupted-source finalization failure after compensation, assert the
rollback run is failed rather than first committed success, then resume from
durable outcomes and prove source-failed precedes the single final rollback-
success commit without a catch rewrite.

### Pure dependency matrix

`fullSiteCompensationDependencies.test.ts` pins chains, diamonds and independent
branches; failure of a dependent blocks every transitive prerequisite but not a
disjoint branch; settings are grouped once in comparator order, all members are
globally parsed, noop members are source-evidence-authorized without native
access, create/update members are fresh-refined and applied members are ownership-
checked before any required single batch call. No applied outcome precedes that
native success; already-recovered/noop outcomes require no native call. Batch
failure uses the union closure; malformed/new V1 graphs
or malformed complete evidence fail before adapters; legacy missing evidence stops all remaining calls
only after a failure; an outcome-ledger failure is normalized to
`site_package_rollback_ledger_failed` and stops every later native call; retries
count only durable successes and do not rerun exact already-recovered snapshots.
It pins ready ties exactly as `position DESC, kind ASC, key ASC` and asserts every
persisted outcome retains the source operation, swapped raw snapshot columns and
exact V1 `rollbackAction`, never `delete` or `restore`. It
also proves the prior-outcome preflight is zero-native, validates every raw row
one-to-one against the source set, and returns only validated successes;
duplicate/extra/malformed rows fail closed while matching legacy-null actions
remain legal. Reordered object keys and nested primitives/null compare equal;
reordered arrays do not. It also pins unknown,
delete/restore operations and scalar/array fields reach raw preflight and fail
without disappearing, while valid persisted noop/not-applied-hint nodes enter
graph/evidence validation before `classifyInterruptedSagaItems`. For noop it
pins the strict raw durable envelope, null staged snapshot, exact status/phase
matrix and canonical equality of complete before with top-level `id`/`desired`,
without asserting raw before/after equality; each valid
non-completed noop then avoids resolver/adapter/native access and records its
source-faithful outcome, while every non-completed create/update hint receives
fresh exact-ID refinement regardless of `not_applied` or `already_recovered`.
It invokes `compensateItems` with both absent and present manifests, proves a
present complete set reaches the shared scheduler, and proves every manifest/
row mismatch fails before classifier, resolver, outcome or native activity; this
pins the same boundary used by L02 automatic compensation.
A compatibility test
keeps the deprecated array-returning
`recoverInterruptedSagaItems` callable for the earlier L02 gate, while final L03
production paths prove they never call it.

### Real process-death matrix

`fullSiteCrashWorker.ts` supports only closed test modes/target kinds. In apply
mode it wraps the injected ledger port: after the real native atomic commit for
the selected create and before its success-item upsert, it emits one bounded JSON
marker `{phase:"native_committed",runId,kind,intendedId}` and waits for an explicit
stdin release or process termination. The parent test enforces the shared bounded
DB-worker deadline, terminates and cleans up the worker on timeout, and, after
observing the marker, sends real `SIGKILL`; it does not replace process death
with an exception. A fresh worker/process then rolls back the source run using
only DB evidence.

Initialization has exactly two crash modes. The transaction-open mode injects a
test-owned DB wrapper around L01's real `createInitializedRun`; after the real run
insert and one set-based item insert have executed on the transaction handle but
before the callback may return/commit, it emits
`{phase:"initialization_transaction_open",runId,itemCount}` and awaits release or
real `SIGKILL`. A fresh connection proves both the run and every item absent, so
there is no rollback source. The post-commit/pre-native mode waits until
`createInitializedRun` resolves, emits
`{phase:"initialization_committed",runId,itemCount}`, and is killed before the
first adapter/native call. A fresh process sees the exact complete manifest and
row set, performs ordinary explicit rollback, records one source-faithful
recovered/noop outcome per row, makes zero native reversals, terminalizes the
interrupted source before rollback success, and leaves domain/settings digests
unchanged. No worker mode or assertion treats any partial row set as recoverable;
handcrafted partial sets fail closed instead.
The DB suite round-trips source/outcome JSONB with reordered object keys, nested
arrays and null, proving canonical value equality after real driver decoding
while an array-order change fails.

Run the matrix separately for all exact UUID-backed kinds: `content_type`, `form`,
`page_template`, `listing_template`, `content_entry`, `listing_query`,
`detail_page`, `page` and `menu`. For each, assert the complete prepared row
already contains the UUID and exact final target before the first native write,
the native aggregate committed entirely under that exact ID, recovery deletes or
restores only that ID, nested rows/revisions are clean, the interrupted source is
durably failed, and no natural-key candidate is touched. A handcrafted legacy
prepared create with `afterSnapshot.id:null` must fail before any adapter event.
For each published lifecycle kind, add barriers after stage commit and after
publish commit but before their phase upserts; fresh state must refine against
the already-durable staged/final targets and compensate exactly. Each phase-
upsert failure leaves the last raw item row untouched, builds its outcome only
from that immutable row, finalizes only the source run failed, and a later resume
recognizes the durable outcome; no in-memory overlay supplies provenance.

### Shared-shell concurrency matrix

In `fullSiteCrashRecoveryDb.test.ts`, spawn two independently connected workers
for different unique package keys that both take over the same allowlisted shell
settings. Use deterministic stdout/stdin barriers while package A holds the global
lock; prove package B reaches no plan/run/native mutation until A releases it.
After sequential completion, verify the exact B shell. Then coordinate rollback
of B and A through the same barriers: B restores the exact A snapshot before A
restores the byte/value-identical original raw setting presence/value. Cover an
apply-vs-rollback overlap as well as apply-vs-apply. Assert no lost update,
dangling Page/Menu/template ID, extra rollback owner or busy process.
Race a direct settings writer between outer capture and native reversal; the
settings transaction must serialize or reject on locked re-read, never partially
restore the batch, and invalidate the site cache exactly once only after commit.

Every case records exact owned actor/run/item/native IDs in memory, closes both
workers, and removes only those fixtures in dependency order in `finally`. The
test re-reads the pre-test raw shell rows after cleanup and fails on any mismatch.

## Sub-Tasks

- [x] Implement the initial rollback/compensation baseline; its dependency-aware corrective replacement remains pending below.
- [x] Add the DB lifecycle/security test matrix implementation.
- [ ] Split the near-limit service suite and implement strict V1 dependency graph
  validation plus dependency-aware branch compensation/resume, including strict
  noop durable-envelope/final-target equality/ID/status-phase preflight and zero-
  read source-faithful noop outcomes.
- [ ] Add the nine-kind real SIGKILL create-intent recovery matrix, including
  fail-closed legacy `id:null` evidence and exact scoped cleanup.
- [ ] Add two-package shared-shell apply/apply, apply/rollback and rollback/
  rollback coordination with deterministic barriers and raw-value restoration.

## Testing Requirements

- `set -a && source /home/coder/project/Coderso/.env && set +a`
- Use that command only to load DB/settings validation variables; never inspect,
  print, copy, hash or persist `.env` contents.
- pre-land checkpoint: `bun test --timeout 360000 tests/unit/kits/fullSiteInstallService.test.ts`
- `bun test --timeout 360000 tests/unit/kits/fullSiteInstallService.test.ts tests/unit/kits/fullSiteCompensationDependencies.test.ts`
- `bun test --timeout 360000 tests/integration/kits/fullSiteCrashRecoveryDb.test.ts`
- targeted full-site lifecycle/adapter and all nine native atomic/settings suites
  from L02, plus legacy installer/ledger gates from L01
- rerun any named failing file once in isolation before classifying a failure
- `bun --cwd core lint`, `bun --cwd core lint:types`, relevant reliability/
  security gates, strict scan, and fresh `wc -l` over every L03-owned changed
  production/test file (all at most 1,000 lines).
