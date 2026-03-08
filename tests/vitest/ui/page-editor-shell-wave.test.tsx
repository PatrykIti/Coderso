// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

const pageEditorState = vi.hoisted(() => {
  const apiError = (message: string) => ({
    name: "ApiClientError",
    message,
    code: "request_failed",
    status: 400,
  });

  const page = {
    id: "page-1",
    title: "Homepage",
    slug: "/",
    status: "draft",
    currentData: {
      blocks: [
        {
          id: "block-1",
          type: "hero",
          data: {},
          layout: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
            background: { color: "transparent", image: null },
          },
          visibility: { enabled: true, devices: ["desktop", "tablet", "mobile"] },
          editor: { mode: "visual", wizardCompleted: true },
        },
      ],
      settings: {
        template: "landing",
        showInNav: true,
        layout: {
          wrapper: {
            container: "default",
            maxWidth: undefined,
            background: {
              color: "#ffffff",
              image: null,
              media: { type: "none", source: "external", src: null },
            },
            padding: { top: "md", bottom: "md" },
          },
          sections: {
            gap: "lg",
            defaults: {
              container: "default",
              padding: { top: "xl", bottom: "xl" },
              margin: { top: "none", bottom: "none" },
            },
          },
          applyDefaultsToNewBlocks: true,
        },
        revisionRetention: 10,
      },
    },
    updatedAt: "2026-03-08T10:00:00.000Z",
  };

  return {
    apiError,
    page,
    templateOptions: {
      items: [{ key: "landing", label: "Landing" }],
    },
    revisions: [
      {
        id: "rev-1",
        pageId: "page-1",
        version: 1,
        kind: "autosave",
        title: "Draft",
        slug: "/draft",
        data: { blocks: [] },
        createdAt: "2026-03-08T10:00:00.000Z",
        createdBy: { name: "Admin", email: "admin@example.com" },
      },
    ],
    subscribers: new Set<(event: { key: string }) => void>(),
    getPageCalls: [] as Array<{ id: string; force?: boolean }>,
    updatePageCalls: [] as Array<{ id: string; input: Record<string, unknown> }>,
    previewPageCalls: [] as string[],
    publishPageCalls: [] as Array<{ id: string; data: Record<string, unknown> }>,
    autosaveCalls: [] as Array<{ id: string; payload: Record<string, unknown> }>,
    restoreRevisionCalls: [] as Array<{ id: string; revisionId: string }>,
    discardRevisionCalls: [] as Array<{ id: string; revisionId: string }>,
    listRevisionCalls: [] as string[],
    getTemplateOptionsCalls: 0,
    reset() {
      this.subscribers.clear();
      this.getPageCalls = [];
      this.updatePageCalls = [];
      this.previewPageCalls = [];
      this.publishPageCalls = [];
      this.autosaveCalls = [];
      this.restoreRevisionCalls = [];
      this.discardRevisionCalls = [];
      this.listRevisionCalls = [];
      this.getTemplateOptionsCalls = 0;
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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-sheet-open={String(Boolean(open))} data-has-open-change={String(Boolean(onOpenChange))}>
      {children}
    </div>
  ),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "ApiClientError",
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `page:${id}`,
  },
}));

vi.mock("@/services/pagesClient", () => ({
  getCachedPageDetail: () => pageEditorState.page,
  getPageCached: vi.fn(async (id: string, { force }: { force?: boolean } = {}) => {
    pageEditorState.getPageCalls.push({ id, force });
    return pageEditorState.page;
  }),
  getPageTemplateOptions: vi.fn(async () => {
    pageEditorState.getTemplateOptionsCalls += 1;
    return pageEditorState.templateOptions;
  }),
  listPageRevisions: vi.fn(async (id: string) => {
    pageEditorState.listRevisionCalls.push(id);
    return pageEditorState.revisions;
  }),
  updatePage: vi.fn(async (id: string, input: Record<string, unknown>) => {
    pageEditorState.updatePageCalls.push({ id, input });
    return { ...pageEditorState.page, ...input, currentData: input.data ?? pageEditorState.page.currentData };
  }),
  publishPage: vi.fn(async (id: string, data: Record<string, unknown>) => {
    pageEditorState.publishPageCalls.push({ id, data });
    return { ok: true };
  }),
  previewPage: vi.fn(async (id: string) => {
    pageEditorState.previewPageCalls.push(id);
    return { previewUrl: "https://preview.test/page" };
  }),
  autosavePage: vi.fn(async (id: string, payload: Record<string, unknown>) => {
    pageEditorState.autosaveCalls.push({ id, payload });
    return { ok: true };
  }),
  restorePageRevision: vi.fn(async (id: string, revisionId: string) => {
    pageEditorState.restoreRevisionCalls.push({ id, revisionId });
    return { page: pageEditorState.page };
  }),
  discardPageRevision: vi.fn(async (id: string, revisionId: string) => {
    pageEditorState.discardRevisionCalls.push({ id, revisionId });
    return { ok: true };
  }),
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    children,
    leftPanel,
    rightPanel,
    breadcrumbs,
  }: {
    children: React.ReactNode;
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    breadcrumbs?: React.ReactNode;
  }) => (
    <div>
      <div>{breadcrumbs}</div>
      <aside>{leftPanel}</aside>
      <main>{children}</main>
      <aside>{rightPanel}</aside>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: (handler: (event: { key: string }) => void) => {
    pageEditorState.subscribers.add(handler);
    return () => pageEditorState.subscribers.delete(handler);
  },
}));

