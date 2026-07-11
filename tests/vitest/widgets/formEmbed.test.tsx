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
  clampSavedProgressTtl,
  FormEmbedBlock,
  createFormEmbedWidget,
  formEmbedDefaults,
  formEmbedEditorContract,
  normalizeFormEmbedData,
  resolveFormEmbedRuntimeErrorMessage,
  type FormEmbedData,
} from "../../../core/widgets/core/formEmbed";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<FormEmbedData>> = () => null;

const getOpeningTagByAttribute = (
  html: string,
  tagName: string,
  attribute: string,
  value: string
) => {
  const match = html.match(new RegExp(`<${tagName}\\b(?=[^>]*${attribute}="${value}")[^>]*>`));
  if (!match) {
    throw new Error(`Missing <${tagName}> with ${attribute}="${value}"`);
  }
  return match[0];
};

const getAttributeValue = (tag: string, attribute: string) => {
  const match = tag.match(new RegExp(`${attribute}="([^"]*)"`));
  return match?.[1];
};

const countClassToken = (className: string | undefined, token: string) =>
  (className ?? "").split(/\s+/).filter((entry) => entry === token).length;

const replaceRuntimeScriptPayload = (html: string) => {
  const openingTag = "<script>";
  const closingTag = "</script>";
  const openingIndex = html.indexOf(openingTag);
  const payloadStart = openingIndex + openingTag.length;
  const closingIndex = html.indexOf(closingTag, payloadStart);

  if (
    openingIndex < 0 ||
    closingIndex < 0 ||
    html.indexOf(openingTag, payloadStart) >= 0 ||
    html.indexOf(closingTag, closingIndex + closingTag.length) >= 0
  ) {
    throw new Error("Expected exactly one inline form runtime script");
  }

  return `${html.slice(0, payloadStart)}__FORM_RUNTIME_SCRIPT__${html.slice(closingIndex)}`;
};

const nonFileStructuralHtmlBaseline = `<section class="mx-auto flex w-full flex-col px-4 py-8" style="background-color:transparent" aria-labelledby="_R_0_-title" data-form-embed-variant="standard" data-form-embed-spacing="md"><div class="flex w-full flex-col max-w-lg items-start text-left" data-form-embed-width="md"><div class="w-full space-y-6 p-6 border rounded-lg" style="background-color:var(--color-bg);border-color:var(--color-border)" data-form-embed-radius="md" data-form-embed-input-size="md"><div class="space-y-2"><h2 id="_R_0_-title" class="text-xl font-semibold" style="color:var(--color-text)">Contact us</h2><p class="text-sm" style="color:var(--color-text)">Tell us what you need.</p></div><form class="space-y-4" data-form-id="baseline-form" data-nextless-form-runtime="1" data-form-layout-mode="single" data-form-save-progress="0" data-form-success-message="Thanks for your submission." data-form-success-behavior="show-message-hide-form" data-form-loading-label="Sending..." data-form-submit-label="Send message" data-form-progress-ttl-days="7" data-form-captcha-site-key="" data-form-captcha-action="" data-form-root="true" action="/forms/baseline-form/submissions" method="post"><input type="hidden" data-form-security-nonce="1" name="__nl_form_nonce" value="baseline-nonce"/><div data-form-embed-form-body="true" class="space-y-4"><div class="grid md:grid-cols-2 gap-6"><div class="md:col-span-2" data-form-field="name"><div class="space-y-2"><label id="_R_0_-name-field-label" for="_R_0_-name-field" class="text-xs font-semibold uppercase tracking-wide" style="color:var(--color-text)">Name<!-- --> *</label><input id="_R_0_-name-field" type="text" required="" aria-required="true" aria-labelledby="_R_0_-name-field-label" aria-describedby="_R_0_-name-field-helper" data-required-original="1" placeholder="Ada" class="w-full border bg-transparent px-3 py-2.5 text-sm border rounded-lg" style="border-color:var(--color-border)" name="name"/><p id="_R_0_-name-field-helper" class="text-xs" style="color:var(--color-text)">Your full name</p></div></div><div class="md:col-span-2" data-form-field="topic"><div class="space-y-2"><label id="_R_0_-topic-field-label" for="_R_0_-topic-field" class="text-xs font-semibold uppercase tracking-wide" style="color:var(--color-text)">Topic</label><select id="_R_0_-topic-field" name="topic" aria-labelledby="_R_0_-topic-field-label" data-required-original="0" class="w-full border bg-transparent px-3 py-2.5 text-sm border rounded-lg" style="border-color:var(--color-border)"><option value="">Select an option</option><option value="Support">Support</option><option value="Sales">Sales</option></select></div></div><div class="md:col-span-2" data-form-field="consent"><div class="space-y-2"><label id="_R_0_-consent-field-label" for="_R_0_-consent-field" class="text-xs font-semibold uppercase tracking-wide" style="color:var(--color-text)">I agree</label><div class="flex items-center gap-2 text-sm text-[var(--color-text)]"><input id="_R_0_-consent-field" type="checkbox" aria-labelledby="_R_0_-consent-field-label" data-required-original="0" class="h-4 w-4 border rounded-lg" style="border-color:var(--color-border)" name="consent" value="true"/></div></div></div></div><div class="flex justify-start"><button type="submit" data-form-submit="1" class="px-5 py-2 text-sm font-semibold rounded-lg" style="background-color:var(--color-primary);color:var(--color-bg)">Send message</button></div></div><p class="hidden text-xs text-[var(--color-text)]/65" data-form-embed-success="true" role="alert" aria-live="polite">Thanks for your submission.</p><p class="hidden text-xs text-rose-600" data-form-embed-error="true" role="alert" aria-live="assertive">Unable to submit the form. Please try again.</p></form><script>__FORM_RUNTIME_SCRIPT__</script></div></div></section>`;

