// @vitest-environment happy-dom

import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  createNavigationWidget,
  navigationEditorContract,
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

test("navigation exposes the current v2 editor contract for hero-style section ownership", () => {
  const widget = createNavigationWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });

  expect(widget.editorContract).toBe(navigationEditorContract);
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "navigation.visual.variant-structure"
    )?.writablePaths
  ).toEqual(expect.arrayContaining(["linksSource", "menuKey", "variant"]));
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "navigation.visual.navigation-links"
    )?.writablePaths
  ).toEqual(expect.arrayContaining(["behavior.activeLinkMode", "items"]));
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "navigation.visual.cta-right-actions"
    )?.writablePaths
  ).toEqual(expect.arrayContaining(["cta.label", "cta.href"]));
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "navigation.visual.colors-borders-typography"
    )?.writablePaths
  ).toEqual(
    expect.arrayContaining([
      "style.surfaceColor",
      "style.borderColor",
      "style.textColor",
      "style.logoColor",
      "style.linkColor",
      "style.linkHoverColor",
      "style.linkActiveColor",
      "style.borderWidth",
      "style.fontSize",
      "style.fontWeight",
      "style.textTransform",
      "style.letterSpacing",
    ])
  );
  expect(
    widget.editorContract?.sections.find(
      (section) => section.id === "navigation.advanced.layout-token-summary"
    )?.readOnlyPaths
  ).toEqual(
    expect.arrayContaining([
      "layout.alignment",
      "layout.maxWidth",
      "layout.paddingY",
      "layout.itemGap",
    ])
  );
});

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

test("navigation schema accepts resolved empty item lists", () => {
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
      id: "nav-empty-resolved-links",
      type: "navigation",
      variant: "simple",
      data: {
        ...navigationDefaults,
        items: [],
      },
    })
  ).not.toThrow();
});

test("navigation schema rejects unknown nested keys", () => {
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
      id: "nav-invalid-behavior",
      type: "navigation",
      variant: "split",
      data: {
        ...navigationDefaults,
        behavior: {
          ...navigationDefaults.behavior,
          extra: true,
        },
      } as never,
    })
  ).toThrow("widget_schema_invalid");

  expect(() =>
    normalizeWidgetBlock({
      id: "nav-invalid-item",
      type: "navigation",
      variant: "split",
      data: {
        ...navigationDefaults,
        style: {
          ...navigationDefaults.style,
          extra: "#000000",
        },
        items: [
          {
            label: "Home",
            href: "/",
            extra: "nope",
          },
        ],
      } as never,
    })
  ).toThrow("widget_schema_invalid");
});

test("navigation schema rejects unsafe imported style color strings", () => {
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
      id: "nav-unsafe-style-color",
      type: "navigation",
      variant: "simple",
      data: {
        ...navigationDefaults,
        style: {
          ...navigationDefaults.style,
          textColor: "url(javascript:alert(1))",
        },
      },
    })
  ).toThrow("widget_schema_invalid");
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
      { label: "Resolver placeholder", href: "#" },
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
  expect(html).not.toContain("Resolver placeholder");
  expect(html).not.toContain("javascript:alert");
  expect(html).not.toContain("//evil.example");
  expect(html).not.toContain("data:text/html");
});

test("navigation normalizes unsafe imported color values before render", () => {
  const normalized = normalizeNavigationData({
    ...navigationDefaults,
    style: {
      ...navigationDefaults.style,
      surfaceColor: "url(javascript:alert(1))",
      textColor: "var(--color-text)",
      linkColor: "#123abc",
      ctaBorderColor: "rgb(10, 20, 30)",
    },
  });

  expect(normalized.style?.surfaceColor).toBeUndefined();
  expect(normalized.style?.textColor).toBe("var(--color-text)");
  expect(normalized.style?.linkColor).toBe("#123abc");
  expect(normalized.style?.ctaBorderColor).toBe("rgb(10, 20, 30)");

  const html = renderToString(<NavigationBlock data={normalized} variant="with-cta" />);
  expect(html).not.toContain("javascript:");
  expect(html).not.toContain("url(");
  expect(html).toContain("var(--color-text)");
  expect(html).toContain("#123abc");
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

test("navigation public DOM redacts menu keys", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        linksSource: "menu",
        menuKey: "internal-primary-menu",
      }}
      variant="simple"
    />
  );

  expect(html).toContain('data-menu-configured="true"');
  expect(html).not.toContain("data-menu-key");
  expect(html).not.toContain("internal-primary-menu");
});

