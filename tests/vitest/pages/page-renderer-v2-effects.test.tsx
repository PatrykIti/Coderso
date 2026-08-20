// TASK-539-05-L01 — page effects: section scroll/parallax/reveal, reveal cascade, page-shell spotlight/motion CSS, effect nodes, root background
// Cohesive suite split out of the former `page-renderer-v2.test.tsx` monolith.
// Each suite is independently runnable in the Vitest lane (Bun-free pages renderer).
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

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
  PageSectionRender,
  toPageBlockRenderProps,
} from "../../../core/services/pages/pageRendererV2";
import {
  PAGE_EFFECTS_RUNTIME_ID,
  PAGE_EFFECTS_RUNTIME_SOURCE,
} from "../../../core/services/pages/pageEffectsRuntime";
import { countMarkup, createDocument, createSection } from "./pageRendererV2TestFixtures";
// TASK-521-02-L02/L03 — section scroll/parallax/reveal front render.
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

test("reveal-up stamps data-page-effect + motion-safe reveal class", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={createEffectSection({ scrollEffect: "reveal-up" })} />
  );
  expect(html).toContain('data-page-effect="reveal-up"');
  expect(html).toContain("motion-safe:data-[revealed=true]:translate-y-0");
  expect(html).toContain("motion-safe:transition-[opacity,transform]");
  expect(html).not.toContain("data-parallax");
  expect(html).not.toContain("data-parallax-inner");
});

test("reveal-fade stamps fade class, no translate", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={createEffectSection({ scrollEffect: "reveal-fade" })} />
  );
  expect(html).toContain('data-page-effect="reveal-fade"');
  expect(html).toContain("motion-safe:data-[revealed=true]:opacity-100");
  expect(html).not.toContain("data-parallax");
});

test("parallax stamps data-parallax + [data-parallax-inner] wrapper", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender
      section={createEffectSection({ scrollEffect: "parallax", parallaxIntensity: 24 })}
    />
  );
  expect(html).toContain('data-page-effect="parallax"');
  expect(html).toContain('data-parallax="24"');
  expect(html).toContain("data-parallax-inner");
  expect(html).toContain("will-change-transform");
  // reveal utilities only ship for reveal-* effects, not parallax.
  expect(html).not.toContain("motion-safe:data-[revealed=true]");
});

test("clamps parallax intensity in render (>40 → 40)", () => {
  const section = createEffectSection({ scrollEffect: "parallax" });
  // Force an out-of-range value past the model normalize (defence in depth).
  const overSection: PageSectionV2 = {
    ...section,
    style: { ...section.style, parallaxIntensity: 9999 },
  };
  const html = renderToStaticMarkup(<PageSectionRender section={overSection} />);
  expect(html).toContain('data-parallax="40"');
});

test("no scrollEffect ⇒ byte-identical <section> (no attr, no wrapper)", () => {
  const html = renderToStaticMarkup(<PageSectionRender section={createEffectSection({})} />);
  expect(html).not.toContain("data-page-effect");
  expect(html).not.toContain("data-parallax");
  expect(html).not.toContain("data-parallax-inner");
  expect(html).not.toContain("motion-safe:transition-[opacity,transform]");
});

test("PAGE_REVEAL_MOTION_CSS is reduced-motion-safe + reveal-armed scoped", () => {
  expect(PAGE_REVEAL_MOTION_CSS).toContain("@media (prefers-reduced-motion: no-preference)");
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-reveal-armed]");
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-page-effect^="reveal"]:not([data-revealed]){opacity:0}'
  );
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    '[data-page-effect="reveal-up"]:not([data-revealed]){--cx-reveal-y:1rem}'
  );
});

// ---------------------------------------------------------------------------
// TASK-525-02 — per-block staggered reveal (--reveal-delay + child cascade).
// ---------------------------------------------------------------------------

test("TASK-525-02: emits --reveal-delay on the block frame when authored", () => {
  const block = createPageBlockV2("text", {
    id: "blk-reveal-delay",
    style: { revealDelay: 240 } as PageBlockV2["style"],
  });
  const props = toPageBlockRenderProps(block);
  expect((props.style as Record<string, string>)["--reveal-delay"]).toBe("240ms");
});

test("TASK-525-02: omits --reveal-delay when unset (byte-identical frame style)", () => {
  const block = createPageBlockV2("text", { id: "blk-reveal-none" });
  const props = toPageBlockRenderProps(block);
  expect("--reveal-delay" in props.style).toBe(false);
});

