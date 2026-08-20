import type { CSSProperties, ReactNode } from "react";

import {
  PAGE_PARALLAX_INTENSITY_CLAMP,
  type PageBlockV2,
  type PageSectionV2,
} from "./pageDocumentV2Types";
import type { PageBlockPath } from "./pageBlockPaths";
import {
  PAGE_BLOCK_GRID_ITEM_ATTRIBUTE,
  resolvePageBlockGridPlacement,
  type PageBlockGridPlacementTarget,
} from "./pageBlockGridPlacement";
import {
  PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE,
  resolveSectionCompositionAttrs,
} from "./pageCompositionEffects";
import { INTERACTIVITY_KEYFRAMES_CSS } from "./pageInteractivityGlyphs";
import { PAGE_SECTION_CONTENT_ATTRIBUTE } from "./pageResponsiveCss";
import { resolvePageTimelineItemGeometry } from "./pageRendererTimelineGeometry";
import {
  distributePageSectionBlocksToColumns,
  pageSectionBlocksHaveColumnAssignments,
} from "./pageSectionColumns";
import {
  getPageSectionCompositionColumns,
  resolvePageSectionTemplate,
  type ResolvedPageSectionTemplate,
} from "./pageSectionTemplates";
import type { PageRuntimeDataByBlockId } from "./pageRuntimeBindingContract";
import {
  toPageSectionBleedStyle,
  toPageSectionRenderProps,
} from "./pageSectionRenderStyles";
import {
  joinPageRenderClasses,
  type PageBlockFrameRenderer,
  type PageBlockRenderContext,
  type PageBlockWithFrameRenderer,
  type PageColumnsSlotTrailingRenderer,
  type PageInlineTextRenderer,
  type PageSectionColumnTrailingRenderer,
  type PageSectionLayoutMode,
} from "./pageRendererV2Contract";

const defaultEmptySectionContent = (
  <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
    Empty section
  </div>
);

/** Scope hook consumed by the responsive CSS contract (`pageResponsiveCss`). */
const pageSectionContentDataAttributes = {
  [PAGE_SECTION_CONTENT_ATTRIBUTE]: "true",
} as const;

type PageSectionBlockRenderer = (block: PageBlockV2, index: number) => ReactNode;

const pageSectionMediaBlockTypes = new Set<PageBlockV2["type"]>(["image", "video", "gallery"]);

const isPageSectionMediaBlock = (block: PageBlockV2): boolean =>
  pageSectionMediaBlockTypes.has(block.type);

const renderMediaSplitPlaceholder = () => (
  <div
    className="flex min-h-56 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500"
    data-page-media-split-empty="true"
  >
    Media
  </div>
);

