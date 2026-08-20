import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";

import {
  createPageBlockV2,
  createPageSectionV2,
  PAGE_DOCUMENT_SCHEMA_VERSION,
  type PageBlockV2,
  type PageDocumentV2,
  type PageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

import {
  PageBlockFrame,
  PageDocumentRender,
  PageSectionContent,
  PageSectionRender,
  toPageBlockRenderProps,
  toPageSectionBleedStyle,
  toPageSectionStyle,
} from "../../../core/services/pages/pageRendererV2";

import {
  clampGlowNum,
  composeGlowBoxShadow,
  mergeShadows,
} from "../../../core/services/pages/pageGlow";

import {
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
} from "../../../core/services/pages/pageDocumentV2";

const createDocument = (sections: PageSectionV2[]): PageDocumentV2 => ({
  schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
  breakpoints: ["desktop", "tablet", "mobile"],
  seo: {},
  settings: { template: "page-v2", showInNav: true },
  sections,
});

const countMarkup = (markup: string, needle: string) => markup.split(needle).length - 1;

type CompositionStyle = NonNullable<PageBlockV2["style"]>;

const composedBlock = (style: CompositionStyle, id = "blk-comp"): PageBlockV2 =>
  createPageBlockV2("heading", {
    id,
    props: { text: "Composed", level: "h2", align: "left" },
    style,
  });

// Render a heading block through the FRONT path (PageSectionContent ->
// renderPageBlockWithFrame) so the INNER effect wrapper (if any) is in the HTML.
const renderComposedBlocks = (blocks: PageBlockV2[]): string =>
  renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("hero", {
        id: "sec-comp",
        variant: "centered",
        blocks,
      })}
    />
  );

const frameAttrs = (block: PageBlockV2): Record<string, string | undefined> =>
  toPageBlockRenderProps(block).dataAttributes as Record<string, string | undefined>;
const frameVars = (block: PageBlockV2): Record<string, string | undefined> =>
  toPageBlockRenderProps(block).style as Record<string, string | undefined>;

test("decoration transform motions co-locate with the surface on the FRAME (524-01-L02)", () => {
  for (const motion of ["float", "drift", "pulse", "orbit"] as const) {
    // 524-01-L01 moved the anchor self-offset onto the free `translate:` property,
    // so a transform decoration now rides the SAME node as data-surface (the frame),
    // and its keyframe transform never clobbers the anchor offset — the surface
    // animates WITH the effect.
    const block = composedBlock({ decoration: { motion } });
    expect(frameAttrs(block)["data-deco"]).toBe(motion);
    // A plain decoration + surface card needs no inner effect wrapper anymore.
    expect(renderComposedBlocks([block])).toContain(`data-deco="${motion}"`);
  }
});

test("glass + float move together — data-surface and data-deco on the SAME node (524-01)", () => {
  // The primary owner-intent guarantee: the glass surface and its float decoration
  // are the SAME DOM node, so the surface animates WITH the effect (glass floats
  // with content). No inner effect wrapper is emitted for a plain surface+deco card.
  const block = composedBlock({ surfacePreset: "glass", decoration: { motion: "float" } });
  const attrs = frameAttrs(block);
  // toPageBlockRenderProps is the SINGLE feed for the [data-block-id] frame, so both
  // attrs landing here proves they are on the SAME node (co-located, not split).
  expect(attrs["data-surface"]).toBe("glass");
  expect(attrs["data-deco"]).toBe("float"); // co-located on the frame, not an inner wrapper
  const html = renderComposedBlocks([block]);
  // Both attributes appear inside ONE opening tag → literally the same element, so
  // the surface animates WITH the float effect. (No inner effect wrapper for a plain
  // surface+deco card.) Match a single tag carrying data-surface AND data-deco in
  // either order, with no intervening `<` (i.e. same element).
  const bothInOneTag =
    /<[^<>]*\bdata-surface="glass"[^<>]*\bdata-deco="float"[^<>]*>/.test(html) ||
    /<[^<>]*\bdata-deco="float"[^<>]*\bdata-surface="glass"[^<>]*>/.test(html);
  expect(bothInOneTag).toBe(true);
  // Timing vars ride that same frame node.
  const timed = composedBlock({
    surfacePreset: "glass",
    decoration: { motion: "float", delay: 1500, duration: 8000 },
  });
  const timedVars = frameVars(timed);
  expect(timedVars["--deco-delay"]).toBe("1500ms");
  expect(timedVars["--deco-duration"]).toBe("8000ms");
});

test('decoration "radiate" stays on the FRAME (box-shadow — no inner wrapper)', () => {
  const block = composedBlock({ decoration: { motion: "radiate" } });
  expect(frameAttrs(block)["data-deco"]).toBe("radiate");
});

test('decoration "none" resets — present-only, no data-deco anywhere', () => {
  const block = composedBlock({ decoration: { motion: "none" } });
  expect(frameAttrs(block)["data-deco"]).toBeUndefined();
  expect(renderComposedBlocks([block])).not.toContain("data-deco");
});

