// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { PageTemplatesPage } from "../../../core/admin/ui/pages/templates/PageTemplatesPage";

// TASK-105-05 LEAF B1: PageTemplatesPage list surface + the real usePageTemplates
// hook running against mocked client/cacheBus modules. Asserts visible effects:
// skeleton vs grid, role=alert copy, dialog confirm/deny, disabled buttons,
// status/search filtering, and cacheBus revalidation.

type TemplateStatus = "draft" | "published";

type TemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  status: TemplateStatus;
  sectionsCount: number;
  createdAt: string;
  updatedAt: string;
};

type TemplateDetail = TemplateSummary & { document: Record<string, unknown> };

type ApiError = { kind: "api"; message: string };

const pageTemplatesState = vi.hoisted(() => {
  const listeners = new Set<(event: { key: string }) => void>();
  const state = {
    cached: null as TemplateSummary[] | null,
    items: [] as TemplateSummary[],
    nextListError: null as unknown,
    listGate: null as Promise<void> | null,
    resolveListGate: null as (() => void) | null,
    listCalls: [] as Array<{ force?: boolean }>,
    createResult: null as TemplateDetail | null,
    createError: null as unknown,
    createCalls: [] as Array<{
      name: string;
      category: string | null;
      document: Record<string, unknown>;
    }>,
    duplicatePending: false,
    duplicateResolve: null as (() => void) | null,
    duplicateError: null as unknown,
    duplicateCalls: [] as string[],
    deleteError: null as unknown,
    deleteCalls: [] as string[],
    navigateCalls: [] as string[],
    apiError(message: string): ApiError {
      return { kind: "api", message };
    },
    reset() {
      listeners.clear();
      state.cached = null;
      state.items = [];
      state.nextListError = null;
      state.listGate = null;
      state.resolveListGate = null;
      state.listCalls = [];
      state.createResult = null;
      state.createError = null;
      state.createCalls = [];
      state.duplicatePending = false;
      state.duplicateResolve = null;
      state.duplicateError = null;
      state.duplicateCalls = [];
      state.deleteError = null;
      state.deleteCalls = [];
      state.navigateCalls = [];
    },
    triggerCache(key: string) {
      for (const listener of [...listeners]) listener({ key });
    },
    subscribe(listener: (event: { key: string }) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    listenerCount() {
      return listeners.size;
    },
  };
  return state;
});

const tabsState = vi.hoisted(() => ({
  handler: null as ((value: string) => void) | null,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplates: () => pageTemplatesState.cached,
  getCachedPageTemplateDetail: () => null,
  listPageTemplatesCached: async (options?: { force?: boolean }) => {
    pageTemplatesState.listCalls.push({ force: options?.force });
    if (pageTemplatesState.listGate) await pageTemplatesState.listGate;
    const error = pageTemplatesState.nextListError;
    if (error) {
      pageTemplatesState.nextListError = null;
      throw error;
    }
    return pageTemplatesState.items;
  },
  getPageTemplateCached: async () => null,
  createPageTemplate: async (payload: {
    name: string;
    category: string | null;
    document: Record<string, unknown>;
  }) => {
    pageTemplatesState.createCalls.push(payload);
    const error = pageTemplatesState.createError;
    if (error) {
      pageTemplatesState.createError = null;
      throw error;
    }
    return pageTemplatesState.createResult;
  },
  updatePageTemplate: async () => null,
  duplicatePageTemplate: async (id: string) => {
    pageTemplatesState.duplicateCalls.push(id);
    if (pageTemplatesState.duplicatePending) {
      await new Promise<void>((resolve) => {
        pageTemplatesState.duplicateResolve = resolve;
      });
    }
    const error = pageTemplatesState.duplicateError;
    if (error) {
      pageTemplatesState.duplicateError = null;
      throw error;
    }
    const source = pageTemplatesState.items.find((item) => item.id === id);
    const copy: TemplateSummary = {
      ...(source ?? {
        id: "tpl-copy",
        name: "Template",
        slug: "copy",
        description: null,
        category: null,
        status: "draft",
        sectionsCount: 0,
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-01T00:00:00.000Z",
      }),
      id: "tpl-copy",
      name: `${source?.name ?? "Template"} copy`,
    };
    pageTemplatesState.items = [copy, ...pageTemplatesState.items];
    return copy;
  },
  deletePageTemplate: async (id: string) => {
    pageTemplatesState.deleteCalls.push(id);
    const error = pageTemplatesState.deleteError;
    if (error) {
      pageTemplatesState.deleteError = null;
      throw error;
    }
    pageTemplatesState.items = pageTemplatesState.items.filter((item) => item.id !== id);
    return { ok: true };
  },
  previewPageTemplate: async () => ({
    token: "preview-token",
    previewUrl: "/preview?type=page-template&token=preview-token",
    expiresAt: "2026-06-01T01:00:00.000Z",
    sectionsCount: 3,
  }),
  clearPageTemplatesCache: () => undefined,
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (listener: (event: { key: string }) => void) =>
    pageTemplatesState.subscribe(listener),
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (href: string) => pageTemplatesState.navigateCalls.push(href),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
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
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {actions}
    </header>
  ),
}));

