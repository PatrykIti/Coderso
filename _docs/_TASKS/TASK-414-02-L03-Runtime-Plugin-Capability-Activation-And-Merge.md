# TASK-414-02-L03: Runtime Plugin Capability Activation and Merge
# FileName: TASK-414-02-L03-Runtime-Plugin-Capability-Activation-And-Merge.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-02
**Priority:** Critical
**Category:** Plugins / Guide / Agent / Designer / Runtime Lifecycle / Security
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-02-L01 and TASK-414-02-L02 terminal; TASK-485-03
terminal; TASK-548 terminal; complete TASK-551 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Make the L01-owned strict extension capability pack executable at plugin
runtime without rebuilding or rewriting any tracked Core/TASK-548 artifact.
The existing plugin install/update/enable/disable/uninstall/rollback lifecycle
must validate one signed, versioned pack, join it to server-registered adapters,
persist a normalized release, and atomically expose or retire its Guide,
Agent, and Designer projections.

This leaf is a runtime overlay only. Core capability and documentation bytes
remain owned by TASK-414-02-L02/TASK-548. A plugin pack cannot override a Core
row, grant RBAC, register an undeclared route/action/resource, introduce a
public write, or become executable from metadata alone.

## Sub-Tasks

None; this is an executable runtime-kernel leaf.

## Required Dependency Handoffs

Before implementation, re-read and freeze exact landed exports from:

- TASK-414-02-L01: `CmsExtensionCapabilityPackV1`, canonical serializer/digest,
  manifest pack reference, strict extension merge, adapter descriptor, bounds,
  owner/permission/product-boundary checks;
- TASK-485-03: the single plugin lifecycle service for install, update,
  uninstall, enable/disable, rollback, and policy operations;
- TASK-548: V2 Guide evidence/permission/query contracts and Core snapshot
  identity; and
- TASK-551: one awaited runtime lifecycle registry and database session/query
  telemetry contracts.

If TASK-485 still documents “loaded contributions clear only after restart,”
this leaf is its explicit serialized successor for capability-pack projection
only. It does not promise arbitrary ESM code unload. A stale loaded module is
inert because every Guide query and Agent/Designer adapter dispatch checks the
authoritative active release/fence in PostgreSQL.

## Exact Single-Writer Ownership

After the dependencies are terminal, this leaf is the sole serialized writer
for:

- new `core/plugins/runtime/capabilityPackLoader.ts`;
- new `core/plugins/runtime/capabilityPackActivationService.ts`;
- new `core/plugins/runtime/capabilityPackProjectionRegistry.ts`;
- new `core/plugins/runtime/capabilityPackLifecycleParticipant.ts`;
- new `core/plugins/runtime/capabilityPackErrors.ts`;
- new `core/services/cmsCapabilities/cmsExtensionCapabilityRepository.ts`;
- new `core/db/tables/cmsExtensionCapabilities.ts`, its `core/db/schema.ts`
  facade export, and one next-free complete SQL/snapshot/journal migration set;
- `core/plugins/runtime/manifestValidator.ts` for the exact L01 pack-reference
  validation/handoff only;
- `core/plugins/runtime/moduleRegistrar.ts` for capability-adapter staging,
  activation, and removal only;
- `core/plugins/loader.ts`, `core/plugins/sdkRuntime.ts`, and
  `packages/sdk/src/server.ts` for the exact bounded server-only
  `registerCmsCapabilityAdapter()` API;
- terminal `core/services/plugins/pluginLifecycleService.ts`,
  `core/plugins/installService.ts`, and `core/plugins/pluginManager.ts` for the
  serialized prepare/activate/deactivate/rollback callbacks only;
- `core/services/assistant/docsDbRetriever.ts` and the terminal
  `assistantDocsCandidateQuery.ts` only to union the L03-owned indexed active
  extension candidate branch under the same authorization-before-projection
  and bounded-query contract;
- new `tests/vitest/cms-capabilities/cmsRuntimeExtensionPack.test.ts`;
- new `tests/integration/plugins/pluginCapabilityPackLifecycle.test.ts`;
- new `tests/integration/server/assistantExtensionDocsRetrieval.test.ts`;
- new `tests/integration/runtime/pluginCapabilityProjectionLifecycle.test.ts`;
- new `tests/security/pluginCapabilityPackSecurity.test.ts`; and
- new `tests/perf/pluginCapabilityPackSearch.test.ts`.

