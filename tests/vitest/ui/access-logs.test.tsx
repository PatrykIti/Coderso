// @vitest-environment happy-dom

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import type {
  AccessLogListResponse,
  AccessLogQuery,
} from "../../../core/admin/services/accessLogsClient";

type ListAccessLogsMock = (query?: AccessLogQuery) => Promise<AccessLogListResponse>;
type RevokeAccessFromLogMock = (accessLogId: string) => Promise<{ ok: boolean }>;
type ExportAccessLogsMock = (request: {
  format: "csv" | "json";
  columns: string[];
  filters: AccessLogQuery;
}) => Promise<{ status: "downloaded"; filename: string; mimeType: string }>;

const accessState = vi.hoisted(() => ({
  nextError: null as unknown,
  listAccessLogs: vi.fn<ListAccessLogsMock>(async () => ({ items: [], nextCursor: null })),
  revokeAccessFromLog: vi.fn<RevokeAccessFromLogMock>(async () => ({ ok: true })),
  exportAccessLogs: vi.fn<ExportAccessLogsMock>(async () => ({
    status: "downloaded",
    filename: "access-logs-2026-06-01-all.csv",
    mimeType: "text/csv",
  })),
  reset() {
    this.nextError = null;
    this.listAccessLogs.mockReset();
    this.revokeAccessFromLog.mockReset();
    this.exportAccessLogs.mockReset();
    this.revokeAccessFromLog.mockResolvedValue({ ok: true });
    this.exportAccessLogs.mockResolvedValue({
      status: "downloaded",
      filename: "access-logs-2026-06-01-all.csv",
      mimeType: "text/csv",
    });
    this.listAccessLogs.mockImplementation(async (query) => {
      if (this.nextError) {
        const error = this.nextError;
        this.nextError = null;
        throw error;
      }
      if (query?.cursor === "cursor-1") {
        return {
          items: [
            accessRecord({
              id: "access-3",
              path: "/admin/api/settings",
              userName: "Katherine Johnson",
            }),
          ],
          nextCursor: null,
        };
      }
      if (query?.query === "hidden@example.com") {
        return {
          items: [
            accessRecord({
              id: "access-4",
              userName: "Hidden Match",
              userEmail: "hidden@example.com",
              matchContext: { field: "email", label: "Matched user email" },
            }),
          ],
          nextCursor: null,
        };
      }
      return {
        items: [
          accessRecord({ id: "access-1", userName: "Ada Lovelace" }),
          accessRecord({
            id: "access-2",
            path: "/admin/api/auth/login",
            status: 401,
            userName: "Grace Hopper",
          }),
        ],
        nextCursor: query?.query === "ada" ? "cursor-1" : null,
      };
    });
  },
  apiError(message: string, code = "api_error") {
    return { kind: "api", message, code };
  },
}));

const routerState = vi.hoisted(() => ({
  navigate: vi.fn(),
  reset() {
    this.navigate.mockReset();
  },
}));

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  reset() {
    this.success.mockReset();
  },
}));

function accessRecord(overrides: Partial<AccessLogListResponse["items"][number]> = {}) {
  return {
    id: "access-1",
    method: "GET",
    path: "/admin/api/pages",
    status: 200,
    ip: "127.0.0.1",
    userAgent: "Mozilla/5.0 (Macintosh)",
    userId: "user-1",
    userName: "Ada Lovelace",
    userEmail: "ada@example.com",
    durationMs: 42,
    createdAt: "2026-06-01T10:00:00.000Z",
    matchContext: null,
    session: {
      state: "active" as const,
      label: "Active session",
      sessionId: "session-1",
      current: false,
      expiresAt: "2026-06-02T10:00:00.000Z",
      revokedAt: null,
      view: { enabled: true },
      revoke: { enabled: true },
    },
    ...overrides,
  };
}

