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
  const html = renderToString(<TabsBlock data={tabsDefaults} variant="pills" />);

  expect(html).toContain('data-coderso-tabs="1"');
  expect(html).toContain('data-coderso-tabs-variant="pills"');
  expect(html).toContain('data-coderso-tabs-orientation="horizontal"');
  expect(html).toContain('role="tablist"');
  expect(html).toContain('role="tabpanel"');
  expect(html).toContain('aria-controls="tabs-1-panel-1"');
  expect(html).toContain('aria-labelledby="tabs-1-trigger-1"');
  expect(html).not.toContain("Add widgets to this tab panel.");
  expect(html).toContain("codersoTabsBound");
});

test("tabs normalization keeps valid default tab, alignment, and orientation", () => {
  const normalized = normalizeTabsData(
    {
      items: [
        { id: "1", label: "Overview" },
        { id: "2", label: "Specs" },
      ],
      options: {
        defaultItemId: "2",
        activeId: "2",
        alignment: "center",
        orientation: "vertical",
      },
    },
    2
  );

  expect(normalized.options?.defaultItemId).toBe("2");
  expect(normalized.options?.activeId).toBe("2");
  expect(normalized.options?.alignment).toBe("center");
  expect(normalized.options?.orientation).toBe("vertical");
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
          defaultItemId: "1",
          activeId: "1",
          alignment: "start",
          orientation: "vertical",
        },
      },
      slots: {
        "panel:1": [],
        "panel:2": [],
      },
    })
  ).not.toThrow();
});

test("tabs cleared surfaces omit tab and panel background styles", () => {
  const normalized = normalizeTabsData(
    {
      ...tabsDefaults,
      style: {},
    },
    tabsDefaults.items?.length ?? 0
  );
  const html = renderToString(<TabsBlock data={normalized} variant="pills" />);

  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(normalized.style?.activeBackgroundColor).toBeUndefined();
  expect(normalized.style?.panelBackgroundColor).toBeUndefined();
  expect(html).toContain('data-coderso-tabs-variant="pills"');
  expect(html).not.toContain("background-color:");
});

test("tabs render editor placeholders only in preview contexts", () => {
  const publicHtml = renderToString(<TabsBlock data={tabsDefaults} variant="pills" />);
  const previewHtml = renderToString(
    <TabsBlock data={tabsDefaults} variant="pills" renderContext={{ mode: "editor-preview" }} />
  );

  expect(publicHtml).not.toContain("Add widgets to this tab panel.");
  expect(previewHtml).toContain("Add widgets to this tab panel.");
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
  expect(html).toContain('data-widget-editor-section="tabs.structure"');
  expect(html).toContain('data-widget-editor-section="tabs.layout"');
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
