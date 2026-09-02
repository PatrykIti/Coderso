// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// TASK-105-08-05 residuals for DashboardBuilder + DashboardWidgetHost: failure
// paths (load/preview/save/reset), refresh force reload, cache-event dirty
// staleness, the no-permissions catalog, the config sheet (title edit + close),
// the pointer-drag empty-space no-op, and the left/right/narrower nudges.

const contentTypes = [
  { id: "ct-article", name: "Article" },
  { id: "ct-product", name: "Product" },
];

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => contentTypes,
  listContentTypesCached: async () => contentTypes,
}));

// Stateful in-memory dashboard client with failure injection. `saved` is the
// persisted layout; save/reset mutate it, load reads it, preview echoes whatever
// draft it is handed. Failure switches let each test exercise the error paths.
vi.mock("@/services/dashboardClient", () => {
  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

  const INITIAL = {
    version: 1 as const,
    widgets: [
      {
        id: "w-a",
        type: "totals-counters" as const,
        title: "Counters",
        config: { kind: "totals-counters" as const },
        position: { x: 0, y: 0, w: 12, h: 1 },
      },
      {
        id: "w-b",
        type: "storage-usage" as const,
        title: "Storage",
        config: { kind: "storage-usage" as const },
        position: { x: 0, y: 1, w: 4, h: 2 },
      },
    ],
  };

  const DEFAULT = {
    version: 1 as const,
    widgets: [
      {
        id: "w-default",
        type: "site-health" as const,
        title: "Site Health",
        config: { kind: "site-health" as const },
        position: { x: 0, y: 0, w: 4, h: 2 },
      },
    ],
  };

  const dataFor = (type: string) => {
    switch (type) {
      case "totals-counters":
        return { type, counters: [] };
      case "content-type-counts":
        return { type, counts: [] };
      case "content-over-time":
        return { type, variant: "area", categories: [], series: [] };
      case "recent-activity":
        return { type, items: [] };
      case "storage-usage":
        return { type, usedBytes: 0, limitBytes: null, usedPercent: null };
      case "site-health":
        return {
          type,
          storage: { usedPercent: null },
          security: { status: "ok", issues: 0, checks: [] },
        };
      case "security-summary":
        return { type, security: { status: "ok", issues: 0, checks: [] } };
      case "quick-actions":
        return { type, actions: [] };
      default:
        return { type, columns: [], rows: [] };
    }
  };

  const dataResponse = (widgets: Array<{ id: string; type: string }>) => ({
    generatedAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    widgets: widgets.map((w) => ({ id: w.id, type: w.type, data: dataFor(w.type) })),
  });

  const store = {
    saved: clone(INITIAL) as typeof INITIAL | typeof DEFAULT,
    cacheHandler: null as null | (() => void),
    layoutError: null as Error | null,
    previewError: null as Error | null,
    saveError: null as Error | null,
    resetError: null as Error | null,
  };

  const getDashboardLayoutCached = vi.fn(async () => {
    if (store.layoutError) throw store.layoutError;
    return { layout: clone(store.saved), updatedAt: null };
  });
  const getDashboardWidgetDataCached = vi.fn(async () => dataResponse(store.saved.widgets));
  const previewDashboardWidgetData = vi.fn(async (widgets: Array<{ id: string; type: string }>) => {
    if (store.previewError) throw store.previewError;
    return dataResponse(widgets);
  });
  const saveDashboardLayout = vi.fn(async (layout: typeof INITIAL) => {
    if (store.saveError) throw store.saveError;
    store.saved = clone(layout);
    return { layout: clone(store.saved), updatedAt: "2026-01-02T00:00:00.000Z" };
  });
  const resetDashboardLayout = vi.fn(async () => {
    if (store.resetError) throw store.resetError;
    store.saved = clone(DEFAULT);
    return { layout: clone(store.saved), updatedAt: null };
  });
  const subscribeDashboardCache = vi.fn((handler: () => void) => {
    store.cacheHandler = handler;
    return () => {
      store.cacheHandler = null;
    };
  });

  return {
    __reset: () => {
      store.saved = clone(INITIAL);
      store.cacheHandler = null;
      store.layoutError = null;
      store.previewError = null;
      store.saveError = null;
      store.resetError = null;
      for (const fn of [
        getDashboardLayoutCached,
        getDashboardWidgetDataCached,
        previewDashboardWidgetData,
        saveDashboardLayout,
        resetDashboardLayout,
        subscribeDashboardCache,
      ]) {
        fn.mockClear();
      }
    },
    __emitCacheEvent: () => store.cacheHandler?.(),
    __fail: (method: "layout" | "preview" | "save" | "reset", error: Error) => {
      if (method === "layout") store.layoutError = error;
      if (method === "preview") store.previewError = error;
      if (method === "save") store.saveError = error;
      if (method === "reset") store.resetError = error;
    },
    getDashboardLayoutCached,
    getDashboardWidgetDataCached,
    previewDashboardWidgetData,
    saveDashboardLayout,
    resetDashboardLayout,
    subscribeDashboardCache,
  };
});

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { ApiClientError } from "../../../core/admin/services/apiClient";
import { DashboardBuilder } from "../../../core/admin/ui/dashboard/DashboardBuilder";
import * as dashboardClient from "../../../core/admin/services/dashboardClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockClient = dashboardClient as unknown as {
  __reset: () => void;
  __emitCacheEvent: () => void;
  __fail: (method: "layout" | "preview" | "save" | "reset", error: Error) => void;
  getDashboardLayoutCached: { mock: { calls: Array<[{ force?: boolean }?]> } };
  saveDashboardLayout: {
    mock: {
      calls: Array<
        [{ widgets: Array<{ id: string; title: string; position: { x: number; w: number } }> }]
      >;
    };
  };
};

