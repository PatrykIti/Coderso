import { describe, expect, test } from "vitest";

import {
  getPageEditorControlsForTarget,
  pageBlockControlRegistry,
  pageTypographyBlockControls,
  pageUniversalBlockControls,
  pageUniversalSectionControls,
  type PageEditorControlDefinition,
} from "../../../core/services/pages/pageEditorControlRegistry";
import { sanitizePageEditorControlValue } from "../../../core/services/pages/pageEditorMutationActions";
import { sanitizeAuthoringGridTemplate } from "../../../core/services/pages/pageAuthoringSanitizers";
import {
  PAGE_BLOCK_SPAN_CLAMP,
  PAGE_DIVIDER_WIDTH_CLAMP,
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
  PAGE_SECTION_BORDER_WIDTH_CLAMP,
  PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
  PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
  isPageTypographyCapableBlockType,
  pageBackgroundTypes,
  pageBlockBorderStyles,
  pageBlockDecorationMotions,
  pageBlockHoverEffects,
  pageBlockTypes,
  pageColumnTemplatePresets,
  pageCompositions,
  pageDividerAligns,
  pageGalleryLayouts,
  pageLayerAnchors,
  pageMarqueeDirections,
  pageSectionTypes,
  pageSurfacePresets,
  pageTextAlignments,
  pageTiltStrengths,
  pageTypographyCapableBlockTypes,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  pageTypographyTextTransforms,
  scrollHintGlyphs,
  switcherVariants,
} from "../../../core/services/pages/pageDocumentV2";

describe("page editor typography controls", () => {
  test("typography cluster is exposed on every text-capable block and nowhere else", () => {
    expect(pageTypographyCapableBlockTypes).toEqual([
      "heading",
      "text",
      "button",
      "list",
      "card",
      "statistic",
      "quote",
    ]);
    expect(pageTypographyBlockControls.map((control) => control.id)).toEqual([
      "block.style.fontFamily",
      "block.style.fontSize",
      // TASK-532 (Bundle B): fluid size + text-transform sit next to token size.
      "block.style.fontSizeCustom",
      "block.style.textTransform",
      "block.style.fontWeight",
      "block.style.lineHeight",
      "block.style.letterSpacing",
    ]);
    for (const control of pageTypographyBlockControls) {
      expect(control.target).toBe("block");
      expect(control.panel).toBe("typography");
      expect(control.responsive).toBe(true);
      expect(control.path).toEqual(["style", control.id.split(".").at(-1)]);
      expect(control.overridePath).toEqual(control.path);
    }
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontFamily")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontFamilies });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontSize")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontSizes });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.fontWeight")
    ).toMatchObject({ input: "segmented", options: pageTypographyFontWeights });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.lineHeight")
    ).toMatchObject({
      input: "number",
      clamp: PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
      step: 0.05,
      unit: "",
    });
    expect(
      pageTypographyBlockControls.find((control) => control.id === "block.style.letterSpacing")
    ).toMatchObject({
      input: "number",
      clamp: PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
      step: 0.5,
      unit: "px",
    });

    for (const type of pageBlockTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "block", type });
      const typographyControls = controls.filter((control) => control.panel === "typography");
      if (isPageTypographyCapableBlockType(type)) {
        // Cluster plus the relocated text-align presentation.
        expect(typographyControls.map((control) => control.id)).toEqual([
          ...pageTypographyBlockControls.map((control) => control.id),
          type === "heading" || type === "text" ? `block.${type}.props.align` : "block.style.align",
        ]);
        const alignControl = typographyControls.at(-1)!;
        expect(alignControl).toMatchObject({
          label: "Text align",
          input: "segmented",
          options: pageTextAlignments,
        });
        // Relocation keeps the stored path identical to the legacy control.
        expect(alignControl.path).toEqual(
          type === "heading" || type === "text" ? ["props", "align"] : ["style", "align"]
        );
        // No duplicate presentation of the same stored align path.
        expect(
          controls.filter((control) => control.path.join(".") === alignControl.path.join("."))
        ).toHaveLength(1);
      } else {
        expect(typographyControls).toEqual([]);
      }
    }

    // Sections never expose typography controls.
    for (const type of pageSectionTypes) {
      const controls = getPageEditorControlsForTarget({ kind: "section", type });
      expect(controls.filter((control) => control.panel === "typography")).toEqual([]);
    }
  });
});

