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
        width: "custom",
        customWidth: "60%",
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
      }}
      variant="label-center"
    />
  );

  expect(html).toContain('data-divider-variant="label-center"');
  expect(html).toContain('data-divider-has-label="true"');
  expect(html).toContain("Features");
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
  expect(wizardHtml).toContain("Line thickness");

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

  const advancedHtml = renderToString(
    <DividerAdvancedEditor
      value={dividerDefaults}
      onChange={() => undefined}
      variant="line"
      onVariantChange={() => undefined}
    />
  );
  expect(advancedHtml).toContain("Technical divider tokens");
  expect(advancedHtml).toContain("Raw payload snapshot");
});
