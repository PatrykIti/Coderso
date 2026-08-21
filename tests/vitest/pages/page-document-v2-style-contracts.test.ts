import { describe, expect, test } from "vitest";

import Ajv from "ajv";

import {
  PAGE_LAYER_Z_CLAMP,
  PageDocumentError,
  normalizePageDocumentV2ForWrite,
  normalizeStoredPageDocumentV2ForRead,
  pageDocumentV2JsonSchema,
  type PageDocumentV2,
} from "../../../core/services/pages/pageDocumentV2";

import { buildDocument, cloneDocument, safeNormalizeError } from "./page-document-v2-test-helpers";

// TASK-525-02-L01 — per-block staggered reveal delay model.
describe("block reveal-delay model (TASK-525-02-L01)", () => {
  const docWithBlockStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.style =
      style as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    return doc;
  };
  const blockStyle = (doc: PageDocumentV2) =>
    normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!.style ?? {};

  test("round-trips block.style.revealDelay", () => {
    expect(blockStyle(docWithBlockStyle({ revealDelay: 120 })).revealDelay).toBe(120);
    const normalized = normalizePageDocumentV2ForWrite(docWithBlockStyle({ revealDelay: 120 }));
    const roundTripped = normalizePageDocumentV2ForWrite(cloneDocument(normalized));
    expect(roundTripped.sections[0]!.blocks[0]!.style).toEqual(
      normalized.sections[0]!.blocks[0]!.style
    );
  });

  test("clamps revealDelay to PAGE_REVEAL_DELAY_CLAMP fail-soft", () => {
    expect(blockStyle(docWithBlockStyle({ revealDelay: 1e9 })).revealDelay).toBe(4000);
    expect(blockStyle(docWithBlockStyle({ revealDelay: -500 })).revealDelay).toBe(0);
    // NaN/Infinity → readNumber fallback (0).
    expect(blockStyle(docWithBlockStyle({ revealDelay: Number.NaN })).revealDelay).toBe(0);
    expect(
      blockStyle(docWithBlockStyle({ revealDelay: Number.POSITIVE_INFINITY })).revealDelay
    ).toBe(0);
  });

  test("is present-only: an unset block emits NO revealDelay (byte-identical)", () => {
    expect("revealDelay" in blockStyle(docWithBlockStyle({}))).toBe(false);
    // and a block with only OTHER fields carries no revealDelay key.
    expect("revealDelay" in blockStyle(docWithBlockStyle({ tilt: "subtle" }))).toBe(false);
  });

  test("rejects an unknown block-style sibling key (reject-unknown)", () => {
    expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle({ revealDelayX: 1 }))).toThrow(
      "Unknown page document field: sections.0.blocks.0.style.revealDelayX"
    );
  });

  // Compiling `pageDocumentV2JsonSchema` is expensive; under full-file load the
  // default 5s timeout can be exceeded (pre-existing latent flake — sibling AJV
  // tests already use { timeout: 30_000 }). Align this one for stability.
  test("revealDelay validates against the JSON schema", { timeout: 30_000 }, () => {
    const normalized = normalizePageDocumentV2ForWrite(docWithBlockStyle({ revealDelay: 240 }));
    const ajv = new Ajv({ allErrors: true, strict: true });
    const validate = ajv.compile(pageDocumentV2JsonSchema);
    expect(validate(normalized)).toBe(true);
  });
});

