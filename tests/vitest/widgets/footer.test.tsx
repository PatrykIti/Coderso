import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  FooterAdvancedEditor,
  FooterVisualEditor,
  FooterWizardEditor,
} from "../../../core/admin/ui/widgets/editors/FooterEditors";
import {
  createFooterWidget,
  footerDefaults,
  FooterBlock,
  resolveFooterColumnsForVariant,
  type FooterData,
} from "../../../core/widgets/core/footer";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { WidgetRenderer } from "../../../core/widgets/renderers/widgetRenderer";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import { resolveEditableFooterColumns } from "../../../core/admin/ui/widgets/editors/FooterEditors";

const StubEditor: ComponentType<WidgetEditorProps<FooterData>> = () => null;
const StubUnknownEditor: ComponentType<WidgetEditorProps<Record<string, unknown>>> = () => null;

test("footer renders defaults", () => {
  const html = renderToString(<FooterBlock data={footerDefaults} variant="columns-2" />);

  expect(html).toContain("Company");
  expect(html).toContain("Resources");
  expect(html).toContain("Privacy");
  expect(html).toContain('aria-label="Site footer"');
});

test("footer resolves columns deterministically by variant", () => {
  const expanded = resolveFooterColumnsForVariant(
    [
      {
        title: "Only one",
        links: [{ label: "Home", href: "/" }],
      },
    ],
    "columns-3"
  );
  const minimalColumns = resolveFooterColumnsForVariant(footerDefaults.columns, "minimal");

  expect(expanded).toHaveLength(3);
  expect(expanded[0]?.title).toBe("Only one");
  expect(expanded[2]?.title).toBe("Product");
  expect(minimalColumns).toHaveLength(1);
});

test("footer editor keeps hidden columns while editing active variant", () => {
  const columns = resolveEditableFooterColumns(
    {
      ...footerDefaults,
      columns: [
        { title: "One", links: [] },
        { title: "Two", links: [] },
        { title: "Three", links: [] },
      ],
    },
    "columns-2"
  );

  expect(columns).toHaveLength(3);
  expect(columns[2]?.title).toBe("Three");
});

test("footer widget exposes slot definitions", () => {
  const widget = createFooterWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.slots).toEqual([
    { id: "column-1", label: "Column 1" },
    { id: "column-2", label: "Column 2" },
    { id: "column-3", label: "Column 3" },
    { id: "bottom", label: "Bottom Strip" },
  ]);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("footer schema accepts brand, legal, social, visibility, and target fields", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "footer-1",
      type: "footer",
      variant: "columns-3",
      data: {
        ...footerDefaults,
        brand: {
          logoText: "Coderso",
          tagline: "Build confidently",
          logoUrl: "/media/footer-logo.svg",
          logoAlt: "Coderso logo",
        },
        legal: {
          enabled: true,
          copyright: "© 2026 Coderso",
          privacy: "/privacy",
          privacyLabel: "Privacy policy",
          privacyTarget: "_blank",
          terms: "/terms",
          termsLabel: "Terms of use",
          termsTarget: "_self",
        },
        socialEnabled: true,
        social: [
          { type: "x", href: "https://x.com/coderso" },
          { type: "custom", href: "https://github.com/coderso", label: "Community" },
        ],
        columns: [
          {
            title: "Company",
            links: [{ label: "About", href: "/about", target: "_blank" }],
          },
        ],
        layout: {
          ...footerDefaults.layout,
          paddingX: "8",
          columnBreakpoint: "lg",
        },
        style: {
          ...footerDefaults.style,
          linkHoverColor: "#2563eb",
          linkActiveColor: "var(--color-primary)",
          linkUnderline: "always",
          linkFontWeight: "semibold",
          linkLetterSpacing: "wide",
        },
      },
    })
  ).not.toThrow();
});

test("footer cleared surface and border colors omit background color output", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        style: {},
      }}
      variant="columns-2"
    />
  );

  expect(html).toContain("Company");
  expect(html).not.toContain("background-color:");
});

test("footer renders localized legal labels, brand semantics, and heading markup", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        brand: {
          logoText: "Coderso",
          tagline: "Build confidently with modular content.",
          logoUrl: "/media/footer-logo.svg",
          logoAlt: "Coderso logo",
        },
        legal: {
          ...footerDefaults.legal,
          privacyLabel: "Polityka prywatnosci",
          termsLabel: "Warunki",
        },
      }}
      variant="columns-2"
    />
  );

  expect(html).toContain("Coderso");
  expect(html).toContain("Build confidently with modular content.");
  expect(html).toContain('aria-labelledby="');
  expect(html).toContain('<h3 class="text-xs font-semibold uppercase');
  expect(html).toContain("Polityka prywatnosci");
  expect(html).toContain("Warunki");
  expect(html).toContain('alt="Coderso logo"');
});

test("footer social links render icon buttons with accessible labels and external safety", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        social: [
          { type: "linkedin", href: "https://linkedin.com/company/coderso" },
          { type: "custom", href: "/community", label: "Community" },
        ],
      }}
      variant="columns-2"
    />
  );

  expect(html).toContain('aria-label="LinkedIn (opens in new tab)"');
  expect(html).toContain('title="LinkedIn (opens in new tab)"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("<svg");
  expect(html).not.toContain(">linkedin<");
  expect(html).not.toContain(">twitter<");
  expect(html).toContain('aria-label="Community"');
});