const roots: Array<{ unmount: () => void }> = [];

const flush = async () => {
  await React.act(async () => {
    for (let i = 0; i < 8; i += 1) await Promise.resolve();
  });
};

const mount = async (can?: (permission: string) => boolean) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <DashboardBuilder canWrite can={can} />
      </AdminRouterProvider>
    );
  });
  roots.push({
    unmount: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  });
  await flush();
  return container;
};

const buttonByText = (root: ParentNode, text: string) =>
  Array.from(root.querySelectorAll("button")).find((node) => node.textContent?.includes(text)) ??
  null;

const gridWidgetIds = () =>
  Array.from(document.querySelectorAll(".lg\\:grid-cols-12 [data-widget-id]")).map((node) =>
    node.getAttribute("data-widget-id")
  );

const hostEl = (id: string) =>
  document.querySelector<HTMLElement>(`.lg\\:grid-cols-12 [data-widget-id="${id}"]`);

const hostButton = (id: string, label: string) =>
  hostEl(id)?.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`) ?? null;

const renderedWidgetGeometry = () =>
  Array.from(document.querySelectorAll(".lg\\:grid-cols-12 [data-widget-id]")).map((node) => {
    const wrapper = node.parentElement;
    return {
      id: node.getAttribute("data-widget-id"),
      columnClass: wrapper?.className ?? "",
      minHeight: wrapper?.style.minHeight ?? "",
    };
  });

const click = (node: Element | null | undefined) => {
  React.act(() => (node as HTMLElement | null | undefined)?.click());
};

const clickAsync = async (node: Element | null | undefined) => {
  click(node);
  await flush();
};

const catalogCard = (container: HTMLElement, description: string) =>
  Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(description)
  ) ?? null;

beforeEach(() => {
  mockClient.__reset();
});

afterEach(() => {
  while (roots.length) roots.pop()?.unmount();
  document.body.innerHTML = "";
});

test("Refresh force-reloads the layout and widget data", async () => {
  const container = await mount();
  const layoutCalls = mockClient.getDashboardLayoutCached.mock.calls.length;
  await clickAsync(buttonByText(container, "Refresh"));
  expect(mockClient.getDashboardLayoutCached.mock.calls.length).toBe(layoutCalls + 1);
  expect(mockClient.getDashboardLayoutCached.mock.calls.at(-1)?.[0]?.force).toBe(true);
});

test("a failed initial load surfaces the API message when the error is an ApiClientError", async () => {
  mockClient.__fail(
    "layout",
    new ApiClientError("dashboard_load_failed", "Layout service is down.", 503)
  );
  const container = await mount();
  const text = container.textContent ?? "";
  expect(text).toContain("Dashboard unavailable");
  expect(text).toContain("Layout service is down.");
});

test("a failed initial load with a plain error falls back to the generic message", async () => {
  mockClient.__fail("layout", new Error("boom"));
  const container = await mount();
  expect(container.textContent).toContain("Failed to load dashboard.");
});

test("a preview failure after adding a widget surfaces the preview error", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  mockClient.__fail("preview", new Error("preview boom"));
  await clickAsync(catalogCard(container, "Filtered entry list"));
  expect(container.textContent).toContain("Failed to preview widgets.");
  // The draft is still dirty so the user can retry or cancel.
  expect(buttonByText(container, "Save")?.disabled).toBe(false);
});

test("an API preview failure surfaces its public message and keeps the draft saveable", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  mockClient.__fail(
    "preview",
    new ApiClientError("dashboard_preview_failed", "Preview service is unavailable.", 502)
  );
  await clickAsync(catalogCard(container, "Filtered entry list"));

  expect(container.textContent).toContain("Preview service is unavailable.");
  expect(gridWidgetIds()).toHaveLength(3);
  expect(buttonByText(container, "Save")?.disabled).toBe(false);
});

test("a save failure surfaces the error and stays in edit mode", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  await clickAsync(catalogCard(container, "Filtered entry list"));
  mockClient.__fail("save", new Error("save boom"));
  await clickAsync(buttonByText(container, "Save"));
  expect(container.textContent).toContain("Failed to save dashboard.");
  expect(buttonByText(container, "Save")).not.toBeNull();
});

test("an API save failure surfaces its public message and preserves the dirty draft", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  await clickAsync(catalogCard(container, "Filtered entry list"));
  mockClient.__fail(
    "save",
    new ApiClientError("dashboard_save_failed", "Save service is unavailable.", 503)
  );
  await clickAsync(buttonByText(container, "Save"));

  expect(container.textContent).toContain("Save service is unavailable.");
  expect(gridWidgetIds()).toHaveLength(3);
  expect(buttonByText(container, "Save")?.disabled).toBe(false);
});

test("a reset failure surfaces the save error and keeps the draft", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  mockClient.__fail("reset", new Error("reset boom"));
  await clickAsync(buttonByText(container, "Reset"));
  expect(container.textContent).toContain("Failed to reset dashboard.");
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
});

test("an API reset failure surfaces its public message and preserves the edit state", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  mockClient.__fail(
    "reset",
    new ApiClientError("dashboard_reset_failed", "Reset service is unavailable.", 503)
  );
  await clickAsync(buttonByText(container, "Reset"));

  expect(container.textContent).toContain("Reset service is unavailable.");
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
  expect(buttonByText(container, "Reset")).not.toBeNull();
});

test("a cache event while dirty marks the draft stale and blocks Save", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  await clickAsync(catalogCard(container, "Filtered entry list"));
  expect(buttonByText(container, "Save")?.disabled).toBe(false);

  React.act(() => mockClient.__emitCacheEvent());
  await flush();

  expect(container.textContent).toContain("Saved layout changed elsewhere");
  expect(buttonByText(container, "Save")?.disabled).toBe(true);
});

test("a cache event while clean reloads the layout (remote sync)", async () => {
  const container = await mount();
  const layoutCalls = mockClient.getDashboardLayoutCached.mock.calls.length;
  React.act(() => mockClient.__emitCacheEvent());
  await flush();
  // No dirty draft: the cache event falls through to a force reload.
  expect(mockClient.getDashboardLayoutCached.mock.calls.length).toBe(layoutCalls + 1);
  expect(mockClient.getDashboardLayoutCached.mock.calls.at(-1)?.[0]?.force).toBe(true);
  expect(container.textContent).not.toContain("Saved layout changed elsewhere");
});

test("config sheet title edit persists on save, and closing deselects the widget", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  await clickAsync(hostButton("w-a", "Configure"));

  // The config sheet opened; the selected host carries the primary outline.
  expect(hostEl("w-a")?.className).toContain("outline-primary");
  const titleInput = Array.from(document.querySelectorAll("input")).find(
    (input) => input.value === "Counters"
  );
  expect(titleInput).not.toBeNull();

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  React.act(() => {
    setter?.call(titleInput, "Counter Panels");
    titleInput?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await flush();
  expect(buttonByText(container, "Save")?.disabled).toBe(false);

  // Closing the sheet (top-right X) deselects the widget and clears the outline.
  const close = document.querySelector<HTMLButtonElement>('[data-slot="sheet-close"]');
  expect(close).not.toBeNull();
  await clickAsync(close);
  expect(hostEl("w-a")?.className).not.toContain("outline-primary");

  // Save persists the edited title (visible through the reloaded layout).
  await clickAsync(buttonByText(container, "Save"));
  const saved = mockClient.saveDashboardLayout.mock.calls[0]?.[0];
  expect(saved?.widgets.find((widget) => widget.id === "w-a")?.title).toBe("Counter Panels");
});

test("left, right, and narrower nudges clamp geometry and persist on save", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  // Move right then left on w-b: x returns to 0 (clamped at 0).
  await clickAsync(hostButton("w-b", "Move right"));
  await clickAsync(hostButton("w-b", "Move left"));
  // Narrower shrinks w-b from 4 to 3 columns.
  await clickAsync(hostButton("w-b", "Narrower"));
  await clickAsync(buttonByText(container, "Save"));

  const saved = mockClient.saveDashboardLayout.mock.calls[0]?.[0];
  const wb = saved?.widgets.find((widget) => widget.id === "w-b");
  expect(wb?.position.x).toBe(0);
  expect(wb?.position.w).toBe(3);
  // The reloaded grid reflects the narrower span.
  expect(hostEl("w-b")?.parentElement?.className).toContain("lg:col-span-3");
});

test("a pointer drag released over empty grid space is a no-op", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const savedBefore = await dashboardClient.getDashboardLayoutCached();
  const savedGeometryBefore = savedBefore.layout.widgets.map(({ id, position }) => ({
    id,
    position: { ...position },
  }));
  const renderedGeometryBefore = renderedWidgetGeometry();

  const handle = hostEl("w-a")?.querySelector<HTMLElement>('[data-testid="widget-drag-handle"]');
  expect(handle).not.toBeNull();
  React.act(() => {
    handle?.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10 })
    );
  });
  React.act(() => {
    window.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: 5, clientY: 5 })
    );
  });
  React.act(() => {
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 5, clientY: 5 }));
  });
  await flush();

  // The empty-grid release matched no target, so the layout is unchanged.
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
  expect(renderedWidgetGeometry()).toEqual(renderedGeometryBefore);
  expect(buttonByText(container, "Save")?.disabled).toBe(true);
  expect(mockClient.saveDashboardLayout.mock.calls).toHaveLength(0);

  const savedAfter = await dashboardClient.getDashboardLayoutCached();
  expect(
    savedAfter.layout.widgets.map(({ id, position }) => ({ id, position: { ...position } }))
  ).toEqual(savedGeometryBefore);
  expect(savedAfter.layout).toEqual(savedBefore.layout);
});
