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
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { createWidgetRuntimeScriptRegistry } from "../../../core/widgets/runtimeScripts";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<TabsData>> = () => null;

test("tabs renders defaults with runtime marker", () => {
  const html = renderToString(<TabsBlock data={tabsDefaults} variant="pills" />);

  expect(html).toContain('data-coderso-tabs="1"');
  expect(html).toContain('data-coderso-tabs-variant="pills"');
  expect(html).toContain('data-coderso-tabs-orientation="horizontal"');
  expect(html).toContain('data-coderso-tabs-motion="none"');
  expect(html).toContain('data-coderso-tabs-overflow="wrap"');
  expect(html).toContain('role="tablist"');
  expect(html).toContain('aria-label="Content tabs"');
  expect(html).toContain('role="tabpanel"');
  expect(html).toMatch(/role="tabpanel"[^>]*tabindex="0"/);
  expect(html).toContain('aria-controls="tabs-1-panel-1"');
  expect(html).toContain('aria-labelledby="tabs-1-trigger-1"');
  expect(html).not.toContain("Add widgets to this tab panel.");
  expect(html).toContain("codersoTabsBound");
  expect(html).toContain('type="text/javascript"');
});

test("tabs register shared runtime scripts when a page-scoped collector is available", () => {
  const runtimeScripts = createWidgetRuntimeScriptRegistry();
  const renderContext = { mode: "public" as const, runtimeScripts };
  const html = renderToString(
    <>
      <TabsBlock data={tabsDefaults} variant="pills" renderContext={renderContext} />
      <TabsBlock data={tabsDefaults} variant="underline" renderContext={renderContext} />
    </>
  );
  const scriptsHtml = renderToString(<>{runtimeScripts.renderScripts()}</>);

  expect(html).not.toContain('data-coderso-runtime-script="tabs"');
  expect(html).not.toContain("codersoTabsBound");
  expect(scriptsHtml.match(/data-coderso-runtime-script="tabs"/g)).toHaveLength(1);
  expect(scriptsHtml).toContain("codersoTabsBound");
  expect(scriptsHtml).toContain('type="text/javascript"');
});

test("tabs normalization migrates legacy descriptions, keeps disabled tabs out of activation, and resolves extended options", () => {
  const normalized = normalizeTabsData(
    {
      items: [
        { id: "overview", label: "Overview", description: "Primary overview.", disabled: true },
        {
          id: "details",
          label: "Details",
          triggerDescription: "Deep dive",
          icon: "⭐",
          disabled: true,
        },
      ],
      options: {
        defaultItemId: "details",
        activeId: "details",
        alignment: "center",
        orientation: "vertical",
        triggerOverflow: "scroll",
        containerPadding: "lg",
        triggerGap: "sm",
        panelGap: "lg",
        triggerTextSize: "base",
        triggerFontWeight: "semibold",
        motion: "slide",
      },
    },
    2
  );

  expect(normalized.items?.[0]).toEqual(
    expect.objectContaining({
      id: "overview",
      label: "Overview",
      panelIntro: "Primary overview.",
      disabled: false,
    })
  );
  expect(normalized.items?.[1]).toEqual(
    expect.objectContaining({
      id: "details",
      label: "Details",
      triggerDescription: "Deep dive",
      icon: "⭐",
      disabled: true,
    })
  );
  expect(normalized.options).toEqual(
    expect.objectContaining({
      defaultItemId: "overview",
      activeId: "overview",
      alignment: "center",
      orientation: "vertical",
      triggerOverflow: "scroll",
      containerPadding: "lg",
      triggerGap: "sm",
      panelGap: "lg",
      triggerTextSize: "base",
      triggerFontWeight: "semibold",
      motion: "slide",
    })
  );
});

test("tabs normalization preserves a saved disabled default while activating the first enabled tab", () => {
  const normalized = normalizeTabsData(
    {
      items: [
        { id: "overview", label: "Overview" },
        { id: "details", label: "Details", disabled: true },
      ],
      options: {
        defaultItemId: "details",
        activeId: "details",
      },
    },
    2
  );

  expect(normalized.options).toEqual(
    expect.objectContaining({
      defaultItemId: "details",
      activeId: "overview",
    })
  );
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
          { id: "overview", label: "Overview", panelIntro: "Primary overview." },
          {
            id: "details",
            label: "Details",
            triggerDescription: "Deep dive",
            icon: "⭐",
            disabled: true,
          },
        ],
        options: {
          defaultItemId: "overview",
          activeId: "overview",
          alignment: "start",
          orientation: "vertical",
          triggerOverflow: "scroll",
          containerPadding: "lg",
          triggerGap: "sm",
          panelGap: "lg",
          triggerTextSize: "base",
          triggerFontWeight: "semibold",
          motion: "slide",
        },
      },
      slots: {
        "panel:1": [],
        "panel:2": [],
      },
    })
  ).not.toThrow();
});

