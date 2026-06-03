// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import type { SessionRecord } from "../../../core/admin/services/sessionsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";

type ListSessionsMock = (userId?: string) => Promise<SessionRecord[]>;
type RevokeSessionMock = (sessionId: string) => Promise<{ ok: boolean }>;
type RevokeAllSessionsMock = (userId?: string) => Promise<{ ok: boolean; revokedCount?: number }>;

const sessionState = vi.hoisted(() => ({
  listSessions: vi.fn<ListSessionsMock>(),
  revokeSession: vi.fn<RevokeSessionMock>(),
  revokeAllSessions: vi.fn<RevokeAllSessionsMock>(),
  reset() {
    this.listSessions.mockReset();
    this.revokeSession.mockReset();
    this.revokeAllSessions.mockReset();
    this.listSessions.mockResolvedValue([
      sessionRecord({ id: "session-current", current: true, ip: "203.0.113.10" }),
      sessionRecord({
        id: "session-other",
        current: false,
        ip: "198.51.100.24",
        userAgent: "Mozilla/5.0 (Windows NT 10.0)",
      }),
    ]);
    this.revokeSession.mockResolvedValue({ ok: true });
    this.revokeAllSessions.mockResolvedValue({ ok: true, revokedCount: 1 });
  },
}));

function sessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
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
  };
}

vi.mock("@/services/sessionsClient", () => ({
  listSessions: sessionState.listSessions,
  revokeSession: sessionState.revokeSession,
  revokeAllSessions: sessionState.revokeAllSessions,
}));

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
      document.body.innerHTML = "";
    },
  };
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const findButton = (label: string) => {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim();
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (item) => normalize(item.textContent) === label
  );
  if (!button) throw new Error(`Missing button ${label}`);
  return button as HTMLButtonElement;
};

const clickButton = async (label: string) => {
  const button = findButton(label);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
    await Promise.resolve();
  });
  return button;
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

test("SessionsPage renders sessions table", () => {
  sessionState.reset();
  const html = renderAdminUi(<SessionsPage />);

  expect(html).toContain("Where you&#x27;re signed in");
  expect(html).toContain("Device/OS");
  expect(html).toContain("Loading sessions");
  expect(html).toContain("Change Password");
  expect(html).toContain("Security Settings");
  expect(html).toContain("disabled");
  expect(html).toContain('data-no-op-control="settings-sessions-tab-general"');
  expect(html).toContain('data-no-op-control="settings-sessions-tab-audit"');
  expect(html).toContain('data-no-op-control="settings-sessions-tab-two-factor"');
});

test("SessionsPage confirms a single session revoke and keeps cancel side-effect free", async () => {
  sessionState.reset();
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/sessions">
      <SessionsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    expect(document.body.textContent).toContain("Cannot Revoke");
    await clickButton("Revoke");
    expect(document.body.textContent).toContain("Revoke session");
    expect(document.body.textContent).toContain("198.51.100.24");
    expect(document.body.textContent).toContain("Your current session remains protected.");
    expect(document.body.textContent).not.toContain(
      "The current session cannot be revoked from this table."
    );

    await clickButton("Cancel");
    expect(sessionState.revokeSession).not.toHaveBeenCalled();

    await clickButton("Revoke");
    await clickButton("Revoke session");
    expect(sessionState.revokeSession).toHaveBeenCalledOnce();
    expect(sessionState.revokeSession).toHaveBeenCalledWith("session-other");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage confirms revoke all other sessions before mutating", async () => {
  sessionState.reset();
  const view = mount(
    <AdminRouterProvider initialPath="/admin/settings/sessions">
      <SessionsPage />
    </AdminRouterProvider>
  );

  try {
    await flush();

    await clickButton("Revoke All Other Sessions");
    expect(document.body.textContent).toContain("1 other session");

    await clickButton("Cancel");
    expect(sessionState.revokeAllSessions).not.toHaveBeenCalled();

    await clickButton("Revoke All Other Sessions");
    await clickButton("Revoke all other sessions");
    expect(sessionState.revokeAllSessions).toHaveBeenCalledOnce();
    expect(sessionState.revokeAllSessions).toHaveBeenCalledWith(undefined);
  } finally {
    view.cleanup();
  }
});
