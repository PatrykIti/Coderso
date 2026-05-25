import React from "react";
import type { ComponentType } from "react";
import { afterEach, expect, test } from "vitest";
import { renderToString } from "react-dom/server";

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
});

test("template section placeholder does not expose raw template ids", () => {
  const html = renderToString(
    <TemplateSectionBlock
      data={{
        templateId: "tpl_01HT_RAW_IDENTIFIER",
        resolved: {
          error: "template_missing",
        },
      }}
      variant="default"
    />
  );
  const visibleText = html.replace(/<[^>]*>/g, "");

  expect(html).toContain("Template section");
  expect(html).toContain("Template not found. Pick another template.");
  expect(visibleText).not.toContain("tpl_01HT_RAW_IDENTIFIER");
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
        templateId: "template-1",
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
        templateId: "template-1",
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
  expect(html).toContain("Template is not published yet.");
  expect(html).not.toContain('data-dummy="true"');
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
        templateId: "template-1",
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
  expect(html).toContain("Template not found. Pick another template.");
  expect(html).not.toContain('data-dummy="true"');
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
        templateId: "template-1",
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
