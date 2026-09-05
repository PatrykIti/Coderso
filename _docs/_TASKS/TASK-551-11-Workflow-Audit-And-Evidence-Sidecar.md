# TASK-551-11: Workflow, Audit, and Evidence Sidecar
# FileName: TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md
**Parent Task:** TASK-551
**Priority:** High
**Category:** Workflow / Audit / Evidence / Collision Safety
**Estimated Effort:** Large
**Dependencies:** None; runs throughout TASK-551 and gates every product dispatch
**Status:** 🚧 In Progress
**Changelog:** 1310 pinned (closure only)
---
## Overview
Own the reproducible TASK-551 workflow: grounded research/authoring, one complete contract drift-audit round, sequential dispatch, targeted gates, independent post-audit lenses, runtime smoke, and closure evidence. It implements no product behavior or database/environment/parent-metadata state; it is authoritative for workflow provenance, the L01 handoff, L03/L04/L02 fixture boundaries, TASK-551-05-L02 handoff/promotion validation, and eleven durable artifacts. Superseded bundles, aliases, live maps, and alternate orderings are not contracts; consumer projections are immutable typed reads of durable records.
## Exact Single-Writer Ownership
The declaration/type boundary in the closed matrix below is implemented and audited: the four sibling test-only `.d.mts` declarations, the public `unknown` evidence-projection input, and the three matrix-bound workflow tests are present. The automatic in-process `runTask551ImplementWorkflow` route remains incomplete and fail-closed; it cannot dispatch an L01 leaf, gate, child, evidence write, or automatic composition before the owner-controlled-provider decision below. This limitation does not prohibit AGENTS.md-authorized manual owner/Codex/agent delivery of existing product leaves, which must retain the declared graph, single-writer, audit, gate, evidence, smoke, and closure requirements.
The remaining L11 implementation may mutate only these fourteen workflow/declaration modules and three existing tests:
- `_docs/_workflows/lib/task-551-contract.mjs` (public provenance/command facade)
- `_docs/_workflows/lib/task-551-evidence-contract.mjs` (private evidence schema/recovery contract)
- `_docs/_workflows/lib/task-551-evidence-filesystem.mjs` (private durable evidence-I/O companion)
- `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` (private pure frozen capability descriptors, compatibility-receipt validation, L04 phase/provenance state, declared nine-path lifecycle contract plus the separately owned L01 auxiliary direct test, and extracted worktree/barrier algorithms; no filesystem, DB, or L02 import; the facade supplies only named post-closure frozen L03/L04 projections, never a bootstrap-time value)
- `_docs/_workflows/lib/task-551-l02-subgate-executor.mjs` (private injected two-subgate state machine that extracts the classifier prefix and enforces reviewed transition before `check-small`; no host/DB import; the outer implementer supplies frozen dispatch projection/callbacks)
- `_docs/_workflows/lib/task-551-dispatch-contract.mjs` (strict task-contract parser helper)
- `_docs/_workflows/lib/task-551-contract.d.mts` (public declaration facade)
- `_docs/_workflows/task-551-author-audit.mjs`
- `_docs/_workflows/task-551-implement.mjs`
- `_docs/_workflows/task-551-fix.mjs`
- Test-only sibling declarations (not facade/public exports): `_docs/_workflows/task-551-author-audit.d.mts`, `_docs/_workflows/task-551-implement.d.mts`, `_docs/_workflows/task-551-fix.d.mts`, `_docs/_workflows/lib/task-551-evidence-contract.d.mts`.
- `tests/unit/workflows/task551AuthorAudit.test.ts`
- `tests/unit/workflows/task551WorkflowContracts.test.ts`
- `tests/unit/workflows/task551EvidenceContract.test.ts`
`task-551-contract.mjs` statically imports only its evidence helper and private worktree-compatibility module. `runTask551WorkflowCompatibilityBootstrapV2` has a sidecar-only import closure and can load/run while L03, L04, and L02 modules are absent: it reads only deeply frozen L11 literal descriptors, not an L03/L04/L02 path, byte, export, host, fixture, or parser. The facade's declared/supported consumer API is the sole public workflow API; its one non-declared owner-internal runtime composition bridge, `bootstrapTask551EvidenceStorageForOwnerWorkflowHost`, may be called only by `task-551-implement.mjs`, is neither a supported API nor a private reexport, and appears in no public or private declaration. After a fresh L03 closure only, exact non-public `adaptTask551L03ClosureV2(closure)` may literal-dynamically import `../../../scripts/task-551-fixture-target-bootstrap.ts` and use only `getTask551FixtureBootstrapToolContractIdentity` and `getTask551FixtureBootstrapToolContractDigest`; after a fresh L04 closure only, `adaptTask551L04ClosureV2(closure)` may literal-dynamically import `../../../scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts` and use only `getTask551FreezeCandidateGenerationBootstrapV2`; only after the distinct `Task551L02CodeTestMaterializationClosureV1` below, produced after L04 closure/adaptation and before `TASK-551-01-L02:single`, may `adaptTask551L02ClosureV2(closure)` literal-dynamically import `../../../scripts/task551DatabaseBaseline/reviewedPairPersistence.ts` and use only `runL02OwnedReviewedTransition`, the two already-reduced normalizers, and snapshot-registration hook. The outer implementer is likewise the sole literal importer of `../../scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts`, gated by that same materialization closure rather than final L02 leaf closure. Each seam first verifies its exact named phase closure/current-byte receipt, rejects a missing/foreign export, and freezes its narrow projection; computed/specifier/caller-supplied imports and every generic parser/fixture/runtime import fail. The L03 seam is DB/env-free and non-generic; the two normalizers never receive archive/state paths or bytes; predecessor parsing remains the facade's later named literal edge only. The evidence helper owns durable manifest/schema/recovery policy; the filesystem companion alone owns physical evidence I/O. The declaration/type boundary is implemented and audited; remaining L04 provenance and source/execution boundaries stay incomplete and cannot reach automatic in-process dispatch before the provider decision below.
`task-551-dispatch-contract.mjs` alone owns strict own-data task-file snapshots, duplicate-key-aware JSON, graph/envelope preflight, and frozen non-source projections; it may call worktree compatibility only with immutable descriptors. `task-551-author-audit.mjs` is the sole supported owner-controlled source ingress and mints an opaque one-use broker; `task-551-fix.mjs` alone owns the source-child adapter (validate/map/spawn/capture/dispose) and its private logical-argv registry. The only production/composition private module edges are facade -> evidence helper -> filesystem companion, facade -> worktree compatibility, dispatch -> worktree compatibility (immutable descriptors only), author-audit -> dispatch helper, implement -> author-audit (broker), implement -> fix (adapter), implement -> L02-subgate executor (frozen projection/callbacks only), and the sole outer-root literal post-materialization `implement -> reviewedPairOwnerHost -> reviewedPairTransition` edge. No production/composition module may import the owner host except that literal implement edge; the host receives a callback and imports no L11/workflow source. Author-audit must not import/wrap fix; L02 must not import L11; cycles, a second public surface, or a duplicate evidence writer/recovery/provenance/supported-ingress substitute fail.
| Test-only file | Exact direct private runtime imports, backed only by its sibling declaration |
|---|---|
| `task551AuthorAudit.test.ts` | `author-audit`: `TASK551_RECONCILE_SCOPE`, `deriveTask551AuditScopes`, `evaluateTask551DriftRound`, `normalizeTask551AuditResult`, `planTask551Reaudit`, `preflightTask551AuthorAuditDispatch`, `requireTask551ProductionDispatchTaskSnapshot`, `requireTask551AuthoredScope`, `requireTask551ResearchGrounding`, `requireTask551TestDispatchTaskSnapshotForTests`, `runTask551AuthorAuditWorkflow`, `runTask551AuthorAuditWorkflowForTests`, `runTask551DriftAuditRound`; `fix`: `runTask551BoundedChild`. |
| `task551WorkflowContracts.test.ts` | `author-audit`: `requireTask551TestDispatchTaskSnapshotForTests`, `runTask551AuthorAuditWorkflowForTests`; `implement`: `createTask551TestExecutionSession`, `deriveTask551ImplementLandOrder`, `runTask551ImplementWorkflow`, `runTask551ImplementWorkflowForTests`; `fix`: `requireTask551CommandReceiptV1`, `requireTask551LogicalArgvPreimageV1`, `runTask551BoundedChild`. |
| `task551EvidenceContract.test.ts` | `implement`: `publishTask551PhaseEvidence`; `evidence-contract`: `createTask551EvidenceTestHarnessForTests`. No matrix private symbol becomes a supported facade/public-declaration export or private reexport. The facade-defined, non-declared owner-storage bridge below is not a matrix test seam and may be called only by `task-551-implement.mjs`; no bridge declaration, additional owner bridge, central ambient declaration, other private import, or new test file is authorized. |
The only repository evidence outputs are the eleven literal manifest-derived paths under `audit-evidence/`; private staging/quarantine state exists only below the owner-private storage root and is neither a repository output nor consumer evidence. Tests use unique owner-private temporary roots, never the canonical root. Outside this closed fourteen-source/declaration/three-test list and those eleven outputs, L11 implementation never mutates another workflow/lib helper, product path, unrelated task contract, closure path, DB, or environment file; this authoring refinement is limited to this contract, its parent linkage, and board state. It may read task/source/test files and dispatch owner commands.
Agents never stage, commit, push, deploy, reset, checkout, truncate tables, flush Redis, or clean another process's files; the repository owner commits.
## Mandatory Compatibility Bootstrap Before Author-Audit
The exact sidecar implementation order is **contract amendment → fresh audit → filesystem extraction → facade worktree-compatibility extraction → parser two-subgates/prerequisite → L02-subgate-executor extraction plus `runTask551WorkflowCompatibilityBootstrapV2` → L03 adaptation only after L03 closure → L04 provenance only after L04 closure → L02 adaptation only after L02 code/test materialization closure**. The DB-free, environment-free, non-spawning bootstrap is neither graph node, product leaf, durable row, nor docs-only preflight. Its immutable descriptor has exactly the ordered fourteen sidecar `ownedFiles` in `TASK551_PHASE_PROVENANCE`, then these ordered nine planned paths: `tests/perf/database-query-inventory.test.ts`, `tests/integration/server/task551BunLaneMembership.test.ts`, `tests/perf/task551FixtureTargetBootstrap.test.ts`, `tests/perf/database-query-baseline.test.ts`, `tests/perf/task551DatabaseBaseline/digestContract.test.ts`, `tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts`, `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`, `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`; then `["classifier-materialization","reviewed-pair-transition"]`, `"TASK-551-11:compatibility-bootstrap@v2"`, and `l04Phase:true`. The L01-owned `tests/perf/database-query-inventory-capability-routes.test.ts` is deliberately outside that immutable descriptor: it is a direct auxiliary gate, not a planned path, four-test prerequisite input, or generic barrier receipt.
type Task551WorkflowCompatibilityReceiptV2 = Readonly<{ schema:"coderso.task551.workflow-compatibility-bootstrap@v2"; phase:"compatibility-bootstrap"; descriptorSchema:"coderso.task551.workflow-capability-descriptor@v2"; sidecarClosureSha256:Task551LowercaseSha256; sidecarPaths:readonly string[]; plannedBunPaths:readonly string[]; l02Subgates:readonly ["classifier-materialization","reviewed-pair-transition"]; workflowPrerequisite:"TASK-551-11:compatibility-bootstrap@v2"; l04Phase:true; }>;
The receipt has exactly those own enumerable data keys in that order, deeply frozen arrays/no prototype extras or defaults. `sidecarClosureSha256` is raw lowercase SHA-256 of `u32BE(utf8-byte-length)||utf8` frames, in order: magic `coderso.task551.workflow-compatibility-descriptor@v2`, schema, phase, descriptorSchema, every fourteen sidecar path, every nine planned path, each subgate, prerequisite, and literal `true`; it never hashes source/current/archive/state bytes. Bootstrap recomputes this directly from its module-literal descriptor before minting and every later check recomputes it.
The facade-private holder is a `WeakMap` keyed only by exact frozen receipt identity and holding a monotonic private epoch, exact position, and opaque result identity. Its only ordered states are `bootstrap-ready -> author-audit-admitted -> graph-admitted -> l02-admitted`: a gate first validates receipt identity, exact keys/values/order/freeze, descriptor, recomputed hash, current epoch, and its required predecessor position; it advances only when that gate itself returns its exact frozen private success-result identity bound to `(receipt identity, epoch, stage)` in the holder, never a caller-supplied or serialized result. A failed author-audit, graph, or L02 admission changes no position/bit and permits retry only at that same stage; direct graph/L02 before author-audit, direct L02 before graph, success replay, stage skip, clone/foreign/stale/previous-epoch receipt, changed descriptor, or mismatched result identity fails `task551_workflow_compatibility_bootstrap_invalid`. A fresh bootstrap replaces the epoch and invalidates every prior receipt/result mapping; successful L02 admission marks once then revokes its holder entry. Receipt/hash framing never serializes or depends on current graph/source/archive/state bytes, durable evidence, or cross-process input.
At that implementation step, `task-551-dispatch-contract.mjs` gains strict L02-only `workflowPrerequisites:["TASK-551-11:compatibility-bootstrap@v2"]` parsing and exact two-subgate/prefix validation using immutable descriptors; the injected executor runs classifier-prefix/review-before-`check-small` from frozen projection/callbacks. The facade requires the receipt in the exact author-audit -> graph -> L02 sequence; tests prove it loads/runs with L03/L04/L02 future modules unavailable and no attempted target resolution. The later author-audit reads current graph/envelopes; only the named post-closure seams validate L03/L04/L02 exports/current bytes. Any one/three subgates, wrong order/prefix, non-nine path tuple, missing L04 phase, bootstrap-time target access, or old implementation boundary (L04 provenance, author-audit -> fix/evidence parser/declaration) not yet extracted fails rather than counting current source as conformance before broker, source, fixture, child, evidence, or DB access.
## Canonical Phase Provenance and Import Closure
There is one canonical phase ownership array. Generic sidecar discovery/import/validation and immutable-worktree projections derive from its filtered generic paths; owner line-count/named-seam closures derive from its complete owned code/test paths.
`materializedWorktreeOutputs` join a current-worktree snapshot only after their producing operation and exact receipt; `ephemeralPostOperationOutputs`
are operation-local and never join one. Terminal durable evidence alone uses the separate committed-HEAD fence below; no second list, glob,
substring rule, or wildcard ownership claim is allowed; paths are literal, normalized, unique, and repository-relative.
```ts
type Task551PhaseId = "sidecar" | "l01" | "l03" | "l04" | "l02" | "05-l02";
type Task551PhaseProvenanceV1 = Readonly<{
  phase: Task551PhaseId;
  taskId:
    | "TASK-551-11"
    | "TASK-551-01-L01"
    | "TASK-551-01-L03"
    | "TASK-551-01-L04"
    | "TASK-551-01-L02"
    | "TASK-551-05-L02";
  ownedFiles: readonly string[]; ownedTests: readonly string[]; readOnlyImports: readonly string[];
  materializedWorktreeOutputs: readonly string[]; ephemeralPostOperationOutputs: readonly string[];
}>;
type Task551DeferredLiteralTargetV1 = Readonly<{ id: "l03-bootstrap" | "l04-bootstrap" | "l02-persistence" | "l02-owner-host" | "05-l02-predecessor"; path: string; eligibleAfter: "l03-closure" | "l04-closure" | "l02-code-test-materialization" | "05-l02-predecessor-seam"; seam: string }>;
const TASK551_PHASE_PROVENANCE: readonly Task551PhaseProvenanceV1[] = [
  {
    phase: "sidecar",
    taskId: "TASK-551-11",
    ownedFiles: [
      "_docs/_workflows/lib/task-551-contract.mjs",
      "_docs/_workflows/lib/task-551-evidence-contract.mjs",
      "_docs/_workflows/lib/task-551-evidence-filesystem.mjs",
      "_docs/_workflows/lib/task-551-worktree-compatibility.mjs",
      "_docs/_workflows/lib/task-551-l02-subgate-executor.mjs",
      "_docs/_workflows/lib/task-551-dispatch-contract.mjs",
      "_docs/_workflows/lib/task-551-contract.d.mts",
      "_docs/_workflows/task-551-author-audit.mjs",
      "_docs/_workflows/task-551-implement.mjs",
      "_docs/_workflows/task-551-fix.mjs",
      "_docs/_workflows/task-551-author-audit.d.mts",
      "_docs/_workflows/task-551-implement.d.mts",
      "_docs/_workflows/task-551-fix.d.mts",
      "_docs/_workflows/lib/task-551-evidence-contract.d.mts",
    ],
    ownedTests: [
      "tests/unit/workflows/task551AuthorAudit.test.ts",
      "tests/unit/workflows/task551WorkflowContracts.test.ts",
      "tests/unit/workflows/task551EvidenceContract.test.ts",
    ],
    readOnlyImports: [],
    materializedWorktreeOutputs: [], ephemeralPostOperationOutputs: [],
  },
  {
    phase: "l01",
    taskId: "TASK-551-01-L01",
    ownedFiles: [
      "scripts/task-551-query-inventory.ts",
      "scripts/task551QueryInventory/bunLane.ts",
      "scripts/task551QueryInventory/canonical.ts",
      "scripts/task551QueryInventory/check.ts",
      "scripts/task551QueryInventory/clientExpressions.ts",
      "scripts/task551QueryInventory/clientNamespaceAssignments.ts",
      "scripts/task551QueryInventory/contracts.ts",
      "scripts/task551QueryInventory/dynamicCapabilityAliases.ts",
      "scripts/task551QueryInventory/dynamicImportOrigins.ts",
      "scripts/task551QueryInventory/dynamicImportProvenance.ts",
      "scripts/task551QueryInventory/fileDiscovery.ts",
      "scripts/task551QueryInventory/literalDynamicClientImports.ts",
      "scripts/task551QueryInventory/gscDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityFactories.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilityOpaqueTypeFlow.ts",
      "scripts/task551QueryInventory/literalDynamicCapabilitySafety.ts",
      "scripts/task551QueryInventory/literalDynamicNamespaceSafety.ts",
      "scripts/task551QueryInventory/nonliteralDynamicImports.ts",
      "scripts/task551QueryInventory/productionScan.ts",
      "scripts/task551QueryInventory/scan.ts",
      "tests/perf/fixtures/task551QueryInventory.ts",
    ],
    ownedTests: [
      "tests/perf/database-query-inventory.test.ts",
      "tests/perf/database-query-inventory-capability-routes.test.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
    ],
    readOnlyImports: [
      "scripts/bun-lane-classify.ts",
      "tests/unit/toolchain/bunLaneManifest.test.ts",
    ],
    materializedWorktreeOutputs: ["tests/bun-lane-manifest.json"], ephemeralPostOperationOutputs: [],
  },
  {
    phase: "l03",
    taskId: "TASK-551-01-L03",
    ownedFiles: ["scripts/task-551-fixture-target-bootstrap.ts"],
    ownedTests: ["tests/perf/task551FixtureTargetBootstrap.test.ts"],
    readOnlyImports: [],
    materializedWorktreeOutputs: [], ephemeralPostOperationOutputs: [],
  },
  {
    phase: "l04", taskId: "TASK-551-01-L04",
    ownedFiles: ["scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts"],
    ownedTests: ["tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts"],
    readOnlyImports: [], materializedWorktreeOutputs: [], ephemeralPostOperationOutputs: [],
  },
  {
    phase: "l02",
    taskId: "TASK-551-01-L02",
    ownedFiles: [
      "scripts/task-551-database-baseline.ts",
      "scripts/task551DatabaseBaseline/catalog.ts",
      "scripts/task551DatabaseBaseline/digestContract.ts",
      "scripts/task551DatabaseBaseline/fixtureTarget.ts",
      "scripts/task551DatabaseBaseline/fixtureValidation.ts",
      "scripts/task551DatabaseBaseline/freezeCandidateGenerationStore.ts",
      "scripts/task551DatabaseBaseline/metrics.ts",
      "scripts/task551DatabaseBaseline/postgresTransport.ts",
      "scripts/task551DatabaseBaseline/receiptContract.ts",
      "scripts/task551DatabaseBaseline/requiredSanitizedCatalogProjection.ts",
      "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts",
      "scripts/task551DatabaseBaseline/reviewedPairReceiptSource.ts",
      "scripts/task551DatabaseBaseline/reviewedPairTransition.ts",
      "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts",
      "scripts/task551DatabaseBaseline/runner.ts",
      "scripts/task551DatabaseBaseline/runtimeProvenance.ts",
      "tests/perf/fixtures/task551DatabaseScale.ts",
      "tests/perf/fixtures/task551DatabaseBudgets.ts",
      "tests/perf/fixtures/task551AdminReadStatementShapes.ts",
      "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts",
      "tests/perf/task551DatabaseBaseline/contractTestHelpers.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationFixture.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationState.ts",
      "tests/perf/task551DatabaseBaseline/freezeCandidateGenerationTestHelpers.ts",
    ],
    ownedTests: [
      "tests/perf/database-query-baseline.test.ts",
      "tests/perf/task551DatabaseBaseline/digestContract.test.ts",
      "tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts",
      "tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts",
      "tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts",
    ],
    readOnlyImports: [
      "tests/perf/fixtures/task551QueryInventory.ts",
      "tests/integration/server/task551BunLaneMembership.test.ts",
      "tests/unit/toolchain/bunLaneManifest.test.ts",
    ],
    materializedWorktreeOutputs: [], ephemeralPostOperationOutputs: [],
  },
  {
    phase: "05-l02",
    taskId: "TASK-551-05-L02",
    ownedFiles: [
      "scripts/task-551-explain-plans.ts",
      "tests/perf/fixtures/task551QueryPlanContracts.ts",
    ],
    ownedTests: [
      "tests/perf/database-explain-plans.test.ts",
      "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts",
    ],
    readOnlyImports: [
      "scripts/task551DatabaseBaseline/digestContract.ts",
      "scripts/task551DatabaseBaseline/fixtureTarget.ts",
      "scripts/task551DatabaseBaseline/receiptContract.ts",
    ],
    materializedWorktreeOutputs: [], ephemeralPostOperationOutputs: [".tmp/task-551/task489-predecessor-v1.json"],
  },
] as const;
const TASK551_DEFERRED_LITERAL_TARGETS: readonly Task551DeferredLiteralTargetV1[] = Object.freeze([
  Object.freeze({ id: "l03-bootstrap", path: "scripts/task-551-fixture-target-bootstrap.ts", eligibleAfter: "l03-closure", seam: "adaptTask551L03ClosureV2" }),
  Object.freeze({ id: "l04-bootstrap", path: "scripts/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.ts", eligibleAfter: "l04-closure", seam: "adaptTask551L04ClosureV2" }),
  Object.freeze({ id: "l02-persistence", path: "scripts/task551DatabaseBaseline/reviewedPairPersistence.ts", eligibleAfter: "l02-code-test-materialization", seam: "adaptTask551L02ClosureV2" }),
  Object.freeze({ id: "l02-owner-host", path: "scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts", eligibleAfter: "l02-code-test-materialization", seam: "runTask551ImplementWorkflow" }),
  Object.freeze({ id: "05-l02-predecessor", path: "tests/perf/fixtures/task489SolutionKitRunPredecessor.ts", eligibleAfter: "05-l02-predecessor-seam", seam: "readTask55105L02PredecessorAtNamedSeam" }),
]);
const TASK551_DEFERRED_LITERAL_TARGET_PATHS = Object.freeze(TASK551_DEFERRED_LITERAL_TARGETS.map((target) => target.path));
const projectPhasePaths = (select: (phase: Task551PhaseProvenanceV1) => readonly string[]) => new Map(
  TASK551_PHASE_PROVENANCE.map((phase) => [phase.phase, [...select(phase)].sort()] as const),
);
const ownedCodeTestPaths = (phase: Task551PhaseProvenanceV1) => [...phase.ownedFiles, ...phase.ownedTests];
const isDeferredLiteralTarget = (path: string) => TASK551_DEFERRED_LITERAL_TARGET_PATHS.includes(path);
const genericPresentSourcePaths = (phase: Task551PhaseProvenanceV1) => [...ownedCodeTestPaths(phase), ...phase.readOnlyImports].filter((path) => !isDeferredLiteralTarget(path));
const TASK551_PHASE_IMPORT_CLOSURE = projectPhasePaths(genericPresentSourcePaths);
const TASK551_PHASE_DISCOVERY_ALLOWLIST = projectPhasePaths(genericPresentSourcePaths);
const TASK551_PHASE_CLOSED_ALLOWLIST = projectPhasePaths((phase) => ownedCodeTestPaths(phase).filter((path) => !isDeferredLiteralTarget(path)));
const TASK551_PHASE_VALIDATION_PATHS = projectPhasePaths(genericPresentSourcePaths);
const TASK551_PHASE_OWNED_CODE_TEST_PATHS = projectPhasePaths(ownedCodeTestPaths);
const TASK551_PHASE_LINE_COUNT_PATHS = TASK551_PHASE_OWNED_CODE_TEST_PATHS;
const TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS = projectPhasePaths((phase) => phase.materializedWorktreeOutputs);
const TASK551_PHASE_EPHEMERAL_POST_OPERATION_OUTPUTS = projectPhasePaths((phase) => phase.ephemeralPostOperationOutputs);
function deriveTask551ClosedWorktreeSet(
  phases: readonly Task551PhaseId[],
): readonly string[] {
  return [...new Set(phases.flatMap((phase) => [
    ...(TASK551_PHASE_CLOSED_ALLOWLIST.get(phase) ?? []),
    ...(TASK551_PHASE_MATERIALIZED_WORKTREE_OUTPUTS.get(phase) ?? []),
  ]))].sort();
}
const TASK551_05_L02_PROVENANCE = TASK551_PHASE_PROVENANCE.find(
  (phase) => phase.phase === "05-l02",
);
const TASK551_05_L02_VALIDATION_PATHS = TASK551_PHASE_VALIDATION_PATHS.get("05-l02");
const TASK551_05_L02_LINE_COUNT_PATHS = TASK551_PHASE_LINE_COUNT_PATHS.get("05-l02");
```
`TASK551_05_L02_PROVENANCE`, its validation paths, and line-count paths are literal projections, not imports. `TASK551_DEFERRED_LITERAL_TARGETS` is a disjoint immutable descriptor: every descriptor path is filtered from generic sidecar `TASK551_PHASE_IMPORT_CLOSURE`, discovery, validation, closed/worktree/pre-spawn fingerprints, and `readOnlyImports`; it creates no graph node, planned-test path, or additional sidecar count. Its L03 bootstrap target is eligible only at `adaptTask551L03ClosureV2` after L03 closure, its L04 bootstrap only at `adaptTask551L04ClosureV2` after L04 closure, L02 persistence/owner host only at their named seams after `Task551L02CodeTestMaterializationClosureV1`, and the predecessor fixture only at `readTask55105L02PredecessorAtNamedSeam`. An owner materialization closure may digest its current regular non-symlink bytes, but only its named seam may recheck and literal-resolve that target; generic parser/fixture/runtime imports and bootstrap reject all descriptors. Ownership remains separately size-gated in `TASK551_PHASE_OWNED_CODE_TEST_PATHS`: the predecessor is an L02-owned static-registry file, not a 05-L02 `readOnlyImports` or generic sidecar input, and its later consumption has no duplicate generic closure. The archive remains outside every L11 import/projection; L02 alone verifies physical archive/state and returns sanitized values. `reviewedPairTransition.ts` stays L02 implementation-only, imports its owned `reviewedPairReceiptSource.ts`, and its host one-way invokes the injected callback without an L02 -> L11 import. The sole materialized
output is L01's `tests/bun-lane-manifest.json`; after classifier success it joins the named worktree snapshot and
`deriveTask551ClosedWorktreeSet`. The sole ephemeral output is `.tmp/task-551/task489-predecessor-v1.json`: after a successful 05-L02 producer, the L11 facade alone reads its original LF bytes once, invokes L02's parser once, hashes those same bytes, and retains only the frozen row values/digest. It never enters a worktree/terminal-HEAD closure. The facade alone writes rows 10/11 when their owner-reviewed values are exactly byte-identical; L02 supplies the parser/schema but creates no workflow evidence. The eleven durable sidecar rows remain solely `TASK551_DURABLE_EVIDENCE_MANIFEST` outputs.
The workflow regression verifies L02's declared `TASK551_RUNNER_DIGEST_SOURCE_PATHS` through its accepted L02 receipt/source inventory, including owned `reviewedPairReceiptSource.ts`, requires every unique literal source to belong to L02's exact `TASK551_PHASE_OWNED_CODE_TEST_PATHS` owner/materialization closure and be a current-worktree regular non-symlink file with an accepted receipt digest, and never dynamically imports a fixture runtime; a source-list addition must therefore add the same path to L02 provenance and its receipt.
Before discovery, every path must be in that phase's discovery allowlist. Exact task-file/graph bytes are captured at audit and must
match immediately before dispatch. An active leaf's declared paths may be absent before its dispatcher runs; after successful
materialization it captures its exact closed SHA-256 snapshot, then immediately before a child spawn rechecks that active allowlist
and its predecessor closure against the captured current bytes.
Any foreign path, duplicate/traversal, missing path, or byte drift fails closed. The immutable generic-sidecar snapshots contain generic-present code/test/task bytes only: the archive's fixed descriptor, every deferred literal target, and every active state/parent/lock/temp path are excluded from generic `TASK551_PHASE_*` import/discovery/validation/closed/worktree/pre-spawn projections, durable rows, and L11 generic filesystem operations. Deferred targets remain in their owner phase's normal ownership/line-count closure and only their named seam may resolve them. Use predecessor and active fences separately:
```ts
type Task551PathDigestV1 = Readonly<{ path: string; sha256: Task551LowercaseSha256 }>;
type Task551CurrentWorktreeSnapshotV1 = Readonly<{
  taskGraphDigest: Task551LowercaseSha256; taskFileDigests: readonly Task551PathDigestV1[]; predecessorDigests: readonly Task551PathDigestV1[];
  activeDigests: readonly Task551PathDigestV1[];
}>;
function task551FullProvenanceClosureForSpawn(phase: "l03" | "l02" | "05-l02"): readonly Task551PhaseId[] {
  return [...new Set([...dependenciesThrough(phase), phase])];
}
function requireTask551PredecessorWorktreeSnapshotBeforeSpawn(
  phase: "l03" | "l02" | "05-l02",
  snapshot: Task551CurrentWorktreeSnapshotV1,
): void {
  requireTaskFilesAndGraphBytesEqual(snapshot.taskFileDigests, snapshot.taskGraphDigest);
  const predecessors = task551FullProvenanceClosureForSpawn(phase).filter((member) => member !== phase);
  for (const member of predecessors) {
    requireExactDiscoveredPaths(member, TASK551_PHASE_DISCOVERY_ALLOWLIST);
    requireExactClosedPaths(member, TASK551_PHASE_CLOSED_ALLOWLIST);
    requireCurrentRegularNonSymlinkFilesWithDigests(TASK551_PHASE_IMPORT_CLOSURE.get(member), snapshot.predecessorDigests);
  }
  requirePhaseReadOnlyImportsInCurrentWorktree(phase);
  requireNoForeignPathOrByteDrift(snapshot);
}
function requireExactActivePhaseSnapshotBeforeSpawn(phase: "l03" | "l02" | "05-l02", activeDigests: readonly Task551PathDigestV1[]): void {
  requireExactDiscoveredPaths(phase, TASK551_PHASE_DISCOVERY_ALLOWLIST); requireExactClosedPaths(phase, TASK551_PHASE_CLOSED_ALLOWLIST);
  requireCurrentRegularNonSymlinkFilesWithDigests(TASK551_PHASE_IMPORT_CLOSURE.get(phase), activeDigests);
}
```
Missing/stale task-graph or path digest, changed input closure, or changed current bytes fails closed before process creation.
L02/05-L02 additionally require the L01 materialized-worktree snapshot and exact manifest digest; L03 precedes classifier
materialization. Ephemeral outputs are checked only after production and never enter a worktree snapshot or terminal-HEAD check.
Discovery is exact allowlist membership, not a substring check.
## L01 Materialization and Immutable Worktree Barrier
The only authoritative pre-L02 evidence order is the single sequence in `Frozen Task Graph and Land Order` below. The same
sequence is used by prose, pseudocode, receipts, and tests. L03 implementation and L03 sidecar dispatch do not require the L02
capability. L04 independently closes after L03; L11 then validates its pure bootstrap provenance without a child, source, fixture,
or evidence output. Only after that gate may the L02 prerequisite API/test land and an L02 sidecar (static, freeze, review, or
check) start or pass the materialization gate.
The L01 four-test prerequisite is one current-worktree, database-free, positive-discovery command over exactly these suites:
```sh
bun --env-file=/dev/null test \
  tests/perf/task551FixtureTargetBootstrap.test.ts \
  tests/perf/database-query-baseline.test.ts \
  tests/perf/task551DatabaseBaseline/digestContract.test.ts \
  tests/perf/task551DatabaseBaseline/fixtureTarget.test.ts
```
It receives no fixture source, target, database value, or fixture map. It must pass before the classifier snapshot or command begins.
All seven dependent L03/L04/L02 **test** paths—the four above plus `tests/perf/task551DatabaseBaseline/freezeCandidateGenerationBootstrap.test.ts`, `tests/perf/task551DatabaseBaseline/reviewedPairPersistence.test.ts`, and `tests/perf/task551DatabaseBaseline/runnerLifecycle.test.ts`—must exist before that one-shot snapshot; the latter three are excluded from the exact-four pre-classifier lane and run in their owners' focused/default-Bun lanes. Together with L01's two lifecycle tests, they are the nine test-path presence inputs. The separate L01 `database-query-inventory-capability-routes.test.ts` auxiliary gate is owned/validated through the L01 phase closure but deliberately does not join those inputs, the exact-four command, or any L11 receipt. All five `TASK551_DEFERRED_LITERAL_TARGETS` paths are outside the generic barrier whether or not owner code has already materialized them.
The exact four-test DB-free command above remains the sole pre-classifier prerequisite. The classifier is run once, from the repository root, with no arguments:
```sh
bun scripts/bun-lane-classify.ts
```
The classifier's before/after mutation allowlist is exactly `tests/bun-lane-manifest.json`. L11 does not edit that file, invoke an
alternate classifier, or accept a manual manifest mutation. The materialized manifest must equal the complete nine-path
`TASK551_PLANNED_BUN_TEST_PATHS` set (two L01-owned paths plus seven dependent paths) in sorted order, with no duplicate rows.
Classifier materialization creates a mandatory immutable-worktree barrier. L11 records task-graph bytes, ordered positive receipts,
the classifier's one-path delta, the nine test-path identities and resulting manifest, and SHA-256 only for exact filtered generic
non-deferred active/predecessor L01/L03/L04/L02 inputs; it rejects an extra/omitted/foreign path, a non-regular/symlinked generic
input, receipt mismatch, or byte drift. Its snapshot contains no descriptor path or digest: it neither requires, reads, fingerprints,
nor snapshots the L03 bootstrap, L04 bootstrap, L02 persistence/owner host, or predecessor fixture. Those bytes remain solely in named
owner/materialization closure receipts and seams. No L02 child, including an isolated static rerun, may spawn before this generic
current-byte recheck passes. The owner does not stage or commit this early barrier; normal combined gates and any final owner commit
remain governed by AGENTS.md.
All nine planned test paths must be present, regular, non-symlink current-worktree paths for manifest membership. Only the exact
four-test prerequisite is green with accepted positive receipts at this barrier; the L04 bootstrap, reviewed-pair-persistence, and
runner-lifecycle paths are presence-only here and pass in their later owner focused/default-Bun lanes before their respective L04/L02
closure/adaptation use. Owner-local closure/materialization may verify deferred source bytes separately, but no deferred source SHA is
a generic barrier input. Only the named literal post-L03, post-L04, and post-materialization adaptation seams may resolve the two
L03 helpers, L04 getter, or L02 public projection; bootstrap never does and no fallback exists.
### Acyclic two-commit predecessor/promotion owner barrier
Commit A lands immutable predecessor candidate/evidence inputs and establishes
`sourceHead = HEAD A`; L11 validates that committed candidate and publishes the
canonical promotion plus predecessor bytes with no-replace semantics. No artifact
requires its final HEAD before publication. The final owner handoff is exactly:
```ts
const TASK551_TERMINAL_HANDOFF_PATHS = ["_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json", "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-promotion-v1.json"] as const;
```
Commit B tracks only those two terminal paths. L11 rereads `terminalHead = HEAD B`,
proves both paths tracked/regular/non-symlink in HEAD and current tree, hashes
both bytes, and requires `sourceHead === HEAD A` plus `terminalHead === HEAD B`.
Missing/same-HEAD, extra/omitted, replaced, or dirty input blocks both consumers;
L10 and TASK-489 repeat this exact two-path tracked/current-tree/HEAD fence.
## Eleven Authoritative Durable Evidence Files
The following manifest is the only durable L03/L02/05-L02 sidecar evidence contract. It contains exactly eleven paths and exactly one
schema for each path. The array is the sole path/schema allowlist; no filename pattern, combined bundle, legacy alias,
multi-profile replacement, or alternate schema is accepted.
```ts
const TASK551_DURABLE_EVIDENCE_MANIFEST = [
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l03-initialize.json",
    schema: "coderso.task551.l03-initialize-evidence@v1",
    phase: "l03-initialize",
    keys: ["schema", "taskId", "phase", "pass", "noLeak", "commandReceipt"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l03-check.json",
    schema: "coderso.task551.l03-check-evidence@v1",
    phase: "l03-check",
    keys: ["schema", "taskId", "phase", "pass", "noLeak", "producer",
      "focusedTestReceipt", "checkCommandReceipt"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-static-small.json",
    schema: "coderso.task551.l02-static-evidence@v1",
    phase: "l02-static",
    profile: "small",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "focusedTests", "manifestSha256"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-static-large.json",
    schema: "coderso.task551.l02-static-evidence@v1",
    phase: "l02-static",
    profile: "large",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "focusedTests", "manifestSha256"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-freeze-candidate-small.json",
    schema: "coderso.task551.l02.freeze-candidate@v1",
    phase: "l02-freeze-candidate",
    profile: "small",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "candidateReceipt", "candidateCanonicalReceiptDigest", "freezeCommandReceipt"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-freeze-candidate-large.json",
    schema: "coderso.task551.l02.freeze-candidate@v1",
    phase: "l02-freeze-candidate",
    profile: "large",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "candidateReceipt", "candidateCanonicalReceiptDigest", "freezeCommandReceipt"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-reviewed-candidates.json",
    schema: "coderso.task551.l02.reviewed-candidates@v1",
    phase: "l02-reviewed-candidates",
    keys: ["schema", "taskId", "phase", "pass", "noLeak", "reviewed"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-check-small.json",
    schema: "coderso.task551.l02.check-evidence@v1",
    phase: "l02-check",
    profile: "small",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "staticEvidencePath", "candidatePath", "reviewedCandidatesPath",
      "checkCommandReceipt", "immutableDigests", "targetProof"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/l02-check-large.json",
    schema: "coderso.task551.l02.check-evidence@v1",
    phase: "l02-check",
    profile: "large",
    keys: ["schema", "taskId", "phase", "profile", "pass", "noLeak",
      "staticEvidencePath", "candidatePath", "reviewedCandidatesPath",
      "checkCommandReceipt", "immutableDigests", "targetProof"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json",
    schema: "coderso.task551.task489-predecessor@v1",
    phase: "task489-predecessor",
    keys: ["schema", "pass", "noLeak", "companionIds", "fixtureCounts", "logicalCases",
      "statementReceipts"],
  },
  {
    path: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-promotion-v1.json",
    schema: "coderso.task551.task489-predecessor-promotion@v1",
    phase: "task489-predecessor-promotion",
    keys: ["schemaVersion", "sourceTask", "sourcePhase", "sourceProfile",
      "sourceScenario", "sourceHead", "sourceDigest", "predecessor",
      "promotionState", "promotionDecision", "promotionReason",
      "validationSummaries", "createdAt", "reviewedAt", "promotedAt",
      "ownerCapabilityReceiptDigest"],
  },
] as const;
```
Each row is strict reject-unknown JSON; rows 1-10 require literal `noLeak:true`, while the 16-field promotion row rejects `noLeak`
and relies on its exact digests/validation summary. The count is exactly 11; static, review, and predecessor rows stay separate.
```ts
type Task551PromotionValidationSummariesV1 = Readonly<{ sourceIdentity: "passed"; predecessorBytes: "passed"; atomicNoReplace: "passed"; terminalHead: "passed" }>;
type Task551Task489PredecessorPromotionEvidenceV1 = Readonly<{
  schemaVersion: "coderso.task551.task489-predecessor-promotion@v1"; sourceTask: "TASK-551-05-L02"; sourcePhase: "05-l02";
  sourceProfile: null; sourceScenario: "task489-predecessor"; sourceHead: string; sourceDigest: Task551LowercaseSha256;
  predecessor: Readonly<{ sourcePath: ".tmp/task-551/task489-predecessor-v1.json"; durablePath: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json"; schemaVersion: "coderso.task551.task489-predecessor@v1"; digest: Task551LowercaseSha256 }>;
  promotionState: "promoted"; promotionDecision: "accept"; promotionReason: "exact-byte-match-after-owner-review";
  validationSummaries: Task551PromotionValidationSummariesV1; createdAt: string; reviewedAt: string; promotedAt: string;
  ownerCapabilityReceiptDigest: Task551LowercaseSha256;
}>;
type Task551Task489PredecessorPromotionTerminalFenceV1 = Readonly<{
  schema: "coderso.task551.task489-predecessor-promotion-terminal-fence@v1"; sourceHead: string; terminalHead: string;
  predecessorPath: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-v1.json"; promotionPath: "_docs/_workflows/_smoke/task-551/audit-evidence/task489-predecessor-promotion-v1.json";
  predecessorDigest: Task551LowercaseSha256; promotionDigest: Task551LowercaseSha256;
}>;
type Task551L10EvidenceProjectionV1<R> = Readonly<{ consumer: "TASK-551-10-L01"; schema: string; taskId: "TASK-551-11"; phase: keyof typeof TASK551_L10_RESULT_FIELDS; scenario: keyof typeof TASK551_L10_RESULT_FIELDS; profile: "small" | "large" | null; status: "accepted"; result: R; timestamp: string; sourceHead: string; sourceDigest: Task551LowercaseSha256; noLeak: true; predecessor: null; promotion: null }>;
type Task551L10TerminalProjectionV1 = Readonly<{ consumer: "TASK-551-10-L01"; schema: "coderso.task551.task489-predecessor-promotion@v1"; taskId: "TASK-551-11"; phase: "task489-predecessor-promotion"; scenario: "task489-predecessor"; profile: null; status: "accepted"; result: null; timestamp: string; sourceHead: string; sourceDigest: Task551LowercaseSha256; noLeak: null; predecessor: Task489PredecessorReceiptV1; promotion: Task551Task489PredecessorPromotionEvidenceV1 }>;
type Task551L10ProjectionV1<R> = Task551L10EvidenceProjectionV1<R> | Task551L10TerminalProjectionV1;
type Task551Task489ConsumerProjectionV1 = Task489PredecessorReceiptV1;
const TASK551_L10_PROJECTION_KEYS = ["consumer", "schema", "taskId", "phase", "scenario", "profile", "status", "result", "timestamp", "sourceHead", "sourceDigest", "noLeak", "predecessor", "promotion"] as const;
const TASK551_L10_RESULT_FIELDS = {
  "l03-initialize": ["pass", "noLeak", "commandReceipt"],
  "l03-check": ["pass", "noLeak", "producer", "focusedTestReceipt", "checkCommandReceipt"],
  "l02-static": ["pass", "noLeak", "focusedTests", "manifestSha256"],
  "l02-freeze-candidate": ["pass", "noLeak", "candidateReceipt", "candidateCanonicalReceiptDigest", "freezeCommandReceipt"],
  "l02-reviewed-candidates": ["pass", "noLeak", "reviewed"],
  "l02-check": ["pass", "noLeak", "staticEvidencePath", "candidatePath", "reviewedCandidatesPath", "checkCommandReceipt", "immutableDigests", "targetProof"],
} as const;
const TASK551_L10_PROJECTION_MATRIX = {
  "l03-initialize": { kind: "evidence", profileValues: [null] as const, scenario: "l03-initialize", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l03-initialize"] }, "l03-check": { kind: "evidence", profileValues: [null] as const, scenario: "l03-check", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l03-check"] },
  "l02-static": { kind: "evidence", profileValues: ["small", "large"] as const, scenario: "l02-static", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l02-static"] }, "l02-freeze-candidate": { kind: "evidence", profileValues: ["small", "large"] as const, scenario: "l02-freeze-candidate", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l02-freeze-candidate"] },
  "l02-reviewed-candidates": { kind: "evidence", profileValues: [null] as const, scenario: "l02-reviewed-candidates", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l02-reviewed-candidates"] }, "l02-check": { kind: "evidence", profileValues: ["small", "large"] as const, scenario: "l02-check", noLeak: true, predecessor: null, promotion: null, resultKeys: TASK551_L10_RESULT_FIELDS["l02-check"] },
  "task489-predecessor-promotion": { kind: "terminal", profileValues: [null] as const, scenario: "task489-predecessor", noLeak: null, predecessor: "required", promotion: "required", result: null },
} as const;
const TASK551_CONSUMER_FIELDS = {
  l10Aggregate: ["schema", "pass", "summary", "head", "fixtureProfiles", "commands", "ownerTargetedHandoffs", "metrics", "errors"],
  l10Redis: ["schema", "pass", "serverUp", "redisVersion", "namespaceDigest", "publicConsistency", "scenarios", "consoleErrors", "screenshots", "failures"],
  l10AdminUi: ["schema", "pass", "session", "scenarios", "consoleErrors", "failures"],
  task489Predecessor: ["schema", "pass", "noLeak", "companionIds", "fixtureCounts", "logicalCases", "statementReceipts"],
  task489Promotion: ["schemaVersion", "sourceTask", "sourcePhase", "sourceProfile", "sourceScenario", "sourceHead", "sourceDigest", "predecessor", "promotionState", "promotionDecision", "promotionReason", "validationSummaries", "createdAt", "reviewedAt", "promotedAt", "ownerCapabilityReceiptDigest"],
} as const;
```
Every L10 projection has exactly `TASK551_L10_PROJECTION_KEYS` in that order; matrix `profileValues` enumerates the scalar envelope values. Rows 1-9 use the `evidence` branch: `result` has only the listed phase keys, `profile` is `null` for initialize/check/review and the exact manifest `small|large` otherwise, `noLeak:true`, and both terminal fields are present `null`. Row 10 never projects alone; after the two-path terminal fence, row 11 anchors the sole `terminal` branch: `profile/result/noLeak` are present `null`, while parsed `predecessor` and verified `promotion` are both present and non-null. `schema/phase` are row 11's values, `scenario` is `task489-predecessor`, and `sourceHead/sourceDigest` are row 11's bound values. A rejected, incomplete, invalid, unproven, or alias-bearing input throws/fails closed and produces no projection: `status` is always the literal `accepted` when an envelope exists. TASK-489 uses the six predecessor parser fields and the 16-field promotion shape; `sourceProfile` is required `null`. Tests replace the current 11-key expectation with this 14-key matrix, exercise every discriminant and null/required value, and reject a requested `rejected` status.
After successful 05-L02 proof, the L11 facade alone reads the temporary predecessor once, calls L02's `parseTask489PredecessorReceiptV1`, hashes those original LF bytes, writes row 10 unchanged, then writes metadata-only row 11; L02 owns only the parser/schema and creates no workflow evidence, while neither row carries a capability, nonce, or identity.
## Evidence-Root Recovery and Durable Writer
**Contract amendment (fresh-audit correction):** first move all existing physical evidence I/O out of the near-cap evidence helper into the filesystem companion; the facade remains the only declared/supported public API: its evidence-storage surface exposes only `recoverTask551EvidenceRoot()` and `writeTask551EvidenceFileIfAbsent(rowId, value)`, never a context/root/path/name/run/nonce/adapter override, while its sole non-declared runtime exception is the owner-internal bootstrap specified below and callable only by `task-551-implement.mjs`.
```ts
type Task551EvidenceRowId = "l03Initialize" | "l03Check" | "l02StaticSmall" | "l02StaticLarge" | "l02FreezeCandidateSmall" | "l02FreezeCandidateLarge" | "l02ReviewedCandidates" | "l02CheckSmall" | "l02CheckLarge" | "task489Predecessor" | "task489PredecessorPromotion";
const TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID = {
  l03Initialize: 0, l03Check: 1, l02StaticSmall: 2, l02StaticLarge: 3, l02FreezeCandidateSmall: 4, l02FreezeCandidateLarge: 5, l02ReviewedCandidates: 6, l02CheckSmall: 7, l02CheckLarge: 8, task489Predecessor: 9, task489PredecessorPromotion: 10,
} as const satisfies Record<Task551EvidenceRowId, number>;
const TASK551_EVIDENCE_ROW_IDS = ["l03Initialize", "l03Check", "l02StaticSmall", "l02StaticLarge", "l02FreezeCandidateSmall", "l02FreezeCandidateLarge", "l02ReviewedCandidates", "l02CheckSmall", "l02CheckLarge", "task489Predecessor", "task489PredecessorPromotion"] as const satisfies readonly Task551EvidenceRowId[];
type Task551EvidenceFaultPlanV1 = readonly Readonly<{ operationIndex: number; occurrence: number; operation: "open" | "stat" | "write" | "fsync" | "link" | "unlink"; }>[];
declare const task551CanonicalPredecessorBytes: unique symbol;
type Task551CanonicalPredecessorValueV1 = Readonly<{ readonly [task551CanonicalPredecessorBytes]: true }>;
type Task551EvidenceWriteValueV1 = Task551ImmutableEvidenceValue | Task551CanonicalPredecessorValueV1;
```
The stable non-path map derives the sole manifest row; callers cannot override a path. Before recovery, `runTask551ImplementWorkflow` in `task-551-implement.mjs` is the sole production caller of facade-defined, non-declared `bootstrapTask551EvidenceStorageForOwnerWorkflowHost()` exactly once; it alone calls module-private `installTask551EvidenceStorageForOwner()`. The bridge is neither a supported API, private reexport, test seam, nor declaration. This eager owner-controlled initialization accepts no root/cwd/env/tmp/context argument, derives the literal root from the owner-verified repository realpath, creates one opaque private staging/quarantine namespace, captures root/ancestor `dev/ino/uid/mode`, and freezes the sole production context. It is never lazy: `requirePrivateTask551EvidenceStorage()` only returns/rechecks that singleton; unopened/rebound/drifted state throws only `task551_evidence_storage_uninstalled`, `_rebind`, or `_identity_drift`.
```ts
const TASK551_CANONICAL_EVIDENCE_ROOT = "_docs/_workflows/_smoke/task-551/audit-evidence" as const;
const task551EvidenceStorageContextBrand: unique symbol = Symbol("task551-evidence-storage-context");
type Task551EvidenceStorageContextV1 = Readonly<{ ownerUid: number; canonicalIdentity: Task551FsIdentityV1; privateIdentity: Task551FsIdentityV1; readonly [task551EvidenceStorageContextBrand]: true }>;
type Task551EvidenceRecoveryBlockerV1 = Readonly<{ scope: "global-root" | "row"; code: "task551_evidence_recovery_blocked_foreign_entry" | "task551_evidence_recovery_blocked"; rowId?: Task551EvidenceRowId }>;
```
Production provisioning is same-device and same-owner. Canonical tracked outputs are direct regular non-symlink manifest files with no group/world write; they are not required to be `0700/0600`. Only L11's opaque private staging/quarantine directories are `0700`, and their temps/quarantines are `0600`. The non-declared test harness is statically closure-limited to the focused workflow test, uses a disjoint local context slot that cannot seed or satisfy the production singleton, and accepts only closed row-id/value fixtures plus sorted/no-duplicate bounded fault operations—not roots/context/path/adapter; this convention is not cryptographic authorization.
**Linux host boundary:** owner-private/non-adversarial roots are required during operation. Node/Bun lack descriptor-relative `openat`/`linkat`/`renameat2`; ancestor `O_DIRECTORY|O_NOFOLLOW` plus `lstat`/`fstat` identity rechecks before/after every operation fail closed on drift but make no atomic adversarial-rename claim.
Recovery byte-sorts/rechecks every root on every restart. The canonical/shared root admits only the eleven exact manifest destinations: any foreign/non-manifest direct entry, symlink, nonregular entry, traversal, or ancestor drift creates the redacted global `task551_evidence_recovery_blocked_foreign_entry`, records no path, and performs **no** canonical link, quarantine, unlink, or other mutation. A valid canonical destination is only verified; an invalid/mismatched manifest destination blocks its row and is never repaired in place. The only mutable sources are sealed direct L11-private staging temps whose metadata resolves one row; unknown private entries also block.
For a private temp, `rowKey` is its manifest index and its sole quarantine target is `<privateQuarantine>/v1/<rowKey>/<category>/<sha256(utf8(rowKey+"\\0"+category+"\\0"+sealedStagingId))>.quarantine`; `category` is exactly `stale-temp|invalid-temp|conflict-temp`. With an existing manifest destination, equal bytes fsync then permit only private-temp cleanup; differing bytes quarantine the private temp and block its row. Phase one links/fsyncs every sorted group target with no replace (an existing byte-equal target is accepted); phase two unlinks/fsyncs only those private sources. Every restart scans all existing `v1` groups; the fresh run ID is telemetry only, so the deterministic target is reused, partial groups resume, byte conflict is `blocked_quarantine_conflict`, and multiple stale temps are all quarantined but leave their row `blocked_multiple_stale_temps` until owner resolution. `rename` is forbidden; `EEXIST` needs equality.
A private `decodeTask551EvidenceValue(row, value)` uses the helper-owned frozen `TASK551_EVIDENCE_VALUE_DESCRIPTORS`: exactly eleven manifest-row-identity descriptors, each with immutable `expectedTaskId`, root keys in `row.keys` order, and closed recursive field descriptors (literal, null, strict record, fixed ordered array, bounded UTF-8 string, lower-case SHA-256, finite safe integer/non-negative finite number, or boolean). The descriptor—not a phase-prefix rule or facade provenance copy—binds `taskId` when serialized and the nonserialized terminal owner otherwise; finite depth/node/item/UTF-8 limits have no fallback, `unknown`, generic JSON/`Record`, or unbounded leaf.
`*CommandReceipt`/`focusedTestReceipt` use exact `Task551CommandReceiptV1`; freeze candidates use L02's `Task551ReviewableFreezeReceiptV1` plus lower-case digest; `reviewed` uses L02's `Task551ReviewedCandidateTransitionResultV1`; check paths are exact manifest paths; the facade constructs row 10 only after its one static L02 `parseTask489PredecessorReceiptV1` call. At every depth reject inherited/symbol/accessor/cyclic/non-data values, unknown/non-finite/oversize data, source/maps/SQL/binds/capabilities, and credential material (including `commandReceipt:{DATABASE_URL:"postgres://leak"}`), return a fixed redacted error, and deep-freeze an exact clone.
Recovery snapshots identities and bytes before action, never overwrites or synthesizes, and exposes only redacted in-memory telemetry.
| State | Action | Terminal result | Retry safety | Evidence telemetry |
|---|---|---|---|---|
| `canonical foreign/unsafe` | no mutation | `global-root-blocked` | restart rechecks | `blocked_foreign_entry` |
| `canonical valid/absent` | verify / writer may link only absent manifest destination | `committed` / `empty` | equality only | `destination_valid` |
| `private one-temp/no-dest` | deterministic private quarantine, then remove source | `discarded_retryable` | safe | `temp_discarded` |
| `private multiple/invalid/conflict` | two-phase group quarantine | row remains blocked | restart reuses target | `multiple_stale_temps` |
| `link/fsync/unlink failure` | retain all copies; retry exact private action | `write_failed` / `blocked_dir_sync` | never overwrite | `durability_blocked` |
`awaitTask551EvidenceRecoveryPreflightBeforePhase()` directly before every child launch and evidence write awaits recovery, then requires a current clear global-root state **and** all eleven row states clear; it throws only the redacted global/root or row code. Cleanup kill is ungated. The writer receives only a frozen row-bound value: row 10's private canonical-byte token is minted by the facade immediately after its one parser/hash pass and is rejected for every other row; the writer never receives raw streams/source, maps, targets, SQL, binds, credentials, parser objects, or capability state.
```ts
async function writeTask551EvidenceFileIfAbsent(rowId: Task551EvidenceRowId, value: Task551EvidenceWriteValueV1) { await awaitTask551EvidenceRecoveryPreflightBeforePhase(); const c = requirePrivateTask551EvidenceStorage(); const row = TASK551_DURABLE_EVIDENCE_MANIFEST[TASK551_EVIDENCE_MANIFEST_INDEX_BY_ROW_ID[rowId]]; return writePrivateTempLinkFsyncToAbsentManifestDestination(c, row, validateEncodeForBoundRow(rowId, value, row)); }
async function recoverTask551EvidenceRoot() { return recomputeRowsAndPrivateQuarantine(requirePrivateTask551EvidenceStorage()); }
```
## Phase Source and Child Boundary
`task-551-author-audit.mjs` is the sole supported owner-controlled source ingress; it mints an opaque one-use broker and never imports/wraps `task-551-fix.mjs`. The only broker/adapter import edges are `task-551-implement.mjs -> task-551-author-audit.mjs` and `task-551-implement.mjs -> task-551-fix.mjs`; only outer `runTask551ImplementWorkflow` literal-dynamically imports `../../scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts` after `Task551L02CodeTestMaterializationClosureV1`, and no other L11 module resolves it. Thus the sole composition chain is `implement -> ownerHost -> reviewedPairTransition`, with callback injection and no reverse L02 -> L11 import. Fix alone validates/maps/spawns/captures/disposes. Parent TASK-551 owns generic profile taxonomy; L11 enforces only this grounded closed ten-context table:
| dispatch command | logical command | action/profile | environment/value keys |
|---|---|---|---|
| `TASK-551-01-L03:single/bootstrap-initialize` | `l03-initialize` | `initialize`/`null` | `task551-phase-l03`; L03 four |
| `TASK-551-01-L03:single/bootstrap-check` | `l03-check` | `check`/`null` | `task551-phase-l03`; L03 four |
| `TASK-551-01-L02:single/freeze-small` | `l02-freeze` | `freeze`/`small` | `task551-phase-l02`; L02 three |
| `TASK-551-01-L02:single/freeze-large` | `l02-freeze` | `freeze`/`large` | `task551-phase-l02`; L02 three |
| `TASK-551-01-L02:single/check-small` | `l02-check` | `check`/`small` | `task551-phase-l02`; L02 three |
| `TASK-551-01-L02:single/check-large` | `l02-check` | `check`/`large` | `task551-phase-l02`; L02 three |
| `TASK-551-05-L02:single/database-explain-plans-test` | `05-l02-explain-plans-test` | `database-explain-plans-test`/`null` | `task551-phase-05-l02`; 05-L02 three |
| `TASK-551-05-L02:single/task489-predecessor-plans-test` | `05-l02-predecessor-test` | `task489-predecessor-plans-test`/`null` | `task551-phase-05-l02`; 05-L02 three |
| `TASK-551-05-L02:single/explain-plan-small-check` | `05-l02-explain-small` | `explain-plan-check`/`small` | `task551-phase-05-l02`; 05-L02 three |
| `TASK-551-05-L02:single/explain-plan-large-check` | `05-l02-explain-large` | `explain-plan-check`/`large` | `task551-phase-05-l02`; 05-L02 three |
The table binds dispatch/task/phase/command/logical-command/action/profile/environment/value-key family; a non-table pair fails before supplier/source access. L03/L02 static evidence commands and the L02 reviewed transition are source-free. Each listed L03 initialize/check, L02 freeze-small/freeze-large/check-small/check-large, and 05-L02 operation independently awaits the root-and-eleven-row preflight **before** broker/supplier/source access, then synchronously consumes broker -> `fixtureValues` -> fresh exact-own `childEnv` -> one spawn. L03 has URL/name/sentinel/confirmation; L02/05-L02 have URL/name/sentinel; `childEnv` alone adds closed `PATH`, `TMPDIR`, `LANG`, `LC_ALL`, `TZ`. The helper returns only an opaque started-child handle and a redacted receipt base, clears broker/raw source/input/map/env/launch before its caller can await capture, and capture accepts only those two safe values.