const wrapSectionTemplateBlock = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  block: PageBlockV2,
  index: number,
  rendered: ReactNode,
  // Total sibling count in this render pass. The timeline axis uses it to
  // suppress the row-gap bleed on the LAST item so the continuous rule ends at
  // the final dot (like the reference `.timeline:before{bottom:0}`) rather than
  // overshooting into empty section space. Optional (defaults to a large value
  // ⇒ "not last") so non-timeline callers are unaffected.
  total = Number.POSITIVE_INFINITY,
  // TASK-539-05-L01 — the section boundary computed the ONE legal grid target
  // for this root block exactly once. Template chrome (timeline/gallery/FAQ/
  // testimonials) is the legal target when placement resolves to
  // "section-template-wrapper": the WRAPPER receives the base span style +
  // `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` hook (whenever any span exists, incl.
  // responsive-only) and the inner frame suppresses both (it passes "none").
  // Every other placement leaves the wrapper byte-identical to post-530.
  spanTarget?: PageBlockGridPlacementTarget
): ReactNode => {
  if (!rendered) return rendered;

  // TASK-539-05-L01 — "section-template-wrapper" implies hasAnySpan (the
  // boundary sets spanTarget = hasAnySpan ? placement : "none"), so the hook
  // and base span style ride the wrapper present-only. The base span style is
  // the normalized desktop colSpan/rowSpan only; responsive-only spans still
  // gain the hook so the wrapper is a legal grid item for the responsive CSS.
  const templateGridItem =
    spanTarget === "section-template-wrapper"
      ? { [PAGE_BLOCK_GRID_ITEM_ATTRIBUTE]: block.id }
      : {};
  // Present-only span style: only when a BASE span exists (a responsive-only
  // span still gains the hook above but emits no empty `style` attribute).
  const templateSpanStyle: CSSProperties | undefined =
    spanTarget === "section-template-wrapper" &&
    (typeof block.style?.colSpan === "number" || typeof block.style?.rowSpan === "number")
      ? {
          ...(typeof block.style?.colSpan === "number"
            ? { gridColumn: `span ${block.style.colSpan}` }
            : {}),
          ...(typeof block.style?.rowSpan === "number"
            ? { gridRow: `span ${block.style.rowSpan}` }
            : {}),
        }
      : undefined;

  if (template.template === "timeline") {
    // ── TASK-533-03: VERTICAL variants (default/compact) draw a CONTINUOUS axis line
    // connecting the dots. OPTION B — a per-item connector segment in the marker column.
    // The section content grid stacks these items in ONE column with a REAL row `gap`
    // between them (default 24px, compact scales it down, min-floored at 8px), AND each
    // item carries its OWN vertical padding (`py-3` = 12px each edge default, `py-2` = 8px
    // compact). So the true empty distance between one item's dot-row and the next is
    // `rowGap + paddingBottom + paddingTop`, NOT just the row gap.
    //
    // AUDIT REMEDIATION (2026-07-09): the previous connector lived in the marker column's
    // dot-row span and only bled `bottom: calc(-1 * rowGap)`. That bridged the 24px grid
    // gap but IGNORED the item's own 12+12px py padding, leaving a ~24px dashed BREAK at
    // every boundary — NOT the reference `.timeline:before{top:0;bottom:0}` continuous rule.
    // Fix: HOIST the axis-line to be a child of the `relative` ITEM div and span the FULL
    // item box via `inset-y-0` (so the py padding is INSIDE the segment, not a gap), then
    // bleed the bottom by ONLY the inter-item row gap so segment N reaches segment N+1's
    // top. The LAST item suppresses the bleed (`bottom:0`) so the rule ENDS at the final
    // dot instead of overshooting into empty section space (matching the reference
    // container axis that stops at the last dot). Reproduces `.timeline:before` (aqua→fade
    // axis) WITHOUT container-height math. The dot keeps its `box-shadow` glow off the
    // accent (`.timeline article:before`). All existing hooks (item/marker/content) are
    // RETAINED (additive DOM); `data-page-timeline-axis` / `data-page-timeline-axis-line`
    // key the smoke assertion. The horizontal variant is UNCHANGED (no regression). No
    // author-controlled value: axis/dot are fixed structure tinted off the already-sanitized
    // `--coderso-section-accent`; the bleed offset is the clamped numeric section gap (a
    // bounded int → fixed `px` literal).
    //
    // ── TASK-539-05-L01 — the geometry (padding class, marker center, row gap, per-segment
    // axis top/bottom) is owned by `resolvePageTimelineItemGeometry`; this renderer only
    // consumes the returned values (no recomputation). The first segment begins at the
    // first marker center, interior/last segments at row top, non-final segments bleed only
    // the negative row gap, and the final segment ends at the final marker center.
    if (template.variant !== "horizontal") {
      const geometry = resolvePageTimelineItemGeometry(section, template, index, total);
      return (
        <div
          key={`${section.id}-timeline-${block.id}`}
          className={joinPageRenderClasses(
            "relative min-w-0",
            "grid grid-cols-[auto_minmax(0,1fr)] gap-4",
            geometry.paddingClassName
          )}
          style={templateSpanStyle}
          {...templateGridItem}
          data-page-timeline-item={index + 1}
        >
          {geometry.axis ? (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-px -translate-x-1/2"
              style={{
                // First segment begins at the first marker center; interior/last
                // segments begin at the item top. Non-final segments bleed only the
                // negative row gap (so they meet the next segment); the final
                // segment ends at the final marker center. `inset-y-0` pins the
                // full-item span contract (py padding sits INSIDE the segment).
                top: geometry.axis.top,
                bottom: geometry.axis.bottom,
                left: `${geometry.markerCenterPx}px`,
                background:
                  "linear-gradient(var(--coderso-section-accent,#0d9488), rgba(148,163,184,.12))",
              }}
              data-page-timeline-axis="true"
              data-page-timeline-axis-line="true"
            />
          ) : null}
          <span
            className="relative flex justify-center"
            style={{ width: `${geometry.markerCenterPx * 2}px` }}
          >
            {/* Glow dot (mirrors `.timeline article:before` box-shadow off the accent). */}
            <span
              className="relative mt-1 h-3 w-3 rounded-full ring-4 ring-white"
              style={{
                backgroundColor: "var(--coderso-section-accent,#0d9488)",
                boxShadow: "0 0 16px var(--coderso-section-accent,#0d9488)",
              }}
              data-page-timeline-marker="true"
            />
          </span>
          <div className="min-w-0" data-page-timeline-content="true">
            {rendered}
          </div>
        </div>
      );
    }
    // Horizontal variant — UNCHANGED (top-row markers; no vertical axis).
    return (
      <div
        key={`${section.id}-timeline-${block.id}`}
        className={joinPageRenderClasses(
          "relative min-w-0",
          "grid gap-3 md:grid-rows-[auto_1fr]",
          "py-3"
        )}
        data-page-timeline-item={index + 1}
      >
        <span
          className="mt-1 h-3 w-3 justify-self-center rounded-full ring-4 ring-white"
          style={{ backgroundColor: "var(--coderso-section-accent,#0d9488)" }}
          data-page-timeline-marker="true"
        />
        <div className="min-w-0 text-center" data-page-timeline-content="true">
          {rendered}
        </div>
      </div>
    );
  }

  if (template.template === "gallery") {
    return (
      <div
        key={`${section.id}-gallery-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0",
          template.variant === "cards"
            ? "overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
            : undefined
        )}
        style={templateSpanStyle}
        {...templateGridItem}
        data-page-gallery-section-item={index + 1}
        data-page-gallery-section-variant={template.variant}
      >
        {rendered}
      </div>
    );
  }

  if (template.template === "faq") {
    return (
      <div
        key={`${section.id}-faq-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0 rounded-lg border border-slate-200 bg-white",
          template.variant === "compact" ? "px-4 py-3 shadow-none" : "p-5 shadow-sm"
        )}
        style={templateSpanStyle}
        {...templateGridItem}
        data-page-faq-item={index + 1}
        data-page-faq-variant={template.variant}
      >
        {rendered}
      </div>
    );
  }

  if (template.template === "testimonials") {
    return (
      <div
        key={`${section.id}-testimonial-${block.id}`}
        className={joinPageRenderClasses(
          "min-w-0",
          template.variant === "cards"
            ? "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            : undefined
        )}
        style={templateSpanStyle}
        {...templateGridItem}
        data-page-testimonial-item={index + 1}
        data-page-testimonial-variant={template.variant}
        {...(template.variant === "cards" ? { "data-page-testimonial-card": "true" } : {})}
      >
        {rendered}
      </div>
    );
  }

  return rendered;
};

