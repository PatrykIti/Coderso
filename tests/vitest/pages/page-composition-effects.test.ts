import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  PAGE_BLOCK_TRANSFORM_HOST_SELECTOR,
  PAGE_BLOCK_TRANSFORM_VARIABLES,
  PAGE_COMPOSITION_EFFECTS_CSS,
  PAGE_LAYER_WIDTH_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_SELECTOR,
  resolveBlockCompositionAttrs,
  resolveDrawInAttrs,
  resolveSectionCompositionAttrs,
} from "../../../core/services/pages/pageCompositionEffects";
import {
  pageLayerAnchors,
  type PageBlockStyleV2,
  type PageSectionStyleV2,
} from "../../../core/services/pages/pageDocumentV2";

// TASK-522-01-L06 — composition-effects static CSS + pure resolvers.

describe("PAGE_COMPOSITION_EFFECTS_CSS", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;

  test("TASK-539-04: the eleven transform variables are the exact fixed bytes", () => {
    expect(PAGE_BLOCK_TRANSFORM_VARIABLES).toEqual({
      revealY: "--cx-reveal-y",
      decorationX: "--cx-decoration-x",
      decorationY: "--cx-decoration-y",
      decorationRotate: "--cx-decoration-rotate",
      decorationScale: "--cx-decoration-scale",
      hoverY: "--cx-hover-y",
      hoverScale: "--cx-hover-scale",
      tiltX: "--cx-tilt-x",
      tiltY: "--cx-tilt-y",
      magneticX: "--cx-magnetic-x",
      magneticY: "--cx-magnetic-y",
    });
    expect(Object.keys(PAGE_BLOCK_TRANSFORM_VARIABLES)).toHaveLength(11);
  });

  test("TASK-539-04: host attribute/selector + layer-width + marquee-replica bytes", () => {
    expect(PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE).toBe("data-page-transform-host");
    expect(PAGE_BLOCK_TRANSFORM_HOST_SELECTOR).toBe("[data-page-transform-host]");
    expect(PAGE_LAYER_WIDTH_ATTRIBUTE).toBe("data-layer-width");
    expect(PAGE_MARQUEE_REPLICA_ATTRIBUTE).toBe("data-page-marquee-replica");
    expect(PAGE_MARQUEE_REPLICA_SELECTOR).toBe("[data-page-marquee-replica]");
    // the selector is derived from the attribute, never respelled
    expect(PAGE_BLOCK_TRANSFORM_HOST_SELECTOR).toBe(`[${PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE}]`);
    expect(PAGE_MARQUEE_REPLICA_SELECTOR).toBe(`[${PAGE_MARQUEE_REPLICA_ATTRIBUTE}]`);
  });

  test("TASK-539-04: ONE host formula with the exact order and neutral fallbacks", () => {
    const { revealY, decorationX, decorationY, decorationRotate, decorationScale } =
      PAGE_BLOCK_TRANSFORM_VARIABLES;
    const { hoverY, hoverScale, tiltX, tiltY, magneticX, magneticY } =
      PAGE_BLOCK_TRANSFORM_VARIABLES;
    const formula =
      `[data-page-transform-host]{transform:` +
      `translateY(var(${revealY},0px)) ` +
      `translate(var(${decorationX},0px),var(${decorationY},0px)) ` +
      `rotate(var(${decorationRotate},0deg)) scale(var(${decorationScale},1)) ` +
      `translateY(var(${hoverY},0px)) scale(var(${hoverScale},1)) ` +
      `rotateX(var(${tiltX},0deg)) rotateY(var(${tiltY},0deg)) ` +
      `translate(var(${magneticX},0px),var(${magneticY},0px))}`;
    expect(css).toContain(formula);
  });

  test("TASK-539-04: typed properties register all eleven variables for interpolation", () => {
    for (const bytes of Object.values(PAGE_BLOCK_TRANSFORM_VARIABLES)) {
      expect(css).toContain(`@property ${bytes}{`);
    }
    // neutral registered initial-values match the formula fallbacks
    expect(css).toContain(
      '@property --cx-reveal-y{syntax:"<length-percentage>";inherits:true;initial-value:0px}'
    );
    expect(css).toContain(
      '@property --cx-decoration-scale{syntax:"<number>";inherits:true;initial-value:1}'
    );
    expect(css).not.toContain("@property --cx-orbit-fallback"); // never registers invented names
  });

  test("TASK-539-04: decoration keyframes write ONLY decoration variables; radiate stays box-shadow", () => {
    expect(css).toContain("@keyframes cx-float{50%{--cx-decoration-y:-12px}}");
    expect(css).toContain(
      "@keyframes cx-drift{50%{--cx-decoration-x:30px;--cx-decoration-y:-26px;--cx-decoration-scale:1.06}}"
    );
    expect(css).toContain("@keyframes cx-pulse{50%{--cx-decoration-scale:1.12;opacity:.7}}");
    expect(css).toContain("@keyframes cx-orbit{to{--cx-decoration-rotate:360deg}}");
    // radiate keeps its independent box-shadow animation, no transform acquired
    expect(css).toContain("@keyframes cx-radiate{50%{box-shadow:");
    expect(css).not.toContain("@keyframes cx-radiate" + "{50%{transform:");
    // no decoration keyframe writes the transform property anymore
    for (const kf of ["cx-float", "cx-drift", "cx-pulse", "cx-orbit"]) {
      const match = new RegExp(`@keyframes ${kf}\\{([^}]*)}`).exec(css);
      expect(match).not.toBeNull();
      expect(match![1]!).not.toContain("transform:");
    }
  });

  test("TASK-539-04: hover declarations write ONLY hover variables", () => {
    expect(css).toContain(
      '[data-hover="lift"]:hover,[data-hover="lift-glow"]:hover{--cx-hover-y:-6px}'
    );
    expect(css).toContain('[data-hover="scale"]:hover{--cx-hover-scale:1.03}');
    // no hover rule writes the transform property directly anymore
    expect(css).not.toContain('[data-hover="lift"]:hover{transform:');
    expect(css).not.toContain('[data-hover="scale"]:hover{transform:');
    expect(css).not.toContain("transform:translateY(-6px)");
    expect(css).not.toContain("transform:scale(1.03)");
  });

  test("TASK-539-04: layer-width CSS is present-only full/auto and anchors stay on translate", () => {
    expect(css).toContain('[data-layer-width="full"]{width:100%}');
    expect(css).toContain('[data-layer-width="auto"]{width:auto}');
    expect(css).toContain('[data-layer-anchor="top-left"]{translate:0 0}');
  });

  test("TASK-539-04: every glow ::before/::after overlay is pointer-events:none", () => {
    expect(css).toContain(
      '[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:160px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.15)),transparent 66%);opacity:0;pointer-events:none}'
    );
    expect(css).toContain(
      '[data-surface="glass-grid"]::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(142,232,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(142,232,255,.06) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 50% 45%,#000 0 42%,transparent 78%);pointer-events:none}'
    );
    expect(css).toContain(
      '[data-surface="radial-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:200px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.16)),transparent 66%);pointer-events:none}'
    );
    // the host itself must stay interactive (no pointer-events:none on the host)
    expect(css).not.toContain("[data-page-transform-host]{pointer-events:none");
  });

  test("has the reduced-motion no-preference gate and every keyframe inside it", () => {
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
    for (const kf of [
      "@keyframes cx-float",
      "@keyframes cx-drift",
      "@keyframes cx-pulse",
      "@keyframes cx-radiate",
      "@keyframes cx-orbit",
      "@keyframes cx-ticker",
      "@keyframes cx-draw",
    ]) {
      expect(css).toContain(kf);
      // each keyframe sits AFTER the no-preference gate opens
      expect(css.indexOf(kf)).toBeGreaterThan(css.indexOf("no-preference"));
    }
  });

  test("surface presets + base rules + layer-anchor transforms are OUTSIDE the gate (static)", () => {
    const gate = css.indexOf("@media (prefers-reduced-motion: no-preference)");
    for (const staticSel of [
      '[data-surface="glass"]',
      ".cx-orb",
      ".cx-marquee-viewport",
      ".cx-marquee-rail",
      ".cx-marquee-segment",
      ".cx-layered-canvas",
      ".cx-layered-slot",
      '[data-composition="layered"] [data-layer]',
    ]) {
      expect(css).toContain(staticSel);
      expect(css.indexOf(staticSel)).toBeLessThan(gate);
    }
  });

  test("includes all 9 layer-anchor rules", () => {
    for (const anchor of pageLayerAnchors) {
      expect(css).toContain(`[data-layer-anchor="${anchor}"]`);
    }
  });

  test("layer-anchor self-offset rides the `translate:` PROPERTY, not transform (524-01-L01)", () => {
    // The anchor offset now uses the independent CSS `translate:` property so it
    // composes with a transform-based effect on the SAME node (glass floats with
    // content). Offsets are identical; only the composited property differs.
    expect(css).toContain('[data-layer-anchor="top-left"]{translate:0 0}');
    expect(css).toContain('[data-layer-anchor="center"]{translate:-50% -50%}');
    expect(css).toContain('[data-layer-anchor="bottom-right"]{translate:-100% -100%}');
    // No anchor rule may write the transform channel anymore (would clobber the effect).
    expect(css).not.toMatch(/\[data-layer-anchor="[^"]+"\]\{transform:translate\(/);
  });

  test("TASK-539-04: marquee is exactly viewport > rail > segment; the RAIL animates", () => {
    // viewport clips, one flex nowrap width:max-content rail animates, segments nonshrink
    expect(css).toContain(".cx-marquee-viewport{overflow:hidden;width:100%}");
    expect(css).toContain(
      ".cx-marquee-rail{display:flex;flex-wrap:nowrap;width:max-content;will-change:transform}"
    );
    expect(css).toContain(".cx-marquee-segment{flex:0 0 auto}");
    expect(css).toContain("[data-marquee] .cx-marquee-rail{animation:cx-ticker");
    expect(css).toContain(
      '[data-marquee][data-marquee-dir="right"] .cx-marquee-rail{animation-direction:reverse}'
    );
    // the removed legacy track must be gone; no blanket descendant animation
    expect(css).not.toContain(".cx-marquee-track");
    expect(css).not.toContain("[data-marquee] > *");
    // the ticker keyframe translates the rail by its own half-width (one segment)
    expect(css).toContain("@keyframes cx-ticker{to{transform:translateX(-50%)}}");
  });

  test("draw-in uses stroke-dasharray:1 (length-independent)", () => {
    expect(css).toContain("stroke-dasharray:1");
    expect(css).toContain("stroke-dashoffset:1");
  });

  test("hover glow names BOTH glow-reveal AND lift-glow with a content-bearing ::after (finding 1)", () => {
    // base positioning context for BOTH
    expect(css).toContain(
      '[data-hover="glow-reveal"],[data-hover="lift-glow"]{position:relative;overflow:hidden}'
    );
    // the content-bearing ::after names lift-glow too (not glow-reveal alone)
    expect(css).toContain(
      '[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{content:""'
    );
  });

  test("524-03: glass surface presets clip their rounded box during transform (overflow:hidden)", () => {
    // The surface node carries the inline border-radius (style.radius / section
    // radius) AND, after 524-01-L02, the transform-writing effect. Without an
    // overflow clip the backdrop-filter / grid ::before layer paints to the
    // node's SQUARE box, so tilt/float/lift exposes SHARP corners past the
    // rounded card. `overflow:hidden` on the glass surface node itself keeps the
    // rounded corners clipped throughout the transform.
    expect(css).toContain('[data-surface="glass"]{');
    // the glass rule must carry overflow:hidden (backdrop-filter + border box)
    const glassRule = css.slice(
      css.indexOf('[data-surface="glass"]{'),
      css.indexOf("}", css.indexOf('[data-surface="glass"]{'))
    );
    expect(glassRule).toContain("backdrop-filter");
    expect(glassRule).toContain("overflow:hidden");
    // the glass-grid preset (::before grid layer) clips its rounded box too
    expect(css).toContain('[data-surface="glass-grid"]{position:relative;overflow:hidden}');
  });
});

