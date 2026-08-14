# Runtime Smoke Authoring Cookbook

Use this cookbook when a change must be proved against a real Coderso host,
owned process/network boundary, and/or real browser. It shows how to add a
suite to the shared runtime-smoke platform without creating another task-local
shell executor, Bun bridge, database cleanup loop, or Playwright lifecycle.

The public entry point is always:

```bash
bun scripts/runtime-smoke.ts run \
  --suite <registered-suite> \
  --profile <fast|certification> \
  --session <task-scoped-name>
```

Session names have 3–64 characters, begin with a lowercase letter, and contain
only lowercase letters, numbers, and `-`. The JSON report is written to stdout
and a short Markdown summary is written to stderr. Redirect stdout to a
task-scoped file when durable evidence is required.

This page is the contributor recipe. The authoritative constraints remain in
[`_docs/TESTING_STRATEGY.md`](../../_docs/TESTING_STRATEGY.md), while the
implementation contracts live under
[`scripts/runtime-smoke/`](../../scripts/runtime-smoke/).
The snippets use real shared API names but intentionally leave suite-owned
validators, handlers, selectors, and imports as named seams.

## 1. Choose the right test surface

A runtime smoke complements, rather than replaces, contract tests.

| Question | Use |
|---|---|
| Can a pure function, schema, mapper, or React component prove it? | Vitest |
| Can an in-process runtime test prove Bun behavior, routes, DB integration, or server modules without owning a deployed-host boundary? | Bun test |
| Must it prove a real built/dev host, owned process/port/network boundary, visible browser effect, navigation/publish flow, browser errors, or front/Admin parity? | Runtime smoke |

Keep the runtime suite small in infrastructure surface, not in product proof.
A fast profile may shorten controlled waits, but it must retain the same
product-visible scenarios and assertions as certification.

## 2. Use the standard file layout

For a new suite named `example-suite`, prefer this shape:

```text
scripts/runtime-smoke/
  adapters/
    example-suite.ts                 # thin product-flow adapter
    example-suite/
      worker-entry.ts                # only when Bun/DB work is needed
      worker-operations.ts           # descriptors + strict validators
      production-handlers.ts         # bounded domain queries/mutations
      browser-actions.ts             # logical plan + action materialization
tests/unit/runtime-smoke/
  example-suite-adapter.test.ts
  example-suite-worker.test.ts       # only for a worker-backed suite
```

The adapter owns product selectors, fixtures, scenario order, registered
operations, query implementations, reset logic, and evidence assertions. The
shared platform owns CLI parsing, lifecycle, polling, process supervision,
worker framing, retry boundaries, database batch validation, browser framing,
redaction, timings, and the final report.

TASK-540's retired source/eval catalog was deleted after native coverage parity
was proven. New work registers typed worker operations directly.

## 3. Register the suite in all four places

The registry is intentionally static. A CLI argument must never select an
arbitrary module path or trigger directory scanning.

1. Add the literal ID to `SUITE_IDS` in
   [`contracts.ts`](../../scripts/runtime-smoke/contracts.ts).
2. Add the exact allowed profiles to `SUPPORTED_PROFILES` in
   [`cli.ts`](../../scripts/runtime-smoke/cli.ts).
3. Add the fixed adapter path to `ADAPTER_PATHS` and the matching descriptor to
   `DESCRIPTORS` in [`registry.ts`](../../scripts/runtime-smoke/registry.ts).
4. Update the exact CLI/registry expectations in
   [`cli-registry.test.ts`](../../tests/unit/runtime-smoke/cli-registry.test.ts).

For example:

```ts
// contracts.ts
export const SUITE_IDS = [
  "task-540",
  "widget-contract",
  "production-boundary",
  "example-suite",
] as const;

// cli.ts
const SUPPORTED_PROFILES: Readonly<
  Record<SmokeSuiteId, readonly SmokeProfileId[]>
> = {
  // existing suites...
  "example-suite": ["fast", "certification"],
};

// registry.ts
const ADAPTER_PATHS: Readonly<Record<SmokeSuiteId, string>> = Object.freeze({
  // existing suites...
  "example-suite": "scripts/runtime-smoke/adapters/example-suite.ts",
});

const DESCRIPTORS = new Map<SmokeSuiteId, SmokeSuiteDescriptor>([
  // existing descriptors...
  ["example-suite", descriptor("example-suite")],
]);
```

Keep three profile declarations synchronized: the central CLI allowlist, the
adapter's `supportedProfiles`, and a fail-closed guard at the beginning of
`run()`. The adapter field is descriptive; the adapter must still reject an
unexpected suite/profile combination itself.

## 4. Start with a thin adapter

The adapter implements [`SmokeAdapter`](../../scripts/runtime-smoke/adapters/types.ts)
and receives the validated
[`RuntimeSmokeContext`](../../scripts/runtime-smoke/lifecycle.ts). On a product
or harness failure, throw `SmokeError`; do not manufacture `pass: false` or
return `pass: true` with a failed scenario.