`Task551PhaseSourceBrokerV1`, module-private `Symbol`/`WeakMap` brands, private launch, and opaque child handles are owner-process sequencing/encapsulation guards, not cryptographic credentials, an OS sandbox, or a boundary against an equally privileged local process that can independently reproduce non-secret fixture values. No secret or capability is transported to a child: its exact fixture map is deliberately present in its isolated `childEnv`. Under the owner-controlled, current-byte-verified module/executable assumption, this contract rejects unsupported workflow provenance and missing/malformed argv or env before target parse/connect and prevents accidental raw-state propagation; it does not claim an independently invoked valid-value child must fail or confine a compromised/admitted child after spawn. Descriptor hashes are registry-integrity correlation, never an identity, signature, or authority grant.
```ts
type Task551PhaseBrokerContextV1 = Readonly<{ dispatchId: string; taskId: string; phase: "l03" | "l02" | "05-l02"; commandId: string; logicalCommandId: string; action: string; profile: "small" | "large" | null; environmentProfile: string; valueKeys: readonly string[]; }>;
const TASK551_PHASE_BROKER_CONTEXTS = makeExactTask551PhaseBrokerContextTable(/* ten table rows above */);
type Task551PhaseSourceBrokerV1 = Readonly<{
  consumeOnce(expected: Task551PhaseBrokerContextV1): Task551InjectedPhaseSourceV1;
}>; // synchronous one-shot: exact table match before supplier/source access
const task551EvidenceClearPermitBrand: unique symbol = Symbol("task551-evidence-clear-permit");
const task551StartedPhaseChildBrand: unique symbol = Symbol("task551-started-phase-child");
type Task551EvidenceClearPermitV1 = Readonly<{ readonly [task551EvidenceClearPermitBrand]: true }>;
type Task551StartedPhaseChildV1 = Readonly<{ readonly [task551StartedPhaseChildBrand]: true }>;
type Task551StartedChildCaptureV1 = Readonly<{ child: Task551StartedPhaseChildV1; receiptBase: Task551CommandReceiptBaseV1 }>;
type Task551AwaitedReviewStateV1 = Readonly<{
  phase: "l02-reviewed-candidate";
  worktreeSnapshotDigest: Task551LowercaseSha256;
  candidateDigests: readonly [Task551LowercaseSha256, Task551LowercaseSha256];
  freezeReceipts: readonly [Task551RedactedReceiptV1, Task551RedactedReceiptV1];
  ownerCapabilityReceiptDigest: Task551LowercaseSha256;
}>;
async function awaitTask551EvidenceRecoveryPreflightBeforePhase(): Promise<Task551EvidenceClearPermitV1> {
  await recoverTask551EvidenceRoot(); requireTask551EvidenceRecoveryClearBeforePhase();
  return mintTask551EvidenceClearPermit();
}
function consumeAndStartTask551PhaseChild(permit: Task551EvidenceClearPermitV1, expected: Task551PhaseBrokerContextV1): Task551StartedChildCaptureV1 {
  let broker: Task551PhaseSourceBrokerV1 | undefined = requireTask551DispatchSourceBroker(expected);
  let rawInput: Task551InjectedPhaseSourceV1 | undefined; let source: Task551InjectedPhaseSourceV1 | undefined;
  let fixtureValues: Task551FixtureValuesV1 | undefined; let childEnv: Task551ChildEnvV1 | undefined; let launch: Task551PrivateLaunchV1 | undefined;
  try { rawInput = broker.consumeOnce(expected); broker = undefined; source = rawInput; rawInput = undefined; fixtureValues = consumeAndValidateSourceSynchronously(source, expected.phase); source = undefined; childEnv = buildExactOwnChildEnv(fixtureValues); fixtureValues = undefined; launch = createPrivateTask551Launch(childEnv, expected); childEnv = undefined; return startTask551ChildSynchronously(permit, launch.toPrivateLaunchInput()); }
  finally { broker = undefined; rawInput = undefined; source = undefined; fixtureValues = undefined; childEnv = undefined; launch = undefined; }
}
async function runSourceBoundChild(expected: Task551PhaseBrokerContextV1): Promise<Task551RedactedCommandGroupV1> {
  const permit = await awaitTask551EvidenceRecoveryPreflightBeforePhase(); let started: Task551StartedChildCaptureV1 | undefined;
  try { started = consumeAndStartTask551PhaseChild(permit, expected); return await captureStartedTask551Child(started.child, started.receiptBase); }
  finally { if (started) await disposeTask551Child(started.child); started = undefined; }
}
```
`privateLaunch` is scoped to the child adapter only. It is never assigned to `Task551AwaitedReviewStateV1`, review state
result, an evidence object, or a retry record. A successful child capture is scanned synchronously on arrival, reduced to a
redacted receipt, and its raw stream references leave the capture scope before another workflow await. Failure codes carry no raw
body, source, map, matcher, command string, or cause containing one.
### Trusted absolute Bun executable
The parent captures `realpath(process.execPath)` and supplies that provenance-verified absolute Bun executable path. It must be a
regular executable with the trusted digest/version; the child never resolves `bun` through `PATH`, lookup APIs, a shell, or a string.
```ts
type Task551TrustedBunRuntimeV1 = Readonly<{
  bunExecutablePath: string; // realpath(process.execPath), absolute and verified
  bunExecutableSha256: `sha256:${string}`;
  bunVersion: string;
  provenance: "trusted-parent-config";
}>;
function requireTrustedBunRuntime(runtime: Task551TrustedBunRuntimeV1): void {
  requireAbsoluteRegularExecutable(runtime.bunExecutablePath);
  requireTrustedExecutableDigest(runtime.bunExecutablePath,
    runtime.bunExecutableSha256);
  requireTrustedExecutableVersion(runtime.bunExecutablePath, runtime.bunVersion);
  requireLiteralProvenance(runtime.provenance, "trusted-parent-config");
}
```
The logical command registry uses literal `bun`; immediately before spawn L11 replaces only that token with the verified absolute path and preserves every remaining byte. Bun does not expose literal `shell` or `inheritProcessEnv` options: semantic no-shell/no-inherited-environment means array argv only (never wrapper/assignment/string), `--env-file=/dev/null` immediately after the executable, and one validated exact-own `childEnv` map containing only fixture values plus closed OS keys.
```ts
const TASK551_CHILD_TIMEOUT_MS = 120_000;
const TASK551_CHILD_MAX_OUTPUT_BYTES = 1_048_576;
const TASK551_CHILD_KILL_GRACE_MS = 2_000;
const TASK551_CHILD_DIAGNOSTIC_MAX_BYTES = 8_192;
const TASK551_CHILD_FAILURE_CODES = {
  stdout_reader: "task551_child_stdout_reader_failed",
  stderr_reader: "task551_child_stderr_reader_failed",
  reducer: "task551_child_reducer_failed",
  parser: "task551_child_parser_failed",
  timeout: "task551_child_timeout",
  overflow: "task551_child_overflow",
  abort: "task551_child_abort",
  spawn: "task551_child_spawn_failed",
} as const;
type Task551BunProcessV1 = ReturnType<typeof Bun.spawn>;
type Task551ProcessResultV1 = Readonly<{ status: "passed" | "failed"; result: "zero_exit" | "nonzero_exit" | "overflow" | "timeout"; exitCode: number; signalCode: string | number | null; stdoutBytes: number; stderrBytes: number }>;
const TASK551_LOGICAL_ARGV_CONTRACT_ID = "coderso.task551.logical-argv@v1" as const;
const TASK551_LOGICAL_ARGV_PREIMAGE_MAGIC = "coderso.task551.logical-argv-preimage@v1" as const;
const TASK551_LOGICAL_ARGV_CONTEXT_MAX_UTF8_BYTES = 160;
const TASK551_LOGICAL_ARGV_ID_MAX_UTF8_BYTES = 96;
const TASK551_LOGICAL_ARGV_TOKEN_MAX_UTF8_BYTES = 4_096;
const TASK551_LOGICAL_ARGV_MIN_ARG_COUNT = 2;
const TASK551_LOGICAL_ARGV_MAX_ARG_COUNT = 16;
const TASK551_LOGICAL_ARGV_COUNT_TEXT_MAX_UTF8_BYTES = 2;
const TASK551_LOGICAL_ARGV_PREIMAGE_MAX_BYTES = 16_384;
type Task551LogicalArgvDigestDescriptorV1 = Readonly<{ contractId: typeof TASK551_LOGICAL_ARGV_CONTRACT_ID; sha256: Task551LowercaseSha256; argCount: number; envFile: "--env-file=/dev/null" }>;
type Task551LogicalArgvRegistryRowV1 = Readonly<{ commandContextId: string; logicalCommandId: string; argv: readonly string[] }>;
type Task551CommandReceiptBaseV1 = Readonly<{ logicalCommandId: string; commandContextId: string; logicalArgv: Task551LogicalArgvDigestDescriptorV1; discovery: Readonly<{ kind: "test-paths" | "not-applicable"; discoveredTestCount: number | null; positive: boolean }> }>;
type Task551CommandReceiptV1 = Readonly<{ schema: "coderso.task551.command-receipt@v1"; logicalCommandId: string; commandContextId: string; logicalArgv: Task551LogicalArgvDigestDescriptorV1; process: Task551ProcessResultV1; discovery: Task551CommandReceiptBaseV1["discovery"] }>;
type Task551RedactedCommandGroupV1 = Readonly<{ schema: "coderso.task551.redacted-command-group@v1"; context: Readonly<{ dispatchId: string; logicalCommandId: string }>; commandReceipt: Task551CommandReceiptV1 }>;
type Task55105L02ChildOutcomeV1 = Readonly<{ schema: "coderso.task551.05-l02-child-outcome@v1"; group: Task551RedactedCommandGroupV1; postCleanupTargetProof: Readonly<{ rolledBack: true; currentDatabaseMatched: true; exactSingleMarkerMatched: true; boundSentinelByteMatched: true }> }>;
function startTask551ChildSynchronously(permit: Task551EvidenceClearPermitV1, input: Task551PrivateLaunchInputV1): Task551StartedChildCaptureV1 {
  let runtime = input.runtime; let logicalArgv = input.logicalArgv; let childEnv = input.env; let argv: string[] | undefined; let row: Task551LogicalArgvRegistryRowV1 | undefined;
  try { requireCurrentTask551EvidenceClearPermit(permit); requireTrustedBunRuntime(runtime); row = requireExactTask551LogicalArgvRow(input.commandContext, logicalArgv); requireExactOwnChildEnv(childEnv); const receiptBase = makeTask551CommandReceiptBaseFromRegistry(row, input.discovery); argv = [runtime.bunExecutablePath, ...logicalArgv.slice(1)]; const child = wrapOpaqueStartedTask551Child(Bun.spawn(argv, { cwd: repoRoot, env: childEnv, stdin: "ignore", stdout: "pipe", stderr: "pipe", detached: process.platform !== "win32" })); return Object.freeze({ child, receiptBase }); }
  catch { throw new Error(TASK551_CHILD_FAILURE_CODES.spawn); }
  finally { input = undefined as never; runtime = undefined as never; logicalArgv = undefined as never; childEnv = undefined as never; argv = undefined; row = undefined; }
}
async function captureStartedTask551Child(child: Task551StartedPhaseChildV1, receiptBase: Task551CommandReceiptBaseV1): Promise<Task551RedactedCommandGroupV1> {
  const proc = requirePrivateStartedTask551Process(child); // the only process-bearing capture input
  return captureBoundedTask551ProcessToRedactedGroup(proc, receiptBase, TASK551_CHILD_TIMEOUT_MS, TASK551_CHILD_MAX_OUTPUT_BYTES, TASK551_CHILD_KILL_GRACE_MS);
}
async function disposeTask551Child(child: Task551StartedPhaseChildV1): Promise<void> {
  await disposePrivateStartedTask551Process(child, { diagnosticMaxBytes: TASK551_CHILD_DIAGNOSTIC_MAX_BYTES });
}
```
On `stdout_reader`, `stderr_reader`, `reducer`, `parser`, timeout, overflow, abort, or spawn failure, the common cleanup path aborts
both readers, kills the entire child process group when present, awaits numeric `proc.exited`, caps a redacted diagnostic at
`TASK551_CHILD_DIAGNOSTIC_MAX_BYTES`, and throws the exact mapped code above. A normal nonzero exit is not killed: it awaits both
readers and `proc.exited`, records `result:"nonzero_exit"` plus `exitCode` and `signalCode` when available, and returns a redacted
failure. Unix uses `process.kill(-proc.pid, signal)` for a detached process group; Windows uses `taskkill /PID <pid> /T /F`; a
non-POSIX fallback enumerates bounded descendants and signals them in reverse order before the root. Every fake Bun API must expose
`spawn() -> { pid, stdout, stderr, exited: Promise<number>, signalCode? }` with the same kill/overflow/timeout/normal-nonzero
parity; no wrapper-only completion method is accepted. `Task551CommandReceiptV1` is strict/redacted: before its logical-argv digest descriptor is made, the fixed registry validates the exact logical array and literal `--env-file=/dev/null`; receipt decode revalidates the exact row/context/descriptor. It retains only command/context IDs, contract ID, raw lowercase 64-hex digest, count, and bounded finite process/discovery fields—never argv strings, preimage, environment assignments, PID, raw output, source, maps, target, capability, or cause.
### Exact logical command forms
`task-551-fix.mjs` (not the 997-line facade) owns this module-private deep-frozen exact-own registry and no public export. Its 15 rows are fully materialized, keyed by `commandContextId`, and bind the context even where the small/large static argv are byte-identical. Forms 1/4–7 use separately copied empty-or-OS-only maps; all other forms use their exact phase child map. `fixtureTarget.test.ts` is not isolated.
```ts
const TASK551_LOGICAL_ARGV_REGISTRY = freezeTask551LogicalArgvRows([
  ["TASK-551-01-L03:single/focused-static-test", "l03-focused-test", ["bun", "--env-file=/dev/null", "test", "tests/perf/task551FixtureTargetBootstrap.test.ts"]],
  ["TASK-551-01-L03:single/bootstrap-initialize", "l03-initialize", ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--initialize"]],
  ["TASK-551-01-L03:single/bootstrap-check", "l03-check", ["bun", "--env-file=/dev/null", "scripts/task-551-fixture-target-bootstrap.ts", "--check"]],
  ["TASK-551-01-L02:single/isolated-projection-static-small", "l02-static-small-baseline", ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"]],
  ["TASK-551-01-L02:single/isolated-digest-static-small", "l02-static-small-digest", ["bun", "--env-file=/dev/null", "test", "tests/perf/task551DatabaseBaseline/digestContract.test.ts"]],
  ["TASK-551-01-L02:single/isolated-projection-static-large", "l02-static-large-baseline", ["bun", "--env-file=/dev/null", "test", "tests/perf/database-query-baseline.test.ts"]],
  ["TASK-551-01-L02:single/isolated-digest-static-large", "l02-static-large-digest", ["bun", "--env-file=/dev/null", "test", "tests/perf/task551DatabaseBaseline/digestContract.test.ts"]],
  ["TASK-551-01-L02:single/freeze-small", "l02-freeze", ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--freeze", "--profile", "small", "--all"]],
  ["TASK-551-01-L02:single/freeze-large", "l02-freeze", ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--freeze", "--profile", "large", "--all"]],
  ["TASK-551-01-L02:single/check-small", "l02-check", ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--check", "--profile", "small", "--all"]],
  ["TASK-551-01-L02:single/check-large", "l02-check", ["bun", "--env-file=/dev/null", "scripts/task-551-database-baseline.ts", "--check", "--profile", "large", "--all"]],
  ["TASK-551-05-L02:single/database-explain-plans-test", "05-l02-explain-plans-test", ["bun", "--env-file=/dev/null", "test", "tests/perf/database-explain-plans.test.ts"]],
  ["TASK-551-05-L02:single/task489-predecessor-plans-test", "05-l02-predecessor-test", ["bun", "--env-file=/dev/null", "test", "tests/perf/task489-solution-kit-run-predecessor-plans.test.ts"]],
  ["TASK-551-05-L02:single/explain-plan-small-check", "05-l02-explain-small", ["bun", "--env-file=/dev/null", "scripts/task-551-explain-plans.ts", "--scale", "small", "--check"]],
  ["TASK-551-05-L02:single/explain-plan-large-check", "05-l02-explain-large", ["bun", "--env-file=/dev/null", "scripts/task-551-explain-plans.ts", "--scale", "large", "--check"]],
]);
function freezeTask551LogicalArgvRows(rows: readonly (readonly [string, string, readonly string[]])[]): readonly Task551LogicalArgvRegistryRowV1[] {
  requireExactlyFifteenUniqueTask551LogicalArgvRows(rows);
  return Object.freeze(rows.map(([commandContextId, logicalCommandId, argv]) => Object.freeze({ commandContextId, logicalCommandId, argv: Object.freeze([...argv]) })));
}
function encodeTask551LogicalArgvPreimageV1(row: Task551LogicalArgvRegistryRowV1): Uint8Array {
  const argCount = requireTask551LogicalArgvCount(row.argv.length, TASK551_LOGICAL_ARGV_MIN_ARG_COUNT, TASK551_LOGICAL_ARGV_MAX_ARG_COUNT);
  const fields = [TASK551_LOGICAL_ARGV_PREIMAGE_MAGIC, TASK551_LOGICAL_ARGV_CONTRACT_ID, row.commandContextId, row.logicalCommandId, String(argCount), ...row.argv];
  let total = 0;
  const chunks = fields.map((field, index) => {
    const bytes = requireTask551StrictUtf8(field); // rejects non-string/NUL/invalid UTF-8
    requireTask551LogicalArgvFieldBound(index, bytes.byteLength, { context: TASK551_LOGICAL_ARGV_CONTEXT_MAX_UTF8_BYTES, id: TASK551_LOGICAL_ARGV_ID_MAX_UTF8_BYTES, token: TASK551_LOGICAL_ARGV_TOKEN_MAX_UTF8_BYTES, argCount: TASK551_LOGICAL_ARGV_COUNT_TEXT_MAX_UTF8_BYTES });
    if (bytes.byteLength > 0xffff_ffff) throw new Error("task551_logical_argv_length_overflow");
    total = requireTask551BoundedByteSum(total, 4 + bytes.byteLength, TASK551_LOGICAL_ARGV_PREIMAGE_MAX_BYTES);
    return concatTask551Bytes(uint32BigEndian(bytes.byteLength), bytes);
  });
  return concatTask551Bytes(...chunks); // no delimiter; every fixed field and token is u32BE-length-framed
}
function makeTask551CommandReceiptBaseFromRegistry(row: Task551LogicalArgvRegistryRowV1, discovery: Task551CommandReceiptBaseV1["discovery"]): Task551CommandReceiptBaseV1 {
  let preimage = encodeTask551LogicalArgvPreimageV1(row);
  try { return { logicalCommandId: row.logicalCommandId, commandContextId: row.commandContextId, logicalArgv: Object.freeze({ contractId: TASK551_LOGICAL_ARGV_CONTRACT_ID, sha256: requireTask551LowercaseSha256(sha256Bytes(preimage)), argCount: row.argv.length, envFile: "--env-file=/dev/null" }), discovery }; }
  finally { preimage = undefined as never; }
}
```
The exact preimage is `u32BE(byteLength(utf8(field))) || utf8(field)` for the ordered fields `magic, contractId, contextId, logicalCommandId, canonical decimal argCount, each logical token`, with no delimiter, padding, JSON, or native-endian encoding. Magic and contract ID must byte-equal the literals above; context is at most 160 UTF-8 bytes, ID 96, each token 4,096, `argCount` is the canonical decimal for 2..16 (therefore 1..2 bytes), and the whole framed preimage is at most 16,384 bytes. Encoder and decoder reject a length/count/total above those bounds or `0xffffffff`, truncated/extra/noncanonical frames, invalid UTF-8/NUL, or arithmetic wrap before allocation/hash. It is computed before only index `0` (`"bun"`) is replaced by the trusted absolute Bun path. `requireExactTask551LogicalArgvRow` and receipt decode require the exact context, command, deep-equal literal argv, raw `/^[0-9a-f]{64}$/` SHA-256 digest, count, and one env-file token at index `1`; unknown/reordered/substituted/profile-crossed/extra tokens, shell strings, PATH lookup, inherited env, a prefixed/uppercase/malformed digest, or raw argv/preimage receipt fields fail before spawn/evidence. Focused tests require positive discovery; CLI commands require zero exit/no skip/`discoveredTestCount:null`. L03 initialize is exactly once and precedes check; static evidence remains baseline then digest for each profile before fresh L02 freeze/check source access.
## L02-Owned Reviewed-Candidate Capability
This is a required L02 follow-through over reviewed-pair artifacts. L02 first extracts the 939-line transition's storage/locking responsibility into private `freezeCandidateGenerationStore.ts`; that store alone reads/writes the active v2 state and verifies the legacy archive's fixed path/hash as a regular non-symlink input. `reviewedPairPersistence.ts` remains the stable public facade: it preserves only required legacy **type** compatibility, while every legacy runtime authority entry and runner re-export fails `l02_owned_reviewed_transition_legacy_migration_required` before I/O, factory issue/consume, or write. Its only additional L11-facing values are the pure no-I/O strict normalizers for the L02-produced sanitized transition receipt and reviewed-state attestation; they never accept a path or raw state/archive bytes. `runL02OwnedReviewedTransition` remains the only state-changing public L11 facade operation and one-way imports private `scripts/task551DatabaseBaseline/reviewedPairTransition.ts`, which imports its owned `reviewedPairReceiptSource.ts`; the transition owns the registry, private candidate-only writer seam, factory issue/consume, approval ingress, atomic writer/re-read lock, and a test-only private seam directly reachable only from `reviewedPairPersistence.test.ts`. L02-only `scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts` one-way imports the transition's private owner-host installer, is never re-exported by facade/runner, has no L11 source import, and is literal-dynamically imported only after `Task551L02CodeTestMaterializationClosureV1` by the outer `task-551-implement.mjs` composition root. `reviewedPairPersistence.test.ts`, not 323-line `runnerLifecycle.test.ts`, owns focused registration/approval/transition/owner-host, archive/state matrix, and legacy fail-closed tests.
After L04 closure/adaptation and before `TASK-551-01-L02:single`, L11 independently creates the sole non-graph, non-evidence `Task551L02CodeTestMaterializationClosureV1 = Readonly<{schema:"coderso.task551.l02-code-test-materialization-closure@v1";phase:"l02-code-test-materialization";taskId:"TASK-551-01-L02";taskGraphDigest:Task551LowercaseSha256;files:readonly Task551PathDigestV1[]}>`. Its exact own frozen key order and sorted `files` are the current regular non-symlink byte digests of the complete declared L02 `TASK551_PHASE_OWNED_CODE_TEST_PATHS` set, including deferred persistence/owner-host and the L02-owned predecessor registry but excluding the immutable archive and every active state/parent/lock/temp path. It attests materialized code/tests only, not a command, subgate, review, archive/state validation, durable row, or final L02 leaf success. Both `adaptTask551L02ClosureV2` and the outer literal owner-host import require this one current closure; L11 otherwise resolves no L02 module/host. The final L02 leaf closes only after its `single` check-small/check-large and remaining required command gates pass. Before that closure, L02 must add `freezeCandidateGenerationStore.ts`, owned `reviewedPairReceiptSource.ts` imported by `reviewedPairTransition.ts`, its active v2 state/fixture/test-helper modules, `reviewedPairTransition.ts`, and `reviewedPairOwnerHost.ts` to its finite provenance/digest/classifier/line/byte-receipt allowlists. `TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS` and its byte-bound receipt contain the exact declared L02 source closure, including `reviewedPairReceiptSource.ts`, but no deferred target is admitted through a generic sidecar projection; L11's provenance rejects a substitute or a new test path.
The L02 envelope has exactly two ordered, discriminated L11 subgates: `classifier-materialization` is ordinal `1`, has the exact
five-command completed prefix and next `core-lint-types`; `reviewed-pair-transition` is ordinal `2`, has the exact completed
occurrence prefix ending in `freeze-large` and next `check-small`. `afterCommandIds` means that complete ordered prefix, not a
partial set; parser/executor reject a duplicate, gap, reordering, wrong next command, or transition before `freeze-large`. The
source-free transition runs only after that prefix and failure dispatches zero `check-*` commands. The active v2 store accepts only
`awaiting-small -> awaiting-large -> ready-for-review -> reviewed`: small freeze first, large only next, review only ready, and check
only reviewed; it rejects stale/mixed/unknown/symlink/nonregular/archive-hash-mismatch/reset/partial/reviewed-overwrite before a child
or check. Before classifier materialization,
L11 requires positive receipts in order `fixture-target-static-test` → `reviewed-pair-persistence-static-test` →
`runner-lifecycle-static-test`; the latter two remain ordinary default-Bun commands, not isolated evidence.
The sources and focused test must then be green current-worktree regular non-symlink files bound to their accepted SHA-256 receipts.
L11's named API gate checks exact transition export/type tokens, type-only legacy compatibility, owner-host one-way/no-L11-import tokens, and fixed pre-I/O migration stubs for every legacy runtime/runner authority against the captured current bytes; a live legacy factory, persistence, transition, re-export bypass, absence, or local substitute is a hard stop. Within the supported L02 module closure, L02 alone creates, issues, and consumes its `WeakSet`/`WeakMap`/`Symbol` capability during its atomic transition; L11 never imports/creates a factory, token, binding object, fallback approval path, or duplicate validator.
```ts
type Task551L02ReviewedTransitionInputV1 = Readonly<{
  worktreeSnapshotDigest: Task551LowercaseSha256;
  smallCandidateCanonicalDigest: Task551LowercaseSha256;
  largeCandidateCanonicalDigest: Task551LowercaseSha256;
}>;
export async function runL02OwnedReviewedTransition(
  input: Task551L02ReviewedTransitionInputV1,
): Promise<Task551ReviewedCandidateTransitionResultV1 & Readonly<{ stateTransitionReceipt: Task551L02ActiveStateTransitionReceiptV2 }>>;
export function parseTask551L02ActiveStateTransitionReceiptV2(
  value: unknown,
): Task551L02ActiveStateTransitionReceiptV2;
export function parseTask551L02ReviewedStateAttestationV2(
  value: unknown,
): Task551L02ReviewedStateAttestationV2;
// L11-facade-internal only: omitted from declaration and generic runner exports.
export function registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(
  worktreeSnapshotDigest: Task551LowercaseSha256,
): void;
```
After L11 independently validates the immutable snapshot, it registers that one digest through the hook; a module-closure registry records `{digest,generation,consumed:false}` and rejects unconsumed replacement, duplicate/replay, stale generation, or nonmatching transition. Registration is one-way L11-facade -> L02 with no L02 -> L11 import/cycle. Only after `Task551L02CodeTestMaterializationClosureV1`, `_docs/_workflows/task-551-implement.mjs` outer `runTask551ImplementWorkflow` literal-dynamically imports and calls L02-owned `runTask551L02OwnerHostInSameRealm(() => runTask551L02WorkflowEvidence(input))`. The host obtains its owner-local synchronous channel inside its own closure, installs it in the same `reviewedPairTransition.ts` realm, invokes that callback exactly once after installation, and revokes/clears the ingress in `finally`; it neither imports L11 nor gives the callback channel, decision, triple, installer, or reset access. Inside the L02 lock, only after accepted-snapshot and candidate-pair re-reads validate the exact three-digest request, `ownerReviewChannel.review` is called exactly once; L02 then alone mints and consumes/revokes its sealed one-shot triple before factory issue/consume. Absent/denied/expired/reused/mismatched approval fails closed. The L11 facade only validates/registers/calls the facade transition and has no declared/importable supported path to install, read, configure, or derive ingress/approval; child results and durable evidence cannot install it. Only L02's `reviewedPairPersistence.test.ts` focused harness uses the private seam and resets it in `finally`. L02 returns only exhaustive fixed redacted `l02_owned_reviewed_transition_*` codes; no raw candidate, authority, capability, nonce, path, or cause leaks. The call is source-free/non-spawning and returns only reviewed values plus v1 `capabilityReceipt` and the sanitized state receipt; only success permits workflow dispatch of check-small/check-large.

