import {
  normalizeListingFacetConfigs,
  normalizeListingRuntimeAliases,
  type ListingFacetConfig,
  type ListingRuntimeAliasMap,
} from "../search/filterContract";
import { contentListLimitMax } from "../../widgets/core/contentList";
import {
  menuAppearanceAlignments,
  menuAppearanceDropdownDirections,
  menuAppearanceFontWeights,
  menuAppearanceMobileModes,
  menuAppearanceShadows,
  menuAppearanceTextTransforms,
  normalizeMenuAppearance,
  sanitizeMenuAppearance,
  type MenuAppearance,
} from "../menus/normalizeMenuAppearance";
import { createSecureRandomHexFragment } from "../security/secureRandom";
import { DEFAULT_TOKENS } from "../theme/tokenTypes";
import {
  PAGE_CSS_VALUE_MAX_LENGTH,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  // ── TASK-533: restricted grid-template sanitizer (asymmetric column ratio).
  sanitizeAuthoringGridTemplate,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import { sanitizeSvg } from "./svgSanitizer";

export const PAGE_DOCUMENT_SCHEMA_VERSION = 2 as const;

export const pageBreakpoints = ["desktop", "tablet", "mobile"] as const;
export const pageSectionTypes = [
  "template",
  "navigation",
  "hero",
  "content",
  "feature-grid",
  "media-split",
  "timeline",
  "gallery",
  "collection",
  "comparison",
  "filters",
  "lead-form",
  "faq",
  "testimonials",
  "cta",
  "embed",
  "custom",
] as const;
export const pageBlockTypes = [
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  "gallery",
  "form",
  "list",
  "card",
  "collection",
  "filters",
  "embed",
  "divider",
  "spacer",
  "statistic",
  "icon",
  "quote",
  "container",
  "columns",
  "group",
  // TASK-522-01-L01: the ONE new arbitrary-SVG block. Paste/upload a sanitized
  // inline SVG (svgSanitizer allowlist) with an optional stroke draw-in.
  "customSvg",
] as const;

/**
 * Layout variants of the filters block (TASK-459-02): `horizontal` renders
 * the facet bar above/near the listing, `sidebar` renders the narrow aside
 * shape. Both map onto the shared `listing-filters` markup variants.
 */
export const pageFiltersBlockLayouts = ["horizontal", "sidebar"] as const;

/**
 * Visitor pagination modes of the collection block (TASK-459-03, frozen in
 * TASK-459-01): `none` (default — exactly today's render), `paged` (numbered
 * pager + prev/next + totals over `lq.<queryId>.__page` / legacy
 * `cl.<blockId>.page` params), `load-more` (single next-page anchor). The
 * widget-era `view-all` mode stays widget-only; the v2 block does not expose
 * it.
 */
export const pageCollectionPaginationModes = ["none", "paged", "load-more"] as const;
export type PageCollectionPaginationMode = (typeof pageCollectionPaginationModes)[number];

/**
 * Single collection limit/page-size bound (TASK-459-03 clamp unification).
 * Owned by the widget render contract (`contentListLimitMax = 24`); the
 * editor schema, control clamps, and runtime binding all read THIS value —
 * the old schema/editor 1..50 ceiling silently truncated to 24 at runtime.
 * Stored documents with out-of-range values normalize on read (no rewrite).
 */
export const PAGE_COLLECTION_LIMIT_CLAMP = { min: 1, max: contentListLimitMax } as const;

/**
 * Facet vocabulary of the filters block — the SAME generic, field-driven
 * facet contract the listing runtime owns (`core/services/search/
 * filterContract.ts`). Kinds/operators are mirrored here only for the JSON
 * schema; normalization delegates to `normalizeListingFacetConfigs` so the
 * stored shape stays canonical with the runtime contract.
 */
export const pageFiltersFacetKinds = [
  "taxonomy",
  "checkbox",
  "radio",
  "range",
  "date-range",
  "sort",
] as const;
export const pageFiltersFacetOperators = [
  "eq",
  "neq",
  "in",
  "nin",
  "contains",
  "startsWith",
  "gt",
  "gte",
  "lt",
  "lte",
  "between",
  "exists",
] as const;
export const PAGE_FILTERS_MAX_FACETS = 24 as const;

export const pageSectionVariants = [
  "default",
  "split",
  "centered",
  "full-width",
  "cards",
  "grid",
  "horizontal",
  "compact",
] as const;
export const pageSectionAlignments = ["start", "center", "end", "stretch"] as const;
export const pageSectionJustify = ["start", "center", "end", "between"] as const;
export const pageShadowTokens = ["none", "sm", "md", "lg"] as const;
export const pageBackgroundTypes = ["none", "color", "gradient", "image", "video"] as const;
export const pageBlockBorderStyles = ["none", "solid", "dashed", "dotted"] as const;
export const pageButtonTargets = ["self", "blank"] as const;
export const pageButtonVariants = ["primary", "secondary", "ghost", "link"] as const;
export const pageButtonSizes = ["sm", "md", "lg"] as const;
export const pageBadgeVariants = ["solid", "soft", "outline"] as const;
export const pageBadgeSizes = ["2xs", "xs", "sm", "md"] as const;
export const pageBadgeShapes = ["pill", "rounded", "square"] as const;
export const pageBadgeWeights = ["normal", "medium", "semibold", "bold"] as const;
export const pageBadgeIconPositions = ["start", "end"] as const;
export const pageBadgeIcons = ["check", "sparkles", "star", "zap", "shield", "heart"] as const;
export const pageTextFormats = ["plain", "rich"] as const;
export const pageTextAlignments = ["left", "center", "right"] as const;
export const pageHeadingLevels = ["h1", "h2", "h3", "h4", "h5", "h6"] as const;
export const pageBlockWidths = ["auto", "full"] as const;
export const pageImageFits = ["cover", "contain"] as const;
export const pageGalleryLayouts = ["grid", "carousel", "masonry"] as const;
export const pageDividerTones = ["neutral", "muted", "accent"] as const;
export const pageColumnDistributions = ["equal", "auto"] as const;
export const pageGroupDirections = ["row", "column"] as const;
export const pageBlockSlotKeys = [
  "children",
  "column:1",
  "column:2",
  "column:3",
  "column:4",
] as const;

/**
 * TASK-521 shared motion/effects vocabulary (single source of truth). All
 * fields modelled here are PRESENT-ONLY (omitted when unauthored so legacy
 * documents stay byte-identical) and are consumed read-only by the section
 * render (521-02), hero (521-03 owns its own tilt vocab), animated-icon block
 * (521-04) and per-page effects (521-05). NO schemaVersion bump, NO migration.
 */
export const pageSectionScrollEffects = ["none", "reveal-fade", "reveal-up", "parallax"] as const;
export type PageSectionScrollEffect = (typeof pageSectionScrollEffects)[number];
export const PAGE_PARALLAX_INTENSITY_CLAMP = { min: 0, max: 40 } as const; // px travel
export const PAGE_SPOTLIGHT_SIZE_CLAMP = { min: 120, max: 900 } as const; // px radius
export const animatedIconAnimations = ["none", "spin", "pulse", "bounce", "draw"] as const;
export type AnimatedIconAnimation = (typeof animatedIconAnimations)[number];
export const ANIMATED_ICON_SIZE_CLAMP = { min: 16, max: 160 } as const; // px
export const ANIMATED_ICON_SPEED_CLAMP = { min: 400, max: 4000 } as const; // ms
export const animatedIconNames = [
  "sparkles",
  "star",
  "heart",
  "zap",
  "check",
  "shield",
  "arrow-right",
  "bell",
  "rocket",
  "loader",
] as const; // curated set (extendable)
export type AnimatedIconName = (typeof animatedIconNames)[number];
export const ANIMATED_ICON_NAME_PATTERN = /^[a-z0-9-]{1,48}$/;
/**
 * Resolve an authored icon name to the curated allowlist. Uses a pattern gate
 * then Set-membership (never a bare bracket lookup on a prototype-carrying map),
 * failing soft to `"sparkles"` so a stored out-of-set / injection-shaped value
 * never reaches the renderer.
 */
export const resolveAnimatedIconName = (value: unknown): AnimatedIconName => {
  if (typeof value !== "string" || !ANIMATED_ICON_NAME_PATTERN.test(value)) return "sparkles";
  return (animatedIconNames as readonly string[]).includes(value)
    ? (value as AnimatedIconName)
    : "sparkles";
};

/**
 * Token-backed typography contract (TASK-424). Option tokens reference the
 * theme token stack (`DesignTokens.typography` in `core/services/theme/
 * tokenTypes.ts`, emitted as `--font-sans`/`--font-display` and
 * `--text-2xs`...`--text-5xl` by `core/ui/theme/tokenCss.ts`). All typography
 * style fields are nullable and default to unset, so documents saved before
 * this contract render exactly as before (the baked utility classes stay the
 * fallback). The scale tops out at `5xl` (3rem = 48px), matching the baked h1
 * utility class so the largest explicit preset never shrinks a default h1.
 */
export const pageTypographyFontFamilies = ["sans", "display"] as const;
export const pageTypographyFontSizes = [
  "2xs",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
] as const;
export const pageTypographyFontWeights = ["normal", "medium", "semibold", "bold"] as const;
/** Unitless `line-height` bounds for block typography. */
export const PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP = { min: 1, max: 2.5 } as const;
/** `letter-spacing` bounds in px for block typography. */
export const PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP = { min: -2, max: 8 } as const;
/** Block frame padding/margin bounds in px. */
export const PAGE_BLOCK_BOX_SPACING_CLAMP = { min: 0, max: 240 } as const;
/** Block border-width bounds in px. */
export const PAGE_BLOCK_BORDER_WIDTH_CLAMP = { min: 0, max: 12 } as const;
/**
 * Bounds for the section-column placement field (`style.column`, owner
 * finding #5 round 3). Mirrors the `layout.columns` clamp: a section never
 * paints more than four columns.
 */
export const PAGE_SECTION_BLOCK_COLUMN_CLAMP = { min: 1, max: 4 } as const;
// ── TASK-533-01 REGION: block grid-span bounds + column-ratio presets ─────────
/** Block grid-span bounds — how many columns/rows a block may span in the section
 *  grid (`grid-column: span N` / `grid-row: span N`). Reproduces
 *  `.project-card.large{grid-row:span 2}`. */
export const PAGE_BLOCK_SPAN_CLAMP = { min: 1, max: 4 } as const;
/**
 * Curated safe `columnTemplate` presets for the section "Column ratio" control.
 * Every entry is `sanitizeAuthoringGridTemplate`-passing (round-trips unchanged),
 * reproducing the reference intro (1/1.2fr), realizacje (1.15/.85fr), and hero
 * (minmax) ratios. Naturally constrains the authored value to a sanitizer-valid
 * string; the write boundary re-sanitizes any tampered payload regardless.
 */
export const pageColumnTemplatePresets = [
  "1fr 1fr",
  "1.15fr .85fr",
  "1fr 1.2fr",
  "1fr .95fr",
  "minmax(0,1fr) minmax(420px,.9fr)",
] as const;
// ── END TASK-533-01 REGION ────────────────────────────────────────────────────
// ── TASK-533-02 REGION: per-edge section border width bounds ──────────────────
/** Per-edge section border width bounds in px (`border-{edge}-width`). Reproduces
 *  `.intro-strip{border-block:1px solid …}`. */
export const PAGE_SECTION_BORDER_WIDTH_CLAMP = { min: 0, max: 16 } as const;
// ── END TASK-533-02 REGION ────────────────────────────────────────────────────
/**
 * Block types whose rendered output paints user-editable text, and therefore
 * may expose (and paint) the typography style surface. Layout, media, and
 * data-bound blocks stay outside this contract.
 */
export const pageTypographyCapableBlockTypes = [
  "heading",
  "text",
  "button",
  "list",
  "card",
  "statistic",
  "quote",
] as const;
export const pageTextColorMarkCapableBlockTypes = ["heading", "text", "quote"] as const;
export const pageTextMarkCapableBlockTypes = pageTextColorMarkCapableBlockTypes;
export const PAGE_TEXT_MARK_MAX = 24 as const;
export const PAGE_BLOCK_MAX_TREE_DEPTH = 4 as const;
export const PAGE_BLOCK_MAX_CHILDREN_PER_SLOT = 24 as const;

/**
 * TASK-522 composable-hero toolkit vocabulary (owned here, imported read-only by
 * every consumer subtask 522-02..05). Every field these describe is PRESENT-ONLY
 * (omitted when unauthored so legacy documents stay byte-identical), reject-unknown
 * allowlisted, and — where a motion is involved — reduced-motion-safe. NO
 * schemaVersion bump, NO migration, NO new dependency.
 *
 * `"none"` (decoration/tilt/surface/hover) and `"flow"` (composition) are the
 * FIRST member of their enum: they are the present-only RESET path the normalizer
 * OMITS, so toggling an effect off returns the doc to byte identity. `"radiate"`
 * is the `.map-pulse`/`@keyframes mapPulse` concentric box-shadow ring (distinct
 * from `"pulse"` = `.sun-ring`/pulseRing scale+opacity).
 */
export const pageBlockDecorationMotions = [
  "none",
  "float",
  "drift",
  "pulse",
  "orbit",
  "radiate",
] as const;
export type PageBlockDecorationMotion = (typeof pageBlockDecorationMotions)[number];
export const pageTiltStrengths = ["none", "subtle", "strong"] as const;
export type PageTiltStrength = (typeof pageTiltStrengths)[number];
export const pageSurfacePresets = [
  "none",
  "glass",
  "glass-grid",
  "radial-glow",
  "ambient-orbs",
] as const;
export type PageSurfacePreset = (typeof pageSurfacePresets)[number];
export const pageBlockHoverEffects = ["none", "glow-reveal", "lift", "scale", "lift-glow"] as const;
export type PageBlockHoverEffect = (typeof pageBlockHoverEffects)[number];
export const pageCompositions = ["flow", "layered"] as const;
export type PageComposition = (typeof pageCompositions)[number];
export const pageLayerAnchors = [
  "top-left",
  "top",
  "top-right",
  "left",
  "center",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;
export type PageLayerAnchor = (typeof pageLayerAnchors)[number];
export const pageMarqueeDirections = ["left", "right"] as const;
export type PageMarqueeDirection = (typeof pageMarqueeDirections)[number];
export const PAGE_DECORATION_DELAY_CLAMP = { min: 0, max: 4000 } as const; // ms
// TASK-525-02-L01: per-block scroll-reveal stagger delay (ms). Same bound as the
// decoration delay; emitted only as the bounded `--reveal-delay` custom property.
export const PAGE_REVEAL_DELAY_CLAMP = { min: 0, max: 4000 } as const; // ms
export const PAGE_DECORATION_DURATION_CLAMP = { min: 2000, max: 16000 } as const; // ms
export const PAGE_LAYER_X_CLAMP = { min: -50, max: 150 } as const; // %
export const PAGE_LAYER_Y_CLAMP = { min: -50, max: 150 } as const; // %
// TASK-523-02 — occlusion-proofing: the cursor-spotlight overlay paints at a
// FIXED z-index of 30 (PAGE_SPOTLIGHT_CSS, pageRendererV2.tsx) inside the shared
// root stacking context, strictly below the sticky nav (z-40). A layered-canvas
// [data-layer] maps `layer.z` directly to `z-index` (pageCompositionEffects.tsx),
// so its max is capped STRICTLY BELOW the overlay (30) — no authorable layer can
// reach/exceed the spotlight and occlude the glow. Do NOT raise max to/above 30
// without re-approving the spotlight-occlusion tradeoff.
export const PAGE_LAYER_Z_CLAMP = { min: 0, max: 20 } as const;
export const PAGE_MARQUEE_SPEED_CLAMP = { min: 8, max: 40 } as const; // s
/** Custom-SVG block: stroke draw-in speed bounds (ms) + max sanitized byte cap. */
export const PAGE_DRAW_SPEED_CLAMP = { min: 600, max: 6000 } as const; // ms
export const PAGE_CUSTOM_SVG_MAX_BYTES = 24576 as const; // 24 KiB

// ── TASK-531 REGION (glow model: clamps + type) ───────────────────────────────
// Arbitrary colored box-shadow (glow) — a STRUCTURED spec (never a raw author
// string). `color` is sanitized via `sanitizeAuthoringCssColor` at write; the
// numeric fields are clamped, then composed into a fixed `box-shadow` template
// at render (`composeGlowBoxShadow`, `pageGlow.ts`). See TASK-531 §G-3.
export const PAGE_GLOW_BLUR_CLAMP = { min: 0, max: 120 } as const; // px
export const PAGE_GLOW_SPREAD_CLAMP = { min: -40, max: 80 } as const; // px
export const PAGE_GLOW_OFFSET_CLAMP = { min: -80, max: 80 } as const; // px (x AND y)

export type PageGlow = {
  /** REQUIRED — sanitized via `sanitizeAuthoringCssColor` at write; whole glow OMITTED when invalid. */
  color: string;
  /** PAGE_GLOW_BLUR_CLAMP (default 24 at render). */
  blur?: number;
  /** PAGE_GLOW_SPREAD_CLAMP (default 0). */
  spread?: number;
  /** PAGE_GLOW_OFFSET_CLAMP (default 0). */
  x?: number;
  /** PAGE_GLOW_OFFSET_CLAMP (default 0). */
  y?: number;
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

export type PageBlockDecoration = {
  motion: PageBlockDecorationMotion;
  delay?: number;
  duration?: number;
};
export type PageBlockLayer = { x?: number; y?: number; z?: number; anchor?: PageLayerAnchor };
export type PageBlockMarquee = {
  speed?: number;
  direction?: PageMarqueeDirection;
  seamless?: boolean;
};

export type PageBreakpoint = (typeof pageBreakpoints)[number];
export type PageSectionType = (typeof pageSectionTypes)[number];
export type PageBlockType = (typeof pageBlockTypes)[number];
export type PageSectionVariant = (typeof pageSectionVariants)[number];
export type PageSectionAlignment = (typeof pageSectionAlignments)[number];
export type PageSectionJustify = (typeof pageSectionJustify)[number];
export type PageShadowToken = (typeof pageShadowTokens)[number];
export type PageBackgroundType = (typeof pageBackgroundTypes)[number];
export type PageBlockBorderStyle = (typeof pageBlockBorderStyles)[number];
export type PageBlockWidth = (typeof pageBlockWidths)[number];
export type PageBadgeVariant = (typeof pageBadgeVariants)[number];
export type PageBadgeSize = (typeof pageBadgeSizes)[number];
export type PageBadgeShape = (typeof pageBadgeShapes)[number];
export type PageBadgeWeight = (typeof pageBadgeWeights)[number];
export type PageBadgeIconPosition = (typeof pageBadgeIconPositions)[number];
export type PageBadgeIcon = (typeof pageBadgeIcons)[number];
export type PageColumnDistribution = (typeof pageColumnDistributions)[number];
export type PageGroupDirection = (typeof pageGroupDirections)[number];
export type PageBlockSlotKey = (typeof pageBlockSlotKeys)[number];
export type PageTypographyFontFamily = (typeof pageTypographyFontFamilies)[number];
export type PageTypographyFontSize = (typeof pageTypographyFontSizes)[number];
export type PageTypographyFontWeight = (typeof pageTypographyFontWeights)[number];
export type PageTypographyCapableBlockType = (typeof pageTypographyCapableBlockTypes)[number];
export type PageTextColorMarkCapableBlockType = (typeof pageTextColorMarkCapableBlockTypes)[number];
export type PageTextMarkCapableBlockType = PageTextColorMarkCapableBlockType;
export type PageTextColorMark = {
  type: "color";
  from: number;
  to: number;
  color: string;
};
export type PageTextHighlightMark = {
  type: "highlight";
  from: number;
  to: number;
  color: string;
};
export type PageTextLinkMark = {
  type: "link";
  from: number;
  to: number;
  href: string;
};
export type PageTextStructuralMark = {
  type: "bold" | "italic";
  from: number;
  to: number;
};
export type PageTextMark =
  | PageTextColorMark
  | PageTextHighlightMark
  | PageTextLinkMark
  | PageTextStructuralMark;

export const isPageTypographyCapableBlockType = (
  type: PageBlockType
): type is PageTypographyCapableBlockType =>
  (pageTypographyCapableBlockTypes as readonly string[]).includes(type);

export const isPageTextColorMarkCapableBlockType = (
  type: PageBlockType
): type is PageTextColorMarkCapableBlockType =>
  (pageTextColorMarkCapableBlockTypes as readonly string[]).includes(type);

export const isPageTextMarkCapableBlockType = (
  type: PageBlockType
): type is PageTextMarkCapableBlockType =>
  (pageTextMarkCapableBlockTypes as readonly string[]).includes(type);

/**
 * CSS values for typography tokens. Family and size tokens resolve through the
 * theme CSS variables on the published front (`toCssVariables` paints them on
 * `:root`), with the `DEFAULT_TOKENS` value as a literal fallback so the admin
 * canvas (which does not mount the front token stylesheet) paints the same
 * defaults. Weight tokens map to plain numeric weights.
 */
export const pageTypographyFontFamilyCssValues: Record<PageTypographyFontFamily, string> = {
  sans: `var(--font-sans, ${DEFAULT_TOKENS.typography.sans})`,
  display: `var(--font-display, ${DEFAULT_TOKENS.typography.display})`,
};

export const pageTypographyFontSizeCssValues: Record<PageTypographyFontSize, string> = {
  "2xs": `var(--text-2xs, ${DEFAULT_TOKENS.typography["2xs"]})`,
  xs: `var(--text-xs, ${DEFAULT_TOKENS.typography.xs})`,
  sm: `var(--text-sm, ${DEFAULT_TOKENS.typography.sm})`,
  md: `var(--text-md, ${DEFAULT_TOKENS.typography.md})`,
  lg: `var(--text-lg, ${DEFAULT_TOKENS.typography.lg})`,
  xl: `var(--text-xl, ${DEFAULT_TOKENS.typography.xl})`,
  "2xl": `var(--text-2xl, ${DEFAULT_TOKENS.typography["2xl"]})`,
  "3xl": `var(--text-3xl, ${DEFAULT_TOKENS.typography["3xl"]})`,
  "4xl": `var(--text-4xl, ${DEFAULT_TOKENS.typography["4xl"]})`,
  "5xl": `var(--text-5xl, ${DEFAULT_TOKENS.typography["5xl"]})`,
};

export const pageTypographyFontWeightCssValues: Record<PageTypographyFontWeight, string> = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
};

export type PageDocumentSeoV2 = {
  title?: string;
  description?: string;
  image?: string | null;
};

export type PageCollectionLinkV2 = {
  contentTypeId: string;
  pageRole: "canonical-list-page" | "supporting-page";
  compositionKey?: string | null;
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};

export type PageDocumentSettingsV2 = {
  template: string;
  showInNav: boolean;
  revisionRetention?: number;
  collectionLink?: PageCollectionLinkV2;
  /**
   * Menu-host editor vehicle (TASK-458-03): the menu design editor carries
   * the menu's `MenuAppearance` draft through the shared editor document so
   * appearance edits ride the regular draft/save discipline. Validation is
   * owned by `normalizeMenuAppearance` (strict on write, fail-closed
   * sanitize on stored read). Page and page-template documents never set
   * this field; absent input stays absent in the normalized output.
   */
  menuAppearance?: MenuAppearance;
  /**
   * TASK-521-05 per-page interaction effects (cursor-follow spotlight, …).
   * Present-only additive sub-object (the `menuAppearance` precedent): omitted
   * when empty so `defaultSettings` and legacy documents stay byte-identical.
   */
  effects?: PageEffectsV2;
  /**
   * TASK-523-01 per-page canvas background — a safe solid color OR CSS gradient.
   * Present-only: omitted when unset so `defaultSettings` and legacy/post-522
   * documents stay byte-identical. The ONLY path a value reaches this field is
   * `sanitizeAuthoringCssBackground` (safe color/gradient, else the key is dropped),
   * mirrored at RENDER (523-01-L02) — no raw string is ever stored or rendered.
   */
  background?: string;
};

/**
 * TASK-521-01-L02 per-page effects config. All fields present-only; the whole
 * object is omitted when empty. `spotlightColor` flows through `readSafeColor`
 * (alpha-capable via TASK-519) — the ONLY path a color reaches the runtime CSS
 * var, so no raw/injection-shaped value is ever stored.
 */
export type PageEffectsV2 = {
  cursorSpotlight?: boolean;
  spotlightColor?: string;
  spotlightSize?: number;
};

export type PageSectionLayoutV2 = {
  columns: number;
  align: PageSectionAlignment;
  justify: PageSectionJustify;
  maxWidth: number;
  /**
   * Vertical-stacking switch (TASK-425). When the EFFECTIVE resolved value at
   * a breakpoint is `true`, the section content grid is forced to a single
   * column, beating the template-floored column count. It is per-breakpoint
   * override-able through `responsive[bp].layout.stackVertical` like every
   * other layout key; the typical authoring shape keeps the base `false` and
   * sets `responsive.mobile.layout.stackVertical = true`. Optional on input;
   * full normalization defaults it to `false`, so documents saved before this
   * field render exactly as before.
   */
  stackVertical?: boolean;
};

export type PageSectionStyleV2 = {
  background: string;
  backgroundType: PageBackgroundType;
  backgroundImage?: string | null;
  accent: string;
  radius: number;
  shadow: PageShadowToken;
  /**
   * TASK-521-02 front-only scroll motion. Present-only: `"none"` is treated as
   * absence (omitted), so toggling an effect off returns the doc to byte
   * identity. `defaultStyle` deliberately omits these so an un-authored section
   * serializes unchanged. Authored + rendered DEVICE-UNIFORM (desktop-resolved).
   */
  scrollEffect?: PageSectionScrollEffect;
  /** px travel; meaningful only for `scrollEffect === "parallax"`. */
  parallaxIntensity?: number;
  /**
   * TASK-522-01-L03 premium surface preset (glass / grid / radial-glow /
   * ambient-orbs). Present-only: `"none"` omitted so an unstyled section stays
   * byte-identical. STATIC (renders under reduced-motion; only the ambient-orb
   * drift animates). Retints off the section's `accent`.
   */
  surfacePreset?: PageSurfacePreset;
  /**
   * TASK-522-01-L03 layered-canvas mode. `"layered"` turns the section into a
   * positioning context whose children place absolutely by `block.style.layer`;
   * `"flow"` (default, omitted) keeps the normal flex/grid flow.
   */
  composition?: PageComposition;
  /**
   * TASK-525-01-L02 full-bleed background. When `true`, the section paints its
   * background box edge-to-edge (100vw) while its CONTENT stays capped/centered
   * at `layout.maxWidth`. Present-only: omitted when `false`/unset so an
   * un-authored section serializes byte-identically (the `full-width` template
   * variant still bleeds by default, independent of this flag).
   */
  fullBleed?: boolean;
  // ── TASK-531 REGION ──────────────────────────────────────────────────────
  /**
   * TASK-531 arbitrary colored glow box-shadow on the section box. Present-only:
   * omitted when unauthored OR when its `color` fails sanitization. Composed to a
   * fixed `box-shadow` template at render (`composeGlowBoxShadow`), APPENDED after
   * the enum `shadow` when both are present.
   */
  glow?: PageGlow;
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-533-01 REGION: asymmetric column ratio (present-only, sanitized) ──
  /**
   * TASK-533-01 restricted `grid-template-columns` value (e.g. `"1.15fr .85fr"`,
   * `"1fr 1.2fr"`, `"minmax(0,1fr) minmax(420px,.9fr)"`). When set it OVERRIDES the
   * symmetric grid class with an inline `gridTemplateColumns`, reproducing the intro
   * (1/1.2fr) and realizacje (1.15/.85fr) reference ratios. Strict-sanitized via
   * `sanitizeAuthoringGridTemplate` (the only author string reaching a CSS value
   * position); rejection ⇒ OMITTED. Present-only: unset ⇒ byte-identical to post-530.
   */
  columnTemplate?: string;
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
  // ── TASK-533-02 REGION: per-edge section border (present-only) ─────────────
  /**
   * TASK-533-02 per-edge section border (`border-block` = top+bottom minimum, full
   * four-edge supported). Present-only: omitted when no edge is authored ⇒
   * byte-identical to post-530. Colors via `sanitizeAuthoringCssColor`, widths clamped
   * to {@link PAGE_SECTION_BORDER_WIDTH_CLAMP}, style enum-validated. Reproduces
   * `.intro-strip{border-block:1px solid rgba(255,255,255,.1)}`.
   */
  border?: PageSectionBorderV2;
  // ── END TASK-533-02 REGION ────────────────────────────────────────────────
};

// ── TASK-533-02 REGION: per-edge section border types ─────────────────────────
/** One border edge: color (sanitized), width (clamped px), style (enum). */
export type PageSectionBorderEdgeV2 = {
  color?: string | null;
  width?: number;
  style?: PageBlockBorderStyle;
};
/** Per-edge section border; mirrors {@link PageBoxSpacingV2}'s four-optional-edge
 *  shape with a per-edge value. Present-only: omitted whole-object when empty. */
export type PageSectionBorderV2 = {
  top?: PageSectionBorderEdgeV2;
  right?: PageSectionBorderEdgeV2;
  bottom?: PageSectionBorderEdgeV2;
  left?: PageSectionBorderEdgeV2;
};
// ── END TASK-533-02 REGION ────────────────────────────────────────────────────

export type PageSectionSpacingV2 = {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  gap: number;
};

export type PageSectionVisibilityV2 = {
  visible: boolean;
  authOnly: boolean;
  anchor?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type PageBoxSpacingV2 = {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
};

export type PageBlockStyleV2 = {
  align?: "left" | "center" | "right";
  width?: PageBlockWidth;
  /**
   * Section-column placement (owner finding #5, round 3). Meaningful only on
   * SECTION ROOT blocks inside a section whose composition column count is
   * >= 2: the shared renderer then stacks the block into that column
   * (clamped to the painted count). `null`/unset keeps the legacy auto-flow
   * placement (`column = index % N`), so documents authored before this field
   * render byte-identically. The field rides the existing responsive style
   * override machinery in the editor model, but it is STRUCTURAL on the
   * public front: `pageResponsiveCss` diagnoses per-breakpoint overrides as
   * `not_css_expressible` (cross-breakpoint column changes are editor/preview
   * resolved only; `layout.stackVertical` is the supported mobile collapse).
   */
  column?: number | null;
  textColor?: string | null;
  background?: string | null;
  backgroundType?: PageBackgroundType;
  backgroundImage?: string | null;
  opacity?: number;
  radius?: number;
  shadow?: PageShadowToken;
  borderColor?: string | null;
  borderWidth?: number;
  borderStyle?: PageBlockBorderStyle;
  padding?: PageBoxSpacingV2;
  margin?: PageBoxSpacingV2;
  /** Token-backed typography (TASK-424); null/unset keeps the baked classes. */
  fontFamily?: PageTypographyFontFamily | null;
  fontSize?: PageTypographyFontSize | null;
  fontWeight?: PageTypographyFontWeight | null;
  /** Unitless line-height clamped to {@link PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP}. */
  lineHeight?: number | null;
  /** Letter-spacing in px clamped to {@link PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP}. */
  letterSpacing?: number | null;
  /**
   * TASK-522 composable-hero toolkit style fields (all PRESENT-ONLY — omitted
   * when unauthored so legacy/no-effect blocks stay byte-identical). The model
   * accepts every field under the responsive-override channel, but only the
   * NUMERIC `layer.x/y/z` offsets actually RENDER per device (via the
   * 522-05-L02 `--layer-*` seam); the data-attr/class effects
   * (decoration/tilt/surfacePreset/hoverEffect/composition/marquee) are
   * BASE-ONLY and authored `responsive:false` (see 522-01-L03).
   */
  /** Floating-drift decoration; `"none"` resets (whole object omitted). */
  decoration?: PageBlockDecoration;
  /** Tilt-toward-pointer on any block (reuses the 521-style runtime pattern). */
  tilt?: PageTiltStrength;
  /** Optional glare/sheen sweep on tilt. */
  tiltGlare?: boolean;
  /** Placement inside a layered canvas ancestor (x/y in %, z-index, anchor). */
  layer?: PageBlockLayer;
  /**
   * TASK-524-02: independent glass/glow tint (alpha-capable), seeds
   * `--surface-glow`/`--deco-ring`/`--orb-color` INDEPENDENT of `background`.
   * Present-only: omitted when unset (never `null`/`""`); sanitized via
   * `sanitizeAuthoringCssColor` at the write boundary.
   */
  surfaceTint?: string;
  /** Premium surface preset (glass / grid / radial-glow / ambient-orbs). */
  surfacePreset?: PageSurfacePreset;
  /** Hover-effect preset (glow-reveal / lift / scale / lift-glow). */
  hoverEffect?: PageBlockHoverEffect;
  /** Ticker/marquee — group/row block only (`@keyframes ticker`). */
  marquee?: PageBlockMarquee;
  /** Layout-block canvas mode (`"layered"` positions children absolutely). */
  composition?: PageComposition;
  /**
   * TASK-525-02-L01 per-block scroll-reveal stagger (ms, clamped
   * `PAGE_REVEAL_DELAY_CLAMP`). Emitted as the `--reveal-delay` custom property
   * consumed by the reveal `transition-delay`, so a revealing section's children
   * CASCADE (each block fades on its own delay) rather than fading as one unit.
   * Present-only: omitted when unset so an un-authored block is byte-identical.
   *
   * SCOPE (TASK-535, intended + documented): this is a STAGGER *within a revealing
   * section*, NOT a standalone per-block reveal trigger. The cascade is driven by the
   * SECTION's `scrollEffect` reveal (the runtime toggles `data-revealed` on the
   * SECTION only, and `PAGE_REVEAL_MOTION_CSS` is scoped under `[data-page-effect^=
   * "reveal"]`). A block whose ONLY motion is `revealDelay`, inside a section with no
   * reveal `scrollEffect`, is INERT by design — set a section reveal effect to make
   * the stagger take effect. It also does NOT inherit onto un-delayed nested children
   * (the reveal CSS resets `--reveal-delay` per frame; see `PAGE_REVEAL_MOTION_CSS`).
   */
  revealDelay?: number;
  // ── TASK-531 REGION ──────────────────────────────────────────────────────
  /**
   * TASK-531 arbitrary colored glow box-shadow on the block frame. Same shape +
   * present-only semantics as the section field (composed at render, APPENDED
   * after the enum `shadow` when both are present).
   */
  glow?: PageGlow;
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-533-01 REGION: block grid span (present-only, clamped ints) ───────
  /**
   * TASK-533-01 span N columns in the section grid (`grid-column: span N`,
   * clamped {@link PAGE_BLOCK_SPAN_CLAMP}). Present-only: omitted when unset ⇒
   * byte-identical to post-530.
   */
  colSpan?: number;
  /**
   * TASK-533-01 span N rows in the section grid (`grid-row: span N`, clamped
   * {@link PAGE_BLOCK_SPAN_CLAMP}). Reproduces `.project-card.large{grid-row:span 2}`.
   * Present-only: omitted when unset ⇒ byte-identical to post-530.
   */
  rowSpan?: number;
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
};

export type PageBlockVisibilityV2 = {
  visible: boolean;
};

export type PageBlockResponsiveOverrideV2 = {
  props?: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility?: Partial<PageBlockVisibilityV2>;
};

export type PageBlockV2 = {
  id: string;
  type: PageBlockType;
  props: Record<string, unknown>;
  style?: PageBlockStyleV2;
  visibility: PageBlockVisibilityV2;
  responsive?: Partial<Record<Exclude<PageBreakpoint, "desktop">, PageBlockResponsiveOverrideV2>>;
  slots?: Partial<Record<PageBlockSlotKey, PageBlockV2[]>>;
};

export type PageSectionResponsiveOverrideV2 = {
  layout?: Partial<PageSectionLayoutV2>;
  style?: Partial<PageSectionStyleV2>;
  spacing?: Partial<PageSectionSpacingV2>;
  visibility?: Partial<PageSectionVisibilityV2>;
};

export type PageSectionV2 = {
  id: string;
  type: PageSectionType;
  name: string;
  variant: PageSectionVariant;
  layout: PageSectionLayoutV2;
  style: PageSectionStyleV2;
  spacing: PageSectionSpacingV2;
  visibility: PageSectionVisibilityV2;
  responsive: Partial<Record<Exclude<PageBreakpoint, "desktop">, PageSectionResponsiveOverrideV2>>;
  blocks: PageBlockV2[];
};

export type PageDocumentV2 = {
  schemaVersion: typeof PAGE_DOCUMENT_SCHEMA_VERSION;
  breakpoints: PageBreakpoint[];
  seo: PageDocumentSeoV2;
  settings: PageDocumentSettingsV2;
  sections: PageSectionV2[];
};

export type PageDocumentErrorCode = "page_document_invalid" | "page_document_unknown_field";

export class PageDocumentError extends Error {
  code: PageDocumentErrorCode;
  path?: string;

  constructor(code: PageDocumentErrorCode, message: string, path?: string) {
    super(message);
    this.name = "PageDocumentError";
    this.code = code;
    this.path = path;
  }
}

type NormalizeMode = "stored-read" | "write";
type RecordValue = Record<string, unknown>;
type MobileBreakpoint = Exclude<PageBreakpoint, "desktop">;
type BlockNormalizationContext = {
  mode: NormalizeMode;
  blockIds: Set<string>;
  visiting: WeakSet<object>;
};

const pageBoxSpacingKeys = ["top", "right", "bottom", "left"] as const;
const pageBlockStyleKeys = [
  "align",
  "width",
  "column",
  "textColor",
  "background",
  "backgroundType",
  "backgroundImage",
  "opacity",
  "radius",
  "shadow",
  "borderColor",
  "borderWidth",
  "borderStyle",
  "padding",
  "margin",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "lineHeight",
  "letterSpacing",
  // TASK-522-01-L03 composition/decoration style fields (present-only).
  "decoration",
  "tilt",
  "tiltGlare",
  "layer",
  // TASK-524-02-L01 independent glass tint (present-only).
  "surfaceTint",
  "surfacePreset",
  "hoverEffect",
  "marquee",
  "composition",
  // TASK-525-02-L01 per-block staggered reveal (present-only number).
  "revealDelay",
  // ── TASK-531 REGION: arbitrary colored glow box-shadow (present-only object).
  "glow",
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-533-01 REGION: block grid span (present-only clamped ints).
  "colSpan",
  "rowSpan",
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
] as const;
const mobileBreakpoints: MobileBreakpoint[] = ["tablet", "mobile"];
const defaultBreakpoints: PageBreakpoint[] = ["desktop", "tablet", "mobile"];

const defaultSeo: PageDocumentSeoV2 = {};
const defaultSettings: PageDocumentSettingsV2 = {
  template: "page-v2",
  showInNav: true,
};
const defaultLayout: PageSectionLayoutV2 = {
  columns: 1,
  align: "start",
  justify: "start",
  maxWidth: 1080,
  stackVertical: false,
};
const defaultStyle: PageSectionStyleV2 = {
  background: "#ffffff",
  backgroundType: "color",
  backgroundImage: null,
  accent: "#0d9488",
  radius: 0,
  shadow: "none",
};
const defaultSpacing: PageSectionSpacingV2 = {
  paddingTop: 64,
  paddingBottom: 64,
  paddingLeft: 40,
  paddingRight: 40,
  gap: 24,
};
const defaultVisibility: PageSectionVisibilityV2 = {
  visible: true,
  authOnly: false,
  anchor: null,
  startsAt: null,
  endsAt: null,
};
const defaultBlockVisibility: PageBlockVisibilityV2 = {
  visible: true,
};

const pageLayoutBlockSlots: Partial<Record<PageBlockType, readonly PageBlockSlotKey[]>> = {
  container: ["children"],
  columns: ["column:1", "column:2", "column:3", "column:4"],
  group: ["children"],
};

export const pageBlockPropKeys: Record<PageBlockType, readonly string[]> = {
  heading: ["text", "level", "align", "marks"],
  text: ["text", "format", "align", "marks"],
  badge: [
    "text",
    "variant",
    "size",
    "shape",
    "weight",
    "background",
    "textColor",
    "icon",
    "iconPosition",
  ],
  button: ["label", "href", "target", "variant", "size"],
  image: ["assetId", "src", "alt", "caption", "fit"],
  video: ["assetId", "src", "title", "autoplay", "muted"],
  gallery: ["items", "layout"],
  form: ["formId", "title"],
  list: ["items", "ordered"],
  card: ["title", "text", "image", "href"],
  collection: ["contentTypeId", "queryId", "limit", "templateId", "paginationMode", "pageSize"],
  filters: [
    "queryId",
    "facets",
    "aliases",
    "layout",
    "autoApply",
    "showSearch",
    "showCount",
    "searchLabel",
    "searchPlaceholder",
    "applyLabel",
  ],
  embed: ["html", "url", "provider"],
  divider: ["tone", "thickness"],
  spacer: ["size"],
  statistic: ["value", "label", "caption"],
  icon: ["name", "label", "animation", "size", "color", "speed"],
  quote: ["text", "cite", "marks"],
  container: [],
  columns: ["count", "gap", "distribution"],
  group: ["direction", "wrap", "gap"],
  // TASK-522-01-L01: sanitized inline SVG + optional stroke draw-in.
  customSvg: ["svg", "drawIn", "drawSpeed", "label"],
};

export type PageBlockRuntimeRendererState = "real" | "placeholder" | "unsupported";
export type PageBlockPublicDataBinding = "none" | "scoped-read-only";

export type PageBlockCapabilitiesV2 = {
  editorInsertable: boolean;
  insertable: boolean;
  assistantEmittable: boolean;
  runtimeRenderer: PageBlockRuntimeRendererState;
  slots: readonly PageBlockSlotKey[];
  publicDataBinding: PageBlockPublicDataBinding;
  reason?: string;
};

export type PageSectionCapabilitiesV2 = {
  insertable: boolean;
  assistantEmittable: boolean;
  reason?: string;
};

const insertableSectionTypes = new Set<PageSectionType>([
  "hero",
  "content",
  "feature-grid",
  "media-split",
  "timeline",
  "gallery",
  "comparison",
  "faq",
  "testimonials",
  "cta",
  "custom",
]);

const pageSectionCapabilityReasons: Partial<Record<PageSectionType, string>> = {
  template: "template-section-boundary",
  navigation: "runtime-navigation-boundary",
  collection: "collection-section-boundary",
  filters: "listing-section-boundary",
  "lead-form": "form-section-boundary",
  embed: "embed-section-boundary",
};

export const pageSectionCapabilities = pageSectionTypes.reduce(
  (capabilities, type) => {
    const insertable = insertableSectionTypes.has(type);
    capabilities[type] = {
      insertable,
      assistantEmittable: insertable,
      ...(insertable ? {} : { reason: pageSectionCapabilityReasons[type] ?? "unsupported" }),
    };
    return capabilities;
  },
  {} as Record<PageSectionType, PageSectionCapabilitiesV2>
);

const realRuntimeBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  "gallery",
  "form",
  "list",
  "card",
  "collection",
  "filters",
  "embed",
  "divider",
  "spacer",
  "statistic",
  "quote",
  "container",
  "columns",
  "group",
  // TASK-521-04: the animated-icon block is a real runtime renderer — its
  // `renderPageBlockContent case "icon"` (pageRendererV2.tsx) mounts the curated
  // inline-SVG + CSS-keyframe glyph. Flip lands with the renderer/palette/controls.
  "icon",
  // TASK-522-01-L01: the custom-SVG block is a real runtime renderer — its
  // `renderPageBlockContent case "customSvg"` (522-02-L01) mounts the sanitized
  // inline SVG. Registered here so the capability report marks it runtime "real".
  "customSvg",
]);
const dataBoundBlockTypes = new Set<PageBlockType>(["collection", "filters", "form", "embed"]);
const layoutBlockTypes = new Set<PageBlockType>(["container", "columns", "group"]);
const editorInsertableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  // TASK-456: the form block is editor-insertable — its public runtime
  // (scoped data binding, nonce/anti-abuse submit pipeline) shipped with
  // TASK-418-06-L04 and the authoring controls (formId combobox + title)
  // ship with this capability flip. The `lead-form` SECTION stays gated: a
  // lead-form layout is a section composed with this block (composite-first
  // product rule), so a dedicated section type would only add catalog noise.
  "form",
  "list",
  "card",
  // TASK-457: the collection block is editor-insertable — its public runtime
  // (scoped read-only content-list binding) shipped with TASK-418-06-L04 and
  // the authoring controls (contentTypeId/queryId/templateId comboboxes +
  // limit slider) ship with this capability flip. The `collection` SECTION
  // stays gated: a listing layout is a section composed with this block
  // (composite-first product rule).
  "collection",
  // TASK-459-02: the filters block is editor-insertable — a deliberate
  // TASK-452-style catalog amendment. Its public runtime (facet form reusing
  // the listing-filters markup, scoped read-only listing binding) and the
  // authoring controls (saved-query combobox + generic facet builder +
  // behavior toggles) ship together with this capability flip. The `filters`
  // SECTION stays gated `listing-section-boundary`: a filter layout is an
  // ordinary section composed with this block (composite-first product rule).
  "filters",
  "divider",
  "spacer",
  "statistic",
  "quote",
  // TASK-521-04: the animated-icon block is now editor-insertable — its palette
  // copy (pageEditorOptions.ts) + block controls (pageEditorControlRegistry.ts)
  // ship with this flip.
  "icon",
  "container",
  "columns",
  "group",
  // TASK-522-01-L01: the custom-SVG block is editor-insertable — its palette copy
  // (pageEditorOptions.ts) + block controls (pageEditorControlRegistry.ts) ship
  // with 522-02. No capability-reason stub (it IS insertable).
  "customSvg",
]);
const insertableBlockTypes = editorInsertableBlockTypes;
const assistantEmittableBlockTypes = new Set<PageBlockType>([
  "heading",
  "text",
  "badge",
  "button",
  "image",
  "video",
  "list",
  "card",
  "divider",
  "spacer",
  "statistic",
  "quote",
  "container",
  "columns",
  "group",
]);
const pageBlockCapabilityReasons: Partial<Record<PageBlockType, string>> = {
  gallery: "gallery-editor-controls-pending",
  embed: "embed-editor-controls-pending",
};