```ts
import { SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import type {
  SmokeAdapter,
  SmokeAdapterResult,
  SmokeScenarioResult,
} from "./types";

async function runExampleAdapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  if (
    context.input.suite !== "example-suite" ||
    !new Set(["fast", "certification"]).has(context.input.profile)
  ) {
    throw new SmokeError(
      "smoke_argument_invalid",
      "example suite or profile is unsupported"
    );
  }

  context.lifecycle.assertAccepting();
  const evidencePaths = buildExampleEvidencePaths(context.input.session);
  const repositoryBefore = await context.repository.snapshot(evidencePaths);
  const started = performance.now();

  const proof = await context.timing.measure(
    "scenario",
    "visible-effect",
    () => runAndValidateExampleFlow(context, evidencePaths)
  );
  // Strictly validate server/readiness, visible output, screenshot digests,
  // pre-navigation browser listeners, zero errors, and restoration receipts.
  // This assertion throws until the complete suite-owned proof is valid.
  assertExampleFlowProof(proof, evidencePaths);

  const repositoryAfter = await context.repository.snapshot(evidencePaths);
  context.repository.assertUnchanged(
    repositoryBefore,
    repositoryAfter,
    evidencePaths
  );

  const scenarios: readonly SmokeScenarioResult[] = Object.freeze([
    Object.freeze({
      id: "visible-effect",
      pass: true,
      elapsedMs: Math.ceil(performance.now() - started),
    }),
  ]);

  return Object.freeze({
    pass: true,
    serverUp: proof.serverUp,
    scenarios,
    screenshots: proof.screenshots,
    consoleErrors: proof.consoleErrors,
    cleanup: Object.freeze({
      productStateRestored: proof.productStateRestored,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "example-suite",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runExampleAdapter,
});

export default adapter;
```

The example is a fail-closed seam, not a complete product proof:
`runAndValidateExampleFlow`, `assertExampleFlowProof`, and the evidence-path
builder are suite-owned and intentionally omitted. The assertion must reject
until readiness, product proof, evidence, relevant browser observation,
cleanup, and restoration are complete. A non-browser host-boundary suite may
validly return no screenshots, but it must strictly validate its own process,
HTTP, logs, and cleanup contract.

The adapter's `cleanup` object appears as `suiteCleanup` in the report. The
separate top-level `cleanup` result is produced by the shared lifecycle after
the adapter finishes. Do not conflate the two.

## 5. Register every owned resource immediately

Any process, port, browser session, worker pool, temporary workspace, settings
override, or external handle created by the suite needs a
`LifecycleResource`:

```ts
interface LifecycleResource {
  readonly name: string;
  close(): Promise<void>;
  proveAbsent(): Promise<boolean>;
}
```

Follow this order:

1. Call `context.lifecycle.assertAccepting()` before allocation.
2. Allocate the resource.
3. Register it immediately with `context.lifecycle.register(resource)`.
4. Make `close()` idempotent.
5. Make `proveAbsent()` check the real absence of the PID, port, browser
   session, file, connection, or setting override.

The lifecycle closes resources in reverse registration order, even after a
failure. A factory that fails before returning a resource must clean up its own
partial allocation. It is fine to close a resource early in `finally`; the
later lifecycle call must remain safe and must still prove absence.

Useful references are the PID/port resource in
[`production-boundary.ts`](../../scripts/runtime-smoke/adapters/production-boundary.ts),
the private workspace in
[`widget-contract.ts`](../../scripts/runtime-smoke/adapters/widget-contract.ts),
and the ordering tests in
[`lifecycle-timing.test.ts`](../../tests/unit/runtime-smoke/lifecycle-timing.test.ts).

## 6. Supervise processes and poll conditions

Use `context.processes`; do not spawn an unmanaged shell. Resolve the
executable once, keep `cwd` inside the repository, pass a minimal environment,
and bound time and output.

```ts
import { resolveInsideRoot } from "../contracts";
import { pollUntil } from "../polling";
import { resolveExecutableOnPath } from "../process-supervisor";

const bun = await resolveExecutableOnPath("bun");
const requiredPath = process.env.PATH ?? "";

const result = await context.timing.measure("process", "example-setup", () =>
  context.processes.run({
    executable: bun,
    args: ["--no-env-file", "run", "example"],
    cwd: resolveInsideRoot(context.root, "core", "example cwd"),
    env: Object.freeze({ PATH: requiredPath }),
    family: "example-setup",
    timeoutMs: 30_000,
    maxOutputBytes: 256 * 1024,
    allowStderr: false,
  })
);

await context.timing.measure("phase", "server-readiness", () =>
  pollUntil({
    timeoutMs: 30_000,
    intervalMs: 50,
    check: async () => ((await probeReady()) ? true : null),
  })
);
```

Important constraints:

- `executable` is an absolute resolved file.
- `env` replaces the child environment. Pass only required keys; never spread
  `process.env`.
- A one-shot process accepts at most 128 arguments and 16 KiB of arguments.
- Use stdin or a private file for large programs. In particular, send
  Playwright code through `--filename`, not one giant argument.
- `allowStderr: true` means the adapter owns strict stderr validation.
- `pollUntil` is for bounded condition polling. Do not replace it with fixed
  sleeps or unconditional wait windows.

If `start()` is needed for a long-running server, its output still needs a
bounded collector and its PID/port must belong to an explicitly registered
resource. See [`process-supervisor.ts`](../../scripts/runtime-smoke/process-supervisor.ts)
and the production-boundary adapter for the complete pattern.

## 7. Add a persistent Bun/DB worker

Use a worker when repeated operations would otherwise start a new Bun process
or database pool. A new suite owns a suite-scoped worker entry and registered
operation definitions; it reuses the shared protocol, pool, and lifecycle.

