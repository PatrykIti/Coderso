import { relative } from "node:path";

import { SmokeError, resolveInsideRoot, type SmokeInput } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import {
  createTask105L05LifecycleAttestation,
  type SmokeAdapter,
  type SmokeAdapterResult,
  type SmokeScenarioResult,
  type SmokeScreenshotResult,
} from "./types";
import {
  TASK_105_L05_SCENARIO_DESCRIPTORS,
  projectTask105L05Receipts,
} from "./task-105-l05/descriptors";
import {
  archiveTask105L05Screenshots,
  buildExactTask105L05ScreenshotManifest,
  assertExactTask105L05ScreenshotManifest,
} from "./task-105-l05/output-manifest";
import { preflightTask105L05EnvFile } from "./task-105-l05/host";
import {
  wireTask105L05PageDrivers,
  type Task105L05DriverRuntime,
  type Task105L05VisibleEvidence,
} from "./task-105-l05/browser-drivers";

export { TASK105_L05_SCENARIOS } from "./task-105-l05/descriptors";

export function assertExactTask105L05Invocation(input: SmokeInput): void {
  if (
    input.command !== "run" ||
    input.suite !== "task-105-l05" ||
    !["fast", "certification"].includes(input.profile)
  ) {
    throw new SmokeError("smoke_argument_invalid", "TASK-105 L05 invocation is invalid");
  }
}

export function task105L05EvidenceDirectory(input: SmokeInput, root: string): string {
  assertExactTask105L05Invocation(input);
  return resolveInsideRoot(
    root,
    `_docs/_workflows/_smoke/evidence/task-105/${input.session}`,
    "task105_l05_evidence"
  );
}

export interface Task105L05RunSeams {
  readonly preflightEnvFile: typeof preflightTask105L05EnvFile;
  readonly openPageDrivers: (
    context: RuntimeSmokeContext,
    adminBase: string
  ) => Promise<{
    readonly pageA: import("./task-105-l05/browser-segments").Task105L05SegmentContext;
    readonly openPageB: () => Promise<
      import("./task-105-l05/browser-segments").Task105L05SegmentContext
    >;
    readonly runtime?: Task105L05DriverRuntime;
  }>;
}

export const defaultTask105L05RunSeams: Task105L05RunSeams = Object.freeze({
  preflightEnvFile: preflightTask105L05EnvFile,
  openPageDrivers: (context: RuntimeSmokeContext, adminBase: string) =>
    wireTask105L05PageDrivers(context, adminBase),
});

function failVisibleEvidence(): never {
  throw new SmokeError("smoke_output_invalid", "TASK-105 L05 visible evidence is invalid");
}

/** Projects only actual driver-visible facts and the exact archival result. */
export function buildTask105L05ManifestableScenarios(
  visibleEvidence: readonly Task105L05VisibleEvidence[],
  archived: readonly SmokeScreenshotResult[]
): readonly SmokeScenarioResult[] {
  if (
    visibleEvidence.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length ||
    archived.length !== TASK_105_L05_SCENARIO_DESCRIPTORS.length
  ) {
    return failVisibleEvidence();
  }
  const ids = new Set(visibleEvidence.map(({ scenarioId }) => scenarioId));
  if (ids.size !== TASK_105_L05_SCENARIO_DESCRIPTORS.length) return failVisibleEvidence();
  return Object.freeze(
    TASK_105_L05_SCENARIO_DESCRIPTORS.map((descriptor, index) => {
      const evidence = visibleEvidence.find(({ scenarioId }) => scenarioId === descriptor.id);
      const screenshot = archived[index];
      if (
        evidence === undefined ||
        screenshot === undefined ||
        (evidence.theme !== "light" && evidence.theme !== "dark") ||
        (evidence.surface !== "admin" && evidence.surface !== "public") ||
        evidence.viewport.width !== descriptor.viewport.width ||
        evidence.viewport.height !== descriptor.viewport.height ||
        evidence.facts.length !== 1 ||
        evidence.facts.some(
          (fact) =>
            fact.pass !== true ||
            typeof fact.target !== "string" ||
            typeof fact.property !== "string" ||
            typeof fact.expected !== "string" ||
            fact.actual !== fact.expected
        ) ||
        !/^screenshots\/[a-z0-9-]+\.png$/u.test(screenshot.path) ||
        !/^[a-f0-9]{64}$/u.test(screenshot.sha256)
      ) {
        return failVisibleEvidence();
      }
      return Object.freeze({
        id: descriptor.id,
        pass: true as const,
        // The driver has no per-scenario clock; zero states that no latency is claimed.
        elapsedMs: 0,
        title: descriptor.title,
        variants: Object.freeze([
          Object.freeze({
            id: `${evidence.surface}-${evidence.theme}`,
            surface: evidence.surface,
            theme: evidence.theme,
            viewport: Object.freeze({ ...evidence.viewport }),
            assertions: Object.freeze(evidence.facts.map((fact) => Object.freeze({ ...fact }))),
            consoleErrors: Object.freeze([]),
          }),
        ]),
        screenshots: Object.freeze([Object.freeze({ ...screenshot })]),
      });
    })
  );
}

