import type { CSSProperties, ReactNode } from "react";

import { AnimatedIcon, ANIMATED_ICON_KEYFRAMES_CSS } from "./animatedIconGlyphs";
import {
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  PAGE_SPOTLIGHT_SIZE_CLAMP,
  resolveAnimatedIconName,
  resolveSwitcherAriaLabel,
  type AnimatedIconAnimation,
  type PageBlockV2,
  type PageBreakpoint,
  type PageDocumentV2,
  type PageSwitcherVariant,
} from "./pageDocumentV2";
import {
  PAGE_COMPOSITION_EFFECTS_CSS,
  PAGE_INTERACTIVITY_CSS,
  PAGE_LAYER_WIDTH_ATTRIBUTE,
  resolveDrawInAttrs,
  usesInteractivityRuntime,
} from "./pageCompositionEffects";
import {
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
  transformPageReplicaIdentityAttribute,
} from "./pageRendererReplicaIdentity";
import { PAGE_EFFECTS_RUNTIME_ID, PAGE_EFFECTS_RUNTIME_SOURCE } from "./pageEffectsRuntime";
import { INTERACTIVITY_KEYFRAMES_CSS, SCROLL_HINT_GLYPHS } from "./pageInteractivityGlyphs";
import type { PageBlockPath } from "./pageBlockPaths";
import { PAGE_TILT_PARENT_LAYER_ATTRIBUTE } from "./pageResponsiveCss";
import type { PageRuntimeDataByBlockId } from "./pageRuntimeBindingContract";
import { buildSafeSvgTree } from "./svgSafeTree";
import {
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import {
  pageBlockElementDataAttributes,
  pageBlockTextDataAttributes,
  splitBlockComposition,
  toPageBlockRenderProps,
  toPageBlockTypographyStyle,
  toPageButtonElementStyle,
} from "./pageBlockRenderStyles";
import {
  renderCollectionBlock,
  renderEmbedBlock,
  renderFiltersBlock,
  renderFormBlock,
  renderList,
} from "./pageDataBlockRenderers";
import {
  PAGE_SPOTLIGHT_CSS,
  docHasFullBleedSection,
  docUsesCompositionEffects,
  emptyDocumentContent,
  resolvePageRenderTree,
  usesCompositionTilt,
} from "./pageDocumentRenderState";
import { renderPageBlockList, renderPageLayoutBlockContent } from "./pageLayoutBlockRenderer";
import { LegacyWidgetPlaceholder } from "./legacyWidgetPlaceholder";
import { PAGE_REVEAL_MOTION_CSS } from "./pageSectionRenderStyles";
import { PageSectionContentImpl, PageSectionRenderImpl } from "./pageSectionRendererV2";
import {
  SAFE_CUSTOM_SVG_BOUNDARY_STYLE,
  pageButtonSizeClass,
  pageButtonVariantClass,
  pageDividerToneBorderColor,
  readButtonSize,
  readButtonVariant,
  renderBadgeBlock,
  renderBlockText,
  renderBlockTextMarks,
  renderGallery,
  renderHeading,
  renderImage,
  renderSafeSvgNode,
  renderTextBlock,
  toHrefTarget,
} from "./pageStaticBlockRenderers";
import {
  readBoolean,
  readNumber,
  readText,
  joinPageRenderClasses,
  type PageBlockRenderContext,
  type PageBlockRenderProps,
} from "./pageRendererV2Contract";

function FragmentLike({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const renderPageBlockContent = (
  block: PageBlockV2,
  context: PageBlockRenderContext = {
    blockPath: [{ index: 0 }] as PageBlockPath,
    depth: 1,
    includeHiddenBlocks: false,
  }
): ReactNode => {
  if (!block.visibility.visible) return null;

  switch (block.type) {
    case "container":
    case "columns":
    case "group":
      return renderPageLayoutBlockContent(block, {
        ...context,
        renderBlockWithFrame: renderPageBlockWithFrame,
      });
    case "heading":
      return renderHeading(block, context);
    case "text":
      return renderTextBlock(block, context);
    case "badge":
      return renderBadgeBlock(block);
    case "button": {
      const href = sanitizeAuthoringLinkHref(block.props.href) ?? "#";
      const variant = readButtonVariant(block.props.variant);
      const size = readButtonSize(block.props.size);
      return (
        <a
          className={joinPageRenderClasses(
            "inline-flex w-fit items-center justify-center rounded font-semibold",
            pageButtonSizeClass(size, variant),
            pageButtonVariantClass(variant)
          )}
          // Style-target contract: the anchor IS the button the user styles,
          // so the visual style surface lands here, not on the block frame.
          style={toPageButtonElementStyle(block, variant)}
          {...pageBlockElementDataAttributes}
          href={href}
          target={toHrefTarget(block.props.target)}
          rel={block.props.target === "blank" ? "noreferrer" : undefined}
        >
          {renderBlockText(block, "label", readText(block.props.label, "Learn more"), context)}
        </a>
      );
    }
    case "image":
      return renderImage(block);
    case "video": {
      const src = sanitizeAuthoringMediaUrl(block.props.src) ?? "";
      const title = readText(block.props.title);
      const autoplay = readBoolean(block.props.autoplay, false);
      return src ? (
        <video
          className="w-full rounded"
          src={src}
          title={title || undefined}
          aria-label={title || undefined}
          controls
          autoPlay={autoplay || undefined}
          muted={readBoolean(block.props.muted, true) || autoplay}
          playsInline={autoplay || undefined}
        />
      ) : (
        <div className="rounded border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Video
        </div>
      );
    }
    case "list":
      return renderList(block, context);
    case "card": {
      // Card paints two text nodes; only explicitly set typography fields are
      // emitted, so unset fields keep each node's own baked scale.
      const cardTypography = toPageBlockTypographyStyle(block);
      const image = sanitizeAuthoringMediaUrl(block.props.image);
      const href = sanitizeAuthoringLinkHref(block.props.href);
      const title = readText(block.props.title, "Card title");
      const titleNode = href ? (
        <a href={href} className="hover:underline">
          {title}
        </a>
      ) : (
        title
      );
      return (
        <article className="overflow-hidden rounded border border-slate-200 bg-[var(--coderso-block-surface,#ffffff)] shadow-sm">
          {image ? <img className="aspect-video w-full object-cover" src={image} alt="" /> : null}
          <div className="p-5">
            <h3
              className="text-lg font-semibold text-[var(--coderso-block-text,#020617)]"
              style={cardTypography}
              {...pageBlockTextDataAttributes}
            >
              {titleNode}
            </h3>
            <p
              className="mt-2 text-sm leading-6 text-[var(--coderso-block-text,#475569)]"
              style={cardTypography}
              {...pageBlockTextDataAttributes}
            >
              {readText(block.props.text)}
            </p>
          </div>
        </article>
      );
    }
    case "divider": {
      // ── TASK-532 eyebrow divider (Bundle B) — present-only gradient variant ──
      const dividerThickness = readNumber(block.props.thickness, 1);
      const dividerToneColor = pageDividerToneBorderColor(block.props.tone);
      if (block.props.gradient === true) {
        // Slim gradient eyebrow rule (reference `.eyebrow span`: a short 34px,
        // 2px gradient line). The gradient is a STATIC template whose only
        // variable is the whitelisted tone color (from
        // `pageDividerToneBorderColor`) fading to `transparent` — no raw author
        // string reaches the declaration. `align` positions the short rule.
        const dividerWidth = typeof block.props.width === "number" ? block.props.width : 34;
        const dividerAlign = block.props.align;
        return (
          <span
            aria-hidden="true"
            style={{
              display: "block",
              height: `${dividerThickness}px`,
              width: `${dividerWidth}px`,
              background: `linear-gradient(90deg, ${dividerToneColor}, transparent)`,
              marginLeft:
                dividerAlign === "center" || dividerAlign === "right" ? "auto" : undefined,
              marginRight: dividerAlign === "center" ? "auto" : undefined,
            }}
          />
        );
      }
      // Legacy path — byte-identical when `gradient` is unset.
      return (
        <hr
          style={{
            borderColor: dividerToneColor,
            borderWidth: `${dividerThickness}px`,
          }}
        />
      );
    }
    case "spacer":
      return <div aria-hidden="true" style={{ height: `${readNumber(block.props.size, 32)}px` }} />;
    case "statistic": {
      // Statistic paints three text nodes; explicit fields apply to all of
      // them while unset fields keep each node's own baked scale.
      const statisticTypography = toPageBlockTypographyStyle(block);
      return (
        <div className="rounded border border-slate-200 p-5">
          <div
            className="text-3xl font-semibold text-[var(--coderso-block-text,#020617)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "value", readText(block.props.value, "0"), context)}
          </div>
          <div
            className="mt-1 text-sm font-medium text-[var(--coderso-block-text,#334155)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "label", readText(block.props.label, "Metric"), context)}
          </div>
          <div
            className="mt-1 text-sm text-[var(--coderso-block-text,#64748b)]"
            style={statisticTypography}
            {...pageBlockTextDataAttributes}
          >
            {renderBlockText(block, "caption", readText(block.props.caption), context)}
          </div>
        </div>
      );
    }
    case "quote":
      return (
        <blockquote
          className="border-l-4 border-[var(--coderso-section-accent,#0d9488)] pl-5 text-lg leading-8 text-[var(--coderso-block-text,#334155)]"
          style={toPageBlockTypographyStyle(block)}
          {...pageBlockTextDataAttributes}
        >
          <p>{renderBlockTextMarks(block, "text", readText(block.props.text), context)}</p>
          {readText(block.props.cite) ? (
            <cite className="mt-3 block text-sm text-[var(--coderso-block-text,#64748b)]">
              {renderBlockText(block, "cite", readText(block.props.cite), context)}
            </cite>
          ) : null}
        </blockquote>
      );
    case "gallery":
      return renderGallery(block);
    case "collection":
      return renderCollectionBlock(block, context);
    case "filters":
      return renderFiltersBlock(block, context);
    case "form": {
      return renderFormBlock(block, context);
    }
    case "embed":
      return renderEmbedBlock(block, context);
    case "icon": {
      // Defence in depth — re-validate every prop at the render boundary (never
      // trust stored data): name → curated allowlist (`resolveAnimatedIconName`),
      // size/speed re-clamped, color re-sanitized (React SSR does NOT block
      // semicolon-delimited CSS injection inside a `style` value).
      const iconName = resolveAnimatedIconName(block.props.name);
      const iconAnimation = ((): AnimatedIconAnimation => {
        const value = block.props.animation;
        return typeof value === "string" &&
          (["none", "spin", "pulse", "bounce", "draw"] as readonly string[]).includes(value)
          ? (value as AnimatedIconAnimation)
          : "none";
      })();
      const iconSize = Math.max(
        ANIMATED_ICON_SIZE_CLAMP.min,
        Math.min(ANIMATED_ICON_SIZE_CLAMP.max, Math.trunc(readNumber(block.props.size, 48)))
      );
      const iconSpeed = Math.max(
        ANIMATED_ICON_SPEED_CLAMP.min,
        Math.min(ANIMATED_ICON_SPEED_CLAMP.max, Math.trunc(readNumber(block.props.speed, 1600)))
      );
      const iconColor = sanitizeAuthoringCssColor(block.props.color) ?? "var(--primary)";
      return (
        <>
          {/* Keyframe CSS rides WITH the block (block-scoped) so it is present in
              BOTH the front shell AND the builder canvas (the canvas bypasses
              PageDocumentRender). A keyed <style data-anim-icon-css> per icon block:
              React SSR duplicates are HARMLESS because the payload is a STATIC set of
              identical @keyframes/@media rules that dedupe in the browser CSSOM — no
              render-scoped Set exists on PageBlockRenderContext to force a single
              emit, and none is required. */}
          <style
            data-anim-icon-css
            dangerouslySetInnerHTML={{ __html: ANIMATED_ICON_KEYFRAMES_CSS }}
          />
          <AnimatedIcon
            name={iconName}
            animation={iconAnimation}
            size={iconSize}
            color={iconColor}
            speed={iconSpeed}
          />
        </>
      );
    }
    case "customSvg": {
      const props = block.props as {
        svg?: string;
        drawIn?: boolean;
        drawSpeed?: number;
        label?: string;
      };
      // Defence in depth: sanitize and parse at render (do NOT trust the stored
      // value blindly). The resulting deeply frozen tree exposes only closed SVG
      // tags and React prop names, so author markup never reaches an HTML sink.
      const tree = buildSafeSvgTree(typeof props.svg === "string" ? props.svg : "");
      if (!tree) {
        // Neutral fallback (no injected markup) — a muted placeholder box.
        return (
          <span className="inline-block text-slate-400" aria-hidden="true">
            ▢
          </span>
        );
      }
      const { dataAttrs, cssVars } = resolveDrawInAttrs(props.drawIn, props.drawSpeed);
      return (
        <span
          role="img"
          aria-label={props.label || undefined}
          aria-hidden={props.label ? undefined : "true"}
          data-custom-svg-boundary="true"
          {...dataAttrs}
          style={{ ...SAFE_CUSTOM_SVG_BOUNDARY_STYLE, ...(cssVars as CSSProperties) }}
        >
          {/* TASK-539-05-L01 — in an approved marquee replica, every Safe-SVG
              `id` definition and matching `url(#...)`/hash reference is
              namespaced through the identity transformer; the primary passes
              no context and stays byte-identical. */}
          {renderSafeSvgNode(
            tree,
            "svg-root",
            Boolean(props.drawIn),
            true,
            context.replicaIdentity
          )}
        </span>
      );
    }
    // ── TASK-534 ── segmented SWITCHER / TABS (absorbs 527). A real role="tablist"
    // with N tabs + N panels (child blocks from the panel:1..6 slots), stamping the
    // data-switcher contract the 534-01-L03 runtime binds. Progressive: no-JS ⇒ the
    // first panel is visible (resting `hidden` on the rest); the runtime toggles it.
    case "switcher": {
      // Re-validate at the render boundary (defence in depth — never trust stored):
      const tabs = Array.isArray(block.props.tabs) ? block.props.tabs : [];
      const variant: PageSwitcherVariant =
        block.props.variant === "underline" ? "underline" : "pill";
      const rawActive =
        typeof block.props.activeIndex === "number" && Number.isFinite(block.props.activeIndex)
          ? Math.trunc(block.props.activeIndex)
          : 0;
      const active = Math.max(0, Math.min(Math.max(0, tabs.length - 1), rawActive));
      const panelSlots = [
        "panel:1",
        "panel:2",
        "panel:3",
        "panel:4",
        "panel:5",
        "panel:6",
      ] as const;
      // ── TASK-539-05-L01 ── replica identity routing. In an approved marquee
      // replica, every switcher DOM `id` definition and matching local
      // `aria-controls`/`aria-labelledby` reference is namespaced through the
      // identity transformer (only targets backed by a locally emitted `id`
      // rewrite; the primary stays byte-identical). The replica context rides
      // into every panel slot list so deeper ids/hooks namespace too.
      const replica = context.replicaIdentity;
      const replicaId = (value: string) =>
        replica ? transformPageReplicaIdentityAttribute(replica, "id", value) : value;
      const replicaRef = (attribute: "aria-controls" | "aria-labelledby", value: string) =>
        replica ? transformPageReplicaIdentityAttribute(replica, attribute, value) : value;
      return (
        <div data-switcher="true" data-switcher-variant={variant}>
          <div
            role="tablist"
            aria-label={resolveSwitcherAriaLabel(block.props.ariaLabel)}
            aria-orientation="horizontal"
            className={joinPageRenderClasses("cx-switcher-tabs", `cx-switcher-${variant}`)}
          >
            {tabs.map((tab, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                data-switcher-tab="true"
                id={replicaId(`${block.id}-tab-${i}`)}
                aria-controls={replicaRef("aria-controls", `${block.id}-panel-${i}`)}
                aria-selected={i === active ? "true" : "false"}
                tabIndex={i === active ? 0 : -1}
                className="cx-switcher-tab"
              >
                {/* Escaped React TEXT node — an <img onerror> label is inert text. */}
                {String((tab as { label?: unknown })?.label ?? "")}
              </button>
            ))}
          </div>
          {tabs.map((_, i) => {
            const slotBlocks = block.slots?.[panelSlots[i]] ?? [];
            return (
              <div
                key={i}
                role="tabpanel"
                data-switcher-panel="true"
                id={replicaId(`${block.id}-panel-${i}`)}
                aria-labelledby={replicaRef("aria-labelledby", `${block.id}-tab-${i}`)}
                data-active={i === active ? "true" : "false"}
                // TASK-534 a11y (APG Tabs): tabIndex=0 makes a panel whose authored
                // children may be entirely non-focusable (text/image/heading) reachable
                // by keyboard/SR after tab selection; harmless when it has focusable kids.
                tabIndex={0}
                hidden={i !== active}
              >
                {renderPageBlockList(slotBlocks, {
                  parentPath: context.blockPath,
                  depth: context.depth + 1,
                  includeHiddenBlocks: context.includeHiddenBlocks,
                  renderBlockFrame: context.renderBlockFrame,
                  renderInlineText: context.renderInlineText,
                  renderColumnsSlotTrailing: context.renderColumnsSlotTrailing,
                  runtimeDataByBlockId: context.runtimeDataByBlockId,
                  layoutMode: context.layoutMode,
                  renderBlockWithFrame: renderPageBlockWithFrame,
                  slotKey: panelSlots[i],
                  parentBlock: block,
                  section: context.section,
                  transformHost: context.transformHost,
                  replicaIdentity: replica,
                })}
              </div>
            );
          })}
        </div>
      );
    }
    // ── TASK-534 ── hero scroll-hint indicator (CSS-keyframe dot/chevron, NO
    // runtime). Block-scoped keyframe CSS rides WITH the block (case "icon" :2287
    // pattern) so it works on BOTH the front shell AND the builder canvas. The
    // glyph is re-validated at render; the label is an escaped sr-only TEXT node.
    case "scrollHint": {
      const glyph = block.props.glyph === "chevron" ? "chevron" : "dot";
      const label = typeof block.props.label === "string" ? block.props.label : "Scroll";
      return (
        <>
          <style
            data-page-interactivity-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div data-scroll-hint="true" className="cx-scroll-hint" aria-hidden="true">
            <span className="cx-hint-dot">{SCROLL_HINT_GLYPHS[glyph]}</span>
          </div>
          {label ? <span className="sr-only">{label}</span> : null}
        </>
      );
    }
    // ── TASK-580-03-L01 ── migration-only read-only placeholder: delegates to
    // the S6-owned placeholder module. `props.data` is NEVER rendered here.
    case "legacy-widget":
      return <LegacyWidgetPlaceholder block={block} />;
    default:
      return null;
  }
};

const renderPageBlockWithFrame = (block: PageBlockV2, context: PageBlockRenderContext) => {
  if (!context.includeHiddenBlocks && !block.visibility.visible) return null;
  const s = splitBlockComposition(block.style);
  let content = renderPageBlockContent(block, context);
  if (s.needsInner) {
    // ONE inner wrapper carrying the transform-writing effect attrs (tilt/deco/
    // hover) + glare + block ambient-orbs. It is a DESCENDANT of the frame, so
    // the frame's --layer-* (incl. per-device) inherit down and the frame's
    // anchor translate stays isolated from this node's effect transform.
    content = (
      <div style={s.innerVars as CSSProperties} {...s.innerAttrs}>
        {s.glare ? <span className="cx-glare" aria-hidden="true" /> : null}
        {s.ambientOrbs ? (
          <>
            {/* ambient-orbs needs REAL child spans (glass/grid/glow self-paint
               via ::before/::after; orbs do not) — mirrors the section emit
               (522-05-L01). */}
            <span className="cx-orb cx-orb-a" aria-hidden="true" data-deco="drift" />
            <span
              className="cx-orb cx-orb-b"
              aria-hidden="true"
              data-deco="drift"
              style={{ "--deco-delay": "1500ms" } as CSSProperties}
            />
          </>
        ) : null}
        {content}
      </div>
    );
  }
  // TASK-533-01 (audit remediation): drop the block grid span when this block is
  // rendered inside a per-column composition wrapper (single-column grid) — see
  // toPageBlockRenderProps + PageBlockRenderContext.suppressBlockSpan.
  //
  // ── TASK-539-05-L01 ── the section boundary computed the ONE legal grid
  // target (`context.spanTarget`) and the reveal-host flag; the marquee replica
  // identity rides through `context.replicaIdentity`. Nested children always
  // carry `"none"`/propagated flags. Undefined (section-less direct calls)
  // keeps the legacy default behavior.
  const renderProps = toPageBlockRenderProps(block, {
    suppressSpan: context.suppressBlockSpan,
    spanTarget: context.spanTarget,
    transformHost: context.transformHost,
    replicaIdentity: context.replicaIdentity,
  });
  // TASK-528 whole-card tilt: the frame carries data-block-tilt (co-located with
  // data-surface), so CSS `perspective` must sit on an ANCESTOR — wrap the frame
  // in a [data-tilt-parent] perspective wrapper. Present-only: only when the block
  // authors tilt (`s.tiltParent`); otherwise the frame renders byte-identically.
  //
  // TASK-535 tilt + layer: when the block ALSO authors style.layer, the layer
  // placement (data-layer + data-layer-anchor + base --layer-x/y/z) is hoisted onto
  // THIS wrapper (splitBlockComposition → s.wrapperAttrs/s.wrapperVars). The
  // wrapper then IS the `[data-composition="layered"] [data-layer]` absolutely
  // positioned child, so its offsets resolve against the `.cx-layered-canvas` (not
  // the perspective containing block it would otherwise clobber), while the tilt
  // transform stays on the inner frame. Empty for every non-(tilt+layer) block →
  // the wrapper renders exactly as before.
  //
  // TASK-535 per-device layer: because the base `--layer-*` now live on the WRAPPER
  // (not the frame), and CSS custom props inherit DOWNWARD only, a per-device
  // `--layer-*` override on `[data-block-id]` (the child frame) could never reach
  // the wrapper. We stamp the block id onto the wrapper as `data-tilt-parent-for`
  // (present ONLY when the layer placement was hoisted here) so pageResponsiveCss
  // can retarget the per-device layer override at THIS wrapper. `data-block-id`
  // stays uniquely on the frame (selection chrome depends on that 1:1 mapping).
  const wrapperLayerId = "data-layer" in s.wrapperAttrs ? block.id : undefined;
  // ── TASK-539-05-L01 ──
  // - LAYER WIDTH: the owner `PAGE_LAYER_WIDTH_ATTRIBUTE` ("full"|"auto") is
  //   stamped ONLY on this existing tilt/layer wrapper (never on the frame) so
  //   the bounded authored width applies to the absolutely-positioned layer
  //   node; present-only when a width is authored.
  // - REPLICA TILT-LAYER ALIAS: an approved replica wrapper corresponding to a
  //   primary `data-tilt-parent-for` wrapper replaces the primary-only hook
  //   with the style-scope alias (same canonical id value) — the replica never
  //   registers as a primary per-device override target, and 539-06's scoped
  //   CSS can target both. No new wrapper is added.
  const wrapperLayerWidth =
    wrapperLayerId !== undefined && (block.style?.width === "full" || block.style?.width === "auto")
      ? block.style.width
      : undefined;
  const isReplicaWrapper = context.replicaIdentity !== undefined;
  const withTiltParent = (frame: ReactNode): ReactNode =>
    s.tiltParent ? (
      <div
        data-tilt-parent=""
        {...(wrapperLayerId
          ? isReplicaWrapper
            ? { [PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE]: wrapperLayerId }
            : { [PAGE_TILT_PARENT_LAYER_ATTRIBUTE]: wrapperLayerId }
          : {})}
        {...(wrapperLayerWidth ? { [PAGE_LAYER_WIDTH_ATTRIBUTE]: wrapperLayerWidth } : {})}
        style={{ perspective: "1200px", ...(s.wrapperVars as CSSProperties) }}
        {...s.wrapperAttrs}
      >
        {frame}
      </div>
    ) : (
      frame
    );
  if (context.renderBlockFrame) {
    return (
      <FragmentLike key={block.id}>
        {withTiltParent(
          context.renderBlockFrame({
            block,
            content,
            renderProps,
            blockPath: context.blockPath,
            depth: context.depth,
            slotKey: context.slotKey,
            parentBlock: context.parentBlock,
          })
        )}
      </FragmentLike>
    );
  }
  return (
    <FragmentLike key={block.id}>
      {/* Pass the suppression-aware renderProps so the span drop (composition path)
          reaches the real front/runtime frame — PageBlockFrame would otherwise
          recompute the span-carrying props from the block, re-introducing the ghost
          rule. */}
      {withTiltParent(
        <PageBlockFrame block={block} renderProps={renderProps}>
          {content}
        </PageBlockFrame>
      )}
    </FragmentLike>
  );
};

export function PageBlockContent({ block }: { block: PageBlockV2 }) {
  return <>{renderPageBlockContent(block)}</>;
}

export function PageBlockFrame({
  block,
  children,
  renderProps: renderPropsOverride,
}: {
  block: PageBlockV2;
  children: ReactNode;
  /**
   * TASK-533-01 (audit remediation): when the caller has already computed
   * suppression-aware render props (span dropped in the per-column composition
   * path), pass them through so this frame does not recompute the span-carrying
   * props and re-introduce the inert `gridColumn`/`gridRow` rule. Undefined ⇒
   * derive from the block as before (byte-identical to the prior contract).
   */
  renderProps?: PageBlockRenderProps;
}) {
  if (!block.visibility.visible) return null;
  const renderProps = renderPropsOverride ?? toPageBlockRenderProps(block);
  return (
    <div
      className={renderProps.className}
      style={renderProps.style}
      {...renderProps.dataAttributes}
    >
      {children}
    </div>
  );
}

export function PageSectionContent(
  props: Omit<Parameters<typeof PageSectionContentImpl>[0], "renderBlockWithFrame">
) {
  return <PageSectionContentImpl {...props} renderBlockWithFrame={renderPageBlockWithFrame} />;
}

export function PageSectionRender(
  props: Omit<Parameters<typeof PageSectionRenderImpl>[0], "renderBlockWithFrame">
) {
  return <PageSectionRenderImpl {...props} renderBlockWithFrame={renderPageBlockWithFrame} />;
}

export function PageDocumentRender({
  document,
  breakpoint = "desktop",
  emptyContent = emptyDocumentContent,
  runtimeDataByBlockId,
  rootTag = "main",
  rootClassName,
  documentRole = "primary",
  peerSpotlightOn = false,
}: {
  document: PageDocumentV2;
  breakpoint?: PageBreakpoint;
  emptyContent?: ReactNode;
  runtimeDataByBlockId?: PageRuntimeDataByBlockId;
  /**
   * Wrapper element for the rendered document. Pages keep the default
   * `main`; secondary documents (e.g. the TASK-455 site-shell footer
   * template) pass `div` so the page's unique `<main>` landmark stays valid.
   */
  rootTag?: "main" | "div";
  rootClassName?: string;
  /**
   * TASK-535 — a page renders TWO documents: the `<main>` page (primary) and the
   * site-shell footer template (secondary), each authored independently in the same
   * editor, so BOTH can author motion. The once-per-PAGE nodes split into two classes:
   *
   *  - Idempotent STYLESHEETS (reveal CSS + its noscript, spotlight CSS, composition
   *    CSS): the selectors are document-agnostic, so a duplicate copy is HARMLESS
   *    (same rules, no visual doubling). These stay PER-DOCUMENT / present-only —
   *    emitted whenever THIS document authors the effect — so a FOOTER-ONLY effect
   *    (main authors none, footer authors glass/reveal/spotlight) is still styled.
   *    Gating them to the primary (as an earlier 535 pass did) suppressed them on
   *    BOTH documents for footer-only effects ⇒ unstyled footer surfaces.
   *
   *  - The viewport-fixed SPOTLIGHT OVERLAY DIV is the ONLY true page-global singleton
   *    that DOUBLE-STACKS (two `fixed inset-0` `mix-blend:screen` gradients ⇒ double
   *    brightness). It is emitted EXACTLY ONCE per page: the primary emits it when
   *    EITHER document authors spotlight (`spotlightOn || peerSpotlightOn`); the
   *    secondary emits it only when the primary does NOT (footer-only spotlight).
   *
   * The runtime `<script>` is NOT suppressed on secondary (a footer-only-motion page
   * still needs it). TASK-539: each emitted copy invokes the reusable per-root
   * controller, which discovers LATER main/footer nodes while binder-specific
   * idempotence prevents duplicate work — the second copy is NOT a “total no-op”;
   * it is what arms the footer/motion nodes the primary controller could not have
   * seen yet. TASK-539-07 owns the runtime implementation.
   */
  documentRole?: "primary" | "secondary";
  /**
   * TASK-535 — whether the PRIMARY (`<main>`) page document authors a cursor
   * spotlight. Consulted ONLY on the secondary (footer) render: the footer suppresses
   * ITS copy of the single viewport-fixed overlay DIV when the primary already owns
   * one, yet still emits one for a footer-only spotlight (see `documentRole`).
   * Defaults `false` (a stand-alone render — preview, tests — has no sibling document).
   */
  peerSpotlightOn?: boolean;
}) {
  const resolved = resolvePageRenderTree(document, breakpoint);
  const Root = rootTag;

  if (resolved.sections.length === 0) {
    return (
      <Root
        className={
          rootClassName ?? "mx-auto w-full max-w-4xl px-6 py-16 text-center text-slate-500"
        }
        data-page-v2="true"
      >
        {emptyContent}
      </Root>
    );
  }

  // TASK-521-05-L03 — per-page effects + section-motion runtime, front/preview
  // only (this shared renderer is NOT the builder canvas). Present-only: when no
  // effect is authored, the <Root> is byte-identical to pre-521.
  const effects = resolved.settings.effects; // present-only (validated at write)
  const spotlightOn = !!effects?.cursorSpotlight;
  const hasSectionEffect = resolved.sections.some((section) => section.style.scrollEffect != null);
  // TASK-522-05-L01 — present-only composition emit. `usesComposition` gates the
  // page-root composition <style>; `compositionTilt` OR-widens 521-05's SINGLE
  // runtime <script> predicate (the 522 block-tilt binding lives INSIDE the same
  // PAGE_EFFECTS_RUNTIME_SOURCE string, so we reuse the one emit — never a second
  // <script>, which would double-run reveal/parallax/spotlight).
  const usesComposition = docUsesCompositionEffects(document);
  const compositionTilt = usesCompositionTilt(document);
  // ── TASK-534 ── OR-widen the SINGLE runtime <script> emit predicate with the
  // RUNTIME-BEARING interactivity surfaces (switcher / filterable gallery /
  // block.style.magnetic). scrollHint + noise are NOT runtime-bearing (CSS keyframe
  // / static overlay), so they do NOT widen anyMotion. Present-only: a no-effect
  // document keeps anyMotion false ⇒ byte-identical (no <script>, no CSS).
  const usesInteractivity = usesInteractivityRuntime(document);
  const anyMotion = spotlightOn || hasSectionEffect || compositionTilt || usesInteractivity;
  // ── TASK-534 ── present-only page-root static grain overlay.
  const pageNoise = !!effects?.noiseOverlay;
  // TASK-535 — the idempotent effect stylesheets (reveal/composition/spotlight CSS
  // + reveal noscript) stay PER-DOCUMENT/present-only so a footer-only effect is
  // still styled; only the viewport-fixed spotlight OVERLAY DIV is a true page
  // singleton (two stack ⇒ double brightness) and is de-duplicated across the two
  // documents below. The runtime <script> emits from either (self-guards at runtime).
  const isPrimaryDocument = documentRole === "primary";
  // Emit the single spotlight OVERLAY DIV exactly once per page. The overlay is
  // CSS-gated by an ancestor `[data-page-spotlight]` + the root `--spotlight-*` vars,
  // which a document only sets when IT authors spotlight — so a document can only host
  // a WORKING overlay when its OWN `spotlightOn` is true. The primary therefore emits
  // it iff `spotlightOn`; the secondary (footer) emits it iff it authors spotlight AND
  // the primary does NOT (`spotlightOn && !peerSpotlightOn`) — so a footer-only
  // spotlight still renders exactly one (footer-owned) overlay, while both-author
  // (double-brightness) collapses to the single primary-owned one.
  const emitsSpotlightOverlay = isPrimaryDocument ? spotlightOn : spotlightOn && !peerSpotlightOn;

  const spotlightSize = Math.max(
    PAGE_SPOTLIGHT_SIZE_CLAMP.min,
    Math.min(PAGE_SPOTLIGHT_SIZE_CLAMP.max, effects?.spotlightSize ?? 400)
  );
  // Re-sanitize the color at RENDER (defence in depth — React SSR does not block
  // semicolon-delimited CSS injection inside a `style` value), matching every
  // other color in this renderer.
  // Default is a TRANSLUCENT tint (not opaque `var(--primary)`), so the out-of-box
  // spotlight is a subtle glow that does NOT obscure content near the cursor. Authors
  // who pick an explicit color (incl. TASK-519 alpha) fully override this.
  const spotlightColor =
    sanitizeAuthoringCssColor(effects?.spotlightColor) ??
    "color-mix(in srgb, var(--primary) 14%, transparent)";
  // TASK-523-01-L02 — re-sanitize the per-page canvas background at RENDER
  // (defence-in-depth, matching every other color/background in this renderer, e.g.
  // :347 — React SSR does not block a `;`-delimited CSS injection in a `style` value).
  // Present-only: a page without a background yields `undefined`.
  const canvasBackground =
    sanitizeAuthoringCssBackground(resolved.settings.background) ?? undefined;
  // TASK-535 — a full-bleed section paints a `width:100vw` bleed box that counts
  // the vertical-scrollbar gutter, so it is a few px WIDER than the content area
  // and pushes a spurious HORIZONTAL scrollbar. Guard with `overflow-x:clip` on
  // the page root (the containing block that wraps every bleed section). `clip`
  // (NOT `hidden`) is deliberate: `overflow:hidden` on one axis forces the other
  // to `auto`, establishing a scroll container that BREAKS `position:sticky`
  // descendants (the front sticky nav); `clip` clips overflow WITHOUT creating a
  // scroll container, so sticky keeps working. Per-document (NOT primary-only):
  // the footer document wraps its OWN bleed sections in its OWN root. Present-only
  // ⇒ a page with no full-bleed section keeps `rootStyle` byte-identical.
  const needsBleedOverflowGuard = docHasFullBleedSection(resolved.sections);
  // Build rootStyle when the spotlight OR a canvas background is set OR a bleed
  // guard is needed; keep the exact `--spotlight-*` vars and ADD `background` only
  // when present. When NONE apply, rootStyle stays `undefined` ⇒ byte-identical
  // <Root> vs post-522.
  const rootStyle: CSSProperties | undefined =
    spotlightOn || canvasBackground || needsBleedOverflowGuard
      ? ({
          ...(spotlightOn
            ? {
                ["--spotlight-color" as string]: spotlightColor,
                ["--spotlight-size" as string]: `${spotlightSize}px`,
              }
            : {}),
          ...(canvasBackground ? { background: canvasBackground } : {}),
          ...(needsBleedOverflowGuard ? { overflowX: "clip" as const } : {}),
        } as CSSProperties)
      : undefined;

  return (
    <Root
      className={rootClassName ?? "min-h-screen bg-white text-slate-950"}
      style={rootStyle}
      data-page-v2="true"
      {...(anyMotion ? { "data-page-motion": "true" } : {})}
      {...(spotlightOn ? { "data-page-spotlight": "true" } : {})}
      {...(pageNoise ? { "data-noise-host": "true" } : {})}
    >
      {/* Reveal HIDE state — the ONLY emit of 521-02-L02's PAGE_REVEAL_MOTION_CSS
          (committed single path). Scoped under the runtime-set [data-reveal-armed]
          so it is inert until the runtime arms (JS-required-to-HIDE). TASK-535:
          idempotent, document-agnostic selectors — emitted PER-DOCUMENT / present-only
          so a footer-only reveal is still styled; a duplicate copy is harmless. */}
      {hasSectionEffect && (
        <style data-page-motion-css dangerouslySetInnerHTML={{ __html: PAGE_REVEAL_MOTION_CSS }} />
      )}
      {/* Belt-and-suspenders: pure JS-disabled users keep reveal content visible.
          TASK-535: idempotent — per-document / present-only (harmless if duplicated). */}
      {hasSectionEffect && (
        <noscript
          dangerouslySetInnerHTML={{
            __html: '<style>[data-page-effect^="reveal"]{opacity:1;transform:none}</style>',
          }}
        />
      )}
      {/* Spotlight CSS is an idempotent, document-agnostic stylesheet — emit it
          PER-DOCUMENT / present-only so a footer-only spotlight is still styled;
          a duplicate <style> is harmless (same selectors/rules). */}
      {spotlightOn && (
        <style data-page-spotlight-css dangerouslySetInnerHTML={{ __html: PAGE_SPOTLIGHT_CSS }} />
      )}
      {/* TASK-535: the spotlight overlay is a viewport-fixed (`fixed inset-0`)
          page-global singleton — a second copy stacks another radial-gradient and
          DOUBLES the brightness. Emit the overlay DIV EXACTLY ONCE per page
          (`emitsSpotlightOverlay`): the primary owns it when EITHER document has
          spotlight; the footer owns it only for a footer-only spotlight. */}
      {emitsSpotlightOverlay && (
        <div
          aria-hidden="true"
          data-page-spotlight-overlay
          className="pointer-events-none fixed inset-0"
        />
      )}
      {/* TASK-522-05-L01 — composition-effects static CSS, a DISJOINT new node
          emitted present-only (only when a 522 surface/decoration/tilt/hover/
          layer/marquee is authored). Front/preview only (this shared renderer is
          NOT the builder canvas). TASK-535: idempotent stylesheet — per-document /
          present-only so a footer-only composition surface is still styled. */}
      {usesComposition && (
        <style
          data-page-composition-css
          dangerouslySetInnerHTML={{ __html: PAGE_COMPOSITION_EFFECTS_CSS }}
        />
      )}
      {/* ── TASK-534 ── declarative-interactivity CSS (switcher tablist + variants,
          filter chips + .is-hidden, magnetic transition). Idempotent, document-
          agnostic, present-only — emitted only when a switcher/filter/magnetic
          surface is authored. Front/preview only (this is not the builder canvas). */}
      {usesInteractivity && (
        <style
          data-page-interactivity-css
          dangerouslySetInnerHTML={{ __html: PAGE_INTERACTIVITY_CSS }}
        />
      )}
      {/* ── TASK-534 ── present-only page-root static grain overlay + its CSS. */}
      {pageNoise && (
        <>
          <style
            data-page-noise-css
            dangerouslySetInnerHTML={{ __html: INTERACTIVITY_KEYFRAMES_CSS }}
          />
          <div
            aria-hidden="true"
            data-noise-overlay="true"
            className="pointer-events-none absolute inset-0"
          />
        </>
      )}
      {resolved.sections.map((section) => (
        <PageSectionRender
          key={section.id}
          section={section}
          runtimeDataByBlockId={runtimeDataByBlockId}
        />
      ))}
      {anyMotion && (
        <script
          data-coderso-runtime-script={PAGE_EFFECTS_RUNTIME_ID}
          dangerouslySetInnerHTML={{ __html: PAGE_EFFECTS_RUNTIME_SOURCE }}
        />
      )}
    </Root>
  );
}

export {
  joinPageRenderClasses,
  type PageBlockDataAttributes,
  type PageBlockFrameRenderer,
  type PageBlockRenderProps,
  type PageBlockStyleProperties,
  type PageColumnsSlotTrailingRenderer,
  type PageInlineTextRenderer,
  type PageRenderMode,
  type PageSectionColumnTrailingRenderer,
  type PageSectionDataAttributes,
  type PageSectionLayoutMode,
  type PageSectionRenderProps,
  type PageSectionStyleProperties,
} from "./pageRendererV2Contract";
export {
  isPageBlockSelfAligned,
  pageBlockAlignmentClass,
  pageBlockEffectiveWidthClass,
  pageBlockElementDataAttributes,
  pageBlockTextDataAttributes,
  pageBlockWidthClass,
  pageTextAlignClass,
  toPageBlockElementStyle,
  toPageBlockRenderProps,
  toPageBlockStyle,
  toPageBlockTypographyStyle,
} from "./pageBlockRenderStyles";
export {
  PAGE_REVEAL_MOTION_CSS,
  pageSectionAlignmentClass,
  pageSectionCanvasGridClass,
  pageSectionGridClass,
  pageSectionJustifyClass,
  toPageSectionBleedStyle,
  toPageSectionRenderProps,
  toPageSectionStyle,
} from "./pageSectionRenderStyles";
export {
  PAGE_SPOTLIGHT_CSS,
  documentUsesSpotlight,
  resolvePageRenderTree,
} from "./pageDocumentRenderState";