### 7.1 Define a strict operation

```ts
import { createHash } from "node:crypto";
import type { WorkerOperationDefinition } from "../../workers/contracts";

const HANDLER_ARTIFACT = "example-suite/baseline-database/v1";
const HANDLER_ARTIFACT_SHA256 = createHash("sha256")
  .update(HANDLER_ARTIFACT)
  .digest("hex");

export const baselineDatabaseOperation: WorkerOperationDefinition = {
  operationId: "example-suite/baseline/database",
  profileId: "database",
  inputSchemaId: "example-suite-baseline-v1",
  outputSchemaId: "example-suite-baseline-result-v1",
  sourceSha256: HANDLER_ARTIFACT_SHA256,
  retryClass: "idempotent-read",
  maxInputBytes: 256 * 1024,
  maxOutputBytes: 256 * 1024,
  validateInput(value) {
    // Require a plain object, exact keys, exact IDs, and bounded arrays.
    return validateBaselineInput(value);
  },
  validateOutput(value) {
    // Require exact cardinality and a strict small JSON result.
    return validateBaselineOutput(value);
  },
  async execute(input, { profileId }) {
    return readBaselineBatch(profileId, input);
  },
};
```

The digest identifies a stable, versioned handler/query contract. Bump the
artifact version when semantics change. Never use cross-runtime
`Function#toString()` as operation authority; Node and Bun can produce
different source identities for equivalent functions.

The registry validates descriptor identity, input, and output. An unexpected
handler exception becomes the closed `operation_failed` code; raw SQL, binds,
rows, stack traces, and environment values must never be printed by a handler.

### 7.2 Create the suite-scoped worker entry

The generic worker file's own main is only a self-test. A suite calls its
exported `runWorkerEntry()` after parsing an exact profile allowlist:

```ts
const profileId = parseExactAllowlistedProfile(Bun.argv.slice(2));
const registry = createExampleSuiteRegistry({
  async close() {
    await closeResourcesOwnedByThisWorker();
  },
  async proveAbsent() {
    return resourcesAreRestoredAndClosed();
  },
});

await runWorkerEntry({
  profileId,
  registry,
  input: process.stdin,
  output: { write: writeStdout },
});
```

Worker stdout is protocol-only. The entry validates sequential request IDs and
bounded frames, then calls `close()` and `proveAbsent()` before clean EOF. Use
[`task-540/worker-entry.ts`](../../scripts/runtime-smoke/adapters/task-540/worker-entry.ts)
as the concrete entry pattern, but define new typed handlers rather than
copying TASK-540's legacy source executor.

### 7.3 Create one lazy process per exact profile

```ts
const pool = await WorkerPool.create({
  root: context.root,
  executable: bun,
  supervisor: context.processes,
  registry,
  lifecycle: context.lifecycle,
  profiles: [
    {
      profileId: "database",
      databaseBearing: true,
      privileged: true,
      entryFile,
      cwd: coreRoot,
      environment: Object.freeze({
        PATH: requiredPath,
        DATABASE_URL: requiredDatabaseUrl,
        DB_POOL_MAX: "1",
      }),
    },
  ],
});

const output = validateBaselineOutput(
  await pool.dispatch(baselineDatabaseOperation, input)
);
pool.recordDatabaseBatch(output.statements, output.rows);
```

Profiles are lazy and isolated. A database-bearing profile must receive
exactly `DB_POOL_MAX: "1"`; do not create a union environment containing every
profile's secrets. Close privileged profiles as soon as their work ends.

Only an `idempotent-read` can retry once, and only before dispatch. A mutation
is never automatically replayed after it may have reached the worker. If its
response is lost, reconcile state first as described below.

## 8. Batch database reads and cleanup safely

The shared database modules validate plans and receipts. The suite still owns
the real bounded query, exact projections, ownership digest, transaction-handle
usage, and database resource lifecycle.

### 8.1 Record fixtures as they are created

```ts
const ledger = new RunFixtureLedger();

ledger.append({
  resourceKey: `content-type/${contentTypeId}`,
  logicalId: "created-content-type",
  kind: "content-type",
  profileId: "database",
  wave: 1,
  ordinal: 1,
  identifier: Object.freeze([contentTypeId]),
  ownershipSha256: digestExactOwnedRowIdentity(runId, contentTypeId),
  dependsOn: Object.freeze([]),
});

ledger.append({
  resourceKey: `entry/${entryId}`,
  logicalId: "created-entry",
  kind: "entry",
  profileId: "database",
  wave: 0,
  ordinal: 2,
  identifier: Object.freeze([entryId]),
  ownershipSha256: digestExactOwnedRowIdentity(runId, entryId),
  dependsOn: Object.freeze([`content-type/${contentTypeId}`]),
});

const frozenLedger = ledger.freeze();
const cleanupPlan = buildCleanupBatchPlan(frozenLedger, "database", 0);
// Execute wave 0, then build and execute wave 1 for the parent.
```

Lower waves delete first. A child that depends on a parent must therefore have
`child.wave < parent.wave`. Plans are exact profile/wave batches with at most
128 resources. Do not launch unordered `Promise.all()` deletes across foreign
keys.

### 8.2 Use one set-based transaction and a post-commit proof

The real DB adapter runs inside the registered database worker handler, not in
the coordinator process:

