// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { SessionRecord } from "../../../core/admin/services/sessionsClient";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { SessionsPage } from "../../../core/admin/ui/settings/SessionsPage";
import { ApiClientError } from "../../../core/admin/services/apiClient";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type ListSessionsMock = (userId?: string) => Promise<SessionRecord[]>;
type RevokeSessionMock = (sessionId: string) => Promise<{ ok: boolean }>;
type RevokeAllSessionsMock = (userId?: string) => Promise<{ ok: boolean; revokedCount?: number }>;

const now = Date.now();

const sessionState = vi.hoisted(() => ({
  listSessions: vi.fn<ListSessionsMock>(),
  revokeSession: vi.fn<RevokeSessionMock>(),
  revokeAllSessions: vi.fn<RevokeAllSessionsMock>(),
  reset() {
    this.listSessions.mockReset();
    this.revokeSession.mockReset();
    this.revokeAllSessions.mockReset();
    this.listSessions.mockResolvedValue([
      sessionRecord({
        id: "s-mac",
        current: true,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        createdAt: new Date(now - 5 * 60000).toISOString(),
      }),
      sessionRecord({
        id: "s-phone",
        current: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
        createdAt: new Date(now - 2 * 3600000).toISOString(),
      }),
    ]);
    this.revokeSession.mockResolvedValue({ ok: true });
    this.revokeAllSessions.mockResolvedValue({ ok: true, revokedCount: 1 });
  },
}));

function sessionRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: "s-mac",
    userId: "user-1",
    userEmail: "admin@example.com",
    userName: "Admin",
    ip: "203.0.113.10",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    createdAt: new Date(now - 60000).toISOString(),
    expiresAt: new Date(now + 86400000).toISOString(),
    current: true,
    ...overrides,
  };
}

vi.mock("@/services/sessionsClient", () => ({
  listSessions: sessionState.listSessions,
  revokeSession: sessionState.revokeSession,
  revokeAllSessions: sessionState.revokeAllSessions,
}));

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => React.act(() => new Promise((resolve) => setTimeout(resolve, 0)));

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  React.act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

const pageText = () => document.body.textContent ?? "";

