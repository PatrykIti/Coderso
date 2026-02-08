import type { ComponentType } from "react";
import { expect, test } from "bun:test";
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
  registerWidget(
    createNewsletterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

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

test("newsletter visual renders baseline content and style fields", () => {
  const html = renderToString(
    <NewsletterVisualEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Placeholder");
  expect(html).toContain("Success message");
  expect(html).toContain("Spacing");
  expect(html).toContain("Alignment");
  expect(html).toContain("Background color");
});

test("newsletter advanced renders integration controls", () => {
  const html = renderToString(
    <NewsletterAdvancedEditor
      value={newsletterDefaults}
      onChange={() => undefined}
      variant="inline"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Integration mode");
  expect(html).toContain("Form action URL");
  expect(html).toContain("Webhook ID");
  expect(html).toContain("Consent required");
});