// TASK-522-01-L03 — block + section composition STYLE model.
describe("composition style model (TASK-522-01-L03)", () => {
  const docWithBlockStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.style =
      style as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    return doc;
  };
  const blockStyle = (doc: PageDocumentV2) =>
    normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!.style ?? {};

  test("round-trips decoration/tilt/tiltGlare/layer/surfacePreset/hoverEffect/marquee/composition", () => {
    const style = blockStyle(
      docWithBlockStyle({
        decoration: { motion: "float", delay: 200, duration: 8000 },
        tilt: "subtle",
        tiltGlare: true,
        layer: { x: 10, y: -20, z: 5, anchor: "bottom-right" },
        surfacePreset: "glass",
        hoverEffect: "lift-glow",
        marquee: { speed: 18, direction: "right", seamless: true },
        composition: "layered",
      })
    );
    expect(style).toEqual({
      decoration: { motion: "float", delay: 200, duration: 8000 },
      tilt: "subtle",
      tiltGlare: true,
      layer: { x: 10, y: -20, z: 5, anchor: "bottom-right" },
      surfacePreset: "glass",
      hoverEffect: "lift-glow",
      marquee: { speed: 18, direction: "right", seamless: true },
      composition: "layered",
    });
  });

  test("radiate decoration round-trips (map-pulse variant)", () => {
    expect(blockStyle(docWithBlockStyle({ decoration: { motion: "radiate" } }))).toEqual({
      decoration: { motion: "radiate" },
    });
  });

  test("present-only reset members are omitted (none / flow)", () => {
    expect(
      blockStyle(
        docWithBlockStyle({
          decoration: { motion: "none" },
          tilt: "none",
          surfacePreset: "none",
          hoverEffect: "none",
          composition: "flow",
        })
      )
    ).toEqual({});
  });

  test("fail-closed enum VALUES throw PageDocumentError in write mode", () => {
    const cases: Array<Record<string, unknown>> = [
      { decoration: { motion: "explode" } },
      { tilt: "spin" },
      { surfacePreset: "drop-table" },
      { hoverEffect: "hack" },
      { layer: { anchor: "nope" } },
      { marquee: { direction: "up" } },
      { composition: "diagonal" },
    ];
    for (const style of cases) {
      expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle(style))).toThrow();
    }
  });

  test("numbers clamp fail-soft (layer.z, marquee.speed, decoration.duration)", () => {
    // TASK-523-02 — layer.z clamps to the (occlusion-proof) bound, capped below
    // the cursor-spotlight overlay z-index so a layer can never hide the glow.
    expect(blockStyle(docWithBlockStyle({ layer: { z: 99999 } })).layer).toEqual({
      z: PAGE_LAYER_Z_CLAMP.max,
    });
    expect(blockStyle(docWithBlockStyle({ marquee: { speed: 0.1 } })).marquee).toEqual({
      speed: 8,
    });
    expect(
      blockStyle(docWithBlockStyle({ decoration: { motion: "float", duration: 1 } })).decoration
    ).toEqual({ motion: "float", duration: 2000 });
  });

  test("unknown NESTED key throws", () => {
    for (const style of [
      { decoration: { motion: "float", foo: 1 } },
      { layer: { x: 0, evil: 1 } },
      { marquee: { speed: 18, bad: 1 } },
    ]) {
      expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle(style))).toThrow(
        "Unknown page document field"
      );
    }
  });

  test("unknown top-level style key throws", () => {
    expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle({ wobble: 1 }))).toThrow(
      "Unknown page document field: sections.0.blocks.0.style.wobble"
    );
  });

  test(
    "a responsive.tablet.style.layer round-trips (partial schema mirror)",
    { timeout: 30_000 },
    () => {
      const doc = buildDocument();
      const block = doc.sections[0]!.blocks[0]!;
      // TASK-539 reachability: a responsive layer is only legal when the
      // normalized BASE layer is nonempty, so author the base layer first.
      block.style = {
        ...(block.style as object),
        layer: { x: 1, y: 2, z: 3 },
      } as PageDocumentV2["sections"][number]["blocks"][number]["style"];
      block.responsive = {
        tablet: { style: { layer: { x: 5, y: 5 } } },
      } as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
      const normalized = normalizePageDocumentV2ForWrite(doc);
      expect(normalized.sections[0]!.blocks[0]!.responsive?.tablet?.style?.layer).toEqual({
        x: 5,
        y: 5,
      });
      const ajv = new Ajv({ allErrors: true, strict: true });
      expect(ajv.compile(pageDocumentV2JsonSchema)(normalized)).toBe(true);
    }
  );

  test("section surfacePreset/composition round-trip + present-only omission", () => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      surfacePreset: "ambient-orbs",
      composition: "layered",
    } as PageDocumentV2["sections"][number]["style"];
    const normalized = normalizePageDocumentV2ForWrite(doc);
    expect(normalized.sections[0]!.style.surfacePreset).toBe("ambient-orbs");
    expect(normalized.sections[0]!.style.composition).toBe("layered");

    const reset = buildDocument();
    reset.sections[0]!.style = {
      ...reset.sections[0]!.style,
      surfacePreset: "none",
      composition: "flow",
    } as PageDocumentV2["sections"][number]["style"];
    const resetNorm = normalizePageDocumentV2ForWrite(reset);
    expect(resetNorm.sections[0]!.style).not.toHaveProperty("surfacePreset");
    expect(resetNorm.sections[0]!.style).not.toHaveProperty("composition");
  });

  test("a legacy block/section (none of the new keys) is byte-identical", () => {
    const normalized = normalizePageDocumentV2ForWrite(buildDocument());
    expect(normalized.sections[0]!.blocks[0]!.style).toBeUndefined();
    expect(normalized.sections[0]!.style).not.toHaveProperty("surfacePreset");
    expect(normalized.sections[0]!.style).not.toHaveProperty("composition");
  });

  // TASK-524-02-L04 — independent surfaceTint model (round-trip / present-only /
  // sanitize fail-soft / reject-unknown intact / JSON schema).
  test("surfaceTint round-trips (incl. alpha rgba + hex8)", () => {
    expect(blockStyle(docWithBlockStyle({ surfaceTint: "rgba(142,232,255,.5)" })).surfaceTint).toBe(
      "rgba(142, 232, 255, 0.5)"
    );
    expect(blockStyle(docWithBlockStyle({ surfaceTint: "#8ee8ff80" })).surfaceTint).toBe(
      "#8ee8ff80"
    );
  });

  test("surfaceTint present-only: omitted when unset → byte-identical to 522", () => {
    const style = blockStyle(docWithBlockStyle({ surfacePreset: "glass" }));
    expect(style).not.toHaveProperty("surfaceTint");
    expect("surfaceTint" in style).toBe(false);
  });

  test("surfaceTint fails soft on a bad color (omitted, no throw)", () => {
    expect(
      blockStyle(docWithBlockStyle({ surfaceTint: "expression(alert(1))" }))
    ).not.toHaveProperty("surfaceTint");
    expect(
      blockStyle(docWithBlockStyle({ surfaceTint: "url(javascript:alert(1))" }))
    ).not.toHaveProperty("surfaceTint");
    expect(blockStyle(docWithBlockStyle({ surfaceTint: "" }))).not.toHaveProperty("surfaceTint");
  });

  test("surfaceTint is independent of background (both round-trip)", () => {
    const style = blockStyle(
      docWithBlockStyle({ background: "#123456", surfaceTint: "rgba(142,232,255,.5)" })
    );
    expect(style.background).toBe("#123456");
    expect(style.surfaceTint).toBe("rgba(142, 232, 255, 0.5)");
  });

  // See the revealDelay AJV test note: expensive schema compile ⇒ 30s timeout.
  test(
    "surfaceTint validates against the block-style JSON schema (additionalProperties:false)",
    { timeout: 30_000 },
    () => {
      const doc = docWithBlockStyle({ surfaceTint: "#8ee8ff" });
      const normalized = normalizePageDocumentV2ForWrite(doc);
      const ajv = new Ajv({ allErrors: true, strict: true });
      expect(ajv.compile(pageDocumentV2JsonSchema)(normalized)).toBe(true);
    }
  );

  test("unknown block-style key still rejects with surfaceTint in the allowlist", () => {
    expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle({ wobble: 1 }))).toThrow(
      "Unknown page document field: sections.0.blocks.0.style.wobble"
    );
  });
});