test("navigation runtime marks duplicate drawer active clones with aria-current", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        items: [{ label: "Docs", href: "/docs" }],
        behavior: {
          ...navigationDefaults.behavior,
          mobileMode: "drawer",
          activeLinkMode: "pathname",
        },
      }}
      variant="simple"
      blockId="drawer-current"
    />
  );
  const navigationWindow = window as Window & { __nextlessNavigationBound?: boolean };

  try {
    navigationWindow.history.pushState({}, "", "http://localhost:3000/docs");
    document.body.innerHTML = html;
    const script = document.querySelector("script")?.textContent;
    expect(script).toContain("__nextlessNavigationBound");

    const runScript = new Function(
      "window",
      "document",
      "HTMLElement",
      "HTMLAnchorElement",
      "HTMLButtonElement",
      "Element",
      script ?? ""
    );
    runScript(
      window,
      document,
      window.HTMLElement,
      window.HTMLAnchorElement,
      window.HTMLButtonElement,
      window.Element
    );

    const activeLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('a[data-navigation-link="1"][href="/docs"]')
    );
    expect(activeLinks).toHaveLength(2);
    expect(activeLinks.map((link) => link.dataset.navigationActive)).toEqual(["true", "true"]);
    expect(activeLinks.map((link) => link.getAttribute("aria-current"))).toEqual(["page", "page"]);
  } finally {
    document.body.innerHTML = "";
    delete navigationWindow.__nextlessNavigationBound;
  }
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

test("navigation image logo clear falls back to text without a broken Coderso image src", () => {
  const normalized = normalizeNavigationData({
    ...navigationDefaults,
    logo: {
      type: "image",
      value: "",
      href: "/",
      alt: "",
      source: "external",
    },
  });

  expect(normalized.logo).toMatchObject({
    type: "image",
    value: "",
  });

  const html = renderToString(<NavigationBlock data={normalized} variant="simple" />);

  expect(html).not.toContain('src="Coderso"');
  expect(html).not.toContain("<img");
  expect(html).toContain('data-navigation-logo-missing-image="true"');
  expect(html).toContain('aria-label="Logo home"');
});

test("navigation keeps cleared saved links hidden without replacing them with starter defaults", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        items: [
          { label: "Docs", href: "" },
          { label: "Pricing", href: "javascript:alert(1)" },
        ],
      }}
      variant="simple"
    />
  );

  expect(html).toContain("Coderso");
  expect(html).not.toContain("Docs");
  expect(html).not.toContain("Pricing");
  expect(html).not.toContain("Home");
  expect(html).not.toContain("About");
  expect(html).not.toContain("javascript:alert");
});

test("navigation renders resolved empty item lists without restoring starter defaults", () => {
  const html = renderToString(
    <NavigationBlock
      data={{
        ...navigationDefaults,
        items: [],
      }}
      variant="simple"
    />
  );

  expect(html).toContain("Coderso");
  expect(html).not.toContain("Home");
  expect(html).not.toContain("About");
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
  expect(withCtaHtml).not.toContain("Primary CTA");
  expect(withCtaHtml).toContain("Set its label and destination in Visual");
  expect(withCtaHtml).not.toContain("pick-media");
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
  expect(html).toContain('data-widget-editor-section="navigation.visual.variant-structure"');
  expect(html).toContain('data-widget-editor-section="navigation.visual.brand-logo"');
  expect(html).toContain('data-widget-editor-section="navigation.visual.navigation-links"');
  expect(html).toContain('data-widget-editor-section="navigation.visual.cta-right-actions"');
  expect(html).toContain('data-widget-editor-section="navigation.visual.mobile-behavior"');
  expect(html).toContain(
    'data-widget-editor-section="navigation.visual.colors-borders-typography"'
  );
  expect(html).toContain('data-widget-editor-section="navigation.visual.surface-runtime-behavior"');
  expect(html).not.toContain("Surface color value");
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

  expect(html).toContain("Layout token summary");
  expect(html).toContain("Runtime behavior summary");
  expect(html).toContain("Configured");
  expect(html).toContain('data-widget-editor-section="navigation.advanced.runtime-summary"');
  expect(html).toContain('data-widget-editor-section="navigation.advanced.layout-token-summary"');
  expect(html).toContain(
    'data-widget-editor-section="navigation.advanced.runtime-behavior-summary"'
  );
  expect(html).toContain("Transparent surface");
  expect(html).toContain("Mobile mode");
  expect(html).toContain("Hide CTA on mobile");
  expect(html).toContain("Active link mode");
  expect(html).toContain("Admin preview runtime");
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
