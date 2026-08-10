# TASK-414-08-L02: TASK-547 Package Compiler, Validation Receipt, and Staged Materialization
# FileName: TASK-414-08-L02-TASK-547-Package-Compiler-Validation-Receipt-And-Staged-Materialization.md

**Parent Task:** TASK-414
**Parent Subtask:** TASK-414-08
**Priority:** Critical
**Category:** Designer / Compiler / Validation / Staging
**Estimated Effort:** Very Large
**Dependencies:** TASK-414-08-L01; TASK-547-01-L01,
TASK-547-01-L02, TASK-547-02-L01, and TASK-547-02-L02 terminal;
TASK-414-02-L01; TASK-414-06 terminal
**Status:** ⏳ To Do
**Changelog:** 1266 (pinned; TASK-414-11-L01 closure only)

---

## Overview

Recompile an untrusted strict semantic draft—produced either by the prompt-AI
bridge or a registered prepared private source adapter—into a
`DesignerSiteBundleV1`:
terminal `FullSitePackageV1` as the immutable core plus bounded typed sidecars
for CMS resource families not represented by that core. Rebuild and validate
one symbolic reference graph and
install plan, run backend/native policy validation, create an immutable
digest-bound validation receipt, and materialize the complete graph only in
Designer staging tables. Prepared private input assets, their workspace/revision
bindings, the complete stage graph, receipt, and the `ready` CAS commit in one
short transaction; no ready revision may reference an unadopted asset. This leaf
never invokes TASK-547's canonical installer execute path and never writes
canonical resources.


## Sub-Tasks

None; this is an executable leaf.
## Exact Ownership

This leaf is the sole writer for:

- `core/services/designer/packageCompiler.ts`
- `core/services/designer/designerSiteBundleContract.ts`
- `core/services/designer/designerSidecarRegistry.ts`
- `core/services/designer/stageGraphContract.ts`
- `core/services/designer/stageCapabilityRegistry.ts`
- `core/services/designer/stageMaterializationService.ts`
- `core/services/designer/materializationSourceContract.ts`
- `core/services/designer/materializationSourceRegistry.ts`
- `core/services/designer/validationReceiptContract.ts`
- `core/services/designer/validationReceiptService.ts`
- `tests/vitest/designer/designer-package-compiler.test.ts`
- `tests/vitest/designer/designer-stage-graph.test.ts`
- `tests/vitest/designer/designer-materialization-source-registry.test.ts`
- `tests/vitest/designer/designer-validation-receipt.test.ts`
- `tests/integration/designer/designer-stage-materialization.test.ts`
- `tests/integration/designer/designer-canonical-isolation.test.ts`

It imports terminal TASK-547 package types/schema/normalizer, reference
registry/graph, plan resolver, and safe native normalization seams. It must not
edit TASK-547 modules, `FullSitePackageV1`, TASK-547 installer execution/ledger,
canonical resource tables/services, Designer DB schema, provider routes,
preview/promotion modules, shared route mounts, task indexes, or changelog.

If a terminal native adapter exposes only canonical writes and no pure or
transaction-safe normalization/validation seam, that resource kind is
`designer_stage_unsupported`. Do not call the write adapter to validate staging.

## Materialization Source Contract

Provider generation and prepared private imports share one fail-closed source
binding without pretending that every source is an AI model:

```ts
export type DesignerMaterializationSourceBindingV1 =
  | Readonly<{
      kind: "prompt_ai";
      providerExecutionBinding: ProviderExecutionBindingV1;
      bindingDigest: string;
    }>
  | Readonly<{
      kind: "prepared_private_source";
      sourceId: DesignerImportSourceIdV1;
      bindingSchema: string;
      bindingDigest: string;
    }>;

export type BoundDesignerGenerationClaim =
  FencedDesignerGenerationClaim & Readonly<{
    preparedSourceBindStatus: "bound";
    sourceExecutionBinding: DesignerMaterializationSourceBindingV1;
  }>;

export type DesignerMaterializationSourceContributionV1 = Readonly<{
  sourceId: DesignerImportSourceIdV1;
  bindingSchema: string;
  resolveCurrentBeforeMaterialization:
    ResolveCurrentDesignerMaterializationSource;
  lockAndAssertCurrentTx: LockAndAssertDesignerMaterializationSourceTx;
}>;
```

