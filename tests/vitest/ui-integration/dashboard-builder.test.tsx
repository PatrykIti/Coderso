// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

// TASK-480-05-L03: end-to-end builder mechanics over the schema-driven registry
// and config form — Edit toggle, add / remove / arrange / resize mutating the
// DRAFT, configure two widgets through <WidgetConfigForm>, dirty-state gating the
// Save button, save persisting, and reset restoring defaults. Assertions target
// VISIBLE effect (panel count, DOM order, span class, enabled/disabled), not
// mere presence.

const contentTypes = [
  { id: "ct-article", name: "Article" },
  { id: "ct-product", name: "Product" },
];

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => contentTypes,
  listContentTypesCached: async () => contentTypes,
}));

// Stateful in-memory dashboard client. `saved` is the persisted layout; save/reset
// mutate it, load reads it, preview echoes whatever draft it is handed. Widget
// data is a minimal matching-type payload per widget so the grid renders real
// (empty-state) renderers rather than the unavailable fallback.
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
    // Widened so the reset path can assign the DEFAULT layout (a different widget
    // union) without narrowing to INITIAL's inferred type.
    saved: clone(INITIAL) as typeof INITIAL | typeof DEFAULT,
    cacheHandler: null as null | (() => void),
  };

  return {
    __reset: () => {
      store.saved = clone(INITIAL);
      store.cacheHandler = null;
    },
    // Fire the captured cache-bus subscription (simulates another tab/admin saving
    // a newer layout) so tests can drive the remote-stale conflict path.
    __emitCacheEvent: () => store.cacheHandler?.(),
    __default: () => clone(DEFAULT),
    getDashboardLayoutCached: vi.fn(async () => ({ layout: clone(store.saved), updatedAt: null })),
    getDashboardWidgetDataCached: vi.fn(async () => dataResponse(store.saved.widgets)),
    previewDashboardWidgetData: vi.fn(async (widgets: Array<{ id: string; type: string }>) =>
      dataResponse(widgets)
    ),
    saveDashboardLayout: vi.fn(async (layout: typeof INITIAL) => {
      store.saved = clone(layout);
      return { layout: clone(store.saved), updatedAt: "2026-01-02T00:00:00.000Z" };
    }),
    resetDashboardLayout: vi.fn(async () => {
      store.saved = clone(DEFAULT);
      return { layout: clone(store.saved), updatedAt: null };
    }),
    subscribeDashboardCache: vi.fn((handler: () => void) => {
      store.cacheHandler = handler;
      return () => {
        store.cacheHandler = null;
      };
    }),
  };
});

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { DashboardBuilder } from "../../../core/admin/ui/dashboard/DashboardBuilder";
import * as dashboardClient from "../../../core/admin/services/dashboardClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mockClient = dashboardClient as unknown as {
  __reset: () => void;
  __emitCacheEvent: () => void;
};

const roots: Array<{ unmount: () => void }> = [];

const flush = async () => {
  await React.act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve();
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

const click = (node: Element | null | undefined) => {
  React.act(() => (node as HTMLElement | null | undefined)?.click());
};

const clickAsync = async (node: Element | null | undefined) => {
  click(node);
  await flush();
};

const panelCountText = (container: HTMLElement) => container.textContent ?? "";

beforeEach(() => {
  mockClient.__reset();
});

afterEach(() => {
  while (roots.length) roots.pop()?.unmount();
});

test("loads the saved layout and renders one host per saved widget", async () => {
  const container = await mount();
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
  expect(panelCountText(container)).toContain("2 panels");
  // Read-only by default: no edit chrome until Customize.
  expect(buttonByText(container, "Customize")).not.toBeNull();
  expect(hostButton("w-a", "Remove")).toBeNull();
});

test("Edit toggle reveals the catalog + edit chrome and Cancel restores read-only", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  // Edit chrome + add catalog now visible.
  expect(buttonByText(container, "Save")).not.toBeNull();
  expect(buttonByText(container, "Reset")).not.toBeNull();
  expect(hostButton("w-a", "Remove")).not.toBeNull();
  expect(buttonByText(container, "Content Query")).not.toBeNull();

  await clickAsync(buttonByText(container, "Cancel"));
  expect(buttonByText(container, "Customize")).not.toBeNull();
  expect(hostButton("w-a", "Remove")).toBeNull();
});

