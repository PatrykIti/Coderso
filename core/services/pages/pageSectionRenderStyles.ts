import { type PageSectionBorderV2, type PageSectionV2 } from "./pageDocumentV2Types";
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";
import { PAGE_SECTION_ID_ATTRIBUTE } from "./pageResponsiveCss";
import {
  resolvePageSectionTemplate,
  getPageSectionEffectiveColumns,
  type ResolvedPageSectionTemplate,
} from "./pageSectionTemplates";
import {
  escapeAuthoringCssString,
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import {
  joinPageRenderClasses,
  type PageSectionLayoutMode,
  type PageSectionRenderProps,
  type PageSectionStyleProperties,
} from "./pageRendererV2Contract";

const scalePageSectionSpacing = (value: number, scale: number, minimum: number) =>
  value <= 0 ? 0 : Math.max(minimum, Math.round(value * scale));

export const toPageSectionVariantSpacing = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate
): PageSectionV2["spacing"] => {
  if (
    template.variant === "compact" &&
    (template.template === "content" ||
      template.template === "faq" ||
      template.template === "timeline")
  ) {
    return {
      ...section.spacing,
      paddingTop: scalePageSectionSpacing(section.spacing.paddingTop, 0.55, 16),
      paddingBottom: scalePageSectionSpacing(section.spacing.paddingBottom, 0.55, 16),
      paddingLeft: scalePageSectionSpacing(section.spacing.paddingLeft, 0.75, 16),
      paddingRight: scalePageSectionSpacing(section.spacing.paddingRight, 0.75, 16),
      gap: scalePageSectionSpacing(section.spacing.gap, 0.6, 8),
    };
  }
  return section.spacing;
};

/**
 * TASK-525-01-L01: a section is full-bleed when the template resolves to the
 * `full-width` variant OR the author toggled `style.fullBleed` (525-01-L02).
 * Full-bleed decouples the background box (painted edge-to-edge / 100vw) from
 * the CONTENT, which stays capped and centered at `layout.maxWidth`.
 */
export const isPageSectionFullBleed = (
  section: PageSectionV2,
  template: ResolvedPageSectionTemplate
): boolean => template.variant === "full-width" || section.style.fullBleed === true;

/**
 * TASK-525-01-L01 reference `.container` gutter: on viewports narrower than the
 * cap the centered content keeps a fixed 20px gutter each side (mirrors
 * `.container{width:min(var(--container),calc(100% - 40px))}` in the reference
 * `styles.css`), so full-bleed content never touches the screen edges. FIXED
 * literal — no author-controlled value.
 */
const PAGE_SECTION_FULL_BLEED_GUTTER = "20px" as const;

const toPageSectionBoxShadow = (shadow: PageSectionV2["style"]["shadow"]) =>
  shadow === "none"
    ? undefined
    : shadow === "sm"
      ? "0 6px 20px rgba(15, 23, 42, 0.08)"
      : shadow === "md"
        ? "0 14px 40px rgba(15, 23, 42, 0.12)"
        : "0 22px 60px rgba(15, 23, 42, 0.16)";

