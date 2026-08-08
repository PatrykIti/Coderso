import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { resolveInsideRoot, SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import type { SmokeAdapter, SmokeAdapterResult, SmokeScreenshotResult } from "./types";
import type { SmokeInventory } from "./widget-contract/contracts";
import { parseArgs } from "./widget-contract/inventory";
import { buildWidgetContractInventoryOverlay } from "./widget-contract/inventory";
import { validateWidgetContractReport } from "./widget-contract/report";
import { runWidgetContractSuite } from "./widget-contract/suite";

const ADMIN_URL = "http://localhost:5173/admin";
const FRONT_URL = "http://localhost:3000";
const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";

async function persistGalleryScreenshot(
  context: RuntimeSmokeContext,
  sourcePath: string
): Promise<SmokeScreenshotResult> {
  const source = resolveInsideRoot(context.root, sourcePath, "widget screenshot source");
  const bytes = await readFile(source);
  if (
    bytes.byteLength <= PNG_SIGNATURE.length / 2 ||
    bytes.byteLength > MAX_SCREENSHOT_BYTES ||
    bytes.subarray(0, PNG_SIGNATURE.length / 2).toString("hex") !== PNG_SIGNATURE
  ) {
    throw new SmokeError("smoke_output_invalid", "widget screenshot is not a bounded PNG");
  }
  const relativeEvidencePath = `_docs/_workflows/_smoke/task-552-${context.input.session}-gallery-mosaic.png`;
  const evidencePath = resolveInsideRoot(
    context.root,
    relativeEvidencePath,
    "widget evidence path"
  );
  await mkdir(dirname(evidencePath), { recursive: true });
  const staged = resolve(dirname(source), "gallery-mosaic-evidence.png");
  await writeFile(staged, bytes, { mode: 0o600 });
  await rename(staged, evidencePath);
  return Object.freeze({
    path: relativeEvidencePath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}

export async function runWidgetContractAdapter(
  context: RuntimeSmokeContext
): Promise<SmokeAdapterResult> {
  if (context.input.suite !== "widget-contract" || context.input.profile !== "fast") {
    throw new SmokeError("smoke_argument_invalid", "widget smoke supports only the fast profile");
  }
  context.lifecycle.assertAccepting();
  const canonicalInventoryPath = resolveInsideRoot(
    context.root,
    "_docs/PLAYWRIGHT/widget-contract-smoke-inventory.json",
    "widget inventory path"
  );
  const overlay = buildWidgetContractInventoryOverlay(
    JSON.parse(await readFile(canonicalInventoryPath, "utf8")) as unknown
  );
  const inventory = structuredClone(overlay) as unknown as SmokeInventory;
  const args = parseArgs([
    "--session",
    context.input.session,
    "--admin",
    ADMIN_URL,
    "--front",
    FRONT_URL,
    "--widget",
    "gallery-mosaic",
    "--strict",
  ]);
  const suite = await runWidgetContractSuite({
    context,
    args,
    inventory,
    command: "bun scripts/playwright-widget-contract-smoke.ts --widget gallery-mosaic --strict",
  });
  const proof = validateWidgetContractReport(suite.report);
  if (suite.focusedPublicProof === null) {
    throw new SmokeError("smoke_output_invalid", "widget focused public proof is missing");
  }
  const artifact = suite.screenshots.find(({ widgetType }) => widgetType === "gallery-mosaic");
  if (artifact === undefined || artifact.reportPath !== proof.screenshotPath) {
    throw new SmokeError("smoke_output_invalid", "widget screenshot artifact is missing");
  }
  const screenshot = await context.timing.measure("phase", "widget-screenshot-evidence", () =>
    persistGalleryScreenshot(context, artifact.sourcePath)
  );
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: Object.freeze([
      Object.freeze({
        id: "gallery-mosaic-contract",
        pass: true,
        elapsedMs: suite.contractElapsedMs,
      }),
      Object.freeze({
        id: "gallery-public-error-probe",
        pass: true,
        elapsedMs: suite.focusedPublicElapsedMs,
      }),
    ]),
    screenshots: Object.freeze([screenshot]),
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      taskScopedOverlay: true,
      legacyChildProcesses: 0,
      browserDispatches: suite.browserDispatches,
      consoleErrorCount: suite.focusedPublicProof.consoleErrorCount,
      pageErrorCount: suite.focusedPublicProof.pageErrorCount,
      workspaceRegistered: true,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "widget-contract",
  supportedProfiles: Object.freeze(["fast"] as const),
  run: runWidgetContractAdapter,
});

export * from "./widget-contract/environment";
export * from "./widget-contract/inventory";
export * from "./widget-contract/public-probe";
export * from "./widget-contract/report";

export default adapter;
