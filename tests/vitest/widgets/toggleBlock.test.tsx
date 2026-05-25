import React from "react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createToggleBlockWidget,
  normalizeToggleBlockData,
  resetToggleBlockData,
  ToggleBlock,
  toggleBlockDefaults,
  type ToggleBlockData,
} from "../../../core/widgets/core/toggleBlock";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { createWidgetRuntimeScriptRegistry } from "../../../core/widgets/runtimeScripts";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ToggleBlockData>> = () => null;

test("toggle block reset helper returns normalized defaults", () => {
  expect(resetToggleBlockData()).toEqual({
    labels: {
      primary: "View A",
      secondary: "View B",
      helper: "Switch between two content views.",
      ariaLabel: "Toggle content view",
      selectedSuffix: "selected",
    },
    options: {
      defaultState: "primary",
      motion: "none",
    },
    style: {
      panes: {
        primary: {
          surface: "default",
          padding: "comfortable",
          radius: "md",
          borderEmphasis: "subtle",
        },
        secondary: {
          surface: "default",
          padding: "comfortable",
          radius: "md",
          borderEmphasis: "subtle",
        },
      },
    },
  });
});

test("toggle block normalization applies bounded defaults and independent pane fallback", () => {
  const normalized = normalizeToggleBlockData({
    labels: {
      primary: " Summary ",
      secondary: "Details",
      helper: "",
      ariaLabel: "",
      selectedSuffix: "",
    },
    options: {
      defaultState: "secondary",
      motion: "spin" as never,
    },
    style: {
      surfaceColor: "   ",
      borderColor: " #1f2937 ",
      accentColor: " #0f172a ",
      accentContrastColor: "",
      panes: {
        primary: {
          surface: "contrast",
          padding: "spacious",
          radius: "lg",
          borderEmphasis: "strong",
        },
        secondary: {
          surface: "invalid" as never,
          padding: "compact",
          radius: "broken" as never,
          borderEmphasis: "unknown" as never,
        },
      },
    },
  });

  expect(normalized).toEqual({
    labels: {
      primary: "Summary",
      secondary: "Details",
      helper: "",
      ariaLabel: "Toggle content view",
      selectedSuffix: "selected",
    },
    options: {
      defaultState: "secondary",
      motion: "none",
    },
    style: {
      borderColor: "#1f2937",
      accentColor: "#0f172a",
      panes: {
        primary: {
          surface: "contrast",
          padding: "spacious",
          radius: "lg",
          borderEmphasis: "strong",
        },
        secondary: {
          surface: "default",
          padding: "compact",
          radius: "md",
          borderEmphasis: "subtle",
        },
      },
    },
  });
});

test("toggle block renders defaults with accessible labels and motion markers", () => {
  const html = renderToString(
    <ToggleBlock data={toggleBlockDefaults} variant="switch" blockId="toggle-default" />
  );

  expect(html).toContain('data-coderso-toggle-block="1"');
  expect(html).toContain('data-coderso-toggle-variant="switch"');
  expect(html).toContain('data-coderso-toggle-motion="none"');
  expect(html).toContain('aria-label="Toggle content view"');
  expect(html).toContain('aria-controls="toggle-block-toggle-default-pane-primary"');
  expect(html).toContain('aria-labelledby="toggle-block-toggle-default-trigger-primary"');
  expect(html).toContain("data-coderso-toggle-status");
  expect(html).toContain("View A selected");
  expect(html).toContain('data-coderso-toggle-selected-suffix="selected"');
  expect(html).toContain("--nextless-toggle-accent:var(--color-text)");
  expect(html).toContain("--nextless-toggle-accent-contrast:var(--color-background)");
  expect(html).toContain("codersoToggleBound");
});