vi.mock("../../../core/admin/services/accessLogsClient", () => ({
  exportAccessLogs: accessState.exportAccessLogs,
  listAccessLogs: accessState.listAccessLogs,
  revokeAccessFromLog: accessState.revokeAccessFromLog,
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    Boolean(error && typeof error === "object" && "code" in error && "message" in error),
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

vi.mock("@/components/ui/input", () => ({
  Input: ({ onChange, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      onInput={(event) => onChange?.(event as unknown as React.ChangeEvent<HTMLInputElement>)}
      onChange={onChange}
    />
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <select value={value} onChange={(event) => onValueChange(event.currentTarget.value)}>
      {children}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <section>{children}</section> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    breadcrumbs,
    children,
  }: {
    breadcrumbs?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <main>
      <div data-testid="breadcrumbs">
        {Array.isArray(breadcrumbs) ? breadcrumbs.join(" / ") : breadcrumbs}
      </div>
      {children}
    </main>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({ title, actions }: { title: string; actions?: React.ReactNode }) => (
    <header>
      <h1>{title}</h1>
      {actions}
    </header>
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
          onClick={() =>
            void onExport?.({
              format: "csv",
              fields: fields
                .filter((field) => field.defaultChecked !== false)
                .map((field) => field.id),
            })
          }
        >
          submit-export
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-export
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    onOpenChange,
    onConfirm,
    confirmLabel,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void | Promise<void>;
    confirmLabel: string;
  }) =>
    open ? (
      <div>
        confirm-dialog
        <button type="button" onClick={() => onOpenChange(false)}>
          cancel-confirm
        </button>
        <button type="button" onClick={() => void onConfirm()}>
          {`confirm-${confirmLabel}`}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useOptionalAdminRouter: () => ({
    navigate: routerState.navigate,
  }),
}));

vi.mock("../../../core/admin/ui/security/AccessLogDetailsDrawer", () => ({
  AccessLogDetailsDrawer: ({
    log,
    onViewSession,
    onRequestRevoke,
  }: {
    log: {
      id: string;
      session: {
        label: string;
        view: { enabled: boolean; reason?: string };
        revoke: { enabled: boolean; reason?: string };
      };
    } | null;
    onViewSession?: (log: never) => void;
    onRequestRevoke?: (log: never) => void;
  }) => (
    <div>
      drawer
      {log ? (
        <>
          <span>{`session:${log.session.label}`}</span>
          <button
            type="button"
            disabled={!log.session.view.enabled}
            onClick={() => onViewSession?.(log as never)}
          >
            view-session
          </button>
          <button
            type="button"
            disabled={!log.session.revoke.enabled}
            onClick={() => onRequestRevoke?.(log as never)}
          >
            request-revoke
          </button>
        </>
      ) : null}
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/security/AccessLogsTable", () => ({
  AccessLogsTable: ({
    logs,
    pageInfo,
    onView,
  }: {
    logs: Array<{
      id: string;
      user: { name: string };
      matchContext?: { label: string } | null;
    }>;
    onView?: (log: never) => void;
    pageInfo?: {
      countCopy: string;
      canNext: boolean;
      canPrevious: boolean;
      onNext: () => void;
      onPrevious: () => void;
    };
  }) => (
    <div>
      <span>{`access-table:${logs.length}`}</span>
      <span>{`page-info:${pageInfo?.countCopy ?? "none"}:${pageInfo?.canNext ?? false}:${pageInfo?.canPrevious ?? false}`}</span>
      <button type="button" disabled={!pageInfo?.canPrevious} onClick={pageInfo?.onPrevious}>
        previous-page
      </button>
      <button type="button" disabled={!pageInfo?.canNext} onClick={pageInfo?.onNext}>
        next-page
      </button>
      {logs.map((log) => (
        <div key={log.id}>
          {log.user.name}
          {log.matchContext?.label}
          <button type="button" onClick={() => onView?.(log as never)}>
            {`open-${log.id}`}
          </button>
        </div>
      ))}
    </div>
  ),
}));

import { AccessLogsPage } from "../../../core/admin/ui/security/AccessLogsPage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mountedRoots: Array<{ root: ReturnType<typeof createRoot>; container: HTMLDivElement }> = [];

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

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

function setInputValue(input: HTMLInputElement, value: string) {
  act(() => {
    input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function setSelectValue(select: HTMLSelectElement, value: string) {
  act(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function clickByText(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === text
  );
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${text}`);
  }
  act(() => {
    button.click();
  });
}

function clickByAriaLabel(container: HTMLElement, label: string) {
  const button = container.querySelector(`button[aria-label="${label}"]`);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing button ${label}`);
  }
  act(() => {
    button.click();
  });
}

function lastAccessQuery() {
  return accessState.listAccessLogs.mock.calls.at(-1)?.[0] ?? {};
}

beforeEach(() => {
  accessState.reset();
  routerState.reset();
  toastState.reset();
});

afterEach(() => {
  for (const { root, container } of [...mountedRoots]) {
    cleanupRoot(root, container);
  }
  vi.clearAllMocks();
});

test("AccessLogsPage sends server filters and drives cursor pagination", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    expect(view.container.querySelector("[data-testid='breadcrumbs']")?.textContent).toBe(
      "Admin / Access Logs"
    );
    expect(view.container.textContent).toContain("Access Logs");
    expect(view.container.textContent).toContain("access-table:2");

    const searchInput = view.container.querySelector(
      'input[placeholder="Search user or IP..."]'
    ) as HTMLInputElement;
    const userIdInput = view.container.querySelector(
      'input[placeholder="User ID"]'
    ) as HTMLInputElement;
    setInputValue(searchInput, "ada");
    setInputValue(userIdInput, "user-1");
    await flush();

    expect(lastAccessQuery()).toEqual(expect.objectContaining({ query: "ada", userId: "user-1" }));
    expect(view.container.textContent).toContain(
      "page-info:Showing 2 loaded access logs. More results are available.:true:false"
    );

    clickByText(view.container, "next-page");
    await flush();
    expect(lastAccessQuery()).toEqual(expect.objectContaining({ cursor: "cursor-1" }));
    expect(view.container.textContent).toContain(
      "page-info:Showing 1 loaded access logs.:false:true"
    );

    clickByText(view.container, "previous-page");
    await flush();
    expect(lastAccessQuery()).toEqual(expect.not.objectContaining({ cursor: expect.any(String) }));
    expect(lastAccessQuery()).toEqual(expect.objectContaining({ query: "ada", userId: "user-1" }));

    const selects = view.container.querySelectorAll("select");
    setSelectValue(selects[0] as HTMLSelectElement, "custom");
    await flush();
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range start"]') as HTMLInputElement,
      "2026-05-01"
    );
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range end"]') as HTMLInputElement,
      "2026-05-31"
    );
    await flush();

    expect(lastAccessQuery()).toEqual(
      expect.objectContaining({
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-31T23:59:59.999Z",
      })
    );
    expect(lastAccessQuery()).toEqual(expect.not.objectContaining({ cursor: expect.any(String) }));
  } finally {
    view.cleanup();
  }
});

test("AccessLogsPage exports current base filters without page cursor", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    const searchInput = view.container.querySelector(
      'input[placeholder="Search user or IP..."]'
    ) as HTMLInputElement;
    const userIdInput = view.container.querySelector(
      'input[placeholder="User ID"]'
    ) as HTMLInputElement;
    setInputValue(searchInput, "ada");
    setInputValue(userIdInput, "user-1");
    await flush();

    clickByText(view.container, "next-page");
    await flush();
    expect(lastAccessQuery()).toEqual(expect.objectContaining({ cursor: "cursor-1" }));

    clickByAriaLabel(view.container, "Advanced access log filters");
    await flush();
    setInputValue(
      view.container.querySelector("#access-method-filter") as HTMLInputElement,
      "post"
    );
    setInputValue(
      view.container.querySelector("#access-ip-filter") as HTMLInputElement,
      "127.0.0.1"
    );
    clickByText(view.container, "Apply filters");
    await flush();

    const selects = view.container.querySelectorAll("select");
    setSelectValue(selects[0] as HTMLSelectElement, "custom");
    await flush();
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range start"]') as HTMLInputElement,
      "2026-05-01"
    );
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range end"]') as HTMLInputElement,
      "2026-05-31"
    );
    setSelectValue(selects[1] as HTMLSelectElement, "failed");
    await flush();

    clickByText(view.container, "Export");
    await flush();
    expect(view.container.textContent).toContain("Export Access Logs");

    clickByText(view.container, "submit-export");
    await flush();

    expect(accessState.exportAccessLogs).toHaveBeenCalledWith({
      format: "csv",
      columns: ["user", "ip", "timestamp", "status"],
      filters: {
        limit: 50,
        query: "ada",
        userId: "user-1",
        status: "failed",
        method: "POST",
        ip: "127.0.0.1",
        from: "2026-05-01T00:00:00.000Z",
        to: "2026-05-31T23:59:59.999Z",
      },
    });
    expect(toastState.success).toHaveBeenCalledWith(
      "Access log export downloaded: access-logs-2026-06-01-all.csv"
    );
    expect(view.container.textContent).not.toContain("Export Access Logs");
  } finally {
    view.cleanup();
  }
});

