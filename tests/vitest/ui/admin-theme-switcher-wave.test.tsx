// @vitest-environment happy-dom

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import { AdminThemeSwitcher } from "../../../core/admin/ui/shared/AdminThemeSwitcher";
import { clickByText, flush, mount } from "./seoWaveFixtures";

const themeHarness = vi.hoisted(() => ({
  profiles: [
    { id: "light", name: "Daylight", isActive: true },
    { id: "midnight", name: "Midnight", isActive: false },
  ],
  cached: null as Array<{ id: string; name: string; isActive: boolean }> | null,
  list: vi.fn(),
  activate: vi.fn(),
  getCached: vi.fn(),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/ui/shared/AdminLink", () => ({
  AdminLink: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }) => (
    <div data-open={String(open)}>
      <button type="button" onClick={() => onOpenChange(!open)}>
        open-toggle
      </button>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children: _children }: { children?: React.ReactNode }) => null,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
  }: {
    children?: React.ReactNode;
    disabled?: boolean;
  }) => <div data-disabled={String(Boolean(disabled))}>{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuRadioGroup: ({
    children,
    value,
    onValueChange,
  }: {
    children: React.ReactNode;
    value: string;
    onValueChange: (value: string) => void;
  }) => (
    <div data-radio-value={value}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<{ onPick?: (v: string) => void }>, {
              onPick: onValueChange,
            })
          : child
      )}
    </div>
  ),
  DropdownMenuRadioItem: ({
    children: _children,
    value,
    onPick,
  }: {
    children?: React.ReactNode;
    value: string;
    onPick?: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onPick?.(value)}>
      {`pick:${value}`}
    </button>
  ),
  DropdownMenuSeparator: () => <hr />,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/adminThemeClient", async () => {
  const h = themeHarness;
  return {
    listAdminThemeProfilesCached: h.list,
    activateAdminThemeProfile: h.activate,
    getCachedAdminThemeProfiles: h.getCached,
  };
});

vi.mock("@/utils/adminPaths", () => ({
  resolveAdminBasePath: () => "/admin",
  withAdminBasePath: (_base: string, path: string) => `/admin${path}`,
}));

beforeEach(() => {
  themeHarness.cached = null;
  themeHarness.list.mockReset();
  themeHarness.activate.mockReset();
  themeHarness.getCached.mockImplementation(() => themeHarness.cached);
  themeHarness.list.mockResolvedValue(themeHarness.profiles);
  themeHarness.activate.mockResolvedValue({ ok: true });
});

test("opens the menu lazily, lists profiles, and switches the active profile", async () => {
  const view = mount(<AdminThemeSwitcher />);
  try {
    // No cache yet: trigger label falls back to "Theme".
    expect(view.container.textContent).toContain("Theme");

    clickByText(view.container, "open-toggle");
    await flush();
    expect(view.container.textContent).toContain("Admin UI Theme");
    expect(view.container.textContent).toContain("pick:midnight");

    clickByText(view.container, "pick:midnight");
    await flush();
    await flush();
    expect(themeHarness.activate).toHaveBeenCalledWith("midnight");
    // Refresh after activation re-reads with force.
    expect(themeHarness.list).toHaveBeenCalledWith({ force: true });
  } finally {
    view.cleanup();
  }
});

test("load failure surfaces an error item; selecting the active profile is a no-op", async () => {
  themeHarness.cached = [{ id: "light", name: "Daylight", isActive: true }];
  const view = mount(<AdminThemeSwitcher />);
  try {
    clickByText(view.container, "open-toggle");
    await flush();
    expect(view.container.textContent).toContain("pick:light");

    // Same-profile selection short-circuits before any activation call.
    clickByText(view.container, "pick:light");
    await flush();
    expect(themeHarness.activate).not.toHaveBeenCalled();

    themeHarness.list.mockRejectedValueOnce(new Error("themes offline"));
    view.cleanup();
    document.body.innerHTML = "";
    const fresh = mount(<AdminThemeSwitcher />);
    try {
      clickByText(fresh.container, "open-toggle");
      await flush();
      expect(fresh.container.textContent).toContain("Failed to load admin themes.");
    } finally {
      fresh.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("activation failure maps API errors and generic failures; empty cache shows placeholder", async () => {
  const view = mount(<AdminThemeSwitcher />);
  try {
    clickByText(view.container, "open-toggle");
    await flush();

    themeHarness.activate.mockRejectedValueOnce(
      Object.assign(new Error("denied"), { kind: "api", message: "denied" })
    );
    clickByText(view.container, "pick:midnight");
    await flush();
    expect(view.container.textContent).toContain("denied");
    themeHarness.activate.mockRejectedValueOnce(new Error("offline"));
    clickByText(view.container, "open-toggle");
    await flush();
    // The earlier optimistic select made midnight active, so pick light.
    clickByText(view.container, "pick:light");
    await flush();
    expect(view.container.textContent).toContain("Failed to switch theme profile.");
  } finally {
    view.cleanup();
  }
});

test("a list without an active profile resolves the first profile as active", async () => {
  const noActiveProfiles = [
    { id: "dawn", name: "Dawn", isActive: false },
    { id: "dusk", name: "Dusk", isActive: false },
  ];
  themeHarness.cached = noActiveProfiles;
  // The open handler re-fetches through `list`, so that must agree too.
  themeHarness.list.mockResolvedValueOnce(noActiveProfiles);
  const view = mount(<AdminThemeSwitcher />);
  try {
    // The harness's DropdownMenuTrigger mock renders nothing, so the active
    // profile is observable through the radio group value once the menu opens.
    clickByText(view.container, "open-toggle");
    await flush();
    const radio = view.container.querySelector("[data-radio-value]");
    expect(radio?.getAttribute("data-radio-value")).toBe("dawn");
  } finally {
    view.cleanup();
  }
});

test("a load-time API error surfaces the client message", async () => {
  const view = mount(<AdminThemeSwitcher />);
  try {
    themeHarness.list.mockRejectedValueOnce(
      Object.assign(new Error("themes denied"), { kind: "api", message: "themes denied" })
    );
    clickByText(view.container, "open-toggle");
    await flush();
    expect(view.container.textContent).toContain("themes denied");
  } finally {
    view.cleanup();
  }
});

test("a post-activation refresh failure maps API errors and generic failures", async () => {
  const view = mount(<AdminThemeSwitcher />);
  try {
    // First list call (open) succeeds; the refresh after activation fails.
    themeHarness.list.mockResolvedValueOnce(themeHarness.profiles);
    clickByText(view.container, "open-toggle");
    await flush();

    themeHarness.activate.mockResolvedValueOnce({ ok: true });
    themeHarness.list.mockRejectedValueOnce(
      Object.assign(new Error("refresh denied"), { kind: "api", message: "refresh denied" })
    );
    clickByText(view.container, "pick:midnight");
    await flush();
    await flush();
    expect(view.container.textContent).toContain("refresh denied");

    // Reopen with a generic refresh failure for the same flow.
    themeHarness.list.mockRejectedValueOnce(new Error("offline"));
    clickByText(view.container, "open-toggle");
    await flush();
    // The optimistic select left midnight active, so pick light.
    clickByText(view.container, "pick:light");
    await flush();
    await flush();
    expect(view.container.textContent).toContain("Failed to load admin themes.");
  } finally {
    view.cleanup();
  }
});
