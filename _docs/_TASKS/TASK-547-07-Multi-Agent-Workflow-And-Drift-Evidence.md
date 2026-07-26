# TASK-547-07: Multi-Agent Workflow and Drift Evidence
# FileName: TASK-547-07-Multi-Agent-Workflow-And-Drift-Evidence.md

**Parent Task:** TASK-547
**Priority:** Critical
**Category:** Agent Workflow / Validation
**Estimated Effort:** Large
**Dependencies:** TASK-547 task family
**Status:** 🚧 In Progress
**Validation:** Native-agent workflow conversion, fresh pre-implementation
evidence, post-audits and final smoke hashes are pending.

## Overview

Own the reproducible TASK-547 workflow, five-round contract audit, sequential
35-phase implementation dispatch, final validation and the trusted-root bridge
to tracked runtime evidence. All delegated repository work uses fresh internal
Codex collaboration agents. Claude, Anthropic, external model CLIs and
model-host subprocesses are forbidden.

The root Codex orchestrator is the final reviewer and commit owner. Repository
scripts never launch a model. They only freeze inputs, prepare bounded jobs,
validate structured receipts, persist sanitized evidence and run deterministic
local gates. The orchestrator alone calls `collaboration.spawn_agent`,
`collaboration.wait_agent`, `collaboration.send_message` and related native
collaboration tools. Official browser evidence is produced only by the tracked
root CLI `scripts/task-547-runtime-smoke/cli.ts`; internal agents may audit its
sanitized tracked outputs but may not drive a browser, write a result, capture a
PNG or promote evidence.

Active entrypoints remain:

- `_docs/_workflows/task-547-author-audit.mjs` — operator-driven
  `prepare → native agent → ingest → validate` contract audit;
- `_docs/_workflows/task-547-implement.mjs` — persistent JIT state machine for
  sequential dispatch, ownership, root-only gates and phase advancement;
- `_docs/_workflows/task-547-fix.mjs` — exact finding-to-owner scope and
  restart/refresh validation.

Legacy external-host helpers are not part of the active import graph and must
not be invoked. `/tmp/task547-agent-host.mjs`, provider canaries, wrapper/model
identity and rate-limit handling are not TASK-547 gates.
Legacy ignored smoke files under `_docs/_workflows/_smoke/` are not official
evidence and may neither be migrated nor force-added.

## Internal Agent Contract

Every native audit, author, implementation, fixer, post-audit and smoke-review
agent is created with `fork_turns:"none"` so it receives a fresh context. Do not
set a model override. Prompts name:

- repository and worktree path;
- current HEAD, branch and dirty-worktree context;
- exact task/phase and owned paths;
- read-only versus writable authority;
- forbidden paths and other active streams;
- required tests and output schema;
- no-secret, no-`.env`, no-network and no-external-model rules.

Read-only agents may inspect repository-local files and run non-mutating local
commands. They must not read `.env`, use web/MCP connectors, access another
worktree, edit files, stage, commit, push or merge. The workflow does not claim
that native agents have an empty tool registry. Instead, immutable repository
identity is captured before dispatch and checked after every receipt. A changed
HEAD, ref, index, tracked/untracked path, task contract, reference corpus or
active workflow digest fails the run.

Agent reports are review evidence, not authority. The root orchestrator verifies
every actionable finding against local files and command output before changing
code or task state. A smoke-review agent receives only the tracked result/PNG
metadata/manifest packet after root promotion and remains read-only; its receipt
cannot substitute for the root CLI's schema-validated lifecycle and cleanup
records.

## Pre-Implementation Audit

The audited task set is the exact 21-file TASK-547 graph. Run five sequential
rounds. Each round has:

1. exactly 21 per-file audits, one result for every TASK-547 task file;
2. one fresh cross-file reconcile audit after all 21 results exist;
3. one zero-fix record only when every result is clean.

With four total collaboration slots, dispatch per-file auditors in bounded
parallel waves of at most three agents. Each per-file audit uses a unique fresh
agent task. The reconcile uses a separate fresh agent and runs only after all
per-file agents returned.

