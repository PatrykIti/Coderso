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
import { buildSiteShellCss } from "../../../core/site/siteShellCss";
import {
  SiteHeaderMenuDocumentRender,
  SiteHeaderNav,
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

  // TASK-502-03 CONSCIOUS BREAKAGE: the menu-document header now renders in
  // HOVER mode (details-FREE), so the pre-502 `<summary>Services</summary>` +
  // single-depth `<details>` group assertion is GONE by design — do NOT "fix"
  // it back to <details>. The group hook stays as `data-site-nav-group` but on
  // the <li>, the linked parent renders ONCE as its own link, and the child
  // sits inside a nested `.site-nav-sublist`.
  expect(html).toContain('data-site-nav-group="true"');
  expect(html).not.toContain("<summary>Services</summary>");
  // Linked group parent: its `.site-nav-link` is a direct child of the
  // `li[data-site-nav-group="true"]` (502-02's caret-rule target).
  expect(html).toMatch(
    /<li class="site-nav-item" data-site-nav-group="true"><a class="site-nav-link"[^>]*href="\/services"/
  );
  // The child anchor lives inside the nested sublist.
  expect(html).toMatch(/<ul class="site-nav-sublist">.*href="\/services\/consulting"/);
  // The parent label occurs EXACTLY ONCE in the header HTML (no duplication).
  expect(html.match(/>Services</g)?.length).toBe(1);

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
// TASK-502-02: the fixed nested-sublist block, emitted (doc-scoped only) in the
// shared >=640 branch after the dropdown rule — desktop AND tablet.
const GOLDEN_NESTING_RULES = [
  `${SCOPE} .site-nav-sublist{display:none}`,
  `${SCOPE} .site-nav-item:hover>.site-nav-sublist,${SCOPE} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`,
  `${SCOPE} .site-nav-sublist>li{position:relative}`,
  `${SCOPE} .site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}`,
  `${SCOPE} li[data-site-nav-group="true"]>.site-nav-link::after{content:" \\25BE";font-size:.7em}`,
];
// The shared >=640 (desktop AND tablet canvas) branch content = dropdown + nesting.
const GOLDEN_DESKTOP_SHARED = [...GOLDEN_DESKTOP_RULES, ...GOLDEN_NESTING_RULES];
// Canvas-only disclosure sim-open appended to the Mobile preview flatten.
const GOLDEN_PREVIEW_MOBILE_OPEN = `${SCOPE} .site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`;
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
  ...GOLDEN_DESKTOP_SHARED,
  "}",
  "@media (max-width: 639px){",
  ...GOLDEN_MOBILE_RULES,
  "}",
].join("\n");
const GOLDEN_PREVIEW_DESKTOP_CSS = [
  ...GOLDEN_STRUCT_BASE,
  `${SCOPE} .site-nav-sublist{position:absolute;left:0;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}`,
  ...GOLDEN_BASE_RULES,
  ...GOLDEN_DESKTOP_SHARED,
].join("\n");
const GOLDEN_PREVIEW_MOBILE_CSS = [
  ...GOLDEN_STRUCT_BASE,
  `${SCOPE} .site-nav{width:100%}`,
  `${SCOPE} .site-nav-sublist{padding-left:16px}`,
  ...GOLDEN_BASE_RULES,
  ...GOLDEN_MOBILE_RULES,
  GOLDEN_PREVIEW_MOBILE_OPEN,
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
  // TASK-502-02 ghost handoff: preview builders emit NO visibility hide rules
  // in ANY forced branch (the 502-04 ghost gate owns canvas visibility — a
  // preview display:none would kill the dimmed selectable ghost).
  expect(buildMenuDocumentPreviewCss(doc, "mobile")).not.toContain(hideRuleFor("blk_cta"));
  expect(buildMenuDocumentPreviewCss(doc, "desktop")).not.toContain(hideRuleFor("blk_cta"));
  expect(buildMenuDocumentPreviewCss(doc, "tablet")).not.toContain(hideRuleFor("blk_cta"));
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
    // Preview builders emit NO hide rules (502-04 ghost handoff).
    expect(buildMenuDocumentPreviewCss(doc, "mobile")).not.toContain(hideRuleFor("blk_nav"));
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

// --- TASK-502-02: tablet branch, three-way visibility, divider, nesting ------

const TABLET_MEDIA_OPEN = "@media (min-width: 640px) and (max-width: 1023px){";
const DESKTOP_ONLY_MEDIA_OPEN = "@media (min-width: 1024px){";
// Extract a single `@media ...{ ... }` block by its opener line.
const mediaBlockOf = (css: string, opener: string) => {
  const start = css.indexOf(opener);
  if (start === -1) return "";
  return css.slice(start, css.indexOf("\n}", start));
};

test("TASK-502-02 mobile-only byte guard: no tablet/1024 branch, no responsive-branch drift", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = {
    mobile: { layout: { paddingY: 4 }, navProps: { itemGap: 12, linkColor: "#00ff00" } },
  };
  // A mobile-only doc gains NO tablet branch and NO desktop-only (1024) branch —
  // its ONLY responsive branch is the pre-502 mobile @media (max-width:639).
  const css = buildMenuDocumentCss(doc);
  expect(css).not.toContain(TABLET_MEDIA_OPEN);
  expect(css).not.toContain(DESKTOP_ONLY_MEDIA_OPEN);
  expect(css).not.toContain("(min-width: 640px) and (max-width: 1023px)");
});