// TASK-522-03-L02 — floating-drift decoration universal controls.
describe("block decoration controls (TASK-522-03)", () => {
  const findUniversal = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalBlockControls.find((entry) => entry.id === id);

  test("motion is a live select whose options === pageBlockDecorationMotions", () => {
    const motion = findUniversal("block.decoration.motion");
    expect(motion).toBeDefined();
    expect(motion?.input).toBe("select");
    expect(motion?.target).toBe("block");
    expect(motion?.panel).toBe("style");
    // Same array reference (not a copy) — includes "none" first (the reset).
    expect(motion?.options).toBe(pageBlockDecorationMotions);
    // Base-only stamp: decoration is not per-breakpoint expressible (finding 6).
    expect(motion?.responsive).toBe(false);
    // array path, no legacy fields.
    expect(motion?.path).toEqual(["style", "decoration", "motion"]);
    expect(Array.isArray(motion?.path)).toBe(true);
    expect("kind" in (motion ?? {})).toBe(false);
    expect("showWhen" in (motion ?? {})).toBe(false);
    expect("min" in (motion ?? {})).toBe(false);
  });

  test("delay/duration are number controls with clamp bounds (no min field)", () => {
    const delay = findUniversal("block.decoration.delay");
    expect(delay?.input).toBe("number");
    expect(delay?.responsive).toBe(false);
    expect(delay?.path).toEqual(["style", "decoration", "delay"]);
    expect(delay?.clamp).toEqual({ min: 0, max: 4000 });
    expect(delay?.unit).toBe("ms");
    expect("min" in (delay ?? {})).toBe(false);
    expect("showWhen" in (delay ?? {})).toBe(false);

    const duration = findUniversal("block.decoration.duration");
    expect(duration?.input).toBe("number");
    expect(duration?.responsive).toBe(false);
    expect(duration?.path).toEqual(["style", "decoration", "duration"]);
    expect(duration?.clamp).toEqual({ min: 2000, max: 16000 });
    expect(duration?.unit).toBe("ms");
  });

  test("decoration controls are UNIVERSAL — composed for every block type", () => {
    const decorationIds = [
      "block.decoration.motion",
      "block.decoration.delay",
      "block.decoration.duration",
    ];
    // Universal controls compose ahead of the per-type registry for ALL types.
    for (const type of pageBlockTypes) {
      const composed = [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]];
      for (const id of decorationIds) {
        expect(
          composed.some((entry) => entry.id === id),
          `${type} missing ${id}`
        ).toBe(true);
      }
    }
  });
});

describe("block tilt controls (TASK-522-04)", () => {
  const findUniversal = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalBlockControls.find((entry) => entry.id === id);

  test("strength is a live select whose options === pageTiltStrengths", () => {
    const strength = findUniversal("block.tilt.strength");
    expect(strength).toBeDefined();
    expect(strength?.input).toBe("select");
    expect(strength?.target).toBe("block");
    expect(strength?.panel).toBe("style");
    // Same array reference (not a copy) — includes "none" first (the reset).
    expect(strength?.options).toBe(pageTiltStrengths);
    // Base-only stamp: tilt is a runtime data-attr, not per-breakpoint (finding 6).
    expect(strength?.responsive).toBe(false);
    // array path, no legacy fields.
    expect(strength?.path).toEqual(["style", "tilt"]);
    expect(Array.isArray(strength?.path)).toBe(true);
    expect("kind" in (strength ?? {})).toBe(false);
    expect("showWhen" in (strength ?? {})).toBe(false);
  });

  test("glare is a live switch — always present (inert when no tilt, no showWhen)", () => {
    const glare = findUniversal("block.tilt.glare");
    expect(glare).toBeDefined();
    expect(glare?.input).toBe("switch");
    expect(glare?.target).toBe("block");
    expect(glare?.panel).toBe("style");
    expect(glare?.responsive).toBe(false);
    expect(glare?.path).toEqual(["style", "tiltGlare"]);
    expect(Array.isArray(glare?.path)).toBe(true);
    expect("kind" in (glare ?? {})).toBe(false);
    expect("showWhen" in (glare ?? {})).toBe(false);
  });

  test("tilt controls are UNIVERSAL — composed for every block type", () => {
    const tiltIds = ["block.tilt.strength", "block.tilt.glare"];
    for (const type of pageBlockTypes) {
      const composed = [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]];
      for (const id of tiltIds) {
        expect(
          composed.some((entry) => entry.id === id),
          `${type} missing ${id}`
        ).toBe(true);
      }
    }
  });
});