test("AccessLogsPage opens advanced filters, validates them, and renders truthful chips", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    clickByAriaLabel(view.container, "Advanced access log filters");
    await flush();
    expect(view.container.textContent).toContain("Advanced access filters");
    expect(view.container.textContent).toContain("Exact User ID remains the user filter.");

    const methodInput = view.container.querySelector("#access-method-filter") as HTMLInputElement;
    const ipInput = view.container.querySelector("#access-ip-filter") as HTMLInputElement;
    setInputValue(methodInput, "TRACE");
    setInputValue(ipInput, "not-an-ip");
    clickByText(view.container, "Apply filters");
    await flush();

    expect(view.container.textContent).toContain("Use a supported HTTP method");
    expect(view.container.textContent).toContain("Use only IPv4 or IPv6 characters");
    expect(lastAccessQuery()).toEqual(expect.not.objectContaining({ method: "TRACE" }));

    setInputValue(methodInput, "post");
    setInputValue(ipInput, "127.0.0.1");
    clickByText(view.container, "Apply filters");
    await flush();

    expect(lastAccessQuery()).toEqual(expect.objectContaining({ method: "POST", ip: "127.0.0.1" }));
    expect(view.container.textContent).toContain("Method: POST");
    expect(view.container.textContent).toContain("IP contains: 127.0.0.1");
    expect(view.container.textContent).not.toContain("Role:");

    clickByAriaLabel(view.container, "Clear Method: POST");
    await flush();
    expect(lastAccessQuery()).toEqual(expect.not.objectContaining({ method: "POST" }));
    expect(lastAccessQuery()).toEqual(expect.objectContaining({ ip: "127.0.0.1" }));
  } finally {
    view.cleanup();
  }
});