test("decoration delay/duration emit --deco-* on the FRAME node (524-01-L02)", () => {
  // 524-01-L02 empties INNER_VAR_KEYS, so the decoration timing vars seed the frame
  // element that now carries data-deco (the keyframe binding reads them there).
  const block = composedBlock({ decoration: { motion: "float", delay: 900, duration: 8000 } });
  expect(frameVars(block)["--deco-delay"]).toBe("900ms");
  expect(frameVars(block)["--deco-duration"]).toBe("8000ms");
  const html = renderComposedBlocks([block]);
  expect(html).toContain("--deco-delay:900ms");
  expect(html).toContain("--deco-duration:8000ms");
});

test("two decorated siblings with different delay stagger (distinct --deco-delay)", () => {
  const html = renderComposedBlocks([
    composedBlock({ decoration: { motion: "float", delay: 900 } }, "blk-a"),
    composedBlock({ decoration: { motion: "float", delay: 1500 } }, "blk-b"),
  ]);
  expect(html).toContain("--deco-delay:900ms");
  expect(html).toContain("--deco-delay:1500ms");
});

test("unstyled block → toPageBlockRenderProps byte-identical, no inner wrapper", () => {
  const block = createPageBlockV2("heading", {
    id: "blk-plain",
    props: { text: "Plain", level: "h2", align: "left" },
  });
  const rp = toPageBlockRenderProps(block);
  // Exactly the two pre-522 data attributes — no composition attrs leaked.
  expect(Object.keys(rp.dataAttributes).sort()).toEqual(["data-block-id", "data-page-block"]);
  const styleKeys = Object.keys(rp.style as Record<string, unknown>);
  expect(
    styleKeys.some(
      (k) => k.startsWith("--layer") || k.startsWith("--deco") || k.startsWith("--surface")
    )
  ).toBe(false);
  const html = renderComposedBlocks([block]);
  expect(html).not.toContain("data-deco");
  expect(html).not.toContain("data-surface");
  expect(html).not.toContain("data-tilt-parent");
  expect(html).not.toContain("cx-glare");
});

test("surface preset rides the FRAME on the shared feed (both render paths)", () => {
  // toPageBlockRenderProps is the SINGLE feed for the front PageBlockFrame AND
  // the canvas renderBlockFrame callback, so asserting it covers both paths.
  const glass = composedBlock({ surfacePreset: "glass" });
  expect(frameAttrs(glass)["data-surface"]).toBe("glass");
  const html = renderComposedBlocks([glass]);
  expect(html).toContain('data-surface="glass"');
});

test("TASK-528 tilt on any block → frame data-block-tilt + ancestor data-tilt-parent + glare child", () => {
  const block = composedBlock({ tilt: "subtle", tiltGlare: true });
  // TASK-528 whole-card tilt: the tilt transform rides the FRAME (co-located with
  // data-surface); the CSS perspective moves to an ANCESTOR wrapper (not the frame).
  expect(frameAttrs(block)["data-block-tilt"]).toBe("subtle");
  expect(frameAttrs(block)["data-tilt-parent"]).toBeUndefined();
  const html = renderComposedBlocks([block]);
  expect(html).toContain('data-block-tilt="subtle"');
  expect(html).toContain("data-tilt-parent");
  expect(html).toContain("cx-glare");
});

test("TASK-528 whole card tilts — glass + tilt land on the SAME node (data-block-tilt === data-surface node)", () => {
  // The owner bug: glass CARD stayed flat while only inner content tilted, because
  // data-surface was on the frame but data-block-tilt sat on an inner child. FIX:
  // both must be co-located on the FRAME so the entire glass card tilts on hover.
  const block = composedBlock({ surfacePreset: "glass", tilt: "strong" });
  const attrs = frameAttrs(block);
  expect(attrs["data-surface"]).toBe("glass");
  expect(attrs["data-block-tilt"]).toBe("strong");
  // Perspective on an ancestor wrapper, NOT the transformed frame node.
  expect(attrs["data-tilt-parent"]).toBeUndefined();
  // HTML sanity: the SAME element carries both attrs (the frame element opens with
  // data-surface="glass" ... data-block-tilt="strong" before the next `>`).
  const html = renderComposedBlocks([block]);
  expect(html).toMatch(/data-surface="glass"[^>]*data-block-tilt="strong"/);
  expect(html).toContain("data-tilt-parent");
});

test("surfacePreset ambient-orbs emits two aria-hidden .cx-orb spans in the inner wrapper", () => {
  const block = composedBlock({ surfacePreset: "ambient-orbs" });
  expect(frameAttrs(block)["data-surface"]).toBe("ambient-orbs");
  const html = renderComposedBlocks([block]);
  expect(html).toContain("cx-orb-a");
  expect(html).toContain("cx-orb-b");
  // Orbs drift; both are aria-hidden decorative spans.
  expect(html.match(/data-deco="drift"/g)?.length).toBe(2);
});