test("toggle block registers shared runtime scripts when a page-scoped collector is available", () => {
  const runtimeScripts = createWidgetRuntimeScriptRegistry();
  const renderContext = { mode: "public" as const, runtimeScripts };
  const html = renderToString(
    <>
      <ToggleBlock
        data={toggleBlockDefaults}
        variant="switch"
        blockId="toggle-one"
        renderContext={renderContext}
      />
      <ToggleBlock
        data={toggleBlockDefaults}
        variant="cards"
        blockId="toggle-two"
        renderContext={renderContext}
      />
    </>
  );
  const scriptsHtml = renderToString(<>{runtimeScripts.renderScripts()}</>);

  expect(html).not.toContain('data-coderso-runtime-script="toggle-block"');
  expect(html).not.toContain("codersoToggleBound");
  expect(scriptsHtml.match(/data-coderso-runtime-script="toggle-block"/g)).toHaveLength(1);
  expect(scriptsHtml).toContain("codersoToggleBound");
});

test("toggle block cards variant renders accent contrast, motion classes, and pane tokens", () => {
  const html = renderToString(
    <ToggleBlock
      blockId="toggle-cards"
      variant="cards"
      data={{
        labels: {
          primary: "Overview",
          secondary: "Details",
          helper: "",
          ariaLabel: "Wybierz widok",
          selectedSuffix: "aktywny",
        },
        options: {
          defaultState: "secondary",
          motion: "slide",
        },
        style: {
          surfaceColor: "#f8fafc",
          borderColor: "#cbd5e1",
          accentColor: "#0f172a",
          accentContrastColor: "#ffffff",
          panes: {
            primary: {
              surface: "soft",
              padding: "compact",
              radius: "sm",
              borderEmphasis: "subtle",
            },
            secondary: {
              surface: "contrast",
              padding: "spacious",
              radius: "lg",
              borderEmphasis: "strong",
            },
          },
        },
      }}
    />
  );

  expect(html).toContain('data-coderso-toggle-variant="cards"');
  expect(html).toContain('data-coderso-toggle-state="secondary"');
  expect(html).toContain('data-coderso-toggle-motion="slide"');
  expect(html).toContain('aria-label="Wybierz widok"');
  expect(html).toContain("Details aktywny");
  expect(html).toContain("--nextless-toggle-accent-contrast:#ffffff");
  expect(html).toContain("motion-safe:slide-in-from-bottom-2");
  expect(html).toContain("Primary pane");
  expect(html).toContain("Secondary pane");
  expect(html).toContain("grid grid-cols-1 gap-3 sm:grid-cols-2");
  expect(html).toContain("bg-[var(--color-surface)]");
  expect(html).toContain("p-6");
  expect(html).toContain("rounded-xl");
  expect(html).toContain("shadow-sm");
});

test("toggle block editor-preview placeholders use pane labels and stay out of public runtime", () => {
  const data: ToggleBlockData = {
    labels: {
      primary: "Summary",
      secondary: "Specs",
      helper: "",
    },
  };

  const publicHtml = renderToString(<ToggleBlock data={data} variant="switch" blockId="public" />);
  const previewHtml = renderToString(
    <ToggleBlock
      data={data}
      variant="switch"
      blockId="preview"
      renderContext={{ mode: "editor-preview" }}
    />
  );

  expect(publicHtml).not.toContain("Use the page builder to add widgets");
  expect(previewHtml).toContain("Use the page builder to add widgets to the summary pane.");
  expect(previewHtml).toContain("Use the page builder to add widgets to the specs pane.");
  expect(previewHtml).not.toContain("codersoToggleBound");
});

test("toggle block validator accepts expanded task-292 schema", () => {
  clearWidgets();
  const widget = createToggleBlockWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "toggle-1",
      type: "toggle-block",
      variant: "cards",
      data: {
        labels: {
          primary: "Overview",
          secondary: "Specs",
          ariaLabel: "Choose pane",
          selectedSuffix: "active",
        },
        options: {
          defaultState: "secondary",
          motion: "fade",
        },
        style: {
          accentContrastColor: "#ffffff",
          panes: {
            primary: {
              surface: "soft",
              padding: "compact",
              radius: "sm",
              borderEmphasis: "subtle",
            },
            secondary: {
              surface: "contrast",
              padding: "spacious",
              radius: "lg",
              borderEmphasis: "strong",
            },
          },
        },
      },
      slots: {
        primary: [],
        secondary: [],
      },
    })
  ).not.toThrow();
});
