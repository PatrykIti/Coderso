import { expect, test } from "bun:test";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { asc, eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { NATIVE_CMS_WRITER_FENCE_OPTION_KEY } from "../../../core/db/nativeCmsWriterFence";
import {
  contentRevisions,
  detailPageRevisions,
  formActions,
  formFields,
  menuItems,
  pageRevisions,
  solutionKitInstallItems,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import {
  FULL_SITE_ROLLBACK_ADAPTERS,
  type DeleteSnapshotAtomicInput,
  type FullSiteRollbackAdapters,
  type RestoreSnapshotAtomicInput,
} from "../../../core/services/kits/fullSiteInstall/adapters";
import { applyFullSitePackage } from "../../../core/services/kits/fullSiteInstall/execute";
import { rollbackFullSiteInstall } from "../../../core/services/kits/fullSiteInstall/rollback";
import {
  DURABLE_CREATE_ID_KINDS,
  readFullSiteDurableAfterSnapshotV1,
} from "../../../core/services/kits/fullSiteInstall/staging";
import type { FullSiteInstallResourceKind } from "../../../core/services/kits/fullSiteInstallTypes";
import { buildReferencePlan } from "../../../core/services/kits/fullSitePackage/referenceGraph";
import { normalizeFullSitePackageForWrite } from "../../../core/services/kits/fullSitePackage/normalize";
import type {
  FullSitePackageResources,
  FullSitePackageV1,
  JsonObject,
} from "../../../core/services/kits/fullSitePackage/types";
import { createLegacyInstallLedger } from "../../../core/services/kits/legacyInstallRunPersistence";
import { buildScopedFormaDomPackage } from "./projektyDomowInstalledTestSupport";

const WORKER_PATH = fileURLToPath(
  new URL("../../fixtures/task547/fullSiteCrashWorker.ts", import.meta.url)
);
const MARKER_DEADLINE_MS = 180_000;
const PROCESS_EXIT_DEADLINE_MS = 30_000;
const MARKER_LIMIT_BYTES = 4_096;
const UUID_KINDS = DURABLE_CREATE_ID_KINDS;
type UuidKind = (typeof UUID_KINDS)[number];
type CrashMode =
  "native_committed" | "initialization_transaction_open" | "initialization_committed";
type CrashPhase = "staged" | "complete";

const LIFECYCLE_KINDS = new Set<UuidKind>(["content_entry", "detail_page", "page", "menu"]);

const COLLECTION_KIND = {
  contentTypes: "content_type",
  forms: "form",
  pageTemplates: "page_template",
  listingTemplates: "listing_template",
  entries: "content_entry",
  listingQueries: "listing_query",
  detailPages: "detail_page",
  pages: "page",
  menus: "menu",
  settings: "setting",
} as const satisfies Record<keyof FullSitePackageResources, FullSiteInstallResourceKind>;

type NativeMarker = Readonly<{
  phase: "native_committed";
  runId: string;
  kind: UuidKind;
  key: string;
  intendedId: string;
  durablePhase: CrashPhase;
}>;

type InitializationMarker = Readonly<{
  phase: "initialization_transaction_open" | "initialization_committed";
  runId: string;
  itemCount: number;
}>;

type WorkerMarker = NativeMarker | InitializationMarker;

type NativeReversalObservation =
  | Readonly<{
      kind: UuidKind;
      operation: "delete";
      input: DeleteSnapshotAtomicInput;
    }>
  | Readonly<{
      kind: UuidKind;
      operation: "restore";
      input: RestoreSnapshotAtomicInput;
    }>;

type CrashPackage = Readonly<{
  package: FullSitePackageV1;
  kind: UuidKind;
  key: string;
  identity: string;
}>;

const withDeadline = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void
): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      onTimeout();
      reject(new Error("site_package_crash_worker_deadline"));
    }, timeoutMs);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      }
    );
  });