```ts
// production-handlers.ts — imported only by the suite-scoped Bun worker.
export async function executeCleanupMutation(input: unknown) {
  const cleanupPlan = validateCleanupMutationInput(input);
  return executeTransactionalCleanupBatch(cleanupPlan, {
    transaction: (callback) => db.transaction(callback),
    async readOwned(transaction, resources) {
      // ONE bounded set-based SELECT using the transaction handle.
      return readExactOwnership(transaction, resources);
    },
    async deleteOwned(transaction, resources) {
      // ONE set-based DELETE ... RETURNING resource keys.
      return deleteExactOwnedRows(transaction, resources);
    },
    async proveAbsent(resourceKeys) {
      // ONE bounded post-commit SELECT returning exactly absent keys.
      return proveExactAbsence(resourceKeys);
    },
  });
}
```

The adapter dispatches only the registered strict mutation and records counters
after validating its response:

```ts
const result = validateCleanupMutationOutput(
  await pool.dispatch(
    cleanupDatabaseMutationOperation,
    encodeCleanupMutationInput(cleanupPlan)
  )
);

pool.recordDatabaseBatch(result.statementCount, result.rowCount);
```

The helper verifies exact provenance before deletion, exact `RETURNING`
identity, and exact absence after commit. Its `statementCount: 3` is truthful
only when those three adapter methods each issue one set-based statement.
Inside the transaction, never switch back to the global DB client.

If the mutation response is uncertain, do not replay it. Dispatch a separate,
registered `idempotent-read` reconciliation operation whose worker handler uses
the bounded state reader:

```ts
// Inside the reconciliation worker handler:
const state = await reconcileUncertainCleanupMutation(cleanupPlan, () =>
  readCurrentOwnedRows(cleanupPlan)
);

// In the coordinator, only after the mutation result was lost:
const reconciliation = validateCleanupReconciliationOutput(
  await pool.dispatch(
    cleanupDatabaseReconciliationOperation,
    encodeCleanupReconciliationInput(cleanupPlan)
  )
);
// pre-state: an explicit new attempt may be made
// post-state: continue with proof
// partial/foreign: hard failure
```

For repeated baseline reads, `buildBaselineBatchPlans()` partitions by exact
profile and `projectBaselineOutputs()` restores logical source order. It does
not automatically chunk an oversized profile group: create bounded inputs by
design. API/storage/media cleanup remains API/storage/media-owned when that
layer is part of the product proof.

Copyable tests live in
[`database-batches.test.ts`](../../tests/unit/runtime-smoke/database-batches.test.ts).

## 9. Batch browser work without crossing dependencies

Model the logical order first:

```ts
const actions: readonly BrowserPlanAction[] = Object.freeze([
  {
    id: "editor-open",
    scenarioId: "editor-visible-effect",
    lane: "run-code",
    captureOutputs: [],
    isolated: false,
  },
  {
    id: "editor-save",
    scenarioId: "editor-visible-effect",
    lane: "run-code",
    captureOutputs: ["saved-entry-id"],
    isolated: false,
  },
  {
    id: "database-proof",
    scenarioId: "editor-visible-effect",
    lane: "runtime",
    captureOutputs: [],
    isolated: false,
  },
  {
    id: "editor-screenshot",
    scenarioId: "editor-visible-effect",
    lane: "standalone",
    captureOutputs: [],
    isolated: false,
  },
]);

const dispatchPlan = compileBrowserDispatchPlan(actions);
```

Segmentation rules are deterministic:

- `runtime` ends the current browser batch and creates no browser dispatch.
- `standalone` ends the batch and becomes its own dispatch.
- A scenario change ends the batch.
- `isolated: true` creates a single-action segment.
- A captured output ends the segment after that action so the parent can use
  it safely.
- A run-code segment has at most 64 actions.

Drive the original logical sequence so `runtime` actions execute at their
barrier. The compiler intentionally omits runtime actions from
`dispatchPlan.dispatches`; iterating only dispatches would skip them. Narrow
standalone and run-code dispatches explicitly, and materialize real source
before enforcing byte limits:

```ts
let logicalCursor = 0;
let dispatchCursor = 0;

while (logicalCursor < actions.length) {
  const logical = actions[logicalCursor];
  if (logical === undefined) throw new Error("logical action is absent");

  if (logical.lane === "runtime") {
    await executeRegisteredRuntimeBarrier(logical.id);
    logicalCursor += 1;
    continue;
  }

  const dispatch = dispatchPlan.dispatches[dispatchCursor];
  if (dispatch === undefined) throw new Error("browser dispatch is absent");
  dispatchCursor += 1;

  if (dispatch.kind === "standalone") {
    if (dispatch.actionId !== logical.id) throw new Error("standalone drifted");
    await executeRegisteredStandalone(dispatch);
    logicalCursor += 1;
    continue;
  }

  if (dispatch.actionIds[0] !== logical.id) throw new Error("segment drifted");
  const materializedActions = await materializeActions(dispatch.actionIds);
  const sizes = materializedSourceBytes(dispatch, materializedActions);
  const partitions = splitMaterializedSegment(dispatch, sizes);
  const byId = new Map(
    materializedActions.map((action) => [action.actionId, action])
  );

  for (const segment of partitions) {
    const materialized = Object.freeze({
      segment,
      actions: Object.freeze(
        segment.actionIds.map((actionId) => {
          const action = byId.get(actionId);
          if (action === undefined) throw new Error("browser action is absent");
          return action;
        })
      ),
    });

    const frames = await transport.runSegment(materialized, {
      runId,
      manifestSha256,
      scenarioId: segment.scenarioId,
      segmentId: segment.segmentId,
      actionIds: segment.actionIds,
    });
    consumeValidatedFramesOrThrow(frames);
  }

  logicalCursor += dispatch.actionIds.length;
}

if (dispatchCursor !== dispatchPlan.dispatches.length) {
  throw new Error("browser dispatch plan was not fully consumed");
}
```