test("TASK-525-02: revealing CHILDREN carry their own hide-state + transition (cascade is NOT inert)", () => {
  // Guard against the inert path: a bare transition-delay on [data-page-block]
  // with no LIVE child transition produces zero visible stagger. Assert the child
  // reveal transition + hide-state actually exist, keyed off the section's
  // data-revealed, so --reveal-delay has a transition to delay.
  expect(PAGE_REVEAL_MOTION_CSS).toContain("prefers-reduced-motion: no-preference");
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-reveal-armed]");
  // child hide-state while the section is not yet revealed:
  expect(PAGE_REVEAL_MOTION_CSS).toContain(":not([data-revealed]) [data-page-block]");

  // REGRESSION GUARD (post-audit HIGH): the child reveal transition + transition-delay
  // MUST live on a STATE-INDEPENDENT rule — one NOT gated by :not([data-revealed]).
  // Per CSS Transitions, the transition is governed by the AFTER-CHANGE (revealed)
  // computed style; if the transition only appeared on the :not([data-revealed]) rule
  // it would reset to `all 0s` once the section is revealed and the blocks would JUMP
  // (no fade, no per-block delay, no cascade). We therefore isolate every declaration
  // block that carries the child transition-delay and require at least one of them to
  // target [data-page-block] WITHOUT a preceding :not([data-revealed]) on that same
  // compound selector.
  const declRe =
    /([^{}]*\[data-page-block\])\{([^}]*transition-delay:var\(--reveal-delay,0ms\)[^}]*)\}/g;
  const transitionDeclarations = [...PAGE_REVEAL_MOTION_CSS.matchAll(declRe)];
  // the transition rule exists at all:
  expect(transitionDeclarations.length).toBeGreaterThan(0);
  // and it also carries the actual opacity/transform transition:
  expect(transitionDeclarations.some(([, , body]) => /transition:opacity[^;]*/.test(body))).toBe(
    true
  );
  // at least one transition-carrying rule is STATE-INDEPENDENT (survives into revealed):
  const hasStateIndependentTransition = transitionDeclarations.some(
    ([, selector]) => !/:not\(\[data-revealed\]\)/.test(selector)
  );
  expect(hasStateIndependentTransition).toBe(true);
  // and the hide-state rule (opacity:0) is still gated on :not([data-revealed]):
  expect(PAGE_REVEAL_MOTION_CSS).toMatch(
    /:not\(\[data-revealed\]\) \[data-page-block\]\{opacity:0\}/
  );

  // revealed target keyed on the SECTION's data-revealed (runtime toggles section only):
  expect(PAGE_REVEAL_MOTION_CSS).toContain("[data-revealed] [data-page-block]");
  expect(PAGE_REVEAL_MOTION_CSS).toContain(
    "[data-revealed] [data-page-block]{opacity:1;--cx-reveal-y:0}"
  );
});

test("TASK-525-02: staggers a revealing section's children with distinct per-block --reveal-delay", () => {
  // Three blocks with revealDelay 0/120/240 in a reveal-up section → three frames
  // each carrying its own --reveal-delay. Combined with the child transition rule
  // asserted above, this is a real cascade (not distinct vars alone).
  const delays = [0, 120, 240];
  const emitted = delays.map(
    (d) =>
      (
        toPageBlockRenderProps(
          createPageBlockV2("text", {
            id: `blk-stagger-${d}`,
            style: { revealDelay: d } as PageBlockV2["style"],
          })
        ).style as Record<string, string>
      )["--reveal-delay"]
  );
  expect(emitted).toEqual(["0ms", "120ms", "240ms"]);
  expect(new Set(emitted).size).toBe(3);
});

test("TASK-535 — revealDelay does NOT inherit: the reveal CSS resets --reveal-delay per [data-page-block] frame", () => {
  // `--reveal-delay` is a CSS CUSTOM PROPERTY (inherits by default). A block stamps
  // it INLINE on its OWN frame, so a container that authors revealDelay would leak
  // its value onto every un-delayed nested child (they'd cascade at the ancestor's
  // delay instead of 0). The reveal CSS rule that reads it must ALSO reset it to 0ms
  // on the same [data-page-block] selector, so an un-delayed descendant uses 0ms
  // (author-stylesheet reset), while an authored frame's INLINE value still wins the
  // cascade (inline beats an author-stylesheet declaration).
  const declRe =
    /([^{}]*\[data-page-block\])\{([^}]*transition-delay:var\(--reveal-delay,0ms\)[^}]*)\}/g;
  const transitionDeclarations = [...PAGE_REVEAL_MOTION_CSS.matchAll(declRe)];
  expect(transitionDeclarations.length).toBeGreaterThan(0);
  // At least one transition-carrying rule ALSO resets the custom property to 0ms so
  // the value cannot inherit from an ancestor frame onto an un-delayed descendant.
  expect(transitionDeclarations.some(([, , body]) => body.includes("--reveal-delay:0ms"))).toBe(
    true
  );
  // The reset lives on the SAME state-independent rule that carries the transition
  // (so it survives into the revealed state), and precedes the `var()` read.
  const resetRule = transitionDeclarations.find(([, , body]) =>
    body.includes("--reveal-delay:0ms")
  );
  expect(resetRule).toBeDefined();
  const body = resetRule?.[2] ?? "";
  expect(body.indexOf("--reveal-delay:0ms")).toBeLessThan(
    body.indexOf("transition-delay:var(--reveal-delay,0ms)")
  );
  // The reset rule stays state-independent (not gated by :not([data-revealed])).
  expect(/:not\(\[data-revealed\]\)/.test(resetRule?.[1] ?? "")).toBe(false);
});

