// @vitest-environment happy-dom
//
// TASK-105-08-09 (L09) shared-a: `TopBar` breadcrumb rendering and the
// `shared/AdminBreadcrumbs` legacy-compat parser edges, plus the UserMenu
// identity/sign-out flow. The two original tests pin the happy path; the added
// cases cover default breadcrumbs, legacy-markup parse failures, shorthand label
// fallbacks, and the initials/sign-out behavior.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { AdminAuthProvider } from "../../../core/admin/ui/contexts/AdminAuthContext";
import { TopBar } from "../../../core/admin/ui/shared/TopBar";
import type { AuthUser } from "../../../core/admin/services/authClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const topBarAuth = vi.hoisted(() => ({
  logout: vi.fn(),
}));

// `logout` hits the network API; `canAdmin` is used by `AdminAuthProvider`.
vi.mock("@/services/authClient", () => ({
  logout: topBarAuth.logout,
  canAdmin: () => true,
}));

// Radix dropdown menus are mocked as plain containers/buttons (repo idiom) so the
// UserMenu sign-out item can be clicked through a real DOM event.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children?: React.ReactNode;
    onSelect?: () => void;
  }) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

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

const mountTopBarWithAuth = (
  user: AuthUser | null,
  breadcrumbs?: React.ComponentProps<typeof TopBar>["breadcrumbs"]
) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  React.act(() => {
    root.render(
      <AdminRouterProvider initialPath="/admin/advanced/engine/ct-products/collection">
        <AdminAuthProvider user={user}>
          <TopBar breadcrumbs={breadcrumbs} />
        </AdminAuthProvider>
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

const originalAssign = window.location.assign;

beforeEach(() => {
  topBarAuth.logout.mockReset();
});

afterEach(() => {
  document.body.innerHTML = "";
  window.location.assign = originalAssign;
});

const legacyClass = "flex items-center gap-2 text-sm text-muted-foreground";

const makeUser = (overrides: Partial<AuthUser>): AuthUser => ({
  id: "u1",
  email: "ada@coderso.dev",
  name: "Ada Lovelace",
  permissionSnapshot: { permissions: [], roles: [{ id: "r1", slug: "admin", name: "Admin" }] },
  ...overrides,
});

const flushAsync = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
};

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

test("TopBar renders default Home/Dashboard breadcrumbs when none are supplied", () => {
  const view = mountTopBar(undefined);

  try {
    const links = getBreadcrumbLinks(view.container);
    expect(links.map((link) => link.textContent)).toEqual(["Home"]);
    // The canonical resolver normalizes the default "/admin" home to "/admin/".
    expect(links[0]?.getAttribute("href")).toBe("/admin/");
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("Dashboard");
  } finally {
    view.cleanup();
  }
});

test("legacy markup missing the text-sm token falls back to the raw node", () => {
  const view = mountTopBar(
    <div className="flex items-center text-muted-foreground">
      <span>Advanced</span>
      <span>/</span>
      <span>Engine</span>
    </div>
  );

  try {
    expect(view.container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
    expect(view.container.textContent).toContain("Advanced");
    expect(view.container.textContent).toContain("Engine");
  } finally {
    view.cleanup();
  }
});

test("a single-label string breadcrumb is rendered as-is without a nav", () => {
  const view = mountTopBar("Home");

  try {
    expect(view.container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
    expect(view.container.textContent).toContain("Home");
  } finally {
    view.cleanup();
  }
});

test("a whitespace-only shorthand item is not treated as breadcrumb items", () => {
  const view = mountTopBar(["   "]);

  try {
    expect(view.container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("legacy markup with a numeric label keeps a known link for the parent", () => {
  const view = mountTopBar(
    <div className={legacyClass}>
      <span>Pages</span>
      <span>/</span>
      {/* A JSX expression so the child is a real number, not a numeric string. */}
      <span>{2}</span>
    </div>
  );

  try {
    const links = getBreadcrumbLinks(view.container);
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Pages");
    expect(links[0]?.getAttribute("href")).toBe("/admin/pages");
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("2");
  } finally {
    view.cleanup();
  }
});

test("legacy markup with a direct text child parses through the raw-string branch", () => {
  // The legacy div carries a bare "Home" text node (not wrapped in a span), so
  // extractDirectText must fall through to its raw-string branch.
  const view = mountTopBar(
    <div className={legacyClass}>
      Home
      <span>/</span>
      <span>Pages</span>
    </div>
  );

  try {
    const links = getBreadcrumbLinks(view.container);
    // "Home" resolves to a link; "Pages" is the last item and renders as current.
    expect(links.map((link) => link.textContent)).toEqual(["Home"]);
    expect(links[0]?.getAttribute("href")).toBe("/admin/");
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("Pages");
  } finally {
    view.cleanup();
  }
});

test("object breadcrumb items keep explicit hrefs and render the last one as current", () => {
  const view = mountTopBar([{ label: "Settings", href: "/settings" }, "Security"]);

  try {
    const links = getBreadcrumbLinks(view.container);
    expect(links).toHaveLength(1);
    expect(links[0]?.textContent).toBe("Settings");
    // The explicit object href resolves through the canonical base path.
    expect(links[0]?.getAttribute("href")).toBe("/admin/settings");
    expect(view.container.querySelector('[aria-current="page"]')?.textContent).toBe("Security");
  } finally {
    view.cleanup();
  }
});

test("legacy markup with a non-text child element is left unparsed", () => {
  const view = mountTopBar(
    <div className={legacyClass}>
      <span>Home</span>
      <span>/</span>
      {/* A single-child element still cannot be reduced to a direct text label. */}
      <div>
        <span>nested</span>
      </div>
    </div>
  );

  try {
    expect(view.container.querySelector('nav[aria-label="Breadcrumb"]')).toBeNull();
    expect(view.container.textContent).toContain("Home");
  } finally {
    view.cleanup();
  }
});

test("the user menu shows name initials and the first role", () => {
  const view = mountTopBarWithAuth(makeUser({}));

  try {
    const trigger = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Ada Lovelace")
    );
    expect(trigger).toBeTruthy();
    expect(trigger?.textContent).toContain("AL");
    expect(trigger?.textContent).toContain("Ada Lovelace");
    expect(trigger?.textContent).toContain("Admin");
  } finally {
    view.cleanup();
  }
});

test("single-token display names fall back to a two-letter initial", () => {
  const view = mountTopBarWithAuth(makeUser({ name: "admin", email: "admin@coderso.dev" }));

  try {
    const trigger = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("admin")
    );
    expect(trigger?.textContent).toContain("AD");
  } finally {
    view.cleanup();
  }
});

test("an anonymous user falls back to Account initials", () => {
  const view = mountTopBarWithAuth(makeUser({ name: undefined, email: undefined }));

  try {
    const trigger = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Account")
    );
    expect(trigger?.textContent).toContain("AC");
  } finally {
    view.cleanup();
  }
});

test("sign out calls logout and redirects to the admin login route", async () => {
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  topBarAuth.logout.mockResolvedValueOnce({ ok: true });
  const view = mountTopBarWithAuth(makeUser({}));

  try {
    const signOut = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Sign out")
    );
    expect(signOut).toBeTruthy();
    await React.act(async () => {
      signOut?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(topBarAuth.logout).toHaveBeenCalledTimes(1);
    expect(assigned).toEqual(["/admin/login"]);
  } finally {
    view.cleanup();
  }
});

test("sign out still redirects when logout itself rejects", async () => {
  const assigned: string[] = [];
  window.location.assign = ((href: string) => {
    assigned.push(href);
  }) as unknown as typeof window.location.assign;

  topBarAuth.logout.mockRejectedValueOnce(new Error("session revoked"));
  const view = mountTopBarWithAuth(makeUser({}));

  try {
    const signOut = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Sign out")
    );
    await React.act(async () => {
      signOut?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await flushAsync();

    expect(topBarAuth.logout).toHaveBeenCalledTimes(1);
    expect(assigned).toEqual(["/admin/login"]);
  } finally {
    view.cleanup();
  }
});