The materialized action sources receive a 92 KiB budget so the complete
Playwright run-code program stays below 96 KiB. One action that exceeds the
limit fails closed. Do not rely only on a pre-materialization size estimate.

An action source is a function expression that returns a small, strict proof:

```ts
const action = Object.freeze({
  actionId: "editor-visible-proof",
  source: `async (page) => {
    const target = page.locator("[data-testid=editor-preview]");
    const box = await target.boundingBox();
    return {
      visible: await target.isVisible(),
      width: box?.width ?? 0,
      ariaExpanded: await target.getAttribute("aria-expanded"),
    };
  }`,
});
```

Assert computed styles, geometry, DOM state, `aria-*`, and real front/Admin
parity. Control presence or an emitted CSS string is not a visible-effect
proof. Return no cookies, headers, tokens, raw DOM, raw responses, or user data.

## 10. Reuse the shared Playwright transport

Adapters must instantiate `PlaywrightCliDispatcher`; they must not implement a
task-local `playwright-cli` wrapper. The dispatcher validates the exact session
and segment allowlist, projects only the approved Chromium runtime paths, writes
generated source to a private `0600` file, bounds and validates canonical output,
and closes the named session with an absence proof.

```ts
import { BrowserTransport } from "../browser/transport";
import { PlaywrightCliDispatcher } from "../browser/playwright-cli-dispatcher";

const segmentIds = Object.freeze(["editor-visible-proof"]);
const dispatcher = new PlaywrightCliDispatcher({
  context,
  session: context.input.session,
  workspace,
  segments: segmentIds,
});
const transport = new BrowserTransport(context.input.session, dispatcher);
context.lifecycle.register(transport);

try {
  // Run validated materialized segments serially.
} finally {
  await transport.close();
}

if (!(await transport.proveAbsent())) {
  throw new SmokeError("smoke_cleanup_failed", "browser session remained active");
}
```

`BrowserTransport` preserves action identity and successful-prefix semantics,
stops at the first failure, rejects concurrent dispatch on one transport, and
counts physical client processes, segments, and frames separately from logical
actions. Shared ownership lives in
[`playwright-cli-dispatcher.ts`](../../scripts/runtime-smoke/browser/playwright-cli-dispatcher.ts)
and [`browser/`](../../scripts/runtime-smoke/browser/). Long-running development
or production hosts must likewise use
[`startSupervisedServer()`](../../scripts/runtime-smoke/server/supervised-server.ts)
with a suite-owned exact environment policy, readiness probes, bounded logs,
owned ports, and lifecycle cleanup; do not add a private server launcher.

Install `console` and `pageerror` listeners before the first navigation. An
empty `consoleErrors` array is valid only when the adapter actually observed
and validated the full relevant browser lifetime. Run light and dark mode for
Admin surfaces when the touched contract requires both.

## 11. Validate screenshots and repository evidence

Save durable screenshots under `_docs/_workflows/_smoke/` with a suite/session/
scenario name. Use only task-owned synthetic fixtures and inspect the visual
content before persistence; PNG validation cannot remove secrets, PII, customer
content, tokens, or private browser chrome from pixels. Before reporting one:

1. Resolve the path inside the repository.
2. Require a non-empty regular file.
3. Enforce a bounded size (the existing adapters use 16 MiB).
4. Verify the complete PNG signature `89504e470d0a1a0a`.
5. Return only the relative path and SHA-256.

```ts
return Object.freeze({
  path: relativeScreenshotPath,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
```

Use `context.repository.snapshot()` at meaningful workflow boundaries. Use
`snapshotKnown(paths)` to cheaply rehash already-authorized evidence paths.
Allow only exact evidence files, never an entire directory, and assert all
other repository state is unchanged.

## 12. Add checkpoints only with real end-to-end resume

Checkpoint primitives are available, but saving a seal alone does not make a
suite resumable. A scenario can be sealed only after it proves:

- every scenario assertion and visible effect;
- required evidence hashes, including screenshots for browser suites;
- zero console/page errors for the relevant observed browser lifetime;
- fixture cleanup and post-cleanup absence;
- exact settings restoration;
- canonical reset for the next scenario;
- repository guard success.

The identity binds suite/profile/run, revision, worktree, harness, manifest,
fixture namespace/ledger, and local origin digests. The proof binds the ordered
action list, scenario/reset contract, evidence, and cleanup proof.