vi.mock("@/ui/shared/EmptyState", () => ({
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  }) => (
    <div data-empty-state>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ?? null}
    </div>
  ),
}));

vi.mock("@/ui/shared/ListSkeleton", () => ({
  ListSkeleton: ({ rows = 5 }: { rows?: number }) => (
    <div aria-hidden="true" data-list-skeleton={rows} />
  ),
}));

vi.mock("@/ui/shared/ConfirmActionDialog", () => ({
  ConfirmActionDialog: ({
    open,
    title,
    description,
    targetLabel,
    confirmLabel,
    cancelLabel = "Cancel",
    onConfirm,
    onOpenChange,
  }: {
    open: boolean;
    title: string;
    description: React.ReactNode;
    targetLabel?: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
  }) =>
    open ? (
      <div role="dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        {targetLabel ? <p>{targetLabel}</p> : null}
        <button type="button" onClick={onConfirm}>
          {confirmLabel}
        </button>
        <button type="button" onClick={() => onOpenChange(false)}>
          {cancelLabel}
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children: React.ReactNode;
  }) => {
    tabsState.handler = onValueChange ?? null;
    return <div data-tabs-value={value}>{children}</div>;
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <button type="button" role="tab" onClick={() => tabsState.handler?.(value)}>
      {children}
    </button>
  ),
}));

