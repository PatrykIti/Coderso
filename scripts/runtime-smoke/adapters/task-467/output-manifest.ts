// TASK-467 output manifest: owned evidence paths and strict PNG validation
// for the per-scenario screenshots. Screenshots are decoded from the browser
// receipts, bounded, signature-checked, and written under the session
// evidence directory before the manifest report is emitted.
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { resolveInsideRoot, SmokeError } from "../../contracts";
import type { SmokeScreenshotResult } from "../types";
import {
  TASK467_EVIDENCE_ROOT,
  TASK467_SCENARIO_IDS,
  projectTask467EvidencePaths,
  task467EvidenceSession,
  type Task467BrowserReceipt,
  type Task467ScenarioId,
} from "./contracts";

const MAX_SCREENSHOT_BYTES = 16 * 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";

export interface Task467EvidenceManifest {
  readonly root: string;
  readonly reportPath: string;
  readonly screenshotPaths: readonly string[];
}

export function buildTask467EvidenceManifest(
  root: string,
  session: string
): Task467EvidenceManifest {
  const screenshotPaths = projectTask467EvidencePaths(session, TASK467_SCENARIO_IDS);
  const evidenceRoot = resolveInsideRoot(
    root,
    `${TASK467_EVIDENCE_ROOT}/${task467EvidenceSession(session)}`,
    "TASK-467 evidence root"
  );
  return Object.freeze({
    root: evidenceRoot,
    reportPath: resolve(evidenceRoot, "report.json"),
    screenshotPaths,
  });
}

function decodeScreenshotPng(base64: string): Buffer {
  let bytes: Buffer;
  try {
    bytes = Buffer.from(base64, "base64");
  } catch (error) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 screenshot base64 is invalid", {
      cause: error,
    });
  }
  if (
    bytes.byteLength <= PNG_SIGNATURE.length / 2 ||
    bytes.byteLength > MAX_SCREENSHOT_BYTES ||
    bytes.subarray(0, PNG_SIGNATURE.length / 2).toString("hex") !== PNG_SIGNATURE
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-467 screenshot is not a bounded PNG");
  }
  return bytes;
}

export async function persistTask467Screenshots(input: {
  readonly root: string;
  readonly session: string;
  readonly receipts: ReadonlyMap<Task467ScenarioId, Task467BrowserReceipt>;
}): Promise<ReadonlyMap<Task467ScenarioId, SmokeScreenshotResult>> {
  const manifest = buildTask467EvidenceManifest(input.root, input.session);
  const results = new Map<Task467ScenarioId, SmokeScreenshotResult>();
  for (const [index, scenarioId] of TASK467_SCENARIO_IDS.entries()) {
    const receipt = input.receipts.get(scenarioId);
    const relativePath = manifest.screenshotPaths[index];
    if (receipt === undefined || relativePath === undefined) {
      throw new SmokeError("smoke_output_invalid", "TASK-467 screenshot source is incomplete");
    }
    const bytes = decodeScreenshotPng(receipt.screenshotBase64);
    const absolutePath = resolveInsideRoot(input.root, relativePath, "TASK-467 screenshot path");
    await mkdir(dirname(absolutePath), { recursive: true, mode: 0o700 });
    await writeFile(absolutePath, bytes, { mode: 0o600 });
    results.set(
      scenarioId,
      Object.freeze({
        path: relativePath,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      })
    );
  }
  return results;
}
