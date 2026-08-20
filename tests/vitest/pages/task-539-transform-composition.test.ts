/**
 * TASK-539-04-L02 — prove independent transform composition.
 *
 * This suite supplements page-composition-effects.test.ts (TASK-522-01-L06) and
 * task-534-interactivity-css.test.ts (TASK-534) with the TASK-539-04 proof
 * surface: the five independent transform channels (reveal, decoration, hover,
 * tilt, magnetic) must compose through ONE host formula with EXACTLY eleven
 * custom-property bytes, neutral 0px/0deg/1 defaults, and channel-owned writes.
 *
 * Scope guard (mirrors the TASK-539-04 contract): this suite proves the STATIC
 * CSS bytes, the pure resolver output, and the fixed vocabulary only. It does
 * NOT claim actual element stamping, runtime movement, clone isolation, or
 * browser geometry — TASK-539-05/07/08 own stamping the host on real DOM, the
 * runtime variable writes, marquee clone handling, and measured geometry.
 *
 * The only value imports are the L01 pure CSS owners/constants; the
 * `PageBlockStyleV2` import below is a compile-time-erased type-only import for
 * fixture typing (same model module the L01 source itself imports). No
 * renderer/runtime module and no pageBlockGridPlacement is imported.
 */
import { describe, expect, test } from "vitest";

import {
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  PAGE_BLOCK_TRANSFORM_HOST_SELECTOR,
  PAGE_BLOCK_TRANSFORM_VARIABLES,
  PAGE_COMPOSITION_EFFECTS_CSS,
  PAGE_INTERACTIVITY_CSS,
  PAGE_LAYER_WIDTH_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_SELECTOR,
  resolveBlockCompositionAttrs,
  resolveSectionCompositionAttrs,
} from "../../../core/services/pages/pageCompositionEffects";
import type { PageBlockStyleV2 } from "../../../core/services/pages/pageDocumentV2";

const V = PAGE_BLOCK_TRANSFORM_VARIABLES;
const HOST = PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE;

// Exact single-declaration rule extractor. `selector` must occur exactly once
// with a brace-balanced body (no nested braces), e.g. the host formula rule.
const exactRule = (css: string, selector: string): string => {
  const start = css.indexOf(selector);
  expect(start).not.toBe(-1);
  const bodyStart = start + selector.length;
  expect(css[bodyStart]).toBe("{");
  const end = css.indexOf("}", bodyStart);
  expect(end).not.toBe(-1);
  return css.slice(start, end + 1);
};

// Body of a `@keyframes NAME{...}` up to its FIRST inner close brace. Every
// decoration keyframe is `@keyframes NAME{<frame>{<decls>}}`, so the first
// brace closes the frame block and all channel writes sit inside it.
const keyframeBody = (css: string, name: string): string => {
  const start = css.indexOf(`@keyframes ${name}{`);
  expect(start).not.toBe(-1);
  const end = css.indexOf("}", start);
  expect(end).not.toBe(-1);
  return css.slice(start, end + 1);
};

const channelVars = {
  reveal: [V.revealY],
  decoration: [V.decorationX, V.decorationY, V.decorationRotate, V.decorationScale],
  hover: [V.hoverY, V.hoverScale],
  tilt: [V.tiltX, V.tiltY],
  magnetic: [V.magneticX, V.magneticY],
} as const;

// Custom-property WRITES (assignment `--cx-*:`) inside a bounded text segment.
const writesIn = (text: string): string[] =>
  (text.match(/--cx-[\w-]+:/g) ?? []).map((m) => m.slice(0, -1));

