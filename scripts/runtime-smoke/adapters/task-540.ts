import { randomBytes } from "node:crypto";
import { SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import type { RepositorySnapshot } from "../repository-guard";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import { task540EvidenceDirectory } from "./task-540/output-manifest";
import type { Task540NativeEvidence } from "./task-540/suite/composition/contracts";
import { runTask540NativeSuite } from "./task-540/suite/composition/suite";
import { isTask540CleanupLogicalReceiptCount } from "./task-540/cleanup-cardinality";

function sensitiveEnvironmentValues(environment: NodeJS.ProcessEnv): readonly string[] {
  const values = new Set<string>();
  for (const [key, raw] of Object.entries(environment)) {
    if (typeof raw !== "string" || raw.length === 0) continue;
    const keySensitive =
      !/public[_-]?key/iu.test(key) &&
      /(?:password|passwd|secret|token|cookie|authorization|api[_-]?key|encryption|database[_-]?url|redis[_-]?url|dsn|(?:^|_)(?:pii[_-]?)?hash[_-]?key|private[_-]?key|signing[_-]?key|master[_-]?key)/iu.test(
        key
      );
    let credentials: readonly string[] = [];
    try {
      const url = new URL(raw);
      credentials = [url.username, url.password].filter(Boolean);
    } catch {
      // Non-URL values are classified by their environment key.
    }
    if (keySensitive || credentials.length > 0) values.add(raw);
    for (const credential of credentials) values.add(credential);
  }
  return Object.freeze([...values].filter((value) => value.length > 0));
}

export function createTask540SafeEvidenceAssertion(environment: NodeJS.ProcessEnv) {
  const secrets = sensitiveEnvironmentValues(environment);
  return (value: unknown, label: string): unknown => {
    const pending: unknown[] = [value];
    const seen = new Set<object>();
    let nodes = 0;
    while (pending.length > 0) {
      const current = pending.pop();
      nodes += 1;
      if (nodes > 100_000) {
        throw new SmokeError("smoke_output_invalid", `${label} exceeds evidence bounds`);
      }
      if (typeof current === "string") {
        if (secrets.some((secret) => current.includes(secret))) {
          throw new SmokeError("smoke_output_invalid", `${label} contains a configured secret`);
        }
        continue;
      }
      if (current === null || typeof current !== "object" || seen.has(current)) continue;
      seen.add(current);
      pending.push(...Object.values(current));
    }
    return value;
  };
}

export function projectTask540RepositorySnapshot(snapshot: RepositorySnapshot) {
  return Object.freeze({
    paths: Object.freeze(snapshot.files.map(({ path }) => path)),
    hashes: Object.freeze(
      Object.fromEntries(
        snapshot.files.map(({ path, kind, sha256 }) => [path, `${kind}:${sha256}`])
      )
    ),
  });
}

export function validateTask540Evidence(value: unknown): Task540NativeEvidence {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native evidence is invalid");
  }
  const candidate = value as Partial<Task540NativeEvidence>;
  if (
    candidate.pass !== true ||
    candidate.serverUp !== true ||
    !Array.isArray(candidate.browserReceipts) ||
    candidate.browserReceipts.length !== 420 ||
    !Array.isArray(candidate.runtimeReceipts) ||
    candidate.runtimeReceipts.length !== 76 ||
    !Array.isArray(candidate.cleanupReceipts) ||
    !isTask540CleanupLogicalReceiptCount(candidate.cleanupReceipts.length) ||
    !Array.isArray(candidate.scenarios) ||
    candidate.scenarios.length !== 7 ||
    !Array.isArray(candidate.screenshots) ||
    candidate.screenshots.length !== 13 ||
    !Array.isArray(candidate.consoleErrors) ||
    candidate.consoleErrors.length !== 0 ||
    !Array.isArray(candidate.pageErrors) ||
    candidate.pageErrors.length !== 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 native evidence projection drifted");
  }
  return candidate as Task540NativeEvidence;
}

export async function runTask540Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  const result = await runTask540NativeSuite(context, randomBytes(6).toString("hex"));
  const evidence = validateTask540Evidence(
    createTask540SafeEvidenceAssertion(process.env)(result.evidence, "TASK-540 native evidence")
  );
  return Object.freeze({
    pass: true,
    serverUp: evidence.serverUp,
    scenarios: evidence.scenarios,
    screenshots: evidence.screenshots,
    consoleErrors: evidence.consoleErrors,
    cleanup: Object.freeze({
      canonicalCleanupReceipts: evidence.cleanupReceipts.length,
      authWindowState: result.authWindowState,
      workerStarts: result.workerCounters.starts,
      workerRequests: result.workerCounters.requests,
      workerReconnects: result.workerCounters.reconnects,
      databaseBatches: result.workerCounters.databaseBatches,
      statements: result.workerCounters.statements,
      rows: result.workerCounters.rows,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-540",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask540Adapter,
  evidenceDirectory: task540EvidenceDirectory,
});

export default adapter;