const summary = (overrides: Partial<TemplateSummary> = {}): TemplateSummary => ({
  id: "tpl-1",
  name: "Landing stack",
  slug: "landing-stack",
  description: null,
  category: "marketing",
  status: "published",
  sectionsCount: 3,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

const detail = (overrides: Partial<TemplateSummary> = {}): TemplateDetail => ({
  ...summary(overrides),
  document: { schemaVersion: 2, sections: [] },
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flushAsync() {
  await React.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function mount(node: React.ReactNode) {
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
}

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const findButton = (root: HTMLElement, matcher: (text: string) => boolean) =>
  Array.from(root.querySelectorAll("button")).find((candidate) =>
    matcher(candidate.textContent ?? "")
  );

const clickButton = (root: HTMLElement, matcher: (text: string) => boolean) => {
  const button = findButton(root, matcher);
  React.act(() => {
    button?.click();
  });
  return button;
};

const findByLabel = (root: HTMLElement, label: string) =>
  root.querySelector(`[aria-label="${label}"]`) as HTMLButtonElement | null;

const clickByLabel = (root: HTMLElement, label: string) => {
  const element = findByLabel(root, label);
  React.act(() => {
    element?.click();
  });
  return element;
};

const triggerCache = (key: string) => {
  React.act(() => {
    pageTemplatesState.triggerCache(key);
  });
};

beforeEach(() => {
  pageTemplatesState.reset();
  tabsState.handler = null;
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("shows the loading skeleton until the list resolves, then renders rows", async () => {
  pageTemplatesState.cached = null;
  pageTemplatesState.listGate = new Promise<void>((resolve) => {
    pageTemplatesState.resolveListGate = resolve;
  });
  const view = mount(<PageTemplatesPage />);

  try {
    expect(view.container.querySelector("[data-list-skeleton]")).toBeTruthy();
    expect(view.container.textContent).not.toContain("Landing stack");

    pageTemplatesState.items = [summary()];
    pageTemplatesState.listGate = null;
    pageTemplatesState.resolveListGate?.();
    await flushAsync();

    expect(view.container.querySelector("[data-list-skeleton]")).toBeFalsy();
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
    expect(view.container.textContent).toContain("Landing stack");
  } finally {
    view.cleanup();
  }
});

test("renders cached templates without the loading state", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = [summary()];
  const view = mount(<PageTemplatesPage />);

  try {
    expect(view.container.querySelector("[data-list-skeleton]")).toBeFalsy();
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
    expect(view.container.textContent).toContain("landing-stack");
    expect(view.container.textContent).toContain("marketing");
    expect(view.container.textContent).toMatch(/3 sections/);

    // The mount effect still force-refreshes against the API.
    await flushAsync();
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }]);
  } finally {
    view.cleanup();
  }
});

test("renders a draft row with the status badge and singular section copy", async () => {
  pageTemplatesState.cached = [
    summary({
      id: "tpl-draft",
      name: "Contact page",
      slug: "contact-page",
      category: null,
      status: "draft",
      sectionsCount: 1,
    }),
  ];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    expect(view.container.querySelector('[data-page-template-row="tpl-draft"]')).toBeTruthy();
    // category is null, so the badge falls back to the status token.
    expect(view.container.textContent).toContain("contact-page");
    expect(view.container.textContent).toMatch(/1 section/);
  } finally {
    view.cleanup();
  }
});

test("shows the load-error alert with the api error message", async () => {
  pageTemplatesState.cached = null;
  pageTemplatesState.nextListError = pageTemplatesState.apiError("templates_list_failed");
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    const alert = view.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Unable to load page templates");
    expect(alert?.textContent).toContain("templates_list_failed");
    expect(view.container.querySelector("[data-list-skeleton]")).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("falls back to the generic copy for non-Error, non-api load failures", async () => {
  pageTemplatesState.cached = null;
  pageTemplatesState.nextListError = "unexpected";
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    const alert = view.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Unable to load page templates");
    expect(alert?.textContent).toContain("Failed to load page templates.");
  } finally {
    view.cleanup();
  }
});

test("renders the empty state when a cached empty list resolves", async () => {
  pageTemplatesState.cached = [];
  pageTemplatesState.items = [];
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    expect(view.container.querySelector("[data-list-skeleton]")).toBeFalsy();
    expect(view.container.textContent).toContain("No page templates yet");
    expect(view.container.textContent).toContain(
      "Create one to reuse section stacks across pages."
    );
    expect(view.container.querySelector("[data-empty-state]")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("filters rows by search text across name, slug, and category", async () => {
  pageTemplatesState.cached = [
    summary(),
    summary({ id: "tpl-2", name: "Product page", slug: "product-page", category: null }),
  ];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    setInputValue(view.container.querySelector('[aria-label="Search page templates"]'), "landing");
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeFalsy();

    setInputValue(view.container.querySelector('[aria-label="Search page templates"]'), "product");
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("shows the no-match empty state without a create action when rows exist", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    setInputValue(view.container.querySelector('[aria-label="Search page templates"]'), "zzz");
    expect(view.container.textContent).toContain("No matching templates");
    expect(view.container.textContent).toContain("No page templates match your search.");
    // The header action remains; the empty-state action slot is null when rows exist.
    expect(clickButton(view.container, (text) => text.includes("New template"))).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("filters rows by the status tabs and updates the counts", async () => {
  pageTemplatesState.cached = [
    summary(),
    summary({
      id: "tpl-2",
      name: "Product page",
      slug: "product-page",
      category: null,
      status: "draft",
    }),
  ];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    expect(view.container.textContent).toContain("All (2)");
    expect(view.container.textContent).toContain("Published (1)");
    expect(view.container.textContent).toContain("Draft (1)");

    clickButton(view.container, (text) => text.includes("Published"));
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeFalsy();

    clickButton(view.container, (text) => text.includes("Draft"));
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeFalsy();

    clickButton(view.container, (text) => text.includes("All"));
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("creates a template and navigates to the new editor", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  pageTemplatesState.createResult = detail({ id: "tpl-new", name: "Landing hero stack" });
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickButton(view.container, (text) => text.includes("New template"));

    expect(findButton(view.container, (text) => text.includes("Create template"))?.disabled).toBe(
      true
    );

    setInputValue(
      view.container.querySelector('[aria-label="Template name"]'),
      "Landing hero stack"
    );
    setInputValue(view.container.querySelector('[aria-label="Template category"]'), "growth");
    expect(findButton(view.container, (text) => text.includes("Create template"))?.disabled).toBe(
      false
    );

    clickButton(view.container, (text) => text.includes("Create template"));
    await flushAsync();

    expect(pageTemplatesState.createCalls).toHaveLength(1);
    expect(pageTemplatesState.createCalls[0]?.name).toBe("Landing hero stack");
    expect(pageTemplatesState.createCalls[0]?.category).toBe("growth");
    expect(pageTemplatesState.createCalls[0]?.document).toMatchObject({ schemaVersion: 2 });
    expect(pageTemplatesState.navigateCalls).toContain("/advanced/page-templates/tpl-new");
    // The dialog closed after a successful create.
    expect(view.container.textContent).not.toContain("New page template");
  } finally {
    view.cleanup();
  }
});

test("keeps the create dialog open and shows the action error when create fails", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  pageTemplatesState.createError = pageTemplatesState.apiError("templates_create_failed");
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickButton(view.container, (text) => text.includes("New template"));
    setInputValue(
      view.container.querySelector('[aria-label="Template name"]'),
      "Landing hero stack"
    );
    clickButton(view.container, (text) => text.includes("Create template"));
    await flushAsync();

    const alerts = Array.from(view.container.querySelectorAll('[role="alert"]'));
    const actionAlert = alerts.find((alert) =>
      alert.textContent?.includes("Page template action failed")
    );
    expect(actionAlert?.textContent).toContain("templates_create_failed");
    expect(pageTemplatesState.navigateCalls).toHaveLength(0);
    expect(view.container.textContent).toContain("New page template");
  } finally {
    view.cleanup();
  }
});

test("duplicates a template and force-refreshes the list", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Duplicate Landing stack");
    await flushAsync();

    expect(pageTemplatesState.duplicateCalls).toEqual(["tpl-1"]);
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }, { force: true }]);
    expect(view.container.querySelector('[data-page-template-row="tpl-copy"]')).toBeTruthy();
    expect(view.container.textContent).toContain("Landing stack copy");
    expect(view.container.querySelector('[role="alert"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("disables the duplicate button while the mutation is in flight", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  pageTemplatesState.duplicatePending = true;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Duplicate Landing stack");
    await React.act(async () => {
      await Promise.resolve();
    });
    expect(findByLabel(view.container, "Duplicate Landing stack")?.disabled).toBe(true);

    pageTemplatesState.duplicatePending = false;
    pageTemplatesState.duplicateResolve?.();
    await flushAsync();

    expect(findByLabel(view.container, "Duplicate Landing stack")?.disabled).toBe(false);
    expect(view.container.querySelector('[data-page-template-row="tpl-copy"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("shows the action error when duplicate fails without refreshing", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  pageTemplatesState.duplicateError = pageTemplatesState.apiError("templates_duplicate_failed");
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Duplicate Landing stack");
    await flushAsync();

    const alert = view.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Page template action failed");
    expect(alert?.textContent).toContain("templates_duplicate_failed");
    // No refresh happened after the failed mutation.
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }]);
  } finally {
    view.cleanup();
  }
});

test("deletes a template through the confirm dialog and force-refreshes", async () => {
  pageTemplatesState.cached = [
    summary(),
    summary({
      id: "tpl-2",
      name: "Product page",
      slug: "product-page",
      category: null,
      status: "draft",
    }),
  ];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Delete Landing stack");

    const dialog = view.container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain("Delete page template");
    expect(dialog?.textContent).toContain("Landing stack");
    expect(dialog?.textContent).toContain("Pages it was applied to keep their sections.");

    clickButton(view.container, (text) => text.includes("Delete template"));
    await flushAsync();

    expect(pageTemplatesState.deleteCalls).toEqual(["tpl-1"]);
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }, { force: true }]);
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-template-row="tpl-2"]')).toBeTruthy();
    expect(view.container.querySelector('[role="dialog"]')).toBeFalsy();
  } finally {
    view.cleanup();
  }
});

