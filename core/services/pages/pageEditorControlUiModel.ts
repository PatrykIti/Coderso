import { DEFAULT_TOKENS, type DesignTokens } from "../theme/tokenTypes";
import type { PageEditorControlDefinition } from "./pageEditorControlRegistry";

/**
 * Pure presentational adapter between the page editor control registry and the
 * floating-inspector control primitives. The registry stays the owner of
 * target/path/type/options/clamp metadata; this module owns how a control is
 * presented: segmented upgrades for small finite sets, slider ranges for
 * bounded numbers, option label text, and color palettes.
 *
 * This module must stay Bun-free and side-effect free.
 */

/** Option sets up to this size upgrade from a native select to segmented pills. */
export const PAGE_EDITOR_SEGMENTED_OPTION_LIMIT = 6;

/**
 * Integer clamp ranges starting at 1 with up to this many discrete values
 * (for example section columns 1-4) render as segmented numeric pills instead
 * of a slider or native number input.
 */
export const PAGE_EDITOR_SEGMENTED_NUMBER_OPTION_LIMIT = 5;

/**
 * Bounded numeric ranges with a span above this threshold pair the slider with
 * stepper buttons so wide ranges (max width, paddings) stay precise.
 */
export const PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD = 100;

export type PageEditorColorSwatch = {
  id: string;
  label: string;
  value: string;
};

export type PageEditorControlUiModel =
  | {
      kind: "segmented";
      options: readonly string[];
      labels: Readonly<Record<string, string>>;
    }
  | {
      kind: "select";
      options: readonly string[];
      labels: Readonly<Record<string, string>>;
    }
  | { kind: "toggle" }
  | { kind: "slider"; min: number; max: number; step: number; unit: string }
  | { kind: "sliderStepper"; min: number; max: number; step: number; unit: string }
  | { kind: "swatch"; allowCustom: boolean; allowTransparent: boolean }
  | { kind: "media" }
  | { kind: "text" }
  | { kind: "unsupported"; reason: string };

export type PageEditorControlUiKind = PageEditorControlUiModel["kind"];

/**
 * English label catalog for registry enum tokens. Raw enum tokens must never
 * be the primary user-facing label; unknown tokens fall back to a humanized
 * form through {@link getPageEditorOptionLabel}.
 */
export const pageEditorOptionLabelCatalog: Readonly<Record<string, string>> = {
  // Alignment and distribution
  start: "Start",
  center: "Center",
  end: "End",
  stretch: "Stretch",
  between: "Between",
  equal: "Equal",
  auto: "Auto",
  full: "Full",
  // Shadows and sizes
  none: "None",
  sm: "Small",
  md: "Medium",
  lg: "Large",
  // Background types
  color: "Color",
  gradient: "Gradient",
  image: "Image",
  video: "Video",
  // Button variants
  primary: "Primary",
  secondary: "Secondary",
  ghost: "Ghost",
  link: "Link",
  // Text formats and alignment
  plain: "Plain",
  rich: "Rich text",
  left: "Left",
  right: "Right",
  // Heading levels
  h1: "H1",
  h2: "H2",
  h3: "H3",
  h4: "H4",
  h5: "H5",
  h6: "H6",
  // Image fit
  cover: "Cover",
  contain: "Contain",
  // Divider tones
  neutral: "Neutral",
  muted: "Muted",
  accent: "Accent",
  // Group direction
  row: "Row",
  column: "Column",
  // Section variants
  default: "Default",
  split: "Split",
  centered: "Centered",
  "full-width": "Full width",
  cards: "Cards",
  grid: "Grid",
  horizontal: "Horizontal",
  compact: "Compact",
};

/**
 * Per-control label overrides for tokens whose meaning depends on the control,
 * keyed by registry control id. Overrides win over the global catalog.
 */
export const pageEditorControlOptionLabelOverrides: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = {
  "block.button.props.target": {
    self: "Same tab",
    blank: "New tab",
  },
};

const humanizeOptionToken = (option: string): string => {
  const spaced = option.replace(/[-_]+/g, " ").trim();
  if (spaced.length === 0) return option;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
};

export const getPageEditorOptionLabel = (option: string, controlId?: string): string => {
  if (controlId) {
    const override = pageEditorControlOptionLabelOverrides[controlId]?.[option];
    if (override) return override;
  }
  return pageEditorOptionLabelCatalog[option] ?? humanizeOptionToken(option);
};

export const getPageEditorOptionLabels = (
  options: readonly string[],
  controlId?: string
): Record<string, string> => {
  const labels: Record<string, string> = {};
  for (const option of options) {
    labels[option] = getPageEditorOptionLabel(option, controlId);
  }
  return labels;
};

/**
 * Token-backed swatch palette for color controls, derived from the design
 * tokens contract. Callers may pass site-resolved tokens; defaults stay pure.
 */
