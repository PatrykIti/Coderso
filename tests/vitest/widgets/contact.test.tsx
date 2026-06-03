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
  buildContactMapEmbedUrl,
  buildContactSocialHref,
  ContactBlock,
  contactEditorContract,
  contactDefaults,
  createContactWidget,
  getContactDiagnosticsSnapshot,
  normalizeContactData,
  readContactMapLocation,
  readContactSocialProfile,
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
        style: {
          ...contactDefaults.style,
          textColor: "#112233",
          mutedTextColor: "#334455",
          buttonBackgroundColor: "#2563eb",
          buttonTextColor: "#ffffff",
          buttonBorderColor: "#1d4ed8",
          panelRadius: "lg",
          buttonRadius: "full",
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
  expect(html).toContain("#112233");
  expect(html).toContain("#334455");
  expect(html).toContain("#2563eb");
  expect(html).toContain("#1d4ed8");
  expect(html).toContain("rounded-lg");
  expect(html).toContain("rounded-full");
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

test("contact drops unsafe social profile hrefs from rendered output", () => {
  const html = renderToString(
    <ContactBlock
      data={{
        ...contactDefaults,
        contact: {
          ...contactDefaults.contact,
          phone: "",
          email: "",
          address: "",
          hours: "",
          social: [
            {
              id: "social-0",
              platform: "custom",
              label: "Legacy custom",
              href: "https://example.com/contact",
            },
            { id: "social-1", platform: "custom", label: "Mail", href: "mailto:test@example.com" },
            { id: "social-2", platform: "custom", label: "Phone", href: "tel:+1555123456" },
            { id: "social-3", platform: "custom", label: "Hash", href: "#team" },
            { id: "social-4", platform: "custom", label: "Relative", href: "/team" },
            { id: "social-5", platform: "custom", label: "Proto relative", href: "//example.com" },
            { id: "social-6", platform: "custom", label: "Script", href: "javascript:alert(1)" },
          ],
        },
      }}
      variant="form-left"
    />
  );

  expect(html).not.toContain("https://example.com/contact");
  expect(html).not.toContain("mailto:test@example.com");
  expect(html).not.toContain("tel:+1555123456");
  expect(html).not.toContain('href="#team"');
  expect(html).not.toContain('href="/team"');
  expect(html).not.toContain('href="//example.com"');
  expect(html).not.toContain("javascript:alert(1)");
  expect(html).toContain('data-contact-social-count="0"');
});

test("contact reuses Forms runtime markup when a public binding exactly matches the visible Contact fields", () => {
  const html = renderToString(
    <ContactBlock
      blockId="contact-runtime"
      data={{
        ...contactDefaults,
        form: {
          ...contactDefaults.form,
          fields: ["name", "email", "message"],
          submission: {
            ...contactDefaults.form?.submission,
            mode: "forms-runtime",
            formId: "form-public",
            fieldMap: {
              name: "full_name",
              email: "reply_email",
              phone: "",
              message: "message_body",
            },
            successMessage: "We got it.",
            errorMessage: "Please try again.",
          },
        },
        resolved: {
          formId: "form-public",
          formName: "Support",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-contact",
            action: "public_write",
          },
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Full name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "field-2",
              type: "email",
              label: "Reply email",
              name: "reply_email",
              required: true,
              orderIndex: 1,
              settings: {},
            },
            {
              id: "field-3",
              type: "textarea",
              label: "Message",
              name: "message_body",
              required: true,
              orderIndex: 2,
              settings: {},
            },
          ],
        },
      }}
      variant="form-left"
    />
  );

  expect(html).toContain('data-contact-form-mode="forms-runtime"');
  expect(html).toContain('method="post"');
  expect(html).toContain('action="/forms/form-public/submissions"');
  expect(html).toContain('data-nextless-form-runtime="1"');
  expect(html).toContain('data-form-id="form-public"');
  expect(html).toContain('data-form-submit-label="Send message"');
  expect(html).toContain('data-form-captcha-site-key="site-key-contact"');
  expect(html).toContain('data-form-captcha-action="public_write"');
  expect(html).toContain('name="full_name"');
  expect(html).toContain('name="reply_email"');
  expect(html).toContain('name="message_body"');
  expect(html).toContain('name="__nl_form_nonce"');
  expect(html).toContain('name="captchaToken"');
  expect(html).toContain('value="signed-nonce"');
  expect(html).toContain('data-form-embed-success="true"');
  expect(html).toContain('data-form-embed-error="true"');
  expect(html).toContain("We got it.");
  expect(html).toContain("Please try again.");
  expect(html).not.toContain("This contact form is not connected yet.");
});