const readBoundedLine = (stream: Readable): Promise<string> =>
  new Promise<string>((resolve, reject) => {
    let pending = Buffer.alloc(0);
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (): void => {
      if (timeout) clearTimeout(timeout);
      stream.off("data", onData);
      stream.off("end", onEnd);
      stream.off("error", onError);
    };
    const fail = (error: Error): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const succeed = (line: Uint8Array): void => {
      if (settled) return;
      settled = true;
      cleanup();
      stream.pause();
      try {
        resolve(new TextDecoder("utf-8", { fatal: true }).decode(line));
      } catch (error) {
        reject(error);
      }
    };
    const onData = (chunk: unknown): void => {
      if (!(chunk instanceof Uint8Array)) {
        fail(new Error("site_package_crash_worker_marker_invalid"));
        return;
      }
      const newline = chunk.indexOf(10);
      const segment = newline >= 0 ? chunk.subarray(0, newline) : chunk;
      if (pending.byteLength + segment.byteLength > MARKER_LIMIT_BYTES) {
        fail(new Error("site_package_crash_worker_marker_too_large"));
        return;
      }
      pending = Buffer.concat([pending, segment]);
      if (newline >= 0) succeed(pending);
    };
    const onEnd = (): void => fail(new Error("site_package_crash_worker_marker_missing"));
    const onError = (error: Error): void => fail(error);
    timeout = setTimeout(
      () => fail(new Error("site_package_crash_worker_deadline")),
      MARKER_DEADLINE_MS
    );
    stream.on("data", onData);
    stream.once("end", onEnd);
    stream.once("error", onError);
  });

const collectBoundedText = (stream: Readable): Promise<string> =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let byteLength = 0;
    let truncated = false;
    stream.on("data", (chunk: unknown) => {
      if (!(chunk instanceof Uint8Array)) {
        truncated = true;
        return;
      }
      const remaining = MARKER_LIMIT_BYTES - byteLength;
      if (remaining <= 0) {
        truncated = true;
        return;
      }
      const retained = chunk.subarray(0, remaining);
      chunks.push(Buffer.from(retained));
      byteLength += retained.byteLength;
      if (retained.byteLength !== chunk.byteLength) truncated = true;
    });
    stream.once("end", () => {
      const text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
      resolve(truncated ? `${text}[truncated]` : text);
    });
    stream.once("error", (error: Error) => resolve(`stderr_read_failed:${error.message}`));
  });

type WorkerExit = Readonly<{
  code: number | null;
  signal: NodeJS.Signals | null;
}>;

const waitForChildExit = (child: ChildProcessWithoutNullStreams): Promise<WorkerExit> =>
  new Promise<WorkerExit>((resolve, reject) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
    child.once("error", reject);
  });

const writeWorkerRequest = (
  child: ChildProcessWithoutNullStreams,
  request: string
): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    child.stdin.write(request, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const readMarker = (value: string): WorkerMarker => {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("site_package_crash_worker_marker_invalid");
  }
  const record = parsed as Record<string, unknown>;
  if (
    (record.phase === "initialization_transaction_open" ||
      record.phase === "initialization_committed") &&
    typeof record.runId === "string" &&
    Number.isSafeInteger(record.itemCount)
  ) {
    return parsed as InitializationMarker;
  }
  if (
    record.phase === "native_committed" &&
    typeof record.runId === "string" &&
    typeof record.kind === "string" &&
    UUID_KINDS.includes(record.kind as UuidKind) &&
    typeof record.key === "string" &&
    typeof record.intendedId === "string" &&
    (record.durablePhase === "staged" || record.durablePhase === "complete")
  ) {
    return parsed as NativeMarker;
  }
  throw new Error("site_package_crash_worker_marker_invalid");
};

