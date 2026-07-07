// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

// TASK-480-05-L02: the schema-driven `<WidgetConfigForm>` renders controls from a
// widget type's `configFields` descriptor and emits schema-shaped field changes.

const contentTypes = [
  { id: "ct-article", name: "Article" },
  { id: "ct-product", name: "Product" },
];

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: () => contentTypes,
  listContentTypesCached: async () => contentTypes,
}));

import { WidgetConfigForm } from "../../../core/admin/ui/dashboard/WidgetConfigForm";
import { DASHBOARD_WIDGET_CATALOG } from "../../../core/admin/ui/dashboard/widgetRegistry";
import type { DashboardWidgetConfig } from "../../../core/services/dashboard/dashboardTypes";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const roots: Array<{ unmount: () => void; container: HTMLElement }> = [];

const mount = (config: DashboardWidgetConfig, onChange = vi.fn(), widgetId = "widget-1") => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (cfg: DashboardWidgetConfig, id: string) =>
    React.act(() => {
      root.render(
        <WidgetConfigForm
          widgetId={id}
          fields={DASHBOARD_WIDGET_CATALOG[cfg.kind].configFields}
          config={cfg}
          onChange={onChange}
        />
      );
    });
  render(config, widgetId);
  roots.push({
    unmount: () => {
      React.act(() => root.unmount());
      container.remove();
    },
    container,
  });
  return { container, onChange, rerender: render };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  while (roots.length) roots.pop()?.unmount();
});

const labelButton = (container: HTMLElement, text: string) => {
  const label = Array.from(container.querySelectorAll("label")).find((node) =>
    node.textContent?.includes(text)
  );
  return label?.querySelector<HTMLButtonElement>('[role="checkbox"]') ?? null;
};

test("renders counter-metric checkboxes for the current source (cms)", async () => {
  const { container } = mount({
    kind: "totals-counters",
    source: "cms",
    metrics: ["pages", "entries", "media", "users"],
    accent: "primary",
    format: "number",
    rangeDays: 30,
  });
  await flush();

  const text = container.textContent ?? "";
  expect(text).toContain("Source");
  expect(text).toContain("Metrics");
  expect(text).toContain("Value format");
  expect(text).toContain("Accent");
  expect(text).toContain("Trend range (days): 30");
  for (const metric of ["Pages", "Entries", "Media", "Users"]) {
    expect(text).toContain(metric);
  }
  // Traffic metrics must not appear while source is cms.
  expect(text).not.toContain("Pageviews");
});

test("counter-metric options follow the traffic source", async () => {
  const { container } = mount({
    kind: "totals-counters",
    source: "traffic",
    metrics: ["visitors", "pageviews", "sessions", "bounceRate"],
    accent: "primary",
    format: "number",
    rangeDays: 30,
  });
  await flush();
  const text = container.textContent ?? "";
  expect(text).toContain("Visitors");
  expect(text).toContain("Pageviews");
  expect(text).not.toContain("Pages");
});

test("toggling a metric checkbox emits the remaining metrics", async () => {
  const { container, onChange } = mount({
    kind: "totals-counters",
    source: "cms",
    metrics: ["pages", "entries", "media", "users"],
    accent: "primary",
    format: "number",
    rangeDays: 30,
  });
  await flush();

  const usersCheckbox = labelButton(container, "Users");
  expect(usersCheckbox).not.toBeNull();
  React.act(() => {
    usersCheckbox?.click();
  });
  expect(onChange).toHaveBeenCalledWith("metrics", ["pages", "entries", "media"]);
});

test("content-type multiselect sources options from the cached content types", async () => {
  const { container } = mount({ kind: "content-type-counts", limit: 10, display: "list" });
  await flush();
  const text = container.textContent ?? "";
  expect(text).toContain("Article");
  expect(text).toContain("Product");
});

test("quick-actions editor emits a renamed action", async () => {
  const { container, onChange } = mount({
    kind: "quick-actions",
    actions: [{ id: "qa-1", label: "Pages", target: "pages" }],
  });
  await flush();

  const labelInput = container.querySelector<HTMLInputElement>('input[aria-label="Action label"]');
  expect(labelInput).not.toBeNull();
  expect(labelInput?.value).toBe("Pages");

  React.act(() => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    setter?.call(labelInput, "Home");
    labelInput?.dispatchEvent(new Event("input", { bubbles: true }));
  });

  expect(onChange).toHaveBeenCalledWith("actions", [
    { id: "qa-1", label: "Home", target: "pages" },
  ]);
});

test("switching widgetId reseeds the quick-actions editor with the new widget's rows", async () => {
  // Widget A has a single "Pages" action; re-rendering with widget B's config
  // (a "Media" action) must show B's rows — not keep A's stale local drafts.
  const { container, rerender } = mount(
    { kind: "quick-actions", actions: [{ id: "qa-a", label: "Pages", target: "pages" }] },
    vi.fn(),
    "widget-A"
  );
  await flush();
  expect(container.querySelector<HTMLInputElement>('input[aria-label="Action label"]')?.value).toBe(
    "Pages"
  );

  rerender(
    { kind: "quick-actions", actions: [{ id: "qa-b", label: "Media", target: "media" }] },
    "widget-B"
  );
  await flush();
  const labels = Array.from(
    container.querySelectorAll<HTMLInputElement>('input[aria-label="Action label"]')
  ).map((input) => input.value);
  expect(labels).toEqual(["Media"]);
});

test("adding an action with an empty label clears the actions key", async () => {
  const { container, onChange } = mount({ kind: "quick-actions" });
  await flush();
  const addButton = Array.from(container.querySelectorAll("button")).find((node) =>
    node.textContent?.includes("Add action")
  );
  expect(addButton).not.toBeUndefined();
  React.act(() => {
    addButton?.click();
  });
  // A freshly added row has no label yet, so nothing valid is emitted.
  expect(onChange).toHaveBeenCalledWith("actions", undefined);
});
