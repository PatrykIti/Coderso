// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { CustomScreenEntriesPage } from "../../../core/admin/ui/custom-screens/CustomScreenEntriesPage";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { renderAdminUi } from "../../utils/adminRouterRender";

/**
 * TASK-479-14-L05: presentation guard for the published List View restyle
 * (TASK-479-14-L03). Confirms the Published banner, real-derived stat row,
 * view-type tabs, the soft `rounded-2xl` table, and the LOCAL "Customize view"
 * column toggle (no definition write), while the real entry bindings stay wired.
 */
const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      headline: { type: "string" as const, title: "Headline", xFieldType: "text" },
      budget: { type: "number" as const, title: "Budget", xFieldType: "number" },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const screenRecord = {
  id: "project-catalog",
  name: "Projects",
  contentTypeId: "type-1",
  status: "active" as const,
  showInSidebar: true,
  sidebarLabel: "Projects",
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [
        {
          id: "title",
          source: "system" as const,
          field: "title",
          label: "Title",
          formatter: "text" as const,
          visible: true,
        },
        {
          id: "budget",
          source: "field" as const,
          field: "budget",
          label: "Budget",
          formatter: "number" as const,
          visible: true,
        },
        {
          id: "status",
          source: "system" as const,
          field: "status",
          label: "Status",
          formatter: "text" as const,
          visible: true,
        },
      ],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" as const },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry" as const,
      interactionMode: "inline" as const,
      document: {
        schemaVersion: 1 as const,
        sections: [
          {
            id: "section-1",
            type: "section",
            data: { title: "Details" },
            blocks: [
              { id: "field-1", type: "field", data: { label: "Headline", field: "headline" } },
            ],
          },
        ],
      },
      bindings: [
        {
          id: "binding-1",
          blockId: "field-1",
          propPath: "value",
          source: "entry" as const,
          field: "headline",
          mode: "readwrite" as const,
        },
      ],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

const entries = [
  {
    id: "entry-1",
    typeId: "type-1",
    title: "Project Aurora",
    slug: "project-aurora",
    status: "published" as const,
    data: { headline: "Aurora", budget: 1200 },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T12:00:00.000Z",
  },
  {
    id: "entry-2",
    typeId: "type-1",
    title: "Project Borealis",
    slug: "project-borealis",
    status: "draft" as const,
    data: { headline: "Borealis", budget: 800 },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T10:00:00.000Z",
  },
];

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    "aria-label": ariaLabel,
  }: {
    checked?: boolean | "indeterminate";
    onCheckedChange?: (checked: boolean) => void;
    "aria-label"?: string;
  }) => (
    <input
      aria-label={ariaLabel}
      type="checkbox"
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
}));

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: vi.fn(() => [screenRecord]),
  listCustomScreensCached: vi.fn(async () => [screenRecord]),
  getCachedCustomScreen: vi.fn(() => screenRecord),
  getCustomScreenCached: vi.fn(async () => screenRecord),
  getCachedScreenEntryOverrides: vi.fn(() => []),
  getScreenEntryOverridesCached: vi.fn(async () => []),
  replaceScreenEntryOverrides: vi.fn(async () => []),
  invalidateScreenEntryOverrides: vi.fn(),
}));

vi.mock("@/services/contentTypesClient", () => ({
  getCachedContentTypes: vi.fn(() => [contentType]),
  listContentTypesCached: vi.fn(async () => [contentType]),
}));

vi.mock("@/services/entriesClient", () => ({
  deleteEntry: vi.fn(),
  publishEntry: vi.fn(),
  unpublishEntry: vi.fn(),
  updateEntry: vi.fn(),
  getCachedEntries: vi.fn(() => entries),
  listEntriesCached: vi.fn(async () => entries),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: vi.fn(() => () => undefined),
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: vi.fn(),
  setActiveAssistantSurfaceContext: vi.fn(),
  useActiveAssistantSurfaceContext: vi.fn(() => null),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const path = "/admin/advanced/custom-screens/project-catalog/entries";

const mount = () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath={path}>
        <CustomScreenEntriesPage />
      </AdminRouterProvider>
    );
  });
  return {
    container,
    cleanup: () => {
      React.act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    for (let index = 0; index < 6; index += 1) {
      await Promise.resolve();
    }
  });
};

const findButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes(label)
  );

const hasBudgetHeader = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("th")).some((th) => /budget/i.test(th.textContent ?? ""));

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("renders the Published banner, real-derived stats, view tabs, and a rounded-2xl table", () => {
  const html = renderAdminUi(<CustomScreenEntriesPage />, { path });

  expect(html).toContain("Published");
  expect(html).toContain("In sidebar");
  expect(html).toContain("Total records");
  expect(html).toContain("Board");
  expect(html).toContain("Customize view");
  expect(html).toContain("rounded-2xl");
});

test("title cell links via the canonical workspace href", () => {
  const html = renderAdminUi(<CustomScreenEntriesPage />, { path });
  expect(html).toMatch(/href="[^"]*\/advanced\/custom-screens\/project-catalog\/entries\//);
});

test("Customize view toggles the panel and a column toggle hides that column (local view state)", async () => {
  const view = mount();

  try {
    await flush();
    expect(hasBudgetHeader(view.container)).toBe(true);
    expect(view.container.querySelector('[data-custom-screen-view-config="true"]')).toBeNull();

    React.act(() => {
      findButton(view.container, "Customize view")?.click();
    });
    await flush();
    expect(view.container.querySelector('[data-custom-screen-view-config="true"]')).not.toBeNull();

    const budgetToggle = view.container.querySelector<HTMLInputElement>(
      'input[aria-label="Show Budget column"]'
    );
    expect(budgetToggle).not.toBeNull();

    React.act(() => {
      budgetToggle?.click();
    });
    await flush();

    expect(hasBudgetHeader(view.container)).toBe(false);
  } finally {
    view.cleanup();
  }
});
