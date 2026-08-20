import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  PAGE_LAYER_Z_CLAMP,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PAGE_REVEAL_MOTION_CSS,
  PAGE_SPOTLIGHT_CSS,
  PageDocumentRender,
  PageSectionContent,
} from "../../../core/services/pages/pageRendererV2";

import {
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";

const createSection = () =>
  createPageSectionV2("hero", {
    id: "sec-shared-renderer",
    name: "Shared Renderer",
    variant: "centered",
    layout: { columns: 3, align: "center", justify: "between", maxWidth: 960 },
    style: {
      background: "#f8fafc",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#ff00aa",
      radius: 18,
      shadow: "md",
    },
    spacing: {
      paddingTop: 16,
      paddingRight: 18,
      paddingBottom: 20,
      paddingLeft: 22,
      gap: 12,
    },
    visibility: {
      visible: true,
      authOnly: false,
      anchor: "shared-renderer",
      startsAt: null,
      endsAt: null,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-heading",
        props: { text: "Shared headline", level: "h1", align: "center" },
      }),
      createPageBlockV2("button", {
        id: "blk-button",
        props: { label: "Open", href: "/open", target: "blank" },
      }),
      createPageBlockV2("list", {
        id: "blk-list",
        props: {
          ordered: true,
          items: ["Plain item", { label: "Linked item", href: "/linked" }],
        },
      }),
    ],
  });

const countMarkup = (markup: string, needle: string) => markup.split(needle).length - 1;

const createEffectSection = (style: Partial<PageSectionV2["style"]>) =>
  createPageSectionV2("content", {
    id: "sec-effect",
    name: "Effect section",
    style: {
      background: "#ffffff",
      backgroundType: "none",
      backgroundImage: null,
      accent: "#111111",
      radius: 0,
      shadow: "none",
      ...style,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-effect-heading",
        props: { text: "Effect headline", level: "h2", align: "left" },
      }),
    ],
  });

const createEffectsDocument = (
  sections: PageSectionV2[],
  effects?: PageDocumentV2["settings"]["effects"]
): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true, ...(effects ? { effects } : {}) },
  sections,
});

test("cursorSpotlight ⇒ data-page-spotlight + data-page-motion + overlay + custom props + one script", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "#ff0000",
    spotlightSize: 400,
  });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain('data-page-spotlight="true"');
  expect(html).toContain('data-page-motion="true"');
  expect(html).toContain("data-page-spotlight-overlay");
  // TASK-523-02 — overlay stays pointer-events-none fixed inset-0; the `z-0`
  // class was DROPPED so it does not fight the CSS-raised z-index.
  expect(html).toContain("pointer-events-none fixed inset-0");
  expect(html).not.toContain("pointer-events-none fixed inset-0 z-0");
  expect(html).toContain("--spotlight-color:#ff0000");
  expect(html).toContain("--spotlight-size:400px");
  // the spotlight <style> ships the static PAGE_SPOTLIGHT_CSS
  expect(html).toContain("data-page-spotlight-css");
  expect(html).toContain("radial-gradient");
  expect(html).toContain("@media (prefers-reduced-motion: no-preference)");
  // exactly one effects runtime <script>
  expect(countMarkup(html, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(1);
  // no section effect authored ⇒ no reveal-hide style/noscript
  expect(html).not.toContain("data-page-motion-css");
});