const renderMediaSplitSectionChildren = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  blocks: readonly PageBlockV2[],
  renderBlock: PageSectionBlockRenderer
): ReactNode => {
  const mediaBlocks: Array<{ block: PageBlockV2; index: number }> = [];
  const contentBlocks: Array<{ block: PageBlockV2; index: number }> = [];

  blocks.forEach((block, index) => {
    (isPageSectionMediaBlock(block) ? mediaBlocks : contentBlocks).push({ block, index });
  });

  const mediaZone = (
    <div
      key={`${section.id}-media-zone`}
      className="min-w-0 space-y-4"
      data-page-media-split-zone="media"
    >
      {mediaBlocks.length > 0
        ? mediaBlocks.map(({ block, index }) => renderBlock(block, index))
        : renderMediaSplitPlaceholder()}
    </div>
  );
  const contentZone = (
    <div
      key={`${section.id}-content-zone`}
      className={joinPageRenderClasses(
        "min-w-0 space-y-4",
        template.variant === "horizontal" ? "self-center" : undefined
      )}
      data-page-media-split-zone="content"
    >
      {contentBlocks.map(({ block, index }) => renderBlock(block, index))}
    </div>
  );

  return (
    <div
      className={joinPageRenderClasses(
        "contents",
        template.variant === "horizontal" ? "page-media-split-content-first" : undefined
      )}
      data-page-media-split={template.variant}
    >
      {template.variant === "horizontal" ? (
        <>
          {contentZone}
          {mediaZone}
        </>
      ) : (
        <>
          {mediaZone}
          {contentZone}
        </>
      )}
    </div>
  );
};

