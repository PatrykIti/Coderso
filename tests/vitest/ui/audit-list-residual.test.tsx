// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AdminExportResult } from "../../../core/admin/services/adminExportClient";
import type {
  AuditExportRequest,
  AuditLogListResponse,
  AuditLogQuery,
} from "../../../core/admin/services/auditClient";

type ListAuditLogsMock = (query?: AuditLogQuery | number) => Promise<AuditLogListResponse>;
type ExportAuditLogsMock = (request: AuditExportRequest) => Promise<AdminExportResult>;

const auditState = vi.hoisted(() => ({
  listAuditLogs: vi.fn<ListAuditLogsMock>(async () => ({
    items: [],
    nextCursor: null,
  })),
  exportAuditLogs: vi.fn<ExportAuditLogsMock>(async () => ({
    status: "downloaded",
    filename: "audit-logs.csv",
    mimeType: "text/csv",
  })),
  nextExportStatus: "downloaded" as "downloaded" | "queued",
  exportFields: [] as string[],
  reset() {
    this.listAuditLogs.mockReset();
    this.exportAuditLogs.mockReset();
    this.nextExportStatus = "downloaded";
    this.exportFields = [];
    this.exportAuditLogs.mockImplementation(async () =>
      this.nextExportStatus === "downloaded"
        ? { status: "downloaded", filename: "audit-logs.csv", mimeType: "text/csv" }
        : {
            status: "queued",
            jobId: "audit-export-1",
            statusUrl: "/admin/api/audit/export/audit-export-1",
          }
    );
  },
}));

const auditActionState = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  reset() {
    this.toastSuccess.mockReset();
    this.toastError.mockReset();
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("sonner", () => ({
  toast: {
    success: auditActionState.toastSuccess,
    error: auditActionState.toastError,
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/auditClient", () => ({
  exportAuditLogs: auditState.exportAuditLogs,
  listAuditLogs: auditState.listAuditLogs,
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

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div data-testid="breadcrumbs">
        {Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}
      </div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
}));

vi.mock("@/ui/shared/ExportDialog", () => ({
  ExportDialog: ({
    open,
    onOpenChange,
    title,
    fields,
    onExport,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    fields: Array<{ id: string; defaultChecked?: boolean }>;
    onExport?: (payload: { format: "csv" | "json"; fields: string[] }) => Promise<void> | void;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button
          type="button"
          onClick={() => {
            const payload = {
              format: "csv" as const,
              fields:
                auditState.exportFields.length > 0
                  ? auditState.exportFields
                  : fields
                      .filter((field) => field.defaultChecked !== false)
                      .map((field) => field.id),
            };
            void Promise.resolve(onExport?.(payload)).catch(() => undefined);
          }}
        >
          submit-export
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-export
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/audit/AuditFilters", () => ({
  AuditFilters: () => <div data-testid="audit-filters" />,
}));

vi.mock("../../../core/admin/ui/audit/AuditTable", () => ({
  AuditTable: ({
    logs,
    onSelect,
  }: {
    logs: Array<{ id: string; actor: { name: string } }>;
    onSelect: (log: { id: string; actor: { name: string } }) => void;
  }) => (
    <div>
      <span>{`audit-table:${logs.map((log) => log.actor.name).join(",")}`}</span>
      {logs.map((log) => (
        <button type="button" key={log.id} onClick={() => onSelect(log)}>
          {`select:${log.id}`}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/audit/AuditDetailsDrawer", () => ({
  AuditDetailsDrawer: ({
    log,
    onOpenChange,
  }: {
    log?: unknown;
    onOpenChange: (open: boolean) => void;
  }) =>
    log ? (
      <button type="button" onClick={() => onOpenChange(false)}>
        close-drawer
      </button>
    ) : null,
}));

import { AuditList } from "../../../core/admin/ui/audit/AuditList";

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  React.act(() => root.render(node));
  return {
    container,
    cleanup: () => {
      React.act(() => root.unmount());
      container.remove();
    },
  };
};

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => button.click());
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
  });
};

beforeEach(() => {
  auditState.reset();
  auditActionState.reset();
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("AuditList falls back to a truncated user id when actor metadata is absent", async () => {
  auditState.listAuditLogs.mockImplementation(async () => ({
    items: [
      {
        id: "audit-1",
        action: "content.publish",
        actorId: "user-abc123def",
        targetType: "page",
        targetId: "home",
        createdAt: "2026-03-15T10:00:00.000Z",
        metadata: { ip: "127.0.0.1" },
      },
    ],
    nextCursor: null,
  }));

  const view = mount(<AuditList />);
  try {
    await flush();
    expect(view.container.textContent).toContain("audit-table:User user-a");
    expect(view.container.textContent).not.toContain("Ada Lovelace");
  } finally {
    view.cleanup();
  }
});

test("AuditList rejects export payloads containing non-export columns", async () => {
  const view = mount(<AuditList />);
  try {
    await flush();
    clickByText(view.container, "Export");
    auditState.exportFields = ["event", "bogus-column"];
    clickByText(view.container, "submit-export");
    await flush();
    expect(auditState.exportAuditLogs).not.toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("AuditList reports a queued export through the success toast", async () => {
  auditState.nextExportStatus = "queued";
  const view = mount(<AuditList />);
  try {
    await flush();
    clickByText(view.container, "Export");
    clickByText(view.container, "submit-export");
    await flush();
    expect(auditState.exportAuditLogs).toHaveBeenCalledWith({
      format: "csv",
      columns: ["event", "actor", "resource", "timestamp", "status"],
      filters: expect.objectContaining({ limit: 50 }),
    });
    expect(auditActionState.toastSuccess).toHaveBeenCalledWith("Audit export queued.");
    expect(view.container.textContent).not.toContain("Export Audit Logs");
  } finally {
    view.cleanup();
  }
});

test("AuditList reports a downloaded export with its filename", async () => {
  const view = mount(<AuditList />);
  try {
    await flush();
    clickByText(view.container, "Export");
    clickByText(view.container, "submit-export");
    await flush();
    expect(auditActionState.toastSuccess).toHaveBeenCalledWith(
      "Audit export downloaded: audit-logs.csv"
    );
    expect(view.container.textContent).not.toContain("Export Audit Logs");
  } finally {
    view.cleanup();
  }
});
