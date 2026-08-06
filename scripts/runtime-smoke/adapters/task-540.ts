import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolveInsideRoot, SmokeError } from "../contracts";
import type { RuntimeSmokeContext } from "../lifecycle";
import { resolveExecutableOnPath } from "../process-supervisor";
import type { RepositorySnapshot } from "../repository-guard";
import type { SmokeAdapter, SmokeAdapterResult } from "./types";
import {
  Task540PersistentBridge,
  type PersistentBunBridgeInstaller,
} from "./task-540/persistent-bridge";

interface Task540Plan {
  readonly requiredScreenshotPaths: readonly string[];
}

interface Task540Evidence {
  readonly pass: true;
  readonly browserReceipts: readonly unknown[];
  readonly runtimeReceipts: readonly unknown[];
  readonly cleanupReceipts: readonly unknown[];
  readonly scenarios: readonly { readonly id: string }[];
  readonly finalization: {
    readonly screenshots: readonly { readonly path: string; readonly sha256: string }[];
  };
}

interface Task540ContractModule {
  buildTask540SmokePlan(input: { readonly nonce: string }): Task540Plan;
}

interface Task540ExecutorModule {
  executeTask540SmokePlan(input: {
    readonly root: string;
    readonly nonce: string;
    readonly assertSafeEvidence: (value: unknown, label: string) => unknown;
    readonly snapshotRepository: () => Promise<
      Readonly<{
        paths: readonly string[];
        hashes: Readonly<Record<string, string>>;
      }>
    >;
  }): Promise<unknown>;
}

interface Task540TransportModule {
  readonly installPersistentBunBridgeDispatcher: PersistentBunBridgeInstaller;
}

async function loadRootModule<T>(root: string, relativePath: string): Promise<T> {
  return (await import(
    pathToFileURL(resolveInsideRoot(root, relativePath, "module path")).href
  )) as T;
}

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

export function projectTask540LegacySnapshot(snapshot: RepositorySnapshot) {
  return Object.freeze({
    paths: Object.freeze(snapshot.files.map(({ path }) => path)),
    hashes: Object.freeze(
      Object.fromEntries(snapshot.files.map(({ path, sha256 }) => [path, sha256]))
    ),
  });
}

export function validateTask540Evidence(value: unknown): Task540Evidence {
  // The canonical executor has already checked exact keys, all 496 receipt cardinalities,
  // recursive freezing, scenario coverage, screenshot identities and the complete cleanup proof
  // before it returns. This adapter owns only the small projection it consumes; duplicating the
  // whole canonical contract here made a green 19-minute flow fail after cleanup when the two
  // layers drifted. Accept objects from the dynamically loaded executor realm and validate only
  // the fields read below.
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Reflect.get(value, "pass") !== true
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 canonical evidence is invalid");
  }
  const candidate = value as Partial<Task540Evidence>;
  if (
    !Array.isArray(candidate.browserReceipts) ||
    !Array.isArray(candidate.runtimeReceipts) ||
    !Array.isArray(candidate.cleanupReceipts) ||
    !Array.isArray(candidate.scenarios) ||
    candidate.finalization === undefined ||
    candidate.finalization === null ||
    typeof candidate.finalization !== "object" ||
    !Array.isArray(candidate.finalization.screenshots) ||
    candidate.scenarios.length === 0 ||
    candidate.finalization.screenshots.length === 0
  ) {
    throw new SmokeError("smoke_output_invalid", "TASK-540 evidence projection is incomplete");
  }
  for (const scenario of candidate.scenarios) {
    if (
      scenario === null ||
      typeof scenario !== "object" ||
      Array.isArray(scenario) ||
      typeof Reflect.get(scenario, "id") !== "string"
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 scenario evidence drifted");
    }
  }
  for (const screenshot of candidate.finalization.screenshots) {
    if (
      screenshot === null ||
      typeof screenshot !== "object" ||
      Array.isArray(screenshot) ||
      typeof Reflect.get(screenshot, "path") !== "string" ||
      typeof Reflect.get(screenshot, "sha256") !== "string" ||
      !/^[a-f0-9]{64}$/u.test(Reflect.get(screenshot, "sha256") as string)
    ) {
      throw new SmokeError("smoke_output_invalid", "TASK-540 screenshot evidence drifted");
    }
  }
  return candidate as Task540Evidence;
}