test("glass/radial-glow surfaces self-paint on the frame — NO orb spans", () => {
  for (const surfacePreset of ["glass", "radial-glow"] as const) {
    const html = renderComposedBlocks([composedBlock({ surfacePreset })]);
    expect(html).not.toContain("cx-orb");
  }
});

test("finding 4 — anchored layered child co-locates layer + deco on the FRAME (524-01)", () => {
  const block = composedBlock({
    decoration: { motion: "float" },
    layer: { x: 10, y: 20, anchor: "top-right" },
  });
  const attrs = frameAttrs(block);
  const vars = frameVars(block);
  // Layer positioning + anchor ride the real [data-block-id] frame so the
  // 522-05-L02 per-device --layer-* override reaches them. The anchor self-offset
  // rides the free `translate:` property (524-01-L01), so the float decoration
  // co-locates on the SAME frame node — its transform never clobbers the offset.
  expect(attrs["data-layer"]).toBe("");
  expect(attrs["data-layer-anchor"]).toBe("top-right");
  expect(vars["--layer-x"]).toBe("10%");
  expect(vars["--layer-y"]).toBe("20%");
  // The float decoration is now on the frame (same node as layer); no tilt perspective.
  expect(attrs["data-deco"]).toBe("float");
  expect(attrs["data-tilt-parent"]).toBeUndefined();
  expect(renderComposedBlocks([block])).toContain(`data-deco="float"`);
});

test("finding 4 — anchor + hover lift co-locate layer + hover on the FRAME (524-01)", () => {
  const block = composedBlock({
    hoverEffect: "lift",
    layer: { x: 5, y: 5, anchor: "bottom-right" },
  });
  const attrs = frameAttrs(block);
  expect(attrs["data-layer-anchor"]).toBe("bottom-right");
  expect(frameVars(block)["--layer-x"]).toBe("5%");
  // Transform hover now rides the frame (same node as the anchor `translate:` offset).
  expect(attrs["data-hover"]).toBe("lift");
  expect(renderComposedBlocks([block])).toContain('data-hover="lift"');
});

test("TASK-535 finding — tilt + layer: layer PLACEMENT hoists to the perspective WRAPPER, tilt stays on the frame", () => {
  // Regression for the tilt+layer containing-block bug: a non-`none` `perspective`
  // on the [data-tilt-parent] wrapper establishes a CONTAINING BLOCK for absolute
  // descendants. With the layer placement on the FRAME (pre-535), the frame went
  // `position:absolute` but resolved its --layer-x/y offsets against the WRAPPER
  // instead of the `.cx-layered-canvas`, and the wrapper stayed at its in-flow
  // origin → the layered chip landed at the wrong place. FIX: the LAYER PLACEMENT
  // (data-layer + data-layer-anchor + --layer-x/y/z) rides the WRAPPER so the
  // WRAPPER is the absolutely positioned layered child (offsets resolve against the
  // canvas); the tilt transform stays on the inner frame.
  const block = composedBlock({
    tilt: "subtle",
    layer: { x: 8, y: 12, z: 3, anchor: "bottom-right" },
  });
  // The FRAME (the real [data-block-id] node) no longer carries the layer placement —
  // it must NOT go `position:absolute` and escape the wrapper.
  const attrs = frameAttrs(block);
  const vars = frameVars(block);
  expect(attrs["data-layer"]).toBeUndefined();
  expect(attrs["data-layer-anchor"]).toBeUndefined();
  expect(vars["--layer-x"]).toBeUndefined();
  expect(vars["--layer-y"]).toBeUndefined();
  expect(vars["--layer-z"]).toBeUndefined();
  // Tilt rides the frame (whole-card tilt, TASK-528); perspective on the ancestor.
  expect(attrs["data-block-tilt"]).toBe("subtle");
  expect(attrs["data-tilt-parent"]).toBeUndefined();

  // Structural: the [data-tilt-parent] wrapper IS the absolutely-positioned layered
  // child — it carries data-layer + data-layer-anchor + the base --layer-* the
  // `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`
  // CSS consumes, and it WRAPS the tilt frame (wrapper open tag precedes the frame's
  // data-block-tilt, with no other block frame between them).
  const html = renderComposedBlocks([block]);
  const wrapperMatch = html.match(/<div data-tilt-parent[^>]*>/);
  expect(wrapperMatch).not.toBeNull();
  const wrapperTag = wrapperMatch?.[0] ?? "";
  expect(wrapperTag).toContain('data-layer=""');
  expect(wrapperTag).toContain('data-layer-anchor="bottom-right"');
  expect(wrapperTag).toContain("--layer-x:8%");
  expect(wrapperTag).toContain("--layer-y:12%");
  expect(wrapperTag).toContain("--layer-z:3");
  expect(wrapperTag).toContain("perspective:1200px");
  // TASK-535 per-device layer: the wrapper carries the block id as
  // `data-tilt-parent-for` (present ONLY for this hoisted tilt+layer case) so
  // pageResponsiveCss can retarget the per-device --layer-* override at the wrapper
  // (custom props inherit downward; a frame-scoped override can never reach it).
  expect(wrapperTag).toContain('data-tilt-parent-for="blk-comp"');
  // The wrapper is an ANCESTOR of the tilt frame (wrapper `>` comes before the
  // frame's data-block-tilt in document order).
  const wrapperOpenIdx = html.indexOf(wrapperTag);
  const tiltIdx = html.indexOf('data-block-tilt="subtle"');
  expect(wrapperOpenIdx).toBeGreaterThanOrEqual(0);
  expect(tiltIdx).toBeGreaterThan(wrapperOpenIdx);
  // The layer placement is NOT duplicated onto the frame node itself.
  expect(html).not.toMatch(/data-block-tilt="subtle"[^>]*data-layer=/);
});