// ── TASK-533-02 REGION: per-edge section border emit ──────────────────────────
// Shared builder used by BOTH the normal content-box return (toPageSectionStyle :441)
// AND the bleed box (toPageSectionBleedStyle), so the border rides the box that paints
// the section background in each mode (content box for normal, bleed box for
// full-bleed) — framing the section like `.intro-strip{border-block:…}`. Returns `{}`
// when nothing meaningful is authored ⇒ byte-identical to post-530. Every value is a
// sanitized color / clamped-width literal / enum style from 533-02-L01 (the color is
// re-guarded here via sanitizeAuthoringCssColor for defence in depth); border props are
// fixed React camelCase inline-style keys (value positions, not rule strings).
const toPageSectionBorderStyle = (
  border: PageSectionBorderV2 | undefined
): PageSectionStyleProperties => {
  const borderStyle: PageSectionStyleProperties = {};
  if (!border) return borderStyle;
  for (const edge of ["top", "right", "bottom", "left"] as const) {
    const e = border[edge];
    if (!e) continue;
    const color = sanitizeAuthoringCssColor(e.color);
    const width = typeof e.width === "number" && Number.isFinite(e.width) ? e.width : undefined;
    const style = e.style ?? (color || width ? "solid" : undefined);
    const has = style !== "none" && (Boolean(color) || (width ?? 0) > 0);
    if (!has) continue;
    const cap = `${edge[0]!.toUpperCase()}${edge.slice(1)}` as "Top" | "Right" | "Bottom" | "Left";
    if (color) borderStyle[`border${cap}Color`] = color;
    borderStyle[`border${cap}Style`] = style;
    borderStyle[`border${cap}Width`] = `${width ?? 1}px`;
  }
  return borderStyle;
};
// ── END TASK-533-02 REGION ────────────────────────────────────────────────────

export const toPageSectionStyle = (section: PageSectionV2): PageSectionStyleProperties => {
  const template = resolvePageSectionTemplate(section);
  const spacing = toPageSectionVariantSpacing(section, template);
  const accent = sanitizeAuthoringCssColor(section.style.accent);
  // ── TASK-539-05-L01 — ONE canonical paint parse. After the write-time model
  // sanitization, `parseAuthoringCssBackgroundPaint` splits the authored
  // `background` value into its gradient image-layer stack and optional final
  // canonical color; the renderer emits ONLY `paint.image` to
  // `background-image` and ONLY `paint.color` to `background-color`. A
  // combined representation is never re-rebuilt from an unparsed whole author
  // string. The explicit `backgroundType:"none"` clear/reset and the separate
  // `backgroundType:"image"` URL field keep their existing semantics.
  const backgroundPaint =
    section.style.backgroundType === "color" || section.style.backgroundType === "gradient"
      ? parseAuthoringCssBackgroundPaint(section.style.background)
      : null;
  const backgroundColor = backgroundPaint?.color ?? undefined;
  const backgroundImageUrl =
    section.style.backgroundType === "image"
      ? sanitizeAuthoringMediaUrl(section.style.backgroundImage)
      : null;
  const backgroundImage = backgroundImageUrl
    ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
    : (backgroundPaint?.image ?? undefined);
  // ── TASK-531: append the glow after the enum shadow (comma list = two stacked).
  const boxShadow = mergeShadows(
    toPageSectionBoxShadow(section.style.shadow),
    composeGlowBoxShadow(section.style.glow)
  );
  const padding = `${spacing.paddingTop}px ${spacing.paddingRight}px ${spacing.paddingBottom}px ${spacing.paddingLeft}px`;
  const gap = `${spacing.gap}px`;
  const maxWidth = `${section.layout.maxWidth}px`;
  // TASK-525-01-L01: DECOUPLE bleed from the content cap. Full-bleed content is
  // ALWAYS capped/centered at `layout.maxWidth` (no more `maxWidth:"none"`) with
  // a min side gutter mirroring the reference `.container`; the 100vw background
  // bleed lives on the OUTER section box (see toPageSectionBleedStyle), NOT here.
  // Background/radius/shadow move to the bleed box so the paint reaches the
  // viewport edges while the content stays contained. Non-full-bleed keeps the
  // pre-525 single-node contract byte-identical (bg + cap on this content div).
  if (isPageSectionFullBleed(section, template)) {
    return {
      "--coderso-section-accent": accent ?? undefined,
      padding,
      width: `min(${maxWidth}, calc(100% - 2 * ${PAGE_SECTION_FULL_BLEED_GUTTER}))`,
      maxWidth,
      margin: "0 auto",
      gap,
    };
  }
  return {
    "--coderso-section-accent": accent ?? undefined,
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage,
    borderRadius: `${section.style.radius}px`,
    boxShadow,
    padding,
    maxWidth,
    margin: "0 auto",
    gap,
    // ── TASK-533-02: per-edge border on the NORMAL content box (the box that paints
    // this section's background). `{}` when no edge authored ⇒ byte-identical. Do NOT
    // add to the paint-empty full-bleed content-box return above — the full-bleed
    // frame rides the bleed box (toPageSectionBleedStyle) instead.
    ...toPageSectionBorderStyle(section.style.border),
  };
};

