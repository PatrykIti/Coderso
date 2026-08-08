import {
  normalizeMenuAppearance,
  sanitizeMenuAppearance,
  type MenuAppearance,
} from "../menus/normalizeMenuAppearance";
import {
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringGridTemplate,
} from "./pageAuthoringSanitizers";
import { expandLegacyFiltersCollectionBlock, normalizeBlock } from "./pageBlockNormalizerV2";
import {
  defaultBreakpoints,
  defaultLayout,
  defaultSettings,
  defaultSpacing,
  defaultStyle,
  defaultVisibility,
  mobileBreakpoints,
} from "./pageDocumentV2Contract";
import {
  assertKnownKeys,
  isRecord,
  normalizeEnum,
  normalizeId,
  readBoolean,
  readNumber,
  readOptionalClampedNumber,
  readOptionalMediaUrl,
  readOptionalSafeColor,
  readOptionalText,
  readSafeBackground,
  readSafeColor,
  readText,
  requireArray,
  requireRecord,
  type BlockNormalizationContext,
  type NormalizeMode,
  type RecordValue,
} from "./pageDocumentV2Normalization";
import {
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
  PAGE_PARALLAX_INTENSITY_CLAMP,
  PAGE_SECTION_BORDER_WIDTH_CLAMP,
  PAGE_SPOTLIGHT_SIZE_CLAMP,
  PageDocumentError,
  pageBackgroundTypes,
  pageBlockBorderStyles,
  pageBreakpoints,
  pageCompositions,
  pageSectionAlignments,
  pageSectionJustify,
  pageSectionScrollEffects,
  pageSectionTypes,
  pageSectionVariants,
  pageShadowTokens,
  pageSurfacePresets,
  type PageBlockV2,
  type PageBreakpoint,
  type PageCollectionLinkV2,
  type PageDocumentSeoV2,
  type PageDocumentSettingsV2,
  type PageEffectsV2,
  type PageGlow,
  type PageSectionBorderEdgeV2,
  type PageSectionBorderV2,
  type PageSectionLayoutV2,
  type PageSectionSpacingV2,
  type PageSectionStyleV2,
  type PageSectionV2,
  type PageSectionVisibilityV2,
} from "./pageDocumentV2Types";

const toSectionName = (type: string): string =>
  type
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const normalizeBreakpoints = (value: unknown, mode: NormalizeMode): PageBreakpoint[] => {
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

export const normalizeSeo = (value: unknown, mode: NormalizeMode): PageDocumentSeoV2 => {
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

const PAGE_EFFECTS_KEYS = [
  "cursorSpotlight",
  "spotlightColor",
  "spotlightSize",
  // ── TASK-534 ── page-root static grain overlay (present-only boolean).
  "noiseOverlay",
] as const;

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
  // ── TASK-534 ── page-root grain overlay: present-only (emitted ONLY when true so
  // a spotlight-only / no-effect page stays byte-identical).
  if (input.noiseOverlay === true) result.noiseOverlay = true;
  return Object.keys(result).length ? result : undefined;
};

export const normalizeSettings = (value: unknown, mode: NormalizeMode): PageDocumentSettingsV2 => {
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

export const normalizeSectionLayout = (
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

export const normalizeSectionStyle = (
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
      // ── TASK-534 ── static grain overlay (present-only boolean).
      "noiseOverlay",
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
  // ── TASK-534 ── static grain overlay (present-only; emitted ONLY when === true
  // so a non-grain section stays byte-identical; defaultStyle seeds no key).
  if (input.noiseOverlay === true) result.noiseOverlay = true;
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

export const normalizeSectionSpacing = (
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

export const normalizeSectionVisibility = (
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

export const normalizeSection = (
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