export const pageBlockCapabilities = pageBlockTypes.reduce(
  (capabilities, type) => {
    const runtimeRenderer: PageBlockRuntimeRendererState = realRuntimeBlockTypes.has(type)
      ? "real"
      : "placeholder";
    const insertable = insertableBlockTypes.has(type);
    capabilities[type] = {
      editorInsertable: editorInsertableBlockTypes.has(type),
      insertable,
      assistantEmittable: assistantEmittableBlockTypes.has(type),
      runtimeRenderer,
      slots: pageLayoutBlockSlots[type] ?? [],
      publicDataBinding: dataBoundBlockTypes.has(type) ? "scoped-read-only" : "none",
      ...(insertable ? {} : { reason: pageBlockCapabilityReasons[type] ?? "unsupported" }),
    };
    return capabilities;
  },
  {} as Record<PageBlockType, PageBlockCapabilitiesV2>
);

export const getPageBlockActiveSlotKeys = (block: PageBlockV2): readonly PageBlockSlotKey[] => {
  const slots = pageBlockCapabilities[block.type].slots;
  if (!layoutBlockTypes.has(block.type)) return [];
  if (block.type !== "columns") return slots;
  const rawCount = typeof block.props.count === "number" ? block.props.count : 2;
  const count = Math.max(1, Math.min(4, Math.trunc(rawCount)));
  return slots.slice(0, count);
};

