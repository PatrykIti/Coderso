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
      "_docs/_workflows/lib/task-551-dispatch-primitives.mjs",
      "_docs/_workflows/lib/task-551-dispatch-envelope.mjs",
      "_docs/_workflows/lib/task-551-phase-provenance.mjs",
      "_docs/_workflows/lib/task-551-worktree-snapshot.mjs",
      "_docs/_workflows/lib/task-551-l01-barrier.mjs",
    ],
    ownedTests: [
      "tests/unit/workflows/task551AuthorAudit.test.ts",
      "tests/unit/workflows/authorAuditDriftRounds.test.ts",
      "tests/unit/workflows/authorAuditBoundedChild.test.ts",
      "tests/unit/workflows/task551AuthorAuditFixtures.ts",
      "tests/unit/workflows/task551WorkflowContracts.test.ts",
      "tests/unit/workflows/workflowContractsBootstrap.test.ts",
      "tests/unit/workflows/workflowContractsSubgates.test.ts",
      "tests/unit/workflows/workflowContractsImplementation.test.ts",
      "tests/unit/workflows/task551WorkflowContractsFixtures.ts",
      "tests/unit/workflows/task551WorkflowExecutionFixtures.ts",
      "tests/unit/workflows/task551EvidenceContract.test.ts",
      "tests/unit/workflows/evidenceContractMatrix.test.ts",
      "tests/unit/workflows/task551EvidenceContractFixtures.ts",
      "tests/unit/workflows/dispatchContractCaps.test.ts",
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
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    ownedTests:/ { print count; exit } sidecar && /^      "_docs\/_workflows\// { count++ }' "$task_contract")" -eq 19
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    readOnlyImports:/ { print count; exit } sidecar && /^      "tests\/unit\/workflows\// { count++ }' "$task_contract")" -eq 14
test "$(awk '/^const TASK551_DEFERRED_LITERAL_TARGETS:/ { targets=1; next } targets && /^\]\);$/ { print count; exit } targets && /Object\.freeze\(\{ id:/ { count++ }' "$task_contract")" -eq 5
test "$(awk '/^    phase: "sidecar",$/ { sidecar=1 } sidecar && /^    materializedWorktreeOutputs:/ { print count; exit } sidecar && /readOnlyImports: \[\]/ { count++ }' "$task_contract")" -eq 1
awk 'NR > 1900 { exit 1 } END { if (NR > 1900) exit 1 }' "$task_contract"
task551_sidecar_paths=(_docs/_workflows/lib/task-551-contract.mjs _docs/_workflows/lib/task-551-evidence-contract.mjs _docs/_workflows/lib/task-551-evidence-filesystem.mjs _docs/_workflows/lib/task-551-worktree-compatibility.mjs _docs/_workflows/lib/task-551-l02-subgate-executor.mjs _docs/_workflows/lib/task-551-dispatch-contract.mjs _docs/_workflows/lib/task-551-contract.d.mts _docs/_workflows/task-551-author-audit.mjs _docs/_workflows/task-551-implement.mjs _docs/_workflows/task-551-fix.mjs _docs/_workflows/task-551-author-audit.d.mts _docs/_workflows/task-551-implement.d.mts _docs/_workflows/task-551-fix.d.mts _docs/_workflows/lib/task-551-evidence-contract.d.mts _docs/_workflows/lib/task-551-dispatch-primitives.mjs _docs/_workflows/lib/task-551-dispatch-envelope.mjs _docs/_workflows/lib/task-551-phase-provenance.mjs _docs/_workflows/lib/task-551-worktree-snapshot.mjs _docs/_workflows/lib/task-551-l01-barrier.mjs tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/authorAuditDriftRounds.test.ts tests/unit/workflows/authorAuditBoundedChild.test.ts tests/unit/workflows/task551AuthorAuditFixtures.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/workflowContractsBootstrap.test.ts tests/unit/workflows/workflowContractsSubgates.test.ts tests/unit/workflows/workflowContractsImplementation.test.ts tests/unit/workflows/task551WorkflowContractsFixtures.ts tests/unit/workflows/task551WorkflowExecutionFixtures.ts tests/unit/workflows/task551EvidenceContract.test.ts tests/unit/workflows/evidenceContractMatrix.test.ts tests/unit/workflows/task551EvidenceContractFixtures.ts tests/unit/workflows/dispatchContractCaps.test.ts)
test "${#task551_sidecar_paths[@]}" -eq 33
task551_frozen_ceilings=(_docs/_workflows/lib/task-551-evidence-contract.mjs=1562 _docs/_workflows/lib/task-551-evidence-filesystem.mjs=1014 _docs/_workflows/task-551-author-audit.mjs=1039 _docs/_workflows/task-551-implement.mjs=1844 _docs/_workflows/task-551-fix.mjs=1459)
task551_reopen_pending=(_docs/_workflows/lib/task-551-dispatch-primitives.mjs=1:- _docs/_workflows/lib/task-551-dispatch-envelope.mjs=1:- tests/unit/workflows/dispatchContractCaps.test.ts=2:- _docs/_workflows/lib/task-551-phase-provenance.mjs=3:- _docs/_workflows/lib/task-551-worktree-snapshot.mjs=3:- _docs/_workflows/lib/task-551-l01-barrier.mjs=3:- _docs/_workflows/lib/task-551-worktree-compatibility.mjs=3:1728 tests/unit/workflows/authorAuditDriftRounds.test.ts=4:- tests/unit/workflows/authorAuditBoundedChild.test.ts=4:- tests/unit/workflows/task551AuthorAuditFixtures.ts=4:- tests/unit/workflows/task551AuthorAudit.test.ts=4:1241 tests/unit/workflows/workflowContractsBootstrap.test.ts=5:- tests/unit/workflows/workflowContractsSubgates.test.ts=5:- tests/unit/workflows/workflowContractsImplementation.test.ts=5:- tests/unit/workflows/task551WorkflowContractsFixtures.ts=5:- tests/unit/workflows/task551WorkflowExecutionFixtures.ts=5:- tests/unit/workflows/task551WorkflowContracts.test.ts=5:2793 tests/unit/workflows/evidenceContractMatrix.test.ts=6:- tests/unit/workflows/task551EvidenceContractFixtures.ts=6:- tests/unit/workflows/task551EvidenceContract.test.ts=6:1215)
task551_reopen_step="${TASK551_REOPEN_STEP:-7}"; case "$task551_reopen_step" in [1-7]) ;; *) printf 'invalid TASK551_REOPEN_STEP: %s\n' "$task551_reopen_step" >&2; exit 1 ;; esac; test "${#task551_frozen_ceilings[@]}" -eq 5; test "${#task551_reopen_pending[@]}" -eq 20; for entry in "${task551_frozen_ceilings[@]}" "${task551_reopen_pending[@]}"; do case " ${task551_sidecar_paths[*]} " in *" ${entry%%=*} "*) ;; *) printf 'L11 ceiling/pending path outside the fenced set: %s\n' "${entry%%=*}" >&2; exit 1 ;; esac; done
for path in "${task551_sidecar_paths[@]}"; do cap=999; case "$path" in tests/unit/workflows/task551AuthorAudit.test.ts|tests/unit/workflows/authorAuditDriftRounds.test.ts|tests/unit/workflows/authorAuditBoundedChild.test.ts) cap=700 ;; *.test.ts) cap=800 ;; esac; for entry in "${task551_frozen_ceilings[@]}"; do if [ "${entry%%=*}" = "$path" ]; then cap="${entry#*=}"; fi; done; absent_ok=0; for entry in "${task551_reopen_pending[@]}"; do spec="${entry#*=}"; if [ "${entry%%=*}" = "$path" ] && [ "$task551_reopen_step" -lt "${spec%%:*}" ]; then if [ "${spec#*:}" = "-" ]; then absent_ok=1; else cap="${spec#*:}"; fi; fi; done; if [ "$absent_ok" -eq 1 ] && [ ! -e "$path" ] && [ ! -L "$path" ]; then continue; fi; { [ -f "$path" ] && [ ! -L "$path" ]; } || { printf 'missing/nonregular L11 path: %s\n' "$path" >&2; exit 1; }; awk -v cap="$cap" 'NR > cap { exit 1 } END { if (NR > cap) exit 1 }' "$path" || { printf 'overlong L11 path: %s (cap %s)\n' "$path" "$cap" >&2; exit 1; }; done
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
bun run lint:repo:types && bun --cwd core lint:types && bun --cwd core lint && bun test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/authorAuditDriftRounds.test.ts tests/unit/workflows/authorAuditBoundedChild.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/workflowContractsBootstrap.test.ts tests/unit/workflows/workflowContractsSubgates.test.ts tests/unit/workflows/workflowContractsImplementation.test.ts tests/unit/workflows/task551EvidenceContract.test.ts tests/unit/workflows/evidenceContractMatrix.test.ts tests/unit/workflows/dispatchContractCaps.test.ts
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
## Dated Contract Correction — 2026-09-25 (TASK-551-03-L02 round 3, disposition R3-33; append-only)
Source: `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round3-dispositions.md` (R3-33, HEAD `9c5b6666`); parent mirror: the TASK-551 round-3 section after its R2-06 section. On 2026-09-25 the parent graph (R2-06) split `TASK-551-03-L02:single` into `TASK-551-03-L02:initial` and a new `TASK-551-03-L02:final` right after `TASK-551-08-L03:final`, so the derived occurrence count went from 32 to 33 (preflight at `9c5b6666`: 41 files, 11 children, 29 leaves, 33 occurrences).
- **Owned mechanical re-pin.** This leaf owns `tests/unit/workflows/task551AuthorAudit.test.ts` (allowlist `ownedTests` :86; ownership list :27). Its four `32` pins become `33`: :327 (`inventory.occurrenceCount`) and :336 (dispatch-order id-set size), both in "author-audit preflight derives the current graph without returning source text" (:321); :742 and :991 (`outcome.dispatch.inventory.occurrenceCount`). The orchestrator verified RED before the re-pin: 3 failing tests. The diff changes only those four numeric literals. Test names, control flow, fixtures and every other assertion stay byte-identical. This is a contract-named re-baseline (the count is derived, not hard-coded, in the helper) and not a weakened assertion.
- **Gate/receipt.** Airtight DB-free gate: `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/workflows/task551AuthorAudit.test.ts` → 40 pass / 0 fail (2026-09-25, working tree on `9c5b6666`). Receipt note: the re-pin is a test-only mechanical repair of a derived count; it changes no workflow source, declaration, or envelope. The file was already in the allowlist, and no command, profile or dependency changes, so **no envelope change is needed**.
- **Superseded sentences (text authoritative):** :815 "It derives inventory/order (currently 41 files, 29 leaves, 32 occurrences)" now reads 33 occurrences. :799 "03-L02 → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) → 03-L03 →" now reads "03-L02(initial) → 07-L02 → 08-L01 → 08-L02 → 08-L03(final) → 03-L02(final) → 03-L03 →". 03-L03 still depends only on `TASK-551-08-L03:final` and has no edge to 03-L02 FINAL.
### Amendment (2026-09-25): line gate and lint for the re-pinned suite
Recorded at HEAD `9c5b6666` (working tree). The R3-33 re-pin above touched `tests/unit/workflows/task551AuthorAudit.test.ts`, which is 1,241 physical lines (already over the 1,000-line gate at HEAD) and carries 2 eslint errors at HEAD: `react-hooks/rules-of-hooks` at :238:18 (the `withTask551GitRepo` fixture callback parameter named `use` is called inside `try/catch` in a non-hook function). Per AGENTS.md "File Size and Modularity", the same TASK-551-11 re-open must split the suite by cohesive responsibility and clear both errors without changing behaviour. This supersedes the R3-33 sentence "no envelope change is needed".
- **Split (40 tests preserved: 18 + 12 + 10).** `task551AuthorAudit.test.ts` keeps the author-audit contract suites "research grounding and audit scopes" (incl. dispatch preflight :321/:365), "clean-round rule" and "targeted re-audit planning", plus local `uniqueTempDir`, `currentTask551TaskSnapshot` and `mutateTask551DispatchSnapshot`. New `task551AuthorAudit-drift-rounds.test.ts` owns "drift-round orchestration" and the local git fixture (`runFixtureGit`, `FixtureGitRuntime`, `withTask551GitRepo`). New `task551AuthorAudit-bounded-child.test.ts` owns "bounded child execution" and its local fake-process fixtures (`FakeProc`/`SpawnCall`, `fakeStream`, `hangingStream`, `makeFakeSpawn`, `CHILD_BASE`, the four `*_CHILD` descriptors, `DiagnosticCarrier`, `patchProcessKill`). The shared helper `tests/unit/workflows/task551AuthorAuditFixtures.ts` (not a test file) exports only `ALL_PHASES`, `fullDiscovery`, `Finding`, `completed`, `lowFinding`, `highFinding` and `currentTask551DispatchSnapshot`. Move code verbatim: names, control flow, fixture values and assertions stay byte-identical. Each file stays independently runnable in the airtight lane and at or under 700 physical lines (the <=999 L11 cap also applies).
- **Lint fix.** Rename the `use` parameter of `withTask551GitRepo` to `fixture` (declaration and its single call). This is a behaviour-neutral identifier change with no suppression and no rule weakening.
- **Import matrix (text authoritative; supersedes the :34 row and the :36 "no ... new test file is authorized" clause for these three paths only).** The union of the direct private imports across the three test files must equal the existing `task551AuthorAudit.test.ts` row exactly. `runTask551BoundedChild` (fix) is imported only by the bounded-child file; the author-audit symbols are split between the other two by use. The fixtures helper imports no matrix private symbol and reads only the public facade `lib/task-551-contract.mjs` (`TASK551_PHASE_IMPORT_CLOSURE`, `createTask551TaskGraphSnapshot`). No new private seam, declaration or facade reexport is added.
- **In-place envelope edits (this file; there is no json fence in L11, see :942).** The sidecar `ownedTests` in the TASK551_PHASE_PROVENANCE block gains the three paths (3 -> 6), so derived discovery, closed allowlists and import closure include them. The sh validation fence has the ownedTests count gate `-eq 3` -> `-eq 6` and the L11 path array 17 -> 20 with `-eq 20` (the per-path <=999 line cap covers them). The owner closure `bun test` argv gains the two new test files. Superseded prose: :15/:27-29 "fourteen ... and three existing tests" now reads "... and six test-lane paths (three existing tests, two split-out tests and one fixtures helper)"; :960 "all three existing matrix-bound tests" now reads all six test-lane paths; :961 "the three tests" now reads "the five tests".
- **Same-re-open ripple inside L11 ownership.** `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` sidecar `ownedTests` (:111-115) must mirror the six paths; `tests/unit/workflows/task551WorkflowContracts.test.ts` `expectedL11SidecarTests` (:121-125) must match them; `tests/unit/workflows/task551EvidenceContract.test.ts` (:901) reads the monolith for matrix/declaration checks and must read all three split files plus the helper so that coverage does not narrow.
- **Gates for the implementer.** `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551AuthorAudit-drift-rounds.test.ts tests/unit/workflows/task551AuthorAudit-bounded-child.test.ts` gives 40 pass / 0 fail. `./node_modules/.bin/eslint --max-warnings=0` on the four files exits 0. `wc -l` is <= 700 per file. The workflow-contract and evidence-contract suites stay green after the ripple edits. The orchestrator runs `bun run lint:repo:types`.
### Amendment (2026-09-25): contract-file cap
Recorded at HEAD `9c5b6666` (working tree) per disposition R4-16 in `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round4-dispositions.md` (:111-118). Append-only; text authoritative.
- **Why.** The sh validation fence line `awk 'NR > 999 { exit 1 } END { if (NR > 999) exit 1 }' "$task_contract"` (:974) caps THIS contract file, not a sidecar code/test path. With the R3-33 correction and the split amendment above, the contract is 1,011 physical lines, so that gate now fails. Task documents are not production modules or test files, so the AGENTS.md 1,000-line gate ("File Size and Modularity") does not apply to them.
- **In-place fence edit (:974).** Old line: `awk 'NR > 999 { exit 1 } END { if (NR > 999) exit 1 }' "$task_contract"`. New line: `awk 'NR > 1300 { exit 1 } END { if (NR > 1300) exit 1 }' "$task_contract"`. The contract-file cap is now at or under 1,300 physical lines. The per-path loop (:977) is unchanged: every one of the 20 sidecar code/test paths keeps the `NR > 999` cap (at or under 999 lines). No json fence exists in this file, so no envelope or preflight input changes.
- **Superseded sentences (text authoritative).** :963 "requires all fourteen source/declaration and three existing workflow-test paths" now reads "requires all fourteen source/declaration paths and six test-lane paths (20 paths)". :961 "the existing all-17-path `awk` line-cap gate" now reads "the all-20-path `awk` line-cap gate plus the contract-file cap of 1,300".
- **Binding ripple edits.** The three extra L11-owned edits from the split amendment are binding parts of the same re-open, not optional follow-ups: `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` sidecar `ownedTests` (:111-115, three paths at HEAD) mirrors the six paths; `tests/unit/workflows/task551WorkflowContracts.test.ts` `expectedL11SidecarTests` (:121-125, three paths at HEAD) matches them; `tests/unit/workflows/task551EvidenceContract.test.ts` (:901, reads only `./task551AuthorAudit.test.ts` at HEAD) reads all three split test files plus `task551AuthorAuditFixtures.ts`. The split is not closed until all three edits land and their suites pass.
- **Land-order precondition.** The L11 split (the three split test files, the fixtures helper and the three ripple edits) lands before TASK-551-03-L02 W0. TASK-551-03-L02 W0 must not start while the split is pending.
### Amendment (2026-09-25): task-file byte cap
Recorded at HEAD `9c5b6666` (working tree). Append-only; text authoritative. This leaf owns the dispatch parser (`_docs/_workflows/lib/task-551-dispatch-contract.mjs`, one of the fourteen sidecar source paths), so the cap decision belongs here.
- **Why.** `TASK551_MAX_TASK_FILE_BYTES` (`task-551-dispatch-contract.mjs:96`, `512 * 1024` = 524,288 bytes) is the default `max` of `requireText` (`:168-170`), which rejects any snapshot task file whose UTF-8 size exceeds it (`validateSnapshot` `:898`, error `task551_dispatch_snapshot_file_text`). `_docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md` is 522,753 bytes after five audited, dated, append-only correction rounds on one leaf (dispositions `03-l02-faza0` and `03-l02-round2`..`round5` under `_docs/_workflows/_smoke/task-551/audit-evidence/`). Superseded text is quoted and marked superseded, never deleted, so the file only grows. Its closure and receipt edits still owe bytes, and they would cross the cap. The live-graph preflight test ("author-audit preflight derives the current graph without returning source text", `task551AuthorAudit.test.ts:321`, which reads every real `TASK-551*` file via `currentTask551DispatchSnapshot` `:150-162`) and every author-audit dispatch would then fail closed.
- **Decision.** Raise the cap to 1,048,576 bytes (1 MiB). In-place source edit at `task-551-dispatch-contract.mjs:96`: old line `const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;`, new line `const TASK551_MAX_TASK_FILE_BYTES = 1024 * 1024;`. Nothing else changes: `requireText` stays the same, the per-call `max` overrides (`:175`, `:181`, `:224`, `:476`, `:533`, `:617`) stay the same, `TASK551_MAX_JSON_BYTES` (160 KiB), depth and node caps stay the same, and so do the snapshot file-count bound (`max: 128`) and path rules. The cap stays fail-closed. Only its value changes.
- **Scope classification.** This is a mechanical tooling change to workflow dispatch validation. It is not a product change: no `core/`, `admin/`, route, schema, migration, cache or runtime file is touched, and no product behaviour, security invariant or envelope changes. The sh validation fence, the TASK551_PHASE_PROVENANCE block, `ownedTests`, allowlists and import closure stay byte-identical. The line counts of the fourteen source paths are unchanged (one line is edited in place).
- **Binding pin list (grep-verified 2026-09-25 over `tests/unit/workflows` and `_docs/_workflows` for `524288`, `524_288`, `512 * 1024`, `512 KiB` and `TASK551_MAX_TASK_FILE_BYTES`, `_archive` excluded).** (1) `_docs/_workflows/lib/task-551-dispatch-contract.mjs:96`: the definition, re-pinned as above. `:168` references the constant by name, so it has no literal to change. (2) `tests/unit/workflows/*`: zero literal pins. No test asserts 524,288 or the constant, so no test is re-pinned. (3) `_docs/_workflows/_smoke/task-551/impl-07-l01.json:125`: a historical 07-L01 receipt note, quoted: "dispatch tooling cap 512 KiB per task file — well under". The receipt is immutable evidence of the cap in force when it was written, so it stays byte-identical and is superseded for the current value by this amendment. (4) `_docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md:6618-6620` (round-5 "Size note"; owned by 03-L02, outside this leaf's write scope), quoted: "**Size note.** This file is now within ~1.5 KB of the 512 KiB `TASK551_MAX_TASK_FILE_BYTES` cap (`task-551-dispatch-contract.mjs:96`, checked `:168-170`); a further round needs a split first." It is superseded: the cap is 1 MiB and a further round does not need a split first while the file stays at or under 1,048,576 bytes. The 03-L02 owner mirrors this in its next append-only section. Other `1_048_576` literals in `_docs/_workflows` (for example `task-551-contract.mjs:708`, `task-551-evidence-contract.mjs:224`, `task-551-evidence-filesystem.mjs:13`) are unrelated output and evidence caps and are not pins of this value.
- **Regression test (same re-open).** Add one boundary test next to the live-graph preflight test in `tests/unit/workflows/task551AuthorAudit.test.ts`. It takes `currentTask551DispatchSnapshot()`, replaces one task file's `text` with a string of exactly 1,048,577 UTF-8 bytes, and expects `preflightTask551AuthorAuditDispatch` to throw `/snapshot_file_text/`. The unmodified live graph (which includes the 522,753-byte 03-L02 file) must keep passing the existing preflight test. After the split amendment above lands, the test stays in `task551AuthorAudit.test.ts`, which stays at or under 700 lines. It imports no new matrix private symbol.
- **Gate.** Airtight DB-free run of the pinned suites: `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/workflows/task551AuthorAudit.test.ts tests/unit/workflows/task551AuthorAudit-drift-rounds.test.ts tests/unit/workflows/task551AuthorAudit-bounded-child.test.ts tests/unit/workflows/task551WorkflowContracts.test.ts tests/unit/workflows/task551EvidenceContract.test.ts` must end with 0 fail. Before the split lands, run the pre-split `task551AuthorAudit.test.ts` in place of the three split files. Also run `./node_modules/.bin/eslint --max-warnings=0` on the touched source and test file, which must exit 0. The orchestrator runs `bun run lint:repo:types`.
### Amendment v3 (2026-09-25): re-open scope after pre-audit
Recorded at HEAD `9c5b6666` (working tree) from orchestrator decisions verified against two independent pre-implementation audits. Append-only; text authoritative. It SUPERSEDES the three earlier 2026-09-25 amendments above ("line gate and lint for the re-pinned suite", "contract-file cap", "task-file byte cap") wherever they conflict; every superseded sentence is quoted in **V3-8**. Everything those amendments say that is not quoted there stays binding (for example the `use` -> `fixture` lint rename, verbatim moves, the <= 700-line AuthorAudit cap, the land-before-03-L02-W0 precondition, and the byte-cap scope classification).
- **Line anchors.** Every `:NNN` anchor in this amendment and in the earlier sections uses the pre-v3 numbering. This amendment edits two fences in place: it inserts 12 lines in the ts provenance fence after :83 (five `ownedFiles` rows; `ownedTests` goes from 6 to 13 rows), and it replaces the single sh loop line :977 with three lines. So a pre-v3 anchor in :84-:977 is now at +12, and an anchor at :978 or later is now at +14.
- **In-place fence edits made here (binding).** (1) In the ts fence, the sidecar `ownedFiles` gains `_docs/_workflows/lib/task-551-dispatch-primitives.mjs`, `_docs/_workflows/lib/task-551-dispatch-envelope.mjs`, `_docs/_workflows/lib/task-551-phase-provenance.mjs`, `_docs/_workflows/lib/task-551-worktree-snapshot.mjs` and `_docs/_workflows/lib/task-551-l01-barrier.mjs`, appended in that order after the fourteen existing rows (14 -> 19). The sidecar `ownedTests` becomes the thirteen **V3-2** paths in table order (6 -> 13). (2) In the sh fence, the `ownedFiles` count gate `-eq 14` becomes `-eq 19`, the test-lane count gate `-eq 6` becomes `-eq 13`, the path array becomes the 32 paths (19 + 13) with `-eq 32`, and the per-path loop becomes the debt-aware loop in **V3-1f**. The owner closure `bun test` argv lists the nine **V3-2** test files. The contract-file cap line (:974) is described in **V3-7**.

**V3-1 Line-gate cascade (AGENTS.md "File Size and Modularity": split before adding behaviour).** Every human-authored sidecar code/test file that this re-open TOUCHES must end at or under 1,000 physical lines. The L11 caps are stricter: <= 999 for source/declaration/helper modules and <= 800 for test files. The three AuthorAudit test files keep the earlier <= 700 cap. Splits are by cohesive responsibility. Code moves verbatim: names, control flow, fixture values and assertions stay byte-identical. The only edits are `export`/`import` lines, the edits named in **V3-3**/**V3-4**, and the lint rename. Every extracted test file must run on its own in the airtight lane.
- **V3-1a `lib/task-551-dispatch-contract.mjs` (1,054 lines; touched by the byte cap).** It is split into a facade plus two lib-private siblings. The facade keeps every current export name. At HEAD that is exactly one name, `preflightTask551DispatchSnapshot` (:1052). The only importer, `task-551-author-audit.mjs:24`, stays byte-identical. The mandate's example split (envelope module + graph module) was adjusted: a graph sibling would import primitives back from the facade, and that would make a cycle. So the shared primitives go into a leaf module. The function->module map (pre-v3 source lines, grep-verified):

| Target module | Moves from `task-551-dispatch-contract.mjs` | Exports (lib-private except the facade row) | Est. lines |
|---|---|---|---|
| `lib/task-551-dispatch-primitives.mjs` (new leaf; no import) | `TASK551_GRAPH_SCHEMA`, `TASK551_ENVELOPE_SCHEMA` :10-11; caps `TASK551_MAX_TASK_FILE_BYTES`, `TASK551_MAX_JSON_BYTES`, `TASK551_MAX_JSON_DEPTH`, `TASK551_MAX_JSON_NODES` :96-99; `fail` :103, `ownKeys` :107, `requireOwnDataRecord` :115, `requireJsonRecord` :140, `requireOwnDataArray` :144, `utf8Bytes` :164, `requireText` :168, `requireLiteralId` :174, `requireRepoPath` :180, `requireUniqueStrings` :195, `requireExactSequence` :207, `deepFreeze` :216, `parseDuplicateKeyAwareJson` :223-361, `requireNodeId` :465-468 | every moved name | ~290 |
| `lib/task-551-dispatch-envelope.mjs` (new; imports primitives and `requireTask551L02WorkflowCompatibilityExtensions` from the worktree-compatibility facade, the import moved from :8) | key/enum constants :16-63 (`TASK551_ENVELOPE_KEYS`, `_PARENT_KEYS`, `_COMMAND_KEYS`, `_OCCURRENCE_KEYS`, `_SUBGATE_KEYS`, `_CLASSIFIER_BARRIER_KEYS`, `_REVIEW_BARRIER_KEYS`) and :71-95 (`TASK551_OCCURRENCE_IDS`, `_LANES`, `_ENVIRONMENT_PROFILES`, `_ARTIFACT_POLICIES`); `requirePathList` :460, `requireCommandId` :469, `requireLiteralArgv` :473, `normalizePositiveDiscovery` :492, `normalizeEnvironmentOverrides` :517, `normalizeCommand` :540, `normalizeOccurrence` :568, `normalizeClassifierBarrier` :589, `normalizeReviewBarrier` :605, `normalizeSubgate` :639, `normalizeEnvelopeSubgates` :668, `normalizeEnvelope` :720-826 | `normalizeEnvelope` | ~460 |
| `lib/task-551-dispatch-contract.mjs` (facade; imports primitives + envelope) | header :1-7; `TASK551_SNAPSHOT_KEYS`, `_TASK_FILE_KEYS`, `_GRAPH_KEYS`, `_GRAPH_NODE_KEYS` :12-15; `TASK551_ALLOWED_STATUSES` :64-70; `TASK551_TASKS_PREFIX`, `TASK551_FENCED_JSON` :100-101; `collectTask551JsonFences` :362, `readSingleMarkdownField` :383, `expectedTaskIdFromPath` :390, `readTask551Metadata` :400-459; `normalizeGraph` :827-880; `validateSnapshot` :881-902; `reconcileTask551Dispatch` :903-1051 | `preflightTask551DispatchSnapshot` :1052-1054 (unchanged) | ~380 |

- **V3-1b `lib/task-551-worktree-compatibility.mjs` (1,725 lines). This is a cascade the orchestrator decisions did not list; flagged for orchestrator verification.** This re-open must touch the file. It holds the source `TASK551_PHASE_PROVENANCE` (:91-241), so it must gain the five sidecar `ownedFiles` rows and mirror the thirteen `ownedTests`. That mirror was already a binding ripple of the earlier split amendment (:1010, :1017). So the same rule applies: split first, then edit. The facade must keep exactly its current 61 export names (29 provenance, 9 compatibility, 14 snapshot, 3 barrier, 4 named-closure, 2 L02-subgate), re-exported from the siblings, and must add no name. `task-551-contract.mjs` uses both `import * as worktree` (:18) and a named import list (:43-101), so the namespace key set must stay identical. Sibling helper exports are not re-exported. All four modules keep the ":1-2 no filesystem, database, L02, or target-module import" rule; only `node:crypto`/`node:util` are allowed. Map (pre-v3 lines):

| Target module | Moves from `task-551-worktree-compatibility.mjs` | Est. lines |
|---|---|---|
| `lib/task-551-phase-provenance.mjs` (new leaf; `node:crypto`, `node:util`) | primitives :7-88 (`encoder`, `SHA256`, `PREFIXED_NONZERO_SHA256`, `READ_ONLY_MAPS`, `freeze`, `sortUnique`, `digest`, `ownData`, `plainArray`, `readOnlyMap`, `phase`); `TASK551_PHASE_PROVENANCE` :90-241; `TASK551_DEFERRED_LITERAL_TARGETS`/`_PATHS` :242-276; projections, L01 barrier input/exclusion lists, 05-L02 getters, `deriveTask551ClosedWorktreeSet`, `deriveTask551L01MaterializationClosedSet` :277-380; `normalizeTask551RepoPath`, `requireTask551LiteralUniquePaths`, `requireTask551WorktreeCompatibilityIntegrity` :381-450; `DEPENDENCIES`, `task551DependenciesThrough`, `task551FullProvenanceClosureForSpawn`, `exactSorted`, `requireExactDiscoveredPaths`, `requireExactClosedPaths` :451-488; plus `TASK551_PLANNED_BUN_PATHS` :495-505. That list moves here from the compatibility block because the snapshot and barrier modules consume it, and leaving it in the facade would be a cycle. | ~505 |
| `lib/task-551-worktree-snapshot.mjs` (new; imports provenance) | `PATH_DIGEST_KEYS` .. `predecessors` :638-878 and `predecessorPaths` .. `requireExactActivePhaseSnapshotBeforeSpawn` :904-1083 (the task-graph digest, current-worktree/snapshot digests, pre-spawn/materialized/predecessor/active fences) | ~440 |
| `lib/task-551-l01-barrier.mjs` (new; imports provenance + snapshot) | classifier barrier constants :879-903 (`TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS`, `MANIFEST_PATH`, `FOUR_TEST_ARGV`, `CLASSIFIER_ARGV`, `POST_RECEIPTS`, `L03_ROW`); `exactStrings` .. `requireTask551L01MaterializationBarrierBeforeL02` :1084-1511 | ~475 |
| `lib/task-551-worktree-compatibility.mjs` (facade; imports all three) | header :1-2; compatibility descriptor/receipt :489-637 without `TASK551_PLANNED_BUN_PATHS`; named closures :1512-1594; L02 subgates :1595-1725 (`MANIFEST_PATH` now imported from the barrier module) | ~445 |

- **V3-1c Import-closure consequences (binding).** (1) Private production edges. Superseding the :31 edge list, they are exactly: facade -> evidence helper -> filesystem companion; facade -> worktree-compatibility facade; worktree-compatibility facade -> phase-provenance, worktree-snapshot and l01-barrier; worktree-snapshot -> phase-provenance; l01-barrier -> phase-provenance and worktree-snapshot; author-audit -> dispatch facade; dispatch facade -> dispatch-primitives and dispatch-envelope; dispatch-envelope -> dispatch-primitives and the worktree-compatibility facade (immutable descriptors only); implement -> author-audit (broker); implement -> fix (adapter); implement -> L02-subgate executor; and the sole outer-root literal `implement -> reviewedPairOwnerHost -> reviewedPairTransition`. No sibling imports its own facade, so the graph stays acyclic. No new module imports L02, a host, a deferred target, fs, or a DB. (2) Sidecar path arrays that must stay identical in order: ts fence `ownedFiles`, source `TASK551_PHASE_PROVENANCE[0]` (now in `task-551-phase-provenance.mjs`), `expectedL11SidecarPaths`/`expectedL11SidecarTests` (now in `task551WorkflowContractsFixtures.ts`), and the sh array. The compatibility descriptor copies `ownedFiles`, so `receipt.sidecarPaths` becomes these nineteen. `sidecarClosureSha256` changes deterministically, and the test recomputes it from the frames (:1452-1475, :1514), so no vector is re-pinned. (3) Read-only import guards: the owner-host no-import scan list (`task551WorkflowContracts.test.ts:1846-1855`, moving to `workflowContractsBootstrap.test.ts`) gains the five new lib modules. The author-audit edge assertions `task551AuthorAudit.test.ts:362-363` stay as they are, because author-audit still imports only the dispatch facade and the public facade still does not. (4) SHA-256 pins, verified: `task-551-worktree-compatibility.mjs:1502-1508` is a runtime comparison of the current manifest digest and `afterWorktreeDigest` inside `requireTask551L01MaterializationBarrierBeforeL02`. It does not pin sidecar source bytes, so moving the code verbatim into `task-551-l01-barrier.mjs` keeps it. The only literal digests in the sidecar tests are the 15 logical-argv vectors (`task551WorkflowContracts.test.ts:136-295`), and those are independent of source paths. The only source literal (`task-551-contract.mjs:349`) is the L04 archive hash. No sidecar source byte is pinned anywhere, and no generic barrier or receipt hashes sidecar bytes.
- **V3-1d Test-file split table.** Each row lists the pre-v3 source ranges and the direct private runtime imports. The rows' union per suite equals the old :34-:36 row exactly.

| New/kept file | Content moved verbatim (pre-v3 lines) | Tests | Direct private imports (symbols) | Cap / est. |
|---|---|---|---|---|
| `task551AuthorAudit.test.ts` (kept) | describes "research grounding and audit scopes" :258-510, "clean-round rule" :511-609, "targeted re-audit planning" :610-642; local `currentTask551TaskSnapshot` :165-174, `mutateTask551DispatchSnapshot` :175-189; + the three **V3-4** cap tests after :321 | 18 + 3 = 21 | author-audit: `TASK551_RECONCILE_SCOPE`, `deriveTask551AuditScopes`, `evaluateTask551DriftRound`, `normalizeTask551AuditResult`, `planTask551Reaudit`, `preflightTask551AuthorAuditDispatch`, `requireTask551AuthoredScope`, `requireTask551ResearchGrounding`, `runTask551AuthorAuditWorkflow` | 700 / ~500 |
| `authorAuditDriftRounds.test.ts` (new) | "drift-round orchestration" :643-1012; git fixture `runFixtureGit` :190, `FixtureGitRuntime` :195, `withTask551GitRepo` :205-257 (param `use` -> `fixture`) | 12 | author-audit: `deriveTask551AuditScopes`, `requireTask551ProductionDispatchTaskSnapshot`, `requireTask551TestDispatchTaskSnapshotForTests`, `runTask551AuthorAuditWorkflow`, `runTask551AuthorAuditWorkflowForTests`, `runTask551DriftAuditRound` (facade `createTask551TaskGraphSnapshot` for :765) | 700 / ~470 |
| `authorAuditBoundedChild.test.ts` (new) | "bounded child execution" :1021-1241; fake process :71-146 (`FakeProc`, `SpawnCall`, `fakeStream`, `hangingStream`, `makeFakeSpawn`, `CHILD_BASE`, the four `*_CHILD`), `DiagnosticCarrier`/`patchProcessKill` :1013-1020 | 10 | fix: `runTask551BoundedChild` | 700 / ~320 |
| `task551AuthorAuditFixtures.ts` (new helper) | `ALL_PHASES`, `fullDiscovery`, `Finding`, `completed`, `lowFinding`, `highFinding` :40-70; `uniqueTempDir` :147-149 (used by main :316 and by `withTask551GitRepo` :212); `currentTask551DispatchSnapshot` :150-164 | 0 | none; the facade import is only `TASK551_PHASE_IMPORT_CLOSURE` (no unused `createTask551TaskGraphSnapshot`) | 999 / ~70 |
| `task551WorkflowContracts.test.ts` (kept) | describe "TASK-551 current-worktree snapshot contract" :1206-1444; local `Equal`/`Assert` :91-95 | 7 | none | 800 / ~300 |
| `workflowContractsBootstrap.test.ts` (new) | describe "TASK-551 L11 compatibility bootstrap and generic barrier" :1445-2088; local `MutableLogicalReceipt`/`MutableCommandReceipt` :76-90 | 7 | fix: `requireTask551CommandReceiptV1`, `requireTask551LogicalArgvPreimageV1`, `runTask551BoundedChild` (the `runTask551ImplementWorkflow` token at :1866 is string text, not an import) | 800 / ~725 |
| `workflowContractsSubgates.test.ts` (new) | describe "TASK-551 L02 injected subgates" :2089-2265 | 4 | implement: `runTask551ImplementWorkflowForTests` | 800 / ~220 |
| `workflowContractsImplementation.test.ts` (new) | describe "TASK-551 implementation workflow" :2266-2779 | 7 | implement: `deriveTask551ImplementLandOrder`, `runTask551ImplementWorkflow`, `runTask551ImplementWorkflowForTests` | 800 / ~565 |
| `task551WorkflowContractsFixtures.ts` (new helper) | preamble :74-75, :96-129 (`Digest`, `FileState`, `Worktree`, `expectedL11SidecarPaths`, `expectedL11SidecarTests`, `sha`, `shaBytes`, `evidenceDigest`), logical-argv vectors :130-313, barrier/worktree fixtures :314-516 (`freezeTestValue` .. `barrierFixtures`) | 0 | none (facade only) | 999 / ~470 |
| `task551WorkflowExecutionFixtures.ts` (new helper; imports the fixtures helper) | preamble :517-1205 (L02 evidence builders, `workflowRepoRoot`/`workflowDiscovery`/`workflowGit`, `executionFixture`, `runL03Completion`, `l02ExecutionFixture`, `l02States`, `classifierResult`, `l02EvidenceInput`, every `task489*` builder) | 0 | author-audit: `requireTask551TestDispatchTaskSnapshotForTests`, `runTask551AuthorAuditWorkflowForTests`; implement: `createTask551TestExecutionSession`, `deriveTask551ImplementLandOrder`, `runTask551ImplementWorkflowForTests`; fix: `runTask551BoundedChild` (uses :724-1135) | 999 / ~735 |
| `task551EvidenceContract.test.ts` (kept) | describes "terminal committed-HEAD handoff verifier" :152-260, "owner-private durable writer and evidence-root recovery" :261-429, "strict canonical rows and recovery boundaries" :430-457; local terminal types/builders :45-84, :94-151; `evidenceTestHarness`, `writerEvidenceValue`, `staticWriterEvidenceValue` :767-801 | 17 | implement: `publishTask551PhaseEvidence`; evidence-contract: `createTask551EvidenceTestHarnessForTests` | 800 / ~465 |
| `evidenceContractMatrix.test.ts` (new) | describe "TASK-551 evidence decoder and L10 projection" :802-1170 (includes the matrix test :883-986); local `MutableEvidence` .. `requireMutableEvidence` :29-44, `projectionInput` :761-766 | 5 | none (at :937/:950 the private names are string literals) | 800 / ~415 |
| `task551EvidenceContractFixtures.ts` (new helper) | `sha` .. `evidenceRoot` :23-28, `processReceipt` :85-93, `adminStatementIds` .. `evidenceValueFor` :458-760 | 0 | none (facade only) | 999 / ~335 |

- **V3-1e Suite totals.** At HEAD the three suites hold 40 + 25 + 22 = 87 tests with zero skip/only/todo. After the re-open they hold 43 + 25 + 22 = 90: the moves keep all 87 and add exactly the three **V3-4** tests.
- **V3-1f Pre-existing line debt and the sh-fence loop.** Grep-verified before v3: 10 of the 20 fenced paths are above 999 lines (7 sources: evidence-contract 1,562, evidence-filesystem 1,014, worktree-compatibility 1,725, dispatch-contract 1,054, author-audit 1,039, implement 1,844, fix 1,459; 3 tests: 1,241, 2,779, 1,170), and 3 of them are absent (the earlier split's new paths). So 13 of 20 fail today, not the "9 of 20" in the orchestrator seed. After v3, the paths still above 999 are only the five UNTOUCHED sources `lib/task-551-evidence-contract.mjs`, `lib/task-551-evidence-filesystem.mjs`, `task-551-author-audit.mjs`, `task-551-implement.mjs` and `task-551-fix.mjs`. They are recorded pre-existing debt: the next TASK-551-11 change that touches one of them must first split it to <= 999, and none of them may grow in this re-open. The amended loop keeps the presence/regular/non-symlink check for all 32 paths. It enforces `NR > 999` for the 27 other paths (the 7 already-compliant paths `lib/task-551-contract.mjs` 721, `lib/task-551-l02-subgate-executor.mjs` 206, `lib/task-551-contract.d.mts` 647, `task-551-author-audit.d.mts` 121, `task-551-implement.d.mts` 32, `task-551-fix.d.mts` 21, `lib/task-551-evidence-contract.d.mts` 24; the 7 split sources; the 4 helpers) and `NR > 800` for the 9 `*.test.ts` paths. It skips the length check only for the 5 named debt paths, and each debt path must be a member of the 32-path array.

**V3-2 Naming (binding).** Every NEW test file carries no `task551` token. `scripts/task551QueryInventory/bunLane.ts:37-43` closes the non-planned `task551` lane-test list to five paths, and `:220-221` (`task551ManifestSlice`) treats any other manifest row whose path contains `task551` as an unplanned stray. The six new test files are `authorAuditDriftRounds.test.ts`, `authorAuditBoundedChild.test.ts`, `workflowContractsBootstrap.test.ts`, `workflowContractsSubgates.test.ts`, `workflowContractsImplementation.test.ts` and `evidenceContractMatrix.test.ts` (all under `tests/unit/workflows/`; none exists today). The three monolith names are kept, so the closed five-path list and its TASK-551-01-L01 mirror (`TASK-551-01-L01…md:1758-1759`) stay valid. Helper modules are not `*.test.ts`, so they never become classifier rows (`scripts/bun-lane-classify.ts:6`) and may keep the token. The thirteen sidecar `ownedTests`, in order: `task551AuthorAudit.test.ts`, `authorAuditDriftRounds.test.ts`, `authorAuditBoundedChild.test.ts`, `task551AuthorAuditFixtures.ts`, `task551WorkflowContracts.test.ts`, `workflowContractsBootstrap.test.ts`, `workflowContractsSubgates.test.ts`, `workflowContractsImplementation.test.ts`, `task551WorkflowContractsFixtures.ts`, `task551WorkflowExecutionFixtures.ts`, `task551EvidenceContract.test.ts`, `evidenceContractMatrix.test.ts`, `task551EvidenceContractFixtures.ts`. The earlier names `task551AuthorAudit-drift-rounds.test.ts` and `task551AuthorAudit-bounded-child.test.ts` are retired. Neither was ever created. The six new test files are ordinary planned-lane manifest rows, owned by the classifier and not by L11.

**V3-3 Derived pins re-baselined (binding; contract-named re-baseline, not a weakened assertion).**
- `task551WorkflowContracts.test.ts:1502-1505` (moves to `workflowContractsBootstrap.test.ts`): `[expectedL11SidecarPaths.length + expectedL11SidecarTests.length, receipt.sidecarPaths.length]` goes from `[17, 14]` to `[32, 19]`. Arithmetic: `ownedFiles` 14 + 5 new lib modules = 19; `ownedTests` 3 + 6 new test files + 4 helpers = 13; 19 + 13 = 32.
- `:1506-1511`: the all-phase `ownedFiles + ownedTests` total goes from `79` to `94`. Arithmetic: sidecar 19 + 13 = 32; l01 22 + 3 = 25; l03 1 + 1 = 2; l04 1 + 1 = 2; l02 24 + 5 = 29; 05-l02 2 + 2 = 4. 32 + 25 + 2 + 2 + 29 + 4 = 94. The HEAD value 79 = 17 + 25 + 2 + 2 + 29 + 4 was verified at runtime from the source provenance.
- `expectedL11SidecarPaths` (:105-120) gains the five lib paths in fence order. `expectedL11SidecarTests` (:121-126) becomes the thirteen **V3-2** paths. Both move to `task551WorkflowContractsFixtures.ts`.
- `task551EvidenceContract.test.ts:896-907` (reads, incl. :901) / `:969-981` (the matrix test, moving to `evidenceContractMatrix.test.ts`) reads all 13 test-lane paths. Its `privateImports` expectation becomes one sorted specifier row per file, in **V3-2** order: `[author-audit]`, `[author-audit]`, `[fix]`, `[]`, `[]`, `[fix]`, `[implement]`, `[implement]`, `[]`, `[author-audit, fix, implement]`, `[lib/evidence-contract, implement]`, `[]`, `[]`. Each per-suite union equals the old row: AuthorAudit `{author-audit, fix}`, WorkflowContracts `{author-audit, fix, implement}`, Evidence `{lib/evidence-contract, implement}`. The symbol-level matrix in **V3-1d** supersedes :34-:36 for these thirteen paths. It adds no private seam, declaration, facade reexport, or owner bridge.
- The ts fence `ownedFiles`/`ownedTests` and the sh-fence counts (`-eq 19`, `-eq 13`, `-eq 32`, debt `-eq 5`) are edited in place above. The source provenance literal must equal the ts fence byte-for-byte in path order.

**V3-4 Byte cap (binding).** `TASK551_MAX_TASK_FILE_BYTES` becomes `1024 * 1024` (= 1,048,576). The line text is as in the byte-cap amendment. Step 2 then moves it verbatim, with `export`, into `lib/task-551-dispatch-primitives.mjs`. Three new tests go in `task551AuthorAudit.test.ts`, "research grounding and audit scopes", right after the live-graph preflight test (:321). They use one local builder, `padTask551TaskFileToBytes(snapshot, suffix, bytes)`. The builder copies the live snapshot and, for the entry whose path ends with `TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md`, appends `"\n" + "x".repeat(bytes - utf8(text) - 1)`. It throws when the padding count is negative or the entry is missing. The padded text stays a valid task file (same H1/FileName/status/fences). So when it fails, it fails only on size.
- T1 "accepts a task file of exactly 1,048,576 UTF-8 bytes and pins the cap literal". The owning source (step 1: `lib/task-551-dispatch-contract.mjs`; from step 2 on: `lib/task-551-dispatch-primitives.mjs`) matches `/^(?:export )?const TASK551_MAX_TASK_FILE_BYTES = 1024 \* 1024;$/mu` exactly once. From step 2 on, the dispatch facade and envelope sources contain no definition. The padded entry has `Buffer.byteLength(text, "utf8") === 1_048_576`, and `preflightTask551AuthorAuditDispatch(padded)` returns the same `inventory` as the live test.
- T2 "rejects a task file of 1,048,577 UTF-8 bytes": the same builder at 1,048,577 throws `/task551_dispatch_snapshot_file_text/`.
- T3 "accepts the live 03-L02 task file". The live snapshot contains the 03-L02 entry. Its UTF-8 length is `>= 522_753`, the size measured on 2026-09-25; the file is append-only, so it never shrinks. The length is also `<= 1_048_576`, and the unmodified live snapshot passes preflight.
- T1 plus T2 pin the effective value exactly, and T1 pins the literal. So the constant is asserted by value, not only by the behaviour between the old and new caps. No other cap, per-call `max` override, JSON bound, or file-count bound changes.

**V3-5 Ripples outside TASK-551-11 (handoffs; L11 edits none of these files).**
- **TASK-551-10-L02 (owner: 10-L02 closure).** The closure command `TASK-551-10-L02…md:1178` and its envelope argv plus `positiveDiscovery.paths` (:1320-1322) must list all nine **V3-2** test files. Today they list only the three monolith paths, and that would narrow coverage. 10-L02 mirrors this in its next append-only section.
- **TASK-551-03-L02 (owner: 03-L02).** Precondition 5 (C13 v4, `TASK-551-03-L02…md:6483-6485`) and the C14 v4 row "TASK-551-11 split (R4-12, R4-16)" (:6545-6547) STAY. The L11 split must land before W0, and the TASK-551-11 receipt addendum below records it. For 03-L02, "the split landed" means v3 steps 1-5 are all green. The 03-L02 ripple anchors `task551WorkflowContracts.test.ts:121-125` and `task551EvidenceContract.test.ts:901` (:6575-6576) now resolve to `task551WorkflowContractsFixtures.ts` (`expectedL11SidecarTests`) and `evidenceContractMatrix.test.ts` (the matrix test). 03-L02 corrects these anchors in its next append-only section. They are not binding on L11.
- **TASK-551-01-L01 FINAL (owner: 01-L01).** `tests/bun-lane-manifest.json` is reported red at HEAD (orchestrator audit; not re-run here). Its regeneration is owed to TASK-551-01-L01 FINAL through the single classifier run. L11 never edits it (:307 "L11 does not edit that file"). The six new test files join it as ordinary planned-lane rows, and helpers are not rows. No `task551` slice or closed-list change is needed.

**V3-6 Land order and per-step gates (binding).** Order: 1 byte cap -> 2 dispatch-contract split -> 3 worktree-compatibility split -> 4 test splits -> 5 pin re-baselines -> receipt. One writer per step. Each step starts from the on-disk result of the step before.
- Step 1: change the constant (:96); add T1-T3 to the pre-split `task551AuthorAudit.test.ts`; and apply the `use` -> `fixture` rename (:205-257) now, so that the step-1 eslint gate can pass. The rename was pulled forward from the split and is behaviour-neutral.
- Step 2: the V3-1a dispatch split, plus the T1 source-path update to `dispatch-primitives.mjs`.
- Step 3: the V3-1b worktree-compatibility split.
- Step 4: the V3-1d moves, plus the matrix test's thirteen-path read and privateImports rows. Those rows ride with step 4 because the matrix test reads the split files and would otherwise go red.
- Step 5: `ownedFiles` +5 and `ownedTests` 13 in `task-551-phase-provenance.mjs`; `expectedL11SidecarPaths`/`Tests`; `[32, 19]`; `94`; the owner-host scan list +5.
- Gates after EVERY step:
  - The airtight run `env DATABASE_URL=postgresql://127.0.0.1:1/none bun --env-file=/dev/null test <all sidecar suites present at that step>`: 0 fail, 0 skip, and exactly 90 tests from step 1 on. Before step 4 that is 43 + 25 + 22 over the three monoliths; from step 4 on, it is the nine V3-2 files.
  - `./node_modules/.bin/eslint --max-warnings=0 <files touched in the step>` exits 0.
  - `wc -l` meets the V3-1 caps for every file the step creates or finishes splitting. A file touched in step 1 and split later is gated at its split step. At re-open closure every touched file meets its cap.
  - Export-surface parity: `bun -e` prints the sorted `Object.keys` of the dispatch facade (step 2: 1 name) and of the worktree-compatibility facade and `task-551-contract.mjs` (step 3: 61 names; contract unchanged), and the digests must equal the pre-step values.
  - The family preflight: `preflightTask551DispatchSnapshot` over all `TASK-551*` files, `sourceHead` `9c5b6666`, with inventory 41/11/29/33.
  - After step 5, the complete sh fence (:964-981) and `git diff --check`.
  - The orchestrator runs `bun run lint:repo:types` after steps 2, 3 and 5.
- **Receipt.** The TASK-551-11 receipt `_docs/_workflows/_smoke/task-551/impl-11-classifier-gate.json` gets an addendum: exactly one new last top-level key `"reopenV3Addendum"`, with every existing key and value unchanged. It records the HEAD, this amendment, and for each step the command, exit code, pass/fail/test counts, touched-file line counts, and export-parity digests. It also records the five debt paths and the three handoffs. This is the only receipt write the re-open is allowed to make.

**V3-7 Contract-file cap.** After this amendment the contract is under 1,300 physical lines, so the sh-fence contract cap (:974, `NR > 1300`) stays as it is and is not raised.

**V3-8 Superseded sentences (quoted; text authoritative).**
- :15 "fourteen workflow/declaration modules and three existing tests", together with the earlier amendment's reading at :1009 "... and six test-lane paths (three existing tests, two split-out tests and one fixtures helper)", now reads "nineteen workflow/declaration modules and thirteen test-lane paths (nine test files and four helpers)". The same count change applies to :37 "closed fourteen-source/declaration/three-test list", :40 "exactly the ordered fourteen sidecar `ownedFiles`" (now nineteen), and :42 "every fourteen sidecar path" (now nineteen). The :27-29 ownership list and the :34-:36 matrix rows are replaced by the V3-2 list and the V3-1d table.
- :19 describes `task-551-worktree-compatibility.mjs` as holding "... and extracted worktree/barrier algorithms"; that responsibility is now the facade plus `task-551-phase-provenance.mjs`, `task-551-worktree-snapshot.mjs` and `task-551-l01-barrier.mjs`, under the same no-fs/DB/L02 rule. :21 "(strict task-contract parser helper)" is now the dispatch facade plus `task-551-dispatch-primitives.mjs` and `task-551-dispatch-envelope.mjs`.
- :31 "`task-551-dispatch-contract.mjs` alone owns strict own-data task-file snapshots, duplicate-key-aware JSON, graph/envelope preflight, and frozen non-source projections; it may call worktree compatibility only with immutable descriptors." now reads "the dispatch facade and its two siblings alone own …; only `task-551-dispatch-envelope.mjs` calls worktree compatibility, with immutable descriptors only". The :31 sentence "The only production/composition private module edges are facade -> evidence helper -> filesystem companion, facade -> worktree compatibility, dispatch -> worktree compatibility (immutable descriptors only), …" is replaced by the V3-1c(1) edge list.
- :36 "no bridge declaration, additional owner bridge, central ambient declaration, other private import, or new test file is authorized". "New test file" is lifted only for the ten V3-2 additions.
- :813 "owns exactly 79 code/test paths (`sidecar/l01/l03/l04/l02/05-l02`), including the sidecar's fourteen source/declaration modules and three existing tests" now reads "owns exactly 94 code/test paths …, including the sidecar's nineteen source/declaration modules and thirteen test-lane paths".
- :960 "all fourteen source/declaration paths and all three existing matrix-bound tests are <=999 physical lines (stronger than the repository <=1,000 gate)" now reads as V3-1 and V3-1f: the 5 named debt paths are length-exempt until touched; tests are <= 800 (AuthorAudit <= 700); all other paths are <= 999. :961 "The three tests use only the exact test-only matrix above", read earlier as "the five tests", now reads "the nine test files and four helpers use only the V3-1d matrix". :961 "all three named Bun tests", in the same sentence, now reads "all nine V3-2 test files".
- :1006 "**Split (40 tests preserved: 18 + 12 + 10).**" now reads 43 (21 + 12 + 10, including T1-T3). In the same bullet, "plus local `uniqueTempDir`, `currentTask551TaskSnapshot` and `mutateTask551DispatchSnapshot`" loses `uniqueTempDir`, which moves to the helper. "New `task551AuthorAudit-drift-rounds.test.ts` owns" now names `authorAuditDriftRounds.test.ts`, and "New `task551AuthorAudit-bounded-child.test.ts` owns" now names `authorAuditBoundedChild.test.ts`. The helper "exports only `ALL_PHASES`, `fullDiscovery`, `Finding`, `completed`, `lowFinding`, `highFinding` and `currentTask551DispatchSnapshot`" now also exports `uniqueTempDir`.
- :1008 "The fixtures helper imports no matrix private symbol and reads only the public facade `lib/task-551-contract.mjs` (`TASK551_PHASE_IMPORT_CLOSURE`, `createTask551TaskGraphSnapshot`)." now reads "`TASK551_PHASE_IMPORT_CLOSURE` only". `createTask551TaskGraphSnapshot` is imported directly by the main file and by `authorAuditDriftRounds.test.ts`.
- :1009 "gains the three paths (3 -> 6)", "`-eq 3` -> `-eq 6` and the L11 path array 17 -> 20 with `-eq 20` (the per-path <=999 line cap covers them)" and "The owner closure `bun test` argv gains the two new test files" now read as V3-2, V3-3 and V3-1f: 3 -> 13, the array is 32, the loop is debt-aware, and the argv lists nine files. The :961 reading "the five tests" is superseded by the nine V3-2 test files.
- :1010 and :1017 "`_docs/_workflows/lib/task-551-worktree-compatibility.mjs` sidecar `ownedTests` (:111-115 …) mirrors the six paths; … `expectedL11SidecarTests` (:121-125 …) matches them; `task551EvidenceContract.test.ts` (:901 …) reads all three split test files plus `task551AuthorAuditFixtures.ts`" now reads: the provenance literal (now in `task-551-phase-provenance.mjs`) mirrors the thirteen V3-2 paths; `expectedL11SidecarTests` (now in `task551WorkflowContractsFixtures.ts`) matches them; and the matrix test (now in `evidenceContractMatrix.test.ts`) reads all thirteen.
- :1011 "gives 40 pass / 0 fail", in the gate command over the old split names, now reads as the V3-6 airtight gate: 90 tests over the nine V3-2 files, with 43 in the AuthorAudit trio.
- :1015 "The per-path loop (:977) is unchanged: every one of the 20 sidecar code/test paths keeps the `NR > 999` cap (at or under 999 lines)." is superseded by V3-1f.
- :1016 "requires all fourteen source/declaration paths and six test-lane paths (20 paths)" now reads "nineteen source/declaration paths and thirteen test-lane paths (32 paths)". "the all-20-path `awk` line-cap gate plus the contract-file cap of 1,300" now reads "the 32-path presence gate with the V3-1f debt-aware length caps plus the contract-file cap of 1,300".
- :1022 "Nothing else changes" now reads: apart from the step-2 verbatim move into `task-551-dispatch-primitives.mjs` and the V3-4 tests. :1023 "The sh validation fence, the TASK551_PHASE_PROVENANCE block, `ownedTests`, allowlists and import closure stay byte-identical. The line counts of the fourteen source paths are unchanged (one line is edited in place)." is superseded by V3-1 through V3-3.
- :1024 "(2) `tests/unit/workflows/*`: zero literal pins. No test asserts 524,288 or the constant, so no test is re-pinned." now reads: T1 pins the literal `1024 * 1024`, and T1/T2 pin 1,048,576.
- :1025 "Add one boundary test … replaces one task file's `text` with a string of exactly 1,048,577 UTF-8 bytes, and expects `preflightTask551AuthorAuditDispatch` to throw `/snapshot_file_text/`." is replaced by T1-T3. :1026 "`… task551AuthorAudit-drift-rounds.test.ts tests/unit/workflows/task551AuthorAudit-bounded-child.test.ts …` must end with 0 fail" now reads as the V3-6 gate.
### Amendment v4 (2026-09-25): after the v3 audit
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree) from orchestrator decisions verified against two independent audits of v3. Append-only; text authoritative. It SUPERSEDES v3 (and, through v3, the three earlier 2026-09-25 amendments) wherever they conflict; every superseded sentence is quoted in **V4-8**. Everything in v3 that is not quoted there stays binding (verbatim moves, the V3-1a/V3-1b/V3-1d function and range maps except the rows corrected here, the no-`task551`-token naming rule, the import-edge list, the 1,300-line contract cap).
- **Line anchors.** `:NNN` anchors into this file use the pre-v4 numbering (the 1,140-line file v3 left). v4 edits two fences in place: it inserts one ts-fence line after :103 and replaces the three sh lines :989-:991 with four lines. So a pre-v4 anchor in :104-:988 is now at +1 and one at :992 or later is now at +2. Source and test anchors are grep-verified on the HEAD working tree before any re-open step.
- **In-place fence edits made here (binding).** (1) ts fence: sidecar `ownedTests` gains `tests/unit/workflows/dispatchContractCaps.test.ts` as its 14th and last row (13 -> 14). (2) sh fence: the test-lane count gate `-eq 13` -> `-eq 14`; the path array gains the same path last, `-eq 32` -> `-eq 33`; the debt-skip lines become the frozen-ceiling/step-aware loop of **V4-2**/**V4-3**. (3) The owner closure `bun test` argv (pre-v4 :1002) gains `tests/unit/workflows/dispatchContractCaps.test.ts` last (ten test files), matching the TASK-551-10-L02 closure command.

**V4-1 Import cycle fix and closed lib-private export surfaces (binding).**
- **Cycle.** `predecessorPaths` (`task-551-worktree-compatibility.mjs:904-910`, snapshot range) reads `TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS` at :907, which v3 put in the barrier range. That would make `worktree-snapshot -> l01-barrier -> worktree-snapshot` a cycle. Fix: :879-880 (the `/** Presence-only generic classifier inputs; ... */` comment and `export const TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS = TASK551_PLANNED_BUN_PATHS;`) move verbatim into `lib/task-551-phase-provenance.mjs`, directly after `TASK551_PLANNED_BUN_PATHS` (:495-505). `lib/task-551-worktree-snapshot.mjs` imports it from phase-provenance. The `lib/task-551-l01-barrier.mjs` range is now :881-903 + :1084-1511.
- **Re-check (symbol-resolved, 2026-09-25).** A TypeScript-checker cross-reference over the file, with ranges provenance = :1-488 + :495-505 + :879-880, facade = :489-494 + :506-637 + :1512-1725, snapshot = :638-878 + :904-1083, barrier = :881-903 + :1084-1511, found: zero barrier-range names read by the snapshot or provenance ranges; zero snapshot-range names read by provenance; zero facade-range names read by any sibling; the barrier range is read only by the facade (`MANIFEST_PATH`). The graph `provenance <- snapshot <- barrier <- facade` (plus `provenance <- facade`, `snapshot <- facade`) is acyclic.
- **61-name tally (corrected).** The worktree-compatibility facade keeps exactly its 61 export names: 31 provenance (the 29 v3 counted plus `TASK551_PLANNED_BUN_PATHS` and `TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS`), 8 compatibility (`TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA`, `TASK551_WORKFLOW_CAPABILITY_DESCRIPTOR_SCHEMA`, `TASK551_WORKFLOW_COMPATIBILITY_PREREQUISITE`, `TASK551_L02_SUBGATE_KINDS`, `getTask551WorkflowCompatibilityDescriptorV2`, `task551WorkflowCompatibilityDescriptorSha256V2`, `createTask551WorkflowCompatibilityReceiptV2`, `requireTask551WorkflowCompatibilityReceiptV2`), 13 snapshot, 3 barrier, 4 named-closure, 2 L02-subgate.
- **Closed export lists (each module exports exactly these names and nothing else).** Names re-exported by a facade are listed as "facade-owned"; every other name is a lib-private helper that no facade re-exports, no declaration names, and no test imports.
  - `lib/task-551-phase-provenance.mjs` (44): the 31 facade-owned provenance names, plus 13 helpers: `PREFIXED_NONZERO_SHA256`, `SHA256`, `TASK551_L01_MATERIALIZED_BARRIER_CLOSURE`, `deferred`, `digest`, `encoder`, `freeze`, `l11BarrierIncludesPath`, `l11BarrierInputPaths`, `l11MaterializedBarrierClosure`, `ownData`, `plainArray`, `sortUnique`. It keeps `import { createHash } from "node:crypto"` and `import { TextEncoder } from "node:util"`.
  - `lib/task-551-worktree-snapshot.mjs` (23): the 13 facade-owned snapshot names (`task551TaskGraphDigest`, `task551CurrentWorktreeDigest`, `task551L11BarrierCurrentWorktreeDigest`, `task551WorktreeSnapshotDigest`, `task551L11BarrierSnapshotDigest`, `createTask551TaskGraphSnapshot`, `requireTaskFilesAndGraphBytesEqual`, `requirePhaseReadOnlyImportsInCurrentWorktree`, `requireNoForeignPathOrByteDrift`, `captureTask551PreSpawnWorktreeSnapshot`, `captureTask551MaterializedWorktreeSnapshot`, `requireTask551PredecessorWorktreeSnapshotBeforeSpawn`, `requireExactActivePhaseSnapshotBeforeSpawn`), plus 10 helpers: `currentDigest`, `currentRegular`, `currentRegularDigests`, `currentWorktree`, `exactDigestPaths`, `pathDigests`, `phasePaths`, `predecessorPaths`, `predecessors`, `snapshot`.
  - `lib/task-551-l01-barrier.mjs` (4): `captureTask551L01PreClassifierBarrier`, `captureTask551L01MaterializationBarrier`, `requireTask551L01MaterializationBarrierBeforeL02` (facade-owned), plus `MANIFEST_PATH`.
  - `lib/task-551-worktree-compatibility.mjs` (61, facade): unchanged set. It imports `createHash` from `node:crypto` itself (the compatibility hash at :553-600 uses it) and re-exports no helper.
  - `lib/task-551-dispatch-primitives.mjs` (14 after step 1; 15 from step 2): `TASK551_ENVELOPE_SCHEMA`, `TASK551_GRAPH_SCHEMA`, `deepFreeze`, `fail`, `parseDuplicateKeyAwareJson`, `requireExactSequence`, `requireJsonRecord`, `requireLiteralId`, `requireNodeId`, `requireOwnDataArray`, `requireOwnDataRecord`, `requireRepoPath`, `requireText`, `requireUniqueStrings`; step 2 adds `TASK551_MAX_TASK_FILE_BYTES`. `ownKeys`, `utf8Bytes`, `TASK551_MAX_JSON_BYTES`, `TASK551_MAX_JSON_DEPTH` and `TASK551_MAX_JSON_NODES` stay module-private (no other module reads them).
  - `lib/task-551-dispatch-envelope.mjs` (1): `normalizeEnvelope`. `lib/task-551-dispatch-contract.mjs` (1, facade): `preflightTask551DispatchSnapshot`.
- **Parity gate (literal; run from the repo root).** `bun --env-file=/dev/null -e 'const { createHash } = await import("node:crypto"); const { pathToFileURL } = await import("node:url"); for (const path of process.argv.slice(1)) { const keys = Object.keys(await import(pathToFileURL(path).href)).sort(); console.log(path + " " + keys.length + " " + createHash("sha256").update(keys.join("\n"), "utf8").digest("hex")); }' <repo-relative module paths>`. It prints one line per module: path, key count, and raw lowercase SHA-256 of the newline-joined sorted keys. Expected values (the facade values were measured at HEAD; the sibling values were computed from the closed lists above):

| Module | Keys | SHA-256 of sorted keys joined by `\n` | From step |
|---|---|---|---|
| `_docs/_workflows/lib/task-551-dispatch-contract.mjs` | 1 | `7b36b5870117e163e4edc2b72f02a7d48deadb461873a615688af88862e98900` | HEAD (unchanged) |
| `_docs/_workflows/lib/task-551-dispatch-primitives.mjs` | 14 | `08c33aceb9fbdc113a48cd98e046e458afa1755b7e6dab114ab26859c379634b` | 1 (step 1 only) |
| `_docs/_workflows/lib/task-551-dispatch-primitives.mjs` | 15 | `84759d6ae6c2f03f6e8f5b738e9d57865d7c2a5975265939e541b0f921937b86` | 2 |
| `_docs/_workflows/lib/task-551-dispatch-envelope.mjs` | 1 | `75554a3bacc0a522f206be4a37c616276a337f1d01ef982443f8804d4d9332c8` | 1 |
| `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` | 61 | `f9ac9b1b482663b8557734e5a3c6acd7ea4f64dcde3a3a1ef0e061c99eb4ecfd` | HEAD (unchanged) |
| `_docs/_workflows/lib/task-551-phase-provenance.mjs` | 44 | `db4e6bcbac58359d4a0f8a31a9609c6c838c9afba08d399f3aa847a0bd84b972` | 3 |
| `_docs/_workflows/lib/task-551-worktree-snapshot.mjs` | 23 | `e00ef59892c4ef6fb085bfa64d8fab6e040bb5ab73d83b47b8027d7fabc52196` | 3 |
| `_docs/_workflows/lib/task-551-l01-barrier.mjs` | 4 | `582241d2def64471f3fe869ac5f0a471bc7298659f67078b28713ccd4e8b7637` | 3 |
| `_docs/_workflows/lib/task-551-contract.mjs` | 99 | `e466e413cb77a5ba3a9979a6556e08f3d7bf682e85e70d400065b68b79a0b147` | HEAD (unchanged) |

- **Family preflight (literal; repo root).** `bun --env-file=/dev/null -e 'const { readdir, readFile } = await import("node:fs/promises"); const { pathToFileURL } = await import("node:url"); const { preflightTask551DispatchSnapshot } = await import(pathToFileURL(process.argv[1]).href); const names = (await readdir("_docs/_TASKS")).filter((name) => /^TASK-551(?:[-_].*)?\.md$/u.test(name)).sort(); const taskFiles = await Promise.all(names.map(async (name) => ({ path: "_docs/_TASKS/" + name, text: await readFile("_docs/_TASKS/" + name, "utf8") }))); console.log(JSON.stringify(preflightTask551DispatchSnapshot({ sourceHead: process.argv[2], taskFiles }).inventory));' _docs/_workflows/lib/task-551-dispatch-contract.mjs 9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` exits 0 and prints exactly `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}` (measured 2026-09-25).
- **Sidecar provenance equality (literal; repo root; from step 3 on).** `bun --env-file=/dev/null -e 'const { readFile } = await import("node:fs/promises"); const { pathToFileURL } = await import("node:url"); const [contract, provenance] = process.argv.slice(1); const text = await readFile(contract, "utf8"); const start = text.indexOf("    phase: \"sidecar\","); const block = text.slice(start, text.indexOf("    readOnlyImports: [],", start)); const listed = [...block.matchAll(/^      "([^"]+)",$/gmu)].map((match) => match[1]); const { TASK551_PHASE_PROVENANCE } = await import(pathToFileURL(provenance).href); const sidecar = TASK551_PHASE_PROVENANCE[0]; const actual = [...sidecar.ownedFiles, ...sidecar.ownedTests]; if (JSON.stringify(listed) !== JSON.stringify(actual)) { console.error("task551_sidecar_provenance_drift " + listed.length + " " + actual.length); process.exit(1); } console.log(sidecar.ownedFiles.length + " " + sidecar.ownedTests.length);' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md _docs/_workflows/lib/task-551-phase-provenance.mjs` must print `19 14` at step 7. It is a closure check only; steps 1-6 hold a prefix-ordered subset (**V4-3**).

**V4-2 Frozen debt ceilings (binding).** The five UNTOUCHED over-cap sidecar sources get frozen per-path ceilings equal to their physical line counts (`wc -l`, 2026-09-25, HEAD working tree). The sh fence enforces `NR > <frozen>` for each (`task551_frozen_ceilings`), so none can grow:

| Path | Frozen ceiling |
|---|---|
| `_docs/_workflows/lib/task-551-evidence-contract.mjs` | 1,562 |
| `_docs/_workflows/lib/task-551-evidence-filesystem.mjs` | 1,014 |
| `_docs/_workflows/task-551-author-audit.mjs` | 1,039 |
| `_docs/_workflows/task-551-implement.mjs` | 1,844 |
| `_docs/_workflows/task-551-fix.mjs` | 1,459 |

- **Closure obligation.** The next TASK-551-11 change that touches any of the five must split it to <= 999 lines in the same change; raising a frozen ceiling is never a fix.
- **10-L02 handoff.** TASK-551-10-L02 family closure does not require these five to be at or under 1,000 lines. It does require each to be at or under its frozen ceiling (a count above it is a failed gate). Mirrored at TASK-551-10-L02 "Amendment (2026-09-25): TASK-551-11 re-open ripples" §2 (same five paths and counts).
- **Other caps (33 paths).** 28 non-debt paths: 18 at 999 (7 already-compliant sources/declarations, the 7 split sources, the 4 helpers) and 10 test files: 3 at 700 (`task551AuthorAudit.test.ts`, `authorAuditDriftRounds.test.ts`, `authorAuditBoundedChild.test.ts`; the fence `cap=700` arm) and 7 at 800.

**V4-3 Land order: split first (binding; supersedes V3-6).** Seven steps, one writer (one mandate) per step, each starting from the on-disk result of the step before. Only the step's allowlist changes. Every step ends green under the step's row in the table below before the next starts.
- **Step 1 — dispatch-contract split.** The facade plus `lib/task-551-dispatch-primitives.mjs` and `lib/task-551-dispatch-envelope.mjs` per the V3-1a map, with the closed lists of **V4-1**. Zero behaviour change: the cap stays `512 * 1024` (moved verbatim, not exported). Two pre-existing eslint errors move with the code and are fixed here, behaviour-neutrally (both verified equivalent on 2026-09-25): `dispatch-contract.mjs:165` `no-undef` `TextEncoder` (add `import { TextEncoder } from "node:util";` in primitives; `node:util`'s `TextEncoder` is the global class in Bun and Node) and `:481` `no-useless-escape` (`` /[\n\r\t`$*?\[\]{}|&;<>]/u `` -> `` /[\n\r\t`$*?[\]{}|&;<>]/u `` in envelope; identical matches for every code point below U+3000). Matrix rows in the same mandate: sidecar `ownedFiles` in the provenance literal (still in `task-551-worktree-compatibility.mjs`) gains the two paths after the fourteen; `expectedL11SidecarPaths` (`task551WorkflowContracts.test.ts:105-120`) gains them; the pins become `[19, 16]` and `81`; the owner-host no-import scan list (`:1845-1855`) gains both modules.
- **Step 2 — byte cap.** In primitives, `const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;` becomes `export const TASK551_MAX_TASK_FILE_BYTES = 1024 * 1024;` (1,048,576). Nothing else in the dispatch trio changes. NEW suite `tests/unit/workflows/dispatchContractCaps.test.ts` (no `task551` token; <= 800 lines) holds T1-T3 (**V4-6**). In the same mandate: sidecar `ownedTests` gains it last; `expectedL11SidecarTests` (`:121-125`) gains it last; pins `[20, 16]`, `82`; the matrix test (`task551EvidenceContract.test.ts:883-986`) reads it and appends the row `[author-audit]`. The same mandate clears the pre-existing `no-sparse-arrays` error at `task551EvidenceContract.test.ts:1040` behaviour-neutrally: `sparse.focusedTests = [processReceipt(), ,];` becomes a length-2 array with a hole at index 1 built as `[processReceipt()]` with `length = 2` (the same own keys, length and hole). The assertion is unchanged.
- **Step 3 — worktree-compatibility split.** V3-1b map as corrected by **V4-1**. Provenance lists for the new modules in the same mandate: sidecar `ownedFiles` (now in `task-551-phase-provenance.mjs`) gains the three paths (19 rows, fence order); `expectedL11SidecarPaths` gains them; pins `[23, 19]`, `85`; the scan list gains the three modules.
- **Step 4 — author-audit split.** V3-1d rows for the AuthorAudit trio and `task551AuthorAuditFixtures.ts`, the `use` -> `fixture` rename (`withTask551GitRepo`, :205-257; clears the two `react-hooks/rules-of-hooks` errors at :238), and the trio's 700-line cap. `dispatchContractCaps.test.ts` drops its local `currentTask551DispatchSnapshot` (a byte-identical copy of `task551AuthorAudit.test.ts:150-164` since step 2) and imports it from the helper. Matrix rows: `ownedTests` gains the three paths at their V3-2 positions; `expectedL11SidecarTests` likewise; pins `[26, 19]`, `88`; the matrix test reads the three paths and its rows become V3-3's for the AuthorAudit family.
- **Step 5 — workflow-contracts split.** V3-1d rows for `task551WorkflowContracts.test.ts`, the three new tests and the two helpers, with its matrix rows (`ownedTests` +5 at V3-2 positions; `expectedL11SidecarTests` +5, moving into `task551WorkflowContractsFixtures.ts`; matrix-test reads +5 and rows) and the derived pins re-baselined in the same mandate: `[31, 19]` and `93`, which move into `workflowContractsBootstrap.test.ts` together with the scan list.
- **Step 6 — evidence-contract split.** V3-1d rows for `task551EvidenceContract.test.ts`, `evidenceContractMatrix.test.ts` and `task551EvidenceContractFixtures.ts`, with matrix rows (`ownedTests` +2 -> 14; `expectedL11SidecarTests` +2; pins `[33, 19]` and `95`; the matrix test, now in `evidenceContractMatrix.test.ts`, reads all 14 test-lane paths: the thirteen **V3-3** rows plus `[author-audit]` last).
- **Step 7 — final provenance/fence counts + receipt.** No source or test edit. It proves ts fence = source provenance (the literal equality check prints `19 14`), `[33, 19]` and `95` green, the full fence with `TASK551_REOPEN_STEP` unset, then writes the receipt (**V4-6**).
- **Interim ceilings (named exception; enforced by the fence's `task551_reopen_pending` entries through `TASK551_REOPEN_STEP`).** Keeping every step green forces the pending-split monoliths to carry their row edits before their own split step. Each may grow only by those named rows, up to: `task-551-worktree-compatibility.mjs` 1,728 through step 2 (1,725 + 2 `ownedFiles` + 1 `ownedTests`); `task551AuthorAudit.test.ts` 1,241 through step 3 (untouched); `task551WorkflowContracts.test.ts` 2,793 through step 4 (2,779 + 14 array/scan rows); `task551EvidenceContract.test.ts` 1,215 through step 5 (1,170 + about 38 matrix-read/row/sparse-fix lines + 7 lines of prettier wrapping slack). A path listed with `-` may be absent before its creating step. From its split step on, each path has its final cap. Step 7 (the default when the variable is unset) allows no absence and no interim ceiling.
- **Per-step green condition (all mandatory; the receipt records each).** A = airtight `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <files>`, 0 fail and 0 skip, with the exact pass count. E = `./node_modules/.bin/eslint --max-warnings=0 <every file the step touched>` exits 0. W = `wc -l` on every touched file, within the caps above. F = the complete sh fence with `TASK551_REOPEN_STEP=<n>` exits 0. P = the parity program over all dispatch/worktree modules present plus `lib/task-551-contract.mjs`, equal to the **V4-1** table. G = the family preflight prints the pinned inventory. T = the orchestrator's `bun run lint:repo:types` exits 0. Also `git diff --check` over the touched files.

| Step | A: test files (tests) | Touched `.ts` (T required) | P: expected new/changed digests | Absent allowed (F) |
|---|---|---|---|---|
| 1 | 3 monoliths (87 = 40 + 25 + 22) | `task551WorkflowContracts.test.ts` | primitives 14, envelope 1; facades unchanged | every path created in steps 2-6 |
| 2 | + `dispatchContractCaps.test.ts` (90 = 87 + 3) | caps suite, WC and Evidence monoliths | primitives 15 | paths of steps 3-6 |
| 3 | same 4 files (90) | `task551WorkflowContracts.test.ts` | provenance 44, snapshot 23, barrier 4; facade 61 unchanged | paths of steps 4-6 |
| 4 | AuthorAudit trio + WC + Evidence + caps, 6 files (90 = 18 + 12 + 10 + 25 + 22 + 3) | trio, helper, caps suite, WC and Evidence monoliths | all unchanged | paths of steps 5-6 |
| 5 | + 3 WC tests, 9 files (90) | WC family (4 tests + 2 helpers), Evidence monolith | all unchanged | paths of step 6 |
| 6 | all 10 test files (90 = 40 + 25 + 22 + 3) | Evidence family, WC fixtures helper, `workflowContractsBootstrap.test.ts` | all unchanged | none |
| 7 | all 10 test files (90) | none | all unchanged | none; `TASK551_REOPEN_STEP` unset |

- T runs after steps 1-6. Every one of them touches a `.ts` file, because each step re-baselines the provenance-derived pins in the same mandate. Step 7 touches no `.ts` file.
- The two monoliths without a split in the step keep their V3-1d test counts. The step's gate command lists the test files in V3-2 order with `dispatchContractCaps.test.ts` last.

**V4-4 Mandate sizing exception (named).** Steps 3-6 each move more than 800 lines (the AGENTS/CLAUDE per-mandate guideline). This is allowed as a named exception because the moves are byte-identical. The implementer proves it. Before editing, it copies the pre-step file to its session scratch directory (never `/tmp` or the repo). After the move, for each target module it deletes only the glue lines (import/export lines, a leading `export ` on a moved declaration, header comments, and the named row/rename edits of the step). The concatenation of its moved blocks must then `diff`-equal the concatenation of the named pre-step ranges (exit 0). Glue lines total <= 60 per step, counted and reported. One suite or module family per mandate. Step 1 moves about 705 lines and stays under the guideline.

**V4-5 Bun-lane manifest gap (binding; revised by the orchestrator 2026-09-25).** The re-open does NOT regenerate `tests/bun-lane-manifest.json` (:307 "L11 does not edit that file" stands).
- (a) The seven new test files (`authorAuditDriftRounds`, `authorAuditBoundedChild`, `workflowContractsBootstrap`, `workflowContractsSubgates`, `workflowContractsImplementation`, `evidenceContractMatrix`, `dispatchContractCaps`) are not manifest rows until TASK-551-01-L01 lands its audited classifier-ownership correction and regenerates the manifest. When they join, they are ordinary (non-planned, non-task551-slice) manifest rows owned by the classifier (`scripts/bun-lane-classify.ts`, the only writer, run as `bun scripts/bun-lane-classify.ts`; its row filter is `EXT` at `:76`), and helpers are never rows. Reason (orchestrator-verified): at this tree a regeneration adds 21 rows. Twelve are `task551`-named integration tests (`tests/integration/server/task551*.test.ts`) outside the closed five-path list (`scripts/task551QueryInventory/bunLane.ts:37-43`, `task551ManifestSlice` `:218-221`). So `task551BunLaneMembership.test.ts` would go red (`query_inventory_final_receipt_missing:task551-manifest-membership`). This is a latent 01-L01 classifier defect. The separate 01-L01 correction fixes it before any regeneration.
- (b) Interim: `bun run test` runs only manifest rows (`scripts/run-bun-parallel.ts:234-236`). The v4 receipt and the TASK-551-10-L02 closure command (already on the ten paths) run the ten files explicitly in the airtight form. Recorded coverage gap: 48 of the 90 sidecar tests are outside `bun run test` until the correction lands (45 moved into the six v3 files: 12 + 10 + 7 + 4 + 7 + 5; plus the 3 new caps tests); the three monolith rows keep 42 (18 + 7 + 17). Owning follow-up: the TASK-551-01-L01 classifier correction.
- (c) `tests/unit/toolchain/bunLaneManifest.test.ts` is red at HEAD independently of this re-open (re-run 2026-09-25 DB-free: 2 fail / 14 pass; "committed manifest equals a fresh classification run" and "manifest rows are internally consistent", `Expected: 475` fresh / `Received: 454` committed). The re-open neither fixes nor worsens it.
- (d) No TASK-551-01-L01 mirror authorizes a regeneration now; 01-L01 keeps its FINAL regeneration.

**V4-6 LOW corrections (binding).**
- **Caps tests (in `dispatchContractCaps.test.ts`, not in `task551AuthorAudit.test.ts`).** They use one local builder `padTask551TaskFileToBytes(snapshot, suffix, bytes)` exactly as V3-4 defines it, over `currentTask551DispatchSnapshot()`. T1 "accepts a task file of exactly 1,048,576 UTF-8 bytes and pins the cap literal": `lib/task-551-dispatch-primitives.mjs` matches `/^export const TASK551_MAX_TASK_FILE_BYTES = 1024 \* 1024;$/mu` exactly once. The dispatch facade and envelope sources contain no `TASK551_MAX_TASK_FILE_BYTES =`. The padded entry is exactly 1,048,576 UTF-8 bytes and preflight returns the live inventory. T2 "rejects a task file of 1,048,577 UTF-8 bytes": it throws `/task551_dispatch_snapshot_file_text/`. T3 "accepts the live 03-L02 task file": the entry exists, its UTF-8 length is `<= 1_048_576`, and the unmodified snapshot passes preflight. NO lower bound. Direct private import: `task-551-author-audit.mjs`: `preflightTask551AuthorAuditDispatch` only (declared in `task-551-author-audit.d.mts:83`). The source pin reads files; it does not import the constant. No lib-private sibling gains a declaration.
- **Matrix row (supersedes :34-:36 for this path).** `dispatchContractCaps.test.ts` | `author-audit`: `preflightTask551AuthorAuditDispatch`. The fixtures helper import from step 4 is not a private import.
- **Scan list.** The owner-host no-import scan list includes each new module from the step that creates it (steps 1 and 3), not only at the end.
- **Receipt.** A NEW file `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json`, created if absent by the step-7 writer from the orchestrator's per-step gate records (HEAD, this amendment, and for every step: allowlist, commands, exit codes, pass/fail/skip counts, touched-file line counts, parity lines, family-preflight output, fence step, `lint:repo:types` exit, verbatim-move diff result and glue count). It also records the frozen ceilings, the V4-5 gap and the handoffs. The historical `impl-11-classifier-gate.json` is never mutated. This is the only receipt write of the re-open.
- **Anchor fixes.** `scripts/bun-lane-classify.ts:76` (`EXT`), not `:6`. The TASK-551-01-L01 closed-list mirror is `TASK-551-01-L01…md:1757-1759` (items 3-5), not `:1758-1759`. The logical-argv vectors are `task551WorkflowContracts.test.ts:130-297` (`logicalArgvVectors`; `framedLogicalArgv` :298-313), not `:136-295`.
- **Stale-anchor notices (handoffs; L11 edits none of these files; the quoted text stays authoritative and each owner corrects anchors in its next append-only section).** After steps 1 and 3 these `file.mjs:NNN` anchors point into moved code:
  - `TASK-551-03-L02`: `task-551-dispatch-contract.mjs:96` -> primitives; `:750-751`, `:776-785`, `:784-785` -> envelope (`normalizeEnvelope`); `:873-875` -> facade (`normalizeGraph`); `:956-959`, `:977-987` -> facade (`reconcileTask551Dispatch`); `task-551-worktree-compatibility.mjs:111-115` -> phase-provenance (sidecar `ownedTests`).
  - `TASK-551-06-L03`: `task-551-dispatch-contract.mjs:473-490` -> envelope (`requireLiteralArgv`).
  - `TASK-551-07-L01`: `:364-370` -> facade (`collectTask551JsonFences`); `:473-490` -> envelope.
  - `TASK-551-10-L01`: `:553-556` -> envelope (`normalizeCommand`).
  - `TASK-551-10-L02`: `:554-556` -> envelope; `:96` -> primitives.
  - `TASK-551-11` (this file): `task-551-dispatch-contract.mjs:96` -> primitives; `task-551-worktree-compatibility.mjs:1502-1508` -> l01-barrier.

**V4-7 Ripples (handoffs).** TASK-551-03-L02: "the split landed" now means v4 steps 1-7 are all green and the v4 receipt exists. TASK-551-10-L02: its ten-path closure command and frozen-ceiling mirror already match v4. TASK-551-01-L01: **V4-5**.

**V4-8 Superseded sentences (quoted; text authoritative).**
- :37 "Outside this closed fourteen-source/declaration/three-test list and those eleven outputs, L11 implementation never mutates another workflow/lib helper, product path, unrelated task contract, closure path, DB, or environment file" now reads "Outside the closed nineteen-source/declaration and fourteen test-lane list, those eleven outputs, and (for the 2026-09-25 re-open only) the create-if-absent receipt `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json`, …". V3-8's reading of :15 "(nine test files and four helpers)" becomes "fourteen test-lane paths (ten test files and four helpers)".
- V3-1a "every moved name" (primitives exports) now reads as the **V4-1** closed list.
- V3-1b "The facade must keep exactly its current 61 export names (29 provenance, 9 compatibility, 14 snapshot, 3 barrier, 4 named-closure, 2 L02-subgate)" now reads 31/8/13/3/4/2. The V3-1b provenance row "plus `TASK551_PLANNED_BUN_PATHS` :495-505" gains ":879-880". The barrier row "classifier barrier constants :879-903 (`TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS`, `MANIFEST_PATH`, …)" now reads ":881-903 (`MANIFEST_PATH`, …)".
- V3-1c(4) "`task551WorkflowContracts.test.ts:136-295`" now reads `:130-297`.
- V3-1d row `task551AuthorAudit.test.ts` "+ the three **V3-4** cap tests after :321 | 18 + 3 = 21" now reads 18, and the caps tests live in `dispatchContractCaps.test.ts` (3 tests; cap 800; imports per **V4-6**).
- V3-1e "After the re-open they hold 43 + 25 + 22 = 90: the moves keep all 87 and add exactly the three **V3-4** tests." now reads 40 + 25 + 22 + 3 = 90 over ten test files.
- V3-1f "It enforces `NR > 999` for the 27 other paths (" … ") and `NR > 800` for the 9 `*.test.ts` paths. It skips the length check only for the 5 named debt paths, and each debt path must be a member of the 32-path array." now reads as **V4-2**: frozen ceilings, not skips; 28 non-debt paths (18 at 999; 10 test files, 3 at 700 and 7 at 800); 33-path array.
- V3-2 "(`scripts/bun-lane-classify.ts:6`)" now reads `:76`; "`TASK-551-01-L01…md:1758-1759`" now reads `:1757-1759`; "The thirteen sidecar `ownedTests`, in order:" now reads fourteen, with `dispatchContractCaps.test.ts` last; "The six new test files are ordinary planned-lane manifest rows, owned by the classifier and not by L11." now reads as **V4-5**.
- V3-3 "goes from `[17, 14]` to `[32, 19]`" now reads `[33, 19]`; "goes from `79` to `94`" now reads `95` (sidecar 19 + 14 = 33). "Its `privateImports` expectation becomes one sorted specifier row per file, in **V3-2** order:" gains a 14th row `[author-audit]`. "(`-eq 19`, `-eq 13`, `-eq 32`, debt `-eq 5`)" now reads `-eq 19`, `-eq 14`, `-eq 33`, frozen `-eq 5`, pending `-eq 20`.
- V3-4 "Three new tests go in `task551AuthorAudit.test.ts`, "research grounding and audit scopes", right after the live-graph preflight test (:321)." and "Step 2 then moves it verbatim, with `export`, into `lib/task-551-dispatch-primitives.mjs`." now read as **V4-3** step 2 and **V4-6**. "Its UTF-8 length is `>= 522_753`, the size measured on 2026-09-25; the file is append-only, so it never shrinks." is withdrawn (no lower bound).
- V3-5 "For 03-L02, "the split landed" means v3 steps 1-5 are all green." now reads as **V4-7**. "`tests/bun-lane-manifest.json` is reported red at HEAD (orchestrator audit; not re-run here)." and "The six new test files join it as ordinary planned-lane rows, and helpers are not rows." now read as **V4-5**.
- V3-6 "Order: 1 byte cap -> 2 dispatch-contract split -> 3 worktree-compatibility split -> 4 test splits -> 5 pin re-baselines -> receipt.", its five step bullets, "0 fail, 0 skip, and exactly 90 tests from step 1 on.", "Export-surface parity: `bun -e` prints …", "After step 5, the complete sh fence (:964-981) and `git diff --check`." and "The orchestrator runs `bun run lint:repo:types` after steps 2, 3 and 5." now read as **V4-3** (87 tests at step 1, 90 from step 2; fence and T after every step as tabled).
- V3-6 "The TASK-551-11 receipt `_docs/_workflows/_smoke/task-551/impl-11-classifier-gate.json` gets an addendum: exactly one new last top-level key `"reopenV3Addendum"`, with every existing key and value unchanged." and "This is the only receipt write the re-open is allowed to make." now read as the **V4-6** receipt bullet.
- V3-8 ":1011 … now reads as the V3-6 airtight gate: 90 tests over the nine V3-2 files, with 43 in the AuthorAudit trio." now reads: 90 tests over ten files, with 40 in the AuthorAudit trio. V3-8 "the nine V3-2 test files" readings of :961/:1016 now read "the ten test files (V3-2 plus `dispatchContractCaps.test.ts`)"; "thirteen test-lane paths (32 paths)" now reads "fourteen test-lane paths (33 paths)".
### Amendment v5 (2026-09-25): move-proof procedure and regeneration order
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree) from orchestrator decisions on the two independent v4 audits. Append-only; text authoritative. It SUPERSEDES v4 (and, through v4, v3 and the earlier 2026-09-25 amendments) wherever they conflict; every superseded sentence is quoted in **V5-6**. Everything in v4 that is not quoted there stays binding (the seven-step land order, the closed export lists, the parity table, the frozen ceilings, the interim ceilings, the receipt file).
- **Line anchors.** `:NNN` anchors into this file use the pre-v5 numbering. v5 replaces one fence line in place (the contract cap at :987, **V5-5**) and inserts nothing above this amendment, so pre-v5 and post-v5 numbers are equal for :1-:1252. Moved source and test code is no longer addressed by line numbers but by declaration anchors (**V5-2**).

**V5-1 Move proof (binding; supersedes the V4-4 proof sentences quoted in V5-6).**
- **Scope.** Every step that moves code: 1 (dispatch-contract), 3 (worktree-compatibility), 4 (AuthorAudit), 5 (WorkflowContracts) and 6 (EvidenceContract). Steps 2 and 7 move nothing. The proof is per-step green condition **M**, next to A/E/W/F/P/G/T of **V4-3**; a step without an exit-0 M is not green.
- **No numeric glue cap.** Glue is any post-step line outside every anchored block: import lines (including the name lines of a multi-line import list), `export {…} from` / `export type {…} from` lists, and header comments. The receipt lists every glue line with its file, line number and text, plus a count per file. The program prints exactly this list and fails on any out-of-block line that is not glue-shaped, so moved or new code cannot hide in glue.
- **What is compared.** For each target module of the step (the kept facade or monolith included), the PRE-STEP bytes of its blocks are compared with the same blocks in the post-step module. Pre-step bytes are the source file exactly as it exists immediately before the step starts: the working copy after all earlier steps, not HEAD and not HEAD line numbers. Earlier-step edits are therefore part of the pre-step bytes. Blocks are delimited by the **V5-2** text anchors in both files and concatenated in ascending pre-step source order. Before `diff`, the post-step side has ONLY these enumerated edits stripped (reverse-applied):
  - (a) `export ` prefixes on the listed declarations. Step 1: `lib/task-551-dispatch-primitives.mjs` the 14 **V4-1** names (`TASK551_ENVELOPE_SCHEMA`, `TASK551_GRAPH_SCHEMA`, `deepFreeze`, `fail`, `parseDuplicateKeyAwareJson`, `requireExactSequence`, `requireJsonRecord`, `requireLiteralId`, `requireNodeId`, `requireOwnDataArray`, `requireOwnDataRecord`, `requireRepoPath`, `requireText`, `requireUniqueStrings`); `lib/task-551-dispatch-envelope.mjs` `normalizeEnvelope`. Step 3: `lib/task-551-phase-provenance.mjs` the 13 **V4-1** helpers (`PREFIXED_NONZERO_SHA256`, `SHA256`, `TASK551_L01_MATERIALIZED_BARRIER_CLOSURE`, `deferred`, `digest`, `encoder`, `freeze`, `l11BarrierIncludesPath`, `l11BarrierInputPaths`, `l11MaterializedBarrierClosure`, `ownData`, `plainArray`, `sortUnique`); `lib/task-551-worktree-snapshot.mjs` the 10 **V4-1** helpers (`currentDigest`, `currentRegular`, `currentRegularDigests`, `currentWorktree`, `exactDigestPaths`, `pathDigests`, `phasePaths`, `predecessorPaths`, `predecessors`, `snapshot`); `lib/task-551-l01-barrier.mjs` `MANIFEST_PATH`. Facade-owned names already carry `export ` in the pre-step bytes and are not edits. Step 4: `task551AuthorAuditFixtures.ts` exactly `Finding`, `completed`, `currentTask551DispatchSnapshot`, `fullDiscovery`, `highFinding`, `lowFinding`, `uniqueTempDir`. `ALL_PHASES` is read only by `fullDiscovery` (`task551AuthorAudit.test.ts:43`), so it stays module-private. Steps 5-6: for `task551WorkflowContractsFixtures.ts`, `task551WorkflowExecutionFixtures.ts` and `task551EvidenceContractFixtures.ts`, exactly the helper declarations that a sibling file of the same step imports by name. The step's spec lists them and the receipt records them. Verified on 2026-09-25: the lib and AuthorAudit lists equal the names read across the new module boundaries. This was checked by a name-level cross-reference over the **V5-2** blocks, plus two greps: `phase(` is called only inside the provenance block, and `...TASK551_L01_MATERIALIZED_BARRIER_CLOSURE` is spread at `task-551-worktree-compatibility.mjs:1203` (barrier block). The program fails when a listed name has no sibling importer. `diff` fails when an `export ` is added to an unlisted name.
  - (b) The `use` -> `fixture` rename (step 4, `authorAuditDriftRounds.test.ts`, declaration `withTask551GitRepo`) is exactly two lines. `  use: (runtime: FixtureGitRuntime) => Promise<T>` (HEAD :210) becomes `  fixture: (runtime: FixtureGitRuntime) => Promise<T>`, and `    return await use({` (HEAD :238) becomes `    return await fixture({`.
  - (c) Step 1 (`lib/task-551-dispatch-envelope.mjs`, declaration `requireLiteralArgv`): the single regex line `` /[\n\r\t`$*?\[\]{}|&;<>]/u.test(literal) || `` (HEAD :481) becomes `` /[\n\r\t`$*?[\]{}|&;<>]/u.test(literal) || ``. The `import { TextEncoder } from "node:util";` line of `lib/task-551-dispatch-primitives.mjs` is an import header (e), not an in-block edit.
  - (d) In-block row and pin edits that ride with a move. Step 3 (`lib/task-551-phase-provenance.mjs`, inside `TASK551_PHASE_PROVENANCE`): the sidecar `ownedFiles` gains the three step-3 lib paths (three inserted lines). Step 5: `task551WorkflowContractsFixtures.ts`, declaration `expectedL11SidecarTests`, gains the five step-5 rows. In `workflowContractsBootstrap.test.ts`, the pin `[26, 19]` becomes `[31, 19]` and the pin `88` becomes `93`. Step 6 (`evidenceContractMatrix.test.ts`, the matrix test): the read list and the `privateImports` call list each gain the two step-6 paths, and the expected rows gain `[]` and `[]` at their **V3-2** positions. Every other row or pin edit of steps 1-6 is in a file that does not move in that step, so it is an ordinary edit outside M.
  - (e) Import headers and header comments. These are glue and lie outside every block, so they are listed, not diffed.
  - (b)-(d) are written as hunks `{post: [lines], pre: [lines]}`. Each hunk is matched after the (a) strip. It carries enough unchanged context lines to match exactly once, or the program fails.
- **Procedure.** The literal program is the sh fence below. Run it with bash from the repo root, one invocation per phase, as `env TASK551_MOVE_PHASE=<snapshot|prove> TASK551_MOVE_SCRATCH=<dir> TASK551_MOVE_SRC=<pre-step source path> [TASK551_MOVE_MODULES="<target basenames>"] bash -c "$(sed -n '<start>,<end>p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. The fence content is at :1274-:1329 at v5. Later in-place fence edits or insertions above it shift these lines, and the receipt records the exact lines used.
  - `snapshot` runs BEFORE the step's first edit. It copies the working copy of `TASK551_MOVE_SRC` into `<dir>/pre/`, refuses to overwrite an earlier snapshot, and prints both SHA-256 values. `git show :<path>` is an acceptable source only when `git diff --quiet -- <path>` shows that the index equals the working copy. The snapshot digest must equal the latest SHA-256 recorded for that path: the step-1 baseline (**V5-4**) or the receipt of the last earlier step that touched it (every step records the SHA-256 of each file it touched). `<dir>` is the implementer's session scratchpad (it may live under `/tmp/claude-*`), never the repo tree. If the snapshot is lost before `prove`, the step is not green: the orchestrator decides the recovery, and no proof is rebuilt from memory.
  - `prove` runs after the step's edits. It reads `<dir>/spec.json`, which has the shape `{"modules": {"<repo path>": {"blocks": [[<start anchor>, <end anchor>], …], "exportNames": […], "hunks": [{"post": […], "pre": […]}]}}}`. There is one entry per target module of the step, and the blocks are exactly the **V5-2** row. The program writes `<dir>/out/<basename>.pre` and `.post`, and prints to `<dir>/proof.jsonl` one JSON line per module (resolved pre/post block lines, glue lines, glue count), then the uncovered pre-step lines. It fails with `task551_move_proof_<code>` on: an anchor that is missing or not unique; an end anchor before its start; overlapping pre-step blocks; a non-glue line outside the blocks (post side), or a non-glue uncovered line (pre side, so nothing is dropped); a hunk that does not match exactly once; or an exported name with no sibling importer. Then `diff` must exit 0 with empty output for every target module.
  - Each move step's receipt records: the snapshot path and SHA-256, `spec.json` (the enumerated-edit list), `proof.jsonl` (the glue list and counts per file), and each `diff` command with its output (empty) and exit code.
- **Self-test (2026-09-25, scratchpad only; no repo file written).** The fence was run end-to-end on simulated step-1 and step-4 splits built from the HEAD working-tree files. Every target `diff` was empty with exit 0. Three negative mutations failed: a changed literal inside a moved block (`diff` non-empty), an unlisted `export ` (`diff` non-empty), and a code line appended outside the blocks (`task551_move_proof_glue`). A listed export without an importer failed with `task551_move_proof_export_unused`.

```sh
set -eu
{ test -f .prettierrc.json && test -x ./node_modules/.bin/prettier; } || { printf 'run the move proof from the repo root\n' >&2; exit 1; }
case "${TASK551_MOVE_STEP:?}" in 1|3|4|5|6) ;; *) printf 'invalid TASK551_MOVE_STEP: %s\n' "$TASK551_MOVE_STEP" >&2; exit 1 ;; esac
task551_move_root="_docs/_workflows/_smoke/task-551/11-reopen"
task551_move_dir="$task551_move_root/step-$TASK551_MOVE_STEP"
task551_move_pre="$task551_move_dir/pre/$(basename -- "${TASK551_MOVE_SRC:?}").snapshot"
printf '*\n' | cmp -s -- - "$task551_move_root/.gitignore" || { printf 'task551_move_proof_gitignore %s/.gitignore must hold exactly the one line *\n' "$task551_move_root" >&2; exit 1; }
case "${TASK551_MOVE_PHASE:?}" in
snapshot)
  test -f "$task551_move_dir/enumerated-edits.txt" || { printf 'task551_move_proof_snapshot missing %s/enumerated-edits.txt\n' "$task551_move_dir" >&2; exit 1; }
  test ! -e "$task551_move_pre" || { printf 'task551_move_proof_snapshot refusing to overwrite %s\n' "$task551_move_pre" >&2; exit 1; }
  mkdir -p "$task551_move_dir/pre"
  cp -- "$TASK551_MOVE_SRC" "$task551_move_pre"
  sha256sum -- "$task551_move_pre" "$task551_move_dir/enumerated-edits.txt" > "$task551_move_dir/pre.sha256"
  sha256sum -- "$TASK551_MOVE_SRC"
  cat -- "$task551_move_dir/pre.sha256"
  ;;
