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
        },
      }}
      variant="simple"
    />
  );

  expect(html).toContain("sticky top-0 z-40");
  expect(html).toContain("bg-transparent");
  expect(html).toContain("data-collapse-on-scroll=\"true\"");
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

test("navigation visual editor clarifies wizard vs visual responsibilities", () => {
  const html = renderToString(
    <NavigationVisualEditor
      value={navigationDefaults}
      onChange={() => undefined}
      variant="split"
      onVariantChange={() => undefined}
    />
  );

  expect(html).toContain("Visual mode focuses on runtime look and behavior.");
  expect(html).toContain("CTA content is configured in Wizard and rendered on the right side.");
});