test("PAGE_SPOTLIGHT_CSS is reduced-motion-gated radial-gradient reading --spotlight-*", () => {
  expect(PAGE_SPOTLIGHT_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  expect(PAGE_SPOTLIGHT_CSS).toContain("[data-page-spotlight] [data-page-spotlight-overlay]");
  expect(PAGE_SPOTLIGHT_CSS).toContain("radial-gradient(var(--spotlight-size,400px)");
  expect(PAGE_SPOTLIGHT_CSS).toContain("var(--spotlight-x,50%) var(--spotlight-y,50%)");
  // Default is a TRANSLUCENT tint (subtle glow that does not obscure content),
  // not the opaque brand color; authors override via --spotlight-color.
  expect(PAGE_SPOTLIGHT_CSS).toContain(
    "var(--spotlight-color,color-mix(in srgb,var(--primary) 14%,transparent))"
  );
  expect(PAGE_SPOTLIGHT_CSS).not.toContain("var(--spotlight-color,var(--primary))");
});

test("TASK-523-02 — PAGE_SPOTLIGHT_CSS overlay is occlusion-proof: NON-gated base rule adds light above section backgrounds without blocking", () => {
  // A NON-gated base rule (BEFORE the reduced-motion @media) fixes/raises/blends
  // the overlay so it renders ABOVE opaque section backgrounds and ADDS light.
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  expect(baseRule).toContain("[data-page-spotlight] [data-page-spotlight-overlay]");
  expect(baseRule).toContain("position:fixed");
  expect(baseRule).toContain("inset:0");
  // raised z-index — above section content, so opaque backgrounds cannot occlude it
  const zIndexMatch = /z-index:(\d+)/.exec(baseRule);
  expect(zIndexMatch).not.toBeNull();
  const overlayZIndex = Number(zIndexMatch![1]);
  // Hard Invariant #4 / AC #4: the overlay must sit STRICTLY BELOW the front
  // sticky nav (z-40) so screen-blend never tints the menu bar.
  expect(overlayZIndex).toBeLessThan(40);
  expect(overlayZIndex).toBeGreaterThan(0);
  // ADDS light without blocking
  expect(baseRule).toContain("mix-blend-mode:screen");
  expect(baseRule).toContain("pointer-events:none");
  // the moving glow (radial-gradient) STAYS behind the reduced-motion gate; the
  // base rule itself must NOT ship the gradient.
  expect(baseRule).not.toContain("radial-gradient");
  const gatedRule = PAGE_SPOTLIGHT_CSS.slice(
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  expect(gatedRule).toContain("radial-gradient");
});

test("TASK-523-02 — nav-safety invariant: overlay z-index stays strictly below the sticky nav (sticky z-40) and <Root> forms no stacking context", () => {
  // The overlay must sit above section content but BELOW the sticky nav so
  // mix-blend-mode:screen never tints the menu bar (Hard Invariant #4 / AC #4).
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  const overlayZIndex = Number(/z-index:(\d+)/.exec(baseRule)![1]);

  // Grep-anchor the nav's `sticky z-40`: if the nav z-index is ever dropped/renamed,
  // these break so the strictly-below relationship is re-checked.
  // Grep-anchor the nav's `sticky z-40` in the canonical V2 nav renderer: if
  // the nav z-index is ever dropped/renamed, this breaks so the strictly-below
  // relationship is re-checked. (The v1 widget renderer is gone with
  // TASK-580-04; the V2 nav renders exclusively through navigationRenderer.)
  const navigationSource = readFileSync(
    new URL("../../../core/services/renderContracts/navigationRenderer.tsx", import.meta.url),
    "utf8"
  );
  expect(navigationSource).toContain("sticky z-40");
  // The nav's z-index is 40; the overlay must be strictly below it.
  expect(overlayZIndex).toBeLessThan(40);

  // <Root> must NOT form a stacking context (isolation:isolate is the deliberate
  // NON-choice) so the overlay and nav share the root stacking context and the
  // z-index comparison is meaningful.
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const rootTagMatch = /<(main|div|section|article)\b[^>]*data-page-v2="true"[^>]*>/.exec(html);
  expect(rootTagMatch).not.toBeNull();
  expect(rootTagMatch![0]).not.toContain("isolation");
  expect(rootTagMatch![0]).not.toContain("isolate");
});

test("TASK-523-02 — occlusion-proof: no authorable layer.z can reach the spotlight overlay (PAGE_LAYER_Z_CLAMP.max < overlay z-index < nav z-40)", () => {
  // The layered-canvas surface maps `layer.z` straight to `z-index` on a
  // [data-layer] child of the SAME root stacking context as the overlay
  // (pageCompositionEffects.tsx). If an author could set layer.z >= the overlay
  // z-index, that layer would paint AT/ABOVE the spotlight and occlude the glow.
  // Cap the bound STRICTLY BELOW the overlay so the glow is always visible.
  const baseRule = PAGE_SPOTLIGHT_CSS.slice(
    0,
    PAGE_SPOTLIGHT_CSS.indexOf("@media (prefers-reduced-motion: no-preference)")
  );
  const overlayZIndex = Number(/z-index:(\d+)/.exec(baseRule)![1]);

  // Grep-anchor the composition-effects mapping so this test breaks if the
  // layer.z ⇒ z-index binding is ever dropped/renamed and the invariant needs
  // re-checking against a different surface.
  const compositionEffectsSource = readFileSync(
    new URL("../../../core/services/pages/pageCompositionEffects.tsx", import.meta.url),
    "utf8"
  );
  expect(compositionEffectsSource).toContain("z-index:var(--layer-z,auto)");

  // The bound is the single source of truth for both the JSON schema and the
  // runtime normalizer (pageDocumentV2.ts), so a max below the overlay z-index
  // means NO authored/normalized layer can reach the overlay.
  expect(PAGE_LAYER_Z_CLAMP.max).toBeLessThan(overlayZIndex);
  // And the overlay itself stays strictly below the sticky nav (z-40).
  expect(overlayZIndex).toBeLessThan(40);
});

test("section scrollEffect only ⇒ data-page-motion + <style data-page-motion-css> (PAGE_REVEAL_MOTION_CSS) + <noscript> + script, no spotlight overlay", () => {
  const doc = createEffectsDocument([createEffectSection({ scrollEffect: "reveal-up" })]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain('data-page-motion="true"');
  expect(html).toContain("data-page-motion-css");
  expect(html).toContain(PAGE_REVEAL_MOTION_CSS);
  expect(html).toContain("<noscript>");
  expect(html).toContain('[data-page-effect^="reveal"]{opacity:1;transform:none}');
  expect(countMarkup(html, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(1);
  // no page spotlight
  expect(html).not.toContain('data-page-spotlight="true"');
  expect(html).not.toContain("data-page-spotlight-overlay");
});

// ---------------------------------------------------------------------------
// TASK-535 — page-global effect-node handling across the TWO documents a page
// renders (the <main> page + the SiteFooter template). Each PageDocumentRender
// decides its own effects. Two classes of node:
//   - IDEMPOTENT stylesheets (reveal/composition/spotlight CSS + reveal noscript):
//     document-agnostic selectors, so a duplicate is HARMLESS. Emitted PER-DOCUMENT /
//     present-only ⇒ a FOOTER-ONLY effect is still styled (the earlier 535 pass that
//     gated these to the primary suppressed them on BOTH docs for footer-only effects).
//   - The viewport-fixed spotlight OVERLAY DIV: the ONE true singleton (two stack ⇒
//     double brightness). De-duplicated across documents via `peerSpotlightOn` so
//     EXACTLY ONE renders, while a footer-only spotlight still emits its overlay.
// ---------------------------------------------------------------------------

test("TASK-535 — secondary spotlight document with a spotlight PEER suppresses its overlay DIV, but still emits the (idempotent) spotlight CSS", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "#ff0000",
    spotlightSize: 400,
  });
  // peerSpotlightOn=true models the primary <main> already owning the overlay.
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="secondary" rootTag="div" peerSpotlightOn />
  );
  // The viewport-fixed overlay DIV is NOT emitted (the primary owns the single one)…
  expect(secondary).not.toContain('data-page-spotlight-overlay="true"');
  // …but the idempotent spotlight CSS + root markers ARE emitted (harmless duplicate;
  // ensures a footer-authored spotlight is styled), and the runtime <script> emits.
  expect(secondary).toContain("data-page-spotlight-css");
  expect(secondary).toContain('data-page-spotlight="true"');
  expect(countMarkup(secondary, `data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`)).toBe(
    1
  );
});

test("TASK-535 — primary + secondary spotlight documents emit EXACTLY ONE overlay DIV across the page (peer-threaded)", () => {
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  // Both author spotlight: the shell tells the footer the primary already owns the
  // overlay (peerSpotlightOn), so the footer suppresses its copy — the primary owns it.
  const primary = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="secondary" rootTag="div" peerSpotlightOn />
  );
  const page = primary + secondary; // both documents live in one HTML document
  // Exactly one overlay DIV across the page; it comes from the PRIMARY.
  expect(countMarkup(page, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(primary, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(secondary, 'data-page-spotlight-overlay="true"')).toBe(0);
  // The spotlight CSS is idempotent and emitted per-document (harmless duplicate).
  expect(countMarkup(page, "data-page-spotlight-css")).toBe(2);
});

test("TASK-535 — FOOTER-ONLY spotlight: primary has none, footer authors it ⇒ overlay STILL renders (from the footer)", () => {
  const mainNoSpotlight = createEffectsDocument([createSection()]);
  const footerSpotlight = createEffectsDocument([createSection()], { cursorSpotlight: true });
  // Shell wiring: the primary authors no spotlight (so it owns no overlay), and the
  // footer learns the primary does NOT have one (peerSpotlightOn=false) ⇒ footer owns it.
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoSpotlight} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender
      document={footerSpotlight}
      documentRole="secondary"
      rootTag="div"
      peerSpotlightOn={false}
    />
  );
  const page = primary + secondary;
  // Regression guard: pre-fix this yielded ZERO overlays (primary-only gate + primary
  // has no spotlight). Now the FOOTER emits exactly one, with its CSS + root marker.
  expect(countMarkup(page, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(secondary, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(primary, 'data-page-spotlight-overlay="true"')).toBe(0);
  expect(secondary).toContain("data-page-spotlight-css");
  expect(secondary).toContain('data-page-spotlight="true"');
});

test("TASK-535 — FOOTER-ONLY reveal: primary has none, footer authors it ⇒ reveal CSS + noscript STILL emitted (from the footer)", () => {
  const mainNoEffect = createEffectsDocument([createSection()]);
  const footerReveal = createEffectsDocument([
    createEffectSection({ scrollEffect: "reveal-up" }),
    createSection(),
  ]);
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoEffect} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={footerReveal} documentRole="secondary" rootTag="div" />
  );
  // Regression guard: pre-fix these were primary-only, so a footer-only reveal was
  // emitted NOWHERE ⇒ unstyled/degraded. Now the footer emits its own idempotent copy.
  expect(primary).not.toContain("data-page-motion-css");
  expect(secondary).toContain("data-page-motion-css");
  expect(secondary).toContain("<noscript>");
  expect(secondary).toContain('data-page-effect="reveal-up"');
  const page = primary + secondary;
  expect(countMarkup(page, "data-page-motion-css")).toBe(1);
  expect(countMarkup(page, "<noscript>")).toBe(1);
});

