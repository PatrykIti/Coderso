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
read, with zero `normalizeFullSitePackageForWrite` calls; the supplied-plan
overload builds zero times. Planner-owned native `normalizeDesired` remains
required for existing-resource equality decisions.
Apply uses only the three-argument overload. The CLI independently builds/
discards a plan before invoking its lazy `apply` dependency so an invalid file
cannot import DB code; the service then builds its own private plan rather than
trusting CLI structure.

The graph owner freezes an immutable desired snapshot plus typed reference
descriptors on every planned resource and exports the sole descriptor resolver.
TASK-547-04-L01 first native-normalizes ref-bearing Pages with syntactically valid
placeholder IDs and only then attaches `PackageRef` values. The planner consumes
that package-aware shape; pre-run preparation receives the exact same
`referencePlan` array and uses it with actual intended IDs. Neither phase rescans
ref-shaped values, duplicates the Page walker or rebuilds the graph.

After IDs are allocated/resolved, TASK-547-02 substitutes refs only at the
already-validated graph paths and runs every native owner validator over the
post-substitution desired snapshot before `initializeReservedRun` or
any native write. Thus Page has one placeholder-native pre-normalization before
ref attachment and one resolved-native revalidation after substitution; no
native Page normalizer receives a `PackageRef`. This task owns the malformed
Page/Menu/Form/content/listing/
detail/setting desired regressions; TASK-547-01 deliberately does not claim
native-domain validity.

## Frozen Ownership And Land Order

Implementation lands strictly `L01 corrective completion -> L03 pre-land
compatibility checkpoint -> L02 -> L03 final completion`. The checkpoint edits
only L03-owned existing paths, leaves L03 `🚧 In Progress`, and is neither a new
leaf nor a new ownership path. Each phase reads its predecessor's on-disk state.

- **L01 -- shared lifecycle substrate:** package kind/identity aliases, shared
  install types/ledger port, split legacy persistence, deterministic planner,
  strict current-resource resolver, dependency serialization, dry-run CAS, and
  the sole pooler-safe native-writer fence/owner-marker implementation. Its rich
  package lock reserves the real owner run; its gate-safe construction type and
  bounded persisted/raw reads must land before the L03 checkpoint. L01 owns its
  planner/ledger/managed-identity/fence tests and legacy Tx executors.
- **L02 -- native mutation substrate:** staging/execute/preflight, the adapter
  facade and cohesive adapter splits, canonical Form-action normalization, and
  domain-local exact-ID create/replace/conditional-delete APIs plus complete
  native target/capture for all nine UUID-backed kinds and a new settings-domain
  locked apply/raw-restore batch. Every ordinary managed writer participates in
  L01's try-shared/marker-census transaction fence, including User/Form/Page/
  detail revision writers and the outer import/backup transactions. It owns `settingsService.ts`, `siteLocale.ts`
  and their existing settings-service test, plus the default rollback registry
  and exact-ID nullable capture wrappers in its adapter facade. It preserves the
  gate compatibility surfaces while adding the strict saga input and all-item
  classifier. It consumes L01 and never writes install-run tables directly.
- **L03 -- compensation and process evidence:** after L01, pre-land the pure generic injected
  `compensateItems` bridge, its minimal existing-path test and
  the already-owned `rollback.ts` compatibility wiring needed to keep the root
  checkpoint type-safe. `compensation.ts` imports L01 contracts only; the
  orchestrator temporarily retains the current compatibility dependencies.
  After L02, extend those same files with final rollback/compensation, dependency
  branches, process-death/SIGKILL evidence, exact completed-success preflight
  under stable owner generation, and native-writer/FK concurrency. L03
  consumes, but cannot edit, the L02 adapter/default-registry owners.

Every touched human-authored production or test module must finish at most 1,000
physical lines. Before L01 adds raw reads or dry-run arbitration, it must split
the current 945-line persistence module by the two responsibilities above and
move the corresponding cases from the exactly 1,000-line composition test into
two independently runnable focused tests; public facade imports/exports remain
stable and moved cases are not duplicated. In particular, L02 must split the legacy
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

