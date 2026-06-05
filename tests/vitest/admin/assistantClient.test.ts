import { expect, test } from "vitest";

import {
  dryRunAssistantActions,
  executeAssistantActions,
  executeAssistantSiteKitActions,
  getAssistantModelMetadata,
  getAssistantStatus,
  planAssistantActions,
  planAssistantSiteKitActions,
  reindexAssistantDocs,
  sendAssistantMessage,
} from "../../../core/admin/services/assistantClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import type { AssistantActionPlan } from "../../../core/services/assistant/actionPlanTypes";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("getAssistantStatus hits GET /assistant/status", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      enabled: true,
      defaultMode: "docs-only",
      retrievalBackend: "db",
      llmAvailable: false,
      indexReady: true,
      indexBuilding: false,
      indexError: null,
      lastReindexAt: null,
      docCount: 12,
      chunkCount: 80,
    });
  };

  try {
    await getAssistantStatus();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/assistant/status");
    expect(calls[0]?.init?.method).toBe("GET");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAssistantModelMetadata uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      model: "openai/gpt-5.4-nano",
      maxInputTokens: 128000,
      maxOutputTokens: 8192,
      supportedParameters: ["max_tokens"],
      source: "provider",
    });
  };

  try {
    resetCsrfToken();
    const result = await getAssistantModelMetadata({
      provider: "openrouter",
      model: "openai/gpt-5.4-nano",
    });

    expect(result.maxInputTokens).toBe(128000);
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/model-metadata");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("planAssistantActions uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "plan-house-projects-catalog",
      status: "ready",
      intentId: "house-projects-catalog",
      title: "House Projects Catalog",
      answer: "Plan ready",
      summary: "Plan summary",
      confidence: 0.9,
      assumptions: [],
      questions: [],
      actions: [],
    });
  };

  try {
    resetCsrfToken();
    await planAssistantActions({
      prompt: "potrzebuje katalogu projektow domow",
      context: { page: "/admin/advanced/widgets" },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dryRunAssistantActions uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      changes: [],
      warnings: [],
      readyToExecute: true,
    });
  };

  try {
    resetCsrfToken();
    await dryRunAssistantActions({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/dry-run");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantActions uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-house-projects-catalog",
          status: "ready",
          intentId: "house-projects-catalog",
          title: "House Projects Catalog",
          answer: "Plan ready",
          summary: "Plan summary",
          confidence: 0.9,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [],
      summary: {
        create: 0,
        update: 0,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-house-projects-catalog",
        status: "ready",
        intentId: "house-projects-catalog",
        title: "House Projects Catalog",
        answer: "Plan ready",
        summary: "Plan summary",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-action-1",
    });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/execute");
    expect(calls[1]?.init?.method).toBe("POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantActions invalidates custom screen caches after successful delete", async () => {
  const originalFetch = globalThis.fetch;
  const originalBroadcast = (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
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

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      plan: {
        id: "plan-custom-screen-delete",
        status: "ready",
        intentId: "custom-screen-delete",
        title: "Delete House Projects",
        answer: "Plan ready",
        summary: "Delete custom screen.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-custom-screen-delete",
          status: "ready",
          intentId: "custom-screen-delete",
          title: "Delete House Projects",
          answer: "Plan ready",
          summary: "Delete custom screen.",
          confidence: 0.78,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "custom-screen-delete-screen-house",
          type: "custom-screen.delete",
          targetType: "custom-screen",
          targetKey: "House Projects",
          operation: "delete",
          status: "success",
          resourceId: "screen-house",
          adminHref: "/admin/advanced/custom-screens",
          publicHref: null,
          message: "Deleted custom screen.",
        },
      ],
      summary: {
        create: 0,
        update: 0,
        delete: 1,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-custom-screen-delete",
        status: "ready",
        intentId: "custom-screen-delete",
        title: "Delete House Projects",
        answer: "Plan ready",
        summary: "Delete custom screen.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-custom-screen-delete-1",
    });

    const events = storageWrites.map(
      (value) => JSON.parse(value) as { key: string; action: string }
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: cacheKeys.customScreensList,
          action: "invalidate",
        }),
        expect.objectContaining({
          key: cacheKeys.customScreenDetail("screen-house"),
          action: "invalidate",
        }),
      ])
    );
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