test("AccessLogsPage blocks invalid custom ranges and recovers expired cursors", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    const firstCallCount = accessState.listAccessLogs.mock.calls.length;
    const selects = view.container.querySelectorAll("select");
    setSelectValue(selects[0] as HTMLSelectElement, "custom");
    await flush();
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range start"]') as HTMLInputElement,
      "2026-06-02"
    );
    setInputValue(
      view.container.querySelector('input[aria-label="Custom range end"]') as HTMLInputElement,
      "2026-06-01"
    );
    await flush();

    expect(view.container.textContent).toContain("Custom range must start before it ends.");
    expect(accessState.listAccessLogs.mock.calls.length).toBe(firstCallCount);

    setSelectValue(selects[0] as HTMLSelectElement, "last-7-days");
    await flush();
    const searchInput = view.container.querySelector(
      'input[placeholder="Search user or IP..."]'
    ) as HTMLInputElement;
    setInputValue(searchInput, "ada");
    await flush();

    accessState.nextError = accessState.apiError("Cursor invalid", "access_log_cursor_invalid");
    clickByText(view.container, "next-page");
    await flush();
    await flush();

    expect(view.container.textContent).toContain(
      "Access log cursor expired. Showing the first page again."
    );
    expect(lastAccessQuery()).toEqual(expect.not.objectContaining({ cursor: expect.any(String) }));
  } finally {
    view.cleanup();
  }
});

test("AccessLogsPage renders match context without exposing new values", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    const searchInput = view.container.querySelector(
      'input[placeholder="Search user or IP..."]'
    ) as HTMLInputElement;
    setInputValue(searchInput, "hidden@example.com");
    await flush();

    expect(view.container.textContent).toContain("Matched user email");
    expect(view.container.textContent).toContain("Hidden Match");
  } finally {
    view.cleanup();
  }
});

test("AccessLogsPage routes view session and confirms revoke with one API call", async () => {
  const view = mount(<AccessLogsPage />);

  try {
    await flush();
    clickByText(view.container, "open-access-1");
    await flush();
    expect(view.container.textContent).toContain("session:Active session");

    clickByText(view.container, "view-session");
    expect(routerState.navigate).toHaveBeenCalledWith(
      "/settings/security/sessions?sessionId=session-1"
    );

    clickByText(view.container, "open-access-1");
    await flush();
    clickByText(view.container, "request-revoke");
    await flush();
    expect(view.container.textContent).toContain("confirm-dialog");

    clickByText(view.container, "cancel-confirm");
    await flush();
    expect(accessState.revokeAccessFromLog).not.toHaveBeenCalled();

    clickByText(view.container, "request-revoke");
    await flush();
    clickByText(view.container, "confirm-Revoke access");
    await flush();

    expect(accessState.revokeAccessFromLog).toHaveBeenCalledTimes(1);
    expect(accessState.revokeAccessFromLog).toHaveBeenCalledWith("access-1");
    expect(view.container.textContent).toContain("Access session revoked.");
  } finally {
    view.cleanup();
  }
});