test("adding a widget mutates the draft, enables Save (dirty), and removing reverses it", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  // Fresh draft is not dirty → Save disabled.
  expect(buttonByText(container, "Save")?.disabled).toBe(true);

  const addContentQuery = Array.from(container.querySelectorAll("button")).find(
    (node) =>
      node.textContent?.includes("Content Query") &&
      node.textContent?.includes("Filtered entry list")
  );
  await clickAsync(addContentQuery);

  expect(panelCountText(container)).toContain("3 panels");
  expect(gridWidgetIds().length).toBe(3);
  const added = gridWidgetIds().find((id) => id !== "w-a" && id !== "w-b");
  expect(added).toBeDefined();
  expect(hostEl(added as string)?.getAttribute("data-widget-type")).toBe("content-query");
  // The mutation dirtied the draft → Save now enabled.
  expect(buttonByText(container, "Save")?.disabled).toBe(false);

  await clickAsync(hostButton(added as string, "Remove"));
  expect(panelCountText(container)).toContain("2 panels");
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
});

test("resize (Wider) grows the widget's column span in the grid", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const wrapperClass = () => hostEl("w-b")?.parentElement?.className ?? "";
  expect(wrapperClass()).toContain("lg:col-span-4");

  await clickAsync(hostButton("w-b", "Wider"));
  expect(wrapperClass()).toContain("lg:col-span-5");
  expect(wrapperClass()).not.toContain("lg:col-span-4");
});

test("arrange (Move down) reorders one slot per keypress, matching pointer drag", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);

  // Keyboard up/down now reuses the pointer drag resequence model (moveWidget): a
  // SINGLE "down" swaps w-a past its next neighbour w-b — no dead first press.
  await clickAsync(hostButton("w-a", "Move down"));
  expect(gridWidgetIds()).toEqual(["w-b", "w-a"]);

  // A "Move up" on w-a walks it back one slot, so the two paths stay symmetric.
  await clickAsync(hostButton("w-a", "Move up"));
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
});

test("configuring the counters widget through WidgetConfigForm mutates the draft (dirty)", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  expect(buttonByText(container, "Save")?.disabled).toBe(true);

  await clickAsync(hostButton("w-a", "Configure"));

  // The schema-driven form (in the sheet portal) exposes the counters controls.
  const panelText = document.body.textContent ?? "";
  expect(panelText).toContain("Source");
  expect(panelText).toContain("Metrics");
  expect(panelText).toContain("Value format");

  // Toggle the "Users" metric checkbox → routed through the config form.
  const usersLabel = Array.from(document.querySelectorAll("label")).find((node) =>
    node.textContent?.includes("Users")
  );
  const usersCheckbox = usersLabel?.querySelector<HTMLButtonElement>('[role="checkbox"]');
  expect(usersCheckbox).toBeTruthy();
  await clickAsync(usersCheckbox);

  // The config edit dirtied the draft → Save enabled.
  expect(buttonByText(container, "Save")?.disabled).toBe(false);
});

test("configuring an added content-query widget renders its schema-driven controls", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const addContentQuery = Array.from(container.querySelectorAll("button")).find(
    (node) =>
      node.textContent?.includes("Content Query") &&
      node.textContent?.includes("Filtered entry list")
  );
  await clickAsync(addContentQuery);
  const added = gridWidgetIds().find((id) => id !== "w-a" && id !== "w-b") as string;

  await clickAsync(hostButton(added, "Configure"));

  const panelText = document.body.textContent ?? "";
  // Newly-covered widget: content-query publishes content-type/status/sort/order.
  expect(panelText).toContain("Content type");
  expect(panelText).toContain("Status");
  expect(panelText).toContain("Sort by");
  expect(panelText).toContain("Order");
  // The content-type select renders its cleared default caption (the concrete
  // "Article"/"Product" options live in the collapsed Radix popover until opened).
  expect(panelText).toContain("All content types");
});

