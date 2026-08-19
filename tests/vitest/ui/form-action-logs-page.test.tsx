// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const actionLogsState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

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
    apiError,
    form: { id: "form-1", name: "Contact form" },
    runs,
    listError: null as unknown,
    retryError: null as unknown,
    navigateCalls: [] as string[],
    listCalls: [] as Array<{ id: string; status?: string; limit?: number }>,
    retryCalls: [] as string[],
    subscribers: new Set<(event: { key: string }) => void>(),
    reset() {
      this.form = { id: "form-1", name: "Contact form" };
      this.runs = [...runs];
      this.listError = null;
      this.retryError = null;
      this.navigateCalls = [];
      this.listCalls = [];
      this.retryCalls = [];
      this.subscribers.clear();
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
  const flattenText = (value: React.ReactNode): string =>
    React.Children.toArray(value)
      .map((child) => {
        if (typeof child === "string" || typeof child === "number") return String(child);
        if (React.isValidElement(child)) return flattenText(child.props.children);
        return "";
      })
      .join("")
      .trim();

  const collectOptions = (value: React.ReactNode): Array<{ value: string; label: string }> =>
    React.Children.toArray(value).flatMap((child) => {
      if (!React.isValidElement(child)) return [];
      if (typeof child.props.value === "string") {
        return [{ value: child.props.value, label: flattenText(child.props.children) }];
      }
      return collectOptions(child.props.children);
    });

  return {
    Select: ({
      children,
      onValueChange,
      value,
    }: {
      children: React.ReactNode;
      onValueChange?: (value: string) => void;
      value?: string;
    }) => (
      <select value={value} onChange={(event) => onValueChange?.(event.target.value)}>
        {collectOptions(children).map((option) => (
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
  cacheKeys: {
    formActionRuns: (id: string) => `formActionRuns:${id}`,
  },
}));

vi.mock("@/services/formsClient", () => ({
  getForm: vi.fn(async () => actionLogsState.form),
  listFormActionRuns: vi.fn(
    async (id: string, options: { status?: "success" | "failed" | "skipped"; limit?: number }) => {
      actionLogsState.listCalls.push({ id, ...options });
      if (actionLogsState.listError) throw actionLogsState.listError;
      if (!options.status) return actionLogsState.runs;
      return actionLogsState.runs.filter((run) => run.status === options.status);
    }
  ),
  retryFormActionRun: vi.fn(async (runId: string) => {
    actionLogsState.retryCalls.push(runId);
    if (actionLogsState.retryError) throw actionLogsState.retryError;
    return { ok: true };
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => actionLogsState.navigateCalls.push(path),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({
    children,
    breadcrumbs,
    activeHref,
  }: {
    children: React.ReactNode;
    breadcrumbs?: React.ReactNode;
    activeHref?: string;
  }) => (
    <div data-active-href={activeHref}>
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
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    actionLogsState.subscribers.add(handler);
    return () => actionLogsState.subscribers.delete(handler);
  },
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
      React.act(() => {
        root.unmount();
      });
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

const clickByText = (container: HTMLElement, text: string) => {
  const button = Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(text)
  );
  if (!button) {
    throw new Error(`Missing button: ${text}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setSelectValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLSelectElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

afterEach(() => {
  actionLogsState.reset();
  window.history.replaceState({}, "", "/");
});

test("FormActionLogsPage loads stats, filters runs, retries failures, refreshes from cache bus, and navigates back", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  const { FormActionLogsPage } = await import("../../../core/admin/ui/forms/FormActionLogsPage");

  const view = mount(<FormActionLogsPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Form action logs");
    expect(view.container.textContent).toContain("Contact form");
    expect(view.container.textContent).toContain("Send email");
    expect(view.container.textContent).toContain("Call webhook");
    expect(view.container.textContent).toContain("Webhook timeout");
    expect(view.container.textContent).toContain("1");
    expect(actionLogsState.listCalls[0]).toEqual({
      id: "form-1",
      limit: 200,
      status: undefined,
    });

    const select = view.container.querySelector("select");
    React.act(() => {
      setSelectValue(select ?? undefined, "failed");
    });
    await flush();

    expect(actionLogsState.listCalls.at(-1)).toEqual({
      id: "form-1",
      limit: 200,
      status: "failed",
    });
    expect(view.container.textContent).toContain("Call webhook");
    expect(view.container.textContent).not.toContain("Send email");

    clickByText(view.container, "Retry");
    await flush();

    expect(actionLogsState.retryCalls).toContain("run-failed");

    await React.act(async () => {
      for (const subscriber of actionLogsState.subscribers) {
        subscriber({ key: "formActionRuns:form-1" });
      }
      await Promise.resolve();
    });

    expect(actionLogsState.listCalls.length).toBeGreaterThan(2);

    clickByText(view.container, "Back to form");
    expect(actionLogsState.navigateCalls).toContain("/advanced/forms/form-1");

    clickByText(view.container, "Refresh");
    await flush();

    expect(actionLogsState.listCalls.length).toBeGreaterThan(3);
  } finally {
    view.cleanup();
  }
});

test("FormActionLogsPage reports api and generic load/retry errors", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  const { FormActionLogsPage } = await import("../../../core/admin/ui/forms/FormActionLogsPage");

  actionLogsState.listError = actionLogsState.apiError("Runs failed");
  const errorView = mount(<FormActionLogsPage />);

  try {
    await flush();

    expect(errorView.container.textContent).toContain("Unable to load action logs");
    expect(errorView.container.textContent).toContain("Runs failed");
  } finally {
    errorView.cleanup();
  }

  actionLogsState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  actionLogsState.listError = new Error("boom");

  const genericLoadView = mount(<FormActionLogsPage />);

  try {
    await flush();

    expect(genericLoadView.container.textContent).toContain("Failed to load action logs.");
  } finally {
    genericLoadView.cleanup();
  }

  actionLogsState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  actionLogsState.retryError = actionLogsState.apiError("Retry denied");

  const apiRetryView = mount(<FormActionLogsPage />);

  try {
    await flush();

    clickByText(apiRetryView.container, "Retry");
    await flush();

    expect(apiRetryView.container.textContent).toContain("Retry denied");
  } finally {
    apiRetryView.cleanup();
  }

  actionLogsState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  actionLogsState.retryError = new Error("boom");

  const retryView = mount(<FormActionLogsPage />);

  try {
    await flush();

    clickByText(retryView.container, "Retry");
    await flush();

    expect(retryView.container.textContent).toContain("Retry failed.");
  } finally {
    retryView.cleanup();
  }
});

test("FormActionLogsPage without a forms path segment stays idle", async () => {
  window.history.replaceState({}, "", "/admin/other");
  const { FormActionLogsPage } = await import("../../../core/admin/ui/forms/FormActionLogsPage");

  const view = mount(<FormActionLogsPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Form action logs");
    expect(actionLogsState.listCalls).toHaveLength(0);

    clickByText(view.container, "Refresh");
    await flush();

    expect(actionLogsState.listCalls).toHaveLength(0);
    expect(actionLogsState.navigateCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("FormActionLogsPage refresh reports api and generic failures", async () => {
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  const { FormActionLogsPage } = await import("../../../core/admin/ui/forms/FormActionLogsPage");

  const view = mount(<FormActionLogsPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Send email");

    actionLogsState.listError = actionLogsState.apiError("Runs went stale");
    clickByText(view.container, "Refresh");
    await flush();

    expect(view.container.textContent).toContain("Unable to load action logs");
    expect(view.container.textContent).toContain("Runs went stale");
  } finally {
    view.cleanup();
  }

  actionLogsState.reset();
  window.history.replaceState({}, "", "/admin/forms/form-1/action-runs");
  const genericView = mount(<FormActionLogsPage />);

  try {
    await flush();

    actionLogsState.listError = new Error("boom");
    clickByText(genericView.container, "Refresh");
    await flush();

    expect(genericView.container.textContent).toContain("Failed to load action logs.");
  } finally {
    genericView.cleanup();
  }
});