describe("section surface + composition controls (TASK-522-05-L01)", () => {
  const findSection = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalSectionControls.find((entry) => entry.id === id);

  test("section.surface.preset is a live select whose options === pageSurfacePresets", () => {
    const preset = findSection("section.surface.preset");
    expect(preset).toBeDefined();
    expect(preset?.input).toBe("select");
    expect(preset?.target).toBe("section");
    expect(preset?.panel).toBe("background");
    expect(preset?.options).toBe(pageSurfacePresets);
    // Base-only data-attr — not per-breakpoint expressible (finding 6).
    expect(preset?.responsive).toBe(false);
    expect(preset?.path).toEqual(["style", "surfacePreset"]);
    expect(Array.isArray(preset?.path)).toBe(true);
    expect("kind" in (preset ?? {})).toBe(false);
    expect("showWhen" in (preset ?? {})).toBe(false);
    expect("appliesTo" in (preset ?? {})).toBe(false);
  });

  test("section.composition.mode is a live select whose options === pageCompositions", () => {
    const mode = findSection("section.composition.mode");
    expect(mode).toBeDefined();
    expect(mode?.input).toBe("select");
    expect(mode?.target).toBe("section");
    expect(mode?.panel).toBe("layout");
    expect(mode?.options).toBe(pageCompositions);
    expect(mode?.responsive).toBe(false);
    expect(mode?.path).toEqual(["style", "composition"]);
    expect("showWhen" in (mode ?? {})).toBe(false);
  });
});

describe("block glass/hover + layer controls (TASK-522-05-L02/L03)", () => {
  const findUniversal = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalBlockControls.find((entry) => entry.id === id);

  test("block.surface.preset is a live select whose options === pageSurfacePresets", () => {
    const preset = findUniversal("block.surface.preset");
    expect(preset).toBeDefined();
    expect(preset?.input).toBe("select");
    expect(preset?.target).toBe("block");
    expect(preset?.panel).toBe("style");
    expect(preset?.options).toBe(pageSurfacePresets);
    expect(preset?.responsive).toBe(false);
    expect(preset?.path).toEqual(["style", "surfacePreset"]);
    expect("kind" in (preset ?? {})).toBe(false);
  });

  test("block.hover.effect is a live select whose options === pageBlockHoverEffects", () => {
    const hover = findUniversal("block.hover.effect");
    expect(hover).toBeDefined();
    expect(hover?.input).toBe("select");
    expect(hover?.panel).toBe("style");
    expect(hover?.options).toBe(pageBlockHoverEffects);
    expect(hover?.responsive).toBe(false);
    expect(hover?.path).toEqual(["style", "hoverEffect"]);
  });

  test("block.layer.x/y/z are responsive number controls with clamp; anchor base-only", () => {
    const x = findUniversal("block.layer.x");
    expect(x?.input).toBe("number");
    expect(x?.target).toBe("block");
    expect(x?.panel).toBe("layout");
    // The ONE effect field that varies per device — routes --layer-* deltas.
    expect(x?.responsive).toBe(true);
    expect(x?.clamp).toEqual({ min: -50, max: 150 });
    expect(x?.unit).toBe("%");
    expect(x?.path).toEqual(["style", "layer", "x"]);
    expect("min" in (x ?? {})).toBe(false);

    const y = findUniversal("block.layer.y");
    expect(y?.responsive).toBe(true);
    expect(y?.clamp).toEqual({ min: -50, max: 150 });
    expect(y?.path).toEqual(["style", "layer", "y"]);

    const z = findUniversal("block.layer.z");
    expect(z?.responsive).toBe(true);
    expect(z?.clamp).toEqual({ min: 0, max: 40 });
    expect(z?.unit).toBe("");
    expect(z?.path).toEqual(["style", "layer", "z"]);

    const anchor = findUniversal("block.layer.anchor");
    expect(anchor?.input).toBe("select");
    expect(anchor?.options).toBe(pageLayerAnchors);
    // anchor is a base-only data-attr → responsive:false.
    expect(anchor?.responsive).toBe(false);
    expect(anchor?.path).toEqual(["style", "layer", "anchor"]);
  });

  test("surface/hover/layer controls are UNIVERSAL — composed for every block type", () => {
    const ids = [
      "block.surface.preset",
      "block.hover.effect",
      "block.layer.x",
      "block.layer.y",
      "block.layer.z",
      "block.layer.anchor",
    ];
    for (const type of pageBlockTypes) {
      const composed = [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]];
      for (const id of ids) {
        expect(
          composed.some((entry) => entry.id === id),
          `${type} missing ${id}`
        ).toBe(true);
      }
    }
  });
});