Round `N+1` cannot begin before round `N` is complete and clean. After round 5,
run one additional fresh reconcile. This yields 111 unique native agent tasks:
`5 × (21 + 1) + 1`.

Each per-file result must use the exact schema:

```ts
type NativeAuditResult = Readonly<{
  pass: boolean;
  summary: string;
  changedPaths: readonly [];
  errors: readonly Readonly<{
    severity: "HIGH" | "MEDIUM" | "LOW";
    area: string;
    finding: string;
    evidence: string; // exact repo-relative file:line anchors
    recommendation: string;
  }>[];
}>;
```

`pass:true` requires `errors:[]`. A missing result, duplicate target, reused
agent task, malformed JSON, wrong binding, changed path, invalid anchor or any
HIGH/MEDIUM/LOW finding is not clean. Stop immediately, verify and fix the
finding outside the read-only audit, commit the correction atomically, discard
the incomplete run and restart from round 1 with fresh agents and identity.

Per-file auditors compare the selected task contract with its parent/children,
required product and architecture docs, current implementation, tests, declared
ownership, validation lanes and current diff. Aggregate task packets do not
invent implementation ownership already delegated to executable leaves.

The reconcile checks only cross-file contracts:

- single-writer paths and symbols;
- identical shared types, enums, limits and selector strings;
- helper producer/consumer names;
- Page/base/responsive representation;
- test filenames and runner ownership;
- preland/final land order;
- settings atomic-batch semantics;
- changelog 1260 ownership;
- the canonical 18-row tracked smoke registry, its one-module/one-test/
  one-result/one-PNG mapping and the 35-phase land order;
- closure and task-board order.

## Native Receipt and Evidence Contract

`task-547-author-audit.mjs` freezes one schema-v2 run identity:

```ts
type NativeAuditRunIdentity = Readonly<{
  schemaVersion: 2;
  orchestrationContract: "internal-codex-collaboration-v1";
  executor: Readonly<{
    kind: "internal-codex-collaboration";
    interface: "collaboration.spawn_agent";
    freshContext: true;
    externalCli: false;
  }>;
  runId: string;
  head: string;
  branch: string;
  repositoryDigest: string;
  taskContractDigest: string;
  referenceDigest: string;
  workflowDigest: string;
}>;
```

The runner creates a private mode-`0700` state directory. `prepare` stores
trusted job descriptors but does not expose future job files. `pending` issues
at most the current three-job wave as mode-`0600` files and binds a fresh
`issueNonce` plus `issuedAt`; round `N+1` cannot be issued before clean round
`N`. A job binds `runId`, round, kind, target, packet/input digest, exact
canonical agent task and unique `jobId`. The root orchestrator passes each
completed result back through bounded stdin with a strict receipt:

```ts
type NativeAgentReceipt = Readonly<{
  schemaVersion: 2;
  jobId: string;
  agentTask: string;
  forkTurns: "none";
  issueNonce: string;
  issuedAt: string;
  result: NativeAuditResult;
}>;
```

Raw agent prose is never persisted. The runner stores only schema-validated,
bounded result fields and fixed validation errors. It rejects an absolute path,
`file:` URI, traversal, secret-like key, out-of-packet anchor, invalid UTF-8,
unknown field or oversized value. The receipt must repeat the exact issued
agent task, `forkTurns`, nonce and timestamp; unrelated/reused tasks or issue
bindings fail.

All native audit, implementation and fixer state is authenticated with
HMAC-SHA256 using the root-only `TASK547_ROOT_STATE_KEY`. The key must contain
at least 32 random bytes encoded as hex, remains in the trusted root process
environment and is never stored, logged or passed to an agent. State and
descriptor directories are direct mode-`0700` directories; files are direct
mode-`0600` regular files. Reads reject symlinks and identity changes, writes
are atomic, and recoverable locks bind PID, process start ticks, boot ID and
inode ownership.

The pre-implementation directory contains exactly 116 files:

- five rounds × 21 `round-NN-per-file-<slug>.json`;
- five `round-NN-reconcile.json`;
- five `round-NN-fixes.json`;
- one `final-reconcile.json`.

