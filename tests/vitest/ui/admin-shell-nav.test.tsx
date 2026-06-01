// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Database } from "lucide-react";
import { renderToString } from "react-dom/server";

const adminShellServiceMocks = vi.hoisted(() => ({
  getCachedCustomScreens: vi.fn(() => []),
  listCustomScreensCached: vi.fn(async () => []),
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: adminShellServiceMocks.getCachedCustomScreens,
  listCustomScreensCached: adminShellServiceMocks.listCustomScreensCached,
}));

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: adminShellServiceMocks.getCachedSolutionKits,
  listSolutionKitsCached: adminShellServiceMocks.listSolutionKitsCached,
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: adminShellServiceMocks.getActiveSolutionKitId,
  subscribeActiveSolutionKitId: adminShellServiceMocks.subscribeActiveSolutionKitId,
  buildAdvancedFeatureFlagsForSolutionKit:
    adminShellServiceMocks.buildAdvancedFeatureFlagsForSolutionKit,
}));

import { AdminBasePathProvider } from "../../../core/admin/ui/contexts/AdminBasePathContext";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminShell } from "../../../core/admin/ui/layouts/AdminShell";
import {
  appendNavItemsAfterGroup,
  defaultNavSections,
  type NavSection,
} from "../../../core/admin/ui/navigation/sidebarConfig";
import { SidebarNav } from "../../../core/admin/ui/shared/SidebarNav";
import { mapNavSections } from "../../../core/admin/utils/adminPaths";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
          groupState={{ advanced: true }}
        />
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

const mountSidebar = (sections: NavSection[]) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin">
        <AdminBasePathProvider value="/admin">
          <SidebarNav sections={mapNavSections(sections, "/admin")} activeHref="/admin" />
        </AdminBasePathProvider>
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

const mountShell = (permissions: string[]) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/users">
        <AdminBasePathProvider value="/admin">
          <AdminAuthProvider
            user={{
              id: "user-1",
              email: "user@example.com",
              name: null,
              permissionSnapshot: {
                permissions,
                roles: [{ id: "role-1", slug: "test-role", name: "Test Role" }],
              },
            }}
          >
            <AdminShell showSearch={false}>
              <div>Users content</div>
            </AdminShell>
          </AdminAuthProvider>
        </AdminBasePathProvider>
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
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  window.sessionStorage.clear();
  document.body.innerHTML = "";
});