test("Save persists the draft, exits edit mode, and clears dirty", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const addContentQuery = Array.from(container.querySelectorAll("button")).find(
    (node) =>
      node.textContent?.includes("Content Query") &&
      node.textContent?.includes("Filtered entry list")
  );
  await clickAsync(addContentQuery);
  expect(gridWidgetIds().length).toBe(3);

  await clickAsync(buttonByText(container, "Save"));

  // Save exits edit mode (Customize back) and persists the 3-widget layout.
  expect(buttonByText(container, "Customize")).not.toBeNull();
  expect(hostButton("w-a", "Remove")).toBeNull();
  expect(gridWidgetIds().length).toBe(3);
  expect(
    (dashboardClient.saveDashboardLayout as unknown as { mock: { calls: unknown[] } }).mock.calls
      .length
  ).toBe(1);
});

test("Reset restores the default layout and exits edit mode", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  await clickAsync(buttonByText(container, "Reset"));

  // Default layout has a single site-health panel; edit mode is closed.
  expect(gridWidgetIds()).toEqual(["w-default"]);
  expect(panelCountText(container)).toContain("1 panel");
  expect(buttonByText(container, "Customize")).not.toBeNull();
});

// Catalog cards are the only buttons carrying a widget-type DESCRIPTION, so match
// on description text to avoid colliding with grid host titles (e.g. "Counters").
const catalogCard = (container: HTMLElement, description: string) =>
  Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes(description)
  ) ?? null;

test("add-widget catalog hides widget types the permission set can't render (RBAC guard)", async () => {
  // Deny users:read + media:read → counters (user counts), storage + site-health
  // (media storage) drop out of the catalog; content-query stays.
  const can = (permission: string) => permission !== "users:read" && permission !== "media:read";
  const container = await mount(can);
  await clickAsync(buttonByText(container, "Customize"));

  expect(catalogCard(container, "CMS or traffic totals")).toBeNull(); // counters
  expect(catalogCard(container, "Media storage usage")).toBeNull(); // storage
  expect(catalogCard(container, "Storage and security status")).toBeNull(); // site-health
  expect(catalogCard(container, "Filtered entry list")).not.toBeNull(); // content-query
});

test("catalog lists every type when the permission set is unrestricted", async () => {
  const container = await mount(() => true);
  await clickAsync(buttonByText(container, "Customize"));
  expect(catalogCard(container, "CMS or traffic totals")).not.toBeNull();
  expect(catalogCard(container, "Media storage usage")).not.toBeNull();
});

test("geometry nudges skip the widget-data preview refetch (matches pointer path)", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const previewMock = dashboardClient.previewDashboardWidgetData as unknown as {
    mock: { calls: unknown[] };
  };
  const before = previewMock.mock.calls.length;

  await clickAsync(hostButton("w-b", "Wider"));
  await clickAsync(hostButton("w-a", "Move down"));
  // Reorder / resize change no resolved data → no preview POST.
  expect(previewMock.mock.calls.length).toBe(before);

  // Adding a widget DOES change resolved data → a preview refetch fires.
  const addContentQuery = catalogCard(container, "Filtered entry list");
  await clickAsync(addContentQuery);
  expect(previewMock.mock.calls.length).toBeGreaterThan(before);
});

test("a remote layout change while dirty blocks Save (no silent clobber)", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  await clickAsync(hostButton("w-b", "Wider"));
  expect(buttonByText(container, "Save")?.disabled).toBe(false);

  // Another tab/admin persisted a newer layout → cache-bus event while dirty.
  React.act(() => mockClient.__emitCacheEvent());
  await flush();

  expect(panelCountText(container)).toContain("Saved layout changed elsewhere");
  expect(buttonByText(container, "Save")?.disabled).toBe(true);
});