test("footer normalizes unsafe legal, logo, and social hrefs before render", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        brand: {
          logoText: "Coderso",
          logoUrl: "javascript:alert(1)",
        },
        legal: {
          ...footerDefaults.legal,
          privacy: "javascript:alert(1)",
          terms: "/terms",
        },
        social: [
          { type: "x", href: "data:text/html,boom" },
          { type: "github", href: "https://github.com/coderso" },
        ],
      }}
      variant="columns-2"
    />
  );

  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("data:text/html");
  expect(html).not.toContain("<img");
  expect(html).toContain('href="/terms"');
  expect(html).toContain('href="https://github.com/coderso"');
  expect(html).not.toContain(">Privacy<");
});

test("footer renders column and bottom slots", () => {
  clearWidgets();
  registerWidget(
    createFooterWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );
  registerWidget({
    type: "badge",
    title: "Badge",
    description: "Simple marker",
    category: "content",
    variants: [{ id: "default", label: "Default" }],
    schema: { type: "object", additionalProperties: true },
    defaults: { label: "Badge" },
    editor: {
      wizard: StubUnknownEditor,
      visual: StubUnknownEditor,
      advanced: StubUnknownEditor,
    },
    render: ({ data }) => <span>{String((data as { label?: string }).label ?? "Badge")}</span>,
  });

  const html = renderToString(
    <WidgetRenderer
      block={{
        id: "footer-with-slots",
        type: "footer",
        variant: "columns-2",
        data: footerDefaults,
        slots: {
          "column-1": [
            {
              id: "slot-column-1",
              type: "badge",
              data: { label: "Column widget" },
            },
          ],
          bottom: [
            {
              id: "slot-bottom",
              type: "badge",
              data: { label: "Bottom widget" },
            },
          ],
        },
      }}
    />
  );

  expect(html).toContain("Column widget");
  expect(html).toContain("Bottom widget");
});

test("footer minimal variant renders a compact row and hides disabled legal and social strips", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        brand: {
          logoText: "Coderso",
        },
        legal: {
          ...footerDefaults.legal,
          enabled: false,
        },
        socialEnabled: false,
        columns: [
          {
            title: "Company",
            links: [
              { label: "About", href: "/about" },
              { label: "Docs", href: "/docs" },
            ],
          },
          footerDefaults.columns[1]!,
          footerDefaults.columns[2]!,
        ],
      }}
      variant="minimal"
    />
  );

  expect(html).toContain("Coderso");
  expect(html).toContain("About");
  expect(html).toContain("Docs");
  expect(html).not.toContain("<h3");
  expect(html).not.toContain(">Privacy<");
  expect(html).not.toContain('aria-label="Footer social links"');
});

test("footer target and layout controls render bounded runtime output", () => {
  const html = renderToString(
    <FooterBlock
      data={{
        ...footerDefaults,
        columns: [
          {
            title: "Company",
            links: [{ label: "About", href: "/about", target: "_blank" }],
          },
          footerDefaults.columns[1]!,
          footerDefaults.columns[2]!,
        ],
        legal: {
          ...footerDefaults.legal,
          privacyTarget: "_blank",
          termsTarget: "_self",
        },
        layout: {
          ...footerDefaults.layout,
          paddingX: "8",
          columnBreakpoint: "lg",
        },
        style: {
          ...footerDefaults.style,
          linkHoverColor: "#2563eb",
          linkActiveColor: "var(--color-primary)",
          linkUnderline: "always",
          linkFontWeight: "semibold",
          linkLetterSpacing: "wide",
        },
      }}
      variant="columns-2"
    />
  );

  expect(html).toContain("px-8");
  expect(html).toContain("lg:grid-cols-2");
  expect(html).toContain("underline");
  expect(html).toContain("font-semibold");
  expect(html).toContain("tracking-wide");
  expect(html).toContain("--footer-link-hover-color:#2563eb");
  expect(html).toContain("--footer-link-active-color:var(--color-primary)");
  expect(html).toContain('href="/about"');
  expect(html).toContain('target="_blank"');
});

test("footer visual editor renders section-based IA", () => {
  const html = renderToString(
    <FooterVisualEditor
      value={footerDefaults}
      onChange={() => undefined}
      variant="columns-2"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and structure");
  expect(html).toContain("Columns and links");
  expect(html).toContain("Brand and legal");
  expect(html).toContain("Social links and icon style");
  expect(html).toContain("Colors and borders");
  expect(html).toContain("Typography and link styling");
  expect(html).toContain("Slots overview and insertion hints");
});

test("footer advanced editor keeps technical-only scope", () => {
  const html = renderToString(
    <FooterAdvancedEditor
      value={footerDefaults}
      onChange={() => undefined}
      variant="columns-2"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout tokens");
  expect(html).toContain("Horizontal padding");
  expect(html).toContain("Column breakpoint");
  expect(html).not.toContain("Columns and links");
  expect(html).not.toContain("Brand and legal");
});

test("footer wizard keeps quick setup scope", () => {
  const html = renderToString(
    <FooterWizardEditor
      value={footerDefaults}
      onChange={() => undefined}
      variant="columns-2"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Columns quick setup");
  expect(html).toContain("Brand basics");
  expect(html).toContain("Legal basics");
  expect(html).toContain("Social basics");
});
