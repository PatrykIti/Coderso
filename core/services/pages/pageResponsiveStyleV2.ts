import type { PageBlockLayer, PageBlockStyleV2, PageSectionStyleV2 } from "./pageDocumentV2Types";

/**
 * Dedicated responsive section style (TASK-539). A strict partial of the base
 * section style that excludes every base-only/structural key. Each excluded
 * member is re-added as optional `never` so a broad base-style variable cannot
 * slip through structural assignment (excess-property checking alone is not a
 * boundary). Owned here; `PageSectionResponsiveOverrideV2` imports it.
 */
export type PageSectionResponsiveStyleV2 = Partial<
  Omit<
    PageSectionStyleV2,
    | "scrollEffect"
    | "parallaxIntensity"
    | "surfacePreset"
    | "composition"
    | "fullBleed"
    | "noiseOverlay"
    | "columnTemplate"
    | "border"
  >
> & {
  scrollEffect?: never;
  parallaxIntensity?: never;
  surfacePreset?: never;
  composition?: never;
  fullBleed?: never;
  noiseOverlay?: never;
  columnTemplate?: never;
  border?: never;
};

/**
 * Responsive block layer delta (TASK-539): only numeric `x`/`y`/`z` offsets
 * render per device. `anchor` is base-only; the `?: never` member rejects both
 * object literals carrying `anchor` and broad `PageBlockLayer` variables.
 */
export type PageBlockResponsiveLayerV2 = Pick<PageBlockLayer, "x" | "y" | "z"> & {
  anchor?: never;
};

/**
 * Dedicated responsive block style (TASK-539). A strict partial of the base
 * block style that excludes every base-only/structural key (each re-added as
 * optional `never`). `layer` is narrowed to the numeric `x`/`y`/`z` delta.
 * `style.column` deliberately remains: the editor and breakpoint resolver
 * support it, while the public front diagnoses it as `not_css_expressible`.
 */
export type PageBlockResponsiveStyleV2 = Partial<
  Omit<
    PageBlockStyleV2,
    | "layer"
    | "decoration"
    | "tilt"
    | "tiltGlare"
    | "surfacePreset"
    | "hoverEffect"
    | "marquee"
    | "composition"
    | "revealDelay"
    | "magnetic"
  >
> & {
  layer?: PageBlockResponsiveLayerV2;
  decoration?: never;
  tilt?: never;
  tiltGlare?: never;
  surfacePreset?: never;
  hoverEffect?: never;
  marquee?: never;
  composition?: never;
  revealDelay?: never;
  magnetic?: never;
};