Every artifact includes the native run identity digest, trusted packet/job
binding, issue nonce/timestamp, exact unique `agentTask`, `forkTurns`, target,
round and finding counts. Final validation compares all 111 receipts with the
trusted state job/packet matrix; artifact-owned digests never self-authorize.
All 116 records bind to the same immutable run input. Old external-host evidence
is schema-v1 and must be rejected.

An interrupted or incomplete run never passes. Official evidence is published
only after a complete clean round/final reconcile. The final validator checks
the exact filename set, record schema, unique receipts, five-round ordering,
zero findings, unchanged identity and aggregate digest.

## Ownership and Implementation Order

The task graph and audit cardinality do not change: exactly 21 TASK-547 files,
13 executable leaves, 111 native pre-implementation jobs and 116 published
pre-implementation artifacts. Smoke modularity expands only the sequential
implementation state machine, from 14 to exactly **35 phases**:

1. `547-01-L01`
2. `547-01-L02`
3. `547-02-L01`
4. `547-02-L03-preland`
5. `547-02-L02`
6. `547-02-L03`
7. `547-03-L01`
8. `547-03-L02`
9. `547-03-L03`
10. `547-04-L01`
11. `547-04-L02`
12. `547-04-L03`
13. `547-05-L01`
14. `547-06-L01-acceptance-tests`
15. `547-06-L01-smoke-framework`
16. `547-06-L01-smoke-01`
17. `547-06-L01-smoke-02`
18. `547-06-L01-smoke-03`
19. `547-06-L01-smoke-04`
20. `547-06-L01-smoke-05`
21. `547-06-L01-smoke-06`
22. `547-06-L01-smoke-07`
23. `547-06-L01-smoke-08`
24. `547-06-L01-smoke-09`
25. `547-06-L01-smoke-10`
26. `547-06-L01-smoke-11`
27. `547-06-L01-smoke-12`
28. `547-06-L01-smoke-13`
29. `547-06-L01-smoke-14`
30. `547-06-L01-smoke-15`
31. `547-06-L01-smoke-16`
32. `547-06-L01-smoke-17`
33. `547-06-L01-smoke-18`
34. `547-06-L01-smoke-registry`
35. `547-06-L01-integration`

The preland writable subset remains exactly:

- `core/services/kits/fullSiteInstall/compensation.ts`;
- `core/services/kits/fullSiteInstall/rollback.ts`;
- `tests/unit/kits/fullSiteInstallService.test.ts`.

All three are existing single-writer L03 paths. Preland creates no leaf, owner
or path and does not terminalize L03.

Phases 1–13 otherwise retain the literal exact path sets already frozen in
`_docs/_workflows/lib/task-547-ownership.mjs`. The 22 TASK-547-06-L01 phase
subsets are:

- `547-06-L01-acceptance-tests`:
  - `tests/integration/kits/projektyDomowInstalledSite.test.ts`;
  - `tests/integration/kits/projektyDomowInstalledTestSupport.ts`;
  - `tests/integration/kits/projektyDomowInstalledAccessibility.test.ts`;
  - `tests/integration/runtime/projekty-domow-detail-route.test.ts`;
  - `tests/integration/runtime/pages-runtime.test.ts`;
  - `tests/integration/runtime/pages-runtime-blocks.test.ts`;
  - `tests/integration/runtime/pages-runtime-listings.test.ts`;
  - `tests/integration/runtime/pages-runtime-responsive.test.ts`;
  - `tests/integration/runtime/pages-runtime-test-support.ts`;
  - `tests/vitest/kits/projekty-domow-runtime-rendering.test.tsx`.
- `547-06-L01-smoke-framework`:
  - `scripts/task-547-runtime-smoke/contracts.ts`;
  - `scripts/task-547-runtime-smoke/playwrightCli.ts`;
  - `scripts/task-547-runtime-smoke/browserHarness.ts`;
  - `scripts/task-547-runtime-smoke/runScenario.ts`;
  - `scripts/task-547-runtime-smoke/artifacts.ts`;
  - `scripts/task-547-runtime-smoke/rootPort.ts`;
  - `scripts/task-547-runtime-smoke/liveRootAdapter.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/contracts.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/playwrightCli.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/browserHarness.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/runScenario.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/artifacts.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/rootPort.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/liveRootAdapter.test.ts`.
