import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
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
  const html = renderToString(<FormEmbedBlock data={formEmbedDefaults} variant="standard" />);

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
  expect(html).toContain('data-form-progress-ttl-days="7"');
  expect(html).toContain('data-form-success-behavior="show-message-hide-form"');
  expect(html).toContain('data-nextless-form-step="1"');
  expect(html).toContain("Contact");
  expect(html).toContain("Details");
});

test("form embed renders accessible field wiring and unsupported-field diagnostics", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Accessible Form",
          fields: [
            {
              id: "field-name",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
              settings: {
                helper: "Tell us your name",
              },
            },
            {
              id: "field-consent",
              type: "checkbox",
              label: "Consent",
              name: "consent",
              required: true,
              settings: {
                helper: "Required to continue",
                style: {
                  labelPosition: "inline",
                },
              },
            },
            {
              id: "field-legacy-number",
              type: "number",
              label: "Legacy number",
              name: "legacyNumber",
              required: false,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('aria-required="true"');
  expect(html).toContain("aria-describedby=");
  expect(html).toContain('data-form-field-unsupported="number"');
  expect(html).toContain("Unsupported form field type:");
  expect(html).toContain(">number<");
});

test("form embed renders alert regions and captcha bridge attrs when runtime metadata is available", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Protected Form",
          submissionAccess: "public",
          submissionNonce: "nonce-1",
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-1",
            action: "public_write",
          },
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

  expect(html).toContain('data-form-captcha-site-key="site-key-1"');
  expect(html).toContain('name="captchaToken"');
  expect(html).toContain('role="alert"');
  expect(html).toContain('aria-live="polite"');
  expect(html).toContain('aria-live="assertive"');
});

test("form embed renders supported radio fields instead of the unsupported diagnostic", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Survey",
          fields: [
            {
              id: "field-1",
              type: "radio",
              label: "Preferred contact",
              name: "contact_method",
              required: true,
              settings: {
                options: ["Email", "Phone"],
                defaultValue: "Email",
              },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('type="radio"');
  expect(html).toContain('value="Email"');
  expect(html).toContain('value="Phone"');
  expect(html).not.toContain("Unsupported form field type:");
});

test("form embed applies field style and logic runtime attributes", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Styled Form",
          fields: [
            {
              id: "field-category",
              type: "text",
              label: "Category",
              name: "category",
              required: false,
            },
            {
              id: "field-details",
              type: "text",
              label: "Details",
              name: "details",
              required: true,
              settings: {
                style: {
                  width: "half",
                  labelPosition: "hidden",
                },
                logic: {
                  operator: "equals",
                  field: "category",
                  value: "support",
                },
              },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain("md:col-span-1");
  expect(html).toContain('data-form-field="details"');
  expect(html).toContain('data-logic-operator="equals"');
  expect(html).toContain('data-logic-field="category"');
  expect(html).toContain('data-logic-value="support"');
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

test("form embed shows runtime-preview hint when runtime data is not hydrated", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
      }}
      variant="standard"
    />
  );

  expect(html).toContain("Form fields load in runtime preview.");
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

test("form embed cleared background and surface omit frame background styles", () => {
  const normalized = normalizeFormEmbedData({
    ...formEmbedDefaults,
    style: {},
  });
  const html = renderToString(<FormEmbedBlock data={normalized} variant="standard" />);

  expect(normalized.style?.background).toBeUndefined();
  expect(normalized.style?.surface).toBeUndefined();
  expect(html).toContain('data-form-embed-variant="standard"');
  expect(html).not.toContain("background-color:transparent");
});

test("form embed validator accepts resolved runtime payload", () => {
  clearWidgets();
  const widget = createFormEmbedWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "form-embed-runtime",
      type: "form-embed",
      variant: "standard",
      data: {
        formId: "form-123",
        resolved: {
          formName: "Contact",
          description: "Reach us",
          status: "published",
          successMessage: "Done",
          submissionAccess: "public",
          submissionNonce: "nonce-1",
          settings: {
            layoutMode: "single",
            saveProgress: false,
            stepTitles: ["Contact"],
            preset: "custom",
            automationRetry: {
              enabled: false,
              maxAttempts: 1,
              baseDelayMs: 300,
              maxDelayMs: 2000,
            },
          },
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
              settings: {
                placeholder: "Your name",
                legacyKey: "kept",
              },
            },
          ],
        },
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
  expect(html).toContain("Layout");
  expect(html).toContain("Style");
  expect(html).toContain("Submit behavior");
});

test("form embed wizard editor renders content flow sections", () => {
  const html = renderToString(
    <FormEmbedWizardEditor
      value={formEmbedDefaults}
      onChange={() => undefined}
      variant="standard"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Form selection");
  expect(html).toContain("Content");
  expect(html).toContain("Field labels");
});

test("form embed advanced editor renders diagnostics sections", () => {
  const html = renderToString(
    <FormEmbedAdvancedEditor
      value={formEmbedDefaults}
      onChange={() => undefined}
      variant="standard"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Form selection");
  expect(html).toContain("Diagnostics");
  expect(html).toContain("Normalized payload snapshot");
});
