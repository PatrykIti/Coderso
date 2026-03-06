import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  TabsAdvancedEditor,
  TabsVisualEditor,
  TabsWizardEditor,
} from "../../../core/admin/ui/widgets/editors/TabsEditors";
import {
  TabsBlock,
  createTabsWidget,
  normalizeTabsData,
  tabsDefaults,
  type TabsData,
} from "../../../core/widgets/core/tabs";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TabsData>> = () => null;

test("tabs renders defaults with runtime marker", () => {
  const html = renderToString(
    <TabsBlock data={tabsDefaults} variant="pills" />
  );

  expect(html).toContain('data-nextless-tabs="1"');
  expect(html).toContain('data-nextless-tabs-variant="pills"');
  expect(html).toContain("Add widgets to this tab panel.");
  expect(html).toContain("__nextlessTabsBound");
});

test("tabs normalization keeps valid active tab and alignment", () => {
  const normalized = normalizeTabsData(
    {
      items: [
        { id: "1", label: "Overview" },
        { id: "2", label: "Specs" },
      ],
      options: {
        activeId: "2",
        alignment: "center",
      },
    },
    2
  );

  expect(normalized.options?.activeId).toBe("2");
  expect(normalized.options?.alignment).toBe("center");
});

test("tabs validator accepts schema", () => {
  clearWidgets();
  const widget = createTabsWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "tabs-1",
      type: "tabs",
      variant: "underline",
      data: {
        items: [
          { id: "1", label: "First" },
          { id: "2", label: "Second" },
        ],
        options: {
          activeId: "1",
          alignment: "start",
        },
      },
      slots: {
        "panel:1": [],
        "panel:2": [],
      },
    })
  ).not.toThrow();
});

test("tabs visual editor renders structure sections", () => {
  const html = renderToString(
    <TabsVisualEditor
      value={tabsDefaults}
      onChange={() => undefined}
      variant="pills"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Tabs Structure");
  expect(html).toContain("Layout");
});

const editors = [TabsWizardEditor, TabsAdvancedEditor];

test("tabs wizard and advanced editors render", () => {
  for (const Editor of editors) {
    const html = renderToString(
      <Editor
        value={tabsDefaults}
        onChange={() => undefined}
        variant="pills"
        onVariantChange={() => undefined}
      />
    );
    expect(html).toContain("Variant");
  }
});
