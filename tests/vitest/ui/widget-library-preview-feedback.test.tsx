// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const toastInfo = vi.hoisted(() => vi.fn());
const widgetCatalog = vi.hoisted(() => [
  {
    id: "hero",
    source: "core" as const,
    name: "Hero",
    description: "Page hero section",
    category: "layout",
    variants: [],
    complexity: "composite" as const,
    audience: "beginner" as const,
    module: "content",
    presets: [],
    requires: [],
    status: "published" as const,
  },
]);

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    info: toastInfo,
    success: vi.fn(),
  },
}));

vi.mock("@/services/widgetsClient", () => ({
  getCachedWidgetCatalog: () => widgetCatalog,
  listWidgetCatalogCached: async () => widgetCatalog,
}));

vi.mock("@/services/widgetTemplateCategoriesClient", () => ({
  createWidgetTemplateCategory: vi.fn(),
  deleteWidgetTemplateCategory: vi.fn(),
  getCachedWidgetTemplateCategories: () => [],
  listWidgetTemplateCategoriesCached: async () => [],
  updateWidgetTemplateCategory: vi.fn(),
}));

vi.mock("@/services/pagesClient", () => ({
  getCachedPages: () => [],
  getPageCached: vi.fn(),
  listPagesCached: async () => [],
  updatePage: vi.fn(),
}));

vi.mock("@/services/userSettingsClient", () => ({
  getUserSettings: async () => ({ "widgets.favorites": [] }),
  setUserSetting: vi.fn(),
}));

vi.mock("@/services/widgetTemplatesClient", () => ({
  deleteWidgetTemplate: vi.fn(),
  duplicateWidgetTemplate: vi.fn(),
  getWidgetTemplateCached: vi.fn(),
  updateWidgetTemplate: vi.fn(),
}));

vi.mock("../../../core/admin/ui/widgets/WidgetLibraryRowActions", () => ({
  WidgetLibraryRowActions: ({ onPreview }: { onPreview: () => void }) => (
    <button type="button" onClick={onPreview}>
      Preview
    </button>
  ),
}));

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(node);
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

afterEach(() => {
  document.body.innerHTML = "";
  toastInfo.mockReset();
});

test("WidgetLibraryPage preview feedback stays toast-only", () => {
  const view = mount(
    <AdminRouterProvider initialPath="/admin/advanced/widgets">
      <WidgetLibraryPage />
    </AdminRouterProvider>
  );

  try {
    const preview = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Preview")
    ) as HTMLButtonElement | undefined;
    expect(preview).toBeDefined();

    React.act(() => {
      preview?.click();
    });

    const message = "Hero preview is not available yet.";
    expect(toastInfo).toHaveBeenCalledWith(message);
    expect(view.container.textContent).not.toContain(message);
  } finally {
    view.cleanup();
  }
});