// TASK-531-01-L02/L04 — glow model (arbitrary colored box-shadow) + multi-layer
// background at the WRITE boundary. Present-only, reject-unknown, fail-soft, joins
// all three additionalProperties:false JSON schemas in lockstep.
describe("glow model + multi-layer background write boundary (TASK-531-01)", () => {
  const docWithBlockStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.style =
      style as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    return doc;
  };
  const docWithSectionStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      ...style,
    } as PageDocumentV2["sections"][number]["style"];
    return doc;
  };
  const blockStyle = (doc: PageDocumentV2): Record<string, unknown> =>
    (normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!.style ?? {}) as Record<
      string,
      unknown
    >;
  const sectionStyle = (doc: PageDocumentV2): Record<string, unknown> =>
    normalizePageDocumentV2ForWrite(doc).sections[0]!.style as unknown as Record<string, unknown>;

  const REFERENCE_GLOW = { color: "rgba(142, 232, 255, 0.22)", blur: 45, y: 18 } as const;

  // ── Round-trip on BOTH targets ──────────────────────────────────────────────
  test("round-trips glow on a block (present-only, byte-stable second pass)", () => {
    const first = normalizePageDocumentV2ForWrite(
      docWithBlockStyle({ glow: { ...REFERENCE_GLOW } })
    );
    expect(first.sections[0]!.blocks[0]!.style).toMatchObject({
      glow: { color: "rgba(142, 232, 255, 0.22)", blur: 45, y: 18 },
    });
    // Unset offsets/spread are OMITTED (present-only — not defaulted into storage).
    const glow = (first.sections[0]!.blocks[0]!.style as Record<string, unknown>).glow as Record<
      string,
      unknown
    >;
    expect("x" in glow).toBe(false);
    expect("spread" in glow).toBe(false);
    // Re-normalizing the stored doc is byte-identical (round-trip stability).
    const second = normalizePageDocumentV2ForWrite(cloneDocument(first));
    expect(second.sections[0]!.blocks[0]!.style).toEqual(first.sections[0]!.blocks[0]!.style);
  });

  test("round-trips glow on a section (present-only, byte-stable second pass)", () => {
    const first = normalizePageDocumentV2ForWrite(
      docWithSectionStyle({ glow: { color: "#8ee8ff", blur: 28 } })
    );
    expect(sectionStyle(cloneDocument(first))).toMatchObject({
      glow: { color: "#8ee8ff", blur: 28 },
    });
    const second = normalizePageDocumentV2ForWrite(cloneDocument(first));
    expect(second.sections[0]!.style).toEqual(first.sections[0]!.style);
  });

  // ── Present-only omit ───────────────────────────────────────────────────────
  test("glow is present-only — omitted when unauthored on block AND section", () => {
    expect("glow" in blockStyle(docWithBlockStyle({}))).toBe(false);
    expect("glow" in sectionStyle(docWithSectionStyle({}))).toBe(false);
  });

  // ── Reject-unknown nested key (fail-closed READ trap) ───────────────────────
  test("an unknown nested glow key rejects fail-closed (block AND section)", () => {
    expect(() =>
      normalizePageDocumentV2ForWrite(docWithBlockStyle({ glow: { color: "#8ee8ff", wobble: 1 } }))
    ).toThrow("Unknown page document field: sections.0.blocks.0.style.glow.wobble");
    expect(() =>
      normalizePageDocumentV2ForWrite(
        docWithSectionStyle({ glow: { color: "#8ee8ff", wobble: 1 } })
      )
    ).toThrow("Unknown page document field: sections.0.style.glow.wobble");
  });

  // ── Fail-soft VALUES ────────────────────────────────────────────────────────
  test("a bad glow color omits the WHOLE glow (fail-soft, color required)", () => {
    // expression()/url()/named-with-parens are not safe colors ⇒ the whole glow drops.
    expect(
      "glow" in blockStyle(docWithBlockStyle({ glow: { color: "expression(alert(1))" } }))
    ).toBe(false);
    expect("glow" in blockStyle(docWithBlockStyle({ glow: { color: "url(//evil/x)" } }))).toBe(
      false
    );
    // A glow object with NO color at all ⇒ omitted (color is required).
    expect("glow" in blockStyle(docWithBlockStyle({ glow: { blur: 40 } }))).toBe(false);
    expect("glow" in sectionStyle(docWithSectionStyle({ glow: { color: "not a color;}" } }))).toBe(
      false
    );
  });

  test("glow numerics clamp fail-soft to the 531 bounds", () => {
    const clamped = blockStyle(
      docWithBlockStyle({ glow: { color: "#8ee8ff", blur: 9999, spread: -999, x: 5000, y: -5000 } })
    ).glow as Record<string, number>;
    expect(clamped.blur).toBe(120); // PAGE_GLOW_BLUR_CLAMP.max
    expect(clamped.spread).toBe(-40); // PAGE_GLOW_SPREAD_CLAMP.min
    expect(clamped.x).toBe(80); // PAGE_GLOW_OFFSET_CLAMP.max
    expect(clamped.y).toBe(-80); // PAGE_GLOW_OFFSET_CLAMP.min
  });

  // ── JSON schema lockstep (all THREE additionalProperties:false style schemas) ─
  test(
    "glow validates against the compiled pageDocumentV2JsonSchema on block AND section",
    { timeout: 30_000 },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      const blockNormalized = normalizePageDocumentV2ForWrite(
        docWithBlockStyle({ glow: { ...REFERENCE_GLOW } })
      );
      expect(validate(blockNormalized)).toBe(true);
      // Top-level section style is validated by the INLINED section schema (:1827),
      // separate from the partial — omitting glow there would fail this assertion.
      const sectionNormalized = normalizePageDocumentV2ForWrite(
        docWithSectionStyle({ glow: { color: "#8ee8ff", blur: 28 } })
      );
      expect(validate(sectionNormalized)).toBe(true);

      // A hand-injected unknown nested glow key fails additionalProperties:false too.
      const tampered = cloneDocument(blockNormalized);
      (
        (tampered.sections[0]!.blocks[0]!.style as Record<string, unknown>).glow as Record<
          string,
          unknown
        >
      ).wobble = 1;
      expect(validate(tampered)).toBe(false);
      // A glow with no color fails required:["color"].
      const noColor = cloneDocument(blockNormalized);
      (noColor.sections[0]!.blocks[0]!.style as Record<string, unknown>).glow = { blur: 10 };
      expect(validate(noColor)).toBe(false);
    }
  );

  // ── Multi-layer background at the WRITE boundary (G-1) ───────────────────────
  test("a safe multi-layer background round-trips through the block AND section write boundary", () => {
    const ctaCard =
      "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";
    expect(
      blockStyle(docWithBlockStyle({ background: ctaCard, backgroundType: "gradient" })).background
    ).toBe(ctaCard);
    expect(
      sectionStyle(docWithSectionStyle({ background: ctaCard, backgroundType: "gradient" }))
        .background
    ).toBe(ctaCard);
  });

  test("a url()-bearing multi-layer background is rejected at the write boundary (no beacon stored)", () => {
    // The section normalizer sanitizes background via sanitizeAuthoringCssBackground:
    // the trailing url() layer fails the per-layer allowlist + whole-value tripwire, so
    // the whole value drops to the default (no verbatim beacon persisted).
    const beacon = "linear-gradient(#fff,#000), url(//evil/beacon)";
    expect(
      sectionStyle(docWithSectionStyle({ background: beacon, backgroundType: "gradient" }))
        .background
    ).not.toBe(beacon);
    // Over-cap (7 layers) also rejected.
    const overCap = Array.from({ length: 7 }, () => "#000").join(", ");
    expect(
      sectionStyle(docWithSectionStyle({ background: overCap, backgroundType: "gradient" }))
        .background
    ).not.toBe(overCap);
  });

  // ── Byte-identity for a no-effect document ──────────────────────────────────
  test("a doc with no glow / no multi-layer / no section-gradient is byte-identical across two passes", () => {
    const base = normalizePageDocumentV2ForWrite(buildDocument());
    expect("glow" in (base.sections[0]!.style as Record<string, unknown>)).toBe(false);
    const rerun = normalizePageDocumentV2ForWrite(cloneDocument(base));
    expect(rerun).toEqual(base);
  });
});