```ts
const identity = Object.freeze({
  schemaVersion: 1 as const,
  suiteId: context.input.suite,
  profileId: context.input.profile,
  runId,
  revisionSha256: checkpointDigest(revisionIdentity),
  workingTreeSha256: repositorySnapshot.sha256,
  harnessSha256: checkpointDigest(harnessManifest),
  manifestSha256: checkpointDigest(actionManifest),
  fixtureNamespaceSha256: checkpointDigest(fixtureNamespace),
  fixtureLedgerSha256: checkpointDigest(fixtureLedger),
  originSha256: checkpointDigest(localOrigin.toString()),
});

const contract = Object.freeze({
  scenarioId: "editor-visible-effect",
  ordinal: 1,
  actionIds: Object.freeze(["editor-open", "editor-save"]),
  scenarioSha256: checkpointDigest(scenarioContract),
  resetSha256: checkpointDigest(resetContract),
});

const proof = Object.freeze({
  scenarioId: contract.scenarioId,
  ordinal: contract.ordinal,
  completedActionIds: contract.actionIds,
  scenarioSha256: contract.scenarioSha256,
  resetSha256: contract.resetSha256,
  evidenceSha256: Object.freeze([screenshot.sha256]),
  cleanupProofSha256: checkpointDigest(cleanupProof),
});

const store = new CheckpointStore(
  context.root,
  `.tmp/runtime-smoke/checkpoints/${context.input.suite}/${context.input.session}`
);

await store.save(sealScenarioCheckpoint(identity, proof));
const latest = await store.loadLatestCompatible(identity, [contract]);
```

Before skipping any scenario, the adapter must consume `latest`, rebuild only
renewable host/browser state, and re-prove cleanup plus canonical preconditions.
`loadLatestCompatible()` validates the seal and contract; it cannot inspect the
current application or database for the adapter.

Checkpoint files are bounded, create-only, and atomic, but they are not
automatically redacted. Suite/profile/run/scenario and completed-action IDs are
stored in plaintext, so use only deterministic non-sensitive IDs and digests;
never place secrets, PII, or product/customer identifiers in those fields. The
newest incompatible checkpoint fails closed rather than silently falling back
to an older one. `evidenceSha256` must contain at least one digest; a scenario
without a screenshot still needs bounded, safe, independently validated
evidence.

Current status matters: no existing runtime adapter imports and consumes the
checkpoint store end to end. TASK-540 has a seven-scenario reset inventory but
still performs canonical full-flow cleanup. Do not claim automatic TASK-540
resume or skipped scenario replay.

## 13. Define fast and certification truthfully

Both profiles prove the same product contract.

- `fast` is the task/PR feedback lane. It may use shorter supported polling or
  authentication windows and narrower infrastructure variants only when the
  exact prior state is restored in all exits.
- `certification` uses production-strength waits and exhaustive variants at the
  release boundary.
- A profile never silently falls back to another.
- A harness-only change reruns its focused unit/self-test and affected runtime
  lane. It does not invalidate unrelated product/security gates.

Record deliberate product waits separately from process, polling, cleanup, and
browser overhead. Report physical worker/browser processes and database
batches honestly; do not present logical receipts as process savings.

## 14. Return a bounded, truthful result

On success, return only safe scalars, relative evidence paths, and digests:

```ts
return Object.freeze({
  pass: true,
  serverUp: true,
  scenarios: Object.freeze([
    Object.freeze({
      id: "editor-visible-effect",
      pass: true,
      elapsedMs,
    }),
  ]),
  screenshots: Object.freeze([screenshot]),
  consoleErrors: Object.freeze([]),
  cleanup: Object.freeze({
    fixtureRowsRemoved: cleanupRows,
    productStateRestored: true,
    repositoryRestored: true,
  }),
});
```

The shared entry point always runs lifecycle cleanup and computes the final
PASS from the adapter result, primary error, and global cleanup proof. It then
adds timings, process counters, snapshot count, failures, and redaction. JSON
is canonical and bounded to 1 MiB.

Redaction is a last line of defense, not permission to put credentials,
cookies, tokens, headers, SQL/binds, PII, or raw logs in any intermediate
result.

## 15. Manifestable visible evidence recipe

Use this recipe when the suite report must become durable TASK-545 smoke
evidence under `_docs/_workflows/_smoke/evidence/`. It adds one strict contract
on top of the thin adapter from section 4: every scenario carries exact visible
evidence and the report proves a byte-exact projection of it before any manifest
is created. The schema/validator owner is
[`_docs/_workflows/lib/smoke-evidence.mjs`](../../_docs/_workflows/lib/smoke-evidence.mjs);
adapters use only the thin runner-side delegate
[`scripts/runtime-smoke/visible-evidence.ts`](../../scripts/runtime-smoke/visible-evidence.ts)
and never import the manifest writer.

Build the strict scenarios from machine-observed proof: exact kebab-case `id`,
`pass: true`, a non-empty `title`, non-empty profile-specific `variants` (each
with machine-observed visible `assertions` and an empty `consoleErrors`
array), and at least one scenario-owned `screenshots` entry with a bounded,
signature-verified PNG path and SHA-256. A manifest-bearing suite must provide
all of these; Admin variants must cover both Admin light and dark without
inventing duplicate scenario IDs.

