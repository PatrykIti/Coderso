// TASK-516-01: Form theme resolver + token→className/style maps.
//
// This module is the ONE source of truth for turning a persisted
// `FormFormTheme` (partial, present-only) into a fully-defaulted
// `ResolvedFormTheme` (every enum/bool token concrete; optional color tokens
// stay undefined by default so the un-themed default inherits the prototype's
// theme tokens and emits NO inline CSS vars).
//
// `resolveFormTheme(undefined)` reproduces the prototype form canvas EXACTLY
// (`FormBuilderPreview.tsx:103-146`): `mx-auto max-w-lg` + `<Card className="p-6">`
// (rounded-2xl border shadow-soft) + title `font-display text-lg font-semibold`
// + `<form className="flex flex-col gap-4">` + `<Button className="w-full">`.
//
// The enum unions + `FORM_THEME_*` Sets live in `formSettings.ts` (the persisted
// reject-unknown allowlist); they are re-exported here so 516-02/04/06 have a
// single import site. Colors run through the canonical theme service here
// (defence in depth) before reaching any inline style.

import { normalizeCssColorValue } from "../theme/cssColorContract";
import type {
  FormFormTheme,
  FormThemeAlign,
  FormThemeBorderWidth,
  FormThemeButtonAlign,
  FormThemeColumns,
  FormThemeFontFamily,
  FormThemeGap,
  FormThemeInputSize,
  FormThemePadding,
  FormThemeRadius,
  FormThemeShadow,
  FormThemeTitleSize,
  FormThemeTitleWeight,
  FormThemeWidth,
} from "./formSettings";

// Re-export the shared vocabulary (defined once in formSettings.ts) so
// downstream subtasks import the model + resolver from a single module.
export type {
  FormFormTheme,
  FormThemeAlign,
  FormThemeBorderWidth,
  FormThemeButtonAlign,
  FormThemeColumns,
  FormThemeFontFamily,
  FormThemeGap,
  FormThemeInputSize,
  FormThemePadding,
  FormThemeRadius,
  FormThemeShadow,
  FormThemeTitleSize,
  FormThemeTitleWeight,
  FormThemeWidth,
} from "./formSettings";
export {
  FORM_THEME_ALIGNS,
  FORM_THEME_BORDER_WIDTHS,
  FORM_THEME_BUTTON_ALIGNS,
  FORM_THEME_COLUMNS,
  FORM_THEME_FONT_FAMILIES,
  FORM_THEME_GAPS,
  FORM_THEME_INPUT_SIZES,
  FORM_THEME_PADDINGS,
  FORM_THEME_RADII,
  FORM_THEME_SHADOWS,
  FORM_THEME_TITLE_SIZES,
  FORM_THEME_TITLE_WEIGHTS,
  FORM_THEME_WIDTHS,
} from "./formSettings";

export type ResolvedFormTheme = {
  layout: {
    width: FormThemeWidth;
    align: FormThemeAlign;
    columns: FormThemeColumns;
    fieldGap: FormThemeGap;
    buttonAlignment: FormThemeButtonAlign;
  };
  surface: {
    card: boolean;
    padding: FormThemePadding;
    radius: FormThemeRadius;
    shadow: FormThemeShadow;
    borderWidth: FormThemeBorderWidth;
    background?: string;
    borderColor?: string;
  };
  typography: {
    fontFamily: FormThemeFontFamily;
    titleSize: FormThemeTitleSize;
    titleWeight: FormThemeTitleWeight;
    titleColor?: string;
    labelColor?: string;
    helperColor?: string;
  };
  input: {
    size: FormThemeInputSize;
    radius: FormThemeRadius;
    background?: string;
    borderColor?: string;
    textColor?: string;
  };
  submit: {
    fullWidth: boolean;
    radius: FormThemeRadius;
    label?: string;
    background?: string;
    textColor?: string;
  };
};

// The un-themed canvas — grounded in FormBuilderPreview.tsx (line cited per value).
export const FORM_THEME_DEFAULTS: ResolvedFormTheme = {
  layout: {
    width: "md", // → max-w-lg (:103)
    align: "center", // mx-auto (:103)
    columns: 1, // single column (:112)
    fieldGap: "md", // → gap-4 (:112)
    buttonAlignment: "left",
  },
  surface: {
    card: true, // <Card> wrapper (:104)
    padding: "lg", // → p-6 (:104)
    radius: "xl", // Card rounded-2xl (card.tsx)
    shadow: "soft", // Card shadow-soft (card.tsx)
    borderWidth: "sm", // Card `border` = 1px (card.tsx)
    background: undefined,
    borderColor: undefined,
  },
  typography: {
    fontFamily: "display", // font-display (:106)
    titleSize: "lg", // → text-lg (:106)
    titleWeight: "semibold", // font-semibold (:106)
    titleColor: undefined,
    labelColor: undefined,
    helperColor: undefined,
  },
  input: {
    size: "md",
    radius: "lg", // Input rounded-xl (input.tsx)
    background: undefined,
    borderColor: undefined,
    textColor: undefined,
  },
  submit: {
    fullWidth: true, // w-full (:142)
    radius: "lg", // Button rounded-xl (button.tsx)
    label: undefined, // falls back to "Submit" (:143) at render
    background: undefined,
    textColor: undefined,
  },
};

const resolveColor = (value: string | undefined): string | undefined =>
  value === undefined ? undefined : normalizeCssColorValue(value, "inherited-render");