```ts
type Task551L11ExpectedActiveStateV2 = Readonly<{ state: "awaiting-small" | "awaiting-large" | "ready-for-review" | "reviewed"; digest: "absent" | Task551LowercaseSha256; sequence: 0 | 1 | 2 | 3; transitionId: Task551LowercaseSha256 | null }>;
const TASK551_INITIAL_ACTIVE_STATE_EXPECTATION: Task551L11ExpectedActiveStateV2 = Object.freeze({ state: "awaiting-small", digest: "absent", sequence: 0, transitionId: null });
function requireAndRebaseL02ActiveState(receipt: Task551L02ActiveStateTransitionReceiptV2, expected: Task551L11ExpectedActiveStateV2): Task551L11ExpectedActiveStateV2 { requireExactReceiptSchemaAndImmutableClosure(receipt); requireExactEdgeAndOneUse(receipt, expected); return Object.freeze({ state: receipt.afterState, digest: receipt.afterStateDigest, sequence: receipt.sequence, transitionId: receipt.transitionId }); }
```
L11 receives a freeze receipt or review receipt only as an ephemeral sanitized result, passes it through L02's pure normalizer exactly once, and retains the expectation above in memory only. It requires the normalizer's canonical transition-ID binding, `sequence=expected.sequence+1`, new `transitionId`, exact previous ID/state/digest/edge, fixed archive hash, and current L04 bootstrap/L02 code-closure digests before rebasing; it discards the receipt before durable evidence reduction. Each check passes once through L02's pure attestation normalizer, then its `reviewed` state, sequence `3`, transition ID, digest, and immutable bindings must equal the rebased expectation. Replay, skipped/reversed/unknown edge, code/bootstrap closure drift, archive mismatch reported by L02, altered state digest, or missing/bad attestation fails `task551_l02_active_state_receipt_invalid` or `_replayed` before a later child or evidence write. L11 never reads/writes raw active/archive bytes, and an active-state value never enters a worktree snapshot.
## L03, L04, L02, and 05-L02 Phase Contracts
### L03
L03's isolated focused test is source-free and runs before the initial L03 broker consumption. Initialize and check are two independent
operations: each awaits recovery preflight before its distinct author-audit-bound broker, synchronously snapshots/validates/drops raw source,
builds a new child environment and private start-bound capture policy, spawns, then awaits/disposes only its opaque child. No source,
environment, capture policy, launch, capture, or cleanup object is reused between them.
```ts
const TASK551_L03_BOOTSTRAP_KEYS = [
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_URL",
  "TASK551_FIXTURE_BOOTSTRAP_DATABASE_NAME",
  "TASK551_FIXTURE_BOOTSTRAP_SENTINEL",
  "TASK551_FIXTURE_BOOTSTRAP_CONFIRMATION",
] as const;
async function runIndependentL03Operation(
  expected: Task551PhaseBrokerContextV1,
): Promise<Task551RedactedCommandGroupV1> {
  const permit = await awaitTask551EvidenceRecoveryPreflightBeforePhase();
  let started: Task551StartedChildCaptureV1 | undefined;
  try {
    started = consumeAndStartTask551PhaseChild(permit, expected); // fresh L03 four-value cycle, no await
    return await captureStartedTask551Child(started.child, started.receiptBase);
  } finally {
    if (started) await disposeTask551Child(started.child); started = undefined;
  }
}
await runIndependentL03Operation(TASK551_PHASE_BROKER_CONTEXTS.l03Initialize);
await runIndependentL03Operation(TASK551_PHASE_BROKER_CONTEXTS.l03Check);
```
Both child maps have exactly the four enumerable own data descriptors, no symbols/getters/setters/prototype extras, and no inherited
environment. URL is nonempty and at most 4,096 UTF-8 bytes; name is exactly `coderso02`; sentinel is 32..512 UTF-8 bytes; confirmation
is exactly `INITIALIZE_TASK551_FIXTURE_TARGET`. Tests require two preflights and broker consumptions, distinct source/env/capture-policy/launch identities, one
spawn/await/dispose per operation, and no source/map crossing into later phases.
### L04
The compatibility bootstrap runs before author-audit/normal dispatch but validates only L04 support; the facade injects the frozen pure L04 identity and worktree descriptors into private worktree compatibility only after L04 closes, while the private L02-subgate executor never handles L04, archive, or active-state values. L04 then runs its own DB-free focused test. The actual `l04` provenance gate verifies the exact two
current regular non-symlink owned paths and fixed schema/version/generation/archive path+hash/`awaiting-small` identity; it has no
logical-argv row, broker, source/fixture map, archive/state read, child spawn, durable evidence row, or fixture authority. Before adding
that branch, L11 follows the exact capacity extraction sequence, remains the sole workflow/adaptation writer, and preserves the sole owner-host
import plus L02's owner-review pause between `freeze-large` and `check-small`.
### L02
After the L04 provenance gate, L01 immutable-worktree barrier, and current-byte recheck, L02 runs baseline+digest static evidence separately for `small`
and separately for `large`: four source-free children with four independent maps/capture lifetimes. It creates
`l02-static-small.json` and `l02-static-large.json` only after their respective two positive static receipts and exact manifest digest.
The ordinary `fixtureTarget.test.ts` remains default-Bun, fake-client, database-free validation only
and never receives an isolated map or profile evidence role.
Only after current L03 check evidence, both L02 static evidence files, the fresh L02 source validation, L02 active-v2 migration/legacy-write guard, and the L02 capability API
gate does L11 set its in-memory active expectation to `awaiting-small/absent`, then run freeze-small followed by freeze-large. It validates/rebases the sanitized receipt after each mutation before writing any candidate evidence, then validates/rebases the source-free owner-review receipt and writes the reviewed file. Only then does it run check-small followed by check-large, requiring each sanitized reviewed-state attestation to equal the rebased digest before writing either check file. Any receipt/attestation mismatch dispatches zero later children/evidence writes. The child map is local to this fixture operation and is not present in the reviewed state.
### TASK-551-05-L02
05-L02 begins later in the frozen land order. Immediately before its fixture commands, the facade validates current-byte-bound L03/L02 closure receipts, the complete 05-L02 provenance closure, fresh 05-L02 source brand, and L02-owned target/digest/parser imports. It passes 05-L02 only immutable redacted receipt attestations (`path`, digest, phase, `pass:true`) and never an earlier source, environment, child map, launch, matcher, capture, capability, or raw closure state. Its exact logical command sequence is:
```text
bun --env-file=/dev/null test tests/perf/database-explain-plans.test.ts
bun --env-file=/dev/null test tests/perf/task489-solution-kit-run-predecessor-plans.test.ts
bun --env-file=/dev/null scripts/task-551-explain-plans.ts --scale small --check
bun --env-file=/dev/null scripts/task-551-explain-plans.ts --scale large --check
```
The first two commands require positive discovery. The two CLI checks require zero exit, no skip, and `discoveredTestCount:null`.
Every command uses its own exact-table `05-l02` broker context, fresh direct three-key 05-L02 `fixtureValues` map, literal `coderso02`, fresh exact-own childEnv with no inheritance, absolute trusted Bun executable, exact argv, bounded capture, and no raw output in state. The L05-L01 concurrency receipt is an opaque source-free precondition only: it adds no 05-L02 provenance path, child command, or fifth broker context. 05-L02 owns its temporary predecessor writer and tests. Immediately before L11 reads/parses/hashes/promotes that temporary file, it accepts exactly four `Task55105L02ChildOutcomeV1` values in table order: each has the expected context/command, a passed strict `Task551CommandReceiptV1`, and only the four literal-true `postCleanupTargetProof` keys. Missing, malformed, duplicate, reordered, failed, or extra outcomes fail; L11 drops the array before parser/hash/promotion. Neither outcome/proof is an evidence descriptor/value, row 10/11 field, projection, or consumer input. The promoted predecessor bytes are row ten and metadata-only promotion record row eleven.
## Frozen Task Graph and Land Order
Before the product graph is read or dispatched, L11's owner-only compatibility
bootstrap implementation and DB-free in-memory capability receipt must pass. It
is a sidecar prerequisite, not an occurrence, product leaf, evidence row, or
source of product ordering; the L01/L02 materialization barrier below likewise
does not create a new leaf. The full product land order remains this one
canonical sequence:
```text
01-L01(initial) → 01-L03 → L11-L03-adaptation (non-graph) → 01-L04-bootstrap → L11-L04-adaptation/provenance-gate → L02-code/test-materialization-closure + L11-L02-adaptation/outer-host-load (non-graph) → L02:single →
L01-GATE[four-test → classifier-materialization → immutable-worktree-exact-nine-manifest →
L11-current-byte-reverify] → L02-static-small/large → L02-freeze-small →
L02-freeze-large → L02-reviewed-transition → L02-check-small/large → L02-final-leaf-closure →
02-L01 → 02-L02 → 02-L03 → 08-L03(initial) → 05-L01 → 05-L03 → 05-L02 →
03-L01 → 06-L01 → 06-L02 → 06-L03 → 07-L01 → 09-L04(initial) →
03-L02 → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) → 03-L03 →
04-L01 → 04-L02 → 09-L01 → 09-L02 → 09-L03 → 09-L04(final) →
01-L01(final) → 10-L01 → post-audit/fix/affected-gates/aggregate+smoke →
final-drift → 10-L02 closure
```
L03 and then L04 must independently close before any L02 fixture operation. L11's non-durable L03 adaptation then L04 provenance/adaptation gate lands
between them and the distinct L02 code/test materialization closure; that closure permits the L02 persistence adaptation and outer host load but not `single` command success or final leaf closure, and adds no evidence row or fixture command. The immutable-worktree
barrier must pass before L02 static, freeze, review, or check evidence. 05-L02
uses its fresh source only at its own phase. The final L01 dispatch occurs after TASK-551-09 and must prove zero planned inventory
deltas before 10-L01. No later leaf may edit an earlier leaf's owned files.
## Audit, Dispatch, and Post-Audit Contract
The checked-in six-phase workflow owns exactly 79 code/test paths (`sidecar/l01/l03/l04/l02/05-l02`), including the sidecar's fourteen source/declaration modules and three existing tests, not the parent’s full product graph,
and cannot produce supported dispatches outside that graph. After the compatibility
receipt verifies capability support without reading current graph/L04 bytes, and
before any product leaf starts, author-audit one-way calls the dispatch helper on strict own-data
current task-file byte snapshots; duplicate-key-aware JSON preflight verifies H1/FileName/parent/status plus v1 graph/envelopes and returns no raw text.
It derives inventory/order (currently 41 files, 29 leaves, 32 occurrences) rather than hard-coding counts, audits every task contract,
and runs one cross-file reconcile. A missing, timed-out, malformed, or absent result makes the round invalid. After a
verified HIGH/MEDIUM finding, rerun only changed/affected scopes plus one fresh reconcile; product dispatch needs no unresolved
HIGH/MEDIUM and a current reconcile.
Dispatch one leaf at a time with its current owned-file allowlist and explicit forbidden paths. Before its dispatcher, re-read the
task graph and accepted predecessor bytes; immediately before a child spawn, re-read active/predecessor current bytes. Every leaf runs its exact task commands, `bun --cwd core lint:types`, and `bun
--cwd core lint`. A fixer may run at most three rounds and must edit only the owning paths. Tests are selected by dependency
shape: Bun for runtime/DB/security paths and Vitest for Bun-free pure/UI paths.
After 01..09, the final L01 refresh, and the initial aggregate/runtime smoke, run these five fresh post-audit lenses:
1. `scope-query-inventory` 2. `persistence-concurrency-migrations` 3. `cache-coherence-security` 4.
   `performance-reliability-test-integrity` 5. `cross-stream-doc-task-closure`