test("contact keeps forms-runtime bindings static when the resolved form is missing, unpublished, internal, or exceeds the Contact field surface", () => {
  const cases: Array<{
    label: string;
    resolved: NonNullable<ContactData["resolved"]>;
  }> = [
    {
      label: "missing",
      resolved: {
        formId: "form-missing",
        formName: "",
        status: "missing",
        submissionAccess: "public",
        submissionNonce: null,
        fields: [],
        error: "form_not_found",
      },
    },
    {
      label: "unpublished",
      resolved: {
        formId: "form-draft",
        formName: "Draft support",
        status: "draft",
        submissionAccess: "public",
        submissionNonce: "signed-nonce",
        fields: [],
        error: "form_unpublished",
      },
    },
    {
      label: "internal",
      resolved: {
        formId: "form-internal",
        formName: "Internal support",
        status: "published",
        submissionAccess: "internal",
        submissionNonce: null,
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Full name",
            name: "full_name",
            required: true,
            orderIndex: 0,
            settings: {},
          },
          {
            id: "field-2",
            type: "email",
            label: "Reply email",
            name: "reply_email",
            required: true,
            orderIndex: 1,
            settings: {},
          },
          {
            id: "field-3",
            type: "textarea",
            label: "Message",
            name: "message_body",
            required: true,
            orderIndex: 2,
            settings: {},
          },
        ],
      },
    },
    {
      label: "extra field",
      resolved: {
        formId: "form-extra",
        formName: "Extended support",
        status: "published",
        submissionAccess: "public",
        submissionNonce: "signed-nonce",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Full name",
            name: "full_name",
            required: true,
            orderIndex: 0,
            settings: {},
          },
          {
            id: "field-2",
            type: "email",
            label: "Reply email",
            name: "reply_email",
            required: true,
            orderIndex: 1,
            settings: {},
          },
          {
            id: "field-3",
            type: "textarea",
            label: "Message",
            name: "message_body",
            required: true,
            orderIndex: 2,
            settings: {},
          },
          {
            id: "field-4",
            type: "checkbox",
            label: "Consent",
            name: "consent",
            required: true,
            orderIndex: 3,
            settings: {},
          },
        ],
      },
    },
    {
      label: "missing nonce",
      resolved: {
        formId: "form-missing-nonce",
        formName: "Public support",
        status: "published",
        submissionAccess: "public",
        submissionNonce: null,
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Full name",
            name: "full_name",
            required: true,
            orderIndex: 0,
            settings: {},
          },
          {
            id: "field-2",
            type: "email",
            label: "Reply email",
            name: "reply_email",
            required: true,
            orderIndex: 1,
            settings: {},
          },
          {
            id: "field-3",
            type: "textarea",
            label: "Message",
            name: "message_body",
            required: true,
            orderIndex: 2,
            settings: {},
          },
        ],
      },
    },
    {
      label: "conditional logic",
      resolved: {
        formId: "form-logic",
        formName: "Logic support",
        status: "published",
        submissionAccess: "public",
        submissionNonce: "signed-nonce",
        fields: [
          {
            id: "field-1",
            type: "text",
            label: "Full name",
            name: "full_name",
            required: true,
            orderIndex: 0,
            settings: {},
          },
          {
            id: "field-2",
            type: "email",
            label: "Reply email",
            name: "reply_email",
            required: true,
            orderIndex: 1,
            settings: {},
          },
          {
            id: "field-3",
            type: "textarea",
            label: "Message",
            name: "message_body",
            required: true,
            orderIndex: 2,
            settings: {
              logic: {
                operator: "equals",
                field: "full_name",
                value: "support",
              },
            },
          },
        ],
      },
    },
  ];

  for (const testCase of cases) {
    const html = renderToString(
      <ContactBlock
        data={{
          ...contactDefaults,
          form: {
            ...contactDefaults.form,
            fields: ["name", "email", "message"],
            submission: {
              ...contactDefaults.form?.submission,
              mode: "forms-runtime",
              formId: testCase.resolved.formId,
              fieldMap: {
                name: "full_name",
                email: "reply_email",
                phone: "",
                message: "message_body",
              },
            },
          },
          resolved: testCase.resolved,
        }}
        variant="form-left"
      />
    );

    expect(html).not.toContain('data-nextless-form-runtime="1"');
    expect(html).not.toContain('action="/forms/');
    expect(html).toContain('data-contact-form-mode="static"');
    expect(html).toContain('data-contact-form-configured-mode="forms-runtime"');
    expect(html).toContain('data-contact-runtime-boundary="');
    expect(html).toContain('type="button"');
    expect(html).toContain("This contact form is not connected yet.");
  }
});