test("TASK-535 — FOOTER-ONLY composition: primary has none, footer authors a surface ⇒ composition CSS STILL emitted (from the footer)", () => {
  const mainNoEffect = createEffectsDocument([createSection()]);
  const footerComposition = createEffectsDocument([
    createEffectSection({ surfacePreset: "glass" }),
  ]);
  const primary = renderToStaticMarkup(<PageDocumentRender document={mainNoEffect} />);
  const secondary = renderToStaticMarkup(
    <PageDocumentRender document={footerComposition} documentRole="secondary" rootTag="div" />
  );
  // Regression guard: pre-fix a footer-only glass/glow surface emitted its data-attrs
  // but the composition stylesheet was NOWHERE ⇒ unstyled surfaces. Now the footer
  // emits its own idempotent copy.
  expect(primary).not.toContain("data-page-composition-css");
  expect(secondary).toContain("data-page-composition-css");
});

test("TASK-535 — primary render is byte-identical with an explicit documentRole='primary' (default), no peer", () => {
  const doc = createEffectsDocument([createEffectSection({ scrollEffect: "reveal-up" })], {
    cursorSpotlight: true,
  });
  const implicit = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  const explicit = renderToStaticMarkup(
    <PageDocumentRender document={doc} documentRole="primary" />
  );
  expect(explicit).toBe(implicit);
  // The default primary still emits every page-global singleton exactly once
  // (overlay DIV needle, not the CSS selector).
  expect(countMarkup(implicit, 'data-page-spotlight-overlay="true"')).toBe(1);
  expect(countMarkup(implicit, "data-page-motion-css")).toBe(1);
});