/**
 * List block item contract: a plain string renders as text, while
 * `{ label, href }` renders as a link (footer link columns). Plain strings
 * stay first-class for backward compatibility with existing documents.
 */
export type PageListItemV2 = string | { label: string; href: string };

/**
 * Builds the stored shape for a list item from free-form editor input: a
 * non-empty link target produces the `{ label, href }` link item, anything
 * else collapses to the legacy plain-string item. Owned here so the panel
 * items editor and normalization agree on the stored contract.
 */
export const createPageListItem = (label: string, href: string): PageListItemV2 => {
  const safeHref = sanitizeAuthoringLinkHref(href);
  return safeHref ? { label, href: safeHref } : label;
};

export const pageBlockDefaultProps: Record<PageBlockType, Record<string, unknown>> = {
  heading: { text: "Heading", level: "h2", align: "left" },
  text: { text: "Write the section copy here.", format: "plain", align: "left" },
  badge: {
    text: "Badge",
    variant: "soft",
    size: "sm",
    shape: "pill",
    weight: "semibold",
    background: null,
    textColor: null,
    icon: null,
    iconPosition: "start",
  },
  button: { label: "Learn more", href: "/", target: "self", variant: "primary", size: "md" },
  image: { assetId: null, src: null, alt: "", caption: "", fit: "cover" },
  video: { assetId: null, src: null, title: "", autoplay: false, muted: true },
  gallery: { items: [], layout: "grid" },
  form: { formId: null, title: "" },
  list: { items: [], ordered: false },
  card: { title: "Card title", text: "", image: null, href: null },
  collection: {
    contentTypeId: null,
    queryId: null,
    limit: 6,
    templateId: null,
    // TASK-459-03: visitor pagination defaults — "none" preserves today's
    // render exactly; `pageSize: null` means "follow limit" when paged.
    paginationMode: "none",
    pageSize: null,
  },
  filters: {
    queryId: null,
    facets: [],
    aliases: {},
    layout: "horizontal",
    autoApply: true,
    showSearch: true,
    showCount: true,
    searchLabel: "Search",
    searchPlaceholder: "Search results...",
    applyLabel: "Apply filters",
  },
  embed: { html: "", url: "", provider: "custom" },
  divider: { tone: "neutral", thickness: 1 },
  spacer: { size: 32 },
  statistic: { value: "0", label: "Metric", caption: "" },
  icon: {
    name: "sparkles",
    label: "",
    animation: "pulse",
    size: 48,
    color: "var(--primary)",
    speed: 1600,
  },
  quote: { text: "", cite: "" },
  container: {},
  columns: { count: 2, gap: 24, distribution: "equal" },
  group: { direction: "column", wrap: false, gap: 16 },
  // TASK-522-01-L01: drawSpeed omitted until authored (the only present-only
  // prop); empty svg = neutral fallback at render.
  customSvg: { svg: "", drawIn: false, label: "" },
};

const numericSchema = (minimum: number, maximum: number): RecordValue => ({
  type: "number",
  minimum,
  maximum,
});

const nullableNumericSchema = (minimum: number, maximum: number): RecordValue => ({
  type: ["number", "null"],
  minimum,
  maximum,
});

const nullableEnumSchema = (options: readonly string[]): RecordValue => ({
  type: ["string", "null"],
  enum: [...options, null],
});

const stringSchema: RecordValue = { type: "string" };
const nullableStringSchema: RecordValue = { type: ["string", "null"] };
const booleanSchema: RecordValue = { type: "boolean" };
const arraySchema: RecordValue = { type: "array" };
const textMarksSchema: RecordValue = {
  type: "array",
  maxItems: PAGE_TEXT_MARK_MAX,
  items: {
    anyOf: [
      {
        type: "object",
        required: ["type", "from", "to", "color"],
        additionalProperties: false,
        properties: {
          type: { const: "color" },
          from: { type: "integer", minimum: 0 },
          to: { type: "integer", minimum: 0 },
          color: { type: "string" },
        },
      },
      {
        type: "object",
        required: ["type", "from", "to", "color"],
        additionalProperties: false,
        properties: {
          type: { const: "highlight" },
          from: { type: "integer", minimum: 0 },
          to: { type: "integer", minimum: 0 },
          color: { type: "string" },
        },
      },
      {
        type: "object",
        required: ["type", "from", "to", "href"],
        additionalProperties: false,
        properties: {
          type: { const: "link" },
          from: { type: "integer", minimum: 0 },
          to: { type: "integer", minimum: 0 },
          href: { type: "string" },
        },
      },
      {
        type: "object",
        required: ["type", "from", "to"],
        additionalProperties: false,
        properties: {
          type: { enum: ["bold", "italic"] },
          from: { type: "integer", minimum: 0 },
          to: { type: "integer", minimum: 0 },
        },
      },
    ],
  },
};

/** List block items: plain strings or `{ label, href }` link items. */
const listItemsSchema: RecordValue = {
  type: "array",
  items: {
    anyOf: [
      { type: "string" },
      {
        type: "object",
        additionalProperties: false,
        required: ["label", "href"],
        properties: { label: { type: "string" }, href: { type: "string" } },
      },
    ],
  },
};

/**
 * JSON schema of the filters block facet list (TASK-459-02). Mirrors the
 * shared `listing-filters` facet contract: option-backed kinds carry explicit
 * option lists, sort facets carry `field:dir` sort options, presentation
 * stays the small generic surface the runtime understands. Reject-unknown is
 * preserved on every nested record.
 */
const pageFiltersFacetsJsonSchema: RecordValue = {
  type: "array",
  maxItems: PAGE_FILTERS_MAX_FACETS,
  items: {
    type: "object",
    additionalProperties: false,
    properties: {
      id: { type: "string" },
      kind: { type: "string", enum: [...pageFiltersFacetKinds] },
      label: { type: "string" },
      field: { type: "string" },
      op: { type: "string", enum: [...pageFiltersFacetOperators] },
      options: {
        type: "array",
        maxItems: 120,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            parentValue: { type: "string" },
          },
        },
      },
      sortOptions: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            label: { type: "string" },
            value: { type: "string" },
            field: { type: "string" },
            dir: { type: "string", enum: ["asc", "desc"] },
          },
        },
      },
      presentation: {
        type: "object",
        additionalProperties: false,
        properties: {
          controlMode: { type: "string", enum: ["inline", "searchable"] },
          rangeStep: { type: "number" },
          rangeInputMode: { type: "string", enum: ["inputs", "inputs-slider"] },
          dateInputMode: { type: "string", enum: ["native-date", "text-fallback"] },
        },
      },
    },
  },
};

const pageFiltersAliasesJsonSchema: RecordValue = {
  type: "object",
  maxProperties: 24,
  additionalProperties: { type: "string" },
};

const blockPropJsonSchemaForType = (type: PageBlockType, key: string): RecordValue => {
  if (isPageTextMarkCapableBlockType(type) && key === "marks") return textMarksSchema;
  if (type === "heading" && key === "level")
    return { type: "string", enum: [...pageHeadingLevels] };
  if ((type === "heading" || type === "text") && key === "align") {
    return { type: "string", enum: [...pageTextAlignments] };
  }
  if (type === "text" && key === "format") return { type: "string", enum: [...pageTextFormats] };
  if (type === "badge" && key === "variant")
    return { type: "string", enum: [...pageBadgeVariants] };
  if (type === "badge" && key === "size") return { type: "string", enum: [...pageBadgeSizes] };
  if (type === "badge" && key === "shape") return { type: "string", enum: [...pageBadgeShapes] };
  if (type === "badge" && key === "weight") return { type: "string", enum: [...pageBadgeWeights] };
  if (type === "badge" && key === "iconPosition")
    return { type: "string", enum: [...pageBadgeIconPositions] };
  if (type === "badge" && (key === "background" || key === "textColor")) {
    return nullableStringSchema;
  }
  if (type === "badge" && key === "icon") {
    return { type: ["string", "null"], enum: [...pageBadgeIcons, null] };
  }
  if (type === "button" && key === "target")
    return { type: "string", enum: [...pageButtonTargets] };
  if (type === "button" && key === "variant") {
    return { type: "string", enum: [...pageButtonVariants] };
  }
  if (type === "button" && key === "size") return { type: "string", enum: [...pageButtonSizes] };
  if (type === "image" && key === "fit") return { type: "string", enum: [...pageImageFits] };
  if (type === "gallery" && key === "layout")
    return { type: "string", enum: [...pageGalleryLayouts] };
  if (type === "filters" && key === "layout") {
    return { type: "string", enum: [...pageFiltersBlockLayouts] };
  }
  if (type === "filters" && key === "facets") return pageFiltersFacetsJsonSchema;
  if (type === "filters" && key === "aliases") return pageFiltersAliasesJsonSchema;
  if (type === "collection" && key === "paginationMode") {
    return { type: "string", enum: [...pageCollectionPaginationModes] };
  }
  if (type === "collection" && key === "pageSize") {
    return nullableNumericSchema(PAGE_COLLECTION_LIMIT_CLAMP.min, PAGE_COLLECTION_LIMIT_CLAMP.max);
  }
  if (type === "divider" && key === "tone") return { type: "string", enum: [...pageDividerTones] };
  if (type === "columns" && key === "distribution") {
    return { type: "string", enum: [...pageColumnDistributions] };
  }
  if (type === "group" && key === "direction") {
    return { type: "string", enum: [...pageGroupDirections] };
  }
  // Single owner clamp (TASK-459-03): editor schema agrees with the runtime
  // bound instead of the old 1..50 ceiling the runtime truncated to 24.
  if (key === "limit") {
    return numericSchema(PAGE_COLLECTION_LIMIT_CLAMP.min, PAGE_COLLECTION_LIMIT_CLAMP.max);
  }
  if (key === "thickness") return numericSchema(1, 16);
  if (key === "count") return numericSchema(1, 4);
  if (type === "columns" && key === "gap") return numericSchema(0, 120);
  if (type === "group" && key === "gap") return numericSchema(0, 120);
  // Animated-icon block props (TASK-521-01-L03) — Ajv in lockstep with the
  // normalizer. MUST precede the generic `key === "size"` (:size 0..240) and
  // the string tail, else `size` diverges to 0..240 and `animation`/`speed`
  // fall to `stringSchema` (looser/type-inconsistent with the write normalizer).
  if (type === "icon" && key === "animation") {
    return { type: "string", enum: [...animatedIconAnimations] };
  }
  if (type === "icon" && key === "name") return { type: "string", enum: [...animatedIconNames] };
  if (type === "icon" && key === "size") {
    return numericSchema(ANIMATED_ICON_SIZE_CLAMP.min, ANIMATED_ICON_SIZE_CLAMP.max);
  }
  if (type === "icon" && key === "speed") {
    return numericSchema(ANIMATED_ICON_SPEED_CLAMP.min, ANIMATED_ICON_SPEED_CLAMP.max);
  }
  // Custom-SVG block props (TASK-522-01-L01) — Ajv in lockstep with the
  // normalizer. MUST precede the generic string tail (`svg`/`label` would else
  // fall to the looser `stringSchema`).
  if (type === "customSvg" && key === "svg") {
    return { type: "string", maxLength: PAGE_CUSTOM_SVG_MAX_BYTES };
  }
  if (type === "customSvg" && key === "drawIn") return booleanSchema;
  if (type === "customSvg" && key === "drawSpeed") {
    return numericSchema(PAGE_DRAW_SPEED_CLAMP.min, PAGE_DRAW_SPEED_CLAMP.max);
  }
  if (type === "customSvg" && key === "label") {
    return { type: "string", maxLength: 160 };
  }
  if (key === "size") return numericSchema(0, 240);
  if (
    key === "ordered" ||
    key === "autoplay" ||
    key === "muted" ||
    key === "wrap" ||
    key === "autoApply" ||
    key === "showSearch" ||
    key === "showCount"
  ) {
    return booleanSchema;
  }
  if (type === "list" && key === "items") return listItemsSchema;
  if (key === "items") return arraySchema;
  if (
    [
      "assetId",
      "src",
      "image",
      "href",
      "formId",
      "contentTypeId",
      "queryId",
      "templateId",
    ].includes(key)
  ) {
    return nullableStringSchema;
  }
  return stringSchema;
};

const pageBoxSpacingJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBoxSpacingKeys.map((key) => [
      key,
      numericSchema(PAGE_BLOCK_BOX_SPACING_CLAMP.min, PAGE_BLOCK_BOX_SPACING_CLAMP.max),
    ])
  ),
};

// ── TASK-531 REGION: glow box-shadow JSON schema ──────────────────────────────
// Shared by ALL THREE additionalProperties:false style schemas (block, partial
// section, inlined top-level section). Mirrors the `layer`/`marquee` nested-object
// shape: strict object, `color` REQUIRED, numeric fields bounded by the 531 clamps.
const pageGlowJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  required: ["color"],
  properties: {
    // maxLength defence-in-depth (ReDoS): deep color validation is owned by
    // `sanitizeAuthoringCssColor` (itself length-guarded), but capping at the schema
    // rejects oversized input before it reaches any normalizer/regex.
    color: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
    blur: numericSchema(PAGE_GLOW_BLUR_CLAMP.min, PAGE_GLOW_BLUR_CLAMP.max),
    spread: numericSchema(PAGE_GLOW_SPREAD_CLAMP.min, PAGE_GLOW_SPREAD_CLAMP.max),
    x: numericSchema(PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max),
    y: numericSchema(PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max),
  },
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// ── TASK-533-02 REGION: per-edge section border JSON schema ───────────────────
// Nested additionalProperties:false at BOTH the edge and the border level (mirrors
// the layer/marquee nested-object precedent). Shared by BOTH section-style mirrors.
const pageSectionBorderEdgeJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    color: { type: ["string", "null"] },
    width: numericSchema(PAGE_SECTION_BORDER_WIDTH_CLAMP.min, PAGE_SECTION_BORDER_WIDTH_CLAMP.max),
    style: { type: "string", enum: [...pageBlockBorderStyles] },
  },
};
const pageSectionBorderJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    top: pageSectionBorderEdgeJsonSchema,
    right: pageSectionBorderEdgeJsonSchema,
    bottom: pageSectionBorderEdgeJsonSchema,
    left: pageSectionBorderEdgeJsonSchema,
  },
};
// ── END TASK-533-02 REGION ────────────────────────────────────────────────────

const pageBlockStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    align: { type: "string", enum: [...pageTextAlignments] },
    width: { type: "string", enum: [...pageBlockWidths] },
    column: nullableNumericSchema(
      PAGE_SECTION_BLOCK_COLUMN_CLAMP.min,
      PAGE_SECTION_BLOCK_COLUMN_CLAMP.max
    ),
    textColor: { type: ["string", "null"] },
    background: { type: ["string", "null"] },
    backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
    backgroundImage: { type: ["string", "null"] },
    opacity: numericSchema(0, 1),
    radius: numericSchema(0, 64),
    shadow: { type: "string", enum: [...pageShadowTokens] },
    borderColor: { type: ["string", "null"] },
    borderWidth: numericSchema(
      PAGE_BLOCK_BORDER_WIDTH_CLAMP.min,
      PAGE_BLOCK_BORDER_WIDTH_CLAMP.max
    ),
    borderStyle: { type: "string", enum: [...pageBlockBorderStyles] },
    padding: pageBoxSpacingJsonSchema,
    margin: pageBoxSpacingJsonSchema,
    fontFamily: nullableEnumSchema(pageTypographyFontFamilies),
    fontSize: nullableEnumSchema(pageTypographyFontSizes),
    fontWeight: nullableEnumSchema(pageTypographyFontWeights),
    lineHeight: nullableNumericSchema(
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP.min,
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP.max
    ),
    letterSpacing: nullableNumericSchema(
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP.min,
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP.max
    ),
    // TASK-522-01-L03 composition/decoration fields (mirrors the normalizer;
    // present-only, additionalProperties:false on every nested object).
    decoration: {
      type: "object",
      additionalProperties: false,
      required: ["motion"],
      properties: {
        motion: { type: "string", enum: [...pageBlockDecorationMotions] },
        delay: numericSchema(PAGE_DECORATION_DELAY_CLAMP.min, PAGE_DECORATION_DELAY_CLAMP.max),
        duration: numericSchema(
          PAGE_DECORATION_DURATION_CLAMP.min,
          PAGE_DECORATION_DURATION_CLAMP.max
        ),
      },
    },
    tilt: { type: "string", enum: [...pageTiltStrengths] },
    tiltGlare: booleanSchema,
    layer: {
      type: "object",
      additionalProperties: false,
      properties: {
        x: numericSchema(PAGE_LAYER_X_CLAMP.min, PAGE_LAYER_X_CLAMP.max),
        y: numericSchema(PAGE_LAYER_Y_CLAMP.min, PAGE_LAYER_Y_CLAMP.max),
        z: numericSchema(PAGE_LAYER_Z_CLAMP.min, PAGE_LAYER_Z_CLAMP.max),
        anchor: { type: "string", enum: [...pageLayerAnchors] },
      },
    },
    // TASK-524-02-L01 present-only STRING (no null — omitted when unset);
    // sanitized at normalize; additionalProperties:false stays.
    surfaceTint: { type: "string" },
    surfacePreset: { type: "string", enum: [...pageSurfacePresets] },
    hoverEffect: { type: "string", enum: [...pageBlockHoverEffects] },
    composition: { type: "string", enum: [...pageCompositions] },
    marquee: {
      type: "object",
      additionalProperties: false,
      properties: {
        speed: numericSchema(PAGE_MARQUEE_SPEED_CLAMP.min, PAGE_MARQUEE_SPEED_CLAMP.max),
        direction: { type: "string", enum: [...pageMarqueeDirections] },
        seamless: booleanSchema,
      },
    },
    // TASK-525-02-L01 per-block staggered reveal (present-only, bounded ms).
    revealDelay: numericSchema(PAGE_REVEAL_DELAY_CLAMP.min, PAGE_REVEAL_DELAY_CLAMP.max),
    // ── TASK-531 REGION: glow box-shadow (present-only object; color REQUIRED).
    glow: pageGlowJsonSchema,
    // ── END TASK-531 REGION ──────────────────────────────────────────────────
    // ── TASK-533-01 REGION: block grid span (present-only clamped ints).
    colSpan: numericSchema(PAGE_BLOCK_SPAN_CLAMP.min, PAGE_BLOCK_SPAN_CLAMP.max),
    rowSpan: numericSchema(PAGE_BLOCK_SPAN_CLAMP.min, PAGE_BLOCK_SPAN_CLAMP.max),
    // ── END TASK-533-01 REGION ────────────────────────────────────────────────
  },
};

// TASK-522-01-L03: the block-style schema is referenced by EVERY block type at
// EVERY tree depth (inline + responsive override) — ~176 occurrences. Inlining
// the (now larger) object at each site bloats Ajv's generated validator enough
// to blow the call stack on a max-depth document. Hoist it into `$defs` and
// reference it by `$ref` so Ajv compiles ONE style validator shared everywhere
// (validation semantics identical — `additionalProperties:false` preserved).
const PAGE_BLOCK_STYLE_JSON_SCHEMA_REF = "#/$defs/pageBlockStyle";
const pageBlockStyleJsonSchemaRef: RecordValue = { $ref: PAGE_BLOCK_STYLE_JSON_SCHEMA_REF };

const pageBlockVisibilityJsonSchema: RecordValue = {
  type: "object",
  required: ["visible"],
  additionalProperties: false,
  properties: { visible: { type: "boolean" } },
};

const blockPropsJsonSchemaForType = (type: PageBlockType): RecordValue => ({
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBlockPropKeys[type].map((key) => [key, blockPropJsonSchemaForType(type, key)])
  ),
});

const blockResponsivePropsJsonSchemaForType = (type: PageBlockType): RecordValue => ({
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBlockPropKeys[type]
      .filter((key) => key !== "marks")
      .map((key) => [key, blockPropJsonSchemaForType(type, key)])
  ),
});

const blockResponsiveJsonSchemaForType = (type: PageBlockType): RecordValue => {
  const overrideSchema: RecordValue = {
    type: "object",
    additionalProperties: false,
    properties: {
      props: blockResponsivePropsJsonSchemaForType(type),
      style: pageBlockStyleJsonSchemaRef,
      visibility: {
        type: "object",
        additionalProperties: false,
        properties: { visible: { type: "boolean" } },
      },
    },
  };
  return {
    type: "object",
    additionalProperties: false,
    properties: Object.fromEntries(
      mobileBreakpoints.map((breakpoint) => [breakpoint, overrideSchema])
    ),
  };
};

const blockDepthJsonSchemaRef = (depth: number): RecordValue => ({
  $ref: `#/$defs/pageBlockDepth${depth}`,
});

const blockJsonSchemaForType = (type: PageBlockType, depth: number): RecordValue => {
  const allowedSlots = pageBlockCapabilities[type].slots;
  const properties: RecordValue = {
    id: { type: "string", minLength: 1 },
    type: { const: type },
    props: blockPropsJsonSchemaForType(type),
    style: pageBlockStyleJsonSchemaRef,
    visibility: pageBlockVisibilityJsonSchema,
    responsive: blockResponsiveJsonSchemaForType(type),
  };

  if (allowedSlots.length > 0 && depth < PAGE_BLOCK_MAX_TREE_DEPTH) {
    properties.slots = blockSlotsJsonSchemaForType(type, depth);
  }

  return {
    type: "object",
    required: ["id", "type", "props", "visibility"],
    additionalProperties: false,
    properties,
  };
};

const blockSlotsJsonSchemaForType = (type: PageBlockType, depth: number): RecordValue => ({
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    pageBlockCapabilities[type].slots.map((slotKey) => [
      slotKey,
      {
        type: "array",
        maxItems: PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
        items: blockDepthJsonSchemaRef(depth + 1),
      },
    ])
  ),
});

const blockJsonSchemaForDepth = (depth: number): RecordValue => ({
  oneOf: pageBlockTypes.map((type) => blockJsonSchemaForType(type, depth)),
});

const pageBlockDepthJsonSchemas: RecordValue = Object.fromEntries(
  Array.from({ length: PAGE_BLOCK_MAX_TREE_DEPTH }, (_, index) => {
    const depth = index + 1;
    return [`pageBlockDepth${depth}`, blockJsonSchemaForDepth(depth)];
  })
);

const partialSectionLayoutJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    columns: numericSchema(1, 4),
    align: { type: "string", enum: [...pageSectionAlignments] },
    justify: { type: "string", enum: [...pageSectionJustify] },
    maxWidth: numericSchema(320, 1920),
    stackVertical: booleanSchema,
  },
};

const partialSectionStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    // maxLength defence-in-depth (ReDoS): deep validation owned by
    // `sanitizeAuthoringCssBackground`; cap oversized input before any regex.
    background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
    backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
    backgroundImage: { type: ["string", "null"] },
    accent: { type: "string" },
    radius: numericSchema(0, 64),
    shadow: { type: "string", enum: [...pageShadowTokens] },
    // Harmless defence-in-depth mirror (TASK-521-01-L01): section effects render
    // device-uniform, but a hand-authored responsive[bp].style carrying these
    // round-trips instead of being rejected by additionalProperties:false.
    scrollEffect: { type: "string", enum: [...pageSectionScrollEffects] },
    parallaxIntensity: numericSchema(
      PAGE_PARALLAX_INTENSITY_CLAMP.min,
      PAGE_PARALLAX_INTENSITY_CLAMP.max
    ),
    // TASK-522-01-L03 section composition fields (present-only mirror).
    surfacePreset: { type: "string", enum: [...pageSurfacePresets] },
    composition: { type: "string", enum: [...pageCompositions] },
    // TASK-525-01-L02 full-bleed background (present-only boolean).
    fullBleed: booleanSchema,
    // ── TASK-531 REGION: glow box-shadow (present-only mirror).
    glow: pageGlowJsonSchema,
    // ── END TASK-531 REGION ──────────────────────────────────────────────────
    // ── TASK-533-01 REGION: asymmetric column ratio (value validated at
    // normalize by sanitizeAuthoringGridTemplate; string shape only here).
    columnTemplate: { type: "string" },
    // ── END TASK-533-01 REGION ────────────────────────────────────────────────
    // ── TASK-533-02 REGION: per-edge section border (present-only object).
    border: pageSectionBorderJsonSchema,
    // ── END TASK-533-02 REGION ────────────────────────────────────────────────
  },
};

const partialSectionSpacingJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    paddingTop: numericSchema(0, 240),
    paddingBottom: numericSchema(0, 240),
    paddingLeft: numericSchema(0, 240),
    paddingRight: numericSchema(0, 240),
    gap: numericSchema(0, 120),
  },
};

const partialSectionVisibilityJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    visible: { type: "boolean" },
    authOnly: { type: "boolean" },
    anchor: { type: ["string", "null"] },
    startsAt: { type: ["string", "null"] },
    endsAt: { type: ["string", "null"] },
  },
};

const sectionResponsiveJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: Object.fromEntries(
    mobileBreakpoints.map((breakpoint) => [
      breakpoint,
      {
        type: "object",
        additionalProperties: false,
        properties: {
          layout: partialSectionLayoutJsonSchema,
          style: partialSectionStyleJsonSchema,
          spacing: partialSectionSpacingJsonSchema,
          visibility: partialSectionVisibilityJsonSchema,
        },
      },
    ])
  ),
};