/**
 * TASK-525-01-L01: the full-bleed BACKGROUND box style, applied to the OUTER
 * `<section>` element so the background paints edge-to-edge (100vw) while the
 * content div (toPageSectionStyle) stays capped/centered at `layout.maxWidth`.
 * Returns `undefined` for non-full-bleed sections (no bleed box → the section
 * box stays byte-identical to the pre-525 output). The `100vw` bleed
 * (`width:100vw;margin-left:calc(50% - 50vw)`) is a FIXED literal; the only
 * author-derived values are the already-sanitized background color/URL and the
 * clamped radius, identical to the values `toPageSectionStyle` emitted before.
 */
export const toPageSectionBleedStyle = (
  section: PageSectionV2
): PageSectionStyleProperties | undefined => {
  const template = resolvePageSectionTemplate(section);
  if (!isPageSectionFullBleed(section, template)) return undefined;
  // TASK-539-05-L01 — same ONE canonical paint parse as `toPageSectionStyle`:
  // only `paint.image` reaches `background-image` and only `paint.color`
  // reaches `background-color` on the full-bleed paint target; the explicit
  // `backgroundType:"none"` clear/reset stays.
  const backgroundPaint =
    section.style.backgroundType === "color" || section.style.backgroundType === "gradient"
      ? parseAuthoringCssBackgroundPaint(section.style.background)
      : null;
  const backgroundColor = backgroundPaint?.color ?? undefined;
  const backgroundImageUrl =
    section.style.backgroundType === "image"
      ? sanitizeAuthoringMediaUrl(section.style.backgroundImage)
      : null;
  const backgroundImage = backgroundImageUrl
    ? `url("${escapeAuthoringCssString(backgroundImageUrl)}")`
    : (backgroundPaint?.image ?? undefined);
  return {
    // FIXED-literal 100vw bleed centered on the section's own axis.
    width: "100vw",
    marginLeft: "calc(50% - 50vw)",
    marginRight: "calc(50% - 50vw)",
    backgroundColor: backgroundColor ?? undefined,
    backgroundImage,
    borderRadius: `${section.style.radius}px`,
    boxShadow: mergeShadows(
      toPageSectionBoxShadow(section.style.shadow),
      composeGlowBoxShadow(section.style.glow)
    ),
    // ── TASK-533-02: per-edge border on the bleed box, so a full-bleed section's
    // frame draws edge-to-edge (matching where its background paints). `{}` when no
    // edge authored ⇒ byte-identical.
    ...toPageSectionBorderStyle(section.style.border),
  };
};

export const pageSectionGridClass = (columns: number) => {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-1 md:grid-cols-2";
  if (columns === 3) return "grid-cols-1 md:grid-cols-3";
  return "grid-cols-1 md:grid-cols-4";
};

export const pageSectionCanvasGridClass = (columns: number) => {
  if (columns <= 1) return "grid-cols-1";
  if (columns === 2) return "grid-cols-2";
  if (columns === 3) return "grid-cols-3";
  return "grid-cols-4";
};

export const pageSectionAlignmentClass = (align: PageSectionV2["layout"]["align"]) => {
  if (align === "center") return "items-center";
  if (align === "end") return "items-end";
  if (align === "stretch") return "items-stretch";
  return "items-start";
};

