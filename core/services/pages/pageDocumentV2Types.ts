import { contentListLimitMax } from "../../widgets/core/contentList";
import type { MenuAppearance } from "../menus/normalizeMenuAppearance";
import { DEFAULT_TOKENS } from "../theme/tokenTypes";
import type {
  PageBlockResponsiveStyleV2,
  PageSectionResponsiveStyleV2,
} from "./pageResponsiveStyleV2";

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
  // ── TASK-534 ── declarative interactivity primitives (customSvg pattern).
  "switcher", // segmented tabs; N panels in slots panel:1..panel:6 (absorbs 527).
  "scrollHint", // hero scroll-hint indicator (CSS-keyframe dot/chevron, no runtime).
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
  // ── TASK-534 ── switcher panel slots (one child-block tree per tab).
  "panel:1",
  "panel:2",
  "panel:3",
  "panel:4",
  "panel:5",
  "panel:6",
] as const;

// ── TASK-534 ── declarative-interactivity vocabulary (single source of truth).
/** Number of `panel:N` slots ⇒ the hard upper bound on switcher tabs/panels. */
export const SWITCHER_MAX_PANELS = 6 as const;
export const switcherVariants = ["pill", "underline"] as const;
export type PageSwitcherVariant = (typeof switcherVariants)[number];
export const PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH = 160 as const;
export const PAGE_SWITCHER_DEFAULT_ARIA_LABEL = "Content tabs" as const;
export const scrollHintGlyphs = ["dot", "chevron"] as const;
export type PageScrollHintGlyph = (typeof scrollHintGlyphs)[number];
/** Max chip categories exposed on a filterable gallery. */
export const GALLERY_FILTER_CATEGORY_MAX = 12 as const;
/**
 * A gallery category is a SINGLE kebab/word token — NO SPACE. The runtime filter
 * (534-01-L03) treats an item's `data-category` as a SPACE-SEPARATED SET of tokens
 * (`cat.split(" ").indexOf(f)`), and each chip's `data-filter` is ONE token; a
 * space inside a single category would split it into two tokens so a whole-phrase
 * chip could never match. Multiple categories per item join with spaces.
 */
export const GALLERY_CATEGORY_PATTERN = /^[\w-]{1,48}$/;

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
// ── TASK-532 heavier weights (Bundle B) — extend the enum with extrabold/black ──
export const pageTypographyFontWeights = [
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
] as const;
// ── TASK-532 text-transform (Bundle B) — present-only enum ──
export const pageTypographyTextTransforms = [
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
] as const;
// ── TASK-532 eyebrow-divider alignment + rule-length bounds (Bundle B) ──
export const pageDividerAligns = ["left", "center", "right"] as const;
/** Eyebrow short-rule length bounds in px (decorative divider width). */
export const PAGE_DIVIDER_WIDTH_CLAMP = { min: 8, max: 400 } as const;
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
// ── TASK-532 text-transform type (Bundle B) ──
export type PageTypographyTextTransform = (typeof pageTypographyTextTransforms)[number];
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
  PageTextColorMark | PageTextHighlightMark | PageTextLinkMark | PageTextStructuralMark;

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
  // ── TASK-532 heavier weights (Bundle B) ──
  extrabold: "800",
  black: "900",
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
  // ── TASK-534 ── present-only page-root static grain overlay (self-generated
  // SVG turbulence; no author color, no asset). Omitted when false/unset.
  noiseOverlay?: boolean;
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
  /**
   * ── TASK-534 ── Static self-generated SVG-turbulence grain over the section
   * surface. Present-only: omitted when false/unset so an un-authored section
   * serializes byte-identically. STATIC (renders identically under reduced-motion).
   */
  noiseOverlay?: boolean;
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
  // ── TASK-532 typography fidelity (Bundle B) — present-only fields ──
  /**
   * Fluid font-size (present-only). A strict `clamp()`/`min()`/`max()` of
   * numeric-unit lengths (`rem`/`em`/`px`/`vw`/`vh`/`%`/`ch`) or a single such
   * length — validated by {@link sanitizeAuthoringCssFontSize} at the write
   * boundary (NEVER arbitrary CSS). WINS over the discrete `fontSize` token at
   * render (`toPageBlockTypographyStyle`); the token remains the fallback/unset
   * state. Omitted when unset or when the grammar rejects.
   */
  fontSizeCustom?: string;
  /**
   * Text-transform (present-only enum). `"none"` resets ⇒ the field is OMITTED
   * so an un-authored block is byte-identical to post-530.
   */
  textTransform?: PageTypographyTextTransform;
  // ── end TASK-532 typography fidelity ──
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
  /**
   * ── TASK-534 ── Magnetic pointer-attract on hover. Present-only: omitted when
   * false/unset. A runtime clause (`PAGE_EFFECTS_RUNTIME_SOURCE`, 534-01-L03)
   * translates the element toward the pointer, `pointer:fine` + reduced-motion
   * gated (transforms only). Reaches render solely as a `data-magnetic` toggle.
   */
  magnetic?: boolean;
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
  style?: PageBlockResponsiveStyleV2;
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
  style?: PageSectionResponsiveStyleV2;
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
export const normalizeSwitcherAriaLabel = (
  value: unknown,
  mode: "stored-read" | "write"
): string | undefined => {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Invalid switcher.props.ariaLabel.",
        "switcher.props.ariaLabel"
      );
    }
    return undefined;
  }
  const label = value.trim();
  if (label.length === 0) return undefined;
  if (label.length > PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        "Invalid switcher.props.ariaLabel.",
        "switcher.props.ariaLabel"
      );
    }
    return undefined;
  }
  return label;
};

export const resolveSwitcherAriaLabel = (value: unknown): string => {
  const label = typeof value === "string" ? value.trim() : "";
  return label.length > 0 && label.length <= PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH
    ? label
    : PAGE_SWITCHER_DEFAULT_ARIA_LABEL;
};