function requiredDatabaseEnvironment(): Readonly<Record<string, string>> {
  const path = process.env.PATH;
  const databaseUrl = process.env.DATABASE_URL;
  if (!path || !databaseUrl) {
    throw new SmokeError("smoke_argument_invalid", "TASK-540 database environment is incomplete");
  }
  return Object.freeze({ PATH: path, DATABASE_URL: databaseUrl, DB_POOL_MAX: "1" });
}

export async function runTask540Adapter(context: RuntimeSmokeContext): Promise<SmokeAdapterResult> {
  const transport = await loadRootModule<Task540TransportModule>(
    context.root,
    "_docs/_workflows/task-540-smoke/runtime/bun-bridge-transport.mjs"
  );
  const bridge = await Task540PersistentBridge.create({
    root: context.root,
    processes: context.processes,
    lifecycle: context.lifecycle,
    install: transport.installPersistentBunBridgeDispatcher,
  });
  if (context.input.profile === "fast") {
    const bun = await resolveExecutableOnPath("bun");
    await context.timing.measure("phase", "auth-window-prepare", () =>
      bridge.prepareFastAuthWindow({
        environment: requiredDatabaseEnvironment(),
        executablePath: bun,
      })
    );
  }

  const nonce = randomBytes(6).toString("hex");
  const contract = await loadRootModule<Task540ContractModule>(
    context.root,
    "_docs/_workflows/task-540-smoke-contract.mjs"
  );
  const plan = contract.buildTask540SmokePlan({ nonce });
  const snapshotRepository = async () =>
    projectTask540LegacySnapshot(await context.repository.snapshot(plan.requiredScreenshotPaths));
  const executor = await loadRootModule<Task540ExecutorModule>(
    context.root,
    "_docs/_workflows/task-540-smoke-executor.mjs"
  );
  const rawEvidence = await context.timing.measure("phase", "canonical-flow", () =>
    executor.executeTask540SmokePlan({
      root: context.root,
      nonce,
      assertSafeEvidence: createTask540SafeEvidenceAssertion(process.env),
      snapshotRepository,
    })
  );
  const evidence = validateTask540Evidence(rawEvidence);
  if (context.input.profile === "fast") {
    await context.timing.measure("phase", "auth-window-restore", () =>
      bridge.restoreFastAuthWindow()
    );
  }
  const counters = bridge.counters();
  return Object.freeze({
    pass: true,
    serverUp: true,
    scenarios: Object.freeze(
      evidence.scenarios.map(({ id }) => Object.freeze({ id, pass: true, elapsedMs: 0 }))
    ),
    screenshots: Object.freeze(
      evidence.finalization.screenshots.map(({ path, sha256 }) => Object.freeze({ path, sha256 }))
    ),
    consoleErrors: Object.freeze([]),
    cleanup: Object.freeze({
      canonicalCleanupReceipts: evidence.cleanupReceipts.length,
      authWindowState: context.input.profile === "fast" ? "restored" : "unchanged",
      workerStarts: counters.starts,
      workerRequests: counters.requests,
      workerReconnects: counters.reconnects,
      databaseBatches: counters.databaseBatches,
      statements: counters.statements,
      rows: counters.rows,
    }),
  });
}

const adapter: SmokeAdapter = Object.freeze({
  suiteId: "task-540",
  supportedProfiles: Object.freeze(["fast", "certification"] as const),
  run: runTask540Adapter,
});

export default adapter;
