// @vitest-environment happy-dom

import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { createBlock } from "../../../core/admin/ui/pages/builder/blockUtils";
import { PageEditor } from "../../../core/admin/ui/pages/PageEditor";
import type { PageDetail, PageRevision } from "../../../core/admin/services/pagesClient";

const pageEditorState = vi.hoisted(() => {
  const state = {
    cachedPage: null as PageDetail | null,
    currentPage: null as PageDetail | null,
    revisions: [] as PageRevision[],
    getCachedPageDetail: vi.fn((id: string) =>
      state.cachedPage && state.cachedPage.id === id ? state.cachedPage : null
    ),
    getPageCached: vi.fn(async () => state.currentPage),
    getPageTemplateOptions: vi.fn(async () => ({
      themeName: "starter",
      templates: [{ key: "landing", label: "Landing" }],
    })),
    listPageRevisions: vi.fn(async () => state.revisions),
    previewPage: vi.fn(async (pageId: string) => ({
      previewUrl: `https://preview.test/${pageId}`,
    })),
    updatePage: vi.fn(async (_id: string, payload: { data?: Record<string, unknown> }) => ({
      ...(state.currentPage as PageDetail),
      currentData: payload.data ?? state.currentPage?.currentData ?? { blocks: [] },
    })),
    publishPage: vi.fn(async () => ({ ok: true })),
    autosavePage: vi.fn(async () => undefined),
    restorePageRevision: vi.fn(async () => undefined),
    discardPageRevision: vi.fn(async () => undefined),
    subscribeCacheEvents: vi.fn(() => () => undefined),
    reset() {
      state.cachedPage = null;
      state.currentPage = null;
      state.revisions = [];
      state.getCachedPageDetail.mockClear();
      state.getPageCached.mockClear();
      state.getPageTemplateOptions.mockClear();
      state.listPageRevisions.mockClear();
      state.previewPage.mockClear();
      state.updatePage.mockClear();
      state.publishPage.mockClear();
      state.autosavePage.mockClear();
      state.restorePageRevision.mockClear();
      state.discardPageRevision.mockClear();
      state.subscribeCacheEvents.mockClear();
    },
  };

  return state;
});

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertTitle: ({ children }: { children: React.ReactNode }) => <strong>{children}</strong>,
  AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    [key: string]: unknown;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    placeholder,
    ...props
  }: {
    value?: string;
    placeholder?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    [key: string]: unknown;
  }) => <input value={value} placeholder={placeholder} onChange={onChange} {...props} />,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div>{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const TabsContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({
    children,
    value,
    defaultValue,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
  }) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const resolvedValue = value ?? internalValue;
    return (
      <TabsContext.Provider
        value={{
          value: resolvedValue,
          onValueChange: (nextValue) => {
            setInternalValue(nextValue);
            onValueChange?.(nextValue);
          },
        }}
      >
        <div>{children}</div>
      </TabsContext.Provider>
    );
  },
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => {
    const context = React.useContext(TabsContext);
    return (
      <button type="button" onClick={() => context.onValueChange?.(value)}>
        {children}
      </button>
    );
  },
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => {
    const context = React.useContext(TabsContext);
    return context.value === value ? <div>{children}</div> : null;
  },
}));

vi.mock("@/services/apiClient", () => ({
  isApiClientError: () => false,
}));

vi.mock("@/services/cachePolicy", () => ({
  cacheKeys: {
    pageDetail: (id: string) => `page-detail:${id}`,
  },
  cacheTtlMs: {
    list: 300_000,
    detail: 300_000,
  },
}));

vi.mock("@/services/pagesClient", () => ({
  autosavePage: pageEditorState.autosavePage,
  discardPageRevision: pageEditorState.discardPageRevision,
  getCachedPageDetail: pageEditorState.getCachedPageDetail,
  getPageCached: pageEditorState.getPageCached,
  getPageTemplateOptions: pageEditorState.getPageTemplateOptions,
  listPageRevisions: pageEditorState.listPageRevisions,
  previewPage: pageEditorState.previewPage,
  publishPage: pageEditorState.publishPage,
  restorePageRevision: pageEditorState.restorePageRevision,
  updatePage: pageEditorState.updatePage,
}));

