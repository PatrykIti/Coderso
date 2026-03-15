// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <span className={className}>{children}</span>,
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

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/table", () => ({
  Table: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <table className={className}>{children}</table>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({
    children,
    className,
    colSpan,
  }: {
    children: React.ReactNode;
    className?: string;
    colSpan?: number;
  }) => (
    <td className={className} colSpan={colSpan}>
      {children}
    </td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({
    children,
    className,
    onClick,
  }: {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
  }) => (
    <tr className={className} onClick={onClick}>
      {children}
    </tr>
  ),
}));

import { AuditTable } from "../../../core/admin/ui/audit/AuditTable";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const logs = [
  {
    id: "log-1",
    event: "User login",
    category: "authentication" as const,
    actor: {
      name: "Ada Lovelace",
      role: "Admin",
      type: "user" as const,
    },
    resource: "session:1",
    resourceLabel: "Session",
    ipAddress: "10.0.0.1",
    timestamp: "2026-03-15 09:00",
    timestampLabel: "1 minute ago",
    status: "success" as const,
    severity: "info" as const,
    requestId: "req-1",
    description: "User signed in",
    payload: {},
  },
  {
    id: "log-2",
    event: "Backup failed",
    category: "system" as const,
    actor: {
      name: "Scheduler",
      role: "System",
      type: "system" as const,
    },
    resource: "backup:daily",
    resourceLabel: "Backup",
    ipAddress: "127.0.0.1",
    timestamp: "2026-03-15 08:00",
    timestampLabel: "1 hour ago",
    status: "error" as const,
    severity: "error" as const,
    requestId: "req-2",
    description: "Backup job failed",
    payload: {},
  },
];

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

const clickByText = (container: HTMLElement, text: string) => {
  const target = Array.from(container.querySelectorAll("button,tr")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(target instanceof HTMLElement)) {
    throw new Error(`Missing clickable: ${text}`);
  }
  act(() => {
    target.click();
  });
};

afterEach(() => {
  document.body.innerHTML = "";
});

test("AuditTable renders user and system rows, selected state, and footer controls", () => {
  const view = mount(
    <AuditTable logs={logs} selectedId="log-2" onSelect={() => undefined} />
  );

  try {
    expect(view.container.textContent).toContain("User login");
    expect(view.container.textContent).toContain("Authentication");
    expect(view.container.textContent).toContain("Ada Lovelace");
    expect(view.container.textContent).toContain("AL");
    expect(view.container.textContent).toContain("Backup failed");
    expect(view.container.textContent).toContain("Scheduler");
    expect(view.container.textContent).toContain("Showing 1 to 2 of 2,459 logs");
    expect(view.container.textContent).toContain("Previous");
    expect(view.container.textContent).toContain("Next");

    const selectedRow = Array.from(view.container.querySelectorAll("tr")).find((row) =>
      row.textContent?.includes("Backup failed")
    );
    expect(selectedRow?.className).toContain("border-l-4");
    expect(selectedRow?.className).toContain("bg-primary/5");
  } finally {
    view.cleanup();
  }
});

test("AuditTable routes row and menu detail selection without triggering from the menu trigger button", () => {
  const onSelect = vi.fn();
  const view = mount(<AuditTable logs={logs} selectedId={null} onSelect={onSelect} />);

  try {
    clickByText(view.container, "User login");
    expect(onSelect).toHaveBeenCalledWith(logs[0]);

    const iconButton = Array.from(view.container.querySelectorAll("button")).find(
      (button) => !button.textContent?.trim()
    );
    if (!(iconButton instanceof HTMLButtonElement)) {
      throw new Error("Missing menu trigger");
    }
    act(() => {
      iconButton.click();
    });
    expect(onSelect).toHaveBeenCalledTimes(1);

    clickByText(view.container, "View details");
    expect(onSelect).toHaveBeenNthCalledWith(2, logs[0]);

    expect(view.container.textContent).toContain("Copy JSON");
    expect(view.container.textContent).toContain("Export entry");
  } finally {
    view.cleanup();
  }
});
