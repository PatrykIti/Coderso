import { expect, test } from "bun:test";
import { renderToString } from "react-dom/server";

import {
  MENU_DOCUMENT_SCHEMA_VERSION,
  createDefaultMenuBlock,
  type MenuDocumentV2,
} from "../../../core/services/menus/menuDocumentV2";
import {
  buildMenuDocumentCss,
  buildMenuDocumentPreviewCss,
} from "../../../core/site/menuDocumentCss";
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

// --- TASK-501-02: per-device emission, orientation, visibility ---------------

const SCOPE = '[data-site-menu-doc="true"]';

// Frozen pre-TASK-501 emission for `buildDoc()` — the byte-identity guard.
// Captured from the shipped TASK-499-04 builders BEFORE the responsive work.
const GOLDEN_BASE_RULES = [
  `${SCOPE}{background:#0f172a;border-bottom:1px solid rgba(15,23,42,.08);position:sticky;top:0;z-index:50}`,
  `${SCOPE} .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px;max-width:1080px;padding:12px 24px}`,
  `${SCOPE} .site-nav-list{gap:4px}`,
  `${SCOPE} .site-nav-link{color:#ff0000}`,
  `${SCOPE} .site-nav-link:hover,${SCOPE} .site-nav-link:focus-visible,${SCOPE} .site-nav-group>summary:hover,${SCOPE} .site-nav-group>summary:focus-visible{background:rgba(15,23,42,.06)}`,
  `${SCOPE} .site-nav-group>summary{color:#ff0000}`,
];
const GOLDEN_DESKTOP_RULES = [`${SCOPE} .site-nav-sublist{top:100%;bottom:auto}`];
const GOLDEN_MOBILE_RULES = [
  `${SCOPE} .site-nav-disclosure{display:block}`,
  `${SCOPE} .site-nav-list{display:none}`,
  `${SCOPE} .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`,
];
const GOLDEN_STRUCT_BASE = [
  `${SCOPE} .site-header-brand{font-weight:600;color:inherit;text-decoration:none}`,
  `${SCOPE} .site-nav summary{cursor:pointer;list-style:none}`,
  `${SCOPE} .site-nav summary::-webkit-details-marker{display:none}`,
  `${SCOPE} .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;list-style:none;margin:0;padding:0}`,
  `${SCOPE} .site-nav-item{position:relative}`,
  `${SCOPE} .site-nav-link{display:block;padding:8px 12px;border-radius:6px;text-decoration:none}`,
  `${SCOPE} .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px}`,
  `${SCOPE} .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}`,
  `${SCOPE} .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}`,
  `${SCOPE} .site-nav-disclosure{display:none}`,
  `${SCOPE} .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}`,
];
const GOLDEN_FRONT_CSS = [
  ...GOLDEN_BASE_RULES,
  "@media (min-width: 640px){",
  ...GOLDEN_DESKTOP_RULES,
  "}",
  "@media (max-width: 639px){",
  ...GOLDEN_MOBILE_RULES,
  "}",
].join("\n");
const GOLDEN_PREVIEW_DESKTOP_CSS = [
  ...GOLDEN_STRUCT_BASE,
  `${SCOPE} .site-nav-sublist{position:absolute;left:0;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}`,
  ...GOLDEN_BASE_RULES,
  ...GOLDEN_DESKTOP_RULES,
].join("\n");
const GOLDEN_PREVIEW_MOBILE_CSS = [
  ...GOLDEN_STRUCT_BASE,
  `${SCOPE} .site-nav{width:100%}`,
  `${SCOPE} .site-nav-sublist{padding-left:16px}`,
  ...GOLDEN_BASE_RULES,
  ...GOLDEN_MOBILE_RULES,
].join("\n");

// Front-sheet branch slicers (base rules / desktop @media / mobile @media).
const baseBranchOf = (css: string) => css.slice(0, css.indexOf("@media (min-width:"));
const desktopBranchOf = (css: string) =>
  css.slice(css.indexOf("@media (min-width:"), css.indexOf("@media (max-width:"));
