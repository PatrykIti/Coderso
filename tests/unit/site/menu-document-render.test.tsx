import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  createDefaultMenuBlock,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import { buildMenuDocumentCss } from "../../../core/site/menuDocumentCss";
import {
  SiteHeaderMenuDocumentRender,
  type SiteShellNavigation,
} from "../../../core/site/siteShell";
import type { NavigationItem } from "../../../core/widgets/core/navigation";

const navMeta = (variant?: "link" | "button") => ({
  visibility: "all" as const,
  badge: null,
  description: null,
  icon: null,
  ...(variant ? { variant } : {}),
});

const navigation: SiteShellNavigation = {
  label: "Primary menu",
  items: [
    { label: "Home", href: "/" },
    {
      label: "Services",
      href: "/services",
      children: [{ label: "Consulting", href: "/services/consulting" } as NavigationItem],
    },
    {
      label: "Sign up",
      href: "/signup",
      target: "blank",
      meta: navMeta("button"),
    },
  ],
};

const buildDoc = (): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      // menu-bar layout (frame subset) with a NON-default surface + sticky.
      layout: { surfaceColor: "#0f172a", sticky: true },
      blocks: [
        { ...createDefaultMenuBlock("brand"), id: "blk_brand" },
        // nav-items typography subset with a NON-default link color.
        { id: "blk_nav", type: "nav-items", props: { linkColor: "#ff0000" } },
        { ...createDefaultMenuBlock("cta-button"), id: "blk_cta" },
      ],
    },
  ],
});

test("SiteHeaderMenuDocumentRender golden: menu-bar + brand + nav-items(nesting) + cta-button", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender document={buildDoc()} navigation={navigation} siteName="Acme" />
  );

  // Header carries BOTH the shared shell attribute (reuses the base layout sheet)
  // and the NEW document scope attribute (its own overriding sheet).
  expect(html).toContain('data-site-header="true"');
  expect(html).toContain('data-site-menu-doc="true"');
  expect(html).toContain('class="site-header-inner"');

  // Brand (text mode ⇒ site name link).
  expect(html).toContain('class="site-header-brand"');
  expect(html).toContain(">Acme</a>");

  // nav-items reuses the SiteHeaderNav markup (nav landmark + list + disclosure).
  expect(html).toContain('aria-label="Primary menu"');
  expect(html).toContain('data-site-nav-list="true"');
  expect(html).toContain('data-site-nav-disclosure="true"');
  expect(html).toContain('data-site-nav-link="true" href="/"');

  // Nested item ⇒ a single-depth <details> dropdown group.
  expect(html).toContain('data-site-nav-group="true"');
  expect(html).toContain("<summary>Services</summary>");
  expect(html).toContain('href="/services/consulting"');

  // The cta-button leaf renders through the page block pipeline.
  expect(html).toContain('href="/signup"');
});

test("nav-items honors openInNewTab ⇒ target=_blank rel=noopener noreferrer + button variant", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender document={buildDoc()} navigation={navigation} siteName="Acme" />
  );

  // The Sign up item was mapped with target "blank" + variant "button".
  expect(html).toMatch(/href="\/signup"[^>]*target="_blank"/);
  expect(html).toContain('rel="noopener noreferrer"');
  expect(html).toContain('data-site-nav-variant="button"');

  // Default items carry NO variant marker (byte-identical link affordance).
  expect(html).not.toMatch(/href="\/"[^>]*data-site-nav-variant/);
});

test("menu-drawer section is NOT front-rendered (only the first menu-bar section)", () => {
  const doc = buildDoc();
  doc.sections.push({
    id: "sec_drawer",
    type: "menu-drawer",
    name: "Menu drawer",
    layout: {},
    blocks: [{ id: "blk_drawer_nav", type: "nav-items", props: { linkColor: "#00ff00" } }],
  });
  const html = renderToString(
    <SiteHeaderMenuDocumentRender document={doc} navigation={navigation} siteName="Acme" />
  );
  // Exactly one nav landmark (the menu-bar's), the drawer's nav-items is skipped.
  expect(html.match(/data-site-nav="true"/g)?.length).toBe(1);
});

test("scoped CSS sits under [data-site-menu-doc] and emits only validated values", () => {
  const css = buildMenuDocumentCss(buildDoc());

  // Every rule is scoped under the NEW attribute — never the base shell scope.
  expect(css).toContain('[data-site-menu-doc="true"]');
  expect(css).not.toContain('[data-site-header="true"]');

  // Validated menu-bar layout (surface + sticky) + nav-items typography (link color).
  expect(css).toContain('[data-site-menu-doc="true"]{background:#0f172a');
  expect(css).toContain("position:sticky;top:0;z-index:50");
  expect(css).toContain('[data-site-menu-doc="true"] .site-nav-link{color:#ff0000');
});

test("scoped sheet OVERRIDES the base sheet: same class, distinct later-source scope", () => {
  const css = buildMenuDocumentCss(buildDoc());
  const html = renderToString(
    <SiteHeaderMenuDocumentRender document={buildDoc()} navigation={navigation} siteName="Acme" />
  );

  // The base sheet (buildSiteShellCss, emitted in the head) styles the link under
  // [data-site-header]; the scoped sheet re-styles the SAME .site-nav-link under
  // [data-site-menu-doc]. The rendered header carries BOTH attributes, and the
  // scoped <style> renders inside the header (after the head), so on equal
  // specificity the custom color wins by source order.
  expect(html).toContain('data-site-header="true"');
  expect(html).toContain('data-site-menu-doc="true"');
  expect(css).toContain('[data-site-menu-doc="true"] .site-nav-link{color:#ff0000');
  // The scoped override <style> is inlined in the header markup itself.
  expect(html).toContain('[data-site-menu-doc="true"] .site-nav-link{color:#ff0000');
});