Every finding has current `file:line` evidence and a machine-readable severity. Verified HIGH/MEDIUM findings return to their
exact owner, followed by affected gates and a fresh aggregate/smoke pass. Only a clean final drift over the current tree, task
graph, evidence root, and changelog reservation authorizes 10-L02 closure. LOW deferral follows the parent's strict TASK-9999
policy and never covers security, data, auth, persistence, performance, reliability, or test-integrity impact.
## Security Contract
- **Visibility:** workflow/test/evidence tooling only; no HTTP endpoint or
public write route is introduced.
- **Auth and ownership:** the classifier handoff is a current-worktree immutable snapshot; L11 cannot stage, commit, synthesize a
snapshot, or bypass its receipt/byte barrier. The repository owner alone performs any final commit after the combined gates.
- **CSRF/rate limit:** not applicable to local workflow tooling. Existing admin
and public-write contracts remain owned by their product leaves.
- **Input validation:** strict reject-unknown own-data schemas, exact literal paths, duplicate-key-aware JSON,
exact phase brands/command IDs, task-graph/current-byte checks, trusted absolute executable provenance, bounded streams, and positive discovery.
- **Source safety:** no ambient environment, dotenv, generic URL alias, target
name supplied by a caller, raw source in a result, or source-bearing value in awaited review state. The internal L04 getter is
strictly literal-only; an unknown/bootstrap-mismatched phase fails `task551_l04_bootstrap_provenance_invalid` before source, fixture,
process, or evidence access.
- **Process safety:** digest/version-bound absolute Bun executable, exact argv array, `--env-file=/dev/null`, and exact-own `childEnv` provide Bun's semantic no-shell/no-inherited-key boundary; bounded output, process-group termination, and no detached survivor remain mandatory.
- **Evidence safety:** exactly eleven manifest rows are durable sidecar evidence.
Foreign/unsafe canonical-root entries block before dispatch and are never quarantined or mutated; only opaque private stale temps may be quarantined. Writers are atomic no-replace and never overwrite. Secrets, credentials,
SQL, binds, raw output, and private capability state never enter evidence or agent prompts.
## Implementation Pseudocode
Only the outer owner composition root in `_docs/_workflows/task-551-implement.mjs` literal-dynamically imports the L02 host, and only after `Task551L02CodeTestMaterializationClosureV1`; the evidence facade does not. The root executes the descriptor-only bootstrap and pre-L02 work first, then invokes that host around the facade callback. The host performs its owner-local channel acquisition/install then guaranteed `finally` revocation; no bootstrap caller loads the implementer or future L03/L04/L02 modules:
```ts
export async function runTask551ImplementWorkflow(input: Task551ImplementInputV1): Promise<void> {
  await runTask551WorkflowCompatibilityBootstrapV2(); await runTask551PreL02ClosureWork(input); // author-audit, L01/L03/L04, post-L03/post-L04 adaptation, then verified L02 code/test materialization closure
  const { runTask551L02OwnerHostInSameRealm } = await import("../../scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts"); // literal, only after materialization closure
  return await runTask551L02OwnerHostInSameRealm(
    () => runTask551L02WorkflowEvidence(input), // facade callback: no ingress/approval argument
  );
}
async function runTask551L02WorkflowEvidence(): Promise<void> {
  requireTask551SidecarProvenanceBeforeSelfTests(); bootstrapTask551EvidenceStorageForOwnerWorkflowHost(); await recoverTask551EvidenceRoot();
  const materialization = requireCurrentL01MaterializationSnapshotAfterL02CodeTestMaterializationClosure();
  requireTask551PredecessorWorktreeSnapshotBeforeSpawn("l02", materialization);
  const staticSmall = await runL02StaticEvidence("small"); const staticLarge = await runL02StaticEvidence("large");
  await writeTask551EvidenceFileIfAbsent("l02StaticSmall", staticSmall); await writeTask551EvidenceFileIfAbsent("l02StaticLarge", staticLarge);
  let expectedActiveState = TASK551_INITIAL_ACTIVE_STATE_EXPECTATION;
  const freezeSmall = await runFreshL02ChildOperation("freeze", "small");
  expectedActiveState = requireAndRebaseL02ActiveState(requireL02FreezeReceipt(freezeSmall), expectedActiveState);
  const freezeLarge = await runFreshL02ChildOperation("freeze", "large");
  expectedActiveState = requireAndRebaseL02ActiveState(requireL02FreezeReceipt(freezeLarge), expectedActiveState);
  const candidates = reduceFreezePairToRedactedValues(freezeSmall, freezeLarge);
  await writeTask551EvidenceFileIfAbsent("l02FreezeCandidateSmall", candidates.small); await writeTask551EvidenceFileIfAbsent("l02FreezeCandidateLarge", candidates.large);
  const reviewed = await runFreshL02ReviewedTransition(candidates);
  expectedActiveState = requireAndRebaseL02ActiveState(parseTask551L02ActiveStateTransitionReceiptV2(reviewed.stateTransitionReceipt), expectedActiveState);
  await writeTask551EvidenceFileIfAbsent("l02ReviewedCandidates", reduceL02ReviewedTransitionToEvidence(reviewed));
  const checkSmall = await runFreshL02ChildOperation("check", "small");
  requireExactReviewedStateAttestation(requireL02ReviewedStateAttestation(checkSmall), expectedActiveState);
  const checkLarge = await runFreshL02ChildOperation("check", "large");
  requireExactReviewedStateAttestation(requireL02ReviewedStateAttestation(checkLarge), expectedActiveState);
  await writeTask551EvidenceFileIfAbsent("l02CheckSmall", reduceCheckToRedactedEvidence("small", checkSmall));
  await writeTask551EvidenceFileIfAbsent("l02CheckLarge", reduceCheckToRedactedEvidence("large", checkLarge));
  const sourceHead = await requireCommitAAndReadHead();
  const terminalValues = await runFresh05L02AndReadValidatedTask489TemporaryBytes();
  await writeTask551EvidenceFileIfAbsent("task489Predecessor", terminalValues.predecessorValue);
  await writeTask551EvidenceFileIfAbsent("task489PredecessorPromotion", terminalValues.promotionValue);
  const terminalFence = await verifyCommitBAfterTask489EvidenceWrites({ sourceHead }); requireTerminalFence(terminalFence);
}
async function runFresh05L02AndReadValidatedTask489TemporaryBytes(): Promise<Readonly<{ predecessorValue: Task551CanonicalPredecessorValueV1; promotionValue: Task551ImmutableEvidenceValue }>> {
  let outcomes: Task55105L02ChildOutcomeV1[] = [];
  for (const expected of requireExact05L02BrokerContextsInTableOrder()) {
    outcomes.push(await run05L02ChildOutcome(expected));
  }
  requireExactAllFour05L02PostCleanupTargetProofs(outcomes); outcomes = []; // fixed code task551_05_l02_post_cleanup_target_proof_invalid
  const terminal = await readOnceParseHashAndBindTask489TemporaryBytesWithL02Parser(); return terminal;
}
async function run05L02ChildOutcome(expected: Task551PhaseBrokerContextV1): Promise<Task55105L02ChildOutcomeV1> {
  const permit = await awaitTask551EvidenceRecoveryPreflightBeforePhase(); let started: Task551StartedChildCaptureV1 | undefined;
  try { started = consumeAndStartTask551PhaseChild(permit, expected); return await captureExact05L02ChildOutcome(started.child, started.receiptBase); } // exact context/command is bound privately before capture
  finally { if (started) await disposeTask551Child(started.child); started = undefined; }
}
function requireExact05L02BrokerContextsInTableOrder(): readonly Task551PhaseBrokerContextV1[] {
  return [requireTask551PhaseBrokerContext("05-l02", "database-explain-plans-test", null), requireTask551PhaseBrokerContext("05-l02", "task489-predecessor-plans-test", null), requireTask551PhaseBrokerContext("05-l02", "explain-plan-check", "small"), requireTask551PhaseBrokerContext("05-l02", "explain-plan-check", "large")];
}
async function runFreshL02ChildOperation(
  operation: "freeze" | "check",
  profile: "small" | "large",
): Promise<Task551RedactedCommandGroupV1 & Readonly<{
  stateTransitionReceipt?: unknown; stateAttestation?: unknown;
}>> {
  const expected = requireTask551PhaseBrokerContext("l02", operation, profile);
  const group = await runSourceBoundChild(expected); return group;
}
function requireL02FreezeReceipt(group: Readonly<{ stateTransitionReceipt?: unknown }>): Task551L02ActiveStateTransitionReceiptV2 {
  if (!Object.hasOwn(group, "stateTransitionReceipt")) throw new Error("task551_l02_active_state_receipt_invalid");
  return parseTask551L02ActiveStateTransitionReceiptV2(group.stateTransitionReceipt);
}
function requireL02ReviewedStateAttestation(group: Readonly<{ stateAttestation?: unknown }>): Task551L02ReviewedStateAttestationV2 {
  if (!Object.hasOwn(group, "stateAttestation")) throw new Error("task551_l02_active_state_receipt_invalid");
  return parseTask551L02ReviewedStateAttestationV2(group.stateAttestation);
}
async function runFreshL02ReviewedTransition(
  candidates: Task551CandidatePairV1,
): Promise<Task551ReviewedCandidateTransitionResultV1 & Readonly<{ stateTransitionReceipt: unknown }>> {
  const worktreeSnapshotDigest = requireCurrentL01MaterializationSnapshotDigest();
  registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition(worktreeSnapshotDigest);
  const transition = { worktreeSnapshotDigest,
    smallCandidateCanonicalDigest: candidates.small.digest, largeCandidateCanonicalDigest: candidates.large.digest };
  candidates = undefined as never;
  const reviewed = await runL02OwnedReviewedTransition(transition); return reviewed;
}
```
The implementation keeps source-bound launches, child maps, private capture policies, and private L02 capability state out of review state. The L03 seam returns only frozen initialize/check values; L04 returns only its frozen literal identity and a failed L04 gate reaches no broker/source/fixture/child/evidence output. Every workflow child launch and evidence write awaits the authoritative global-root-clear **and** all-eleven-row-clear recovery barrier, so a blocked result reaches neither broker/source, spawn, nor write. Every freeze/check awaits preflight, synchronously acquires/validates/starts one fresh source-bound child, clears broker/raw source/input/map/env/launch before capture, and disposes its opaque child in `finally`; capture receives only that child and its redacted receipt base. Review is non-spawning and passes only redacted snapshot/candidate digests to L02. Rejected prefixes clean up locally and return fixed codes; raw values are never persisted, logged, or recovered from a digest.
## Automatic Internal Provider Boundary
**Verified limitation:** `task-551-author-audit.mjs:39-40,718-739,780-839` accepts caller-injected audit/reconcile functions; `task-551-implement.mjs:73-77,644-691,738-742,812-818` accepts a permit then rejects production adapters before snapshot, leaf, or gate dispatch; `scripts/task551DatabaseBaseline/reviewedPairOwnerHost.ts:1-51` is L02-only. No named in-repository owner-controlled provider exists for the automatic in-process route, and ignored/local CLI configuration is not authority.
### Decision Required
Before any automatic-provider or private automatic-composition code, the owner must approve and record a non-secret stable provider contract: named approved provider, exact model identifier and version, checked-in configuration/profile reference plus integrity identity, closed structured result/error schema, authentication and credential custody/rotation, least-privilege permission policy, and owner-controlled invocation/lifecycle authority.
### Fail-Closed Contract
Until that decision and its acceptance proof exist, the automatic in-process route has no authorized execution provider: it may verify an opaque audit permit only for fail-closed preflight, then rejects before an authoritative snapshot, L01, child or gate, L02 host import, or durable phase-evidence write. No test-only callback/seam may bypass that route or fabricate an automatic permit, snapshot, or receipt. Separately, AGENTS.md-authorized manual owner-led execution may deliver existing product leaves under their current contracts, but must preserve their graph, single-writer, audit, gate, evidence, smoke, and closure requirements without using a test seam as a manual runner.
### Subsequent Execution Leaves
After the decision, a separately authored automatic-provider leaf must own the approved binding, fresh audit/reconcile invocation, untrusted-result parsing, authority lifecycle, and current snapshot/leaf/gate capability; a separate automatic-composition leaf must own only private L01-initial composition from that trusted authority. Neither is allocated or implemented here, and no concrete module path is authorized by this amendment.
## Sub-Tasks
- No physical L11 leaf is allocated: the strict parser requires every `-LNN` file to have an envelope and a matching product-graph task ID, while L11 intentionally has neither. This in-place decision boundary preserves all existing graph and task-count invariants.
## Testing Requirements
- The three named workflow tests cover strict recursive schemas (including nested `commandReceipt:{DATABASE_URL:"postgres://leak"}` rejection), frozen descriptor `expectedTaskId` bindings, cold facade import/TDZ and one-way facade-to-helper graph/declaration parity, the exact eleven-row non-path `Task551EvidenceRowId` map/no aliases, all eleven literal `writeTask551EvidenceFileIfAbsent(rowId, value)` pairs, L11-only one-parser/one-hash row-10/11 construction, strict `Task551CommandReceiptV1` digest/context/process/discovery fields with no argv/env/output, and the exact transient four-outcome 05-L02 context/command/passed-proof gate immediately before parse/hash/promotion and absent from rows/projections. Before author-audit, `task551WorkflowContracts.test.ts` must also prove the owner-only compatibility bootstrap parses/executes exactly two L02 subgates, the L02-only workflow prerequisite, l04 provenance support, and nine-path membership without validating current L04 bytes or creating a row. It also pins the L01 capability-routes test/helper in phase closure/validation while excluding that auxiliary direct gate from the exact nine-path descriptor/barrier. It owns independent fixed expected raw-lower-hex vectors for all 15 rows using the magic/u32BE UTF-8 framing, proves equal static argv cannot cross contexts and trusted Bun token replacement leaves the descriptor unchanged, and rejects token/order/profile/context/count/env-file/digest mutations, malformed/truncated/extra/noncanonical frames, field/count/total overflow or wrap, and raw argv/preimage receipt fields; `task551EvidenceContract.test.ts` owns recovery/no-replace/14-key-matrix security coverage.
- `task551WorkflowContracts.test.ts` uses only its matrix-authorized direct private imports plus facade resolver traps for all five deferred literal targets, proves bootstrap succeeds with zero target resolution, then checks receipt exact-key order/freeze/framed hash recomputation and the full epoch matrix: success only `bootstrap-ready -> author-audit-admitted -> graph-admitted -> l02-admitted`; direct graph/L02-before-author and L02-before-graph, failure with same-stage retry, replay/skip, missing/clone/foreign/old-epoch, and bootstrap replacement invalidation all fail closed. It proves L03 can materialize/spawn with L04/L02 targets absent and L04 with L02 targets absent, without requiring that physical absence; the generic barrier excludes every descriptor path/digest whether present or absent, and only the descriptor-selected named literal post-L03/post-L04/post-materialization/05-L02 seams accept their current regular-byte target. It also pins `L04 closure/adaptation -> L02 code/test materialization closure -> L02:single/subgates -> final L02 leaf closure`.
- Provenance/import/discovery/closed allowlists distinguish `materializedWorktreeOutputs` from `ephemeralPostOperationOutputs` and prove the
  L04 pure getter's exact phase/path/literal identity plus `task551_l04_bootstrap_provenance_invalid` on every altered/missing/foreign input;
  it creates no broker value, child, fixture/source read, logical-argv registry row, or durable evidence row.
  `deriveTask551ClosedWorktreeSet(["l01"])` contains the manifest, while the 05-L02 set never contains the temporary predecessor.
  Tests allow an active leaf's declared path to be absent before its dispatcher, then require exact regular non-symlink current generic files,
  SHA-256 receipts, task-graph-byte equality, and rejection before spawn for predecessor/foreign/byte drift. They pin nine test-path
  presence inputs but only four pre-classifier green receipts, while the L01 capability-routes auxiliary gate remains in L01 phase closure/validation and outside both sets; all five descriptor paths/digests are absent from the generic barrier
  whether materialized or absent and checked only by their named owner/materialization closure receipts/seams. They prove archive/active bytes are absent from every L11 path/snapshot/durable-output API and are verified only by L02's sanitized receipt/attestation. They also prove parser-only
  post-success temp handling and byte-identical promotion. Duplicate/symlink/traversal, exact-nine-manifest, 05-L02 projections,
  ordered two-subgate discriminator/full-prefix/transition-failure-zero-check, terminal same-HEAD/extra-path, bypass, duplicate-command,
  missing-profile, and early-write cases fail.