test("TASK-502-02 tablet delta: TOTAL group deltas inside the bounded tablet @media only", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = {
    tablet: { layout: { paddingY: 6 }, navProps: { itemGap: 20, linkColor: "#00ff00" } },
  };
  const css = buildMenuDocumentCss(doc);
  const base = baseBranchOf(css);
  const shared = mediaBlockOf(css, "@media (min-width: 640px){");
  const tablet = mediaBlockOf(css, TABLET_MEDIA_OPEN);
  const mobile = mobileBranchOf(css);

  // Bounded tablet @media exists and carries the TOTAL group deltas.
  expect(css).toContain(TABLET_MEDIA_OPEN);
  expect(tablet).toContain(
    `${SCOPE} .site-header-inner{justify-content:space-between;padding:6px 24px}`
  );
  expect(tablet).toContain(`${SCOPE} .site-nav-list{gap:20px}`);
  expect(tablet).toContain(
    `${SCOPE} .site-nav-link{color:#00ff00;font-size:inherit;font-weight:inherit;text-transform:none}`
  );
  // Base + shared (>=640) + mobile branches carry ONLY base values — the tablet
  // override never leaks into the mobile branch (cascade independence).
  expect(base).toContain(`${SCOPE} .site-nav-list{gap:4px}`);
  expect(base).not.toContain("#00ff00");
  expect(shared).not.toContain("#00ff00");
  expect(mobile).not.toContain("#00ff00");
  expect(mobile).not.toContain("gap:20px");
});

test("TASK-502-02 tablet override EQUAL to base emits nothing (no tablet branch)", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = {
    tablet: { layout: { sticky: true }, navProps: { linkColor: "#ff0000" } },
  };
  expect(buildMenuDocumentCss(doc)).toBe(GOLDEN_FRONT_CSS);
});

test("TASK-502-02 canvas tablet branch: real delta, tablet⇒desktop mapping removed", () => {
  const doc = buildDoc();
  doc.sections[0]!.responsive = { tablet: { navProps: { itemGap: 20 } } };
  const tabletPreview = buildMenuDocumentPreviewCss(doc, "tablet");
  const desktopPreview = buildMenuDocumentPreviewCss(doc, "desktop");
  expect(tabletPreview).toContain(`${SCOPE} .site-nav-list{gap:20px}`);
  expect(desktopPreview).not.toContain(`${SCOPE} .site-nav-list{gap:20px}`);
  // A doc WITHOUT a tablet record: tablet preview === desktop preview.
  expect(buildMenuDocumentPreviewCss(buildDoc(), "tablet")).toBe(
    buildMenuDocumentPreviewCss(buildDoc(), "desktop")
  );
});