ranges|prove)
  sha256sum -c --quiet -- "$task551_move_dir/pre.sha256" || { printf 'task551_move_proof_snapshot digest mismatch in %s\n' "$task551_move_dir" >&2; exit 1; }
  task551_move_program='
const { readFileSync, writeFileSync, mkdirSync } = await import("node:fs");
const { basename } = await import("node:path");
const { spawnSync } = await import("node:child_process");
const { createHash } = await import("node:crypto");
const [preFile, srcPath, dir, mode] = process.argv.slice(1);
const outDir = dir + "/out";
const die = (code, detail) => { console.error("task551_move_proof_" + code + " " + detail); process.exit(1); };
const esc = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const fmt = (text, path) => { const run = spawnSync("./node_modules/.bin/prettier", ["--config", ".prettierrc.json", "--stdin-filepath", path], { input: text, encoding: "utf8", maxBuffer: 1 << 28 }); if (run.status !== 0) die("prettier", path + " " + String(run.stderr).split("\n")[0]); return run.stdout; };
const decl = "^(?:export )?(?:async )?(?:function\\*? |const |let |class |type |interface )";
const anchorRe = (anchor) => anchor.startsWith("describe:") ? new RegExp("^describe\\(" + esc(JSON.stringify(anchor.slice(9))) + ",", "u") : new RegExp(decl + esc(anchor) + "(?![A-Za-z0-9_$])", "u");
const find = (lines, anchor, file) => { const hits = lines.flatMap((line, index) => (anchorRe(anchor).test(line) ? [index] : [])); if (hits.length !== 1) die("anchor", file + " " + anchor + " " + hits.length); return hits[0]; };
const extract = (lines, [first, last], file) => { let start = find(lines, first, file); while (start > 0 && /^\s*(?:\/\/|\/\*|\*)/u.test(lines[start - 1])) start -= 1; let end = lines.length - 1; if (last !== "@EOF") { end = find(lines, last, file) + 1; if (end <= start) die("order", file + " " + last); while (end < lines.length && !/^[^\s}\])]/u.test(lines[end])) end += 1; end -= 1; } while (end > start && lines[end].trim() === "") end -= 1; return [start, end]; };
const listName = /^  (?:type )?[A-Za-z_$][A-Za-z0-9_$]*(?: as [A-Za-z_$][A-Za-z0-9_$]*)?,?$/u;
const glueLine = [/^import (?:type )?[^;]* from "[^"]+";?$/u, /^import "[^"]+";?$/u, /^export (?:type )?\{[^}]*\} from "[^"]+";?$/u, /^export \* from "[^"]+";?$/u, /^\/\/.*$/u, /^\/\*(?:[^*]|\*(?!\/))*(?:\*\/)?$/u, /^ \*(?!\/)(?:[^*]|\*(?!\/))*(?:\*\/)?$/u, /^ \*\/$/u];
const firstNonGlue = (entries) => { let open = false; for (const [line, text] of entries) { if (open) { if (listName.test(text)) continue; if (/^\} from "[^"]+";?$/u.test(text)) { open = false; continue; } return line; } if (/^(?:import|export) (?:type )?\{$/u.test(text)) { open = true; continue; } if (!glueLine.some((pattern) => pattern.test(text))) return line; } return open ? "EOF" : null; };
const spec = JSON.parse(readFileSync(dir + "/spec.json", "utf8"));
const enumerated = readFileSync(dir + "/enumerated-edits.txt", "utf8").split("\n");
if (enumerated.pop() !== "") die("enumerated", "no final newline");
const enumeratedExports = new Set();
const enumeratedLines = new Set();
const enumeratedAnchors = new Set();
if (new Set(enumerated).size !== enumerated.length) die("enumerated", "duplicate entry");
for (const entry of enumerated) { if (/^export [A-Za-z_$][A-Za-z0-9_$]*$/u.test(entry)) enumeratedExports.add(entry.slice(7)); else if (entry.startsWith("line ")) enumeratedLines.add(entry.slice(5)); else if (entry.startsWith("anchor ")) enumeratedAnchors.add(entry.slice(7)); else die("enumerated", JSON.stringify(entry)); }
for (const line of enumeratedAnchors) if (enumeratedLines.has(line)) die("enumerated", "line and anchor " + JSON.stringify(line));
const paths = Object.keys(spec.modules ?? {});
if (!paths.includes(srcPath) || Object.keys(spec).some((key) => key !== "modules")) die("spec", "the kept module " + srcPath + " is missing or spec has unknown keys");
for (const path of paths) { const module = spec.modules[path]; if (Object.keys(module).some((key) => !["blocks", "exportNames", "hunks"].includes(key)) || !Array.isArray(module.blocks) || module.blocks.length === 0) die("spec", path); for (const hunk of module.hunks ?? []) { if (Object.keys(hunk).some((key) => key !== "pre" && key !== "post") || !Array.isArray(hunk.pre) || !Array.isArray(hunk.post) || hunk.post.length === 0 || JSON.stringify(hunk.pre) === JSON.stringify(hunk.post)) die("hunk", path + " shape"); for (const line of [...hunk.pre, ...hunk.post]) if (!enumeratedLines.has(line) && !enumeratedAnchors.has(line)) die("hunk", path + " non-enumerated line " + JSON.stringify(line)); } }
// A line in both pre and post of one hunk must be an enumerated anchor, once in each, at the same index; an anchor never appears otherwise.
for (const path of paths) for (const hunk of spec.modules[path].hunks ?? []) for (const line of new Set([...hunk.pre, ...hunk.post])) { const at = hunk.pre.indexOf(line); if ((enumeratedAnchors.has(line) || (at !== -1 && hunk.post.includes(line))) && !(enumeratedAnchors.has(line) && at !== -1 && at === hunk.post.indexOf(line) && at === hunk.pre.lastIndexOf(line) && at === hunk.post.lastIndexOf(line))) die("hunk", path + " anchor " + JSON.stringify(line)); }
const specExports = paths.flatMap((path) => spec.modules[path].exportNames ?? []);
for (const name of [...specExports, ...enumeratedExports]) if (!enumeratedExports.has(name) || specExports.filter((other) => other === name).length !== 1) die("export_unlisted", name);
const preRaw = readFileSync(preFile, "utf8");
const pre = fmt(preRaw, srcPath).split("\n");
const owner = new Array(pre.length).fill(null);
if (mode === "ranges") { if (pre.join("\n") !== preRaw) die("prettier", preFile + " is not prettier-canonical"); for (const path of paths) for (const anchors of spec.modules[path].blocks) { const [start, end] = extract(pre, anchors, preFile); for (let index = start; index <= end; index += 1) { if (owner[index] !== null) die("overlap", String(index + 1)); owner[index] = path; } console.log(JSON.stringify({ module: path, anchors, sed: "sed -n " + (start + 1) + "," + (end + 1) + "p " + preFile })); } process.exit(0); }
const raws = Object.fromEntries(paths.map((path) => [path, readFileSync(path, "utf8")]));
for (const path of paths) if (fmt(raws[path], path) !== raws[path]) die("prettier", path + " is not prettier-canonical");
const posts = Object.fromEntries(paths.map((path) => [path, raws[path].split("\n")]));
const covers = {};
const glueText = (path) => posts[path].filter((line, index) => !covers[path].has(index)).join("\n");
mkdirSync(outDir, { recursive: true });
writeFileSync(dir + "/modules.txt", paths.join("\n") + "\n");
console.log(JSON.stringify({ preStep: preFile, preSha256: sha(preRaw), enumeratedSha256: sha(enumerated.join("\n") + "\n"), modules: paths }));
for (const path of paths) {
  const module = spec.modules[path];
  const post = posts[path];
  const covered = new Set();
  const ranges = module.blocks.map((anchors) => { const [ps, pe] = extract(pre, anchors, preFile); for (let index = ps; index <= pe; index += 1) { if (owner[index] !== null) die("overlap", String(index + 1)); owner[index] = path; } const [qs, qe] = extract(post, anchors, path); for (let index = qs; index <= qe; index += 1) covered.add(index); return { ps, pe, qs, qe }; }).sort((left, right) => left.ps - right.ps);
  covers[path] = covered;
  const exportNames = new Set(module.exportNames ?? []);
  const exportRe = new RegExp(decl.replace("(?:export )?", "export ") + "([A-Za-z0-9_$]+)", "u");
  const postLines = ranges.flatMap(({ qs, qe }) => post.slice(qs, qe + 1)).map((line) => { const match = exportRe.exec(line); return match && exportNames.has(match[1]) ? line.slice(7) : line; });
  for (const hunk of module.hunks ?? []) { const at = []; for (let index = 0; index + hunk.post.length <= postLines.length; index += 1) if (hunk.post.every((line, offset) => postLines[index + offset] === line)) at.push(index); if (at.length !== 1) die("hunk", path + " " + at.length + " " + JSON.stringify(hunk.post[0])); postLines.splice(at[0], hunk.post.length, ...hunk.pre); }
  const glueLines = post.flatMap((line, index) => (!covered.has(index) && line.trim() !== "" ? [[index + 1, line]] : []));
  const badGlue = firstNonGlue(glueLines);
  if (badGlue !== null) die("glue", path + ":" + badGlue);
  const name = basename(path);
  writeFileSync(outDir + "/" + name + ".pre", fmt(ranges.map(({ ps, pe }) => pre.slice(ps, pe + 1).join("\n")).join("\n") + "\n", srcPath));
  writeFileSync(outDir + "/" + name + ".post", fmt(postLines.join("\n") + "\n", path));
  console.log(JSON.stringify({ module: path, sha256: sha(raws[path]), blocks: ranges.map(({ ps, pe, qs, qe }) => [ps + 1, pe + 1, qs + 1, qe + 1]), exportNames: [...exportNames], hunks: (module.hunks ?? []).length, glueCount: glueLines.length, glue: glueLines }));
}
for (const path of paths) for (const name of spec.modules[path].exportNames ?? []) { const stem = basename(path).replace(/\.(?:[cm]?[jt]s)$/u, ""); const imported = paths.some((other) => other !== path && [...glueText(other).matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*"([^"]+)"/gu)].some(([, names, from]) => basename(from).replace(/\.(?:[cm]?[jt]s)$/u, "") === stem && new RegExp("(?:^|[\\s,])(?:type\\s+)?" + esc(name) + "(?:\\s|,|$)", "u").test(names))); if (!imported) die("export_unused", path + " " + name); }
const uncovered = pre.flatMap((line, index) => (owner[index] === null && line.trim() !== "" ? [[index + 1, line]] : []));
const badUncovered = firstNonGlue(uncovered);
if (badUncovered !== null) die("uncovered", preFile + ":" + badUncovered);
console.log(JSON.stringify({ uncoveredPre: uncovered }));
'
  if [ "$TASK551_MOVE_PHASE" = ranges ]; then
    bun --env-file=/dev/null -e "$task551_move_program" "$task551_move_pre" "$TASK551_MOVE_SRC" "$task551_move_dir" ranges
    exit 0
  fi
  rm -rf -- "$task551_move_dir/out" "$task551_move_dir/modules.txt" "$task551_move_dir/touched.sha256"
  bun --env-file=/dev/null -e "$task551_move_program" "$task551_move_pre" "$TASK551_MOVE_SRC" "$task551_move_dir" prove > "$task551_move_dir/proof.jsonl"
  test -s "$task551_move_dir/modules.txt"
  while IFS= read -r task551_move_module; do
    task551_move_name="$(basename -- "$task551_move_module")"
    diff -- "$task551_move_dir/out/$task551_move_name.pre" "$task551_move_dir/out/$task551_move_name.post" > "$task551_move_dir/out/$task551_move_name.diff" || { printf 'task551_move_proof_diff %s (see %s/out/%s.diff)\n' "$task551_move_module" "$task551_move_dir" "$task551_move_name" >&2; exit 1; }
    sha256sum -- "$task551_move_module" >> "$task551_move_dir/touched.sha256"
  done < "$task551_move_dir/modules.txt"
  ;;
*)
  printf 'invalid TASK551_MOVE_PHASE: %s\n' "$TASK551_MOVE_PHASE" >&2
  exit 1
  ;;
esac
```

**V5-2 Anchor pairs (binding; supersedes the numeric move ranges of V3-1a, V3-1b and V3-1d and the V4-1 range re-check as the delimitation authority).**
- **Resolution rule (the program above is normative).** A name anchor `N` resolves to the unique line matching `^(?:export )?(?:async )?(?:function\*? |const |let |class |type |interface )N` followed by a non-identifier character. A `describe:<title>` anchor resolves to the unique line that starts `describe("<title>",`. A block starts at its start-anchor line, extended upward over directly adjacent comment lines (no blank line between them). It ends at the last line of its end-anchor declaration: the line before the next non-blank column-0 line that does not start with `}`, `]` or `)`, with trailing blank lines dropped. `@EOF` means the last non-blank line of the file. A module whose last block ends at `@EOF` keeps its glue at the top. The same anchors delimit the block in the pre-step file and in the post-step module. A comment placed directly above a block's first line in the post-step module joins the block, so it fails `diff`; separate it with a blank line.
- **Numeric ranges are informative only.** The line ranges below were resolved by the rule on the HEAD working tree on 2026-09-25 (they match the v3/v4 ranges up to trailing blank lines). Pre-step files of later steps carry earlier-step edits, so their numbers shift while the anchors stay unique. Where a v3/v4 range and an anchor pair disagree, the anchor pair wins. V3-2 names no move range: its `bunLane.ts` and TASK-551-01-L01 anchors point into files that do not move, and they stay.

| Step / pre-step source | Target module | Blocks: start .. end anchor (ascending source order) | Informative HEAD lines |
|---|---|---|---|
| 1 `lib/task-551-dispatch-contract.mjs` | `lib/task-551-dispatch-primitives.mjs` | `TASK551_GRAPH_SCHEMA`..`TASK551_ENVELOPE_SCHEMA`; `TASK551_MAX_TASK_FILE_BYTES`..`TASK551_MAX_JSON_NODES`; `fail`..`parseDuplicateKeyAwareJson`; `requireNodeId`..`requireNodeId` | 10-11, 96-99, 103-360, 465-467 |
| 1 | `lib/task-551-dispatch-envelope.mjs` | `TASK551_ENVELOPE_KEYS`..`TASK551_REVIEW_BARRIER_KEYS`; `TASK551_OCCURRENCE_IDS`..`TASK551_ARTIFACT_POLICIES`; `requirePathList`..`requirePathList`; `requireCommandId`..`normalizeEnvelope` | 16-63, 71-95, 460-463, 469-825 |
| 1 | `lib/task-551-dispatch-contract.mjs` (facade) | `TASK551_SNAPSHOT_KEYS`..`TASK551_GRAPH_NODE_KEYS`; `TASK551_ALLOWED_STATUSES`..`TASK551_ALLOWED_STATUSES`; `TASK551_TASKS_PREFIX`..`TASK551_FENCED_JSON`; `collectTask551JsonFences`..`readTask551Metadata`; `normalizeGraph`..`@EOF` | 12-15, 64-70, 100-101, 362-458, 827-1054 |
| 1 uncovered (glue) | — | header comment, the `requireTask551L02WorkflowCompatibilityExtensions` import (moves to the envelope's glue) | 1-6, 8 |
| 3 `lib/task-551-worktree-compatibility.mjs` | `lib/task-551-phase-provenance.mjs` | `encoder`..`requireExactClosedPaths`; `TASK551_PLANNED_BUN_PATHS`..`TASK551_PLANNED_BUN_PATHS`; `TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS`..`TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS` (with its :879 comment) | 7-486 (:487 blank), 495-505, 879-880 |
| 3 | `lib/task-551-worktree-snapshot.mjs` | `PATH_DIGEST_KEYS`..`predecessors`; `predecessorPaths`..`requireExactActivePhaseSnapshotBeforeSpawn` | 638-877, 904-1082 |
| 3 | `lib/task-551-l01-barrier.mjs` | `MANIFEST_PATH`..`L03_ROW`; `exactStrings`..`requireTask551L01MaterializationBarrierBeforeL02` | 881-903, 1084-1510 |
| 3 | `lib/task-551-worktree-compatibility.mjs` (facade) | `TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA`..`COMPATIBILITY_FRAME_MAGIC` (with the :488 `// Descriptor-only bootstrap data` comment); `TASK551_L02_SUBGATE_KINDS`..`requireTask551WorkflowCompatibilityReceiptV2`; `NAMED_CLOSURE_KEYS`..`@EOF` (ends with the top-level `requireTask551WorktreeCompatibilityIntegrity();` call) | 488-494, 506-636, 1512-1725 |
| 3 uncovered (glue) | — | header comment, `node:crypto`/`node:util` imports | 1-2, 4-5 |
| 4 `task551AuthorAudit.test.ts` | `task551AuthorAuditFixtures.ts` | `ALL_PHASES`..`highFinding` (with the :37-39 banner); `uniqueTempDir`..`currentTask551DispatchSnapshot` | 37-68, 147-164 |
| 4 | `authorAuditBoundedChild.test.ts` | `FakeProc`..`L02_FREEZE_SMALL_CHILD` (with the :69-70 comment); `DiagnosticCarrier`..`describe:bounded child execution` (with the :1010-1012 banner) | 69-146, 1010-1241 |
| 4 | `task551AuthorAudit.test.ts` (kept) | `currentTask551TaskSnapshot`..`mutateTask551DispatchSnapshot`; `describe:research grounding and audit scopes`..`describe:targeted re-audit planning` (includes "clean-round rule") | 165-189, 255-639 |
| 4 | `authorAuditDriftRounds.test.ts` | `runFixtureGit`..`withTask551GitRepo`; `describe:drift-round orchestration`..`describe:drift-round orchestration` | 190-254, 640-1009 |
| 4 uncovered (glue) | — | header comment and imports | 1-36 |
| 5 `task551WorkflowContracts.test.ts` | `task551WorkflowContractsFixtures.ts` | `Digest`..`FileState`; `Worktree`..`barrierFixtures` | 74-75, 96-515 |
| 5 | `workflowContractsBootstrap.test.ts` | `MutableLogicalReceipt`..`MutableCommandReceipt`; `describe:TASK-551 L11 compatibility bootstrap and generic barrier`..(same) | 76-90, 1445-2087 |
| 5 | `task551WorkflowContracts.test.ts` (kept) | `Equal`..`Assert`; `describe:TASK-551 current-worktree snapshot contract`..(same) | 91-95, 1206-1443 |
| 5 | `task551WorkflowExecutionFixtures.ts` | `l02EvidenceRoot`..`task489Handoff` | 517-1204 |
| 5 | `workflowContractsSubgates.test.ts` | `describe:TASK-551 L02 injected subgates`..(same) | 2089-2264 |
| 5 | `workflowContractsImplementation.test.ts` | `describe:TASK-551 implementation workflow`..`@EOF` | 2266-2779 |
| 5 uncovered (glue) | — | imports | 1-72 |
| 6 `task551EvidenceContract.test.ts` | `task551EvidenceContractFixtures.ts` | `sha`..`evidenceRoot`; `processReceipt`..`processReceipt`; `adminStatementIds`..`evidenceValueFor` | 23-28, 85-92, 458-760 |
| 6 | `evidenceContractMatrix.test.ts` | `MutableEvidence`..`requireMutableEvidence`; `projectionInput`..`projectionInput`; `describe:TASK-551 evidence decoder and L10 projection`..`@EOF` | 29-44, 761-766, 802-1170 |
| 6 | `task551EvidenceContract.test.ts` (kept) | `TerminalCommittedHeadInput`..`MutableTerminalCommittedHeadInput`; `terminalCommittedHeadInput`..`expectTerminalCommittedHeadRejection`; `describe:terminal committed-HEAD handoff verifier`..`describe:strict canonical rows and recovery boundaries`; `evidenceTestHarness`..`staticWriterEvidenceValue` | 45-84, 94-150, 152-457, 767-800 |
| 6 uncovered (glue) | — | imports | 1-21 |

