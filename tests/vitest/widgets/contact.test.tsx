import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ContactAdvancedEditor,
  ContactVisualEditor,
  ContactWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ContactEditors";
import {
  ContactBlock,
  contactDefaults,
  createContactWidget,
  getContactDiagnosticsSnapshot,
  normalizeContactData,
  type ContactData,
} from "../../../core/widgets/core/contact";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ContactData>> = () => null;

test("contact renders semantic details, static form metadata, and enhanced map/social output", () => {
  const html = renderToString(
    <ContactBlock
      blockId="contact-hero"
      data={{
        ...contactDefaults,
        title: "Get in touch",
        description: "Talk to the team behind the product.",
        form: {
          ...contactDefaults.form,
          title: "Send a message",
          fieldLayout: "two",
          fieldSettings: {
            ...contactDefaults.form?.fieldSettings,
            name: {
              ...contactDefaults.form?.fieldSettings?.name,
              span: "half",
            },
            email: {
              ...contactDefaults.form?.fieldSettings?.email,
              span: "half",
            },
          },
        },
        contact: {
          ...contactDefaults.contact,
          title: "Contact details",
          social: [
            {
              id: "social-1",
              platform: "linkedin",
              label: "LinkedIn",
              href: "https://www.linkedin.com/company/coderso",
            },
          ],
        },
        map: {
          enabled: true,
          embedUrl: "https://maps.google.com/?q=Warsaw&output=embed",
          title: "Find us",
          description: "Main office location.",
          height: "lg",
        },
      }}
      variant="form-right"
    />
  );

  expect(html).toContain('data-contact-variant="form-right"');
  expect(html).toContain('aria-labelledby="contact-hero-title"');
  expect(html).toContain("Get in touch");
  expect(html).toContain("Talk to the team behind the product.");
  expect(html).toContain('role="group"');
  expect(html).toContain('data-contact-form-mode="static"');
  expect(html).toContain('type="button"');
  expect(html).toContain('data-form-submit="1"');
  expect(html).toContain('aria-busy="false"');
  expect(html).toContain('name="name"');
  expect(html).toContain('name="email"');
  expect(html).toContain('autoComplete="name"');
  expect(html).toContain('autoComplete="email"');
  expect(html).toContain("<address");
  expect(html).toContain("<dl");
  expect(html).toContain('href="tel:+1555123456"');
  expect(html).toContain('href="mailto:hello@example.com"');
  expect(html).toContain("This contact form is not connected yet.");
  expect(html).toContain("LinkedIn");
  expect(html).toContain('target="_blank"');
  expect(html).toContain('allowFullScreen=""');
  expect(html).toContain('data-contact-map="true"');
  expect(html).toContain('data-contact-max-width="xl"');
  expect(html).toContain('data-contact-padding-x="md"');
  expect(html).toContain("Find us");
  expect(html).toContain("Main office location.");
});

test("contact minimal variant hides the form and shows safe map fallback copy", () => {
  const html = renderToString(
    <ContactBlock
      data={{
        ...contactDefaults,
        map: {
          ...contactDefaults.map,
          enabled: true,
          embedUrl: "notaurl",
          fallbackCopy: "Map preview is unavailable right now.",
        },
      }}
      variant="minimal"
    />
  );

  expect(html).toContain('data-contact-variant="minimal"');
  expect(html).not.toContain('data-contact-form-mode="static"');
  expect(html).not.toContain('data-contact-field="name"');
  expect(html).toContain("Map preview is unavailable right now.");
  expect(html).not.toContain("<iframe");
});