describe("resolveBlockCompositionAttrs — present-only", () => {
  test("undefined style → empty attrs/vars (byte-identity)", () => {
    const r = resolveBlockCompositionAttrs(undefined);
    expect(r.dataAttrs).toEqual({});
    expect(r.cssVars).toEqual({});
    expect(r.perspectiveParent).toBe(false);
    expect(r.glare).toBe(false);
    expect(r.ambientOrbs).toBe(false);
  });

  test("empty style → empty attrs/vars", () => {
    const r = resolveBlockCompositionAttrs({});
    expect(r.dataAttrs).toEqual({});
    expect(r.cssVars).toEqual({});
  });

  test("decoration → data-deco + delay/duration vars", () => {
    const r = resolveBlockCompositionAttrs({
      decoration: { motion: "float", delay: 200, duration: 8000 },
    });
    expect(r.dataAttrs["data-deco"]).toBe("float");
    expect(r.cssVars["--deco-delay"]).toBe("200ms");
    expect(r.cssVars["--deco-duration"]).toBe("8000ms");
  });

  test("layer → --layer-x/y/z custom props + data-layer + data-layer-anchor (NOT raw left/top)", () => {
    const r = resolveBlockCompositionAttrs({
      layer: { x: 10, y: -20, z: 5, anchor: "bottom-right" },
    });
    expect(r.dataAttrs["data-layer"]).toBe("");
    expect(r.dataAttrs["data-layer-anchor"]).toBe("bottom-right");
    expect(r.cssVars["--layer-x"]).toBe("10%");
    expect(r.cssVars["--layer-y"]).toBe("-20%");
    expect(r.cssVars["--layer-z"]).toBe("5");
    expect(r.cssVars).not.toHaveProperty("left");
    expect(r.cssVars).not.toHaveProperty("top");
  });

  test("marquee → data-marquee presence + dir + speed var", () => {
    const r = resolveBlockCompositionAttrs({
      marquee: { speed: 18, direction: "right", seamless: true },
    });
    expect(r.dataAttrs["data-marquee"]).toBe("");
    expect(r.dataAttrs["data-marquee-dir"]).toBe("right");
    expect(r.cssVars["--marquee-speed"]).toBe("18s");
  });

  test("tilt → data-block-tilt + perspectiveParent; tiltGlare → glare flag", () => {
    const r = resolveBlockCompositionAttrs({ tilt: "strong", tiltGlare: true });
    expect(r.dataAttrs["data-block-tilt"]).toBe("strong");
    expect(r.perspectiveParent).toBe(true);
    expect(r.glare).toBe(true);
  });

  test("surface/hover/composition → data attrs", () => {
    const r = resolveBlockCompositionAttrs({
      surfacePreset: "ambient-orbs",
      hoverEffect: "lift-glow",
      composition: "layered",
    });
    expect(r.dataAttrs["data-surface"]).toBe("ambient-orbs");
    expect(r.dataAttrs["data-hover"]).toBe("lift-glow");
    expect(r.dataAttrs["data-composition"]).toBe("layered");
    expect(r.ambientOrbs).toBe(true);
  });

  test("TASK-539-04: transform host stamped for block-owned transform effects", () => {
    const host = PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE;
    for (const motion of ["float", "drift", "pulse", "orbit"] as const) {
      expect(resolveBlockCompositionAttrs({ decoration: { motion } }).dataAttrs[host]).toBe("");
    }
    for (const hover of ["lift", "scale", "lift-glow"] as const) {
      expect(resolveBlockCompositionAttrs({ hoverEffect: hover }).dataAttrs[host]).toBe("");
    }
    expect(resolveBlockCompositionAttrs({ tilt: "strong" }).dataAttrs[host]).toBe("");
    expect(resolveBlockCompositionAttrs({ magnetic: true }).dataAttrs[host]).toBe("");
  });

  test("TASK-539-04: NO host for non-transform effects or no-effect styles", () => {
    const host = PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE;
    // radiate is box-shadow only; glow-reveal is opacity only
    expect(
      resolveBlockCompositionAttrs({ decoration: { motion: "radiate" } }).dataAttrs
    ).not.toHaveProperty(host);
    expect(
      resolveBlockCompositionAttrs({ hoverEffect: "glow-reveal" }).dataAttrs
    ).not.toHaveProperty(host);
    // surfaces / layers / marquee alone do NOT stamp a transform host
    expect(resolveBlockCompositionAttrs({ surfacePreset: "glass" }).dataAttrs).not.toHaveProperty(
      host
    );
    expect(resolveBlockCompositionAttrs({ layer: { x: 10, y: 20 } }).dataAttrs).not.toHaveProperty(
      host
    );
    expect(
      resolveBlockCompositionAttrs({ marquee: { speed: 18, seamless: true } }).dataAttrs
    ).not.toHaveProperty(host);
    expect(resolveBlockCompositionAttrs({}).dataAttrs).not.toHaveProperty(host);
    expect(resolveBlockCompositionAttrs(undefined).dataAttrs).not.toHaveProperty(host);
  });

  test("TASK-539-04: data-magnetic presence attr is stamped ONLY for true", () => {
    expect(resolveBlockCompositionAttrs({ magnetic: true }).dataAttrs["data-magnetic"]).toBe("");
    expect(resolveBlockCompositionAttrs({ magnetic: false }).dataAttrs).not.toHaveProperty(
      "data-magnetic"
    );
    expect(resolveBlockCompositionAttrs({}).dataAttrs).not.toHaveProperty("data-magnetic");
  });
});