describe("layout composition.mode + group marquee controls (TASK-522-05-L02/L04)", () => {
  test("block.<type>.composition.mode lives ONLY on the per-type layout registries", () => {
    for (const type of ["container", "columns", "group"] as const) {
      const control = pageBlockControlRegistry[type].find(
        (entry) => entry.id === `block.${type}.composition.mode`
      );
      expect(control, `${type} missing composition.mode`).toBeDefined();
      expect(control?.input).toBe("select");
      expect(control?.target).toBe("block");
      expect(control?.panel).toBe("layout");
      expect(control?.options).toBe(pageCompositions);
      expect(control?.responsive).toBe(false);
      expect(control?.path).toEqual(["style", "composition"]);
    }
    // NOT universal (no appliesTo exists on the universal array).
    expect(pageUniversalBlockControls.some((entry) => entry.id.endsWith(".composition.mode"))).toBe(
      false
    );
  });

  test("group.marquee.* controls live on the per-type group registry only", () => {
    const groupControls = pageBlockControlRegistry.group;
    const speed = groupControls.find((entry) => entry.id === "group.marquee.speed");
    expect(speed?.input).toBe("number");
    expect(speed?.responsive).toBe(false);
    expect(speed?.clamp).toEqual({ min: 8, max: 40 });
    expect(speed?.unit).toBe("s");
    expect(speed?.path).toEqual(["style", "marquee", "speed"]);

    const direction = groupControls.find((entry) => entry.id === "group.marquee.direction");
    expect(direction?.input).toBe("select");
    expect(direction?.options).toBe(pageMarqueeDirections);
    expect(direction?.responsive).toBe(false);
    expect(direction?.path).toEqual(["style", "marquee", "direction"]);

    const seamless = groupControls.find((entry) => entry.id === "group.marquee.seamless");
    expect(seamless?.input).toBe("switch");
    expect(seamless?.responsive).toBe(false);
    expect(seamless?.path).toEqual(["style", "marquee", "seamless"]);

    // No `enabled` key control (unallowlisted); presence via `speed`.
    expect(groupControls.some((entry) => entry.id === "group.marquee.enabled")).toBe(false);
    // Marquee is group-only: no other block type carries it.
    for (const type of pageBlockTypes) {
      if (type === "group") continue;
      expect(
        pageBlockControlRegistry[type].some((entry) => entry.id.startsWith("group.marquee.")),
        `${type} should not carry marquee`
      ).toBe(false);
    }
  });

  // ── TASK-532 typography fidelity (Bundle B) — controls ──
  test("TASK-532 text block exposes fluid size, text-transform, textColor + grown weight enum", () => {
    const controls = getPageEditorControlsForTarget({ kind: "block", type: "text" });
    const ids = controls.map((control) => control.id);
    expect(ids).toContain("block.style.fontSizeCustom");
    expect(ids).toContain("block.style.textTransform");
    // textColor pre-exists (universal, not type-gated) — lock it in for `text`.
    expect(ids).toContain("block.style.textColor");

    const fluid = controls.find((control) => control.id === "block.style.fontSizeCustom")!;
    expect(fluid).toMatchObject({ input: "text", responsive: true, panel: "typography" });

    const transform = controls.find((control) => control.id === "block.style.textTransform")!;
    expect(transform.options).toEqual([...pageTypographyTextTransforms]);
    expect(transform).toMatchObject({ input: "select", responsive: true, fallback: "none" });

    // The weight enum grew 4→6; the control reads it by reference.
    const weight = controls.find((control) => control.id === "block.style.fontWeight")!;
    expect(weight.options).toEqual([...pageTypographyFontWeights]);
    expect(weight.options).toHaveLength(6);
    expect(weight.options).toContain("extrabold");
    expect(weight.options).toContain("black");
  });

  test("TASK-532 divider block exposes gradient/width/align controls", () => {
    const controls = pageBlockControlRegistry.divider;
    const gradient = controls.find((control) => control.id === "block.divider.props.gradient")!;
    expect(gradient).toMatchObject({ input: "switch", panel: "style" });

    const width = controls.find((control) => control.id === "block.divider.props.width")!;
    expect(width).toMatchObject({ input: "number", panel: "style", unit: "px" });
    expect(width.clamp).toEqual(PAGE_DIVIDER_WIDTH_CLAMP);

    const align = controls.find((control) => control.id === "block.divider.props.align")!;
    expect(align).toMatchObject({ input: "segmented", panel: "style" });
    expect(align.options).toEqual([...pageDividerAligns]);
  });
});

