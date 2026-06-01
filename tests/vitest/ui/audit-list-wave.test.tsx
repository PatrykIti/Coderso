// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type { AuditLogListResponse, AuditLogQuery } from "../../../core/admin/services/auditClient";

type ListAuditLogsMock = (query?: AuditLogQuery | number) => Promise<AuditLogListResponse>;

const auditState = vi.hoisted(() => ({
  listAuditLogs: vi.fn<ListAuditLogsMock>(async () => ({
    items: [
      {
        id: "audit-1",
        action: "content.publish",
        actorId: "user-1",
        targetType: "page",
        targetId: "home",
        createdAt: "2026-03-15T10:00:00.000Z",
        metadata: {
          actorName: "Ada Lovelace",
          ip: "127.0.0.1",
          requestId: "req-1",
        },
      },
      {
        id: "audit-2",
        action: "auth.denied",
        actorId: "user-2",
        targetType: "session",
        targetId: "sess-1",
        createdAt: "2026-03-15T09:00:00.000Z",
        metadata: {
          actorEmail: "grace@example.com",
          severity: "warning",
        },
      },
    ],
    nextCursor: null,
  })),
  nextError: null as unknown,
  reset() {
    this.listAuditLogs.mockReset();
    this.nextError = null;
    this.listAuditLogs.mockImplementation(async (query) => {
      const auditQuery = typeof query === "object" ? query : undefined;
      if (this.nextError) {
        const error = this.nextError;
        this.nextError = null;
        throw error;
      }
      if (auditQuery?.query === "zzz") {
        return { items: [], nextCursor: null };
      }
      return {
        items: [
          {
            id: "audit-1",
            action: "content.publish",
            actorId: "user-1",
            targetType: "page",
            targetId: "home",
            createdAt: "2026-03-15T10:00:00.000Z",
            metadata: {
              actorName: "Ada Lovelace",
              ip: "127.0.0.1",
              requestId: "req-1",
            },
          },
          {
            id: "audit-2",
            action: "auth.denied",
            actorId: "user-2",
            targetType: "session",
            targetId: "sess-1",
            createdAt: "2026-03-15T09:00:00.000Z",
            metadata: {
              actorEmail: "grace@example.com",
              severity: "warning",
            },
          },
        ],
        nextCursor: auditQuery?.query === "ada" ? "cursor-1" : null,
      };
    });
  },
  apiError(message: string) {
    return { kind: "api", message };
  },
}));

const auditActionState = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  clipboardWriteText: vi.fn(async (_value: string) => undefined),
  reset() {
    this.toastSuccess.mockReset();
    this.toastError.mockReset();
    this.clipboardWriteText.mockReset();
    this.clipboardWriteText.mockResolvedValue(undefined);
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("sonner", () => ({
  toast: {
    success: auditActionState.toastSuccess,
    error: auditActionState.toastError,
  },
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

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/auditClient", () => ({
  listAuditLogs: auditState.listAuditLogs,
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
      <div>{breadcrumbs}</div>
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
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
  }) =>
    open ? (
      <div>
        <span>{title}</span>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-export
        </button>
      </div>
    ) : null,
}));

vi.mock("../../../core/admin/ui/audit/AuditFilters", () => ({
  AuditFilters: ({
    query,
    dateRange,
    eventType,
    severity,
    onQueryChange,
    onDateRangeChange,
    onEventTypeChange,
    onSeverityChange,
  }: {
    query: string;
    dateRange: string;
    eventType: string;
    severity: string;
    onQueryChange: (value: string) => void;
    onDateRangeChange: (value: string) => void;
    onEventTypeChange: (value: string) => void;
    onSeverityChange: (value: string) => void;
  }) => (
    <div>
      <span>{`filters:${query}:${dateRange}:${eventType}:${severity}`}</span>
      <button type="button" onClick={() => onQueryChange("ada")}>
        filter-query
      </button>
      <button type="button" onClick={() => onDateRangeChange("last-30-days")}>
        filter-date
      </button>
      <button type="button" onClick={() => onEventTypeChange("authentication")}>
        filter-type
      </button>
      <button type="button" onClick={() => onSeverityChange("warning")}>
        filter-severity
      </button>
      <button type="button" onClick={() => onQueryChange("zzz")}>
        filter-empty
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/audit/AuditTable", () => ({
  AuditTable: ({
    logs,
    selectedId,
    pageInfo,
    onSelect,
    onCopyJson,
  }: {
    logs: Array<{ id: string; event: string }>;
    selectedId?: string | null;
    pageInfo?: { countCopy: string; hasMore: boolean };
    onSelect: (log: { id: string; event: string }) => void;
    onCopyJson: (log: { id: string; event: string }) => void;
  }) => (
    <div>
      <span>{`audit-table:${logs.length}:${selectedId ?? "none"}`}</span>
      <span>{`page-info:${pageInfo?.countCopy ?? "none"}:${pageInfo?.hasMore ?? false}`}</span>
      {logs.map((log) => (
        <React.Fragment key={log.id}>
          <button type="button" onClick={() => onSelect(log)}>
            {`select:${log.event}`}
          </button>
          <button type="button" onClick={() => onCopyJson(log)}>
            {`copy-table:${log.event}`}
          </button>
        </React.Fragment>
      ))}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/audit/AuditDetailsDrawer", () => ({
  AuditDetailsDrawer: ({
    log,
    open,
    onOpenChange,
    onCopyJson,
  }: {
    log?: { id: string; event: string } | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCopyJson: (log: { id: string; event: string }) => void;
  }) =>
    open ? (
      <div>
        <span>{`drawer:${log?.id ?? "none"}:${log?.event ?? "none"}`}</span>
        {log ? (
          <button type="button" onClick={() => onCopyJson(log)}>
            copy-drawer
          </button>
        ) : null}
        <button type="button" onClick={() => onOpenChange(false)}>
          close-drawer
        </button>
      </div>
    ) : null,
}));

import { AuditList } from "../../../core/admin/ui/audit/AuditList";

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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.click();
  });
};