const buildCrashPackage = (kind: UuidKind): CrashPackage => {
  const scope = randomUUID().replaceAll("-", "").slice(0, 8);
  const source = buildScopedFormaDomPackage(scope);
  const sourcePlan = buildReferencePlan(source);
  const target = sourcePlan.find((resource) => resource.kind === kind);
  if (!target) throw new Error("site_package_crash_target_missing");
  const byIdentity = new Map(sourcePlan.map((resource) => [resource.identity, resource]));
  const retained = new Set<string>();
  const retain = (identity: string): void => {
    if (retained.has(identity)) return;
    const resource = byIdentity.get(identity as (typeof sourcePlan)[number]["identity"]);
    if (!resource) throw new Error("site_package_crash_dependency_missing");
    retained.add(identity);
    for (const dependency of resource.dependencies) retain(dependency);
  };
  retain(target.identity);
  const keep = <T extends { key: string }>(
    seeds: readonly T[],
    resourceKind: FullSiteInstallResourceKind
  ): T[] => seeds.filter((seed) => retained.has(`${resourceKind}:${seed.key}`));
  const resources: FullSitePackageResources = {
    contentTypes: keep(source.resources.contentTypes, COLLECTION_KIND.contentTypes),
    forms: keep(source.resources.forms, COLLECTION_KIND.forms),
    pageTemplates: keep(source.resources.pageTemplates, COLLECTION_KIND.pageTemplates),
    listingTemplates: keep(source.resources.listingTemplates, COLLECTION_KIND.listingTemplates),
    entries: keep(source.resources.entries, COLLECTION_KIND.entries),
    listingQueries: keep(source.resources.listingQueries, COLLECTION_KIND.listingQueries),
    detailPages: keep(source.resources.detailPages, COLLECTION_KIND.detailPages),
    pages: keep(source.resources.pages, COLLECTION_KIND.pages),
    menus: keep(source.resources.menus, COLLECTION_KIND.menus),
    settings: [],
  };
  const pkg = normalizeFullSitePackageForWrite({
    schemaVersion: 1,
    key: `${source.key}-${kind.replaceAll("_", "-")}`,
    metadata: {
      ...source.metadata,
      name: `${source.metadata.name} ${kind}`,
    },
    resources,
  });
  const normalizedTarget = buildReferencePlan(pkg).find((resource) => resource.kind === kind);
  if (!normalizedTarget || normalizedTarget.key !== target.key) {
    throw new Error("site_package_crash_target_drift");
  }
  return Object.freeze({
    package: pkg,
    kind,
    key: normalizedTarget.key,
    identity: normalizedTarget.identity,
  });
};

const createActor = async (): Promise<string> => {
  const actorId = randomUUID();
  await db.insert(users).values({
    id: actorId,
    email: `task-547-crash-${actorId}@example.test`,
    passwordHash: "task-547-crash-test-only",
    status: "inactive",
  });
  return actorId;
};

const startCrashWorker = async (
  input: Readonly<{
    mode: CrashMode;
    crashPackage: CrashPackage;
    actorId: string;
    phase: CrashPhase;
  }>
) => {
  const child = spawn(process.execPath, [WORKER_PATH], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  const exited = waitForChildExit(child);
  const stderrPromise = collectBoundedText(child.stderr);
  await writeWorkerRequest(
    child,
    `${JSON.stringify({
      mode: input.mode,
      package: input.crashPackage.package,
      actorId: input.actorId,
      target: {
        kind: input.crashPackage.kind,
        key: input.crashPackage.key,
        phase: input.phase,
      },
    })}\n`
  );
  try {
    const marker = readMarker(await readBoundedLine(child.stdout));
    return { child, exited, stderrPromise, marker };
  } catch (error) {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await exited.catch(() => undefined);
    const stderr = await stderrPromise;
    throw new Error(
      `${error instanceof Error ? error.message : "site_package_crash_worker_failed"}:${stderr}`
    );
  }
};

const killWorker = async (started: Awaited<ReturnType<typeof startCrashWorker>>): Promise<void> => {
  if (started.child.exitCode === null && started.child.signalCode === null) {
    const pid = started.child.pid;
    if (!pid) throw new Error("site_package_crash_worker_pid_missing");
    process.kill(pid, "SIGKILL");
  }
  const exited = await withDeadline(started.exited, PROCESS_EXIT_DEADLINE_MS, () => {
    started.child.kill("SIGKILL");
  });
  expect(exited.signal).toBe("SIGKILL");
  expect(await started.stderrPromise).toBe("");
};

const readRunState = async (runId: string) => {
  const [run] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.id, runId));
  const items = await db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, runId))
    .orderBy(asc(solutionKitInstallItems.position), asc(solutionKitInstallItems.id));
  if (!run) throw new Error("site_package_crash_source_missing");
  return { run, items };
};

