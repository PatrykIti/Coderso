import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../widgets/core/formEmbedContract";
import { PAGE_CSS_VALUE_MAX_LENGTH } from "./pageAuthoringSanitizers";
import {
  PAGE_GALLERY_ALT_MAX,
  PAGE_GALLERY_CAPTION_MAX,
  PAGE_GALLERY_CATEGORY_MAX,
  PAGE_GALLERY_ITEMS_MAX,
  PAGE_GALLERY_SRC_MAX,
  galleryCategoryTokenStackPattern,
} from "./pageGalleryV2";
import {
  mobileBreakpoints,
  pageBlockCapabilities,
  pageBlockPropKeys,
  pageBoxSpacingKeys,
} from "./pageDocumentV2Contract";
import {
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  GALLERY_FILTER_CATEGORY_MAX,
  PAGE_BLOCK_BORDER_WIDTH_CLAMP,
  PAGE_BLOCK_BOX_SPACING_CLAMP,
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  PAGE_BLOCK_SPAN_CLAMP,
  PAGE_COLLECTION_LIMIT_CLAMP,
  PAGE_CUSTOM_SVG_MAX_BYTES,
  PAGE_DECORATION_DELAY_CLAMP,
  PAGE_DECORATION_DURATION_CLAMP,
  PAGE_DIVIDER_WIDTH_CLAMP,
  PAGE_DRAW_SPEED_CLAMP,
  PAGE_FILTERS_MAX_FACETS,
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
  PAGE_LAYER_X_CLAMP,
  PAGE_LAYER_Y_CLAMP,
  PAGE_LAYER_Z_CLAMP,
  PAGE_MARQUEE_SPEED_CLAMP,
  PAGE_REVEAL_DELAY_CLAMP,
  PAGE_SECTION_BLOCK_COLUMN_CLAMP,
  PAGE_SECTION_BORDER_WIDTH_CLAMP,
  PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH,
  PAGE_TEXT_MARK_MAX,
  PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
  PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
  SWITCHER_MAX_PANELS,
  animatedIconAnimations,
  animatedIconNames,
  isPageTextMarkCapableBlockType,
  pageBackgroundTypes,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockBorderStyles,
  pageBlockDecorationMotions,
  pageBlockHoverEffects,
  pageBlockTypes,
  pageBlockWidths,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnDistributions,
  pageCompositions,
  pageDividerAligns,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageFiltersFacetKinds,
  pageFiltersFacetOperators,
  pageGalleryLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageLayerAnchors,
  pageMarqueeDirections,
  pageShadowTokens,
  pageSurfacePresets,
  pageTextAlignments,
  pageTextFormats,
  pageTiltStrengths,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  pageTypographyTextTransforms,
  scrollHintGlyphs,
  switcherVariants,
  type PageBlockType,
} from "./pageDocumentV2Types";

type RecordValue = Record<string, unknown>;