- each `547-06-L01-smoke-NN` phase, for canonical registry row `NN`, owns
  exactly `scripts/task-547-runtime-smoke/scenarios/NN-<id>.ts` and
  `tests/unit/workflows/task547RuntimeSmoke/scenarios/NN-<id>.test.ts`; the
  TASK-547 parent is the canonical identity/session spine, while TASK-547-06/L01
  own the full matching descriptors. This workflow bridge consumes those frozen
  phase descriptors rather than restating the 18-row list.
- `547-06-L01-smoke-registry`:
  - `scripts/task-547-runtime-smoke/registry.ts`;
  - `scripts/task-547-runtime-smoke/aggregate.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/registry.test.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/aggregate.test.ts`.
- `547-06-L01-integration`:
  - `scripts/task-547-runtime-smoke/cli.ts`;
  - `tests/unit/workflows/task547RuntimeSmoke/cli.test.ts`;
  - `.gitignore`;
  - `package.json`;
  - `tests/README.md`.

The validator separates three pairwise-disjoint literal sets for
TASK-547-06-L01: 69 phase-writable implementation paths above, 37 tracked
runtime-evidence paths, and 33 closure-only documentation/task/changelog paths.
It rejects a placeholder or broad glob as authority, proves each set has one
writer, and proves their 139-path union equals the leaf's complete ownership.
Evidence and closure-only paths are forbidden during all 22 implementation
phases and are admitted only by their later dedicated closeout transitions. The
tracked registry must be byte-for-byte compatible with the frozen phase
descriptors. It is the only runtime source for IDs, session mapping, execution
order and artifact paths; workflow modules must not add a second scenario list
or reimplement browser/install/cleanup behavior.

Before the registry lands, workflow phase ownership derives only the
`NN-<id>` module/test basenames from the parent's canonical Markdown table by a
strict bounded parser. Missing, extra, reordered, duplicate, malformed or
unknown-session rows fail closed. After the registry phase lands, all runtime
validation uses the tracked `task547RuntimeRegistryProjection()` export frozen
by TASK-547-06-L01. The workflow loads that pure JSON projection through one
bounded argv-only Bun import and binds `manifest.json` to its canonical
SHA-256 `registryDigest`; historical ignored smoke/admin/Page-Editor lists are
not reachable from any active author, implement, fix or closeout entrypoint.

Implementation agents run strictly one leaf/phase at a time. They read the
current on-disk predecessor state, edit only their declared paths and return
structured changed-path/test results. The root orchestrator verifies the diff,
runs the required gate and creates an atomic commit before dispatching the next
phase. If a phase is already satisfied and produces an exact zero-path delta,
the same full gate is mandatory and the state records `validated-existing`
without creating an empty commit.

Each implementation phase requires:

- `bun --cwd core lint:types`;
- `bun --cwd core lint`;
- exact targeted Vitest/Bun lanes;
- DB lanes serial with `--timeout=360000` and test-local `360_000`;
- touched production/test/workflow physical line counts at most 1,000;
- `git diff --check`;
- no forbidden-path delta.

Immediately after preland, run root
`./node_modules/.bin/tsc -p tsconfig.json --noEmit`. Diagnostics in preland or
already-landed paths block; only strictly future-path or exact
baseline-equivalent unowned diagnostics may remain.

Before the 35-phase expansion is implemented, split the two boundary modules
that have no safe growth budget:

- extract runtime-smoke closeout projection/transition behavior from the current
  1,000-line `_docs/_workflows/lib/task-547-closeout-state.mjs` into cohesive
  `_docs/_workflows/lib/task-547-closeout-runtime-smoke.mjs`;