The concrete rich `withPackageLock(reservation, execute)` is one pooler-safe
protocol. Its strict reservation is `{intent:"apply",packageKey,actorId,dryRun,
options}` or `{intent:"explicit_rollback",packageKey,actorId,sourceRunId,
options}`; the latter package key is only a routing hint and is revalidated.
Pure normalization/reference-graph work may precede it; no DB planning may. A
dedicated `postgres.js` client configured `prepare:false` opens
one long `begin()`, takes `pg_advisory_xact_lock(548,0)` then the namespace-547
package transaction lock, and uses no session advisory or manual unlock SQL.
This two-connection shape requires holder/domain pool headroom of at least two.

After both locks succeed, the holder mints one unexported, unforgeable
reservation authority bound to that holder invocation. Only the private
`reserveOrTakeOverActualOwner` path accepts it. Its separate short domain
transaction deliberately does **not** call `acquireNativeCmsWriterFence` or try a
shared advisory lock, which would conflict with its own holder connection.
Instead, transaction statement one is the narrow active-marker-key projection
ordered `created_at ASC, id ASC LIMIT 2 FOR UPDATE`; it is both census and owner-
row lock. The authority cannot be supplied through the ledger port, options,
callback or any public helper, so this is not a general fence bypass.

That transaction creates or claims the **actual** owner and writes a fresh
private strict `options.nativeCmsWriterFenceV1={schemaVersion:1,generation:
<UUID>}` before callback/planner DB access. For apply/dry-run only, it also reads
at most 513 owner items and atomically derives callback `resumePhase`: no own
`initializationPlanV1` and zero items is `reserved`; a strict plan plus a complete
one-to-one bounded item set with identical position/kind/key/operation is
`initialized` (including an authored empty plan); any plan/item prefix, cap+1,
mismatch, malformed or impossible state fails closed without rotating ownership.
The apply callback receives only `{intent:"apply",ownerRunId,resumePhase}`; the
generation/authority remain private. An initialized apply/dry-run skips planner,
preparation, `initializeReservedRun` and native reapply and enters durable
recovery (automatic compensation for apply). Explicit rollback instead receives
`{intent:"explicit_rollback",ownerRunId}` and retains its separate strict source
plus incremental-outcome resume path. Its claimed rollback run is marked;
automatic compensation creates an unmarked child and keeps its apply source as
owner.

L01 alone owns `acquireNativeCmsWriterFence`,
`assertNativeCmsWriterOwnerContextAbsent`, `runWithNativeCmsWriterOwnerContext`,
`beginNativeCmsWriterOwnerClosing` and `markNativeCmsWriterOwnerLost`. Every
post-reservation installer native or ledger transaction uses SQL statement one to select
the exact owner row `FOR SHARE` and verify its running status plus exact strict
generation. There is no zero-SQL exclusive bypass. An inherited context already
marked closing/revoked/lost fails `native_cms_writer_fence_lost` before executor/I/O;
missing/mismatched ownership fails the same cause-free code, never falls back to
ordinary mode. Nested rich entry fails cause-free `site_package_lock_reentrant`.

Every ordinary writer of the nine roots, owned children/lifecycle/revisions and
allowlisted settings uses `READ COMMITTED`; SQL statement one is
`pg_try_advisory_xact_lock_shared(548,0)`. False returns cause-free
`native_cms_writer_fence_busy` immediately. True must pass L01's bounded strict
marker census before any protected read/lock/DML; one stale owner or duplicate/
malformed marker returns `native_cms_writer_recovery_required`. Driver/executor
failure maps only to `native_cms_writer_fence_failed`.

The whole post-reservation callback is covered by one phase policy. Deterministic
validation/planning/preparation failure, or initialization failure whose exact
reread proves the transaction absent/rolled back, has zero native effects and
must `finalizeOwnedRun(...failed...)` to remove the marker. Exact committed
initialization enters durable recovery. A partial/malformed/ambiguous state or
any path that may have native effects leaves the owner `running` and marked for
takeover. The same deterministic failure can therefore recur without globally
bricking ordinary writers.

postgres.js `onclose` closes over the exact private mutable lease and the one
captured callback promise; it never depends on ALS being present in `onclose`.
Unexpected close mutates that lease to `lost` and signals the holder race, but
does not cancel JS callback work. The outer lifecycle awaits the captured
callback's settlement before `client.end()`. Normal completion revokes first, so
normal transaction/client close cannot turn `revoked` into `lost`; `lost` is
monotonic. Callback/acquisition/holder-loss primary errors outrank transaction/
client cleanup errors, and detached descendants fail the revoked/lost zero-I/O
gate.