test("finding 4 — radiate + anchor stays wholly on the frame (no inner wrapper)", () => {
  const block = composedBlock({
    decoration: { motion: "radiate" },
    layer: { x: 3, y: 4, anchor: "top-right" },
  });
  const attrs = frameAttrs(block);
  expect(attrs["data-deco"]).toBe("radiate");
  expect(attrs["data-layer-anchor"]).toBe("top-right");
});

test("finding 4 — layer-only block (no transform effect) keeps everything on the frame", () => {
  const block = composedBlock({ layer: { x: 1, y: 2, anchor: "center" } });
  const attrs = frameAttrs(block);
  expect(attrs["data-layer"]).toBe("");
  expect(attrs["data-layer-anchor"]).toBe("center");
  // No effect → no inner wrapper markers.
  const html = renderComposedBlocks([block]);
  expect(html).not.toContain("data-deco");
  expect(html).not.toContain("data-block-tilt");
  // TASK-535: no tilt ⇒ no perspective wrapper, so no per-device layer hook either
  // (layer-only stays byte-identical to pre-535 — the responsive override rides the
  // frame [data-block-id], not a wrapper).
  expect(html).not.toContain("data-tilt-parent-for");
});

// ── TASK-522-04-L02 — block tilt render-shape (controls in 522-04-L01) ──
test('tilt "strong" → data-block-tilt="strong" on the FRAME, perspective on ancestor (528)', () => {
  const block = composedBlock({ tilt: "strong" });
  // TASK-528 whole-card tilt: the runtime-rotated node is the FRAME; perspective on ancestor.
  expect(frameAttrs(block)["data-block-tilt"]).toBe("strong");
  expect(frameAttrs(block)["data-tilt-parent"]).toBeUndefined();
  const html = renderComposedBlocks([block]);
  expect(html).toContain('data-block-tilt="strong"');
  expect(html).toContain("data-tilt-parent");
  // No glare requested → no sheen child.
  expect(html).not.toContain("cx-glare");
});

test('tilt "none" resets — present-only, byte-identical (no perspective/inner wrapper)', () => {
  const none = composedBlock({ tilt: "none" });
  expect(frameAttrs(none)["data-tilt-parent"]).toBeUndefined();
  expect(renderComposedBlocks([none])).not.toContain("data-block-tilt");

  // Unset tilt is byte-identical to a plain block: no tilt attrs at all.
  const plain = createPageBlockV2("heading", {
    id: "blk-comp",
    props: { text: "Composed", level: "h2", align: "left" },
  });
  const html = renderComposedBlocks([plain]);
  expect(html).not.toContain("data-tilt-parent");
  expect(html).not.toContain("data-block-tilt");
  expect(html).not.toContain("cx-glare");
});

// ── TASK-522-05-L05 — section surface, page-root emit, layered canvas, ──────────
// ── glass/hover, marquee ───────────────────────────────────────────────────────

const surfaceSection = (style: Partial<PageSectionV2["style"]>) =>
  createPageSectionV2("hero", {
    id: "sec-surface",
    variant: "centered",
    style: {
      background: "#ffffff",
      backgroundType: "color",
      backgroundImage: null,
      accent: "#0d9488",
      radius: 0,
      shadow: "none",
      ...style,
    },
    blocks: [
      createPageBlockV2("heading", {
        id: "blk-surf-h",
        props: { text: "Surface", level: "h1", align: "center" },
      }),
    ],
  });

test("section surface preset stamps data-surface (522-05-L01)", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ surfacePreset: "glass" })} />
  );
  expect(html).toContain('data-surface="glass"');
});

test("section ambient-orbs preset emits two decorative orb spans", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ surfacePreset: "ambient-orbs" })} />
  );
  expect(html).toContain('data-surface="ambient-orbs"');
  expect(html).toContain("cx-orb-a");
  expect(html).toContain("cx-orb-b");
  expect(countMarkup(html, 'aria-hidden="true" data-deco="drift"')).toBe(2);
});