const readNative = async (kind: UuidKind, id: string) =>
  FULL_SITE_ROLLBACK_ADAPTERS[kind].captureSnapshotByIdOrNull(id);

const createObservedRollbackAdapters = (): Readonly<{
  adapters: FullSiteRollbackAdapters;
  observations: NativeReversalObservation[];
}> => {
  const observations: NativeReversalObservation[] = [];
  const wrap = (kind: UuidKind): FullSiteRollbackAdapters[UuidKind] => {
    const adapter = FULL_SITE_ROLLBACK_ADAPTERS[kind];
    return {
      ...adapter,
      async deleteSnapshotAtomic(input) {
        observations.push({ kind, operation: "delete", input: structuredClone(input) });
        await adapter.deleteSnapshotAtomic(input);
      },
      async restoreSnapshotAtomic(input) {
        observations.push({ kind, operation: "restore", input: structuredClone(input) });
        await adapter.restoreSnapshotAtomic(input);
      },
    };
  };
  return {
    observations,
    adapters: {
      content_type: wrap("content_type"),
      form: wrap("form"),
      page_template: wrap("page_template"),
      listing_template: wrap("listing_template"),
      content_entry: wrap("content_entry"),
      listing_query: wrap("listing_query"),
      detail_page: wrap("detail_page"),
      page: wrap("page"),
      menu: wrap("menu"),
      setting: FULL_SITE_ROLLBACK_ADAPTERS.setting,
    },
  };
};

const expectNestedAbsent = async (kind: UuidKind, id: string): Promise<void> => {
  if (kind === "form") {
    expect(
      await db.select({ id: formFields.id }).from(formFields).where(eq(formFields.formId, id))
    ).toEqual([]);
    expect(
      await db.select({ id: formActions.id }).from(formActions).where(eq(formActions.formId, id))
    ).toEqual([]);
  } else if (kind === "content_entry") {
    expect(
      await db
        .select({ id: contentRevisions.id })
        .from(contentRevisions)
        .where(eq(contentRevisions.entryId, id))
    ).toEqual([]);
  } else if (kind === "detail_page") {
    expect(
      await db
        .select({ id: detailPageRevisions.id })
        .from(detailPageRevisions)
        .where(eq(detailPageRevisions.detailPageId, id))
    ).toEqual([]);
  } else if (kind === "page") {
    expect(
      await db
        .select({ id: pageRevisions.id })
        .from(pageRevisions)
        .where(eq(pageRevisions.pageId, id))
    ).toEqual([]);
  } else if (kind === "menu") {
    expect(
      await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.menuId, id))
    ).toEqual([]);
  }
};

const expectMarkerPresent = (options: unknown): void => {
  expect(options !== null && typeof options === "object" && !Array.isArray(options)).toBe(true);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("site_package_crash_options_invalid");
  }
  expect(options).toHaveProperty(NATIVE_CMS_WRITER_FENCE_OPTION_KEY);
};

const expectMarkerAbsent = (options: unknown): void => {
  expect(options !== null && typeof options === "object" && !Array.isArray(options)).toBe(true);
  if (!options || typeof options !== "object" || Array.isArray(options)) {
    throw new Error("site_package_crash_options_invalid");
  }
  expect(options).not.toHaveProperty(NATIVE_CMS_WRITER_FENCE_OPTION_KEY);
};