- Broker tests pin all and only the ten table rows: every L03/L02/05-L02 runner awaits preflight before broker/supplier/source access, then `consumeOnce(expected)` and sync start/recheck occur before its first capture await. They prove four L03 vs three L02/05 fixtureValues, distinct cycles, no raw broker/source/input/map/env/launch reference after start, and capture arguments restricted to opaque child plus redacted receipt base; reused/non-table/ambient/raw/inherited input fails before spawn. They assert the supported boundary rejects missing/malformed argv/env before target parse/connect but is not a cryptographic claim against an equally privileged process independently reproducing non-secret values. L11 asserts array argv, `--env-file=/dev/null`, exact-own childEnv, bounded disposal, and redacted receipts.
- The focused capability test covers the persistence-facade/`freezeCandidateGenerationStore.ts`/`reviewedPairReceiptSource.ts`/`reviewedPairTransition.ts`/`reviewedPairOwnerHost.ts` split, active-v2 archive/state fail-closed ownership, preserved v1 `capabilityReceipt`, legacy type compatibility plus fixed pre-I/O migration failure for every legacy runtime/runner authority export, one-use generation-bound registration, and the production-reachable same-realm L02 pre-dispatch owner pause/resume host. It proves the in-memory initial `awaiting-small/absent` expectation, exactly-once pure receipt/attestation normalization, three legal receipt rebases, exact ID/previous-ID/sequence/edge/closure bindings, reviewed check attestation, and failure with zero later child/evidence write on replay, illegal edge, state/code/bootstrap/archive drift. `task551WorkflowContracts.test.ts` owns the literal composition-root contract: exactly `_docs/_workflows/task-551-implement.mjs` is the sole post-materialization dynamic host importer, the facade and every other L11 module have no host import/access, and no L11 test has a private host seam. L02's `reviewedPairPersistence.test.ts` exclusively proves private host-seam `install -> invokeWorkflow` once -> `finally` revoke for success and throw, plus the runtime `Symbol(...)` brand is module-private cooperation (not a cryptographic non-forgeability claim), default deny, and `ownerReviewChannel.review` exactly once only after lock re-read and exact triple validation, followed by sealed approval expiry/revocation and test-seam reset in `finally`; it remains there, never runner lifecycle. L11 review proves zero broker/supplier/sentinel/child/spawn/ingress access; fake APIs cover bounded readers, nonzero, overflow, timeout, kill fallback, and `proc.exited`.
- Recovery tests use only the non-declared static-closure-limited harness and closed row/value fault inputs. They prove cold production require fails, the L11 evidence-storage owner-host bootstrap precedes recovery/preflight, rebind fails, and its disjoint test context cannot seed/satisfy the production singleton; they also prove no ambient root/path/context injection; canonical regular/non-symlink/no-g+w checks; foreign canonical regular, symlink, nonregular, and ancestor-drift global blockers make no canonical mutation and block every launch/write (not cleanup kill); private-only deterministic two-phase stale-temp quarantine/restart/multiple-temp behavior; and `EEXIST`/fsync/unlink/link no-overwrite faults without an adversarial-rename claim.
- Before adding the L03 adaptation or L04 provenance branch, land the exact capacity sequence: move evidence I/O into the filesystem companion, extract pure worktree/barrier algorithms into worktree compatibility, then extract the injected L02 subgate executor and the author-audit -> fix/evidence parser/declaration boundaries. These, L03/L04/L02 seams, and provenance are required implementation/extraction work, not a claim that the current source already conforms. Worktree compatibility has no fs/DB/L02 import; the executor has no host/DB import; all fourteen source/declaration paths and all three existing matrix-bound tests are <=999 physical lines (stronger than the repository <=1,000 gate). `task551AuthorAudit.test.ts`
  covers own-data snapshots, duplicate keys, graph/envelope reconciliation, and the dynamic current-task-graph audit. The three tests use only the exact test-only matrix above; no private test seam reaches the owner host. The strict declaration/type repair stays in this owned matrix: `task551WorkflowContracts.test.ts` replaces unavailable `bun:test` `expectTypeOf` with local compile-time `Equal`/`Assert` comparing `Awaited<ReturnType<typeof writeTask551EvidenceFileIfAbsent>>["digest"]` to public-facade `Task551L11L03EvidenceProofV1["acceptedEvidenceDigest"]`; `task-551-author-audit.d.mts` types its audit/reconcile callbacks as `AuditResult | Promise<AuditResult>` matching awaited `invokeAgent` behavior; `task551EvidenceContract.test.ts` preserves terminal-handoff `tracked:true`, `kind:"regular"`, `dirty:false`, and `replaced:false` discriminants, uses only a narrow local mutable negative view with no `any`, and records/narrows every untrusted evidence value before property access; public `task-551-contract.d.mts` declares `buildTask551L10EvidenceProjection(input: unknown): Task551L10EvidenceEnvelope` to match runtime validation while retaining its narrow output. Do not change `tsconfig`, use a suppression, add a public-facade reexport of a private symbol or any declaration of the owner bridge, or weaken behavior assertions. After the four sibling declarations land, require `bun run lint:repo:types`, all three named Bun tests, static public/private/bridge-boundary checks, and the existing all-17-path `awk` line-cap gate. Run targeted lanes, post-audit, final drift, and five-scenario smoke; missing DB/Redis/browser infrastructure is failure, not skip.
