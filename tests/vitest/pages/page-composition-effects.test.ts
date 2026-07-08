import { describe, expect, test } from "vitest";

import {
  PAGE_COMPOSITION_EFFECTS_CSS,
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
      ".cx-marquee-track",
      ".cx-layered-canvas",
      ".cx-layered-slot",
      '[data-composition="layered"] [data-layer]',
    ]) {
      expect(css).toContain(staticSel);
      expect(css.indexOf(staticSel)).toBeLessThan(gate);
    }
  });

  test("includes all 9 layer-anchor transform rules", () => {
    for (const anchor of pageLayerAnchors) {
      expect(css).toContain(`[data-layer-anchor="${anchor}"]`);
    }
  });

  test("marquee animation targets .cx-marquee-track, not [data-marquee] > *", () => {
    expect(css).toContain("[data-marquee] .cx-marquee-track{animation:cx-ticker");
    expect(css).not.toContain("[data-marquee] > *");
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

describe("hover-transition + orb-drift are gated; surfaces static (TASK-522-05-L05)", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;
  const gate = css.indexOf("@media (prefers-reduced-motion: no-preference)");

  test("hover TRANSITION + :hover targets sit INSIDE the no-preference gate", () => {
    for (const sel of [
      '[data-hover="glow-reveal"]:hover::after,[data-hover="lift-glow"]:hover::after{opacity:1}',
      '[data-hover="lift"]:hover,[data-hover="lift-glow"]:hover{transform:translateY(-6px)}',
      '[data-hover="scale"]:hover{transform:scale(1.03)}',
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