const expectAutomaticRecovery = async (
  input: Readonly<{
    crashPackage: CrashPackage;
    actorId: string;
    sourceRunId: string;
  }>
): Promise<readonly NativeReversalObservation[]> => {
  const observed = createObservedRollbackAdapters();
  await expect(
    applyFullSitePackage(
      {
        package: input.crashPackage.package,
        actorId: input.actorId,
        allowSettingTakeover: true,
      },
      { rollbackAdapters: observed.adapters }
    )
  ).rejects.toThrow("site_package_apply_interrupted");
  const sourceState = await readRunState(input.sourceRunId);
  expect(sourceState.run.status).toBe("failed");
  expect(sourceState.run.error).toBe("site_package_apply_interrupted");
  expectMarkerAbsent(sourceState.run.options);
  const children = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.rollbackOfRunId, input.sourceRunId));
  expect(children).toHaveLength(1);
  expect(children[0]).toMatchObject({ mode: "rollback", status: "success", error: null });
  expectMarkerAbsent(children[0]!.options);
  const outcomes = await db
    .select()
    .from(solutionKitInstallItems)
    .where(eq(solutionKitInstallItems.runId, children[0]!.id));
  expect(outcomes).toHaveLength(sourceState.items.length);
  for (const source of sourceState.items) {
    const durable = readFullSiteDurableAfterSnapshotV1(source.afterSnapshot);
    expect(durable).not.toBeNull();
    const kind = source.resourceType as UuidKind;
    expect(await readNative(kind, durable!.id)).toBeNull();
    await expectNestedAbsent(kind, durable!.id);
    const outcome = outcomes.find(
      (row) => row.resourceType === source.resourceType && row.resourceKey === source.resourceKey
    );
    expect(outcome).toMatchObject({
      position: source.position,
      operation: source.operation,
      status: "success",
      beforeSnapshot: source.afterSnapshot,
      afterSnapshot: source.beforeSnapshot,
      rollbackAction: source.rollbackAction,
      error: null,
    });
  }
  return observed.observations;
};

const cleanupFixture = async (
  input: Readonly<{
    crashPackage: CrashPackage;
    actorId: string;
  }>
): Promise<void> => {
  const ledger = createLegacyInstallLedger();
  const [source] = await db
    .select()
    .from(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.kitId, input.crashPackage.package.key))
    .orderBy(asc(solutionKitInstallRuns.createdAt));
  if (source?.status === "running") {
    try {
      await applyFullSitePackage({
        package: input.crashPackage.package,
        actorId: input.actorId,
        allowSettingTakeover: true,
      });
    } catch (error) {
      if (!(error instanceof Error) || error.message !== "site_package_apply_interrupted") {
        throw error;
      }
    }
  }
  const refreshed = source ? await ledger.getRun(source.id) : null;
  if (refreshed?.status === "success" && !(await ledger.hasSuccessfulRollback(refreshed.id))) {
    await rollbackFullSiteInstall({
      sourceRunId: refreshed.id,
      actorId: input.actorId,
      ledger,
    });
  }
  if (source) {
    for (const row of (await readRunState(source.id)).items) {
      const durable = readFullSiteDurableAfterSnapshotV1(row.afterSnapshot);
      if (durable) expect(await readNative(row.resourceType as UuidKind, durable.id)).toBeNull();
    }
  }
  await db
    .delete(solutionKitInstallRuns)
    .where(eq(solutionKitInstallRuns.kitId, input.crashPackage.package.key));
  await db.delete(users).where(eq(users.id, input.actorId));
};

const runNativeCrashCase = async (kind: UuidKind, phase: CrashPhase): Promise<void> => {
  const crashPackage = buildCrashPackage(kind);
  const actorId = await createActor();
  let started: Awaited<ReturnType<typeof startCrashWorker>> | null = null;
  try {
    started = await startCrashWorker({
      mode: "native_committed",
      crashPackage,
      actorId,
      phase,
    });
    expect(started.marker).toMatchObject({
      phase: "native_committed",
      kind,
      key: crashPackage.key,
      durablePhase: phase,
    });
    const marker = started.marker as NativeMarker;
    await killWorker(started);
    started = null;
    const sourceState = await readRunState(marker.runId);
    expect(sourceState.run).toMatchObject({ mode: "apply", status: "running", actorId });
    expectMarkerPresent(sourceState.run.options);
    const target = sourceState.items.find(
      (row) => row.resourceType === kind && row.resourceKey === crashPackage.key
    );
    expect(target).toBeDefined();
    const durable = readFullSiteDurableAfterSnapshotV1(target!.afterSnapshot);
    expect(durable?.id).toBe(marker.intendedId);
    const expectedNative =
      phase === "staged"
        ? durable?.recovery.stagedSnapshot
        : durable && { id: durable.id, desired: durable.desired };
    expect(expectedNative).not.toBeNull();
    const observations = await expectAutomaticRecovery({
      crashPackage,
      actorId,
      sourceRunId: marker.runId,
    });
    expect(
      observations.filter(
        (observation) =>
          observation.kind === kind &&
          observation.operation === "delete" &&
          observation.input.id === marker.intendedId
      )
    ).toEqual([
      {
        kind,
        operation: "delete",
        input: {
          id: marker.intendedId,
          expectedCurrent: expectedNative,
          actorId,
        },
      },
    ]);
  } finally {
    if (started) await killWorker(started).catch(() => undefined);
    await cleanupFixture({ crashPackage, actorId });
  }
};