## Exact Validation Commands
For this contract-only reconciliation, run the file checks; the implementation inventory is intentionally fail-fast once invoked and requires all fourteen source/declaration and three existing workflow-test paths:
```sh
set -eu
task_contract=_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md
grep -nE 'TASK551_(CONSUMER_FIELDS|L10_RESULT_FIELDS|L10_PROJECTION_(KEYS|MATRIX)|EVIDENCE_(VALUE_DESCRIPTORS|MANIFEST_INDEX_BY_ROW_ID|ROW_IDS)|PHASE_BROKER_CONTEXTS|LOGICAL_ARGV_(CONTRACT_ID|PREIMAGE_MAGIC|REGISTRY))|Task551(Evidence(RowId|FaultPlan|StorageContextV1|WriteValueV1|CanonicalPredecessorValueV1|RecoveryBlockerV1|ClearPermitV1|StartedPhaseChildV1)|Phase(SourceBrokerV1|BrokerContextV1)|CommandReceipt(V1|BaseV1)|05L02ChildOutcomeV1|LogicalArgvDigestDescriptorV1|L02(ActiveStateTransitionReceiptV2|ReviewedStateAttestationV2))|runTask551(ImplementWorkflow|L02OwnerHostInSameRealm|WorkflowCompatibilityBootstrapV2)|runL02OwnedReviewedTransition|parseTask551L02(ActiveStateTransitionReceiptV2|ReviewedStateAttestationV2)|registerAcceptedL11WorktreeSnapshotDigestForReviewedTransition|bootstrapTask551EvidenceStorageForOwnerWorkflowHost|reviewedPair(Transition|OwnerHost)|capabilityReceipt|consumeOnce\(expected|awaitTask551EvidenceRecoveryPreflightBeforePhase|recovery_blocked|blocked_foreign_entry|expectedTaskId|consumeAndStartTask551PhaseChild|startTask551ChildSynchronously|captureStartedTask551Child|disposeTask551Child|Bun\.spawn|bunVersion|proc\.exited|signalCode|overflow|timeout|privateQuarantine|sealedStagingId|multiple_stale_temps|EEXIST' "$task_contract"
grep -nE 'TASK551_(PHASE_(PROVENANCE|IMPORT_CLOSURE|DISCOVERY_ALLOWLIST|CLOSED_ALLOWLIST|OWNED_CODE_TEST_PATHS|MATERIALIZED_WORKTREE_OUTPUTS|EPHEMERAL_POST_OPERATION_OUTPUTS)|DEFERRED_LITERAL_TARGET(S|_PATHS)|L11_CLASSIFIER_NARROW_L02_INPUTS)|Task551(DeferredLiteralTargetV1|CurrentWorktreeSnapshotV1)|task551FullProvenanceClosureForSpawn|TASK551_05_L02_(PROVENANCE|VALIDATION_PATHS|LINE_COUNT_PATHS)|TASK551_DURABLE_EVIDENCE_MANIFEST|reviewedPairReceiptSource|environment(Profile|Overrides)|artifactPolicy|task551-(db-test|db-redis-test|redis-test|db-migration-test|changelog-closure-entry)' "$task_contract"
test "$(grep -cE '^    path: ".*audit-evidence/.*\.json",$' "$task_contract")" -eq 11
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    ownedTests:/ { print count; exit } sidecar && /^      "_docs\/_workflows\// { count++ }' "$task_contract")" -eq 14
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    readOnlyImports:/ { print count; exit } sidecar && /^      "tests\/unit\/workflows\// { count++ }' "$task_contract")" -eq 3
test "$(awk '/^const TASK551_DEFERRED_LITERAL_TARGETS:/ { targets=1; next } targets && /^\]\);$/ { print count; exit } targets && /Object\.freeze\(\{ id:/ { count++ }' "$task_contract")" -eq 5
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    materializedWorktreeOutputs:/ { print count; exit } sidecar && /readOnlyImports: \[\]/ { count++ }' "$task_contract")" -eq 1
awk 'NR > 999 { exit 1 } END { if (NR > 999) exit 1 }' "$task_contract"
task551_sidecar_paths=(_docs/_workflows/lib/task-551-contract.mjs _docs/_workflows/lib/task-551-evidence-contract.mjs _docs/_workflows/lib/task-551-evidence-filesystem.mjs _docs/_workflows/lib/task-551-worktree-compatibility.mjs _docs/_workflows/lib/task-551-l02-subgate-executor.mjs _docs/_workflows/lib/task-551-dispatch-contract.mjs _docs/_workflows/lib/task-551-contract.d.mts _docs/_workflows/task-551-author-audit.mjs _docs/_workflows/task-551-implement.mjs _docs/_workflows/task-551-fix.mjs _docs/_workflows/task-551-author-audit.d.mts _docs/_workflows/task-551-implement.d.mts _docs/_workflows/task-551-fix.d.mts _docs/_workflows/lib/task-551-evidence-contract.d.mts tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/task551EvidenceContract.test.ts)
test "${#task551_sidecar_paths[@]}" -eq 17
for path in "${task551_sidecar_paths[@]}"; do test -f "$path" && ! test -L "$path" || { printf 'missing/nonregular L11 path: %s\n' "$path" >&2; exit 1; }; awk 'NR > 999 { exit 1 } END { if (NR > 999) exit 1 }' "$path" || { printf 'overlong L11 path: %s\n' "$path" >&2; exit 1; }; done
test "$(( $(grep -c '^```' "$task_contract") % 2 ))" -eq 0
grep -nE '^# FileName:|^\*\*Status:|^## (Overview|Sub-Tasks|Testing Requirements|Documentation Updates Required)$' "$task_contract"
git diff --check -- "$task_contract"
```
The read-only structural script also asserts one canonical literal-projection model (no dynamic fixture import or runtime-output union), the exact facade/dispatch/worktree-compatibility and implement/subgate-executor private edges plus the two L03 helpers and three narrow L02 handoffs, one eleven-row manifest, one
L02-owned transition boundary, broker consumption/disposal, no raw persistence, exact quarantine names, digest/version-bound trusted
executable, immutable-worktree active/predecessor pre-spawn fence, materialized/ephemeral separation, terminal owner fence, all
reviewed-pair/05-L02 paths, and line/column failures, including an unterminated final physical line through the `awk NR` gates. It creates no receipt or evidence file.
The normal owner-controlled final closure gates remain after all streams land:
```sh
bun run lint:repo:types && bun --cwd core lint:types && bun --cwd core lint && bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/task551EvidenceContract.test.ts
bun run precommit:check && bun run gates:coderso && bun run scan:security
```
These gates do not substitute for phase-specific Bun/Vitest, DB, or runtime-smoke lanes; immediately before a manual terminal commit,
the owner runs `bun run precommit` (or verifies its automatic hook), then performs the fresh final committed-HEAD audit.
## Documentation Updates Required
This refinement changes only this L11 contract, its parent linkage, and TASK-551's board/status statistics to record verified partial implementation and the automatic-runner limitation; it creates no provider, production code, test, declaration, task leaf, changelog, or product/API documentation. On implementation
closure, TASK-551-10-L02 records the eleven-path manifest, terminal owner handoff, provenance/line-count projections, quarantine behavior,
and validation results in pinned changelog 1310.
## Deterministic source-disposal sentinel test
The sentinel test records `sourceAccessCount`, `sourceDisposed`, and `postDisposeViolations` across the `snapshot -> dispose -> await` lifecycle. It uses the exact broker/supplier call per L03 initialize/check and each L02 freeze/check operation; L02 review asserts zero broker/supplier/sentinel/child/spawn calls. Set disposed before the first await. A post-disposal accessor throws or logs a violation, and the test asserts zero later access and zero violations. This test makes no WeakRef, GC, or zeroization claim.