const mobileBranchOf = (css: string) => css.slice(css.indexOf("@media (max-width:"));

const hideRuleFor = (id: string) =>
  `${SCOPE} [data-menu-block-id="${id}"],${SCOPE} [data-block-id="${id}"]{display:none}`;

const renderDoc = (doc: MenuDocumentV2) =>
  renderToString(
    <SiteHeaderMenuDocumentRender document={doc} navigation={navigation} siteName="Acme" />
  );

test("TASK-501-02 golden: a doc with NO overrides emits byte-identical CSS to pre-501", () => {
  expect(buildMenuDocumentCss(buildDoc())).toBe(GOLDEN_FRONT_CSS);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "desktop")).toBe(GOLDEN_PREVIEW_DESKTOP_CSS);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "tablet")).toBe(GOLDEN_PREVIEW_DESKTOP_CSS);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "mobile")).toBe(GOLDEN_PREVIEW_MOBILE_CSS);
});

test("mobile delta: overridden groups re-emit with mobile values AFTER the mobileMode rules", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = {
    mobile: {
      layout: { paddingY: 4 },
      navProps: { itemGap: 12, linkColor: "#00ff00" },
    },
  };
  const css = buildMenuDocumentCss(doc);
  const base = baseBranchOf(css);
  const desktop = desktopBranchOf(css);
  const mobile = mobileBranchOf(css);

  // Group 2 (inner) total delta: only justify-content + padding, no structural part.
  expect(mobile).toContain(
    `${SCOPE} .site-header-inner{justify-content:space-between;padding:4px 24px}`
  );
  // Group 3 (navGap) delta.
  expect(mobile).toContain(`${SCOPE} .site-nav-list{gap:12px}`);
  // Group 5 (link) TOTAL delta with neutral typography values.
  expect(mobile).toContain(
    `${SCOPE} .site-nav-link{color:#00ff00;font-size:inherit;font-weight:inherit;text-transform:none}`
  );
  // Delta rules are emitted AFTER the mobileMode disclosure rules (source order win).
  expect(mobile.indexOf(`${SCOPE} .site-nav-disclosure{display:block}`)).toBeLessThan(
    mobile.indexOf(`${SCOPE} .site-nav-list{gap:12px}`)
  );
  // Base/desktop branches carry only base values.
  expect(base).toContain(`${SCOPE} .site-nav-list{gap:4px}`);
  expect(base).toContain(`${SCOPE} .site-nav-link{color:#ff0000}`);
  expect(base).not.toContain("#00ff00");
  expect(desktop).not.toContain("#00ff00");
  // Canvas mobile flatten carries the same delta after the base rules.
  const preview = buildMenuDocumentPreviewCss(doc, "mobile");
  expect(preview).toContain(`${SCOPE} .site-nav-list{gap:12px}`);
  expect(preview.indexOf(`${SCOPE} .site-nav-list{gap:4px}`)).toBeLessThan(
    preview.indexOf(`${SCOPE} .site-nav-list{gap:12px}`)
  );
});

test("an override EQUAL to the base emits no delta rule (byte-identical sheet)", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = {
    mobile: { layout: { sticky: true }, navProps: { linkColor: "#ff0000" } },
  };
  // Legal state (no auto-remove-on-equality) — resolved diff is empty.
  expect(buildMenuDocumentCss(doc)).toBe(GOLDEN_FRONT_CSS);
  expect(buildMenuDocumentPreviewCss(doc, "mobile")).toBe(GOLDEN_PREVIEW_MOBILE_CSS);
});