test("no effects ⇒ byte-identical <Root> (no marker/overlay/script/style)", () => {
  const doc = createEffectsDocument([createSection()]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).not.toContain("data-page-motion");
  expect(html).not.toContain("data-page-spotlight");
  expect(html).not.toContain("data-coderso-runtime-script");
  expect(html).not.toContain("data-page-spotlight-css");
  expect(html).not.toContain("data-page-motion-css");
  expect(html).not.toContain("--spotlight-color");
});

test("TASK-523-02 — spotlight OFF ⇒ markup byte-identical to no-effects baseline (no overlay/CSS emitted despite the new base rule)", () => {
  const sections = [createSection()];
  const baseline = renderToStaticMarkup(
    <PageDocumentRender document={createEffectsDocument(sections)} />
  );
  const spotlightOff = renderToStaticMarkup(
    <PageDocumentRender document={createEffectsDocument(sections, { cursorSpotlight: false })} />
  );
  expect(spotlightOff).toBe(baseline);
  expect(spotlightOff).not.toContain("data-page-spotlight-overlay");
  expect(spotlightOff).not.toContain("data-page-spotlight-css");
  expect(spotlightOff).not.toContain("mix-blend-mode:screen");
});

test("spotlight script __html === PAGE_EFFECTS_RUNTIME_SOURCE", () => {
  const doc = createEffectsDocument([createSection()], { cursorSpotlight: true });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).toContain(PAGE_EFFECTS_RUNTIME_SOURCE);
});

