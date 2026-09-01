// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { AuditDetailsDrawer } from "../../../core/admin/ui/audit/AuditDetailsDrawer";
import { AuditTable } from "../../../core/admin/ui/audit/AuditTable";
import type { AuditLog } from "../../../core/admin/ui/audit/types";

const actionsState = vi.hoisted(() => ({
  copyAuditEntryJson: vi.fn(async (_entry: AuditLog) => ({ ok: true }) as never),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("../../../core/admin/ui/audit/auditEntryActions", () => ({
  copyAuditEntryJson: actionsState.copyAuditEntryJson,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} {...props}>
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

vi.mock("@/components/ui/table", () => ({
  Table: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <table className={className}>{children}</table>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
  TableHead: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <th className={className}>{children}</th>
  ),
  TableHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <thead className={className}>{children}</thead>
  ),
  TableRow: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <tr className={className}>{children}</tr>
  ),
}));

let cleanupFns: Array<() => void> = [];
afterEach(() => {
  actionsState.copyAuditEntryJson.mockClear();
  for (const cleanup of cleanupFns.splice(0)) cleanup();
});

const mount = (node: React.ReactElement) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  cleanupFns.push(() => {
    React.act(() => root.unmount());
    container.remove();
  });
  return container;
};

const sampleLog: AuditLog = {
  id: "log-1",
  event: "User login",
  category: "authentication",
  actor: { name: "Ada Lovelace", role: "Admin", type: "user" },
  resource: "/session/sess-1",
  resourceLabel: "Session sess-1",
  ipAddress: "127.0.0.1",
  createdAt: "2026-03-15T10:00:00.000Z",
  timestamp: "2 mins ago",
  timestampLabel: "Mar 15, 10:00:00",
  status: "success",
  severity: "info",
  requestId: "req-1",
  description: "Authenticated.",
  payload: { note: "hello" },
};

test("AuditDetailsDrawer uses the default copy handler when no onCopyJson is provided", () => {
  const container = mount(
    <AuditDetailsDrawer log={sampleLog} open onOpenChange={() => undefined} />
  );

  const copyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Copy JSON")
  );
  if (!(copyButton instanceof HTMLButtonElement)) throw new Error("Missing Copy JSON button");
  React.act(() => copyButton.click());

  expect(actionsState.copyAuditEntryJson).toHaveBeenCalledWith(sampleLog);
});

test("AuditTable falls back to copyAuditEntryJson when no onCopyJson is provided", () => {
  const container = mount(
    <AuditTable logs={[sampleLog]} selectedId={null} onSelect={() => undefined} />
  );

  const copyButton = Array.from(container.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Copy JSON")
  );
  if (!(copyButton instanceof HTMLButtonElement)) throw new Error("Missing Copy JSON button");
  React.act(() => copyButton.click());

  expect(actionsState.copyAuditEntryJson).toHaveBeenCalledWith(sampleLog);
});
