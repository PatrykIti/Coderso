import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ToggleBlockAdvancedEditor,
  ToggleBlockVisualEditor,
  ToggleBlockWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ToggleBlockEditors";
import {
  createToggleBlockWidget,
  normalizeToggleBlockData,
  ToggleBlock,
  toggleBlockDefaults,
  type ToggleBlockData,
} from "../../../core/widgets/core/toggleBlock";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ToggleBlockData>> = () => null;

test("toggle block renders defaults", () => {
  const html = renderToString(<ToggleBlock data={toggleBlockDefaults} variant="switch" />);

  expect(html).toContain('data-nextless-toggle-block="1"');
  expect(html).toContain('data-nextless-toggle-state="primary"');
  expect(html).toContain('role="radiogroup"');
  expect(html).toContain('role="radio"');
  expect(html).toContain('aria-controls="toggle-pane-primary"');
  expect(html).toContain('aria-controls="toggle-pane-secondary"');
  expect(html).toContain('aria-labelledby="toggle-trigger-primary"');
  expect(html).toContain('aria-labelledby="toggle-trigger-secondary"');
  expect(html).toContain("data-nextless-toggle-status");
  expect(html).toContain("Add widgets for the primary view.");
  expect(html).toContain("__nextlessToggleBlockBound");
});

test("toggle block normalization applies defaults", () => {
  const normalized = normalizeToggleBlockData({
    labels: {
      primary: "Summary",
      secondary: "Details",
    },
    options: {
      defaultState: "secondary",
    },
  });

  expect(normalized.options?.defaultState).toBe("secondary");
  expect(normalized.labels?.primary).toBe("Summary");
  expect(normalized.labels?.secondary).toBe("Details");
});

test("toggle block validator accepts schema", () => {
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
        },
        options: {
          defaultState: "primary",
        },
      },
      slots: {
        primary: [],
        secondary: [],
      },
    })
  ).not.toThrow();
});

test("toggle block cleared surface omits background style", () => {
  const normalized = normalizeToggleBlockData({
    ...toggleBlockDefaults,
    style: {},
  });
  const html = renderToString(<ToggleBlock data={normalized} variant="switch" />);

  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(html).toContain('data-nextless-toggle-block="1"');
  expect(html).not.toContain("background-color:");
});

test("toggle block visual editor renders key sections", () => {
  const html = renderToString(
    <ToggleBlockVisualEditor
      value={toggleBlockDefaults}
      onChange={() => undefined}
      variant="switch"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Labels");
  expect(html).toContain("Behavior and Style");
  expect(html).toContain('data-widget-editor-section="toggle-block.labels"');
  expect(html).toContain('data-widget-editor-section="toggle-block.behavior-style"');
});

const editors = [ToggleBlockWizardEditor, ToggleBlockAdvancedEditor];

test("toggle block wizard and advanced editors render", () => {
  for (const Editor of editors) {
    const html = renderToString(
      <Editor
        value={toggleBlockDefaults}
        onChange={() => undefined}
        variant="switch"
        onVariantChange={() => undefined}
      />
    );
    expect(html).toContain("Variant");
  }
});