export const pageDocumentV2JsonSchema: RecordValue = {
  type: "object",
  required: ["schemaVersion", "sections"],
  additionalProperties: false,
  $defs: { pageBlockStyle: pageBlockStyleJsonSchema, ...pageBlockDepthJsonSchemas },
  properties: {
    schemaVersion: { const: PAGE_DOCUMENT_SCHEMA_VERSION },
    breakpoints: {
      type: "array",
      items: { type: "string", enum: [...pageBreakpoints] },
      minItems: 3,
      maxItems: 3,
    },
    seo: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        image: { type: ["string", "null"] },
      },
    },
    settings: {
      type: "object",
      additionalProperties: false,
      properties: {
        template: { type: "string" },
        showInNav: { type: "boolean" },
        revisionRetention: { type: "number", minimum: 1, maximum: 100 },
        // Menu-host appearance vehicle (TASK-458-03). Deep validation
        // (color shapes, numeric clamps) is owned by
        // `normalizeMenuAppearance`; the JSON schema mirrors the shape and
        // reject-unknown contract.
        menuAppearance: {
          type: "object",
          additionalProperties: false,
          properties: {
            surfaceColor: { type: "string" },
            linkColor: { type: "string" },
            linkHoverColor: { type: "string" },
            linkActiveColor: { type: "string" },
            itemGap: { type: "number" },
            paddingY: { type: "number" },
            paddingX: { type: "number" },
            alignment: { type: "string", enum: [...menuAppearanceAlignments] },
            fontSize: { type: "number" },
            fontWeight: { type: "number", enum: [...menuAppearanceFontWeights] },
            textTransform: { type: "string", enum: [...menuAppearanceTextTransforms] },
            borderColor: { type: "string" },
            borderWidth: { type: "number" },
            shadow: { type: "string", enum: [...menuAppearanceShadows] },
            sticky: { type: "boolean" },
            dropdownDirection: {
              type: "string",
              enum: [...menuAppearanceDropdownDirections],
            },
            mobileMode: { type: "string", enum: [...menuAppearanceMobileModes] },
          },
        },
        // Per-page effects (TASK-521-01-L02). Deep validation (safe color,
        // numeric clamp) is owned by `normalizeEffects`; this mirrors the shape
        // and the reject-unknown contract in lockstep.
        effects: {
          type: "object",
          additionalProperties: false,
          properties: {
            cursorSpotlight: { type: "boolean" },
            spotlightColor: { type: "string" },
            spotlightSize: {
              type: "number",
              minimum: PAGE_SPOTLIGHT_SIZE_CLAMP.min,
              maximum: PAGE_SPOTLIGHT_SIZE_CLAMP.max,
            },
          },
        },
        // TASK-523-01 per-page canvas background. Deep color/gradient validation
        // is owned by `sanitizeAuthoringCssBackground` in `normalizeSettings`
        // (exactly as `menuAppearance`'s deep validation is owned by
        // `normalizeMenuAppearance`); the schema mirrors only the shape.
        // maxLength defence-in-depth (ReDoS): this multi-layer-capable field previously
        // had NO cap; bound it so oversized input is rejected before any regex.
        background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
        collectionLink: {
          type: "object",
          required: ["contentTypeId", "pageRole"],
          additionalProperties: false,
          properties: {
            contentTypeId: { type: "string", minLength: 1 },
            pageRole: { type: "string", enum: ["canonical-list-page", "supporting-page"] },
            compositionKey: { type: ["string", "null"] },
            listingQueryId: { type: ["string", "null"] },
            listingTemplateId: { type: ["string", "null"] },
          },
        },
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "type",
          "name",
          "variant",
          "layout",
          "style",
          "spacing",
          "visibility",
          "responsive",
          "blocks",
        ],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          type: { type: "string", enum: [...pageSectionTypes] },
          name: { type: "string", minLength: 1 },
          variant: { type: "string", enum: [...pageSectionVariants] },
          layout: {
            type: "object",
            required: ["columns", "align", "justify", "maxWidth"],
            additionalProperties: false,
            properties: {
              columns: { type: "number", minimum: 1, maximum: 4 },
              align: { type: "string", enum: [...pageSectionAlignments] },
              justify: { type: "string", enum: [...pageSectionJustify] },
              maxWidth: { type: "number", minimum: 320, maximum: 1920 },
              stackVertical: { type: "boolean" },
            },
          },
          style: {
            type: "object",
            required: ["background", "backgroundType", "accent", "radius", "shadow"],
            additionalProperties: false,
            properties: {
              // maxLength defence-in-depth (ReDoS): deep validation owned by
              // `sanitizeAuthoringCssBackground`; cap oversized input before any regex.
              background: { type: "string", maxLength: PAGE_CSS_VALUE_MAX_LENGTH },
              backgroundType: { type: "string", enum: [...pageBackgroundTypes] },
              backgroundImage: { type: ["string", "null"] },
              accent: { type: "string" },
              radius: { type: "number", minimum: 0, maximum: 64 },
              shadow: { type: "string", enum: [...pageShadowTokens] },
              scrollEffect: { type: "string", enum: [...pageSectionScrollEffects] },
              parallaxIntensity: {
                type: "number",
                minimum: PAGE_PARALLAX_INTENSITY_CLAMP.min,
                maximum: PAGE_PARALLAX_INTENSITY_CLAMP.max,
              },
              // TASK-522-01-L03 section composition fields (present-only mirror).
              surfacePreset: { type: "string", enum: [...pageSurfacePresets] },
              composition: { type: "string", enum: [...pageCompositions] },
              // TASK-525-01-L02 full-bleed background (present-only boolean).
              fullBleed: booleanSchema,
              // ── TASK-531 REGION: glow box-shadow (present-only; MUST mirror the
              // partial + block schemas or a top-level style.glow fails
              // additionalProperties:false and breaks the section-glow round-trip.
              glow: pageGlowJsonSchema,
              // ── END TASK-531 REGION ────────────────────────────────────────
              // ── TASK-533-01 REGION: asymmetric column ratio (MUST mirror the
              // partial schema or a top-level style.columnTemplate fails
              // additionalProperties:false; value validated at normalize).
              columnTemplate: { type: "string" },
              // ── END TASK-533-01 REGION ─────────────────────────────────────
              // ── TASK-533-02 REGION: per-edge section border (MUST mirror the
              // partial schema or a top-level style.border fails
              // additionalProperties:false and breaks the border round-trip).
              border: pageSectionBorderJsonSchema,
              // ── END TASK-533-02 REGION ─────────────────────────────────────
            },
          },
          spacing: {
            type: "object",
            required: ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"],
            additionalProperties: false,
            properties: {
              paddingTop: { type: "number", minimum: 0, maximum: 240 },
              paddingBottom: { type: "number", minimum: 0, maximum: 240 },
              paddingLeft: { type: "number", minimum: 0, maximum: 240 },
              paddingRight: { type: "number", minimum: 0, maximum: 240 },
              gap: { type: "number", minimum: 0, maximum: 120 },
            },
          },
          visibility: {
            type: "object",
            required: ["visible", "authOnly"],
            additionalProperties: false,
            properties: {
              visible: { type: "boolean" },
              authOnly: { type: "boolean" },
              anchor: { type: ["string", "null"] },
              startsAt: { type: ["string", "null"] },
              endsAt: { type: ["string", "null"] },
            },
          },
          responsive: sectionResponsiveJsonSchema,
          blocks: {
            type: "array",
            items: blockDepthJsonSchemaRef(1),
          },
        },
      },
    },
  },
};

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const readText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const readOptionalText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readSafeColor = (value: unknown, fallback: string) =>
  sanitizeAuthoringCssColor(value) ?? fallback;

const readOptionalSafeColor = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringCssColor(value);
};

const readSafeBackground = (value: unknown, fallback: string) =>
  sanitizeAuthoringCssBackground(value) ?? fallback;

const readOptionalSafeBackground = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringCssBackground(value);
};

const readOptionalLinkHref = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringLinkHref(value);
};

const readOptionalMediaUrl = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringMediaUrl(value);
};

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const readNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value as number));
};

const normalizeEnum = <T extends string>(
  value: unknown,
  options: readonly T[],
  fallback: T,
  context: string,
  mode: NormalizeMode
): T => {
  if (typeof value === "string" && options.includes(value as T)) return value as T;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
  }
  return fallback;
};

/**
 * Nullable enum normalizer for the typography token fields: `null` is the
 * explicit "use the baked default" value. Unknown tokens reject on fresh
 * writes and fall back to `null` (no invented styling) on stored reads.
 */
const normalizeNullableEnum = <T extends string>(
  value: unknown,
  options: readonly T[],
  context: string,
  mode: NormalizeMode
): T | null => {
  if (value === null) return null;
  if (typeof value === "string" && options.includes(value as T)) return value as T;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
  }
  return null;
};

/**
 * Nullable clamped number for the typography fields. Non-numeric values reject
 * on fresh writes and fall back to `null` on stored reads; finite values clamp
 * into the owner bounds.
 */
const readNullableClampedNumber = (
  value: unknown,
  clamp: { readonly min: number; readonly max: number },
  context: string,
  mode: NormalizeMode
): number | null => {
  if (value === null) return null;
  if (!Number.isFinite(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
    }
    return null;
  }
  return Math.min(clamp.max, Math.max(clamp.min, value as number));
};

const readOptionalClampedNumber = (
  value: unknown,
  clamp: { readonly min: number; readonly max: number },
  context: string,
  mode: NormalizeMode
): number | undefined => {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${context}.`, context);
    }
    return undefined;
  }
  return Math.min(clamp.max, Math.max(clamp.min, value as number));
};

const assertKnownKeys = (
  value: RecordValue,
  allowed: readonly string[],
  path: string,
  mode: NormalizeMode
) => {
  if (mode !== "write") return;
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      const fieldPath = path ? `${path}.${key}` : key;
      throw new PageDocumentError(
        "page_document_unknown_field",
        `Unknown page document field: ${fieldPath}`,
        fieldPath
      );
    }
  }
};

const requireRecord = (value: unknown, path: string, mode: NormalizeMode): RecordValue => {
  if (isRecord(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected object at ${path}.`, path);
  }
  return {};
};

const requireArray = (value: unknown, path: string, mode: NormalizeMode): unknown[] => {
  if (Array.isArray(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected array at ${path}.`, path);
  }
  return [];
};

const normalizeTextMarkIndex = (
  value: unknown,
  textLength: number,
  path: string,
  mode: NormalizeMode
): number | null => {
  if (!Number.isFinite(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
    }
    return null;
  }
  const index = Math.trunc(value as number);
  return Math.min(textLength, Math.max(0, index));
};

const textMarkAttributeKeys: Record<PageTextMark["type"], readonly string[]> = {
  color: ["type", "from", "to", "color"],
  highlight: ["type", "from", "to", "color"],
  link: ["type", "from", "to", "href"],
  bold: ["type", "from", "to"],
  italic: ["type", "from", "to"],
};

const pageTextMarkTypeRank: Record<PageTextMark["type"], number> = {
  bold: 0,
  italic: 1,
  link: 2,
  color: 3,
  highlight: 4,
};

const normalizeBlockTextMarksForMode = (
  text: string,
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageTextMark[] => {
  const input = requireArray(value ?? [], path, mode);
  const textLength = text.length;
  const candidates: PageTextMark[] = [];

  for (const [index, rawMark] of input.entries()) {
    const markPath = `${path}.${index}`;
    if (!isRecord(rawMark)) {
      if (mode === "write") {
        throw new PageDocumentError("page_document_invalid", `Invalid ${markPath}.`, markPath);
      }
      continue;
    }
    const type = rawMark.type;
    if (
      type !== "color" &&
      type !== "highlight" &&
      type !== "link" &&
      type !== "bold" &&
      type !== "italic"
    ) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Invalid ${markPath}.type.`,
          `${markPath}.type`
        );
      }
      continue;
    }
    assertKnownKeys(rawMark, textMarkAttributeKeys[type], markPath, mode);
    const from = normalizeTextMarkIndex(rawMark.from, textLength, `${markPath}.from`, mode);
    const to = normalizeTextMarkIndex(rawMark.to, textLength, `${markPath}.to`, mode);
    if (from === null || to === null || to <= from) continue;
    if (type === "color" || type === "highlight") {
      const color = sanitizeAuthoringCssColor(rawMark.color);
      if (!color) {
        if (mode === "write") {
          throw new PageDocumentError(
            "page_document_invalid",
            `Invalid ${markPath}.color.`,
            `${markPath}.color`
          );
        }
        continue;
      }
      candidates.push({ type, from, to, color });
      continue;
    }
    if (type === "link") {
      const href = sanitizeAuthoringLinkHref(rawMark.href);
      if (!href) {
        if (mode === "write") {
          throw new PageDocumentError(
            "page_document_invalid",
            `Invalid ${markPath}.href.`,
            `${markPath}.href`
          );
        }
        continue;
      }
      candidates.push({ type, from, to, href });
      continue;
    }
    candidates.push({ type, from, to });
  }

  const result: PageTextMark[] = [];
  const occupiedUntilByType = new Map<PageTextMark["type"], number>();
  for (const mark of candidates.sort((left, right) =>
    left.from === right.from
      ? left.to === right.to
        ? pageTextMarkTypeRank[left.type] - pageTextMarkTypeRank[right.type]
        : left.to - right.to
      : left.from - right.from
  )) {
    const occupiedUntil = occupiedUntilByType.get(mark.type) ?? 0;
    if (mark.from < occupiedUntil) continue;
    result.push(mark);
    occupiedUntilByType.set(mark.type, mark.to);
    if (result.length >= PAGE_TEXT_MARK_MAX) break;
  }
  return result;
};

export function normalizeBlockTextMarks(text: string, value: unknown): PageTextMark[] {
  return normalizeBlockTextMarksForMode(text, value, "stored-read", "props.marks");
}

export function normalizeBlockTextColorMarks(text: string, value: unknown): PageTextMark[] {
  return normalizeBlockTextMarks(text, value);
}

export type PageBlockTextMarkInput = {
  type: PageTextMark["type"];
  from: number;
  to: number;
  color?: string;
  href?: string;
};

/**
 * Apply a single inline text mark to a block's mark set and return the
 * normalized result. Re-applying the IDENTICAL mark (same type, range, AND value)
 * toggles it off; applying a DIFFERENT value over the same range REPLACES it (the
 * old overlapping same-type mark is dropped and the new one added); marks of
 * other types or non-overlapping ranges are retained. Value-awareness is what
 * makes recoloring a fragment a single-click replace instead of a toggle-off then
 * re-apply (TASK-476-01).
 */
export function applyBlockTextMark(
  text: string,
  currentMarks: unknown,
  mark: PageBlockTextMarkInput
): PageTextMark[] {
  const existing = normalizeBlockTextMarks(text, currentMarks);
  const isSameMarkValue = (entry: PageTextMark): boolean => {
    if (entry.type !== mark.type) return false;
    if (entry.type === "color" || entry.type === "highlight") return entry.color === mark.color;
    if (entry.type === "link") return entry.href === mark.href;
    return true;
  };
  const exactMatch = existing.some(
    (entry) => entry.from === mark.from && entry.to === mark.to && isSameMarkValue(entry)
  );
  const retained = existing.filter((entry) => {
    if (entry.type !== mark.type) return true;
    if (exactMatch && entry.from === mark.from && entry.to === mark.to) return false;
    return entry.to <= mark.from || entry.from >= mark.to;
  });
  if (exactMatch) return normalizeBlockTextMarks(text, retained);

  const nextMark: PageTextMark =
    mark.type === "color" || mark.type === "highlight"
      ? { type: mark.type, from: mark.from, to: mark.to, color: mark.color ?? "" }
      : mark.type === "link"
        ? { type: "link", from: mark.from, to: mark.to, href: mark.href ?? "" }
        : { type: mark.type, from: mark.from, to: mark.to };

  return normalizeBlockTextMarks(text, [...retained, nextMark]);
}

export type PageBlockTextMarkRemoveInput = {
  type: PageTextMark["type"];
  from: number;
  to: number;
};

/**
 * Explicitly strip a single inline mark of `mark.type` over `[from, to)` and
 * return the normalized result (audit M7 / TASK-478-02). Unlike
 * {@link applyBlockTextMark} this never toggles or re-applies — it only removes.
 * Behaviour over overlapping marks is precise:
 *  - marks of a DIFFERENT type are untouched (an unlink keeps color/highlight/bold);
 *  - a same-type mark fully inside `[from, to)` is dropped;
 *  - a same-type mark that PARTIALLY overlaps is split so only the covered slice is
 *    removed and the outside slices are preserved (with their value, e.g. the link
 *    href), so unlinking the middle of a long link leaves the two ends linked.
 */
export function removeBlockTextMark(
  text: string,
  currentMarks: unknown,
  mark: PageBlockTextMarkRemoveInput
): PageTextMark[] {
  const existing = normalizeBlockTextMarks(text, currentMarks);
  const next: PageTextMark[] = [];
  for (const entry of existing) {
    // Different type, or no overlap with the removed range: keep as-is.
    if (entry.type !== mark.type || entry.to <= mark.from || entry.from >= mark.to) {
      next.push(entry);
      continue;
    }
    // Preserve the slice before the removed range (carries the entry's value).
    if (entry.from < mark.from) {
      next.push({ ...entry, to: mark.from });
    }
    // Preserve the slice after the removed range.
    if (entry.to > mark.to) {
      next.push({ ...entry, from: mark.to });
    }
    // The slice inside `[from, to)` is dropped.
  }
  return normalizeBlockTextMarks(text, next);
}