It must not edit `packages/sdk/src/pluginManifest.ts`, L01 schemas/permissions,
TASK-414-02-L02/TASK-548 source registries or generated files, TASK-547 package
code, task/changelog metadata, arbitrary plugin routes, native domain services,
or the shared runtime lifecycle owner. This leaf is the sole schema/migration
writer for its separate plugin/CMS-capability runtime overlay: exactly 8 new
tables in one separate migration with its own SQL, `meta/*_snapshot.json`, and
`_journal.json` entry, fully disjoint from TASK-414-03-L02's 41-table
Agent/Designer persistence migration and TASK-414-05-L04's 1-table
action-execution lease migration. Aggregate across TASK-414 is exactly 50 new
tables across three disjoint migrations (41 Agent/Designer persistence + 8
plugin/CMS-capability overlay + 1 action-execution lease), three writers, zero
table overlap; this leaf never touches 03-L02's tables and 03-L02 never
touches these tables.

## Pack and Signature Binding

The plugin manifest carries exactly one optional L01-normalized reference
(`cmsCapabilityPack`) plus the bounded capability IDs declared in the
explicitly extended `provides` section; there are no inline feature rows and no
second manifest surface:

```ts
type CmsExtensionCapabilityPackRefV1 = Readonly<{
  schema: "coderso.cms-extension-capability-pack-ref@v1";
  path: string;
  sha256: string;
  packVersion: string;
}>;
```

The reference path is a normalized relative package path, not a URL, public
asset path, symlink, directory, or caller-selected filesystem location. The
loader opens it beneath the verified installed plugin version with no-follow
path confinement, reads at most 16 MiB, hashes the exact bytes, and invokes
L01's recursively strict normalizer. The pack owner/plugin version, pack
version, target Core range, declared permissions/contribution IDs (matching the
`provides` allowlist exactly), and canonical
digest must match the normalized manifest and store-verified package metadata.

The trust tuple is immutable:

```text
pluginId + pluginVersion + targetApiVersion + targetCoreVersion +
storePackageSha256 + storeSignatureKeyId + packPath + packVersion + packSha256
```

Missing signature evidence, a stale/revoked version, digest/path mismatch,
unknown schema/key, owner mismatch, undeclared permission/route/action/resource,
Core-ID override, or unregistered adapter rejects the whole pack before an
active release changes. It cannot be downgraded to descriptive-only partial
activation.

## Storage and Query Contract

At implementation start, read the live migration journal and allocate the next
free migration. Ship the schema table module/facade export, SQL, matching
snapshot, and journal entry atomically. The migration creates exactly these 8
normalized tables under one writer — one separate migration (own SQL +
snapshot + journal entry) fully disjoint from TASK-414-03-L02's 41-table
Agent/Designer persistence migration and TASK-414-05-L04's 1-table
action-execution lease migration; the aggregate across TASK-414 is exactly 50
new tables (41 + 8 + 1) with zero overlap, and this leaf never touches
03-L02's tables and 03-L02 never touches these tables:

1. `cms_extension_capability_releases` — immutable plugin/version/package trust
   tuple, pack schema/version/digest, normalized source hash, compatibility,
   bounded canonical metadata, state, and timestamps; unique exact trust tuple;
2. `cms_extension_capability_activations` — one plugin pointer with active
   release, monotonic generation/fence, enabled state, reason, and version;
3. `cms_extension_runtime_adapters` — release-scoped descriptor IDs, kinds,
   native permissions/resource kinds and digest only, never callables;
4. `assistant_extension_docs` — release-scoped localized document metadata,
   publication targets, permission requirement, capability IDs and checksums;
5. `assistant_extension_doc_sections` — release/doc/locale/section identity and
   bounded searchable evidence text;
6. `assistant_extension_doc_chunks` — release/doc/locale/section/chunk text,
   stable order and one stored/generated V2 vector plus planner-compatible GIN;
7. `assistant_extension_doc_evidence` — normalized visual/example metadata and
   confined plugin asset references, never bytes/URLs; and
8. `assistant_extension_doc_relations` — bounded atom/workflow ordered relations
   under the same release identity.

Every PK/FK/unique key includes `release_id` where identity can recur across
versions. Activation and normalized rows commit together or not at all. Indexes
match the exact active-release, authorization, locale, vector-rank, evidence,
and relation query predicates/order. No query casts pack JSON to text or loads a
whole pack into Bun. Capture sanitized representative small/large
`EXPLAIN (ANALYZE, BUFFERS)` evidence, stable ordering, transferred-byte and p95
budgets before landing.

Migration rollout is expand-only for new tables/indexes and has no existing-row
rewrite. Expected locks are bounded catalog locks; deploy the new binary only
after migration. Forward recovery may recreate an unactivated immutable release
from signed package bytes. Pre-activation rollback drops only the new empty
tables; after any activation the recovery path is forward-fix/deactivate, never
destructive loss of release/audit facts.

