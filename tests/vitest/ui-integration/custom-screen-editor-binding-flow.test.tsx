// @vitest-environment happy-dom

import React, { useMemo, useState } from "react";

import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import * as assistantSurface from "../../../core/admin/ui/assistant/activeSurfaceContext";
import * as contentTypesClient from "../../../core/admin/services/contentTypesClient";
import * as customScreensClient from "../../../core/admin/services/customScreensClient";
import * as entriesClient from "../../../core/admin/services/entriesClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import type { CustomScreenRecord } from "../../../core/admin/services/customScreensClient";
import { CustomScreenEditorPage } from "../../../core/admin/ui/custom-screens/CustomScreenEditorPage";
import { ScreenBlockInspector } from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import { AdminRouterProvider } from "../../../core/admin/ui/contexts/AdminRouterContext";
import { broadcastCacheEvent } from "../../../core/admin/utils/cacheBus";
import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../core/admin/components/ui/tabs";
import { getRegisteredWidget } from "../../../core/admin/ui/widgets/registry";
import type { Block, WidgetEditorContext } from "../../../core/admin/ui/pages/builder/types";
import type { CustomScreenBinding } from "../../../core/services/customScreens/customScreenSchemas";

vi.mock("@/services/solutionKitsClient", () => ({
  getCachedSolutionKits: vi.fn(() => []),
  listSolutionKitsCached: vi.fn(async () => []),
}));

vi.mock("@/services/solutionKitSelection", () => ({
  getActiveSolutionKitId: vi.fn(() => null),
  subscribeActiveSolutionKitId: vi.fn(() => () => undefined),
  buildAdvancedFeatureFlagsForSolutionKit: vi.fn(() => ({})),
}));

