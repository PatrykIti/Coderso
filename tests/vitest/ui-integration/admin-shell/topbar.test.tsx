// @vitest-environment happy-dom
//
// TASK-479-06-L07: TopBar — light/dark toggle (+ persistence), the D1 dark-recolor
// gate (real computed --admin-* token flip for button + sidebar + topbar), the user
// menu (Settings AdminLink resolves, Profile is non-navigating), the command-search
// trigger, host-provided search override, and Sign out wiring.
//
// TASK-495-01: the theme-profile switcher (AdminThemeSwitcher) was removed from the
// TopBar — only the color-mode toggle remains in the chrome; theme management now
// lives at sidebar "Visual → Admin UI Theme" (/admin/themes).
//
// The Radix DropdownMenu is portal-mounted only when open, so (matching the
// repo's `users-table` idiom) we mock `@/components/ui/dropdown-menu` to render
// its content inline — this lets the user-menu items be asserted in a single SSR
// snapshot and lets the destructive `onSelect` fire on click.

import { FileText, LayoutDashboard } from "lucide-react";
import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const { logoutMock } = vi.hoisted(() => ({ logoutMock: vi.fn(async () => undefined) }));

vi.mock("@/services/authClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/authClient")>()),
  logout: logoutMock,
}));

vi.mock("@/components/ui/dropdown-menu", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  return {
    DropdownMenu: Pass,
    DropdownMenuContent: Pass,
    DropdownMenuLabel: Pass,
    DropdownMenuTrigger: Pass,
    DropdownMenuRadioGroup: Pass,
    DropdownMenuRadioItem: Pass,
    DropdownMenuSeparator: () => <hr />,
    DropdownMenuItem: ({
      children,
      asChild,
      onSelect,
    }: {
      children?: React.ReactNode;
      asChild?: boolean;
      onSelect?: () => void;
    }) =>
      asChild ? (
        <>{children}</>
      ) : (
        <button type="button" onClick={() => onSelect?.()}>
          {children}
        </button>
      ),
  };
});

import { TopBar } from "@/ui/shared/TopBar";
import { AdminRouterProvider } from "@/ui/contexts/AdminRouterContext";
import { ADMIN_COLOR_MODE_STORAGE_KEY } from "@/ui/shared/AdminColorModeToggle";
import type { NavSection } from "@/ui/navigation/sidebarConfig";
import { SidebarNav } from "@/ui/shared/SidebarNav";
import { Button } from "@/components/ui/button";

import { renderAdminUi } from "../../../utils/adminRouterRender";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const sections: NavSection[] = [
  { title: "Main", items: [{ label: "Dashboard", href: "/admin", icon: LayoutDashboard }] },
  { title: "Content", items: [{ label: "Pages", href: "/admin/pages", icon: FileText }] },
];

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(<AdminRouterProvider initialPath="/admin">{node}</AdminRouterProvider>);
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

const clickControl = (match: (b: HTMLButtonElement) => boolean) => {
  const button = Array.from(document.body.querySelectorAll("button")).find((b) =>
    match(b as HTMLButtonElement)
  );
  if (!button) throw new Error("control not found");
  React.act(() => {
    (button as HTMLButtonElement).click();
  });
};