test("TASK-502-02 three-way visibility: hides land in the correct front branch", () => {
  // Tablet-hidden ONLY (visible desktop + mobile) ⇒ bounded tablet branch only.
  const tabletOnly = buildDoc();
  tabletOnly.sections[0]!.blocks[2] = {
    ...tabletOnly.sections[0]!.blocks[2]!,
    responsive: { tablet: { visibility: { visible: false } } },
  };
  let css = buildMenuDocumentCss(tabletOnly);
  expect(mediaBlockOf(css, TABLET_MEDIA_OPEN)).toContain(hideRuleFor("blk_cta"));
  expect(mediaBlockOf(css, "@media (min-width: 640px){")).not.toContain(hideRuleFor("blk_cta"));
  expect(css).not.toContain(DESKTOP_ONLY_MEDIA_OPEN);
  expect(mobileBranchOf(css)).not.toContain(hideRuleFor("blk_cta"));

  // Desktop-hidden but tablet-VISIBLE (flat false + tablet override true) ⇒
  // min-width:1024 branch only (NOT the shared >=640, else hidden at 640–1023).
  const desktopOnly = buildDoc();
  desktopOnly.sections[0]!.blocks[2] = {
    ...desktopOnly.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: { tablet: { visibility: { visible: true } } },
  } as (typeof desktopOnly.sections)[0]["blocks"][number];
  css = buildMenuDocumentCss(desktopOnly);
  expect(mediaBlockOf(css, DESKTOP_ONLY_MEDIA_OPEN)).toContain(hideRuleFor("blk_cta"));
  expect(mediaBlockOf(css, "@media (min-width: 640px){")).not.toContain(hideRuleFor("blk_cta"));
  expect(css).not.toContain(TABLET_MEDIA_OPEN);

  // Hidden on desktop AND tablet (show-only-on-mobile) ⇒ shared >=640 branch,
  // byte-stable pre-502 position; NO tablet/1024 branch.
  const shared = buildDoc();
  shared.sections[0]!.blocks[2] = {
    ...shared.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: { mobile: { visibility: { visible: true } } },
  } as (typeof shared.sections)[0]["blocks"][number];
  css = buildMenuDocumentCss(shared);
  expect(mediaBlockOf(css, "@media (min-width: 640px){")).toContain(hideRuleFor("blk_cta"));
  expect(css).not.toContain(TABLET_MEDIA_OPEN);
  expect(css).not.toContain(DESKTOP_ONLY_MEDIA_OPEN);

  // Preview builders emit NO hide rules for any of these.
  for (const doc of [tabletOnly, desktopOnly, shared]) {
    for (const device of ["desktop", "tablet", "mobile"] as const) {
      expect(buildMenuDocumentPreviewCss(doc, device)).not.toContain(hideRuleFor("blk_cta"));
    }
  }
});

test("TASK-502-02 divider context rules: frame-as-line + hr display:none, tone/thickness pinned", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks.push({
    id: "blk_div",
    type: "divider",
    props: { tone: "accent", thickness: 2 },
  });
  const frameRule = `${SCOPE} .site-header-inner [data-block-id="blk_div"]{align-self:center;width:2px;height:1.5em;background:var(--coderso-section-accent,#0d9488)}`;
  const hrRule = `${SCOPE} .site-header-inner [data-block-id="blk_div"] hr{display:none}`;
  const css = buildMenuDocumentCss(doc);
  // Doc-scoped, device-independent (base rules — present in the un-wrapped head).
  expect(baseBranchOf(css)).toContain(frameRule);
  expect(baseBranchOf(css)).toContain(hrRule);
  // Present in BOTH preview devices.
  for (const device of ["desktop", "tablet", "mobile"] as const) {
    expect(buildMenuDocumentPreviewCss(doc, device)).toContain(frameRule);
    expect(buildMenuDocumentPreviewCss(doc, device)).toContain(hrRule);
  }
  // The frame rule carries NO `display:` declaration (cascade guard §4).
  expect(frameRule).not.toContain("display:");
  // Docs without dividers emit no divider rule.
  expect(buildMenuDocumentCss(buildDoc())).not.toContain('[data-block-id="blk_div"]');
});

test("TASK-502-02 divider thickness clamps and tone falls back", () => {
  const over = buildDoc();
  over.sections[0]!.blocks.push({ id: "blk_d", type: "divider", props: { thickness: 25 } });
  // 25 clamps to 16; absent tone ⇒ neutral #e2e8f0.
  expect(buildMenuDocumentCss(over)).toContain(
    `${SCOPE} .site-header-inner [data-block-id="blk_d"]{align-self:center;width:16px;height:1.5em;background:#e2e8f0}`
  );
  const bare = buildDoc();
  bare.sections[0]!.blocks.push({ id: "blk_d", type: "divider", props: {} });
  // Absent thickness ⇒ 1; muted tone pins to #cbd5e1.
  expect(buildMenuDocumentCss(bare)).toContain("width:1px;height:1.5em;background:#e2e8f0");
  const muted = buildDoc();
  muted.sections[0]!.blocks.push({ id: "blk_d", type: "divider", props: { tone: "muted" } });
  expect(buildMenuDocumentCss(muted)).toContain("background:#cbd5e1");
});

