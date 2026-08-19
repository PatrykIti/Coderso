// @vitest-environment happy-dom

import React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { PageDetail } from "../../../core/admin/services/pagesClient";
import type { PageEditorHost } from "../../../core/admin/ui/pages/PageEditor";
import { PageTemplateEditorPage } from "../../../core/admin/ui/pages/templates/PageTemplateEditorPage";
import type { PageDocumentV2 } from "../../../core/services/pages/pageDocumentV2";

// TASK-105-05 LEAF B1: PageTemplateEditorPage host seam + the template settings
// sheet. The shared PageEditor module is stubbed (owned by a later leaf); this
// suite drives the template host: load/save/preview adapters, settings form
// save/validation/failure branches, pathname id resolution, and canvas chrome.

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

const editorState = vi.hoisted(() => {
  const state = {
    cachedDetail: null as TemplateDetail | null,
    detailResult: null as TemplateDetail | null,
    updateResult: null as TemplateDetail | null,
    nextUpdateError: null as unknown,
    updatePending: false,
    updateResolve: null as (() => void) | null,
    updateCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    loadCalls: [] as Array<{ id: string; force?: boolean }>,
    previewCalls: [] as Array<{ id: string; ttlMinutes?: number }>,
    openChanges: [] as boolean[],
    savedDetails: [] as PageDetail[],
    apiError(message: string): ApiError {
      return { kind: "api", message };
    },
    reset() {
      state.cachedDetail = null;
      state.detailResult = null;
      state.updateResult = null;
      state.nextUpdateError = null;
      state.updatePending = false;
      state.updateResolve = null;
      state.updateCalls = [];
      state.loadCalls = [];
      state.previewCalls = [];
      state.openChanges = [];
      state.savedDetails = [];
    },
  };
  return state;
});

const capturedHosts: PageEditorHost[] = [];

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error as { kind?: string }).kind === "api",
}));

vi.mock("@/services/pageTemplatesClient", () => ({
  getCachedPageTemplateDetail: (id: string) =>
    editorState.cachedDetail?.id === id ? editorState.cachedDetail : null,
  getPageTemplateCached: async (id: string, options?: { force?: boolean }) => {
    editorState.loadCalls.push({ id, force: options?.force });
    return editorState.detailResult;
  },
  updatePageTemplate: async (id: string, payload: Record<string, unknown>) => {
    editorState.updateCalls.push({ id, payload });
    if (editorState.updatePending) {
      await new Promise<void>((resolve) => {
        editorState.updateResolve = resolve;
      });
    }
    const error = editorState.nextUpdateError;
    if (error) {
      editorState.nextUpdateError = null;
      throw error;
    }
    return editorState.updateResult;
  },
  previewPageTemplate: async (id: string, options?: { ttlMinutes?: number }) => {
    editorState.previewCalls.push({ id, ttlMinutes: options?.ttlMinutes });
    return {
      token: "preview-token",
      previewUrl: "/preview?type=page-template&token=preview-token",
      expiresAt: "2026-06-01T01:00:00.000Z",
      sectionsCount: 3,
    };
  },
}));

vi.mock("../../../core/admin/ui/pages/PageEditor", () => ({
  PageEditor: ({ pageId, host }: { pageId?: string; host?: PageEditorHost }) => {
    if (host) capturedHosts.push(host);
    return (
      <div data-page-editor-stub data-page-id={pageId ?? ""} data-host-mode={host?.mode ?? ""} />
    );
  },
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}));