async function clickButton(text: string) {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim();
  const button = Array.from(document.body.querySelectorAll("button")).find((item) =>
    normalize(item.textContent)?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

async function clickExactButton(text: string) {
  const normalize = (value: string | null | undefined) => value?.replace(/\s+/g, " ").trim();
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (item) => normalize(item.textContent) === text
  );
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Missing exact button ${text}`);
  await React.act(async () => {
    button.click();
    await Promise.resolve();
  });
}

beforeEach(() => {
  sessionState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  document.body.innerHTML = "";
  vi.clearAllMocks();
});

const renderPage = (initialPath = "/admin/settings/sessions") =>
  mount(
    <AdminRouterProvider initialPath={initialPath}>
      <SessionsPage />
    </AdminRouterProvider>
  );

test("SessionsPage resolves device metadata and relative times for every user agent shape", async () => {
  sessionState.listSessions.mockResolvedValue([
    sessionRecord({ id: "s-null", current: true, userAgent: null }),
    sessionRecord({
      id: "s-iphone",
      current: false,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      createdAt: new Date(now - 10000).toISOString(),
    }),
    sessionRecord({
      id: "s-android",
      current: false,
      userAgent: "Mozilla/5.0 (Linux; Android 14)",
      createdAt: new Date(now - 30 * 60000).toISOString(),
    }),
    sessionRecord({
      id: "s-ipad",
      current: false,
      userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)",
      createdAt: new Date(now - 5 * 3600000).toISOString(),
    }),
    sessionRecord({
      id: "s-win",
      current: false,
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      createdAt: new Date(now - 2 * 86400000).toISOString(),
    }),
    sessionRecord({
      id: "s-linux",
      current: false,
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      createdAt: new Date(now - 20 * 86400000).toISOString(),
    }),
    sessionRecord({
      id: "s-other",
      current: false,
      userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1)",
    }),
  ]);
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("Unknown device");
    expect(pageText()).toContain("iPhone");
    expect(pageText()).toContain("Android phone");
    expect(pageText()).toContain("iPad");
    expect(pageText()).toContain("Windows PC");
    expect(pageText()).toContain("Linux");
    expect(pageText()).toContain("Desktop");
    expect(pageText()).toContain("Just now");
    expect(pageText()).toContain("30 mins ago");
    expect(pageText()).toContain("5 hrs ago");
    expect(pageText()).toContain("2 days ago");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage shows the API error message on load failure", async () => {
  sessionState.listSessions.mockRejectedValue(new ApiClientError("down", "sessions_down", 503));
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("sessions_down");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage falls back to a generic load error", async () => {
  sessionState.listSessions.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    expect(pageText()).toContain("Failed to load sessions.");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage revokes a session and refreshes the list", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickExactButton("Revoke");
    await clickButton("Revoke session");
    await flush();
    expect(sessionState.revokeSession).toHaveBeenCalledWith("s-phone");
    expect(sessionState.listSessions.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(pageText()).not.toContain("This will end the selected active session");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage revokes all other sessions and refreshes the list", async () => {
  const view = renderPage();
  try {
    await flush();
    await clickButton("Revoke All Other Sessions");
    await clickButton("Revoke all other sessions");
    await flush();
    expect(sessionState.revokeAllSessions).toHaveBeenCalled();
    expect(pageText()).not.toContain("This will end every revokable session");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage surfaces API and generic revoke failures", async () => {
  sessionState.revokeSession.mockRejectedValue(new ApiClientError("bad", "revoke_down", 400));
  const view = renderPage();
  try {
    await flush();
    await clickExactButton("Revoke");
    await clickButton("Revoke session");
    await flush();
    expect(pageText()).toContain("revoke_down");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage falls back to a generic revoke failure", async () => {
  sessionState.revokeSession.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickExactButton("Revoke");
    await clickButton("Revoke session");
    await flush();
    expect(pageText()).toContain("Failed to revoke session.");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage surfaces API and generic revoke-all failures", async () => {
  sessionState.revokeAllSessions.mockRejectedValue(
    new ApiClientError("bad", "revokeall_down", 400)
  );
  const view = renderPage();
  try {
    await flush();
    await clickButton("Revoke All Other Sessions");
    await clickButton("Revoke all other sessions");
    await flush();
    expect(pageText()).toContain("revokeall_down");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage falls back to a generic revoke-all failure", async () => {
  sessionState.revokeAllSessions.mockRejectedValue({ code: "boom" });
  const view = renderPage();
  try {
    await flush();
    await clickButton("Revoke All Other Sessions");
    await clickButton("Revoke all other sessions");
    await flush();
    expect(pageText()).toContain("Failed to revoke sessions.");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage surfaces refresh errors after a successful revoke", async () => {
  sessionState.listSessions
    .mockResolvedValueOnce([
      sessionRecord({
        id: "s-mac",
        current: true,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
      sessionRecord({
        id: "s-phone",
        current: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ])
    .mockRejectedValueOnce(new ApiClientError("bad", "refresh_down", 500));
  const view = renderPage();
  try {
    await flush();
    await clickExactButton("Revoke");
    await clickButton("Revoke session");
    await flush();
    expect(pageText()).toContain("refresh_down");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage falls back to a generic refresh error after a successful revoke", async () => {
  sessionState.listSessions
    .mockResolvedValueOnce([
      sessionRecord({
        id: "s-mac",
        current: true,
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
      sessionRecord({
        id: "s-phone",
        current: false,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      }),
    ])
    .mockRejectedValueOnce(new Error("boom"));
  const view = renderPage();
  try {
    await flush();
    await clickExactButton("Revoke");
    await clickButton("Revoke session");
    await flush();
    expect(pageText()).toContain("Failed to load sessions.");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage highlights an active session selected from access logs", async () => {
  const view = renderPage("/admin/settings/sessions?sessionId=s-mac");
  try {
    await flush();
    expect(pageText()).toContain("Showing the active session selected from access logs.");
  } finally {
    view.cleanup();
  }
});

test("SessionsPage reports a selected session that is no longer active", async () => {
  const view = renderPage("/admin/settings/sessions?sessionId=s-missing");
  try {
    await flush();
    expect(pageText()).toContain(
      "The session selected from access logs is not active or is no longer available."
    );
  } finally {
    view.cleanup();
  }
});
