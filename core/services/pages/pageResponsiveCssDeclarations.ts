/**
 * Responsive CSS declarations (TASK-539-06-L01 split).
 *
 * Owns selector escaping/scoping, deterministic rule serialization, declaration
 * helpers, and the fixed safe value mappings shared by the section and block
 * projectors. Imports the two marquee replica style-scope constants directly
 * from their one Bun-free owner (`pageRendererReplicaIdentity.ts`) and the
 * canonical grid-item attribute from the placement owner
 * (`pageBlockGridPlacement.ts`); neither is re-exported from a stable facade.
 *
 * Dependency position: Section/Block -> Declarations -> Contracts.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import { PAGE_BLOCK_GRID_ITEM_ATTRIBUTE } from "./pageBlockGridPlacement";
import {
  escapeAuthoringCssString,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssColor,
  isSafeAuthoringCssGradient,
} from "./pageAuthoringSanitizers";
import {
  PAGE_BLOCK_SPAN_CLAMP,
  type PageBlockV2,
  type PageBoxSpacingV2,
  type PageTypographyTextTransform,
} from "./pageDocumentV2";
import {
  PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE,
  PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE,
} from "./pageRendererReplicaIdentity";
import {
  PAGE_BLOCK_ELEMENT_ATTRIBUTE,
  PAGE_BLOCK_ID_ATTRIBUTE,
  PAGE_BLOCK_TEXT_ATTRIBUTE,
  PAGE_SECTION_CONTENT_ATTRIBUTE,
  PAGE_SECTION_ID_ATTRIBUTE,
  PAGE_TILT_PARENT_LAYER_ATTRIBUTE,
  type CssDeclaration,
  type CollectorContext,
  type PageResponsiveCssDiagnostic,
  type PageResponsiveCssDiagnosticReason,
  type PageResponsiveCssOptions,
} from "./pageResponsiveCssContracts";

/**
 * Escapes a value for use inside a double-quoted CSS string (attribute
 * selector value or `url("...")`). Per CSS string grammar only `"`, `\`, and
 * control characters can terminate or alter the string. `<` and `>` are also
 * hex-escaped so the emitted stylesheet can never contain a literal
 * `</style>` sequence when injected into an HTML style element.
 */
const escapeCssString = escapeAuthoringCssString;

const sectionRootSelector = (id: string): string =>
  `[${PAGE_SECTION_ID_ATTRIBUTE}="${escapeCssString(id)}"]`;

const sectionContentSelector = (id: string): string =>
  `${sectionRootSelector(id)} > [${PAGE_SECTION_CONTENT_ATTRIBUTE}="true"]`;

/**
 * One shared `:is(primary canonical selector, replica styling-only alias)`
 * scope for a block's FRAME rules. The replica alias arm is a styling-only
 * scope hook: its value is the canonical normalized original block ID, never a
 * DOM id, IDREF, selection hook, or runtime identity. Alias presence alone
 * never causes CSS; the same authored normalized delta and placement gates
 * control emission. The single rule covers both the primary frame and an
 * approved marquee replica frame without duplicating declaration grammar.
 */
const blockStyleScopeSelector = (id: string): string =>
  `:is([${PAGE_BLOCK_ID_ATTRIBUTE}="${escapeCssString(id)}"],` +
  `[${PAGE_MARQUEE_REPLICA_BLOCK_STYLE_SCOPE_ATTRIBUTE}="${escapeCssString(id)}"])`;

/**
 * Shared `:is(...)` scope for the hoisted tilt/layer WRAPPER (the
 * `[data-tilt-parent-for]` node carrying the base `--layer-*`, plus its
 * marquee replica twin). Per-device layer deltas ride this wrapper because
 * custom props inherit downward only — a frame-scoped override can never
 * reach the ancestor wrapper that consumes `var(--layer-*)`.
 */
const blockTiltLayerScopeSelector = (id: string): string =>
  `:is([${PAGE_TILT_PARENT_LAYER_ATTRIBUTE}="${escapeCssString(id)}"],` +
  `[${PAGE_MARQUEE_REPLICA_TILT_LAYER_STYLE_SCOPE_ATTRIBUTE}="${escapeCssString(id)}"])`;

/**
 * Canonical-only grid-item scope: the shared `data-page-block-grid-item`
 * attribute stamped by the renderer on the ONE legal root grid target (the
 * block frame or the section-template wrapper). There is deliberately no
 * replica alias arm: the authored outer marquee group is the only possible
 * legal root grid target and remains one canonical node outside both
 * segments; every duplicated slot descendant is nested, resolves placement
 * `"none"`, and emits no grid hook/alias/span CSS.
 */
const blockGridItemScopeSelector = (id: string): string =>
  `[${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}="${escapeCssString(id)}"]`;

const blockElementSelector = (id: string): string =>
  `${blockStyleScopeSelector(id)} [${PAGE_BLOCK_ELEMENT_ATTRIBUTE}="true"]`;

