import React from "react";
import type { ComponentType } from "react";
import { afterEach, expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import { richTextHtmlToPlainText } from "../../../core/widgets/core/richTextSection";
import {
  createTemplateSectionWidget,
  TemplateSectionBlock,
  templateSectionDefaults,
  type TemplateSectionData,
} from "../../../core/widgets/core/templateSection";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";

import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetDefinition, WidgetEditorProps } from "../../../core/widgets/types";

afterEach(() => {
  clearWidgets();
});

const StubEditor: ComponentType<WidgetEditorProps<TemplateSectionData>> = () => null;
const StubChildEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;
const validTemplateId = "11111111-1111-4111-8111-111111111111";

const dummyWidget: WidgetDefinition<Record<string, unknown>> = {
  type: "dummy",
  title: "Dummy",
  description: "Test widget",
  category: "layout",
  complexity: "composite",
  audience: "beginner",
  module: "content",
  variants: [{ id: "default", label: "Default" }],
  schema: { type: "object", additionalProperties: true },
  defaults: {},
  editor: {
    wizard: StubChildEditor,
    visual: StubChildEditor,
    advanced: StubChildEditor,
  },
  render: () => <div data-dummy="true" />,
};

test("template section renders placeholder when empty", () => {
  const html = renderToString(
    <TemplateSectionBlock data={templateSectionDefaults} variant="default" />
  );

  expect(html).toContain("Template section");
  expect(html).toContain("Select a widget template");
  expect(html).toContain('data-template-section-resolution="not_selected"');
});

test("template section placeholder does not expose raw template ids", () => {
  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: "tpl_01HT_RAW_IDENTIFIER",
        templateName: "tpl_01HT_RAW_IDENTIFIER",
        resolved: {
          error: "template_missing",
        },
      }}
      variant="default"
    />
  );
  const visibleText = richTextHtmlToPlainText(html);

  expect(html).toContain("Template section");
  expect(html).toContain("Template not found. Pick another template.");
  expect(html).toContain('data-template-section-resolution="template_missing"');
  expect(html).not.toContain("tpl_01HT_RAW_IDENTIFIER");
  expect(visibleText).not.toContain("tpl_01HT_RAW_IDENTIFIER");
});

test("template section selected admin placeholder reports unresolved preview state", () => {
  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Draft template",
        metadata: {
          category: "Marketing",
          version: "v2",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="preview_unresolved"');
  expect(html).toContain('data-template-section-category="Marketing"');
  expect(html).toContain('data-template-section-version="v2"');
  expect(html).toContain("Marketing / v2");
  expect(html).toContain("Admin preview is placeholder-only until runtime resolves this template.");
});

test("template section renders resolved blocks", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget(dummyWidget);

  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Hero Cluster",
        metadata: {
          category: "Marketing",
          previewLabel: "Homepage Hero",
          version: "v2",
        },
        resolved: {
          blocks: [{ id: "dummy-1", type: "dummy", variant: "default", data: {} }],
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="ready"');
  expect(html).toContain('data-template-section-resolution="ready"');
  expect(html).toContain('data-template-section-category="Marketing"');
  expect(html).toContain('data-template-section-version="v2"');
  expect(html).toContain("Homepage Hero");
  expect(html).toContain('data-dummy="true"');
});

test("template section renders safe placeholder when resolution has an error", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget(dummyWidget);

  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Draft Hero Cluster",
        resolved: {
          error: "template_unpublished",
          blocks: [{ id: "dummy-1", type: "dummy", variant: "default", data: {} }],
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="template_unpublished"');
  expect(html).toContain("Template is not published yet.");
  expect(html).not.toContain('data-dummy="true"');
});

test("template section reports template loop placeholders", () => {
  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Looped Hero Cluster",
        resolved: {
          error: "template_loop",
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="template_loop"');
  expect(html).toContain("Template loop detected. Remove nested template sections.");
});

test("template section reports resolved empty templates separately from unresolved preview", () => {
  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Empty Hero Cluster",
        resolved: {
          blocks: [],
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="template_empty"');
  expect(html).toContain("This template has no blocks yet.");
});

test("template section renders safe placeholder when a missing template carries stale blocks", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget(dummyWidget);

  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Missing Hero Cluster",
        resolved: {
          error: "template_missing",
          blocks: [{ id: "dummy-1", type: "dummy", variant: "default", data: {} }],
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="template_missing"');
  expect(html).toContain("Template not found. Pick another template.");
  expect(html).not.toContain('data-dummy="true"');
});

test("template section propagates nested loop placeholders to the parent marker", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: validTemplateId,
        templateName: "Looped template",
        resolved: {
          blocks: [
            {
              id: "nested-loop",
              type: "template-section",
              variant: "default",
              data: {
                templateId: validTemplateId,
                resolved: {
                  error: "template_loop",
                },
              },
            },
          ],
        },
      }}
      variant="default"
    />
  );

  expect(html).toContain('data-template-section-state="empty"');
  expect(html).toContain('data-template-section-resolution="template_loop"');
  expect(html).toContain("Template loop detected. Remove nested template sections.");
  expect(html).not.toContain('data-template-section-state="ready"');
});

test("template section schema accepts runtime payload", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "template-section-1",
      type: "template-section",
      variant: "default",
      data: {
        templateId: validTemplateId,
        templateName: "Hero Cluster",
        metadata: {
          category: "Marketing",
          previewLabel: "Homepage Hero",
          version: "v2",
        },
        resolved: {
          blocks: [],
        },
      },
    })
  ).not.toThrow();
});

test("template section schema rejects non-UUID template ids before persistence", () => {
  clearWidgets();
  registerWidget(
    createTemplateSectionWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "template-section-invalid-id",
      type: "template-section",
      variant: "default",
      data: {
        templateId: "missing-template-31-05",
      },
    })
  ).toThrow("widget_schema_invalid");
});

test("template section declares a valid editor ownership contract", () => {
  const definition = createTemplateSectionWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  const validation = validateWidgetEditorContract(definition, { requireContract: true });

  expect(validation.valid).toBe(true);
  expect(validation.errors).toEqual([]);
  expect(definition.editorContract?.sections.map((section) => section.id)).toEqual([
    "template-section.wizard.template-setup",
    "template-section.visual.active-template",
    "template-section.visual.presentation-fields",
    "template-section.advanced.template-diagnostics",
    "template-section.advanced.runtime-payload",
    "template-section.advanced.runtime-rules",
  ]);
});