export async function runTask105L05Adapter(
  context: RuntimeSmokeContext,
  seams: Task105L05RunSeams = defaultTask105L05RunSeams
): Promise<SmokeAdapterResult> {
  assertExactTask105L05Invocation(context.input);
  context.lifecycle.assertAccepting();
  const manifest = buildExactTask105L05ScreenshotManifest(context.input);
  assertExactTask105L05ScreenshotManifest(manifest);
  await seams.preflightEnvFile(context.root);
  const before = await context.repository.snapshot(manifest.paths);

  const adminBase = `/${context.input.session}-admin`;
  const pages = await seams.openPageDrivers(context, adminBase);
  const { executeTask105L05Segments } = await import("./task-105-l05/browser-segments");
  const execution = await executeTask105L05Segments({
    pageA: pages.pageA,
    openPageB: pages.openPageB,
    bindUiMenuId: (menuId) => {
      const runtime = pages.runtime;
      if (runtime === undefined)
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 runtime is absent for menu binding"
        );
      if (runtime.cell.uiMenuId !== null && runtime.cell.uiMenuId !== menuId) {
        throw new SmokeError("smoke_cleanup_failed", "TASK-105 L05 UI menu identity was rebound");
      }
      runtime.cell.uiMenuId = menuId;
    },
    claimSiteShellRows: async (menuId) => {
      const runtime = pages.runtime;
      if (runtime === undefined) {
        throw new SmokeError(
          "smoke_cleanup_failed",
          "TASK-105 L05 runtime is absent for Site Shell claim"
        );
      }
      await runtime.lease.claimSiteShellRows({ navigationMenuId: menuId });
    },
  });
  const receiptSummary = projectTask105L05Receipts({
    receiptA: execution.receiptA,
    receiptB: execution.receiptB,
  });

  if (pages.runtime === undefined) {
    throw new SmokeError("smoke_output_invalid", "TASK-105 L05 runtime evidence is required");
  }

  const runtime = pages.runtime;
  // `claimSiteShellRows` is the worker-owned, receipt-backed verification of
  // the browser UI write. Raw setting JSON and row identities never cross the
  // worker boundary into this adapter process.

  const after = await context.repository.snapshot(manifest.paths);
  context.repository.assertUnchanged(before, after, [
    ...manifest.paths,
    relative(context.root, runtime.workspacePath),
    relative(context.root, runtime.storageStatePath),
    relative(context.root, runtime.screenshotCandidateRoot),
    "_docs/_workflows/_smoke/task-105-l05/workspaces",
  ]);

  const archived = await archiveTask105L05Screenshots({
    root: context.root,
    manifest,
    evidenceSessionDirectory: task105L05EvidenceDirectory(context.input, context.root),
    stagingRoot: runtime.screenshotCandidateRoot,
  });
  const scenarios = buildTask105L05ManifestableScenarios(runtime.getVisibleEvidence(), archived);
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios,
    screenshots: Object.freeze([...archived]),
    consoleErrors: receiptSummary.consoleErrors,
    cleanup: createTask105L05LifecycleAttestation(receiptSummary.requestDigest),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-105-l05",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  evidenceSessionPolicy: "exclusive",
  evidenceDirectory: task105L05EvidenceDirectory,
  run: (context: RuntimeSmokeContext) => runTask105L05Adapter(context),
});

export default adapter;