test("revert semantics: mobile overrides can UNDO base-emitted declarations", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[1] = {
    id: "blk_nav",
    type: "nav-items",
    props: { linkColor: "#ff0000", orientation: "vertical" },
  };
  doc.sections[0]!.responsive = {
    mobile: { layout: { sticky: false }, navProps: { orientation: "horizontal" } },
  };
  const css = buildMenuDocumentCss(doc);
  // Base is vertical…
  expect(baseBranchOf(css)).toContain(
    `${SCOPE} .site-nav-list{flex-direction:column;align-items:stretch}`
  );
  // …the mobile horizontal override emits the explicit row revert…
  expect(mobileBranchOf(css)).toContain(
    `${SCOPE} .site-nav-list{flex-direction:row;align-items:center}`
  );
  // …and sticky:false re-emits the headerFrame group with position:static.
  expect(mobileBranchOf(css)).toContain(
    `${SCOPE}{background:#0f172a;border-bottom:1px solid rgba(15,23,42,.08);box-shadow:none;position:static}`
  );
});

test("orientation: vertical stacks the nav list in base rules; default emits NOTHING", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[1] = {
    id: "blk_nav",
    type: "nav-items",
    props: { orientation: "vertical" },
  };
  const verticalRule = `${SCOPE} .site-nav-list{flex-direction:column;align-items:stretch}`;
  // Front base rules + canvas flatten on BOTH devices carry the vertical rule.
  expect(baseBranchOf(buildMenuDocumentCss(doc))).toContain(verticalRule);
  expect(buildMenuDocumentPreviewCss(doc, "desktop")).toContain(verticalRule);
  expect(buildMenuDocumentPreviewCss(doc, "mobile")).toContain(verticalRule);
  // Default/absent orientation: the orientation rule is absent from the WHOLE
  // sheet (the mobileMode disclosure-open rule legitimately contains the bare
  // `flex-direction:column` substring under a different selector).
  const orientationRuleStart = ".site-nav-list{flex-direction:column";
  expect(buildMenuDocumentCss(buildDoc())).not.toContain(orientationRuleStart);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "desktop")).not.toContain(orientationRuleStart);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "mobile")).not.toContain(orientationRuleStart);
});

test("mobileMode override: mobile-resolved 'inline' emits the inline pair, not disclosure", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = { mobile: { navProps: { mobileMode: "inline" } } };
  const mobile = mobileBranchOf(buildMenuDocumentCss(doc));
  expect(mobile).toContain(`${SCOPE} .site-nav-disclosure{display:none}`);
  expect(mobile).toContain(`${SCOPE} .site-nav-list{display:flex}`);
  expect(mobile).not.toContain(`${SCOPE} .site-nav-disclosure{display:block}`);
  expect(mobile).not.toContain(`${SCOPE} .site-nav-list{display:none}`);
});

test("visibility hide-on-mobile: dual-selector display:none in the mobile branch only", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[2] = {
    ...doc.sections[0]!.blocks[2]!,
    responsive: { mobile: { visibility: { visible: false } } },
  };
  const css = buildMenuDocumentCss(doc);
  expect(mobileBranchOf(css)).toContain(hideRuleFor("blk_cta"));
  expect(desktopBranchOf(css)).not.toContain(hideRuleFor("blk_cta"));
  expect(baseBranchOf(css)).not.toContain(hideRuleFor("blk_cta"));
  // Canvas parity: mobile flatten carries the hide rule, desktop does not.
  expect(buildMenuDocumentPreviewCss(doc, "mobile")).toContain(hideRuleFor("blk_cta"));
  expect(buildMenuDocumentPreviewCss(doc, "desktop")).not.toContain(hideRuleFor("blk_cta"));
  // The block stays in the DOM (CSS owns the gating).
  expect(renderDoc(doc)).toContain('data-block-id="blk_cta"');
});

test("visibility show-only-on-mobile: desktop-branch hide rule + frame IS rendered", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[2] = {
    ...doc.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: { mobile: { visibility: { visible: true } } },
  } as (typeof doc.sections)[0]["blocks"][number];
  const css = buildMenuDocumentCss(doc);
  expect(desktopBranchOf(css)).toContain(hideRuleFor("blk_cta"));
  expect(mobileBranchOf(css)).not.toContain(hideRuleFor("blk_cta"));
  // The leaf frame renders despite flat visible:false — the DESKTOP branch
  // hide rule keeps it invisible >=640px; PageBlockFrame's data-block-id is
  // the CSS hook.
  expect(renderDoc(doc)).toContain('data-block-id="blk_cta"');
});