const renderTemplateSectionChildren = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate,
  blocks: readonly PageBlockV2[],
  renderBlockWithFrame: PageBlockWithFrameRenderer,
  makeContext: (block: PageBlockV2, index: number) => PageBlockRenderContext,
  renderRawBlock: (block: PageBlockV2, index: number) => ReactNode
): ReactNode => {
  if (template.template === "media-split" && template.variant !== "default") {
    return renderMediaSplitSectionChildren(
      section,
      template,
      blocks,
      (block, index) => renderRawBlock(block, index)
    );
  }

  return blocks.map((block, index) => {
    // TASK-539-05-L01 — one context per root block: the frame render and the
    // wrapper share the SAME computed span target (never recomputed against a
    // different block list).
    const context = makeContext(block, index);
    return wrapSectionTemplateBlock(
      section,
      template,
      block,
      index,
      renderBlockWithFrame(block, context),
      blocks.length,
      context.spanTarget
    );
  });
};

export function PageSectionContentImpl({
  section,
  renderBlockWithFrame,
  emptyContent = defaultEmptySectionContent,
  renderBlockFrame,
  renderInlineText,
  renderColumnsSlotTrailing,
  renderSectionColumnTrailing,
  trailingContent,
  layoutMode = "runtime",
  includeHiddenBlocks = false,
  runtimeDataByBlockId,
}: {
  section: PageSectionV2;
  renderBlockWithFrame: PageBlockWithFrameRenderer;
  emptyContent?: ReactNode;
  renderBlockFrame?: PageBlockFrameRenderer;
  renderInlineText?: PageInlineTextRenderer;
  renderColumnsSlotTrailing?: PageColumnsSlotTrailingRenderer;
  /**
   * Admin-canvas hook (owner finding #5, round 3): per-column add affordance
   * painted at the bottom of every column wrapper stack when per-column
   * composition is active. Runtime render paths never provide it.
   */
  renderSectionColumnTrailing?: PageSectionColumnTrailingRenderer;
  /**
   * Admin-canvas hook (owner finding #5): rendered as an extra grid child
   * AFTER the last block, so in a multi-column auto-flow grid it lands in the
   * next free cell. Ignored while per-column composition is active (the
   * per-column trailing hook owns the add affordances there). Runtime render
   * paths never provide it (front parity).
   */
  trailingContent?: ReactNode;
  layoutMode?: PageSectionLayoutMode;
  includeHiddenBlocks?: boolean;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
}) {
  const renderProps = toPageSectionRenderProps(section, { layoutMode });
  const template = resolvePageSectionTemplate(section);
  const blocks = includeHiddenBlocks
    ? section.blocks
    : section.blocks.filter((block) => block.visibility.visible);
  // Per-column composition (owner finding #5, round 3): when the section
  // composes 2+ columns AND at least one rendered root block carries a
  // `style.column` assignment, blocks render inside one wrapper stack per
  // column (assigned blocks in their column, unassigned blocks in their
  // legacy auto-flow cell). When NO block is assigned, the auto-flow markup
  // below stays byte-identical to the pre-assignment contract — that is the
  // non-destructive guarantee for documents authored before this field.
  // The composition count deliberately ignores `stackVertical`: a collapsed
  // grid (stackVertical or the public `grid-cols-1` mobile class) stacks the
  // wrappers themselves, mirroring the front's media-query collapse.
  const compositionColumns = getPageSectionCompositionColumns(section);
  const columnComposition =
    compositionColumns >= 2 && blocks.length > 0 && pageSectionBlocksHaveColumnAssignments(blocks)
      ? distributePageSectionBlocksToColumns(blocks, compositionColumns)
      : null;
  const blockRenderContext = (block: PageBlockV2, index: number): PageBlockRenderContext => {
    // ── TASK-539-05-L01 — actual grid-item span. The section boundary computes
    // the ONE legal grid target for each root block exactly once; nested slot
    // children always get `"none"` from `renderPageBlockList`. `includeHiddenBlocks`
    // here is the SAME normalized boolean the render boundary chose — no nested
    // consumer rereads or coerces the raw optional input. base/tablet/mobile
    // spans all count (a responsive-only span still makes the frame a legal
    // grid item for the responsive CSS; the base span style emits only when a
    // base span exists).
    const placement = resolvePageBlockGridPlacement(section, [{ index }] as PageBlockPath, {
      includeHiddenBlocks,
    });
    const hasAnySpan = [
      block.style,
      block.responsive?.tablet?.style,
      block.responsive?.mobile?.style,
    ].some((style) => style?.colSpan !== undefined || style?.rowSpan !== undefined);
    const spanTarget = hasAnySpan ? placement : "none";
    const isRevealSection =
      section.style.scrollEffect === "reveal-fade" || section.style.scrollEffect === "reveal-up";
    return {
      blockPath: [{ index }] as PageBlockPath,
      depth: 1,
      includeHiddenBlocks,
      renderBlockFrame,
      renderInlineText,
      renderColumnsSlotTrailing,
      runtimeDataByBlockId,
      layoutMode,
      // TASK-539-05-L01 — the owning section (placement consumers / effects).
      section,
      // TASK-539-05-L01 — the computed legal grid target for THIS root block.
      spanTarget,
      // TASK-539-05-L01 — every block under a revealing section receives the
      // ONE transform host attribute so its per-child reveal composes through
      // `--cx-reveal-y` in the shared formula (PAGE_REVEAL_MOTION_CSS writes
      // only reveal opacity/variable now). Ambient-orb spans are stamped by
      // `PageSectionRenderImpl`.
      transformHost: isRevealSection,
      // TASK-533-01 (audit remediation): inside per-column composition every block
      // frame is a child of a SINGLE-column wrapper, so its grid span (colSpan/
      // rowSpan) is inert/misleading — drop it (span ⟂ per-column `column`). The
      // auto-flow path leaves this unset, so span keeps working as the direct grid
      // child of the section content grid.
      suppressBlockSpan: columnComposition !== null,
    };
  };
  const renderBlockAtIndex = (block: PageBlockV2, index: number) =>
    renderBlockWithFrame(block, blockRenderContext(block, index));
  const renderWrappedBlockAtIndex = (block: PageBlockV2, index: number) => {
    const context = blockRenderContext(block, index);
    return wrapSectionTemplateBlock(
      section,
      template,
      block,
      index,
      renderBlockWithFrame(block, context),
      Number.POSITIVE_INFINITY,
      context.spanTarget
    );
  };
  return (
    <div
      className={renderProps.contentClassName}
      style={renderProps.style}
      {...pageSectionContentDataAttributes}
      data-page-section-layout-mode={layoutMode}
    >
      {columnComposition ? (
        columnComposition.map((members, columnIndex) => (
          <div
            key={`${section.id}-column-${columnIndex + 1}`}
            // One wrapper per composition column, each occupying one cell of
            // the section grid's first row. The inner grid inherits the
            // section gap (including responsive gap overrides on the content
            // element) so vertical rhythm matches the auto-flow rows, and
            // block-level `justify-self` alignment keeps working.
            className="grid min-w-0 content-start"
            style={{ gap: "inherit" }}
            data-page-section-column={columnIndex + 1}
            data-page-section-column-owner={section.id}
          >
            {members.map(({ block, index }) => renderWrappedBlockAtIndex(block, index))}
            {renderSectionColumnTrailing?.({
              section,
              column: columnIndex + 1,
              childCount: members.length,
            })}
          </div>
        ))
      ) : blocks.length > 0 ? (
        <>
          {renderTemplateSectionChildren(
            section,
            template,
            blocks,
            renderBlockWithFrame,
            (block, index) => blockRenderContext(block, index),
            renderBlockAtIndex
          )}
          {trailingContent}
        </>
      ) : (
        emptyContent
      )}
    </div>
  );
}

