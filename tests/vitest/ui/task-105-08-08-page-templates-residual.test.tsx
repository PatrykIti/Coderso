// @vitest-environment happy-dom

// TASK-105-08-08-L01 — pages reachable coverage: page templates residual.
//
// Drives the public PageTemplatesPage controls (empty-state create, typed
// naming, name/Edit navigation, dialog cancel) against the
// `@/services/pageTemplatesClient` module seam. No dedicated fixture module
// exists for this page, so the seams are mocked locally (same shape
// `page-templates-surface.test.tsx` uses) and every assertion reads visible
// DOM state, the client payload, or the router navigation call.

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const templatesState = vi.hoisted(() => {
  const summary = {
    id: "tpl-1",
    name: "Landing stack",
    slug: "landing-stack",
    description: null,
    category: "marketing",
    status: "published" as const,
    sectionsCount: 3,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  };

  const detail = { ...summary, document: { schemaVersion: 2, sections: [] } };

  return {
    summary,
    detail,
    cached: [summary] as Array<typeof summary> | null,
    listError: null as unknown,
    createError: null as unknown,
    createdIds: [] as string[],
    createCalls: [] as Array<Record<string, unknown>>,
    navigateCalls: [] as string[],
    cacheEvents: new Set<(event: { key: string }) => void>(),
    reset() {
      this.cached = [summary];
      this.listError = null;
      this.createError = null;
      this.createdIds = [];
      this.createCalls = [];
      this.navigateCalls = [];
      this.cacheEvents.clear();
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplates: () => templatesState.cached,
  listPageTemplatesCached: vi.fn(async () => {
    if (templatesState.listError) throw templatesState.listError;
    return templatesState.cached ?? [];
  }),
  createPageTemplate: vi.fn(async (input: Record<string, unknown>) => {
    templatesState.createCalls.push(input);
    if (templatesState.createError) throw templatesState.createError;
    const id = `tpl-created-${templatesState.createdIds.length + 1}`;
    templatesState.createdIds.push(id);
    return { ...templatesState.detail, id, name: input.name };
  }),
  duplicatePageTemplate: vi.fn(async () => templatesState.detail),
  deletePageTemplate: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: { pageTemplatesList: "pageTemplatesList" },
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    templatesState.cacheEvents.add(handler);
    return () => templatesState.cacheEvents.delete(handler);
  },
}));

vi.mock("@/ui/contexts/AdminRouterContext", () => ({
  useAdminRouter: () => ({
    navigate: (path: string) => templatesState.navigateCalls.push(path),
  }),
}));

vi.mock("@/ui/layouts/AdminShell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-template-dialog-open="true">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => <div role="tablist">{children}</div>,
  TabsTrigger: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <span data-tab-trigger={value}>{children}</span>
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

const flushMicrotasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

const buttonsIn = (container: ParentNode) => Array.from(container.querySelectorAll("button"));

const clickButtonWithText = (container: ParentNode, text: string, occurrence = 0) => {
  const matches = buttonsIn(container).filter((entry) => entry.textContent?.includes(text));
  const button = matches[occurrence];
  expect(button, `expected a "${text}" button`).toBeTruthy();
  React.act(() => {
    button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const setInputValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLInputElement)) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
};

const loadPage = async () => {
  const { PageTemplatesPage } =
    await import("../../../core/admin/ui/pages/templates/PageTemplatesPage");
  const view = mount(<PageTemplatesPage />);
  await React.act(async () => {
    await flushMicrotasks();
  });
  return view;
};

afterEach(() => {
  templatesState.reset();
});

test("empty state create drives the typed naming dialog through the client seam", async () => {
  templatesState.cached = null;

  const view = await loadPage();

  try {
    expect(view.container.textContent).toContain("No page templates yet");

    // The empty state's own "New template" affordance (the second button, after
    // the header one) opens the create dialog.
    clickButtonWithText(view.container, "New template", 1);
    expect(view.container.querySelector("[data-template-dialog-open='true']")).toBeTruthy();

    React.act(() => {
      setInputValue(
        view.container.querySelector('input[aria-label="Template name"]'),
        "  Landing hero stack  "
      );
      setInputValue(
        view.container.querySelector('input[aria-label="Template category"]'),
        "marketing"
      );
    });

    await React.act(async () => {
      clickButtonWithText(view.container, "Create template");
      await flushMicrotasks();
    });

    expect(templatesState.createCalls).toEqual([
      expect.objectContaining({
        name: "Landing hero stack",
        category: "marketing",
      }),
    ]);
    expect(templatesState.navigateCalls).toEqual(["/advanced/page-templates/tpl-created-1"]);
    // A successful create closes the dialog.
    expect(view.container.querySelector("[data-template-dialog-open='true']")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("template rows navigate from the name button and the labelled Edit control", async () => {
  const view = await loadPage();

  try {
    expect(view.container.textContent).toContain("Landing stack");
    expect(view.container.querySelector('[data-page-template-row="tpl-1"]')).toBeTruthy();

    clickButtonWithText(view.container, "Landing stack");
    expect(templatesState.navigateCalls).toEqual(["/advanced/page-templates/tpl-1"]);

    const edit = view.container.querySelector('button[aria-label="Edit Landing stack"]');
    expect(edit).toBeTruthy();
    React.act(() => {
      edit?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(templatesState.navigateCalls).toEqual([
      "/advanced/page-templates/tpl-1",
      "/advanced/page-templates/tpl-1",
    ]);
  } finally {
    view.cleanup();
  }
});

test("cancelling the create dialog closes it without calling the client", async () => {
  const view = await loadPage();

  try {
    clickButtonWithText(view.container, "New template");
    expect(view.container.querySelector("[data-template-dialog-open='true']")).toBeTruthy();

    React.act(() => {
      setInputValue(
        view.container.querySelector('input[aria-label="Template name"]'),
        "Abandoned stack"
      );
    });

    clickButtonWithText(view.container, "Cancel");

    expect(view.container.querySelector("[data-template-dialog-open='true']")).toBeNull();
    expect(templatesState.createCalls).toEqual([]);
    expect(templatesState.navigateCalls).toEqual([]);
  } finally {
    view.cleanup();
  }
});

test("create failures surface in the page alert while the dialog stays open", async () => {
  templatesState.cached = null;
  templatesState.createError = new Error("Template name already exists.");

  const view = await loadPage();

  try {
    clickButtonWithText(view.container, "New template");
    React.act(() => {
      setInputValue(
        view.container.querySelector('input[aria-label="Template name"]'),
        "Landing hero stack"
      );
    });

    await React.act(async () => {
      clickButtonWithText(view.container, "Create template");
      await flushMicrotasks();
    });

    expect(view.container.textContent).toContain("Page template action failed");
    expect(view.container.textContent).toContain("Template name already exists.");
    // The dialog remains mounted so the author can correct the name.
    expect(view.container.querySelector("[data-template-dialog-open='true']")).toBeTruthy();
  } finally {
    view.cleanup();
  }
});