describe("color threading (parent Security Contract §2 / finding 4)", () => {
  test("BLOCK with a surface preset + PLAIN-color background threads --surface-glow", () => {
    const style: PageBlockStyleV2 = { surfacePreset: "radial-glow", background: "#ff0088" };
    const r = resolveBlockCompositionAttrs(style);
    expect(r.cssVars["--surface-glow"]).toBe("#ff0088");
    expect(r.cssVars["--deco-ring"]).toBe("#ff0088");
    expect(r.cssVars["--orb-color"]).toBe("#ff0088");
  });

  test("BLOCK with decoration:radiate|pulse + plain background threads the glow", () => {
    for (const motion of ["radiate", "pulse", "drift", "float"] as const) {
      const r = resolveBlockCompositionAttrs({ decoration: { motion }, background: "#123456" });
      expect(r.cssVars["--surface-glow"]).toBe("#123456");
    }
  });

  test("BLOCK with a GRADIENT background yields NO --surface-glow (invalid in radial-gradient)", () => {
    const r = resolveBlockCompositionAttrs({
      surfacePreset: "radial-glow",
      background: "linear-gradient(90deg,#000,#fff)",
    });
    expect(r.cssVars).not.toHaveProperty("--surface-glow");
  });

  test("BLOCK with NO background yields NO --surface-glow (falls back to the literal)", () => {
    const r = resolveBlockCompositionAttrs({ surfacePreset: "radial-glow" });
    expect(r.cssVars).not.toHaveProperty("--surface-glow");
  });

  test("[data-surface=glass] CSS uses background-image so an inline background tints through", () => {
    expect(PAGE_COMPOSITION_EFFECTS_CSS).toContain('[data-surface="glass"]{background-image:');
  });

  // TASK-524-02-L04 — surfaceTint seeds the glow INDEPENDENTLY of background;
  // background stays a FALLBACK only when no surfaceTint is authored.
  test("surfaceTint WINS over background for the glow", () => {
    // Render-time re-sanitization canonicalizes rgba (TASK-541 canonical bytes;
    // the 539-01 owner suite pins the same spaced 0.5 form).
    const v = resolveBlockCompositionAttrs({
      surfacePreset: "glass",
      background: "#123456",
      surfaceTint: "rgba(142,232,255,.5)",
    }).cssVars;
    expect(v["--surface-glow"]).toBe("rgba(142, 232, 255, 0.5)");
    expect(v["--deco-ring"]).toBe("rgba(142, 232, 255, 0.5)");
    expect(v["--orb-color"]).toBe("rgba(142, 232, 255, 0.5)");
  });

  test("three different-background chips + same surfaceTint → identical glow", () => {
    const glow = (bg: string) =>
      resolveBlockCompositionAttrs({
        surfacePreset: "glass",
        background: bg,
        surfaceTint: "rgba(142,232,255,.5)",
      }).cssVars["--surface-glow"];
    expect(glow("#8ee8ff")).toBe(glow("#adffd8"));
    expect(glow("#adffd8")).toBe("rgba(142, 232, 255, 0.5)");
  });

  test("surfaceTint with NO background still seeds the glow", () => {
    const v = resolveBlockCompositionAttrs({
      surfacePreset: "glass",
      surfaceTint: "#8ee8ff",
    }).cssVars;
    expect(v["--surface-glow"]).toBe("#8ee8ff");
  });

  test("no surfaceTint → 522 background-derived glow (byte-identical)", () => {
    const v = resolveBlockCompositionAttrs({
      surfacePreset: "glass",
      background: "#123456",
    }).cssVars;
    expect(v["--surface-glow"]).toBe("#123456");
  });

  test("bare surfaceTint with no surface/hover/glow-deco emits no glow vars (needsGlow gate)", () => {
    const v = resolveBlockCompositionAttrs({ surfaceTint: "#8ee8ff" }).cssVars;
    expect(v).not.toHaveProperty("--surface-glow");
  });
});

