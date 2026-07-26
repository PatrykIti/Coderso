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
implementation dispatch, final validation and runtime evidence. All delegated
repository work uses fresh internal Codex collaboration agents. Claude,
Anthropic, external model CLIs and model-host subprocesses are forbidden.

The root Codex orchestrator is the final reviewer and commit owner. Repository
scripts never launch a model. They only freeze inputs, prepare bounded jobs,
validate structured receipts, persist sanitized evidence and run deterministic
local gates. The orchestrator alone calls `collaboration.spawn_agent`,
`collaboration.wait_agent`, `collaboration.send_message` and related native
collaboration tools.

Active entrypoints remain:

- `_docs/_workflows/task-547-author-audit.mjs` — operator-driven
  `prepare → native agent → ingest → validate` contract audit;
- `_docs/_workflows/task-547-implement.mjs` — sequential phase manifest,
  ownership and per-phase gate validation;
- `_docs/_workflows/task-547-fix.mjs` — exact finding-to-owner scope and
  restart/refresh validation.

Legacy external-host helpers are not part of the active import graph and must
not be invoked. `/tmp/task547-agent-host.mjs`, provider canaries, wrapper/model
identity and rate-limit handling are not TASK-547 gates.

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
code or task state.

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
- 8 + 5 + 5 smoke manifests;
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

The frozen leaf completion order remains:

1. `547-01-L01`
2. `547-01-L02`
3. `547-02-L01`
4. `547-02-L02`
5. `547-02-L03`
6. `547-03-L01`
7. `547-03-L02`
8. `547-03-L03`
9. `547-04-L01`
10. `547-04-L02`
11. `547-04-L03`
12. `547-05-L01`
13. `547-06-L01`

The 14-phase implementation order inserts `547-02-L03-preland` after
`547-02-L01` and before `547-02-L02`; final `547-02-L03` follows L02. The
preland writable subset is exactly:

- `core/services/kits/fullSiteInstall/compensation.ts`;
- `core/services/kits/fullSiteInstall/rollback.ts`;
- `tests/unit/kits/fullSiteInstallService.test.ts`.

All three are existing single-writer L03 paths. Preland creates no leaf, owner
or path and does not terminalize L03.

Implementation agents run strictly one leaf/phase at a time. They read the
current on-disk predecessor state, edit only their declared paths and return
structured changed-path/test results. The root orchestrator verifies the diff,
runs the required gate and creates an atomic commit before dispatching the next
phase.

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

## Post-Audits and Runtime Smoke

After source, tests, draft docs and atomic implementation commits are complete,
but before any terminal task status, dispatch fresh internal Codex agents for
at least these independent lenses:

- scope and task-contract fidelity;
- model/fail-closed correctness;
- present-only and byte-identity behavior;
- cross-stream/ownership safety;
- test and evidence integrity.

Every finding is locally verified. HIGH/MEDIUM findings are fixed and the
affected gates plus fresh lens are rerun. LOW deferral follows only the
TASK-9999 rules in `AGENTS.md`. Terminal closure follows only a clean five-lens
pass; afterward only a final read-only graph/closeout consistency pass remains.

Runtime smoke uses `playwright-cli` and only the trusted
`coderso-dev-core-host` service helper. Restart the server before smoke and
verify admin/front health. Required sessions are:

- `wf547smoke`: 8 public scenarios;
- `wf547formdesign`: 5 Form Design scenarios;
- `wf547pageeditor`: 5 Page Editor scenarios.

All 18 scenarios assert visible effects, use fresh distinct PNGs, report zero
console/page errors and preserve exact cleanup/rollback evidence. Every result
has a strict cleanup receipt; the root independently verifies closed sessions,
stopped processes and free ports, then writes the aggregate 18-hash manifest
from verified PNG bytes. Public/admin smoke agents are internal Codex agents
only.

## Security and Operational Contract

- No delegated agent reads, copies, hashes, prints or persists `.env`. The root
  orchestrator also never inspects it directly.
- Before each authorized DB/settings/server command, the trusted root-operated
  subprocess sources only `/home/coder/project/Coderso/.env` with:
  `set -a && source /home/coder/project/Coderso/.env && set +a`.
- DB tests use at least 360,000 ms timeouts.
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
for (const phase of IMPLEMENTATION_PHASE_ORDER) {
  const result = await orchestratorSpawnFreshCodexAgent(
    prepareImplementationJob(phase),
  );
  assertExactOwnedDelta(result.changedPaths, phase.ownedPaths);
  await runPhaseGate(phase);
  await rootCommitAtomically(phase);
}
```

## Sub-Tasks

- [x] Define the 13-leaf ownership and 14-phase implementation order.
- [x] Define 8 + 5 + 5 runtime smoke contracts.
- [x] Replace repository-wide Claude guidance with internal Codex agents only.
- [ ] Convert the TASK-547 audit runner and evidence schema to native receipts.
- [ ] Record five clean native-agent rounds plus final reconcile.
- [ ] Run sequential implementation, post-audits and final smoke.
- [ ] Preserve final screenshot hashes and close TASK-547.

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
- fixer exact-delta/restart self-tests.
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate-self-test`
- `node _docs/_workflows/lib/task-547-final-validation-contract.mjs --line-gate`
- `git diff --check`
- every touched human-authored production/test/workflow file at most 1,000
  physical lines.

## Documentation Updates Required

At closure, TASK-547-06-L01 records:

- native internal-agent audit summaries and final aggregate digest;
- atomic implementation commits and exact validation commands;
- three smoke sessions, 18 fresh screenshots and cleanup receipt;
- final changelog 1260 and task-board/statistics updates;
- confirmation that no external model/CLI and no merge to
  `feat/implementations` occurred.