test("executeAssistantActions invalidates page caches after successful delete", async () => {
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
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse({
      plan: {
        id: "plan-page-delete",
        status: "ready",
        intentId: "page-delete",
        title: "Delete page",
        answer: "Plan ready",
        summary: "Delete page.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      preview: {
        plan: {
          id: "plan-page-delete",
          status: "ready",
          intentId: "page-delete",
          title: "Delete page",
          answer: "Plan ready",
          summary: "Delete page.",
          confidence: 0.78,
          assumptions: [],
          questions: [],
          actions: [],
        },
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "page-delete-page-1",
          type: "page.delete",
          targetType: "page",
          targetKey: "/projekty-domow-a3afbe30",
          operation: "delete",
          status: "success",
          resourceId: "page-1",
          adminHref: "/admin/pages",
          publicHref: null,
          message: "Deleted page.",
        },
      ],
      summary: { create: 0, update: 0, delete: 1, noop: 0, failed: 0 },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan: {
        id: "plan-page-delete",
        status: "ready",
        intentId: "page-delete",
        title: "Delete page",
        answer: "Plan ready",
        summary: "Delete page.",
        confidence: 0.78,
        assumptions: [],
        questions: [],
        actions: [],
      },
      idempotencyKey: "assistant-page-delete-1",
    });

    const events = storageWrites.map(
      (value) => JSON.parse(value) as { key: string; action: string }
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.pagesList, action: "invalidate" }),
        expect.objectContaining({ key: cacheKeys.pageDetail("page-1"), action: "invalidate" }),
      ])
    );
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

