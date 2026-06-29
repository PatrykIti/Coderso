// @vitest-environment happy-dom

// TASK-479-15-L03 / L04: locks the Forms ACTION LOGS restyle. The soft/violet
// stat band derives from in-state runs, the status filter keeps the real
// FormActionRunStatus options (all/success/failed/skipped), and the privileged
// retry still calls retryFormActionRun.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const actionLogsState = vi.hoisted(() => {
  const runs = [
    {
      id: "run-success",
      formId: "form-1",
      actionId: "action-1",
      actionType: "email",
      actionLabel: "Send email",
      status: "success" as const,
      attempt: 1,
      trigger: "submission" as const,
      errorMessage: null,
      payload: {},
      response: {},
      retryOfId: null,
      createdAt: "2026-03-08T10:00:00.000Z",
      updatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "run-failed",
      formId: "form-1",
      actionId: "action-2",
      actionType: "webhook",
      actionLabel: "Call webhook",
      status: "failed" as const,
      attempt: 2,
      trigger: "submission" as const,
      errorMessage: "Webhook timeout",
      payload: {},
      response: {},
      retryOfId: null,
      createdAt: "2026-03-08T10:05:00.000Z",
      updatedAt: "2026-03-08T10:05:00.000Z",
    },
    {
      id: "run-skipped",
      formId: "form-1",
      actionId: "action-3",
      actionType: "entry_sync",
      actionLabel: "Sync entry",
      status: "skipped" as const,
      attempt: 1,
      trigger: "submission" as const,
      errorMessage: null,
      payload: {},
      response: {},
      retryOfId: null,
      createdAt: "2026-03-08T10:10:00.000Z",
      updatedAt: "2026-03-08T10:10:00.000Z",
    },
  ];
  return {
    form: { id: "form-1", name: "Contact form" },
    runs,
    retryCalls: [] as string[],
    reset() {
      this.runs = [...runs];
      this.retryCalls = [];
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => {
  const flatten = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) =>
        typeof child === "string" || typeof child === "number"
          ? String(child)
          : React.isValidElement(child)
            ? flatten(child.props.children)
            : ""
      )
      .join("");
  const options = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flatten(child.props.children) }];
      }
      return options(child.props.children);
    });
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (value: string) => void;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {options(children).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SelectContent: () => null,
    SelectItem: () => null,
    SelectTrigger: () => null,
    SelectValue: ({ children }: { children?: React.ReactNode }) => <>{children ?? null}</>,
  };
});

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { formActionRuns: (id: string) => `formActionRuns:${id}` },
}));

vi.mock("@/services/formsClient", () => ({
  getForm: vi.fn(async () => actionLogsState.form),
  listFormActionRuns: vi.fn(
    async (_id: string, options: { status?: "success" | "failed" | "skipped" }) => {
      if (!options.status) return actionLogsState.runs;
      return actionLogsState.runs.filter((run) => run.status === options.status);
    }
  ),
  retryFormActionRun: vi.fn(async (runId: string) => {
    actionLogsState.retryCalls.push(runId);
    return { ok: true };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({ navigate: vi.fn() }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children, activeHref }: { children: React.ReactNode; activeHref?: string }) => (
    <div data-active-href={activeHref}>{children}</div>
  ),
}));

vi.mock("@/ui/shared/PageHeader", () => ({
  PageHeader: ({
    title,
    description,
    actions,
  }: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: () => () => undefined,
}));

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
      React.act(() => root.unmount());
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

const renderPage = async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/action-runs");
  const { FormActionLogsPage } = await import("../../../core/admin/ui/forms/FormActionLogsPage");
  const view = mount(<FormActionLogsPage />);
  await flush();
  return view;
};

afterEach(() => {
  actionLogsState.reset();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

test("renders the stat band + status filter (all/success/failed/skipped)", async () => {
  const view = await renderPage();
  try {
    const cards = Array.from(view.container.querySelectorAll<HTMLElement>('[data-slot="card"]'));
    const findCard = (label: string) => cards.find((card) => card.textContent?.includes(label));

    // 1 success + 1 failed + 1 skipped → Runs 3 / Succeeded 1 / Failed 1.
    expect(findCard("Runs")?.textContent).toContain("3");
    expect(findCard("Succeeded")?.textContent).toContain("1");
    expect(findCard("Failed")?.textContent).toContain("1");

    const select = view.container.querySelector("select");
    const values = Array.from(select?.options ?? []).map((option) => option.value);
    expect(values).toEqual(["all", "success", "failed", "skipped"]);
    expect(select?.value).toBe("all");
  } finally {
    view.cleanup();
  }
});

test("retries a run via retryFormActionRun", async () => {
  const view = await renderPage();
  try {
    const retryButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Retry")
    );
    expect(retryButton).toBeTruthy();
    await React.act(async () => {
      retryButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();
    expect(actionLogsState.retryCalls).toContain("run-failed");
  } finally {
    view.cleanup();
  }
});