// TASK-533-01-L04 — block colSpan/rowSpan + section columnTemplate model at the
// WRITE boundary. Present-only, reject-unknown, fail-soft, joins the allowlist +
// additionalProperties:false JSON schema in lockstep.
describe("grid span + asymmetric column ratio write boundary (TASK-533-01)", () => {
  const docWithBlockStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.style =
      style as PageDocumentV2["sections"][number]["blocks"][number]["style"];
    return doc;
  };
  const docWithSectionStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      ...style,
    } as PageDocumentV2["sections"][number]["style"];
    return doc;
  };
  const blockStyle = (doc: PageDocumentV2): Record<string, unknown> =>
    (normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!.style ?? {}) as Record<
      string,
      unknown
    >;
  const sectionStyle = (doc: PageDocumentV2): Record<string, unknown> =>
    normalizePageDocumentV2ForWrite(doc).sections[0]!.style as unknown as Record<string, unknown>;

  test("block colSpan/rowSpan round-trip present-only + clamp + trunc", () => {
    expect(blockStyle(docWithBlockStyle({ rowSpan: 2 })).rowSpan).toBe(2);
    expect(blockStyle(docWithBlockStyle({ colSpan: 2 })).colSpan).toBe(2);
    // Clamp: out-of-range clamps to the PAGE_BLOCK_SPAN_CLAMP bounds {1,4}.
    expect(blockStyle(docWithBlockStyle({ rowSpan: 99 })).rowSpan).toBe(4); // clamp max
    expect(blockStyle(docWithBlockStyle({ colSpan: 0 })).colSpan).toBe(1); // clamp min
    // Trunc: a fractional span becomes an integer literal for `span N`.
    expect(blockStyle(docWithBlockStyle({ rowSpan: 2.9 })).rowSpan).toBe(2);
    // Present-only: unset ⇒ omitted.
    expect("colSpan" in blockStyle(docWithBlockStyle({}))).toBe(false);
    expect("rowSpan" in blockStyle(docWithBlockStyle({}))).toBe(false);
  });

  test("block span is byte-stable across a second normalize pass", () => {
    const first = normalizePageDocumentV2ForWrite(docWithBlockStyle({ colSpan: 2, rowSpan: 2 }));
    const second = normalizePageDocumentV2ForWrite(cloneDocument(first));
    expect(second.sections[0]!.blocks[0]!.style).toEqual(first.sections[0]!.blocks[0]!.style);
  });

  test("section columnTemplate round-trips a sanitizer-valid ratio, omits an invalid one", () => {
    expect(
      sectionStyle(docWithSectionStyle({ columnTemplate: "1.15fr .85fr" })).columnTemplate
    ).toBe("1.15fr .85fr");
    expect(sectionStyle(docWithSectionStyle({ columnTemplate: "1fr 1.2fr" })).columnTemplate).toBe(
      "1fr 1.2fr"
    );
    // Rejected by the strict sanitizer ⇒ OMITTED (present-only fail-soft, never raw).
    expect(
      "columnTemplate" in sectionStyle(docWithSectionStyle({ columnTemplate: "1fr;}x{}" }))
    ).toBe(false);
    expect(
      "columnTemplate" in sectionStyle(docWithSectionStyle({ columnTemplate: "url(evil)" }))
    ).toBe(false);
    // Present-only: unset ⇒ omitted.
    expect("columnTemplate" in sectionStyle(docWithSectionStyle({}))).toBe(false);
  });

  test("rejects unknown block/section style keys (fail-closed READ trap)", () => {
    expect(() => normalizePageDocumentV2ForWrite(docWithBlockStyle({ colSpanX: 2 }))).toThrow(
      "Unknown page document field: sections.0.blocks.0.style.colSpanX"
    );
    expect(() =>
      normalizePageDocumentV2ForWrite(docWithSectionStyle({ columnTemplateX: "1fr" }))
    ).toThrow("Unknown page document field: sections.0.style.columnTemplateX");
  });

  test("no-span / no-columnTemplate doc is byte-identical across two passes", () => {
    const base = normalizePageDocumentV2ForWrite(buildDocument());
    expect("colSpan" in (base.sections[0]!.blocks[0]!.style ?? {})).toBe(false);
    expect("columnTemplate" in (base.sections[0]!.style as Record<string, unknown>)).toBe(false);
    const rerun = normalizePageDocumentV2ForWrite(cloneDocument(base));
    expect(rerun).toEqual(base);
  });

  test(
    "colSpan/rowSpan/columnTemplate validate against the compiled pageDocumentV2JsonSchema",
    { timeout: 30_000 },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      const blockNormalized = normalizePageDocumentV2ForWrite(
        docWithBlockStyle({ colSpan: 2, rowSpan: 2 })
      );
      expect(validate(blockNormalized)).toBe(true);
      // Top-level section style is validated by the INLINED section schema (mirror b),
      // separate from the partial — omitting columnTemplate there would fail this.
      const sectionNormalized = normalizePageDocumentV2ForWrite(
        docWithSectionStyle({ columnTemplate: "1.15fr .85fr" })
      );
      expect(validate(sectionNormalized)).toBe(true);
      // A hand-injected out-of-range span fails the numeric schema.
      const badSpan = cloneDocument(blockNormalized);
      (badSpan.sections[0]!.blocks[0]!.style as Record<string, unknown>).rowSpan = 99;
      expect(validate(badSpan)).toBe(false);
    }
  );
});