test("section composition:layered stamps data-composition", () => {
  const html = renderToStaticMarkup(
    <PageSectionRender section={surfaceSection({ composition: "layered" })} />
  );
  expect(html).toContain('data-composition="layered"');
});

test("page-root composition emit is present-only + single runtime script (522-05-L01)", () => {
  // A doc that authors a mouse-tilt → ONE composition <style> + ONE runtime
  // <script> (the 522 tilt binding reuses 521-05's single emit, not a 2nd tag).
  const tiltDoc = createDocument([
    createPageSectionV2("hero", {
      id: "sec-tilt-doc",
      variant: "centered",
      blocks: [composedBlock({ tilt: "strong" }, "blk-tilt-doc")],
    }),
  ]);
  const tiltHtml = renderToStaticMarkup(<PageDocumentRender document={tiltDoc} />);
  expect(countMarkup(tiltHtml, "data-page-composition-css")).toBe(1);
  expect(countMarkup(tiltHtml, "data-coderso-runtime-script=")).toBe(1);

  // A doc that authors a NON-tilt composition effect (surface) → composition
  // <style> but NO runtime <script> (surfaces are static CSS).
  const surfaceDoc = createDocument([surfaceSection({ surfacePreset: "glass" })]);
  const surfaceHtml = renderToStaticMarkup(<PageDocumentRender document={surfaceDoc} />);
  expect(countMarkup(surfaceHtml, "data-page-composition-css")).toBe(1);
  expect(surfaceHtml).not.toContain("data-coderso-runtime-script");

  // A NO-effect doc → neither the composition <style> nor a runtime <script>
  // (present-only / byte-identical to post-521).
  const plainDoc = createDocument([
    createPageSectionV2("hero", {
      id: "sec-plain-doc",
      variant: "centered",
      blocks: [
        createPageBlockV2("heading", {
          id: "blk-plain-doc",
          props: { text: "Plain", level: "h1", align: "center" },
        }),
      ],
    }),
  ]);
  const plainHtml = renderToStaticMarkup(<PageDocumentRender document={plainDoc} />);
  expect(plainHtml).not.toContain("data-page-composition-css");
  expect(plainHtml).not.toContain("data-coderso-runtime-script");
});

