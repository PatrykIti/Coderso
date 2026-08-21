import {
  normalizeListingFacetConfigs,
  normalizeListingRuntimeAliases,
  type ListingFacetConfig,
  type ListingRuntimeAliasMap,
} from "../search/filterContract";
import {
  FORM_EMBED_LOADING_LABEL_MAX_LENGTH,
  FORM_EMBED_SUCCESS_BEHAVIORS,
  FORM_EMBED_TEXTAREA_ROWS_LIMITS,
} from "../../services/renderContracts/formEmbedContract";
import { sanitizeSvg } from "./svgSanitizer";
import {
  createPageListItem,
  mobileBreakpoints,
  pageBlockCapabilities,
  pageBlockDefaultProps,
  pageBlockPropKeys,
  type PageListItemV2,
} from "./pageDocumentV2Contract";
import {
  assertKnownKeys,
  cloneRecord,
  isRecord,
  normalizeBlockResponsiveStyle,
  normalizeBlockStyle,
  normalizeBlockVisibility,
  normalizeEnum,
  normalizeId,
  readBoolean,
  readNumber,
  readOptionalLinkHref,
  readOptionalMediaUrl,
  readOptionalSafeColor,
  readOptionalText,
  readSafeColor,
  readText,
  requireArray,
  requireRecord,
  type BlockNormalizationContext,
  type NormalizeMode,
  type RecordValue,
} from "./pageDocumentV2Normalization";
import {
  ANIMATED_ICON_SIZE_CLAMP,
  ANIMATED_ICON_SPEED_CLAMP,
  GALLERY_CATEGORY_PATTERN,
  GALLERY_FILTER_CATEGORY_MAX,
  PAGE_BLOCK_MAX_CHILDREN_PER_SLOT,
  PAGE_BLOCK_MAX_TREE_DEPTH,
  PAGE_COLLECTION_LIMIT_CLAMP,
  PAGE_CUSTOM_SVG_MAX_BYTES,
  PAGE_DIVIDER_WIDTH_CLAMP,
  PAGE_DRAW_SPEED_CLAMP,
  PAGE_FILTERS_MAX_FACETS,
  SWITCHER_MAX_PANELS,
  PageDocumentError,
  animatedIconAnimations,
  isPageTextMarkCapableBlockType,
  normalizeSwitcherAriaLabel,
  pageBadgeIconPositions,
  pageBadgeIcons,
  pageBadgeShapes,
  pageBadgeSizes,
  pageBadgeVariants,
  pageBadgeWeights,
  pageBlockTypes,
  pageButtonSizes,
  pageButtonTargets,
  pageButtonVariants,
  pageCollectionPaginationModes,
  pageColumnDistributions,
  pageDividerAligns,
  pageDividerTones,
  pageFiltersBlockLayouts,
  pageGalleryLayouts,
  pageGroupDirections,
  pageHeadingLevels,
  pageImageFits,
  pageTextAlignments,
  pageTextFormats,
  resolveAnimatedIconName,
  scrollHintGlyphs,
  switcherVariants,
  type PageBadgeIcon,
  type PageBlockStyleV2,
  type PageBlockType,
  type PageBlockV2,
  type PageBlockVisibilityV2,
} from "./pageDocumentV2Types";
import { normalizeBlockTextMarksForMode } from "./pageTextMarksV2";
import { normalizeGalleryItems } from "./pageBlockGalleryNormalizer";
import { expandLegacyFiltersCollectionBlock } from "./pageLegacyFiltersExpand";
// Public contract stability (TASK-459): the section normalizer consumes the
// legacy filters expander through this module's facade; the implementation
// moved to pageLegacyFiltersExpand to keep this file within the line limit.
export { expandLegacyFiltersCollectionBlock } from "./pageLegacyFiltersExpand";

// ── TASK-580-03-L01 ── legacy-widget helpers ─────────────────────────────────
// Prototype-pollution keys are rejected from the preserved v1 widget `data`
// copy (same vocabulary as the other owner-backed unsafe-segment sets).
const LEGACY_WIDGET_UNSAFE_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/**
 * Deep-frozen JSON-safe copy of the preserved v1 widget `data`. The value is
 * first JSON-normalized (same semantics as `cloneRecord` for every other props
 * payload — cycles throw, functions/undefined drop), then every object level
 * is frozen and prototype-pollution keys are rejected. Never rendered anywhere:
 * the placeholder shows the type label only.
 */