test("TASK-535 — a container's revealDelay is NOT stamped inline onto an un-delayed nested child (no inline leak)", () => {
  // DOM-structure proof of the inheritance fix's premise: the un-authored child frame
  // carries NO inline --reveal-delay (so the CSS per-frame 0ms reset governs it and it
  // does not inherit the ancestor's 500ms), while BOTH the container that authored the
  // delay AND a sibling that authored its OWN delay keep their inline values.
  const container = createPageBlockV2("container", {
    id: "blk-parent-delay",
    style: { revealDelay: 500 } as PageBlockV2["style"],
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-child-nodelay",
          props: { text: "child", level: "h2", align: "left" },
        }),
        createPageBlockV2("text", {
          id: "blk-child-owndelay",
          style: { revealDelay: 120 } as PageBlockV2["style"],
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-reveal-nest", blocks: [container] })}
    />
  );
  // The container frame carries its own inline delay…
  const parentTag = html.match(/<div[^>]*data-block-id="blk-parent-delay"[^>]*>/)?.[0] ?? "";
  expect(parentTag).toContain("--reveal-delay:500ms");
  // …the self-delayed sibling keeps its OWN inline delay…
  const ownTag = html.match(/<div[^>]*data-block-id="blk-child-owndelay"[^>]*>/)?.[0] ?? "";
  expect(ownTag).toContain("--reveal-delay:120ms");
  // …but the un-delayed child frame has NO inline --reveal-delay (would otherwise
  // pin the author's 0 to the ancestor's 500ms via inheritance — the CSS reset owns
  // it instead). Its frame `style` should not mention the var at all.
  const childTag = html.match(/<div[^>]*data-block-id="blk-child-nodelay"[^>]*>/)?.[0] ?? "";
  expect(childTag).not.toContain("--reveal-delay");
});

test("TASK-535 — revealDelay-only (no section scrollEffect) is INERT by design: no motion CSS / marker / script", () => {
  // Documented scope: revealDelay is a STAGGER within a revealing section, not a
  // standalone reveal trigger. A page whose ONLY authored motion is a block
  // revealDelay — inside a section with NO scrollEffect — emits NO reveal
  // stylesheet, NO data-page-motion marker and NO runtime <script>: nothing hides
  // or observes the block, so the (still-stamped) --reveal-delay var is inert. The
  // fix for a visible reveal is to author the SECTION's reveal scrollEffect.
  const delayOnlySection = createPageSectionV2("content", {
    id: "sec-delay-only",
    style: {
      background: "#ffffff",
      backgroundType: "none",
      backgroundImage: null,
      accent: "#111111",
      radius: 0,
      shadow: "none",
      // NOTE: no scrollEffect authored.
    },
    blocks: [
      createPageBlockV2("text", {
        id: "blk-delay-only",
        style: { revealDelay: 300 } as PageBlockV2["style"],
      }),
    ],
  });
  const doc = createEffectsDocument([delayOnlySection]);
  const html = renderToStaticMarkup(<PageDocumentRender document={doc} />);
  // The block still carries its inline var (present-only, harmless)…
  expect(html).toContain("--reveal-delay:300ms");
  // …but NONE of the section-reveal machinery is emitted (inert by design).
  expect(html).not.toContain("data-page-motion-css");
  expect(html).not.toContain("data-page-motion=");
  expect(html).not.toContain("data-page-effect");
  expect(html).not.toContain(`data-coderso-runtime-script="${PAGE_EFFECTS_RUNTIME_ID}"`);
});

// ---------------------------------------------------------------------------
// TASK-521-05-L03 — page-shell effects (PageDocumentRender): cursor spotlight,
// data-page-motion marker, reveal-hide + noscript, runtime script, byte-identity.
// ---------------------------------------------------------------------------

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
  const navigationSource = readFileSync(
    new URL("../../../core/widgets/core/navigation.tsx", import.meta.url),
    "utf8"
  );
  const widgetRendererSource = readFileSync(
    new URL("../../../core/widgets/renderers/widgetRenderer.tsx", import.meta.url),
    "utf8"
  );
  expect(navigationSource).toContain("sticky z-40");
  expect(widgetRendererSource).toContain("sticky z-40");
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
