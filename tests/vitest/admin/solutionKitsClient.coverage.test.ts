import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  applySolutionKit,
  clearSolutionKitRunsCache,
  clearSolutionKitsCache,
  getCachedSolutionKits,
  getSolutionKit,
  getSolutionKitCached,
  getSolutionKitRun,
  getSolutionKitRunCached,
  listSolutionKits,
  listSolutionKitsCached,
  listSolutionKitRuns,
  listSolutionKitRunsCached,
  previewSolutionKitPlan,
  rollbackSolutionKit,
} from "../../../core/admin/services/solutionKitsClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const manifest = {
  id: "automotive-workshop",
  title: "Automotive Workshop",
  vertical: "automotive",
  includes: {
    contentTypes: ["vehicle"],
    entries: [],
    widgets: [],
    templates: [],
    forms: [],
    menus: [],
  },
  requiredModules: ["booking"],
  optionalModules: ["reviews"],
  postInstallTasks: ["seed-demo"],
};

const summary = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "automotive-workshop",
  title: "Automotive Workshop",
  shortDescription: "Run your workshop",
  recommendedModules: ["booking"],
  features: ["booking", "invoices"],
  manifest,
  ...overrides,
});

const definition = (overrides: Partial<Record<string, unknown>> = {}) => ({
  ...summary(),
  longDescription: "A full workshop site",
  businessTypes: ["automotive_workshop"],
  defaultGoals: ["online_booking"],
  resourceBlueprint: {
    pages: [{ slug: "home", title: "Home", status: "published" }],
    forms: [],
    contentTypes: [{ slug: "vehicle", name: "Vehicle" }],
    menus: [{ location: "primary", name: "Main" }],
  },
  ...overrides,
});

const runRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "run-1",
  kitId: "automotive-workshop",
  mode: "apply",
  status: "success",
  actorId: null,
  rollbackOfRunId: null,
  options: {},
  summary: {
    total: 2,
    success: 2,
    failed: 0,
    planned: 0,
    skipped: 0,
    operations: { create: 2, update: 0, noop: 0, delete: 0, restore: 0 },
  },
  error: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  finishedAt: "2026-02-18T00:00:01.000Z",
  ...overrides,
});

const itemRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "item-1",
  runId: "run-1",
  position: 0,
  resourceType: "content_type",
  resourceKey: "vehicle",
  operation: "create",
  status: "success",
  beforeSnapshot: null,
  afterSnapshot: null,
  rollbackAction: null,
  error: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const runDetail = (overrides: Partial<Record<string, unknown>> = {}) => ({
  run: runRecord(),
  items: [itemRecord()],
  ...overrides,
});

const installResult = (overrides: Partial<Record<string, unknown>> = {}) => ({
  run: runRecord(),
  items: [itemRecord()],
  summary: runRecord().summary,
  ...overrides,
});

const planOutput = (overrides: Partial<Record<string, unknown>> = {}) => ({
  recommendedKitId: "automotive-workshop",
  confidence: 0.9,
  recommendations: [{ kitId: "automotive-workshop", score: 0.9, reasons: ["booking"] }],
  steps: [{ id: "settings", type: "settings", title: "Settings", description: "Basics" }],
  settingsPatch: { theme: "dark" },
  notes: ["demo"],
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearSolutionKitsCache();
  clearSolutionKitRunsCache();
});

describe("solution kit cache helpers", () => {
  test("accepts the sixth ID in cached list and detail payloads", async () => {
    const localServiceSummary = summary({
      id: "local-service-business",
      title: "Local Service Business",
    });
    const localServiceDefinition = definition({
      id: "local-service-business",
      title: "Local Service Business",
    });

    writeLocalCache(cacheKeys.solutionKitsList, [localServiceSummary]);
    expect(getCachedSolutionKits()).toEqual([localServiceSummary]);
    writeLocalCache(cacheKeys.solutionKitDetail("local-service-business"), localServiceDefinition);
    await expect(getSolutionKitCached("local-service-business")).resolves.toEqual(
      localServiceDefinition
    );
  });

  test("rejects unknown IDs in cached list and detail payloads", async () => {
    writeLocalCache(cacheKeys.solutionKitsList, [summary({ id: "unknown-kit" })]);
    expect(getCachedSolutionKits()).toBeNull();
    writeLocalCache(
      cacheKeys.solutionKitDetail("local-service-business"),
      definition({ id: "unknown-kit" })
    );
    apiRequest.mockRejectedValueOnce(new Error("detail cache rejected"));
    await expect(getSolutionKitCached("local-service-business")).rejects.toThrow(
      "detail cache rejected"
    );
  });

  test("getCachedSolutionKits hydrates and returns null on miss", () => {
    expect(getCachedSolutionKits()).toBeNull();
    writeLocalCache(cacheKeys.solutionKitsList, [summary()]);
    expect(getCachedSolutionKits()).toEqual([summary()]);
    expect(getCachedSolutionKits()).toEqual([summary()]);
  });

  test("clearSolutionKitsCache drops the in-memory state and local key", () => {
    writeLocalCache(cacheKeys.solutionKitsList, [summary()]);
    getCachedSolutionKits();
    clearSolutionKitsCache();
    expect(getCachedSolutionKits()).toBeNull();
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitsList);
  });
});