describe("glow + gradient-type controls (TASK-531-01-L03)", () => {
  const findSection = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalSectionControls.find((entry) => entry.id === id);
  const findBlock = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalBlockControls.find((entry) => entry.id === id);

  // Shared descriptor spec: the color leaf + the four numeric leaves with their clamps.
  const numericGlowSpec: ReadonlyArray<{
    tail: string;
    clamp: { min: number; max: number };
  }> = [
    { tail: "blur", clamp: { min: PAGE_GLOW_BLUR_CLAMP.min, max: PAGE_GLOW_BLUR_CLAMP.max } },
    {
      tail: "spread",
      clamp: { min: PAGE_GLOW_SPREAD_CLAMP.min, max: PAGE_GLOW_SPREAD_CLAMP.max },
    },
    { tail: "x", clamp: { min: PAGE_GLOW_OFFSET_CLAMP.min, max: PAGE_GLOW_OFFSET_CLAMP.max } },
    { tail: "y", clamp: { min: PAGE_GLOW_OFFSET_CLAMP.min, max: PAGE_GLOW_OFFSET_CLAMP.max } },
  ];

  for (const target of ["section", "block"] as const) {
    const find = target === "section" ? findSection : findBlock;

    test(`${target} glow.color is a live per-device color control on the style panel`, () => {
      const color = find(`${target}.style.glow.color`);
      expect(color).toBeDefined();
      // No new UI kind — glow color reuses the existing `color` input.
      expect(color?.input).toBe("color");
      expect(color?.target).toBe(target);
      expect(color?.panel).toBe("style");
      // Glow is per-device (rides the responsive @media machinery — G-3b).
      expect(color?.responsive).toBe(true);
      expect(color?.path).toEqual(["style", "glow", "color"]);
      expect(Array.isArray(color?.path)).toBe(true);
      // No options (enum-less), no legacy fields.
      expect("options" in (color ?? {})).toBe(false);
      expect("kind" in (color ?? {})).toBe(false);
      expect("showWhen" in (color ?? {})).toBe(false);
    });

    test(`${target} glow numeric controls are clamped per-device number inputs`, () => {
      for (const spec of numericGlowSpec) {
        const numeric = find(`${target}.style.glow.${spec.tail}`);
        expect(numeric, `${target}.style.glow.${spec.tail} missing`).toBeDefined();
        // No new UI kind — numeric glow fields reuse `number` + clamp.
        expect(numeric?.input).toBe("number");
        expect(numeric?.target).toBe(target);
        expect(numeric?.panel).toBe("style");
        expect(numeric?.responsive).toBe(true);
        expect(numeric?.path).toEqual(["style", "glow", spec.tail]);
        expect(numeric?.clamp).toEqual(spec.clamp);
        // Enum-less; no legacy fields.
        expect("options" in (numeric ?? {})).toBe(false);
        expect("showWhen" in (numeric ?? {})).toBe(false);
      }
    });
  }

  test("glow controls are UNIVERSAL — composed for every block type", () => {
    const glowIds = [
      "block.style.glow.color",
      "block.style.glow.blur",
      "block.style.glow.spread",
      "block.style.glow.x",
      "block.style.glow.y",
    ];
    for (const type of pageBlockTypes) {
      const composed = [...pageUniversalBlockControls, ...pageBlockControlRegistry[type]];
      for (const id of glowIds) {
        expect(
          composed.some((entry) => entry.id === id),
          `${type} missing ${id}`
        ).toBe(true);
      }
    }
  });

  test("backgroundType still offers the gradient option on both targets (no enum change)", () => {
    // 531 authors a gradient by selecting the existing backgroundType option +
    // typing/pasting into the existing `background` control — no new control.
    expect(pageBackgroundTypes).toContain("gradient");
    const sectionType = findSection("section.style.backgroundType");
    const blockType = findBlock("block.style.backgroundType");
    expect(sectionType?.input).toBe("select");
    expect(sectionType?.options).toBe(pageBackgroundTypes);
    expect(sectionType?.options).toContain("gradient");
    expect(blockType?.input).toBe("select");
    expect(blockType?.options).toBe(pageBackgroundTypes);
    expect(blockType?.options).toContain("gradient");
  });
});