const normalizeId = (value: unknown, prefix: string, index: number, mode: NormalizeMode) => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Missing ${prefix} id.`, `${prefix}.id`);
  }
  return `${prefix}_${index + 1}`;
};

const normalizeBreakpoints = (value: unknown, mode: NormalizeMode): PageBreakpoint[] => {
  if (value === undefined) return [...defaultBreakpoints];
  const source = requireArray(value, "breakpoints", mode);
  const unique = source.filter(
    (item, index): item is PageBreakpoint =>
      typeof item === "string" &&
      pageBreakpoints.includes(item as PageBreakpoint) &&
      source.indexOf(item) === index
  );
  if (unique.length === pageBreakpoints.length && unique[0] === "desktop") return unique;
  if (mode === "write") {
    throw new PageDocumentError(
      "page_document_invalid",
      "Page document breakpoints must be desktop, tablet, and mobile.",
      "breakpoints"
    );
  }
  return [...defaultBreakpoints];
};

const normalizeSeo = (value: unknown, mode: NormalizeMode): PageDocumentSeoV2 => {
  const input = requireRecord(value ?? {}, "seo", mode);
  assertKnownKeys(input, ["title", "description", "image"], "seo", mode);
  const title = readOptionalText(input.title);
  const description = readOptionalText(input.description);
  const image = readOptionalText(input.image);
  return {
    ...(title !== undefined && title !== null ? { title } : {}),
    ...(description !== undefined && description !== null ? { description } : {}),
    ...(image !== undefined ? { image } : {}),
  };
};

const normalizeCollectionLink = (
  value: unknown,
  mode: NormalizeMode
): PageCollectionLinkV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, "settings.collectionLink", mode);
  assertKnownKeys(
    input,
    ["contentTypeId", "pageRole", "compositionKey", "listingQueryId", "listingTemplateId"],
    "settings.collectionLink",
    mode
  );
  const contentTypeId = readText(input.contentTypeId, "");
  const pageRole = normalizeEnum(
    input.pageRole,
    ["canonical-list-page", "supporting-page"] as const,
    "supporting-page",
    "settings.collectionLink.pageRole",
    mode
  );
  if (!contentTypeId) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page collection link requires contentTypeId.",
        "settings.collectionLink.contentTypeId"
      );
    }
    return undefined;
  }

  const compositionKey = readOptionalText(input.compositionKey);
  const listingQueryId = readOptionalText(input.listingQueryId);
  const listingTemplateId = readOptionalText(input.listingTemplateId);
  return {
    contentTypeId,
    pageRole,
    ...(compositionKey !== undefined ? { compositionKey } : {}),
    ...(listingQueryId !== undefined ? { listingQueryId } : {}),
    ...(listingTemplateId !== undefined ? { listingTemplateId } : {}),
  };
};

/**
 * Menu-host appearance vehicle (TASK-458-03): strict on write (delegates to
 * `normalizeMenuAppearance`, mapping its error to the document contract),
 * fail-closed sanitize on stored read, absent stays absent.
 */
const normalizeSettingsMenuAppearance = (
  value: unknown,
  mode: NormalizeMode
): MenuAppearance | undefined => {
  if (value === undefined || value === null) return undefined;
  if (mode === "write") {
    try {
      return normalizeMenuAppearance(value);
    } catch {
      throw new PageDocumentError(
        "page_document_invalid",
        "settings.menuAppearance is invalid.",
        "settings.menuAppearance"
      );
    }
  }
  if (!isRecord(value)) return undefined;
  return sanitizeMenuAppearance(value);
};

const PAGE_EFFECTS_KEYS = ["cursorSpotlight", "spotlightColor", "spotlightSize"] as const;

/**
 * TASK-521-01-L02 per-page effects sub-normalizer (mirrors
 * `normalizeSettingsMenuAppearance`). Present-only: returns `undefined` when
 * nothing meaningful was authored so `settings.effects` is omitted entirely.
 */
const normalizeEffects = (value: unknown, mode: NormalizeMode): PageEffectsV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, "settings.effects", mode);
  assertKnownKeys(input, PAGE_EFFECTS_KEYS, "settings.effects", mode);
  const result: PageEffectsV2 = {};
  if (input.cursorSpotlight !== undefined) {
    result.cursorSpotlight = readBoolean(input.cursorSpotlight, false);
  }
  if (input.spotlightColor !== undefined) {
    result.spotlightColor = readSafeColor(input.spotlightColor, "var(--primary)");
  }
  if (input.spotlightSize !== undefined) {
    result.spotlightSize = readNumber(
      input.spotlightSize,
      400,
      PAGE_SPOTLIGHT_SIZE_CLAMP.min,
      PAGE_SPOTLIGHT_SIZE_CLAMP.max
    );
  }
  return Object.keys(result).length ? result : undefined;
};

const normalizeSettings = (value: unknown, mode: NormalizeMode): PageDocumentSettingsV2 => {
  const input = requireRecord(value ?? {}, "settings", mode);
  assertKnownKeys(
    input,
    [
      "template",
      "showInNav",
      "revisionRetention",
      "collectionLink",
      "menuAppearance",
      "effects",
      "background",
    ],
    "settings",
    mode
  );
  const collectionLink = normalizeCollectionLink(input.collectionLink, mode);
  const revisionRetention =
    input.revisionRetention === undefined
      ? undefined
      : readNumber(input.revisionRetention, 10, 1, 100);
  const menuAppearance = normalizeSettingsMenuAppearance(input.menuAppearance, mode);
  const effects = normalizeEffects(input.effects, mode);
  // TASK-523-01 present-only page canvas background. `sanitizeAuthoringCssBackground`
  // returns a safe color/gradient or `null`; a null/absent value drops the key so the
  // normalized output stays byte-identical for legacy/post-522 docs.
  const background =
    input.background === undefined
      ? undefined
      : (sanitizeAuthoringCssBackground(input.background) ?? undefined);
  return {
    template: readText(input.template, defaultSettings.template),
    showInNav: readBoolean(input.showInNav, defaultSettings.showInNav),
    ...(revisionRetention !== undefined ? { revisionRetention } : {}),
    ...(collectionLink ? { collectionLink } : {}),
    ...(menuAppearance !== undefined ? { menuAppearance } : {}),
    ...(effects !== undefined ? { effects } : {}),
    ...(background ? { background } : {}),
  };
};

const normalizeSectionLayout = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionLayoutV2> | PageSectionLayoutV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["columns", "align", "justify", "maxWidth", "stackVertical"], path, mode);
  const result: Partial<PageSectionLayoutV2> = {};
  if (!partial || input.columns !== undefined) {
    result.columns = readNumber(input.columns, defaultLayout.columns, 1, 4);
  }
  if (!partial || input.align !== undefined) {
    result.align = normalizeEnum(
      input.align,
      pageSectionAlignments,
      defaultLayout.align,
      `${path}.align`,
      mode
    );
  }
  if (!partial || input.justify !== undefined) {
    result.justify = normalizeEnum(
      input.justify,
      pageSectionJustify,
      defaultLayout.justify,
      `${path}.justify`,
      mode
    );
  }
  if (!partial || input.maxWidth !== undefined) {
    result.maxWidth = readNumber(input.maxWidth, defaultLayout.maxWidth, 320, 1920);
  }
  if (!partial || input.stackVertical !== undefined) {
    result.stackVertical = readBoolean(input.stackVertical, false);
  }
  return partial ? result : ({ ...defaultLayout, ...result } satisfies PageSectionLayoutV2);
};

// ── TASK-531 REGION (shared glow normalizer) ──────────────────────────────────
// Fail-soft numbers (clamp), REQUIRED sanitized color, reject-unknown nested keys
// (fail-closed in write mode). Returns `undefined` when the color is invalid ⇒ the
// WHOLE glow key is OMITTED (never a partial / color-less glow), so a no-glow /
// bad-color style stays byte-identical (present-only).
const normalizeGlow = (value: unknown, mode: NormalizeMode, path: string): PageGlow | undefined => {
  const g = (isRecord(value) ? value : {}) as RecordValue;
  assertKnownKeys(g, ["color", "blur", "spread", "x", "y"], path, mode);
  const color = readOptionalSafeColor(g.color);
  if (typeof color !== "string" || color.length === 0) return undefined;
  const glow: PageGlow = { color };
  if (g.blur !== undefined) {
    glow.blur = readNumber(g.blur, 24, PAGE_GLOW_BLUR_CLAMP.min, PAGE_GLOW_BLUR_CLAMP.max);
  }
  if (g.spread !== undefined) {
    glow.spread = readNumber(g.spread, 0, PAGE_GLOW_SPREAD_CLAMP.min, PAGE_GLOW_SPREAD_CLAMP.max);
  }
  if (g.x !== undefined) {
    glow.x = readNumber(g.x, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  }
  if (g.y !== undefined) {
    glow.y = readNumber(g.y, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  }
  return glow;
};
// ── END TASK-531 REGION ───────────────────────────────────────────────────────

// ── TASK-533-02 REGION: per-edge section border normalizer ────────────────────
const pageSectionBorderEdges = ["top", "right", "bottom", "left"] as const;
const normalizeSectionBorderEdge = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionBorderEdgeV2 | undefined => {
  const edge = (isRecord(value) ? value : {}) as RecordValue;
  assertKnownKeys(edge, ["color", "width", "style"], path, mode);
  const result: PageSectionBorderEdgeV2 = {};
  // Color via readOptionalSafeColor → sanitizeAuthoringCssColor (only sanctioned path);
  // a bad color is DROPPED (undefined), never persisted raw.
  if (edge.color !== undefined) {
    const color = readOptionalSafeColor(edge.color);
    if (typeof color === "string" && color.length > 0) result.color = color;
  }
  if (edge.width !== undefined) {
    const width = readOptionalClampedNumber(
      edge.width,
      PAGE_SECTION_BORDER_WIDTH_CLAMP,
      `${path}.width`,
      mode
    );
    if (width !== undefined) result.width = width;
  }
  if (edge.style !== undefined) {
    result.style = normalizeEnum(edge.style, pageBlockBorderStyles, "solid", `${path}.style`, mode);
  }
  // Include the edge ONLY if it has at least one meaningful prop (a visible border
  // needs a color OR a positive width); otherwise omit (present-only).
  const meaningful = Boolean(result.color) || (result.width ?? 0) > 0;
  return meaningful ? result : undefined;
};
const normalizeSectionBorder = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionBorderV2 | undefined => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageSectionBorderEdges, path, mode);
  const result: PageSectionBorderV2 = {};
  for (const edge of pageSectionBorderEdges) {
    if (input[edge] === undefined) continue;
    const normalized = normalizeSectionBorderEdge(input[edge], mode, `${path}.${edge}`);
    if (normalized) result[edge] = normalized;
  }
  // Present-only whole-object omit: return undefined when NO edge survives.
  return Object.keys(result).length > 0 ? result : undefined;
};
// ── END TASK-533-02 REGION ────────────────────────────────────────────────────

const normalizeSectionStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionStyleV2> | PageSectionStyleV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(
    input,
    [
      "background",
      "backgroundType",
      "backgroundImage",
      "accent",
      "radius",
      "shadow",
      "scrollEffect",
      "parallaxIntensity",
      // TASK-522-01-L03 section composition fields (present-only).
      "surfacePreset",
      "composition",
      // TASK-525-01-L02 full-bleed background (present-only boolean).
      "fullBleed",
      // ── TASK-531 REGION: glow box-shadow (present-only object).
      "glow",
      // ── END TASK-531 REGION ──────────────────────────────────────────────
      // ── TASK-533-01 REGION: asymmetric column ratio (present-only string).
      "columnTemplate",
      // ── END TASK-533-01 REGION ────────────────────────────────────────────
      // ── TASK-533-02 REGION: per-edge section border (present-only object).
      "border",
      // ── END TASK-533-02 REGION ────────────────────────────────────────────
    ],
    path,
    mode
  );
  const result: Partial<PageSectionStyleV2> = {};
  if (!partial || input.background !== undefined) {
    result.background = readSafeBackground(input.background, defaultStyle.background);
  }
  if (!partial || input.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      input.backgroundType,
      pageBackgroundTypes,
      defaultStyle.backgroundType,
      `${path}.backgroundType`,
      mode
    );
  }
  if (!partial || input.backgroundImage !== undefined) {
    result.backgroundImage = readOptionalMediaUrl(input.backgroundImage) ?? null;
  }
  if (!partial || input.accent !== undefined) {
    result.accent = readSafeColor(input.accent, defaultStyle.accent);
  }
  if (!partial || input.radius !== undefined) {
    result.radius = readNumber(input.radius, defaultStyle.radius, 0, 64);
  }
  if (!partial || input.shadow !== undefined) {
    result.shadow = normalizeEnum(
      input.shadow,
      pageShadowTokens,
      defaultStyle.shadow,
      `${path}.shadow`,
      mode
    );
  }
  // Present-only scroll motion (TASK-521-01-L01). `"none"` is omitted so an
  // effect toggled off returns to byte identity; `defaultStyle` seeds neither
  // key, so `{ ...defaultStyle, ...result }` stays unchanged when unauthored.
  if (input.scrollEffect !== undefined) {
    const effect = normalizeEnum(
      input.scrollEffect,
      pageSectionScrollEffects,
      "none",
      `${path}.scrollEffect`,
      mode
    );
    if (effect !== "none") result.scrollEffect = effect;
  }
  if (input.parallaxIntensity !== undefined) {
    result.parallaxIntensity = readNumber(
      input.parallaxIntensity,
      20,
      PAGE_PARALLAX_INTENSITY_CLAMP.min,
      PAGE_PARALLAX_INTENSITY_CLAMP.max
    );
  }
  // TASK-522-01-L03 section composition (present-only; `"none"`/`"flow"` omitted;
  // `defaultStyle` seeds neither so an unauthored section stays byte-identical).
  if (input.surfacePreset !== undefined) {
    const s = normalizeEnum(
      input.surfacePreset,
      pageSurfacePresets,
      "none",
      `${path}.surfacePreset`,
      mode
    );
    if (s !== "none") result.surfacePreset = s;
  }
  if (input.composition !== undefined) {
    const c = normalizeEnum(
      input.composition,
      pageCompositions,
      "flow",
      `${path}.composition`,
      mode
    );
    if (c !== "flow") result.composition = c;
  }
  // TASK-525-01-L02 full-bleed background (present-only boolean; mirror tiltGlare).
  // Emitted ONLY when `=== true`; `false`/unset omitted so a non-bleed section
  // stays byte-identical (`defaultStyle` seeds no key).
  if (input.fullBleed === true) result.fullBleed = true;
  // ── TASK-531 REGION: glow box-shadow (present-only; omitted when color invalid).
  if (input.glow !== undefined) {
    const glow = normalizeGlow(input.glow, mode, `${path}.glow`);
    if (glow) result.glow = glow;
  }
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-533-01 REGION: asymmetric column ratio (present-only sanitized string).
  // The ONLY author string reaching a CSS value position — routed through the strict
  // allowlist `sanitizeAuthoringGridTemplate`; rejection/empty ⇒ OMIT (never emit raw).
  if (input.columnTemplate !== undefined) {
    const template = sanitizeAuthoringGridTemplate(input.columnTemplate);
    if (typeof template === "string" && template.length > 0) result.columnTemplate = template;
  }
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
  // ── TASK-533-02 REGION: per-edge section border (present-only whole-object omit).
  if (input.border !== undefined) {
    const border = normalizeSectionBorder(input.border, mode, `${path}.border`);
    if (border) result.border = border;
  }
  // ── END TASK-533-02 REGION ────────────────────────────────────────────────
  return partial ? result : ({ ...defaultStyle, ...result } satisfies PageSectionStyleV2);
};

const normalizeSectionSpacing = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionSpacingV2> | PageSectionSpacingV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(
    input,
    ["paddingTop", "paddingBottom", "paddingLeft", "paddingRight", "gap"],
    path,
    mode
  );
  const result: Partial<PageSectionSpacingV2> = {};
  if (!partial || input.paddingTop !== undefined) {
    result.paddingTop = readNumber(input.paddingTop, defaultSpacing.paddingTop, 0, 240);
  }
  if (!partial || input.paddingBottom !== undefined) {
    result.paddingBottom = readNumber(input.paddingBottom, defaultSpacing.paddingBottom, 0, 240);
  }
  if (!partial || input.paddingLeft !== undefined) {
    result.paddingLeft = readNumber(input.paddingLeft, defaultSpacing.paddingLeft, 0, 240);
  }
  if (!partial || input.paddingRight !== undefined) {
    result.paddingRight = readNumber(input.paddingRight, defaultSpacing.paddingRight, 0, 240);
  }
  if (!partial || input.gap !== undefined) {
    result.gap = readNumber(input.gap, defaultSpacing.gap, 0, 120);
  }
  return partial ? result : ({ ...defaultSpacing, ...result } satisfies PageSectionSpacingV2);
};

const normalizeSectionVisibility = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageSectionVisibilityV2> | PageSectionVisibilityV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["visible", "authOnly", "anchor", "startsAt", "endsAt"], path, mode);
  const result: Partial<PageSectionVisibilityV2> = {};
  if (!partial || input.visible !== undefined) {
    result.visible = readBoolean(input.visible, defaultVisibility.visible);
  }
  if (!partial || input.authOnly !== undefined) {
    result.authOnly = readBoolean(input.authOnly, defaultVisibility.authOnly);
  }
  if (!partial || input.anchor !== undefined) {
    result.anchor = normalizeAnchor(input.anchor);
  }
  if (!partial || input.startsAt !== undefined) {
    result.startsAt = readOptionalText(input.startsAt) ?? null;
  }
  if (!partial || input.endsAt !== undefined) {
    result.endsAt = readOptionalText(input.endsAt) ?? null;
  }
  return partial ? result : ({ ...defaultVisibility, ...result } satisfies PageSectionVisibilityV2);
};

const normalizeAnchor = (value: unknown) => {
  const text = readOptionalText(value);
  if (!text) return null;
  return text.startsWith("#") ? text.slice(1) : text;
};

const normalizeBlockStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): PageBlockStyleV2 | undefined => {
  if (value === undefined && partial) return undefined;
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBlockStyleKeys, path, mode);
  const result: PageBlockStyleV2 = {};
  if (input.align !== undefined) {
    result.align = normalizeEnum(input.align, pageTextAlignments, "left", `${path}.align`, mode);
  }
  if (input.width !== undefined) {
    result.width = normalizeEnum(input.width, pageBlockWidths, "auto", `${path}.width`, mode);
  }
  if (input.column !== undefined) {
    // Section-column placement: integer 1..4, `null` = legacy auto-flow.
    const clamped = readNullableClampedNumber(
      input.column,
      PAGE_SECTION_BLOCK_COLUMN_CLAMP,
      `${path}.column`,
      mode
    );
    result.column = clamped === null ? null : Math.trunc(clamped);
  }
  if (input.textColor !== undefined) {
    result.textColor = readOptionalSafeColor(input.textColor) ?? null;
  }
  if (input.background !== undefined) {
    result.background = readOptionalSafeBackground(input.background) ?? null;
  }
  // TASK-524-02-L01: present-only independent glass tint — emit ONLY a valid
  // sanitized color; omit the key otherwise (never null/"") so no-tint /
  // bad-tint blocks stay byte-identical to 522.
  if (input.surfaceTint !== undefined) {
    const tint = readOptionalSafeColor(input.surfaceTint);
    if (typeof tint === "string" && tint.length > 0) {
      result.surfaceTint = tint;
    }
  }
  if (input.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      input.backgroundType,
      pageBackgroundTypes,
      "none",
      `${path}.backgroundType`,
      mode
    );
  }
  if (input.backgroundImage !== undefined) {
    result.backgroundImage = readOptionalMediaUrl(input.backgroundImage) ?? null;
  }
  if (input.opacity !== undefined) {
    result.opacity = readNumber(input.opacity, 1, 0, 1);
  }
  if (input.radius !== undefined) {
    result.radius = readNumber(input.radius, 0, 0, 64);
  }
  if (input.shadow !== undefined) {
    result.shadow = normalizeEnum(input.shadow, pageShadowTokens, "none", `${path}.shadow`, mode);
  }
  if (input.borderColor !== undefined) {
    result.borderColor = readOptionalSafeColor(input.borderColor) ?? null;
  }
  if (input.borderWidth !== undefined) {
    const width = readOptionalClampedNumber(
      input.borderWidth,
      PAGE_BLOCK_BORDER_WIDTH_CLAMP,
      `${path}.borderWidth`,
      mode
    );
    if (width !== undefined) result.borderWidth = width;
  }
  if (input.borderStyle !== undefined) {
    result.borderStyle = normalizeEnum(
      input.borderStyle,
      pageBlockBorderStyles,
      "none",
      `${path}.borderStyle`,
      mode
    );
  }
  if (input.padding !== undefined) {
    const padding = normalizeBlockBoxSpacing(input.padding, mode, `${path}.padding`);
    if (padding) result.padding = padding;
  }
  if (input.margin !== undefined) {
    const margin = normalizeBlockBoxSpacing(input.margin, mode, `${path}.margin`);
    if (margin) result.margin = margin;
  }
  if (input.fontFamily !== undefined) {
    result.fontFamily = normalizeNullableEnum(
      input.fontFamily,
      pageTypographyFontFamilies,
      `${path}.fontFamily`,
      mode
    );
  }
  if (input.fontSize !== undefined) {
    result.fontSize = normalizeNullableEnum(
      input.fontSize,
      pageTypographyFontSizes,
      `${path}.fontSize`,
      mode
    );
  }
  if (input.fontWeight !== undefined) {
    result.fontWeight = normalizeNullableEnum(
      input.fontWeight,
      pageTypographyFontWeights,
      `${path}.fontWeight`,
      mode
    );
  }
  if (input.lineHeight !== undefined) {
    result.lineHeight = readNullableClampedNumber(
      input.lineHeight,
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
      `${path}.lineHeight`,
      mode
    );
  }
  if (input.letterSpacing !== undefined) {
    result.letterSpacing = readNullableClampedNumber(
      input.letterSpacing,
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
      `${path}.letterSpacing`,
      mode
    );
  }
  // TASK-522-01-L03 composition/decoration fields — all present-only. Enums
  // fail-closed (write mode throws on a bad VALUE); the "none"/"flow" reset
  // member is OMITTED; numbers clamp fail-soft; nested unknown keys reject.
  if (input.decoration !== undefined) {
    const d = (isRecord(input.decoration) ? input.decoration : {}) as RecordValue;
    assertKnownKeys(d, ["motion", "delay", "duration"], `${path}.decoration`, mode);
    const motion = normalizeEnum(
      d.motion,
      pageBlockDecorationMotions,
      "none",
      `${path}.decoration.motion`,
      mode
    );
    if (motion !== "none") {
      const deco: PageBlockDecoration = { motion };
      if (d.delay !== undefined) {
        deco.delay = readNumber(
          d.delay,
          0,
          PAGE_DECORATION_DELAY_CLAMP.min,
          PAGE_DECORATION_DELAY_CLAMP.max
        );
      }
      if (d.duration !== undefined) {
        deco.duration = readNumber(
          d.duration,
          6000,
          PAGE_DECORATION_DURATION_CLAMP.min,
          PAGE_DECORATION_DURATION_CLAMP.max
        );
      }
      result.decoration = deco;
    }
  }
  if (input.tilt !== undefined) {
    const t = normalizeEnum(input.tilt, pageTiltStrengths, "none", `${path}.tilt`, mode);
    if (t !== "none") result.tilt = t;
  }
  if (input.tiltGlare !== undefined && input.tiltGlare === true) result.tiltGlare = true;
  if (input.layer !== undefined) {
    const l = (isRecord(input.layer) ? input.layer : {}) as RecordValue;
    assertKnownKeys(l, ["x", "y", "z", "anchor"], `${path}.layer`, mode);
    const layer: PageBlockLayer = {};
    if (l.x !== undefined)
      layer.x = readNumber(l.x, 0, PAGE_LAYER_X_CLAMP.min, PAGE_LAYER_X_CLAMP.max);
    if (l.y !== undefined)
      layer.y = readNumber(l.y, 0, PAGE_LAYER_Y_CLAMP.min, PAGE_LAYER_Y_CLAMP.max);
    if (l.z !== undefined)
      layer.z = readNumber(l.z, 0, PAGE_LAYER_Z_CLAMP.min, PAGE_LAYER_Z_CLAMP.max);
    if (l.anchor !== undefined) {
      layer.anchor = normalizeEnum(
        l.anchor,
        pageLayerAnchors,
        "center",
        `${path}.layer.anchor`,
        mode
      );
    }
    if (Object.keys(layer).length) result.layer = layer;
  }
  if (input.surfacePreset !== undefined) {
    const s = normalizeEnum(
      input.surfacePreset,
      pageSurfacePresets,
      "none",
      `${path}.surfacePreset`,
      mode
    );
    if (s !== "none") result.surfacePreset = s;
  }
  if (input.hoverEffect !== undefined) {
    const h = normalizeEnum(
      input.hoverEffect,
      pageBlockHoverEffects,
      "none",
      `${path}.hoverEffect`,
      mode
    );
    if (h !== "none") result.hoverEffect = h;
  }
  if (input.composition !== undefined) {
    const c = normalizeEnum(
      input.composition,
      pageCompositions,
      "flow",
      `${path}.composition`,
      mode
    );
    if (c !== "flow") result.composition = c;
  }
  if (input.marquee !== undefined) {
    const mq = (isRecord(input.marquee) ? input.marquee : {}) as RecordValue;
    assertKnownKeys(mq, ["speed", "direction", "seamless"], `${path}.marquee`, mode);
    const marquee: PageBlockMarquee = {};
    if (mq.speed !== undefined) {
      marquee.speed = readNumber(
        mq.speed,
        18,
        PAGE_MARQUEE_SPEED_CLAMP.min,
        PAGE_MARQUEE_SPEED_CLAMP.max
      );
    }
    if (mq.direction !== undefined) {
      marquee.direction = normalizeEnum(
        mq.direction,
        pageMarqueeDirections,
        "left",
        `${path}.marquee.direction`,
        mode
      );
    }
    if (mq.seamless === true) marquee.seamless = true;
    if (Object.keys(marquee).length) result.marquee = marquee;
  }
  // TASK-525-02-L01 per-block staggered reveal — present-only via readNumber
  // (Number.isFinite + clamp; NaN/Infinity fail-soft to 0, out-of-range clamps).
  // Emitted ONLY when authored so an unset block stays byte-identical.
  if (input.revealDelay !== undefined) {
    result.revealDelay = readNumber(
      input.revealDelay,
      0,
      PAGE_REVEAL_DELAY_CLAMP.min,
      PAGE_REVEAL_DELAY_CLAMP.max
    );
  }
  // ── TASK-531 REGION: glow box-shadow (present-only; omitted when color invalid).
  if (input.glow !== undefined) {
    const glow = normalizeGlow(input.glow, mode, `${path}.glow`);
    if (glow) result.glow = glow;
  }
  // ── END TASK-531 REGION ──────────────────────────────────────────────────
  // ── TASK-533-01 REGION: block grid span (present-only clamped ints).
  // Emitted ONLY as `span N` literals at render (533-01-L02); NaN/Infinity/out-of-range
  // clamp fail-soft; Math.trunc so `span ${n}` is always an integer.
  if (input.colSpan !== undefined) {
    const n = readOptionalClampedNumber(
      input.colSpan,
      PAGE_BLOCK_SPAN_CLAMP,
      `${path}.colSpan`,
      mode
    );
    if (n !== undefined) result.colSpan = Math.trunc(n);
  }
  if (input.rowSpan !== undefined) {
    const n = readOptionalClampedNumber(
      input.rowSpan,
      PAGE_BLOCK_SPAN_CLAMP,
      `${path}.rowSpan`,
      mode
    );
    if (n !== undefined) result.rowSpan = Math.trunc(n);
  }
  // ── END TASK-533-01 REGION ────────────────────────────────────────────────
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeBlockBoxSpacing = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageBoxSpacingV2 | undefined => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBoxSpacingKeys, path, mode);
  const result: PageBoxSpacingV2 = {};
  for (const key of pageBoxSpacingKeys) {
    if (input[key] !== undefined) {
      result[key] = readNumber(
        input[key],
        0,
        PAGE_BLOCK_BOX_SPACING_CLAMP.min,
        PAGE_BLOCK_BOX_SPACING_CLAMP.max
      );
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

const normalizeBlockVisibility = (
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Partial<PageBlockVisibilityV2> | PageBlockVisibilityV2 => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, ["visible"], path, mode);
  const result: Partial<PageBlockVisibilityV2> = {};
  if (!partial || input.visible !== undefined) {
    result.visible = readBoolean(input.visible, defaultBlockVisibility.visible);
  }
  return partial
    ? result
    : ({ ...defaultBlockVisibility, ...result } satisfies PageBlockVisibilityV2);
};

const normalizeBlockProps = (
  type: PageBlockType,
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Record<string, unknown> => {
  const input = requireRecord(value ?? {}, path, mode);
  assertKnownKeys(input, pageBlockPropKeys[type], path, mode);
  const defaults = pageBlockDefaultProps[type];
  const result: Record<string, unknown> = partial ? {} : { ...defaults };

  for (const key of pageBlockPropKeys[type]) {
    if (key === "marks") continue;
    if (input[key] !== undefined)
      result[key] = normalizeBlockProp(type, key, input[key], mode, `${path}.${key}`);
  }
  if (isPageTextMarkCapableBlockType(type) && input.marks !== undefined) {
    const text = typeof result.text === "string" ? result.text : "";
    result.marks = normalizeBlockTextMarksForMode(text, input.marks, mode, `${path}.marks`);
  }

  return result;
};

/**
 * List items normalizer: plain strings stay plain strings (legacy and
 * non-link items), `{ label, href }` records stay link items, and unknown
 * record keys reject on fresh writes (reject-unknown contract). A link item
 * whose `href` trims to empty collapses back to a plain string, so the stored
 * shape is deterministic: an object item ALWAYS carries a usable link target.
 */
const normalizeListItems = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageListItemV2[] => {
  const input = requireArray(value ?? [], path, mode);
  const result: PageListItemV2[] = [];
  for (const [index, item] of input.entries()) {
    const itemPath = `${path}.${index}`;
    if (typeof item === "string") {
      result.push(item.trim());
      continue;
    }
    if (isRecord(item)) {
      assertKnownKeys(item, ["label", "href"], itemPath, mode);
      const label = item.label;
      const href = item.href;
      if (mode === "write" && (typeof label !== "string" || typeof href !== "string")) {
        throw new PageDocumentError(
          "page_document_invalid",
          `Invalid list item at ${itemPath}.`,
          itemPath
        );
      }
      result.push(
        createPageListItem(
          typeof label === "string" ? label.trim() : "",
          typeof href === "string" ? href : ""
        )
      );
      continue;
    }
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Invalid list item at ${itemPath}.`,
        itemPath
      );
    }
    // Stored reads stay non-destructive: scalar legacy values keep their text.
    result.push(typeof item === "number" || typeof item === "boolean" ? String(item) : "");
  }
  return result;
};