describe("solution kit lists", () => {
  test("passes the sixth ID through accepted list and detail network responses", async () => {
    const localServiceSummary = summary({
      id: "local-service-business",
      title: "Local Service Business",
    });
    const localServiceDefinition = definition({
      id: "local-service-business",
      title: "Local Service Business",
    });
    apiRequest.mockResolvedValueOnce({ items: [localServiceSummary] });
    await expect(listSolutionKits()).resolves.toEqual([localServiceSummary]);
    apiRequest.mockResolvedValueOnce(localServiceDefinition);
    await expect(getSolutionKit("local-service-business")).resolves.toEqual(localServiceDefinition);
  });

  test("listSolutionKits issues GET and defaults missing items", async () => {
    apiRequest.mockResolvedValueOnce({});
    await expect(listSolutionKits()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/solution-kits", { method: "GET" });
  });

  test("listSolutionKitsCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.solutionKitsList, [summary()]);
    await expect(listSolutionKitsCached()).resolves.toEqual([summary()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearSolutionKitsCache();

    apiRequest.mockResolvedValueOnce({ items: [summary()] });
    const first = listSolutionKitsCached();
    const second = listSolutionKitsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[summary()], [summary()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitsList, [summary()]);

    apiRequest.mockResolvedValueOnce({ items: [summary({ title: "Fresh" })] });
    await expect(listSolutionKitsCached({ force: true })).resolves.toEqual([
      summary({ title: "Fresh" }),
    ]);
  });
});

describe("solution kit detail", () => {
  test("getSolutionKit fetches and writes the detail cache", async () => {
    apiRequest.mockResolvedValueOnce(definition());
    await expect(getSolutionKit("automotive-workshop")).resolves.toEqual(definition());
    expect(apiRequest).toHaveBeenCalledWith("/solution-kits/automotive-workshop", {
      method: "GET",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.solutionKitDetail("automotive-workshop"),
      definition()
    );
  });

  test("getSolutionKitCached reads the detail cache and falls back to fetch", async () => {
    writeLocalCache(cacheKeys.solutionKitDetail("automotive-workshop"), definition());
    await expect(getSolutionKitCached("automotive-workshop")).resolves.toEqual(definition());
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(definition({ title: "Remote" }));
    await expect(getSolutionKitCached("automotive-workshop", { force: true })).resolves.toEqual(
      definition({ title: "Remote" })
    );
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });
});

describe("solution kit plan preview", () => {
  test("previewSolutionKitPlan posts with no CSRF and validates the response", async () => {
    apiRequest.mockResolvedValueOnce(planOutput());
    await expect(
      previewSolutionKitPlan({
        businessType: "automotive_workshop",
        goals: ["online_booking"],
        locale: "pl",
      })
    ).resolves.toEqual(planOutput());
    expect(apiRequest).toHaveBeenCalledWith(
      "/solution-kits/plan",
      json({
        method: "POST",
        body: JSON.stringify({
          businessType: "automotive_workshop",
          goals: ["online_booking"],
          locale: "pl",
        }),
      }),
      { withCsrf: false }
    );
  });

  test("previewSolutionKitPlan rejects an invalid response shape", async () => {
    apiRequest.mockResolvedValueOnce({ recommendedKitId: "bogus" });
    await expect(
      previewSolutionKitPlan({ businessType: "custom", goals: [], locale: "pl" })
    ).rejects.toThrow("Invalid solution kit plan response");
  });

  test("accepts the sixth recommended ID and rejects unknown recommended IDs", async () => {
    const localServicePlan = planOutput({
      recommendedKitId: "local-service-business",
      recommendations: [
        { kitId: "local-service-business", score: 0.9, reasons: ["local services"] },
      ],
    });
    apiRequest.mockResolvedValueOnce(localServicePlan);
    await expect(
      previewSolutionKitPlan({ businessType: "custom", goals: [], locale: "pl" })
    ).resolves.toEqual(localServicePlan);
    apiRequest.mockResolvedValueOnce(planOutput({ recommendedKitId: "unknown-kit" }));
    await expect(
      previewSolutionKitPlan({ businessType: "custom", goals: [], locale: "pl" })
    ).rejects.toThrow("Invalid solution kit plan response");
  });
});

describe("solution kit runs", () => {
  test("listSolutionKitRuns builds query params", async () => {
    apiRequest.mockResolvedValueOnce({ items: [runRecord()] });
    await expect(
      listSolutionKitRuns({ kitId: "medical-clinic", mode: "apply", limit: 10 })
    ).resolves.toEqual([runRecord()]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/solution-kits/runs?kitId=medical-clinic&mode=apply&limit=10",
      { method: "GET" }
    );

    apiRequest.mockResolvedValueOnce({});
    await expect(listSolutionKitRuns()).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/solution-kits/runs", { method: "GET" });
  });

  test("listSolutionKitRunsCached hits the runs list cache", async () => {
    writeLocalCache(cacheKeys.solutionKitRunsList("medical-clinic"), [runRecord()]);
    await expect(listSolutionKitRunsCached({ kitId: "medical-clinic" })).resolves.toEqual([
      runRecord(),
    ]);
    expect(apiRequest).not.toHaveBeenCalled();
  });

  test("listSolutionKitRunsCached shares the in-flight promise", async () => {
    apiRequest.mockResolvedValueOnce({ items: [runRecord()] });
    const first = listSolutionKitRunsCached({ kitId: "medical-clinic" });
    const second = listSolutionKitRunsCached({ kitId: "medical-clinic" });
    await expect(Promise.all([first, second])).resolves.toEqual([[runRecord()], [runRecord()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitRunsList("medical-clinic"), [
      runRecord(),
    ]);
  });

  test("listSolutionKitRunsCached primes the all-runs cache for unqualified reads", async () => {
    apiRequest.mockResolvedValueOnce({ items: [runRecord()] });
    await expect(listSolutionKitRunsCached()).resolves.toEqual([runRecord()]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitRunsList("all"), [
      runRecord(),
    ]);
  });

  test("listSolutionKitRunsCached with mode or limit bypasses the list cache", async () => {
    writeLocalCache(cacheKeys.solutionKitRunsList("all"), [runRecord()]);
    apiRequest.mockResolvedValueOnce({ items: [runRecord({ id: "run-2" })] });
    await expect(listSolutionKitRunsCached({ mode: "rollback" })).resolves.toEqual([
      runRecord({ id: "run-2" }),
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("getSolutionKitRun fetches, validates and writes the run detail cache", async () => {
    apiRequest.mockResolvedValueOnce(runDetail());
    await expect(getSolutionKitRun("run-1")).resolves.toEqual(runDetail());
    expect(apiRequest).toHaveBeenCalledWith("/solution-kits/runs/run-1", { method: "GET" });
    expect(writeLocalCache).toHaveBeenCalledWith(
      cacheKeys.solutionKitRunDetail("run-1"),
      runDetail()
    );
  });

  test("getSolutionKitRun rejects an invalid response shape", async () => {
    apiRequest.mockResolvedValueOnce({ run: { id: 1 } });
    await expect(getSolutionKitRun("run-1")).rejects.toThrow("Invalid solution kit run response");
  });

  test("getSolutionKitRunCached reads the detail cache and falls back to fetch", async () => {
    writeLocalCache(cacheKeys.solutionKitRunDetail("run-1"), runDetail());
    await expect(getSolutionKitRunCached("run-1")).resolves.toEqual(runDetail());
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce(runDetail({ run: runRecord({ id: "run-2" }) }));
    await expect(getSolutionKitRunCached("run-1", { force: true })).resolves.toEqual(
      runDetail({ run: runRecord({ id: "run-2" }) })
    );
  });

  test("clearSolutionKitRunsCache clears one family or all promises", async () => {
    writeLocalCache(cacheKeys.solutionKitRunsList("medical-clinic"), [runRecord()]);
    clearSolutionKitRunsCache("medical-clinic");
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitRunsList("medical-clinic"));

    clearSolutionKitRunsCache();
    expect(clearLocalCache).not.toHaveBeenCalledWith(cacheKeys.solutionKitRunsList("all"));
  });
});

describe("apply and rollback", () => {
  test("applySolutionKit posts, validates, caches and invalidates the runs family", async () => {
    apiRequest.mockResolvedValueOnce(installResult());
    await expect(applySolutionKit("automotive-workshop", { dryRun: true })).resolves.toEqual(
      installResult()
    );
    expect(apiRequest).toHaveBeenCalledWith(
      "/solution-kits/automotive-workshop/apply",
      json({ method: "POST", body: JSON.stringify({ dryRun: true }) }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitRunDetail("run-1"), {
      run: runRecord(),
      items: [itemRecord()],
    });
    expect(clearLocalCache).toHaveBeenCalledWith(
      cacheKeys.solutionKitRunsList("automotive-workshop")
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.solutionKitRunsList("automotive-workshop"),
      action: "invalidate",
    });
  });

  test("applySolutionKit with an invalid payload rejects", async () => {
    apiRequest.mockResolvedValueOnce({ run: null });
    await expect(applySolutionKit("automotive-workshop")).rejects.toThrow(
      "Invalid solution kit install response"
    );
  });

  test("rollbackSolutionKit posts, validates, caches and invalidates the runs family", async () => {
    apiRequest.mockResolvedValueOnce(installResult({ run: runRecord({ mode: "rollback" }) }));
    await expect(
      rollbackSolutionKit("automotive-workshop", { sourceRunId: "run-1" })
    ).resolves.toEqual(installResult({ run: runRecord({ mode: "rollback" }) }));
    expect(apiRequest).toHaveBeenCalledWith(
      "/solution-kits/automotive-workshop/rollback",
      json({ method: "POST", body: JSON.stringify({ sourceRunId: "run-1" }) }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.solutionKitRunDetail("run-1"), {
      run: runRecord({ mode: "rollback" }),
      items: [itemRecord()],
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.solutionKitRunsList("automotive-workshop"),
      action: "invalidate",
    });
  });
});