`prompt_ai` canonicalizes and digests all six fields of L01's exact
`ProviderExecutionBindingV1`. A prepared private source canonicalizes its own
strict binding, persists only its schema/digest plus source-owned indexed fence
fields, and supplies a code-owned verifier. The generation run may initially
store a pending prepared-source request binding, but
`compileAndMaterializeDesignerRevision()` accepts only a live generation claim
whose exact execution binding was attached by CAS before source I/O. Its input
type is `BoundDesignerGenerationClaim`; a pending prepared-source claim cannot
be cast or normalized into that type without the repository-owned CAS result.

`materializationSourceRegistry.ts` is a frozen, duplicate-rejecting registry
assembled only from literal code-owned contributions in `Task414RuntimeFacade`.
It accepts the closed `DesignerImportSourceIdV1` union, validates an exact
schema/version match, and fails startup for a missing, duplicate, unknown, or
disabled-but-mounted contribution. No route, request, provider response,
prepared-adoption object, or ad hoc dependency callback may supply or replace a
verifier. The built-in `prompt_ai` branch always re-resolves the current exact
provider/model/config/input-policy binding. TASK-414-10-L01 later contributes
the `figma` verifier, which owns transactional grant/credential-generation/
lease-fence checks. TASK-414-09-L03 is the sole static final composer.

## TASK-547 Terminal Re-Freeze

The terminal source commit is
`a13d186167a05901e644bf1a3a7aefee6f780471`, landed through merge
`963733cae23456622bea1eef1b734723aaab2350`. The re-frozen read-only seams are:

- `FullSitePackageV1`, `PACKAGE_RESOURCE_KINDS`, `PACKAGE_LIMITS`,
  `FULL_SITE_PACKAGE_SETTING_KEYS`, `JsonObject`, and `JsonValue` from
  `core/services/kits/fullSitePackage/types.ts`;
- `FULL_SITE_PACKAGE_SCHEMA_VERSION` from
  `core/services/kits/fullSitePackage/schema.ts` and
  `normalizeFullSitePackageForWrite(value)` from
  `core/services/kits/fullSitePackage/normalize.ts`;
- `buildReferencePlan(pkg)`, `resolvePlannedPackageResourceRefs(resource,
  resolvedIds)`, and `PlannedPackageResource` from the
  `fullSitePackage/referenceGraph.ts` re-export boundary;
- `canonicalizeFullSiteJsonValue(value)` and
  `fullSitePackageFingerprint(pkg)` from
  `core/services/kits/fullSiteInstall/staging.ts`;
- the canonical live-state planner `planFullSiteInstall(pkg, deps)` or
  `planFullSiteInstall(pkg, referencePlan, deps)` plus
  `FullSiteInstallPlannerDeps` from
  `core/services/kits/fullSiteInstallPlanner.ts`; and
- `ResourceAdapter`, `FullSiteResourceAdapterRegistry`,
  `FULL_SITE_RESOURCE_ADAPTERS`, and `FULL_SITE_ROLLBACK_ADAPTERS` from
  `core/services/kits/fullSiteInstall/{adapterTypes,adapters}.ts`.

`buildReferencePlan` is the pure normalized-core graph/order seam used during
Designer compilation. `planFullSiteInstall` requires a bounded live planning
snapshot and optional current-ID native normalization; it is not called to
plan private Designer staging. `FULL_SITE_RESOURCE_ADAPTERS.applyDesired`,
`applyStaged`, `publish`, snapshot, and rollback methods mutate canonical CMS
state and are forbidden before approval. A terminal adapter's
`validateDesired` may be reused only through a proven side-effect-free,
Bun-safe contribution; otherwise TASK-414-06 supplies a native-owner pure
normalizer or marks the kind `designer_stage_unsupported`.

The Designer merged graph/plan must preserve every core
`PlannedPackageResource.identity`, dependency, reference path, and stable order,
then add sidecars through its own strict namespace. It may never replace a
symbolic package reference with a fabricated DB ID during staging. No alias,
fallback export, or copy of terminal implementation is permitted. Any byte
change to these exports after this freeze requires an explicit contract
amendment and fresh read-only reconcile. TASK-414 never edits or widens
`FullSitePackageV1`.

## Designer Site Bundle Contract