export const pageSectionJustifyClass = (justify: PageSectionV2["layout"]["justify"]) => {
  if (justify === "center") return "justify-center";
  if (justify === "end") return "justify-end";
  if (justify === "between") return "justify-between";
  return "justify-start";
};

const pageSectionTemplateClass = (template: ResolvedPageSectionTemplate) => {
  const marker = `page-section-template-${template.template}-${template.variant}`;
  if (template.template === "hero" && template.variant === "split") {
    return `${marker} text-left`;
  }
  if (template.template === "hero" && template.variant === "full-width") {
    return `${marker} min-h-[420px] place-items-center text-center`;
  }
  if (template.template === "cta") {
    if (template.variant === "full-width") {
      return `${marker} min-h-[320px] place-items-center justify-items-center text-center`;
    }
    if (template.variant === "centered") {
      return `${marker} place-items-center justify-items-center text-center`;
    }
    return `${marker} items-start justify-items-start text-left`;
  }
  if (template.template === "hero") {
    return `${marker} place-items-center text-center`;
  }
  if (template.template === "timeline") {
    if (template.variant === "horizontal") return `${marker} auto-rows-fr items-start`;
    if (template.variant === "compact") return `${marker} content-start`;
    return `${marker} content-start`;
  }
  if (template.template === "gallery") {
    if (template.variant === "cards") return `${marker} auto-rows-fr items-stretch`;
    if (template.variant === "grid") return `${marker} auto-rows-fr`;
  }
  if (template.template === "testimonials") {
    if (template.variant === "cards") return `${marker} auto-rows-fr items-stretch`;
    if (template.variant === "grid") return `${marker} auto-rows-fr`;
  }
  if (template.variant === "compact") return `${marker} content-start`;
  if (template.variant === "cards") return `${marker} auto-rows-fr`;
  if (template.variant === "horizontal") return `${marker} items-center`;
  if (template.variant === "grid") return `${marker} auto-rows-fr`;
  return marker;
};