The caller's `finalizeOwnedRun` invocation is the final callback DB invocation.
It synchronously marks the lease closing, then its primary transaction statement
one locks the owner `FOR UPDATE` to drain prior `FOR SHARE` work. Only DB work
internal to that same invocation may continue: its private ambiguous-commit
reread takes the captured private lease, locks the exact owner `FOR UPDATE` as
its own statement one, never calls `acquireNativeCmsWriterFence` or the ordinary
path, and performs no native or ledger mutation. Caller code performs no
recovery, ledger or native I/O after closing. Successful callers only map the
returned outcome without DB I/O: exact `desired_terminal` permits return and
`different_terminal` throws fresh cause-free `site_package_recovery_conflict`.
Deterministic failure cleanup may catch only that finalizer's result/error to
preserve the preexisting primary and performs zero I/O afterward. The primary
transaction atomically terminalizes/removes the marker and, when supplied,
either closes an unmarked automatic-compensation child with its source or
applies the validated explicit-rollback interrupted-source transition.
Explicit rollback therefore changes a still-running apply source to
`failed/site_package_apply_interrupted`, terminalizes its rollback owner success
and removes that owner's marker in one commit. Full-site apply/dry-run/rollback
never call legacy `finalizeRun`; that method remains legacy-only. Partial native
compensation/rollback or ambiguous finalization leaves the owner running/marked.
Holder loss releases xact locks but leaves the marker; exact takeover drains and
rotates its generation. Success returns only after desired finalization and the
holder transaction commit.

L02 wires the ordinary fence into every atomic adapter/settings writer, User
deletion, Form/Page/detail revisions, import and backup outer transactions. Its
static inventory classifies every protected DML/Tx-helper, indirect User
`SET NULL`, intended cascade and reverse reference. Page/Entry/Form/ContentType
conditional deletes lock-check reverse references; listing-query JSON reference
creation takes ContentType `KEY SHARE`. `importConfig`/`restoreBackup` use one
outer fenced transaction; backup reuses the import Tx helper without nesting.
Delete order is fence/owner statement one -> root `FOR UPDATE` -> stable owned
children/revisions -> snapshot CAS -> reverse-reference guards -> DML. Guards
cover Page menu items/theme routes; Entry presentation overrides/term assignments;
Form submissions/action runs and in-place action diffs; and ContentType listing-
query JSON plus the locked `site.contentRoutes` setting. Intended FK cascades are
allowlisted explicitly, never hidden by the inventory.

No migration is added: the marker is private, strictly read, stripped from all
public/run/debug projections and never accepted from callers. Deployment requires
draining old workers first; mixed fence-aware/unaware replicas are unsupported.

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
`listItems()` is non-authoritative but independently uses the same 513-row cap
and stable order, with cap+1 failing as `site_package_too_large`. L02
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

Planning performs one bounded snapshot-loader call: one managed-evidence query,
one base query per nonempty resource kind and at most three aggregate-child
queries, never more than 14 statements for 0..512 resources. The exact ordered
result is validated before operation construction; per-resource DB fallbacks are
forbidden. Existing single-resource resolvers remain only for direct/exact-ID
rollback and recovery callers.

After a `reserved` apply callback, L02 preparation is two-pass and native-write-free. Pass one allocates
a server UUID for every create in all nine UUID-backed kinds, takes current IDs
for updates/noops and uses setting keys, then builds the complete identity-to-ID
registry. Pass two resolves every reference against that full registry, runs each
native strict normalizer, captures complete before state (or proves exact
create-time absence), and prepares exact complete staged/final targets. Create
absence is encoded as `beforeSnapshot:null`; an absent setting maps that evidence
to its native raw `{ key, present:false }` expectation. Only after the all-item
matrix validates may `initializeReservedRun` update the exact already-reserved
owner and insert its complete ordered item set through one transaction/one set-
based insert. Its SQL statement one verifies the owner row/generation `FOR SHARE`; it
cannot create/substitute another run or accept the private marker. The port
derives `initializationPlanV1` from those same rows; callers cannot supply it.
The method is required, bounded to 512, has no `createRun`/`recordItem` fallback,
and maps a failed transaction cause-free to
`site_package_ledger_initialization_failed` only after an exact owner reread
proves absent `initializationPlanV1` plus zero rows, hence rollback/absence. Exact
`native_cms_writer_fence_lost` and `native_cms_writer_fence_failed` retain their
codes rather than being blanket-rewritten. If the transaction/commit result is
ambiguous, an exact reread of the strict manifest plus complete matching bounded
rows returns committed success; partial/impossible evidence throws
`native_cms_writer_recovery_required`, and an unresolved reread throws
`native_cms_writer_fence_failed`. Both retain the running marker. Before commit
the marked reservation has no item prefix; after commit its exact manifest/set is
durable before native I/O. A crash then resumes through the callback's
`initialized` branch, never planning, reinserting or reapplying.