describe("resolveSectionCompositionAttrs", () => {
  test("undefined → empty", () => {
    const r = resolveSectionCompositionAttrs(undefined);
    expect(r.dataAttrs).toEqual({});
    expect(r.cssVars).toEqual({});
    expect(r.ambientOrbs).toBe(false);
  });

  test("surface + accent threads the glow off the real accent field", () => {
    const style: PageSectionStyleV2 = {
      background: "#fff",
      backgroundType: "color",
      accent: "#ff0088",
      radius: 0,
      shadow: "none",
      surfacePreset: "glass",
    };
    const r = resolveSectionCompositionAttrs(style);
    expect(r.dataAttrs["data-surface"]).toBe("glass");
    expect(r.cssVars["--surface-glow"]).toBe("#ff0088");
  });

  test("composition:layered → data-composition", () => {
    const style: PageSectionStyleV2 = {
      background: "#fff",
      backgroundType: "color",
      accent: "#000",
      radius: 0,
      shadow: "none",
      composition: "layered",
    };
    expect(resolveSectionCompositionAttrs(style).dataAttrs["data-composition"]).toBe("layered");
  });
});

describe("glow render-parity re-sanitization (TASK-535 defence-in-depth)", () => {
  // The resolvers run at RENDER and thread the glow into `style` custom props, so
  // they re-run sanitizeAuthoringCssColor exactly as spotlight/canvas-bg do — a
  // value that bypassed the write boundary cannot reach the DOM as a
  // `;`-delimited CSS injection. Valid colors pass through (rgba is re-emitted in
  // the canonical TASK-541 spaced/0.5 form; hex/tokens are byte-identical).
  const GLOW_VARS = ["--surface-glow", "--deco-ring", "--orb-color"] as const;

  test("BLOCK: a valid plain color / token / rgba passes through unchanged", () => {
    // rgba is re-canonicalized at render (TASK-541 canonical bytes, spaced 0.5
    // form — the same bytes the 539-01 owner suite pins for round-trip).
    for (const color of ["#8ee8ff", "rgba(142, 232, 255, 0.5)", "var(--color-primary)"]) {
      const v = resolveBlockCompositionAttrs({
        surfacePreset: "glass",
        surfaceTint: color,
      }).cssVars;
      for (const k of GLOW_VARS) expect(v[k]).toBe(color);
    }
  });

  test("BLOCK: a `;`-delimited CSS-injection surfaceTint drops the glow (all three vars)", () => {
    const v = resolveBlockCompositionAttrs({
      surfacePreset: "glass",
      surfaceTint: "#fff;position:fixed;inset:0",
    }).cssVars;
    for (const k of GLOW_VARS) expect(v).not.toHaveProperty(k);
  });

  test("BLOCK: an injection in the background-derived glow fallback is dropped", () => {
    const v = resolveBlockCompositionAttrs({
      surfacePreset: "glass",
      background: "red;z-index:2147483647",
    }).cssVars;
    for (const k of GLOW_VARS) expect(v).not.toHaveProperty(k);
  });

  test("SECTION: a valid accent passes unchanged; an injection accent drops the glow", () => {
    const ok = resolveSectionCompositionAttrs({
      background: "#fff",
      backgroundType: "color",
      accent: "#c7b7ff",
      radius: 0,
      shadow: "none",
      surfacePreset: "radial-glow",
    }).cssVars;
    for (const k of GLOW_VARS) expect(ok[k]).toBe("#c7b7ff");

    const bad = resolveSectionCompositionAttrs({
      background: "#fff",
      backgroundType: "color",
      accent: "red;z-index:9",
      radius: 0,
      shadow: "none",
      surfacePreset: "radial-glow",
    }).cssVars;
    for (const k of GLOW_VARS) expect(bad).not.toHaveProperty(k);
  });

  test("present-only preserved: no style / no preset still yields no glow vars", () => {
    expect(resolveBlockCompositionAttrs(undefined).cssVars).toEqual({});
    expect(resolveBlockCompositionAttrs({ surfaceTint: "#8ee8ff" }).cssVars).not.toHaveProperty(
      "--surface-glow"
    );
    expect(
      resolveSectionCompositionAttrs({
        background: "#fff",
        backgroundType: "color",
        accent: "#c7b7ff",
        radius: 0,
        shadow: "none",
      }).cssVars
    ).not.toHaveProperty("--surface-glow");
  });
});

