// @vitest-environment happy-dom

import React, { useMemo, useState } from "react";

import { createRoot } from "react-dom/client";
import { afterEach, expect, test } from "vitest";

import { FieldBindingPanel } from "../../../core/admin/ui/custom-screens/FieldBindingPanel";
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
  const [focusedBindingPropPath, setFocusedBindingPropPath] = useState<string | null>(null);
  const [block, setBlock] = useState<Block>(headerBlock);
  const [bindings, setBindings] = useState<CustomScreenBinding[]>([
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
      <TabsContent value="data">
        <FieldBindingPanel
          selectedBlock={block}
          selectedWidget={widget ?? null}
          selectedWidgetSource="screen-registry"
          value={bindings}
          fields={[
            {
              id: "field-project-title",
              name: "projectTitle",
              type: "text",
              label: "Project title",
            },
          ]}
          focusedPropPath={focusedBindingPropPath}
          onFocusedPropPathChange={setFocusedBindingPropPath}
          onChange={setBindings}
        />
      </TabsContent>
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

test("jump to binding switches into the Data tab and focuses the matching prop path", () => {
  const view = mount(<Harness />);

  try {
    const titleDataButton = view.container.querySelector('button[data-binding-prop-path="title"]');
    expect(titleDataButton).not.toBeNull();

    React.act(() => {
      titleDataButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const dataTabTrigger = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Data")
    );
    expect(dataTabTrigger?.getAttribute("data-state")).toBe("active");
    expect(
      view.container.querySelector('[data-prop-path="title"][data-focused="true"]')
    ).not.toBeNull();
  } finally {
    view.cleanup();
  }
});