const summary = (overrides: Partial<TemplateSummary> = {}): TemplateSummary => ({
  id: "tpl-1",
  name: "Landing stack",
  slug: "landing-stack",
  description: "A reusable landing section stack",
  category: "marketing",
  status: "draft",
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

const setTextareaValue = (element: Element | null | undefined, value: string) => {
  if (!(element instanceof HTMLTextAreaElement)) return;
  const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  React.act(() => {
    descriptor?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

const clickButton = (root: HTMLElement, matcher: (text: string) => boolean) => {
  const button = Array.from(root.querySelectorAll("button")).find((candidate) =>
    matcher(candidate.textContent ?? "")
  );
  React.act(() => {
    button?.click();
  });
  return button;
};

beforeEach(() => {
  editorState.reset();
  capturedHosts.length = 0;
});

afterEach(() => {
  document.body.innerHTML = "";
});

test("binds the Page Editor host seam to the template contract", async () => {
  editorState.cachedDetail = detail();
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);

  try {
    expect(
      view.container.querySelector("[data-page-editor-stub]")?.getAttribute("data-page-id")
    ).toBe("tpl-1");
    expect(
      view.container.querySelector("[data-page-editor-stub]")?.getAttribute("data-host-mode")
    ).toBe("page-template");

    const host = capturedHosts[0];
    expect(host).toBeTruthy();
    expect(host?.mode).toBe("page-template");
    expect(host?.resourceLabel).toBe("Page Templates");
    expect(host?.settingsLabel).toBe("Template settings");
    expect(host?.previewTitle).toBe("Template preview");
    expect(host?.loadFailedMessage).toBe("Failed to load page template.");
    expect(host?.assistantSurface).toBe(false);
    expect(host?.detailCacheKey("tpl-1")).toBe(cacheKeys.pageTemplateDetail("tpl-1"));
  } finally {
    view.cleanup();
  }
});

test("resolves the template id from the location pathname when no prop is given", () => {
  window.history.replaceState({}, "", "/admin/advanced/page-templates/tpl-2");
  const view = mount(<PageTemplateEditorPage />);

  try {
    expect(
      view.container.querySelector("[data-page-editor-stub]")?.getAttribute("data-page-id")
    ).toBe("tpl-2");
  } finally {
    view.cleanup();
  }
});

test("renders the editor without a page id when the pathname has no template id", () => {
  window.history.replaceState({}, "", "/admin/pages");
  const view = mount(<PageTemplateEditorPage />);

  try {
    expect(
      view.container.querySelector("[data-page-editor-stub]")?.getAttribute("data-page-id")
    ).toBe("");
  } finally {
    view.cleanup();
  }
});

test("adapts cached detail to the PageDetail shape and returns null when uncached", () => {
  editorState.cachedDetail = detail();
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);

  try {
    const host = capturedHosts[0];
    expect(host?.getCachedDetail("tpl-1")).toMatchObject({
      id: "tpl-1",
      title: "Landing stack",
      slug: "landing-stack",
      status: "draft",
      currentData: { schemaVersion: 2, sections: [] },
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(host?.getCachedDetail("missing")).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("loadDetail fetches with force and adapts the result", async () => {
  editorState.detailResult = detail({ name: "Fetched template" });
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);

  try {
    const host = capturedHosts[0];
    const loaded = await host?.loadDetail("tpl-1", { force: true });
    expect(editorState.loadCalls).toEqual([{ id: "tpl-1", force: true }]);
    expect(loaded).toMatchObject({ id: "tpl-1", title: "Fetched template" });
    expect(loaded?.currentData).toEqual({ schemaVersion: 2, sections: [] });

    editorState.detailResult = null;
    const missing = await host?.loadDetail("tpl-1");
    expect(missing).toBeNull();
    expect(editorState.loadCalls).toEqual([
      { id: "tpl-1", force: true },
      { id: "tpl-1", force: undefined },
    ]);
  } finally {
    view.cleanup();
  }
});

test("saveDocument persists the document and throws when the API returns null", async () => {
  editorState.updateResult = detail({ name: "Saved template" });
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);

  try {
    const host = capturedHosts[0];
    const document = { schemaVersion: 2, sections: [] } as unknown as PageDocumentV2;
    const saved = await host?.saveDocument("tpl-1", document);
    expect(editorState.updateCalls).toEqual([{ id: "tpl-1", payload: { document } }]);
    expect(saved?.title).toBe("Saved template");
    expect(saved?.currentData).toEqual(document);

    editorState.updateResult = null;
    await expect(host?.saveDocument("tpl-1", document)).rejects.toThrow(
      "Failed to save page template."
    );
  } finally {
    view.cleanup();
  }
});

test("preview issues a 15-minute token through the host", async () => {
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);

  try {
    const host = capturedHosts[0];
    const preview = await host?.preview?.("tpl-1");
    expect(editorState.previewCalls).toEqual([{ id: "tpl-1", ttlMinutes: 15 }]);
    expect(preview?.previewUrl).toBe("/preview?type=page-template&token=preview-token");
  } finally {
    view.cleanup();
  }
});

test("settings form is seeded from the cache and saves the edited metadata", async () => {
  editorState.cachedDetail = detail();
  editorState.updateResult = detail({
    name: "Landing v2",
    slug: "landing-v2",
    description: "Updated description",
    category: "growth",
    status: "published",
  });
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);
  const host = capturedHosts[0];

  try {
    const settings = mount(
      <>
        {host?.renderSettings?.({
          open: true,
          onOpenChange: (open) => editorState.openChanges.push(open),
          detail: host.getCachedDetail("tpl-1"),
          onSaved: (saved) => editorState.savedDetails.push(saved),
        })}
      </>
    );

    try {
      expect(
        settings.container.querySelector('[aria-label="Template name"]')?.getAttribute("value")
      ).toBe("Landing stack");
      expect(
        settings.container.querySelector('[aria-label="Template slug"]')?.getAttribute("value")
      ).toBe("landing-stack");
      expect(
        settings.container.querySelector('[aria-label="Template description"]')?.textContent
      ).toBe("A reusable landing section stack");
      expect(
        settings.container.querySelector('[aria-label="Template category"]')?.getAttribute("value")
      ).toBe("marketing");
      expect(
        settings.container
          .querySelector('[data-page-editor-segmented-option="draft"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true");
      expect(
        settings.container
          .querySelector('[data-page-editor-segmented-option="published"]')
          ?.getAttribute("aria-pressed")
      ).toBe("false");

      setInputValue(settings.container.querySelector('[aria-label="Template name"]'), "Landing v2");
      setInputValue(settings.container.querySelector('[aria-label="Template slug"]'), "landing-v2");
      setTextareaValue(
        settings.container.querySelector('[aria-label="Template description"]'),
        "Updated description"
      );
      setInputValue(settings.container.querySelector('[aria-label="Template category"]'), "growth");
      clickButton(settings.container, (text) => text === "Published");

      expect(
        settings.container
          .querySelector('[data-page-editor-segmented-option="published"]')
          ?.getAttribute("aria-pressed")
      ).toBe("true");

      clickButton(settings.container, (text) => text.includes("Save settings"));
      await flushAsync();

      expect(editorState.updateCalls).toEqual([
        {
          id: "tpl-1",
          payload: {
            name: "Landing v2",
            slug: "landing-v2",
            description: "Updated description",
            category: "growth",
            status: "published",
          },
        },
      ]);
      expect(editorState.savedDetails).toEqual([
        {
          id: "tpl-1",
          title: "Landing v2",
          slug: "landing-v2",
          status: "published",
          currentData: { schemaVersion: 2, sections: [] },
          updatedAt: "2026-06-01T00:00:00.000Z",
        },
      ]);
      expect(editorState.openChanges).toEqual([false]);
    } finally {
      settings.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("settings form shows the save error and keeps the sheet open on failure", async () => {
  editorState.cachedDetail = detail();
  editorState.nextUpdateError = editorState.apiError("settings_save_failed");
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);
  const host = capturedHosts[0];

  try {
    const settings = mount(
      <>
        {host?.renderSettings?.({
          open: true,
          onOpenChange: (open) => editorState.openChanges.push(open),
          detail: host.getCachedDetail("tpl-1"),
          onSaved: (saved) => editorState.savedDetails.push(saved),
        })}
      </>
    );

    try {
      clickButton(settings.container, (text) => text.includes("Save settings"));
      await flushAsync();

      expect(settings.container.textContent).toContain("settings_save_failed");
      expect(editorState.openChanges).toHaveLength(0);
      expect(editorState.savedDetails).toHaveLength(0);
      expect(findSaveButton(settings.container)?.disabled).toBe(false);

      // A second failure with a non-Error surfaces the fallback copy.
      editorState.nextUpdateError = "boom";
      clickButton(settings.container, (text) => text.includes("Save settings"));
      await flushAsync();
      expect(settings.container.textContent).toContain("Failed to save template settings.");
    } finally {
      settings.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

const findSaveButton = (root: HTMLElement) =>
  Array.from(root.querySelectorAll("button")).find((candidate) => {
    const text = candidate.textContent ?? "";
    return text.includes("Save settings") || text === "Saving...";
  }) as HTMLButtonElement | null;

test("settings form disables save on an empty name and shows the saving state", async () => {
  editorState.cachedDetail = detail();
  editorState.updateResult = detail();
  editorState.updatePending = true;
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);
  const host = capturedHosts[0];

  try {
    const settings = mount(
      <>
        {host?.renderSettings?.({
          open: true,
          onOpenChange: (open) => editorState.openChanges.push(open),
          detail: host.getCachedDetail("tpl-1"),
          onSaved: (saved) => editorState.savedDetails.push(saved),
        })}
      </>
    );

    try {
      expect(findSaveButton(settings.container)?.disabled).toBe(false);

      setInputValue(settings.container.querySelector('[aria-label="Template name"]'), "   ");
      expect(findSaveButton(settings.container)?.disabled).toBe(true);

      setInputValue(settings.container.querySelector('[aria-label="Template name"]'), "Landing v2");
      expect(findSaveButton(settings.container)?.disabled).toBe(false);

      clickButton(settings.container, (text) => text.includes("Save settings"));
      await React.act(async () => {
        await Promise.resolve();
      });
      expect(findSaveButton(settings.container)?.textContent).toContain("Saving...");
      expect(findSaveButton(settings.container)?.disabled).toBe(true);

      editorState.updatePending = false;
      editorState.updateResolve?.();
      await flushAsync();

      expect(findSaveButton(settings.container)?.textContent).toContain("Save settings");
      expect(editorState.savedDetails).toHaveLength(1);
      expect(editorState.openChanges).toEqual([false]);
    } finally {
      settings.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("settings sheet renders chrome but no form when the detail is missing", () => {
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);
  const host = capturedHosts[0];

  try {
    const settings = mount(
      <>
        {host?.renderSettings?.({
          open: true,
          onOpenChange: () => undefined,
          detail: null,
          onSaved: () => undefined,
        })}
      </>
    );

    try {
      expect(settings.container.textContent).toContain("Template settings");
      expect(settings.container.textContent).toMatch(/never apply to target pages/);
      expect(settings.container.querySelector('[aria-label="Template name"]')).toBeNull();
      expect(settings.container.querySelector('[aria-label="Template slug"]')).toBeNull();
    } finally {
      settings.cleanup();
    }
  } finally {
    view.cleanup();
  }
});

test("surfaces the propagation banner through the canvasChrome seam", () => {
  const view = mount(<PageTemplateEditorPage templateId="tpl-1" />);
  const host = capturedHosts[0];

  try {
    expect(host?.canvasChrome).toBeTypeOf("function");
    const document = {
      schemaVersion: 2,
      breakpoints: [],
      seo: {},
      settings: {},
      sections: [],
    } as unknown as PageDocumentV2;

    const chrome = mount(<>{host?.canvasChrome?.({ document, device: "desktop" })}</>);
    try {
      expect(chrome.container.textContent).toMatch(/updates every page that uses it/);
      expect(chrome.container.textContent).not.toMatch(/updates \d+ pages/i);
    } finally {
      chrome.cleanup();
    }
  } finally {
    view.cleanup();
  }
});