// TASK-533-02-L04 — per-edge section border model at the WRITE boundary. Present-only
// whole-object omit, reject-unknown (edge + prop), fail-soft clamp/bad-color-drop,
// joins the section-style allowlist + additionalProperties:false JSON schema in lockstep.
describe("per-edge section border write boundary (TASK-533-02)", () => {
  const docWithSectionStyle = (style: Record<string, unknown>): PageDocumentV2 => {
    const doc = buildDocument();
    doc.sections[0]!.style = {
      ...doc.sections[0]!.style,
      ...style,
    } as PageDocumentV2["sections"][number]["style"];
    return doc;
  };
  const sectionStyle = (doc: PageDocumentV2): Record<string, unknown> =>
    normalizePageDocumentV2ForWrite(doc).sections[0]!.style as unknown as Record<string, unknown>;
  const border = (doc: PageDocumentV2): Record<string, unknown> | undefined =>
    sectionStyle(doc).border as Record<string, unknown> | undefined;

  test("section border round-trips per-edge present-only (border-block: no left/right)", () => {
    const b = border(
      docWithSectionStyle({
        border: {
          top: { color: "#ffffff33", width: 1 },
          bottom: { color: "#ffffff33", width: 1 },
        },
      })
    );
    // Present-only: `style` is OMITTED when unauthored (the render defaults it to
    // "solid" — 533-02-L02 — but the stored model stays byte-identical). color + width
    // round-trip.
    expect(b?.top).toEqual({ color: "#ffffff33", width: 1 });
    expect((b?.top as Record<string, unknown>).style).toBeUndefined();
    expect((b?.bottom as Record<string, unknown>).width).toBe(1);
    // border-block: only top+bottom authored ⇒ no left/right edges.
    expect("left" in (b ?? {})).toBe(false);
    expect("right" in (b ?? {})).toBe(false);
    // Present-only whole-object omit when unset.
    expect("border" in sectionStyle(docWithSectionStyle({}))).toBe(false);
  });

  test("four-edge border round-trips all edges", () => {
    const b = border(
      docWithSectionStyle({
        border: {
          top: { color: "#fff", width: 2, style: "dashed" },
          right: { color: "#000", width: 1 },
          bottom: { width: 3 },
          left: { color: "#0d9488", width: 1, style: "dotted" },
        },
      })
    );
    expect((b?.top as Record<string, unknown>).style).toBe("dashed");
    expect((b?.bottom as Record<string, unknown>).width).toBe(3);
    expect((b?.left as Record<string, unknown>).color).toBe("#0d9488");
  });

  test("clamps width and drops a bad color (fail-soft)", () => {
    // Width over-range clamps to the PAGE_SECTION_BORDER_WIDTH_CLAMP max {16}.
    const clamped = border(docWithSectionStyle({ border: { top: { width: 99 } } }));
    expect((clamped?.top as Record<string, unknown>).width).toBe(16);
    // A hostile color is sanitized away; the width keeps the edge alive.
    const bad = border(
      docWithSectionStyle({ border: { top: { color: "javascript:alert(1)", width: 1 } } })
    );
    expect((bad?.top as Record<string, unknown>).color).toBeUndefined();
    expect((bad?.top as Record<string, unknown>).width).toBe(1);
  });

  test("omits an all-empty border object entirely (present-only whole-object omit)", () => {
    expect("border" in sectionStyle(docWithSectionStyle({ border: { top: {}, bottom: {} } }))).toBe(
      false
    );
    // An edge with only a bad color / zero width contributes nothing ⇒ whole object omitted.
    expect(
      "border" in
        sectionStyle(docWithSectionStyle({ border: { top: { color: "url(x)", width: 0 } } }))
    ).toBe(false);
  });

  test("rejects unknown border edge / prop keys (fail-closed READ trap)", () => {
    expect(() =>
      normalizePageDocumentV2ForWrite(docWithSectionStyle({ border: { middle: { width: 1 } } }))
    ).toThrow("Unknown page document field: sections.0.style.border.middle");
    expect(() =>
      normalizePageDocumentV2ForWrite(docWithSectionStyle({ border: { top: { widthX: 1 } } }))
    ).toThrow("Unknown page document field: sections.0.style.border.top.widthX");
  });

  test("border is byte-stable across a second normalize pass", () => {
    const first = normalizePageDocumentV2ForWrite(
      docWithSectionStyle({ border: { top: { color: "#fff2", width: 1 } } })
    );
    const second = normalizePageDocumentV2ForWrite(cloneDocument(first));
    expect(second.sections[0]!.style).toEqual(first.sections[0]!.style);
  });

  test(
    "border validates against the compiled pageDocumentV2JsonSchema (both mirrors)",
    { timeout: 30_000 },
    () => {
      const ajv = new Ajv({ allErrors: true, strict: true });
      const validate = ajv.compile(pageDocumentV2JsonSchema);
      const normalized = normalizePageDocumentV2ForWrite(
        docWithSectionStyle({
          border: { top: { color: "#fff2", width: 1 }, bottom: { color: "#fff2", width: 1 } },
        })
      );
      expect(validate(normalized)).toBe(true);
      // A hand-injected unknown nested edge key fails additionalProperties:false too.
      const tampered = cloneDocument(normalized);
      (
        (tampered.sections[0]!.style as unknown as Record<string, Record<string, unknown>>).border!
          .top as Record<string, unknown>
      ).wobble = 1;
      expect(validate(tampered)).toBe(false);
    }
  );
});