describe("hover-transition + orb-drift are gated; surfaces static (TASK-522-05-L05)", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;
  const gate = css.indexOf("@media (prefers-reduced-motion: no-preference)");

  test("hover TRANSITION + :hover targets sit INSIDE the no-preference gate", () => {
    for (const sel of [
      '[data-hover="glow-reveal"]:hover::after,[data-hover="lift-glow"]:hover::after{opacity:1}',
      '[data-hover="lift"]:hover,[data-hover="lift-glow"]:hover{--cx-hover-y:-6px}',
      '[data-hover="scale"]:hover{--cx-hover-scale:1.03}',
    ]) {
      expect(css).toContain(sel);
      expect(css.indexOf(sel)).toBeGreaterThan(gate);
    }
  });

  test("orb drift binds [data-deco=drift] and animates only inside the gate", () => {
    const driftBind = '[data-deco="drift"]{animation:cx-drift';
    expect(css).toContain(driftBind);
    expect(css.indexOf(driftBind)).toBeGreaterThan(gate);
    // the .cx-orb base circles stay static (outside the gate).
    expect(css.indexOf(".cx-orb{")).toBeLessThan(gate);
  });

  test("glass/grid/glow surface paints are STATIC (outside the gate)", () => {
    for (const sel of [
      '[data-surface="glass"]',
      '[data-surface="glass-grid"]',
      '[data-surface="radial-glow"]',
    ]) {
      expect(css.indexOf(sel)).toBeLessThan(gate);
    }
  });
});

describe("resolveDrawInAttrs", () => {
  test("drawIn off → empty", () => {
    expect(resolveDrawInAttrs(false)).toEqual({ dataAttrs: {}, cssVars: {} });
    expect(resolveDrawInAttrs(undefined, 2400)).toEqual({ dataAttrs: {}, cssVars: {} });
  });
  test("drawIn on → data-draw-in + optional --draw-speed", () => {
    expect(resolveDrawInAttrs(true, 2400)).toEqual({
      dataAttrs: { "data-draw-in": "" },
      cssVars: { "--draw-speed": "2400ms" },
    });
    expect(resolveDrawInAttrs(true)).toEqual({ dataAttrs: { "data-draw-in": "" }, cssVars: {} });
  });
});