// Keep the real Screen authoring surface mounted. The hidden test control only exposes
// the production-owned callback so the semantic no-op branch (clearing an already
// absent binding) can be exercised after the visible clear affordance disappears.
vi.mock("@/ui/custom-screens/ScreenAuthoringCanvas", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../../../core/admin/ui/custom-screens/ScreenAuthoringCanvas")
    >();
  const react = await import("react");
  type Props = Parameters<typeof actual.ScreenAuthoringCanvas>[0];

  const ScreenAuthoringCanvasWithBindingProbe = (props: Props) =>
    react.createElement(
      react.Fragment,
      null,
      react.createElement(
        "button",
        {
          type: "button",
          hidden: true,
          "data-test-clear-absent-button-binding": "true",
          onClick: () => props.onPatchBinding("button-1", "href", { field: "" }),
        },
        "Clear absent Button binding"
      ),
      react.createElement(actual.ScreenAuthoringCanvas, props)
    );

  return {
    ...actual,
    ScreenAuthoringCanvas: ScreenAuthoringCanvasWithBindingProbe,
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const headerBlock: Block = {
  id: "header-1",
  type: "screen-record-header",
  variant: "card",
  editor: { mode: "visual", wizardCompleted: true },
  data: {
    title: "Untitled project",
    subtitle: "Overview",
    description: "Preview details",
    badge: "Draft",
  },
};

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

function Harness() {
  const [activeInspectorTab, setActiveInspectorTab] = useState<"screen" | "data" | "widget">(
    "widget"
  );
  // TASK-496-02: the standalone FieldBindingPanel (and its focusedPropPath wiring)
  // is retired; the binding surface is covered by custom-screen-binding-panel.test
  // through ScreenBlockInspector. This harness now only asserts that the BlockSettings
  // widget tab exposes no legacy binding jump controls for retired screen widgets.
  const [, setFocusedBindingPropPath] = useState<string | null>(null);
  const [block, setBlock] = useState<Block>(headerBlock);
  const [bindings] = useState<CustomScreenBinding[]>([
    {
      id: "binding-title",
      widgetId: "header-1",
      propPath: "title",
      field: "projectTitle",
      mode: "read",
    },
  ]);
  const widget = getRegisteredWidget(block.type);

  const editorContext = useMemo<WidgetEditorContext>(
    () => ({
      surface: "admin-editor-view",
      jumpToBindingPropPath: (propPath: string) => {
        setActiveInspectorTab("data");
        setFocusedBindingPropPath(propPath);
      },
      getBindingState: (propPath: string) =>
        bindings.some((binding) => binding.widgetId === block.id && binding.propPath === propPath)
          ? "bound"
          : "literal",
    }),
    [bindings, block.id]
  );

  return (
    <Tabs
      value={activeInspectorTab}
      onValueChange={(next) => setActiveInspectorTab(next as "screen" | "data" | "widget")}
    >
      <TabsList variant="line">
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="widget">Selected Widget</TabsTrigger>
      </TabsList>
      <TabsContent value="widget">
        <BlockSettings
          block={block}
          widget={widget ?? undefined}
          onChange={setBlock}
          editorContext={editorContext}
        />
      </TabsContent>
    </Tabs>
  );
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

test("retired screen widgets do not expose legacy binding jump controls", () => {
  const view = mount(<Harness />);

  try {
    const titleDataButton = view.container.querySelector('button[data-binding-prop-path="title"]');
    expect(titleDataButton).toBeNull();
  } finally {
    view.cleanup();
  }
});

test("ScreenBlockInspector renders the flat inline Layout group in place of the retired Background row", () => {
  const onPatchBlock = vi.fn();
  const view = mount(
    <ScreenBlockInspector
      selectedBlock={{
        id: "field-1",
        type: "field",
        variant: "compact",
        data: { label: "Title" },
      }}
      bindings={[]}
      fields={[]}
      panel="all"
      showBlockActions={false}
      onPatchBlock={onPatchBlock}
      onPatchBlockData={vi.fn()}
      onPatchBinding={vi.fn()}
      onMove={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
    />
  );

  try {
    // TASK-503-03 (parent decision 1): the dead free-text "Background"
    // (block.variant) row is REMOVED — the renderer never read block.variant.
    // The block-level Layout group (Width/Align/Min height/Margin/Padding) is
    // edited INLINE (no dialog) and replaces it. The `variant` key still
    // round-trips through the schema; only the dead control is gone.
    expect(view.container.textContent).not.toContain("Background");
    expect(document.body.querySelector("[data-screen-style-dialog]")).toBeNull();
    expect(view.container.textContent).not.toContain("Open style controls");

    const layoutGroup = view.container.querySelector("[data-screen-layout-group]");
    expect(layoutGroup).not.toBeNull();
    // the retired variant free-text Input (placeholder="Default") is gone
    expect(view.container.querySelector('input[placeholder="Default"]')).toBeNull();
  } finally {
    view.cleanup();
  }
});

const editorContentType = {
  id: "type-projects",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      urlA: { type: "string" as const, title: "Primary URL", xFieldType: "text" },
      urlB: { type: "string" as const, title: "Secondary URL", xFieldType: "text" },
      title: { type: "string" as const, title: "Title", xFieldType: "text" },
    },
  },
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
};

const unrelatedBinding = {
  id: "field-1-value",
  blockId: "field-1",
  propPath: "value",
  source: "entry" as const,
  field: "title",
  mode: "readwrite" as const,
};

const createEditorScreen = (): CustomScreenRecord => ({
  id: "screen-binding-flow",
  name: "Binding flow Screen",
  contentTypeId: editorContentType.id,
  status: "active",
  collectionRole: null,
  compositionKey: null,
  showInSidebar: false,
  sidebarLabel: null,
  schemaVersion: 4,
  definition: {
    schemaVersion: 4,
    listView: {
      columns: [],
      filters: [],
      defaultSort: { field: "updatedAt", direction: "desc" },
      bulkActions: { delete: true, publish: true, unpublish: true },
    },
    editorView: {
      saveMode: "entry",
      interactionMode: "inline",
      document: {
        schemaVersion: 1,
        sections: [
          {
            id: "section-1",
            type: "section",
            label: "Details",
            data: { title: "Details" },
            blocks: [
              {
                id: "button-1",
                type: "button",
                data: {
                  label: "Call to action",
                  action: "link",
                  href: "/static-target",
                },
              },
              {
                id: "field-1",
                type: "field",
                data: { label: "Title", field: "title" },
              },
            ],
          },
        ],
      },
      bindings: [unrelatedBinding],
    },
  },
  blocks: [],
  bindings: [],
  createdAt: "2026-07-14T00:00:00.000Z",
  updatedAt: "2026-07-14T00:00:00.000Z",
});

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
};

const deferred = <T,>(): Deferred<T> => {
  let resolve!: Deferred<T>["resolve"];
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
};

const flushEditor = async () => {
  await React.act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
};

const clickEditorElement = (element: Element | null) => {
  expect(element).not.toBeNull();
  React.act(() => {
    element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const selectBoundField = (container: ParentNode, optionText: string) => {
  const trigger = container.querySelector<HTMLElement>('[data-screen-bound-field="true"]');
  expect(trigger).not.toBeNull();
  React.act(() => {
    trigger?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  });
  const option = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]')).find(
    (item) => item.textContent?.includes(optionText)
  );
  expect(option).toBeTruthy();
  React.act(() => {
    option?.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, button: 0 }));
    option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

const findEditorButton = (container: ParentNode, text: string) =>
  Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === text
  ) ?? null;

const mountEditor = () => {
  const path = "/admin/advanced/custom-screens/screen-binding-flow";
  window.history.replaceState({}, "", path);
  return mount(
    <AdminRouterProvider initialPath={path}>
      <CustomScreenEditorPage />
    </AdminRouterProvider>
  );
};

describe("CustomScreenEditorPage Button href binding flow", () => {
  let screen: CustomScreenRecord;
  let loadQueue: Array<Promise<CustomScreenRecord | null>>;
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let updateSpy: ReturnType<typeof vi.spyOn>;
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    screen = createEditorScreen();
    loadQueue = [];
    vi.spyOn(contentTypesClient, "getCachedContentTypes").mockReturnValue([editorContentType]);
    vi.spyOn(contentTypesClient, "listContentTypesCached").mockResolvedValue([editorContentType]);
    vi.spyOn(entriesClient, "getCachedEntries").mockReturnValue([]);
    vi.spyOn(entriesClient, "listEntriesCached").mockResolvedValue([]);
    vi.spyOn(assistantSurface, "setActiveAssistantSurfaceContext").mockImplementation(
      () => undefined
    );
    vi.spyOn(assistantSurface, "clearActiveAssistantSurfaceContext").mockImplementation(
      () => undefined
    );
    vi.spyOn(customScreensClient, "getCachedCustomScreen").mockImplementation((id) =>
      id === screen.id ? screen : null
    );
    loadSpy = vi
      .spyOn(customScreensClient, "getCustomScreenCached")
      .mockImplementation(async (id) => {
        const queued = loadQueue.shift();
        return queued ? await queued : id === screen.id ? screen : null;
      });
    createSpy = vi.spyOn(customScreensClient, "createCustomScreen");
    updateSpy = vi
      .spyOn(customScreensClient, "updateCustomScreen")
      .mockImplementation(async (_id, payload) => {
        screen = {
          ...screen,
          ...payload,
          definition: payload.definition ?? screen.definition,
          sidebarLabel: payload.sidebarLabel ?? null,
          updatedAt: "2026-07-14T01:00:00.000Z",
        };
        return screen;
      });
  });

  test("binds, updates, clears, and rebinds Button href without changing its static link or unrelated bindings", async () => {
    const view = mountEditor();
    try {
      await flushEditor();
      expect(view.container.innerHTML).toContain('data-screen-block-id="button-1"');
      clickEditorElement(view.container.querySelector('[data-screen-block-id="button-1"]'));
      await flushEditor();

      const staticLink = () =>
        view.container.querySelector<HTMLInputElement>('input[placeholder="https://…"]');
      expect(staticLink()?.value).toBe("/static-target");
      expect(view.container.textContent).not.toContain("Use static link");

      selectBoundField(view.container, "Primary URL");
      await flushEditor();
      expect(view.container.textContent).toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(staticLink()?.value).toBe("/static-target");

      clickEditorElement(findEditorButton(view.container, "Save"));
      await flushEditor();
      expect(createSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledTimes(1);
      const firstPayload = updateSpy.mock.calls[0]?.[1];
      expect(updateSpy.mock.calls[0]?.[0]).toBe("screen-binding-flow");
      expect(firstPayload?.definition.editorView.bindings).toEqual([
        unrelatedBinding,
        {
          id: "button-1-href",
          blockId: "button-1",
          propPath: "href",
          source: "entry",
          field: "urlA",
          mode: "read",
        },
      ]);
      expect(firstPayload?.definition.editorView.document.sections[0]?.blocks[0]?.data.href).toBe(
        "/static-target"
      );
      expect(JSON.stringify(firstPayload?.definition)).not.toContain('"field":""');
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(view.container.textContent).toContain("Use static link");

      selectBoundField(view.container, "Secondary URL");
      await flushEditor();
      expect(view.container.textContent).toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(staticLink()?.value).toBe("/static-target");

      clickEditorElement(findEditorButton(view.container, "Save"));
      await flushEditor();
      expect(updateSpy).toHaveBeenCalledTimes(2);
      const secondPayload = updateSpy.mock.calls[1]?.[1];
      expect(updateSpy.mock.calls[1]?.[0]).toBe("screen-binding-flow");
      expect(secondPayload?.definition.editorView.bindings).toEqual([
        unrelatedBinding,
        {
          id: "button-1-href",
          blockId: "button-1",
          propPath: "href",
          source: "entry",
          field: "urlB",
          mode: "read",
        },
      ]);
      expect(secondPayload?.definition.editorView.document.sections[0]?.blocks[0]?.data.href).toBe(
        "/static-target"
      );
      expect(JSON.stringify(secondPayload?.definition)).not.toContain('"field":""');
      expect(view.container.textContent).not.toContain("Unsaved changes");

      const savedWithSecondaryBinding = screen;
      const staleHydration = deferred<CustomScreenRecord | null>();
      loadQueue.push(staleHydration.promise);
      React.act(() => {
        broadcastCacheEvent({
          key: cacheKeys.customScreenDetail("screen-binding-flow"),
          action: "update",
        });
      });
      await flushEditor();
      expect(loadSpy).toHaveBeenCalledTimes(2);

      // Clear through the visible Button affordance from an exact clean baseline.
      clickEditorElement(findEditorButton(view.container, "Use static link"));
      await flushEditor();
      expect(view.container.textContent).not.toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(staticLink()?.value).toBe("/static-target");

      // The refresh began while the saved Secondary binding was authoritative. Its late
      // result must not restore that binding over the newer local clear.
      staleHydration.resolve(savedWithSecondaryBinding);
      await flushEditor();
      expect(view.container.textContent).not.toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(staticLink()?.value).toBe("/static-target");

      // The tokenless cache event represents an independent writer, so the late read leaves
      // unresolved external authority. Confirming Refresh discards the local clear, restores
      // the persisted Secondary binding, and resolves authority through a fresh forced read.
      const authoritativeRefresh = deferred<CustomScreenRecord | null>();
      loadQueue.push(authoritativeRefresh.promise);
      clickEditorElement(findEditorButton(view.container, "Refresh"));
      await flushEditor();
      expect(document.body.textContent).toContain("Discard local Screen changes and refresh?");
      clickEditorElement(findEditorButton(document, "Discard and refresh"));
      await flushEditor();
      authoritativeRefresh.resolve(savedWithSecondaryBinding);
      await flushEditor();
      expect(view.container.textContent).toContain("Use static link");
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(view.container.textContent).not.toContain("Newer changes are available");

      // Re-apply the intended clear against the now-authoritative baseline.
      clickEditorElement(findEditorButton(view.container, "Use static link"));
      await flushEditor();
      expect(view.container.textContent).not.toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");

      clickEditorElement(findEditorButton(view.container, "Save"));
      await flushEditor();
      expect(updateSpy).toHaveBeenCalledTimes(3);
      const thirdPayload = updateSpy.mock.calls[2]?.[1];
      expect(updateSpy.mock.calls[2]?.[0]).toBe("screen-binding-flow");
      expect(thirdPayload?.definition.editorView.bindings).toEqual([unrelatedBinding]);
      expect(thirdPayload?.definition.editorView.document.sections[0]?.blocks[0]?.data.href).toBe(
        "/static-target"
      );
      expect(JSON.stringify(thirdPayload?.definition)).not.toContain('"field":""');
      expect(view.container.textContent).not.toContain("Unsaved changes");

      // The visible affordance is now gone. Invoke the same production callback once
      // more through the wrapper probe: clearing an absent binding must be a true no-op.
      clickEditorElement(
        view.container.querySelector('[data-test-clear-absent-button-binding="true"]')
      );
      await flushEditor();
      expect(view.container.textContent).not.toContain("Unsaved changes");
      expect(updateSpy).toHaveBeenCalledTimes(3);
      expect(staticLink()?.value).toBe("/static-target");

      selectBoundField(view.container, "Primary URL");
      await flushEditor();
      expect(view.container.textContent).toContain("Use static link");
      expect(view.container.textContent).toContain("Unsaved changes");
      expect(staticLink()?.value).toBe("/static-target");

      clickEditorElement(findEditorButton(view.container, "Save"));
      await flushEditor();
      expect(updateSpy).toHaveBeenCalledTimes(4);
      const fourthPayload = updateSpy.mock.calls[3]?.[1];
      expect(updateSpy.mock.calls[3]?.[0]).toBe("screen-binding-flow");
      expect(fourthPayload?.definition.editorView.bindings).toEqual([
        unrelatedBinding,
        {
          id: "button-1-href",
          blockId: "button-1",
          propPath: "href",
          source: "entry",
          field: "urlA",
          mode: "read",
        },
      ]);
      expect(fourthPayload?.definition.editorView.document.sections[0]?.blocks[0]?.data.href).toBe(
        "/static-target"
      );
      expect(JSON.stringify(fourthPayload?.definition)).not.toContain('"field":""');
      expect(view.container.textContent).not.toContain("Unsaved changes");
    } finally {
      view.cleanup();
    }
  });
});