## Adapter Registration Contract

`packages/sdk/src/server.ts` adds one server-only API:

```ts
interface CmsCapabilityAdaptersAPI {
  register(input: CmsExtensionRuntimeAdapterRegistrationV1): void;
}

interface ServerContext {
  // existing fields remain unchanged
  cmsCapabilities: CmsCapabilityAdaptersAPI;
}
```

The API accepts only L01's strict descriptor plus a server callable behind an
opaque registration handle. Registration is staged per exact
`pluginId@version`; it is not active during module import/register. Duplicate
IDs, owner/version mismatch, undeclared permissions/contributions, unsupported
resource kinds, or a callable for a metadata-only row fail the plugin load.
The staging registry freezes after `register(ctx)` returns. Pack normalization
then requires exact bidirectional equality between every supported adapter ID
and the staged registrations; extra and missing adapters both reject.

Guide rows are data only and never receive a callable. Agent/Designer dispatch
resolves a callable only after a fresh authoritative release/fence check and
native RBAC reauthorization. The pack cannot register a provider, credential,
route, schema, arbitrary network tool, HTML/CSS/JS, or public-write bypass.

## Transactional Lifecycle Contract

Every lifecycle operation follows one prepare/commit/project protocol:

1. Verify store signature/checksum/revocation/core/API compatibility and unpack
   to a confined version directory without changing the active plugin row.
2. Load the manifest and pack through held no-follow handles, normalize both,
   smoke-load the plugin in an isolated staging context, and verify exact
   adapter/permission/contribution parity. No active projection or Guide row is
   visible yet.
3. Build a bounded normalized relational plan for release metadata, Guide
   documents/sections/chunks/evidence/composition, and adapter descriptors.
4. In one short DB transaction lock the plugin activation row, recheck expected
   plugin version/fence, persist or reuse the immutable release, validate row
   counts/digests, switch the active release pointer, and update the authoritative
   plugin version/enabled state. Rollback exposes the previous complete release.
5. After commit, atomically publish the immutable process-local callable
   projection for that exact release. Publication failure never rolls back or
   misreports the committed DB result; the process marks the projection
   unavailable and the central lifecycle participant reconciles it.

Install and enable activate only a fully verified release. Upgrade stages a new
release while the old release remains active and switches once. Disable and
uninstall first commit an inactive pointer/fence, then remove local callable
projection and bounded extension-only read caches; they never delete or mutate
Core artifact bytes. Rollback switches to one retained previously verified
release only after its package files/signature/digest are rechecked. A stale
version/fence cannot reactivate.

**Bounded resumable release pruning.** Old immutable releases (beyond the
active one plus the single retained rollback release) are pruned by a bounded,
resumable worker with an exact retention window and fixed-size batches under
the same transaction/lease discipline: each batch selects only prunable release
IDs (no active pointer, no retained rollback target, no live execution lease,
past the retention horizon), deletes their release-scoped adapter descriptors,
extension-doc rows, and local projections in FK-safe waves, and persists a
resumable cursor so an interrupted prune continues from the last verified
boundary. Pruning never touches the active release, never deletes package files
owned by the plugin lifecycle, and never runs inside the activation
transaction; a failure is retryable and never misreports activation state.

Guide search joins only active release rows and applies release activity,
publication targets, owner permission requirement, and the caller's normalized
permission snapshot in SQL before title/body/evidence projection or `LIMIT`.
The Core and extension candidate branches share one bounded statement and
deterministic owner/source/chunk tie breakers; selected evidence remains the
second statement and optional relations the third. Disable/uninstall therefore
cannot leak old text even if another process still has a stale callable map.

Agent/Designer obtains an `ActiveExtensionCapabilityLeaseV1` containing release
ID, activation generation, plugin/version/pack digests, adapter ID, and a
request-local fence. It rechecks that tuple immediately before native work and
under any mutation/materialization transaction lock. A mismatch is
`cms_extension_capability_stale`, performs no adapter call, and requires a new
plan/review.

## Central Runtime Lifecycle

This leaf exports one `RuntimeLifecycleParticipant` with ID
`plugin-capability-projection-v1` and phase `worker`. It consumes the terminal
TASK-551 registry and installs no process/signal handler. Start performs one
bounded reconciliation of DB active releases against installed plugin files and
staged adapters before enabling a non-overlapping condition-polled worker.
Close stops new claims, aborts/awaits the one in-flight reconciliation within
the shared deadline, and leaves DB state retryable. The final TASK-414-09-L03
composer registers the participant once.

