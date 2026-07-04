// @vitest-environment happy-dom

// TASK-479-15-L03 / L04: locks the Forms SUBMISSIONS restyle. The soft/violet
// stat band derives from in-state submissions, rows keep their payload + field
// labels, and the read-only contract (NO submissions cache key) is preserved.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";

const submissionsState = vi.hoisted(() => {
  const detail = {
    form: { id: "form-1", name: "Contact" },
    fields: [
      { id: "f1", type: "text", label: "Name", name: "text", required: true },
      { id: "f2", type: "email", label: "Email", name: "email", required: true },
    ],
  };

  const recent = new Date().toISOString();
  const old = "2020-01-01T00:00:00.000Z";

  const submissions = [
    {
      id: "sub-1",
      formId: "form-1",
      payload: { text: "Recent Visitor", email: "recent@example.com" },
      status: "new",
      createdAt: recent,
      ip: null,
      userAgent: null,
    },
    {
      id: "sub-2",
      formId: "form-1",
      payload: { text: "Spammer", email: "spam@example.com" },
      status: "spam",
      createdAt: recent,
      ip: null,
      userAgent: null,
    },
    {
      id: "sub-3",
      formId: "form-1",
      payload: { text: "Old Visitor", email: "old@example.com" },
      status: "new",
      createdAt: old,
      ip: null,
      userAgent: null,
    },
  ];

  return {
    detail,
    submissions,
    listCalls: [] as string[],
    reset() {
      this.listCalls = [];
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

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/formsClient", () => ({
  getFormDetailCached: vi.fn(async () => submissionsState.detail),
  listFormSubmissions: vi.fn(async (id: string) => {
    submissionsState.listCalls.push(id);
    return submissionsState.submissions;
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
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");
  const view = mount(<FormSubmissionsPage />);
  await flush();
  return view;
};

afterEach(() => {
  submissionsState.reset();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

test("renders the stat band from the submissions fixture (Total/This week/Spam)", async () => {
  const view = await renderPage();
  try {
    const cards = Array.from(view.container.querySelectorAll<HTMLElement>('[data-slot="card"]'));
    const findCard = (label: string) => cards.find((card) => card.textContent?.includes(label));

    expect(findCard("Total")?.textContent).toContain("3");
    expect(findCard("This week")?.textContent).toContain("2");
    expect(findCard("Spam")?.textContent).toContain("1");
  } finally {
    view.cleanup();
  }
});

test("renders a row per submission with payload field labels", async () => {
  const view = await renderPage();
  try {
    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(3);
    // Payload keys are field names; the table resolves them to field LABELS.
    expect(view.container.textContent).toContain("Name:");
    expect(view.container.textContent).toContain("Recent Visitor");
    expect(view.container.textContent).toContain("Email:");
    expect(view.container.textContent).toContain("spam@example.com");
  } finally {
    view.cleanup();
  }
});

test("keeps the read-only contract: reads listFormSubmissions directly, no submissions cache key", async () => {
  const view = await renderPage();
  try {
    // The page calls the uncached read path directly.
    expect(submissionsState.listCalls).toContain("form-1");

    // No submissions cache key exists by design (read-only, always fresh).
    const keys = Object.keys(cacheKeys);
    expect(keys.some((key) => /submission/i.test(key))).toBe(false);
    expect(keys).toContain("formsList");
    expect(keys).toContain("formDetail");
    expect(keys).toContain("formActionRuns");
  } finally {
    view.cleanup();
  }
});
