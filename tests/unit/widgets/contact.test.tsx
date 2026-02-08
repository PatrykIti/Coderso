import type { ComponentType } from "react";
import { expect, test } from "bun:test";
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
  normalizeContactData,
  type ContactData,
} from "../../../core/widgets/core/contact";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ContactData>> = () => null;

test("contact renders defaults", () => {
  const html = renderToString(
    <ContactBlock data={contactDefaults} variant="form-left" />
  );

  expect(html).toContain('data-contact-variant="form-left"');
  expect(html).toContain("Phone:");
  expect(html).toContain("+1 555 123 456");
  expect(html).toContain("Email:");
  expect(html).toContain("hello@example.com");
  expect(html).toContain("Send message");
  expect(html).toContain('data-contact-field="name"');
});

test("contact form-right variant renders deterministic ordering and map", () => {
  const html = renderToString(
    <ContactBlock
      data={{
        ...contactDefaults,
        map: {
          enabled: true,
          embedUrl: "https://maps.google.com/?q=Warsaw&output=embed",
        },
      }}
      variant="form-right"
    />
  );

  expect(html).toContain('data-contact-variant="form-right"');
  expect(html).toContain('data-contact-map="true"');
  expect(html).toContain("Contact map");
  expect(html).toContain("md:order-2");
});

test("contact minimal variant hides form", () => {
  const html = renderToString(
    <ContactBlock data={contactDefaults} variant="minimal" />
  );

  expect(html).toContain('data-contact-variant="minimal"');
  expect(html).not.toContain('data-contact-field="name"');
  expect(html).toContain("Phone:");
  expect(html).toContain("+1 555 123 456");
});

test("contact normalization keeps allowed fields and required subset", () => {
  const normalized = normalizeContactData({
    form: {
      fields: ["name", "email", "name", "unknown" as never],
      required: ["email", "message", "invalid" as never],
      submitLabel: "",
    },
    style: {
      spacing: "weird" as never,
      columns: "strange" as never,
      borderWidth: "9" as never,
    },
    map: {
      enabled: true,
      embedUrl: "https://maps.google.com/",
    },
  });

  expect(normalized.form?.fields).toEqual(["name", "email"]);
  expect(normalized.form?.required).toEqual(["email"]);
  expect(normalized.form?.submitLabel).toBe(contactDefaults.form?.submitLabel);
  expect(normalized.style?.spacing).toBe("md");
  expect(normalized.style?.columns).toBe("two");
  expect(normalized.style?.borderWidth).toBe("1");
});

test("contact validator accepts expanded model fields", () => {
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
        form: {
          fields: ["name", "email", "message"],
          required: ["email", "message"],
          submitLabel: "Send",
        },
        contact: {
          phone: "+48 500 100 200",
          email: "support@example.com",
          address: "Marszalkowska 1",
          hours: "Mon-Fri 8-16",
        },
        map: {
          enabled: true,
          embedUrl: "https://maps.google.com/?q=Warsaw&output=embed",
        },
        style: {
          spacing: "lg",
          background: "#f8fafc",
          columns: "two",
          surfaceColor: "#ffffff",
          borderColor: "#cbd5e1",
          borderWidth: "2",
        },
      },
    })
  ).not.toThrow();
  const widget = createContactWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBeTrue();
});

test("contact validator rejects unsupported form field", () => {
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
      id: "contact-2",
      type: "contact",
      variant: "form-left",
      data: {
        form: {
          fields: ["name", "email", "custom"],
          required: ["email"],
          submitLabel: "Send",
        },
      },
    })
  ).toThrow("widget_schema_invalid");
});

test("contact wizard renders onboarding fields", () => {
  const html = renderToString(
    <ContactWizardEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Contact layout");
  expect(html).toContain("Form fields");
  expect(html).toContain("Contact details");
  expect(html).toContain("Submit label");
});

test("contact visual renders section-based IA", () => {
  const html = renderToString(
    <ContactVisualEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and layout structure");
  expect(html).toContain("Form fields and required rules");
  expect(html).toContain("Contact details and business info");
  expect(html).toContain("Map source and display behavior");
  expect(html).toContain("Colors, borders, and surface styling");
  expect(html).toContain("Spacing and columns");
});

test("contact advanced keeps technical-only scope", () => {
  const html = renderToString(
    <ContactAdvancedEditor
      value={contactDefaults}
      onChange={() => undefined}
      variant="form-left"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Map source and runtime metadata");
  expect(html).toContain("Normalization and fallback controls");
  expect(html).toContain("Runtime diagnostics snapshot");
  expect(html).not.toContain("Contact details and business info");
});