// TASK-531-01-L03/L04 — the nested glow.color CLIENT mutation write-guard (finding #4).
// `sanitizePageEditorControlValue` destructures `const [group, key] = overridePath`, so
// for the length-3 `["style","glow","color"]` path `key="glow"` (NOT "color") — without
// the 531 branch the glow color would fall through UNSANITIZED into optimistic client
// state. Parallel to sibling 533-02's length-4 `border.*.color` handling.
describe("nested glow.color client mutation guard (TASK-531-01-L03, finding #4)", () => {
  const glowColorControl = (target: "section" | "block"): PageEditorControlDefinition => {
    const pool = target === "section" ? pageUniversalSectionControls : pageUniversalBlockControls;
    const control = pool.find((entry) => entry.id === `${target}.style.glow.color`);
    if (!control) throw new Error(`${target}.style.glow.color control missing`);
    return control;
  };

  for (const target of ["section", "block"] as const) {
    test(`${target} glow.color drops a hostile color and passes a safe color through`, () => {
      const control = glowColorControl(target);
      // Precondition: the guard sees the length-3 nested path.
      expect(control.overridePath).toEqual(["style", "glow", "color"]);
      // A hostile color is rejected (sanitizeAuthoringCssColor → null) at the client guard,
      // proving the nested length-3 path now REACHES the color sanitizer.
      expect(sanitizePageEditorControlValue(control, "expression(alert(1))")).toBeNull();
      expect(sanitizePageEditorControlValue(control, "url(//evil/x)")).toBeNull();
      // A safe color passes through unchanged.
      expect(sanitizePageEditorControlValue(control, "rgba(142,232,255,.22)")).toBe(
        "rgba(142,232,255,.22)"
      );
      expect(sanitizePageEditorControlValue(control, "#8ee8ff")).toBe("#8ee8ff");
    });
  }

  test("regression: a plain style.background control still routes through the background sanitizer", () => {
    const control = pageUniversalBlockControls.find(
      (entry) => entry.id === "block.style.background"
    );
    if (!control) throw new Error("block.style.background control missing");
    expect(control.overridePath).toEqual(["style", "background"]);
    // Multi-layer accept (the 531 relax) — not disturbed by the added glow branch.
    const ctaCard =
      "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";
    expect(sanitizePageEditorControlValue(control, ctaCard)).toBe(ctaCard);
    // url() reject still fires through the background sanitizer.
    expect(
      sanitizePageEditorControlValue(control, "linear-gradient(#fff,#000), url(//evil/beacon)")
    ).toBeNull();
  });
});

