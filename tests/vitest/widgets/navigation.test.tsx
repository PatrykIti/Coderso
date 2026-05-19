import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  createNavigationWidget,
  navigationDefaults,
  normalizeNavigationData,
  NavigationBlock,
  type NavigationData,
} from "../../../core/widgets/core/navigation";
import {
  buildMenuSelectionPatch,
  mapMenuNodesToNavigationItems,
  NavigationAdvancedEditor,
  NavigationVisualEditor,
  NavigationWizardEditor,
} from "../../../core/admin/ui/widgets/editors/NavigationEditors";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";
import type { MenuItemNode } from "../../../core/admin/services/menusClient";

const StubEditor: ComponentType<WidgetEditorProps<NavigationData>> = () => null;

test("navigation renders defaults", () => {
  const html = renderToString(<NavigationBlock data={navigationDefaults} variant="simple" />);

  expect(html).toContain("Coderso");
  expect(html).toContain("Home");
  expect(html).toContain("About");
  expect(html).toContain("justify-end");
  expect(html).toContain('aria-label="Primary navigation"');
  expect(html).toContain('href="/"');
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
          activeLinkMode: "pathname",
        },
        style: {
          surfaceColor: "#ffffff",
          borderColor: "#123456",
          borderWidth: "2",
          linkColor: "#334155",
          linkHoverColor: "#0f172a",
          linkActiveColor: "#1d4ed8",
          ctaBackgroundColor: "#1d4ed8",
          ctaTextColor: "#ffffff",
          fontSize: "lg",
          textTransform: "uppercase",
          shadow: "md",
          backdropBlur: "sm",
        },
      }}
      variant="split"
    />
  );

  expect(html).toContain("sticky top-0 z-40");
  expect(html).toContain('data-navigation-widget="1"');
  expect(html).toContain('data-mobile-mode="drawer"');
  expect(html).toContain('data-collapse-on-scroll="true"');
  expect(html).toContain('data-navigation-active-mode="pathname"');
  expect(html).toContain("border-bottom-width:2px");
  expect(html).toContain("text-lg");
  expect(html).toContain("uppercase");
  expect(html).toContain("Menu");
  expect(html).toContain("data-navigation-mobile-toggle");
  expect(html).toContain("data-navigation-mobile-panel");
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('aria-controls="navigation-mobile-panel"');
  expect(html).toContain("shadow-md");
  expect(html).toContain("backdrop-blur-sm");
});

test("navigation renders bounded visual-token classes, variables, and dropdown direction markers", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        items: [
          {
            label: "Docs",
            href: "/docs",
            children: [{ label: "API", href: "/docs/api" }],
          },
        ],
        style: {
          linkHoverColor: "#112233",
          linkActiveColor: "#334455",
          linkUnderline: "always",
          letterSpacing: "wider",
          dropdownDirection: "top",
          motion: "standard",
        },
      }}
      variant="simple"
      blockId="tokens"
    />
  );

  expect(html).toContain("--navigation-link-hover-color:#112233");
  expect(html).toContain("--navigation-link-active-color:#334455");
  expect(html).toContain("tracking-wider");
  expect(html).toContain("underline underline-offset-4");
  expect(html).toContain("duration-200");
  expect(html).toContain('data-navigation-direction="top"');
  expect(html).toContain('data-navigation-position="top"');
});

test("navigation cleared surface and CTA background omit background styles", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        behavior: {
          ...navigationDefaults.behavior,
          transparent: false,
        },
        style: {},
      }}
      variant="split"
    />
  );

  expect(html).toContain("Coderso");
  expect(html).toContain("background-color:var(--color-bg)");
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
          alt: "Coderso",
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

