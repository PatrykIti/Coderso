/**
 * Responsive CSS section projection (TASK-539-06-L01 split).
 *
 * Projects one section's per-breakpoint override into sorted content/root
 * declaration buckets. Layout, spacing, and the accent custom property stay on
 * the section CONTENT node; visibility stays on the section ROOT. For a
 * full-width template or base `style.fullBleed === true`, the paint box
 * (background, radius, shadow, glow) targets the ROOT (the 100vw bleed box);
 * otherwise it targets CONTENT. The paint target is decided ONLY from the
 * base-normalized section + resolved template — a responsive override can
 * never change it (`fullBleed` is model-forbidden in responsive style).
 *
 * Background branches use the canonical structured paint parse
 * (`parseAuthoringCssBackgroundPaint`): only `paint.image` reaches
 * `background-image` and only `paint.color` reaches `background-color`, with
 * validated image-layer bytes and canonical final-color bytes preserved, and
 * explicit none/transparent resets without interpolating an unsplit author
 * string.
 *
 * Dependency position: Orchestration -> Section -> Declarations -> Contracts.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import {
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";
import type { PageSectionResponsiveOverrideV2, PageSectionV2 } from "./pageDocumentV2";
import {
  resolvePageSectionTemplate,
  resolvePageSectionTemplateColumns,
} from "./pageSectionTemplates";
import {
  isFiniteNumber,
  isSafeCssColor,
  mediaUrlCssValue,
  pxValue,
  pushDiagnostic,
  pushRule,
  sectionAlignItemsValues,
  sectionJustifyContentValues,
  shadowCssValues,
  stackedSectionGridItemSelector,
  type CssDeclaration,
  type CollectorContext,
} from "./pageResponsiveCssDeclarations";

/**
 * TASK-535 — full-bleed predicate + content-cap width formula, mirrored from
 * `pageSectionRenderStyles.ts` (`isPageSectionFullBleed` / `toPageSectionStyle`).
 * The renderer owns them but the renderer-side module imports FROM the stable
 * facade, so a back-import would cycle; per the split convention they are
 * re-declared here with a MUST-stay-in-sync note.
 *
 * The 525 model DECOUPLED the bleed box from the content cap: full-bleed content
 * is ALWAYS capped/centered at `layout.maxWidth` (the pre-525 `max-width:none`
 * pin is GONE). So a full-bleed content div carries BOTH
 * `width: min(<max>, calc(100% - 2 * 20px))` AND `max-width: <max>` — which makes
 * a responsive `layout.maxWidth` override CSS-EXPRESSIBLE (it was falsely marked
 * `not_css_expressible` while the pin still existed).
 */
const isSectionFullBleed = (
  section: PageSectionV2,
  template: ReturnType<typeof resolvePageSectionTemplate>
): boolean => template.variant === "full-width" || section.style.fullBleed === true;
/** Mirrors `PAGE_SECTION_FULL_BLEED_GUTTER` (the reference `.container` side gutter). */
const SECTION_FULL_BLEED_GUTTER = "20px";
/** Mirrors the full-bleed content `width` in `toPageSectionStyle`. */
const fullBleedContentWidth = (maxWidthPx: string): string =>
  `min(${maxWidthPx}, calc(100% - 2 * ${SECTION_FULL_BLEED_GUTTER}))`;

export type PageSectionCollectResult = {
  content: CssDeclaration[];
  root: CssDeclaration[];
};

