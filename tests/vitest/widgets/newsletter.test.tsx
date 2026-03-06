import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  NewsletterAdvancedEditor,
  NewsletterVisualEditor,
  NewsletterWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NewsletterEditors";
import {
  NewsletterBlock,
  createNewsletterWidget,
  newsletterDefaults,
  normalizeNewsletterData,
  type NewsletterData,
} from "../../../core/widgets/core/newsletter";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<NewsletterData>> = () => null;

test("newsletter renders defaults", () => {
  const html = renderToString(
    <NewsletterBlock data={newsletterDefaults} variant="inline" />
  );

  expect(html).toContain(newsletterDefaults.title ?? "");
  expect(html).toContain('data-newsletter-variant="inline"');
  expect(html).toContain('data-newsletter-spacing="md"');
});

test("newsletter minimal variant hides description", () => {
  const html = renderToString(
    <NewsletterBlock data={newsletterDefaults} variant="minimal" />
  );

  expect(html).toContain('data-newsletter-variant="minimal"');
  expect(html).not.toContain(newsletterDefaults.description ?? "");
});

test("newsletter normalization resolves integration mode and safe defaults", () => {
  const normalized = normalizeNewsletterData({
    submit: { label: "" },
    integration: { webhookId: "hook_123" },
  });

  expect(normalized.submit?.label).toBe(newsletterDefaults.submit?.label);
  expect(normalized.integration?.mode).toBe("webhook");
  expect(normalized.consent?.required).toBe(false);
  expect(normalized.style?.spacing).toBe("md");
});

test("newsletter validator accepts expanded fields", () => {
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
        title: "Stay informed",
        description: "Product updates once a week.",
        placeholder: "mail@example.com",
        consent: {
          enabled: true,
          label: "I accept the newsletter policy.",
          required: true,
        },
        submit: {
          label: "Join",
          successMessage: "You are in!",
        },
        integration: {
          mode: "webhook",
          webhookId: "webhook_newsletter_signup",
          actionUrl: "",
        },
        style: {
          spacing: "lg",
          alignment: "center",
          background: "#f8fafc",
        },
      },
    })
  ).not.toThrow();
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("newsletter validator rejects invalid variant", () => {
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
      id: "newsletter-2",
      type: "newsletter",
      variant: "unknown",
      data: newsletterDefaults,
    })
  ).toThrow("widget_invalid_variant");
});

test("newsletter wizard renders onboarding flow fields", () => {
  const html = renderToString(
    <NewsletterWizardEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Newsletter style");
  expect(html).toContain("Title");
  expect(html).toContain("Description");
  expect(html).toContain("Button label");
  expect(html).toContain("Consent checkbox");
});

test("newsletter visual renders section-based IA", () => {
  const html = renderToString(
    <NewsletterVisualEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and form structure");
  expect(html).toContain("Content and copy");
  expect(html).toContain("Consent and submit behavior");
  expect(html).toContain("Integration target");
  expect(html).toContain("Colors and emphasis");
  expect(html).toContain("Spacing and alignment");
});

test("newsletter visual conditionally renders integration fields", () => {
  const webhookHtml = renderToString(
    <NewsletterVisualEditor
      value={{
        ...newsletterDefaults,
        integration: {
          mode: "webhook",
          webhookId: "webhook_newsletter_signup",
          actionUrl: "",
        },
      }}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );
  const urlHtml = renderToString(
    <NewsletterVisualEditor
      value={{
        ...newsletterDefaults,
        integration: {
          mode: "action-url",
          actionUrl: "https://example.com/subscribe",
          webhookId: "",
        },
      }}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(webhookHtml).toContain("Webhook ID");
  expect(webhookHtml).not.toContain("Form action URL");
  expect(urlHtml).toContain("Form action URL");
  expect(urlHtml).not.toContain("Webhook ID");
});

test("newsletter advanced keeps technical-only scope", () => {
  const html = renderToString(
    <NewsletterAdvancedEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout tokens");
  expect(html).toContain("Raw integration metadata");
  expect(html).toContain("Normalization and fallback");
  expect(html).not.toContain("Content and copy");
});
