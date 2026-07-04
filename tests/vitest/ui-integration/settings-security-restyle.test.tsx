// @vitest-environment happy-dom
//
// TASK-479-28-L07: Security cluster restyle (L04). Proves the Security page
// renders the soft sections + the three quick-link cards routing canonically to
// the existing /admin/settings/security/* sub-pages, that the Sessions page
// keeps the "current device cannot be revoked" guard + confirm dialog, that the
// IP allowlist remove stays gated by its lockout-aware confirm, and that the
// security screens are token-driven (no raw palette colors leaked by the restyle).

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { renderAdminUi } from "../../utils/adminRouterRender";
import * as sessionsClient from "../../../core/admin/services/sessionsClient";
import type { SessionRecord } from "../../../core/admin/services/sessionsClient";
import type { IpAllowlistEntry } from "../../../core/admin/services/ipAllowlistClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SecuritySettingsPage } from "../../../core/admin/ui/settings/SecuritySettingsPage";
import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";
import { LoginAlertsPage } from "../../../core/admin/ui/settings/LoginAlertsPage";
import { IpAllowlistTable } from "../../../core/admin/ui/settings/IpAllowlistTable";

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

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const sessionRecord = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  id: "session-current",
  userId: "user-1",
  userEmail: "admin@example.com",
  userName: "Admin",
  ip: "203.0.113.10",
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
  createdAt: "2026-06-01T10:00:00.000Z",
  expiresAt: "2026-06-02T10:00:00.000Z",
  current: true,
  ...overrides,
});

const allowlistEntry = (overrides: Partial<IpAllowlistEntry> = {}): IpAllowlistEntry => ({
  id: "allow-1",
  cidr: "198.51.100.0/24",
  label: "Office",
  description: "Office network",
  createdAt: "2026-06-01T10:00:00.000Z",
  ...overrides,
});

const findButtonByText = (label: string) =>
  Array.from(document.body.querySelectorAll("button")).find((item) => {
    const text = item.textContent?.replace(/\s+/g, " ").trim();
    return text === label || item.getAttribute("aria-label") === label;
  }) as HTMLButtonElement | undefined;

const clickButton = async (label: string) => {
  const button = findButtonByText(label);
  if (!button) throw new Error(`missing button: ${label}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("Security page renders sections + 3 quick-link cards to the sub-pages", () => {
  const html = renderAdminUi(<SecuritySettingsPage />, { path: "/admin/settings/security" });

  expect(html).toContain("Sign-in protection");
  expect(html).toContain("More");
  expect(html).toContain("/admin/settings/security/ip-allowlist");
  expect(html).toContain("/admin/settings/security/sessions");
  expect(html).toContain("/admin/settings/security/login-alerts");
  // token-driven quick-link chip
  expect(html).toContain("bg-primary-soft");
});

test("Sessions: current device has no revoke; a non-current one revokes via confirm", async () => {
  vi.spyOn(sessionsClient, "listSessions").mockResolvedValue([
    sessionRecord({ id: "session-current", current: true }),
    sessionRecord({
      id: "session-other",
      current: false,
      ip: "198.51.100.24",
      userAgent: "Mozilla/5.0 (Windows NT 10.0)",
    }),
  ]);
  const revokeSpy = vi.spyOn(sessionsClient, "revokeSession").mockResolvedValue({ ok: true });

  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/security/sessions">
      <SessionsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();
    // exactly one inline "Revoke" control — the current device cannot be revoked
    const revokeButtons = Array.from(view.container.querySelectorAll("button")).filter(
      (item) => item.textContent?.replace(/\s+/g, " ").trim() === "Revoke"
    );
    expect(revokeButtons).toHaveLength(1);

    await React.act(async () => {
      revokeButtons[0].click();
      await Promise.resolve();
    });
    expect(document.body.textContent).toContain("Revoke session");
    expect(revokeSpy).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("Sessions info card is token-driven (no raw blue palette)", () => {
  vi.spyOn(sessionsClient, "listSessions").mockResolvedValue([]);
  const html = renderAdminUi(<SessionsPage />, {
    path: "/admin/settings/security/sessions",
  });

  expect(html).toContain("Noticing something strange?");
  expect(html).not.toContain("bg-blue-50");
  expect(html).not.toContain("text-blue-700");
});

test("IP allowlist remove stays gated by the lockout-aware confirm", async () => {
  const onRemove = vi.fn(async () => undefined);
  const view = mount(<IpAllowlistTable entries={[allowlistEntry()]} onRemove={onRemove} />);

  try {
    expect(document.body.textContent).toContain(
      "Removing an allowlisted range can lock admins out"
    );

    await clickButton("Remove 198.51.100.0/24");
    expect(document.body.textContent).toContain("Remove IP allowlist entry");

    await clickButton("Cancel");
    expect(onRemove).not.toHaveBeenCalled();

    await clickButton("Remove 198.51.100.0/24");
    await clickButton("Remove range");
    expect(onRemove).toHaveBeenCalledWith("allow-1");
  } finally {
    view.cleanup();
  }
});

test("Login alerts page is token-driven (no raw amber/blue palette)", () => {
  const html = renderAdminUi(<LoginAlertsPage />, {
    path: "/admin/settings/security/login-alerts",
  });

  expect(html).not.toContain("amber-");
  expect(html).not.toContain("bg-blue-50");
});