/**
 * Typography-capable blocks never own nested block slots, so the descendant
 * selector can only match the block's own painted text nodes.
 */
const blockTextSelector = (id: string): string =>
  `${blockStyleScopeSelector(id)} [${PAGE_BLOCK_TEXT_ATTRIBUTE}="true"]`;

/**
 * Section-wide stacked reset target: every DIRECT grid item of the section
 * content grid that the renderer stamped with the placement-gated
 * `PAGE_BLOCK_GRID_ITEM_ATTRIBUTE` (legal placement + at least one authored
 * base/tablet/mobile span). The presence selector can only match stamped
 * nodes, so the reset is placement-gated by construction.
 */
const stackedSectionGridItemSelector = (id: string): string =>
  `${sectionContentSelector(id)} > [${PAGE_BLOCK_GRID_ITEM_ATTRIBUTE}]`;

/**
 * Stored color strings are NOT format-clamped by `pageDocumentV2` (`readText`
 * accepts any non-empty string), so the builder validates them against a
 * strict grammar before they may reach the stylesheet. Unknown shapes fail
 * closed into diagnostics.
 */
const isSafeCssColor = isSafeAuthoringCssColor;

/**
 * Mirrors `pageCompositionEffects.isGradientOrUrl`: a gradient/url() tint is
 * invalid inside `radial-gradient()`'s color slot, so it must not seed the
 * `--surface-glow`/`--deco-ring`/`--orb-color` custom props (base resolver
 * leaves it out → CSS falls back to the reference literal). Kept local to avoid
 * widening the effects module's export surface.
 */