// Per-GROUP deep-merge over FORM_THEME_DEFAULTS. An undefined/omitted group or
// key falls back to the default value. Enum/bool tokens are always concrete;
// optional color tokens re-run the CSS-value policy (defence in depth) and stay
// undefined when unset or unsafe.
export function resolveFormTheme(theme?: FormFormTheme): ResolvedFormTheme {
  const d = FORM_THEME_DEFAULTS;
  const layout = theme?.layout;
  const surface = theme?.surface;
  const typography = theme?.typography;
  const input = theme?.input;
  const submit = theme?.submit;

  return {
    layout: {
      width: layout?.width ?? d.layout.width,
      align: layout?.align ?? d.layout.align,
      columns: layout?.columns ?? d.layout.columns,
      fieldGap: layout?.fieldGap ?? d.layout.fieldGap,
      buttonAlignment: layout?.buttonAlignment ?? d.layout.buttonAlignment,
    },
    surface: {
      card: surface?.card ?? d.surface.card,
      padding: surface?.padding ?? d.surface.padding,
      radius: surface?.radius ?? d.surface.radius,
      shadow: surface?.shadow ?? d.surface.shadow,
      borderWidth: surface?.borderWidth ?? d.surface.borderWidth,
      background: resolveColor(surface?.background) ?? d.surface.background,
      borderColor: resolveColor(surface?.borderColor) ?? d.surface.borderColor,
    },
    typography: {
      fontFamily: typography?.fontFamily ?? d.typography.fontFamily,
      titleSize: typography?.titleSize ?? d.typography.titleSize,
      titleWeight: typography?.titleWeight ?? d.typography.titleWeight,
      titleColor: resolveColor(typography?.titleColor) ?? d.typography.titleColor,
      labelColor: resolveColor(typography?.labelColor) ?? d.typography.labelColor,
      helperColor: resolveColor(typography?.helperColor) ?? d.typography.helperColor,
    },
    input: {
      size: input?.size ?? d.input.size,
      radius: input?.radius ?? d.input.radius,
      background: resolveColor(input?.background) ?? d.input.background,
      borderColor: resolveColor(input?.borderColor) ?? d.input.borderColor,
      textColor: resolveColor(input?.textColor) ?? d.input.textColor,
    },
    submit: {
      fullWidth: submit?.fullWidth ?? d.submit.fullWidth,
      radius: submit?.radius ?? d.submit.radius,
      label: submit?.label ?? d.submit.label,
      background: resolveColor(submit?.background) ?? d.submit.background,
      textColor: resolveColor(submit?.textColor) ?? d.submit.textColor,
    },
  };
}

// token → Tailwind class maps (only these classes may reach the DOM).
export const formThemeWidthClass: Record<FormThemeWidth, string> = {
  sm: "max-w-md",
  md: "max-w-lg", // prototype default (:103)
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  full: "max-w-none",
};
export const formThemeColumnsClass: Record<FormThemeColumns, string> = {
  1: "grid-cols-1", // prototype default (:112)
  2: "md:grid-cols-2",
};
export const formThemeAlignClass: Record<FormThemeAlign, string> = {
  left: "mr-auto",
  center: "mx-auto", // prototype default (:103)
  right: "ml-auto",
};
export const formThemeButtonAlignClass: Record<FormThemeButtonAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
  full: "w-full", // parent's "full" = full-bleed submit; overlaps submit.fullWidth
};
export const formThemeGapClass: Record<FormThemeGap, string> = {
  sm: "gap-2",
  md: "gap-4", // prototype default (:112)
  lg: "gap-6",
};
export const formThemePaddingClass: Record<FormThemePadding, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6", // prototype default (:104)
  xl: "p-8",
};
export const formThemeRadiusClass: Record<FormThemeRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
  xl: "rounded-2xl",
};
export const formThemeShadowClass: Record<FormThemeShadow, string> = {
  none: "shadow-none",
  soft: "shadow-soft", // prototype/Card default (custom utility) (:104)
  sm: "shadow-sm",
  md: "shadow-md",
  lg: "shadow-lg",
};
export const formThemeBorderWidthClass: Record<FormThemeBorderWidth, string> = {
  none: "border-0",
  sm: "border", // Card default 1px (:104)
  md: "border-2",
};
export const formThemeInputSizeClass: Record<FormThemeInputSize, string> = {
  sm: "h-8 text-sm",
  md: "h-9 text-sm",
  lg: "h-11 text-base",
};
export const formThemeTitleSizeClass: Record<FormThemeTitleSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg", // prototype default (:106)
  xl: "text-xl",
};
export const formThemeTitleWeightClass: Record<FormThemeTitleWeight, string> = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold", // prototype default (:106)
  bold: "font-bold",
};
export const formThemeFontFamilyClass: Record<FormThemeFontFamily, string> = {
  display: "font-display", // prototype default (:106)
  inherit: "",
  sans: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
};

// PINNED CSS-var key set — the SOLE-WRITER contract. 516-04 + 516-06 reference
// these EXACT names as `var(--…)` on their render paths; they MUST NOT drift.
// Each key is emitted ONLY when its resolved color token is defined
// (present-only); an undefined token emits NO entry so the consumer's
// `var(--…, <fallback>)` keeps the un-themed default.
export function buildFormThemeStyleVars(theme: ResolvedFormTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  const put = (key: string, value: string | undefined) => {
    const safe =
      value === undefined ? undefined : normalizeCssColorValue(value, "inherited-render");
    if (safe) vars[key] = safe;
  };
  put("--form-surface-bg", theme.surface.background);
  put("--form-border", theme.surface.borderColor);
  put("--form-title", theme.typography.titleColor);
  put("--form-label", theme.typography.labelColor);
  put("--form-helper", theme.typography.helperColor);
  put("--form-input-bg", theme.input.background);
  put("--form-input-border", theme.input.borderColor);
  put("--form-input-text", theme.input.textColor);
  put("--form-submit-bg", theme.submit.background);
  put("--form-submit-text", theme.submit.textColor);
  return vars;
}