test("visibility on NEITHER device: no markup, no hide rule", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[2] = {
    ...doc.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: { mobile: { visibility: { visible: false } } },
  } as (typeof doc.sections)[0]["blocks"][number];
  expect(renderDoc(doc)).not.toContain("blk_cta");
  expect(buildMenuDocumentCss(doc)).not.toContain("blk_cta");
  expect(buildMenuDocumentPreviewCss(doc, "mobile")).not.toContain("blk_cta");
});

test("flat leaf visibility WITHOUT a responsive record stays render-time gated (unchanged)", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[2] = {
    ...doc.sections[0]!.blocks[2]!,
    visibility: { visible: false },
  } as (typeof doc.sections)[0]["blocks"][number];
  // Legacy semantics: the frame skips, and no hide rule is emitted.
  expect(renderDoc(doc)).not.toContain('data-block-id="blk_cta"');
  expect(buildMenuDocumentCss(doc)).toBe(GOLDEN_FRONT_CSS);
});

test("visibility selectors are id-escaped and every comma-list member is doc-scoped", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks.push({
    id: 'blk"x',
    type: "search",
    props: {},
    responsive: { mobile: { visibility: { visible: false } } },
  });
  const css = buildMenuDocumentCss(doc);
  // escapeAuthoringCssString escapes the quote so the selector can never break out.
  expect(css).toContain('[data-menu-block-id="blk\\"x"]');
  expect(css).toContain('[data-block-id="blk\\"x"]');
  expect(css).not.toContain('[data-menu-block-id="blk"x"]');
  // No unscoped attribute selector: every occurrence is prefixed by the doc scope.
  const prefix = `${SCOPE} `;
  for (const match of css.matchAll(/\[data-(?:menu-)?block-id/g)) {
    expect(css.slice(match.index - prefix.length, match.index)).toBe(prefix);
  }
});

test("nav-items hidden on mobile wins in BOTH mobileModes (front @media + canvas flatten)", () => {
  for (const mode of ["disclosure", "inline"] as const) {
    const doc = buildDoc();
    doc.sections[0]!.blocks[1] = {
      id: "blk_nav",
      type: "nav-items",
      props: { linkColor: "#ff0000", mobileMode: mode },
      responsive: { mobile: { visibility: { visible: false } } },
    };
    const mobile = mobileBranchOf(buildMenuDocumentCss(doc));
    expect(mobile).toContain(hideRuleFor("blk_nav"));
    // The hide rule lands AFTER the mobileMode display rules; it targets the
    // <nav> ANCESTOR (data-menu-block-id stamp), sidestepping the
    // higher-specificity .site-nav-list display rules entirely.
    expect(mobile.indexOf(hideRuleFor("blk_nav"))).toBeGreaterThan(
      mobile.indexOf(".site-nav-disclosure{display:")
    );
    expect(buildMenuDocumentPreviewCss(doc, "mobile")).toContain(hideRuleFor("blk_nav"));
    const html = renderDoc(doc);
    // Stamped on the <nav> landmark ancestor, never .site-nav-list itself.
    expect(html).toMatch(/<nav[^>]+data-menu-block-id="blk_nav"/);
    expect(html).not.toMatch(/<ul[^>]+data-menu-block-id/);
  }
});

test("stamping: inert data-menu-block-id on menu-native wrappers, data-block-id on leaf frames", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks.push({ id: "blk_search", type: "search", props: {} });
  const html = renderDoc(doc);
  expect(html).toMatch(/<nav[^>]+data-menu-block-id="blk_nav"/);
  expect(html).toMatch(/<a[^>]*class="site-header-brand"[^>]*data-menu-block-id="blk_brand"/);
  expect(html).toMatch(
    /<span[^>]*data-site-nav-utility="search"[^>]*data-menu-block-id="blk_search"/
  );
  expect(html).toContain('data-block-id="blk_cta"');
  // The existing single-landmark invariant stays green.
  expect(html.match(/data-site-nav="true"/g)?.length).toBe(1);
});
