import {
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringCssFontSize,
  sanitizeAuthoringLinkHref,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import {
  defaultBlockVisibility,
  defaultStyle,
  pageBlockStyleKeys,
  pageBoxSpacingKeys,
} from "./pageDocumentV2Contract";
import type {
  PageBlockResponsiveLayerV2,
  PageBlockResponsiveStyleV2,
  PageSectionResponsiveStyleV2,
} from "./pageResponsiveStyleV2";
import {
  PAGE_BLOCK_BORDER_WIDTH_CLAMP,
  PAGE_BLOCK_BOX_SPACING_CLAMP,
  PAGE_BLOCK_SPAN_CLAMP,
  PAGE_DECORATION_DELAY_CLAMP,
  PAGE_DECORATION_DURATION_CLAMP,
  PAGE_GLOW_BLUR_CLAMP,
  PAGE_GLOW_OFFSET_CLAMP,
  PAGE_GLOW_SPREAD_CLAMP,
  PAGE_LAYER_X_CLAMP,
  PAGE_LAYER_Y_CLAMP,
  PAGE_LAYER_Z_CLAMP,
  PAGE_MARQUEE_SPEED_CLAMP,
  PAGE_REVEAL_DELAY_CLAMP,
  PAGE_SECTION_BLOCK_COLUMN_CLAMP,
  PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
  PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
  PageDocumentError,
  pageBackgroundTypes,
  pageBlockBorderStyles,
  pageBlockDecorationMotions,
  pageBlockHoverEffects,
  pageBlockWidths,
  pageCompositions,
  pageLayerAnchors,
  pageMarqueeDirections,
  pageShadowTokens,
  pageSurfacePresets,
  pageTextAlignments,
  pageTiltStrengths,
  pageTypographyFontFamilies,
  pageTypographyFontSizes,
  pageTypographyFontWeights,
  pageTypographyTextTransforms,
  type PageBlockDecoration,
  type PageBlockLayer,
  type PageBlockMarquee,
  type PageBlockStyleV2,
  type PageBlockVisibilityV2,
  type PageBoxSpacingV2,
  type PageBreakpoint,
  type PageGlow,
} from "./pageDocumentV2Types";

export type NormalizeMode = "stored-read" | "write";
export type RecordValue = Record<string, unknown>;
export type MobileBreakpoint = Exclude<PageBreakpoint, "desktop">;
export type BlockNormalizationContext = {
  mode: NormalizeMode;
  blockIds: Set<string>;
  visiting: WeakSet<object>;
};

export const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

export const cloneRecord = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const readText = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const readOptionalText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const readSafeColor = (value: unknown, fallback: string) =>
  sanitizeAuthoringCssColor(value) ?? fallback;

export const readOptionalSafeColor = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringCssColor(value);
};

export const readSafeBackground = (value: unknown, fallback: string) =>
  sanitizeAuthoringCssBackground(value) ?? fallback;

export const readOptionalSafeBackground = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringCssBackground(value);
};

export const readOptionalLinkHref = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringLinkHref(value);
};

export const readOptionalMediaUrl = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return sanitizeAuthoringMediaUrl(value);
};

export const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const readNumber = (value: unknown, fallback: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value as number));
};