test("TASK-502-02 divider × mobile visibility override: hide wins, frame rule has no display", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks.push({
    id: "blk_div",
    type: "divider",
    props: { tone: "neutral", thickness: 3 },
    responsive: { mobile: { visibility: { visible: false } } },
  });
  const css = buildMenuDocumentCss(doc);
  // The frame-as-line rule (base) contains NO `display:` — otherwise its
  // (0,3,0) specificity would defeat the (0,2,0) mobile hide.
  const frameRule = css
    .split("\n")
    .find((l) => l.includes('[data-block-id="blk_div"]{align-self:center'));
  expect(frameRule).toBeDefined();
  expect(frameRule).not.toContain("display:");
  // The mobile hide rule is present in the front mobile branch.
  expect(mobileBranchOf(css)).toContain(hideRuleFor("blk_div"));
});

test("TASK-502-02 nested sublists: fly-out doc-scoped only, ≥640 only, absent from base sheet", () => {
  const flyoutBottom = `${SCOPE} .site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}`;
  const hideDefault = `${SCOPE} .site-nav-sublist{display:none}`;
  const openRule = `${SCOPE} .site-nav-item:hover>.site-nav-sublist,${SCOPE} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`;
  const css = buildMenuDocumentCss(buildDoc());
  const shared = mediaBlockOf(css, "@media (min-width: 640px){");
  // Fly-out + hide-by-default + hover-open live ONLY in the shared >=640 branch.
  expect(shared).toContain(flyoutBottom);
  expect(shared).toContain(hideDefault);
  expect(shared).toContain(openRule);
  expect(mobileBranchOf(css)).not.toContain(".site-nav-sublist .site-nav-sublist");
  expect(mobileBranchOf(css)).not.toContain(hideDefault);
  // Present in preview desktop + tablet, ABSENT from preview mobile.
  expect(buildMenuDocumentPreviewCss(buildDoc(), "desktop")).toContain(flyoutBottom);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "tablet")).toContain(flyoutBottom);
  expect(buildMenuDocumentPreviewCss(buildDoc(), "mobile")).not.toContain(
    ".site-nav-sublist .site-nav-sublist"
  );
  // The frozen base sheet contains NO nested-sublist rule (byte-identity guard).
  expect(buildSiteShellCss(null)).not.toContain(".site-nav-sublist .site-nav-sublist");
  expect(buildSiteShellCss(null)).not.toContain('li[data-site-nav-group="true"]');
  // NO transitional `<details>`/`[open]` rule anywhere (same-commit landing).
  expect(css).not.toContain(".site-nav-group[open]");
  expect(css).not.toContain("details[open]");
});

test("TASK-502-02 nested fly-out is direction-aware (dropdownDirection top flips it)", () => {
  const doc = buildDoc();
  doc.sections[0]!.blocks[1] = {
    id: "blk_nav",
    type: "nav-items",
    props: { linkColor: "#ff0000", dropdownDirection: "top" },
  };
  const css = buildMenuDocumentCss(doc);
  expect(css).toContain(
    `${SCOPE} .site-nav-sublist .site-nav-sublist{left:100%;bottom:0;top:auto}`
  );
  expect(css).not.toContain(
    `${SCOPE} .site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}`
  );
});