- extract smoke micro-phase descriptor/request validation from the current
  999-line `_docs/_workflows/task-547-implement.mjs` into cohesive
  `_docs/_workflows/lib/task-547-implementation-smoke-phases.mjs`.

The original modules remain explicit composition roots, and every touched
human-authored workflow/source/test file must finish at no more than 1,000
physical lines. Moving arbitrary ranges or duplicating the tracked registry is
not a valid split.

## Post-Audits and Runtime Smoke

After all 35 source/test/integration phases and atomic commits pass, the
mandatory closeout order is:

1. draft and atomically commit product/developer/task closeout docs without a
   terminal task status;
2. dispatch fresh internal Codex agents for the five post-audit lenses below,
   verify every finding locally, fix HIGH/MEDIUM findings atomically and rerun
   the affected gates and fresh lenses;
3. run a fresh trusted-root preliminary `--all`, then the real isolated
   `--scenario 05` byte-identity proof, then a final
   `bun scripts/task-547-runtime-smoke/cli.ts --all` against the same immutable
   candidate;
4. root-verify and atomically commit exactly 37 tracked evidence artifacts;
5. only then commit terminal task/changelog/index state and run one fresh
   read-only final graph/closeout consistency pass.

The preliminary all-run creates the complete clean baseline needed by the
selective proof. The root snapshots all 37 hashes, runs only scenario 05,
requires the other 17 result/PNG pairs byte-identical and admits at most
scenario 05's pair plus `manifest.json`, then discards that publication as
non-final by running all 18 scenarios freshly again. No agent operates any of
these commands or authors evidence.

The five independent post-audit lenses are:

- scope and task-contract fidelity;
- model/fail-closed correctness;
- present-only and byte-identity behavior;
- cross-stream/ownership safety;
- test and evidence integrity.

Every finding is locally verified. HIGH/MEDIUM findings are fixed and the
affected gates plus fresh lens are rerun. LOW deferral follows only the
TASK-9999 rules in `AGENTS.md`. Any source, test, workflow contract, tracked
smoke contract or relevant draft-doc change after the clean post-audit pass
invalidates the smoke and returns closeout to step 2.

The tracked CLI owns the scenario registry and full lifecycle. This workflow
issues one bounded trusted-root composite gate containing exactly the ordered
preliminary `--all`, isolated `--scenario 05` and final `--all` invocations,
validates their structured output and advances state; it does not duplicate the
registry or lifecycle. One immutable candidate guard spans all three commands.
Each of the 18 registry rows is a standalone tracked scenario module with a
matching independently runnable focused test. Each row performs:

1. exclusive task lock, free-port/no-live-session/no-temp preflight and a
   presence-aware prior-state digest;
2. fresh scoped package apply;
3. fresh server start only through `coderso-dev-core-host` plus separate
   admin/front health verification;
4. close/open of its assigned exact session (`wf547smoke`,
   `wf547formdesign` or `wf547pageeditor`);
5. marker registration before any public write, immediate returned-ID attach,
   material visible-effect assertions, separate console/page-error capture and
   one distinct valid PNG;
6. guaranteed sequential cleanup: scoped submission deletion/zero-row proof,
   exact source-run rollback or durable-expected-current atomic recovery,
   byte-exact prior settings equality, session close, exact helper-process stop,
   free-port and no-temp proof;
7. result/PNG promotion only after every cleanup receipt is clean.

The aggregate proves each cleanup `finalStateDigest` equals both the run's
initial digest and the next scenario's preflight `priorStateDigest`. There is no
retry after browser dispatch or mutation. One failed scenario leaves the tracked
evidence tree byte-identical.

`--scenario 05` is the required selective-debug proof: it may promote only row
05's result/PNG plus `manifest.json`, must verify the other 17 evidence pairs
byte-identical, and remains runnable without predecessor state. If any retained
pair or its current manifest binding is missing/invalid, selective mode fails
before mutation and requires `--all`. A correction local to scenario 05 changes
only its scenario module/focused test and reruns only that test and smoke row. A
shared-harness correction is explicitly cross-cutting: it reruns the shared
framework gate and every affected scenario test and invalidates all prior
runtime evidence.