export const getPageEditorColorPalette = (
  tokens: DesignTokens = DEFAULT_TOKENS
): readonly PageEditorColorSwatch[] => [
  { id: "primary", label: "Primary", value: tokens.colors.primary },
  { id: "secondary", label: "Secondary", value: tokens.colors.secondary },
  { id: "accent", label: "Accent", value: tokens.colors.accent },
  { id: "bg", label: "Background", value: tokens.neutrals.bg },
  { id: "surface", label: "Surface", value: tokens.neutrals.surface },
  { id: "border", label: "Border", value: tokens.neutrals.border },
  { id: "text", label: "Text", value: tokens.neutrals.text },
];

const isSegmentedNumberRange = (clamp: { min: number; max: number }): boolean =>
  Number.isInteger(clamp.min) &&
  Number.isInteger(clamp.max) &&
  clamp.min >= 1 &&
  clamp.max - clamp.min + 1 <= PAGE_EDITOR_SEGMENTED_NUMBER_OPTION_LIMIT;

const resolveSliderStep = (clamp: { min: number; max: number }): number => {
  if (clamp.max <= 1) return 0.05;
  const span = clamp.max - clamp.min;
  if (span <= 64) return 1;
  if (span <= 160) return 2;
  if (span <= 400) return 4;
  return 10;
};

const resolveNumberModel = (control: PageEditorControlDefinition): PageEditorControlUiModel => {
  const clamp = control.clamp;
  if (
    !clamp ||
    !Number.isFinite(clamp.min) ||
    !Number.isFinite(clamp.max) ||
    clamp.max <= clamp.min
  ) {
    return { kind: "unsupported", reason: "number-without-valid-clamp" };
  }
  if (isSegmentedNumberRange(clamp)) {
    const options: string[] = [];
    for (let value = clamp.min; value <= clamp.max; value += 1) {
      options.push(String(value));
    }
    return {
      kind: "segmented",
      options,
      labels: getPageEditorOptionLabels(options, control.id),
    };
  }
  const span = clamp.max - clamp.min;
  const model = {
    min: clamp.min,
    max: clamp.max,
    step: resolveSliderStep(clamp),
    unit: clamp.max <= 1 ? "" : "px",
  };
  return span > PAGE_EDITOR_SLIDER_STEPPER_SPAN_THRESHOLD
    ? { kind: "sliderStepper", ...model }
    : { kind: "slider", ...model };
};

/**
 * Whether the swatch UI may offer a "Transparent" option that clears the
 * stored value. Defaults to true for color inputs: block style colors are
 * nullable in `pageDocumentV2` (`textColor`/`background`/`borderColor` accept
 * `string | null`), so clearing writes an explicit `null` through the normal
 * update path. Base SECTION style colors (`style.background`, `style.accent`)
 * are non-nullable strings — normalization would silently rewrite `null` back
 * to the default on save — so section color controls do not offer it.
 */
const allowsTransparentColor = (control: PageEditorControlDefinition): boolean =>
  control.target === "block";

const resolveOptionModel = (control: PageEditorControlDefinition): PageEditorControlUiModel => {
  const options = control.options ?? [];
  if (options.length === 0) {
    return { kind: "unsupported", reason: "option-control-without-options" };
  }
  const labels = getPageEditorOptionLabels(options, control.id);
  if (options.length <= PAGE_EDITOR_SEGMENTED_OPTION_LIMIT) {
    return { kind: "segmented", options, labels };
  }
  return { kind: "select", options, labels };
};

/**
 * Maps a registry control to its presentational model. Unknown input kinds
 * fail closed to a non-mutating "unsupported" model instead of a raw text
 * input; raw text stays reserved for genuinely free-form string fields.
 */
export const resolvePageEditorControlUiModel = (
  control: PageEditorControlDefinition
): PageEditorControlUiModel => {
  switch (control.input) {
    case "switch":
      return { kind: "toggle" };
    case "number":
      return resolveNumberModel(control);
    case "select":
    case "segmented":
      return resolveOptionModel(control);
    case "color":
      return {
        kind: "swatch",
        allowCustom: true,
        allowTransparent: allowsTransparentColor(control),
      };
    case "swatch":
      return {
        kind: "swatch",
        allowCustom: false,
        allowTransparent: allowsTransparentColor(control),
      };
    case "media":
      return { kind: "media" };
    case "text":
      return { kind: "text" };
    default:
      return { kind: "unsupported", reason: `unknown-control-input:${String(control.input)}` };
  }
};

/** Clamps a numeric control value to the model bounds without snapping to step. */
export const clampPageEditorSliderValue = (
  value: number,
  model: { min: number; max: number }
): number => {
  if (Number.isNaN(value)) return model.min;
  return Math.min(model.max, Math.max(model.min, value));
};