// ── Pointer drag-and-drop end-to-end (finding: the glue was untested) ──────────
const stubRect = (
  el: Element | null,
  rect: { left: number; top: number; right: number; bottom: number; width: number }
) => {
  if (!el) return;
  (el as HTMLElement).getBoundingClientRect = () =>
    ({
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.bottom - rect.top,
      toJSON: () => ({}),
    }) as DOMRect;
};

const firePointer = (
  target: EventTarget | null | undefined,
  type: string,
  init: PointerEventInit = {}
) => {
  React.act(() => {
    target?.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init }));
  });
};

test("pointer drag over a sibling marks it a drop target and reorders on release", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);

  const grid = document.querySelector(".lg\\:grid-cols-12");
  stubRect(grid, { left: 0, top: 0, right: 100, bottom: 200, width: 1376 });
  stubRect(hostEl("w-a"), { left: 0, top: 0, right: 100, bottom: 50, width: 100 });
  stubRect(hostEl("w-b"), { left: 0, top: 60, right: 100, bottom: 110, width: 100 });

  const dragHandle = hostEl("w-a")?.querySelector('[data-testid="widget-drag-handle"]');
  firePointer(dragHandle, "pointerdown", { clientX: 50, clientY: 25 });
  // Move the pointer into w-b's rect → w-b becomes the live drop target.
  firePointer(window, "pointermove", { clientX: 50, clientY: 80 });
  await flush();
  expect(hostEl("w-b")?.getAttribute("data-drop-target")).toBe("true");
  expect(hostEl("w-a")?.getAttribute("data-dragging")).toBe("true");

  // Release → commit the reorder via moveWidget's dense resequence.
  firePointer(window, "pointerup", { clientX: 50, clientY: 80 });
  await flush();
  expect(gridWidgetIds()).toEqual(["w-b", "w-a"]);
  expect(hostEl("w-b")?.getAttribute("data-drop-target")).toBeNull();
});

test("Escape during a pointer drag aborts without reordering", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const grid = document.querySelector(".lg\\:grid-cols-12");
  stubRect(grid, { left: 0, top: 0, right: 100, bottom: 200, width: 1376 });
  stubRect(hostEl("w-a"), { left: 0, top: 0, right: 100, bottom: 50, width: 100 });
  stubRect(hostEl("w-b"), { left: 0, top: 60, right: 100, bottom: 110, width: 100 });

  firePointer(hostEl("w-a")?.querySelector('[data-testid="widget-drag-handle"]'), "pointerdown", {
    clientX: 50,
    clientY: 25,
  });
  firePointer(window, "pointermove", { clientX: 50, clientY: 80 });
  await flush();
  React.act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  });
  await flush();
  // Abort: order unchanged, drag state cleared.
  expect(gridWidgetIds()).toEqual(["w-a", "w-b"]);
  expect(hostEl("w-a")?.getAttribute("data-dragging")).toBeNull();
});

test("pointer resize drag converts the pixel delta into a wider column span", async () => {
  const container = await mount();
  await clickAsync(buttonByText(container, "Customize"));

  const grid = document.querySelector(".lg\\:grid-cols-12");
  // width 1376 with 11×16px gaps → colWidth = (1376 - 176) / 12 = 100px.
  stubRect(grid, { left: 0, top: 0, right: 1376, bottom: 400, width: 1376 });

  const wrapperClass = () => hostEl("w-b")?.parentElement?.className ?? "";
  expect(wrapperClass()).toContain("lg:col-span-4");

  const resizeHandle = hostEl("w-b")?.querySelector('[data-testid="widget-resize-handle"]');
  firePointer(resizeHandle, "pointerdown", { clientX: 300, clientY: 200 });
  // +200px in x ≈ +2 columns → w grows 4 → 6.
  firePointer(window, "pointermove", { clientX: 500, clientY: 200 });
  await flush();
  expect(wrapperClass()).toContain("lg:col-span-6");
  expect(wrapperClass()).not.toContain("lg:col-span-4");

  firePointer(window, "pointerup", { clientX: 500, clientY: 200 });
  await flush();
});