test("layered layout block places children absolutely via data-layer + --layer-* (522-05-L02)", () => {
  const container = createPageBlockV2("container", {
    id: "blk-layered",
    style: { composition: "layered" },
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-l1",
          props: { text: "A", level: "h2", align: "left" },
          style: { layer: { x: 10, y: 20, z: 3, anchor: "top-left" } },
        }),
        createPageBlockV2("text", {
          id: "blk-l2",
          props: { text: "B", format: "plain", align: "left" },
          style: { layer: { x: 40, y: 60, z: 5 } },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-l", blocks: [container] })}
    />
  );
  // Parent frame is the positioning context; content is the pass-through canvas.
  expect(html).toContain('data-composition="layered"');
  expect(html).toContain("cx-layered-canvas");
  expect(html).toContain("cx-layered-slot");
  // Each child frame carries data-layer + the --layer-* custom props.
  expect(html).toContain('data-block-id="blk-l1"');
  expect(html).toContain("--layer-x:10%");
  expect(html).toContain("--layer-y:20%");
  expect(html).toContain("--layer-z:3");
  expect(html).toContain('data-layer-anchor="top-left"');
  expect(html).toContain("--layer-x:40%");
});

test("TASK-535 — a tilt+layer child inside a layered canvas positions the WRAPPER, not the tilt frame", () => {
  // End-to-end: a layered-canvas child that authors BOTH layer AND tilt. The
  // `[data-composition="layered"] [data-layer]{position:absolute;left:var(--layer-x)…}`
  // rule must land on the [data-tilt-parent] WRAPPER (so it positions against the
  // .cx-layered-canvas), NOT on the inner tilt frame (whose `perspective` ancestor
  // would otherwise steal its containing block and pin it to the wrapper's in-flow
  // origin). The tilt transform + data-block-id stay on the inner frame.
  const container = createPageBlockV2("container", {
    id: "blk-layered-tilt",
    style: { composition: "layered" },
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-lt1",
          props: { text: "Tilted chip", level: "h2", align: "left" },
          style: { layer: { x: 25, y: 35, z: 4, anchor: "center" }, tilt: "strong" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-lt", blocks: [container] })}
    />
  );
  expect(html).toContain("cx-layered-canvas");
  // The tilt wrapper is the layered positioned child: it carries data-layer +
  // anchor + --layer-* + perspective, and it opens BEFORE the tilt frame it wraps.
  const wrapperTag = html.match(/<div data-tilt-parent[^>]*>/)?.[0] ?? "";
  expect(wrapperTag).toContain('data-layer=""');
  expect(wrapperTag).toContain('data-layer-anchor="center"');
  expect(wrapperTag).toContain("--layer-x:25%");
  expect(wrapperTag).toContain("--layer-y:35%");
  expect(wrapperTag).toContain("--layer-z:4");
  // The real block frame carries the tilt + its id — but NOT the layer placement,
  // so it never goes absolute and escapes the wrapper.
  expect(html).toMatch(
    /data-block-id="blk-lt1"[^>]*data-block-tilt="strong"|data-block-tilt="strong"[^>]*data-block-id="blk-lt1"/
  );
  expect(html).not.toMatch(/data-block-id="blk-lt1"[^>]*data-layer=/);
  // Wrapper wraps the frame (document order: wrapper `>` precedes the frame id).
  expect(html.indexOf(wrapperTag)).toBeLessThan(html.indexOf('data-block-id="blk-lt1"'));
});

test("flow (unset composition) layout block stays byte-identical (no layered canvas)", () => {
  const flow = createPageBlockV2("container", {
    id: "blk-flow",
    slots: {
      children: [
        createPageBlockV2("heading", {
          id: "blk-fc",
          props: { text: "X", level: "h2", align: "left" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent section={createPageSectionV2("content", { id: "sec-f", blocks: [flow] })} />
  );
  expect(html).not.toContain("cx-layered-canvas");
  expect(html).not.toContain('data-composition="layered"');
});

test("block glass/hover presets stamp data-surface / data-hover (522-05-L03)", () => {
  // Surface preset stays on the FRAME (static, non-transform).
  expect(frameAttrs(composedBlock({ surfacePreset: "glass" }))["data-surface"]).toBe("glass");
  expect(renderComposedBlocks([composedBlock({ surfacePreset: "glass" })])).toContain(
    'data-surface="glass"'
  );
  // lift-glow is a transform hover → after 524-01 co-location it rides the SAME
  // node as the surface (the frame), so the front render carries data-hover on the
  // frame (its transform composes with the anchor `translate:` offset).
  expect(frameAttrs(composedBlock({ hoverEffect: "lift-glow" }))["data-hover"]).toBe("lift-glow");
  expect(renderComposedBlocks([composedBlock({ hoverEffect: "lift-glow" })])).toContain(
    'data-hover="lift-glow"'
  );
});

const marqueeGroup = (marquee: NonNullable<NonNullable<PageBlockV2["style"]>["marquee"]>) =>
  createPageBlockV2("group", {
    id: "blk-marquee",
    props: { direction: "row", wrap: false, gap: 16 },
    style: { marquee },
    slots: {
      children: [
        createPageBlockV2("text", {
          id: "blk-m1",
          props: { text: "One", format: "plain", align: "left" },
        }),
        createPageBlockV2("text", {
          id: "blk-m2",
          props: { text: "Two", format: "plain", align: "left" },
        }),
      ],
    },
  });

test("marquee group renders a viewport + two tracks with frame data-marquee (522-05-L04)", () => {
  const group = marqueeGroup({ speed: 18, direction: "right", seamless: true });
  // The FRAME carries the marquee attrs/vars (via the 522-03 resolver).
  expect(frameAttrs(group)["data-marquee"]).toBe("");
  expect(frameAttrs(group)["data-marquee-dir"]).toBe("right");
  expect(frameVars(group)["--marquee-speed"]).toBe("18s");
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mq", blocks: [group] })}
    />
  );
  expect(html).toContain("cx-marquee-viewport");
  // seamless → two tracks (one aria-hidden).
  expect(countMarkup(html, "cx-marquee-track")).toBe(2);
  expect(countMarkup(html, 'aria-hidden="true"')).toBeGreaterThanOrEqual(1);
});

test("no marquee → byte-identical group flow (no viewport)", () => {
  const group = createPageBlockV2("group", {
    id: "blk-plain-group",
    props: { direction: "row", wrap: false, gap: 16 },
    slots: {
      children: [
        createPageBlockV2("text", {
          id: "blk-pg1",
          props: { text: "Flow", format: "plain", align: "left" },
        }),
      ],
    },
  });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-pg", blocks: [group] })}
    />
  );
  expect(html).not.toContain("cx-marquee-viewport");
  expect(html).not.toContain("data-marquee");
});

test("seamless marquee copy carries NO data-block-id in canvas mode (finding 3)", () => {
  const group = marqueeGroup({ speed: 18, direction: "left", seamless: true });
  const html = renderToStaticMarkup(
    <PageSectionContent
      section={createPageSectionV2("content", { id: "sec-mc", blocks: [group] })}
      // Mimic the builder canvas: the selection frame emits data-block-id.
      renderBlockFrame={({ content, renderProps }) => (
        <div {...renderProps.dataAttributes}>{content}</div>
      )}
    />
  );
  // Each item's data-block-id matches EXACTLY one DOM node — the primary track's
  // framed item — never the aria-hidden decorative copy (no duplicate targets).
  expect(countMarkup(html, 'data-block-id="blk-m1"')).toBe(1);
  expect(countMarkup(html, 'data-block-id="blk-m2"')).toBe(1);
  // Two tracks still render (the copy is present, just frame-less).
  expect(countMarkup(html, "cx-marquee-track")).toBe(2);
});

// ── TASK-531-01-L02/L04 — glow render + section-gradient (single + multi-layer) ──
// The SSR inline-style boundary (React-escaped CSSProperties). Covers the pure
// glow composer, block/section glow merge, section gradient parity with the
// already-wired block gradient, multi-layer paint on BOTH targets, and byte-identity.
describe("glow + multi-layer/section gradient render (TASK-531-01-L02)", () => {
  const CTA_CARD =
    "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)";

  test("composeGlowBoxShadow emits a fixed four-part template from sanitized inputs", () => {
    // The reference glow: 0 18px 45px rgba(142,232,255,.22) — matches criterion #4.
    expect(composeGlowBoxShadow({ color: "#8ee8ff", blur: 45, y: 18 })).toBe(
      "0px 18px 45px 0px #8ee8ff"
    );
    expect(composeGlowBoxShadow({ color: "rgba(142,232,255,.22)", blur: 45, y: 18 })).toBe(
      "0px 18px 45px 0px rgba(142,232,255,.22)"
    );
    // Defaults: blur ⇒ 24, spread/x/y ⇒ 0 when unset.
    expect(composeGlowBoxShadow({ color: "#0d9488" })).toBe("0px 0px 24px 0px #0d9488");
    // Negative offsets/spread survive (clamped, not stripped).
    expect(composeGlowBoxShadow({ color: "#0d9488", x: -12, y: -8, spread: -10 })).toBe(
      "-12px -8px 24px -10px #0d9488"
    );
  });

  test("composeGlowBoxShadow re-sanitizes the color at render (fail-soft to undefined)", () => {
    // Defence in depth: a bad color composes to NOTHING (no glow), never a raw string.
    expect(composeGlowBoxShadow({ color: "expression(alert(1))" })).toBeUndefined();
    expect(composeGlowBoxShadow({ color: "url(//evil/x)" })).toBeUndefined();
    expect(composeGlowBoxShadow(undefined)).toBeUndefined();
  });

  test("composeGlowBoxShadow clamps out-of-range numbers into the 531 bounds", () => {
    expect(
      composeGlowBoxShadow({ color: "#000", blur: 9999, spread: 9999, x: 9999, y: -9999 })
    ).toBe(`80px -80px 120px 80px #000`);
    // clampGlowNum truncates + clamps a possibly-undefined value (default 0).
    expect(clampGlowNum(undefined, PAGE_GLOW_BLUR_CLAMP)).toBe(0);
    expect(clampGlowNum(45.9, PAGE_GLOW_BLUR_CLAMP)).toBe(45);
    expect(clampGlowNum(9999, PAGE_GLOW_BLUR_CLAMP)).toBe(120);
    expect(clampGlowNum(-9999, PAGE_GLOW_OFFSET_CLAMP)).toBe(-80);
    expect(clampGlowNum(-9999, PAGE_GLOW_SPREAD_CLAMP)).toBe(-40);
  });

  test("mergeShadows comma-joins the enum shadow and the glow (glow AUGMENTS, does not replace)", () => {
    expect(mergeShadows("0 14px 40px rgba(15, 23, 42, 0.12)", "0px 18px 45px 0px #8ee8ff")).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 18px 45px 0px #8ee8ff"
    );
    expect(mergeShadows(undefined, "0px 0px 24px 0px #8ee8ff")).toBe("0px 0px 24px 0px #8ee8ff");
    expect(mergeShadows("0 14px 40px rgba(15, 23, 42, 0.12)", undefined)).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12)"
    );
    expect(mergeShadows(undefined, undefined)).toBeUndefined();
  });

  test("a block with glow ONLY emits the composed box-shadow on its render props", () => {
    const block = createPageBlockV2("heading", {
      id: "blk-glow-only",
      props: { text: "Glow", level: "h2", align: "left" },
      style: { glow: { color: "rgba(142,232,255,.22)", blur: 45, y: 18 } } as never,
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0px 18px 45px 0px rgba(142,232,255,.22)"
    );
  });

  test("a block with BOTH enum shadow AND glow emits a TWO-shadow box-shadow (enum first)", () => {
    const block = createPageBlockV2("heading", {
      id: "blk-glow-shadow",
      props: { text: "Glow", level: "h2", align: "left" },
      style: { shadow: "md", glow: { color: "#8ee8ff", blur: 28 } } as never,
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff"
    );
  });

  test("a section with glow merges it into the section box AND the bleed box", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-glow",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "md",
        glow: { color: "#8ee8ff", blur: 28 },
      } as never,
    });
    expect(toPageSectionStyle(section).boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12), 0px 0px 28px 0px #8ee8ff"
    );
    // Full-bleed section: the glow bleeds edge-to-edge on the bleed box too.
    const fullBleed = createPageSectionV2("hero", {
      id: "sec-glow-bleed",
      variant: "full-width",
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
        glow: { color: "#8ee8ff", blur: 28 },
      } as never,
    });
    expect(toPageSectionBleedStyle(fullBleed)?.boxShadow).toBe("0px 0px 28px 0px #8ee8ff");
  });

  test("SECTION backgroundType:gradient paints a single-layer gradient via backgroundImage", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-single",
      style: {
        background: "linear-gradient(145deg,#0f1720,#1b2733)",
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBe(
      "linear-gradient(145deg,#0f1720,#1b2733)"
    );
    // No flat background-color when the type is gradient.
    expect(toPageSectionStyle(section).backgroundColor).toBeUndefined();
  });

  test("SECTION backgroundType:gradient paints the reference .cta-card MULTI-LAYER value (relaxed re-gate)", () => {
    // This is the render-side gate for the fix: a PRE-relax toGradientBackground
    // would return undefined here (single-layer re-check drops the comma-joined value).
    // Non-full-bleed: the gradient paints on the content box (toPageSectionStyle).
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-multi",
      variant: "default",
      style: {
        background: CTA_CARD,
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBe(CTA_CARD);
    // No bleed box for a non-full-bleed section.
    expect(toPageSectionBleedStyle(section)).toBeUndefined();

    // Full-bleed: the paint moves to the bleed box (525 model — content stays capped),
    // so the multi-layer gradient bleeds edge-to-edge there.
    const fullBleed = createPageSectionV2("hero", {
      id: "sec-gradient-multi-bleed",
      variant: "full-width",
      style: {
        background: CTA_CARD,
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionBleedStyle(fullBleed)?.backgroundImage).toBe(CTA_CARD);
  });

  test("SECTION gradient with an invalid value falls back cleanly (no paint, no throw)", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-gradient-bad",
      style: {
        background: "linear-gradient(#fff,#000), url(//evil/beacon)",
        backgroundType: "gradient",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(section).backgroundImage).toBeUndefined();
  });

  test("switching a SECTION back to color/image restores flat/image paint (no gradient)", () => {
    const color = createPageSectionV2("hero", {
      id: "sec-flat",
      style: {
        background: "#101828",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "none",
      } as never,
    });
    expect(toPageSectionStyle(color).backgroundColor).toBe("#101828");
    expect(toPageSectionStyle(color).backgroundImage).toBeUndefined();
  });

  test("BLOCK gradient path still emits single-layer AND now paints the MULTI-LAYER value", () => {
    // The block :738 call site is UNCHANGED; the shared toGradientBackground relax
    // reaches the block target too. Single-layer regression guard first:
    const single = createPageBlockV2("button", {
      id: "blk-grad-single",
      props: { label: "Go", href: "/go" },
      style: { background: "linear-gradient(90deg,#000,#fff)", backgroundType: "gradient" },
    });
    const singleSection = createPageSectionV2("cta", { id: "sec-blk-single", blocks: [single] });
    const singleHtml = renderToStaticMarkup(<PageSectionContent section={singleSection} />);
    expect(singleHtml).toContain("background-image:linear-gradient(90deg,#000,#fff)");

    // Multi-layer on a card block (heading frame carries the visual style):
    const multi = createPageBlockV2("heading", {
      id: "blk-grad-multi",
      props: { text: "Card", level: "h2", align: "left" },
      style: { background: CTA_CARD, backgroundType: "gradient" } as never,
    });
    expect(toPageBlockRenderProps(multi).style.backgroundImage).toBe(CTA_CARD);
    // And it survives to the SSR markup (React-escaped into the style attribute).
    const multiSection = createPageSectionV2("content", { id: "sec-blk-multi", blocks: [multi] });
    const multiHtml = renderToStaticMarkup(<PageSectionContent section={multiSection} />);
    expect(multiHtml).toContain("background-image:radial-gradient(circle at 82% 10%");
  });

  test("no-glow / no-gradient section + block render byte-identical to the pre-531 style shape", () => {
    const section = createPageSectionV2("hero", {
      id: "sec-noeffect",
      style: {
        background: "#eef2ff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 12,
        shadow: "sm",
      },
    });
    const style = toPageSectionStyle(section);
    // The enum shadow alone (no glow) is UNCHANGED — no trailing comma-joined glow.
    expect(style.boxShadow).toBe("0 6px 20px rgba(15, 23, 42, 0.08)");
    expect(style.backgroundColor).toBe("#eef2ff");
    const block = createPageBlockV2("heading", {
      id: "blk-noeffect",
      props: { text: "Plain", level: "h2", align: "left" },
      style: { shadow: "md" },
    });
    expect(toPageBlockRenderProps(block).style.boxShadow).toBe(
      "0 14px 40px rgba(15, 23, 42, 0.12)"
    );
  });
});

// ── TASK-532 typography fidelity (Bundle B) — behavioral render ──