test("TASK-502-02 disclosure preview: sim-open in mobile canvas only, AFTER closed display:none", () => {
  const doc = buildDoc(); // default mobileMode ⇒ disclosure
  const preview = buildMenuDocumentPreviewCss(doc, "mobile");
  expect(preview).toContain(GOLDEN_PREVIEW_MOBILE_OPEN);
  // Sim-open lands AFTER the closed `.site-nav-list{display:none}` (source-order win).
  expect(preview.indexOf(`${SCOPE} .site-nav-list{display:none}`)).toBeLessThan(
    preview.indexOf(GOLDEN_PREVIEW_MOBILE_OPEN)
  );
  // FRONT mobile branch carries NO sim-open rule (emission unchanged).
  expect(mobileBranchOf(buildMenuDocumentCss(doc))).not.toContain(GOLDEN_PREVIEW_MOBILE_OPEN);
  // mobileMode "inline" ⇒ no sim-open rule at all.
  const inlineDoc = buildDoc();
  inlineDoc.sections[0]!.blocks[1] = {
    id: "blk_nav",
    type: "nav-items",
    props: { linkColor: "#ff0000", mobileMode: "inline" },
  };
  expect(buildMenuDocumentPreviewCss(inlineDoc, "mobile")).not.toContain(
    GOLDEN_PREVIEW_MOBILE_OPEN
  );
});

// --- TASK-502-03: recursive nav (hover + details) & brand render chain -------

const threeLevelNav: SiteShellNavigation = {
  label: "Primary menu",
  items: [
    {
      label: "About",
      href: "/about",
      children: [
        {
          label: "Inna strona",
          href: "/about/inna",
          children: [{ label: "Inna Strona", href: "/about/inna/deep" } as NavigationItem],
        } as NavigationItem,
      ],
    },
  ],
};

const linklessGroupNav: SiteShellNavigation = {
  label: "Primary menu",
  items: [
    {
      label: "Company",
      href: "#",
      children: [{ label: "Team", href: "/team" } as NavigationItem],
    },
  ],
};

const brandDoc = (props: Record<string, unknown>): MenuDocumentV2 => ({
  schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
  sections: [
    {
      id: "sec_bar",
      type: "menu-bar",
      name: "Menu bar",
      layout: {},
      blocks: [{ id: "blk_brand", type: "brand", props: { mode: "text", href: "/", ...props } }],
    },
  ],
});

test("TASK-502-03 menu-doc header: 3-level tree ⇒ nested sublists, no <details>, parent once", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={buildDoc()}
      navigation={threeLevelNav}
      siteName="Acme"
    />
  );
  // Hover mode: the doc header carries NO nav-GROUP <details>/<summary> (the
  // only <details>/<summary> left is the mobile disclosure "Menu" toggle).
  expect(html).not.toContain('<details class="site-nav-group"');
  expect(html).not.toContain("<summary>About</summary>");
  expect(html).not.toContain("<summary>Inna strona</summary>");
  // The grandchild anchor sits inside a NESTED `.site-nav-sublist` (a sublist
  // within another sublist).
  expect(html).toMatch(
    /<ul class="site-nav-sublist">.*<ul class="site-nav-sublist">.*href="\/about\/inna\/deep"/
  );
  // Each parent label appears EXACTLY ONCE (no duplication at any level).
  expect(html.match(/>About</g)?.length).toBe(1);
  expect(html.match(/>Inna strona</g)?.length).toBe(1);
  expect(html.match(/>Inna Strona</g)?.length).toBe(1);
  // Group hook stays on the <li> (existing assertion) — one per non-leaf level
  // (the third `data-site-nav-group` occurrence lives in the CSS caret rule).
  expect(html.match(/<li class="site-nav-item" data-site-nav-group="true">/g)?.length).toBe(2);
});

test("TASK-502-03 menu-doc header: linkless (#) group renders a keyboard-focusable label span", () => {
  const html = renderToString(
    <SiteHeaderMenuDocumentRender
      document={buildDoc()}
      navigation={linklessGroupNav}
      siteName="Acme"
    />
  );
  // BOTH classes AND tabindex="0" — the NORMATIVE keyboard contract: without it
  // 502-02's :focus-within open rule can never fire for the display:none subtree.
  expect(html).toContain(
    '<span class="site-nav-link site-nav-group-label" tabindex="0">Company</span>'
  );
  // The child is still reachable inside the nested sublist.
  expect(html).toMatch(/<ul class="site-nav-sublist">.*href="\/team"/);
  // No anchor is fabricated for the `#` parent.
  expect(html).not.toContain('href="#"');
});

