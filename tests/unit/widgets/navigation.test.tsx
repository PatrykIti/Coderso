import type { ComponentType } from "react";
import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  createNavigationWidget,
  navigationDefaults,
  NavigationBlock,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import {
  NavigationAdvancedEditor,
  NavigationVisualEditor,
  NavigationWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NavigationEditors";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<NavigationData>> = () => null;

test("navigation renders defaults", () => {
  const html = renderToString(
    <NavigationBlock data={navigationDefaults} variant="simple" />
  );

  expect(html).toContain("Nextless");
  expect(html).toContain("Home");
  expect(html).toContain("About");
});

test("navigation reflects sticky and transparent behavior in runtime output", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        behavior: {
          sticky: true,
          transparent: true,
          collapseOnScroll: true,
          mobileMode: "drawer",
        },
        style: {
          surfaceColor: "#ffffff",
          borderColor: "#123456",
          borderWidth: "2",
          linkColor: "#334155",
          ctaBackgroundColor: "#1d4ed8",
          ctaTextColor: "#ffffff",
          fontSize: "lg",
          textTransform: "uppercase",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain("sticky top-0 z-40");
  expect(html).toContain("data-mobile-mode=\"drawer\"");
  expect(html).toContain("data-collapse-on-scroll=\"true\"");
  expect(html).toContain("border-bottom-width:2px");
  expect(html).toContain("text-lg");
  expect(html).toContain("uppercase");
  expect(html).toContain("Menu");
});

test("navigation schema accepts submenu children and image logo metadata", () => {
  clearWidgets();
  registerWidget(
    createNavigationWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "nav-with-children",
      type: "navigation",
      variant: "split",
      data: {
        ...navigationDefaults,
        logo: {
          type: "image",
          value: "https://cdn.example.com/logo.png",
          alt: "Nextless",
          href: "/",
          source: "library",
          assetId: "asset-logo-1",
        },
        linksSource: "menu",
        menuKey: "main",
        style: {
          textColor: "#0f172a",
          borderColor: "#e2e8f0",
          borderWidth: "1",
          fontWeight: "semibold",
        },
        layout: {
          alignment: "center",
          maxWidth: "7xl",
          paddingY: "5",
          itemGap: "6",
        },
        behavior: {
          sticky: true,
          transparent: false,
          collapseOnScroll: true,
          mobileMode: "minimal",
          hideCtaOnMobile: true,
        },
        items: [
          {
            label: "Products",
            href: "/products",
            children: [
              { label: "CMS", href: "/products/cms" },
              { label: "Commerce", href: "/products/commerce" },
            ],
          },
          { label: "Pricing", href: "/pricing" },
        ],
      },
    })
  ).not.toThrow();
});

test("navigation widget exposes right slot and visual variant ownership", () => {
  const widget = createNavigationWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.slots).toEqual([{ id: "right", label: "Right Actions" }]);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBeTrue();
});

test("navigation wizard shows CTA fields only for CTA variants", () => {
  const simpleHtml = renderToString(
    <NavigationWizardEditor
      value={navigationDefaults}
      onChange={() => undefined}
      variant="simple"
      onVariantChange={() => undefined}
    />
  );
  const withCtaHtml = renderToString(
    <NavigationWizardEditor
      value={navigationDefaults}
      onChange={() => undefined}
      variant="with-cta"
      onVariantChange={() => undefined}
    />
  );

  expect(simpleHtml).toContain("Simple variant hides CTA in runtime output.");
  expect(simpleHtml).not.toContain("Primary CTA");
  expect(withCtaHtml).toContain("Primary CTA");
});

test("navigation visual editor renders section-based IA", () => {
  const html = renderToString(
    <NavigationVisualEditor
      value={navigationDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Variant and Structure");
  expect(html).toContain("Brand and Logo");
  expect(html).toContain("Navigation Links");
  expect(html).toContain("CTA and Right Actions");
  expect(html).toContain("Mobile Behavior");
  expect(html).toContain("Colors, Borders, Typography");
  expect(html).toContain("Surface and Runtime Behavior");
});

test("navigation advanced editor keeps technical-only controls", () => {
  const html = renderToString(
    <NavigationAdvancedEditor
      value={navigationDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Layout Tokens");
  expect(html).toContain("Runtime Behavior");
  expect(html).not.toContain("Navigation Links");
  expect(html).not.toContain("CTA and Right Actions");
});