test("SidebarNav renders Advanced group with canonical child links", () => {
  const html = renderSidebar(defaultNavSections, {
    activeHref: "/admin/advanced/widgets",
  });

  expect(html).toContain("Coderso");
  expect(html).toContain("Advanced");
  expect(html).toContain("Engine");
  expect(html).toContain("/admin/advanced/engine");
  expect(html).toContain("/admin/advanced/entries");
  expect(html).toContain("/admin/advanced/custom-screens");
  expect(html).toContain("/admin/advanced/widgets");
  expect(html).toContain("/admin/advanced/forms");
  expect(html).toContain("/admin/advanced/reviews");
  expect(html).toContain("/admin/advanced/commerce");
  expect(html).toContain("/admin/advanced/popups");
  expect(html).toContain("/admin/advanced/solution-kits");
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
    const seoLink = Array.from(firstView.container.querySelectorAll("a")).find((item) =>
      item.textContent?.includes("SEO")
    );
    expect(nav).toBeTruthy();
    expect(seoLink).toBeTruthy();

    React.act(() => {
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

test("SidebarNav hides Advanced group when all children are unauthorized", () => {
  const restrictedSections: NavSection[] = [
    {
      title: "Main",
      groups: [
        {
          id: "advanced",
          label: "Advanced",
          items: [
            {
              label: "Engine",
              href: "/admin/advanced/engine",
              icon: Database,
              permission: "content:read",
            },
          ],
        },
      ],
    },
  ];

  const html = renderSidebar(restrictedSections, {
    activeHref: "/admin/advanced/engine",
    canAccess: () => false,
  });

  expect(html).not.toContain("Advanced");
  expect(html).not.toContain("/admin/advanced/engine");
});

test("AdminShell filters navigation through the shared permission snapshot", () => {
  const sections: NavSection[] = [
    {
      title: "Admin",
      items: [
        { label: "Users", href: "/admin/users", icon: Database, permission: "users:read" },
        { label: "Settings", href: "/admin/settings", icon: Database, permission: "settings:read" },
      ],
    },
  ];

  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/users">
      <AdminBasePathProvider value="/admin">
        <AdminAuthProvider
          user={{
            id: "user-1",
            email: "restricted@example.com",
            name: null,
            permissionSnapshot: {
              permissions: ["users:read"],
              roles: [{ id: "role-1", slug: "users-reader", name: "Users Reader" }],
            },
          }}
        >
          <AdminShell navSections={sections} showSearch={false}>
            <div>Users content</div>
          </AdminShell>
        </AdminAuthProvider>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Users");
  expect(html).toContain("/admin/users");
  expect(html).not.toContain("/admin/settings");
});

test("AdminShell shows nav items when any configured permission is present", () => {
  const sections: NavSection[] = [
    {
      title: "Admin",
      items: [
        {
          label: "Users",
          href: "/admin/users",
          icon: Database,
          anyPermissions: ["users:read", "roles:read"],
        },
        { label: "Settings", href: "/admin/settings", icon: Database, permission: "settings:read" },
      ],
    },
  ];

  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/users">
      <AdminBasePathProvider value="/admin">
        <AdminAuthProvider
          user={{
            id: "role-reader-1",
            email: "role-reader@example.com",
            name: null,
            permissionSnapshot: {
              permissions: ["roles:read"],
              roles: [{ id: "role-1", slug: "role-reader", name: "Role Reader" }],
            },
          }}
        >
          <AdminShell navSections={sections} showSearch={false}>
            <div>Users content</div>
          </AdminShell>
        </AdminAuthProvider>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("Users");
  expect(html).toContain("/admin/users");
  expect(html).not.toContain("/admin/settings");
});

test("AdminShell hides any-permission nav items when none are present", () => {
  const sections: NavSection[] = [
    {
      title: "Admin",
      items: [
        {
          label: "Users",
          href: "/admin/users",
          icon: Database,
          anyPermissions: ["users:read", "roles:read"],
        },
        { label: "Settings", href: "/admin/settings", icon: Database, permission: "settings:read" },
      ],
    },
  ];

  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/settings">
      <AdminBasePathProvider value="/admin">
        <AdminAuthProvider
          user={{
            id: "settings-reader-1",
            email: "settings-reader@example.com",
            name: null,
            permissionSnapshot: {
              permissions: ["settings:read"],
              roles: [{ id: "role-1", slug: "settings-reader", name: "Settings Reader" }],
            },
          }}
        >
          <AdminShell navSections={sections} showSearch={false}>
            <div>Settings content</div>
          </AdminShell>
        </AdminAuthProvider>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).not.toContain("/admin/users");
  expect(html).toContain("/admin/settings");
});

test("AdminShell does not load advanced catalogs without matching permissions", async () => {
  const view = mountShell(["users:read"]);

  try {
    await flush();

    expect(adminShellServiceMocks.getCachedCustomScreens).not.toHaveBeenCalled();
    expect(adminShellServiceMocks.listCustomScreensCached).not.toHaveBeenCalled();
    expect(adminShellServiceMocks.getCachedSolutionKits).not.toHaveBeenCalled();
    expect(adminShellServiceMocks.listSolutionKitsCached).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("SidebarNav renders custom screen shortcuts after the Advanced group", () => {
  const sections = appendNavItemsAfterGroup(defaultNavSections, "advanced", [
    {
      label: "Catalog",
      href: "/admin/advanced/custom-screens/screen-1/entries",
      icon: Database,
    },
  ]);

  const html = renderSidebar(sections, {
    activeHref: "/admin/advanced/custom-screens/screen-1/entries",
  });

  expect(html).toContain("Catalog");
  expect(html).toContain("/admin/advanced/custom-screens/screen-1/entries");
});

test("SidebarNav prefers the custom screen records shortcut over the generic Screens item", () => {
  const sections = appendNavItemsAfterGroup(defaultNavSections, "advanced", [
    {
      label: "Catalog",
      href: "/admin/advanced/custom-screens/screen-1/entries",
      icon: Database,
    },
  ]);
  const view = mountSidebar(sections);

  try {
    const root = view.container;
    const genericScreensLink = root.querySelector(
      'a[href="/admin/advanced/custom-screens"]'
    ) as HTMLAnchorElement | null;
    const customScreenShortcutLink = root.querySelector(
      'a[href="/admin/advanced/custom-screens/screen-1/entries"]'
    ) as HTMLAnchorElement | null;

    expect(genericScreensLink).not.toBeNull();
    expect(customScreenShortcutLink).not.toBeNull();
  } finally {
    view.cleanup();
  }

  const activeContainer = document.createElement("div");
  document.body.appendChild(activeContainer);
  const activeRoot = createRoot(activeContainer);

  React.act(() => {
    activeRoot.render(
      <AdminRouterProvider initialPath="/admin/advanced/custom-screens/screen-1/entries/entry-1">
        <AdminBasePathProvider value="/admin">
          <SidebarNav
            sections={mapNavSections(sections, "/admin")}
            activeHref="/admin/advanced/custom-screens/screen-1/entries"
            groupState={{ advanced: true }}
          />
        </AdminBasePathProvider>
      </AdminRouterProvider>
    );
  });

  try {
    const genericScreensLink = activeContainer.querySelector(
      'a[href="/admin/advanced/custom-screens"]'
    ) as HTMLAnchorElement | null;
    const customScreenShortcutLink = activeContainer.querySelector(
      'a[href="/admin/advanced/custom-screens/screen-1/entries"]'
    ) as HTMLAnchorElement | null;

    expect(genericScreensLink?.className.includes("bg-[var(--admin-sidebar-active-bg)]")).toBe(
      false
    );
    expect(
      customScreenShortcutLink?.className.includes("bg-[var(--admin-sidebar-active-bg)]")
    ).toBe(true);
  } finally {
    React.act(() => {
      activeRoot.unmount();
    });
    activeContainer.remove();
  }
});
