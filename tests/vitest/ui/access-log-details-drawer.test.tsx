// @vitest-environment happy-dom

import React from "react";
import { beforeEach, expect, test, vi } from "vitest";

import type { AccessLogItem } from "../../../core/admin/ui/security/types";
import { AccessLogDetailsDrawer } from "../../../core/admin/ui/security/AccessLogDetailsDrawer";
import { clickByText, flush, mount } from "./seoWaveFixtures";

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    title,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} title={title} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/separator", () => ({ Separator: () => <hr /> }));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children?: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

const log = (overrides: Partial<AccessLogItem> = {}): AccessLogItem =>
  ({
    id: "log-1",
    user: { name: "Ada Admin", detail: "ada@example.com" },
    ipAddress: "203.0.113.9",
    method: "GET",
    path: "/admin/api/settings",
    statusCode: 200,
    durationMs: 42,
    userAgent: "vitest",
    matchContext: null,
    session: {
      state: "active",
      label: "Active session",
      sessionId: "sess-1",
      view: { enabled: true },
      revoke: { enabled: true },
    },
    device: { label: "Chrome on Linux", icon: (() => null) as never },
    timestamp: { date: "2026-03-15", time: "08:00" },
    status: "success",
    ...overrides,
  }) as AccessLogItem;

beforeEach(() => {
  document.body.innerHTML = "";
});

test("renders full details for a log with enabled session actions", async () => {
  const onViewSession = vi.fn();
  const onRequestRevoke = vi.fn();
  const view = mount(
    <AccessLogDetailsDrawer
      log={log()}
      open
      onOpenChange={() => {}}
      onViewSession={onViewSession}
      onRequestRevoke={onRequestRevoke}
    />
  );
  try {
    expect(view.container.textContent).toContain("Access Log Details");
    expect(view.container.textContent).toContain("Ada Admin");
    expect(view.container.textContent).toContain("success (200)");
    expect(view.container.textContent).toContain("GET /admin/api/settings");
    expect(view.container.textContent).toContain("42 ms");
    expect(view.container.textContent).toContain("Active session");

    clickByText(view.container, "View full session");
    await flush();
    expect(onViewSession).toHaveBeenCalledWith(expect.objectContaining({ id: "log-1" }));

    clickByText(view.container, "Revoke access");
    await flush();
    expect(onRequestRevoke).toHaveBeenCalledWith(expect.objectContaining({ id: "log-1" }));
  } finally {
    view.cleanup();
  }
});

test("disabled session actions render reasons and stay inert; revoking relabels", async () => {
  const onViewSession = vi.fn();
  const onRequestRevoke = vi.fn();
  const subject = log({
    session: {
      state: "historical" as never,
      label: "Historical entry",
      reason: "historical" as never,
      view: { enabled: false, reason: "historical" as never },
      revoke: { enabled: false, reason: "historical" as never },
    },
  });
  const view = mount(
    <AccessLogDetailsDrawer
      log={subject}
      open
      onOpenChange={() => {}}
      onViewSession={onViewSession}
      onRequestRevoke={onRequestRevoke}
      isRevoking={true}
    />
  );
  try {
    expect(view.container.textContent).toContain("Revoking...");
    const revokeButton = findButton(view.container, "Revoking...");
    expect(revokeButton.disabled).toBe(true);
    // Clicking a disabled button must not invoke the callback.
    revokeButton.click();
    const viewButton = findButton(view.container, "View full session");
    expect(viewButton.disabled).toBe(true);
    expect(onViewSession).not.toHaveBeenCalled();
    expect(onRequestRevoke).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("missing log renders the empty placeholder and no action row", () => {
  const view = mount(<AccessLogDetailsDrawer log={null} open onOpenChange={() => {}} />);
  try {
    expect(view.container.textContent).toContain("Select a log to review details.");
    expect(view.container.textContent).not.toContain("Revoke access");
  } finally {
    view.cleanup();
  }
});

function findButton(container: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  return button;
}
