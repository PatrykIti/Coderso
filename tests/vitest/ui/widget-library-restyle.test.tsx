// @vitest-environment happy-dom
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { WidgetLibraryPage } from "../../../core/admin/ui/widgets/WidgetLibraryPage";

// Mutable hoisted seed (mirrors widget-library-preview-feedback.test.tsx): Lane-A
// SSR tests run on an EMPTY catalog; the Lane-B grid test pushes one item.
const catalog = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("sonner", () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));
vi.mock("@/services/widgetsClient", () => ({
  getCachedWidgetCatalog: () => catalog,
  listWidgetCatalogCached: async () => catalog,
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
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
afterEach(() => {
  catalog.length = 0;
  document.body.innerHTML = "";
});

// LANE A (SSR snapshot, empty catalog) — toolbar chrome + preserved scaffolding.
test("toolbar card uses the soft rounded-2xl chrome", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  expect(html).toContain("Widget Library");
  expect(html).toContain("rounded-2xl"); // restyled toolbar chrome
  expect(html).toContain("shadow-soft"); // soft shadow token (479-05)
  // Preserved scaffolding (must NOT regress from widget-library.test.tsx):
  expect(html).toContain("Available widget library sections:");
  expect(html).toContain("Section:");
  expect(html).toContain("Default view: table");
  expect(html).toContain("Show widgets as table");
  expect(html).toContain("Show widgets as grid");
  expect(html).toContain("No items match your search."); // empty state preserved
});

// LANE A — the section Select (via its sr-only list) carries only real registry
// categories; the prototype "Marketing" tab has NO registry equivalent.
test("section Select renders only real registry categories (no fabricated Marketing)", () => {
  const html = renderAdminUi(<WidgetLibraryPage />);
  // sr-only "Available widget library sections:" maps sectionOptions:
  // Layout/Content/Forms/Navigation/Media (+ All Items / Favorites / All Widgets).
  expect(html).not.toContain("Marketing");
});

// LANE B (interactive) — seed one item, mount, toggle to grid, assert the card.
test("grid view renders a rounded-2xl card with abstract preview + kebab actions", () => {
  catalog.push({
    id: "hero",
    source: "core",
    name: "Hero",
    description: "Page hero section",
    category: "layout",
    variants: [],
    complexity: "composite",
    audience: "beginner",
    module: "content",
    presets: [],
    requires: [],
    status: "published",
  });
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    React.act(() => {
      root.render(
        <AdminRouterProvider initialPath="/admin/advanced/widgets">
          <WidgetLibraryPage />
        </AdminRouterProvider>
      );
    });
    const gridBtn = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Show widgets as grid"
    );
    React.act(() => {
      gridBtn?.click();
    });
    // The restyled WidgetCard (scope to the grid, not the toolbar's rounded-2xl):
    expect(container.textContent).toContain("Hero"); // widget name
    expect(container.textContent).toContain("Layout"); // category Badge
    expect(container.innerHTML).toContain("rounded-2xl"); // card chrome
    expect(container.innerHTML).toContain("rounded-xl"); // ported PreviewFrame
    expect(container.innerHTML).toContain("bg-muted"); // warm muted token
    expect(container.innerHTML).not.toContain("bg-background/80"); // old frame gone
    // Insert/Preview live INSIDE this kebab (closed) — assert the trigger only:
    const kebab = Array.from(container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Open widget actions"
    );
    expect(kebab).toBeTruthy();
  } finally {
    React.act(() => {
      root.unmount();
    });
    container.remove();
  }
});