vi.mock("@/ui/pages/DeviceSwitcher", () => ({
  DeviceSwitcher: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (value: "desktop" | "tablet" | "mobile") => void;
  }) => (
    <button type="button" onClick={() => onChange(value === "desktop" ? "mobile" : "desktop")}>
      {`device:${value}`}
    </button>
  ),
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: ({
    open,
    previewUrl,
  }: {
    open: boolean;
    previewUrl: string | null;
  }) => <div>{`runtime-preview:${open ? "open" : "closed"}:${previewUrl ?? "none"}`}</div>,
}));

vi.mock("../../../core/admin/ui/pages/builder/LibraryPanel", () => ({
  LibraryPanel: ({
    onAddWidget,
    onAddTemplate,
    onAddForm,
  }: {
    onAddWidget: (type: string) => void;
    onAddTemplate: (template: { id: string; name: string }) => void;
    onAddForm: (form: { id: string; name: string }) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onAddWidget("paragraph")}>
        add-widget
      </button>
      <button type="button" onClick={() => onAddTemplate({ id: "tpl-1", name: "Template" })}>
        add-template
      </button>
      <button type="button" onClick={() => onAddForm({ id: "form-1", name: "Form" })}>
        add-form
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockList", () => ({
  BlockList: ({
    onSelect,
    onDuplicate,
    onDelete,
  }: {
    onSelect: (id: string) => void;
    onDuplicate: (id: string) => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSelect("block-2")}>
        select-page-block
      </button>
      <button type="button" onClick={() => onDuplicate("block-2")}>
        duplicate-page-block
      </button>
      <button type="button" onClick={() => onDelete("block-2")}>
        delete-page-block
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({
    onChange,
  }: {
    onChange: (block: Record<string, unknown>) => void;
  }) => (
    <button type="button" onClick={() => onChange({ id: "block-1", type: "hero", data: { title: "Updated" } })}>
      change-block
    </button>
  ),
}));

vi.mock("../../../core/admin/ui/pages/PageRevisionDrawer", () => ({
  PageRevisionDrawer: ({
    open,
    onRestore,
    onDiscard,
  }: {
    open: boolean;
    onRestore: (id: string) => void;
    onDiscard: (id: string) => void;
  }) => (
    <div>
      <span>{`revisions:${open ? "open" : "closed"}`}</span>
      <button type="button" onClick={() => onRestore("rev-1")}>
        restore-page-revision
      </button>
      <button type="button" onClick={() => onDiscard("rev-1")}>
        discard-page-revision
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/PageSettingsDrawer", () => ({
  PageSettingsDrawer: ({
    open,
    onSave,
    onAutosave,
  }: {
    open: boolean;
    onSave: (payload: Record<string, unknown>) => Promise<boolean>;
    onAutosave: (payload: Record<string, unknown>) => Promise<void>;
  }) => (
    <div>
      <span>{`settings:${open ? "open" : "closed"}`}</span>
      <button
        type="button"
        onClick={() =>
          void onSave({
            title: "Updated page",
            slug: "/updated",
            settings: {
              template: "landing",
              showInNav: false,
              layout: pageEditorState.page.currentData.settings.layout,
              revisionRetention: 5,
            },
          })
        }
      >
        save-page-settings
      </button>
      <button
        type="button"
        onClick={() =>
          void onAutosave({
            title: "Autosave page",
            slug: "/autosave",
            settings: {
              template: "landing",
              showInNav: true,
              layout: pageEditorState.page.currentData.settings.layout,
              revisionRetention: 10,
            },
          })
        }
      >
        autosave-page-settings
      </button>
    </div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/blockUtils", () => ({
  applyWizardSelection: (block: unknown) => block,
  appendSlotBlock: (blocks: Array<Record<string, unknown>>, _parentId: string, _slotId: string, nextBlock: Record<string, unknown>) => [...blocks, nextBlock],
  createBlock: (type: string, id = `${type}-1`) => ({
    id,
    type,
    data: {},
    layout: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
      background: { color: "transparent", image: null },
    },
    visibility: { enabled: true, devices: ["desktop", "tablet", "mobile"] },
    editor: { mode: "visual", wizardCompleted: true },
  }),
  deleteBlockById: (blocks: Array<Record<string, unknown>>) => ({ deleted: true, blocks }),
  duplicateBlock: (blocks: Array<Record<string, unknown>>) => blocks,
  findBlockById: (blocks: Array<Record<string, unknown>>, id: string | null) =>
    blocks.find((block) => block.id === id) ?? null,
  getFirstBlockId: (blocks: Array<Record<string, unknown>>) => blocks[0]?.id ?? null,
  moveBlockIntoSlot: (blocks: Array<Record<string, unknown>>) => blocks,
  reorderBlocksAtPath: (blocks: Array<Record<string, unknown>>) => blocks,
  shouldWarnOnNavigate: (dirty: boolean) => dirty,
  updateBlockById: (blocks: Array<Record<string, unknown>>, id: string, updater: (block: Record<string, unknown>) => Record<string, unknown>) =>
    blocks.map((block) => (block.id === id ? updater(block) : block)),
}));

vi.mock("../../../core/admin/ui/pages/builder/widgetRegistry", () => ({
  getWidgetRegistry: () => [{ type: "hero" }],
}));

vi.mock("../../../widgets/validator", () => ({
  normalizeWidgetBlock: (block: unknown) => block,
}));

const mount = (node: React.ReactNode) => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  act(() => {
    root.render(node);
  });

  return {
    container,
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  pageEditorState.reset();
  window.history.replaceState({}, "", "/");
});

test("PageEditor drives preview, save, publish, settings, revisions, and sidebar actions", async () => {
  window.history.replaceState({}, "", "/admin/pages/page-1");

  const { PageEditor } = await import(
    "../../../core/admin/ui/pages/PageEditor"
  );

  const view = mount(<PageEditor />);

  try {
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Homepage");
    expect(view.container.textContent).toContain("device:desktop");

    const buttons = Array.from(view.container.querySelectorAll("button"));

    await act(async () => {
      buttons.find((button) => button.textContent === "add-widget")?.click();
      buttons.find((button) => button.textContent === "add-template")?.click();
      buttons.find((button) => button.textContent === "add-form")?.click();
      buttons.find((button) => button.textContent === "select-page-block")?.click();
      buttons.find((button) => button.textContent === "duplicate-page-block")?.click();
      buttons.find((button) => button.textContent === "delete-page-block")?.click();
      buttons.find((button) => button.textContent === "change-block")?.click();
      buttons.find((button) => button.textContent === "Runtime preview")?.click();
      buttons.find((button) => button.textContent === "Save draft")?.click();
      buttons.find((button) => button.textContent === "Publish")?.click();
      buttons.find((button) => button.textContent === "save-page-settings")?.click();
      buttons.find((button) => button.textContent === "autosave-page-settings")?.click();
      buttons.find((button) => button.textContent === "restore-page-revision")?.click();
      buttons.find((button) => button.textContent === "discard-page-revision")?.click();
      await Promise.resolve();
    });

    expect(pageEditorState.previewPageCalls).toContain("page-1");
    expect(pageEditorState.updatePageCalls.some((call) => "data" in call.input)).toBe(true);
    expect(pageEditorState.publishPageCalls[0]).toEqual({
      id: "page-1",
      data: expect.any(Object),
    });
    expect(pageEditorState.updatePageCalls.some((call) => call.input.title === "Updated page")).toBe(true);
    expect(pageEditorState.autosaveCalls[0]).toEqual({
      id: "page-1",
      payload: expect.objectContaining({ title: "Autosave page" }),
    });
    expect(pageEditorState.restoreRevisionCalls).toContainEqual({
      id: "page-1",
      revisionId: "rev-1",
    });
    expect(pageEditorState.discardRevisionCalls).toContainEqual({
      id: "page-1",
      revisionId: "rev-1",
    });

    await act(async () => {
      for (const subscriber of pageEditorState.subscribers) {
        subscriber({ key: "page:page-1" });
      }
      await Promise.resolve();
    });

    expect(pageEditorState.getPageCalls.length).toBeGreaterThan(1);
  } finally {
    view.cleanup();
  }
});