```ts
type DesignerSidecarEnvelopeV1 = Readonly<{
  sidecarId: string;
  sidecarKind:
    | "posts"
    | "media-assets"
    | "booking"
    | "commerce"
    | DesignerRegisteredSidecarKind;
  adapterId: string;
  adapterVersion: string;
  resources: readonly DesignerSidecarResourceV1[];
  references: readonly DesignerSymbolicReferenceV1[];
  canonicalDigest: string;
}>;

type DesignerSiteBundleV1 = Readonly<{
  schema: "coderso.designer-site-bundle@v1";
  core: FullSitePackageV1;
  sidecars: readonly DesignerSidecarEnvelopeV1[];
}>;
```

Each sidecar kind has one strict reject-unknown schema, normalizer, bounds,
stable resource/reference keys, native stage/preview/promote/read-generation
adapter versions, permission union, and canonical serializer registered through
TASK-414-06's pure contributions. Sidecar payloads cannot be arbitrary JSON,
HTML/CSS/JavaScript, URLs, native IDs, or plugin metadata. Unknown/missing/
duplicate adapters fail. The initial gap matrix must cover at least Posts,
private binary Media assets/adoption metadata, Booking, and Commerce whenever
terminal TASK-547 core does not represent them; add other discovered unsupported
families by contract amendment, not by silently omitting them.

Core and sidecars share one symbolic reference namespace, one acyclic graph,
one stable plan, one validation receipt, one preview digest, one approval tuple,
one promotion transaction, and one backup/restore graph. A sidecar cannot be
preview-only or promotion-only. Legacy terminal `FullSitePackageV1` bytes remain
byte-identical and can be wrapped with an empty canonical sidecar array only
when the requested site genuinely needs no sidecar resource.

## Compiler Contract

The compiler accepts only the normalized brief, authorized input projection
facts, the shared strict untrusted draft schema, exact capability-manifest
version, and backend policy. The historical TypeScript type may remain named
`DesignerProviderDraftV1`, but source identity/authorization comes only from the
separate materialization-source binding. The compiler owns all trusted symbolic keys, package metadata, schema
version, route/slug normalization, native document construction, reference
resolution, permission derivation, and diagnostics.

Compilation must:

1. enforce Designer/provider draft complexity before expansion;
2. map allowlisted semantic draft nodes to backend-owned package resource
   constructors;
3. call terminal `normalizeFullSitePackageForWrite`, serialize the normalized
   core with `canonicalizeFullSiteJsonValue`, verify
   `fullSitePackageFingerprint`, and use strict registered normalizers/
   serializers for every sidecar;
4. serialize canonical `DesignerSiteBundleV1` bytes and build one merged
   core/sidecar reference graph plus stable topological planner;
5. reject cycles, dangling/ambiguous refs, duplicate stable keys, forbidden
   settings/routes, unsupported kinds, and capability drift;
6. run each resource through its stage-capable native normalizer/validator;
7. derive the exact native permission union and preview route manifest;
8. produce immutable core-package, sidecar, whole-bundle, graph, plan,
   diagnostic, and validation digests.

Any raster or other binary input must already be scanned, normalized, and
written to an attempt-scoped private object key before this leaf starts its DB
transaction. The compiler accepts only a strict server-created
`PreparedDesignerAssetAdoptionV1` containing expected digests, lengths, MIME,
attempt owner, and target symbolic bindings. Inside the materialization
transaction it locks that attempt and atomically adopts the exact metadata/
ownership rows, inserts revision input bindings and the stage graph, then marks
the revision ready. It never copies bytes or performs storage/network I/O in the
transaction. Rollback leaves the attempt private and cleanup-eligible; the
caller must run idempotent object cleanup and record a durable adoption-attempt
recovery state when absence cannot be proven.

Workflow state, workspace IDs, revision IDs, preview-session IDs/bind secrets, approval facts,
leases, and promotion metadata remain outside both package and sidecars.
Legacy/no-Designer package serialization stays byte-identical; no Designer
defaults or allowlist keys are added to the TASK-547 schema.

## Validation Receipt Contract

`DesignerValidationReceiptV1` is strict, immutable, and contains only bounded
safe facts:

- workspace ID/version, revision ID/number, and exact generation-run ID/fence;
- materialization source kind, binding schema, and canonical binding digest;
- brief, core-package, ordered sidecar-set, whole-bundle, graph, install-plan,
  and capability-manifest digests;
- TASK-547 package schema/normalizer/graph/planner versions;
- Designer compiler and stage-capability-registry versions;
- exact supported resource-kind counts and native validator version/digests;
- required native permission union/digest;
- preview route-manifest digest and bounded warnings/residuals;
- validation timestamp and receipt digest.