`--all` stages all 18 result/PNG pairs outside the tracked destination and
promotes the complete set only after 18 clean independent lifecycles. Official
evidence is exactly:

- `_docs/PLAYWRIGHT/task-547-runtime-smoke/manifest.json`;
- for each canonical row, exactly
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/NN-<id>/result.json` and
  `_docs/PLAYWRIGHT/task-547-runtime-smoke/NN-<id>/screenshot.png`.

This is 37 tracked artifacts. `.gitignore` adds only
`!/_docs/PLAYWRIGHT/task-547-runtime-smoke/*/screenshot.png` after the global
PNG rule; no broader binary exception is allowed and force-add is forbidden. The
manifest binds ordered registry rows, session, result/PNG SHA-256, dimensions,
visible-effect summary, zero console/page errors and the baseline/cleanup digest
chain. Result files contain no `.env` value, credential, cookie, raw form
payload, absolute main-repository path or unredacted sensitive log.

Internal Codex agents may perform a fresh read-only audit of those 37 tracked
artifacts after root promotion. They may not operate `playwright-cli`, author or
repair JSON, capture or replace a PNG, choose retry behavior or certify a dirty
cleanup. If a post-promotion audit finds real drift, the root fixes the owning
code/contract, reruns the affected gates and all 18 fresh scenarios, and
replaces the evidence commit before terminal closure.

Draft closeout authors all product/developer prose and the complete changelog
entry before the five post-audits. After the final smoke, terminal closure may
touch only the 21 TASK-547 task files, `_docs/_TASKS/README.md` and
`_docs/_CHANGELOG/README.md`; the pinned changelog file and all nine
product/developer closure docs remain byte-identical to their audited
post-draft state. Within task files, the terminal delta is limited to canonical
status/completed fields, checklist markers and completion-evidence fields;
board/changelog indexes may change only this task's row/statistics. Any broader
delta invalidates the audit/smoke candidate and returns to draft closeout.

## Security and Operational Contract

- No delegated agent reads, copies, hashes, prints or persists `.env`. The root
  orchestrator also never inspects it directly.
- Before each authorized DB/settings/server command, the trusted root-operated
  subprocess sources only `/home/coder/project/Coderso/.env` with:
  `set -a && source /home/coder/project/Coderso/.env && set +a`.
- DB tests, DB-backed smoke operations and their root gate envelopes use at
  least 360,000 ms timeouts.
- The runtime-smoke root adapter starts/stops the server only through
  `coderso-dev-core-host`; `bun`, npm/package aliases, direct server entrypoints
  and an already-running process are not accepted substitutes. It records and
  stops the exact helper-owned process and proves the ports are free.
- `playwright-cli` receives an exact argv-only action allowlist and the three
  frozen task sessions. The applicable session is closed and reopened for every
  scenario, so sharing a session name never shares scenario state.
- No prompt/result includes provider keys, DB URLs, cookies, API keys, form
  submissions, raw sensitive logs or unredacted user data.
- Audit agents use repository-local read-only access only; no web/MCP/external
  model tools.
- Writable implementation agents receive exact owned/forbidden paths.
- The root orchestrator is the only commit owner. This TASK-547 workflow never
  merges into `feat/implementations`; it ends with an isolated handoff.
- TASK-540 paths remain forbidden.

## Implementation Pseudocode

```ts
const run = await prepareNativeAuditRun({
  rounds: 5,
  taskFiles: TASK_547_GRAPH,
  executor: "internal-codex-collaboration-v1",
});

for (let round = 1; round <= 5; round += 1) {
  for (const wave of chunk(run.perFileJobs(round), 3)) {
    const receipts = await orchestratorSpawnFreshCodexAgents(wave);
    for (const receipt of receipts) {
      await ingestNativeAgentReceipt(receipt);
    }
  }

  const reconcile = await orchestratorSpawnFreshCodexAgent(
    run.reconcileJob(round),
  );
  await ingestNativeAgentReceipt(reconcile);

  const findings = await validateRound(round);
  if (findings.length > 0) {
    throw new Error("fix externally and restart from round 1");
  }
  await publishCleanRoundEvidence(round);
}

await ingestNativeAgentReceipt(
  await orchestratorSpawnFreshCodexAgent(run.finalReconcileJob()),
);
await validateAndPublishFinalEvidence({ expectedFiles: 116 });
```

Implementation dispatch:

```ts
await implementation.prepare();
assertExactPhaseOrder(IMPLEMENTATION_PHASE_ORDER, { count: 35 });

for (const phase of IMPLEMENTATION_PHASE_ORDER) {
  const issued = await implementation.pending();
  assertLiteralExactWritablePaths(issued.job, phase);
  const receipt = await orchestratorSpawnFreshCodexAgent(issued.job);
  await implementation.ingest(receipt);

  const gate = await implementation.gateRequest();
  await implementation.gateIngest(await trustedRootRun(gate.request));

  if (receipt.result.changedPaths.length > 0) {
    await rootCommitAtomically(phase);
  }
  await implementation.advance();
}

await implementation.validate();
```

Closeout bridge:

```ts
await rootCommitDraftCloseoutDocsWithoutTerminalStatuses();

for (const lens of FIVE_POST_AUDIT_LENSES) {
  const result = await orchestratorSpawnFreshReadOnlyCodexAgent(lens);
  const verified = await rootVerifyFindings(result);
  await fixCommitRegateAndRerunLensIfNeeded(verified);
}

await assertCleanFiveLensPass();
const candidate = await captureImmutableCloseoutCandidate();
const smoke = await trustedRootRunComposite({
  commands: [
    ["bun", "scripts/task-547-runtime-smoke/cli.ts", "--all"],
    ["bun", "scripts/task-547-runtime-smoke/cli.ts", "--scenario", "05"],
    ["bun", "scripts/task-547-runtime-smoke/cli.ts", "--all"],
  ],
  sourceEnvForEachPrivilegedChild:
    "set -a && source /home/coder/project/Coderso/.env && set +a",
  databaseTimeoutMs: 360_000,
  serverHelper: "coderso-dev-core-host",
});
await assertUnchangedCandidate(candidate);
await assertSelectiveScenarioDelta(smoke, {
  selection: "05",
  exactMutablePaths: [
    "_docs/PLAYWRIGHT/task-547-runtime-smoke/manifest.json",
    "_docs/PLAYWRIGHT/task-547-runtime-smoke/05-portfolio-facets/result.json",
    "_docs/PLAYWRIGHT/task-547-runtime-smoke/05-portfolio-facets/screenshot.png",
  ],
  retainedPeerPairs: 17,
});
await validateExactTrackedSmokeEvidence(smoke, {
  scenarios: 18,
  artifacts: 37,
  independentCleanup: true,
});
await rootCommitExactEvidenceSetAtomically();

await orchestratorSpawnFreshReadOnlyCodexAgent(
  buildTrackedEvidenceAuditPacket(),
);
await rootCommitTerminalTaskAndChangelogState();
await runFreshFinalGraphCloseoutConsistencyPass();
```

Error handling: a malformed/missing receipt, path drift, failed gate, dirty
cleanup, partial promotion, candidate change or evidence-audit finding stops
advancement. Implementation fixes occur only in the owning phase/path set and
are committed atomically. Any correction after smoke removes the candidate's
eligibility and requires a fresh clean five-lens/regate decision plus complete
`--all` evidence replacement; no agent-generated or hand-edited artifact may
patch the set.

## Sub-Tasks

- [x] Define the unchanged 13-leaf graph and expanded 35-phase atomic
  implementation order.
- [x] Define the 18 independent tracked runtime-smoke module/test/result/PNG
  contracts and 37-artifact publication.
- [x] Replace repository-wide Claude guidance with internal Codex agents only.
- [x] Convert TASK-547 audit, implementation and fixer runners to authenticated
  native receipts and JIT state machines.
- [ ] Split the 1,000/999-line workflow boundaries before adding the 35-phase
  tracked-CLI bridge; prove no duplicated scenario registry/lifecycle.
- [ ] Record five clean native-agent rounds plus final reconcile.
- [ ] Run 35 sequential phases with per-phase gates and atomic commits.
- [ ] Run draft docs, five post-audits/remediation/regates, then fresh root-owned
  18-scenario smoke.
- [ ] Commit exactly 37 tracked evidence artifacts, close TASK-547 and preserve
  the isolated handoff without merging to `feat/implementations`.

## Testing Requirements

- `node --check _docs/_workflows/task-547-author-audit.mjs`
- `node --check _docs/_workflows/task-547-implement.mjs`
- `node --check _docs/_workflows/task-547-fix.mjs`
- native audit runner self-test:
  - exactly 21 per-file jobs plus one reconcile per round;
  - five rounds strictly sequential;
  - 111 unique agent tasks;
  - missing/duplicate/reused/wrong-round/wrong-job receipt rejection;
  - malformed schema/anchor/path/UTF-8 rejection;
  - finding in rounds 1–5 forces restart;
  - HEAD/ref/index/task/reference/workflow drift rejection;
  - interruption cannot produce complete evidence;
  - exactly 116 final artifacts;
  - schema-v1 external-host evidence rejection.
- implementation ownership/order and root-TSC classifier self-tests.
- implementation self-test proves exactly 35 phases, the unchanged 13-leaf
  union, literal per-phase writable paths, one atomic commit boundary per
  non-empty phase, scenario phases with exactly one module/test pair, and
  rejection of an out-of-phase or broad-glob delta.
- fixer exact-delta/restart self-tests.
- `node --check
  _docs/_workflows/lib/task-547-closeout-runtime-smoke.mjs`
- `node --check
  _docs/_workflows/lib/task-547-implementation-smoke-phases.mjs`
- focused tracked smoke framework:
  `bun test tests/unit/workflows/task547RuntimeSmoke/contracts.test.ts
  tests/unit/workflows/task547RuntimeSmoke/playwrightCli.test.ts
  tests/unit/workflows/task547RuntimeSmoke/browserHarness.test.ts
  tests/unit/workflows/task547RuntimeSmoke/runScenario.test.ts
  tests/unit/workflows/task547RuntimeSmoke/artifacts.test.ts
  tests/unit/workflows/task547RuntimeSmoke/rootPort.test.ts
  tests/unit/workflows/task547RuntimeSmoke/liveRootAdapter.test.ts`
- registry/aggregate/integration:
  `bun test tests/unit/workflows/task547RuntimeSmoke/registry.test.ts
  tests/unit/workflows/task547RuntimeSmoke/aggregate.test.ts
  tests/unit/workflows/task547RuntimeSmoke/cli.test.ts`
- every one of the 18
  `tests/unit/workflows/task547RuntimeSmoke/scenarios/NN-<id>.test.ts` files runs
  independently; the full directory run also stays green
- modularity self-tests prove no scenario imports another scenario, each row has
  one module/test/result/PNG, each scenario owns a full outer lifecycle,
  `--scenario 05` cannot mutate the other 17 pairs, and failed `--all` cannot
  promote a partial evidence set
- final evidence gate uses `git ls-files --error-unmatch` for all 18 scenario
  modules, all 18 focused scenario tests and all 37 evidence artifacts; no
  ignored/force-added file is accepted
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate-self-test`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`
- `git diff --check`
- every touched human-authored production/test/workflow file at most 1,000
  physical lines.

## Documentation Updates Required

At closure, TASK-547-06-L01 records:

- native internal-agent audit summaries and final aggregate digest;
- all 35 atomic implementation phase outcomes and exact validation commands;
- the tracked CLI/root-helper contract, three reused-but-reopened sessions, 18
  independently runnable scenarios, 18 fresh result JSONs, 18 fresh screenshots,
  one aggregate manifest and every clean lifecycle receipt;
- the narrow task-scoped PNG ignore exception, tracked-path verification and
  confirmation that no ignored legacy evidence was force-added;
- final changelog 1260 and task-board/statistics updates;
- confirmation that no external model/CLI and no merge to
  `feat/implementations` occurred.