test("spotlightSize clamped in render; spotlightColor re-sanitized (bad color → subtle translucent default)", () => {
  const doc = createEffectsDocument([createSection()], {
    cursorSpotlight: true,
    spotlightColor: "expression(alert(1))",
    spotlightSize: 99999,
  });
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  // Rejected color falls back to the subtle translucent default, never the raw payload.
  expect(html).toContain("--spotlight-color:color-mix(in srgb, var(--primary) 14%, transparent)");
  expect(html).toContain("--spotlight-size:900px");
  expect(html).not.toContain("expression(");
});

// ---------------------------------------------------------------------------
// TASK-523-01-L02 — per-page canvas background on the <Root> (present-only,
// re-sanitized at render, disjoint from the spotlight vars).
// ---------------------------------------------------------------------------

const createBackgroundDocument = (
  background?: string,
  effects?: PageDocumentV2["settings"]["effects"]
): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: {
    template: "page-v2",
    showInNav: true,
    ...(effects ? { effects } : {}),
    ...(background ? { background } : {}),
  },
  sections: [createSection()],
});

test("settings.background color ⇒ <Root> inline style carries background (overriding bg-white)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createBackgroundDocument("#0ea5e9")} />
  );
  expect(html).toContain("background:#0ea5e9");
});

test("settings.background gradient ⇒ <Root> style carries the gradient", () => {
  const gradient = "linear-gradient(120deg,#0ea5e9,#a855f7)";
  const html = renderToStaticMarkup(
    <PageDocumentRender document={createBackgroundDocument(gradient)} />
  );
  expect(html).toContain(gradient);
});

test("background + spotlight ON ⇒ style carries BOTH background and --spotlight-* (neither clobbered)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender
      document={createBackgroundDocument("#0ea5e9", {
        cursorSpotlight: true,
        spotlightColor: "#ff0000",
        spotlightSize: 400,
      })}
    />
  );
  expect(html).toContain("background:#0ea5e9");
  expect(html).toContain("--spotlight-color:#ff0000");
  expect(html).toContain("--spotlight-size:400px");
});

test("no background + spotlight OFF ⇒ <Root> has NO inline style (byte-identical vs post-522)", () => {
  const html = renderToStaticMarkup(<PageDocumentRender document={createBackgroundDocument()} />);
  // rootStyle stays undefined ⇒ no style attribute on the page root.
  expect(html).not.toContain("--spotlight-color");
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style=/);
});

test("no background + spotlight ON ⇒ style carries ONLY --spotlight-* (no background key)", () => {
  const html = renderToStaticMarkup(
    <PageDocumentRender
      document={createBackgroundDocument(undefined, {
        cursorSpotlight: true,
        spotlightColor: "#ff0000",
      })}
    />
  );
  expect(html).toContain("--spotlight-color:#ff0000");
  // no canvas background emitted on the root style
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style="[^"]*background:/);
});

test("directly-mutated bad background re-sanitized at render ⇒ no background in style", () => {
  const doc = createBackgroundDocument();
  // Bypass normalize: inject an unsafe stored value directly.
  (doc.settings as { background?: string }).background = "red;}body{display:none";
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  expect(html).not.toContain("display:none");
  expect(html).not.toMatch(/data-page-v2="true"[^>]*style="[^"]*background:/);
});

// ---------------------------------------------------------------------------
// TASK-521-04 — animated-icon block (glyph set + renderer `case "icon"`)
// ---------------------------------------------------------------------------

const renderIconSection = (
  props: Record<string, unknown>,
  mutate?: (block: PageBlockV2) => void
) => {
  const block = createPageBlockV2("icon", { id: "blk-icon", props });
  mutate?.(block);
  return renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-icon",
        variant: "centered",
        blocks: [block],
      })}
    />
  );
};