export const numericSchema = (minimum: number, maximum: number): RecordValue => ({
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
export const booleanSchema: RecordValue = { type: "boolean" };
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
  if (type === "collection" && key === "showCta") return booleanSchema;
  if (type === "form" && key === "textareaRows") {
    return {
      type: "integer",
      minimum: FORM_EMBED_TEXTAREA_ROWS_LIMITS.min,
      maximum: FORM_EMBED_TEXTAREA_ROWS_LIMITS.max,
    };
  }
  if (type === "form" && key === "showSelectPrompt") return booleanSchema;
  if (type === "form" && key === "loadingLabel") {
    return {
      type: "string",
      minLength: 1,
      maxLength: FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
      pattern: ".*\\S.*",
    };
  }
  if (type === "form" && key === "successBehavior") {
    return { type: "string", enum: [...FORM_EMBED_SUCCESS_BEHAVIORS] };
  }
  if (type === "divider" && key === "tone") return { type: "string", enum: [...pageDividerTones] };
  // ── TASK-532 eyebrow divider (Bundle B) — present-only decorative props ──
  if (type === "divider" && key === "width") {
    return {
      type: "number",
      minimum: PAGE_DIVIDER_WIDTH_CLAMP.min,
      maximum: PAGE_DIVIDER_WIDTH_CLAMP.max,
    };
  }
  if (type === "divider" && key === "align")
    return { type: "string", enum: [...pageDividerAligns] };
  if (type === "divider" && key === "gradient") return { type: "boolean" };
  // ── end TASK-532 ──
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
  // ── TASK-534 ── switcher / scrollHint / gallery-filter prop schemas. MUST
  // precede the generic tails (`key === "items"`/string) so `tabs`/enums do not
  // fall to a looser type-inconsistent schema than the write normalizer.
  if (type === "switcher" && key === "tabs") {
    return {
      type: "array",
      maxItems: SWITCHER_MAX_PANELS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label"],
        properties: { label: { type: "string" } },
      },
    };
  }
  if (type === "switcher" && key === "activeIndex") {
    return numericSchema(0, SWITCHER_MAX_PANELS - 1);
  }
  if (type === "switcher" && key === "variant") {
    return { type: "string", enum: [...switcherVariants] };
  }
  if (type === "switcher" && key === "ariaLabel") {
    return {
      type: "string",
      minLength: 1,
      maxLength: PAGE_SWITCHER_ARIA_LABEL_MAX_LENGTH,
      pattern: ".*\\S.*",
    };
  }
  if (type === "scrollHint" && key === "glyph") {
    return { type: "string", enum: [...scrollHintGlyphs] };
  }
  if (type === "scrollHint" && key === "label") {
    return { type: "string", maxLength: 160 };
  }
  if (type === "gallery" && key === "filterable") return booleanSchema;
  if (type === "gallery" && key === "filterCategories") {
    return {
      type: "array",
      maxItems: GALLERY_FILTER_CATEGORY_MAX,
      items: { type: "string" },
    };
  }
  if (type === "gallery" && key === "items") return galleryItemsJsonSchema;
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

// ── TASK-539 REGION: strict canonical gallery item schema ────────────────────
// `additionalProperties:false` with REQUIRED `src`/`alt`/`caption`, only the
// optional `category` key, and owner-bound maxLengths/maxItems. JSON Schema
// proves shape and bounds only: the token-stack pattern MAY accept repeated
// tokens; the write normalizer independently enforces uniqueness.
const galleryItemJsonSchema: RecordValue = {
  type: "object",
  required: ["src", "alt", "caption"],
  additionalProperties: false,
  properties: {
    src: { type: "string", maxLength: PAGE_GALLERY_SRC_MAX },
    alt: { type: "string", maxLength: PAGE_GALLERY_ALT_MAX },
    caption: { type: "string", maxLength: PAGE_GALLERY_CAPTION_MAX },
    category: {
      type: "string",
      minLength: 1,
      maxLength: PAGE_GALLERY_CATEGORY_MAX,
      pattern: galleryCategoryTokenStackPattern,
    },
  },
};
const galleryItemsJsonSchema: RecordValue = {
  type: "array",
  maxItems: PAGE_GALLERY_ITEMS_MAX,
  items: galleryItemJsonSchema,
};
// ── END TASK-539 REGION ──────────────────────────────────────────────────────

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
export const pageGlowJsonSchema: RecordValue = {
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
export const pageSectionBorderJsonSchema: RecordValue = {
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

export const pageBlockStyleJsonSchema: RecordValue = {
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
    // ── TASK-532 typography fidelity (Bundle B) — present-only ──
    // `fontSizeCustom` schema is intentionally loose (string + length cap): the
    // GRAMMAR is enforced by `sanitizeAuthoringCssFontSize` at the write
    // boundary (the security boundary); the schema cap is defence-in-depth.
    // Both keep additionalProperties:false so an UNKNOWN key still rejects.
    fontSizeCustom: { type: "string", maxLength: 64 },
    textTransform: { type: "string", enum: [...pageTypographyTextTransforms] },
    // ── end TASK-532 ──
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
    // ── TASK-534 ── present-only magnetic-hover flag (boolean).
    magnetic: booleanSchema,
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

// ── TASK-539 REGION: dedicated strict responsive block style ─────────────────
// Responsive overrides validate against THIS schema, never the base
// `pageBlockStyle` ref. Only the allowed responsive subset is present; the
// base-only/structural keys (decoration, tilt, tiltGlare, surfacePreset,
// hoverEffect, marquee, composition, revealDelay, magnetic) and `layer.anchor`
// are absent, so a hand-authored override carrying one rejects. Allowed
// property definitions are picked from the base owner (no duplicated grammars
// or numeric values); `layer` is narrowed to an `x`/`y`/`z`-only object.
const pageBlockResponsiveLayerJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    x: numericSchema(PAGE_LAYER_X_CLAMP.min, PAGE_LAYER_X_CLAMP.max),
    y: numericSchema(PAGE_LAYER_Y_CLAMP.min, PAGE_LAYER_Y_CLAMP.max),
    z: numericSchema(PAGE_LAYER_Z_CLAMP.min, PAGE_LAYER_Z_CLAMP.max),
  },
};
const pageBlockResponsiveStyleKeys = [
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
  "fontSizeCustom",
  "textTransform",
  "surfaceTint",
  "glow",
  "colSpan",
  "rowSpan",
] as const;
export const pageBlockResponsiveStyleJsonSchema: RecordValue = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...Object.fromEntries(
      pageBlockResponsiveStyleKeys.map((key) => [
        key,
        (pageBlockStyleJsonSchema.properties as RecordValue)[key],
      ])
    ),
    layer: pageBlockResponsiveLayerJsonSchema,
  },
};
const PAGE_BLOCK_RESPONSIVE_STYLE_JSON_SCHEMA_REF = "#/$defs/pageBlockResponsiveStyle";
const pageBlockResponsiveStyleJsonSchemaRef: RecordValue = {
  $ref: PAGE_BLOCK_RESPONSIVE_STYLE_JSON_SCHEMA_REF,
};
// ── END TASK-539 REGION ──────────────────────────────────────────────────────

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
      // TASK-539: dedicated strict responsive block style ref, never the base
      // `pageBlockStyle` ref (base-only/structural keys reject).
      style: pageBlockResponsiveStyleJsonSchemaRef,
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

export const blockDepthJsonSchemaRef = (depth: number): RecordValue => ({
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

export const pageBlockDepthJsonSchemas: RecordValue = Object.fromEntries(
  Array.from({ length: PAGE_BLOCK_MAX_TREE_DEPTH }, (_, index) => {
    const depth = index + 1;
    return [`pageBlockDepth${depth}`, blockJsonSchemaForDepth(depth)];
  })
);
