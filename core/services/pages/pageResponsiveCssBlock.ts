/**
 * Responsive CSS block projection (TASK-539-06-L01 split).
 *
 * Projects one block's per-breakpoint override into frame / grid-item / inner
 * visual element / text / hoisted tilt-layer wrapper declaration buckets.
 *
 * - Layout keys (align/width/padding/margin/display) stay on the FRAME; visual
 *   keys (textColor/background/radius/shadow/glow/border/opacity) ride the
 *   inner visual element for re-routed types, otherwise the frame.
 * - Typography rides the painted TEXT node for typography-capable blocks, or
 *   the inner visual element for re-routed types (the button anchor).
 *   `fontSizeCustom` emits only after the shared sanitizer accepts it and wins
 *   over the discrete `fontSize` token; `textTransform` emits through the fixed
 *   enum map, including an explicit `"none"` reset.
 * - Grid spans are placement-gated: legal placement (block-frame or
 *   section-template-wrapper) plus the renderer's shared has-any-span
 *   predicate emits clamped `grid-column`/`grid-row` span declarations on the
 *   canonical `data-page-block-grid-item` hook; `none` placement diagnoses
 *   each authored span key as `not_css_expressible`.
 * - Layer deltas merge base + present override x/y/z through the model owner
 *   (`mergePageBlockLayerPresentKeys`), emit ONLY the present keys (zero is a
 *   present reset), and ride the frame or the hoisted tilt/layer wrapper using
 *   the facade-owned `PAGE_TILT_PARENT_LAYER_ATTRIBUTE` scope decision.
 * - Background branches use the canonical structured paint parse
 *   (`parseAuthoringCssBackgroundPaint`): image/color stay separate, with
 *   validated image-layer bytes and canonical final-color bytes.
 *
 * Dependency position: Orchestration -> Block -> Declarations -> Contracts.
 *
 * This module is Bun-free and import-side-effect free (Vitest lane).
 */

import {
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssFontSize,
  sanitizeAuthoringMediaUrl,
} from "./pageAuthoringSanitizers";
import {
  isPageTypographyCapableBlockType,
  mergePageBlockLayerPresentKeys,
  pageTypographyFontFamilyCssValues,
  pageTypographyFontSizeCssValues,
  pageTypographyFontWeightCssValues,
  type PageBlockResponsiveOverrideV2,
  type PageBlockV2,
} from "./pageDocumentV2";
import { composeGlowBoxShadow, mergeShadows } from "./pageGlow";
import type { PageBlockGridPlacementTarget } from "./pageBlockGridPlacement";
import {
  isPageBlockVisualElementType,
  type PageResponsiveCssDiagnosticReason,
} from "./pageResponsiveCssContracts";
import {
  blockEffectiveWidthValue,
  blockJustifySelfValues,
  blockSelfAlignmentDeclarations,
  blockSpanValue,
  blockTextAlignValues,
  blockTextTransformCssValues,
  boxSpacingShorthand,
  isFiniteNumber,
  isGradientOrUrlColor,
  isSafeCssColor,
  mediaUrlCssValue,
  pxValue,
  pushDiagnostic,
  shadowCssValues,
  type CssDeclaration,
  type CollectorContext,
} from "./pageResponsiveCssDeclarations";

export type PageBlockCollectResult = {
  frame: CssDeclaration[];
  gridItem: CssDeclaration[];
  element: CssDeclaration[];
  text: CssDeclaration[];
  wrapper: CssDeclaration[];
};