test("executeAssistantActions broadcasts cache events for supported CMS action families", async () => {
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
  const plan = {
    id: "plan-cache-matrix",
    status: "ready",
    intentId: "cache-matrix",
    title: "Cache matrix",
    answer: "Plan ready",
    summary: "Mutate CMS resources.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "content-type-delete-products",
        type: "content-type.delete",
        title: "Delete Products",
        description: "Delete content type.",
        input: { id: "ct-products", name: "Products", slug: "products", expectedEntryCount: 0 },
      },
      {
        id: "entry-update-products-1",
        type: "entry.update",
        title: "Update entry",
        description: "Update entry.",
        input: {
          id: "entry-1",
          contentTypeSlug: "products",
          expectedTitle: "Product",
          expectedSlug: "product",
          expectedStatus: "draft",
          patch: { title: "Product updated" },
        },
      },
      {
        id: "entry-sample-products-2",
        type: "entry.sample.create",
        title: "Create public sample",
        description: "Create sample entry.",
        input: {
          contentTypeSlug: "products",
          title: "Sample Product",
          slug: "sample-product",
          status: "published",
          values: { title: "Sample Product" },
        },
      },
      {
        id: "form-archive-lead",
        type: "form.archive",
        title: "Archive form",
        description: "Archive form.",
        input: { id: "form-lead", name: "Lead", slug: "lead", expectedStatus: "published" },
      },
      {
        id: "detail-page-upsert-products",
        type: "detail-page.upsert",
        title: "Upsert detail page",
        description: "Upsert detail template.",
        input: {
          expectedExistingId: "detail-page-products",
          document: {
            id: "detail-page-products",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            name: "Products detail",
          },
        },
      },
      {
        id: "form-automation-lead",
        type: "form.automation.upsert",
        title: "Update automation",
        description: "Update automation.",
        input: {
          formId: "form-lead",
          action: {
            id: "notify-owner",
            type: "email",
            label: "Notify owner",
            enabled: true,
            orderIndex: 0,
            config: {},
          },
        },
      },
      {
        id: "listing-query-filters-products",
        type: "listing-query.filters.patch",
        title: "Patch listing filters",
        description: "Patch filters.",
        input: { listingQueryName: "Products Query", filters: [] },
      },
      {
        id: "listing-template-card-products",
        type: "listing-template.card.patch",
        title: "Patch listing card",
        description: "Patch card.",
        input: { listingTemplateSlug: "products-grid", card: { title: "title" } },
      },
      {
        id: "widget-template-block-hero",
        type: "widget-template.block.patch",
        title: "Patch template block",
        description: "Patch block.",
        input: {
          id: "widget-template-hero",
          name: "Hero",
          expectedStatus: "published",
          blockId: "hero-title",
          expectedBlockType: "hero",
          dataPath: ["title"],
          value: "Updated",
        },
      },
      {
        id: "menu-item-update-products",
        type: "menu.item.update",
        title: "Update menu item",
        description: "Update menu.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
          patch: { label: "Catalog" },
        },
      },
      {
        id: "seo-update-products",
        type: "seo.document.update",
        title: "Update SEO",
        description: "Update SEO.",
        input: {
          id: "seo-products",
          targetType: "page",
          targetId: "page-products",
          expectedSlug: "/products",
          expectedTitle: "Products",
          patch: { description: "Browse products." },
        },
      },
      {
        id: "page-update-failed",
        type: "page.update",
        title: "Failed page update",
        description: "Should not emit.",
        input: {
          id: "page-failed",
          title: "Failed",
          slug: "/failed",
          expectedStatus: "draft",
          patch: { title: "Still failed" },
        },
      },
      {
        id: "form-update-noop",
        type: "form.update",
        title: "Noop form update",
        description: "Should not emit.",
        input: {
          id: "form-noop",
          name: "Noop",
          slug: "noop",
          expectedStatus: "published",
          patch: { name: "Noop" },
        },
      },
    ],
  } as unknown as AssistantActionPlan;

  delete (globalThis as { BroadcastChannel?: unknown }).BroadcastChannel;
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    return jsonResponse({
      plan,
      preview: { plan, changes: [], warnings: [], readyToExecute: true },
      results: [
        {
          actionId: "content-type-delete-products",
          type: "content-type.delete",
          targetType: "content-type",
          targetKey: "products",
          operation: "delete",
          status: "success",
          resourceId: "ct-products",
          adminHref: "/admin/advanced/engine",
          publicHref: null,
          message: "Deleted.",
        },
        {
          actionId: "entry-update-products-1",
          type: "entry.update",
          targetType: "entry",
          targetKey: "products/product",
          operation: "update",
          status: "success",
          resourceId: "entry-1",
          adminHref: "/admin/advanced/entries/products/entry-1",
          publicHref: null,
          message: "Updated.",
        },
        {
          actionId: "entry-sample-products-2",
          type: "entry.sample.create",
          targetType: "entry",
          targetKey: "products/sample-product",
          operation: "create",
          status: "success",
          resourceId: "entry-2",
          adminHref: "/admin/advanced/entries/products/entry-2",
          publicHref: "/products/sample-product",
          message: "Created.",
        },
        {
          actionId: "form-archive-lead",
          type: "form.archive",
          targetType: "form",
          targetKey: "lead",
          operation: "update",
          status: "success",
          resourceId: "form-lead",
          adminHref: "/admin/advanced/forms/form-lead",
          publicHref: null,
          message: "Archived.",
        },
        {
          actionId: "detail-page-upsert-products",
          type: "detail-page.upsert",
          targetType: "detail-page",
          targetKey: "products/detail-page-products",
          operation: "update",
          status: "success",
          resourceId: "detail-page-products",
          adminHref: null,
          publicHref: null,
          message: "Detail template updated.",
        },
        {
          actionId: "form-automation-lead",
          type: "form.automation.upsert",
          targetType: "form-action",
          targetKey: "form-lead/notify-owner",
          operation: "update",
          status: "success",
          resourceId: "notify-owner",
          adminHref: "/admin/advanced/forms/form-lead",
          publicHref: null,
          message: "Automation updated.",
        },
        {
          actionId: "listing-query-filters-products",
          type: "listing-query.filters.patch",
          targetType: "listing-query",
          targetKey: "Products Query",
          operation: "update",
          status: "success",
          resourceId: "query-products",
          adminHref: "/admin/advanced/listings",
          publicHref: null,
          message: "Filters updated.",
        },
        {
          actionId: "listing-template-card-products",
          type: "listing-template.card.patch",
          targetType: "listing-template",
          targetKey: "products-grid",
          operation: "update",
          status: "success",
          resourceId: "template-products",
          adminHref: "/admin/advanced/listings",
          publicHref: null,
          message: "Card updated.",
        },
        {
          actionId: "widget-template-block-hero",
          type: "widget-template.block.patch",
          targetType: "widget-template",
          targetKey: "Hero",
          operation: "update",
          status: "success",
          resourceId: "widget-template-hero",
          adminHref: "/admin/advanced/widgets/templates/widget-template-hero",
          publicHref: null,
          message: "Template updated.",
        },
        {
          actionId: "menu-item-update-products",
          type: "menu.item.update",
          targetType: "menu-item",
          targetKey: "Products",
          operation: "update",
          status: "success",
          resourceId: "menu-products",
          adminHref: "/admin/menus",
          publicHref: null,
          message: "Menu updated.",
        },
        {
          actionId: "seo-update-products",
          type: "seo.document.update",
          targetType: "seo-document",
          targetKey: "page/page-products",
          operation: "update",
          status: "success",
          resourceId: "seo-products",
          adminHref: "/admin/seo/seo-products",
          publicHref: null,
          message: "SEO updated.",
        },
        {
          actionId: "page-update-failed",
          type: "page.update",
          targetType: "page",
          targetKey: "/failed",
          operation: "update",
          status: "failed",
          resourceId: "page-failed",
          adminHref: "/admin/pages/page-failed",
          publicHref: null,
          message: "Failed.",
        },
        {
          actionId: "form-update-noop",
          type: "form.update",
          targetType: "form",
          targetKey: "noop",
          operation: "noop",
          status: "success",
          resourceId: "form-noop",
          adminHref: "/admin/advanced/forms/form-noop",
          publicHref: null,
          message: "Noop.",
        },
        {
          actionId: "unknown-delete",
          type: "unknown.delete",
          targetType: "unknown",
          targetKey: "unknown",
          operation: "delete",
          status: "success",
          resourceId: "unknown-1",
          adminHref: null,
          publicHref: null,
          message: "Unknown.",
        },
      ],
      summary: { create: 0, update: 9, delete: 1, noop: 1, failed: 1 },
    });
  };

  try {
    resetCsrfToken();
    await executeAssistantActions({
      plan,
      idempotencyKey: "assistant-cache-matrix-1",
    });

    const events = storageWrites.map(
      (value) => JSON.parse(value) as { key: string; action: string }
    );
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.contentTypesList, action: "invalidate" }),
        expect.objectContaining({
          key: cacheKeys.contentTypeDetail("ct-products"),
          action: "invalidate",
        }),
        expect.objectContaining({ key: cacheKeys.entriesList("products"), action: "update" }),
        expect.objectContaining({ key: cacheKeys.entriesAllList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.entryDetail("products", "entry-1"),
          action: "update",
        }),
        expect.objectContaining({
          key: cacheKeys.entryDetail("products", "entry-2"),
          action: "update",
        }),
        expect.objectContaining({ key: cacheKeys.formsList, action: "update" }),
        expect.objectContaining({ key: cacheKeys.formDetail("form-lead"), action: "update" }),
        expect.objectContaining({ key: cacheKeys.detailPagesList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.detailPagesListByContentType("ct-products"),
          action: "update",
        }),
        expect.objectContaining({
          key: cacheKeys.contentTypeCollectionWorkspace("ct-products"),
          action: "update",
        }),
        expect.objectContaining({
          key: cacheKeys.detailPageDetail("detail-page-products"),
          action: "update",
        }),
        expect.objectContaining({ key: cacheKeys.formActions("form-lead"), action: "update" }),
        expect.objectContaining({
          key: cacheKeys.formActionRuns("form-lead"),
          action: "invalidate",
        }),
        expect.objectContaining({ key: cacheKeys.listingQueriesList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.listingQueryDetail("query-products"),
          action: "update",
        }),
        expect.objectContaining({ key: cacheKeys.listingTemplatesList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.listingTemplateDetail("template-products"),
          action: "update",
        }),
        expect.objectContaining({ key: cacheKeys.widgetTemplatesList, action: "update" }),
        expect.objectContaining({
          key: cacheKeys.widgetTemplateDetail("widget-template-hero"),
          action: "update",
        }),
        expect.objectContaining({ key: cacheKeys.widgetCatalogList, action: "invalidate" }),
        expect.objectContaining({ key: cacheKeys.menusList, action: "update" }),
        expect.objectContaining({ key: cacheKeys.menuDetail("menu-primary"), action: "update" }),
        expect.objectContaining({ key: cacheKeys.seoList, action: "update" }),
        expect.objectContaining({ key: cacheKeys.seoDetail("seo-products"), action: "update" }),
      ])
    );
    expect(events).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: cacheKeys.pageDetail("page-failed") }),
        expect.objectContaining({ key: cacheKeys.formDetail("form-noop") }),
      ])
    );
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