const deepFreezeCopy = (value: unknown): unknown => {
  const jsonSafe = cloneRecord(value);
  if (Array.isArray(jsonSafe)) {
    return Object.freeze(jsonSafe.map((item) => deepFreezeCopy(item)));
  }
  if (isRecord(jsonSafe)) {
    const copy: RecordValue = {};
    for (const [key, item] of Object.entries(jsonSafe)) {
      if (LEGACY_WIDGET_UNSAFE_KEYS.has(key)) continue;
      copy[key] = deepFreezeCopy(item);
    }
    return Object.freeze(copy);
  }
  return jsonSafe;
};

/**
 * Whole-props normalization of the migration-only `legacy-widget` block.
 * Both keys are ALWAYS present in the stored shape; `legacyWidgetType` is
 * REQUIRED on write (bounded 1..64, non-empty), and a malformed stored doc
 * fails CLOSED on read (`"unknown"` type + `{}` data, never throws).
 */
const normalizeLegacyWidgetProps = (
  input: RecordValue,
  mode: NormalizeMode,
  path: string
): RecordValue => {
  assertKnownKeys(input, ["legacyWidgetType", "data"], path, mode);
  const legacyWidgetType = readText(input.legacyWidgetType, "");
  const data = isRecord(input.data) ? deepFreezeCopy(input.data) : {};
  if (legacyWidgetType.length === 0 || legacyWidgetType.length > 64) {
    if (mode === "write") {
      throw new PageDocumentError(
        "page_document_invalid",
        `Invalid ${path}.legacyWidgetType.`,
        `${path}.legacyWidgetType`
      );
    }
    return { legacyWidgetType: "unknown", data };
  }
  return { legacyWidgetType, data };
};