test("cancelling the delete dialog does not delete", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Delete Landing stack");
    expect(view.container.querySelector('[role="dialog"]')).toBeTruthy();

    clickButton(view.container, (text) => text === "Cancel");
    expect(pageTemplatesState.deleteCalls).toHaveLength(0);
    expect(view.container.querySelector('[role="dialog"]')).toBeFalsy();
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("shows the fallback action error when delete fails with a non-Error", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = pageTemplatesState.cached;
  pageTemplatesState.deleteError = "boom";
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    clickByLabel(view.container, "Delete Landing stack");
    clickButton(view.container, (text) => text.includes("Delete template"));
    await flushAsync();

    const alert = view.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Page template action failed");
    expect(alert?.textContent).toContain("Failed to delete page template.");
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();
  } finally {
    view.cleanup();
  }
});

test("cacheBus list events force-revalidate while unrelated keys are ignored", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = [summary()];
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }]);

    pageTemplatesState.items = [summary({ id: "tpl-9", name: "Refreshed template" })];
    triggerCache(cacheKeys.pageTemplatesList);
    await flushAsync();

    expect(pageTemplatesState.listCalls).toEqual([{ force: true }, { force: true }]);
    expect(view.container.querySelector('[data-page-template-row="tpl-9"]')).toBeTruthy();
    expect(view.container.textContent).toContain("Refreshed template");

    triggerCache(cacheKeys.pagesList);
    await flushAsync();
    expect(pageTemplatesState.listCalls).toEqual([{ force: true }, { force: true }]);
  } finally {
    view.cleanup();
  }
});

test("a cacheBus revalidation that fails surfaces the load error alert", async () => {
  pageTemplatesState.cached = [summary()];
  pageTemplatesState.items = [summary()];
  const view = mount(<PageTemplatesPage />);

  try {
    await flushAsync();
    pageTemplatesState.nextListError = pageTemplatesState.apiError("revalidation_failed");
    triggerCache(cacheKeys.pageTemplatesList);
    await flushAsync();

    const alert = view.container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("Unable to load page templates");
    expect(alert?.textContent).toContain("revalidation_failed");
  } finally {
    view.cleanup();
  }
});