export const collectBlockDeclarations = (
  block: PageBlockV2,
  override: PageBlockResponsiveOverrideV2,
  context: CollectorContext,
  spanTarget: PageBlockGridPlacementTarget,
  hasAnySpan: boolean
): PageBlockCollectResult => {
  const frame: CssDeclaration[] = [];
  const gridItem: CssDeclaration[] = [];
  // Declarations that must ride the hoisted tilt/layer WRAPPER rather than the
  // `[data-block-id]` frame (currently only the per-device layer offsets of a
  // tilt+layer block, whose base `--layer-*` were hoisted onto the wrapper).
  const wrapper: CssDeclaration[] = [];
  // Visual style keys follow the renderer's style-target contract: for
  // re-routed types they land on the inner visual element, otherwise on the
  // frame. Layout keys (align/width/padding/margin/display) always stay on
  // the frame.
  const visual = isPageBlockVisualElementType(block.type) ? ([] as CssDeclaration[]) : frame;
  // Typography keys follow the renderer's text-target contract: re-routed
  // types paint them on the inner visual element (the button anchor),
  // everything else on the dedicated text node(s).
  const text: CssDeclaration[] = [];
  const typography = isPageBlockVisualElementType(block.type) ? visual : text;
  const diag = (key: string, reason: PageResponsiveCssDiagnosticReason) =>
    pushDiagnostic(context, "block", block.id, key, reason);

  const propsOverride = override.props ?? {};
  const propsOverrideKeys = Object.keys(propsOverride);
  if (propsOverrideKeys.length > 0) {
    // `props.align` on heading/text is the single content key with a safe CSS
    // projection: the desktop base paints it as a baked text-align class on
    // the block's text node, so the override re-targets that node with the
    // enum-mapped value (left|center|right only — anything else fails closed).
    const alignExpressible = block.type === "heading" || block.type === "text";
    if (alignExpressible && propsOverride.align !== undefined) {
      const merged = propsOverride.align ?? block.props.align;
      const value = blockTextAlignValues[typeof merged === "string" ? merged : ""];
      if (value) {
        text.push({ property: "text-align", value });
      } else {
        diag("props.align", "not_css_expressible");
      }
    }
    // Every other content key stays diagnostics-only until a dedicated
    // content-override contract exists.
    if (propsOverrideKeys.some((key) => !(alignExpressible && key === "align"))) {
      diag("props", "props_override_unsupported");
    }
  }

  const styleOverride = override.style ?? {};
  const mergedStyle = { ...(block.style ?? {}), ...styleOverride };

  // Grid spans (TASK-539-03-L05 placement contract). The renderer stamps the
  // canonical `data-page-block-grid-item` hook only when the shared predicate
  // holds: legal placement plus at least one authored base/tablet/mobile
  // colSpan/rowSpan. CSS may be emitted only under that same predicate.
  const spanProperties = [
    ["colSpan", "grid-column"],
    ["rowSpan", "grid-row"],
  ] as const;
  if (spanTarget === "none") {
    for (const [key] of spanProperties) {
      if (styleOverride[key] !== undefined) {
        diag(`style.${key}`, "not_css_expressible");
      }
    }
  } else if (hasAnySpan) {
    for (const [key, property] of spanProperties) {
      if (styleOverride[key] === undefined) continue;
      const value = blockSpanValue(mergedStyle[key]);
      if (value) gridItem.push({ property, value });
    }
  }

  // Section-column placement (owner finding #5, round 3): `style.column`
  // re-parents the block into a different column wrapper in the BASE markup,
  // which is structural and cannot be expressed as a @media rule over the
  // desktop DOM. Per-breakpoint column overrides therefore resolve in the
  // editor/preview cascade only and fail closed into a diagnostic here;
  // `layout.stackVertical` is the supported mobile collapse.
  if (styleOverride.column !== undefined) {
    diag("style.column", "not_css_expressible");
  }

  if (styleOverride.align !== undefined) {
    const textAlign = blockTextAlignValues[mergedStyle.align ?? ""];
    const justifySelf = blockJustifySelfValues[mergedStyle.align ?? ""];
    if (textAlign) frame.push({ property: "text-align", value: textAlign });
    if (justifySelf) frame.push({ property: "justify-self", value: justifySelf });
    frame.push(...blockSelfAlignmentDeclarations(mergedStyle.align));
  }
  if (styleOverride.width !== undefined || styleOverride.align !== undefined) {
    frame.push({ property: "width", value: blockEffectiveWidthValue(mergedStyle) });
  }
  if (styleOverride.textColor !== undefined) {
    if (mergedStyle.textColor === null) {
      visual.push({ property: "color", value: "inherit" });
      visual.push({ property: "--coderso-block-text", value: "initial" });
    } else if (typeof mergedStyle.textColor === "string" && isSafeCssColor(mergedStyle.textColor)) {
      visual.push({ property: "color", value: mergedStyle.textColor });
      visual.push({ property: "--coderso-block-text", value: mergedStyle.textColor });
    } else {
      diag("style.textColor", "unsafe_color_value");
    }
  }
  if (
    styleOverride.background !== undefined ||
    styleOverride.backgroundType !== undefined ||
    styleOverride.backgroundImage !== undefined
  ) {
    // TASK-539-06-L01 — structured paint parity with `toPageBlockStyle`:
    // `color`/`gradient` types split the merged `background` through
    // `parseAuthoringCssBackgroundPaint`, `image` paints a safe media URL,
    // everything else clears. Only `paint.image` reaches `background-image`
    // and only `paint.color` reaches `background-color`.
    if (mergedStyle.backgroundType === "color" && mergedStyle.background) {
      const paint = parseAuthoringCssBackgroundPaint(mergedStyle.background);
      if (paint && paint.color) {
        visual.push({ property: "background-color", value: paint.color });
        visual.push({ property: "--coderso-block-surface", value: paint.color });
        visual.push({ property: "background-image", value: "none" });
      } else {
        diag("style.background", "unsafe_color_value");
      }
    } else if (mergedStyle.backgroundType === "gradient" && mergedStyle.background) {
      const paint = parseAuthoringCssBackgroundPaint(mergedStyle.background);
      if (paint && paint.image) {
        visual.push({ property: "background-image", value: paint.image });
        visual.push({
          property: "background-color",
          value: paint.color ?? "transparent",
        });
        visual.push({ property: "--coderso-block-surface", value: "initial" });
      } else {
        diag("style.background", "unsafe_background_value");
      }
    } else if (mergedStyle.backgroundType === "image" && mergedStyle.backgroundImage) {
      const safeBackgroundImage = sanitizeAuthoringMediaUrl(mergedStyle.backgroundImage);
      if (safeBackgroundImage) {
        visual.push({
          property: "background-image",
          value: mediaUrlCssValue(safeBackgroundImage),
        });
        visual.push({ property: "background-size", value: "cover" });
        visual.push({ property: "background-position", value: "center" });
        visual.push({ property: "background-color", value: "transparent" });
        visual.push({ property: "--coderso-block-surface", value: "initial" });
      } else {
        diag("style.backgroundImage", "unsafe_background_value");
      }
    } else {
      visual.push({ property: "background-color", value: "transparent" });
      visual.push({ property: "background-image", value: "none" });
      visual.push({ property: "--coderso-block-surface", value: "initial" });
    }
  }
  if (styleOverride.opacity !== undefined && isFiniteNumber(mergedStyle.opacity)) {
    visual.push({ property: "opacity", value: `${mergedStyle.opacity}` });
  }
  if (styleOverride.radius !== undefined) {
    const value = pxValue(mergedStyle.radius);
    if (value) visual.push({ property: "border-radius", value });
  }
  // TASK-531 REGION: compose a per-device glow (G-3b), same shape as the
  // section branch — fire on shadow OR glow; a device-only glow still emits.
  // `"none"` treated as absent for the glow merge; an EXPLICIT shadow override
  // still resets to `box-shadow: none` when no glow is present (pre-531 parity).
  if (styleOverride.shadow !== undefined || styleOverride.glow !== undefined) {
    const enumShadow =
      mergedStyle.shadow && mergedStyle.shadow !== "none"
        ? shadowCssValues[mergedStyle.shadow]
        : undefined;
    const glow = composeGlowBoxShadow(mergedStyle.glow);
    const value =
      mergeShadows(enumShadow, glow) ??
      (styleOverride.shadow !== undefined ? shadowCssValues[mergedStyle.shadow ?? ""] : undefined);
    if (value) visual.push({ property: "box-shadow", value });
  }
  if (
    styleOverride.borderColor !== undefined ||
    styleOverride.borderWidth !== undefined ||
    styleOverride.borderStyle !== undefined
  ) {
    const borderWidth = isFiniteNumber(mergedStyle.borderWidth)
      ? Math.max(0, mergedStyle.borderWidth)
      : mergedStyle.borderColor
        ? 1
        : 0;
    const borderStyle =
      mergedStyle.borderStyle ?? (mergedStyle.borderColor || borderWidth > 0 ? "solid" : "none");
    if (borderStyle === "none" || borderWidth <= 0) {
      visual.push({ property: "border-style", value: "none" });
      visual.push({ property: "border-width", value: "0" });
    } else if (
      typeof mergedStyle.borderColor === "string" &&
      isSafeCssColor(mergedStyle.borderColor)
    ) {
      visual.push({ property: "border-color", value: mergedStyle.borderColor });
      visual.push({ property: "border-style", value: borderStyle });
      visual.push({ property: "border-width", value: `${borderWidth}px` });
    } else if (mergedStyle.borderColor === null || mergedStyle.borderColor === undefined) {
      visual.push({ property: "border-style", value: borderStyle });
      visual.push({ property: "border-width", value: `${borderWidth}px` });
    } else {
      diag("style.borderColor", "unsafe_color_value");
    }
  }
  // Breakpoint resolution replaces the whole padding/margin object (shallow
  // style spread), so the override box is the complete effective box.
  if (styleOverride.padding !== undefined) {
    const value = boxSpacingShorthand(styleOverride.padding ?? {});
    if (value) frame.push({ property: "padding", value });
  }
  if (styleOverride.margin !== undefined) {
    const value = boxSpacingShorthand(styleOverride.margin ?? {});
    if (value) frame.push({ property: "margin", value });
  }

  // TASK-522-05-L02 — per-device layered-canvas offsets. The 522-01-L04 frame
  // resolver emits the BASE position as inline --layer-x/y/z custom props; here we
  // retarget those props per breakpoint. They ride the SAME element that carries
  // data-layer + the base var + the media query, and every declaration is serialized
  // with !important, so the delta beats the inline base custom prop (finding-4). Only
  // present x/y/z (the numeric offsets) vary per device; anchor stays base-only and
  // the merged layer is built by the model owner from present override keys only
  // (`mergePageBlockLayerPresentKeys`) — inherited base y/z never re-emit merely
  // because the device authored x (the desktop inline declaration supplies them).
  //
  // TASK-535 — TARGET follows where the renderer put the BASE layer placement:
  //   - layer-only (no tilt): base `--layer-*` live on the `[data-block-id]` FRAME,
  //     so the override rides the FRAME — byte-identical to pre-535.
  //   - tilt + layer: `splitBlockComposition` HOISTED the base `--layer-*` onto the
  //     `[data-tilt-parent]` WRAPPER (a per-device value on the child frame can NEVER
  //     inherit UP to the wrapper that consumes `var(--layer-*)`), so the override
  //     must ride the WRAPPER (the `PAGE_TILT_PARENT_LAYER_ATTRIBUTE` scope). The
  //     hoist is decided from the BASE style (tilt non-none AND base layer present).
  if (styleOverride.layer !== undefined) {
    const baseStyle = block.style ?? {};
    const baseTiltAndLayer =
      baseStyle.tilt != null && baseStyle.tilt !== "none" && baseStyle.layer != null;
    const layerTarget = baseTiltAndLayer ? wrapper : frame;
    const mergedLayer = mergePageBlockLayerPresentKeys(baseStyle.layer, styleOverride.layer);
    for (const key of ["x", "y", "z"] as const) {
      if (!Object.prototype.hasOwnProperty.call(styleOverride.layer, key)) continue;
      const value = mergedLayer?.[key];
      if (isFiniteNumber(value)) {
        layerTarget.push(
          key === "z"
            ? { property: "--layer-z", value: String(value) }
            : { property: `--layer-${key}`, value: `${value}%` }
        );
      }
    }
  }

  // TASK-524-02-L03 — per-device glass/glow TINT. The base resolver
  // (`resolveBlockCompositionAttrs`) seeds `--surface-glow`/`--deco-ring`/
  // `--orb-color` as inline custom props on the block FRAME (frameVars in
  // splitBlockComposition), gated on a plain (non-gradient/url) tint and on the
  // surface/effect actually being active (surfacePreset|hoverEffect|
  // decoration.motion in {radiate,pulse,drift,float}). We retarget those same
  // three frame custom props per breakpoint so the control's advertised
  // per-device tinting is honored: the props ride the SAME block-frame selector
  // that carries the base var + the media query, and every frame declaration is
  // serialized with !important, so the delta beats the inline base custom prop.
  // Fails closed to a diagnostic on an unsafe or gradient/url tint (invalid
  // inside radial-gradient()); an effect-inactive breakpoint emits nothing.
  if (styleOverride.surfaceTint !== undefined) {
    const tint = mergedStyle.surfaceTint;
    const motion = mergedStyle.decoration?.motion;
    const glowActive =
      !!mergedStyle.surfacePreset ||
      !!mergedStyle.hoverEffect ||
      motion === "radiate" ||
      motion === "pulse" ||
      motion === "drift" ||
      motion === "float";
    if (typeof tint === "string" && isSafeCssColor(tint) && !isGradientOrUrlColor(tint)) {
      if (glowActive) {
        frame.push({ property: "--surface-glow", value: tint });
        frame.push({ property: "--deco-ring", value: tint });
        frame.push({ property: "--orb-color", value: tint });
      }
    } else if (tint !== null && tint !== undefined) {
      diag("style.surfaceTint", "unsafe_color_value");
    }
  }

  // Typography overrides (TASK-424 + TASK-532 Bundle B). Only typography-capable
  // blocks have a painted text target; explicit `null` overrides (clear back to
  // the baked classes at one breakpoint) are not expressible against the inline
  // base values, so both cases fail closed into diagnostics.
  // TASK-532 — `fontSizeCustom` WINS over the discrete `fontSize` token (mirrors
  // `toPageBlockTypographyStyle`) and emits only after the shared sanitizer
  // accepts it; a present-but-invalid custom size occupies the font-size slot,
  // so the token fallback never re-emits beside it.
  if (styleOverride.fontSizeCustom !== undefined) {
    if (!isPageTypographyCapableBlockType(block.type)) {
      diag("style.fontSizeCustom", "not_css_expressible");
    } else {
      const custom = sanitizeAuthoringCssFontSize(mergedStyle.fontSizeCustom);
      if (custom) {
        typography.push({ property: "font-size", value: custom });
      } else {
        diag("style.fontSizeCustom", "not_css_expressible");
      }
    }
  }
  const typographyEnumOverrides = [
    ["fontFamily", pageTypographyFontFamilyCssValues, "font-family"],
    ["fontSize", pageTypographyFontSizeCssValues, "font-size"],
    ["fontWeight", pageTypographyFontWeightCssValues, "font-weight"],
  ] as const;
  for (const [key, cssValues, property] of typographyEnumOverrides) {
    if (key === "fontSize" && styleOverride.fontSizeCustom !== undefined) continue;
    if (styleOverride[key] === undefined) continue;
    const merged = mergedStyle[key];
    if (!isPageTypographyCapableBlockType(block.type) || merged === null || merged === undefined) {
      diag(`style.${key}`, "not_css_expressible");
      continue;
    }
    const value = (cssValues as Record<string, string>)[merged];
    if (value) typography.push({ property, value });
  }
  // TASK-532 — explicit `text-transform` (fixed enum, `"none"` is a present
  // per-breakpoint reset and survives normalization). Invalid raw values fail
  // closed into an exact-key diagnostic; no raw fallback is emitted.
  if (styleOverride.textTransform !== undefined) {
    if (!isPageTypographyCapableBlockType(block.type)) {
      diag("style.textTransform", "not_css_expressible");
    } else {
      const value = (blockTextTransformCssValues as Record<string, string>)[
        mergedStyle.textTransform ?? ""
      ];
      if (value) {
        typography.push({ property: "text-transform", value });
      } else {
        diag("style.textTransform", "not_css_expressible");
      }
    }
  }
  const typographyNumberOverrides = [
    ["lineHeight", "line-height", ""],
    ["letterSpacing", "letter-spacing", "px"],
  ] as const;
  for (const [key, property, unit] of typographyNumberOverrides) {
    if (styleOverride[key] === undefined) continue;
    const merged = mergedStyle[key];
    if (!isPageTypographyCapableBlockType(block.type) || !isFiniteNumber(merged)) {
      diag(`style.${key}`, "not_css_expressible");
      continue;
    }
    typography.push({ property, value: `${merged}${unit}` });
  }

  if (override.visibility?.visible === false) {
    frame.push({ property: "display", value: "none" });
  }

  return { frame, gridItem, element: visual === frame ? [] : visual, text, wrapper };
};
