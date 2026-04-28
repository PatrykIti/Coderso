import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  applySolutionKit,
  clearSolutionKitsCache,
  listSolutionKitRunsCached,
  listSolutionKits,
  listSolutionKitsCached,
  previewSolutionKitPlan,
} from "../../../core/admin/services/solutionKitsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("listSolutionKits hits GET /solution-kits", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearSolutionKitsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };

  try {
    await listSolutionKits();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/solution-kits");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
    clearSolutionKitsCache();
  }
});

test("listSolutionKitsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  clearSolutionKitsCache();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.solutionKitsList,
      JSON.stringify({
        value: [
          {
            id: "automotive-workshop",
            title: "Automotive Workshop",
            shortDescription: "Cached",
            recommendedModules: ["booking"],
            features: ["Feature"],
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listSolutionKitsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("automotive-workshop");
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
    clearSolutionKitsCache();
  }
});

test("previewSolutionKitPlan posts planner payload", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      recommendedKitId: "automotive-workshop",
      confidence: 88,
      recommendations: [],
      steps: [],
      settingsPatch: {},
      notes: [],
    });
  };

  try {
    await previewSolutionKitPlan({
      businessType: "automotive_workshop",
      goals: ["online_booking"],
      locale: "en",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/solution-kits/plan");
    expect(calls[0]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("listSolutionKitRunsCached reads from local storage", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({ items: [] });
  };
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.solutionKitRunsList("all"),
      JSON.stringify({
        value: [
          {
            id: "run-1",
            kitId: "automotive-workshop",
            mode: "apply",
            status: "success",
            actorId: null,
            rollbackOfRunId: null,
            options: {},
            summary: {
              total: 1,
              success: 1,
              failed: 0,
              planned: 0,
              skipped: 0,
              operations: {
                create: 1,
                update: 0,
                noop: 0,
                delete: 0,
                restore: 0,
              },
            },
            error: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          },
        ],
        savedAt: Date.now(),
      })
    );

    const items = await listSolutionKitRunsCached();
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("run-1");
    expect(calls).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("applySolutionKit posts payload to apply endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  resetCsrfToken();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ input, init });
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      run: {
        id: "run-apply",
        kitId: "automotive-workshop",
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: {},
        summary: {
          total: 1,
          success: 1,
          failed: 0,
          planned: 0,
          skipped: 0,
          operations: {
            create: 1,
            update: 0,
            noop: 0,
            delete: 0,
            restore: 0,
          },
        },
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      },
      items: [],
      summary: {
        total: 1,
        success: 1,
        failed: 0,
        planned: 0,
        skipped: 0,
        operations: {
          create: 1,
          update: 0,
          noop: 0,
          delete: 0,
          restore: 0,
        },
      },
    });
  };

  try {
    await applySolutionKit("automotive-workshop", {
      dryRun: false,
      continueOnError: true,
    });

    expect(calls).toHaveLength(2);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/solution-kits/automotive-workshop/apply");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});

test("applySolutionKit sends wizard plan payload when provided", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  resetCsrfToken();

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ input, init });
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      run: {
        id: "run-apply-2",
        kitId: "automotive-workshop",
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: {},
        summary: {
          total: 1,
          success: 1,
          failed: 0,
          planned: 0,
          skipped: 0,
          operations: {
            create: 1,
            update: 0,
            noop: 0,
            delete: 0,
            restore: 0,
          },
        },
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      },
      items: [],
      summary: {
        total: 1,
        success: 1,
        failed: 0,
        planned: 0,
        skipped: 0,
        operations: {
          create: 1,
          update: 0,
          noop: 0,
          delete: 0,
          restore: 0,
        },
      },
    });
  };

  try {
    await applySolutionKit("automotive-workshop", {
      dryRun: false,
      continueOnError: true,
      plan: {
        enabledStepIds: ["settings", "pages", "qa"],
        settingsPatch: { "site.locale": "pl" },
        notes: ["Wizard note"],
      },
    });

    expect(calls).toHaveLength(2);
    expect(calls[1]?.input).toBe("/admin/api/solution-kits/automotive-workshop/apply");
    const body = String(calls[1]?.init?.body ?? "");
    expect(body).toContain("\"enabledStepIds\":[\"settings\",\"pages\",\"qa\"]");
    expect(body).toContain("\"settingsPatch\":{\"site.locale\":\"pl\"}");
  } finally {
    resetCsrfToken();
    globalThis.fetch = originalFetch;
  }
});
