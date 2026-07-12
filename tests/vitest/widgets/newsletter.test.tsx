import React from "react";
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { expect, test } from "vitest";

import {
  NewsletterAdvancedEditor,
  NewsletterVisualEditor,
  NewsletterWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NewsletterEditors";
import {
  NewsletterBlock,
  createNewsletterWidget,
  newsletterDefaults,
  normalizeNewsletterActionUrl,
  normalizeNewsletterData,
  resolveNewsletterTransport,
  type NewsletterData,
} from "../../../core/widgets/core/newsletter";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<NewsletterData>> = () => null;

test("newsletter keeps all stored overrides authoring-only and fail-closed", () => {
  const normalized = normalizeNewsletterData({
    ...newsletterDefaults,
    style: {
      background: " #ABC ",
      textColor: " HSL(210DEG, 50%, 40%) ",
      buttonBackground: " rgb(12, 24, 36) ",
      buttonTextColor: " RGBA(255, 255, 255, .5) ",
    },
  });
  expect(normalized.style).toMatchObject({
    background: "#abc",
    textColor: "hsl(210, 50%, 40%)",
    buttonBackground: "rgb(12, 24, 36)",
    buttonTextColor: "rgba(255, 255, 255, 0.5)",
  });
  const html = renderToString(<NewsletterBlock data={normalized} variant="centered" />);
  expect(html).toContain("background-color:#abc");
  expect(html).toContain("color:hsl(210, 50%, 40%)");
  expect(html).toContain("background-color:rgb(12, 24, 36)");
  expect(html).toContain("color:rgba(255, 255, 255, 0.5)");

  const rejected = normalizeNewsletterData({
    ...newsletterDefaults,
    style: {
      background: " currentColor ",
      textColor: " inherit ",
      buttonBackground: "\u00a0#fff",
      buttonTextColor: "\u2003#fff",
    },
  });
  expect(rejected.style).toMatchObject({
    background: undefined,
    textColor: "",
    buttonBackground: "",
    buttonTextColor: "",
  });
  const rejectedHtml = renderToString(<NewsletterBlock data={rejected} variant="centered" />);
  expect(rejectedHtml).not.toContain("\u00a0#fff");
  expect(rejectedHtml).not.toContain("\u2003#fff");
});

test("newsletter renders disconnected semantics without a native form submit target", () => {
  const html = renderToString(
    <NewsletterBlock
      blockId="newsletter-hero"
      renderContext={{ mode: "admin-preview" }}
      data={{
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          showEmailLabel: true,
        },
        consent: {
          enabled: true,
          label: "I agree to receive updates.",
          required: true,
        },
      }}
      variant="inline"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="false"');
  expect(html).toContain('data-newsletter-submit-interactive="false"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).toContain('data-newsletter-action-status="empty"');
  expect(html).not.toContain("<form");
  expect(html).toContain('role="form"');
  expect(html).toContain('aria-disabled="true"');
  expect(html).toContain('type="button"');
  expect(html).toContain('name="email"');
  expect(html).toContain('id="newsletter-newsletter-hero-email"');
  expect(html).toContain('for="newsletter-newsletter-hero-email"');
  expect(html).toContain('autoComplete="email"');
  expect(html).toContain('name="consent"');
  expect(html).toContain(
    "Connect a Forms runtime binding or a safe external action URL to enable submissions."
  );
});

test("newsletter shows a public fallback message when no submit target is connected", () => {
  const html = renderToString(
    <NewsletterBlock
      renderContext={{ mode: "public" }}
      data={newsletterDefaults}
      variant="inline"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="false"');
  expect(html).toContain("This signup form is not connected yet.");
  expect(html).not.toContain("<form");
  expect(html).toContain('role="form"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).toContain('type="button"');
});

test("newsletter keeps safe static action-url as a native submit path", () => {
  const html = renderToString(
    <NewsletterBlock
      renderContext={{ mode: "public" }}
      data={{
        ...newsletterDefaults,
        integration: {
          mode: "action-url",
          method: "get",
          actionUrl: "https://example.com/subscribe",
          webhookId: "",
        },
        submission: {
          ...newsletterDefaults.submission,
          mode: "static",
        },
      }}
      variant="inline"
    />
  );

  expect(html).toContain("<form");
  expect(html).toContain('action="https://example.com/subscribe"');
  expect(html).toContain('method="get"');
  expect(html).toContain('type="submit"');
  expect(html).toContain('data-newsletter-submit-ready="true"');
  expect(html).toContain('data-newsletter-submit-interactive="true"');
  expect(html).toContain('data-newsletter-native-submit="enabled"');
  expect(html).not.toContain('role="form"');
  expect(html).not.toContain('aria-disabled="true"');
});

test("newsletter reuses shared Forms runtime markup when the resolved form is compatible", () => {
  const html = renderToString(
    <NewsletterBlock
      blockId="newsletter-runtime"
      data={{
        ...newsletterDefaults,
        description: "Hidden in minimal variant",
        form: {
          ...newsletterDefaults.form,
          firstName: {
            ...newsletterDefaults.form?.firstName,
            enabled: true,
            required: true,
          },
        },
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-public",
          analyticsEvent: "newsletter_submit",
        },
        stateCopy: {
          loadingMessage: "Sending...",
          successMessage: "Joined.",
          errorMessage: "Try again.",
        },
        resolved: {
          formId: "form-public",
          formName: "Newsletter form",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          botProtection: {
            provider: "recaptcha_v3",
            siteKey: "site-key-1",
            action: "public_write",
          },
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "First name",
              name: "first_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "field-2",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              orderIndex: 1,
              settings: {},
            },
            {
              id: "field-3",
              type: "checkbox",
              label: "Consent",
              name: "consent",
              required: false,
              orderIndex: 2,
              settings: {},
            },
          ],
        },
      }}
      variant="minimal"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="true"');
  expect(html).toContain('data-newsletter-action-status="runtime"');
  expect(html).toContain('action="/forms/form-public/submissions"');
  expect(html).toContain('method="post"');
  expect(html).toContain('data-nextless-form-runtime="1"');
  expect(html).toContain('data-form-success-message="Joined."');
  expect(html).toContain('data-form-loading-label="Sending..."');
  expect(html).toContain('name="__nl_form_nonce"');
  expect(html).toContain('value="signed-nonce"');
  expect(html).toContain('name="captchaToken"');
  expect(html).toContain('data-form-security-nonce="1"');
  expect(html).toContain('data-form-security-captcha="1"');
  expect(html).toContain('name="first_name"');
  expect(html).toContain('autoComplete="given-name"');
  expect(html).toContain('data-form-embed-success="true"');
  expect(html).toContain('data-form-embed-error="true"');
  expect(html).toContain('data-newsletter-analytics-event="newsletter_submit"');
  expect(html).toContain("<script");
  expect(html).not.toContain("Hidden in minimal variant");
});

test("newsletter blocks public Forms runtime when the submission nonce is missing", () => {
  const html = renderToString(
    <NewsletterBlock
      blockId="newsletter-runtime-missing-nonce"
      renderContext={{ mode: "public" }}
      data={{
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-public",
        },
        resolved: {
          formId: "form-public",
          formName: "Newsletter form",
          status: "published",
          submissionAccess: "public",
          submissionNonce: null,
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "field-2",
              type: "checkbox",
              label: "Consent",
              name: "consent",
              required: false,
              orderIndex: 1,
              settings: {},
            },
          ],
        },
      }}
      variant="inline"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="true"');
  expect(html).toContain('data-newsletter-submit-interactive="false"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).not.toContain("<form");
  expect(html).not.toContain('action="/forms/form-public/submissions"');
  expect(html).not.toContain('data-nextless-form-runtime="1"');
  expect(html).not.toContain('name="__nl_form_nonce"');
  expect(html).not.toContain("<script");
  expect(html).toContain("submission security token is missing");
});

test("newsletter keeps forms-runtime bindings static when consent or required fields do not match", () => {
  const html = renderToString(
    <NewsletterBlock
      blockId="newsletter-mismatch"
      renderContext={{ mode: "admin-preview" }}
      data={{
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          firstName: {
            ...newsletterDefaults.form?.firstName,
            enabled: true,
            required: false,
          },
        },
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-public",
        },
        resolved: {
          formId: "form-public",
          formName: "Newsletter form",
          status: "published",
          submissionAccess: "public",
          submissionNonce: "signed-nonce",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "First name",
              name: "first_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "field-2",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              orderIndex: 1,
              settings: {},
            },
          ],
        },
      }}
      variant="inline"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="false"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).not.toContain("<form");
  expect(html).not.toContain('data-nextless-form-runtime="1"');
  expect(html).not.toContain('name="__nl_form_nonce"');
  expect(html).toContain(
    "Connect a Forms runtime binding or a safe external action URL to enable submissions."
  );
});