const makeTokenStyle = (light: Record<string, string>, dark: Record<string, string>) => {
  const block = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}:${v};`)
      .join("");
  const style = document.createElement("style");
  style.setAttribute("data-test-tokens", "true");
  style.textContent = `:root{${block(light)}}\n:root.dark{${block(dark)}}`;
  document.head.appendChild(style);
  return style;
};

const resetMode = () => {
  document.documentElement.classList.remove("dark");
  document.documentElement.classList.add("light");
  try {
    window.localStorage.clear();
  } catch {
    /* ignore */
  }
};

beforeEach(resetMode);
afterEach(() => {
  resetMode();
  document.body.innerHTML = "";
  document.head.querySelectorAll("style[data-test-tokens]").forEach((s) => s.remove());
  logoutMock.mockClear();
});

test("toggles light/dark and persists the choice", () => {
  const view = mount(<TopBar />);
  try {
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    clickControl((b) => b.getAttribute("aria-label") === "Toggle dark mode");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem(ADMIN_COLOR_MODE_STORAGE_KEY)).toBe("dark");
  } finally {
    view.cleanup();
  }

  // A fresh mount reads the persisted dark value (lazy-init from the class/store).
  const remount = mount(<TopBar />);
  try {
    const toggle = Array.from(remount.container.querySelectorAll("button")).find(
      (b) => b.getAttribute("aria-label") === "Toggle dark mode"
    );
    expect(toggle?.getAttribute("aria-pressed")).toBe("true");
  } finally {
    remount.cleanup();
  }
});

// D1 DARK GATE — assert the chrome actually RECOLORS in dark, not merely that the
// `.dark` class is present. Inject the per-profile token <style> 05 emits (both a
// light `:root` and a dark `:root.dark` block), render the real chrome, and assert
// (a) each surface reads its --admin-* token directly and (b) the resolved token
// flips light -> dark when `.dark` is toggled.
test("dark mode recolors the button + sidebar + topbar chrome (real token flip)", () => {
  makeTokenStyle(
    {
      "--admin-topbar-bg": "#ffffff",
      "--admin-sidebar-bg": "#f7f7fb",
      "--admin-button-primary-bg": "#7c3aed",
    },
    {
      "--admin-topbar-bg": "#0b0b10",
      "--admin-sidebar-bg": "#111118",
      "--admin-button-primary-bg": "#8b5cf6",
    }
  );

  const view = mount(
    <>
      <TopBar />
      <SidebarNav sections={sections} canAccess={() => true} />
      <Button>x</Button>
    </>
  );
  try {
    // (a) chrome reads --admin-* directly (the canonical dark-mode strategy).
    expect(view.container.querySelector("header")?.className).toContain(
      "bg-[var(--admin-topbar-bg)]"
    );
    expect(view.container.querySelector("aside")?.className).toContain(
      "bg-[var(--admin-sidebar-bg)]"
    );
    expect(view.container.querySelector('button[data-variant="default"]')?.className).toContain(
      "bg-[var(--admin-button-primary-bg)]"
    );

    // (b) the resolved tokens flip on the root when `.dark` is toggled.
    const read = (v: string) =>
      getComputedStyle(document.documentElement).getPropertyValue(v).trim();

    document.documentElement.classList.remove("dark");
    expect(read("--admin-topbar-bg")).toBe("#ffffff");
    expect(read("--admin-sidebar-bg")).toBe("#f7f7fb");
    expect(read("--admin-button-primary-bg")).toBe("#7c3aed");

    document.documentElement.classList.add("dark");
    expect(read("--admin-topbar-bg")).toBe("#0b0b10");
    expect(read("--admin-sidebar-bg")).toBe("#111118");
    expect(read("--admin-button-primary-bg")).toBe("#8b5cf6");
  } finally {
    view.cleanup();
  }
});

test("renders the light/dark toggle but no longer the theme-profile switcher", () => {
  const html = renderAdminUi(<TopBar />);
  // AdminColorModeToggle (light/dark) stays in the chrome.
  expect(html).toContain('aria-label="Toggle dark mode"');
  // TASK-495-01: AdminThemeSwitcher removed — theme management now lives only at
  // sidebar "Visual → Admin UI Theme" (/admin/themes), not the top bar.
  expect(html).not.toContain("Admin UI Theme");
});

test("user menu renders the Settings AdminLink with a resolved href; no bogus profile route", () => {
  const html = renderAdminUi(<TopBar user={undefined} />, { path: "/admin" });
  expect(html).toContain("/admin/settings"); // Settings AdminLink -> real /settings route
  expect(html).not.toContain("/admin/profile"); // Profile is non-navigating
});

test("shows the command-search trigger with the kbd hint by default", () => {
  const html = renderAdminUi(<TopBar />, { path: "/admin" });
  expect(html).toMatch(/Search or jump to/);
});

test("a host-provided search node renders instead of the trigger", () => {
  const html = renderAdminUi(<TopBar search={<div data-testid="real-search" />} />);
  expect(html).toContain("real-search");
  expect(html).not.toMatch(/Search or jump to/);
});

test("Sign out invokes the existing logout action", () => {
  const view = mount(<TopBar />);
  try {
    clickControl((b) => (b.textContent ?? "").includes("Sign out"));
    expect(logoutMock).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});