const isGradientOrUrlColor = (value: string): boolean => /gradient|url\(/i.test(value);

/**
 * Stricter than the renderer's gradient sniff (`toGradientBackground`): the
 * stylesheet context additionally requires a safe charset and balanced parens.
 *
 * SECURITY (TASK-531): this is the SINGLE-LAYER alias. Do NOT re-bind it to the
 * multi-layer validator. The multi-layer accept lives in
 * `isSafeCssBackgroundValue` below, which runs the whole-value tripwire pre-pass
 * (inside `isSafeAuthoringCssBackgroundLayers`) BEFORE allowlisting each layer —
 * that tripwire is load-bearing because this module emits values RAW (un-escaped)
 * into a `<style>` string via `dangerouslySetInnerHTML`.
 */
const isSafeCssGradient = isSafeAuthoringCssGradient;

/**
 * TASK-531 — the RAW `<style>` per-device background allowlist. A background value
 * is accepted only if it is a safe SINGLE-layer gradient OR passes the
 * tripwire-bearing multi-layer allowlist (`isSafeAuthoringCssBackgroundLayers`:
 * whole-value tripwire pre-pass → depth-0 comma split → per-layer safe-color /
 * safe-gradient check → `PAGE_BG_MAX_LAYERS` cap; fail-closed on anything else).
 *
 * FORBIDDEN: do NOT widen `isSafeCssGradient` directly to accept multi-layer, and
 * do NOT re-implement/bypass the whole-value tripwire here — this value is emitted
 * un-escaped into the injected `<style>`, so a `url()`/`@import`/`expression(`/
 * `</style>`-charset value MUST be rejected exactly as the write boundary rejects
 * it. Keep the multi-layer accept routed through this tripwire-bearing validator.
 * (TASK-539-06-L01: the section/block projectors route their gradient branches
 * through the canonical `parseAuthoringCssBackgroundPaint` split, which runs the
 * same tripwire internally; this predicate remains for the pre-539 value gates.)
 */
const isSafeCssBackgroundValue = (value: string): boolean =>
  isSafeCssGradient(value) || isSafeAuthoringCssBackgroundLayers(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const blockSpanValue = (value: unknown): string | null =>
  isFiniteNumber(value)
    ? `span ${Math.max(PAGE_BLOCK_SPAN_CLAMP.min, Math.min(PAGE_BLOCK_SPAN_CLAMP.max, Math.trunc(value)))}`
    : null;

const pxValue = (value: unknown): string | null => (isFiniteNumber(value) ? `${value}px` : null);

/** Project a sanitized media URL into a safe `url("...")` declaration value. */
const mediaUrlCssValue = (url: string): string => `url("${escapeCssString(url)}")`;

/** Must stay in sync with the shadow token mapping in `pageRendererV2.tsx`. */
const shadowCssValues: Record<string, string> = {
  none: "none",
  sm: "0 6px 20px rgba(15, 23, 42, 0.08)",
  md: "0 14px 40px rgba(15, 23, 42, 0.12)",
  lg: "0 22px 60px rgba(15, 23, 42, 0.16)",
};

/** Mirrors `pageSectionAlignmentClass` (Tailwind `items-*`). */
const sectionAlignItemsValues: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

/** Mirrors `pageSectionJustifyClass` (Tailwind `justify-*`). */
const sectionJustifyContentValues: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

/** Mirrors `pageTextAlignClass`. */
const blockTextAlignValues: Record<string, string> = {
  left: "left",
  center: "center",
  right: "right",
};

/** Mirrors `pageBlockAlignmentClass` (Tailwind `justify-self-*`). */
const blockJustifySelfValues: Record<string, string> = {
  left: "start",
  center: "center",
  right: "end",
};

/**
 * TASK-532 — fixed fail-closed text-transform enum mapping. The CSS keyword is
 * identical to the model token for every member, but the explicit map keeps the
 * projection a fixed lookup (never an identity pass-through of a raw value).
 */
const blockTextTransformCssValues: Record<PageTypographyTextTransform, string> = {
  none: "none",
  uppercase: "uppercase",
  lowercase: "lowercase",
  capitalize: "capitalize",
};

const isBlockSelfAligned = (align: unknown): boolean => align === "center" || align === "right";

const blockSelfAlignmentDeclarations = (align: unknown): CssDeclaration[] => {
  if (align === "center") {
    return [
      { property: "margin-left", value: "auto" },
      { property: "margin-right", value: "auto" },
    ];
  }
  if (align === "right") {
    return [{ property: "margin-left", value: "auto" }];
  }
  return [];
};

/** Mirrors `pageBlockWidthClass` / `pageBlockEffectiveWidthClass`. */
const blockWidthValues: Record<string, string> = {
  full: "100%",
  auto: "fit-content",
};

const blockEffectiveWidthValue = (style: NonNullable<PageBlockV2["style"]>): string => {
  if (isBlockSelfAligned(style.align)) return "fit-content";
  return blockWidthValues[style.width ?? ""] ?? "auto";
};

/** Mirrors `toBoxSpacingValue` in `pageRendererV2.tsx`. */
const boxSpacingShorthand = (spacing: PageBoxSpacingV2): string | null => {
  const sides = [spacing.top ?? 0, spacing.right ?? 0, spacing.bottom ?? 0, spacing.left ?? 0];
  if (!sides.every(isFiniteNumber)) return null;
  return sides.map((side) => `${side}px`).join(" ");
};

const renderRule = (selector: string, declarations: CssDeclaration[]): string | null => {
  if (declarations.length === 0) return null;
  const body = [...declarations]
    .sort((left, right) =>
      left.property < right.property ? -1 : left.property > right.property ? 1 : 0
    )
    .map((declaration) => `${declaration.property}:${declaration.value} !important`)
    .join(";");
  return `${selector}{${body}}`;
};

/** Apply the optional trusted outer scope to each completed selector exactly once. */
const pushRule = (
  context: CollectorContext,
  selector: string,
  declarations: CssDeclaration[]
): void => {
  const scoped = context.selectorPrefix ? `${context.selectorPrefix} ${selector}` : selector;
  const rule = renderRule(scoped, declarations);
  if (rule) context.rules.push(rule);
};

const pushDiagnostic = (
  context: CollectorContext,
  scope: "section" | "block",
  id: string,
  key: string,
  reason: PageResponsiveCssDiagnosticReason
): void => {
  const diagnostic: PageResponsiveCssDiagnostic = {
    scope,
    id,
    breakpoint: context.breakpoint,
    key,
    reason,
  };
  context.diagnostics.push(diagnostic);
};

const SAFE_SCOPE_SELECTOR_PATTERN = /^[A-Za-z0-9 "'=\-_.#:[\]]+$/;

const resolveSelectorPrefix = (options?: PageResponsiveCssOptions): string => {
  const scope = options?.scopeSelector?.trim();
  if (!scope) return "";
  if (!SAFE_SCOPE_SELECTOR_PATTERN.test(scope)) {
    throw new Error("page_responsive_css_scope_invalid");
  }
  return scope;
};

export {
  blockEffectiveWidthValue,
  blockElementSelector,
  blockGridItemScopeSelector,
  blockJustifySelfValues,
  blockSelfAlignmentDeclarations,
  blockSpanValue,
  blockStyleScopeSelector,
  blockTextAlignValues,
  blockTextSelector,
  blockTextTransformCssValues,
  blockTiltLayerScopeSelector,
  blockWidthValues,
  boxSpacingShorthand,
  escapeCssString,
  isBlockSelfAligned,
  isFiniteNumber,
  isGradientOrUrlColor,
  isSafeCssBackgroundValue,
  isSafeCssColor,
  isSafeCssGradient,
  mediaUrlCssValue,
  pxValue,
  renderRule,
  resolveSelectorPrefix,
  sectionAlignItemsValues,
  sectionContentSelector,
  sectionJustifyContentValues,
  sectionRootSelector,
  shadowCssValues,
  stackedSectionGridItemSelector,
  pushDiagnostic,
  pushRule,
};
export type { CssDeclaration, CollectorContext } from "./pageResponsiveCssContracts";
