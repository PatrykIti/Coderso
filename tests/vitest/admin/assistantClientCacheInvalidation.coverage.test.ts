import { expect, test } from "vitest";

import {
  dryRunAssistantActions,
  executeAssistantActions,
  getAssistantModelMetadata,
  getAssistantStatus,
  invalidateAssistantStatusCache,
  planAssistantActions,
} from "../../../core/admin/services/assistantClient";
import { registerCustomScreensCacheInvalidator } from "../../../core/admin/services/customScreensCache";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("executeAssistantActions treats media reference and site-kit actions as cache no-ops", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storageWrites: string[] = [];
  const storage = {
    getItem: () => null,
    setItem: (_key: string, value: string) => {
      storageWrites.push(value);
    },
    removeItem: () => undefined,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  const result = {
    plan: {
      id: "plan-noop",
      status: "ready",
      intentId: "cache-noop",
      title: "No-op actions",
      answer: "Plan ready",
      summary: "No cache invalidation.",
      confidence: 0.8,
      assumptions: [],
      questions: [],
      actions: [],
    } satisfies AssistantActionPlan,
    results: [
      {
        actionId: "media-attach-logo",
        type: "media.reference.attach",
        targetType: "media",
        targetKey: "logo",
        operation: "attach",
        status: "success",
        resourceId: "logo",
        adminHref: null,
        publicHref: null,
        message: "Attached media reference.",
      },
      {
        actionId: "site-kit-install-analytics",
        type: "site-kit.install",
        targetType: "site-kit",
        targetKey: "analytics",
        operation: "install",
        status: "success",
        resourceId: null,
        adminHref: null,
        publicHref: null,
        message: "Installed site kit.",
      },
      {
        actionId: "route-upsert-home",
        type: "setting.content-route.upsert",
        targetType: "setting",
        targetKey: "home",
        operation: "upsert",
        status: "success",
        resourceId: null,
        adminHref: null,
        publicHref: null,
        message: "Upserted content route.",
      },
    ],
    summary: { create: 0, update: 0, delete: 0, noop: 0, failed: 0 },
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(result);
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: result.plan,
      idempotencyKey: "assistant-cache-noop-1",
    });
    expect(storageWrites).toHaveLength(0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("executeAssistantActions resolves the menu id from the result target key", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storageWrites: string[] = [];
  const storage = {
    getItem: () => null,
    setItem: (_key: string, value: string) => {
      storageWrites.push(value);
    },
    removeItem: () => undefined,
  };

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  const result = {
    plan: {
      id: "plan-menu-item",
      status: "ready",
      intentId: "menu-item",
      title: "Update menu item",
      answer: "Plan ready",
      summary: "Update menu item.",
      confidence: 0.8,
      assumptions: [],
      questions: [],
      actions: [],
    } satisfies AssistantActionPlan,
    results: [
      {
        actionId: "menu-item-update-with-key",
        type: "menu.item.update",
        targetType: "menu-item",
        targetKey: "menu-primary/products",
        operation: "update",
        status: "success",
        resourceId: "menu-products",
        adminHref: "/admin/menus",
        publicHref: null,
        message: "Menu updated.",
      },
      {
        actionId: "menu-item-update-no-key",
        type: "menu.item.update",
        targetType: "menu-item",
        targetKey: null,
        operation: "update",
        status: "success",
        resourceId: "menu-products",
        adminHref: "/admin/menus",
        publicHref: null,
        message: "Menu updated.",
      },
    ],
    summary: { create: 0, update: 2, delete: 0, noop: 0, failed: 0 },
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse(result);
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: result.plan,
      idempotencyKey: "assistant-menu-item-1",
    });

    const events = storageWrites.map(
      (value) => JSON.parse(value) as { key: string; action: string }
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.menusList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.menuDetail("menu-primary"),
          action: "update",
        }),
      ])
    );
    // The result without a target key only updates the list, not a detail.
    // Storage writes are doubled (local + remote mirror), so dedupe first.
    const uniqueEvents = events.filter(
      (event, index) =>
        events.findIndex((other) => other.key === event.key && other.action === event.action) ===
        index
    );
    expect(
      uniqueEvents.filter((event) => event.key === cacheKeys.menuDetail("menu-primary")).length
    ).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalBroadcast === undefined) {
      delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
    } else {
      (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel = originalBroadcast;
    }
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("covers assistant status invalidation plus model-metadata, plan and dry-run wrappers", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const statusBody = {
    enabled: true,
    defaultMode: "docs-only",
    retrievalBackend: "db",
    llmAvailable: true,
    indexReady: true,
    indexBuilding: false,
    indexError: null,
    lastReindexAt: "2026-08-01T00:00:00.000Z",
    docCount: 12,
    chunkCount: 340,
  };
  const metadataBody = {
    provider: "openai",
    model: "gpt-4o",
    available: true,
    maxOutputTokens: 4096,
    supportedParameters: ["temperature"],
    source: "provider",
  };
  const planBody = {
    id: "plan-1",
    status: "ready",
    intentId: "intent-1",
    title: "Build home",
    answer: "Plan ready.",
    summary: "Plan summary.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [],
  } satisfies AssistantActionPlan;
  const dryRunBody = {
    plan: planBody,
    summary: { create: 0, update: 0, delete: 0, noop: 0, failed: 0 },
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/assistant/status")) {
      return jsonResponse(statusBody);
    }
    if (url.endsWith("/assistant/model-metadata")) {
      return jsonResponse(metadataBody);
    }
    if (url.endsWith("/assistant/actions/plan")) {
      return jsonResponse(planBody);
    }
    if (url.endsWith("/assistant/actions/dry-run")) {
      return jsonResponse(dryRunBody);
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    resetCsrfToken();
    invalidateAssistantStatusCache();
    await getAssistantStatus();
    invalidateAssistantStatusCache();
    const refreshed = await getAssistantStatus();
    expect(refreshed).toEqual(statusBody);
    expect(calls.filter((call) => call.url.endsWith("/assistant/status")).length).toBe(2);

    const metadata = await getAssistantModelMetadata({
      provider: "openai",
      model: "gpt-4o",
    });
    expect(metadata).toEqual(metadataBody);

    const plan = await planAssistantActions({ prompt: "Build a home page" });
    expect(plan).toEqual(planBody);

    const dryRun = await dryRunAssistantActions({ plan: planBody });
    expect(dryRun).toEqual(dryRunBody);

    const metadataCall = calls.find((call) => call.url.endsWith("/assistant/model-metadata"));
    const metadataHeaders = metadataCall?.init?.headers as Headers;
    expect(metadataCall?.init?.method).toBe("POST");
    expect(metadataHeaders.get("content-type")).toBe("application/json");
    expect(metadataHeaders.get("x-csrf-token")).toBe("csrf-token");
    expect(JSON.parse(String(metadataCall?.init?.body))).toEqual({
      provider: "openai",
      model: "gpt-4o",
    });

    for (const path of ["/assistant/actions/plan", "/assistant/actions/dry-run"]) {
      const call = calls.find((c) => c.url.endsWith(path));
      const headers = call?.init?.headers as Headers;
      expect(call?.init?.method).toBe("POST");
      expect(headers.get("content-type")).toBe("application/json");
      expect(headers.get("x-csrf-token")).toBe("csrf-token");
      expect(JSON.parse(String(call?.init?.body))).toBeTruthy();
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