It contains no secrets, prompts, provider bodies, core/sidecar/bundle payload, private
asset bytes/paths, preview-session IDs/bind secrets, live-site baseline, approval, or lease.
A receipt is valid only for its exact bytes and versions; recompile or policy/
capability drift creates a new revision/receipt.

`assistant_designer_validation_receipts.generation_run_id` is the authoritative
run provenance used for replay. Materialization persists the deterministic
`DesignerPreviewManifestV1` through the terminal stage graph/artifact owner
inside `insertRevisionGraphOnceTx`/`completeGenerationTx`; consumers must not
invent a separate `insertManifestTx` repository or a second preview table.

A post-terminal built-in source still calls
`normalizeFullSitePackageForWrite`, `canonicalizeFullSiteJsonValue`,
`fullSitePackageFingerprint`, `buildReferencePlan`, the same stage projection,
and the same receipt builder. An already normalized immutable package may pass
normalization again only with tests proving input immutability and canonical
byte/fingerprint equality; no source may bypass this terminal write boundary.

## Implementation Pseudocode

```ts
export async function compileAndMaterializeDesignerRevision(
  input: UntrustedDesignerDraft,
  deps: DesignerCompilerDeps
): Promise<ReadyDesignerRevision> {
  const compiled = compileDesignerPackage({
    brief: input.brief,
    projections: input.inputs,
    draft: input.draft,
    capabilities: deps.stageCapabilities.snapshot(),
  });
  const core = normalizeFullSitePackageForWrite(compiled.core);
  const coreBytes = canonicalizeFullSiteJsonValue(core as unknown as JsonValue);
  const coreSha256 = fullSitePackageFingerprint(core);
  const coreReferencePlan = buildReferencePlan(core);
  const sidecars = deps.sidecars.normalizeAll(compiled.sidecars);
  const bundle = normalizeDesignerSiteBundleV1({
    schema: "coderso.designer-site-bundle@v1",
    core,
    sidecars,
  });
  const bundleBytes = serializeCanonicalDesignerSiteBundleV1(bundle);
  const graph = buildMergedDesignerReferenceGraph(
    bundle, coreReferencePlan, deps.sidecars,
  );
  const plan = resolveDesignerInstallPlan(graph);
  const staged = validateAndProjectStageResources(bundle, graph, plan, deps.native);
  const receipt = buildDesignerValidationReceipt({
    claimBinding: input.claim.binding,
    sourceExecutionBinding: input.claim.sourceExecutionBinding,
    inputBindingDigest: input.claim.inputBindingDigest,
    coreBytes,
    coreSha256,
    bundleBytes,
    graph,
    plan,
    staged,
    versions: deps.versions,
  });

  const authorization = await deps.authorization.resolveCurrentDesignerMaterialization({
    actorId: input.claim.actorId,
    workspaceId: input.claim.workspaceId,
    revisionId: input.claim.revisionId,
    inputIds: input.claim.inputIds,
    requiredPermissions: receipt.requiredPermissions,
    requiredCapabilities: input.claim.requiredCapabilities,
  });
  const sourceAuthorization =
    await deps.sourceExecutions.resolveCurrentBeforeMaterialization({
      claim: input.claim,
      preparedPrivateAssets: input.preparedPrivateAssets,
    });
  assertExactDesignerMaterializationSourceBinding(
    input.claim.sourceExecutionBinding,
    sourceAuthorization.binding,
  );
  assertExactCurrentInputBindingDigest(
    input.claim.inputBindingDigest,
    authorization.inputBindingDigest,
  );

  return deps.db.transaction(async (tx) => {
    const current = await deps.authorization.lockCurrentMaterializationFactsTx(
      tx,
      input.claim,
    );
    assertCurrentActorWorkspacePermissionEpochInputAndSourceGeneration(
      current,
      authorization,
      receipt,
    );
    const workspace = await deps.workspaces.lockGenerationClaimTx(tx, input.claim);
    assertClaimBinding(workspace, input.claim, receipt.claimBinding);
    await deps.sourceExecutions.lockAndAssertCurrentTx(tx, {
      claim: input.claim,
      sourceAuthorization,
      preparedPrivateAssets: input.preparedPrivateAssets,
      receipt,
    });
    const prior = await deps.stage.findMaterializedRevisionDigestTx(
      tx, workspace.id, receipt.revisionId,
    );
    if (prior) return assertIdenticalDigestReplayOrConflict(prior, receipt);
    const adoptedAssets = await deps.assets.adoptPreparedAttemptTx(tx, {
      claim: input.claim,
      preparation: input.preparedPrivateAssets,
      expectedBindings: staged.privateAssetBindings,
      sourceExecutionBinding: input.claim.sourceExecutionBinding,
    });
    assertExactPreparedAssetBindings(adoptedAssets, staged.privateAssetBindings);
    await deps.stage.insertRevisionInputBindingsOnceTx(
      tx, workspace.id, receipt, adoptedAssets,
    );
    await deps.stage.insertRevisionGraphOnceTx(tx, workspace.id, receipt, staged);
    const ready = await deps.workspaces.completeGenerationTx(tx, {
      claim: input.claim,
      bundleBytes,
      receipt,
    });
    await deps.events.recordTx(tx, ready, "designer_revision_ready");
    return projectReadyRevision(ready, receipt);
  });
}
```