test("contact normalization keeps bounded defaults, field metadata, and static submission state", () => {
  const normalized = normalizeContactData({
    form: {
      fields: ["name", "email", "name", "unknown" as never],
      required: ["email", "message", "invalid" as never],
      submitLabel: "",
      fieldLayout: "broken" as never,
      fieldSettings: {
        email: {
          label: "",
          placeholder: "",
          autocomplete: "invalid" as never,
          span: "half",
        },
      },
      submission: {
        mode: "unknown" as never,
        staticMessage: "",
      },
    },
    map: {
      enabled: true,
      embedUrl: "ftp://maps.example.com",
      height: "wide" as never,
      fallbackCopy: "",
    },
    style: {
      spacing: "weird" as never,
      columns: "strange" as never,
      borderWidth: "9" as never,
      maxWidth: "huge" as never,
      paddingX: "tiny" as never,
    },
  });

  expect(normalized.form?.fields).toEqual(["name", "email"]);
  expect(normalized.form?.required).toEqual(["email"]);
  expect(normalized.form?.submitLabel).toBe(contactDefaults.form?.submitLabel);
  expect(normalized.form?.fieldLayout).toBe("one");
  expect(normalized.form?.fieldSettings?.email).toMatchObject({
    label: "Email",
    placeholder: "",
    autocomplete: "email",
    span: "half",
  });
  expect(normalized.form?.submission).toMatchObject({
    mode: "static",
    staticMessage: "This contact form is not connected yet.",
  });
  expect(normalized.map).toMatchObject({
    embedUrl: "ftp://maps.example.com",
    height: "md",
    fallbackCopy: "Map is unavailable.",
  });
  expect(normalized.style).toMatchObject({
    spacing: "md",
    columns: "two",
    borderWidth: "1",
    maxWidth: "xl",
    paddingX: "md",
  });
});

test("contact validator accepts expanded schema and rejects unsupported nested keys", () => {
  clearWidgets();
  registerWidget(
    createContactWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-1",
      type: "contact",
      variant: "form-right",
      data: {
        title: "Support",
        description: "Reach the team.",
        form: {
          title: "Send us a note",
          fields: ["name", "email", "message"],
          required: ["email", "message"],
          submitLabel: "Send",
          fieldLayout: "two",
          fieldSettings: {
            name: {
              label: "Full name",
              placeholder: "Jane Doe",
              autocomplete: "name",
              span: "half",
            },
          },
          submission: {
            mode: "static",
            staticMessage: "Not connected yet.",
          },
        },
        contact: {
          title: "Contact details",
          phone: "+48 500 100 200",
          email: "support@example.com",
          address: "Marszalkowska 1",
          hours: "Mon-Fri 8-16",
          details: {
            phone: {
              label: "Call us",
              icon: "phone",
            },
          },
          social: [
            {
              id: "social-1",
              platform: "linkedin",
              label: "LinkedIn",
              href: "https://www.linkedin.com/company/coderso",
            },
          ],
        },
        map: {
          enabled: true,
          embedUrl: "https://maps.google.com/?q=Warsaw&output=embed",
          title: "Find us",
          description: "HQ",
          height: "lg",
          fallbackCopy: "Map unavailable.",
        },
        style: {
          spacing: "lg",
          background: "#f8fafc",
          columns: "two",
          surfaceColor: "#ffffff",
          borderColor: "#cbd5e1",
          borderWidth: "2",
          maxWidth: "2xl",
          paddingX: "lg",
        },
      },
    })
  ).not.toThrow();

  expect(() =>
    normalizeWidgetBlock({
      id: "contact-2",
      type: "contact",
      variant: "form-left",
      data: {
        form: {
          fields: ["name"],
          fieldSettings: {
            name: {
              label: "Name",
              invalidKey: "nope",
            },
          },
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("contact cleared section and panel surfaces omit forced background styles", () => {
  const normalized = normalizeContactData({
    ...contactDefaults,
    style: {},
  });
  const html = renderToString(<ContactBlock data={normalized} variant="form-left" />);

  expect(normalized.style?.background).toBeUndefined();
  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(html).toContain('data-contact-variant="form-left"');
  expect(html).not.toContain("background-color:transparent");
});

test("contact diagnostics snapshot redacts runtime nonce values", () => {
  const snapshot = getContactDiagnosticsSnapshot({
    ...contactDefaults,
    resolved: {
      submissionNonce: "secret-nonce",
      error: "form_not_found",
    },
  } as ContactData);

  expect(snapshot).toContain('"submissionNonce": "[redacted]"');
  expect(snapshot).toContain('"error": "form_not_found"');
});

test("contact editor render smoke reflects the new IA", () => {
  const wizardHtml = renderToString(
    <ContactWizardEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(wizardHtml).toContain("Section header");
  expect(wizardHtml).toContain("Business hours");

  const visualHtml = renderToString(
    <ContactVisualEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(visualHtml).toContain("Field labels, placeholders, and layout");
  expect(visualHtml).toContain("Section layout and spacing");
  expect(visualHtml).toContain("Social links");

  const advancedHtml = renderToString(
    <ContactAdvancedEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(advancedHtml).toContain("Normalization and fallback controls");
  expect(advancedHtml).toContain("Runtime diagnostics snapshot");
});
