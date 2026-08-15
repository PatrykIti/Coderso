// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import type { FormSubmissionsExport } from "../../../core/admin/services/formsClient";

const submissionsState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const detail = {
    form: { id: "form-1", name: "Contact" },
    fields: [
      { id: "f1", type: "text", label: "Name", name: "text", required: true },
      { id: "f2", type: "email", label: "Email", name: "email", required: true },
    ],
  };

  type TestSubmission = {
    id: string;
    formId: string;
    payload: Record<string, unknown>;
    status: string;
    createdAt: string;
    ip: string | null;
    userAgent: string | null;
  };

  const submissions: TestSubmission[] = [
    {
      id: "sub-new",
      formId: "form-1",
      payload: { text: "Phase25 Verifier", email: "phase25@example.com" },
      status: "new",
      createdAt: "2026-06-12T13:30:00.000Z",
      ip: null,
      userAgent: null,
    },
    {
      id: "sub-old",
      formId: "form-1",
      payload: { text: "Earlier Visitor", email: "earlier@example.com" },
      status: "new",
      createdAt: "2026-06-10T09:00:00.000Z",
      ip: null,
      userAgent: null,
    },
  ];

  return {
    apiError,
    detail,
    submissions: [...submissions],
    defaultSubmissions: submissions,
    listError: null as unknown,
    listCalls: [] as string[],
    detailCalls: [] as string[],
    navigateCalls: [] as string[],
    exportCalls: [] as Array<{ id: string; format: string }>,
    exportError: null as unknown,
    exportResult: {} as FormSubmissionsExport | Promise<FormSubmissionsExport>,
    reset() {
      this.submissions = [...this.defaultSubmissions];
      this.listError = null;
      this.listCalls = [];
      this.detailCalls = [];
      this.navigateCalls = [];
      this.exportCalls = [];
      this.exportError = null;
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
  getFormDetailCached: vi.fn(async (id: string) => {
    submissionsState.detailCalls.push(id);
    return submissionsState.detail;
  }),
  listFormSubmissions: vi.fn(async (id: string) => {
    submissionsState.listCalls.push(id);
    if (submissionsState.listError) throw submissionsState.listError;
    return submissionsState.submissions;
  }),
  exportFormSubmissions: vi.fn(async (id: string, format: "csv" | "json") => {
    submissionsState.exportCalls.push({ id, format });
    if (submissionsState.exportError) throw submissionsState.exportError;
    return submissionsState.exportResult;
  }),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => submissionsState.navigateCalls.push(path),
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

afterEach(() => {
  submissionsState.reset();
  window.history.replaceState({}, "", "/");
});

test("FormSubmissionsPage lists payloads newest first with field labels, refreshes, and navigates back", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  const view = mount(<FormSubmissionsPage />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Form submissions");
    expect(view.container.textContent).toContain("Contact");
    expect(submissionsState.listCalls).toEqual(["form-1"]);
    expect(submissionsState.detailCalls).toEqual(["form-1"]);

    // Payload values render with the field LABELS resolved from the form
    // definition (payload keys are field names).
    expect(view.container.textContent).toContain("Name:");
    expect(view.container.textContent).toContain("Phase25 Verifier");
    expect(view.container.textContent).toContain("Email:");
    expect(view.container.textContent).toContain("phase25@example.com");

    // Newest first: the API order is preserved as-is.
    const rowsText = Array.from(view.container.querySelectorAll("tbody tr")).map(
      (row) => row.textContent ?? ""
    );
    expect(rowsText).toHaveLength(2);
    expect(rowsText[0]).toContain("Phase25 Verifier");
    expect(rowsText[1]).toContain("Earlier Visitor");

    clickByText(view.container, "Refresh");
    await flush();
    expect(submissionsState.listCalls).toEqual(["form-1", "form-1"]);

    clickByText(view.container, "Back to form");
    expect(submissionsState.navigateCalls).toContain("/advanced/forms/form-1");
  } finally {
    view.cleanup();
  }
});

test("FormSubmissionsPage paginates client-side beyond 20 submissions", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  submissionsState.submissions = Array.from({ length: 25 }, (_, index) => ({
    id: `sub-${index + 1}`,
    formId: "form-1",
    payload: { text: `Visitor ${index + 1}` },
    status: "new",
    createdAt: new Date(Date.UTC(2026, 5, 12, 12, 59 - index)).toISOString(),
    ip: null,
    userAgent: null,
  }));
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  const view = mount(<FormSubmissionsPage />);

  try {
    await flush();

    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(20);
    expect(view.container.textContent).toContain("Page 1 of 2 (25 submissions)");
    expect(view.container.textContent).toContain("Visitor 1");
    expect(view.container.textContent).not.toContain("Visitor 21");

    clickByText(view.container, "Next");
    await flush();

    expect(view.container.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(view.container.textContent).toContain("Page 2 of 2");
    expect(view.container.textContent).toContain("Visitor 21");
    expect(view.container.textContent).not.toContain("Visitor 1:");

    clickByText(view.container, "Previous");
    await flush();
    expect(view.container.textContent).toContain("Page 1 of 2");
  } finally {
    view.cleanup();
  }
});

test("FormSubmissionsPage reports api and generic load errors and shows the empty state", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  submissionsState.listError = submissionsState.apiError("Submissions denied");
  const apiErrorView = mount(<FormSubmissionsPage />);
  try {
    await flush();
    expect(apiErrorView.container.textContent).toContain("Unable to load submissions");
    expect(apiErrorView.container.textContent).toContain("Submissions denied");
  } finally {
    apiErrorView.cleanup();
  }

  submissionsState.reset();
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  submissionsState.listError = new Error("boom");
  const genericErrorView = mount(<FormSubmissionsPage />);
  try {
    await flush();
    expect(genericErrorView.container.textContent).toContain("Failed to load submissions.");
  } finally {
    genericErrorView.cleanup();
  }

  submissionsState.reset();
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  submissionsState.submissions = [];
  const emptyView = mount(<FormSubmissionsPage />);
  try {
    await flush();
    expect(emptyView.container.textContent).toContain("No submissions yet.");
  } finally {
    emptyView.cleanup();
  }
});