for (const kind of UUID_KINDS) {
  const phase: CrashPhase = LIFECYCLE_KINDS.has(kind) ? "staged" : "complete";
  test(
    `recovers exact ${kind} create intent after real SIGKILL at ${phase}`,
    () => runNativeCrashCase(kind, phase),
    360_000
  );
}

for (const kind of [...LIFECYCLE_KINDS]) {
  test(
    `recovers exact ${kind} create intent after publish commit SIGKILL`,
    () => runNativeCrashCase(kind, "complete"),
    360_000
  );
}

test("rolls back an open initialization transaction on SIGKILL and reinitializes the full set", async () => {
  const crashPackage = buildCrashPackage("page_template");
  const actorId = await createActor();
  let started: Awaited<ReturnType<typeof startCrashWorker>> | null = null;
  try {
    started = await startCrashWorker({
      mode: "initialization_transaction_open",
      crashPackage,
      actorId,
      phase: "complete",
    });
    expect(started.marker.phase).toBe("initialization_transaction_open");
    const marker = started.marker as InitializationMarker;
    const whileOpen = await readRunState(marker.runId);
    expectMarkerPresent(whileOpen.run.options);
    expect(whileOpen.run.options as JsonObject).not.toHaveProperty("initializationPlanV1");
    expect(whileOpen.items).toEqual([]);
    await killWorker(started);
    started = null;
    const rolledBack = await readRunState(marker.runId);
    expect(rolledBack.items).toEqual([]);
    expect(rolledBack.run.options as JsonObject).not.toHaveProperty("initializationPlanV1");
    const result = await applyFullSitePackage({
      package: crashPackage.package,
      actorId,
      allowSettingTakeover: true,
    });
    expect(result.runId).toBe(marker.runId);
    const initialized = await readRunState(marker.runId);
    expect(initialized.run.status).toBe("success");
    expect(initialized.items).toHaveLength(marker.itemCount);
    expectMarkerAbsent(initialized.run.options);
    await rollbackFullSiteInstall({ sourceRunId: marker.runId, actorId });
  } finally {
    if (started) await killWorker(started).catch(() => undefined);
    await cleanupFixture({ crashPackage, actorId });
  }
}, 360_000);

test("takes over committed initialization after SIGKILL without issuing a native reversal", async () => {
  const crashPackage = buildCrashPackage("page_template");
  const actorId = await createActor();
  let started: Awaited<ReturnType<typeof startCrashWorker>> | null = null;
  try {
    started = await startCrashWorker({
      mode: "initialization_committed",
      crashPackage,
      actorId,
      phase: "complete",
    });
    expect(started.marker.phase).toBe("initialization_committed");
    const marker = started.marker as InitializationMarker;
    const initialized = await readRunState(marker.runId);
    expect(initialized.items).toHaveLength(marker.itemCount);
    expect(initialized.run.options as JsonObject).toHaveProperty("initializationPlanV1");
    for (const row of initialized.items) {
      const durable = readFullSiteDurableAfterSnapshotV1(row.afterSnapshot);
      expect(durable).not.toBeNull();
    }
    await killWorker(started);
    started = null;
    expect(
      await expectAutomaticRecovery({ crashPackage, actorId, sourceRunId: marker.runId })
    ).toEqual([]);
  } finally {
    if (started) await killWorker(started).catch(() => undefined);
    await cleanupFixture({ crashPackage, actorId });
  }
}, 360_000);

