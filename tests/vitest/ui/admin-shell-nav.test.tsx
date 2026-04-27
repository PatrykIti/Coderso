// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";
import { Database } from "lucide-react";
import { renderToString } from "react-dom/server";

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import {
  appendNavItemsAfterGroup,
  defaultNavSections,
  type NavSection,
} from "../../../core/admin/ui/navigation/sidebarConfig";
import { SidebarNav } from "../../../core/admin/ui/shared/SidebarNav";
import { mapNavSections } from "../../../core/admin/utils/adminPaths";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

const renderSidebar = (
  sections: NavSection[],
  options?: {
    activeHref?: string;
    canAccess?: (permission?: string) => boolean;
  }
) =>
  renderToString(
    <AdminRouterProvider initialPath={options?.activeHref ?? "/admin"}>
      <AdminBasePathProvider value="/admin">
        <SidebarNav
          sections={mapNavSections(sections, "/admin")}
          activeHref={options?.activeHref}
          canAccess={options?.canAccess}
          groupState={{ coderso: true }}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

const mountSidebar = (sections: NavSection[]) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <AdminBasePathProvider value="/admin">
          <SidebarNav
            sections={mapNavSections(sections, "/admin")}
            activeHref="/admin"
          />
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  window.sessionStorage.clear();
  document.body.innerHTML = "";
});

test("SidebarNav renders Coderso group with canonical child links", () => {
  const html = renderSidebar(defaultNavSections, {
    activeHref: "/admin/coderso/widgets",
  });

  expect(html).toContain("Coderso");
  expect(html).toContain("Engine");
  expect(html).toContain("/admin/coderso/engine");
  expect(html).toContain("/admin/coderso/entries");
  expect(html).toContain("/admin/coderso/custom-screens");
  expect(html).toContain("/admin/coderso/widgets");
  expect(html).toContain("/admin/coderso/forms");
  expect(html).toContain("/admin/coderso/reviews");
  expect(html).toContain("/admin/coderso/commerce");
  expect(html).toContain("/admin/coderso/popups");
  expect(html).toContain("/admin/coderso/solution-kits");
});

test("SidebarNav preserves desktop menu scroll position across navigation remounts", () => {
  const sections: NavSection[] = [
    {
      title: "Main",
      items: [
        { label: "Dashboard", href: "/admin", icon: Database },
        { label: "SEO", href: "/admin/seo", icon: Database },
      ],
    },
  ];
  const firstView = mountSidebar(sections);

  try {
    const nav = firstView.container.querySelector("nav");
    const seoLink = Array.from(firstView.container.querySelectorAll("a")).find(
      (item) => item.textContent?.includes("SEO")
    );
    expect(nav).toBeTruthy();
    expect(seoLink).toBeTruthy();

    act(() => {
      (nav as HTMLElement).scrollTop = 180;
      (seoLink as HTMLAnchorElement).click();
    });
  } finally {
    firstView.cleanup();
  }

  const secondView = mountSidebar(sections);
  try {
    const restoredNav = secondView.container.querySelector("nav");
    expect(restoredNav?.scrollTop).toBe(180);
  } finally {
    secondView.cleanup();
  }
});

test("SidebarNav hides Coderso group when all children are unauthorized", () => {
  const restrictedSections: NavSection[] = [
    {
      title: "Main",
      groups: [
        {
          id: "coderso",
          label: "Coderso",
          items: [
            {
              label: "Engine",
              href: "/admin/coderso/engine",
              icon: Database,
              permission: "content:read",
            },
          ],
        },
      ],
    },
  ];

  const html = renderSidebar(restrictedSections, {
    activeHref: "/admin/coderso/engine",
    canAccess: () => false,
  });

  expect(html).not.toContain("Coderso");
  expect(html).not.toContain("/admin/coderso/engine");
});

test("SidebarNav renders custom screen shortcuts after the Coderso group", () => {
  const sections = appendNavItemsAfterGroup(defaultNavSections, "coderso", [
    {
      label: "Catalog",
      href: "/admin/coderso/custom-screens/screen-1/entries",
      icon: Database,
    },
  ]);

  const html = renderSidebar(sections, {
    activeHref: "/admin/coderso/custom-screens/screen-1/entries",
  });

  expect(html).toContain("Catalog");
  expect(html).toContain("/admin/coderso/custom-screens/screen-1/entries");
});