Dry-run uses the same reserved owner and `initializeReservedRun`, then
`finalizeOwnedRun`; its owner-row predicate accepts only the exact running marker/
generation, first terminal state wins, and terminalization removes the marker.
Its exact initialized resume is a durable no-native recovery, never a body retry.
Every success requires `desired_terminal`; `different_terminal` raises
`site_package_recovery_conflict`. Dry-runs are never compensated or accepted by
rollback; apply ownership ignores non-success `dry_run` rows.

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
not equal. After mandatory planning, reference resolution, native validation,
complete snapshot capture and durable initialization, the noop execution branch
itself performs zero resolver/adapter/native reads or writes and records success
only through the ledger phase change from `prepared` to `complete`; it never
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
locked compare-and-raw-restore batch. A non-completed preflight-authorized noop setting issues
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
the earlier hint. A non-completed preflight-authorized noop also requires no ownership guard
and no native read. The guard is not required when the current source is
`running` or `failed`; exact durable complete-snapshot equality remains mandatory
for every create/update decision. L03's zero-native
`preflightPriorRollbackSuccessOutcomes` proves an exact one-to-one match against
the raw source item: unique/non-extraneous identity, identical position and
original operation, swapped snapshots and `rollbackAction` canonical-deep-equal
as strictly validated decoded JSONB. Lexicographically reordered object keys are
equal, array order remains significant, and matching legacy-unknown
`rollbackAction:null` is legal. Duplicate, extra, malformed or unequal success
rows fail with `site_package_rollback_invalid_source` before classification,
adapter access or native reads.

Its returned success identities are provisional. Under the exclusive transaction fence and stable owner generation,
after provenance/graph validation but before suppression/mutation, L03's read-only
`preflightPriorRollbackSuccessNativeState` revalidates each exact ID/key: reversed create absent,
update/noop equal to source `beforeSnapshot`, and setting equal to restored raw presence/value. Capture
failure/mismatch throws cause-free `site_package_rollback_conflict`, leaks no identity/key/value/native
message and leaves prerequisites unchanged. This detects pre-existing drift; the exclusive/shared
protocol—not preflight alone—prevents post-preflight ordinary mutation. Failed/skipped outcomes remain
retryable; only passing successes are suppressed, and every applied setting passes ownership.

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

After explicit rollback succeeds, the caller's `finalizeOwnedRun` invocation is
the final callback DB invocation. When the exact freshly validated source is still
`running`, the input includes its closed-shape interrupted apply-source transition
(`runId`, `status:"failed"`, `error:"site_package_apply_interrupted"`). The
finalizer validates the rollback-owner/source relation and atomically updates the
source, commits rollback-owner success and removes its marker; no legacy
`finalizeRun` call or intermediate source-terminal commit is legal. The caller
returns success only for `desired_terminal`; `different_terminal` is
`site_package_recovery_conflict`. Any partial reversal/outcome/finalization
failure leaves the rollback owner `running` and marked for takeover, and durable
successes remain provisional until revalidation.

Automatic compensation creates/resumes an unmarked child while the source apply
remains the sole marked owner. It freshly loads source/outcomes and uses the same
scheduler. On complete compensation, one `finalizeOwnedRun` transaction drains
the source and atomically commits child `success`, source `failed` with the safe
apply code, and marker removal; its caller likewise accepts only
`desired_terminal`. Its compensation-failure record precedes finalization;
afterward only DB-free outcome mapping occurs. Partial compensation leaves the
source running/marked and child resumable for exclusive takeover. It runs whenever the complete item set
was initialized, including an `initialized` takeover with no in-memory success
list.

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
import { compareFullSitePackageText } from "../fullSitePackage/schema";
import { requireDesiredOwnedRunFinalization } from "./execute";