The worker may make a missing local projection available after another replica
activated it, but correctness never depends on that delay: DB fences make stale
adapters fail closed immediately. No process-local map, Pub/Sub message, browser
`cacheBus`, or plugin hook is authority for active status.

## Implementation Pseudocode

```ts
export async function preparePluginCapabilityRelease(input: {
  pluginDir: string;
  manifest: CodersoPluginManifest;
  packageTrust: VerifiedPluginPackageTrustV1;
  stagedAdapters: StagedPluginCapabilityAdaptersV1;
}): Promise<PreparedPluginCapabilityReleaseV1> {
  const ref = requireNormalizedCapabilityPackRef(input.manifest);
  const bytes = await readConfinedRegularFileNoFollow({
    root: input.pluginDir,
    path: ref.path,
    maximumBytes: 16 * 1024 * 1024,
  });
  requireSha256(bytes, ref.sha256);
  const pack = normalizeCmsExtensionCapabilityPackV1(parseJsonOnce(bytes));
  requireExactPackTrustBinding(pack, input.manifest, input.packageTrust, ref);
  requireExactAdapterBijection(pack, input.stagedAdapters);
  return buildBoundedNormalizedCapabilityReleasePlan(pack, input);
}

export async function activatePreparedPluginCapabilityRelease(input: {
  prepared: PreparedPluginCapabilityReleaseV1;
  expectedPluginFence: number;
}): Promise<ActivatedPluginCapabilityReleaseV1> {
  const committed = await db.transaction((tx) =>
    extensionCapabilityRepository.activatePreparedTx(tx, input)
  );
  await settleCommittedProjectionBestEffort(committed);
  return committed;
}

export async function deactivatePluginCapabilities(input: {
  pluginId: string;
  expectedVersion: string;
  reason: "disable" | "uninstall" | "rollback" | "revocation";
}): Promise<void> {
  const inactive = await db.transaction((tx) =>
    extensionCapabilityRepository.deactivateTx(tx, input)
  );
  await projectionRegistry.removeIfGeneration(inactive);
}

export async function dispatchActiveExtensionAdapter<T>(input: {
  lease: ActiveExtensionCapabilityLeaseV1;
  requiredPermissions: readonly PermissionId[];
  invoke: (adapter: VerifiedExtensionRuntimeAdapterV1) => Promise<T>;
}): Promise<T> {
  const current = await extensionCapabilityRepository.requireActiveLease(input.lease);
  await requireCurrentActorNativePermissions(input.requiredPermissions);
  const adapter = projectionRegistry.requireExact(current);
  await extensionCapabilityRepository.recheckActiveLease(current);
  return input.invoke(adapter);
}
```

**Data flow:** verified store package -> confined manifest/pack bytes -> strict
normalization -> isolated staged adapter registry -> exact parity plan -> short
DB release/pointer transaction -> best-effort local projection -> DB-fenced
Guide/Agent/Designer reads.

**Error handling:** expected failures use bounded codes:
`cms_extension_pack_missing`, `cms_extension_pack_invalid`,
`cms_extension_pack_digest_mismatch`, `cms_extension_pack_signature_invalid`,
`cms_extension_pack_incompatible`, `cms_extension_adapter_missing`,
`cms_extension_adapter_mismatch`, `cms_extension_activation_conflict`,
`cms_extension_capability_stale`, and
`cms_extension_projection_unavailable`. Unknown filesystem/DB/plugin errors map
to `cms_extension_activation_failed` without paths, raw manifests, pack bytes,
signatures, provider data, or user content.

## Security Contract

- **Endpoint visibility:** no new endpoint. Existing internal plugin lifecycle
  routes remain the only install/update/enable/disable/uninstall surface.
- **Auth model/RBAC:** existing Admin session and `plugins:manage` authorize the
  lifecycle request. Capability use still requires `assistant:use` or
  `designer:*` plus every native permission declared by the exact adapter.
- **CSRF:** required by the existing plugin lifecycle write routes.
- **Rate limits:** existing plugin lifecycle/store buckets apply; runtime
  Agent/Designer calls keep their owning buckets. Pack metadata cannot alter
  either policy.
- **Reject unknown:** manifest reference, pack root/nested rows, adapter
  registration, DB release rows, lifecycle commands, and active leases are
  recursively strict and bounded.
- **Anti-abuse:** no public write, nonce, HMAC, or CAPTCHA is added. Signature,
  digest, path confinement, size/count limits, lifecycle fencing, native RBAC,
  review/idempotency, and exact adapter joins remain mandatory.
- **Secrets/privacy:** packs, DB rows, diagnostics, browser projections, logs,
  audit, and tests contain no store signature bytes, credentials, provider keys,
  cookies/session/CSRF values, private Guide content outside authorized reads,
  user data, staged Designer payloads, or raw plugin exceptions.