const normalizeBlockProps = (
  type: PageBlockType,
  value: unknown,
  mode: NormalizeMode,
  path: string,
  partial = false
): Record<string, unknown> => {
  const input = requireRecord(value ?? {}, path, mode);
  // ── TASK-580-03-L01 ── legacy-widget is normalized as ONE unit (the whole
  // props shape): both keys are always present in the stored shape and the
  // required `legacyWidgetType` bound is enforced even when the key is absent.
  // Responsive overrides (partial) keep the generic per-key loop below.
  if (type === "legacy-widget" && !partial) {
    return normalizeLegacyWidgetProps(input, mode, path);
  }
  assertKnownKeys(input, pageBlockPropKeys[type], path, mode);
  const defaults = pageBlockDefaultProps[type];
  const result: Record<string, unknown> = partial ? {} : { ...defaults };

  for (const key of pageBlockPropKeys[type]) {
    if (key === "marks") continue;
    if (input[key] !== undefined) {
      const normalized = normalizeBlockProp(type, key, input[key], mode, `${path}.${key}`);
      // ── TASK-534 ── present-only props (gallery `filterable`/`filterCategories`)
      // return `undefined` when they carry nothing meaningful; do NOT stamp an
      // `undefined`-valued key onto the props object so a non-filterable gallery
      // stays byte-identical to a legacy one (the defaults seed no such key).
      if (normalized !== undefined) result[key] = normalized;
    }
  }
  // ── TASK-539 ── divider `width`/`align` are decorative companions of
  // `gradient:true`; a non-gradient divider drops stale values in BOTH modes
  // (the result is a fresh object, so caller input is never mutated).
  if (type === "divider" && result.gradient !== true) {
    delete result.width;
    delete result.align;
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

/**
 * Mode-aware canonical gallery items normalizer (TASK-539). Write mode is
 * strict: exact keys, required own strings bounded BEFORE any repair, byte
 * identity for `sanitizeAuthoringMediaUrl`/trim, and a category that is
 * exactly 1..12 unique owner tokens joined by one ASCII space. Stored read is
 * adaptive: legacy aliases with pinned precedence, trim-before-cap,
 * sanitize-after-cap, token dedupe, and canonical-only rebuild.
 */

const normalizeBlockProp = (
  type: PageBlockType,
  key: string,
  value: unknown,
  mode: NormalizeMode,
  path: string
) => {
  const rejectOrOmit = (): undefined => {
    if (mode === "write") {
      throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
    }
    return undefined;
  };
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
  if (type === "collection" && key === "showCta") {
    return typeof value === "boolean" ? value : rejectOrOmit();
  }
  if (type === "form" && key === "textareaRows") {
    return typeof value === "number" &&
      Number.isInteger(value) &&
      value >= FORM_EMBED_TEXTAREA_ROWS_LIMITS.min &&
      value <= FORM_EMBED_TEXTAREA_ROWS_LIMITS.max
      ? value
      : rejectOrOmit();
  }
  if (type === "form" && key === "showSelectPrompt") {
    return typeof value === "boolean" ? value : rejectOrOmit();
  }
  if (type === "form" && key === "loadingLabel") {
    if (typeof value !== "string") return rejectOrOmit();
    const label = value.trim();
    return label.length > 0 && label.length <= FORM_EMBED_LOADING_LABEL_MAX_LENGTH
      ? label
      : rejectOrOmit();
  }
  if (type === "form" && key === "successBehavior") {
    return typeof value === "string" &&
      FORM_EMBED_SUCCESS_BEHAVIORS.includes(value as (typeof FORM_EMBED_SUCCESS_BEHAVIORS)[number])
      ? value
      : rejectOrOmit();
  }
  if (type === "divider" && key === "tone") {
    return normalizeEnum(value, pageDividerTones, "neutral", path, mode);
  }
  // ── TASK-532 eyebrow divider (Bundle B) — present-only decorative props ──
  // `width` clamps fail-soft; `align` is a fail-closed enum; `gradient` coerces
  // to a strict boolean. All are only serialized when the author sets them (the
  // generic prop loop writes only keys whose input value !== undefined), so a
  // legacy `{tone,thickness}` divider round-trips byte-identical.
  if (type === "divider" && key === "width") {
    return readNumber(value, 34, PAGE_DIVIDER_WIDTH_CLAMP.min, PAGE_DIVIDER_WIDTH_CLAMP.max);
  }
  if (type === "divider" && key === "align") {
    return normalizeEnum(value, pageDividerAligns, "left", path, mode);
  }
  if (type === "divider" && key === "gradient") {
    return value === true;
  }
  // ── end TASK-532 ──
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
  // ── TASK-534 ── switcher / scrollHint / gallery-filter props. MUST precede the
  // boolean cluster + the generic `key === "items"` / string tail below, else
  // `tabs` (an array) falls to the `items` clone path and enums bypass the
  // fail-closed `normalizeEnum`. Config from validated values only.
  if (type === "switcher" && key === "tabs") {
    // Rebuild each tab as a FRESH { label } ONLY — reading `label`, DISCARDING
    // `href` (the listItems editor can commit `{label,href}`) and every other key
    // BEFORE schema validation, so the switcher tab schema
    // (additionalProperties:false + required:["label"]) never rejects an editor row
    // (534-04-L01). Count clamped to SWITCHER_MAX_PANELS.
    const raw = requireArray(value ?? [], path, mode).slice(0, SWITCHER_MAX_PANELS);
    const tabs = raw.map((tab) => ({
      label: readText(isRecord(tab) ? tab.label : "", ""),
    }));
    return tabs.length ? tabs : [{ label: "Tab one" }];
  }
  if (type === "switcher" && key === "variant") {
    return normalizeEnum(value, switcherVariants, "pill", path, mode);
  }
  if (type === "switcher" && key === "ariaLabel") {
    return normalizeSwitcherAriaLabel(value, mode);
  }
  if (type === "switcher" && key === "activeIndex") {
    // Clamp to the hard panel-count bound; the renderer re-clamps against the
    // actual tab count (defence in depth, 534-02-L01).
    return readNumber(value, 0, 0, SWITCHER_MAX_PANELS - 1);
  }
  if (type === "scrollHint" && key === "glyph") {
    return normalizeEnum(value, scrollHintGlyphs, "dot", path, mode);
  }
  if (type === "scrollHint" && key === "label") {
    return readText(value, "Scroll"); // a11y text, escaped at render.
  }
  // ── TASK-580-03-L01 ── legacy-widget per-key branches. Only reachable on the
  // PARTIAL path (responsive overrides — the whole-props branch above owns the
  // stored shape). Same bounds as the write path; a malformed override fails
  // closed on stored-read ("unknown" / {}), never throws.
  if (type === "legacy-widget" && key === "legacyWidgetType") {
    const label = readText(value, "");
    if (label.length === 0 || label.length > 64) {
      if (mode === "write") {
        throw new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);
      }
      return "unknown";
    }
    return label;
  }
  if (type === "legacy-widget" && key === "data") {
    return isRecord(value) ? deepFreezeCopy(value) : {};
  }
  if (type === "gallery" && key === "filterable") {
    // Present-only: omit `false` so a non-filterable gallery is byte-identical.
    return readBoolean(value, false) ? true : undefined;
  }
  if (type === "gallery" && key === "filterCategories") {
    const cats = (Array.isArray(value) ? value : [])
      .map((c) => (typeof c === "string" ? c.trim() : ""))
      .filter((c) => GALLERY_CATEGORY_PATTERN.test(c)) // single-token allowlist, drop bad.
      .slice(0, GALLERY_FILTER_CATEGORY_MAX);
    return cats.length ? cats : undefined; // present-only.
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
  if (type === "gallery" && key === "items") return normalizeGalleryItems(value, mode, path);
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
  path: string,
  baseStyle: PageBlockStyleV2 | undefined
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
    const baseOnlyProps = new Set<string>([
      "marks",
      ...(type === "switcher" ? ["ariaLabel"] : []),
      ...(type === "collection" ? ["showCta"] : []),
      ...(type === "form"
        ? ["textareaRows", "showSelectPrompt", "loadingLabel", "successBehavior"]
        : []),
    ]);
    if (isRecord(overridePropsInput)) {
      const propsWithoutBaseOnly = { ...overridePropsInput };
      for (const key of baseOnlyProps) {
        if (propsWithoutBaseOnly[key] === undefined) continue;
        const propPath = `${path}.${breakpoint}.props.${key}`;
        if (mode === "write") {
          const baseOnlyMessage =
            key === "marks"
              ? `Text marks are base-only at ${propPath}.`
              : `${key} is base-only at ${propPath}.`;
          throw new PageDocumentError("page_document_invalid", baseOnlyMessage, propPath);
        }
        delete propsWithoutBaseOnly[key];
      }
      overridePropsInput = propsWithoutBaseOnly;
    }
    const normalizedProps =
      overridePropsInput === undefined
        ? undefined
        : normalizeBlockProps(type, overridePropsInput, mode, `${path}.${breakpoint}.props`, true);
    const props =
      normalizedProps && Object.keys(normalizedProps).length > 0 ? normalizedProps : undefined;
    const style = normalizeBlockResponsiveStyle(
      overrideInput.style,
      mode,
      `${path}.${breakpoint}.style`
    );
    // TASK-539 layer reachability: a nonempty responsive layer without a
    // nonempty normalized BASE layer is an unreachable delta. Write rejects at
    // the exact layer path; stored read drops only that layer and lets the
    // empty-record pruning below remove a now-empty style/breakpoint.
    if (style?.layer && !(baseStyle?.layer && Object.keys(baseStyle.layer).length > 0)) {
      if (mode === "write") {
        throw new PageDocumentError(
          "page_document_invalid",
          `Invalid ${path}.${breakpoint}.style.layer.`,
          `${path}.${breakpoint}.style.layer`
        );
      }
      delete style.layer;
    }
    const normalizedStyle = style && Object.keys(style).length > 0 ? style : undefined;
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
      ...(normalizedStyle ? { style: normalizedStyle } : {}),
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

export const normalizeBlock = (
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
    const responsive = normalizeBlockResponsive(
      input.responsive,
      type,
      mode,
      `${path}.responsive`,
      style
    );
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
