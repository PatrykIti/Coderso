// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { Database } from "lucide-react";
import { renderToString } from "react-dom/server";

const adminShellServiceMocks = vi.hoisted(() => ({
  getCachedCustomScreens: vi.fn(() => []),
  listCustomScreensCached: vi.fn(async () => []),
  getCachedSolutionKits: vi.fn<() => SolutionKitSummary[]>(() => []),
  listSolutionKitsCached: vi.fn<() => Promise<SolutionKitSummary[]>>(async () => []),
  getActiveSolutionKitId: vi.fn<() => SolutionKitId | null>(() => null),
  subscribeActiveSolutionKitId: vi.fn<
    (handler: (kitId: SolutionKitId | null) => void) => () => undefined
  >(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

vi.mock("@/services/customScreensClient", () => ({
  getCachedCustomScreens: adminShellServiceMocks.getCachedCustomScreens,
  listCustomScreensCached: adminShellServiceMocks.listCustomScreensCached,
}));

vi.mock("@/services/customScreenShortcutsClient", () => ({
  getCachedCustomScreenShortcuts: adminShellServiceMocks.getCachedCustomScreens,
  listCustomScreenShortcutsCached: adminShellServiceMocks.listCustomScreensCached,
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
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type {
  SolutionKitId,
  SolutionKitSummary,
} from "../../../core/admin/services/solutionKitsClient";
import {
  clearRedactedSettingsCache,
  primeRedactedSettingsCache,
} from "../../../core/admin/services/settingsCache";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
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
  window.localStorage.clear();
  clearRedactedSettingsCache();
  adminShellServiceMocks.getCachedCustomScreens.mockReturnValue([]);
  adminShellServiceMocks.listCustomScreensCached.mockResolvedValue([]);
  adminShellServiceMocks.getCachedSolutionKits.mockReturnValue([]);
  adminShellServiceMocks.listSolutionKitsCached.mockResolvedValue([]);
  adminShellServiceMocks.getActiveSolutionKitId.mockReturnValue(null);
  document.body.innerHTML = "";
});

test("SidebarNav renders Advanced group with canonical child links", () => {
  const html = renderSidebar(defaultNavSections, {
    activeHref: "/admin/advanced/forms",
  });

  expect(html).toContain("Coderso");
  expect(html).toContain("Advanced");
  expect(html).toContain("Engine");
  expect(html).toContain("/admin/advanced/engine");
  expect(html).toContain("/admin/advanced/entries");
  expect(html).toContain("/admin/advanced/custom-screens");
  expect(html).not.toContain("/admin/advanced/widgets");
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

test("AdminShell hides the default Settings nav item without settings:read", () => {
  const html = renderToString(
    <AdminRouterProvider initialPath="/admin/pages">
      <AdminBasePathProvider value="/admin">
        <AdminAuthProvider
          user={{
            id: "content-reader-1",
            email: "content-reader@example.com",
            name: null,
            permissionSnapshot: {
              permissions: ["content:read"],
              roles: [{ id: "role-1", slug: "content-reader", name: "Content Reader" }],
            },
          }}
        >
          <AdminShell showSearch={false}>
            <div>Pages content</div>
          </AdminShell>
        </AdminAuthProvider>
      </AdminBasePathProvider>
    </AdminRouterProvider>
  );

  expect(html).toContain("/admin/pages");
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

const siteSettingsPayload = (overrides: Record<string, unknown> = {}) => ({
  "site.name": "Coderso",
  "site.locale": "en",
  "site.publicBaseUrl": null,
  "site.adminBaseUrl": null,
  "site.adminPath": "/admin",
  "site.adminRedirectEnabled": false,
  "site.homepageId": null,
  "site.notFoundPageId": null,
  "site.navigationMenuId": "menu-published",
  "site.footerTemplateId": "template-published",
  "site.previewEnabled": true,
  "site.cacheTtlSeconds": 30,
  "site.contentRoutes": [],
  ...overrides,
});

const smallEcommerceKit: SolutionKitSummary = {
  id: "small-ecommerce",
  title: "Small Ecommerce",
  shortDescription: "Storefront kit",
  recommendedModules: [],
  features: [],
};

const primeSolutionKitCatalog = () => {
  adminShellServiceMocks.getCachedSolutionKits.mockReturnValue([smallEcommerceKit]);
  adminShellServiceMocks.listSolutionKitsCached.mockResolvedValue([smallEcommerceKit]);
};

const groupToggle = (container: HTMLElement) =>
  container.querySelector('button[aria-controls="nav-group-advanced"]') as HTMLButtonElement;

test("AdminShell merges stored nav group state and persists desktop toggles", async () => {
  window.localStorage.setItem("coderso.admin.navGroupState", JSON.stringify({ advanced: false }));
  const view = mountShell(["content:read"]);

  try {
    await flush();
    expect(groupToggle(view.container).getAttribute("aria-expanded")).toBe("false");

    React.act(() => {
      groupToggle(view.container).click();
    });
    await flush();

    expect(groupToggle(view.container).getAttribute("aria-expanded")).toBe("true");
    const persisted = JSON.parse(
      window.localStorage.getItem("coderso.admin.navGroupState") ?? "{}"
    ) as Record<string, unknown>;
    expect(persisted.advanced).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("AdminShell normalizes legacy and corrupt stored nav group states", async () => {
  window.localStorage.setItem("nextless.admin.navGroupState", JSON.stringify({ coderso: false }));
  const legacyView = mountShell(["content:read"]);
  try {
    await flush();
    expect(groupToggle(legacyView.container).getAttribute("aria-expanded")).toBe("false");
  } finally {
    legacyView.cleanup();
  }

  window.localStorage.clear();
  window.localStorage.setItem("coderso.admin.navGroupState", "not-json");
  const corruptView = mountShell(["content:read"]);
  try {
    await flush();
    expect(groupToggle(corruptView.container).getAttribute("aria-expanded")).toBe("true");
  } finally {
    corruptView.cleanup();
  }

  window.localStorage.clear();
  window.localStorage.setItem("coderso.admin.navGroupState", JSON.stringify({ advanced: "yes" }));
  const nonBooleanView = mountShell(["content:read"]);
  try {
    await flush();
    expect(groupToggle(nonBooleanView.container).getAttribute("aria-expanded")).toBe("true");
  } finally {
    nonBooleanView.cleanup();
  }

  window.localStorage.clear();
  window.localStorage.setItem("coderso.admin.navGroupState", JSON.stringify("42"));
  const primitiveView = mountShell(["content:read"]);
  try {
    await flush();
    expect(groupToggle(primitiveView.container).getAttribute("aria-expanded")).toBe("true");
  } finally {
    primitiveView.cleanup();
  }
});

test("AdminShell derives site identity from cached redacted settings", async () => {
  primeRedactedSettingsCache(
    siteSettingsPayload({ "site.name": "Acme Studio", "site.publicBaseUrl": "https://acme.test" })
  );
  const view = mountShell(["content:read"]);

  try {
    await flush();
    expect(view.container.textContent).toContain("Acme Studio");
    expect(view.container.textContent).toContain("acme.test");
  } finally {
    view.cleanup();
  }
});

test("AdminShell reacts to settingsRedacted cache events with a fresh identity", async () => {
  primeRedactedSettingsCache(siteSettingsPayload({ "site.name": "Acme Studio" }));
  const view = mountShell(["content:read"]);

  try {
    await flush();
    expect(view.container.textContent).toContain("Acme Studio");

    primeRedactedSettingsCache(siteSettingsPayload({ "site.name": "Rebranded Co" }));
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.settingsRedacted, action: "update" });
    });
    await flush();

    expect(view.container.textContent).toContain("Rebranded Co");
  } finally {
    view.cleanup();
  }
});

test("AdminShell tolerates an invalid public URL for site identity", async () => {
  primeRedactedSettingsCache(
    siteSettingsPayload({ "site.name": "Acme Studio", "site.publicBaseUrl": "not-a-url" })
  );
  const view = mountShell(["content:read"]);

  try {
    await flush();
    expect(view.container.textContent).toContain("Acme Studio");
  } finally {
    view.cleanup();
  }
});

test("AdminShell loads advanced catalogs and matches the active solution kit", async () => {
  primeSolutionKitCatalog();
  adminShellServiceMocks.getActiveSolutionKitId.mockReturnValue("small-ecommerce");
  const view = mountShell(["content:read", "solution-kits:read"]);

  try {
    await flush();
    expect(adminShellServiceMocks.listCustomScreensCached).toHaveBeenCalled();
    expect(adminShellServiceMocks.listSolutionKitsCached).toHaveBeenCalled();
    expect(adminShellServiceMocks.buildAdvancedFeatureFlagsForSolutionKit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "small-ecommerce" })
    );
  } finally {
    view.cleanup();
  }
});

test("AdminShell refreshes custom screen shortcuts on cache events", async () => {
  const view = mountShell(["content:read"]);

  try {
    await flush();
    expect(adminShellServiceMocks.listCustomScreensCached).toHaveBeenCalled();

    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
    });
    await flush();

    expect(adminShellServiceMocks.listCustomScreensCached).toHaveBeenCalledWith({
      force: true,
    });
  } finally {
    view.cleanup();
  }
});

test("AdminShell follows active solution kit subscription events", async () => {
  primeSolutionKitCatalog();
  const view = mountShell(["solution-kits:read"]);

  try {
    await flush();
    const handler = adminShellServiceMocks.subscribeActiveSolutionKitId.mock.calls.at(-1)?.[0] as
      ((kitId: SolutionKitId | null) => void) | undefined;
    expect(handler).toBeTypeOf("function");

    React.act(() => {
      handler?.("small-ecommerce");
    });
    await flush();

    expect(adminShellServiceMocks.buildAdvancedFeatureFlagsForSolutionKit).toHaveBeenCalledWith(
      expect.objectContaining({ id: "small-ecommerce" })
    );
  } finally {
    view.cleanup();
  }
});

test("AdminShell opens the mobile navigation, toggles groups, and navigates closed", async () => {
  const view = mountShell(["content:read"]);

  try {
    await flush();
    const openButton = view.container.querySelector(
      'button[aria-label="Open navigation"]'
    ) as HTMLButtonElement;
    expect(openButton).not.toBeNull();
    React.act(() => {
      openButton.click();
    });
    await flush();

    const sheetDialog = document.body.querySelector('[role="dialog"]');
    expect(sheetDialog).not.toBeNull();
    expect(sheetDialog?.textContent).toContain("Dashboard");

    const mobileToggle = sheetDialog?.querySelector(
      'button[aria-controls="nav-group-advanced"]'
    ) as HTMLButtonElement | null | undefined;
    expect(mobileToggle).not.toBeNull();
    React.act(() => {
      mobileToggle?.click();
    });
    await flush();

    const persisted = JSON.parse(
      window.localStorage.getItem("coderso.admin.navGroupState") ?? "{}"
    ) as Record<string, unknown>;
    expect(persisted.advanced).toBe(false);

    const mobileLink = Array.from(sheetDialog?.querySelectorAll("a") ?? []).find((item) =>
      item.textContent?.includes("Dashboard")
    );
    React.act(() => {
      (mobileLink as HTMLAnchorElement | undefined)?.click();
    });
    await flush();

    const dialogAfter = document.body.querySelector('[role="dialog"]');
    expect(dialogAfter?.getAttribute("data-state")).not.toBe("open");
  } finally {
    view.cleanup();
  }
});

test("AdminShell tolerates catalog load failures without breaking navigation", async () => {
  adminShellServiceMocks.listCustomScreensCached.mockRejectedValue(new Error("catalog offline"));
  adminShellServiceMocks.listSolutionKitsCached.mockRejectedValue(new Error("catalog offline"));
  const view = mountShell(["content:read", "solution-kits:read"]);

  try {
    await flush();
    expect(view.container.textContent).toContain("Dashboard");

    // A forced custom-screens refresh that fails is swallowed too.
    React.act(() => {
      broadcastCacheEvent({ key: cacheKeys.customScreensList, action: "update" });
    });
    await flush();
    expect(adminShellServiceMocks.listCustomScreensCached).toHaveBeenCalledWith({
      force: true,
    });
    expect(view.container.textContent).toContain("Dashboard");
  } finally {
    view.cleanup();
  }
});