- `lib/` paths are under `_docs/_workflows/`, and test paths are under `tests/unit/workflows/`. The table's module sets equal the V3-1a/V3-1b/V3-1d rows as corrected by V4-1. The provenance block ends at :487 (:486 is its last non-blank line). The :488 comment belongs to the facade's first block.

**V5-3 Bun-lane manifest regeneration order (binding; supersedes V4-5 (a)-(d) where they conflict).** Nothing in TASK-551-11 regenerates `tests/bun-lane-manifest.json` (:319 pre-v4, :320 now: "L11 does not edit that file").
- The TASK-551-01-L01 classifier correction (the static contracted `task551` list) lands on its own. It is not bundled with the 11 re-open or with any regeneration, and it does not wait for either.
- A regeneration that lands BEFORE 11 step 6 cannot include all seven new test files, because each is absent until its creating step: `dispatchContractCaps.test.ts` at step 2; `authorAuditDriftRounds.test.ts` and `authorAuditBoundedChild.test.ts` at step 4; the three `workflowContracts*` tests at step 5; `evidenceContractMatrix.test.ts` at step 6. So after the next creating step, and at the latest after step 6, `tests/unit/toolchain/bunLaneManifest.test.ts` ("committed manifest equals a fresh classification run") turns red again until the NEXT regeneration.
- The 48-test gap of V4-5(b) is closed by whichever TASK-551-01-L01-owned regeneration lands AFTER step 6: a dated 01-L01 re-run under 01-L01's own contract, or 01-L01 FINAL. TASK-551-11 authorizes neither.
- The step-7 receipt records the manifest state and does not regenerate it: the exit code and pass/fail counts of `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test tests/unit/toolchain/bunLaneManifest.test.ts`; the fresh and committed row counts with their delta (0 when green; taken from the failing assertion's Expected/Received otherwise); the committed `generatedAt`; for each of the seven paths, whether it is a committed row (`grep -c '"file": "tests/unit/workflows/<name>"' tests/bun-lane-manifest.json`); and the pending regeneration by name ("first TASK-551-01-L01 regeneration after TASK-551-11 step 6").

**V5-4 LOW corrections (binding).**
- **V4-5 anchor.** The `:307` in V4-5 is `:319` (pre-v4; `:320` now).
- **10-L02 stale-anchor notice (adds to V4-6).** The `TASK-551-10-L02` line gains `:480-487` -> envelope (`requireLiteralArgv`). Its §1 cites `:480-487` for the literal-argv rule.
- **10-L02 handoffs (L11 edits none of these files; 10-L02 corrects them in its next append-only section).** §3 "Until step 1 of that re-open lands, `task-551-dispatch-contract.mjs:96` still reads `const TASK551_MAX_TASK_FILE_BYTES = 512 * 1024;`" should read: until step 2 (**V4-3**) lands, the constant reads `512 * 1024`. Before step 1 it is at `task-551-dispatch-contract.mjs:96`. From step 1 on it is in `lib/task-551-dispatch-primitives.mjs`, moved verbatim and not exported. Step 2 exports it and makes it `1024 * 1024`. §1 "This matches the 11 **V3-6** gate" should cite **V4-3** (gate A, 90 tests over the ten files).
- **Provenance range.** It ends at :487. The :488 `// Descriptor-only bootstrap data` comment stays with the facade (**V5-2** table).
- **Gate F literal argv (run from the repo root; bash required, the fence uses arrays).** Steps 1-6: `env TASK551_REOPEN_STEP=<n> bash -c "$(sed -n '978,996p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. Step 7: `env -u TASK551_REOPEN_STEP bash -c "$(sed -n '978,996p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. At v5 the fence opens at :977 and closes at :997, so its content is :978-:996. An in-place fence edit or an insertion above it shifts these numbers, and each step's receipt records the exact line pair it used together with the fence's first and last content lines.
- **Step-1 precondition.** `_docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md` must be at or under 524,288 UTF-8 bytes (522,753 on 2026-09-25). The cap stays `512 * 1024` until step 2 is green, and gate G reads every `TASK-551*` file after every step. Orchestrator rule: 03-L02 appends are frozen from step 1 until step 2 is green.
- **V3-1a primitives row.** "(new leaf; no import)" now reads "(new leaf; only the `node:util` builtin import)".
- **Step-1 receipt baselines.** The step-1 receipt records the measured parity lines (the P program output for all present dispatch/worktree modules and `lib/task-551-contract.mjs`; the V4-1 sibling digests were computed, not measured). It also records the baselines taken before the first edit: the SHA-256 of every present fenced path (the digest chain of V5-1 starts here) and the HEAD eslint and type baselines. The eslint baseline is `./node_modules/.bin/eslint --max-warnings=0 _docs/_workflows/lib/task-551-dispatch-contract.mjs _docs/_workflows/lib/task-551-worktree-compatibility.mjs`, which on 2026-09-25 gives exactly 2 errors, both in dispatch-contract: `165:14 no-undef TextEncoder` and `481:19 no-useless-escape`. worktree-compatibility is clean. The type baseline is the orchestrator's `bun run lint:repo:types` exit code and diagnostic count at HEAD.

**V5-5 Contract-file cap (in-place fence edit; supersedes V3-7).** v5 adds the pinned move-proof fence and the anchor table, so this contract grows past 1,300 physical lines. In place at :987, `awk 'NR > 1300 { exit 1 } END { if (NR > 1300) exit 1 }' "$task_contract"` becomes `awk 'NR > 1600 { exit 1 } END { if (NR > 1600) exit 1 }' "$task_contract"`. Reason: this is a task document, not a production module or test file, so the AGENTS.md 1,000-line gate does not apply. The cap only bounds review cost, and splitting an append-only contract would break its quoted anchors. The per-path caps, frozen ceilings and interim ceilings of the fence do not change. The contract also stays far below the 1,048,576-byte task-file cap that applies from step 2 on (about 249 KB after v5).

**V5-6 Superseded sentences (quoted; text authoritative).**
- V4-4 "Before editing, it copies the pre-step file to its session scratch directory (never `/tmp` or the repo)." now reads as the V5-1 `snapshot` phase (the session scratchpad may live under `/tmp/claude-*`; never the repo tree). V4-4 "After the move, for each target module it deletes only the glue lines (import/export lines, a leading `export ` on a moved declaration, header comments, and the named row/rename edits of the step). The concatenation of its moved blocks must then `diff`-equal the concatenation of the named pre-step ranges (exit 0)." now reads as V5-1: anchor-delimited pre-step blocks compared with the same blocks after stripping only the enumerated (a)-(e) edits. V4-4 "Glue lines total <= 60 per step, counted and reported." is withdrawn; glue is listed per line, with no numeric cap.
- V4-1 "with ranges provenance = :1-488 + :495-505 + :879-880, facade = :489-494 + :506-637 + :1512-1725, snapshot = :638-878 + :904-1083, barrier = :881-903 + :1084-1511" now reads as the **V5-2** table (provenance :7-487 + :495-505 + :879-880; facade :488-494 + :506-637 + :1512-1725; header :1-2 and imports :4-5 are glue). The re-check's findings are unchanged, because a comment line declares no name.
- V3-1a "(new leaf; no import)" now reads as **V5-4**. The move ranges of V3-1a ("Moves from" column), V3-1b ("Moves from" column) and V3-1d ("Content moved verbatim (pre-v3 lines)" column) are informative only (**V5-2**).
- V3-8 "The helper "exports only `ALL_PHASES`, `fullDiscovery`, `Finding`, `completed`, `lowFinding`, `highFinding` and `currentTask551DispatchSnapshot`" now also exports `uniqueTempDir`." now reads: the helper exports exactly the seven names in V5-1(a), and `ALL_PHASES` stays module-private.
- V4-3 "F = the complete sh fence with `TASK551_REOPEN_STEP=<n>` exits 0." now reads as the **V5-4** literal argv. V4-3 "Also `git diff --check` over the touched files." gains: "and M (**V5-1**) for steps 1 and 3-6".
- V4-5 "(:307 "L11 does not edit that file" stands)" now reads `:319` (pre-v4). V4-5(a) "are not manifest rows until TASK-551-01-L01 lands its audited classifier-ownership correction and regenerates the manifest." and "The separate 01-L01 correction fixes it before any regeneration." now read as **V5-3**: the correction lands on its own, and the rows join at the first 01-L01 regeneration after their creating step. V4-5(b) "48 of the 90 sidecar tests are outside `bun run test` until the correction lands" and "Owning follow-up: the TASK-551-01-L01 classifier correction." now read "until the first TASK-551-01-L01 regeneration after step 6" and "Owning follow-up: that regeneration". V4-5(c) "The re-open neither fixes nor worsens it." now reads as **V5-3**: each creating step makes the committed/fresh comparison red again until the next regeneration, and step 7 records the state. V4-5(d) "01-L01 keeps its FINAL regeneration." now reads: every regeneration is 01-L01-owned (a dated re-run under its own contract, or FINAL), and TASK-551-11 authorizes none.
- V4-6 "`TASK-551-10-L02`: `:554-556` -> envelope; `:96` -> primitives." gains "`:480-487` -> envelope". V4-6 (receipt) "verbatim-move diff result and glue count" now reads "the V5-1 move-proof record (snapshot digest, spec, proof lines with glue list and counts, diff output and exit)", and it adds the V5-3 manifest-state fields and the V5-4 step-1 baselines.
- V3-7 "After this amendment the contract is under 1,300 physical lines, so the sh-fence contract cap (:974, `NR > 1300`) stays as it is and is not raised." and the contract-file-cap amendment's "The contract-file cap is now at or under 1,300 physical lines." now read as **V5-5** (at or under 1,600). The v4 preamble's "the 1,300-line contract cap" and V3-8's "plus the contract-file cap of 1,300" now read 1,600.

### Amendment v6 (2026-09-25): proof robustness and durable evidence
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree) from orchestrator decisions V6-1 to V6-6 on the two independent v5 audits (0 HIGH / 6 MEDIUM). Append-only; text authoritative. It SUPERSEDES v5 (and, through v5, v4, v3 and the earlier 2026-09-25 amendments) where stated; every superseded sentence is quoted in **V6-7**. Everything in v5 that is not quoted there stays binding (the M scope of steps 1 and 3-6, the (a)-(e) edit classes, the **V5-2** anchor table and resolution rule, the snapshot digest chain, the **V5-3** manifest-state record, the **V5-4** baselines and precondition, the **V5-5** 1,600-line cap).
- **Line anchors.** `:NNN` anchors into this file use the pre-v6 numbering. v6 edits one fence in place: the move-proof fence content :1274-:1329 (56 lines) becomes 94 lines at :1274-:1367 (the closing fence moves from :1330 to :1368). Nothing above :1273 moves, so the **V5-4** gate F argv (`sed -n '978,996p'`) is unchanged. A pre-v6 anchor at :1330 or later is now at +38.
- **In-place fence edit (binding).** The fence after **V5-1** is the v6 program. It implements **V6-1** to **V6-4** and the glue rule of **V6-6**. Literal invocation, from the repo root, one call per phase: `env TASK551_MOVE_PHASE=<snapshot|prove> TASK551_MOVE_STEP=<1|3|4|5|6> TASK551_MOVE_SRC=<pre-step source path> bash -c "$(sed -n '1274,1367p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. Each receipt records the line pair it used and the fence's first and last content lines (`set -eu` / `esac`).

**V6-1 Module list from the spec (binding).**
- The program writes `<dir>/modules.txt`: the repo paths of `spec.modules`, in spec order, one per line. The sh loop reads that file and nothing else. For each listed module it writes `diff -- <dir>/out/<basename>.pre <dir>/out/<basename>.post` to `<dir>/out/<basename>.diff`, and any non-zero exit fails `task551_move_proof_diff <path>`. `TASK551_MOVE_MODULES` is removed; no caller-supplied module list exists.
- Spec shape (`task551_move_proof_spec`): the top level has only `modules`; each entry has only `blocks` (non-empty), `exportNames` and `hunks`; and the kept module (`TASK551_MOVE_SRC`, the facade or monolith of the step) must be an entry.
- Omitting a target module from the spec cannot pass. Its pre-step blocks stay uncovered and are not glue (`task551_move_proof_uncovered`), and its enumerated `export` entries stay unclaimed (`task551_move_proof_export_unlisted`). A module with an in-block change fails `task551_move_proof_diff`, including the kept module.

**V6-2 Whole-line hunks bound to the enumerated edit list (binding).**
- **`<dir>/enumerated-edits.txt`.** The orchestrator writes it from this contract before the step's snapshot. `snapshot` refuses to start without it and pins its SHA-256 in `<dir>/pre.sha256`; `prove` re-verifies that digest. Every line is exactly `export <name>` (an (a) name) or `line <exact source line>` (the pre form and the post form of every (b)-(d) line, verbatim including indentation). Any other line, or a missing final newline, fails `task551_move_proof_enumerated`.
- **Hunks.** A hunk is `{"pre": [lines], "post": [lines]}` with a non-empty `post`. Both arrays hold complete lines. After the (a) strip, `post` is matched as a run of consecutive whole lines in the module's block text (exact line equality, never a substring). It must match exactly once, and the run is then replaced by `pre`. Every `pre` line and every `post` line must equal a `line` entry. A hunk that carries any other line fails `task551_move_proof_hunk`, and that includes an unchanged context line. Context lines are forbidden: uniqueness must come from the enumerated lines themselves. When an enumerated run is not unique, the step fails and the orchestrator amends the enumeration under this contract.
- **Named insertion anchor (the only one).** In step 6 the two `[]` expected rows are identical to the existing `[]` rows at positions 4-5 of the **V3-3** list, so they cannot match exactly once on their own. The step-6 enumeration therefore also lists the unchanged 11th row line (the `task551EvidenceContract.test.ts` row `[lib/evidence-contract, implement]`) in its one pre/post form. That line opens both `pre` and `post` of the one `[]`-row hunk. Because only its unchanged form is enumerated, no hunk can edit it. Self-test A1/A2 (**V6-8**) exercise this mechanism.
- **Exports.** The union of `exportNames` over the spec modules must equal the set of `export` entries, and each name must be claimed by exactly one module (`task551_move_proof_export_unlisted`). `task551_move_proof_export_unused` stays.
- **Per-step enumeration (from V5-1 (a)-(d), as corrected by V6-6).** Step 1: `export` × 15 (the 14 primitives names and `normalizeEnvelope`); `line` × 2 (the V5-1(c) `requireLiteralArgv` regex line before and after, with its 6-space indent). Step 3: `export` × 24 (13 provenance helpers, 10 snapshot helpers, `MANIFEST_PATH`); `line` × 3 (the three new sidecar `ownedFiles` rows, 6-space indent; hunk `pre` is `[]`). Step 4: `export` × 7; `line` × 4 (the two rename lines before and after). Step 5: `export` = the helper names that a sibling imports; `line` = the five `expectedL11SidecarTests` rows (2-space indent), `    ]).toEqual([26, 19]);`, `    ]).toEqual([31, 19]);`, `    ).toBe(88);` and `    ).toBe(93);`. Step 6: `export` = the helper names that a sibling imports; `line` = the two read-list lines, the two `Promise.all` destructured binding lines, the two `privateImports` call-list lines, the two `[]` rows, and the insertion-anchor row. The step-5 and step-6 export names come from the orchestrator's name-level cross-reference over the **V5-2** blocks, and the receipt records them.

**V6-3 Prettier normalization (binding).**
- `prove` runs the repo prettier from the repo root as `./node_modules/.bin/prettier --config .prettierrc.json --stdin-filepath <path>` (that is, `<repo>/.prettierrc.json`). It formats the pre-step snapshot with the pre-step source path. Every post-step module must already be prettier-canonical: its on-disk bytes must equal their own prettier output, or the step fails `task551_move_proof_prettier`. The blocks are then resolved, the (a) exports stripped and the hunks reverse-applied. Finally both concatenations are formatted again (pre blocks with the source path, stripped post blocks with the module path), written to `out/<basename>.pre` and `.post`, and diffed.
- Result: legitimate re-wrapping passes. For example, `export const shaBytes = (value: Uint8Array): string => …` goes over `printWidth` 100 and is wrapped onto two lines; self-test P5 passes on it, while the v5 fence fails the same tree with a non-empty diff. The proof reads the on-disk post bytes and records their SHA-256 in `proof.jsonl` and `<dir>/touched.sha256`, so the committed bytes equal the proven bytes.
- Rule: no checkpoint commit between a step's snapshot and its green receipt. Take a wanted checkpoint before the snapshot. If a commit lands inside that window anyway, the step's evidence is void and the step is re-snapshotted after the commit, but only from a state whose step paths equal the previous step's receipted digests (the **V6-4** recovery path).
- The receipt records `./node_modules/.bin/prettier --version` (3.9.6 on 2026-09-25).

**V6-4 Durable evidence (binding).**
- The fence derives `<dir>` = `_docs/_workflows/_smoke/task-551/audit-evidence/11-reopen/step-<n>/` from `TASK551_MOVE_STEP`, relative to the repo root (it checks for `.prettierrc.json` and the prettier binary). `TASK551_MOVE_SCRATCH` is removed. Evidence never goes to `/tmp`, because container restarts wipe it. Contents: `enumerated-edits.txt` (orchestrator, before the snapshot); `pre/<basename>` and `pre.sha256` (snapshot); `spec.json` (implementer, before `prove`); `proof.jsonl` (a header line with the pre-step and enumeration digests, one line per module with its SHA-256, resolved blocks, export names, hunk count and glue list, then the uncovered pre-step lines), `modules.txt`, `out/<basename>.pre|.post|.diff` and `touched.sha256` (prove). `prove` deletes only its own `out/`, `modules.txt` and `touched.sha256` before it re-runs.
- The step-7 receipt references every one of these files by repo path and SHA-256. A green `.diff` is empty (`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). Step writers never stage the directory.
- Recovery. A lost or voided directory, a lost snapshot, or a `pre.sha256` mismatch (`task551_move_proof_snapshot`) means the step is redone from the previous step's committed or receipted state: the step paths equal the digests of the previous receipt (for step 1, the **V5-4** baselines). A fresh snapshot is then taken. No proof is ever rebuilt from memory. If a voided directory still exists, it is renamed `step-<n>.void-<UTC stamp>` and never deleted.