test("newsletter keeps forms-runtime bindings static when the resolved form is incompatible", () => {
  const html = renderToString(
    <NewsletterBlock
      blockId="newsletter-static"
      renderContext={{ mode: "admin-preview" }}
      data={{
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-internal",
        },
        resolved: {
          formId: "form-internal",
          formName: "Internal form",
          status: "published",
          submissionAccess: "internal",
          submissionNonce: "signed-nonce",
          fields: [
            {
              id: "field-1",
              type: "text",
              label: "Name",
              name: "full_name",
              required: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      }}
      variant="stacked"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="false"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).not.toContain("<form");
  expect(html).not.toContain('data-nextless-form-runtime="1"');
  expect(html).toContain('type="button"');
  expect(html).not.toContain('name="__nl_form_nonce"');
  expect(html).toContain(
    "Connect a Forms runtime binding or a safe external action URL to enable submissions."
  );
});

test("newsletter does not treat shared forms routes as a native static submit target", () => {
  const html = renderToString(
    <NewsletterBlock
      renderContext={{ mode: "admin-preview" }}
      data={{
        ...newsletterDefaults,
        integration: {
          mode: "action-url",
          method: "post",
          actionUrl: "/forms/form-public/submissions",
          webhookId: "",
        },
        submission: {
          ...newsletterDefaults.submission,
          mode: "static",
        },
      }}
      variant="stacked"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="false"');
  expect(html).not.toContain('action="/forms/form-public/submissions"');
  expect(html).not.toContain("<form");
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).toContain(
    "Switch Newsletter submission mode to Forms runtime when you target a Coderso Forms route."
  );
});

test("newsletter normalizes invalid transport and style input safely", () => {
  expect(normalizeNewsletterActionUrl("https://example.com/subscribe")).toMatchObject({
    status: "valid",
    value: "https://example.com/subscribe",
  });
  expect(normalizeNewsletterActionUrl("example.com").status).toBe("invalid");
  expect(normalizeNewsletterActionUrl("http://example.com").status).toBe("invalid");
  expect(normalizeNewsletterActionUrl("/forms/form-1/submissions").status).toBe("valid");
  expect(normalizeNewsletterActionUrl("/admin/forms").status).toBe("invalid");

  const normalized = normalizeNewsletterData({
    integration: {
      mode: "action-url",
      method: "get",
      actionUrl: "example.com",
    },
    style: {
      spacing: "weird" as never,
      width: "oversized" as never,
      textColor: "paper" as never,
      buttonBackground: "#112233",
      buttonTextColor: "#ffffff",
    },
  });

  expect(normalized.style.spacing).toBe("md");
  expect(normalized.style.width).toBe("default");
  expect(normalized.style.textColor).toBe("");
  expect(normalized.style.buttonBackground).toBe("#112233");
  expect(resolveNewsletterTransport(normalized.integration).actionStatus).toBe("invalid");

  const deduped = normalizeNewsletterData({
    form: {
      emailFieldName: "shared",
      consentFieldName: "shared",
      firstName: {
        enabled: true,
        fieldName: "shared",
      },
    },
    consent: {
      enabled: true,
      label: "I agree to receive updates.",
      required: false,
    },
  });

  const names = [
    deduped.form.emailFieldName,
    deduped.form.firstName.fieldName,
    deduped.form.consentFieldName,
  ];
  expect(new Set(names).size).toBe(3);
  expect(names[0]).toBe("shared");
  expect(names[1]).not.toBe("shared");
  expect(names[2]).not.toBe("shared");
});

test("newsletter round-trips authored alpha colors (TASK-519-05-L04 widening)", () => {
  const normalized = normalizeNewsletterData({
    style: {
      // 8-digit alpha hex (opacity slider emit) + leading-`0` rgba alpha (typed).
      background: "#0812209e",
      buttonBackground: "rgba(8, 17, 31, 0.84)",
      buttonTextColor: "#00000080",
    },
  });

  expect(normalized.style.background).toBe("#0812209e");
  expect(normalized.style.buttonBackground).toBe("rgba(8, 17, 31, 0.84)");
  expect(normalized.style.buttonTextColor).toBe("#00000080");
});

test("newsletter editor preview shows a bound Forms contract without enabling runtime submit", () => {
  const html = renderToString(
    <NewsletterBlock
      renderContext={{ mode: "editor-preview" }}
      data={{
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          mode: "forms-runtime",
          formId: "form-preview",
        },
        resolved: {
          formId: "form-preview",
          formName: "Newsletter preview",
          status: "published",
          submissionAccess: "public",
          fields: [
            {
              id: "field-1",
              type: "email",
              label: "Email",
              name: "email",
              required: true,
              orderIndex: 0,
              settings: {},
            },
            {
              id: "field-2",
              type: "checkbox",
              label: "Consent",
              name: "consent",
              required: false,
              orderIndex: 1,
              settings: {},
            },
          ],
        },
      }}
      variant="inline"
    />
  );

  expect(html).toContain('data-newsletter-submit-ready="true"');
  expect(html).toContain('data-newsletter-submit-interactive="false"');
  expect(html).not.toContain("<form");
  expect(html).not.toContain('action="/forms/form-preview/submissions"');
  expect(html).toContain('role="form"');
  expect(html).toContain('data-newsletter-native-submit="blocked"');
  expect(html).not.toContain('data-nextless-form-runtime="1"');
  expect(html).toContain(
    "Editor preview shows the bound Forms contract. Public runtime injects nonce and bot protection at render time."
  );
});

test("newsletter keeps a scalar variant contract and already stacks inline layouts on mobile", () => {
  const inlineHtml = renderToString(<NewsletterBlock data={newsletterDefaults} variant="inline" />);
  const minimalHtml = renderToString(
    <NewsletterBlock data={newsletterDefaults} variant="minimal" />
  );
  const stackedHtml = renderToString(
    <NewsletterBlock data={newsletterDefaults} variant="stacked" />
  );

  expect(inlineHtml).toContain('data-newsletter-variant="inline"');
  expect(inlineHtml).toContain("flex w-full flex-col gap-3 sm:flex-row sm:items-end");
  expect(minimalHtml).toContain('data-newsletter-variant="minimal"');
  expect(minimalHtml).toContain("flex w-full flex-col gap-2 sm:flex-row sm:items-end");
  expect(stackedHtml).toContain('data-newsletter-variant="stacked"');
  expect(stackedHtml).toContain("flex w-full flex-col gap-3");
  expect(stackedHtml).not.toContain("sm:flex-row");
});

test("newsletter validator accepts bounded fields, runtime binding, and style extensions", () => {
  clearWidgets();
  const widget = createNewsletterWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  registerWidget(widget);

  expect(() =>
    normalizeWidgetBlock({
      id: "newsletter-1",
      type: "newsletter",
      variant: "stacked",
      data: {
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          emailFieldName: "subscriber_email",
          firstName: {
            enabled: true,
            label: "First name",
            placeholder: "Alice",
            fieldName: "first_name",
            required: false,
          },
        },
        stateCopy: {
          loadingMessage: "Sending...",
          successMessage: "Joined.",
          errorMessage: "Try again.",
        },
        submission: {
          mode: "forms-runtime",
          formId: "form-public",
          analyticsEvent: "newsletter_submit",
        },
        optIn: {
          mode: "double",
          confirmationCopy: "Please confirm from your inbox.",
          enforcement: "provider-owned",
        },
        style: {
          spacing: "lg",
          alignment: "center",
          width: "wide",
          background: "#f8fafc",
          textColor: "#111827",
          buttonBackground: "#1d4ed8",
          buttonTextColor: "#ffffff",
        },
        resolved: {
          formId: "form-public",
          formName: "Newsletter form",
          status: "published",
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
              type: "email",
              label: "Email",
              name: "subscriber_email",
              required: true,
              orderIndex: 0,
              settings: {},
            },
          ],
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("newsletter validator rejects unknown nested keys", () => {
  clearWidgets();
  registerWidget(
    createNewsletterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "newsletter-invalid-form",
      type: "newsletter",
      variant: "inline",
      data: {
        ...newsletterDefaults,
        form: {
          ...newsletterDefaults.form,
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "newsletter-invalid-runtime",
      type: "newsletter",
      variant: "inline",
      data: {
        ...newsletterDefaults,
        submission: {
          ...newsletterDefaults.submission,
          extra: "nope",
        },
        optIn: {
          ...newsletterDefaults.optIn,
          extra: "nope",
        },
        style: {
          ...newsletterDefaults.style,
          extra: "#000000",
        },
        resolved: {
          formId: "form-public",
          formName: "Newsletter form",
          status: "published",
          submissionAccess: "public",
          fields: [],
          extra: "nope",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "newsletter-invalid-responsive-override",
      type: "newsletter",
      variant: "inline",
      data: {
        ...newsletterDefaults,
        responsive: {
          mobileVariant: "stacked",
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("newsletter visual editor renders the expanded IA", () => {
  const html = renderToString(
    <NewsletterVisualEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and form structure");
  expect(html).toContain("Form semantics and consent");
  expect(html).toContain("Submission runtime");
  expect(html).toContain("Connection status");
  expect(html).toContain("Colors and emphasis");
  expect(html).toContain("Spacing and alignment");
  expect(html).toContain('data-widget-editor-section="newsletter.visual.variant"');
  expect(html).toContain('data-widget-control-path="style.background"');
  expect(html).toContain("Theme default");
  expect(html).not.toContain('placeholder="var(--color-text)"');
});

test("newsletter wizard and advanced editors reflect the new owner seams", () => {
  const wizardHtml = renderToString(
    <NewsletterWizardEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="minimal"
      onVariantChange={() => undefined}
    />
  );
  const advancedHtml = renderToString(
    <NewsletterAdvancedEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(wizardHtml).toContain("Wizard is a one-time orientation step.");
  expect(wizardHtml).toContain(
    "Description stays saved, but the Minimal variant does not render it."
  );
  expect(wizardHtml).not.toContain("<input");
  expect(advancedHtml).toContain("Signup readiness");
  expect(advancedHtml).toContain("Authoring boundaries");
  expect(advancedHtml).toContain("Use Visual for copy, Form selection");
  expect(advancedHtml).not.toContain("Normalize payload");
  expect(advancedHtml).not.toContain("HTTP method");
});
