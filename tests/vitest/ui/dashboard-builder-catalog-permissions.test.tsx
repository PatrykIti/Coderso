// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const dashboardClientMock = vi.hoisted(() => {
  const initialLayout = { version: 1 as const, widgets: [] };
  const initialData = { generatedAt: "2026-08-23T00:00:00.000Z", widgets: [] };

  return {
    getDashboardLayoutCached: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
    getDashboardWidgetDataCached: vi.fn(async () => initialData),
    previewDashboardWidgetData: vi.fn(async () => initialData),
    saveDashboardLayout: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
    resetDashboardLayout: vi.fn(async () => ({ layout: initialLayout, updatedAt: null })),
    subscribeDashboardCache: vi.fn(() => () => undefined),
  };
});

vi.mock("@/services/dashboardClient", () => dashboardClientMock);

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { DashboardBuilder } from "../../../core/admin/ui/dashboard/DashboardBuilder";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createdRoots: Array<{ unmount: () => void }> = [];
const createdContainers: HTMLDivElement[] = [];

afterEach(() => {
  React.act(() => {
    while (createdRoots.length > 0) createdRoots.pop()?.unmount();
  });
  while (createdContainers.length > 0) createdContainers.pop()?.remove();
});

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

test("filters the public catalog by permission while keeping unrestricted cards enabled", async () => {
  const container = document.createElement("div");
  createdContainers.push(container);
  const root = createRoot(container);
  createdRoots.push(root);
  document.body.appendChild(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <DashboardBuilder canWrite can={() => false} />
      </AdminRouterProvider>
    );
  });
  await flush();

  const customize = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.includes("Customize")
  );
  expect(customize).toBeDefined();
  if (customize === undefined) {
    throw new Error("Customize button not found");
  }
  React.act(() => customize.click());
  await flush();

  const catalogCard = (description: string) =>
    Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes(description)
    ) ?? null;

  expect(catalogCard("CMS or traffic totals")).toBeNull();
  expect(catalogCard("Media storage usage")).toBeNull();
  expect(catalogCard("Storage and security status")).toBeNull();
  expect(catalogCard("Entry counts by collection")?.disabled).toBe(false);
  expect(catalogCard("Content or traffic trend")?.disabled).toBe(false);
  expect(catalogCard("Latest content and media changes")?.disabled).toBe(false);
  expect(catalogCard("Admin protection checks")?.disabled).toBe(false);
  expect(catalogCard("Common admin shortcuts")?.disabled).toBe(false);
  expect(catalogCard("Filtered entry list")?.disabled).toBe(false);
});