test("form embed renders defaults", () => {
  const html = renderToString(<FormEmbedBlock data={formEmbedDefaults} variant="standard" />);

  expect(html).toContain('data-form-embed-variant="standard"');
  expect(html).toContain("Form");
});

test("form embed preserves the exact non-file structural render contract", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "baseline-form",
        title: "Contact us",
        description: "Tell us what you need.",
        resolved: {
          formName: "Contact",
          submissionNonce: "baseline-nonce",
          fields: [
            {
              id: "name-field",
              type: "text",
              label: "Name",
              name: "name",
              required: true,
              settings: {
                placeholder: "Ada",
                helper: "Your full name",
              },
            },
            {
              id: "topic-field",
              type: "select",
              label: "Topic",
              name: "topic",
              required: false,
              settings: { options: ["Support", "Sales"] },
            },
            {
              id: "consent-field",
              type: "checkbox",
              label: "I agree",
              name: "consent",
              required: false,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(replaceRuntimeScriptPayload(html)).toBe(nonFileStructuralHtmlBaseline);
});

test("form embed normalization resolves layout defaults", () => {
  const normalized = normalizeFormEmbedData({});
  expect(normalized.layout?.width).toBe("md");
  expect(normalized.layout?.alignment).toBe("start");
  expect(normalized.fields?.showLabels).toBe(true);
});

test("form embed spacing derives visible vertical padding when no explicit padding is saved", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        layout: {
          spacing: "xl",
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('data-form-embed-spacing="xl"');
  expect(html).toContain("py-12");
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

test("516-07: file field renders a real file control (not 'Unsupported') + hidden companion", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Careers",
          fields: [
            {
              id: "field-1",
              type: "file",
              label: "Resume",
              name: "resume",
              required: true,
              settings: { accept: ["image/png", "application/pdf"], multiple: true },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  // supported (no fallback), a real file input with accept/multiple, and a hidden
  // companion carrying the submitted field name (raw fake-path is never submitted).
  expect(html).not.toContain('data-form-field-unsupported="file"');
  expect(html).toContain('type="file"');
  expect(html).toContain('accept="image/png,application/pdf"');
  expect(html).toContain('data-form-file-input="resume"');
  expect(html).toContain('data-form-file-value="resume"');
  expect(html).toContain('type="hidden"');
});

test("form embed gives native file controls validity and runtime companions stable identities", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "file-contract-form",
        resolved: {
          formName: "File contract",
          fields: [
            {
              id: "resume-file",
              type: "file",
              label: "Resume",
              name: "resume",
              required: true,
              settings: {
                accept: ["application/pdf"],
                helper: "PDF only",
              },
            },
            {
              id: "portfolio-files",
              type: "file",
              label: "Portfolio",
              name: "portfolio",
              required: false,
              settings: {
                accept: ["image/png", "image/jpeg"],
                multiple: true,
              },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  const requiredInput = getOpeningTagByAttribute(html, "input", "data-form-file-input", "resume");
  const requiredValue = getOpeningTagByAttribute(html, "input", "data-form-file-value", "resume");
  const requiredStatus = getOpeningTagByAttribute(html, "p", "data-form-file-status", "resume");
  const multipleInput = getOpeningTagByAttribute(
    html,
    "input",
    "data-form-file-input",
    "portfolio"
  );
  const multipleValue = getOpeningTagByAttribute(
    html,
    "input",
    "data-form-file-value",
    "portfolio"
  );
  const multipleStatus = getOpeningTagByAttribute(html, "p", "data-form-file-status", "portfolio");

  expect(requiredInput).toContain('required=""');
  expect(requiredInput).toContain('aria-required="true"');
  expect(requiredInput).toContain('data-required-original="1"');
  expect(requiredInput).not.toMatch(/\sname=/);
  expect(requiredInput).toContain('accept="application/pdf"');
  expect(requiredInput).not.toContain('multiple=""');
  expect(requiredInput).toContain('data-form-file-multiple="0"');

  expect(requiredValue).toContain('name="resume"');
  expect(requiredValue).toContain('value=""');
  expect(requiredValue).toContain('data-form-file-multiple="0"');
  expect(requiredValue).not.toContain(" required");
  expect(requiredValue).not.toContain("aria-required");
  expect(requiredValue).not.toContain("data-required-original");
  expect(requiredValue).not.toContain("accept=");

  expect(multipleInput).not.toContain(" required");
  expect(multipleInput).not.toContain("aria-required");
  expect(multipleInput).toContain('data-required-original="0"');
  expect(multipleInput).not.toMatch(/\sname=/);
  expect(multipleInput).toContain('accept="image/png,image/jpeg"');
  expect(multipleInput).toContain('multiple=""');
  expect(multipleInput).toContain('data-form-file-multiple="1"');

  expect(multipleValue).toContain('name="portfolio"');
  expect(multipleValue).toContain('value=""');
  expect(multipleValue).toContain('data-form-file-multiple="1"');
  expect(multipleValue).not.toContain(" required");
  expect(multipleValue).not.toContain("aria-required");
  expect(multipleValue).not.toContain("data-required-original");
  expect(multipleValue).not.toContain("accept=");

  const requiredInputId = getAttributeValue(requiredInput, "id");
  const requiredStatusId = getAttributeValue(requiredStatus, "id");
  const multipleInputId = getAttributeValue(multipleInput, "id");
  const multipleStatusId = getAttributeValue(multipleStatus, "id");
  expect(requiredInputId).toBeTruthy();
  expect(requiredStatusId).toBe(`${requiredInputId}-upload-status`);
  expect(multipleInputId).toBeTruthy();
  expect(multipleStatusId).toBe(`${multipleInputId}-upload-status`);
  expect(new Set([requiredInputId, requiredStatusId, multipleInputId, multipleStatusId]).size).toBe(
    4
  );

  expect(getAttributeValue(requiredInput, "aria-describedby")).toBe(
    `${requiredInputId}-helper ${requiredStatusId}`
  );
  expect(getAttributeValue(multipleInput, "aria-describedby")).toBe(multipleStatusId);
  const requiredHelper = getOpeningTagByAttribute(html, "p", "id", `${requiredInputId}-helper`);
  expect(html).toContain(`${requiredStatus}</p>${requiredHelper}PDF only</p>`);
  expect(html).toContain(`${multipleValue}${multipleStatus}</p>`);
  expect(html).not.toContain(`id="${multipleInputId}-helper"`);
  for (const status of [requiredStatus, multipleStatus]) {
    expect(getAttributeValue(status, "class")?.split(/\s+/)).toContain("empty:sr-only");
    expect(status).toContain('role="status"');
    expect(status).toContain('aria-live="polite"');
  }
  expect(html).toContain(`${requiredStatus}</p>`);
  expect(html).toContain(`${multipleStatus}</p>`);

  for (const identity of ["resume", "portfolio"]) {
    for (const attribute of [
      "data-form-file-input",
      "data-form-file-value",
      "data-form-file-status",
    ]) {
      expect(html.match(new RegExp(`${attribute}="${identity}"`, "g"))).toHaveLength(1);
    }
  }
});

test("form embed allocates the same collision-free field id families across layout modes", () => {
  const fields = [
    {
      id: "a b",
      type: "file",
      label: "Slug space",
      name: "slug_space",
      required: false,
      settings: { helper: "First helper", formStep: 2 },
    },
    {
      id: "a-b",
      type: "file",
      label: "Slug dash",
      name: "slug_dash",
      required: false,
      settings: { formStep: 1 },
    },
    {
      id: "a",
      type: "file",
      label: "Role owner",
      name: "role_owner",
      required: false,
      settings: { helper: "Role helper", formStep: 2 },
    },
    {
      id: "a-upload-status",
      type: "file",
      label: "Role collision",
      name: "role_collision",
      required: false,
      settings: { formStep: 1 },
    },
    {
      id: "title",
      type: "file",
      label: "Heading collision",
      name: "heading_collision",
      required: false,
      settings: { formStep: 2 },
    },
  ] satisfies NonNullable<NonNullable<FormEmbedData["resolved"]>["fields"]>;
  const renderCollisionForm = (layoutMode: "single" | "multi_step") =>
    renderToString(
      <FormEmbedBlock
        data={{
          formId: "collision-form",
          title: "Collision form",
          resolved: {
            formName: "Collision form",
            settings: {
              layoutMode,
              stepTitles: ["First", "Second"],
            },
            fields,
          },
        }}
        variant="standard"
      />
    );

  const assertCollisionContract = (html: string, layoutMode: "single" | "multi_step") => {
    const headingMatch = html.match(/<h2 id="([^"]+)"/);
    if (!headingMatch) throw new Error("Missing form heading id");
    const headingId = headingMatch[1];
    const widgetId = headingId.slice(0, -"-title".length);
    const expectedInputIds = new Map([
      ["slug_space", `${widgetId}-a-b`],
      ["slug_dash", `${widgetId}-a-b-2`],
      ["role_owner", `${widgetId}-a`],
      ["role_collision", `${widgetId}-a-upload-status-2`],
      ["heading_collision", `${widgetId}-title-2`],
    ]);
    const helperByIdentity = new Map([
      ["slug_space", "First helper"],
      ["role_owner", "Role helper"],
    ]);

    expect(headingId).toBe(`${widgetId}-title`);
    if (layoutMode === "multi_step") {
      expect(html).toContain('data-step-index="1"');
      expect(html).toContain('data-step-index="2"');
    } else {
      expect(html).not.toContain("data-step-index=");
    }

    for (const [identity, inputId] of expectedInputIds) {
      const input = getOpeningTagByAttribute(html, "input", "data-form-file-input", identity);
      const status = getOpeningTagByAttribute(html, "p", "data-form-file-status", identity);
      const label = getOpeningTagByAttribute(html, "label", "for", inputId);
      const statusId = `${inputId}-upload-status`;
      const helperId = `${inputId}-helper`;
      const helper = helperByIdentity.get(identity);

      expect(getAttributeValue(input, "id")).toBe(inputId);
      expect(getAttributeValue(input, "aria-labelledby")).toBe(`${inputId}-label`);
      expect(getAttributeValue(label, "id")).toBe(`${inputId}-label`);
      expect(getAttributeValue(status, "id")).toBe(statusId);
      expect(getAttributeValue(status, "class")?.split(/\s+/)).toContain("empty:sr-only");
      expect(getAttributeValue(input, "aria-describedby")).toBe(
        helper ? `${helperId} ${statusId}` : statusId
      );

      for (const targetId of [inputId, `${inputId}-label`, statusId]) {
        expect(html.match(new RegExp(`id="${targetId}"`, "g"))).toHaveLength(1);
      }
      if (helper) {
        expect(html.match(new RegExp(`id="${helperId}"`, "g"))).toHaveLength(1);
        expect(html).toContain(`id="${helperId}"`);
        expect(html).toContain(`>${helper}</p>`);
      } else {
        expect(html).not.toContain(`id="${helperId}"`);
        expect(getAttributeValue(input, "aria-describedby")).not.toContain(helperId);
      }
    }

    const renderedIds = Array.from(html.matchAll(/\sid="([^"]+)"/g), (match) => match[1]);
    expect(new Set(renderedIds).size).toBe(renderedIds.length);
    return Array.from(expectedInputIds.values());
  };

  const singleIds = assertCollisionContract(renderCollisionForm("single"), "single");
  const multiStepIds = assertCollisionContract(renderCollisionForm("multi_step"), "multi_step");
  expect(multiStepIds).toEqual(singleIds);
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
  expect(html).toContain('data-form-security-nonce="1"');
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

test("form embed clamps saved progress ttl consistently", () => {
  expect(clampSavedProgressTtl("0")).toBe(1);
  expect(clampSavedProgressTtl(0)).toBe(1);
  expect(clampSavedProgressTtl("-5")).toBe(1);
  expect(clampSavedProgressTtl("99")).toBe(30);
  expect(clampSavedProgressTtl(undefined)).toBe(7);
  expect(
    normalizeFormEmbedData({
      navigation: {
        savedProgressTtlDays: 0,
      },
    }).navigation?.savedProgressTtlDays
  ).toBe(1);
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
  expect(html).toContain('value="true"');
  expect(html).toContain('type="number"');
  expect(html).not.toContain('data-form-field-unsupported="number"');
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
  expect(html).toContain('data-form-security-captcha="1"');
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

test("form embed renders typed controls for number, time, range, and rating", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Typed form",
          fields: [
            {
              id: "field-number",
              type: "number",
              label: "Team size",
              name: "team_size",
              required: true,
              settings: { min: 1, max: 20, step: 1 },
            },
            {
              id: "field-time",
              type: "time",
              label: "Preferred time",
              name: "preferred_time",
              required: false,
            },
            {
              id: "field-range",
              type: "range",
              label: "Budget score",
              name: "budget_score",
              required: false,
              settings: { min: 0, max: 10, step: 2, defaultValue: "4" },
            },
            {
              id: "field-rating",
              type: "rating",
              label: "Priority",
              name: "priority",
              required: false,
              settings: { max: 7, defaultValue: "3" },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('type="number"');
  expect(html).toContain('type="time"');
  expect(html).toContain('type="range"');
  expect(html).toContain('value="3"');
  expect(html).not.toContain('data-form-field-unsupported="number"');
  expect(html).not.toContain('data-form-field-unsupported="rating"');
});

test("form embed separates form step placement from input increment", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Intake",
          settings: {
            layoutMode: "multi_step",
            saveProgress: false,
            stepTitles: ["Contact", "Details"],
          },
          fields: [
            {
              id: "field-legacy",
              type: "number",
              label: "Legacy number",
              name: "legacy_number",
              required: false,
              settings: { step: 2 },
            },
            {
              id: "field-budget",
              type: "range",
              label: "Budget",
              name: "budget",
              required: false,
              settings: { formStep: 2, inputStep: 0.5, min: 0, max: 10 },
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('data-step-index="2"');
  expect(getOpeningTagByAttribute(html, "input", "name", "legacy_number")).not.toContain("step=");
  expect(getOpeningTagByAttribute(html, "input", "name", "budget")).toContain('step="0.5"');
});

test("form embed renders internal-only resolved forms as a noninteractive boundary", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-internal",
        resolved: {
          formName: "Internal intake",
          submissionAccess: "internal",
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

  expect(html).toContain('data-form-embed-runtime-boundary="internal"');
  expect(html).toContain("not accepting public submissions");
  expect(html).not.toContain('data-nextless-form-runtime="1"');
  expect(html).not.toContain("__nextlessFormRuntimeClient");
});

test("form embed supports hidden fields and keeps unknown field types explicitly unsupported", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        formId: "form-1",
        resolved: {
          formName: "Trusted form",
          fields: [
            {
              id: "field-hidden",
              type: "hidden",
              label: "Segment",
              name: "segment",
              required: false,
              settings: {
                defaultValue: "enterprise",
              },
            },
            {
              id: "field-unknown",
              type: "signature",
              label: "Signature",
              name: "signature",
              required: false,
            },
          ],
        },
      }}
      variant="standard"
    />
  );

  expect(html).toContain('type="hidden"');
  expect(html).toContain('name="segment"');
  expect(html).toContain('value="enterprise"');
  expect(html).toContain('data-form-field-unsupported="signature"');
  expect(html).toContain("Unsupported form field type:");
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

test("form embed renders user-facing runtime error messages without raw codes", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        resolved: {
          error: "form_missing",
        },
      }}
      variant="standard"
    />
  );

  expect(resolveFormEmbedRuntimeErrorMessage("form_missing")).toBe(
    "This form is not available right now."
  );
  expect(html).toContain("This form is not available right now.");
  expect(html).not.toContain("form_missing");
});

test("form embed surface does not duplicate the thin border class", () => {
  const html = renderToString(
    <FormEmbedBlock
      data={{
        style: {
          borderWidth: "1",
        },
      }}
      variant="standard"
    />
  );
  const surface = getOpeningTagByAttribute(html, "div", "data-form-embed-radius", "md");

  expect(countClassToken(getAttributeValue(surface, "class"), "border")).toBe(1);
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

test("form embed cleared style colors omit authored color values", () => {
  const normalized = normalizeFormEmbedData({
    ...formEmbedDefaults,
    style: {},
  });
  const html = renderToString(<FormEmbedBlock data={normalized} variant="standard" />);

  expect(normalized.style?.background).toBeUndefined();
  expect(normalized.style?.surface).toBeUndefined();
  expect(normalized.style?.borderColor).toBeUndefined();
  expect(normalized.style?.titleColor).toBeUndefined();
  expect(normalized.style?.labelColor).toBeUndefined();
  expect(normalized.style?.helperColor).toBeUndefined();
  expect(normalized.style?.submitBackground).toBeUndefined();
  expect(normalized.style?.submitTextColor).toBeUndefined();
  expect(html).toContain('data-form-embed-variant="standard"');
  expect(html).not.toContain("background-color:transparent");
});

test("form embed validator accepts transient resolved nonce runtime payload", () => {
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
          formId: "form-123",
          formName: "Contact",
          submissionAccess: "public",
          submissionNonce: "nonce-1",
        },
      },
    })
  ).not.toThrow();
});

test("form embed validator accepts non-secret resolved runtime payload", () => {
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
          formId: "form-123",
          formName: "Contact",
          description: "Reach us",
          status: "published",
          successMessage: "Done",
          submissionAccess: "public",
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

  expect(html).toContain("Form preview");
  expect(html).toContain("Content");
  expect(html).toContain("Layout");
  expect(html).toContain("Field labels");
  expect(html).toContain("Style");
  expect(html).toContain("Multi-step navigation");
  expect(html).toContain("Submit behavior");
  expect(html).not.toContain('data-widget-editor-section="form-embed.wizard.form-selection"');
});

test("form embed wizard editor renders source setup only", () => {
  const html = renderToString(
    <FormEmbedWizardEditor
      value={formEmbedDefaults}
      onChange={() => undefined}
      variant="standard"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Form selection");
  expect(html).toContain("Setup diagnostics");
  expect(html).not.toContain("Content");
  expect(html).not.toContain("Field labels");
  expect(html).not.toContain("Style");
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

  expect(html).not.toContain('data-widget-editor-section="form-embed.wizard.form-selection"');
  expect(html).toContain("Runtime diagnostics");
  expect(html).toContain("Submission security");
  expect(html).toContain("Authoring summary");
  expect(html).toContain("Contract summary");
  expect(html).not.toContain("Normalized payload snapshot");
  expect(html).not.toContain("<pre");
});

test("form embed editor contract validates mode ownership", () => {
  const widget = createFormEmbedWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(validation.errors).toEqual([]);
  expect(validation.valid).toBe(true);
  expect(widget.editorContract).toBe(formEmbedEditorContract);
  expect(formEmbedEditorContract.sections).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        mode: "wizard",
        id: "form-embed.wizard.form-selection",
        writablePaths: ["formId"],
      }),
      expect.objectContaining({
        mode: "visual",
        id: "form-embed.visual.content",
        writablePaths: ["title", "description", "submitLabel", "successMessage"],
      }),
      expect.objectContaining({
        mode: "advanced",
        id: "form-embed.advanced.submission-security",
        writablePaths: [],
      }),
      expect.objectContaining({
        mode: "advanced",
        id: "form-embed.advanced.authoring-summary",
        role: "summary",
        writablePaths: [],
      }),
    ])
  );
  expect(formEmbedEditorContract.sections).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ role: "technical" })])
  );
});
