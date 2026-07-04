// @vitest-environment happy-dom

import React, { useMemo, useState } from "react";

import { createRoot } from "react-dom/client";
import { afterEach, expect, test, vi } from "vitest";

import { ScreenBlockInspector } from "../../../core/admin/ui/custom-screens/ScreenBlockInspector";
import { BlockSettings } from "../../../core/admin/ui/pages/builder/BlockSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../core/admin/components/ui/tabs";
import { getRegisteredWidget } from "../../../core/admin/ui/widgets/registry";
import type { Block, WidgetEditorContext } from "../../../core/admin/ui/pages/builder/types";
import type { CustomScreenBinding } from "../../../core/services/customScreens/customScreenSchemas";

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