export const toPageSectionRenderProps = (
  section: PageSectionV2,
  options?: { layoutMode?: PageSectionLayoutMode }
): PageSectionRenderProps => {
  const template = resolvePageSectionTemplate(section);
  // stackVertical contract (TASK-425): when the effective resolved value is
  // true, the section content grid collapses to a single column, beating the
  // template-floored column count. Callers pass breakpoint-resolved sections
  // (editor canvas, flattened previews), so the override cascade is already
  // merged here; the public base markup uses the desktop-resolved value and
  // pageResponsiveCss.ts emits the tablet/mobile delta.
  // `getPageSectionEffectiveColumns` owns this math so editor grid affordances
  // (ghost tiles, left/right move steps) always agree with the painted grid.
  const columns = getPageSectionEffectiveColumns(section);
  // Section scroll-reveal (TASK-521-02): append ONLY the JIT-safe standard
  // utilities (transition + the revealed-state target). The HIDE state ships
  // separately as the exported PAGE_REVEAL_MOTION_CSS static string (emitted
  // once at the page root by 521-05), scoped under the runtime-set
  // `[data-reveal-armed]` marker so content is NEVER permanently hidden in the
  // canvas / no-JS / CSP-blocked / reduced-motion / pre-arm cases.
  const scrollEffect = section.style.scrollEffect;
  const isReveal = scrollEffect === "reveal-fade" || scrollEffect === "reveal-up";
  const revealClass = isReveal
    ? "motion-safe:transition-[opacity,transform] motion-safe:duration-700 " +
      "motion-safe:data-[revealed=true]:opacity-100 motion-safe:data-[revealed=true]:translate-y-0"
    : "";
  // TASK-535 — drop the px-4 py-6 gutter for EVERY full-bleed section, not just
  // the `full-width` template variant. The style path (`toPageSectionStyle` /
  // `toPageSectionBleedStyle`) already keys the bleed box + content cap off
  // `isPageSectionFullBleed(...)` (template full-width OR the author toggling
  // `style.fullBleed`), so a `style.fullBleed`-only section got its 100vw bleed
  // box + content cap but STILL carried the utility gutter here — the class path
  // was checking only the variant. Route the className off the SAME predicate so
  // the gutter decision matches the style decision (a fullBleed-flag section
  // paints edge-to-edge with no doubled utility padding). Non-full-bleed keeps
  // `w-full px-4 py-6` byte-identical.
  const baseSectionClassName = isPageSectionFullBleed(section, template)
    ? "w-full"
    : "w-full px-4 py-6";
  // ── TASK-533-01: asymmetric column ratio. `columnTemplate` is already the strict
  // sanitizer's restricted string (rejected values were omitted at normalize), so it
  // reaches CSS as a single inline `gridTemplateColumns` VALUE (not a rule). Present:
  // it OVERRIDES the symmetric grid class (inline style beats the utility class),
  // BOTH on the published front (`pageSectionGridClass`) AND in the editor canvas
  // (`pageSectionCanvasGridClass`) — inline `gridTemplateColumns` wins over either
  // symmetric class regardless of layout mode, so the author sees the SAME asymmetric
  // ratio they'll ship (WYSIWYG / publish->front parity: every-control-visible-effect).
  // Unset: the branch is skipped ⇒ the content-grid style is byte-identical to
  // post-530 (the symmetric grid class stays the fallback tracks).
  const sectionStyle = toPageSectionStyle(section);
  const columnTemplate = section.style.columnTemplate;
  const contentStyle: PageSectionStyleProperties =
    typeof columnTemplate === "string"
      ? { ...sectionStyle, gridTemplateColumns: columnTemplate }
      : sectionStyle;
  return {
    sectionClassName: [baseSectionClassName, revealClass].filter(Boolean).join(" "),
    contentClassName: joinPageRenderClasses(
      "grid w-full",
      options?.layoutMode === "canvas-device"
        ? pageSectionCanvasGridClass(columns)
        : pageSectionGridClass(columns),
      pageSectionAlignmentClass(section.layout.align),
      pageSectionJustifyClass(section.layout.justify),
      pageSectionTemplateClass(template)
    ),
    style: contentStyle,
    dataAttributes: {
      "data-page-section": section.type,
      [PAGE_SECTION_ID_ATTRIBUTE]: section.id,
      "data-page-variant": template.variant,
      "data-page-section-template": template.template,
    },
  };
};

/**
 * Static reveal HIDE-state CSS (TASK-521-02) — the SINGLE source of the
 * before-reveal hidden state for `scrollEffect: "reveal-fade" | "reveal-up"`.
 * Scoped under BOTH `@media (prefers-reduced-motion: no-preference)` (motion-safe)
 * AND the runtime-set `[data-reveal-armed]` marker (JS-required-to-HIDE): so the
 * builder canvas, no-JS/SSR, CSP-blocked, reduced-motion, and any pre-arm
 * exception path NEVER hide content (marker absent ⇒ rule inert; content shown
 * at rest, SEO-safe). Emitted verbatim ONCE at the page root by 521-05-L03 in a
 * `<style data-page-motion-css>`; the section carries only JIT-safe standard
 * utilities (transition + `data-[revealed=true]:` revealed-state target). Once
 * the runtime arms and IntersectionObserver sets `data-revealed`, the section
 * animates to rest.
 */
