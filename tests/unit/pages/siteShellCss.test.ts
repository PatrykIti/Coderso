import { expect, test } from "bun:test";

import { SHELL_APPEARANCE_DEFAULTS, buildSiteShellCss } from "../../../core/site/siteShellCss";

/**
 * TASK-458-02 byte-identity pin: the stylesheet below is the EXACT
 * pre-appearance `SITE_SHELL_CSS` constant (TASK-455). `buildSiteShellCss`
 * must reproduce it byte-for-byte for `null`/legacy appearance so existing
 * menus render exactly as before. Do not regenerate this literal from the
 * builder — it is the independent regression fixture.
 */
const LEGACY_SITE_SHELL_CSS = `
[data-site-header="true"]{border-bottom:1px solid rgba(15,23,42,.08)}
[data-site-header="true"] .site-header-inner{margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 24px;max-width:1080px;padding:12px 24px}
[data-site-header="true"] .site-header-brand{font-weight:600;color:inherit;text-decoration:none}
[data-site-header="true"] .site-nav summary{cursor:pointer;list-style:none}
[data-site-header="true"] .site-nav summary::-webkit-details-marker{display:none}
[data-site-header="true"] .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;gap:4px;list-style:none;margin:0;padding:0}
[data-site-header="true"] .site-nav-item{position:relative}
[data-site-header="true"] .site-nav-link{display:block;padding:8px 12px;border-radius:6px;color:inherit;text-decoration:none}
[data-site-header="true"] .site-nav-link:hover,[data-site-header="true"] .site-nav-link:focus-visible,[data-site-header="true"] .site-nav-group>summary:hover,[data-site-header="true"] .site-nav-group>summary:focus-visible{background:rgba(15,23,42,.06)}
[data-site-header="true"] .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px}
[data-site-header="true"] .site-nav-group>summary::after{content:" \\25BE";font-size:.7em}
[data-site-header="true"] .site-nav-sublist{list-style:none;margin:0;padding:6px;display:grid;gap:2px;min-width:180px}
[data-site-header="true"] .site-nav-disclosure{display:none}
[data-site-header="true"] .site-nav-disclosure>summary{padding:8px 12px;border:1px solid rgba(15,23,42,.16);border-radius:6px}
@media (min-width: 640px){
[data-site-header="true"] .site-nav-sublist{position:absolute;left:0;top:100%;z-index:40;background:var(--color-bg,#fff);border:1px solid rgba(15,23,42,.12);border-radius:8px;box-shadow:0 8px 24px rgba(15,23,42,.12)}
}
@media (max-width: 639px){
[data-site-header="true"] .site-nav{width:100%}
[data-site-header="true"] .site-nav-disclosure{display:block}
[data-site-header="true"] .site-nav-list{display:none}
[data-site-header="true"] .site-nav-disclosure[open]~.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}
[data-site-header="true"] .site-nav-sublist{padding-left:16px}
}
[data-site-footer="true"]{border-top:1px solid rgba(15,23,42,.08)}
`.trim();

test("buildSiteShellCss(null) reproduces the legacy stylesheet byte-identically", () => {
  expect(buildSiteShellCss(null)).toBe(LEGACY_SITE_SHELL_CSS);
});

test("empty and all-defaults appearance models also emit the legacy stylesheet", () => {
  expect(buildSiteShellCss({})).toBe(LEGACY_SITE_SHELL_CSS);
  expect(
    buildSiteShellCss({
      surfaceColor: SHELL_APPEARANCE_DEFAULTS.surfaceColor,
      linkColor: SHELL_APPEARANCE_DEFAULTS.linkHoverColor === "" ? undefined : undefined,
      linkHoverColor: SHELL_APPEARANCE_DEFAULTS.linkHoverColor,
      itemGap: SHELL_APPEARANCE_DEFAULTS.itemGap,
      paddingY: SHELL_APPEARANCE_DEFAULTS.paddingY,
      paddingX: SHELL_APPEARANCE_DEFAULTS.paddingX,
      alignment: SHELL_APPEARANCE_DEFAULTS.alignment,
      textTransform: SHELL_APPEARANCE_DEFAULTS.textTransform,
      borderColor: SHELL_APPEARANCE_DEFAULTS.borderColor,
      borderWidth: SHELL_APPEARANCE_DEFAULTS.borderWidth,
      shadow: SHELL_APPEARANCE_DEFAULTS.shadow,
      sticky: SHELL_APPEARANCE_DEFAULTS.sticky,
      dropdownDirection: SHELL_APPEARANCE_DEFAULTS.dropdownDirection,
      mobileMode: SHELL_APPEARANCE_DEFAULTS.mobileMode,
    })
  ).toBe(LEGACY_SITE_SHELL_CSS);
});