vi.mock("@/ui/layouts/EditorShell", () => ({
  EditorShell: ({
    leftPanel,
    rightPanel,
    children,
  }: {
    leftPanel?: React.ReactNode;
    rightPanel?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{leftPanel}</div>
      <div>{rightPanel}</div>
      <div>{children}</div>
    </div>
  ),
}));

vi.mock("@/utils/cacheBus", () => ({
  subscribeCacheEvents: pageEditorState.subscribeCacheEvents,
}));

vi.mock("@/ui/pages/DeviceSwitcher", () => ({
  DeviceSwitcher: () => <div>device-switcher</div>,
}));

vi.mock("@/ui/preview/RuntimePreviewDialog", () => ({
  RuntimePreviewDialog: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageSettingsDrawer", () => ({
  PageSettingsDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/PageRevisionDrawer", () => ({
  PageRevisionDrawer: () => null,
}));

vi.mock("../../../core/admin/ui/pages/builder/BlockSettings", () => ({
  BlockSettings: ({ block }: { block?: { id: string } | null }) => (
    <div>{`settings:${block?.id ?? "none"}`}</div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/FormPicker", () => ({
  FormPicker: () => <div>forms-tab</div>,
}));

vi.mock("../../../core/admin/ui/pages/builder/TemplatePicker", () => ({
  TemplatePicker: () => <div>templates-tab</div>,
}));

vi.mock("../../../core/widgets/renderers/widgetRenderer", () => ({
  WidgetRenderer: ({ block }: { block: { id: string; type: string } }) => (
    <div data-widget-renderer={block.id}>{block.type}</div>
  ),
}));

vi.mock("../../../core/admin/ui/pages/builder/widgetRegistry", () => ({
  getWidgetRegistry: () => [
    {
      type: "hero",
      title: "Hero",
      description: "Hero content block",
      category: "layout",
      slots: [{ id: "content", label: "Hero Content" }],
    },
    {
      type: "feature-grid",
      title: "Feature Grid",
      description: "Benefits grid",
      category: "content",
    },
    {
      type: "template-section",
      title: "Template Section",
      description: "Template section",
      category: "layout",
    },
  ],
}));

vi.mock("../../../core/widgets/validator", () => ({
  normalizeWidgetBlock: <T,>(block: T) => block,
}));

vi.mock("@/ui/assistant/activeSurfaceContext", () => ({
  clearActiveAssistantSurfaceContext: () => undefined,
  setActiveAssistantSurfaceContext: () => undefined,
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const createPage = (overrides: Partial<PageDetail> = {}): PageDetail => ({
  id: "page-1",
  title: "Homepage",
  slug: "homepage",
  status: "draft",
  currentData: { blocks: [createBlock("hero")] },
  updatedAt: "2026-03-08T09:00:00.000Z",
  ...overrides,
});

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

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  pageEditorState.reset();
  pageEditorState.cachedPage = createPage();
  pageEditorState.currentPage = createPage();
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

test("PageEditor routes empty-slot CTA into the existing widget library surface and inserts into the slot", async () => {
  const view = mount(<PageEditor pageId="page-1" initialPage={pageEditorState.cachedPage} />);

  try {
    await flush();

    act(() => {
      Array.from(view.container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("Add widget to Hero Content"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await flush();

    expect(view.container.textContent).toContain("Insert into Hero Content");
    expect(view.container.textContent).toContain("Widgets");
    expect(view.container.textContent).toContain("Feature Grid");

    const featureCard = Array.from(view.container.querySelectorAll("div")).find(
      (element) =>
        element instanceof HTMLDivElement &&
        element.className.includes("rounded-lg border bg-background p-3 shadow-sm") &&
        element.textContent?.includes("Feature Grid")
    );
    act(() => {
      featureCard
        ?.querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    await flush();

    expect(view.container.textContent).not.toContain("Insert into Hero Content");
    expect(Array.from(document.querySelectorAll("[data-block-id]"))).toHaveLength(2);
    expect(view.container.textContent).toContain("Feature Grid");
  } finally {
    view.cleanup();
  }
});
