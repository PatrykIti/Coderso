import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path, { join } from "node:path";
import {
  executeTask540StandaloneAction,
  type Task540BrowserNativeController,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/browser/native-browser";
import { buildTask540NativePlan } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/plan.mjs";
import type {
  Task540NativeAction,
  Task540NativePlan,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/contracts";
import { Task540ExecutionMemory } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/memory";
import { validateTask540ActionOutput } from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/output-validation";
import { buildTask540ResponseLostBaselineItems } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/response-lost-baselines";
import { executeTask540PlatformAction } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/platform-actions";
import {
  TASK540_NATIVE_RUNTIME_ACTION_IDS,
  Task540NativeRuntime,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/native-runtime";
import type { Task540RuntimeState } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/contracts";
import { task540IsolatedReadExpectation } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/override-actions";
import { assertTask540SeoCleanupCandidate } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/cleanup";
import { restoreTask540BootstrapBaseline } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/bootstrap-restoration";
import { Task540AdminApiSession } from "../../../scripts/runtime-smoke/adapters/task-540/suite/runtime/admin-session";
import {
  TASK540_CLEANUP_API_NODE_OPERATIONS,
  TASK540_CLEANUP_DB_OPERATIONS,
  TASK540_CLEANUP_LOGICAL_RECEIPTS,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/executor/cleanup-receipts";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import type { WorkerPool } from "../../../scripts/runtime-smoke/workers/pool";
import { RuntimeLifecycle } from "../../../scripts/runtime-smoke/lifecycle";
import type { PlaywrightCliNativeCommand } from "../../../scripts/runtime-smoke/browser/playwright-cli-dispatcher";
import { RepositoryGuard } from "../../../scripts/runtime-smoke/repository-guard";
import { buildExactTask540ArchiveManifest } from "../../../scripts/runtime-smoke/adapters/task-540/output-manifest";
import {
  TASK540_RUN_CODE_TIMEOUT_MS,
  finalizeTask540RoutingLease,
} from "../../../scripts/runtime-smoke/adapters/task-540/suite/composition/suite";

const root = path.resolve(import.meta.dir, "../../..");

function plan(): Task540NativePlan {
  return buildTask540NativePlan({ nonce: "0123456789ab" }) as Task540NativePlan;
}

function firstBrowserActions(planValue: Task540NativePlan): ReadonlySet<string> {
  const scenarios = new Set<string>();
  const actions = new Set<string>();
  for (const action of planValue.actionManifest) {
    if (action.executable.type === "runtime-operation" || scenarios.has(action.scenario)) continue;
    scenarios.add(action.scenario);
    actions.add(action.id);
  }
  return actions;
}

function seedRelatedEntryCapture(
  planValue: Task540NativePlan,
  memory: Task540ExecutionMemory
): void {
  const producer = planValue.actionManifest.find(({ id }) => id === "set-022-related-a1-create");
  if (producer === undefined) throw new Error("TASK-540 related-entry producer is absent");
  memory.record(producer, {
    captureBindings: {
      "related-entry-a1.id": "00000000-0000-4000-8000-000000005522",
    },
    observationSha256: "a".repeat(64),
  });
}

test("TASK-540 dispatcher timeout covers the certification auth-window barrier", () => {
  const maximumWindowSeconds = plan().requiredAuthRatePlan.requiredEnabledWindowSecondsMax;
  if (typeof maximumWindowSeconds !== "number") {
    throw new Error("TASK-540 auth-window maximum is absent");
  }
  expect(TASK540_RUN_CODE_TIMEOUT_MS).toBeGreaterThan((maximumWindowSeconds + 1) * 1_000);
  expect(TASK540_RUN_CODE_TIMEOUT_MS).toBeLessThanOrEqual(5 * 60_000);
});

test("TASK-540 repository guard permits archive-only output changes and rejects flat output changes", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "task540-repository-guard-"));
  try {
    const temporaryRoot = await realpath(temporary);
    const manifest = buildExactTask540ArchiveManifest({
      command: "run",
      suite: "task-540",
      profile: "fast",
      session: "task540-guard",
    });
    const guardPaths = Object.freeze([...manifest.sourcePaths, ...manifest.archivePaths]);
    const guard = new RepositoryGuard(temporaryRoot, async () => new Uint8Array());
    const before = await guard.snapshot(guardPaths);
    const changedArchivePath = manifest.archivePaths[0]!;
    await mkdir(path.dirname(join(temporaryRoot, changedArchivePath)), { recursive: true });
    await writeFile(join(temporaryRoot, changedArchivePath), "changed-archive-output");
    const archiveOnlyAfter = await guard.snapshot(guardPaths);

    expect(before.files.map(({ path: repositoryPath }) => repositoryPath)).toEqual(
      [...guardPaths].sort()
    );
    expect(() =>
      guard.assertUnchanged(before, archiveOnlyAfter, manifest.archivePaths)
    ).not.toThrow();

    const changedFlatPath = manifest.sourcePaths[0]!;
    await mkdir(path.dirname(join(temporaryRoot, changedFlatPath)), { recursive: true });
    await writeFile(join(temporaryRoot, changedFlatPath), "changed-flat-output");
    const after = await guard.snapshot(guardPaths);

    expect(() => guard.assertUnchanged(before, after, manifest.archivePaths)).toThrowError(
      expect.objectContaining({ code: "smoke_repository_changed" })
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("TASK-540 routing lease finalizer restores before one database close on success", async () => {
  const events: string[] = [];
  const result = await finalizeTask540RoutingLease({
    routingLease: {
      async restore() {
        events.push("restore");
      },
    },
    routingRestored: false,
    primary: undefined,
    async closeDatabase() {
      events.push("close-database");
    },
  });

  expect(events).toEqual(["restore", "close-database"]);
  expect(result).toEqual({ primary: undefined, routingRestored: true });
});

test("TASK-540 routing lease finalizer preserves a primary failure while closing once", async () => {
  const events: string[] = [];
  const primary = new Error("primary failure");
  const result = await finalizeTask540RoutingLease({
    routingLease: {
      async restore() {
        events.push("restore");
      },
    },
    routingRestored: false,
    primary,
    async closeDatabase() {
      events.push("close-database");
    },
  });

  expect(events).toEqual(["restore", "close-database"]);
  expect(result.primary).toBe(primary);
  expect(result.routingRestored).toBe(true);
});

test("TASK-540 routing lease finalizer still closes after restoration failure and aggregates it", async () => {
  const events: string[] = [];
  const primary = new Error("primary failure");
  const restoreFailure = new Error("restore failure");
  const result = await finalizeTask540RoutingLease({
    routingLease: {
      async restore() {
        events.push("restore");
        throw restoreFailure;
      },
    },
    routingRestored: false,
    primary,
    async closeDatabase() {
      events.push("close-database");
    },
  });

  expect(events).toEqual(["restore", "close-database"]);
  expect(result.routingRestored).toBe(false);
  expect(result.primary).toMatchObject({ code: "smoke_output_invalid" });
  expect((result.primary as Error).cause).toBeInstanceOf(AggregateError);
  expect(((result.primary as Error).cause as AggregateError).errors).toEqual([
    primary,
    restoreFailure,
  ]);
});

test("TASK-540 routing lease finalizer aggregates a database close failure after restore", async () => {
  const events: string[] = [];
  const primary = new Error("primary failure");
  const closeFailure = new Error("close failure");
  const result = await finalizeTask540RoutingLease({
    routingLease: {
      async restore() {
        events.push("restore");
      },
    },
    routingRestored: false,
    primary,
    async closeDatabase() {
      events.push("close-database");
      throw closeFailure;
    },
  });

  expect(events).toEqual(["restore", "close-database"]);
  expect(result.routingRestored).toBe(true);
  expect(result.primary).toMatchObject({ code: "smoke_output_invalid" });
  expect((result.primary as Error).cause).toBeInstanceOf(AggregateError);
  expect(((result.primary as Error).cause as AggregateError).errors).toEqual([
    primary,
    closeFailure,
  ]);
});

test("TASK-540 routing lease finalizer retains restore and close failures together", async () => {
  const events: string[] = [];
  const primary = new Error("primary failure");
  const restoreFailure = new Error("restore failure");
  const closeFailure = new Error("close failure");
  const result = await finalizeTask540RoutingLease({
    routingLease: {
      async restore() {
        events.push("restore");
        throw restoreFailure;
      },
    },
    routingRestored: false,
    primary,
    async closeDatabase() {
      events.push("close-database");
      throw closeFailure;
    },
  });

  expect(events).toEqual(["restore", "close-database"]);
  expect(result.primary).toMatchObject({ code: "smoke_output_invalid" });
  const outer = (result.primary as Error).cause as AggregateError;
  expect(outer).toBeInstanceOf(AggregateError);
  expect(outer.errors.at(1)).toBe(closeFailure);
  const inner = outer.errors.at(0) as Error;
  expect(inner.cause).toBeInstanceOf(AggregateError);
  expect((inner.cause as AggregateError).errors).toEqual([primary, restoreFailure]);
});

test("TASK-540 execution memory records runtime palette block captures", () => {
  const planValue = plan();
  const memory = new Task540ExecutionMemory(planValue);
  const producer = planValue.actionManifest.find(({ id }) => id === "bi-005-button-capture");
  if (producer === undefined) throw new Error("TASK-540 palette producer is absent");
  const blockId = "00000000-0000-4000-8000-000000005405";
  memory.record(producer, { id: blockId, type: "button" });
  expect(memory.captures.get("palette.button")).toBe(blockId);
});

test("TASK-540 dispatches and validates every one of its 28 standalone browser actions", async () => {
  const planValue = plan();
  const memory = new Task540ExecutionMemory(planValue);
  seedRelatedEntryCapture(planValue, memory);
  const standalone = planValue.actionManifest.filter(
    ({ executable }) =>
      executable.type !== "runtime-operation" && executable.type !== "browser-run-code"
  );
  expect(standalone).toHaveLength(28);

  const nativeCommands: PlaywrightCliNativeCommand[] = [];
  const sourceActions: string[] = [];
  let closeCalls = 0;
  let absenceCalls = 0;
  const native: Task540BrowserNativeController = {
    async dispatchNative(command) {
      nativeCommands.push(command);
      return Buffer.from(command.operation === "route-list" ? "No active routes\n" : "native-ok\n");
    },
    async close() {
      closeCalls += 1;
    },
    async proveAbsent() {
      absenceCalls += 1;
      return true;
    },
  };
  const first = firstBrowserActions(planValue);
  const receipts = [];
  for (const action of standalone) {
    receipts.push(
      await executeTask540StandaloneAction({
        action,
        plan: planValue,
        memory,
        root,
        secrets: { ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "private-password" },
        firstBrowserActionInScenario: first.has(action.id),
        native,
        consoleErrors: Object.freeze([]),
        pageErrors: Object.freeze([]),
        async executeSource(sourceAction, source) {
          sourceActions.push(sourceAction.id);
          expect(source).toContain(JSON.stringify(sourceAction.id));
          const output: PlainJsonValue =
            sourceAction.executable.type === "browser-screenshot" ? true : { ok: true };
          const validated = validateTask540ActionOutput({
            root,
            plan: planValue,
            action: sourceAction,
            memory,
            output,
          });
          memory.record(sourceAction, validated);
          return Object.freeze({
            actionId: sourceAction.id,
            scenarioId: sourceAction.scenario,
            output: validated,
            consoleErrors: Object.freeze([]),
            pageErrors: Object.freeze([]),
          });
        },
      })
    );
  }

  expect(receipts.map(({ actionId }) => actionId)).toEqual(standalone.map(({ id }) => id));
  expect(sourceActions).toHaveLength(21);
  expect(nativeCommands).toEqual([
    {
      operation: "tab-new",
      url: "http://coderso-a.localhost:5173/admin/advanced/entries/wf540-0123456789ab-related-a/00000000-0000-4000-8000-000000005522",
    },
    { operation: "tab-select", index: 0 },
    { operation: "tab-close", index: 1 },
    { operation: "tab-select", index: 0 },
    { operation: "route-list" },
  ]);
  expect(closeCalls).toBe(1);
  expect(absenceCalls).toBe(1);
});

test("TASK-540 standalone and visible-effect output validation fails closed", async () => {
  const planValue = plan();
  const memory = new Task540ExecutionMemory(planValue);
  const routeList = planValue.actionManifest.find(({ id }) => id === "end-002-route-list");
  if (routeList === undefined) throw new Error("TASK-540 route-list action is absent");
  const native: Task540BrowserNativeController = {
    async dispatchNative() {
      return Buffer.from("unexpected route\n");
    },
    async close() {},
    async proveAbsent() {
      return true;
    },
  };
  await expect(
    executeTask540StandaloneAction({
      action: routeList,
      plan: planValue,
      memory,
      root,
      secrets: { ADMIN_EMAIL: "admin@example.com", ADMIN_PASSWORD: "private-password" },
      firstBrowserActionInScenario: false,
      native,
      consoleErrors: Object.freeze([]),
      pageErrors: Object.freeze([]),
      async executeSource() {
        throw new Error("unexpected source dispatch");
      },
    })
  ).rejects.toThrow("route list is not empty");

  const visibleAction = planValue.actionManifest.find(
    ({ id }) => id === "bi-024-prior-resolution"
  ) as Task540NativeAction | undefined;
  if (visibleAction === undefined) throw new Error("TASK-540 visible assertion is absent");
  expect(
    validateTask540ActionOutput({
      root,
      plan: planValue,
      action: visibleAction,
      memory,
      output: {
        overridePresent: true,
        imagePresent: false,
        placeholderVisible: true,
        mediaGetCount: 1,
      },
    })
  ).toMatchObject({ placeholderVisible: true });
  expect(() =>
    validateTask540ActionOutput({
      root,
      plan: planValue,
      action: visibleAction,
      memory,
      output: {
        overridePresent: true,
        imagePresent: false,
        placeholderVisible: false,
        mediaGetCount: 1,
      },
    })
  ).toThrow(`action output contract failed: ${visibleAction.id}`);
});

test("TASK-540 native runtime map and response-lost baseline batches retain exact cardinality", () => {
  const planValue = plan();
  const runtimeActions = planValue.actionManifest.filter(
    ({ executable }) => executable.type === "runtime-operation"
  );
  expect(TASK540_NATIVE_RUNTIME_ACTION_IDS).toHaveLength(76);
  expect(runtimeActions.map(({ id }) => id)).toEqual(TASK540_NATIVE_RUNTIME_ACTION_IDS);
  expect(
    runtimeActions.map(({ id, executable }) => executable.operationId === `runtime/${id}`)
  ).toEqual(Array.from({ length: 76 }, () => true));

  const baselines = buildTask540ResponseLostBaselineItems(planValue);
  expect(baselines).toHaveLength(18);
  expect(new Set(baselines.map(({ logicalId }) => logicalId))).toHaveLength(18);
  expect(baselines.filter(({ profileId }) => profileId === "database")).toHaveLength(14);
  expect(baselines.filter(({ profileId }) => profileId === "user-identity-proof")).toHaveLength(4);
  expect(new Set(baselines.map(({ operationId }) => operationId))).toHaveLength(18);
  expect({
    db: TASK540_CLEANUP_DB_OPERATIONS,
    parent: TASK540_CLEANUP_API_NODE_OPERATIONS,
    receipts: TASK540_CLEANUP_LOGICAL_RECEIPTS,
  }).toEqual({ db: 32, parent: 40, receipts: 72 });
});

test("TASK-540 runtime invariant failures retain a bounded classified smoke token", async () => {
  const planValue = plan();
  const memory = new Task540ExecutionMemory(planValue);
  const runtime = new Task540NativeRuntime({
    root,
    plan: planValue,
    pool: {} as WorkerPool,
    lifecycle: new RuntimeLifecycle(),
    memory,
    hostReady: true,
  });
  const first = planValue.actionManifest.find(
    ({ executable }) => executable.type === "runtime-operation"
  );
  if (first === undefined) throw new Error("TASK-540 first runtime action is absent");
  await expect(runtime.execute({ ...first, id: "runtime-unknown" }, memory)).rejects.toMatchObject({
    code: "smoke_output_invalid",
    message: "TASK-540 runtime action order drifted",
  });
});

test("TASK-540 bot-protection preflight uses the fixed anonymous loopback boundary", async () => {
  const planValue = plan();
  const action = planValue.actionManifest.find(
    ({ id }) => id === "set-004a-bot-protection-preflight"
  );
  if (action === undefined) throw new Error("TASK-540 bot-protection preflight is absent");
  const state = { plan: planValue } as Task540RuntimeState;
  const body = Object.freeze({
    enabled: false,
    enforceOnLocalhost: true,
    provider: "recaptcha_v3",
    siteKey: null,
  });
  const requests: Array<{
    readonly credentials: RequestCredentials | undefined;
    readonly redirect: RequestRedirect | undefined;
    readonly signalPresent: boolean;
    readonly url: string;
    readonly userAgent: string | null;
  }> = [];
  const result = await executeTask540PlatformAction(state, action, (async (url, init) => {
    requests.push({
      credentials: init?.credentials,
      redirect: init?.redirect,
      signalPresent: init?.signal instanceof AbortSignal,
      url: String(url),
      userAgent: new Headers(init?.headers).get("User-Agent"),
    });
    return new Response(JSON.stringify(body), { status: 200 });
  }) as typeof globalThis.fetch);

  expect(result).toMatchObject({ captureBindings: {} });
  expect(requests).toEqual([
    {
      credentials: "omit",
      redirect: "manual",
      signalPresent: true,
      url: "http://127.0.0.1:3000/admin/api/auth/bot-protection",
      userAgent: "wf540-0123456789ab-public-preflight",
    },
  ]);

  const invalidBodies: readonly PlainJsonValue[] = [
    { enabled: false, enforceOnLocalhost: true, provider: "recaptcha_v3" },
    { ...body, unexpected: true },
    { ...body, provider: "unexpected" },
    { ...body, siteKey: 42 },
    { ...body, enforceOnLocalhost: "true" },
  ];
  for (const invalidBody of invalidBodies) {
    await expect(
      executeTask540PlatformAction(
        state,
        action,
        (async () =>
          new Response(JSON.stringify(invalidBody), { status: 200 })) as typeof globalThis.fetch
      )
    ).rejects.toThrow("TASK-540 bot protection response is invalid");
  }
  await expect(
    executeTask540PlatformAction(
      state,
      action,
      (async () =>
        new Response(JSON.stringify({ ...body, enabled: true }), {
          status: 200,
        })) as typeof globalThis.fetch
    )
  ).rejects.toThrow("TASK-540 bot protection must be disabled");
});

test("TASK-540 bootstrap restoration performs one exact typed CAS between bounded proofs", async () => {
  const userId = "00000000-0000-4000-8000-000000005401";
  const baseline = Object.freeze({
    id: userId,
    rawUserRow: Object.freeze({
      id: userId,
      email: "bootstrap@example.com",
      lastLoginAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
    roleTuples: Object.freeze([
      Object.freeze({
        roleId: "00000000-0000-4000-8000-000000005402",
        roleName: "admin",
        userId,
      }),
    ]),
  });
  const newestOwnedPair = Object.freeze({
    lastLoginAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  });
  const before = Object.freeze({
    ...baseline,
    rawUserRow: Object.freeze({ ...baseline.rawUserRow, ...newestOwnedPair }),
  });
  const proof = Object.freeze(
    Object.fromEntries(
      [
        "afterCommitByteIdentical",
        "completeRowByteIdentical",
        "conditionalUpdateAffectedOne",
        "inTransactionByteIdentical",
        "restored",
        "roleTuplesByteIdentical",
        "rolesInTransactionByteIdentical",
        "rolesShareLocked",
        "transactionLocked",
      ].map((key) => [key, true])
    )
  );
  const calls: Array<{ readonly operationId: string; readonly input: unknown }> = [];
  let read = 0;
  const pool = {
    async dispatch(descriptor: { readonly operationId: string }, input: unknown) {
      calls.push({ operationId: descriptor.operationId, input });
      if (descriptor.operationId === "resource/bootstrap-baseline-read") {
        read += 1;
        return read === 1 ? before : baseline;
      }
      if (descriptor.operationId === "resource/bootstrap-cas-restore") {
        return { kind: "committed", proof, reason: null };
      }
      throw new Error(`unexpected operation ${descriptor.operationId}`);
    },
  } as unknown as WorkerPool;

  await expect(
    restoreTask540BootstrapBaseline(pool, { baseline, newestOwnedPair })
  ).resolves.toEqual({ kind: "committed", restored: true });
  expect(calls.map(({ operationId }) => operationId)).toEqual([
    "resource/bootstrap-baseline-read",
    "resource/bootstrap-cas-restore",
    "resource/bootstrap-baseline-read",
  ]);
  expect(calls[1]?.input).toEqual({ baseline, newestOwnedPair, userId });

  read = 0;
  calls.length = 0;
  await expect(
    restoreTask540BootstrapBaseline(pool, {
      baseline,
      newestOwnedPair: { ...newestOwnedPair, updatedAt: "2026-01-03T00:00:00.000Z" },
    })
  ).rejects.toThrow("newest owned pair drifted");
  expect(calls.map(({ operationId }) => operationId)).toEqual(["resource/bootstrap-baseline-read"]);
});

test("TASK-540 partial API login cleanup captures CSRF before exact logout", async () => {
  const requests: Array<{ readonly route: string; readonly csrf: string | null }> = [];
  const responses = [
    new Response(
      JSON.stringify({
        user: { id: "00000000-0000-4000-8000-000000005401", email: "admin@example.com" },
      }),
      {
        status: 200,
        headers: { "set-cookie": "session=owned-session; HttpOnly" },
      }
    ),
    new Response(
      JSON.stringify({
        key: "customScreens.entry.preferences",
        value: { version: 1, showFieldMetadata: false },
      }),
      { status: 200 }
    ),
    new Response(JSON.stringify({ token: "owned-csrf" }), { status: 200 }),
    new Response(JSON.stringify({ ok: true }), { status: 200 }),
  ];
  const session = new Task540AdminApiSession("wf540-test-agent", "x-csrf-token", (async (
    url,
    init
  ) => {
    requests.push({
      route: new URL(String(url)).pathname,
      csrf: new Headers(init?.headers).get("x-csrf-token"),
    });
    const response = responses.shift();
    if (response === undefined) throw new Error("unexpected fetch");
    return response;
  }) as typeof globalThis.fetch);
  await session.login("admin@example.com", "private-password");
  await session.request("GET", "/user-settings/customScreens.entry.preferences", {
    csrf: false,
  });
  await session.close();
  expect(requests).toEqual([
    { route: "/admin/api/auth/login", csrf: null },
    { route: "/admin/api/user-settings/customScreens.entry.preferences", csrf: null },
    { route: "/admin/api/auth/csrf", csrf: null },
    { route: "/admin/api/auth/logout", csrf: "owned-csrf" },
  ]);
  expect(await session.proveAbsent()).toBe(true);
});

test("TASK-540 isolated reads and SEO cleanup identity fail closed on exact mutants", () => {
  const planValue = plan();
  expect(task540IsolatedReadExpectation(planValue, "ru-047a-a-durable-proof")).toBe(true);
  expect(task540IsolatedReadExpectation(planValue, "ru-051-a-server-false-proof")).toBe(false);
  expect(task540IsolatedReadExpectation(planValue, "ru-061a-a-durable-bypass-read")).toBe(false);

  const expected = Object.freeze({
    id: "00000000-0000-4000-8000-000000005401",
    targetId: "00000000-0000-4000-8000-000000005402",
    targetType: "entry" as const,
  });
  expect(assertTask540SeoCleanupCandidate({ ...expected }, expected)).toEqual(expected);
  for (const mutant of [
    { ...expected, id: "00000000-0000-4000-8000-000000005499" },
    { ...expected, targetId: "00000000-0000-4000-8000-000000005499" },
    { ...expected, targetType: "page" },
  ]) {
    expect(() => assertTask540SeoCleanupCandidate(mutant, expected)).toThrow(
      "SEO cleanup identity drifted"
    );
  }
});