const pageFiltersFacetKeys = [
  "id",
  "kind",
  "label",
  "field",
  "op",
  "options",
  "sortOptions",
  "presentation",
] as const;
const pageFiltersFacetOptionKeys = ["label", "value", "parentValue"] as const;
const pageFiltersFacetSortOptionKeys = ["label", "value", "field", "dir"] as const;
const pageFiltersFacetPresentationKeys = [
  "controlMode",
  "rangeStep",
  "rangeInputMode",
  "dateInputMode",
] as const;

/**
 * Filters block facet normalizer (TASK-459-02). Fresh writes preserve the
 * reject-unknown contract on every nested record; the canonical stored shape
 * is owned by the listing filter contract (`normalizeListingFacetConfigs`),
 * so the document, the editor, and the runtime resolver agree on ids, default
 * operators, and option shapes. Stored reads stay non-destructive: invalid
 * entries drop instead of failing the document.
 */
const normalizeFiltersFacets = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): ListingFacetConfig[] => {
  const input = requireArray(value ?? [], path, mode);
  if (mode === "write" && input.length > PAGE_FILTERS_MAX_FACETS) {
    throw new PageDocumentError(
      "page_document_invalid",
      `Filters block allows at most ${PAGE_FILTERS_MAX_FACETS} facets.`,
      path
    );
  }
  if (mode === "write") {
    input.forEach((entry, index) => {
      const facetPath = `${path}.${index}`;
      const record = requireRecord(entry, facetPath, mode);
      assertKnownKeys(record, pageFiltersFacetKeys, facetPath, mode);
      if (record.options !== undefined) {
        requireArray(record.options, `${facetPath}.options`, mode).forEach(
          (option, optionIndex) => {
            const optionPath = `${facetPath}.options.${optionIndex}`;
            assertKnownKeys(
              requireRecord(option, optionPath, mode),
              pageFiltersFacetOptionKeys,
              optionPath,
              mode
            );
          }
        );
      }
      if (record.sortOptions !== undefined) {
        requireArray(record.sortOptions, `${facetPath}.sortOptions`, mode).forEach(
          (option, optionIndex) => {
            const optionPath = `${facetPath}.sortOptions.${optionIndex}`;
            assertKnownKeys(
              requireRecord(option, optionPath, mode),
              pageFiltersFacetSortOptionKeys,
              optionPath,
              mode
            );
          }
        );
      }
      if (record.presentation !== undefined) {
        assertKnownKeys(
          requireRecord(record.presentation, `${facetPath}.presentation`, mode),
          pageFiltersFacetPresentationKeys,
          `${facetPath}.presentation`,
          mode
        );
      }
    });
  }
  return normalizeListingFacetConfigs(input.slice(0, PAGE_FILTERS_MAX_FACETS));
};

const normalizeFiltersAliases = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): ListingRuntimeAliasMap => {
  const input = requireRecord(value ?? {}, path, mode);
  const normalized = normalizeListingRuntimeAliases(input);

  if (mode === "write") {
    const entries = Object.entries(input);
    const hasInvalidEntry =
      entries.length > 24 ||
      entries.some(
        ([alias, token]) => typeof token !== "string" || normalized[alias] !== token.trim()
      ) ||
      Object.keys(normalized).length !== entries.length;
    if (hasInvalidEntry) {
      throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
    }
  }

  return normalized;
};

const normalizeGalleryItems = (value: unknown): Record<string, unknown>[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") {
      const src = sanitizeAuthoringMediaUrl(item);
      return src ? [{ src, alt: "", caption: "" }] : [];
    }
    if (!isRecord(item)) return [];
    const src =
      readOptionalMediaUrl(item.src) ??
      readOptionalMediaUrl(item.url) ??
      readOptionalMediaUrl(item.image) ??
      readOptionalMediaUrl(item.assetUrl) ??
      "";
    const alt = readOptionalText(item.alt) ?? readOptionalText(item.title) ?? "";
    const caption =
      readOptionalText(item.caption) ??
      readOptionalText(item.title) ??
      readOptionalText(item.label) ??
      readOptionalText(item.name) ??
      readOptionalText(item.description) ??
      "";
    if (!src && !caption) return [];
    return [{ src, alt, caption }];
  });
};

const normalizeBlockProp = (
  type: PageBlockType,
  key: string,
  value: unknown,
  mode: NormalizeMode,
  path: string
) => {
  if (type === "heading" && key === "level") {
    return normalizeEnum(value, pageHeadingLevels, "h2", path, mode);
  }
  if ((type === "heading" || type === "text") && key === "align") {
    return normalizeEnum(value, pageTextAlignments, "left", path, mode);
  }
  if (type === "text" && key === "format") {
    return normalizeEnum(value, pageTextFormats, "plain", path, mode);
  }
  if (type === "badge" && key === "variant") {
    return normalizeEnum(value, pageBadgeVariants, "soft", path, mode);
  }
  if (type === "badge" && key === "size") {
    return normalizeEnum(value, pageBadgeSizes, "sm", path, mode);
  }
  if (type === "badge" && key === "shape") {
    return normalizeEnum(value, pageBadgeShapes, "pill", path, mode);
  }
  if (type === "badge" && key === "weight") {
    return normalizeEnum(value, pageBadgeWeights, "semibold", path, mode);
  }
  if (type === "badge" && key === "iconPosition") {
    return normalizeEnum(value, pageBadgeIconPositions, "start", path, mode);
  }
  if (type === "badge" && (key === "background" || key === "textColor")) {
    const color = readOptionalSafeColor(value);
    if (value !== undefined && value !== null && color == null && mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
    }
    return color ?? null;
  }
  if (type === "badge" && key === "icon") {
    const icon = readOptionalText(value);
    return icon && pageBadgeIcons.includes(icon as PageBadgeIcon) ? icon : null;
  }
  if (type === "button" && key === "target") {
    return normalizeEnum(value, pageButtonTargets, "self", path, mode);
  }
  if (type === "button" && key === "variant") {
    return normalizeEnum(value, pageButtonVariants, "primary", path, mode);
  }
  if (type === "button" && key === "size") {
    return normalizeEnum(value, pageButtonSizes, "md", path, mode);
  }
  if (type === "image" && key === "fit") {
    return normalizeEnum(value, pageImageFits, "cover", path, mode);
  }
  if (type === "gallery" && key === "layout") {
    return normalizeEnum(value, pageGalleryLayouts, "grid", path, mode);
  }
  if (type === "filters" && key === "layout") {
    return normalizeEnum(value, pageFiltersBlockLayouts, "horizontal", path, mode);
  }
  if (type === "filters" && key === "facets") {
    return normalizeFiltersFacets(value, mode, path);
  }
  if (type === "filters" && key === "aliases") {
    return normalizeFiltersAliases(value, mode, path);
  }
  if (type === "collection" && key === "paginationMode") {
    return normalizeEnum(value, pageCollectionPaginationModes, "none", path, mode);
  }
  if (type === "collection" && key === "pageSize") {
    // Nullable page size: `null` follows `limit`; numbers clamp to the single
    // owner bound (out-of-range stored values normalize on read).
    if (value === null || value === undefined) return null;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      if (mode === "write") {
        throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
      }
      return null;
    }
    return readNumber(
      Math.trunc(value),
      PAGE_COLLECTION_LIMIT_CLAMP.min,
      PAGE_COLLECTION_LIMIT_CLAMP.min,
      PAGE_COLLECTION_LIMIT_CLAMP.max
    );
  }
  if (type === "divider" && key === "tone") {
    return normalizeEnum(value, pageDividerTones, "neutral", path, mode);
  }
  if (type === "columns" && key === "distribution") {
    return normalizeEnum(value, pageColumnDistributions, "equal", path, mode);
  }
  if (type === "group" && key === "direction") {
    return normalizeEnum(value, pageGroupDirections, "column", path, mode);
  }
  if (key === "limit") {
    return readNumber(value, 6, PAGE_COLLECTION_LIMIT_CLAMP.min, PAGE_COLLECTION_LIMIT_CLAMP.max);
  }
  if (key === "thickness") return readNumber(value, 1, 1, 16);
  if (type === "columns" && key === "count") return readNumber(value, 2, 1, 4);
  if ((type === "columns" || type === "group") && key === "gap") {
    return readNumber(value, type === "columns" ? 24 : 16, 0, 120);
  }
  if (type === "spacer" && key === "size") return readNumber(value, 32, 0, 240);
  // Animated-icon block props (TASK-521-01-L03). These MUST precede the generic
  // `value.trim()` string tail below, else `name` bypasses the icon-name
  // allowlist. `name` = pattern + Set-membership (fail-soft "sparkles");
  // `animation` = fail-CLOSED enum (bad value throws in write mode); numeric
  // props clamp (fail-soft); `color` via readSafeColor (fail-soft). `label`
  // falls through to the generic text tail intentionally.
  if (type === "icon" && key === "name") return resolveAnimatedIconName(value);
  if (type === "icon" && key === "animation") {
    return normalizeEnum(value, animatedIconAnimations, "none", path, mode);
  }
  if (type === "icon" && key === "size") {
    return readNumber(value, 48, ANIMATED_ICON_SIZE_CLAMP.min, ANIMATED_ICON_SIZE_CLAMP.max);
  }
  if (type === "icon" && key === "color") return readSafeColor(value, "var(--primary)");
  if (type === "icon" && key === "speed") {
    return readNumber(value, 1600, ANIMATED_ICON_SPEED_CLAMP.min, ANIMATED_ICON_SPEED_CLAMP.max);
  }
  // Custom-SVG block props (TASK-522-01-L01). MUST precede the generic string
  // tail below, else `svg`/`label` bypass sanitize/slice. `svg` is allowlist-
  // sanitized (fail-soft "" on reject = the default); `drawSpeed` clamps;
  // `label` slices; `drawIn` coerces to boolean.
  if (type === "customSvg" && key === "svg") {
    const rawSvg = typeof value === "string" ? value : "";
    return sanitizeSvg(rawSvg, PAGE_CUSTOM_SVG_MAX_BYTES);
  }
  if (type === "customSvg" && key === "drawIn") {
    return value === true;
  }
  if (type === "customSvg" && key === "drawSpeed") {
    return readNumber(value, 2400, PAGE_DRAW_SPEED_CLAMP.min, PAGE_DRAW_SPEED_CLAMP.max);
  }
  if (type === "customSvg" && key === "label") {
    return typeof value === "string" ? value.slice(0, 160) : "";
  }
  if (
    key === "ordered" ||
    key === "autoplay" ||
    key === "muted" ||
    key === "wrap" ||
    key === "autoApply" ||
    key === "showSearch" ||
    key === "showCount"
  ) {
    return Boolean(value);
  }
  if (type === "list" && key === "items") return normalizeListItems(value, mode, path);
  if (type === "gallery" && key === "items") return normalizeGalleryItems(value);
  if (key === "items") return Array.isArray(value) ? cloneRecord(value) : [];
  if (key === "href") return readOptionalLinkHref(value) ?? null;
  if (key === "src" || key === "image" || key === "url") return readOptionalMediaUrl(value) ?? null;
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (isRecord(value) || Array.isArray(value)) return cloneRecord(value);
  return value;
};