```ts
import { requireManifestableScenarioResults } from "../visible-evidence";
import type { SmokeScenarioResult, SmokeScreenshotResult } from "./types";

const scenarios: readonly SmokeScenarioResult[] = Object.freeze([
  Object.freeze({
    id: "editor-visible-effect",
    pass: true,
    elapsedMs: Math.ceil(performance.now() - started),
    title: "Editor shows the saved block effect",
    variants: Object.freeze([
      Object.freeze({
        id: "admin-light-desktop",
        surface: "admin",
        theme: "light",
        viewport: Object.freeze({ width: 1280, height: 800 }),
        assertions: Object.freeze([
          Object.freeze({
            kind: "computed-style",
            target: "#block-preview",
            property: "display",
            expected: "flex",
            actual: "flex",
            pass: true,
          }),
        ]),
        consoleErrors: Object.freeze([]),
      }),
    ]),
    screenshots: Object.freeze([
      Object.freeze({ path: evidencePath, sha256: screenshotSha256 }),
    ]),
  }),
]);

// Prove the strict manifestable shape and the exact global screenshot union
// BEFORE returning the shared report. Call the delegate directly; it performs
// no projection. A one-line named adapter delegate that forwards both
// arguments unchanged is the only allowed wrapper.
const manifestable = requireManifestableScenarioResults(
  scenarios,
  globalScreenshots
);

return Object.freeze({
  pass: true,
  serverUp: true,
  scenarios: manifestable,
  screenshots: globalScreenshots,
  consoleErrors: Object.freeze([]),
  cleanup: Object.freeze({ productStateRestored: true }),
});
```

`requireManifestableScenarioResults(scenarios, globalScreenshots)` strictly
normalizes every scenario (exact keys, caps, unique variant ids, all
assertions passing, zero console errors, at least one screenshot per scenario)
and proves `globalScreenshots` is byte-equivalent to the unique ordered union
of scenario-owned screenshots. A screenshot belongs to exactly one scenario;
duplicate ownership, extra, missing, reordered, or unknown-typed entries fail
closed before manifest creation. The report's `screenshots` array must be that
exact union.

The recipe composes the shared platform, never a task-local loop: TASK-552
lifecycle and polling, process supervision, one lazy persistent profile worker,
set-based DB helpers and reverse cleanup, `BrowserTransport`,
checkpoints, redaction, timing, and reporting (sections 5-14). The adapter owns
only selectors, fixtures, scenario order, registered operations, reset logic,
and the strict evidence proof above. It creates no server, browser, worker, or
report loop of its own.

Pinned validation lives in
[`tests/unit/runtime-smoke/visible-evidence.test.ts`](../../tests/unit/runtime-smoke/visible-evidence.test.ts)
and [`tests/unit/workflows/smokeEvidence.test.ts`](../../tests/unit/workflows/smokeEvidence.test.ts):
missing title/variant/assertion/scenario screenshot, a false assertion,
non-empty console errors, duplicate screenshot ownership, and global-union
drift all fail before any manifest is created. The TASK-548 pilot is the first
real adapter consumer of this recipe; do not add a second enumerator or
validator in a suite.

## 16. Test the touched contracts

Every new adapter needs focused tests for:

- exact suite/profile rejection and the happy path;
- exact scenario IDs and visible-effect proof;
- readiness failure and product assertion failure;
- cleanup and absence proof after success and failure;
- least-privilege child environments and redacted reporting;
- exact screenshot/proof schemas;
- CLI and static registry wiring.

Add these lanes when the suite uses the corresponding shared capability:

| Capability | Reference tests |
|---|---|
| Lifecycle/timing | [`lifecycle-timing.test.ts`](../../tests/unit/runtime-smoke/lifecycle-timing.test.ts) |
| Worker reuse/retry | [`worker-lifecycle.test.ts`](../../tests/unit/runtime-smoke/worker-lifecycle.test.ts) |
| Profile isolation | [`worker-profile-isolation.test.ts`](../../tests/unit/runtime-smoke/worker-profile-isolation.test.ts) |
| DB batching/ownership | [`database-batches.test.ts`](../../tests/unit/runtime-smoke/database-batches.test.ts) |
| Browser boundaries/E2BIG | [`browser-segments.test.ts`](../../tests/unit/runtime-smoke/browser-segments.test.ts) |
| Browser frames/first failure | [`browser-transport.test.ts`](../../tests/unit/runtime-smoke/browser-transport.test.ts) |
| Checkpoint tamper/store | [`checkpoints.test.ts`](../../tests/unit/runtime-smoke/checkpoints.test.ts) |
| Repository/report/redaction | [`repository-report.test.ts`](../../tests/unit/runtime-smoke/repository-report.test.ts) |

Typical targeted validation:

```bash
bun test \
  tests/unit/runtime-smoke/cli-registry.test.ts \
  tests/unit/runtime-smoke/example-suite-adapter.test.ts

# Add only the shared capability tests affected by the implementation.
bun test \
  tests/unit/runtime-smoke/worker-lifecycle.test.ts \
  tests/unit/runtime-smoke/database-batches.test.ts \
  tests/unit/runtime-smoke/browser-segments.test.ts \
  tests/unit/runtime-smoke/browser-transport.test.ts

bunx tsc -p tsconfig.json --noEmit --pretty false
git diff --check
```

Finally restart the real developer host and run the registered suite with a
task-scoped session. Every runtime claim requires the report and complete
cleanup proof—not just green unit tests. A UI/browser suite additionally
requires its screenshots and zero browser/page errors; a process/network-only
suite such as `production-boundary` may validly have no screenshots.

## 17. Review checklist

- [ ] The suite is registered in contracts, CLI profiles, registry paths,
      descriptors, and tests.
