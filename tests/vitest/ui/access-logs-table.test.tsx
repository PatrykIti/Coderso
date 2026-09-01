// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";
import { Monitor } from "lucide-react";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <span className={className}>{children}</span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/separator", () => ({
  Separator: () => <hr />,
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, colSpan }: { children: React.ReactNode; colSpan?: number }) => (
    <td colSpan={colSpan}>{children}</td>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableRow: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <tr onClick={onClick}>{children}</tr>
  ),
}));

import { AccessLogsTable } from "../../../core/admin/ui/security/AccessLogsTable";
import type { AccessLogItem } from "../../../core/admin/ui/security/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const logs: AccessLogItem[] = [
  {
    id: "access-1",
    user: { name: "Ada Lovelace", detail: "ada@example.com" },
    ipAddress: "127.0.0.1",
    method: "GET",
    path: "/admin/api/pages",
    statusCode: 200,
    durationMs: 42,
    userAgent: "Mozilla/5.0",
    matchContext: { field: "email", label: "Matched user email" },
    session: {
      state: "active",
      label: "Active session",
      sessionId: "session-1",
      current: false,
      expiresAt: "2026-06-02T10:00:00.000Z",
      revokedAt: null,
      view: { enabled: true },
      revoke: { enabled: true },
    },
    device: { label: "macOS / Desktop", icon: Monitor },
    timestamp: { date: "6/1/2026", time: "10:00:00 AM" },
    status: "success",
  },
];

function mount(node: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  mountedRoots.push({ root, container });
  return { container, root, cleanup: () => cleanupRoot(root, container) };
}

function cleanupRoot(root: ReturnType<typeof createRoot>, container: HTMLDivElement) {
  act(() => {
    root.unmount();
  });
  container.remove();
  mountedRoots = mountedRoots.filter((item) => item.root !== root);
}

function clickSrOnlyButton(container: HTMLElement, label: string) {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${label}`);
  }
  act(() => {
    button.click();
  });
  return button;
}

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  vi.clearAllMocks();
});

test("AccessLogsTable uses backend pageInfo and renders match context", () => {
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  const view = mount(
    <AccessLogsTable
      logs={logs}
      onView={() => undefined}
      pageInfo={{
        countCopy: "Showing 1 loaded access logs. More results are available.",
        canNext: true,
        canPrevious: false,
        onNext,
        onPrevious,
      }}
    />
  );

  try {
    expect(view.container.textContent).toContain(
      "Showing 1 loaded access logs. More results are available."
    );
    expect(view.container.textContent).toContain("Matched user email");
    expect(view.container.textContent).not.toContain("Server pagination is not wired yet");

    const previous = clickSrOnlyButton(view.container, "Previous page");
    expect(previous.disabled).toBe(true);
    const next = clickSrOnlyButton(view.container, "Next page");
    expect(next.disabled).toBe(false);
    expect(onNext).toHaveBeenCalledOnce();
    expect(onPrevious).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AccessLogsTable enables Previous from loaded cursor state and disables Next without a cursor", () => {
  const onNext = vi.fn();
  const onPrevious = vi.fn();
  const view = mount(
    <AccessLogsTable
      logs={logs}
      onView={() => undefined}
      pageInfo={{
        countCopy: "Showing 1 loaded access logs.",
        canNext: false,
        canPrevious: true,
        onNext,
        onPrevious,
      }}
    />
  );

  try {
    const previous = clickSrOnlyButton(view.container, "Previous page");
    const next = clickSrOnlyButton(view.container, "Next page");
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(true);
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AccessLogsTable invokes onView with the clicked log when a data row is selected", () => {
  const onView = vi.fn();
  const view = mount(
    <AccessLogsTable
      logs={logs}
      onView={onView}
      pageInfo={{
        countCopy: "Showing 1 loaded access logs.",
        canNext: false,
        canPrevious: false,
        onNext: vi.fn(),
        onPrevious: vi.fn(),
      }}
    />
  );

  try {
    const row = Array.from(view.container.querySelectorAll("tr")).find((candidate) =>
      candidate.textContent?.includes("Ada Lovelace")
    );
    if (!(row instanceof HTMLTableRowElement)) {
      throw new Error("Missing log row");
    }
    act(() => {
      row.click();
    });
    expect(onView).toHaveBeenCalledWith(logs[0]);
    expect(onView).toHaveBeenCalledTimes(1);
  } finally {
    view.cleanup();
  }
});

test("AccessLogsTable renders inert rows without onView while pagination stays wired", () => {
  const onNext = vi.fn();
  const view = mount(
    <AccessLogsTable
      logs={logs}
      pageInfo={{
        countCopy: "Showing 1 loaded access logs.",
        canNext: true,
        canPrevious: false,
        onNext,
        onPrevious: vi.fn(),
      }}
    />
  );

  try {
    const row = Array.from(view.container.querySelectorAll("tr")).find((candidate) =>
      candidate.textContent?.includes("Ada Lovelace")
    );
    if (!(row instanceof HTMLTableRowElement)) {
      throw new Error("Missing log row");
    }
    act(() => {
      row.click();
    });
    expect(view.container.textContent).toContain("Ada Lovelace");
    const next = clickSrOnlyButton(view.container, "Next page");
    expect(next.disabled).toBe(false);
    expect(onNext).toHaveBeenCalledOnce();
  } finally {
    view.cleanup();
  }
});