export function PageSectionRenderImpl({
  section,
  renderBlockWithFrame,
  emptyContent,
  runtimeDataByBlockId,
}: {
  section: PageSectionV2;
  renderBlockWithFrame: PageBlockWithFrameRenderer;
  emptyContent?: ReactNode;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
}) {
  if (!section.visibility.visible) return null;
  const renderProps = toPageSectionRenderProps(section);
  // Section scroll effects (TASK-521-02): re-derive from section.style locally
  // and spread the extra data-attrs DIRECTLY on <section> (NOT through the
  // strict renderProps.dataAttributes, whose type has no index signature). The
  // 521-01 runtime (emitted once at the page root by 521-05) reads these.
  const scrollEffect = section.style.scrollEffect; // undefined | enum
  const parallax =
    scrollEffect === "parallax"
      ? Math.max(
          PAGE_PARALLAX_INTENSITY_CLAMP.min,
          Math.min(PAGE_PARALLAX_INTENSITY_CLAMP.max, section.style.parallaxIntensity ?? 20)
        )
      : undefined;
  const parallaxEnabled = parallax !== undefined;
  // TASK-539-05-L01 — a REVEALING section is itself a transform host: its own
  // reveal-up hide state writes only `--cx-reveal-y` (PAGE_REVEAL_MOTION_CSS),
  // and the shared formula on THIS element composes it. Present-only: no
  // scrollEffect (or parallax-only) ⇒ no host attr ⇒ byte-identical section.
  const isRevealSection =
    scrollEffect === "reveal-fade" || scrollEffect === "reveal-up";
  const effectDataAttrs: Record<string, string> = {
    ...(scrollEffect ? { "data-page-effect": scrollEffect } : {}),
    ...(parallax !== undefined ? { "data-parallax": String(parallax) } : {}),
    ...(isRevealSection ? { [PAGE_BLOCK_TRANSFORM_HOST_ATTRIBUTE]: "" } : {}),
  };
  // Section composition (TASK-522-05-L01): surface preset + layered composition
  // data-attrs + the write-validated `accent` glow retint custom props, DISJOINT
  // from 521-02's scrollEffect attrs above (additive). Present-only: empty for a
  // section with no 522 field ⇒ byte-identical to the pre-522 output.
  const sc = resolveSectionCompositionAttrs(section.style);
  // TASK-525-01-L01: full-bleed background box on the OUTER <section> (100vw
  // edge-to-edge) while the content div stays capped/centered at
  // layout.maxWidth. `undefined` for non-full-bleed → the <section> style is
  // byte-identical to the pre-525 output (composition cssVars only).
  const sectionBleedStyle = toPageSectionBleedStyle(section);
  const sectionCompositionStyle =
    Object.keys(sc.cssVars).length > 0 ? (sc.cssVars as CSSProperties) : undefined;
  const sectionStyle =
    sectionBleedStyle || sectionCompositionStyle
      ? { ...sectionBleedStyle, ...sectionCompositionStyle }
      : undefined;
  // ── TASK-534 ── present-only static grain overlay on the section surface. The
  // overlay is `inset:0` absolute, so the section must be a positioning context —
  // `[data-noise-host]{position:relative}` (INTERACTIVITY_KEYFRAMES_CSS) supplies it.
  const sectionNoise = section.style.noiseOverlay === true;
  return (
    <section
      id={section.visibility.anchor ?? undefined}
      className={renderProps.sectionClassName}
      style={sectionStyle}
      {...renderProps.dataAttributes}
      {...effectDataAttrs}
      {...sc.dataAttrs}
      {...(sectionNoise ? { "data-noise-host": "true" } : {})}
    >
      {sectionNoise ? (
        <>
          <style
            data-section-noise-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div
            aria-hidden="true"
            data-noise-overlay="true"
            className="pointer-events-none absolute inset-0"
          />
        </>
      ) : null}
      {sc.ambientOrbs ? (
        <>
          {/* TASK-539-05-L01 — ambient-orb spans are transform hosts: drift
              animates the decoration variables and the ONE formula composes
              them (same host the block resolver stamps for block-level orbs). */}
          <span
            className="cx-orb cx-orb-a"
            aria-hidden="true"
            data-deco="drift"
            data-page-transform-host=""
          />
          <span
            className="cx-orb cx-orb-b"
            aria-hidden="true"
            data-deco="drift"
            data-page-transform-host=""
            style={{ ["--deco-delay" as string]: "1500ms" } as CSSProperties}
          />
        </>
      ) : null}
      {parallaxEnabled ? (
        <div data-parallax-inner className="will-change-transform">
          <PageSectionContentImpl
            section={section}
            renderBlockWithFrame={renderBlockWithFrame}
            emptyContent={emptyContent}
            runtimeDataByBlockId={runtimeDataByBlockId}
          />
        </div>
      ) : (
        <PageSectionContentImpl
          section={section}
          renderBlockWithFrame={renderBlockWithFrame}
          emptyContent={emptyContent}
          runtimeDataByBlockId={runtimeDataByBlockId}
        />
      )}
    </section>
  );
}