Compilation and private object preparation are pure/outside-transaction work
where possible and occur before the short materialization transaction. The
current source execution binding, actor permission epoch, workspace ownership,
input state/digests, and claim fence are re-resolved after the source claim and
immediately before materialization; run-claim cross-replica exclusivity
consumes (read-only) TASK-414-05-L04's durable execution lease contract by
exact name (`assistant_action_execution_leases`, fence compare-and-swap) — no
vague lease-like primitive or process-local mutex. For `prompt_ai`, this means
all six current provider/model/config/input-policy fields. For a Figma-backed
prepared adoption, the same closed registry resolves and then transactionally
locks the exact `FigmaImportExecutionBindingV1` grant, selection, credential
generation, and source-owned lease-fence facts before any adoption or stage
insert. The transaction also locks/re-reads every authorization fact before its
first write; revocation, disconnect, abort, or drift produces zero adopted
assets and zero staged rows. A pre-claim, provider-time, or import-time receipt alone is never
authorization. Generic callbacks cannot bypass this check because only the
statically composed source registry can dispatch a verifier. If compilation
fails, a separate fenced service transaction records a bounded
`failed` state. Materialization and prepared-asset adoption are insert-once
under the current generation fence. An identical digest/idempotency replay
returns the existing result only when the existing asset-binding digest also
matches; changed bytes require a new child revision. It never deletes/replaces
reviewed revision rows. Rollback leaves prior immutable revisions and the
canonical site unchanged, leaves no ready revision or adopted asset binding,
and keeps attempt-scoped objects eligible for idempotent cleanup/recovery.

## Data Flow

```text
untrusted strict semantic draft + exact bound materialization source
  + scanned attempt-scoped private asset preparation
  -> bounded backend constructors
  -> TASK-547 core + strict sidecar normalize/canonical bundle bytes
  -> merged core/sidecar reference graph + stable plan
  -> stage-capable native normalize/validate
  -> immutable validation receipt
  -> transaction: claim/attempt recheck + asset/input adoption + Designer stage
     rows + ready CAS + event
```

Only Designer repositories receive the materialized projection. Canonical
installer adapters, normal CMS repositories, search, public routes, and cache
publication are absent from this data path.

## Machine-Readable Errors

- `designer_package_invalid`
- `designer_package_too_large`
- `designer_package_too_complex`
- `designer_reference_invalid`
- `designer_reference_cycle`
- `designer_resource_unsupported`
- `designer_native_validation_failed`
- `designer_capability_drift`
- `designer_validation_receipt_invalid`
- `designer_generation_conflict`
- `designer_stage_materialization_failed`

Diagnostics use bounded stable resource keys and safe field paths only. They
never expose raw provider data, package bodies, SQL, native driver messages,
private storage locations, or secrets.

## Security Contract