- [ ] The adapter rejects unexpected suite/profile combinations.
- [ ] Every owned resource is registered immediately and proves absence.
- [ ] Child processes use absolute executables, repo-local `cwd`, minimal env,
      bounded time/output, and no shell.
- [ ] Repeated Bun/DB work uses one lazy profile-scoped worker.
- [ ] Worker operations have strict validators and a stable versioned digest.
- [ ] DB writes use the transaction handle, exact ownership, set-based SQL,
      stable receipts, and post-commit proof.
- [ ] Mutations are not replayed after an uncertain response.
- [ ] Browser segments respect scenario/runtime/capture/standalone barriers and
      are split after source materialization.
- [ ] Browser assertions prove visible effects and listeners start before
      navigation.
- [ ] Screenshots are bounded PNGs with relative paths and SHA-256.
- [ ] Checkpoint/resume is claimed only when the adapter consumes it end to
      end and re-proves application state.
- [ ] Fast and certification retain the same product-visible proof.
- [ ] Reports contain no secrets, PII, raw DOM, SQL, headers, or raw logs.
- [ ] Targeted unit/type/link/format checks and the affected live smoke pass.

## 18. TASK-554 Post metadata recipe

`task-554` is a reference for a narrow Admin-editor suite that must prove a
conditional server authorization boundary rather than a similarly named legacy
route. Register its literal id in `contracts.ts`, both profiles in `cli.ts`,
the fixed adapter path in `registry.ts`, and the exact registry test. Its
canonical human entry point is the narrow, agent-free evidence mode:

```bash
node _docs/_workflows/task-554-implement.mjs --task-554-smoke
```

That mode calls the existing `runTask554SmokeProfile` capture for `fast`,
removes and proves its evidence absent, then calls the same capture for
`certification`. It accepts no profile, session, or output-path override and
does not dispatch workflow agents. The capture owns nofollow directory
validation, private `report.json` creation, stdout capture, and strict evidence
validation; do not pre-create a session directory or redirect the shared wrapper
from a shell.

The thin adapter composes the shared supervised host, lifecycle, `WorkerPool`,
`RunFixtureLedger`, browser segment compiler, `BrowserTransport`,
`PlaywrightCliDispatcher`, repository guard, timing, redaction, and report. Its
task-owned files define only strict Post fixture operations, the seven immutable
Classic-editor descriptors, selectors, receipts, and the ordered PNG manifest.
Do not substitute a direct `playwright-cli` command or a second server/worker,
cleanup, polling, or report loop.

Each browser action opens Classic editor metadata via **Save metadata** and
listens before navigation. It accepts exactly one
`PATCH /admin/api/posts/:id/metadata` with the descriptor's present-only keys
and values, rejects any other Post mutation (including `/publish` and
`/unpublish`), checks panel visibility/geometry, a safe 403 denial or bounded
persisted projection, and zero console/page errors. `fast` distributes the
seven scenarios across light/dark desktop/mobile variants. `certification`
runs each scenario against four equivalent fixtures and captures only the
canonical light desktop PNG for each scenario.

Evidence is exactly seven regular decoded PNGs plus the wrapper's `report.json`
under `_docs/_workflows/_smoke/task-554/<session>/`. The task validator binds
profile, session, ordered scenario IDs, file names, hashes, and repository
snapshots; it permits equal hashes only at distinct valid paths. Credentials,
cookies, password pepper, and raw request payloads stay in private workspace or
worker boundaries and never enter frames or reports. Cleanup derives its exact
FK-safe scope from the shared ledger, removes owned observability rows before
identities, and proves absence before completion.

## Common mistakes

| Mistake | Correct pattern |
|---|---|
| New task-local shell wrapper | Add one static suite and a thin adapter |
| Adapter path supplied by CLI | Fixed `ADAPTER_PATHS` + descriptor |
| Profile listed only in the adapter | Synchronize CLI, adapter field, and run guard |
| `pass: true` after a caught failure | Throw `SmokeError`; let the entry point report failure |
| Resource registered after work starts | Register immediately after allocation |
| `{ ...process.env }` | Exact per-profile environment projection |
| One Bun/DB process per operation | Lazy persistent worker per exact profile |
| `Function#toString()` digest | Stable versioned handler/query artifact digest |
| Mutation replay after lost response | Reconcile exact pre-state or post-state |
| Parallel child/parent deletes | FK-safe ledger waves + set-based transaction |
| Fixed sleeps | Bounded `pollUntil` condition polling |
| Segment crosses a runtime dependency | Explicit `runtime` barrier |
| Size checked before action materialization | `splitMaterializedSegment()` after materialization |
| Giant Playwright code argument | Private source file + `--filename` |
| Empty `consoleErrors` without listeners | Install listeners before navigation and validate lifetime |
| Screenshot path without content validation | Bound file, verify PNG signature, hash bytes |
| Checkpoint file treated as automatic resume | Consume seal and re-prove cleanup/reset/preconditions |
| Full product certification replay after a docs/harness-only fix | Run focused affected gates and runtime boundary |

For existing examples, start with the small
[`production-boundary.ts`](../../scripts/runtime-smoke/adapters/production-boundary.ts)
adapter, then inspect
[`widget-contract.ts`](../../scripts/runtime-smoke/adapters/widget-contract.ts)
for a named Playwright dispatcher and
[`task-540.ts`](../../scripts/runtime-smoke/adapters/task-540.ts) for the largest
composed workflow.