const flush = async () => {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const lastAuditQuery = () => {
  const query = auditState.listAuditLogs.mock.calls.at(-1)?.[0];
  if (!query || typeof query === "number") {
    throw new Error("Expected the latest audit call to use an object query.");
  }
  return query;
};

beforeEach(() => {
  auditState.reset();
  auditActionState.reset();
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: auditActionState.clipboardWriteText },
    configurable: true,
  });
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("AuditList loads logs, filters them, opens export dialog, and clears selection on drawer close", async () => {
  const view = mount(<AuditList />);

  try {
    await flush();
    expect(auditState.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50, from: expect.any(String), to: expect.any(String) })
    );
    expect(view.container.textContent).toContain("audit-table:2:none");

    clickByText(view.container, "copy-table:Content Publish");
    await flush();
    expect(auditActionState.clipboardWriteText).toHaveBeenCalledTimes(1);
    expect(auditActionState.toastSuccess).toHaveBeenCalledWith("Audit entry JSON copied.");

    clickByText(view.container, "select:Content Publish");
    expect(view.container.textContent).toContain("drawer:audit-1:Content Publish");
    clickByText(view.container, "copy-drawer");
    await flush();
    expect(auditActionState.clipboardWriteText).toHaveBeenCalledTimes(2);
    clickByText(view.container, "close-drawer");
    expect(view.container.textContent).not.toContain("drawer:audit-1:Content Publish");
    expect(view.container.textContent).toContain("audit-table:2:none");

    clickByText(view.container, "filter-query");
    await flush();
    expect(auditState.listAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({ query: "ada" })
    );
    expect(view.container.textContent).toContain(
      "page-info:Showing 2 loaded audit logs. More results are available.:true"
    );

    const queryBeforeDate = lastAuditQuery();
    clickByText(view.container, "filter-date");
    await flush();
    const queryAfterDate = lastAuditQuery();
    expect(queryAfterDate.from).not.toBe(queryBeforeDate.from);
    expect(queryAfterDate.to).toEqual(expect.any(String));

    clickByText(view.container, "filter-type");
    clickByText(view.container, "filter-severity");
    clickByText(view.container, "filter-empty");
    await flush();
    expect(auditState.listAuditLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: "authentication",
        severity: "warning",
        query: "zzz",
      })
    );
    expect(view.container.textContent).toContain("No audit logs match the current filters.");

    clickByText(view.container, "Export CSV");
    expect(view.container.textContent).toContain("Export Audit Logs");
    clickByText(view.container, "close-export");
    expect(view.container.textContent).not.toContain("Export Audit Logs");
  } finally {
    view.cleanup();
  }
});

test("AuditList surfaces api and generic load failures", async () => {
  auditState.nextError = auditState.apiError("Load denied");
  const apiView = mount(<AuditList />);

  try {
    await flush();
    expect(apiView.container.textContent).toContain("Load denied");
    expect(apiView.container.textContent).toContain("Audit logs could not be loaded.");
    expect(apiView.container.textContent).not.toContain("No audit logs match the current filters.");
  } finally {
    apiView.cleanup();
  }

  auditState.reset();
  auditState.nextError = new Error("boom");
  const genericView = mount(<AuditList />);

  try {
    await flush();
    expect(genericView.container.textContent).toContain("Failed to load audit logs.");
  } finally {
    genericView.cleanup();
  }
});

test("AuditList preserves visible rows when a server-filter refresh fails", async () => {
  const view = mount(<AuditList />);

  try {
    await flush();
    expect(view.container.textContent).toContain("audit-table:2:none");

    auditState.nextError = auditState.apiError("Filter failed");
    clickByText(view.container, "filter-query");
    await flush();

    expect(view.container.textContent).toContain("Filter failed");
    expect(view.container.textContent).toContain("audit-table:2:none");
  } finally {
    view.cleanup();
  }
});
