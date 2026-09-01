import { relative } from "node:path";

import { SmokeError, resolveInsideRoot, type SmokeInput } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import { requireManifestableScenarioResults } from "../visible-evidence";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScreenshotResult } from "./types";
import {
  TASK_105_L08_SCENARIO_DESCRIPTORS,
  TASK_105_L08_SCENARIO_SURFACES,
  createTask105L08CleanupAttestation,
  projectTask105L08Receipt,
  validateTask105L08BrowserReceipt,
} from "./task-105-l08/descriptors";
import {
  archiveTask105L08Screenshots,
  assertExactTask105L08ScreenshotManifest,
  buildExactTask105L08ScreenshotManifest,
} from "./task-105-l08/output-manifest";
import {
  createTask105L08DatabaseReleaseResource,
  createTask105L08Fixture,
  requireTask105L08Session,
} from "./task-105-l08/fixture";
import { startTask105L08DevHost, validateTask105L08AdminBase } from "./task-105-l08/host";
import {
  Task105L08Workspace,
  proveTask105L08Routes,
  wireTask105L08Driver,
} from "./task-105-l08/browser-drivers";

export { TASK105_L08_SCENARIOS } from "./task-105-l08/descriptors";
export { defaultTask105L08AdapterFixtureDeps } from "./task-105-l08/fixture";

/**
 * TASK-105 L08 thin adapter (contract: TASK-105-08-08-L07).
 *
 * Provisioning, supervision, transport, evidence, cleanup, and reporting all
 * come from the shared runtime-smoke platform. No task-local server, Playwright
 * loop, worker, cleanup loop, or report format exists here. The adapter
 * intentionally sets no `evidenceSessionPolicy`: the exclusive evidence claim
 * is hard-wired to task-105-l05 (Contract Amendment, 2026-08-31).
 */

export function assertExactTask105L08Invocation(input: SmokeInput): void {
  if (
    input.command !== "run" ||
    input.suite !== "task-105-l08" ||
    !["fast", "certification"].includes(input.profile)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L08 invocation is invalid");
  }
}

export function task105L08EvidenceDirectory(input: SmokeInput, root: string): string {
  assertExactTask105L08Invocation(input);
  // The session segment is validated before it becomes a path fragment, so a
  // traversal-shaped session can never reach resolveInsideRoot.
  const session = requireTask105L08Session(input.session);
  return resolveInsideRoot(
    root,
    `_docs/_workflows/_smoke/evidence/task-105/${session}`,
    "task_105_l08_evidence"
  );
}

export async function runTask105L08Adapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  assertExactTask105L08Invocation(context.input);
  context.lifecycle.assertAccepting();
  const session = context.input.session;
  const adminBase = validateTask105L08AdminBase(session, `/${session}-admin`);
  const manifest = buildExactTask105L08ScreenshotManifest(context.input);
  assertExactTask105L08ScreenshotManifest(manifest);

  // Order matters: the database release is registered first so reverse-order
  // teardown closes the shared lazy client after every other resource; the
  // workspace exists before the fixture writes the private storage state into
  // it; and every handle registers immediately so the shared lifecycle unwinds
  // them in reverse order on any failure.
  context.lifecycle.register(createTask105L08DatabaseReleaseResource());
  const workspace = await Task105L08Workspace.create(context.root, session);
  context.lifecycle.register(workspace);

  const fixture = await createTask105L08Fixture({
    session,
    workspace: workspace.path,
    storageStatePath: workspace.storageStatePath,
    adminOrigin: "http://127.0.0.1:5173",
  });
  context.lifecycle.register(fixture.cleanup);

  // startSupervisedServer registers the host resource itself (named after the
  // spec family) before spawning and closes the child on teardown, so the
  // adapter must not register a second resource for the same dev host.
  await startTask105L08DevHost(context, { adminBase });

  // Route proof runs concurrently with driver wiring; its rejection is carried
  // as a value so the fire-and-forget promise can never orphan a rejection.
  // Scenarios stay gated on the proof at the start of runScenarios.
  const routesProven: Promise<SmokeError | undefined> = proveTask105L08Routes({
    adminBase,
    listPath: fixture.facts.contentListPath,
  }).then(
    () => undefined,
    (error: unknown) =>
      error instanceof SmokeError
        ? error
        : new SmokeError("smoke_process_failed", "TASK-105 L08 route proof failed")
  );
  const driver = await wireTask105L08Driver(context, {
    facts: fixture.facts,
    workspace,
    routesProven,
  });

  const before = await context.repository.snapshot(manifest.paths);
  await driver.runScenarios();
  const receipt = driver.receipt();
  const after = await context.repository.snapshot(manifest.paths);

  // The workspace, storage state, and staging screenshots are suite-owned
  // runtime artifacts; the repository guard must ignore exactly those paths.
  context.repository.assertUnchanged(before, after, [
    ...manifest.paths,
    relative(context.root, workspace.path),
    "_docs/_workflows/_smoke/task-105-l08/workspaces",
    TASK_105_L08_STAGING_ROOT,
  ]);

  const archived = await archiveTask105L08Screenshots({
    root: context.root,
    manifest,
    evidenceSessionDirectory: task105L08EvidenceDirectory(context.input, context.root),
    stagingRoot: workspace.screenshotCandidateRoot,
  });
  const summary = projectTask105L08Receipt({ receipt });
  const scenarios = requireManifestableScenarioResults(
    buildTask105L08ManifestableScenarios(receipt, archived),
    archived
  );
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: Object.freeze([...archived]),
    consoleErrors: summary.consoleErrors,
    cleanup: createTask105L08CleanupAttestation(summary.receiptDigest),
  });
}

const TASK_105_L08_STAGING_ROOT = "_docs/_workflows/_smoke/task-105-l08/screenshots";

/** Projects only the validated receipt facts plus the exact archival result. */
export function buildTask105L08ManifestableScenarios(
  rawReceipt: unknown,
  archived: readonly SmokeScreenshotResult[]
): readonly unknown[] {
  const receipt = validateTask105L08BrowserReceipt(rawReceipt);
  if (receipt.scenarios.length !== TASK_105_L08_SCENARIO_DESCRIPTORS.length) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L08 receipt scenarios are incomplete");
  }
  return TASK_105_L08_SCENARIO_DESCRIPTORS.map((descriptor, index) => {
    const evidence = receipt.scenarios[index];
    const screenshot = archived[index];
    if (evidence === undefined || screenshot === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 scenario projection is invalid");
    }
    const theme = descriptor.themes[0];
    if (theme === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-105 L08 descriptor theme is absent");
    }
    return Object.freeze({
      id: descriptor.id,
      pass: true as const,
      // The driver has no per-scenario clock; zero states that no latency is claimed.
      elapsedMs: 0,
      title: descriptor.title,
      variants: Object.freeze([
        Object.freeze({
          id: `${TASK_105_L08_SCENARIO_SURFACES[descriptor.id]}-${theme}`,
          surface: TASK_105_L08_SCENARIO_SURFACES[descriptor.id],
          theme,
          viewport: Object.freeze({ ...evidence.viewport }),
          assertions: Object.freeze(evidence.facts.map((fact) => Object.freeze({ ...fact }))),
          consoleErrors: Object.freeze([]),
        }),
      ]),
      screenshots: Object.freeze([Object.freeze({ ...screenshot })]),
    });
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-105-l08",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  evidenceDirectory: task105L08EvidenceDirectory,
  run: (context: RuntimeSmokeContext) => runTask105L08Adapter(context),
});

export default adapter;
