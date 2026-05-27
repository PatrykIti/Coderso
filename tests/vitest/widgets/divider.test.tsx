import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  DividerAdvancedEditor,
  DividerVisualEditor,
  DividerWizardEditor,
} from "../../../core/admin/ui/widgets/editors/DividerEditors";
import {
  createDividerWidget,
  DividerBlock,
  dividerDefaults,
  normalizeDividerData,
  resolveDividerVariant,
  type DividerData,
} from "../../../core/widgets/core/divider";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubDividerEditor: ComponentType<WidgetEditorProps<DividerData>> = () => null;

test("divider renders defaults", () => {
  const html = renderToString(<DividerBlock data={dividerDefaults} variant="line" />);

  expect(html).toContain('data-divider="true"');
  expect(html).toContain('data-divider-variant="line"');
  expect(html).toContain('data-divider-thickness="1"');
  expect(html).toContain('data-divider-width-mode="full"');
  expect(html).toContain('role="separator"');
});

test("divider normalization keeps deterministic defaults", () => {
  const normalized = normalizeDividerData({
    label: "  Group  ",
    thickness: 99,
    width: "custom",
    customWidth: "abc",
    marginTop: "bad",
    marginBottom: "16",
  });

  expect(normalized.label).toBe("  Group  ");
  expect(normalized.thickness).toBe(8);
  expect(normalized.width).toBe("custom");
  expect(normalized.customWidth).toBe("320px");
  expect(normalized.marginTop).toBe("6");
  expect(normalized.marginBottom).toBe("16");
  expect(resolveDividerVariant("unknown")).toBe("line");
});

test("divider normalization expands label and layout defaults without breaking legacy payloads", () => {
  const normalized = normalizeDividerData({
    labelColor: "#0f172a",
    labelSize: "sm",
    labelWeight: "bold",
    labelTransform: "none",
    labelLetterSpacing: "normal",
    labelGap: "6",
    containerWidth: "lg",
    align: "right",
    lineStyle: "dotted",
    opacity: "50",
    dashPattern: "wide",
    visibility: "spacer-only",
    customWidth: "320",
  });

  expect(normalized.labelColor).toBe("#0f172a");
  expect(normalized.labelSize).toBe("sm");
  expect(normalized.labelWeight).toBe("bold");
  expect(normalized.labelTransform).toBe("none");
  expect(normalized.labelLetterSpacing).toBe("normal");
  expect(normalized.labelGap).toBe("6");
  expect(normalized.containerWidth).toBe("lg");
  expect(normalized.align).toBe("right");
  expect(normalized.lineStyle).toBe("dotted");
  expect(normalized.opacity).toBe("50");
  expect(normalized.dashPattern).toBe("wide");
  expect(normalized.visibility).toBe("spacer-only");
  expect(normalized.customWidth).toBe("320px");
});

test("divider validator accepts expanded model", () => {
  clearWidgets();
  const widget = createDividerWidget({
    wizard: StubDividerEditor,
    visual: StubDividerEditor,
    advanced: StubDividerEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "divider-1",
      type: "divider",
      variant: "label-center",
      data: {
        label: "Features",
        thickness: 2,
        color: "#cbd5e1",
        labelColor: "#0f172a",
        labelSize: "sm",
        labelWeight: "semibold",
        labelTransform: "none",
        labelLetterSpacing: "normal",
        labelGap: "4",
        width: "custom",
        customWidth: "60%",
        align: "right",
        lineStyle: "dashed",
        opacity: "75",
        dashPattern: "wide",
        marginTop: "8",
        marginBottom: "12",
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("divider validator rejects invalid variant", () => {
  clearWidgets();
  registerWidget(
    createDividerWidget({
      wizard: StubDividerEditor,
      visual: StubDividerEditor,
      advanced: StubDividerEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "divider-2",
      type: "divider",
      variant: "bad",
      data: dividerDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("divider label-center variant renders label marker and text", () => {
  const html = renderToString(
    <DividerBlock
      data={{
        ...dividerDefaults,
        label: "Features",
        labelColor: "#0f172a",
        labelSize: "sm",
        labelWeight: "bold",
        labelTransform: "none",
        labelLetterSpacing: "normal",
        labelGap: "6",
        width: "container",
        containerWidth: "lg",
        align: "right",
        lineStyle: "dashed",
        opacity: "75",
        dashPattern: "short",
      }}
      variant="label-center"
    />
  );

  expect(html).toContain('data-divider-variant="label-center"');
  expect(html).toContain('data-divider-has-label="true"');
  expect(html).toContain('data-divider-color-kind="token"');
  expect(html).toContain('data-divider-width-kind="container-lg"');
  expect(html).toContain('data-divider-line-style="dashed"');
  expect(html).toContain('data-divider-visibility="line"');
  expect(html).not.toContain('data-divider-color="');
  expect(html).not.toContain('data-divider-width-resolved="');
  expect(html).toContain("whitespace-nowrap");
  expect(html).toContain("tracking-normal");
  expect(html).toContain("Features");
});

test("divider spacer-only mode keeps markers but hides visible line and label output", () => {
  const html = renderToString(
    <DividerBlock
      data={{
        ...dividerDefaults,
        label: "Hidden label",
        visibility: "spacer-only",
      }}
      variant="label-center"
    />
  );

  expect(html).toContain('data-divider-visibility="spacer-only"');
  expect(html).toContain('data-divider-has-label="false"');
  expect(html).not.toContain('role="separator"');
  expect(html).not.toContain("Hidden label");
});

test("divider editors render expected sections", () => {
  const wizardHtml = renderToString(
    <DividerWizardEditor
      value={dividerDefaults}
      onChange={() => undefined}
      variant="line"
      onVariantChange={() => undefined}
    />
  );
  expect(wizardHtml).toContain("Divider style");
  expect(wizardHtml).toContain(
    "Visual owns divider style changes, center labels, line weight, color, width, and spacing."
  );
  expect(wizardHtml).toContain('data-widget-control-path="variant"');
  expect(wizardHtml).toContain('data-widget-control-readonly="true"');
  expect(wizardHtml).not.toContain("Optional label");
  expect(wizardHtml).not.toContain("<select");

  const visualHtml = renderToString(
    <DividerVisualEditor
      value={dividerDefaults}
      onChange={() => undefined}
      variant="line"
      onVariantChange={() => undefined}
    />
  );
  expect(visualHtml).toContain("Variant and label");
  expect(visualHtml).toContain("Line style and width");
  expect(visualHtml).toContain("Spacing around divider");
  expect(visualHtml).toContain("Live divider preview");
  expect(visualHtml).toContain('data-widget-control-path="thickness"');
  expect(visualHtml).toContain('data-widget-control-path="marginTop"');

  const advancedHtml = renderToString(
    <DividerAdvancedEditor
      value={dividerDefaults}
      onChange={() => undefined}
      variant="line"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Runtime divider summary");
  expect(advancedHtml).toContain("Support summary");
  expect(advancedHtml).toContain('data-widget-editor-section="divider.advanced.computed-summary"');
  expect(advancedHtml).toContain('data-widget-editor-section="divider.advanced.support-summary"');
  expect(advancedHtml).toContain('data-widget-control-readonly="true"');
  expect(advancedHtml).not.toContain("<pre");
  expect(advancedHtml).not.toContain("Raw payload");
  expect(advancedHtml).not.toContain('data-widget-control-ownership="writable"');
});