test("navigation schema accepts pages links source", () => {
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
      id: "nav-pages-source",
      type: "navigation",
      variant: "simple",
      data: {
        ...navigationDefaults,
        linksSource: "pages",
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
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
});

test("navigation normalizes unsafe item, child, CTA, and logo hrefs before render", () => {
  const normalized = normalizeNavigationData({
    ...navigationDefaults,
    logo: {
      ...navigationDefaults.logo,
      href: "javascript:alert(1)",
    },
    items: [
      { label: "Safe", href: "/safe" },
      {
        label: "Unsafe",
        href: "javascript:alert(2)",
        target: "blank",
        children: [{ label: "Child unsafe", href: "//evil.example", target: "blank" }],
      },
    ],
    cta: {
      label: "Start",
      href: "data:text/html,boom",
    },
  });

  expect(normalized.logo.href).toBe("/");
  expect(normalized.items).toEqual([{ label: "Safe", href: "/safe", target: "self" }]);
  expect(normalized.cta).toBeUndefined();

  const html = renderToString(<NavigationBlock data={normalized} variant="with-cta" />);
  expect(html).toContain('href="/safe"');
  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("//evil.example");
  expect(html).not.toContain("data:text/html");
});

test("navigation minimal mode skips the mobile drawer toggle and panel", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        cta: undefined,
        behavior: {
          ...navigationDefaults.behavior,
          mobileMode: "minimal",
        },
      }}
      variant="simple"
      blockId="panel"
    />
  );

  expect(html).not.toContain("data-navigation-mobile-toggle");
  expect(html).not.toContain("data-navigation-mobile-panel");
});

test("navigation renders metadata, target rel, and drawer-only mobile CTA contract", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        items: [
          {
            label: "Docs",
            href: "/docs",
            target: "blank",
            meta: {
              visibility: "all",
              badge: { label: "New", tone: "accent" },
              description: "Latest writing",
              icon: "spark",
            },
            children: [
              {
                label: "API",
                href: "/docs/api",
                meta: {
                  visibility: "all",
                  badge: null,
                  description: "Reference",
                  icon: "api",
                },
              },
            ],
          },
        ],
        behavior: {
          ...navigationDefaults.behavior,
          mobileMode: "drawer",
        },
        style: {
          ...navigationDefaults.style,
          logoHeight: "lg",
          ctaBorderRadius: "full",
          ctaSeparator: "line",
        },
      }}
      variant="with-cta"
      blockId="meta"
    />
  );

  expect(html).toContain("Latest writing");
  expect(html).toContain("spark");
  expect(html).toContain("New");
  expect(html).toContain("Reference");
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain("rounded-full");
  expect(html).toContain("border-l");
  expect(html).toContain("h-8");
  expect(html).toContain('data-navigation-submenu-toggle="1"');
});

test("navigation injects submenu runtime in expanded mode and uses image alt for the logo link name", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        logo: {
          type: "image",
          value: "https://cdn.example.com/logo.png",
          alt: "Northwind",
          href: "/brand",
          source: "external",
        },
        items: [
          {
            label: "Docs",
            href: "/docs",
            children: [{ label: "API", href: "/docs/api" }],
          },
        ],
        behavior: {
          ...navigationDefaults.behavior,
          mobileMode: "expanded",
          collapseOnScroll: false,
          activeLinkMode: "none",
        },
      }}
      variant="simple"
      blockId="submenu"
    />
  );

  expect(html).toContain('aria-label="Northwind home"');
  expect(html).toContain('data-navigation-submenu-toggle="1"');
  expect(html).toContain("__nextlessNavigationBound");
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

test("navigation maps selected menu nodes to widget items", () => {
  const nodes: MenuItemNode[] = [
    {
      id: "item-1",
      label: "Home",
      href: "/",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      children: [],
    },
    {
      id: "item-2",
      label: "Products",
      href: "/products",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      children: [
        {
          id: "item-2-1",
          label: "CMS",
          href: null,
          pageId: "page-cms",
          parentId: "item-2",
          orderIndex: 0,
          children: [],
        },
      ],
    },
  ];

  const mapped = mapMenuNodesToNavigationItems(nodes, new Map([["page-cms", "products/cms/"]]));

  expect(mapped).toEqual([
    {
      label: "Home",
      href: "/",
      meta: {
        visibility: "all",
        badge: null,
        description: null,
        icon: null,
      },
      children: undefined,
    },
    {
      label: "Products",
      href: "/products",
      meta: {
        visibility: "all",
        badge: null,
        description: null,
        icon: null,
      },
      children: [
        {
          label: "CMS",
          href: "/products/cms",
          meta: {
            visibility: "all",
            badge: null,
            description: null,
            icon: null,
          },
        },
      ],
    },
  ]);
});

test("navigation menu selection patch keeps menu id with synced items", () => {
  const items = [
    { label: "Home", href: "/" },
    { label: "About", href: "/about" },
  ];
  const patch = buildMenuSelectionPatch("menu-main", items);

  expect(patch).toEqual({
    menuKey: "menu-main",
    items,
  });
});
