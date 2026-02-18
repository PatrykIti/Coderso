import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  FormEmbedAdvancedEditor,
  FormEmbedVisualEditor,
  FormEmbedWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FormEmbedEditors";
import {
  FormEmbedBlock,
  createFormEmbedWidget,
  formEmbedDefaults,
  normalizeFormEmbedData,
  type FormEmbedData,
} from "../../../core/widgets/core/formEmbed";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<FormEmbedData>> = () => null;

test("form embed renders defaults", () => {
  const html = renderToString(
    <FormEmbedBlock data={formEmbedDefaults} variant="standard" />
  );

  expect(html).toContain('data-form-embed-variant="standard"');
  expect(html).toContain("Form");
});

test("form embed normalization resolves layout defaults", () => {
  const normalized = normalizeFormEmbedData({});
  expect(normalized.layout?.width).toBe("md");
  expect(normalized.layout?.alignment).toBe("start");
  expect(normalized.fields?.showLabels).toBe(true);
});

test("form embed normalization sanitizes invalid enum values", () => {
  const normalized = normalizeFormEmbedData({
    layout: {
      alignment: "invalid" as never,
      width: "invalid" as never,
      spacing: "invalid" as never,
      buttonAlignment: "invalid" as never,
    },
    style: {
      borderWidth: "invalid" as never,
      radius: "invalid" as never,
      inputSize: "invalid" as never,
    },
  });
  expect(normalized.layout?.alignment).toBe("start");
  expect(normalized.layout?.width).toBe("md");
  expect(normalized.layout?.spacing).toBe("md");
  expect(normalized.layout?.buttonAlignment).toBe("start");
  expect(normalized.style?.borderWidth).toBe("1");
  expect(normalized.style?.radius).toBe("md");
  expect(normalized.style?.inputSize).toBe("md");
});

test("form embed falls back to resolved success message", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Support",
          successMessage: "We received your request.",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain("We received your request.");
});

test("form embed renders submission nonce when resolved", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Support",
          submissionNonce: "nonce-value",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('name="__nl_form_nonce"');
  expect(html).toContain('value="nonce-value"');
});

test("form embed renders multi-step runtime structure", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Intake",
          settings: {
            layoutMode: "multi_step",
            saveProgress: true,
            stepTitles: ["Contact", "Details"],
          },
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
              settings: { step: 1 },
            },
            {
              id: "field-2",
              type: "textarea",
              label: "Issue",
              name: "issue",
              required: true,
              settings: { step: 2 },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('data-form-layout-mode="multi_step"');
  expect(html).toContain('data-form-save-progress="1"');
  expect(html).toContain('data-nextless-form-step="1"');
  expect(html).toContain("Contact");
  expect(html).toContain("Details");
});

test("form embed injects runtime script when fields exist", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Support",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain("__nextlessFormRuntimeClient");
});

test("form embed validator accepts schema", () => {
  clearWidgets();
  const widget = createFormEmbedWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "form-embed-1",
      type: "form-embed",
      variant: "standard",
      data: {
        formId: "form-123",
        title: "Support",
        description: "Get help",
        submitLabel: "Send",
        layout: { width: "lg", alignment: "center" },
        fields: { showLabels: true },
      },
    })
  ).not.toThrow();
});

test("form embed editors render core sections", () => {
  const html = renderToString(
    <FormEmbedVisualEditor
      value={formEmbedDefaults}
      onChange={() => undefined}
      variant="standard"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Form selection");
  expect(html).toContain("Content");
  expect(html).toContain("Layout");
});

const editors = [FormEmbedWizardEditor, FormEmbedAdvancedEditor];

test("form embed wizard/advanced editors render", () => {
  for (const Editor of editors) {
    const html = renderToString(
      <Editor
        value={formEmbedDefaults}
        onChange={() => undefined}
        variant="standard"
        onVariantChange={() => undefined}
      />
    );
    expect(html).toContain("Form selection");
  }
});