// TASK-534-04-L04 — declarative-interactivity control coverage (switcher tabs /
// variant / activeIndex, gallery filter controls, scrollHint glyph/label, the
// single universal magnetic toggle, the section noise toggle).
describe("page editor control registry — TASK-534 interactivity", () => {
  test("switcher resolves tabs (items) + variant segmented + clamped activeIndex", () => {
    const controls = pageBlockControlRegistry.switcher;
    const byId = new Map(controls.map((c) => [c.id, c]));
    const tabs = byId.get("block.switcher.props.tabs");
    expect(tabs?.input).toBe("items");
    expect(tabs?.path).toEqual(["props", "tabs"]);
    const variant = byId.get("block.switcher.props.variant");
    expect(variant?.input).toBe("segmented");
    expect(variant?.options).toBe(switcherVariants);
    const active = byId.get("block.switcher.props.activeIndex");
    expect(active?.input).toBe("number");
    expect(active?.clamp).toEqual({ min: 0, max: 5 }); // SWITCHER_MAX_PANELS - 1.
  });

  test("gallery resolves layout segmented + filterable switch + filterCategories list", () => {
    const byId = new Map(pageBlockControlRegistry.gallery.map((c) => [c.id, c]));
    expect(byId.get("block.gallery.props.layout")?.input).toBe("segmented");
    expect(byId.get("block.gallery.props.layout")?.options).toBe(pageGalleryLayouts);
    expect(byId.get("block.gallery.props.filterable")?.input).toBe("switch");
    expect(byId.get("block.gallery.props.filterCategories")?.input).toBe("items");
  });

  test("scrollHint resolves glyph segmented + label text", () => {
    const byId = new Map(pageBlockControlRegistry.scrollHint.map((c) => [c.id, c]));
    expect(byId.get("block.scrollHint.props.glyph")?.input).toBe("segmented");
    expect(byId.get("block.scrollHint.props.glyph")?.options).toBe(scrollHintGlyphs);
    expect(byId.get("block.scrollHint.props.label")?.input).toBe("text");
  });

  test("pageUniversalBlockControls contains exactly one block.style.magnetic switch", () => {
    const magnetic = pageUniversalBlockControls.filter((c) => c.id === "block.style.magnetic");
    expect(magnetic).toHaveLength(1);
    expect(magnetic[0]?.input).toBe("switch");
    expect(magnetic[0]?.path).toEqual(["style", "magnetic"]);
    expect(magnetic[0]?.responsive).toBe(false);
  });

  test("pageUniversalSectionControls contains exactly one section.style.noiseOverlay switch", () => {
    const noise = pageUniversalSectionControls.filter((c) => c.id === "section.style.noiseOverlay");
    expect(noise).toHaveLength(1);
    expect(noise[0]?.input).toBe("switch");
    expect(noise[0]?.path).toEqual(["style", "noiseOverlay"]);
    expect(noise[0]?.responsive).toBe(false);
  });

  test("the new controls resolve for their insertable block types (via getPageEditorControlsForTarget)", () => {
    const switcherControls = getPageEditorControlsForTarget({ kind: "block", type: "switcher" });
    expect(switcherControls.some((c) => c.id === "block.switcher.props.tabs")).toBe(true);
    // The universal magnetic toggle also appears on the resolved surface.
    expect(switcherControls.some((c) => c.id === "block.style.magnetic")).toBe(true);
    const galleryControls = getPageEditorControlsForTarget({ kind: "block", type: "gallery" });
    expect(galleryControls.some((c) => c.id === "block.gallery.props.filterable")).toBe(true);
  });
});

// TASK-533-01-L04 — block colSpan/rowSpan + section columnTemplate controls.
describe("grid span + column-ratio controls (TASK-533-01-L03)", () => {
  const findSection = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalSectionControls.find((entry) => entry.id === id);
  const findBlock = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalBlockControls.find((entry) => entry.id === id);

  test("block colSpan/rowSpan are clamped number inputs on the layout panel (no fallback)", () => {
    for (const tail of ["colSpan", "rowSpan"] as const) {
      const control = findBlock(`block.style.${tail}`);
      expect(control, `block.style.${tail} missing`).toBeDefined();
      expect(control?.input).toBe("number");
      expect(control?.target).toBe("block");
      expect(control?.panel).toBe("layout");
      expect(control?.path).toEqual(["style", tail]);
      expect(control?.clamp).toEqual({
        min: PAGE_BLOCK_SPAN_CLAMP.min,
        max: PAGE_BLOCK_SPAN_CLAMP.max,
      });
      // Present-only: no misleading fallback for an unset span.
      expect("fallback" in (control ?? {})).toBe(false);
      expect("options" in (control ?? {})).toBe(false);
    }
  });

  test("section columnTemplate is a curated select of sanitizer-passing presets", () => {
    const control = findSection("section.style.columnTemplate");
    expect(control).toBeDefined();
    expect(control?.input).toBe("select");
    expect(control?.target).toBe("section");
    expect(control?.panel).toBe("layout");
    expect(control?.path).toEqual(["style", "columnTemplate"]);
    // Curated presets are the shared owner array (also gates ownerOptionSets).
    expect(control?.options).toBe(pageColumnTemplatePresets);
    // Every preset survives the strict sanitizer byte-identically.
    for (const preset of pageColumnTemplatePresets) {
      expect(sanitizeAuthoringGridTemplate(preset), preset).toBe(preset);
    }
    // Present-only: no misleading fallback for an unset ratio.
    expect("fallback" in (control ?? {})).toBe(false);
  });

  test("all three 533-01 control ids are registered", () => {
    const ids = [...pageUniversalBlockControls, ...pageUniversalSectionControls].map(
      (entry) => entry.id
    );
    expect(ids).toEqual(
      expect.arrayContaining([
        "block.style.colSpan",
        "block.style.rowSpan",
        "section.style.columnTemplate",
      ])
    );
  });
});

