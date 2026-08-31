import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import adapter, {
  assertExactTask105L05Invocation,
  buildTask105L05ManifestableScenarios,
  defaultTask105L05RunSeams,
  runTask105L05Adapter,
  task105L05EvidenceDirectory,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05";
import {
  createTask105L05HostSpec,
  deriveTask105L05HostPolicy,
  startTask105L05DevHost,
  task105L05Readiness,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/host";
import {
  executeTask105L05Segments,
  Task105L05PageObserver,
  type Task105L05PageDriver,
  type Task105L05SegmentContext,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/browser-segments";
import {
  Task105L05DispatchResource,
  createTask105L05InjectedObserver,
  type Task105L05ObserverDispatcher,
  type Task105L05VisibleEvidence,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/browser-drivers";
import {
  TASK_105_L05_SCENARIO_DESCRIPTORS,
  TASK105_L05_BOOTSTRAP_ENDPOINTS,
  validateTask105L05BrowserReceipt,
  validateTask105L05BrowserReceipts,
} from "../../../scripts/runtime-smoke/adapters/task-105-l05/descriptors";
import { SmokeError, resolveInsideRoot } from "../../../scripts/runtime-smoke/contracts";
import type { PlainJsonValue } from "../../../scripts/runtime-smoke/workers/contracts";
import type { SmokeScreenshotResult } from "../../../scripts/runtime-smoke/adapters/types";
import {
  assertTask105L05FixedDevHostCapability,
  CODERSO_DEV_HOST_ENVIRONMENT_POLICY,
} from "../../../scripts/runtime-smoke/server/supervised-server";
import {
  assertTask105L05FixedDevHostSourceInventory,
  TASK105_L05_FIXED_DEV_HOST_ENTRY,
} from "../../../scripts/runtime-smoke/server/fixed-dev-host";

const SESSION = "task105-fast-r1";
const invocation = {
  command: "run" as const,
  suite: "task-105-l05" as const,
  profile: "fast" as const,
  session: SESSION,
};
const scenarioIds = [
  "menu-structure-save-publish-parity",
  "menu-design-appearance-visible-effect",
  "dashboard-edit-configure-save",
  "dashboard-dirty-remote-stale",
  "solution-kit-select-reviewed-handoff",
] as const;
const fixturePage = Object.freeze({
  id: "fixture-page-id",
  title: "TASK-105 L05 homepage task105-fast-r1",
  slug: "task-105-l05-task105-fast-r1-home",
  relativePath: "/task-105-l05-task105-fast-r1-home",
});

function seedBootstrap(observer: Task105L05PageObserver): void {
  for (const endpoint of TASK105_L05_BOOTSTRAP_ENDPOINTS) {
    observer.observeResponse(endpoint);
  }
}

function makeContext(
  driver: Task105L05PageDriver,
  observer = new Task105L05PageObserver()
): Task105L05SegmentContext {
  return { fixturePage, driver, observer };
}

class FiniteDriver implements Task105L05PageDriver {
  readonly calls: string[] = [];
  readonly #observer: Task105L05PageObserver;
  readonly #menuId: string;

  constructor(observer: Task105L05PageObserver, menuId = "ui-created-menu") {
    this.#observer = observer;
    this.#menuId = menuId;
  }

  async createMenuForFixture(page: typeof fixturePage): Promise<{ readonly menuId: string }> {
    if (page.id !== fixturePage.id) throw new Error("fixture ambiguity");
    this.calls.push("create-menu");
    return { menuId: this.#menuId };
  }
  async configureSiteShellNavigation(menuId: string): Promise<void> {
    if (menuId !== this.#menuId) throw new Error("menu identity mismatch");
    this.calls.push("site-shell");
  }
  async applyMenuDesignFontSizeTwenty(): Promise<void> {
    this.calls.push("menu-design");
  }
  async createConfigureSaveQuickActions(): Promise<void> {
    this.calls.push("dashboard-save");
  }
  async reloadDashboardAndSealNextBootstrap(): Promise<void> {
    this.calls.push("dashboard-reload");
    this.#observer.beginNextBootstrapEpoch();
    seedBootstrap(this.#observer);
  }
  async assertPersistedQuickActions(): Promise<void> {
    this.calls.push("dashboard-persisted");
  }
  async openSolutionKitGuide(): Promise<void> {
    this.calls.push("solution-kit-guide");
  }
  async prepareDirtyDashboardDraft(): Promise<void> {
    this.calls.push("dirty-draft");
  }
  async persistRemoteDashboardMutation(): Promise<void> {
    this.calls.push("remote-save");
  }
  async assertStaleDirtyDraft(): Promise<void> {
    this.calls.push("stale-proof");
  }
  async assertPublicMenuParity(page: typeof fixturePage): Promise<void> {
    if (page.relativePath !== fixturePage.relativePath) throw new Error("parity mismatch");
    this.calls.push("public-parity");
  }
  async screenshot(id: string): Promise<void> {
    this.calls.push(`screenshot:${id}`);
  }
}

function seedSemantic(
  observer: Task105L05PageObserver,
  endpointId = "dashboard-layout-read"
): void {
  observer.observeResponse({ endpointId, method: "GET", status: 200 });
}

type ObserverEventListener = (...args: readonly unknown[]) => void;
class ObserverHarnessXhr {
  status = 200;
  readonly listeners = new Map<string, Set<ObserverEventListener>>();
  open(..._args: readonly unknown[]): void {}
  send(..._args: readonly unknown[]): void {}
  addEventListener(type: string, listener: ObserverEventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<ObserverEventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: ObserverEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }
  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}
interface ObserverHarnessXhrConstructor {
  new (): ObserverHarnessXhr;
  readonly prototype: ObserverHarnessXhr;
}
interface ObserverHarnessWindow extends Record<string, unknown> {
  name: string;
  location: Readonly<{ origin: string }>;
  fetch: (...args: readonly unknown[]) => Promise<Readonly<{ status: number }>>;
  console: { error: (...args: readonly unknown[]) => void };
  XMLHttpRequest: ObserverHarnessXhrConstructor;
  localStorage: { removeItem: (key: string) => void };
  events: Map<string, Set<ObserverEventListener>>;
  addEventListener: (type: string, listener: ObserverEventListener) => void;
  removeEventListener: (type: string, listener: ObserverEventListener) => void;
}
function createObserverHarnessWindow(name: string): ObserverHarnessWindow {
  class WindowXhr extends ObserverHarnessXhr {
    override open(...args: readonly unknown[]): void {
      super.open(...args);
    }
    override send(...args: readonly unknown[]): void {
      super.send(...args);
    }
  }
  const events = new Map<string, Set<ObserverEventListener>>();
  const addEventListener = (type: string, listener: ObserverEventListener): void => {
    const listeners = events.get(type) ?? new Set<ObserverEventListener>();
    listeners.add(listener);
    events.set(type, listeners);
  };
  return {
    name,
    location: Object.freeze({ origin: "http://127.0.0.1:5173" }),
    fetch: async () => ({ status: 200 }),
    console: { error: () => undefined },
    XMLHttpRequest: WindowXhr,
    localStorage: { removeItem: () => undefined },
    events,
    addEventListener,
    removeEventListener: (type, listener) => events.get(type)?.delete(listener),
  };
}
type ObserverDescriptorSnapshot = Readonly<{
  fetch: PropertyDescriptor | undefined;
  open: PropertyDescriptor | undefined;
  send: PropertyDescriptor | undefined;
  consoleError: PropertyDescriptor | undefined;
}>;
function snapshotObserverDescriptors(scope: ObserverHarnessWindow): ObserverDescriptorSnapshot {
  return Object.freeze({
    fetch: Object.getOwnPropertyDescriptor(scope, "fetch"),
    open: Object.getOwnPropertyDescriptor(scope.XMLHttpRequest.prototype, "open"),
    send: Object.getOwnPropertyDescriptor(scope.XMLHttpRequest.prototype, "send"),
    consoleError: Object.getOwnPropertyDescriptor(scope.console, "error"),
  });
}
class ObserverPageHarness {
  #scope: ObserverHarnessWindow;
  #init: Readonly<{ callback: (config: unknown) => unknown; config: unknown }> | null = null;
  #baseline: ObserverDescriptorSnapshot;
  readonly window: object;
  constructor(name = "ambient-window-name") {
    this.#scope = createObserverHarnessWindow(name);
    this.#baseline = snapshotObserverDescriptors(this.#scope);
    this.window = new Proxy(
      {},
      {
        get: (_target, key) => Reflect.get(this.#scope, key),
        set: (_target, key, value) => Reflect.set(this.#scope, key, value),
        has: (_target, key) => Reflect.has(this.#scope, key),
        deleteProperty: (_target, key) => Reflect.deleteProperty(this.#scope, key),
        defineProperty: (_target, key, descriptor) =>
          Reflect.defineProperty(this.#scope, key, descriptor),
        getOwnPropertyDescriptor: (_target, key) =>
          Object.getOwnPropertyDescriptor(this.#scope, key),
        ownKeys: () => Reflect.ownKeys(this.#scope),
      }
    );
  }
  get scope(): ObserverHarnessWindow {
    return this.#scope;
  }
  get baseline(): ObserverDescriptorSnapshot {
    return this.#baseline;
  }
  async evaluate(callback: (input: unknown) => unknown, input: unknown): Promise<unknown> {
    return await callback(input);
  }
  async addInitScript(callback: unknown, config: unknown): Promise<void> {
    if (typeof callback !== "function") throw new Error("init script is invalid");
    this.#init = { callback: callback as (config: unknown) => unknown, config };
  }
  async goto(_url: string): Promise<void> {
    const name = this.#scope.name;
    this.#scope = createObserverHarnessWindow(name);
    this.#baseline = snapshotObserverDescriptors(this.#scope);
    if (this.#init !== null) await this.#init.callback(this.#init.config);
  }
}
async function executeObserverAction(
  page: ObserverPageHarness,
  body: string
): Promise<PlainJsonValue> {
  const run = new Function("page", "window", `return (${body})(page);`) as (
    page: ObserverPageHarness,
    window: object
  ) => Promise<PlainJsonValue>;
  return await run(page, page.window);
}
type ObserverCall = Readonly<{
  tabIndex: number;
  segmentId: "a" | "b";
  actionId: string;
  body: string;
}>;
class ObserverDispatcher implements Task105L05ObserverDispatcher {
  readonly calls: ObserverCall[] = [];
  closed = 0;
  proveAbsentCalls = 0;
  failDispose = false;
  page: ObserverPageHarness | null = null;
  readonly pages = new Map<number, ObserverPageHarness>();
  async run(
    tabIndex: number,
    segmentId: "a" | "b",
    actionId: string,
    body: string
  ): Promise<PlainJsonValue> {
    this.calls.push({ tabIndex, segmentId, actionId, body });
    const page = this.pages.get(tabIndex) ?? this.page;
    if (page !== null && page !== undefined) return executeObserverAction(page, body);
    if (actionId === "install_observer") return { installed: true };
    if (actionId === "dispose_observer")
      return this.failDispose ? { disposed: false } : { disposed: true };
    if (actionId === "prove_observer_inert") return { inert: true };
    throw new Error(`unexpected action ${actionId}`);
  }
  async close(): Promise<void> {
    this.closed += 1;
  }
  async proveAbsent(): Promise<boolean> {
    this.proveAbsentCalls += 1;
    return true;
  }
}
function observerFixture(): Readonly<{
  dispatcher: ObserverDispatcher;
  observer: ReturnType<typeof createTask105L05InjectedObserver>;
  resource: Task105L05DispatchResource;
}> {
  const dispatcher = new ObserverDispatcher();
  const observer = createTask105L05InjectedObserver(dispatcher, { session: SESSION });
  return { dispatcher, observer, resource: new Task105L05DispatchResource(dispatcher, observer) };
}

describe("TASK-105 L05 adapter identity", () => {
  test("rejects unexpected suite/profile/command before touching resources", () => {
    expect(() => assertExactTask105L05Invocation({ ...invocation, suite: "task-547" })).toThrow(
      SmokeError
    );
    expect(() =>
      assertExactTask105L05Invocation({ ...invocation, command: "help" as unknown as "run" })
    ).toThrow(SmokeError);
    expect(() => assertExactTask105L05Invocation(invocation)).not.toThrow();
  });

  test("resolves the canonical evidence directory inside the root", () => {
    const root = "/repo";
    expect(task105L05EvidenceDirectory(invocation, root)).toBe(
      resolveInsideRoot(
        root,
        `_docs/_workflows/_smoke/evidence/task-105/${SESSION}`,
        "task105_l05_evidence"
      )
    );
  });

  test("keeps the exclusive evidence-session policy and supported profiles", () => {
    expect(adapter.suiteId).toBe("task-105-l05");
    expect(adapter.evidenceSessionPolicy).toBe("exclusive");
    expect(adapter.supportedProfiles).toEqual(["fast", "certification"]);
    expect(typeof adapter.run).toBe("function");
  });
});

describe("TASK-105 L05 fixed-entry host", () => {
  test("derives a distinct policy with the fixed dynamic admin base", async () => {
    const adminBase = `/${SESSION}-admin`;
    const policy = deriveTask105L05HostPolicy(adminBase);
    expect(policy.id).toBe("task-105-l05-dev-host");
    expect(policy.fixed.VITE_ADMIN_BASE_PATH).toBe(`${adminBase}/`);
    expect(policy.required).toEqual(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.required);
    expect(policy.optional).toEqual(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.optional);
    expect(policy.fixed.PORT).toBe(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.fixed.PORT);
    expect(CODERSO_DEV_HOST_ENVIRONMENT_POLICY.fixed.VITE_ADMIN_BASE_PATH).toBeUndefined();
  });

  test("seals the dynamic base into the fixed Bun-entry capability and readiness probes", async () => {
    const adminBase = `/${SESSION}-admin`;
    const context = { input: invocation, root: process.cwd() } as never;
    const spec = createTask105L05HostSpec({
      context,
      adminBase,
      environment: { VITE_ADMIN_BASE_PATH: "/ambient-admin/" },
    });
    expect(spec.executable).toEqual({
      kind: "fixed-bun-entry",
      entry: TASK105_L05_FIXED_DEV_HOST_ENTRY,
    });
    expect(spec.args).toEqual([]);
    expect(spec.environment.policy.fixed.VITE_ADMIN_BASE_PATH).toBe(`${adminBase}/`);
    expect(spec.environment.source.VITE_ADMIN_BASE_PATH).toBe("/ambient-admin/");

    const requested: string[] = [];
    const probes = task105L05Readiness({
      adminBase,
      fetch: (async (url: string | URL) => {
        requested.push(String(url));
        return new Response(null, { status: 200 });
      }) as typeof fetch,
    });
    expect(await Promise.all(probes.map(({ check }) => check()))).toEqual([true, true, true, true]);
    expect(requested).toContain(`http://127.0.0.1:5173${adminBase}/`);
    expect(requested).toContain(`http://127.0.0.1:5173${adminBase}/api/auth/install/status`);
  });

  test("rejects legacy launcher selection and forbidden fixed-entry source forms", async () => {
    expect(() =>
      assertTask105L05FixedDevHostCapability({
        kind: "path-literal",
        name: "coderso-dev-core-host",
      })
    ).toThrow(SmokeError);

    const source = await readFile(resolve(process.cwd(), TASK105_L05_FIXED_DEV_HOST_ENTRY), "utf8");
    expect(() => assertTask105L05FixedDevHostSourceInventory(source)).not.toThrow();
    expect(() => assertTask105L05FixedDevHostSourceInventory(`${source}\nBun.spawn([])`)).toThrow();
    for (const forbidden of [
      "process.loadEnvFile()",
      "process . loadEnvFile ( )",
      "Bun.spawnSync([])",
      "Bun . spawnSync ( [] )",
      "Bun.$`echo unsafe`",
      "Bun . $ `echo unsafe`",
    ]) {
      expect(() =>
        assertTask105L05FixedDevHostSourceInventory(`${source}\n${forbidden}`)
      ).toThrow();
    }
  });

  test("rejects invalid capability input before it can start a child", async () => {
    let starts = 0;
    expect(() =>
      startTask105L05DevHost({ input: invocation, root: process.cwd() } as never, {
        adminBase: "/admin",
        start: async () => {
          starts += 1;
          return {} as never;
        },
      })
    ).toThrow(SmokeError);
    expect(starts).toBe(0);
  });

  test("default openPageDrivers seam validates the context fail-closed before any dispatch", async () => {
    await expect(
      defaultTask105L05RunSeams.openPageDrivers({} as never, `/${SESSION}-admin`)
    ).rejects.toThrow(SmokeError);
  });
});

describe("TASK-105 L05 page observer bootstrap semantics", () => {
  test("seals after the exact five bootstrap facts and records one epoch", () => {
    const observer = new Task105L05PageObserver();
    expect(observer.isSealed()).toBe(false);
    seedBootstrap(observer);
    expect(observer.isSealed()).toBe(true);
    expect(observer.epochCount()).toBe(1);
  });

  test("aggregates only exact semantic success status and rejects alternate status", () => {
    const observer = new Task105L05PageObserver();
    seedSemantic(observer);
    seedBootstrap(observer);
    observer.observeResponse({ endpointId: "dashboard-layout-read", method: "GET", status: 200 });
    expect(() =>
      observer.observeResponse({ endpointId: "dashboard-layout-read", method: "GET", status: 204 })
    ).toThrow(SmokeError);
    const receipt = observer.produceReceipt(scenarioIds);
    expect(receipt.semanticFacts).toEqual(
      expect.arrayContaining([
        { endpointId: "dashboard-layout-read", method: "GET", status: 200, count: 2 },
      ])
    );
    expect(receipt.authFactTotal).toBe(2);
  });

  test("supports exactly one controlled second bootstrap epoch", () => {
    const observer = new Task105L05PageObserver();
    seedBootstrap(observer);
    observer.observeResponse({ endpointId: "dashboard-layout-read", method: "GET", status: 200 });
    observer.beginNextBootstrapEpoch();
    expect(() => observer.beginNextBootstrapEpoch()).toThrow(SmokeError);
    seedBootstrap(observer);
    expect(observer.epochCount()).toBe(2);
    expect(observer.produceReceipt(scenarioIds).bootstrapEpochs).toHaveLength(2);
  });

  test("fails immediately on unknown or forbidden traffic", () => {
    const observer = new Task105L05PageObserver();
    expect(() =>
      observer.observeResponse({ endpointId: "unknown-endpoint", method: "GET", status: 200 })
    ).toThrow(SmokeError);
    expect(() =>
      observer.observeResponse({ endpointId: "solution-kits/apply", method: "POST", status: 200 })
    ).toThrow(/forbids/u);
    seedBootstrap(observer);
    expect(() =>
      observer.observeResponse({ endpointId: "unknown-endpoint", method: "GET", status: 200 })
    ).toThrow(SmokeError);
  });

  test("rejects nonzero console/page errors in the receipt", () => {
    const observer = new Task105L05PageObserver();
    seedBootstrap(observer);
    observer.observeConsoleError();
    expect(() => observer.produceReceipt(scenarioIds)).toThrow();
  });
});

describe("TASK-105 L05 injected browser observer lifecycle", () => {
  test("restores page-local wrappers and proves retained init scripts inert after final navigation", async () => {
    const { dispatcher, observer, resource } = observerFixture();
    const page = new ObserverPageHarness();
    const pageB = new ObserverPageHarness();
    dispatcher.pages.set(1, page);
    dispatcher.pages.set(2, pageB);
    await observer.install({ tabIndex: 1, segmentId: "a", adminBase: `/${SESSION}-admin` });
    const activeScope = page.scope;
    const activeBaseline = page.baseline;
    await activeScope.fetch(`/${SESSION}-admin/api/solution-kits`);
    await activeScope.fetch(`/${SESSION}-admin/api/solution-kits`);
    await activeScope.fetch(`/${SESSION}-admin/api/solution-kits/automotive-workshop`);
    await activeScope.fetch(`/${SESSION}-admin/api/solution-kits/runs`);
    await activeScope.fetch(`/${SESSION}-admin/api/dashboard`);
    await activeScope.fetch(`/${SESSION}-admin/api/dashboard/widget-data`, { method: "POST" });
    await activeScope.fetch("/api/not-an-admin-route");
    await activeScope.fetch(`https://outside.invalid/${SESSION}-admin/api/dashboard`);
    await activeScope.fetch(
      new URL(
        `/${SESSION}-admin/api/solution-kits/automotive-workshop/apply`,
        activeScope.location.origin
      ),
      { method: "POST" }
    );
    const facts = activeScope.__L05_FACTS;
    expect(Array.isArray(facts)).toBe(true);
    expect(
      (facts as ReadonlyArray<Readonly<{ endpointId: string }>>).map(({ endpointId }) => endpointId)
    ).toEqual([
      "solution-kits-list",
      "solution-kits-read",
      "solution-kit-detail",
      "unknown",
      "dashboard-layout-read",
      "dashboard-layout-write",
      "unknown",
      "unknown",
      "forbidden:apply",
    ]);
    const xhr = new activeScope.XMLHttpRequest();
    xhr.open("GET", "/task105-fast-r1-admin/api/settings");
    xhr.send();
    expect(snapshotObserverDescriptors(activeScope)).not.toEqual(activeBaseline);
    expect(activeScope.events.get("error")?.size).toBe(1);
    expect(activeScope.events.get("unhandledrejection")?.size).toBe(1);
    expect(xhr.listenerCount("load")).toBe(1);
    await observer.install({ tabIndex: 2, segmentId: "b", adminBase: `/${SESSION}-admin` });
    const activeScopeB = pageB.scope;
    const activeBaselineB = pageB.baseline;

    await resource.close();

    expect(dispatcher.calls.map(({ actionId, tabIndex }) => `${actionId}:${tabIndex}`)).toEqual([
      "install_observer:1",
      "install_observer:2",
      "dispose_observer:2",
      "prove_observer_inert:2",
      "dispose_observer:1",
      "prove_observer_inert:1",
    ]);
    const install = dispatcher.calls[0]?.body ?? "";
    const dispose = dispatcher.calls[2]?.body ?? "";
    const inert = dispatcher.calls[3]?.body ?? "";
    expect(install).toContain("window.name");
    expect(install).toContain("Object.getOwnPropertyDescriptor");
    expect(install).toContain('scope.removeEventListener("error", onError)');
    expect(dispose).toContain("state.restore()");
    expect(dispose).toContain("delete scope.__L05_FACTS");
    expect(inert).toContain('page.goto("about:blank")');
    expect(inert).toContain('!Object.hasOwn(scope, "__L05_OBSERVER_STATE")');
    expect(snapshotObserverDescriptors(activeScope)).toEqual(activeBaseline);
    expect(activeScope.events.get("error")?.size ?? 0).toBe(0);
    expect(activeScope.events.get("unhandledrejection")?.size ?? 0).toBe(0);
    expect(xhr.listenerCount("load")).toBe(0);
    expect(Object.hasOwn(activeScope, "__L05_FACTS")).toBe(false);
    expect(Object.hasOwn(activeScope, "__L05_COUNTS")).toBe(false);
    expect(Object.hasOwn(activeScope, "__L05_OBSERVER_STATE")).toBe(false);
    expect(activeScope.name).toBe("ambient-window-name");
    expect(Object.hasOwn(page.scope, "__L05_OBSERVER_STATE")).toBe(false);
    expect(Object.hasOwn(page.scope, "__L05_FACTS")).toBe(false);
    expect(page.scope.name).toBe("ambient-window-name");
    expect(snapshotObserverDescriptors(activeScopeB)).toEqual(activeBaselineB);
    expect(Object.hasOwn(activeScopeB, "__L05_OBSERVER_STATE")).toBe(false);
    expect(Object.hasOwn(pageB.scope, "__L05_OBSERVER_STATE")).toBe(false);
    expect(pageB.scope.name).toBe("ambient-window-name");
    expect(observer.isDisposed()).toBe(true);
    expect(await resource.proveAbsent()).toBe(true);
    expect(dispatcher.closed).toBe(1);
    expect(dispatcher.proveAbsentCalls).toBe(1);
  });

  test("runs restoration in the lifecycle finalizer when a scenario action throws", async () => {
    const { dispatcher, observer, resource } = observerFixture();
    dispatcher.page = new ObserverPageHarness();
    await observer.install({ tabIndex: 1, segmentId: "a", adminBase: `/${SESSION}-admin` });

    await expect(
      (async () => {
        try {
          throw new Error("scenario action failed");
        } finally {
          await resource.close();
        }
      })()
    ).rejects.toThrow("scenario action failed");

    expect(dispatcher.calls.map(({ actionId }) => actionId)).toEqual([
      "install_observer",
      "dispose_observer",
      "prove_observer_inert",
    ]);
    expect(observer.isDisposed()).toBe(true);
    expect(dispatcher.closed).toBe(1);
  });

  test("still closes the CLI when restoration rejects invalid bounded output", async () => {
    const { dispatcher, observer, resource } = observerFixture();
    dispatcher.failDispose = true;
    await observer.install({ tabIndex: 1, segmentId: "a", adminBase: `/${SESSION}-admin` });

    await expect(resource.close()).rejects.toThrow("bounded output is invalid");

    expect(dispatcher.closed).toBe(1);
    expect(dispatcher.calls.map(({ actionId }) => actionId)).toEqual([
      "install_observer",
      "dispose_observer",
    ]);
  });
});

describe("TASK-105 L05 receipt contracts", () => {
  function receipt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      scenarioIds: [...scenarioIds],
      consoleErrorCount: 0,
      pageErrorCount: 0,
      bootstrapEpochs: [
        { facts: TASK105_L05_BOOTSTRAP_ENDPOINTS.map((fact) => ({ ...fact, count: 1 })) },
      ],
      semanticFacts: [
        { endpointId: "dashboard-layout-read", method: "GET", status: 200, count: 1 },
      ],
      authFactTotal: 2,
      ...overrides,
    };
  }

  test("rejects unsafe raw URL/path fields and duplicate status-sensitive facts", () => {
    expect(() => validateTask105L05BrowserReceipt(receipt({ raw: "/secret" }))).toThrow();
    expect(() => validateTask105L05BrowserReceipt(receipt({ href: "http://secret" }))).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipt(
        receipt({
          semanticFacts: [
            { endpointId: "dashboard-layout-read", method: "GET", status: 200, count: 1 },
            { endpointId: "dashboard-layout-read", method: "GET", status: 200, count: 1 },
          ],
        })
      )
    ).toThrow();
  });

  test("rejects synthetic GET modeling for a semantic write", () => {
    expect(() =>
      validateTask105L05BrowserReceipt(
        receipt({
          semanticFacts: [
            { endpointId: "dashboard-layout-write", method: "GET", status: 200, count: 1 },
          ],
        })
      )
    ).toThrow();
  });

  test("requires Page A two epochs, Page B one epoch, and combined auth budget", () => {
    const a = receipt({
      bootstrapEpochs: [
        { facts: TASK105_L05_BOOTSTRAP_ENDPOINTS.map((fact) => ({ ...fact, count: 1 })) },
        { facts: TASK105_L05_BOOTSTRAP_ENDPOINTS.map((fact) => ({ ...fact, count: 1 })) },
      ],
      authFactTotal: 4,
    });
    const b = receipt({ authFactTotal: 2 });
    expect(() => validateTask105L05BrowserReceipts({ receiptA: a, receiptB: b })).not.toThrow();
    expect(() => validateTask105L05BrowserReceipts({ receiptA: receipt(), receiptB: b })).toThrow();
    expect(() =>
      validateTask105L05BrowserReceipts({ receiptA: a, receiptB: { ...b, authFactTotal: 8 } })
    ).toThrow();
  });
});

describe("TASK-105 L05 segment execution", () => {
  test("requires Page A sealed bootstrap before executing flows", async () => {
    const driver = new FiniteDriver(new Task105L05PageObserver());
    await expect(
      executeTask105L05Segments({
        pageA: makeContext(driver),
        openPageB: async () => makeContext(driver),
        bindUiMenuId: () => undefined,
        claimSiteShellRows: async () => undefined,
      })
    ).rejects.toThrow(/bootstrap/u);
    expect(driver.calls).toEqual([]);
  });

  test("executes the finite two-tab flow and binds the UI-created menu once", async () => {
    const observerA = new Task105L05PageObserver();
    seedSemantic(observerA);
    seedBootstrap(observerA);
    const observerB = new Task105L05PageObserver();
    seedSemantic(observerB, "dashboard-layout-read");
    seedBootstrap(observerB);
    const driverA = new FiniteDriver(observerA);
    const driverB = new FiniteDriver(observerB);
    let opened = 0;
    let boundMenu = "";
    let claimedMenu = "";
    const result = await executeTask105L05Segments({
      pageA: makeContext(driverA, observerA),
      openPageB: async () => {
        opened += 1;
        return makeContext(driverB, observerB);
      },
      bindUiMenuId: (menuId) => {
        boundMenu = menuId;
      },
      claimSiteShellRows: async (menuId) => {
        claimedMenu = menuId;
      },
    });
    expect(opened).toBe(1);
    expect(boundMenu).toBe("ui-created-menu");
    expect(claimedMenu).toBe(boundMenu);
    expect(result.createdMenuId).toBe(boundMenu);
    expect(result.receiptA.scenarioIds).toEqual(scenarioIds);
    expect(result.receiptA.bootstrapEpochs).toHaveLength(2);
    expect(result.receiptB.bootstrapEpochs).toHaveLength(1);
    expect(driverA.calls).toContain("dirty-draft");
    expect(driverB.calls).toContain("remote-save");
    expect(driverA.calls).toContain("stale-proof");
    expect(driverA.calls.indexOf("dirty-draft")).toBeLessThan(driverA.calls.indexOf("stale-proof"));
    expect(driverA.calls).not.toContain("remote-save");
    expect(driverB.calls).not.toContain("dirty-draft");
    expect(driverB.calls).not.toContain("stale-proof");
    expect(driverB.calls).not.toContain("dashboard-reload");
  });
});

describe("adapter run with mocked seams", () => {
  test("projects only the complete real visible evidence and one archived screenshot per scenario", () => {
    const facts = {
      "menu-structure-save-publish-parity": [
        "public",
        "dom-state",
        "public-navigation",
        "fixture-link",
        "true",
      ],
      "menu-design-appearance-visible-effect": [
        "admin",
        "computed-style",
        "menu-navigation",
        "font-size",
        "20px",
      ],
      "dashboard-edit-configure-save": [
        "admin",
        "geometry",
        "quick-actions",
        "wide-layout",
        "true",
      ],
      "dashboard-dirty-remote-stale": [
        "admin",
        "dom-state",
        "dashboard-draft",
        "stale-draft",
        "true",
      ],
      "solution-kit-select-reviewed-handoff": [
        "admin",
        "dom-state",
        "reviewed-guide",
        "reviewed-prompt",
        "true",
      ],
    } as const;
    const visible = TASK_105_L05_SCENARIO_DESCRIPTORS.map(
      (descriptor): Task105L05VisibleEvidence => {
        const [surface, kind, target, property, expected] = facts[descriptor.id];
        return {
          scenarioId: descriptor.id,
          surface,
          theme: descriptor.number === 3 ? "dark" : "light",
          viewport: descriptor.viewport,
          facts: [{ kind, target, property, expected, actual: expected, pass: true }],
        };
      }
    );
    const archived: readonly SmokeScreenshotResult[] = TASK_105_L05_SCENARIO_DESCRIPTORS.map(
      (descriptor) => ({
        path: `screenshots/fast-task105-fast-r1-${String(descriptor.number).padStart(2, "0")}-${descriptor.id}.png`,
        sha256: String(descriptor.number).repeat(64),
      })
    );
    const scenarios = buildTask105L05ManifestableScenarios(visible, archived);
    expect(scenarios).toHaveLength(5);
    expect(scenarios[0]).toMatchObject({
      id: "menu-structure-save-publish-parity",
      title: TASK_105_L05_SCENARIO_DESCRIPTORS[0]?.title,
      screenshots: [archived[0]],
    });
    expect(() => buildTask105L05ManifestableScenarios(visible.slice(1), archived)).toThrow(
      SmokeError
    );
    expect(() =>
      buildTask105L05ManifestableScenarios(visible, [
        { ...archived[0], path: "escape.png" },
        ...archived.slice(1),
      ])
    ).toThrow(SmokeError);
  });

  test("preflights before opening drivers", async () => {
    let preflighted = false;
    const context = {
      input: invocation,
      root: "/repo",
      lifecycle: { assertAccepting: () => undefined },
      repository: {
        snapshot: async () => ({ files: [] }),
        assertUnchanged: () => undefined,
      },
    } as never;
    await expect(
      runTask105L05Adapter(context, {
        preflightEnvFile: async () => {
          preflighted = true;
        },
        openPageDrivers: async () => {
          throw new Error("driver should not be opened by this seam test");
        },
      })
    ).rejects.toThrow("driver should not be opened");
    expect(preflighted).toBe(true);
  });
});