export const PAGE_REVEAL_MOTION_CSS =
  "@media (prefers-reduced-motion: no-preference){" +
  // Section-level hide-state. TASK-539-05-L01 — "Reveal CSS writes only reveal
  // opacity/variable": the reveal-up translate now writes `--cx-reveal-y` on the
  // revealing SECTION itself (the renderer stamps it as a transform host), so the
  // ONE host formula composes it and no raw `transform` is written here.
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]){opacity:0}' +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]){--cx-reveal-y:1rem}' +
  // TASK-525-02-L02 per-CHILD hide-state + reveal transition so a revealing
  // section's blocks CASCADE instead of fading as one unit. Each [data-page-block]
  // frame carries its OWN opacity/transform transition; the transition-delay reads
  // the inherited `--reveal-delay` (present-only frame var, default 0ms), so a
  // section-only delay is no longer inert — the delay applies to a transition the
  // child actually has. Keyed off the SECTION's data-revealed (the 521 runtime
  // still toggles data-revealed on the section only — no new runtime/attr). All
  // rules live INSIDE the motion-safe @media + [data-reveal-armed] gate, so under
  // reduced-motion no block is ever hidden.
  //
  // CRITICAL: the transition + transition-delay MUST live on a STATE-INDEPENDENT
  // rule (NOT gated by :not([data-revealed])). Per the CSS Transitions spec, a
  // transition is governed by the transition-* properties of the AFTER-CHANGE
  // computed style. If the transition were only on the :not([data-revealed]) rule,
  // then once the section flips data-revealed that rule stops matching, the child
  // frame's transition resets to `all 0s`, and blocks JUMP to opacity:1 with no
  // fade/delay/cascade. Keeping the transition state-agnostic means it survives
  // into the revealed style so the per-block --reveal-delay actually staggers.
  //
  // TASK-535 — `--reveal-delay` is a CSS CUSTOM PROPERTY, which INHERITS. A block
  // stamps it on its OWN frame inline (toPageBlockRenderProps), so a container that
  // authors `revealDelay` sets `--reveal-delay:<n>ms` on its frame — and a NESTED
  // CHILD block that authored NO delay of its own would INHERIT the ancestor's value
  // and cascade at the ancestor's delay instead of at 0 (all children of a delayed
  // container animate together, defeating per-block stagger). FIX: reset
  // `--reveal-delay:0ms` in this same stylesheet rule, which applies to EVERY
  // [data-page-block] frame under a revealing section. An AUTHORED block's INLINE
  // `--reveal-delay:<n>ms` beats this author-stylesheet declaration (inline wins the
  // cascade), so it keeps its own value; an UNAUTHORED descendant has no inline
  // value, so this reset wins and it uses 0ms — it no longer inherits an ancestor's
  // delay. `var(--reveal-delay,0ms)` then reads that per-frame cascaded value. Pure
  // CSS (no `@property`), so it works in every browser; the frame emit is untouched
  // (present-only inline var stays byte-identical).
  '[data-reveal-armed] [data-page-effect^="reveal"] [data-page-block]' +
  "{--reveal-delay:0ms;transition:opacity .7s,transform .7s;transition-delay:var(--reveal-delay,0ms)}" +
  // Hide-state visual values only (opacity/`--cx-reveal-y`) gated by
  // :not([data-revealed]). The per-child reveal-up translate writes the reveal
  // VARIABLE on the child frame (a transform host under a revealing section), so
  // the shared formula composes it; the revealed reset writes only
  // `--cx-reveal-y:0`, never a raw `transform:none` that would clobber the
  // decoration/hover/tilt/magnetic channels composed by the same formula.
  '[data-reveal-armed] [data-page-effect^="reveal"]:not([data-revealed]) [data-page-block]' +
  "{opacity:0}" +
  '[data-reveal-armed] [data-page-effect="reveal-up"]:not([data-revealed]) [data-page-block]' +
  "{--cx-reveal-y:1rem}" +
  '[data-reveal-armed] [data-page-effect^="reveal"][data-revealed] [data-page-block]' +
  "{opacity:1;--cx-reveal-y:0}" +
  "}";

/**
 * Visual style surface of `PageBlockStyleV2` (background, text color, border,
 * radius, shadow, opacity). For most block types it stays on the block frame;
 * for {@link isPageBlockVisualElementType} types it moves onto the inner
 * visual element so "block styles" format the element the user sees (the hero
 * button, the image) instead of painting the area around it.
 */