test("TASK-502-03 legacy SiteHeaderNav: recursive <details> per level, grandchild present", () => {
  const html = renderToString(<SiteHeaderNav navigation={threeLevelNav} siteName="Acme" />);
  // Recursive <details class="site-nav-group"> per non-leaf level (two here).
  expect(html.match(/<details class="site-nav-group"/g)?.length).toBe(2);
  expect(html).toContain("<summary>About</summary>");
  expect(html).toContain("<summary>Inna strona</summary>");
  // Grandchild reachable (flatten gone).
  expect(html).toContain('href="/about/inna/deep"');
  // Details reachability convention: the linked parent is the FIRST entry of
  // its DIRECT sublist (a link, not the summary).
  expect(html).toMatch(
    /<summary>About<\/summary><ul class="site-nav-sublist"><li class="site-nav-item"><a class="site-nav-link"[^>]*href="\/about"/
  );
});

test("TASK-502-03 legacy SiteHeaderNav: FLAT menu markup is byte-identical to pre-502", () => {
  const flatNav: SiteShellNavigation = {
    label: "Primary menu",
    items: [
      { label: "Home", href: "/" },
      { label: "Blog", href: "/blog" },
    ],
  };
  const html = renderToString(<SiteHeaderNav navigation={flatNav} siteName="Acme" />);
  // Golden string captured from the pre-502 flat legacy render — no <details>,
  // no group hooks, just the two leaf links.
  expect(html).toContain(
    '<ul class="site-nav-list" data-site-nav-list="true">' +
      '<li class="site-nav-item"><a class="site-nav-link" data-site-nav-link="true" href="/">Home</a></li>' +
      '<li class="site-nav-item"><a class="site-nav-link" data-site-nav-link="true" href="/blog">Blog</a></li>' +
      "</ul>"
  );
  expect(html).not.toContain("site-nav-group");
});

test("TASK-502-03 BrandRender chain: props.text beats siteName; escaped; sparse falls back", () => {
  // text wins over siteName.
  const withText = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({ text: "Studio 42" })}
      navigation={navigation}
      siteName="Acme"
    />
  );
  expect(withText).toContain(">Studio 42</a>");
  expect(withText).not.toContain(">Acme</a>");

  // Absent text ⇒ siteName.
  const noText = renderToString(
    <SiteHeaderMenuDocumentRender document={brandDoc({})} navigation={navigation} siteName="Acme" />
  );
  expect(noText).toContain(">Acme</a>");

  // Both absent ⇒ NO brand anchor.
  const neither = renderToString(
    <SiteHeaderMenuDocumentRender document={brandDoc({})} navigation={navigation} />
  );
  expect(neither).not.toContain("site-header-brand");

  // Text is React-escaped (no markup injection).
  const escaped = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({ text: "<b>x</b>" })}
      navigation={navigation}
      siteName="Acme"
    />
  );
  expect(escaped).toContain("&lt;b&gt;x&lt;/b&gt;");
  expect(escaped).not.toContain("<b>x</b>");

  // Whitespace-only text ⇒ trimmed to empty ⇒ falls back to siteName.
  const blank = renderToString(
    <SiteHeaderMenuDocumentRender
      document={brandDoc({ text: "   " })}
      navigation={navigation}
      siteName="Acme"
    />
  );
  expect(blank).toContain(">Acme</a>");
});

test("TASK-502-03 render gate: show-only-on-tablet block is in the DOM; visible-on-none is not", () => {
  // flat false + tablet-visible override ⇒ resolves false on desktop AND mobile,
  // but the tablet term keeps it in the DOM (502-02's CSS owns the viewport gate).
  const tabletOnly = buildDoc();
  tabletOnly.sections[0]!.blocks[2] = {
    ...tabletOnly.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: { tablet: { visibility: { visible: true } } },
  } as (typeof tabletOnly.sections)[0]["blocks"][number];
  expect(renderDoc(tabletOnly)).toContain('data-block-id="blk_cta"');

  // Visible on NO device (flat false + tablet false + mobile false) ⇒ no markup.
  const none = buildDoc();
  none.sections[0]!.blocks[2] = {
    ...none.sections[0]!.blocks[2]!,
    visibility: { visible: false },
    responsive: {
      tablet: { visibility: { visible: false } },
      mobile: { visibility: { visible: false } },
    },
  } as (typeof none.sections)[0]["blocks"][number];
  expect(renderDoc(none)).not.toContain("blk_cta");

  // A no-override doc keeps byte-identical flat semantics.
  expect(buildMenuDocumentCss(buildDoc())).toBe(GOLDEN_FRONT_CSS);
});