// ── TASK-539-01-L01 ── strict responsive style contracts ─────────────────────
// Compile-time proofs: the responsive style types must reject every base-only
// structural key, must reject `anchor`, and must accept legal layer x/y/z.
import {
  isPageDocumentError,
  type PageBlockLayer,
  type PageBlockResponsiveLayerV2,
  type PageBlockResponsiveStyleV2,
  type PageBlockStyleV2,
  type PageSectionResponsiveStyleV2,
  type PageSectionStyleV2,
} from "../../../core/services/pages/pageDocumentV2";

const sectionForbiddenKeys = [
  "scrollEffect",
  "parallaxIntensity",
  "surfacePreset",
  "composition",
  "fullBleed",
  "noiseOverlay",
  "columnTemplate",
  "border",
] as const;

const blockForbiddenKeys = [
  "decoration",
  "tilt",
  "tiltGlare",
  "surfacePreset",
  "hoverEffect",
  "marquee",
  "composition",
  "revealDelay",
  "magnetic",
] as const;

describe("TASK-539 strict responsive style contracts", () => {
  // Compile-time proofs rely on @ts-expect-error: a directive is itself an
  // error when the next line compiles, so each rejected assignment is verified
  // at type-check time. `consume` keeps the bound value used at runtime so
  // `noUnusedLocals` never flags it.
  const consume = <T>(value: T): T => value;

  test("compile-time: responsive layer accepts x/y/z and rejects anchor literals", () => {
    const legal: PageBlockResponsiveLayerV2 = { x: 1, y: 2, z: 3 };
    expect(consume(legal)).toEqual({ x: 1, y: 2, z: 3 });
    // @ts-expect-error TASK-539: anchor is forbidden in a responsive layer literal
    const anchorLiteral: PageBlockResponsiveLayerV2 = { x: 1, anchor: "center" };
    consume(anchorLiteral);
    const variable: PageBlockLayer = { x: 1, y: 2, z: 3, anchor: "center" };
    // @ts-expect-error TASK-539: a variable typed as PageBlockLayer must not
    // satisfy the responsive layer type even when its runtime value is legal.
    const widened: PageBlockResponsiveLayerV2 = variable;
    consume(widened);
  });

  test("compile-time: every forbidden section style key is rejected", () => {
    const base: PageSectionStyleV2 = {} as PageSectionStyleV2;
    const responsive = base as PageSectionResponsiveStyleV2;
    expect(consume(responsive)).toBeDefined();
    // @ts-expect-error TASK-539: surfacePreset is base-only
    const wrong: PageSectionResponsiveStyleV2 = { surfacePreset: "dark" };
    consume(wrong);
    // @ts-expect-error TASK-539: border is base-only
    const wrong2: PageSectionResponsiveStyleV2 = { border: { top: { color: "#fff" } } };
    consume(wrong2);
  });

  test("compile-time: every forbidden block style key is rejected", () => {
    // @ts-expect-error TASK-539: decoration is base-only
    const wrong: PageBlockResponsiveStyleV2 = { decoration: { kind: "radiate" } };
    consume(wrong);
    // @ts-expect-error TASK-539: magnetic is base-only
    const wrong2: PageBlockResponsiveStyleV2 = { magnetic: true };
    consume(wrong2);
    const withLayer: PageBlockResponsiveStyleV2 = { layer: { x: 10 } };
    expect(consume(withLayer)).toEqual({ layer: { x: 10 } });
  });

  test("compile-time: legal responsive paint/typography/column values are accepted", () => {
    const section: PageSectionResponsiveStyleV2 = {
      background: "#0d9488",
      backgroundType: "color",
      accent: "#fff",
      radius: 8,
      shadow: "md",
    };
    expect(consume(section).shadow).toBe("md");
    const block: PageBlockResponsiveStyleV2 = {
      fontSize: "lg",
      fontWeight: "semibold",
      textTransform: "none",
      column: 2,
    };
    expect(consume(block).column).toBe(2);
    // A typed base variable must not satisfy the responsive style even when
    // its runtime shape only carries allowed keys.
    const base: PageBlockStyleV2 = {
      decoration: { kind: "radiate" },
    } as unknown as PageBlockStyleV2;
    // @ts-expect-error TASK-539: PageBlockStyleV2 is not PageBlockResponsiveStyleV2
    const invalid: PageBlockResponsiveStyleV2 = base;
    consume(invalid);
  });

  test("schema: responsive style definitions allow only the strict key sets", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(pageDocumentV2JsonSchema);
    const doc = buildDocument();
    const section = doc.sections[0]!;
    section.responsive = {
      tablet: { style: { background: "#111", radius: 6 } },
    } as PageDocumentV2["sections"][number]["responsive"];
    section.blocks[0]!.responsive = {
      tablet: { style: { fontSize: "lg", column: 3 } },
    } as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    expect(validate(doc)).toBe(true);
  });

  test("schema: forbidden keys and layer.anchor fail additionalProperties", () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile(pageDocumentV2JsonSchema);
    for (const key of sectionForbiddenKeys) {
      const doc = buildDocument();
      doc.sections[0]!.responsive = {
        tablet: { style: { [key]: key === "scrollEffect" ? "parallax" : true } },
      } as unknown as PageDocumentV2["sections"][number]["responsive"];
      expect(validate(doc), `section ${key}`).toBe(false);
    }
    for (const key of blockForbiddenKeys) {
      const doc = buildDocument();
      doc.sections[0]!.blocks[0]!.responsive = {
        tablet: { style: { [key]: key === "revealDelay" ? 100 : true } },
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
      expect(validate(doc), `block ${key}`).toBe(false);
    }
    const anchorDoc = buildDocument();
    anchorDoc.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { layer: { x: 1, anchor: "center" } } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    expect(validate(anchorDoc)).toBe(false);
  });

  test("write: every forbidden responsive key throws page_document_invalid at its exact path", () => {
    for (const key of sectionForbiddenKeys) {
      const doc = buildDocument();
      doc.sections[0]!.responsive = {
        tablet: { style: { [key]: key === "scrollEffect" ? "parallax" : true } },
      } as unknown as PageDocumentV2["sections"][number]["responsive"];
      const error = safeNormalizeError(doc);
      expect(isPageDocumentError(error, "page_document_invalid"), `section ${key}`).toBe(true);
      expect((error as PageDocumentError)?.path).toBe(`sections.0.responsive.tablet.style.${key}`);
    }
    for (const key of blockForbiddenKeys) {
      const doc = buildDocument();
      doc.sections[0]!.blocks[0]!.responsive = {
        tablet: { style: { [key]: key === "revealDelay" ? 100 : true } },
      } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
      const error = safeNormalizeError(doc);
      expect(isPageDocumentError(error, "page_document_invalid"), `block ${key}`).toBe(true);
      expect((error as PageDocumentError)?.path).toBe(
        `sections.0.blocks.0.responsive.tablet.style.${key}`
      );
    }
  });

  test("write: arbitrary responsive style key keeps page_document_unknown_field", () => {
    const doc = buildDocument();
    doc.sections[0]!.responsive = {
      tablet: { style: { wobble: true } },
    } as unknown as PageDocumentV2["sections"][number]["responsive"];
    const sectionError = safeNormalizeError(doc);
    expect(isPageDocumentError(sectionError, "page_document_unknown_field")).toBe(true);
    expect((sectionError as PageDocumentError)?.path).toBe(
      "sections.0.responsive.tablet.style.wobble"
    );
    const blockDoc = buildDocument();
    blockDoc.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { wobble: true } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const blockError = safeNormalizeError(blockDoc);
    expect(isPageDocumentError(blockError, "page_document_unknown_field")).toBe(true);
  });

  test("write: layer without a nonempty base layer throws at the exact layer path", () => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { layer: { x: 1, y: 2, z: 3 } } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const error = safeNormalizeError(doc);
    expect(isPageDocumentError(error, "page_document_invalid")).toBe(true);
    expect((error as PageDocumentError)?.path).toBe(
      "sections.0.blocks.0.responsive.tablet.style.layer"
    );
  });

  test("stored read drops forbidden keys and layer.anchor while keeping siblings", () => {
    const doc = buildDocument();
    doc.sections[0]!.responsive = {
      tablet: {
        style: { scrollEffect: "parallax", background: "#0d9488" },
        layout: { columns: 1 },
      },
    } as unknown as PageDocumentV2["sections"][number]["responsive"];
    doc.sections[0]!.blocks[0]!.responsive = {
      tablet: {
        style: {
          decoration: { kind: "radiate" },
          layer: { x: 1, anchor: "center" },
          fontSize: "lg",
        },
        props: { level: "h3" },
      },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const sectionResponsive = read.sections[0]!.responsive?.tablet;
    expect(sectionResponsive?.style).toEqual({ background: "#0d9488" });
    expect(sectionResponsive?.layout).toEqual({ columns: 1 });
    const blockResponsive = read.sections[0]!.blocks[0]!.responsive?.tablet;
    expect(blockResponsive?.style).toEqual({ fontSize: "lg" });
    expect(blockResponsive?.props).toEqual({ level: "h3" });
  });

  test("responsive layer without base drops on stored read with sibling preservation", () => {
    const doc = buildDocument();
    doc.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { layer: { x: 1, y: 2, z: 3 } }, visibility: { visible: false } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const read = normalizeStoredPageDocumentV2ForRead(doc);
    const blockResponsive = read.sections[0]!.blocks[0]!.responsive?.tablet;
    expect(blockResponsive?.style).toBeUndefined();
    expect(blockResponsive?.visibility).toEqual({ visible: false });
  });

  test("responsive textTransform:none survives; base textTransform:none is omitted", () => {
    const doc = buildDocument();
    const block = doc.sections[0]!.blocks[0]!;
    block.style = { ...(block.style as object), textTransform: "none" } as PageBlockStyleV2;
    const base = normalizePageDocumentV2ForWrite(doc).sections[0]!.blocks[0]!;
    expect("textTransform" in (base.style ?? {})).toBe(false);
    const overrideDoc = buildDocument();
    overrideDoc.sections[0]!.blocks[0]!.responsive = {
      tablet: { style: { textTransform: "none" } },
    } as unknown as PageDocumentV2["sections"][number]["blocks"][number]["responsive"];
    const withOverride = normalizePageDocumentV2ForWrite(overrideDoc).sections[0]!.blocks[0]!;
    expect(withOverride.responsive?.tablet?.style?.textTransform).toBe("none");
  });
});