// TASK-533-02-L04 — per-edge section border controls + the nested (length-4)
// border.*.color client mutation write-guard.
describe("per-edge section border controls (TASK-533-02-L03)", () => {
  const findSection = (id: string): PageEditorControlDefinition | undefined =>
    pageUniversalSectionControls.find((entry) => entry.id === id);

  test("registers 12 per-edge border controls with the correct length-4 paths + clamp", () => {
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const color = findSection(`section.style.border.${side}.color`);
      expect(color, `${side}.color missing`).toBeDefined();
      expect(color?.input).toBe("color");
      expect(color?.target).toBe("section");
      expect(color?.panel).toBe("style");
      expect(color?.responsive).toBe(false);
      expect(color?.path).toEqual(["style", "border", side, "color"]);
      // Present-only: no misleading fallback on the color.
      expect("fallback" in (color ?? {})).toBe(false);

      const width = findSection(`section.style.border.${side}.width`);
      expect(width, `${side}.width missing`).toBeDefined();
      expect(width?.input).toBe("number");
      expect(width?.path).toEqual(["style", "border", side, "width"]);
      expect(width?.clamp).toEqual({
        min: PAGE_SECTION_BORDER_WIDTH_CLAMP.min,
        max: PAGE_SECTION_BORDER_WIDTH_CLAMP.max,
      });
      // Present-only: no misleading fallback on the width.
      expect("fallback" in (width ?? {})).toBe(false);

      const style = findSection(`section.style.border.${side}.style`);
      expect(style, `${side}.style missing`).toBeDefined();
      expect(style?.input).toBe("segmented");
      expect(style?.path).toEqual(["style", "border", side, "style"]);
      expect(style?.options).toBe(pageBlockBorderStyles);
    }
  });

  // The nested length-4 border.*.color CLIENT write-guard (parent contract §Security).
  // The `[group, key, ...rest]` destructure (531 form) leaves `key="border"` (NOT
  // "color"), so without the 533-02 branch the border color would fall through
  // UNSANITIZED into optimistic client state. This asserts it now REACHES the color
  // sanitizer end-to-end (editor value sanitize).
  test("border.*.color drops a hostile color and passes a safe color through", () => {
    for (const side of ["top", "right", "bottom", "left"] as const) {
      const control = findSection(`section.style.border.${side}.color`);
      if (!control) throw new Error(`section.style.border.${side}.color control missing`);
      // Precondition: the guard sees the length-4 nested path.
      expect(control.overridePath).toEqual(["style", "border", side, "color"]);
      // Hostile colors are rejected (sanitizeAuthoringCssColor → null) at the client guard.
      expect(sanitizePageEditorControlValue(control, "expression(alert(1))")).toBeNull();
      expect(sanitizePageEditorControlValue(control, "url(//evil)")).toBeNull();
      expect(sanitizePageEditorControlValue(control, "javascript:alert(1)")).toBeNull();
      // A safe color passes through unchanged.
      expect(sanitizePageEditorControlValue(control, "#ffffff33")).toBe("#ffffff33");
      expect(sanitizePageEditorControlValue(control, "rgba(255,255,255,.1)")).toBe(
        "rgba(255,255,255,.1)"
      );
    }
  });

  test("regression: border.*.width / .style pass through the guard unchanged (numeric/enum)", () => {
    const width = findSection("section.style.border.top.width");
    const style = findSection("section.style.border.top.style");
    if (!width || !style) throw new Error("border width/style control missing");
    // Non-color nested border paths are NOT color-sanitized — width/style pass through
    // (clamped/enum-validated at the persist boundary, not the client guard).
    expect(sanitizePageEditorControlValue(width, 2)).toBe(2);
    expect(sanitizePageEditorControlValue(style, "dashed")).toBe("dashed");
  });
});