export const collectSectionDeclarations = (
  section: PageSectionV2,
  override: PageSectionResponsiveOverrideV2,
  context: CollectorContext
): PageSectionCollectResult => {
  const content: CssDeclaration[] = [];
  const root: CssDeclaration[] = [];
  const diag = (key: string, reason: "unsafe_color_value" | "unsafe_background_value") =>
    pushDiagnostic(context, "section", section.id, key, reason);

  const layoutOverride = override.layout ?? {};
  const mergedLayout = { ...section.layout, ...layoutOverride };
  const template = resolvePageSectionTemplate(section);
  // Base-only paint target: full-bleed paint rides the section ROOT (the 100vw
  // bleed box); capped paint rides CONTENT. Responsive `fullBleed` is
  // model-forbidden, so this decision can never be overridden per device.
  const paintTarget = isSectionFullBleed(section, template) ? root : content;

  if (layoutOverride.maxWidth !== undefined) {
    const value = pxValue(mergedLayout.maxWidth);
    if (value) {
      // TASK-535 — the 525 model DECOUPLED bleed from the content cap: full-bleed
      // content is ALWAYS capped/centered at `layout.maxWidth` (the pre-525
      // `max-width:none` pin is GONE — see `toPageSectionStyle`). So a `maxWidth`
      // override IS CSS-expressible on a full-bleed section: mirror the base
      // content div, which carries BOTH `width: min(<max>, calc(100% - 40px))`
      // AND `max-width: <max>`. Non-full-bleed keeps the plain `max-width`
      // declaration byte-identical.
      if (isSectionFullBleed(section, template)) {
        content.push({ property: "width", value: fullBleedContentWidth(value) });
      }
      content.push({ property: "max-width", value });
    }
  }
  if (layoutOverride.align !== undefined) {
    const value = sectionAlignItemsValues[mergedLayout.align];
    if (value) content.push({ property: "align-items", value });
  }
  if (layoutOverride.justify !== undefined) {
    const value = sectionJustifyContentValues[mergedLayout.justify];
    if (value) content.push({ property: "justify-content", value });
  }
  if (layoutOverride.columns !== undefined || layoutOverride.stackVertical !== undefined) {
    // Mirror the flattened editor preview: an explicit columns override forces
    // that template-floored count across the breakpoint range, replacing the
    // base `grid-cols-1 md:grid-cols-N` class pair. A merged-effective
    // `stackVertical: true` (TASK-425) wins over any column count and forces a
    // single column, exactly like `toPageSectionRenderProps`; an explicit
    // `stackVertical: false` override over a stacked base restores the
    // template-floored count. Both paths emit one deterministic
    // `grid-template-columns` declaration.
    const mergedTemplate = resolvePageSectionTemplate({ ...section, layout: mergedLayout });
    const columns =
      mergedLayout.stackVertical === true ? 1 : resolvePageSectionTemplateColumns(mergedTemplate);
    if (isFiniteNumber(columns) && columns >= 1) {
      content.push({
        property: "grid-template-columns",
        value: `repeat(${Math.trunc(columns)}, minmax(0, 1fr))`,
      });
    }
  }

  const styleOverride = override.style ?? {};
  const mergedStyle = { ...section.style, ...styleOverride };

  if (styleOverride.accent !== undefined) {
    if (typeof mergedStyle.accent === "string" && isSafeCssColor(mergedStyle.accent)) {
      content.push({ property: "--coderso-section-accent", value: mergedStyle.accent });
    } else {
      diag("style.accent", "unsafe_color_value");
    }
  }
  if (
    styleOverride.background !== undefined ||
    styleOverride.backgroundType !== undefined ||
    styleOverride.backgroundImage !== undefined
  ) {
    // TASK-539-06-L01 — structured paint parity with `toPageSectionStyle`:
    // `color`/`gradient` types split the merged `background` through
    // `parseAuthoringCssBackgroundPaint` (image-layer bytes verbatim, final
    // color canonical), `image` paints a safe media URL, everything else
    // clears. The RAW <style> boundary is gated by the parser's tripwire.
    if (mergedStyle.backgroundType === "color" && mergedStyle.background) {
      const paint = parseAuthoringCssBackgroundPaint(mergedStyle.background);
      if (paint && paint.color) {
        paintTarget.push({ property: "background-color", value: paint.color });
        paintTarget.push({ property: "background-image", value: "none" });
      } else {
        diag("style.background", "unsafe_color_value");
      }
    } else if (mergedStyle.backgroundType === "gradient" && mergedStyle.background) {
      const paint = parseAuthoringCssBackgroundPaint(mergedStyle.background);
      if (paint && paint.image) {
        paintTarget.push({ property: "background-image", value: paint.image });
        paintTarget.push({
          property: "background-color",
          value: paint.color ?? "transparent",
        });
      } else {
        diag("style.background", "unsafe_background_value");
      }
    } else if (mergedStyle.backgroundType === "image" && mergedStyle.backgroundImage) {
      const safeBackgroundImage = sanitizeAuthoringMediaUrl(mergedStyle.backgroundImage);
      if (!safeBackgroundImage) {
        diag("style.backgroundImage", "unsafe_background_value");
      } else {
        paintTarget.push({ property: "background-color", value: "transparent" });
        paintTarget.push({
          property: "background-image",
          value: mediaUrlCssValue(safeBackgroundImage),
        });
      }
    } else {
      paintTarget.push({ property: "background-color", value: "transparent" });
      paintTarget.push({ property: "background-image", value: "none" });
    }
  }
  if (styleOverride.radius !== undefined) {
    const value = pxValue(mergedStyle.radius);
    if (value) paintTarget.push({ property: "border-radius", value });
  }
  // TASK-531 REGION: compose a per-device glow (G-3b). Fire when the device
  // overrides shadow OR glow; a device-only glow (no enum shadow) still emits.
  // `composeGlowBoxShadow` re-sanitizes the color + clamps the numbers into a
  // fixed template, so the RAW <style> glow emit is as safe as the SSR one.
  // `"none"` is treated as absent for the glow merge (parity with the SSR
  // `toPageSectionBoxShadow`); an EXPLICIT `shadow` override still resets to
  // `box-shadow: none` when no glow is present (byte-identical to pre-531).
  if (styleOverride.shadow !== undefined || styleOverride.glow !== undefined) {
    const enumShadow =
      mergedStyle.shadow && mergedStyle.shadow !== "none"
        ? shadowCssValues[mergedStyle.shadow]
        : undefined;
    const glow = composeGlowBoxShadow(mergedStyle.glow);
    const value =
      mergeShadows(enumShadow, glow) ??
      (styleOverride.shadow !== undefined ? shadowCssValues[mergedStyle.shadow] : undefined);
    if (value) paintTarget.push({ property: "box-shadow", value });
  }

  const spacingOverride = override.spacing ?? {};
  const spacingProperties = [
    ["paddingTop", "padding-top"],
    ["paddingRight", "padding-right"],
    ["paddingBottom", "padding-bottom"],
    ["paddingLeft", "padding-left"],
    ["gap", "gap"],
  ] as const;
  for (const [key, property] of spacingProperties) {
    if (spacingOverride[key] === undefined) continue;
    const value = pxValue(spacingOverride[key]);
    if (value) content.push({ property, value });
  }

  const visibilityOverride = override.visibility ?? {};
  if (visibilityOverride.visible === false) {
    root.push({ property: "display", value: "none" });
  }
  // `visible: true` over a visible base is a no-op; over a hidden base it is
  // handled by the markup-absent walk before this collector runs.
  for (const key of ["authOnly", "anchor", "startsAt", "endsAt"] as const) {
    if (visibilityOverride[key] !== undefined) {
      pushDiagnostic(context, "section", section.id, `visibility.${key}`, "not_css_expressible");
    }
  }

  return { content, root };
};

/** Project the section-level stacked reset rule (TASK-425) for one breakpoint. */
export const pushStackedSectionResetRule = (
  section: PageSectionV2,
  context: CollectorContext
): void => {
  pushRule(context, stackedSectionGridItemSelector(section.id), [
    { property: "grid-column", value: "span 1" },
    { property: "grid-row", value: "span 1" },
  ]);
};