test("contact fails closed for unsafe map, social, and color values", () => {
  const html = renderToString(
    <ContactBlock
      data={{
        ...contactDefaults,
        contact: {
          ...contactDefaults.contact,
          phone: "",
          email: "",
          address: "",
          hours: "",
          social: [
            {
              id: "social-http",
              platform: "linkedin",
              label: "HTTP LinkedIn",
              href: "http://www.linkedin.com/company/coderso",
            },
            {
              id: "social-host",
              platform: "linkedin",
              label: "Wrong host",
              href: "https://example.com/company/coderso",
            },
          ],
        },
        map: {
          enabled: true,
          embedUrl: "https://example.com/maps?q=coderso",
          fallbackCopy: "Map fallback",
        },
        style: {
          ...contactDefaults.style,
          background: "url(javascript:alert(1))",
          surfaceColor: "expression(alert(1))",
          borderColor: "data:text/css,body{}",
          buttonBackgroundColor: "#123456",
        },
      }}
      variant="form-left"
    />
  );

  expect(html).toContain("Map fallback");
  expect(html).not.toContain("<iframe");
  expect(html).not.toContain("http://www.linkedin.com/company/coderso");
  expect(html).not.toContain("https://example.com/company/coderso");
  expect(html).not.toContain("url(javascript");
  expect(html).not.toContain("expression(alert");
  expect(html).not.toContain("data:text/css");
  expect(html).toContain("#123456");
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
      background: "url(javascript:alert(1))",
      surfaceColor: "data:text/css,body{}",
      borderColor: "expression(alert(1))",
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
    background: undefined,
    surfaceColor: undefined,
    borderColor: "var(--color-border)",
    textColor: undefined,
    mutedTextColor: undefined,
    buttonBackgroundColor: undefined,
    buttonTextColor: undefined,
    buttonBorderColor: undefined,
    maxWidth: "xl",
    paddingX: "md",
    panelRadius: "xl",
    buttonRadius: "md",
  });
});

test("contact editor helpers build map and social destinations from nontechnical inputs", () => {
  const mapUrl = buildContactMapEmbedUrl("Warsaw, Poland");
  const parsedMapUrl = new URL(mapUrl);

  expect(parsedMapUrl.hostname).toBe("www.google.com");
  expect(parsedMapUrl.searchParams.get("q")).toBe("Warsaw, Poland");
  expect(parsedMapUrl.searchParams.get("output")).toBe("embed");
  expect(readContactMapLocation(mapUrl)).toBe("Warsaw, Poland");

  const socialHref = buildContactSocialHref("instagram", "@coderso");
  expect(socialHref).toBe("https://www.instagram.com/coderso");
  expect(readContactSocialProfile("instagram", socialHref)).toBe("coderso");
  expect(buildContactSocialHref("instagram", "https://www.instagram.com/coderso/")).toBe(
    "https://www.instagram.com/coderso"
  );
  expect(buildContactSocialHref("linkedin", "in/jane-doe")).toBe(
    "https://www.linkedin.com/in/jane-doe"
  );
  expect(readContactSocialProfile("linkedin", "https://www.linkedin.com/in/jane-doe")).toBe(
    "in/jane-doe"
  );
  expect(buildContactSocialHref("custom", "coderso")).toBe("");
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
          textColor: "#112233",
          mutedTextColor: "#334455",
          buttonBackgroundColor: "#2563eb",
          buttonTextColor: "#ffffff",
          buttonBorderColor: "#1d4ed8",
          maxWidth: "2xl",
          paddingX: "lg",
          panelRadius: "lg",
          buttonRadius: "full",
        },
        resolved: {
          formId: "form-public",
          formName: "Support form",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-contact",
            action: "public_write",
          },
          fields: [],
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

test("contact exposes a strict v2 editor ownership contract aligned to the current sections", () => {
  const widget = createContactWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.editorContract).toBe(contactEditorContract);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "contact.wizard.layout",
    "contact.wizard.form",
    "contact.visual.variant-header",
    "contact.visual.form-fields-required",
    "contact.visual.field-copy-layout",
    "contact.visual.submission-runtime",
    "contact.visual.details-business",
    "contact.visual.map-display",
    "contact.visual.surface-styling",
    "contact.visual.layout-spacing",
    "contact.advanced.map-runtime",
    "contact.advanced.normalization",
    "contact.advanced.runtime-summary",
  ]);
  expect(
    widget.editorContract?.sections
      .filter((section) => section.mode === "advanced")
      .every((section) => section.writablePaths.length === 0)
  ).toBe(true);
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

  expect(wizardHtml).toContain("Use Visual to edit the section title, description");
  expect(wizardHtml).toContain("Current layout");
  expect(wizardHtml).toContain("Visible fields");
  expect(wizardHtml).toContain("Submit label");
  expect(wizardHtml).not.toContain("Business hours");

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
  expect(visualHtml).toContain("Contact palettes");
  expect(visualHtml).toContain("Contrast guidance");
  expect(visualHtml).toContain("Heading color");
  expect(visualHtml).toContain("Supporting text color");
  expect(visualHtml).toContain("Submit button background");
  expect(visualHtml).toContain("Submit button radius");
  expect(visualHtml).toContain('data-widget-control="contact.style.background"');
  expect(visualHtml).toContain('data-widget-control="contact.style.textColor"');
  expect(visualHtml).toContain('data-widget-control-path="style.background"');
  expect(visualHtml).toContain('data-widget-control-path="style.textColor"');
  expect(visualHtml).toContain('data-widget-control-path="style.borderWidth"');
  expect(visualHtml).toContain('data-widget-control-path="style.panelRadius"');
  expect(visualHtml).toContain('data-widget-control-path="style.buttonRadius"');

  const advancedHtml = renderToString(
    <ContactAdvancedEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(advancedHtml).toContain("Normalization and fallback controls");
  expect(advancedHtml).toContain("Runtime diagnostics summary");
  expect(advancedHtml).not.toContain("<pre");
});