**V6-5 Regeneration order, collision guard and 03-L02 freeze (binding).**
- **V5-3 replacement.** "The TASK-551-01-L01 v2 correction, including its own V2-6 precondition and regeneration, lands under 01-L01's contract; it is not bundled with the 11 re-open and does not wait for it; if it runs before 11 step 6 it captures only the new test files that exist then."
- **Collision guard.** No 01-L01 precondition or regeneration run starts between an L11 step's snapshot and that step's green receipt.
- **03-L02 freeze.** The 03-L02 task file is 522,753 bytes, against the 524,288-byte dispatch cap that stays in force until step 2 is green. Every 03-L02 append is deferred until step 2 is green. That includes Round 6 and the L11-ripple mirrors requested by **V3-5**, **V4-6** and **V4-7**. The orchestrator holds those writers and records the freeze in `_docs/_workflows/_smoke/task-551/audit-evidence/03-l02-round6-dispositions.md` (already written: section "Orchestrator freeze (2026-09-25, after the TASK-551-11 v5 audit)"). 03-L02 restates the freeze in its first section written after step 2.
- **Recovery if the step-1 precondition fails.** The orchestrator reverts nothing. Step 2 cannot run before step 1, so the only path is to keep 03-L02 at or under 524,288 bytes (the freeze). This is binding.