| Concern | Contract |
|---|---|
| Visibility | Pure/service/persistence leaf; no endpoint. It is reachable only after the internal generation API has authenticated and normalized a run. Staged rows are not public. |
| Authentication | The fenced generation claim carries a server-derived actor/workspace binding; materialization rechecks it under lock. Provider identity is evidence, not authorization. |
| RBAC | The caller has `designer:write`. The compiler derives, but does not grant, the exact native permission union later required by `designer:promote`. |
| CSRF | Not applied inside compiler code. The generation route must pass shared CSRF before creating the run claim. |
| Rate limits | Upstream generation uses `designer-generation`; compiler limits cap resources, refs, depth, routes, strings, diagnostics, bytes, and elapsed work independently of provider quotas. |
| Validation | Recursive reject-unknown provider schema, backend constructors, terminal TASK-547 normalizer/graph/planner, native stage validators, strict receipt schema, digest/version checks, and transactional constraints all fail closed. |
| Anti-abuse | Ownership/fenced claim, bounded graph work, no external I/O in transaction, no canonical writes, and no public write apply. Nonce/HMAC/reCAPTCHA are not applicable. |

## Regression-Test Shape

Vitest must cover:

- every core package kind, every registered sidecar kind, cross-core/sidecar
  reference, and each unsupported-stage outcome;
- malicious unknown fields, raw HTML/script/CSS, URLs, IDs, permissions,
  settings/secrets, digest/receipt forgery, cycles/dangling/ambiguous refs, and
  every scalar/aggregate complexity edge;
- canonical core/sidecar/bundle compile determinism and normalize/serialize
  byte identity;
- no change to terminal `FullSitePackageV1` keys/defaults/legacy bytes and no
  arbitrary/unregistered sidecar payload;
- stable graph/plan/receipt digest under equivalent input and changes under
  every bound field/version mutation;
- permission union and capability-manifest parity;
- exact `prompt_ai` binding comparison across all six provider execution
  fields, exact prepared-private-source schema/digest comparison, and startup
  rejection for missing/duplicate/unknown source contributions; and
- proof that route/provider/prepared-adoption supplied verifier callbacks are
  rejected and cannot bypass the static registry.

Bun/PostgreSQL integration must cover:

- complete multi-kind graph materialization and immutable receipt persistence;
- prepared private bytes before the transaction, followed by atomic asset-row/
  input-binding/stage-graph/ready commit with exact digest equality;
- fault injection after each stage-row group causing full transaction rollback;
- faults before/after asset adoption roll back all DB visibility, leave no
  `ready` revision, and make the exact private attempt cleanup/recovery eligible;
- stale claim/version/revision rejecting all writes;
- provider/config drift and each Figma grant/selection/credential-generation/
  lease/fence mutation before materialization or under transaction lock,
  producing zero adoption/stage rows;
- concurrent compiler completions: exactly one ready revision; identical replay
  returns it and changed bytes cannot replace it;
- canonical table/search/cache canaries byte/row/count unchanged before and
  after successful staging and failure rollback;
- staged resources absent from every normal CMS list/detail/search/public read;
- selected-column/query-count bounds for stage summaries and point reads.

## Testing Requirements

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run --config vitest.config.ts \
  tests/vitest/designer/designer-package-compiler.test.ts \
  tests/vitest/designer/designer-stage-graph.test.ts \
  tests/vitest/designer/designer-materialization-source-registry.test.ts \
  tests/vitest/designer/designer-validation-receipt.test.ts
set -a && source .env && set +a && bun test \
  tests/integration/designer/designer-stage-materialization.test.ts \
  tests/integration/designer/designer-canonical-isolation.test.ts
git diff --check
wc -l core/services/designer/packageCompiler.ts \
  core/services/designer/designerSiteBundleContract.ts \
  core/services/designer/designerSidecarRegistry.ts \
  core/services/designer/stageGraphContract.ts \
  core/services/designer/stageCapabilityRegistry.ts \
  core/services/designer/stageMaterializationService.ts \
  core/services/designer/materializationSourceContract.ts \
  core/services/designer/materializationSourceRegistry.ts \
  core/services/designer/validationReceiptContract.ts \
  core/services/designer/validationReceiptService.ts \
  tests/vitest/designer/designer-package-compiler.test.ts \
  tests/vitest/designer/designer-stage-graph.test.ts \
  tests/vitest/designer/designer-materialization-source-registry.test.ts \
  tests/vitest/designer/designer-validation-receipt.test.ts \
  tests/integration/designer/designer-stage-materialization.test.ts \
  tests/integration/designer/designer-canonical-isolation.test.ts
```

## Documentation Updates Required

Provide the closure leaf with compiler/receipt versions, supported/unsupported
package-kind matrix, validation limits/error meanings, and proof that staged
resources remain outside canonical CMS/search/cache/public reads. Do not edit
TASK-547 docs, task indexes, or changelog 1266 here.