// ──────────────────────────────────────────────────────────────────────────────
// 1) The eleven variable bytes + fixed vocabulary
// ──────────────────────────────────────────────────────────────────────────────
describe("eleven transform variable bytes + fixed vocabulary", () => {
  test("channel grouping is exactly reveal 1 / decoration 4 / hover 2 / tilt 2 / magnetic 2", () => {
    expect(PAGE_BLOCK_TRANSFORM_VARIABLES.revealY).toBe("--cx-reveal-y");
    expect({
      decorationX: V.decorationX,
      decorationY: V.decorationY,
      decorationRotate: V.decorationRotate,
      decorationScale: V.decorationScale,
    }).toEqual({
      decorationX: "--cx-decoration-x",
      decorationY: "--cx-decoration-y",
      decorationRotate: "--cx-decoration-rotate",
      decorationScale: "--cx-decoration-scale",
    });
    expect({ hoverY: V.hoverY, hoverScale: V.hoverScale }).toEqual({
      hoverY: "--cx-hover-y",
      hoverScale: "--cx-hover-scale",
    });
    expect({ tiltX: V.tiltX, tiltY: V.tiltY }).toEqual({
      tiltX: "--cx-tilt-x",
      tiltY: "--cx-tilt-y",
    });
    expect({ magneticX: V.magneticX, magneticY: V.magneticY }).toEqual({
      magneticX: "--cx-magnetic-x",
      magneticY: "--cx-magnetic-y",
    });
    // The exact per-channel counts: 1 + 4 + 2 + 2 + 2 = 11.
    expect(channelVars.reveal).toHaveLength(1);
    expect(channelVars.decoration).toHaveLength(4);
    expect(channelVars.hover).toHaveLength(2);
    expect(channelVars.tilt).toHaveLength(2);
    expect(channelVars.magnetic).toHaveLength(2);
    expect(Object.keys(PAGE_BLOCK_TRANSFORM_VARIABLES)).toHaveLength(11);
  });

  test("every --cx- token inside the static CSS is exactly one of the eleven bytes", () => {
    const tokens = new Set(PAGE_COMPOSITION_EFFECTS_CSS.match(/--cx-[\w-]+/g) ?? []);
    expect(tokens).toEqual(new Set(Object.values(PAGE_BLOCK_TRANSFORM_VARIABLES)));
    // No invented names survive into the emitted CSS (e.g. legacy fallbacks).
    expect(PAGE_COMPOSITION_EFFECTS_CSS).not.toContain("--cx-orbit-fallback");
  });

  test("the one host attribute/selector and both exact marquee-replica bytes", () => {
    expect(PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE).toBe("data-page-transform-host");
    expect(PAGE_BLOCK_TRANSFORM_HOST_SELECTOR).toBe("[data-page-transform-host]");
    expect(PAGE_BLOCK_TRANSFORM_HOST_SELECTOR).toBe(
      `[${PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE}]`
    );
    expect(PAGE_MARQUEE_REPLICA_ATTRIBUTE).toBe("data-page-marquee-replica");
    expect(PAGE_MARQUEE_REPLICA_SELECTOR).toBe("[data-page-marquee-replica]");
    expect(PAGE_MARQUEE_REPLICA_SELECTOR).toBe(
      `[${PAGE_MARQUEE_REPLICA_ATTRIBUTE}]`
    );
    expect(PAGE_LAYER_WIDTH_ATTRIBUTE).toBe("data-layer-width");
    // ONE formula rule: the host selector appears exactly once in the CSS and
    // carries exactly one declaration (the transform pipeline below).
    const hostMatches = PAGE_COMPOSITION_EFFECTS_CSS.match(/data-page-transform-host/g);
    expect(hostMatches).toHaveLength(1);
    // The static CSS never invents marquee-replica selectors: replica stamping
    // is renderer-owned (TASK-539-05), so the constants exist only as bytes.
    expect(PAGE_COMPOSITION_EFFECTS_CSS).not.toContain("[data-page-marquee-replica]");
    expect(PAGE_COMPOSITION_EFFECTS_CSS).not.toContain("data-page-marquee-replica");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 2) Exact formula order + neutral defaults
// ──────────────────────────────────────────────────────────────────────────────
describe("exact host formula order and neutral defaults", () => {
  const formulaParts = [
    `translateY(var(${V.revealY},0px))`,
    `translate(var(${V.decorationX},0px),var(${V.decorationY},0px))`,
    `rotate(var(${V.decorationRotate},0deg))`,
    `scale(var(${V.decorationScale},1))`,
    `translateY(var(${V.hoverY},0px))`,
    `scale(var(${V.hoverScale},1))`,
    `rotateX(var(${V.tiltX},0deg))`,
    `rotateY(var(${V.tiltY},0deg))`,
    `translate(var(${V.magneticX},0px),var(${V.magneticY},0px))`,
  ];

  test("the complete host rule equals the byte-exact pipeline, single declaration", () => {
    const expected = `[data-page-transform-host]{transform:${formulaParts.join(" ")}}`;
    expect(exactRule(PAGE_COMPOSITION_EFFECTS_CSS, PAGE_BLOCK_TRANSFORM_HOST_SELECTOR)).toBe(
      expected
    );
    // The host rule is transform-only: no second declaration, no pointer-events,
    // no direct translate property on the host (translate belongs to layers).
    const body = exactRule(
      PAGE_COMPOSITION_EFFECTS_CSS,
      PAGE_BLOCK_TRANSFORM_HOST_SELECTOR
    ).replace(/^[^{]*\{/, "").replace(/\}$/, "");
    expect(body).not.toContain(";");
    expect(body).not.toContain("pointer-events");
    expect(body).not.toContain("translate:");
  });

  test("the pipeline order is fixed: reveal -> decoration -> hover -> tilt -> magnetic", () => {
    expect(formulaParts).toHaveLength(9);
    // Channel order verified structurally: each channel's parts are contiguous
    // and appear in the declared sequence inside the single formula.
    const order = [
      `translateY(var(${V.revealY},0px))`,
      `translate(var(${V.decorationX},0px),var(${V.decorationY},0px))`,
      `rotate(var(${V.decorationRotate},0deg))`,
      `scale(var(${V.decorationScale},1))`,
      `translateY(var(${V.hoverY},0px))`,
      `scale(var(${V.hoverScale},1))`,
      `rotateX(var(${V.tiltX},0deg))`,
      `rotateY(var(${V.tiltY},0deg))`,
      `translate(var(${V.magneticX},0px),var(${V.magneticY},0px))`,
    ];
    const rule = exactRule(PAGE_COMPOSITION_EFFECTS_CSS, PAGE_BLOCK_TRANSFORM_HOST_SELECTOR);
    let cursor = rule.indexOf("{") + 1;
    for (const part of order) {
      const at = rule.indexOf(part, cursor);
      expect(at).not.toBe(-1);
      cursor = at + part.length;
    }
    // Every variable is referenced exactly once in the formula.
    for (const bytes of Object.values(PAGE_BLOCK_TRANSFORM_VARIABLES)) {
      expect(rule.match(new RegExp(`var\\(${bytes}`, "g"))).toHaveLength(1);
    }
  });

  test("neutral fallbacks are exactly 0px/0deg/1 and match the @property registrations", () => {
    const fallbacks = {
      [V.revealY]: "0px",
      [V.decorationX]: "0px",
      [V.decorationY]: "0px",
      [V.decorationRotate]: "0deg",
      [V.decorationScale]: "1",
      [V.hoverY]: "0px",
      [V.hoverScale]: "1",
      [V.tiltX]: "0deg",
      [V.tiltY]: "0deg",
      [V.magneticX]: "0px",
      [V.magneticY]: "0px",
    } as const;
    const syntaxOf = {
      [V.revealY]: "<length-percentage>",
      [V.decorationX]: "<length-percentage>",
      [V.decorationY]: "<length-percentage>",
      [V.decorationRotate]: "<angle>",
      [V.decorationScale]: "<number>",
      [V.hoverY]: "<length-percentage>",
      [V.hoverScale]: "<number>",
      [V.tiltX]: "<angle>",
      [V.tiltY]: "<angle>",
      [V.magneticX]: "<length-percentage>",
      [V.magneticY]: "<length-percentage>",
    } as const;
    const rule = exactRule(PAGE_COMPOSITION_EFFECTS_CSS, PAGE_BLOCK_TRANSFORM_HOST_SELECTOR);
    for (const bytes of Object.values(PAGE_BLOCK_TRANSFORM_VARIABLES)) {
      const fallback = fallbacks[bytes];
      // Formula fallback: `var(--cx-*,<fallback>)`.
      expect(rule).toContain(`var(${bytes},${fallback})`);
      // Registered initial-value + typed syntax must match the formula fallback
      // byte-for-byte so interpolation and the neutral default never diverge.
      expect(PAGE_COMPOSITION_EFFECTS_CSS).toContain(
        `@property ${bytes}{syntax:"${syntaxOf[bytes]}";inherits:true;initial-value:${fallback}}`
      );
    }
    // Exactly eleven @property registrations, none extra.
    expect(PAGE_COMPOSITION_EFFECTS_CSS.match(/@property --cx-[\w-]+{/g)).toHaveLength(11);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 3) Independent channels: each declaration writes ONLY its own variables
// ──────────────────────────────────────────────────────────────────────────────
describe("independent channels write only their own variables", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;
  const DECORATION_WRITES = "decoration";
  const HOVER_WRITES = "hover";

  const assertWritesOnly = (
    text: string,
    allowed: readonly string[],
    label: string
  ): void => {
    const writes = writesIn(text);
    expect(writes.length).toBeGreaterThan(0);
    for (const write of writes) {
      expect(allowed, `${label} wrote foreign variable ${write}`).toContain(write);
    }
  };

  test("every transform-bearing decoration keyframe writes only decoration variables", () => {
    const decoration = channelVars.decoration;
    const cases: Array<{ name: string; exact: string; expected: string[] }> = [
      {
        name: "cx-float",
        exact: "@keyframes cx-float{50%{--cx-decoration-y:-12px}}",
        expected: [V.decorationY],
      },
      {
        name: "cx-drift",
        exact:
          "@keyframes cx-drift{50%{--cx-decoration-x:30px;--cx-decoration-y:-26px;--cx-decoration-scale:1.06}}",
        expected: [V.decorationX, V.decorationY, V.decorationScale],
      },
      {
        name: "cx-pulse",
        exact: "@keyframes cx-pulse{50%{--cx-decoration-scale:1.12;opacity:.7}}",
        expected: [V.decorationScale],
      },
      {
        name: "cx-orbit",
        exact: "@keyframes cx-orbit{to{--cx-decoration-rotate:360deg}}",
        expected: [V.decorationRotate],
      },
    ];
    for (const { name, exact, expected } of cases) {
      expect(css).toContain(exact);
      const body = keyframeBody(css, name);
      // Exact written-variable set for this keyframe (sorted).
      expect(writesIn(body).sort()).toEqual([...expected].sort());
      // Only the decoration channel is written; no other channel bleeds in.
      assertWritesOnly(body, decoration, name);
      // The decoration keyframes never write the transform/box-shadow channels.
      expect(body).not.toContain("transform:");
      expect(body).not.toContain("box-shadow:");
    }
  });

  test("ambient-orb drift reuses the decoration channel on the orb base", () => {
    // The orb base is a static blurred radial circle: its filter/opacity
    // channels stay independent of the transform channel.
    expect(css).toContain(
      ".cx-orb{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;opacity:.55}"
    );
    // The ambient-orb drift binding is the SAME `[data-deco="drift"]` binding;
    // there is no second drift animation name for orbs.
    expect(css).toContain(
      '[data-deco="drift"]{animation:cx-drift var(--deco-duration,12000ms) ease-in-out var(--deco-delay,0ms) infinite}'
    );
    expect((css.match(/animation:cx-drift/g) ?? [])).toHaveLength(1);
    // The drift keyframe writes only decoration variables (proven above); pin
    // the full exact bytes again so the ambient-orb path is explicit.
    expect(css).toContain(
      "@keyframes cx-drift{50%{--cx-decoration-x:30px;--cx-decoration-y:-26px;--cx-decoration-scale:1.06}}"
    );
  });

  test("every transform-bearing decoration binding writes only animation, no transform", () => {
    const bindings = [
      '[data-deco="float"]{animation:cx-float var(--deco-duration,6000ms) ease-in-out var(--deco-delay,0ms) infinite}',
      '[data-deco="drift"]{animation:cx-drift var(--deco-duration,12000ms) ease-in-out var(--deco-delay,0ms) infinite}',
      '[data-deco="pulse"]{animation:cx-pulse var(--deco-duration,5000ms) ease-in-out var(--deco-delay,0ms) infinite}',
      '[data-deco="orbit"]{animation:cx-orbit var(--deco-duration,16000ms) linear var(--deco-delay,0ms) infinite}',
    ] as const;
    for (const binding of bindings) {
      const selector = binding.slice(0, binding.indexOf("{"));
      expect(exactRule(css, selector)).toBe(binding);
      expect(binding).not.toContain("transform:");
      // The bindings themselves write no custom properties at all.
      expect(writesIn(binding)).toHaveLength(0);
    }
  });

  test("radiate keeps its independent box-shadow channel with NO transform", () => {
    expect(css).toContain("@keyframes cx-radiate{50%{box-shadow:0 0 0 26px var(--deco-ring,rgba(142,232,255,.08)),0 0 0 54px var(--deco-ring-2,rgba(142,232,255,.035))}}");
    expect(css).toContain(
      '[data-deco="radiate"]{box-shadow:0 0 0 16px var(--deco-ring,rgba(142,232,255,.12)),0 0 0 34px var(--deco-ring-2,rgba(142,232,255,.06));animation:cx-radiate var(--deco-duration,2200ms) ease-in-out var(--deco-delay,0ms) infinite}'
    );
    const radiateBody = keyframeBody(css, "cx-radiate");
    expect(radiateBody).not.toContain("transform:");
    expect(radiateBody).not.toMatch(/--cx-[\w-]+:/); // no transform variable writes
    const radiateBinding = exactRule(css, '[data-deco="radiate"]');
    expect(radiateBinding).not.toContain("transform:");
    expect(radiateBinding).toContain("box-shadow:");
  });

  test("hover declarations write ONLY hover variables", () => {
    const hover = channelVars.hover;
    // lift / lift-glow hover writes only --cx-hover-y.
    const liftHover = exactRule(
      css,
      '[data-hover="lift"]:hover,[data-hover="lift-glow"]:hover'
    );
    expect(liftHover).toBe('[data-hover="lift"]:hover,[data-hover="lift-glow"]:hover{--cx-hover-y:-6px}');
    assertWritesOnly(liftHover, hover, "lift hover");
    // scale hover writes only --cx-hover-scale.
    const scaleHover = exactRule(css, '[data-hover="scale"]:hover');
    expect(scaleHover).toBe('[data-hover="scale"]:hover{--cx-hover-scale:1.03}');
    assertWritesOnly(scaleHover, hover, "scale hover");
    // Base hover rules carry transition only; no variable writes, no transform.
    const liftBase = exactRule(css, '[data-hover="lift"],[data-hover="lift-glow"]');
    expect(liftBase).toBe(
      '[data-hover="lift"],[data-hover="lift-glow"]{transition:transform .25s ease,border-color .25s ease}'
    );
    const scaleBase = exactRule(css, '[data-hover="scale"]');
    expect(scaleBase).toBe('[data-hover="scale"]{transition:transform .25s ease}');
    for (const base of [liftBase, scaleBase]) {
      expect(base).not.toMatch(/--cx-[\w-]+:/);
    }
    // No hover rule writes the transform property directly anymore.
    expect(css).not.toContain("transform:translateY(-6px)");
    expect(css).not.toContain("transform:scale(1.03)");
  });

  test("tilt / magnetic / reveal variables are never written by any static CSS rule", () => {
    // The static CSS registers + reads the reveal/tilt/magnetic bytes but no
    // rule assigns them: the runtime (TASK-539-07) owns those writes.
    for (const bytes of [...channelVars.reveal, ...channelVars.tilt, ...channelVars.magnetic]) {
      expect(css).not.toMatch(new RegExp(`${bytes.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
    }
    // Tilt rules write transition/transform-style only (transform-style is the
    // 3D frame, not a channel write); no tilt variable assignment exists.
    expect(css).toContain("[data-block-tilt]{transition:transform .18s ease}");
    expect(css).toContain("[data-block-tilt]{transform-style:preserve-3d;position:relative}");
  });

  test("complete write inventory: the only --cx- writes are decoration (5 sites) + hover (2)", () => {
    const allWrites = (css.match(/--cx-[\w-]+:/g) ?? [])
      .map((m) => m.slice(0, -1))
      .sort();
    expect(allWrites).toEqual(
      [
        V.decorationRotate,
        V.decorationScale,
        V.decorationScale,
        V.decorationX,
        V.decorationY,
        V.decorationY,
        V.hoverScale,
        V.hoverY,
      ].sort()
    );
    // The reveal/tilt/magnetic channels have ZERO writes in the static CSS.
    for (const bytes of [...channelVars.reveal, ...channelVars.tilt, ...channelVars.magnetic]) {
      expect(allWrites).not.toContain(bytes);
    }
  });

  test("independent opacity / filter / box-shadow channels stay preserved", () => {
    // opacity: the pulse keyframe pairs --cx-decoration-scale with opacity, and
    // glow-reveal keeps its opacity transition; the transform channel never
    // clobbers opacity.
    expect(css).toContain("@keyframes cx-pulse{50%{--cx-decoration-scale:1.12;opacity:.7}}");
    expect(css).toContain(
      '[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{transition:opacity .25s ease}'
    );
    expect(css).toContain(
      '[data-hover="glow-reveal"]:hover::after,[data-hover="lift-glow"]:hover::after{opacity:1}'
    );
    // filter: the orb base keeps its static blur.
    expect(css).toContain("filter:blur(46px)");
    // box-shadow: radiate (base + keyframe) and the glass surface preset keep
    // their own box-shadow bytes.
    expect(css).toContain("box-shadow:0 0 0 16px var(--deco-ring");
    expect(css).toContain(
      '[data-surface="glass"]{background-image:linear-gradient(145deg,var(--surface-glow,rgba(255,255,255,.11)),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.13);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.22),inset 0 1px 0 rgba(255,255,255,.16);overflow:hidden}'
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 4) Resolver: host/magnetic presence authored-only, invalid values omit
// ──────────────────────────────────────────────────────────────────────────────
describe("resolver host/magnetic presence is authored-only; invalid values omit", () => {
  test("the host is stamped for every block-owned transform effect", () => {
    for (const motion of ["float", "drift", "pulse", "orbit"] as const) {
      expect(
        resolveBlockCompositionAttrs({ decoration: { motion } }).dataAttrs[HOST]
      ).toBe("");
    }
    for (const hover of ["lift", "scale", "lift-glow"] as const) {
      expect(resolveBlockCompositionAttrs({ hoverEffect: hover }).dataAttrs[HOST]).toBe("");
    }
    expect(resolveBlockCompositionAttrs({ tilt: "subtle" }).dataAttrs[HOST]).toBe("");
    expect(resolveBlockCompositionAttrs({ tilt: "strong" }).dataAttrs[HOST]).toBe("");
    expect(resolveBlockCompositionAttrs({ magnetic: true }).dataAttrs[HOST]).toBe("");
  });

  test("invalid/none values omit the host even when a data attr would still be set", () => {
    // decoration "none" and "radiate" are not transform-bearing.
    expect(resolveBlockCompositionAttrs({ decoration: { motion: "none" } }).dataAttrs).not.toHaveProperty(HOST);
    expect(resolveBlockCompositionAttrs({ decoration: { motion: "radiate" } }).dataAttrs).not.toHaveProperty(HOST);
    // hover "none" and "glow-reveal" (opacity-only) are not transform-bearing.
    expect(resolveBlockCompositionAttrs({ hoverEffect: "none" }).dataAttrs).not.toHaveProperty(HOST);
    expect(resolveBlockCompositionAttrs({ hoverEffect: "glow-reveal" }).dataAttrs).not.toHaveProperty(HOST);
    // tilt "none" resets: no data-block-tilt, no host, no perspective parent.
    const tiltNone = resolveBlockCompositionAttrs({ tilt: "none" });
    expect(tiltNone.dataAttrs).not.toHaveProperty("data-block-tilt");
    expect(tiltNone.dataAttrs).not.toHaveProperty(HOST);
    expect(tiltNone.perspectiveParent).toBe(false);
    // magnetic false/undefined never stamps anything.
    expect(resolveBlockCompositionAttrs({ magnetic: false }).dataAttrs).not.toHaveProperty(HOST);
    expect(resolveBlockCompositionAttrs({ magnetic: false }).dataAttrs).not.toHaveProperty("data-magnetic");
  });

  test("mixed owners compose: one transform-bearing owner is enough, glow-only is not", () => {
    // radiate + glow-reveal are BOTH non-transform: no host.
    expect(
      resolveBlockCompositionAttrs({
        decoration: { motion: "radiate" },
        hoverEffect: "glow-reveal",
      }).dataAttrs
    ).not.toHaveProperty(HOST);
    // radiate + scale: scale is transform-bearing, so the host appears.
    expect(
      resolveBlockCompositionAttrs({
        decoration: { motion: "radiate" },
        hoverEffect: "scale",
      }).dataAttrs[HOST]
    ).toBe("");
    // glow-reveal + orbit: orbit is transform-bearing, so the host appears.
    expect(
      resolveBlockCompositionAttrs({
        decoration: { motion: "orbit" },
        hoverEffect: "glow-reveal",
      }).dataAttrs[HOST]
    ).toBe("");
  });

  test("data-magnetic is stamped ONLY for true and always with the host", () => {
    const on = resolveBlockCompositionAttrs({ magnetic: true });
    expect(on.dataAttrs["data-magnetic"]).toBe("");
    expect(on.dataAttrs[HOST]).toBe("");
    // Magnetic is a transform-bearing owner: presence implies the host.
    const inertStyles: PageBlockStyleV2[] = [{}, { magnetic: false }, { hoverEffect: "glow-reveal" }];
    for (const style of inertStyles) {
      const r = resolveBlockCompositionAttrs(style);
      expect(r.dataAttrs).not.toHaveProperty("data-magnetic");
    }
  });

  test("the resolver never emits --cx-* custom properties (runtime owns the writes)", () => {
    const styles: PageBlockStyleV2[] = [
      { decoration: { motion: "float", delay: 200, duration: 8000 } },
      { hoverEffect: "lift-glow" },
      { tilt: "strong", tiltGlare: true },
      { magnetic: true },
      { decoration: { motion: "drift" }, surfacePreset: "ambient-orbs" },
      { marquee: { speed: 18, direction: "right", seamless: true } },
    ];
    for (const style of styles) {
      const r = resolveBlockCompositionAttrs(style);
      for (const key of Object.keys(r.cssVars)) {
        expect(key.startsWith("--cx-")).toBe(false);
      }
    }
  });

  test("exact single-owner outputs: only the owned data attrs plus the host", () => {
    expect(resolveBlockCompositionAttrs({ decoration: { motion: "float" } })).toEqual({
      dataAttrs: { "data-deco": "float", [HOST]: "" },
      cssVars: {},
      perspectiveParent: false,
      glare: false,
      ambientOrbs: false,
    });
    expect(resolveBlockCompositionAttrs({ hoverEffect: "lift" })).toEqual({
      dataAttrs: { "data-hover": "lift", [HOST]: "" },
      cssVars: {},
      perspectiveParent: false,
      glare: false,
      ambientOrbs: false,
    });
    expect(resolveBlockCompositionAttrs({ magnetic: true })).toEqual({
      dataAttrs: { "data-magnetic": "", [HOST]: "" },
      cssVars: {},
      perspectiveParent: false,
      glare: false,
      ambientOrbs: false,
    });
    expect(resolveBlockCompositionAttrs({ tilt: "strong" })).toEqual({
      dataAttrs: { "data-block-tilt": "strong", [HOST]: "" },
      cssVars: {},
      perspectiveParent: true,
      glare: false,
      ambientOrbs: false,
    });
    expect(resolveBlockCompositionAttrs({ tilt: "strong", tiltGlare: true })).toEqual({
      dataAttrs: { "data-block-tilt": "strong", [HOST]: "" },
      cssVars: {},
      perspectiveParent: true,
      glare: true,
      ambientOrbs: false,
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 5) Layer anchors ride `translate`; full/auto width stays bounded
// ──────────────────────────────────────────────────────────────────────────────
describe("layer anchors use translate and full/auto width stays bounded", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;
  const anchors = [
    ["top-left", "translate:0 0"],
    ["top", "translate:-50% 0"],
    ["top-right", "translate:-100% 0"],
    ["left", "translate:0 -50%"],
    ["center", "translate:-50% -50%"],
    ["right", "translate:-100% -50%"],
    ["bottom-left", "translate:0 -100%"],
    ["bottom", "translate:-50% -100%"],
    ["bottom-right", "translate:-100% -100%"],
  ] as const;

  test("all nine anchor rules are exact and use the translate property, never transform", () => {
    for (const [anchor, decl] of anchors) {
      const expected = `[data-layer-anchor="${anchor}"]{${decl}}`;
      expect(exactRule(css, `[data-layer-anchor="${anchor}"]`)).toBe(expected);
    }
    // No anchor rule writes the transform channel (would clobber a co-located
    // float/lift keyframe on the same node).
    expect(css).not.toMatch(/\[data-layer-anchor="[^"]+"\]\{transform:/);
  });

  test("full/auto layer-width rules are bounded to exactly 100% / auto", () => {
    expect(exactRule(css, '[data-layer-width="full"]')).toBe('[data-layer-width="full"]{width:100%}');
    expect(exactRule(css, '[data-layer-width="auto"]')).toBe('[data-layer-width="auto"]{width:auto}');
    // The width attribute never appears with any other value in the CSS.
    expect(css).not.toMatch(/\[data-layer-width="(?!full|auto)[^"]*"\]/);
  });

  test("the block resolver never invents data-layer-width (renderer stamps it, TASK-539-05)", () => {
    const r = resolveBlockCompositionAttrs({ layer: { x: 10, y: 20, anchor: "center" } });
    expect(r.dataAttrs).not.toHaveProperty(PAGE_LAYER_WIDTH_ATTRIBUTE);
    expect(r.dataAttrs).not.toHaveProperty("data-layer-width");
    // The resolver emits position as custom props + anchor only.
    expect(r.cssVars["--layer-x"]).toBe("10%");
    expect(r.cssVars["--layer-y"]).toBe("20%");
    expect(r.dataAttrs["data-layer-anchor"]).toBe("center");
    // No anchor authored -> no data-layer-anchor key (present-only).
    const noAnchor = resolveBlockCompositionAttrs({ layer: { x: 5 } });
    expect(noAnchor.dataAttrs).not.toHaveProperty("data-layer-anchor");
    expect(noAnchor.cssVars["--layer-x"]).toBe("5%");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 6) Marquee: viewport -> rail -> segment, one animation owner
// ──────────────────────────────────────────────────────────────────────────────
describe("marquee viewport -> rail -> segment CSS", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;
  const gate = css.indexOf("@media (prefers-reduced-motion: no-preference)");

  test("exact viewport/rail/segment declarations; the RAIL is the only animation owner", () => {
    expect(exactRule(css, ".cx-marquee-viewport")).toBe(
      ".cx-marquee-viewport{overflow:hidden;width:100%}"
    );
    expect(exactRule(css, ".cx-marquee-rail")).toBe(
      ".cx-marquee-rail{display:flex;flex-wrap:nowrap;width:max-content;will-change:transform}"
    );
    expect(exactRule(css, ".cx-marquee-segment")).toBe(".cx-marquee-segment{flex:0 0 auto}");
    // The viewport clips and the segments are static; the rail carries the
    // animation. `cx-ticker` appears exactly twice: the keyframe and the rail
    // binding (one animation owner).
    expect(exactRule(css, ".cx-marquee-viewport")).not.toContain("animation");
    expect(exactRule(css, ".cx-marquee-segment")).not.toContain("animation");
    expect(css.match(/cx-ticker/g)).toHaveLength(2);
    expect(css).toContain("[data-marquee] .cx-marquee-rail{animation:cx-ticker var(--marquee-speed,18s) linear infinite}");
  });

  test("segments are nonshrinking and the rail geometry supports the -50% seam", () => {
    // `flex:0 0 auto` = no grow, no shrink, auto basis: equal intrinsic-width
    // segments stay equal, so `translateX(-50%)` of a max-content rail moves
    // exactly one segment width (two equal copies tile seamlessly).
    expect(css).toContain(".cx-marquee-segment{flex:0 0 auto}");
    expect(css).toContain(".cx-marquee-rail{display:flex;flex-wrap:nowrap;width:max-content;will-change:transform}");
    // The track rule is segment-count independent: no nth-child assumptions,
    // no fixed segment widths, no rail gap that would break equality.
    expect(css).not.toMatch(/.cx-marquee-segment[^{]*:nth-child/);
    expect(css).not.toContain(".cx-marquee-rail{gap:");
    // One-segment fallback: the same keyframe animates a single-segment rail
    // (the CSS never requires a second copy; renderer clones are 539-05's job).
    expect(css).toContain("@keyframes cx-ticker{to{transform:translateX(-50%)}}");
  });

  test("direction and speed ride the authored data attrs / CSS variables", () => {
    expect(css).toContain(
      '[data-marquee][data-marquee-dir="right"] .cx-marquee-rail{animation-direction:reverse}'
    );
    expect(css).toContain("var(--marquee-speed,18s)");
    // Resolver side: presence attr always; dir only for right; speed only when set.
    const right = resolveBlockCompositionAttrs({
      marquee: { speed: 18, direction: "right", seamless: true },
    });
    expect(right.dataAttrs["data-marquee"]).toBe("");
    expect(right.dataAttrs["data-marquee-dir"]).toBe("right");
    expect(right.cssVars["--marquee-speed"]).toBe("18s");
    const left = resolveBlockCompositionAttrs({ marquee: { direction: "left", seamless: true } });
    expect(left.dataAttrs["data-marquee"]).toBe("");
    expect(left.dataAttrs).not.toHaveProperty("data-marquee-dir");
    expect(left.cssVars).not.toHaveProperty("--marquee-speed");
    const bare = resolveBlockCompositionAttrs({ marquee: {} });
    expect(bare.dataAttrs["data-marquee"]).toBe("");
    expect(bare.dataAttrs).not.toHaveProperty("data-marquee-dir");
    expect(bare.cssVars).not.toHaveProperty("--marquee-speed");
  });

  test("reduced-motion stop: keyframe + binding are motion-gated, the static rail is not", () => {
    expect(gate).toBeGreaterThan(0);
    // The animation binding and its keyframe sit inside the no-preference gate,
    // so a reduce user gets a fully static rail (animation never applies).
    expect(css.indexOf("@keyframes cx-ticker{")).toBeGreaterThan(gate);
    expect(css.indexOf("[data-marquee] .cx-marquee-rail{animation:")).toBeGreaterThan(gate);
    // The static rail rule (outside the gate) declares will-change but no
    // animation, so nothing moves under reduced motion.
    const staticRail = exactRule(css, ".cx-marquee-rail");
    expect(css.indexOf(staticRail)).toBeLessThan(gate);
    expect(staticRail).toContain("will-change:transform");
    expect(staticRail).not.toContain("animation");
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 7) Glow overlays are pointer-events:none; interactive hosts are not
// ──────────────────────────────────────────────────────────────────────────────
describe("glow overlays pointer-events:none while interactive hosts stay interactive", () => {
  const css = PAGE_COMPOSITION_EFFECTS_CSS;

  test("every content-bearing ::before/::after overlay carries pointer-events:none", () => {
    const pseudoRules = css.match(/[^{}]*::(?:before|after)\{[^}]*\}/g) ?? [];
    const contentOverlays = pseudoRules.filter((rule) => rule.includes('content:"'));
    expect(contentOverlays.length).toBeGreaterThan(0);
    for (const rule of contentOverlays) {
      expect(rule).toContain("pointer-events:none");
    }
    // The exact bytes of each glow overlay are pinned.
    expect(css).toContain(
      '[data-surface="glass-grid"]::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(142,232,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(142,232,255,.06) 1px,transparent 1px);background-size:34px 34px;mask-image:radial-gradient(circle at 50% 45%,#000 0 42%,transparent 78%);pointer-events:none}'
    );
    expect(css).toContain(
      '[data-surface="radial-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:200px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.16)),transparent 66%);pointer-events:none}'
    );
    expect(css).toContain(
      '[data-hover="glow-reveal"]::after,[data-hover="lift-glow"]::after{content:"";position:absolute;inset:auto -30% -50% -30%;height:160px;background:radial-gradient(circle,var(--surface-glow,rgba(142,232,255,.15)),transparent 66%);opacity:0;pointer-events:none}'
    );
  });

  test("the tilt glare overlay is pointer-events:none", () => {
    expect(css).toContain(
      "[data-block-tilt] .cx-glare{position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at var(--glare-x,50%) var(--glare-y,0%),rgba(255,255,255,.22),transparent 45%);opacity:0}"
    );
  });

  test("interactive hosts never carry pointer-events:none", () => {
    // The one transform host formula rule.
    expect(exactRule(css, "[data-page-transform-host]")).not.toContain("pointer-events");
    // Tilt hosts (static frame + motion-gated transition) stay interactive.
    expect(css).toContain("[data-block-tilt]{transition:transform .18s ease}");
    expect(css).toContain("[data-block-tilt]{transform-style:preserve-3d;position:relative}");
    // The magnetic host transition in PAGE_INTERACTIVITY_CSS stays interactive.
    expect(PAGE_INTERACTIVITY_CSS).toContain(
      "@media (prefers-reduced-motion: no-preference){[data-magnetic]{transition:transform .15s ease;will-change:transform}}"
    );
    expect(PAGE_INTERACTIVITY_CSS).not.toContain("[data-magnetic]{pointer-events");
  });

  test("the decorative orb base is pointer-events:none by design (not an interactive host)", () => {
    expect(css).toContain(
      ".cx-orb{position:absolute;border-radius:50%;filter:blur(46px);pointer-events:none;opacity:.55}"
    );
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// 8) No-effect / unrelated output byte identity
// ──────────────────────────────────────────────────────────────────────────────
describe("no-effect / unrelated output byte identity", () => {
  test("a style with only unrelated fields resolves byte-identically to undefined", () => {
    const unrelated: PageBlockStyleV2 = {
      align: "center",
      background: "#fff",
      textColor: "#111",
      opacity: 0.9,
      radius: 12,
    };
    expect(resolveBlockCompositionAttrs(unrelated)).toEqual(
      resolveBlockCompositionAttrs(undefined)
    );
    expect(resolveBlockCompositionAttrs(unrelated)).toEqual({
      dataAttrs: {},
      cssVars: {},
      perspectiveParent: false,
      glare: false,
      ambientOrbs: false,
    });
  });

  test("a section style with only unrelated fields stays empty", () => {
    const unrelated = {
      background: "#fff",
      backgroundType: "color" as const,
      accent: "#0ea5e9",
      radius: 0,
      shadow: "none" as const,
    };
    expect(resolveSectionCompositionAttrs(unrelated)).toEqual(
      resolveSectionCompositionAttrs(undefined)
    );
    expect(resolveSectionCompositionAttrs(unrelated)).toEqual({
      dataAttrs: {},
      cssVars: {},
      ambientOrbs: false,
    });
  });

  test("PAGE_INTERACTIVITY_CSS stays outside the transform vocabulary", () => {
    // The interactivity CSS never names the transform host, the marquee, or any
    // --cx-* variable: those belong to the composition CSS and the 539-07
    // runtime writes. A no-magnetic/no-interactivity page gains nothing.
    expect(PAGE_INTERACTIVITY_CSS).not.toContain("data-page-transform-host");
    expect(PAGE_INTERACTIVITY_CSS).not.toContain("data-marquee");
    expect(PAGE_INTERACTIVITY_CSS).not.toMatch(/--cx-[\w-]+/);
    // No author input reaches the interactivity CSS (static string only).
    expect(PAGE_INTERACTIVITY_CSS.includes("${")).toBe(false);
    expect(PAGE_INTERACTIVITY_CSS.includes("url(")).toBe(false);
  });

  test("the composition CSS never invents a magnetic selector or a second host arm", () => {
    // Magnetic is expressed through `data-magnetic` (interactivity CSS) + the
    // SHARED host formula; the composition CSS must not define `[data-magnetic]`.
    expect(PAGE_COMPOSITION_EFFECTS_CSS).not.toContain("[data-magnetic]");
    // And the host has exactly one rule arm (no `:hover`/descendant variants
    // that would double-compose the transform).
    expect(PAGE_COMPOSITION_EFFECTS_CSS.match(/\[data-page-transform-host\]/g)).toHaveLength(1);
  });
});