test("sendAssistantMessage uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      mode: "docs-only",
      template: "location_answer",
      detailLevel: "instruction",
      guideMode: "default",
      answer: "Use assistant settings in General Settings.",
      confidence: 0.8,
      sources: [],
      followUpOptions: [],
      fallbackUsed: false,
      requestedMode: "docs-only",
      effectiveMode: "docs-only",
      retrievalBackend: "db",
      llm: null,
    });
  };

  try {
    resetCsrfToken();
    await sendAssistantMessage({ message: "where are assistant settings?" });

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/chat");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reindexAssistantDocs uses CSRF and POST", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      retrievalBackend: "db",
      builtAt: "2026-02-09T22:00:00.000Z",
      buildDurationMs: 120,
      docCount: 20,
      chunkCount: 90,
      totalTokens: 900,
      actorId: "user-1",
    });
  };

  try {
    resetCsrfToken();
    await reindexAssistantDocs();

    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/reindex");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("planAssistantSiteKitActions uses generic assistant action plan route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const siteKitPreview = {
    plan: {
      recommendedKitId: "automotive-workshop",
      confidence: 90,
      recommendations: [],
      steps: [],
      settingsPatch: {},
      notes: [],
    },
    selectedKitId: "automotive-workshop",
    selectedKitTitle: "Automotive Workshop",
    enabledStepIds: ["settings", "pages", "qa"],
    actions: [],
    modules: {
      required: [],
      optional: [],
      recommended: [],
    },
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    return jsonResponse({
      id: "plan-site-kit-automotive-workshop",
      status: "ready",
      intentId: "site-kit-install",
      title: "Automotive Workshop Site Kit",
      answer: "Plan ready",
      summary: "Install site kit",
      confidence: 0.9,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "site-kit-install-automotive-workshop",
          type: "site-kit.install",
          title: "Install Automotive Workshop",
          description: "Install selected site kit steps.",
          input: {
            businessType: "automotive_workshop",
            goals: ["lead_generation"],
            locale: "en",
            selectedKitId: "automotive-workshop",
            enabledStepIds: ["settings", "pages", "qa"],
            preview: siteKitPreview,
          },
        },
      ],
    });
  };

  try {
    resetCsrfToken();
    const result = await planAssistantSiteKitActions({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
    });

    expect(result.selectedKitId).toBe("automotive-workshop");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[1]?.init?.method).toBe("POST");
    const headers = new Headers(calls[1]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("executeAssistantSiteKitActions plans then executes through generic action route", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const siteKitPreview = {
    plan: {
      recommendedKitId: "automotive-workshop",
      confidence: 90,
      recommendations: [],
      steps: [],
      settingsPatch: {},
      notes: [],
    },
    selectedKitId: "automotive-workshop",
    selectedKitTitle: "Automotive Workshop",
    enabledStepIds: ["settings", "pages", "qa"],
    actions: [],
    modules: {
      required: [],
      optional: [],
      recommended: [],
    },
  };
  const siteKitExecution = {
    ...siteKitPreview,
    execution: {
      run: {
        id: "run-1",
        kitId: "automotive-workshop",
        mode: "apply",
        status: "success",
        actorId: "user-1",
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
        createdAt: "2026-02-20T10:00:00.000Z",
        updatedAt: "2026-02-20T10:00:00.000Z",
        finishedAt: "2026-02-20T10:00:01.000Z",
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
    },
    validation: {
      runId: "run-1",
      status: "ok",
      unresolvedItems: [],
      checks: [],
    },
  };
  const actionPlan = {
    id: "plan-site-kit-automotive-workshop",
    status: "ready",
    intentId: "site-kit-install",
    title: "Automotive Workshop Site Kit",
    answer: "Plan ready",
    summary: "Install site kit",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Install selected site kit steps.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings", "pages", "qa"],
          preview: siteKitPreview,
        },
      },
    ],
  };

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/assistant/actions/plan")) {
      return jsonResponse(actionPlan);
    }
    return jsonResponse({
      plan: actionPlan,
      preview: {
        plan: actionPlan,
        changes: [],
        warnings: [],
        readyToExecute: true,
      },
      results: [
        {
          actionId: "site-kit-install-automotive-workshop",
          type: "site-kit.install",
          targetType: "site-kit",
          targetKey: "automotive-workshop",
          operation: "create",
          status: "success",
          resourceId: "run-1",
          adminHref: "/admin/advanced/solution-kits",
          publicHref: null,
          message: "Site kit installed.",
          details: {
            siteKit: {
              execution: siteKitExecution,
              validation: siteKitExecution.validation,
            },
          },
        },
      ],
      summary: {
        create: 1,
        update: 0,
        noop: 0,
        failed: 0,
      },
    });
  };

  try {
    resetCsrfToken();
    const result = await executeAssistantSiteKitActions({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
      dryRun: false,
      continueOnError: true,
      settingsPatch: { siteName: "Workshop Pro" },
      notes: ["Launch reviewed"],
      idempotencyKey: "site-kit-test-key",
    });

    expect(result.execution.run.id).toBe("run-1");
    expect(calls[0]?.input).toBe("/admin/api/auth/csrf");
    expect(calls[1]?.input).toBe("/admin/api/assistant/actions/plan");
    expect(calls[2]?.input).toBe("/admin/api/assistant/actions/execute");
    expect(calls[2]?.init?.method).toBe("POST");
    const planBody = JSON.parse(String(calls[1]?.init?.body));
    expect(planBody.context.siteKit).toEqual({
      businessType: "automotive_workshop",
      goals: ["lead_generation"],
      locale: "en",
      selectedKitId: "automotive-workshop",
      enabledStepIds: ["settings", "pages", "qa"],
    });
    expect(planBody.context.siteKit).not.toHaveProperty("dryRun");
    expect(planBody.context.siteKit).not.toHaveProperty("continueOnError");
    expect(planBody.context.siteKit).not.toHaveProperty("settingsPatch");
    expect(planBody.context.siteKit).not.toHaveProperty("notes");
    expect(planBody.context.siteKit).not.toHaveProperty("idempotencyKey");
    const executeBody = JSON.parse(String(calls[2]?.init?.body));
    expect(executeBody.plan.actions[0].input).toMatchObject({
      dryRun: false,
      continueOnError: true,
      settingsPatch: { siteName: "Workshop Pro" },
      notes: ["Launch reviewed"],
    });
    const headers = new Headers(calls[2]?.init?.headers);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getAssistantStatus uses read-through cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse({
      enabled: true,
      defaultMode: "docs-only",
      retrievalBackend: "db",
      llmAvailable: false,
      indexReady: true,
      indexBuilding: false,
      indexError: null,
      lastReindexAt: null,
      docCount: 12,
      chunkCount: 80,
    });
  };

  try {
    const first = await getAssistantStatus({ force: true });
    const second = await getAssistantStatus();
    expect(first).toEqual(second);
    expect(calls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("reindexAssistantDocs invalidates assistant status cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/assistant/status")) {
      return jsonResponse({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 80,
      });
    }
    if (url.endsWith("/assistant/reindex")) {
      return jsonResponse({
        retrievalBackend: "db",
        builtAt: "2026-02-09T22:00:00.000Z",
        buildDurationMs: 120,
        docCount: 20,
        chunkCount: 90,
        totalTokens: 900,
        actorId: "user-1",
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    resetCsrfToken();
    await getAssistantStatus({ force: true });
    await reindexAssistantDocs();
    await getAssistantStatus();

    const statusCalls = calls.filter((call) => String(call.input).endsWith("/assistant/status"));
    expect(statusCalls).toHaveLength(2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