**V6-6 LOW corrections (binding).**
- **Glue, anchored to whole lines.** Glue lines are single-line `import … from "…";?$` or `import "…";?$` lines; a multi-line `import {` / `import type {` / `export {` / `export type {` list whose name lines match `^  (?:type )?<name>(?: as <name>)?,?$` and that closes on `^} from "…";?$`; `export {…} from "…";?$` and `export * from "…";?$`; and full comment lines only (`//…`, a `/*…` line whose only `*/` is at its end, ` *…` continuation lines with no `*/` before the end, and ` */`). An `export {` list without `from`, a name line outside a list, and code after an import or comment all fail `task551_move_proof_glue` (post side) or `task551_move_proof_uncovered` (pre side). Self-test cases G1/G2 and the predicate table (**V6-8**) cover the three named shapes.
- **V5-1(d) step 6.** The step also enumerates the matrix test's `Promise.all` destructured binding list (`const [ … ] = await Promise.all([`, `task551EvidenceContract.test.ts:885-896` at HEAD). It gains the two bindings for the step-6 paths at their **V3-2** positions, next to the read-list, call-list and row edits.
- **List rationale.** The "closed five-path list" rationale of V3-2 and V4-5(a) is replaced by the TASK-551-01-L01 v2 static contracted list (26 entries; `TASK551_CONTRACTED_NONPLANNED_LANE_TEST_PATHS`, 01-L01 **V2-2**/**V2-3**). The three monoliths are entries 24-26 of that list. The twelve v1 Defect rows are members too. The no-`task551`-token naming rule for every new L11 test file stays binding, so no new L11 test needs a list entry (01-L01 **V2-2** growth rule).
- **T1 exception.** T1's source-text read of `TASK551_MAX_TASK_FILE_BYTES` is the one named exception to the "export exactly what a sibling imports" rule (V5-1(a) and the **V4-1** closed lists). Step 2 adds `export` to the constant (the primitives parity row of 15 names), but no sibling imports it. Its only reader is T1, which reads `lib/task-551-dispatch-primitives.mjs` as text and matches the **V4-6** regex. Step 2 is not a move step, so M never checks that export.
- **AuthorAudit informative ranges.** The **V5-2** step-4 HEAD ranges start 3 lines above the V3-1d ranges because the anchor rule pulls in the directly adjacent 3-line `// ----` banner: `task551AuthorAuditFixtures.ts` 37-68 (banner :37-39 above `ALL_PHASES` :40), the second `authorAuditBoundedChild.test.ts` block 1010-1241 (banner :1010-1012 above `DiagnosticCarrier` :1013), the kept block 255-639 (banner :255-257 above `describe` :258) and the drift block 640-1009 (banner :640-642). Self-test P4 resolved exactly these ranges. The ranges stay informative, and the anchors win.

**V6-7 Superseded sentences (quoted; text authoritative).**
- V5-1 "Glue is any post-step line outside every anchored block: import lines (including the name lines of a multi-line import list), `export {…} from` / `export type {…} from` lists, and header comments." now reads as the **V6-6** glue rule.
- V5-1 "Before `diff`, the post-step side has ONLY these enumerated edits stripped (reverse-applied):" now reads: before `diff`, both sides are prettier-normalized (**V6-3**), and the post-step side has only these enumerated edits stripped (reverse-applied).
- V5-1(d) "Step 6 (`evidenceContractMatrix.test.ts`, the matrix test): the read list and the `privateImports` call list each gain the two step-6 paths, and the expected rows gain `[]` and `[]` at their **V3-2** positions." gains the `Promise.all` binding list (**V6-6**) and the named insertion anchor (**V6-2**).
- V5-1 "(b)-(d) are written as hunks `{post: [lines], pre: [lines]}`. Each hunk is matched after the (a) strip. It carries enough unchanged context lines to match exactly once, or the program fails." now reads as **V6-2**: whole-line hunks, only enumerated lines, no context lines.
- V5-1 "Run it with bash from the repo root, one invocation per phase, as `env TASK551_MOVE_PHASE=<snapshot|prove> TASK551_MOVE_SCRATCH=<dir> TASK551_MOVE_SRC=<pre-step source path> [TASK551_MOVE_MODULES="<target basenames>"] bash -c "$(sed -n '<start>,<end>p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. The fence content is at :1274-:1329 at v5." now reads as the v6 literal invocation above (content :1274-:1367).
- V5-1 "It copies the working copy of `TASK551_MOVE_SRC` into `<dir>/pre/`, refuses to overwrite an earlier snapshot, and prints both SHA-256 values." gains: it refuses to start without `enumerated-edits.txt`, and it writes `pre.sha256` over the snapshot copy and the enumeration.
- V5-1 "`<dir>` is the implementer's session scratchpad (it may live under `/tmp/claude-*`), never the repo tree. If the snapshot is lost before `prove`, the step is not green: the orchestrator decides the recovery, and no proof is rebuilt from memory." now reads as **V6-4**: the durable step directory under the worktree, with the named recovery.
- V5-1 "The program writes `<dir>/out/<basename>.pre` and `.post`, and prints to `<dir>/proof.jsonl` one JSON line per module (resolved pre/post block lines, glue lines, glue count), then the uncovered pre-step lines." and "or an exported name with no sibling importer. Then `diff` must exit 0 with empty output for every target module." now read as **V6-1** to **V6-4**: the header line, the per-module SHA-256, `modules.txt`, the `.diff` files, `touched.sha256`, and the added codes `spec`, `enumerated`, `export_unlisted`, `prettier`, `snapshot` and `diff`. The diff covers every module in `modules.txt`.
- V5-1 "Each move step's receipt records: the snapshot path and SHA-256, `spec.json` (the enumerated-edit list), `proof.jsonl` (the glue list and counts per file), and each `diff` command with its output (empty) and exit code." now reads as **V6-4**: every step-directory file by path and SHA-256. The enumerated-edit list is `enumerated-edits.txt`, not `spec.json`.
- V5-1 "**Self-test (2026-09-25, scratchpad only; no repo file written).** The fence was run end-to-end on simulated step-1 and step-4 splits built from the HEAD working-tree files." and the rest of that paragraph are the historical record of the v5 fence. The v6 fence's record is **V6-8**.
- V5-3 "The TASK-551-01-L01 classifier correction (the static contracted `task551` list) lands on its own. It is not bundled with the 11 re-open or with any regeneration, and it does not wait for either." now reads as the **V6-5** replacement sentence.
- V5-4 "Orchestrator rule: 03-L02 appends are frozen from step 1 until step 2 is green." now reads: every 03-L02 append is frozen from this amendment until step 2 is green (**V6-5**).
- V5-6 "V4-4 "Before editing, it copies the pre-step file to its session scratch directory (never `/tmp` or the repo)." now reads as the V5-1 `snapshot` phase (the session scratchpad may live under `/tmp/claude-*`; never the repo tree)." now reads: the snapshot lives in the durable step directory (**V6-4**), never in `/tmp`.
- V4-6 "each owner corrects anchors in its next append-only section" and V3-5 "03-L02 corrects these anchors in its next append-only section." now read, for TASK-551-03-L02 only, "in its first append-only section written after step 2 is green" (**V6-5**).
- V3-2 "`scripts/task551QueryInventory/bunLane.ts:37-43` closes the non-planned `task551` lane-test list to five paths, and `:220-221` (`task551ManifestSlice`) treats any other manifest row whose path contains `task551` as an unplanned stray." and "The three monolith names are kept, so the closed five-path list and its TASK-551-01-L01 mirror (`TASK-551-01-L01…md:1758-1759`) stay valid." now read: "the 01-L01 v2 static contracted list (26 entries)" contracts `task551`-named non-planned rows, and any other such row is a stray. The three monoliths are entries 24-26. The no-`task551`-token naming rule stays binding.
- V4-5(a) "Twelve are `task551`-named integration tests (`tests/integration/server/task551*.test.ts`) outside the closed five-path list (`scripts/task551QueryInventory/bunLane.ts:37-43`, `task551ManifestSlice` `:218-221`)." now reads: at `9c5b6666` they are outside the historical five-path constant, and they are entries of the 01-L01 v2 static contracted list (26 entries), which 01-L01 lands under its own contract (**V6-5**).

**V6-8 Self-test (2026-09-25; session scratchpad only, so no repo file was written).** The fence text was extracted with `sed -n '1274,1367p'` from this file. Each case ran in a fresh scratch root that held the pre-step source, a `node_modules` symlink and `.prettierrc.json`. The post-step modules were generated from the **V5-2** informative HEAD line ranges (independently of the fence's anchor logic) and then prettier-formatted. For step 5, the pre-step source was the HEAD working copy with the step-4 pins `[26, 19]`/`88` seeded. Every case ended with the expected exit code and failure code:

| Case | Step | Mutation | Result |
|---|---|---|---|
| P1 | 1 | none (3 modules; 14 + 1 exports; regex hunk) | exit 0; resolved blocks = V5-2 ranges; 3 empty diffs |
| P4 | 4 | none (4 modules; 7 exports; 2 rename hunks) | exit 0; ranges as in V6-6; 4 empty diffs |
| P5 | 5 | none (6 modules; 5-row insertion hunk; 2 pin hunks; `shaBytes` re-wrapped) | exit 0; 6 empty diffs (the v5 fence: non-empty diff) |
| A1 / A2 | 5 | insertion hunk opened by an unchanged anchor row, enumerated / not enumerated | exit 0 / `hunk` |
| N1 | 1 | changed literal inside a moved envelope block | `diff` |
| N2 | 1 | unlisted `export function ownKeys` | `diff` |
| N3 | 1 | code line appended outside the blocks | `glue` |
| N4 | 1 | `ownKeys` listed and enumerated, no importer | `export_unused` |
| N5 | 1 | in-block change in the kept facade | `diff` |
| N6 / N6b | 1 | envelope omitted from the spec / and its `export` entry removed | `export_unlisted` / `uncovered` |
| N7 / N7b | 5 | context line next to the `[31, 19]` pin edited, declared as a hunk / undeclared | `hunk` / `diff` |
| N8 | 5 | substring hunk `[26, 19]` -> `[31, 19]` (even when enumerated) | `hunk` (0 whole-line matches) |
| N9 | 4 | rename hunk line missing from the enumeration | `hunk` |
| N10 | 1 | post module not prettier-canonical | `prettier` |
| N11 / N12 | 1 | snapshot copy / enumeration edited after the snapshot | `snapshot` / `snapshot` |
| N13 | 1 | spec export not enumerated | `export_unlisted` |
| G1 / G2 | 1 | `/* note */ const task551Hidden = 1;` / `export { fail as failAlias };` outside the blocks | `glue` / `glue` |
| S1-S4 | 1 | second snapshot / `TASK551_MOVE_STEP=2` / not the repo root / no enumeration | exit 1 each |

Predicate table (the glue function extracted from the fence; prettier-canonical files cannot contain the import shape): v6 rejects an import line with trailing code, a comment line with trailing code, `export { hidden };`, a multi-line `export {` list closed by `};`, an `import {` list closed without `from`, a bare name line outside a list, and ` */ code`. The v5 regex accepted five of these seven. v6 accepts single and multi-line imports, `export {…} from`, `export * from`, and full comment lines.

### Amendment v7 (2026-09-25): evidence location, prettier gate, pinned names
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree) from orchestrator decisions V7-1 to V7-5 on the two independent v6 audits (0 HIGH / 4 MEDIUM). Append-only; text authoritative. It SUPERSEDES v6 (and, through v6, v5, v4, v3 and the earlier 2026-09-25 amendments) where stated; every superseded sentence is quoted in **V7-6**. Everything in v6 that is not quoted there stays binding (the spec-derived module list, whole-line hunks, prettier normalization, the durable-evidence recovery and void-rename rule, the regeneration order, the collision guard, the 03-L02 freeze, the glue rule).
- **Line anchors.** `:NNN` anchors into this file use the pre-v7 numbering. v7 edits two fences in place. The move-proof fence content :1274-:1367 (94 lines) becomes 107 lines at :1274-:1380 (the closing fence moves from :1368 to :1381). The validation-fence contract-cap line :987 is replaced by one line (**V7-8**). Nothing above :1273 moves, so the **V5-4** gate F argv (`sed -n '978,996p'`) is unchanged. A pre-v7 anchor at :1368 or later is now at +13.
- **In-place fence edit (binding).** The fence after **V5-1** is the v7 program. Against v6 it changes only: the step directory (**V7-1**), the `.gitignore` check (`task551_move_proof_gitignore`, every phase), the snapshot name `pre/<basename>.snapshot` (**V7-2**), the `anchor` entry kind with its hunk and uniqueness checks (**V7-3**), and the new read-only phase `ranges` (**V7-4**); `ranges` and `prove` share one program held in the shell variable `task551_move_program`. Literal invocation, from the repo root, one call per phase: `env TASK551_MOVE_PHASE=<snapshot|ranges|prove> TASK551_MOVE_STEP=<1|3|4|5|6> TASK551_MOVE_SRC=<pre-step source path> bash -c "$(sed -n '1274,1380p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. Each receipt records the line pair it used and the fence's first and last content lines (`set -eu` / `esac`).

**V7-1 Evidence location (binding).**
- **Directory.** The durable step directory is `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/`, outside the closed canonical root `audit-evidence/`. That root admits only the eleven manifest destinations, and its recovery blocks on any foreign direct entry (:512, `task551_evidence_recovery_blocked_foreign_entry`).
- **Untracked by design.** The only tracked file under `11-reopen/` is `_docs/_workflows/_smoke/task-551/11-reopen/.gitignore`, with exactly two lines, `*` and `!.gitignore` (bytes `*\n!.gitignore\n`). The orchestrator creates it once, as step-1 setup before it writes the step-1 `enumerated-edits.txt`, create-if-absent and never rewritten; the fence byte-checks it in every phase. Git lets that deeper file override the root re-include `!_docs/_workflows/**` (root `.gitignore:24`) for the directory (verified on 2026-09-25 in a scratch repository with the same two rules: only the `.gitignore` is listed, `git check-ignore` names `11-reopen/.gitignore:1:*` for a step file). So `git status` never lists the evidence; the pre-commit formatter (`bun run format:staged`, staged files only) never touches a snapshot; the `git ls-files`-based smoke-evidence inventory (`tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts`) never sees it; and container restarts do not wipe it, because it lives under the worktree, not `/tmp`.
- **Closed mutation list (the re-open's evidence).** (1) `11-reopen/.gitignore` (orchestrator, once). Per step directory: (2) `enumerated-edits.txt` (orchestrator, before the snapshot); (3) `spec.json` (implementer, before `ranges`/`prove`); (4) `pre/<basename>.snapshot` and (5) `pre.sha256` (fence `snapshot`); (6) `proof.jsonl`, (7) `modules.txt`, (8) `out/` and (9) `touched.sha256` (fence `prove`); (10) `dryrun/` (implementer, **V7-4**). Void directories are renamed `step-<n>.void-<UTC stamp>` inside `11-reopen/` (**V6-4**) and never deleted. None of (1)-(10) belongs to any step's touched-file set: gates E and W, `git diff --check` and the step allowlist never list them, and no writer stages them.
- **Receipt.** The step-7 receipt `impl-11-reopen-20260925.json` (tracked, **V4-6**) cites every file of (1)-(10) by repo path and SHA-256 as EXTERNAL evidence. This is the convention already used for the untracked `audit-evidence/06-l02-r7-explain-receipt.json`, which the 06-L02 and 06-L03 contracts cite by path.
- **OWNER FOLLOW-UP (not this re-open; handoff to the orchestrator record).** `audit-evidence/` holds 11 untracked non-manifest files on 2026-09-25 (`git status --short --untracked-files=all`): `03-l02-faza0-dispositions.md`, `03-l02-round2-dispositions.md` .. `03-l02-round6-dispositions.md` (five), `06-l02-r7-explain-receipt.json`, `06-l02-r9-design-explain.json`, `06-l02-r9-f-floor-join-explain.json`, `06-l02-r9-f-floor-join-explain-part2.json` and `06-l02-r9-f2-prod-shape-explain.json`. Each is a foreign direct entry under :512, so the first durable-writer recovery over the canonical root blocks. They must be relocated, with every citing task file updated, before TASK-551-10-L02 closure. L11 moves none of them and cites none as its own evidence.

**V7-2 Prettier gate (binding).**
- **Gate E.** E = `./node_modules/.bin/eslint --max-warnings=0 <every file the step touched>` exits 0 AND `./node_modules/.bin/prettier --config .prettierrc.json --check <every file the step touched>` exits 0. Every touched file is therefore prettier-canonical at its green receipt, and a later `format:staged` commit cannot change receipted bytes. On 2026-09-25 `--check` exits 0 on all five pre-step sources (dispatch-contract, worktree-compatibility and the three test monoliths).
- **Proof side.** `prove` still requires every post module to be canonical (`task551_move_proof_prettier`); `ranges` also requires the snapshot to be canonical, so the raw `sed` line numbers equal the lines `prove` resolves.
- **Snapshot name.** The snapshot is `pre/<basename>.snapshot`, so no `*.mjs`/`*.ts` glob matches it. `--stdin-filepath` still uses the original source path (`TASK551_MOVE_SRC`), so the parser choice is unchanged.
- **Untracked inputs.** `spec.json` and `enumerated-edits.txt` are never staged (untracked directory) and are not source, so no canonical check applies to them.
- **Checkpoint commits.** V6-3 "Take a wanted checkpoint before the snapshot." stays. Every checkpoint commit is followed by a (re-)snapshot. A snapshot taken before a checkpoint commit of the same step is void: rename its directory (**V6-4**) and snapshot again. The new snapshot is admitted only when every step path's SHA-256 after the commit equals the latest receipted digest (the previous step's receipt; for step 1, the **V5-4** baselines). If a commit changed a step path (for example through `format:staged`), the equality fails and the orchestrator stops the step.

**V7-3 Pinned step-6 names and the mechanical anchor (binding).**
- **Style.** At HEAD the matrix test (`task551EvidenceContract.test.ts:884-896`) binds `authorTest,`, `workflowTest,` and `evidenceTest,` (6-space indent) and calls `privateImports(authorTest),` in the same indent.
- **Seed corrected.** The orchestrator seed named `authorDriftTest` and `authorBoundedTest` as the step-6 bindings. They bind `authorAuditDriftRounds.test.ts` and `authorAuditBoundedChild.test.ts`, which step 4 adds to the matrix test (**V4-3** step 4), so at step 6 they are pre-step bytes, and a step-6 hunk carrying them fails. Both names are pinned for step 4 instead (an ordinary step-4 edit of the evidence monolith, outside M; the step-4 helper binding is the implementer's choice and is recorded in its receipt). Step 6 adds V3-2 positions 12-13 (`evidenceContractMatrix.test.ts`, `task551EvidenceContractFixtures.ts`) directly after position 11 (`evidenceTest`) and before the step-2 caps entry. Its four pinned lines are:

```text
      evidenceMatrixTest,
      evidenceFixtures,
      privateImports(evidenceMatrixTest),
      privateImports(evidenceFixtures),
```

- **Step-6 enumeration (replaces the V6-2 step-6 list).** The `export` entries are the orchestrator's cross-reference names. Then `line` × 7: `      readFile(new URL("./evidenceContractMatrix.test.ts", import.meta.url), "utf8"),` and `      readFile(new URL("./task551EvidenceContractFixtures.ts", import.meta.url), "utf8"),` (85 and 89 columns; prettier keeps them on one line), the four pinned lines, and `      [],` once. Then `anchor ` followed by the unchanged 11th row ``      [`${base}lib/task-551-evidence-contract.mjs`, `${base}task-551-implement.mjs`].sort(),``. The `evidenceContractMatrix.test.ts` spec has four hunks: `{pre: [], post: [the two read lines]}`, `{pre: [], post: [the two bindings]}`, `{pre: [], post: [the two calls]}` and `{pre: [A], post: [A, "      [],", "      [],"]}`, where A is the anchor row.
- **Mechanical anchor (fence).** `enumerated-edits.txt` gains a third entry kind, `anchor <exact source line>`. In every hunk, a line present in both `pre` and `post` must be an `anchor` entry that occurs exactly once on each side at the same index. An `anchor` entry may appear in a hunk only in that shape. One text cannot be both `line` and `anchor`, entries must be unique, and a hunk whose `pre` equals its `post` fails. The codes are `task551_move_proof_hunk` (detail `anchor` or `shape`) and `task551_move_proof_enumerated`. Step 6 has exactly one `anchor` entry; steps 1, 3, 4 and 5 have none.

**V7-4 Mechanics for large moves (binding).**
- **`ranges` (the pinned line-number program).** After `snapshot` and with `spec.json` written, `env TASK551_MOVE_PHASE=ranges …` verifies `pre.sha256`, requires a canonical snapshot, resolves every spec block on the snapshot by the **V5-2** rule, and fails on a missing or non-unique anchor, a reversed pair or an overlap. It prints one JSON line per block, `{module, anchors, sed}`, where `sed` is `sed -n <start>,<end>p <snapshot path>`, and writes nothing.
- **Extraction.** Every target module of the step, the kept one included, is built only from those lines. The glue (imports, header comments) goes at the top. Each block is appended with its printed `sed -n '<start>,<end>p' <pre-snapshot> >> <target>` command, in printed order, with one blank line between blocks. Then only the enumerated edits are applied (the (a) `export ` prefixes and the (b)-(d) hunks), and then `prettier --config .prettierrc.json --write <target>` runs. Blocks are never retyped or pasted.
- **Dry-run (green condition D; mandatory for steps 3 and 6, optional for 1, 4 and 5).** After the real `snapshot` and before the first real edit, the implementer creates `<step dir>/dryrun/` as a scratch copy of the tree subset. It holds `.prettierrc.json`, a `node_modules` symlink to the repository's, and, at their repo-relative paths, `11-reopen/.gitignore`, `enumerated-edits.txt`, `spec.json` and the pre-step source. From `dryrun/` it runs `snapshot`, `ranges`, the extraction above and `prove`, which must exit 0 with an empty `.diff` per module. The real move then repeats the same build in the tree. Its `ranges` output must equal the dry-run's byte for byte, and after the real `prove` its `touched.sha256` must equal `dryrun/…/touched.sha256` byte for byte (same relative paths, same module bytes). The receipt records both digests. The **V4-3** green list gains D for steps 3 and 6.

**V7-5 Collision-guard mirror and 03-L02 stop (binding).**
- **Mirror (handoff; L11 edits no 01-L01 file).** TASK-551-01-L01 mirrors the **V6-5** collision guard ("No 01-L01 precondition or regeneration run starts between an L11 step's snapshot and that step's green receipt.") in its next append-only section.
- **03-L02 stop.** Before the step-1 snapshot the orchestrator measures `wc -c < _docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md` (522,753 on 2026-09-25). If it exceeds 524,288, the orchestrator STOPS and reports to the owner. It does not change the cap outside step 2, reorder steps 1 and 2, or trim or revert 03-L02 text.

**V7-6 Superseded sentences (quoted; text authoritative).**
- :37 "Outside this closed fourteen-source/declaration/three-test list and those eleven outputs, L11 implementation never mutates another workflow/lib helper, product path, unrelated task contract, closure path, DB, or environment file", in the **V4-8** reading "Outside the closed nineteen-source/declaration and fourteen test-lane list, those eleven outputs, and (for the 2026-09-25 re-open only) the create-if-absent receipt `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json`, …", now reads "…, that create-if-absent receipt, and (for the re-open only) the **V7-1** closed evidence list under `_docs/_workflows/_smoke/task-551/11-reopen/`, …".
- V4-3 "Only the step's allowlist changes." now reads "Only the step's allowlist and its **V7-1** evidence files change."
- V4-3 "E = `./node_modules/.bin/eslint --max-warnings=0 <every file the step touched>` exits 0." now reads as **V7-2** (eslint and `prettier --check`).
- V4-6 "This is the only receipt write of the re-open." now reads "This is the only tracked receipt write of the re-open; the **V7-1** files are untracked external evidence that it cites."
- V5-1 "`git show :<path>` is an acceptable source only when `git diff --quiet -- <path>` shows that the index equals the working copy." is withdrawn. The fence copies the working copy only.
- V6-2 "Every line is exactly `export <name>` (an (a) name) or `line <exact source line>` (the pre form and the post form of every (b)-(d) line, verbatim including indentation)." gains the `anchor` kind and the uniqueness rule (**V7-3**).
- V6-2 "The step-6 enumeration therefore also lists the unchanged 11th row line (the `task551EvidenceContract.test.ts` row `[lib/evidence-contract, implement]`) in its one pre/post form. That line opens both `pre` and `post` of the one `[]`-row hunk. Because only its unchanged form is enumerated, no hunk can edit it." now reads: the 11th row is enumerated once as an `anchor` entry and opens both sides of the `[]`-row hunk. Under v6 a hunk `{pre: [A], post: ["      [],"]}` could still replace it (self-test A4v6). From v7 on, the fence rejects any hunk that changes or moves an anchor (`task551_move_proof_hunk`).
- V6-2 (step 6) "`line` = the two read-list lines, the two `Promise.all` destructured binding lines, the two `privateImports` call-list lines, the two `[]` rows, and the insertion-anchor row." now reads as **V7-3**: `line` × 7 (the `[]` row once) and `anchor` × 1.
- V6-3 "If a commit lands inside that window anyway, the step's evidence is void and the step is re-snapshotted after the commit, but only from a state whose step paths equal the previous step's receipted digests (the **V6-4** recovery path)." gains the **V7-2** rule: every checkpoint commit, before or inside the window, is followed by a re-snapshot under digest equality.
- V6-4 "The fence derives `<dir>` = `_docs/_workflows/_smoke/task-551/audit-evidence/11-reopen/step-<n>/` from `TASK551_MOVE_STEP`, relative to the repo root (it checks for `.prettierrc.json` and the prettier binary)." now reads `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/` (and it byte-checks `11-reopen/.gitignore`). "`pre/<basename>` and `pre.sha256` (snapshot)" now reads `pre/<basename>.snapshot`. The "Contents:" list gains `dryrun/` (implementer). "The step-7 receipt references every one of these files by repo path and SHA-256." gains "as external untracked evidence (**V7-1**)".
- The v6 "In-place fence edit" invocation "`env TASK551_MOVE_PHASE=<snapshot|prove> TASK551_MOVE_STEP=<1|3|4|5|6> TASK551_MOVE_SRC=<pre-step source path> bash -c "$(sed -n '1274,1367p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`" now reads as the v7 invocation above (`<snapshot|ranges|prove>`, `sed -n '1274,1380p'`).
- V6-5 "The orchestrator reverts nothing. Step 2 cannot run before step 1, so the only path is to keep 03-L02 at or under 524,288 bytes (the freeze). This is binding." now reads as **V7-5** (measure before the step-1 snapshot; STOP and report above 524,288; no silent cap change).
- V5-6 "V4-3 "Also `git diff --check` over the touched files." gains: "and M (**V5-1**) for steps 1 and 3-6"" gains "and D (**V7-4**) for steps 3 and 6".

**V7-7 Self-test (2026-09-25; session scratchpad only, so no repo file was written).** The fence text was extracted with `sed -n '1274,1380p'` from this file after the edit. Each case ran in a fresh scratch root holding the pre-step source, a `node_modules` symlink, `.prettierrc.json` and `11-reopen/.gitignore`. Post modules were generated from the **V5-2** informative ranges (independently of the fence's anchor logic) and prettier-formatted. The pre-step sources were: step 3, the HEAD working copy with the step-1/2 provenance rows seeded (+2 `ownedFiles`, +1 `ownedTests`, so ranges +3); step 5, as in **V6-8**; step 6, the HEAD monolith with the step-2/4/5 matrix edits seeded (12 of 14 paths, **V7-3** names). All 45 cases ended as expected, including the 26 **V6-8** cases re-run:

| Case | Step | Mutation | Result |
|---|---|---|---|
| P1 / P3 / P4 / P5 / P6 | 1 / 3 / 4 / 5 / 6 | none | exit 0; resolved blocks = **V5-2** ranges (step 3 +3; step 6 matrix block to :1206 of the seeded source); 3 / 4 / 4 / 6 / 3 empty diffs |
| A1 | 5 | insertion hunk opened by an `anchor` entry | exit 0 |
| A2 / A2b | 5 | same anchor not enumerated / enumerated as `line` | `hunk` (non-enumerated / anchor) |
| A3 | 6 | anchor at another index (`post: ["[]", "[]", A]`) | `hunk` (anchor) |
| A4 | 6 | anchor row replaced by `[]`, hunk `{pre: [A], post: ["[]", "[]", "[]"]}` (A4v6: the v6 program exits 0) | `hunk` (anchor) |
| A5 / A6 | 6 | anchor enumerated as `line` / no-op hunk `{pre: [A], post: [A]}` | `hunk` (anchor / shape) |
| E1 / E2 | 1 / 6 | duplicate entry / one text as `line` and `anchor` | `enumerated` |
| N1-N13, G1, G2, S1-S4 | as **V6-8** | the **V6-8** mutations (N11 edits `pre/<basename>.snapshot`) | the **V6-8** codes |
| GI1 / GI2 | 1 | `11-reopen/.gitignore` missing / holding only `*` | `gitignore` (at `snapshot`) |
| R1, R3-R6 / R7 | 1, 3-6 / 1 | `ranges` / `ranges` on a non-canonical snapshot | exit 0, printed ranges = the P-case blocks / `prettier` |
| DR3 / DR6 | 3 / 6 | literal **V7-4** dry-run (`dryrun/` copy, `ranges`, `sed` extraction, enumerated edits, prettier, `prove`) | exit 0; 4 / 3 empty diffs |

**V7-8 Contract-file cap (in-place fence edit; supersedes the V5-5 value).** With v7 this contract is 1,602 physical lines, above the **V5-5** cap of 1,600, so the validation-fence gate at :987 would fail. In place at :987, `awk 'NR > 1600 { exit 1 } END { if (NR > 1600) exit 1 }' "$task_contract"` becomes `awk 'NR > 1900 { exit 1 } END { if (NR > 1900) exit 1 }' "$task_contract"`. The reason is the one in **V5-5**: this is a task document, not a production module or test file, so the AGENTS.md 1,000-line gate does not apply; the cap only bounds review cost; and splitting an append-only contract would break its quoted anchors. The per-path caps, frozen ceilings and interim ceilings do not change. **V5-5** "becomes `awk 'NR > 1600 { exit 1 } END { if (NR > 1600) exit 1 }' "$task_contract"`" and **V5-6** "now read as **V5-5** (at or under 1,600)" / "now read 1,600" now read 1,900.

### Amendment v8 (2026-09-25): untracked evidence model and step-7 gates
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree) from orchestrator decisions V8-1 to V8-5 on the v7 audit (0 HIGH / 1 MEDIUM / 3 LOW). Append-only; text authoritative. It SUPERSEDES v7 (and, through v7, v6, v5, v4, v3 and the earlier 2026-09-25 amendments) where stated; every superseded sentence is quoted in **V8-6**. Everything in v7 that is not quoted there stays binding (the step directory, the snapshot name, the `anchor` entry kind, the `ranges` phase, the extraction rule, D for steps 3 and 6, the collision-guard mirror, the 03-L02 stop, the 1,900-line cap).
- **Line anchors.** `:NNN` anchors into this file use the pre-v8 numbering. v8 edits one fence line in place: the `.gitignore` byte-check at :1280 (**V8-1**). It inserts nothing, so the move-proof fence content stays at :1274-:1380 (107 lines, first line `set -eu`, last line `esac`), the v7 literal invocation (`sed -n '1274,1380p'`) and the **V5-4** gate F argv (`sed -n '978,996p'`) are unchanged, and every pre-v8 anchor keeps its number.

**V8-1 Evidence model: fully untracked, self-ignoring `11-reopen/` (binding; supersedes the V7-1 `.gitignore` sentences quoted in V8-6).**
- **Content.** `_docs/_workflows/_smoke/task-551/11-reopen/.gitignore` is FULLY UNTRACKED and ignores itself. Its content is exactly one line, `*` (bytes `*\n`, SHA-256 `cdbcae15105d6b781e620813c79c7e868740d4e9cc53ce6f5fcbbc12387adf4b`). The fence line :1280 now reads `printf '*\n' | cmp -s -- - "$task551_move_root/.gitignore" || { printf 'task551_move_proof_gitignore %s/.gitignore must hold exactly the one line *\n' "$task551_move_root" >&2; exit 1; }` and still runs in every phase, before the phase switch. Any other bytes (missing file, the v7 two-line form, `*` without the final newline) fail `task551_move_proof_gitignore`.
- **Consequences (verified 2026-09-25 in a scratch repository carrying this repository's root `.gitignore`, including the re-include `!_docs/_workflows/**` at :24, plus the one-line `11-reopen/.gitignore` and step files).** The deeper `*` matches every path below `11-reopen/`, the `.gitignore` itself included, and git still reads it because the directory itself is not ignored. `git status --short --untracked-files=all` lists nothing under `11-reopen/`; `git add -A` stages nothing there; `git ls-files` and `git ls-files --others --exclude-standard` never see it; `git check-ignore -v` names `11-reopen/.gitignore:1:*` for the `.gitignore` and for every step file. So no file under `11-reopen/` is ever tracked. The `git ls-files`-based smoke-evidence inventory (`tests/unit/runtime-smoke/smoke-evidence-inventory.test.ts:78`, `git ls-files -z -- _docs/_workflows/_smoke`) is unaffected, and no inventory row, gloss or handoff to TASK-551-03-L02 is needed. `format:staged` never sees any of these files, because none is ever staged.
- **Bootstrap order.** The step-1 mandate's FIRST action, before the step-1 `enumerated-edits.txt` is written and before the first `snapshot`, is create-if-absent: `mkdir -p _docs/_workflows/_smoke/task-551/11-reopen && { test -e _docs/_workflows/_smoke/task-551/11-reopen/.gitignore || printf '*\n' > _docs/_workflows/_smoke/task-551/11-reopen/.gitignore; }` from the repo root. An existing file is never rewritten; if it holds other bytes, the first fence call fails `task551_move_proof_gitignore` and the orchestrator decides. The fence requires the file in every phase of every step.
- **Durability and recovery.** The directory lives under the worktree, not `/tmp`, so container restarts keep it. Because it is ignored, `git clean -x`/`-X` and removal of the worktree would delete it; neither runs in this worktree during the re-open. If `11-reopen/`, its `.gitignore` or any file of a step directory is lost, the affected step is redone under the **V6-4** recovery (step paths equal the previous receipted digests, fresh snapshot, nothing rebuilt from memory); the redo's first action recreates the directory and `.gitignore` create-if-absent with the same bytes.

**V8-2 Dry-run literal argv and the empty-fence failure (binding; extends V7-4).**
- **Why a literal argv.** In `dryrun/` the cwd is not the repo root, so `sed -n '1274,1380p' _docs/_TASKS/…` with a relative path reads nothing: the fence text is empty, `bash -c ""` exits 0, and nothing is printed (self-test EF). The fence cannot guard against its own absence, so the guard is in the caller and v8 adds no in-fence guard.
- **Literal dry-run call (one per phase; run from any cwd; `<n>` in 3 or 6, or 1/4/5 when chosen; `<phase>` in `snapshot`, `ranges`, `prove`):** `REPO=/home/coder/project/Coderso-551; FENCE="$(sed -n '1274,1380p' "$REPO/_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md")"; test "$(printf '%s\n' "$FENCE" | head -n 1)" = 'set -eu' && test "$(printf '%s\n' "$FENCE" | tail -n 1)" = esac && (cd "$REPO/_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/dryrun" && env TASK551_MOVE_PHASE=<phase> TASK551_MOVE_STEP=<n> TASK551_MOVE_SRC=<pre-step source path> bash -c "$FENCE")`. For `ranges` the subshell's call ends `bash -c "$FENCE" > ranges.jsonl)`, which writes `dryrun/ranges.jsonl`. The fence reads its phase from `TASK551_MOVE_PHASE` only; it takes no positional argument.
- **Real `ranges` output.** The real `ranges` call keeps the v7 invocation from the repo root and redirects its stdout to `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/ranges.jsonl`. The fence still writes nothing in `ranges`; the caller's redirect writes the file. The v7 equality "Its `ranges` output must equal the dry-run's byte for byte" is `cmp -- <step dir>/ranges.jsonl <step dir>/dryrun/ranges.jsonl` exit 0; the `touched.sha256` equality is `cmp -- <step dir>/touched.sha256 <step dir>/dryrun/_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/touched.sha256` exit 0.
- **Failed D.** D fails on: a fence text whose first line is not `set -eu` or whose last line is not `esac` (an empty text included); an empty `ranges.jsonl` or one whose line count differs from the number of spec blocks; any non-zero exit; any non-empty `.diff`; either `cmp` non-zero. An exit 0 with empty output is never green.

**V8-3 Step-7 citation of `dryrun/` (binding; supersedes the V7-1 receipt sentence quoted in V8-6).**
- The closed mutation list gains (11) `ranges.jsonl` in the step directory (implementer, the redirected stdout of the real `ranges` call, **V8-2**); `dryrun/ranges.jsonl` is part of (10).
- The step-7 receipt cites every file of (1)-(9) and (11) by repo path and SHA-256 as external evidence. Of (10) `dryrun/` it cites exactly two files by repo path and SHA-256: `<step dir>/dryrun/ranges.jsonl` and `<step dir>/dryrun/_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/touched.sha256`. It does not hash the rest of `dryrun/`: not the `node_modules` symlink, not `.prettierrc.json`, not the copied sources, and not the nested step-directory copy. Those two files carry the D evidence: equal to (11) and (9) by `cmp`.

**V8-4 Step-7 gate E (binding; refines V7-2 for `.json`).**
- Step 7 touches exactly one file, the receipt `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json`. It is written prettier-canonical (`./node_modules/.bin/prettier --config .prettierrc.json --write <receipt>` after writing), and step 7's E is `./node_modules/.bin/prettier --config .prettierrc.json --check <receipt>` exit 0. Any digest of the receipt is taken after that check.
- eslint is not applicable to `.json`: this repository's flat config has no `.json` configuration, so `./node_modules/.bin/eslint --max-warnings=0 <file>.json` reports `File ignored because no matching configuration was supplied` and exits 1 (checked on 2026-09-25 against `impl-11-classifier-gate.json`). The eslint half of E therefore covers every touched file with an eslint configuration and excludes `.json`; the prettier half covers every touched file, `.json` included.
- `format:staged` formats `.json` (`scripts/format-staged.ts:8`), so the V7-2 claim "a later `format:staged` commit cannot change receipted bytes" now also holds for the receipt.

**V8-5 Hunk wording after V7-3 and the step-6 line references (binding).**
- The V6-2 hunk sentences are re-read under the **V7-3** `anchor` kind (quoted in **V8-6**). The fence already implements this reading (v7 program; self-test A1-A6).
- Step-6 lists at HEAD in `tests/unit/workflows/task551EvidenceContract.test.ts`: the `Promise.all` destructured binding list is :885-896 (`authorTest,` / `workflowTest,` / `evidenceTest,` at :890-892), and the `privateImports` call list is :970-972.

**V8-6 Superseded sentences (quoted; text authoritative).**
- V7-1 "The only tracked file under `11-reopen/` is `_docs/_workflows/_smoke/task-551/11-reopen/.gitignore`, with exactly two lines, `*` and `!.gitignore` (bytes `*\n!.gitignore\n`)." now reads: no file under `11-reopen/` is tracked; `11-reopen/.gitignore` is untracked, self-ignoring, and exactly one line `*` (bytes `*\n`) (**V8-1**).
- V7-1 "The orchestrator creates it once, as step-1 setup before it writes the step-1 `enumerated-edits.txt`, create-if-absent and never rewritten; the fence byte-checks it in every phase." now reads as the **V8-1** bootstrap order (the step-1 mandate's first action, create-if-absent, before `enumerated-edits.txt` and the first snapshot; the fence byte-checks `*\n` in every phase).
- V7-1 "Git lets that deeper file override the root re-include `!_docs/_workflows/**` (root `.gitignore:24`) for the directory (verified on 2026-09-25 in a scratch repository with the same two rules: only the `.gitignore` is listed, `git check-ignore` names `11-reopen/.gitignore:1:*` for a step file)." now reads as the **V8-1** consequences (nothing is listed; `check-ignore` names `11-reopen/.gitignore:1:*` for the `.gitignore` too).
- V7-1 "(1) `11-reopen/.gitignore` (orchestrator, once)." now reads "(1) `11-reopen/.gitignore` (step-1 mandate, first action, create-if-absent; untracked)". "(10) `dryrun/` (implementer, **V7-4**)." gains "(11) `ranges.jsonl` (implementer, **V8-2**)", and "None of (1)-(10) belongs to any step's touched-file set" now reads "None of (1)-(11) …".
- V7-1 "The step-7 receipt `impl-11-reopen-20260925.json` (tracked, **V4-6**) cites every file of (1)-(10) by repo path and SHA-256 as EXTERNAL evidence." now reads as **V8-3** ((1)-(9) and (11) in full; of (10) only `dryrun/ranges.jsonl` and the nested `touched.sha256`).
- V7-2 "E = `./node_modules/.bin/eslint --max-warnings=0 <every file the step touched>` exits 0 AND `./node_modules/.bin/prettier --config .prettierrc.json --check <every file the step touched>` exits 0." now reads as **V8-4** (eslint on every touched file with an eslint configuration, `.json` excluded; prettier on every touched file; step 7 = prettier on the receipt).
- V7-4 "It holds `.prettierrc.json`, a `node_modules` symlink to the repository's, and, at their repo-relative paths, `11-reopen/.gitignore`, `enumerated-edits.txt`, `spec.json` and the pre-step source. From `dryrun/` it runs `snapshot`, `ranges`, the extraction above and `prove`, which must exit 0 with an empty `.diff` per module." gains the **V8-2** literal argv (fence extracted from the absolute repo path, cwd `dryrun/`, first/last-line guard) and the failed-D list.
- V7-4 "Its `ranges` output must equal the dry-run's byte for byte, and after the real `prove` its `touched.sha256` must equal `dryrun/…/touched.sha256` byte for byte (same relative paths, same module bytes). The receipt records both digests." now reads as the **V8-2** `cmp` pair over `ranges.jsonl` and `touched.sha256`, with the four files cited per **V8-3**.
- V7-7 "| GI1 / GI2 | 1 | `11-reopen/.gitignore` missing / holding only `*` | `gitignore` (at `snapshot`) |" is the historical record of the v7 byte-check. Under v8, holding only `*` (`*\n`) is the passing case; the v8 record is **V8-7**.
- V6-2 "Every `pre` line and every `post` line must equal a `line` entry." now reads "Every `pre` line and every `post` line must equal a `line` or `anchor` entry; the only allowed unchanged line is an `anchor` per **V7-3**."
- V6-2 "A hunk that carries any other line fails `task551_move_proof_hunk`, and that includes an unchanged context line." now reads "…, and that includes an unchanged context line that is not an `anchor` placed per **V7-3**."
- V6-2 "Context lines are forbidden: uniqueness must come from the enumerated lines themselves." now reads "Context lines are forbidden except an `anchor` entry placed per **V7-3**; uniqueness must come from the enumerated `line` and `anchor` entries themselves."
- V7-3 "At HEAD the matrix test (`task551EvidenceContract.test.ts:884-896`) binds `authorTest,`, `workflowTest,` and `evidenceTest,` (6-space indent) and calls `privateImports(authorTest),` in the same indent." now reads with the **V8-5** references: bindings in the list :885-896 (at :890-892), calls in the list :970-972.

**V8-7 Self-test (2026-09-25; session scratchpad only, so no repo file was written).** The fence text was extracted with `sed -n '1274,1380p'` from this file after the :1280 edit (first line `set -eu`, last line `esac`). Each case ran in a fresh scratch root holding `.prettierrc.json`, a `node_modules` symlink and a synthetic step-1 split: pre-step `lib/demo.mjs` (one import, `kept`, `helper`), post modules `lib/demo.mjs` and `lib/demo-helper.mjs`, enumeration `export helper`. Only the byte-check line changed, so every v7 case that passes that line reaches unchanged code; the **V7-7** cases were not re-run.

| Case | Mutation | Result |
|---|---|---|
| GI1 | `11-reopen/.gitignore` missing | `gitignore` (at `snapshot`), exit 1 |
| GI2 | `.gitignore` holding the v7 bytes `*\n!.gitignore\n` | `gitignore` (at `snapshot`), exit 1 |
| GI3 | `.gitignore` holding `*` without the final newline | `gitignore`, exit 1 |
| GI4 | `.gitignore` rewritten to the v7 bytes after a green `snapshot` | `gitignore` (at `prove`), exit 1 |
| P | none (`.gitignore` = `*\n`) | `snapshot`, `ranges` (2 lines) and `prove` exit 0; 2 empty diffs |
| DR | literal **V8-2** dry-run (`dryrun/` under the step directory, cwd `dryrun/`, fence from the absolute path), then the real run from the scratch root | all phases exit 0; both `cmp` pairs (`ranges.jsonl`, `touched.sha256`) exit 0 |
| EF | `sed` with the relative contract path from cwd `dryrun/` | fence text empty; `bash -c ""` exits 0 with 0 bytes; the **V8-2** first/last-line guard exits 1 |
| GIT | scratch repository with the root `.gitignore` and the one-line `11-reopen/.gitignore` | `git status --short --untracked-files=all`, `git add -A` + `git ls-files`, and `git ls-files --others --exclude-standard` list nothing under `11-reopen/`; `check-ignore -v` names `11-reopen/.gitignore:1:*` for the `.gitignore` and step files |

### Amendment v9 (2026-09-25): bootstrap actor, checkpoint commits, guarded fence calls
Recorded at HEAD `9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` (working tree, worktree branch `feat/task-551-db-cache`) from orchestrator decisions V9-1 to V9-5 on the v8 audit (0 HIGH / 4 MEDIUM / 3 LOW). Append-only; text authoritative. It SUPERSEDES v8 (and, through v8, v7, v6, v5, v4, v3 and the earlier 2026-09-25 amendments) where stated; every superseded sentence is quoted in **V9-6**. Everything in v8 that is not quoted there stays binding (the fully untracked, self-ignoring `11-reopen/` and the :1280 byte-check, the **V8-2** dry-run argv and failed-D list, the (11) `ranges.jsonl` entry, the **V8-4** step-7 gate E, the **V8-5** references).
- **Line anchors.** `:NNN` anchors into this file use the pre-v9 numbering. v9 edits no fence and inserts nothing above this amendment, so every pre-v9 anchor keeps its number: the move-proof fence content stays :1274-:1380 (first line `set -eu`, last line `esac`) and the gate F fence content stays :978-:996 (first line `set -eu`, last line `git diff --check -- "$task_contract"`).

**V9-1 Bootstrap: one actor, the orchestrator (binding; supersedes the V8-1 bootstrap sentences and the V8-6 item (1) replacement quoted in V9-6).**
- **Order.** Before it dispatches the step-1 mandate, the orchestrator runs, from the repo root `/home/coder/project/Coderso-551`, in this order:
  - (a) create-if-absent of the directory and its `.gitignore`: `mkdir -p _docs/_workflows/_smoke/task-551/11-reopen && { test -e _docs/_workflows/_smoke/task-551/11-reopen/.gitignore || printf '*\n' > _docs/_workflows/_smoke/task-551/11-reopen/.gitignore; }`. An existing file is never rewritten.
  - (b) the bootstrap check: `printf '*\n' | cmp -- - _docs/_workflows/_smoke/task-551/11-reopen/.gitignore` exits 0, and `git status --porcelain --untracked-files=all -- _docs/_workflows/_smoke/task-551/11-reopen` exits 0 and prints nothing. Both commands, their exit codes and their (empty) outputs go into the step-1 receipt entry (the orchestrator's per-step gate record, **V4-6**). If either check fails, no mandate is dispatched and the orchestrator decides.
  - (c) it writes `_docs/_workflows/_smoke/task-551/11-reopen/step-1/enumerated-edits.txt`. **V7-1** item (2), "(orchestrator, before the snapshot)", stands.
- **Mandate start.** Only after (a)-(c) (and the **V7-5** 03-L02 measurement, unchanged) is the step-1 mandate dispatched. Its first fence call is the real `snapshot` (**V9-3**). No mandate creates `11-reopen/`, its `.gitignore` or any `enumerated-edits.txt`. For steps 3-6 the orchestrator writes (c) for `step-<n>/` before it dispatches that step.
- **Redo.** Whenever **V9-2** requires a directory to be recreated for a step that is not yet green, the same actor runs the same order: the orchestrator repeats (a), (b) (recorded in that step's receipt entry) and (c) for that step, and only then dispatches the redo mandate, which again starts with `snapshot`.

**V9-2 Checkpoint commits: durable pre-step state (binding).**
- **One commit per green step.** After EVERY green step (1-7), once its receipt entry is written, the orchestrator makes one snapshot commit on the worktree branch `feat/task-551-db-cache`. The owner has standing authorization for snapshot commits on this worktree branch. It never commits on `feat/implementations` or `main`, and it never pushes. The message is `test(task551-11): re-open step <n> — <scope>`, where `<scope>` is the step's **V4-3** title (1 `dispatch-contract split`, 2 `byte cap`, 3 `worktree-compatibility split`, 4 `author-audit split`, 5 `workflow-contracts split`, 6 `evidence-contract split`, 7 `final provenance/fence counts + receipt`). Per the repo rule it runs `bun run precommit` before the commit, or commits through the configured hook path.
- **Commit content.** The commit holds exactly the step's touched files: `git diff --cached --name-only` before the commit and `git show --name-only --format= <sha>` after it both list exactly those paths. No other path of the dirty tree is staged. Nothing under `11-reopen/` can be staged, because `git add` refuses ignored paths without `-f` (checked 2026-09-25, **V9-7**).
- **Receipted bytes = committed bytes.** After the commit, every touched file's SHA-256 in the working tree and in `git show <sha>:<path>` equals the digest in the step's receipt entry; the entry then records the commit sha. If the commit changed a touched file (for example through `format:staged`), the equality fails and the orchestrator stops the re-open (the **V7-2** stop rule, unchanged).
- **Pre-step state.** The step-k snapshot is taken AFTER the step k−1 commit, from the committed step k−1 state. The pre-step bytes of step k are then recoverable from that commit (`git show <sha_{k-1}>:<path>`); for step 1 the reference is HEAD `9c5b6666` plus the **V5-4** baselines. This order satisfies the **V7-2**/**V6-3** rule that a checkpoint commit is followed by a (re-)snapshot. The **V6-3** rule "no checkpoint commit between a step's snapshot and its green receipt" stays. Before each step-k snapshot the orchestrator runs `git diff --quiet <sha_{k-1}> -- <every present step-k path>` (step 1: `9c5b6666`) and records the exit code. Exit 0 proves commit-recoverability. A non-zero exit means some pre-step bytes exist only in the working tree: the **V6-4** receipted-digest recovery stays their only recovery, and the receipt names those paths.
- **Known uncommitted pre-step bytes (2026-09-25; orchestrator decision required before the step-4 snapshot).** `tests/unit/workflows/task551AuthorAudit.test.ts`, the step-4 pre-step source, differs from HEAD `9c5b6666` in the working tree (4 pin lines, `occurrenceCount` and the dispatch-order set size 32 -> 33, at :327, :336, :742 and :991; not authored by L11). Steps 1-3 do not touch it, so no step 1-3 commit contains it. Its step-4 pre-step bytes are therefore not commit-recoverable: only the **V5-4** step-1 baseline digest and the step-4 `pre/task551AuthorAudit.test.ts.snapshot` cover them. The step-4 checkpoint commit would also carry that foreign 4-line change together with the step-4 edits. v9 does not decide either consequence.
- **Redo rule (supersedes the V8-1 and V6-4 recovery sentences quoted in V9-6).** A landed step (green and committed) is never reverted and never redone. If `11-reopen/`, its `.gitignore` or any step-directory file is lost after step k is green, the step-7 receipt names each lost item of (1)-(11) for every green step j ≤ k, and cites the step-j commit sha, with the orchestrator's step-j gate record, as the evidence of record for those items. Nothing is regenerated for a green step, and no proof is rebuilt from memory. Fence artefacts are regenerated only for steps that are not yet green: the orchestrator recreates the directory per **V9-1**, the step restarts from the step k commit (every step path equal to its `git show <sha_k>:<path>` digest, which is also the latest receipted digest), and a fresh `snapshot` is taken. A voided directory of a step that is not yet green keeps the **V6-4** rename rule.

**V9-3 Guarded form for every real fence call (binding; extends V8-2 to every real call).**
- **Literal forms.** Every real move-proof call (`snapshot`, `ranges`, `prove`) and every gate F call uses the guarded form. The guard checks the extracted fence's first and last content lines before running it. Substitute `<n>`, `<phase>` and `<repo-relative path>` literally:

```text
# move proof, real snapshot/prove (<n> in 1, 3, 4, 5, 6; <phase> in snapshot, prove)
REPO=/home/coder/project/Coderso-551; cd "$REPO"; FENCE="$(sed -n '1274,1380p' "$REPO/_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md")"; [ "$(printf '%s\n' "$FENCE" | head -n 1)" = "set -eu" ] && [ "$(printf '%s\n' "$FENCE" | tail -n 1)" = "esac" ] || exit 1; env TASK551_MOVE_STEP=<n> TASK551_MOVE_PHASE=<phase> TASK551_MOVE_SRC=<repo-relative path> bash -c "$FENCE"
# move proof, real ranges: the same line with <phase> = ranges, ending
... bash -c "$FENCE" > "_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/ranges.jsonl"
# gate F, steps 1-6
REPO=/home/coder/project/Coderso-551; cd "$REPO"; FENCE="$(sed -n '978,996p' "$REPO/_docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md")"; [ "$(printf '%s\n' "$FENCE" | head -n 1)" = "set -eu" ] && [ "$(printf '%s\n' "$FENCE" | tail -n 1)" = 'git diff --check -- "$task_contract"' ] || exit 1; env TASK551_REOPEN_STEP=<n> bash -c "$FENCE"
# gate F, step 7: the same line ending
... || exit 1; env -u TASK551_REOPEN_STEP bash -c "$FENCE"
```

- **Repo-relative source.** `TASK551_MOVE_SRC` is the repo-relative path (for example `_docs/_workflows/lib/task-551-dispatch-contract.mjs`) in every form: real calls, and the **V8-2** dry-run call, where the source copy sits at the same relative path under `dryrun/`. It is never absolute and never `./`-prefixed. The fence copies it relative to the cwd (:1286), and `spec.json` must name it verbatim as a module key (:1321); an absolute or `./` form fails `task551_move_proof_spec` (**V9-7**).
- **Exit 0 with empty output is never green.** The guard's `exit 1` (an empty or shifted fence text) is a failed call. Each call also needs its minimum evidence:
  - `snapshot` prints exactly 3 lines (the source SHA-256, then the two `pre.sha256` lines) and leaves `pre/<basename>.snapshot` and `pre.sha256`.
  - `ranges` leaves `ranges.jsonl` with exactly the pinned block count below.
  - `prove` prints nothing on the terminal, because its program output goes to `proof.jsonl` (:1368). It is green only when `proof.jsonl` has exactly modules + 2 lines (the header, one line per module, the `uncoveredPre` line), when `modules.txt` and `touched.sha256` each have exactly the pinned module count, and when every `out/<basename>.diff` of `modules.txt` is empty.
  - Gate F prints its `grep -n` matches (non-empty) and exits 0.
- **Pinned counts per step.** From the **V5-2** table. The fence's `ranges` prints one line per spec BLOCK, not per module (:1330); a module with several blocks prints several lines (**V8-2** "the number of spec blocks" stands). The dry-run's `dryrun/ranges.jsonl` has the same count.

| Step | Modules (`modules.txt`, `touched.sha256`, `.diff` files) | Blocks = `ranges.jsonl` lines (per module, **V5-2** row order) | `proof.jsonl` lines |
|---|---|---|---|
| 1 | 3 | 13 (4 + 4 + 5) | 5 |
| 3 | 4 | 10 (3 + 2 + 2 + 3) | 6 |
| 4 | 4 | 8 (2 + 2 + 2 + 2) | 6 |
| 5 | 6 | 9 (2 + 2 + 2 + 1 + 1 + 1) | 8 |
| 6 | 3 | 10 (3 + 3 + 4) | 5 |

- **Re-running `prove`.** Every `prove` call first deletes `out/`, `modules.txt` and `touched.sha256` (:1367) and truncates `proof.jsonl` (:1368). Any edit to a step module after a green `prove` therefore invalidates the earlier `out/*.diff` and `touched.sha256`: `prove` must run again, and only the artefacts of the last `prove` run count. A failed re-run leaves the step not green, because the earlier artefacts are already gone (**V9-7**). For a step with D, both **V8-2** `cmp` checks are taken after the last real `prove`. The receipt-entry digests of the step's modules are taken after that same run and must equal its `touched.sha256`.

**V9-4 `git diff --check` over new files (binding; refines the V4-3 gate sentence).**
- `git diff --check` compares the working tree with the index, so it silently skips an untracked new file. In a scratch repository on 2026-09-25, trailing whitespace in an untracked file gave exit 0; after `git add -N` the same file gave exit 2 (**V9-7**).
- The V4-3 gate sentence therefore reads: "Also run `git add -N -- <every file the step creates>`, then `git diff --check -- <every file the step touched>`, which must exit 0 with empty output."
- The intent-to-add entry records the path with no content. `git reset -- <new files>` is NOT needed afterwards, because the step's checkpoint commit (**V9-2**) adds those files in full anyway. `git add -N` refuses ignored paths without `-f`, so it cannot register `11-reopen/` evidence; the gate lists only step-allowlist paths.
- Files created per step: 1 `lib/task-551-dispatch-primitives.mjs`, `lib/task-551-dispatch-envelope.mjs`; 2 `dispatchContractCaps.test.ts`; 3 `lib/task-551-phase-provenance.mjs`, `lib/task-551-worktree-snapshot.mjs`, `lib/task-551-l01-barrier.mjs`; 4 `authorAuditDriftRounds.test.ts`, `authorAuditBoundedChild.test.ts`, `task551AuthorAuditFixtures.ts`; 5 `workflowContractsBootstrap.test.ts`, `workflowContractsSubgates.test.ts`, `workflowContractsImplementation.test.ts`, `task551WorkflowContractsFixtures.ts`, `task551WorkflowExecutionFixtures.ts`; 6 `evidenceContractMatrix.test.ts`, `task551EvidenceContractFixtures.ts`; 7 the receipt `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` (when absent). These are the gate F `task551_reopen_pending` rows with `-`, plus the receipt.

**V9-5 LOW corrections (binding).**
- **Conditional dry-run citation.** For a step that ran a dry-run, the step-7 receipt cites the two **V8-3** files of (10). Steps 3 and 6 always run one; steps 1, 4 and 5 run one only when chosen. A step without `dryrun/` cites no (10) file. Steps 2 and 7 have no step directory and cite none of (2)-(11).
- **Pinned digest confirmed.** `printf '*\n' | sha256sum` printed `cdbcae15105d6b781e620813c79c7e868740d4e9cc53ce6f5fcbbc12387adf4b` on 2026-09-25, so the **V8-1** value is correct.
- **V8-3 wording.** The receipt cites (1) once for the re-open, not per step. The directory (8) `out/` is cited file by file (`out/<basename>.pre`, `.post` and `.diff` for every module in `modules.txt`; each green `.diff` has the empty-file digest `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`). The D evidence reads: `dryrun/ranges.jsonl` equals (11), and the nested `dryrun/…/touched.sha256` equals (9). Each equality is the **V8-2** `cmp` with exit 0, recorded in the step's receipt entry. Items lost under the **V9-2** redo rule are cited by commit sha instead.

**V9-6 Superseded sentences (quoted; text authoritative).**
- V8-1 "The step-1 mandate's FIRST action, before the step-1 `enumerated-edits.txt` is written and before the first `snapshot`, is create-if-absent: `mkdir -p _docs/_workflows/_smoke/task-551/11-reopen && { test -e _docs/_workflows/_smoke/task-551/11-reopen/.gitignore || printf '*\n' > _docs/_workflows/_smoke/task-551/11-reopen/.gitignore; }` from the repo root." now reads as **V9-1**: the orchestrator runs the same command as bootstrap (a), then check (b) and (c), before it dispatches the step-1 mandate, whose first action is `snapshot`.
- V8-1 "An existing file is never rewritten; if it holds other bytes, the first fence call fails `task551_move_proof_gitignore` and the orchestrator decides." now reads: an existing file is never rewritten; if it holds other bytes, bootstrap check (b) fails, no mandate is dispatched, and the orchestrator decides. The fence byte-check at :1280 stays as the second line of defence in every phase.
- V8-1 "If `11-reopen/`, its `.gitignore` or any file of a step directory is lost, the affected step is redone under the **V6-4** recovery (step paths equal the previous receipted digests, fresh snapshot, nothing rebuilt from memory); the redo's first action recreates the directory and `.gitignore` create-if-absent with the same bytes." now reads as the **V9-2** redo rule: green steps are never redone and their lost items are cited by commit sha; only steps that are not yet green are redone, from the previous step's commit; the orchestrator recreates the directory per **V9-1**.
- V8-6 "V7-1 "(1) `11-reopen/.gitignore` (orchestrator, once)." now reads "(1) `11-reopen/.gitignore` (step-1 mandate, first action, create-if-absent; untracked)"" now reads: (1) `11-reopen/.gitignore` (orchestrator, **V9-1** bootstrap (a) before the step-1 dispatch, create-if-absent; untracked).
- V8-6 "V7-1 "The orchestrator creates it once, …" now reads as the **V8-1** bootstrap order (the step-1 mandate's first action, create-if-absent, before `enumerated-edits.txt` and the first snapshot; the fence byte-checks `*\n` in every phase)." now reads as **V9-1** (the orchestrator, create-if-absent, check (b), then `enumerated-edits.txt`, all before the step-1 dispatch; the fence byte-checks `*\n` in every phase).
- V6-4 "Recovery. A lost or voided directory, a lost snapshot, or a `pre.sha256` mismatch (`task551_move_proof_snapshot`) means the step is redone from the previous step's committed or receipted state: the step paths equal the digests of the previous receipt (for step 1, the **V5-4** baselines)." now applies only to a step that is not yet green. Its "previous step's committed … state" is the step k−1 checkpoint commit (**V9-2**). A green step falls under the **V9-2** redo rule.
- V6-3 "Take a wanted checkpoint before the snapshot." now reads: the mandatory step k−1 checkpoint commit (**V9-2**) precedes the step-k snapshot.
- V7-2 "Every checkpoint commit is followed by a (re-)snapshot." is satisfied by the **V9-2** order (step-k snapshot after the step k−1 commit). V7-2 "The new snapshot is admitted only when every step path's SHA-256 after the commit equals the latest receipted digest (the previous step's receipt; for step 1, the **V5-4** baselines)." gains the **V9-2** `git diff --quiet <sha_{k-1}>` record.
- v7 "In-place fence edit" "Literal invocation, from the repo root, one call per phase: `env TASK551_MOVE_PHASE=<snapshot|ranges|prove> TASK551_MOVE_STEP=<1|3|4|5|6> TASK551_MOVE_SRC=<pre-step source path> bash -c "$(sed -n '1274,1380p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`." now reads as the **V9-3** guarded form for every real call, with a repo-relative `TASK551_MOVE_SRC`.
- V8-2 "The real `ranges` call keeps the v7 invocation from the repo root and redirects its stdout to `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/ranges.jsonl`." now reads as the **V9-3** guarded `ranges` form with the same redirect. In the V8-2 dry-run call, `TASK551_MOVE_SRC=<pre-step source path>` reads `TASK551_MOVE_SRC=<repo-relative path>`.
- V8-2 "An exit 0 with empty output is never green." now applies to every real call, with the **V9-3** minimum evidence per phase. V8-2 "an empty `ranges.jsonl` or one whose line count differs from the number of spec blocks" gains the **V9-3** pinned block counts.
- V5-4 "Steps 1-6: `env TASK551_REOPEN_STEP=<n> bash -c "$(sed -n '978,996p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`. Step 7: `env -u TASK551_REOPEN_STEP bash -c "$(sed -n '978,996p' _docs/_TASKS/TASK-551-11-Workflow-Audit-And-Evidence-Sidecar.md)"`." now reads as the **V9-3** guarded gate F forms (same line pair, same environment).
- V4-3 "Also `git diff --check` over the touched files." (as extended by V5-6 with M and by V7-6 with D) now reads: "Also run `git add -N -- <every file the step creates>`, then `git diff --check -- <every file the step touched>`, which must exit 0 with empty output; and M (**V5-1**) for steps 1 and 3-6, and D (**V7-4**) for steps 3 and 6" (**V9-4**).
- V8-3 "The step-7 receipt cites every file of (1)-(9) and (11) by repo path and SHA-256 as external evidence." now reads as **V9-5** ((1) once; (8) file by file; lost items of green steps cited by commit sha per **V9-2**; steps 2 and 7 have no step directory). V8-3 "Of (10) `dryrun/` it cites exactly two files by repo path and SHA-256:" now reads "For a step that ran a dry-run (always steps 3 and 6), of (10) it cites exactly two files by repo path and SHA-256:"; a step without `dryrun/` cites no (10) file. V8-3 "Those two files carry the D evidence: equal to (11) and (9) by `cmp`." now reads as the **V9-5** wording.

**V9-7 Self-test (2026-09-25; session scratchpad only, so no repo file was written).** The fence texts were extracted with `sed -n '1274,1380p'` and `sed -n '978,996p'` from this file before v9 was appended; v9 moves neither. A scratch root held a copy of this file, `.prettierrc.json`, a `node_modules` symlink, this repository's root `.gitignore` in a fresh git repository, and the **V8-7** synthetic step-1 split (`lib/demo.mjs` -> `lib/demo.mjs` + `lib/demo-helper.mjs`, enumeration `export helper`).

| Case | Mutation | Result |
|---|---|---|
| B | **V9-1** (a) and (b) literal, then (c) | `cmp` exit 0; `git status --porcelain --untracked-files=all` prints nothing, also after the step files exist |
| G | **V9-3** guarded `snapshot`, `ranges` (redirected), `prove` with `REPO` = the scratch root | exit 0 each; `snapshot` 3 lines; `ranges.jsonl` 2 lines (one block per module); `prove` 0 terminal bytes, `proof.jsonl` 4 lines (2 modules + 2), `modules.txt` and `touched.sha256` 2 lines, 2 empty diffs |
| GS | guarded call with `sed -n '1274,1379p'` (last line not `esac`) | guard exit 1, fence not run |
| GE | fence extracted with the relative contract path from another cwd | empty text; guard exit 1 |
| GF | gate F guard on `sed -n '978,996p'` of this file | first/last lines match; guard passes |
| SA / SD | `TASK551_MOVE_SRC` absolute / `./`-prefixed (`ranges`) | `task551_move_proof_spec`, exit 1 each |
| RP | kept module edited after a green `prove`, `prove` re-run | `task551_move_proof_diff`, exit 1; `touched.sha256` absent, earlier diffs cleared |
| IT | untracked file with trailing whitespace: `git diff --check` / after `git add -N` | exit 0 (skipped) / exit 2 (reported) |
| IG | `git add -N` on a file under the self-ignoring `11-reopen/` | refused, exit 1 |
| N | `bash -n` on both extracted fences | exit 0 each |

### Amendment v10 (2026-09-26): C0 base, dry-run copies, hook failures, execution card
Recorded at HEAD `ee4c7f933940409f08aef43050c7d90857d25413` (checkpoint C0 on the worktree branch `feat/task-551-db-cache`; the working tree is dirty only in the foreign paths of **V10-1**) from orchestrator decisions V10-1 to V10-6 on the v9 audit (0 HIGH / 3 MEDIUM / 6 LOW). Append-only; text authoritative. It SUPERSEDES v9 (and, through v9, v8 to v3 and the earlier 2026-09-25 amendments) where stated; every superseded sentence is quoted in **V10-7**. Everything in v9 that is not quoted there stays binding (the orchestrator-only bootstrap, one checkpoint commit per green step, receipted bytes = committed bytes, the redo rule for green steps, the guarded fence forms, the pinned per-phase evidence, `git add -N` before `git diff --check`).
- **Line anchors.** `:NNN` anchors use the pre-v10 numbering. v10 edits no fence and inserts nothing above this amendment, so every anchor keeps its number: gate F content :978-:996 (first line `set -eu`, last line `git diff --check -- "$task_contract"`), move-proof content :1274-:1380 (`set -eu` / `esac`), and the **V9-3** guarded forms are unchanged. The contract-file cap at :987 stays 1,900 (this file is 1,852 physical lines after v10). `bash -n` exits 0 on both extracted fences (`sed -n '978,996p'`, `sed -n '1274,1380p'`; 2026-09-26).

**V10-1 C0 is the step-1 base (binding; supersedes the V9-2 sentences quoted in V10-7).**
- **C0.** Checkpoint C0 is commit `ee4c7f933940409f08aef43050c7d90857d25413` on `feat/task-551-db-cache` ("docs(task551): contract rounds after first real DB execution (03-L02 R1-R5, 06-L02 R6-R10, 06-L03 R1, 02-L01/02-L02, 01-L01 v1-v3, 11 v3-v9, mirrors) + author-audit re-pin 33"; 29 files, including `tests/unit/workflows/task551AuthorAudit.test.ts` and this contract). `sha_0` = C0. Every **V9-2** reference to the step-1 base reads C0.
- **Step-1 start record.** The present step-1 paths are `_docs/_workflows/lib/task-551-dispatch-contract.mjs`, `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` and `tests/unit/workflows/task551WorkflowContracts.test.ts` (the two created paths are absent). At step-1 start the orchestrator runs `git diff --quiet ee4c7f93 -- <those three paths>` and records exit 0 in the step-1 receipt entry (exit 0 on 2026-09-26, informative). A non-zero exit stops step 1.
- **The re-pin is committed.** The four `32` -> `33` pins in `task551AuthorAudit.test.ts` are this leaf's own R3-33 edit ("Owned mechanical re-pin", Dated Contract Correction), and they are in C0: `git diff --quiet ee4c7f93 -- tests/unit/workflows/task551AuthorAudit.test.ts` gave exit 0 on 2026-09-26. The step-4 pre-step bytes are therefore recoverable from `sha_3`, and the step-4 commit carries no foreign change.
- **Baselines at C0.** The **V5-4** step-1 baselines are taken at C0, before the first edit: the SHA-256 of every present fenced path, the P lines, the eslint baseline and the orchestrator's `bun run lint:repo:types` exit code and diagnostic count. Re-measured on the C0 tree on 2026-09-26: the V5-4 eslint command reports exactly `165:14 no-undef TextEncoder` and `481:19 no-useless-escape` (dispatch-contract; worktree-compatibility clean); `prettier --check` exits 0 on the five pre-step sources (1,054 / 1,725 / 1,241 / 2,779 / 1,170 lines); P prints the three HEAD rows of the **V4-1** table unchanged; G prints the pinned inventory; the 03-L02 task file is 522,753 bytes.
- **Foreign dirty paths.** The C0 working tree also carries uncommitted edits of other leaves (06-L02 R6/R7, 06-L03 re-seed): `core/services/content/revisionRetentionService.ts`, `core/services/pages/revisionService.ts`, `tests/integration/server/task551RetentionJobService.test.ts`, `tests/integration/server/task551RevisionRetention.test.ts`, `tests/perf/database-revision-budgets.test.ts`, `tests/unit/pages/revisionService.test.ts`, plus `_TMP-S1-spina.md`. None is a step path. No step writer edits, stages, formats, stashes or reverts them. T and the commit hook check the whole working tree, so the T baseline, every T result and every hook run are taken with these paths as they stand, and each receipt entry names them.

**V10-2 Dry-run copies (binding; supersedes the V9-1 sentence quoted in V10-7).**
- No mandate creates the REAL `_docs/_workflows/_smoke/task-551/11-reopen/`, its real `.gitignore`, or a real `step-<n>/enumerated-edits.txt`. They stay the orchestrator's (**V9-1** (a)-(c)).
- The **V7-4** copies under `<step dir>/dryrun/` are the implementer's: `dryrun/_docs/_workflows/_smoke/task-551/11-reopen/.gitignore`, `dryrun/_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/enumerated-edits.txt`, the matching `dryrun/…/step-<n>/spec.json`, and the pre-step source at its repo-relative path under `dryrun/`. Right after copying, before any dry-run fence call and before the first real edit, each copy must `cmp` equal its real file: `cmp -- <real> <copy>` for `.gitignore`, `enumerated-edits.txt` and `spec.json`, and `cmp -- <step dir>/pre/<basename>.snapshot dryrun/<repo-relative source>` for the source. Each `cmp` exits 0, and its command and exit code go into the step's receipt entry. A non-zero `cmp` fails D.

**V10-3 Commit hook failures (binding; supersedes the V9-2 hook sentence quoted in V10-7).**
- Every checkpoint commit runs the configured hook. `core.hooksPath` is `/home/coder/project/Coderso/.githooks`; its `pre-commit` runs `bun run precommit` = `bun run format:staged && bun run precommit:check`. `precommit:check` (`bun --cwd core lint`, `bun --cwd core lint:types`, `bun --cwd store lint`, the SDK `tsc`, root `tsc -p tsconfig.json --noEmit`) checks the whole working tree, the **V10-1** foreign paths included.
- `CODERSO_SKIP_PRECOMMIT=1` and `git commit --no-verify` (`-n`) are FORBIDDEN for every re-open checkpoint commit.
- If the hook fails ONLY on paths outside the step's touched set, the step stays green but uncommitted. The orchestrator records the failing command and paths in the step's receipt entry, starts no next-step snapshot (there is no `sha_k`), and escalates to the owner. It does not edit, stage, format, stash or revert a foreign path.
- If the hook fails on a step path, the step is not green: fix the path, then rerun the gates in the **V10-5** order under its rerun rule.

**V10-4 Staging, intent-to-add and redo of created paths (binding; refines V9-2 and V9-4).**
- **Staging.** After the step's receipt entry, the orchestrator runs `git add -- <every touched file of the step>` (this replaces each (q) intent-to-add entry with the file's content), verifies that the sorted `git diff --cached --name-only` equals exactly the sorted touched-file list, and runs `git commit -m "<V9-2 message>"` with no pathspec, so the commit is exactly the index. `git add -A`, `git add .`, `git commit -a` and `git commit -- <paths>` are not used.
- **Redo of a not-yet-green step k.** For every path the failed attempt created: `git rm --cached -q -- <path>` (drops its intent-to-add or staged entry), then delete the file. Created paths are absent from `sha_{k-1}`, so deletion restores them, and no stale intent-to-add entry survives. Modified step paths return to their `sha_{k-1}` bytes (**V9-2** redo rule). Before the redo's snapshot the orchestrator records `git diff --quiet <sha_{k-1}> -- <every present step-k path>` exit 0 AND `git status --porcelain --untracked-files=all -- <every created path of step k>` exit 0 with empty output. `git diff <commit>` never reports an untracked leftover, so the status check is required.

**V10-5 EXECUTION CARD (binding; paste verbatim into every step mandate; cites V3-V9, decides nothing new).** `lib/` = `_docs/_workflows/lib/`; bare test/helper names are under `tests/unit/workflows/`; "move steps" = 1, 3, 4, 5, 6; `sha_{k-1}` = the previous checkpoint commit (step 1: C0 `ee4c7f93`). Steps 2 and 7 have no step directory and skip (b), (e), (f), M and D.
- (a) [orchestrator; step 1, and a not-yet-green step whose directory must be recreated (**V9-1** Redo)] **V9-1** bootstrap (a)-(b) literally: `mkdir -p _docs/_workflows/_smoke/task-551/11-reopen && { test -e _docs/_workflows/_smoke/task-551/11-reopen/.gitignore || printf '*\n' > _docs/_workflows/_smoke/task-551/11-reopen/.gitignore; }`; `printf '*\n' | cmp -- - _docs/_workflows/_smoke/task-551/11-reopen/.gitignore` exit 0; `git status --porcelain --untracked-files=all -- _docs/_workflows/_smoke/task-551/11-reopen` exit 0, empty. Step 1 also takes the **V7-5** measurement `wc -c < _docs/_TASKS/TASK-551-03-L02-Bounded-Admin-Lists-And-Oversized-Service-Splits.md` <= 524,288 (else STOP).
- (b) [orchestrator; move steps] write `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/enumerated-edits.txt` (kinds in table A). Step 1 also opens the step-1 receipt entry: C0 sha, the step-1 file list, the (a) records, the **V10-1** baselines.
- (c) [orchestrator; every step] record `git diff --quiet <sha_{k-1}> -- <every present step-k path>` (exit 0 required; non-zero stops the step, **V9-2**); for a redo also the **V10-4** status check.
- (d) [orchestrator] dispatch exactly one mandate. Allowlist = the step's touched files (table A) + `_docs/_workflows/_smoke/task-551/11-reopen/step-<n>/` (move steps only).
- (e) [implementer; move steps; first action] guarded `snapshot` (**V9-3**), `TASK551_MOVE_SRC` = table A source (repo-relative): exactly 3 printed lines.
- (f) [implementer; D: steps 3 and 6; optional 1, 4, 5] write `spec.json` (**V6-1** shape; blocks = table A), copy per **V10-2** (+ `cmp`s), then the **V8-2** dry-run: `snapshot`, `ranges` > `dryrun/ranges.jsonl`, extraction, `prove`; D fails per the **V8-2** list.
- (g) [implementer] edits. Move steps: `spec.json` (if not written in (f)); guarded real `ranges` redirected to `step-<n>/ranges.jsonl` (line count = table B); build every target module, kept one included, only from the printed `sed -n '<start>,<end>p' <snapshot> >> <target>` commands in printed order, glue at the top, one blank line between blocks; apply only the enumerated edits (**V5-1** (a) `export ` prefixes, (b)-(d) hunks). Then the table-A ordinary edits in files that do not move in the step. Steps 2 and 7: only the table-A edits.
- (h) `./node_modules/.bin/prettier --config .prettierrc.json --write <every touched file>`.
- (i) E: `./node_modules/.bin/eslint --max-warnings=0 <every touched non-.json file>` exit 0 AND `./node_modules/.bin/prettier --config .prettierrc.json --check <every touched file>` exit 0 (step 7: prettier only, **V8-4**).
- (j) W: `wc -l <every touched file>` within table B caps (fence caps, **V4-2** frozen ceilings, **V4-3** interim ceilings).
- (k) A: `env DATABASE_URL='postgresql://127.0.0.1:1/none' bun --env-file=/dev/null test <table B files, V3-2 order, dispatchContractCaps.test.ts last>`: 0 fail, 0 skip, exact pass count.
- (l) F: guarded gate F (**V9-3**), `env TASK551_REOPEN_STEP=<n>` for steps 1-6, `env -u TASK551_REOPEN_STEP` for step 7; non-empty `grep -n` output, exit 0. Step 7 also runs the **V4-1** provenance-equality program: prints `19 14`.
- (m) M [move steps]: guarded `prove`; green only with the **V9-3** evidence (`proof.jsonl` = modules + 2 lines, `modules.txt` and `touched.sha256` = modules, every `out/<basename>.diff` empty), with the (g) `ranges.jsonl` as its ranges record. D steps: both **V8-2** `cmp` pairs, taken after the last real `prove`.
- (n) G: the **V4-1** family-preflight literal with last argument `ee4c7f933940409f08aef43050c7d90857d25413`: exit 0, exactly `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}`.
- (o) P: the **V4-1** parity program over the present modules in **V4-1** table order (dispatch-contract, primitives, envelope, worktree-compatibility, phase-provenance, worktree-snapshot, l01-barrier, `lib/task-551-contract.mjs`): exactly the table B lines. The implementer returns after (o).
- (p) T [orchestrator; steps 1-6]: `bun run lint:repo:types` exit 0, compared with the C0 baseline.
- (q) [orchestrator] `git add -N -- <every file the step creates>`, then `git diff --check -- <every touched file>`: exit 0, empty output.
- (r) [orchestrator] receipt entry: every command with exit code and counts, touched-file line counts and SHA-256 (moved modules = the last `touched.sha256`), P lines, G output, the fence line pairs and first/last lines, the M/D/`cmp` records, the enumerated export names of steps 5-6.
- (s) [orchestrator] **V10-4** staging, then the checkpoint commit (**V9-2** message; hook per **V10-3**); then the entry records the commit sha and the receipted = committed digest equality (**V9-2**).
- **Rerun rule.** Any edit to a touched file after a gate has run reruns every gate that already ran, from (h), in this order; in move steps `prove` reruns and only its last artefacts count (**V9-3**).

Table A (files, moves, enumeration; **V4-3**, **V5-2**, **V6-2**/**V7-3**, **V9-4**). C = created by the step.

| Step | Source (`TASK551_MOVE_SRC`) | Touched files = allowlist | Moved blocks, start..end anchor per target module (**V5-2** row order) | `enumerated-edits.txt` |
|---|---|---|---|---|
| 1 | `_docs/_workflows/lib/task-551-dispatch-contract.mjs` | `lib/task-551-dispatch-contract.mjs`; C `lib/task-551-dispatch-primitives.mjs`; C `lib/task-551-dispatch-envelope.mjs`; `lib/task-551-worktree-compatibility.mjs` (sidecar `ownedFiles` +2 after the fourteen); `task551WorkflowContracts.test.ts` (`expectedL11SidecarPaths` +2, pins, owner-host scan list +2) | primitives: `TASK551_GRAPH_SCHEMA`..`TASK551_ENVELOPE_SCHEMA`; `TASK551_MAX_TASK_FILE_BYTES`..`TASK551_MAX_JSON_NODES`; `fail`..`parseDuplicateKeyAwareJson`; `requireNodeId`..`requireNodeId` · envelope: `TASK551_ENVELOPE_KEYS`..`TASK551_REVIEW_BARRIER_KEYS`; `TASK551_OCCURRENCE_IDS`..`TASK551_ARTIFACT_POLICIES`; `requirePathList`..`requirePathList`; `requireCommandId`..`normalizeEnvelope` · facade: `TASK551_SNAPSHOT_KEYS`..`TASK551_GRAPH_NODE_KEYS`; `TASK551_ALLOWED_STATUSES`..`TASK551_ALLOWED_STATUSES`; `TASK551_TASKS_PREFIX`..`TASK551_FENCED_JSON`; `collectTask551JsonFences`..`readTask551Metadata`; `normalizeGraph`..`@EOF` | `export` ×15 (the 14 **V4-1** primitives names, `normalizeEnvelope`); `line` ×2 (**V5-1**(c) regex line, pre and post); `anchor` ×0. Cap stays `512 * 1024`, unexported; `import { TextEncoder } from "node:util";` is primitives glue |
| 2 | none | `lib/task-551-dispatch-primitives.mjs` (`export const TASK551_MAX_TASK_FILE_BYTES = 1024 * 1024;`); C `dispatchContractCaps.test.ts` (T1-T3, **V4-6**); `lib/task-551-worktree-compatibility.mjs` (sidecar `ownedTests` + caps path last); `task551WorkflowContracts.test.ts` (`expectedL11SidecarTests` + caps path last, pins); `task551EvidenceContract.test.ts` (matrix reads caps, row `[author-audit]`, `no-sparse-arrays` fix) | none | none |
| 3 | `_docs/_workflows/lib/task-551-worktree-compatibility.mjs` | `lib/task-551-worktree-compatibility.mjs`; C `lib/task-551-phase-provenance.mjs`; C `lib/task-551-worktree-snapshot.mjs`; C `lib/task-551-l01-barrier.mjs`; `task551WorkflowContracts.test.ts` (`expectedL11SidecarPaths` +3, pins, scan list +3) | provenance: `encoder`..`requireExactClosedPaths`; `TASK551_PLANNED_BUN_PATHS`..`TASK551_PLANNED_BUN_PATHS`; `TASK551_L11_CLASSIFIER_NARROW_L02_INPUTS`..(same) · snapshot: `PATH_DIGEST_KEYS`..`predecessors`; `predecessorPaths`..`requireExactActivePhaseSnapshotBeforeSpawn` · barrier: `MANIFEST_PATH`..`L03_ROW`; `exactStrings`..`requireTask551L01MaterializationBarrierBeforeL02` · facade: `TASK551_WORKFLOW_COMPATIBILITY_RECEIPT_SCHEMA`..`COMPATIBILITY_FRAME_MAGIC`; `TASK551_L02_SUBGATE_KINDS`..`requireTask551WorkflowCompatibilityReceiptV2`; `NAMED_CLOSURE_KEYS`..`@EOF` | `export` ×24 (13 provenance helpers, 10 snapshot helpers, `MANIFEST_PATH`); `line` ×3 (the three new sidecar `ownedFiles` rows, 6-space indent; hunk `pre` = `[]`); `anchor` ×0 |
| 4 | `tests/unit/workflows/task551AuthorAudit.test.ts` | `task551AuthorAudit.test.ts`; C `authorAuditDriftRounds.test.ts`; C `authorAuditBoundedChild.test.ts`; C `task551AuthorAuditFixtures.ts`; `dispatchContractCaps.test.ts` (imports `currentTask551DispatchSnapshot` from the helper, local copy dropped); `lib/task-551-phase-provenance.mjs` (sidecar `ownedTests` +3 at **V3-2** positions); `task551WorkflowContracts.test.ts` (`expectedL11SidecarTests` +3, pins); `task551EvidenceContract.test.ts` (matrix reads +3, bindings `authorDriftTest`/`authorBoundedTest` + the implementer's helper binding, **V3-3** rows) | fixtures: `ALL_PHASES`..`highFinding`; `uniqueTempDir`..`currentTask551DispatchSnapshot` · boundedChild: `FakeProc`..`L02_FREEZE_SMALL_CHILD`; `DiagnosticCarrier`..`describe:bounded child execution` · kept: `currentTask551TaskSnapshot`..`mutateTask551DispatchSnapshot`; `describe:research grounding and audit scopes`..`describe:targeted re-audit planning` · drift: `runFixtureGit`..`withTask551GitRepo`; `describe:drift-round orchestration`..(same) | `export` ×7 (`Finding`, `completed`, `currentTask551DispatchSnapshot`, `fullDiscovery`, `highFinding`, `lowFinding`, `uniqueTempDir`); `line` ×4 (**V5-1**(b) rename lines, pre and post); `anchor` ×0 |
| 5 | `tests/unit/workflows/task551WorkflowContracts.test.ts` | `task551WorkflowContracts.test.ts`; C `workflowContractsBootstrap.test.ts`; C `workflowContractsSubgates.test.ts`; C `workflowContractsImplementation.test.ts`; C `task551WorkflowContractsFixtures.ts`; C `task551WorkflowExecutionFixtures.ts`; `lib/task-551-phase-provenance.mjs` (`ownedTests` +5 at **V3-2** positions); `task551EvidenceContract.test.ts` (matrix reads +5, rows) | wcFixtures: `Digest`..`FileState`; `Worktree`..`barrierFixtures` · bootstrap: `MutableLogicalReceipt`..`MutableCommandReceipt`; `describe:TASK-551 L11 compatibility bootstrap and generic barrier`..(same) · kept: `Equal`..`Assert`; `describe:TASK-551 current-worktree snapshot contract`..(same) · execFixtures: `l02EvidenceRoot`..`task489Handoff` · subgates: `describe:TASK-551 L02 injected subgates`..(same) · implementation: `describe:TASK-551 implementation workflow`..`@EOF` | `export` = the orchestrator's cross-reference names (helper declarations a sibling imports); `line` ×9 (five `expectedL11SidecarTests` rows, 2-space indent; `    ]).toEqual([26, 19]);`, `    ]).toEqual([31, 19]);`, `    ).toBe(88);`, `    ).toBe(93);`); `anchor` ×0 |
| 6 | `tests/unit/workflows/task551EvidenceContract.test.ts` | `task551EvidenceContract.test.ts`; C `evidenceContractMatrix.test.ts`; C `task551EvidenceContractFixtures.ts`; `lib/task-551-phase-provenance.mjs` (`ownedTests` +2 -> 14); `task551WorkflowContractsFixtures.ts` (`expectedL11SidecarTests` +2); `workflowContractsBootstrap.test.ts` (pins) | evFixtures: `sha`..`evidenceRoot`; `processReceipt`..`processReceipt`; `adminStatementIds`..`evidenceValueFor` · matrix: `MutableEvidence`..`requireMutableEvidence`; `projectionInput`..`projectionInput`; `describe:TASK-551 evidence decoder and L10 projection`..`@EOF` · kept: `TerminalCommittedHeadInput`..`MutableTerminalCommittedHeadInput`; `terminalCommittedHeadInput`..`expectTerminalCommittedHeadRejection`; `describe:terminal committed-HEAD handoff verifier`..`describe:strict canonical rows and recovery boundaries`; `evidenceTestHarness`..`staticWriterEvidenceValue` | `export` = the orchestrator's cross-reference names; `line` ×7 (**V7-3**: two read lines, the four pinned lines, `      [],` once); `anchor` ×1 (the 11th row, **V7-3**) |
| 7 | none | C (if absent) `_docs/_workflows/_smoke/task-551/impl-11-reopen-20260925.json` (**V4-6**, with the **V5-3** manifest state) | none | none |

Table B (counts, tests, pins, caps, parity; **V9-3**, **V4-3**, **V4-1**).

| Step | Modules / `ranges.jsonl` lines / `proof.jsonl` lines | A: test files (pass) | Pins `[paths+tests, receipt]` / total | W caps of touched files | P: expected lines (keys below) | T |
|---|---|---|---|---|---|---|
| 1 | 3 / 13 (4 + 4 + 5) / 5 | `task551AuthorAudit.test.ts task551WorkflowContracts.test.ts task551EvidenceContract.test.ts` (87) | `[19, 16]` / `81` | 3 dispatch modules 999; worktree-compatibility 1,728; WC 2,793 | K1 K2 K4 K5 K9 | yes |
| 2 | — | step 1 + `dispatchContractCaps.test.ts` (90) | `[20, 16]` / `82` | primitives 999; caps 800; worktree-compatibility 1,728; WC 2,793; Evidence 1,215 | K1 K3 K4 K5 K9 | yes |
| 3 | 4 / 10 (3 + 2 + 2 + 3) / 6 | as step 2 (90) | `[23, 19]` / `85` | 4 lib modules 999; WC 2,793 | K1 K3 K4 K5 K6 K7 K8 K9 | yes |
| 4 | 4 / 8 (2 + 2 + 2 + 2) / 6 | `task551AuthorAudit.test.ts authorAuditDriftRounds.test.ts authorAuditBoundedChild.test.ts task551WorkflowContracts.test.ts task551EvidenceContract.test.ts dispatchContractCaps.test.ts` (90 = 18 + 12 + 10 + 25 + 22 + 3) | `[26, 19]` / `88` | trio 700; helper 999; caps 800; provenance 999; WC 2,793; Evidence 1,215 | as step 3 | yes |
| 5 | 6 / 9 (2 + 2 + 2 + 1 + 1 + 1) / 8 | the trio, `task551WorkflowContracts.test.ts workflowContractsBootstrap.test.ts workflowContractsSubgates.test.ts workflowContractsImplementation.test.ts task551EvidenceContract.test.ts dispatchContractCaps.test.ts` (90) | `[31, 19]` / `93` | 4 WC tests 800; 2 helpers 999; provenance 999; Evidence 1,215 | as step 3 | yes |
| 6 | 3 / 10 (3 + 3 + 4) / 5 | all ten: step 5 with `evidenceContractMatrix.test.ts` after `task551EvidenceContract.test.ts` (90 = 40 + 25 + 22 + 3) | `[33, 19]` / `95` | Evidence and matrix 800; 2 helpers 999; provenance 999; bootstrap 800 | as step 3 | yes |
| 7 | — | as step 6 (90) | `[33, 19]` / `95`; provenance equality `19 14` | none (receipt `.json`) | as step 3 | no |

| Key | Expected P line (verbatim program output) |
|---|---|
| K1 | `_docs/_workflows/lib/task-551-dispatch-contract.mjs 1 7b36b5870117e163e4edc2b72f02a7d48deadb461873a615688af88862e98900` |
| K2 | `_docs/_workflows/lib/task-551-dispatch-primitives.mjs 14 08c33aceb9fbdc113a48cd98e046e458afa1755b7e6dab114ab26859c379634b` |
| K3 | `_docs/_workflows/lib/task-551-dispatch-primitives.mjs 15 84759d6ae6c2f03f6e8f5b738e9d57865d7c2a5975265939e541b0f921937b86` |
| K4 | `_docs/_workflows/lib/task-551-dispatch-envelope.mjs 1 75554a3bacc0a522f206be4a37c616276a337f1d01ef982443f8804d4d9332c8` |
| K5 | `_docs/_workflows/lib/task-551-worktree-compatibility.mjs 61 f9ac9b1b482663b8557734e5a3c6acd7ea4f64dcde3a3a1ef0e061c99eb4ecfd` |
| K6 | `_docs/_workflows/lib/task-551-phase-provenance.mjs 44 db4e6bcbac58359d4a0f8a31a9609c6c838c9afba08d399f3aa847a0bd84b972` |
| K7 | `_docs/_workflows/lib/task-551-worktree-snapshot.mjs 23 e00ef59892c4ef6fb085bfa64d8fab6e040bb5ab73d83b47b8027d7fabc52196` |
| K8 | `_docs/_workflows/lib/task-551-l01-barrier.mjs 4 582241d2def64471f3fe869ac5f0a471bc7298659f67078b28713ccd4e8b7637` |
| K9 | `_docs/_workflows/lib/task-551-contract.mjs 99 e466e413cb77a5ba3a9979a6556e08f3d7bf682e85e70d400065b68b79a0b147` |

- K1, K5 and K9 were measured at C0 on 2026-09-26; K2-K4 and K6-K8 are the **V4-1** computed values (K2 holds for step 1 only). The P argv lists the present modules in **V4-1** table order, so the printed order is the order of the keys in each row.

**V10-6 LOW corrections (binding).** Resolved by the sections above: the ordered gate list is **V10-5** (a)-(s); staging is **V10-4** (`git add -- <touched>`, cached-name check, commit without pathspec); the redo of created paths is **V10-4** (`git rm --cached -q`, delete, status check); the base pin is **V10-1** (C0 `ee4c7f93`, measured start record and baselines).

**V10-7 Superseded sentences (quoted; text authoritative).**
- V9-1 "No mandate creates `11-reopen/`, its `.gitignore` or any `enumerated-edits.txt`." now reads as **V10-2**: no mandate creates the REAL directory, its `.gitignore` or a real `step-<n>/enumerated-edits.txt`; the `dryrun/` copies are the implementer's and must `cmp` equal the real files.
- V9-2 "Per the repo rule it runs `bun run precommit` before the commit, or commits through the configured hook path." now reads: the checkpoint commit runs the configured hook (`bun run precommit`); a failure follows **V10-3**; `CODERSO_SKIP_PRECOMMIT` and `--no-verify` are forbidden.
- V9-2 "The commit holds exactly the step's touched files: `git diff --cached --name-only` before the commit and `git show --name-only --format= <sha>` after it both list exactly those paths." gains the **V10-4** staging commands (`git add -- <every touched file>`, commit without pathspec).
- V9-2 "for step 1 the reference is HEAD `9c5b6666` plus the **V5-4** baselines." now reads "for step 1 the reference is C0 `ee4c7f93` plus the **V5-4** baselines taken at C0 (**V10-1**)". V9-2 "(step 1: `9c5b6666`)" now reads "(step 1: `ee4c7f93`)".
- V9-2 "**Known uncommitted pre-step bytes (2026-09-25; orchestrator decision required before the step-4 snapshot).** `tests/unit/workflows/task551AuthorAudit.test.ts`, the step-4 pre-step source, differs from HEAD `9c5b6666` in the working tree (4 pin lines, `occurrenceCount` and the dispatch-order set size 32 -> 33, at :327, :336, :742 and :991; not authored by L11).", "Steps 1-3 do not touch it, so no step 1-3 commit contains it.", "Its step-4 pre-step bytes are therefore not commit-recoverable: only the **V5-4** step-1 baseline digest and the step-4 `pre/task551AuthorAudit.test.ts.snapshot` cover them.", "The step-4 checkpoint commit would also carry that foreign 4-line change together with the step-4 edits." and "v9 does not decide either consequence." are superseded by **V10-1**: the re-pin is this leaf's own R3-33 edit, it is committed in C0, and the step-4 pre-step bytes are recoverable from `sha_3`.
- V9-2 "the step restarts from the step k commit (every step path equal to its `git show <sha_k>:<path>` digest, which is also the latest receipted digest), and a fresh `snapshot` is taken." gains the **V10-4** removal of created paths and the `git status --porcelain` check.
- V9-4 "`git reset -- <new files>` is NOT needed afterwards, because the step's checkpoint commit (**V9-2**) adds those files in full anyway." now reads: `git reset` is not needed, because the **V10-4** `git add -- <every touched file>` replaces the intent-to-add entries with content; a failed attempt's entries are dropped with `git rm --cached -q` (**V10-4**).
- V5-4 "It also records the baselines taken before the first edit: the SHA-256 of every present fenced path (the digest chain of V5-1 starts here) and the HEAD eslint and type baselines." now reads "… and the C0 eslint and type baselines". V5-4 "The type baseline is the orchestrator's `bun run lint:repo:types` exit code and diagnostic count at HEAD." now reads "… at C0 `ee4c7f93`, with the **V10-1** foreign paths as they stand".
- V4-1 family preflight "`… _docs/_workflows/lib/task-551-dispatch-contract.mjs 9c5b6666c85f5b2d6674ddaa6245b2c4c714235b` exits 0 and prints exactly `{"taskFileCount":41,"childTaskCount":11,"leafTaskCount":29,"occurrenceCount":33}` (measured 2026-09-25)." now reads with the last argument `ee4c7f933940409f08aef43050c7d90857d25413` (same output, measured at C0 on 2026-09-26).
- V7-4 "After the real `snapshot` and before the first real edit, the implementer creates `<step dir>/dryrun/` as a scratch copy of the tree subset." gains the **V10-2** `cmp` of every copy.