test("surface, border, shadow, and sticky map onto the header rule", () => {
  const css = buildSiteShellCss({
    surfaceColor: "#0f172a",
    borderColor: "var(--color-border)",
    borderWidth: 2,
    shadow: "md",
    sticky: true,
  });
  expect(css).toContain(
    '[data-site-header="true"]{background:#0f172a;border-bottom:2px solid var(--color-border);box-shadow:0 8px 24px rgba(15,23,42,.12);position:sticky;top:0;z-index:50}'
  );
});

test("transparent surface keeps the header free of any background declaration", () => {
  const css = buildSiteShellCss({ surfaceColor: "transparent", borderWidth: 0 });
  expect(css).toContain('[data-site-header="true"]{border-bottom:0px solid rgba(15,23,42,.08)}');
  expect(css).not.toContain("background:transparent");
});

test("bar padding, alignment, and item gap map onto the layout rules", () => {
  const css = buildSiteShellCss({ paddingY: 20, paddingX: 40, alignment: "center", itemGap: 16 });
  expect(css).toContain("justify-content:center");
  expect(css).toContain("padding:20px 40px");
  expect(css).toContain(
    '[data-site-header="true"] .site-nav-list{display:flex;flex-wrap:wrap;align-items:center;gap:16px;list-style:none;margin:0;padding:0}'
  );
  expect(buildSiteShellCss({ alignment: "start" })).toContain("justify-content:flex-start");
  expect(buildSiteShellCss({ alignment: "end" })).toContain("justify-content:flex-end");
});

test("link color and typography apply to both plain links and dropdown summaries", () => {
  const css = buildSiteShellCss({
    linkColor: "#f8fafc",
    fontSize: 15,
    fontWeight: 600,
    textTransform: "uppercase",
  });
  expect(css).toContain(
    '[data-site-header="true"] .site-nav-link{display:block;padding:8px 12px;border-radius:6px;color:#f8fafc;text-decoration:none;font-size:15px;font-weight:600;text-transform:uppercase}'
  );
  expect(css).toContain(
    '[data-site-header="true"] .site-nav-group>summary{display:block;padding:8px 12px;border-radius:6px;color:#f8fafc;font-size:15px;font-weight:600;text-transform:uppercase}'
  );
});

test("hover and active colors map onto the interaction rules", () => {
  const css = buildSiteShellCss({
    linkHoverColor: "rgba(255,255,255,.12)",
    linkActiveColor: "var(--color-primary)",
  });
  expect(css).toContain(":focus-visible{background:rgba(255, 255, 255, 0.12)}");
  expect(css).toContain(
    '[data-site-header="true"] .site-nav-link:active,[data-site-header="true"] .site-nav-group>summary:active{background:var(--color-primary)}'
  );
  // No active rule when unset (legacy output has none).
  expect(buildSiteShellCss(null)).not.toContain(".site-nav-link:active");
});

test("dropdownDirection top opens the desktop sublist upward", () => {
  const css = buildSiteShellCss({ dropdownDirection: "top" });
  expect(css).toContain(
    '[data-site-header="true"] .site-nav-sublist{position:absolute;left:0;bottom:100%;z-index:40;'
  );
  expect(css).not.toContain("top:100%");
});

test("mobileMode inline keeps the link list visible and drops the disclosure toggle rules", () => {
  const css = buildSiteShellCss({ mobileMode: "inline" });
  expect(css).toContain('[data-site-header="true"] .site-nav{width:100%}');
  expect(css).not.toContain(".site-nav-disclosure{display:block}");
  expect(css).not.toContain(".site-nav-list{display:none}");
  expect(css).not.toContain(".site-nav-disclosure[open]~.site-nav-list");
  // The mobile sublist indent stays.
  expect(css).toContain('[data-site-header="true"] .site-nav-sublist{padding-left:16px}');
});

test("raw or malicious values never reach the stylesheet (fail-closed sanitize)", () => {
  const css = buildSiteShellCss({
    surfaceColor: "#fff}body{display:none",
    linkColor: "url(javascript:alert(1))",
    // Unknown keys are dropped, not interpolated.
    ...({ injected: "</style><script>alert(1)</script>" } as Record<string, unknown>),
  } as never);
  expect(css).toBe(LEGACY_SITE_SHELL_CSS);
  expect(css).not.toContain("script");
  expect(css).not.toContain("body{");

  const clamped = buildSiteShellCss({ itemGap: 9999, fontSize: -3 } as never);
  expect(clamped).toContain("gap:64px");
  expect(clamped).toContain("font-size:10px");
});