test("tabs preserve slot order when numeric custom ids overlap repeatable slot ids", () => {
  const html = renderToString(
    <TabsBlock
      data={normalizeTabsData(
        {
          items: [
            { id: "2", label: "Overview", panelIntro: "First slot intro." },
            { id: "1", label: "Details", panelIntro: "Second slot intro." },
          ],
          options: {
            defaultItemId: "2",
            activeId: "2",
          },
        },
        2
      )}
      variant="pills"
      slots={{
        "panel:1": [{ id: "slot-one-block", type: "stub", data: {} }],
        "panel:2": [{ id: "slot-two-block", type: "stub", data: {} }],
      }}
      renderBlock={(block) => <div>{block.id}</div>}
    />
  );

  expect(html).toContain('data-coderso-tabs-active-id="2"');
  expect(html).toMatch(
    /role="tabpanel"[^>]*data-coderso-tabs-id="2"[\s\S]*?First slot intro\.[\s\S]*?slot-one-block/
  );
  expect(html).toMatch(
    /role="tabpanel"[^>]*data-coderso-tabs-id="1"[\s\S]*?Second slot intro\.[\s\S]*?slot-two-block/
  );
  expect(html).toMatch(/role="tabpanel"[^>]*tabindex="0"/);
});

test("tabs render metadata, disabled tabs, and extended style options", () => {
  const html = renderToString(
    <TabsBlock
      data={normalizeTabsData(
        {
          items: [
            {
              id: "overview",
              label: "Overview",
              triggerDescription: "Start here",
              icon: "⭐",
            },
            { id: "details", label: "Details", panelIntro: "Deep dive." },
            { id: "faq", label: "FAQ", disabled: true },
          ],
          options: {
            defaultItemId: "details",
            activeId: "details",
            triggerOverflow: "scroll",
            motion: "slide",
          },
          style: {
            ...tabsDefaults.style,
            activeBackgroundColor: "#111827",
          },
        },
        3
      )}
      variant="underline"
      slots={{
        "panel:1": [],
        "panel:2": [],
        "panel:3": [],
      }}
    />
  );

  expect(html).toContain('data-coderso-tabs-active-id="details"');
  expect(html).toContain('data-coderso-tabs-motion="slide"');
  expect(html).toContain('data-coderso-tabs-overflow="scroll"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain("Start here");
  expect(html).toContain("⭐");
  expect(html).toContain("Deep dive.");
  expect(html).toContain("overflow-x-auto");
  expect(html).toContain("motion-safe:animate-in");
  expect(html).toContain("motion-reduce:animate-none");
});

test("tabs render vertical alignment classes for vertical layouts", () => {
  const html = renderToString(
    <TabsBlock
      data={normalizeTabsData(
        {
          ...tabsDefaults,
          options: {
            ...tabsDefaults.options,
            alignment: "end",
            orientation: "vertical",
          },
        },
        tabsDefaults.items?.length ?? 0
      )}
      variant="minimal"
      slots={{
        "panel:1": [],
        "panel:2": [],
      }}
    />
  );

  expect(html).toContain('aria-orientation="vertical"');
  expect(html).toContain("items-end");
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
  expect(previewHtml).not.toContain("codersoTabsBound");
});

test("tabs visual editor renders task-288 sections", () => {
  const html = renderToString(
    <TabsVisualEditor
      value={tabsDefaults}
      onChange={() => undefined}
      variant="pills"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Tab content");
  expect(html).toContain("Layout");
  expect(html).toContain("Trigger style");
  expect(html).toContain("Colors");
  expect(html).toContain("Trigger subtitle");
  expect(html).toContain('data-widget-editor-section="tabs.visual.variant"');
  expect(html).toContain('data-widget-editor-section="tabs.visual.item-content"');
  expect(html).toContain('data-widget-editor-section="tabs.visual.layout"');
  expect(html).toContain('data-widget-editor-section="tabs.visual.trigger-style"');
  expect(html).toContain('data-widget-editor-section="tabs.visual.colors"');
});

test("tabs wizard and advanced editors render v2 ownership surfaces", () => {
  const wizardHtml = renderToString(
    <TabsWizardEditor
      value={tabsDefaults}
      onChange={() => undefined}
      variant="pills"
      onVariantChange={() => undefined}
    />
  );
  const advancedHtml = renderToString(
    <TabsAdvancedEditor
      value={tabsDefaults}
      onChange={() => undefined}
      variant="pills"
      onVariantChange={() => undefined}
    />
  );

  expect(wizardHtml).toContain("Starter tabs");
  expect(wizardHtml).toContain("Panel intro text");
  expect(wizardHtml).toContain("Visual owns daily label edits");
  expect(wizardHtml).not.toContain("Variant");
  expect(wizardHtml).not.toContain("Layout");
  expect(wizardHtml).not.toContain("Trigger subtitle");
  expect(advancedHtml).toContain("Runtime diagnostics");
  expect(advancedHtml).toContain("Technical ids");
  expect(advancedHtml).toContain("Runtime payload");
  expect(advancedHtml).toContain("Contract summary");
  expect(advancedHtml).not.toContain("Variant");
  expect(advancedHtml).not.toContain("Trigger subtitle");
  expect(advancedHtml).not.toContain('data-widget-control-ownership="writable"');
});

test("tabs ships a strict v2 editor contract", () => {
  const widget = createTabsWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(validation).toEqual(
    expect.objectContaining({
      valid: true,
      errors: [],
    })
  );
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual(
    expect.arrayContaining([
      "tabs.wizard.structure-setup",
      "tabs.visual.variant",
      "tabs.visual.item-content",
      "tabs.visual.layout",
      "tabs.visual.trigger-style",
      "tabs.visual.colors",
      "tabs.advanced.runtime-diagnostics",
      "tabs.advanced.technical-ids",
      "tabs.advanced.runtime-payload",
      "tabs.advanced.contract-summary",
    ])
  );
});