async function executeOwnedApplyCallback(input: OwnedApplyCallbackInput) {
  if (input.context.resumePhase === "initialized") {
    return recoverInitializedOwnerFromDurableLedger(input);
    // Fresh strict manifest/items only; apply compensates, dry-run terminalizes.
    // Its `finalizeOwnedRun` call is the final callback DB invocation;
    // only DB-free desired/different mapping follows.
  }
  let prepared: PreparedFullSiteSaga;
  let run: Readonly<{ id: string }>;
  try {
    const plan = await planFullSiteInstall(
      input.package, input.referencePlan, input.planningDeps,
    );
    prepared = await prepareFullSiteSaga({
      plan, referencePlan: input.referencePlan, actorId: input.actorId,
      adapters: input.adapters, generateId: crypto.randomUUID,
    });
    run = await input.ledger.initializeReservedRun({
      ownerRunId: input.context.ownerRunId,
      packageKey: input.package.key,
      actorId: input.actorId,
      dryRun: input.dryRun,
      options: input.options,
      items: prepared.items.map(toInitializedLedgerItem),
    }); // exact ambiguous commit returns success; confirmed rollback throws generic
  } catch (primary) {
    const safe = toSafeFullSiteErrorCode(primary);
    const mayClose =
      (isDeterministicPreNativeFailure(safe) ||
        safe === "site_package_ledger_initialization_failed");
    if (mayClose) {
      await finalizeFailedOwnerPreservingPrimary(input.ledger, {
        ownerRunId: input.context.ownerRunId, status: "failed", error: safe,
      }, primary); // catches only finalizer result/error; zero I/O before primary rethrow
    }
    throw primary; // ambiguous/partial/fence/native-effect paths retain marker
  }
  if (input.dryRun) {
    await requireDesiredOwnedRunFinalization(input.ledger, {
      ownerRunId: run.id, status: "success", error: null,
    }); // `finalizeOwnedRun` is the final callback DB invocation; mapping is DB-free
    return toApplyResult(run.id, prepared.items, prepared.intendedRegistry);
  }
  let result: ApplyFullSitePackageResult;
  try {
    result = await executePreparedPlanWithDomainAtomicAdapters({
      run, prepared: prepared.items, actorId: input.actorId,
      adapters: input.adapters, settingsLast: true,
    });
  } catch (primary) {
    return recoverInitializedOwnerFromDurableLedger({ ...input, primary });
  }
  await requireDesiredOwnedRunFinalization(input.ledger, {
    ownerRunId: run.id, status: "success", error: null,
  }); // final callback DB invocation; only DB-free outcome mapping follows
  return result;
}

export const applyFullSitePackage = async (
  input: ApplyFullSitePackageInput,
  overrides: FullSiteInstallExecutorDeps = {},
): Promise<ApplyFullSitePackageResult> => {
  assertActorUuidBeforeDb(input.actorId);
  const referencePlan = buildReferencePlan(input.package);
  const ledger = overrides.ledger ?? defaultLegacyInstallLedger;
  const adapters = overrides.adapters ?? FULL_SITE_RESOURCE_ADAPTERS;
  const dryRun = input.dryRun === true;
  const options = toSafeReservationOptions(input);
  return ledger.withPackageLock({
    intent: "apply",
    packageKey: input.package.key,
    actorId: input.actorId,
    dryRun,
    options, // never accepts nativeCmsWriterFenceV1
  }, async (context) => {
    if (context.intent !== "apply") throw new Error("site_package_invalid");
    const loadPlanningSnapshot =
      overrides.loadPlanningSnapshot ??
      createDefaultFullSitePlanningSnapshotLoader(input.package.key);
    return executeOwnedApplyCallback({
      context, package: input.package, referencePlan, ledger, adapters,
      actorId: input.actorId, dryRun, options,
      planningDeps: ownedPlanningDeps(
        context.ownerRunId, loadPlanningSnapshot, adapters,
      ),
    });
  }); // resolves only after the holder begin() commits
};