const installDownloadMocks = () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const createObjectURL = vi.fn(() => "blob:export");
  const revokeObjectURL = vi.fn();
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  return {
    createObjectURL,
    revokeObjectURL,
    click,
    restore: () => {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: originalCreate,
      });
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: originalRevoke,
      });
      click.mockRestore();
    },
  };
};

const findExportButton = (container: HTMLElement, label: string) =>
  Array.from(container.querySelectorAll("button")).find((candidate) =>
    candidate.textContent?.includes(label)
  );

test("FormSubmissionsPage exports submissions as CSV through the Blob download", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  const view = mount(<FormSubmissionsPage />);
  await flush();
  expect(view.container.textContent).toContain("Export CSV");

  const download = installDownloadMocks();
  try {
    clickByText(view.container, "Export CSV");
    await flush();
    expect(submissionsState.exportCalls).toEqual([{ id: "form-1", format: "csv" }]);
    expect(download.createObjectURL).toHaveBeenCalledTimes(1);
    expect(download.click).toHaveBeenCalledTimes(1);
    expect(download.revokeObjectURL).toHaveBeenCalledWith("blob:export");
  } finally {
    download.restore();
    view.cleanup();
  }
});

test("FormSubmissionsPage exports submissions as JSON on the JSON action", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  const view = mount(<FormSubmissionsPage />);
  await flush();

  const download = installDownloadMocks();
  try {
    clickByText(view.container, "Export JSON");
    await flush();
    expect(submissionsState.exportCalls).toEqual([{ id: "form-1", format: "json" }]);
    expect(download.createObjectURL).toHaveBeenCalledTimes(1);
  } finally {
    download.restore();
    view.cleanup();
  }
});

test("FormSubmissionsPage disables export buttons while loading, when empty, and mid-export", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  const view = mount(<FormSubmissionsPage />);
  try {
    const whileLoading = Array.from(view.container.querySelectorAll("button")).filter((button) =>
      button.textContent?.includes("Export")
    );
    expect(whileLoading.length).toBeGreaterThan(0);
    expect(whileLoading.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  } finally {
    view.cleanup();
  }

  submissionsState.reset();
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  submissionsState.submissions = [];
  const emptyView = mount(<FormSubmissionsPage />);
  try {
    await flush();
    const emptyButtons = Array.from(emptyView.container.querySelectorAll("button")).filter(
      (button) => button.textContent?.includes("Export")
    );
    expect(emptyButtons.every((button) => (button as HTMLButtonElement).disabled)).toBe(true);
  } finally {
    emptyView.cleanup();
  }

  submissionsState.reset();
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  let resolveExport: (value: FormSubmissionsExport) => void = () => {};
  submissionsState.exportResult = new Promise<FormSubmissionsExport>((resolve) => {
    resolveExport = resolve;
  });
  const inFlightView = mount(<FormSubmissionsPage />);
  try {
    await flush();
    const download = installDownloadMocks();
    clickByText(inFlightView.container, "Export CSV");
    await flush();
    const inFlightButton = findExportButton(inFlightView.container, "Exporting");
    expect(inFlightButton).toBeDefined();
    expect((inFlightButton as HTMLButtonElement).disabled).toBe(true);
    resolveExport({
      fileName: "coderso-form-contact-submissions-2026-06-28.csv",
      contentType: "text/csv",
      content: "Submission ID,Received At,Status\n",
      totalRows: 0,
    });
    await flush();
    expect(inFlightView.container.textContent).toContain("Export CSV");
    expect(
      (findExportButton(inFlightView.container, "Export CSV") as HTMLButtonElement).disabled
    ).toBe(false);
    download.restore();
  } finally {
    inFlightView.cleanup();
  }
});

test("FormSubmissionsPage shows the error alert and re-enables buttons when export fails", async () => {
  window.history.replaceState({}, "", "/admin/advanced/forms/form-1/submissions");
  const { FormSubmissionsPage } = await import("../../../core/admin/ui/forms/FormSubmissionsPage");

  submissionsState.exportError = submissionsState.apiError("Export denied");
  const view = mount(<FormSubmissionsPage />);
  try {
    await flush();
    const download = installDownloadMocks();
    clickByText(view.container, "Export CSV");
    await flush();
    expect(view.container.textContent).toContain("Export denied");
    expect(view.container.textContent).toContain("Export CSV");
    expect((findExportButton(view.container, "Export CSV") as HTMLButtonElement).disabled).toBe(
      false
    );
    download.restore();
  } finally {
    view.cleanup();
  }
});