const MISMATCHES = ["package", "mode", "null_actor", "different_actor", "options"] as const;

for (const mismatch of MISMATCHES) {
  test(`rejects ${mismatch} takeover before rotating durable crash evidence`, async () => {
    const crashPackage = buildCrashPackage("content_type");
    const actorId = await createActor();
    let differentActorId: string | null = null;
    let started: Awaited<ReturnType<typeof startCrashWorker>> | null = null;
    try {
      started = await startCrashWorker({
        mode: "native_committed",
        crashPackage,
        actorId,
        phase: "complete",
      });
      const marker = started.marker as NativeMarker;
      await killWorker(started);
      started = null;
      if (mismatch === "null_actor") {
        await db
          .update(solutionKitInstallRuns)
          .set({ actorId: null })
          .where(eq(solutionKitInstallRuns.id, marker.runId));
      }
      if (mismatch === "different_actor") differentActorId = await createActor();
      const before = await readRunState(marker.runId);
      const retryPackage =
        mismatch === "package"
          ? { ...crashPackage.package, key: `${crashPackage.package.key}-other` }
          : crashPackage.package;
      await expect(
        applyFullSitePackage(
          {
            package: retryPackage,
            actorId: differentActorId ?? actorId,
            dryRun: mismatch === "mode",
            allowSettingTakeover: mismatch !== "options",
          },
          {
            loadPlanningSnapshot: async () => {
              throw new Error("site_package_mismatch_reached_planner");
            },
          }
        )
      ).rejects.toThrow("site_package_recovery_conflict");
      const after = await readRunState(marker.runId);
      expect(after).toEqual(before);
      expectMarkerPresent(after.run.options);
      if (mismatch === "null_actor") {
        await db
          .update(solutionKitInstallRuns)
          .set({ actorId })
          .where(eq(solutionKitInstallRuns.id, marker.runId));
      }
      const observations = await expectAutomaticRecovery({
        crashPackage,
        actorId,
        sourceRunId: marker.runId,
      });
      expect(
        observations.filter(
          (observation) =>
            observation.kind === "content_type" &&
            observation.operation === "delete" &&
            observation.input.id === marker.intendedId
        )
      ).toHaveLength(1);
    } finally {
      if (started) await killWorker(started).catch(() => undefined);
      if (mismatch === "null_actor") {
        await db
          .update(solutionKitInstallRuns)
          .set({ actorId })
          .where(eq(solutionKitInstallRuns.kitId, crashPackage.package.key));
      }
      await cleanupFixture({ crashPackage, actorId });
      if (differentActorId) await db.delete(users).where(eq(users.id, differentActorId));
    }
  }, 360_000);
}

test("rejects handcrafted partial initialization before generation rotation", async () => {
  const crashPackage = buildCrashPackage("page_template");
  const actorId = await createActor();
  let started: Awaited<ReturnType<typeof startCrashWorker>> | null = null;
  try {
    started = await startCrashWorker({
      mode: "initialization_committed",
      crashPackage,
      actorId,
      phase: "complete",
    });
    const marker = started.marker as InitializationMarker;
    await killWorker(started);
    started = null;
    await db.delete(solutionKitInstallItems).where(eq(solutionKitInstallItems.runId, marker.runId));
    const before = await readRunState(marker.runId);
    await expect(
      applyFullSitePackage({
        package: crashPackage.package,
        actorId,
        allowSettingTakeover: true,
      })
    ).rejects.toThrow("native_cms_writer_recovery_required");
    expect(await readRunState(marker.runId)).toEqual(before);
    await db
      .update(solutionKitInstallRuns)
      .set({
        options: {
          ...(before.run.options as JsonObject),
          initializationPlanV1: [],
        },
      })
      .where(eq(solutionKitInstallRuns.id, marker.runId));
  } finally {
    if (started) await killWorker(started).catch(() => undefined);
    await cleanupFixture({ crashPackage, actorId });
  }
}, 360_000);