const compareRollbackReadyNodes = (
  left: RefinedRollbackItem,
  right: RefinedRollbackItem,
): number => {
  // position DESC, kind ASC, key ASC
  return (
    right.classification.item.position - left.classification.item.position ||
    compareFullSitePackageText(
      left.classification.item.kind, right.classification.item.kind,
    ) ||
    compareFullSitePackageText(
      left.classification.item.key, right.classification.item.key,
    )
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
  const route = await readRollbackRoutingHint(input.sourceRunId, ledger);
  return ledger.withPackageLock({
    intent: "explicit_rollback",
    packageKey: route.packageKey, // hint; reservation re-reads/locks source
    sourceRunId: input.sourceRunId,
    actorId: input.actorId,
    options: { fullSitePackage: true },
  }, async (context) => {
    if (context.intent !== "explicit_rollback") {
      throw new Error("site_package_invalid");
    }
    const rollbackRunId = context.ownerRunId;
    // The actual rollback run is claimed/marked before this callback.
    const postClaimSource = await requireApplySource(input.sourceRunId, ledger);
    if (postClaimSource.packageKey !== route.packageKey) {
      throw new Error("site_package_rollback_invalid_source");
    }
    await requireOwnedExplicitRollback(rollbackRunId, postClaimSource.id, ledger);
      const rawSourceItems = await ledger.listRawItems(postClaimSource.id);
      const rawPriorOutcomes = await ledger.listRawItems(rollbackRunId);
      const parsed = preflightRollbackEvidence({
        items: rawSourceItems,
        initializationPlanV1: postClaimSource.options?.initializationPlanV1,
      }); // a present manifest must match the complete row set; no prefix is legal
      const completedIdentities = preflightPriorRollbackSuccessOutcomes({
        sourceItems: rawSourceItems,
        priorOutcomes: rawPriorOutcomes,
      }); // exact zero-native provenance proof; identities remain provisional
      const persistedSourceItems = parsed.map(
        (evidence) => evidence.persistedSourceItem,
      );
      const graph = buildRollbackDependencyGraph({
        items: persistedSourceItems,
        declaredVersion: postClaimSource.options?.rollbackDependencySchemaVersion,
        readAction: readFullSiteRollbackActionV1,
      });
      const adapters =
        input.adapters ?? FULL_SITE_ROLLBACK_ADAPTERS; // L02 facade owner
      await preflightPriorRollbackSuccessNativeState({
        parsed,
        completedIdentities,
        adapters,
      }); // all exact reversed targets pass before any identity is suppressed
      const classifications = await classifyInterruptedSagaItems({
        items: persistedSourceItems,
        resolveCurrentResource:
          input.resolveCurrentResource ??
          createFullSiteCurrentResourceResolver(postClaimSource.packageKey, ledger),
      }); // hints only; noop skips resolver access and is not outcome authority
      const refinements = await refineAllRollbackStates({
        parsed,
        classifications,
        adapters,
        currentSource: postClaimSource,
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
        currentSource: postClaimSource,
        onNativeFailure: "block-transitive-dependencies",
        onSettingsFailure: "block-union-transitive-dependencies",
        onOutcomeFailure: "stop-all",
        onUnknownDependencies: "stop-conservatively",
      });
      await requireDesiredOwnedRunFinalization(ledger, {
        ownerRunId: rollbackRunId, status: "success", error: null,
        interruptedApplySource: postClaimSource.status === "running"
          ? {
              runId: postClaimSource.id,
              status: "failed",
              error: "site_package_apply_interrupted",
            }
          : null,
      }); // final callback DB invocation; then DB-free outcome mapping and return
      return { runId: rollbackRunId };
  }); // any partial failure leaves this owner running/marked for takeover
}
```

**Data flow:** valid actor -> pure private graph -> exclusive global/package xact
locks -> private statement-one reservation census -> marked owner plus resume
phase -> reserved-only DB plan/IDs/validation/initialization under owner `FOR
SHARE` (or initialized durable recovery) -> guarded CAS/publish/settings ->
closing -> owner `FOR UPDATE` drain -> desired terminal/marker removal -> holder commit.
There is no session lock, manual unlock or public/general zero-SQL owner bypass;
the private reservation exception still performs its locking census as statement one.

Explicit rollback keeps the same locks while it revalidates the source and any
automatic-compensation run, durably claims/creates or resumes the rollback run,
loads raw prior outcomes, validates them one-to-one against the raw source set
before deriving the provisional completed-success set, validates the raw source
graph, parses every raw item's complete evidence in one zero-native preflight,
then read-only revalidates every completed identity's exact reversed native
target before suppression or any scheduler write. It
rejects any noop whose
strict durable after envelope, status/phase pair or null staged target is invalid,
or whose complete before snapshot and top-level final `id`/`desired` target differ,
and obtains only classifier hints without resolving noop native state.
It fresh-refines every
non-completed create/update by exact durable ID,
checks successful-source ownership only for authoritative applied reversals, and
schedules remaining branches with `position DESC, kind ASC, key ASC` as the exact
ready-node tie-break. Each outcome preserves the source operation, swaps the raw
snapshot columns and preserves the exact rollback action. Rich reservation owns
claim/create/busy/complete arbitration before the callback; injected fakes match
that boundary. Any partial callback failure leaves the owner running/marked.
After reversal, `finalizeOwnedRun` atomically fails any validated interrupted
source while it commits rollback success as the final callback DB invocation.

**Error handling:** conflict before mutation; known domain errors retain
machine-readable codes; unexpected errors are redacted. Failure must not leave a
new shell pointing at incomplete/deleted resources. Compensate every completed
saga branch in dependency-safe reverse order before returning failure and record
both the source failure and every success/failed/blocked compensation outcome.
`site_package_recovery_missing_intended_id`,
`site_package_rollback_dependency_invalid` and
`site_package_rollback_dependency_blocked`,
`site_package_rollback_ledger_failed`, `site_package_recovery_conflict` and
`site_package_ledger_initialization_failed`, plus
`page_revision_snapshot_too_large`, `entry_revision_snapshot_too_large` and
`detail_page_revision_snapshot_too_large`, plus
`native_cms_writer_fence_busy`, `native_cms_writer_recovery_required`,
`native_cms_writer_fence_lost`, `native_cms_writer_fence_failed` and
`site_package_lock_reentrant`, are safe machine codes owned by L01.

**Regression-test shape:**

- First apply completes, second creates no duplicates, ledger-backed managed
  update/noop works, natural-key equality without proof conflicts, injected
  failure compensates, and rollback restores only owned rows plus exact prior
  shell/settings. Draft/publish order and settings-last remain pinned.
- Bad refs perform zero dependency/I/O calls. Public inputs reject a structural
  plan; typed apply builds one private plan, both planner overloads call package
  normalization zero times, and supplied-plan identity reaches preparation.
  Every post-substitution native validator fails before initialization/write.
- The private reservation transaction proves statement-one ordered `LIMIT 2 FOR
  UPDATE`, no `acquireNativeCmsWriterFence`/try-shared call, and no forgeable
  public authority. Apply takeover returns exact `reserved` or `initialized` for
  the two legal plan/item shapes and rejects cap+1, prefix, mismatch, malformed
  and impossible states before generation rotation. Explicit rollback retains
  its independent incremental-outcome resume matrix.
- Initialized apply/dry-run invokes no planner, preparation, initialization or
  native apply. Whole-callback tests cover deterministic plan/preparation errors,
  confirmed initialization rollback, exact committed ambiguity and partial/
  unresolved/native-effect failure. Only the first two close failed/remove the
  marker; repeated deterministic failures do not block a later ordinary writer.
- Initialization pins 0/1/512 and empty-plan identity, rejects 513/order/hostile
  input pre-DB, uses exact owner update plus at most one bulk insert, preserves
  fence-lost/fence-failed, recovers exact committed ambiguity, emits generic
  initialization failure only for proven absence, and retains the marker for
  partial/unresolved evidence. A real crash exposes reserved-empty or the exact
  complete manifest/set, never a recoverable prefix.
- `onclose` outside ALS mutates the captured lease, signals unwind without
  cancelling callback work, and the outer path awaits captured callback
  settlement before end. Pin detached descendants, normal revoke/end, monotonic
  lost state and callback/acquisition/loss-over-cleanup primary precedence.
- Every apply/dry-run/compensation/rollback success accepts only
  `desired_terminal`; `different_terminal` is exact cause-free
  `site_package_recovery_conflict`. Explicit rollback proves one transaction
  validates and fails an interrupted running source, commits owner success and
  removes its marker; no full-site `finalizeRun` call remains. Pin the caller's
  `finalizeOwnedRun` invocation as its final callback DB invocation, DB-free
  result mapping, and primary-preserving cleanup with zero I/O afterward.
- Exact intended-ID/no-natural-fallback, deterministic collision handling and all
  nine domain-atomic create/replace/delete races remain. Page/entry/detail retain
  exact 100/101 revision gates and divergent current/published restoration.
  SIGKILL after each native commit proves durable recovery.
- Static/runtime fence coverage includes User `SET NULL`, reverse-reference
  Page/Entry/Form/ContentType deletes, listing-query `KEY SHARE`, classified
  cascades, import/backup and different-package shell serialization.
- Every executor write takes strict saga input. Noop execution occurs only after
  complete initialization and performs zero resolver/adapter/native calls while
  preserving its graph/evidence. Classifier use follows global raw/graph checks;
  every create/update hint receives exact-ID refinement and required ownership.
- Rollback accepts only the six shared source status/phase rows and strict durable
  envelopes. Prior successes require exact one-to-one decoded provenance and a
  fenced native-state recheck; object-key reorder and matching null action pass,
  array reorder/duplicates/extras/drift fail before mutation. A dependent-first
  retry with recreated/changed native state leaves its prerequisite unchanged.
- Scheduler tests pin `position DESC, kind ASC, key ASC`, source-faithful swapped
  outcomes, fatal ledger-write stop, transitive blocking and conservative unknown
  dependencies. Settings use one ordered preflighted batch; every conditional
  delete/restore and settings CAS race produces zero partial writes.
- Raw readers preserve hostile unknown/delete/restore/scalar/array/null values.
  Partial native/ledger/compensation work leaves the owner running/marked and the
  last durable row intact; dry-run recovery never reruns its body or writes native
  state. Stage/publish recovery derives only from immutable raw rows.

## Sub-Tasks

- [ ] **TASK-547-02-L01** — installer split and deterministic plan resolver.
- [ ] **TASK-547-02-L02** — native resource adapters, ref resolution, complete
  snapshot capture, post-capture zero-native noop execution and saga execution;
  consumes the L01 ledger.
- [ ] **TASK-547-02-L03** — failure atomicity, reverse rollback and DB/security
  tests, including strict noop source-evidence preflight and source-faithful
  zero-read/write noop outcomes.

## Testing Requirements

- Freshly prefix every Bun DB/settings command below in its own shell with `set -a && source /home/coder/project/Coderso/.env && set +a`; never inspect, print, copy, hash or persist its contents.
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/installService.test.ts tests/integration/routes/solutionKitsRoutes.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteLegacyLedgerComposition.test.ts tests/unit/kits/fullSiteLegacyLedgerReadPersistence.test.ts tests/unit/kits/fullSiteLegacyLedgerDryRunTerminalization.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/content/typeService.test.ts tests/unit/pages/pageTemplateLibraryService.test.ts tests/unit/content/listingTemplatesService.test.ts tests/unit/content/listingQueriesService.test.ts tests/unit/settings/settingsService.test.ts tests/unit/settings/fullSiteSettingsAtomicService.test.ts`
- targeted Form/Menu/Page/entry/detail aggregate/lifecycle and full-site adapter
  suites from L02, including all nine exact-ID replace/delete race cases
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/integration/kits/fullSiteManagedOwnershipDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout 360000 tests/integration/kits/fullSiteNativeForeignKeyRacesDb.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout=360000 tests/unit/kits/fullSiteCompensationDependencies.test.ts`
- `set -a && source /home/coder/project/Coderso/.env && set +a && for attempt in 1 2 3; do bun test --parallel=1 --timeout 360000 tests/integration/kits/fullSiteCrashRecoveryDb.test.ts || exit 1; done` (writer-fence matrix, three serial passes)
- `set -a && source /home/coder/project/Coderso/.env && set +a && bun test --parallel=1 --timeout 360000 tests/unit/kits/nativeCmsWriterFenceInventory.test.ts tests/unit/admin/usersService.test.ts tests/unit/tools/importExport.test.ts tests/unit/backups/backupService.test.ts`
- `bun --cwd core lint` and `bun --cwd core lint:types`
- `bun run scan:security:strict`
- L01 replaces the composition test's 100 × 20 ms DB poll with a monotonic
  `DB_EVENTUALLY_DEADLINE_MS = 360_000` bounded deadline after the test split.
- touched-file line counts