## Regression-Test Shape

- Pure/Vitest: strict pack/reference round-trip, canonical digest, owner/version/
  permission/contribution/adapter equality, Core override rejection, bounds,
  unknown fields, and no Core-artifact mutation.
- Bun plugin lifecycle: install, enable, disable, upgrade, rollback, uninstall,
  revocation, safe mode, startup reload, crash before/after activation commit,
  projection-publication failure/reconcile, stale generation/fence, and bounded
  resumable release pruning (interrupted batches resume from the last verified
  cursor; the active and retained-rollback releases are never pruned);
- Guide DB: active extension hit, authorization-before-projection, extension-only
  caption/example hit, deterministic Core+extension ordering, exact 0/2/3 query
  budget, disable/uninstall no-leak, and indexed small/large plans.
- Agent/Designer: exact adapter dispatch only while active; stale release,
  permission mismatch, metadata-only claim, missing callable, and owner/version
  mismatch perform zero native/provider/materialization work.
- Security: symlink/traversal/case-swap/TOCTOU, oversized bytes/graph, bad
  signature/digest, undeclared permission/route/action, public-write claim,
  malicious diagnostics, and secret/path redaction.
- Multi-process: one replica activates while another has stale/missing local
  projection; old execution fails immediately through the DB fence, the central
  participant converges availability, and no request observes mixed releases.

## Testing Requirements

```bash
bunx vitest run --config vitest.config.ts \
  tests/vitest/cms-capabilities/cmsRuntimeExtensionPack.test.ts \
  tests/vitest/sdk/pluginManifest.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/plugins/pluginCapabilityPackLifecycle.test.ts \
  tests/integration/server/assistantExtensionDocsRetrieval.test.ts \
  tests/integration/runtime/pluginCapabilityProjectionLifecycle.test.ts \
  tests/security/pluginCapabilityPackSecurity.test.ts \
  tests/perf/pluginCapabilityPackSearch.test.ts
tsc -p packages/sdk/tsconfig.json --noEmit
bun test tests/unit/sdk
bun --cwd core lint:types
bun --cwd core lint
bun run gates:coderso:perf
bun run scan:security:strict
git diff --check
```

Every added/modified human-authored production or test module must remain at or
below 1,000 physical lines from the verified family baseline.

## Documentation Updates Required

Exact handoff docs (implementation facts only; this leaf edits none of them):

- `_docs/CODERSO_PLUGIN_CONTRACT.md` — the landed server-only
  `registerCmsCapabilityAdapter()` API, the L01 pack-reference binding, the
  immutable trust tuple, adapter staging/activation rules, and the
  `plugin-capability-projection-v1` lifecycle participant, supplied to
  TASK-414-11-L01 for the plugin/runtime contract update;
- `_docs/ADMIN_CACHE.md` / `_docs/ADMIN_CACHE_MAP.md` — the bounded
  extension-only read-cache families invalidated on disable/uninstall, also
  supplied through TASK-414-11-L01 if this leaf's cache-family deltas change
  the shared cache map;
- TASK-414-02-L02 — the exact release/activation row shapes, adapter staging
  rules, and lifecycle participant ID for the generated capability inventory
  and cookbook.

Explicit `None`: this leaf adds no end-user or contributor prose, and it does
not update `docs/guide/`, `_docs/CMS_API.md`, `_docs/RBAC_SPEC.md`,
`_docs/SECURITY_SPEC.md`, `_docs/DATA_MODEL.md`, or `_docs/ARCHITECTURE.md`.
Do not edit TASK-414/TASK-485/TASK-548/TASK-551 task files, task-board rows,
changelog files, or changelog 1266 during this leaf.

## Acceptance Criteria

- A newly installed compatible signed plugin can contribute Guide evidence and
  registered Agent/Designer capabilities without a Core rebuild.
- Metadata alone never enables execution; every supported row joins one exact
  active registered adapter and current native permissions.
- Install/upgrade/enable exposes one complete release; failure preserves the
  previous release. Disable/uninstall/revocation fences reads/execution before
  local projection cleanup, and rollback restores only a reverified release.
- Guide returns only active, compatible, authorized pack rows through the same
  bounded SQL/evidence path; no stale extension text survives deactivation.
- No lifecycle operation mutates TASK-548/TASK-414-02-L02 tracked registries,
  generated Core artifacts, or Core snapshot bytes.
- Startup, shutdown, retry, multi-process reconciliation, and crash recovery use
  the shared lifecycle/database contracts and leave no task-local process hook.