const normalizeBlockResponsive = (
  value: unknown,
  type: PageBlockType,
  mode: NormalizeMode,
  path: string
): PageBlockV2["responsive"] => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, path, mode);
  assertKnownKeys(input, mobileBreakpoints, path, mode);
  const result: NonNullable<PageBlockV2["responsive"]> = {};

  for (const breakpoint of mobileBreakpoints) {
    if (input[breakpoint] === undefined) continue;
    const overrideInput = requireRecord(input[breakpoint], `${path}.${breakpoint}`, mode);
    assertKnownKeys(overrideInput, ["props", "style", "visibility"], `${path}.${breakpoint}`, mode);
    let overridePropsInput = overrideInput.props;
    if (isRecord(overridePropsInput) && overridePropsInput.marks !== undefined) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Text marks are base-only at ${path}.${breakpoint}.props.marks.`,
          `${path}.${breakpoint}.props.marks`
        );
      }
      const propsWithoutMarks = { ...overridePropsInput };
      delete propsWithoutMarks.marks;
      overridePropsInput = propsWithoutMarks;
    }
    const props =
      overridePropsInput === undefined
        ? undefined
        : normalizeBlockProps(type, overridePropsInput, mode, `${path}.${breakpoint}.props`, true);
    const style = normalizeBlockStyle(
      overrideInput.style,
      mode,
      `${path}.${breakpoint}.style`,
      true
    );
    const visibility =
      overrideInput.visibility === undefined
        ? undefined
        : normalizeBlockVisibility(
            overrideInput.visibility,
            mode,
            `${path}.${breakpoint}.visibility`,
            true
          );
    const normalized = {
      ...(props ? { props } : {}),
      ...(style ? { style } : {}),
      ...(visibility && Object.keys(visibility).length > 0 ? { visibility } : {}),
    };
    if (Object.keys(normalized).length > 0) result[breakpoint] = normalized;
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const ensureUniqueBlockId = (
  id: string,
  path: string,
  context: BlockNormalizationContext
): string => {
  if (!context.blockIds.has(id)) {
    context.blockIds.add(id);
    return id;
  }
  if (context.mode === "write") {
    throw new PageDocumentError(
      "page_document_invalid",
      `Duplicate page block id: ${id}.`,
      `${path}.id`
    );
  }

  let suffix = 2;
  let candidate = `${id}_${suffix}`;
  while (context.blockIds.has(candidate)) {
    suffix += 1;
    candidate = `${id}_${suffix}`;
  }
  context.blockIds.add(candidate);
  return candidate;
};

const normalizeBlockSlots = (
  value: unknown,
  type: PageBlockType,
  mode: NormalizeMode,
  path: string,
  depth: number,
  context: BlockNormalizationContext
): PageBlockV2["slots"] => {
  if (value === undefined) return undefined;
  const allowedSlots = pageBlockCapabilities[type].slots;
  if (allowedSlots.length === 0) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Block type ${type} does not support slots.`,
        path
      );
    }
    return undefined;
  }
  if (depth >= PAGE_BLOCK_MAX_TREE_DEPTH) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block slots exceed the maximum nesting depth.",
        path
      );
    }
    return undefined;
  }
  if (!isRecord(value)) {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Expected object at ${path}.`, path);
    }
    return undefined;
  }

  assertKnownKeys(value, allowedSlots, path, mode);
  const result: NonNullable<PageBlockV2["slots"]> = {};

  for (const slotKey of allowedSlots) {
    const slotValue = value[slotKey];
    if (slotValue === undefined) continue;
    if (!Array.isArray(slotValue)) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Expected array at ${path}.${slotKey}.`,
          `${path}.${slotKey}`
        );
      }
      continue;
    }
    if (slotValue.length > PAGE_BLOCK_MAX_CHILDREN_PER_SLOT && mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Page block slot ${path}.${slotKey} exceeds ${PAGE_BLOCK_MAX_CHILDREN_PER_SLOT} children.`,
        `${path}.${slotKey}`
      );
    }

    const normalizedChildren: PageBlockV2[] = [];
    const children = slotValue.slice(0, PAGE_BLOCK_MAX_CHILDREN_PER_SLOT);
    children.forEach((child, childIndex) => {
      for (const expandedChild of expandLegacyFiltersCollectionBlock(child)) {
        const normalized = normalizeBlock(
          expandedChild,
          `${path}.${slotKey}.${childIndex}`,
          normalizedChildren.length,
          mode,
          depth + 1,
          context
        );
        if (normalized) normalizedChildren.push(normalized);
      }
    });
    result[slotKey] = normalizedChildren;
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const legacyFiltersCollectionFilterPropKeys = [
  "queryId",
  "facets",
  "aliases",
  "layout",
  "autoApply",
  "showSearch",
  "showCount",
  "searchLabel",
  "searchPlaceholder",
  "applyLabel",
] as const;

const legacyFiltersCollectionStripPropKeys = new Set<string>([
  "mode",
  ...legacyFiltersCollectionFilterPropKeys.filter((key) => key !== "queryId"),
]);

/**
 * Non-destructive legacy adapter (TASK-459-02, frozen TASK-459-01 decision):
 * assistant blueprints historically attached `mode: "filters"` plus the
 * filter-surface props to a COLLECTION block. Those payloads now normalize
 * into a filters + collection pair: the dedicated filters block owns the
 * facet controls, while the original collection block keeps rendering the
 * linked results. Collection blocks WITHOUT `mode: "filters"` are untouched,
 * so existing documents render byte-identically.
 */
const expandLegacyFiltersCollectionBlock = (value: unknown): unknown[] => {
  if (!isRecord(value) || value.type !== "collection" || !isRecord(value.props)) return [value];
  if (value.props.mode !== "filters") return [value];
  const legacy = value.props;
  const props: RecordValue = {};
  for (const key of legacyFiltersCollectionFilterPropKeys) {
    if (legacy[key] !== undefined) props[key] = legacy[key];
  }
  const collectionProps = Object.fromEntries(
    Object.entries(legacy).filter(([key]) => !legacyFiltersCollectionStripPropKeys.has(key))
  );
  const sourceId = typeof value.id === "string" ? value.id.trim() : "";
  const filtersId = sourceId ? `${sourceId}_filters` : undefined;
  const filtersBlock = {
    ...value,
    ...(filtersId ? { id: filtersId } : {}),
    type: "filters",
    props,
  };
  const collectionBlock = {
    ...value,
    props: collectionProps,
  };
  return [filtersBlock, collectionBlock];
};

const normalizeBlock = (
  value: unknown,
  path: string,
  blockIndex: number,
  mode: NormalizeMode,
  depth: number,
  context: BlockNormalizationContext
): PageBlockV2 | null => {
  if (depth > PAGE_BLOCK_MAX_TREE_DEPTH) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block tree exceeds the maximum nesting depth.",
        path
      );
    }
    return null;
  }
  const input = requireRecord(value, path, mode);
  if (context.visiting.has(input)) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Page block tree contains a cycle.",
        path
      );
    }
    return null;
  }

  context.visiting.add(input);
  try {
    assertKnownKeys(
      input,
      ["id", "type", "props", "style", "visibility", "responsive", "slots"],
      path,
      mode
    );
    const type = normalizeEnum(input.type, pageBlockTypes, "text", `${path}.type`, mode);
    const id = ensureUniqueBlockId(normalizeId(input.id, "blk", blockIndex, mode), path, context);
    const style = normalizeBlockStyle(input.style, mode, `${path}.style`);
    const responsive = normalizeBlockResponsive(input.responsive, type, mode, `${path}.responsive`);
    const slots = normalizeBlockSlots(input.slots, type, mode, `${path}.slots`, depth, context);
    return {
      id,
      type,
      props: normalizeBlockProps(type, input.props, mode, `${path}.props`),
      ...(style ? { style } : {}),
      visibility: normalizeBlockVisibility(
        input.visibility,
        mode,
        `${path}.visibility`
      ) as PageBlockVisibilityV2,
      ...(responsive ? { responsive } : {}),
      ...(slots ? { slots } : {}),
    };
  } finally {
    context.visiting.delete(input);
  }
};

const normalizeSectionResponsive = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionV2["responsive"] => {
  if (value === undefined) return {};
  const input = requireRecord(value, path, mode);
  assertKnownKeys(input, mobileBreakpoints, path, mode);
  const result: PageSectionV2["responsive"] = {};

  for (const breakpoint of mobileBreakpoints) {
    if (input[breakpoint] === undefined) continue;
    const overrideInput = requireRecord(input[breakpoint], `${path}.${breakpoint}`, mode);
    assertKnownKeys(
      overrideInput,
      ["layout", "style", "spacing", "visibility"],
      `${path}.${breakpoint}`,
      mode
    );
    const layout =
      overrideInput.layout === undefined
        ? undefined
        : normalizeSectionLayout(overrideInput.layout, mode, `${path}.${breakpoint}.layout`, true);
    const style =
      overrideInput.style === undefined
        ? undefined
        : normalizeSectionStyle(overrideInput.style, mode, `${path}.${breakpoint}.style`, true);
    const spacing =
      overrideInput.spacing === undefined
        ? undefined
        : normalizeSectionSpacing(
            overrideInput.spacing,
            mode,
            `${path}.${breakpoint}.spacing`,
            true
          );
    const visibility =
      overrideInput.visibility === undefined
        ? undefined
        : normalizeSectionVisibility(
            overrideInput.visibility,
            mode,
            `${path}.${breakpoint}.visibility`,
            true
          );
    const normalized = {
      ...(layout && Object.keys(layout).length > 0 ? { layout } : {}),
      ...(style && Object.keys(style).length > 0 ? { style } : {}),
      ...(spacing && Object.keys(spacing).length > 0 ? { spacing } : {}),
      ...(visibility && Object.keys(visibility).length > 0 ? { visibility } : {}),
    };
    if (Object.keys(normalized).length > 0) result[breakpoint] = normalized;
  }

  return result;
};

const normalizeSection = (
  value: unknown,
  index: number,
  mode: NormalizeMode,
  blockContext: BlockNormalizationContext
): PageSectionV2 => {
  const path = `sections.${index}`;
  const input = requireRecord(value, path, mode);
  assertKnownKeys(
    input,
    [
      "id",
      "type",
      "name",
      "variant",
      "layout",
      "style",
      "spacing",
      "visibility",
      "responsive",
      "blocks",
    ],
    path,
    mode
  );
  const type = normalizeEnum(input.type, pageSectionTypes, "custom", `${path}.type`, mode);
  const blocks: PageBlockV2[] = [];
  requireArray(input.blocks, `${path}.blocks`, mode).forEach((block, blockIndex) => {
    for (const expandedBlock of expandLegacyFiltersCollectionBlock(block)) {
      const normalized = normalizeBlock(
        expandedBlock,
        `${path}.blocks.${blockIndex}`,
        blocks.length,
        mode,
        1,
        blockContext
      );
      if (normalized) blocks.push(normalized);
    }
  });

  return {
    id: normalizeId(input.id, "sec", index, mode),
    type,
    name: readText(input.name, toSectionName(type)),
    variant: normalizeEnum(input.variant, pageSectionVariants, "default", `${path}.variant`, mode),
    layout: normalizeSectionLayout(input.layout, mode, `${path}.layout`) as PageSectionLayoutV2,
    style: normalizeSectionStyle(input.style, mode, `${path}.style`) as PageSectionStyleV2,
    spacing: normalizeSectionSpacing(
      input.spacing,
      mode,
      `${path}.spacing`
    ) as PageSectionSpacingV2,
    visibility: normalizeSectionVisibility(
      input.visibility,
      mode,
      `${path}.visibility`
    ) as PageSectionVisibilityV2,
    responsive: normalizeSectionResponsive(input.responsive, mode, `${path}.responsive`),
    blocks,
  };
};

const toSectionName = (type: PageSectionType) =>
  type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const createPageDocumentIdSuffix = () => {
  const suffix = createSecureRandomHexFragment(12);
  if (suffix) return suffix;
  throw new PageDocumentError(
    "page_document_invalid",
    "Secure randomness is required to create page document ids.",
    "id"
  );
};

export function createPageDocumentId(prefix: "sec" | "blk" = "sec") {
  return `${prefix}_${createPageDocumentIdSuffix()}`;
}

export function createDefaultPageDocumentV2(): PageDocumentV2 {
  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: [...defaultBreakpoints],
    seo: { ...defaultSeo },
    settings: { ...defaultSettings },
    sections: [],
  };
}

export function createPageBlockV2(type: PageBlockType, input?: Partial<PageBlockV2>): PageBlockV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("blk"),
    type,
    props: input?.props ?? pageBlockDefaultProps[type],
    style: input?.style,
    visibility: input?.visibility ?? defaultBlockVisibility,
    responsive: input?.responsive,
    slots: input?.slots,
  };
  const block = normalizeBlock(payload, "block", 0, "stored-read", 1, {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
  if (!block)
    throw new PageDocumentError("page_document_invalid", "Page block is invalid.", "block");
  return block;
}

export function createPageSectionV2(
  type: PageSectionType,
  input?: Partial<PageSectionV2>
): PageSectionV2 {
  const payload = {
    id: input?.id ?? createPageDocumentId("sec"),
    type,
    name: input?.name ?? toSectionName(type),
    variant: input?.variant ?? "default",
    layout: input?.layout ?? defaultLayout,
    style: input?.style ?? defaultStyle,
    spacing: input?.spacing ?? defaultSpacing,
    visibility: input?.visibility ?? defaultVisibility,
    responsive: input?.responsive ?? {},
    blocks: input?.blocks ?? [],
  };
  return normalizeSection(payload, 0, "stored-read", {
    mode: "stored-read",
    blockIds: new Set(),
    visiting: new WeakSet(),
  });
}

export function isPageDocumentError(
  error: unknown,
  code?: PageDocumentErrorCode
): error is PageDocumentError {
  return error instanceof PageDocumentError && (!code || error.code === code);
}

export function isLegacyOrVersionlessPageDocument(value: unknown): boolean {
  if (!isRecord(value)) return true;
  if (value.schemaVersion === PAGE_DOCUMENT_SCHEMA_VERSION) return false;
  return value.schemaVersion === undefined || Array.isArray(value.blocks);
}

export function normalizePageDocumentV2ForWrite(value: unknown): PageDocumentV2 {
  const input = requireRecord(value, "data", "write");
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    throw new PageDocumentError(
      "page_document_invalid",
      "Pages require schemaVersion 2 and sections[].",
      "schemaVersion"
    );
  }
  assertKnownKeys(
    input,
    ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
    "",
    "write"
  );

  return normalizePageDocumentV2(input, "write");
}

export function normalizeStoredPageDocumentV2ForRead(value: unknown): PageDocumentV2 {
  if (isLegacyOrVersionlessPageDocument(value)) return createDefaultPageDocumentV2();
  return normalizePageDocumentV2(value, "stored-read");
}

export function normalizePageDocumentV2(
  value: unknown,
  mode: NormalizeMode = "write"
): PageDocumentV2 {
  const input = requireRecord(value, "data", mode);
  if (mode === "write") {
    assertKnownKeys(
      input,
      ["schemaVersion", "breakpoints", "seo", "settings", "sections"],
      "",
      mode
    );
  }
  if (input.schemaVersion !== PAGE_DOCUMENT_SCHEMA_VERSION) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Pages require schemaVersion 2 and sections[].",
        "schemaVersion"
      );
    }
    return createDefaultPageDocumentV2();
  }

  const blockContext: BlockNormalizationContext = {
    mode,
    blockIds: new Set(),
    visiting: new WeakSet(),
  };
  const sections = requireArray(input.sections, "sections", mode).map((section, index) =>
    normalizeSection(section, index, mode, blockContext)
  );

  return {
    schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION,
    breakpoints: normalizeBreakpoints(input.breakpoints, mode),
    seo: normalizeSeo(input.seo, mode),
    settings: normalizeSettings(input.settings, mode),
    sections,
  };
}

export function resolvePageSectionForBreakpoint(
  section: PageSectionV2,
  breakpoint: PageBreakpoint
): PageSectionV2 {
  const base = cloneRecord(section);
  if (breakpoint === "desktop") {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }
  const override = section.responsive[breakpoint];
  if (!override) {
    return {
      ...base,
      blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
    };
  }

  return {
    ...base,
    layout: { ...section.layout, ...(override.layout ?? {}) },
    style: { ...section.style, ...(override.style ?? {}) },
    spacing: { ...section.spacing, ...(override.spacing ?? {}) },
    visibility: { ...section.visibility, ...(override.visibility ?? {}) },
    blocks: base.blocks.map((block) => resolvePageBlockForBreakpoint(block, breakpoint)),
  };
}

export function resolvePageBlockForBreakpoint(
  block: PageBlockV2,
  breakpoint: PageBreakpoint
): PageBlockV2 {
  const base = cloneRecord(block);
  const resolveSlots = (slots: PageBlockV2["slots"]): PageBlockV2["slots"] | undefined => {
    if (!slots) return undefined;
    return Object.fromEntries(
      Object.entries(slots).map(([slotKey, children]) => [
        slotKey,
        (children ?? []).map((child) => resolvePageBlockForBreakpoint(child, breakpoint)),
      ])
    ) as PageBlockV2["slots"];
  };
  const resolvedSlots = resolveSlots(base.slots);
  if (breakpoint === "desktop") {
    return resolvedSlots ? { ...base, slots: resolvedSlots } : base;
  }
  const override = block.responsive?.[breakpoint];
  if (!override) return resolvedSlots ? { ...base, slots: resolvedSlots } : base;

  const style = { ...(base.style ?? {}), ...(override.style ?? {}) };
  const resolved: PageBlockV2 = {
    ...base,
    props: { ...base.props, ...(override.props ?? {}) },
    visibility: { ...base.visibility, ...(override.visibility ?? {}) },
    ...(resolvedSlots ? { slots: resolvedSlots } : {}),
  };
  if (Object.keys(style).length > 0) resolved.style = style;
  else delete resolved.style;
  return resolved;
}

export function resolvePageDocumentForBreakpoint(
  document: PageDocumentV2,
  breakpoint: PageBreakpoint
): PageDocumentV2 {
  return {
    ...cloneRecord(document),
    sections: document.sections.map((section) =>
      resolvePageSectionForBreakpoint(section, breakpoint)
    ),
  };
}

export function clearResponsiveOverride(
  section: PageSectionV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageSectionV2 {
  if (path.length === 0) return cloneRecord(section);
  const next = cloneRecord(section);
  const override = next.responsive[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive;
    next.responsive = rest;
  }
  return next;
}

export function clearBlockResponsiveOverride(
  block: PageBlockV2,
  breakpoint: MobileBreakpoint,
  path: readonly string[]
): PageBlockV2 {
  if (path.length === 0) return cloneRecord(block);
  const next = cloneRecord(block);
  const override = next.responsive?.[breakpoint];
  if (!override) return next;
  removeNestedPath(override as RecordValue, path);
  if (isEmptyRecord(override)) {
    const { [breakpoint]: _removed, ...rest } = next.responsive ?? {};
    if (Object.keys(rest).length > 0) next.responsive = rest;
    else delete next.responsive;
  }
  return next;
}

export function toPublishedPageDocumentV2(value: unknown): PageDocumentV2 {
  return stripEditorFields(normalizeStoredPageDocumentV2ForRead(value)) as PageDocumentV2;
}

const removeNestedPath = (target: RecordValue, path: readonly string[]) => {
  const [head, ...tail] = path;
  if (!head) return;
  if (tail.length === 0) {
    delete target[head];
    return;
  }
  const child = target[head];
  if (!isRecord(child)) return;
  removeNestedPath(child, tail);
  if (isEmptyRecord(child)) delete target[head];
};

const isEmptyRecord = (value: unknown): value is RecordValue =>
  isRecord(value) && Object.keys(value).length === 0;

const stripEditorFields = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripEditorFields);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "editor")
      .map(([key, nested]) => [key, stripEditorFields(nested)])
  );
};