export const normalizeEnum = <T extends string>(
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
export const normalizeNullableEnum = <T extends string>(
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
export const readNullableClampedNumber = (
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

export const readOptionalClampedNumber = (
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

export const assertKnownKeys = (
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

export const requireRecord = (value: unknown, path: string, mode: NormalizeMode): RecordValue => {
  if (isRecord(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected object at ${path}.`, path);
  }
  return {};
};

export const requireArray = (value: unknown, path: string, mode: NormalizeMode): unknown[] => {
  if (Array.isArray(value)) return value;
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Expected array at ${path}.`, path);
  }
  return [];
};

export const normalizeId = (
  value: unknown,
  prefix: string,
  index: number,
  mode: NormalizeMode
): string => {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (mode === "write") {
    throw new PageDocumentError("page_document_invalid", `Missing ${prefix} id.`, `${prefix}.id`);
  }
  return `${prefix}_${index + 1}`;
};

export const normalizeGlow = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageGlow | undefined => {
  const glowInput = (isRecord(value) ? value : {}) as RecordValue;
  assertKnownKeys(glowInput, ["color", "blur", "spread", "x", "y"], path, mode);
  const color = readOptionalSafeColor(glowInput.color);
  if (typeof color !== "string" || color.length === 0) return undefined;
  const glow: PageGlow = { color };
  if (glowInput.blur !== undefined) {
    glow.blur = readNumber(glowInput.blur, 24, PAGE_GLOW_BLUR_CLAMP.min, PAGE_GLOW_BLUR_CLAMP.max);
  }
  if (glowInput.spread !== undefined) {
    glow.spread = readNumber(
      glowInput.spread,
      0,
      PAGE_GLOW_SPREAD_CLAMP.min,
      PAGE_GLOW_SPREAD_CLAMP.max
    );
  }
  if (glowInput.x !== undefined) {
    glow.x = readNumber(glowInput.x, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  }
  if (glowInput.y !== undefined) {
    glow.y = readNumber(glowInput.y, 0, PAGE_GLOW_OFFSET_CLAMP.min, PAGE_GLOW_OFFSET_CLAMP.max);
  }
  return glow;
};

export const normalizeBlockStyle = (
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
  // ── TASK-532 typography fidelity (Bundle B) — present-only ──
  // Fluid font-size: grammar-validated at the write boundary. A non-conforming
  // value returns `null` ⇒ the field is OMITTED (never stored raw); this is the
  // security boundary — L05 emits only this already-sanitized value.
  if (input.fontSizeCustom !== undefined) {
    const safe = sanitizeAuthoringCssFontSize(input.fontSizeCustom);
    if (safe) result.fontSizeCustom = safe;
  }
  // Text-transform: fail-closed enum; `"none"` resets ⇒ omitted (present-only).
  if (input.textTransform !== undefined) {
    const t = normalizeEnum(
      input.textTransform,
      pageTypographyTextTransforms,
      "none",
      `${path}.textTransform`,
      mode
    );
    if (t !== "none") result.textTransform = t;
  }
  // ── end TASK-532 ──
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
  // ── TASK-534 ── present-only magnetic-hover flag; emitted ONLY when === true so
  // an un-authored / disabled block stays byte-identical (mirrors tiltGlare).
  if (input.magnetic !== undefined && readBoolean(input.magnetic, false)) {
    result.magnetic = true;
  }
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

// ── TASK-539 REGION: dedicated strict responsive style normalizers ───────────

/** Base-only/structural section style keys a responsive override must never carry. */
export const pageSectionResponsiveStyleForbiddenKeys = [
  "scrollEffect",
  "parallaxIntensity",
  "surfacePreset",
  "composition",
  "fullBleed",
  "noiseOverlay",
  "columnTemplate",
  "border",
] as const;

/** Base-only/structural block style keys a responsive override must never carry. */
export const pageBlockResponsiveStyleForbiddenKeys = [
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

const pageSectionResponsiveStyleKeys = [
  "background",
  "backgroundType",
  "backgroundImage",
  "accent",
  "radius",
  "shadow",
  "glow",
] as const;

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
  "layer",
  "surfaceTint",
  "glow",
  "colSpan",
  "rowSpan",
] as const;

/**
 * Presence means an own enumerable key even when its value is `undefined`;
 * never a value-only truthiness test. Known base-only/structural keys reject
 * as `page_document_invalid` at their exact authored path.
 */
const rejectForbiddenKeys = (input: RecordValue, forbidden: readonly string[], path: string) => {
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      throw new PageDocumentError(
        "page_document_invalid",
        `Invalid ${path}.${key}.`,
        `${path}.${key}`
      );
    }
  }
};

/** Fresh candidate without the given own keys; never mutates the caller's object. */
const withoutOwnKeys = (input: RecordValue, keys: readonly string[]): RecordValue => {
  const candidate: RecordValue = {};
  for (const [key, value] of Object.entries(input)) {
    if (!keys.includes(key)) candidate[key] = value;
  }
  return candidate;
};

export const invalidAt = (path: string): PageDocumentError =>
  new PageDocumentError("page_document_invalid", `Invalid ${path}.`, path);

/**
 * Dedicated responsive section style normalizer (TASK-539). Write rejects every
 * known base-only/structural key as `page_document_invalid` at its exact path
 * before the reject-unknown allowlist; stored read copies without the forbidden
 * own keys and normalizes the allowed paint siblings.
 */
export const normalizeSectionResponsiveStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageSectionResponsiveStyleV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, path, mode);
  const candidate =
    mode === "write" ? input : withoutOwnKeys(input, pageSectionResponsiveStyleForbiddenKeys);
  if (mode === "write") rejectForbiddenKeys(input, pageSectionResponsiveStyleForbiddenKeys, path);
  assertKnownKeys(candidate, pageSectionResponsiveStyleKeys, path, mode);
  const result: PageSectionResponsiveStyleV2 = {};
  if (candidate.background !== undefined)
    result.background = readSafeBackground(candidate.background, defaultStyle.background);
  if (candidate.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      candidate.backgroundType,
      pageBackgroundTypes,
      defaultStyle.backgroundType,
      `${path}.backgroundType`,
      mode
    );
  }
  if (candidate.backgroundImage !== undefined)
    result.backgroundImage = readOptionalMediaUrl(candidate.backgroundImage) ?? null;
  if (candidate.accent !== undefined)
    result.accent = readSafeColor(candidate.accent, defaultStyle.accent);
  if (candidate.radius !== undefined)
    result.radius = readNumber(candidate.radius, defaultStyle.radius, 0, 64);
  if (candidate.shadow !== undefined) {
    result.shadow = normalizeEnum(
      candidate.shadow,
      pageShadowTokens,
      defaultStyle.shadow,
      `${path}.shadow`,
      mode
    );
  }
  if (candidate.glow !== undefined) {
    const glow = normalizeGlow(candidate.glow, mode, `${path}.glow`);
    if (glow) result.glow = glow;
  }
  return Object.keys(result).length > 0 ? result : undefined;
};

/**
 * Dedicated responsive block style normalizer (TASK-539). Same forbidden-key /
 * reject-unknown semantics as the section twin. `layer` accepts only `x`/`y`/
 * `z` (write rejects `anchor` at its exact path; stored read drops it), and
 * `textTransform:"none"` is an allowed explicit reset that survives.
 */
export const normalizeBlockResponsiveStyle = (
  value: unknown,
  mode: NormalizeMode,
  path: string
): PageBlockResponsiveStyleV2 | undefined => {
  if (value === undefined) return undefined;
  const input = requireRecord(value, path, mode);
  const candidate =
    mode === "write" ? input : withoutOwnKeys(input, pageBlockResponsiveStyleForbiddenKeys);
  if (mode === "write") rejectForbiddenKeys(input, pageBlockResponsiveStyleForbiddenKeys, path);
  assertKnownKeys(candidate, pageBlockResponsiveStyleKeys, path, mode);
  const result: PageBlockResponsiveStyleV2 = {};
  if (candidate.align !== undefined)
    result.align = normalizeEnum(
      candidate.align,
      pageTextAlignments,
      "left",
      `${path}.align`,
      mode
    );
  if (candidate.width !== undefined)
    result.width = normalizeEnum(candidate.width, pageBlockWidths, "auto", `${path}.width`, mode);
  if (candidate.column !== undefined) {
    const clamped = readNullableClampedNumber(
      candidate.column,
      PAGE_SECTION_BLOCK_COLUMN_CLAMP,
      `${path}.column`,
      mode
    );
    result.column = clamped === null ? null : Math.trunc(clamped);
  }
  if (candidate.textColor !== undefined)
    result.textColor = readOptionalSafeColor(candidate.textColor) ?? null;
  if (candidate.background !== undefined)
    result.background = readOptionalSafeBackground(candidate.background) ?? null;
  if (candidate.backgroundType !== undefined) {
    result.backgroundType = normalizeEnum(
      candidate.backgroundType,
      pageBackgroundTypes,
      "none",
      `${path}.backgroundType`,
      mode
    );
  }
  if (candidate.backgroundImage !== undefined)
    result.backgroundImage = readOptionalMediaUrl(candidate.backgroundImage) ?? null;
  if (candidate.opacity !== undefined) result.opacity = readNumber(candidate.opacity, 1, 0, 1);
  if (candidate.radius !== undefined) result.radius = readNumber(candidate.radius, 0, 0, 64);
  if (candidate.shadow !== undefined)
    result.shadow = normalizeEnum(
      candidate.shadow,
      pageShadowTokens,
      "none",
      `${path}.shadow`,
      mode
    );
  if (candidate.borderColor !== undefined)
    result.borderColor = readOptionalSafeColor(candidate.borderColor) ?? null;
  if (candidate.borderWidth !== undefined) {
    const width = readOptionalClampedNumber(
      candidate.borderWidth,
      PAGE_BLOCK_BORDER_WIDTH_CLAMP,
      `${path}.borderWidth`,
      mode
    );
    if (width !== undefined) result.borderWidth = width;
  }
  if (candidate.borderStyle !== undefined)
    result.borderStyle = normalizeEnum(
      candidate.borderStyle,
      pageBlockBorderStyles,
      "none",
      `${path}.borderStyle`,
      mode
    );
  if (candidate.padding !== undefined) {
    const padding = normalizeBlockBoxSpacing(candidate.padding, mode, `${path}.padding`);
    if (padding) result.padding = padding;
  }
  if (candidate.margin !== undefined) {
    const margin = normalizeBlockBoxSpacing(candidate.margin, mode, `${path}.margin`);
    if (margin) result.margin = margin;
  }
  if (candidate.fontFamily !== undefined)
    result.fontFamily = normalizeNullableEnum(
      candidate.fontFamily,
      pageTypographyFontFamilies,
      `${path}.fontFamily`,
      mode
    );
  if (candidate.fontSize !== undefined)
    result.fontSize = normalizeNullableEnum(
      candidate.fontSize,
      pageTypographyFontSizes,
      `${path}.fontSize`,
      mode
    );
  if (candidate.fontWeight !== undefined)
    result.fontWeight = normalizeNullableEnum(
      candidate.fontWeight,
      pageTypographyFontWeights,
      `${path}.fontWeight`,
      mode
    );
  if (candidate.lineHeight !== undefined)
    result.lineHeight = readNullableClampedNumber(
      candidate.lineHeight,
      PAGE_TYPOGRAPHY_LINE_HEIGHT_CLAMP,
      `${path}.lineHeight`,
      mode
    );
  if (candidate.letterSpacing !== undefined)
    result.letterSpacing = readNullableClampedNumber(
      candidate.letterSpacing,
      PAGE_TYPOGRAPHY_LETTER_SPACING_CLAMP,
      `${path}.letterSpacing`,
      mode
    );
  if (candidate.fontSizeCustom !== undefined) {
    const safe = sanitizeAuthoringCssFontSize(candidate.fontSizeCustom);
    if (safe) result.fontSizeCustom = safe;
  }
  // Responsive `"none"` is an allowed explicit reset and SURVIVES (the base
  // normalizer omits it; the responsive channel is a per-breakpoint reset).
  if (candidate.textTransform !== undefined)
    result.textTransform = normalizeEnum(
      candidate.textTransform,
      pageTypographyTextTransforms,
      "none",
      `${path}.textTransform`,
      mode
    );
  if (candidate.layer !== undefined) {
    const l = (isRecord(candidate.layer) ? candidate.layer : {}) as RecordValue;
    if (mode === "write" && Object.prototype.hasOwnProperty.call(l, "anchor"))
      throw invalidAt(`${path}.layer.anchor`);
    assertKnownKeys(l, ["x", "y", "z"], `${path}.layer`, mode);
    const layer: PageBlockResponsiveLayerV2 = {};
    if (l.x !== undefined)
      layer.x = readNumber(l.x, 0, PAGE_LAYER_X_CLAMP.min, PAGE_LAYER_X_CLAMP.max);
    if (l.y !== undefined)
      layer.y = readNumber(l.y, 0, PAGE_LAYER_Y_CLAMP.min, PAGE_LAYER_Y_CLAMP.max);
    if (l.z !== undefined)
      layer.z = readNumber(l.z, 0, PAGE_LAYER_Z_CLAMP.min, PAGE_LAYER_Z_CLAMP.max);
    if (Object.keys(layer).length > 0) result.layer = layer;
  }
  if (candidate.surfaceTint !== undefined) {
    const tint = readOptionalSafeColor(candidate.surfaceTint);
    if (typeof tint === "string" && tint.length > 0) result.surfaceTint = tint;
  }
  if (candidate.glow !== undefined) {
    const glow = normalizeGlow(candidate.glow, mode, `${path}.glow`);
    if (glow) result.glow = glow;
  }
  if (candidate.colSpan !== undefined) {
    const n = readOptionalClampedNumber(
      candidate.colSpan,
      PAGE_BLOCK_SPAN_CLAMP,
      `${path}.colSpan`,
      mode
    );
    if (n !== undefined) result.colSpan = Math.trunc(n);
  }
  if (candidate.rowSpan !== undefined) {
    const n = readOptionalClampedNumber(
      candidate.rowSpan,
      PAGE_BLOCK_SPAN_CLAMP,
      `${path}.rowSpan`,
      mode
    );
    if (n !== undefined) result.rowSpan = Math.trunc(n);
  }
  return Object.keys(result).length > 0 ? result : undefined;
};
// ── END TASK-539 REGION ──────────────────────────────────────────────────────

export const normalizeBlockVisibility = (
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
