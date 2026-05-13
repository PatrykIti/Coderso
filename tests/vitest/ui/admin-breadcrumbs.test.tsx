// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { TopBar } from "../../../core/admin/ui/shared/TopBar";

vi.mock("@/ui/shared/AdminThemeSwitcher", () => ({
  AdminThemeSwitcher: () => <div data-testid="admin-theme-switcher" />,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mountTopBar = (breadcrumbs: React.ComponentProps<typeof TopBar>["breadcrumbs"]) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/engine/ct-products/collection">
        <TopBar breadcrumbs={breadcrumbs} />
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

const getBreadcrumbLinks = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('nav[aria-label="Breadcrumb"] a'));

test("TopBar converts legacy local breadcrumb markup into clickable admin links", () => {
  const view = mountTopBar(
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Advanced</span>
      <span>/</span>
      <span>Engine</span>
      <span>/</span>
      <span className="text-foreground">Collection</span>
    </div>
  );

  try {
    const links = getBreadcrumbLinks(view.container);
    expect(links.map((link) => link.textContent)).toEqual(["Advanced", "Engine"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/admin/advanced/engine",
      "/admin/advanced/engine",
    ]);
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("Collection");
  } finally {
    view.cleanup();
  }
});

test("TopBar renders shorthand breadcrumb labels with inferred known links", () => {
  const view = mountTopBar(["Pages", "Products"]);

  try {
    const links = getBreadcrumbLinks(view.container);
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Pages");
    expect(links[0]?.getAttribute("href")).toBe("/admin/pages");
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("Products");
  } finally {
    view.cleanup();
  }
});
