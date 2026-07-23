import type { FormFormTheme } from "../../../core/services/forms/formSettings";

const freezeRows = <const Rows extends readonly Readonly<Record<PropertyKey, unknown>>[]>(
  rows: Rows
): Rows => {
  for (const row of rows) Object.freeze(row);
  return Object.freeze(rows) as Rows;
};

export const FORM_COLOR_CONSUMER_CASES = freezeRows([
  {
    group: "surface",
    key: "background",
    controlId: "form-theme-surface-background",
    cssVar: "--form-surface-bg",
    raw: " CURRENTCOLOR ",
    canonical: "currentColor",
    updateRaw: " INHERIT ",
    updateCanonical: "inherit",
    pickerReplacement: "#102030",
  },
  {
    group: "surface",
    key: "borderColor",
    controlId: "form-theme-surface-borderColor",
    cssVar: "--form-border",
    raw: " INHERIT ",
    canonical: "inherit",
    updateRaw: " CURRENTCOLOR ",
    updateCanonical: "currentColor",
    pickerReplacement: "#102030",
  },
  {
    group: "typography",
    key: "titleColor",
    controlId: "form-theme-typography-titleColor",
    cssVar: "--form-title",
    raw: " RGBA(1, 2, 3, .5) ",
    canonical: "rgba(1, 2, 3, 0.5)",
    updateRaw: " CURRENTCOLOR ",
    updateCanonical: "currentColor",
    pickerReplacement: "#10203080",
  },
  {
    group: "typography",
    key: "labelColor",
    controlId: "form-theme-typography-labelColor",
    cssVar: "--form-label",
    raw: " HSLA(210DEG, 50%, 40%, .25) ",
    canonical: "hsla(210, 50%, 40%, 0.25)",
    updateRaw: " INHERIT ",
    updateCanonical: "inherit",
    pickerReplacement: "#10203040",
  },
  {
    group: "typography",
    key: "helperColor",
    controlId: "form-theme-typography-helperColor",
    cssVar: "--form-helper",
    raw: " #ABC ",
    canonical: "#abc",
    updateRaw: " CURRENTCOLOR ",
    updateCanonical: "currentColor",
    pickerReplacement: "#102030",
  },
  {
    group: "input",
    key: "borderColor",
    controlId: "form-theme-input-borderColor",
    cssVar: "--form-input-border",
    raw: " RGB(4, 5, 6) ",
    canonical: "rgb(4, 5, 6)",
    updateRaw: " INHERIT ",
    updateCanonical: "inherit",
    pickerReplacement: "#102030",
  },
  {
    group: "input",
    key: "background",
    controlId: "form-theme-input-background",
    cssVar: "--form-input-bg",
    raw: " inherit ",
    canonical: "inherit",
    updateRaw: " CURRENTCOLOR ",
    updateCanonical: "currentColor",
    pickerReplacement: "#102030",
  },
  {
    group: "input",
    key: "textColor",
    controlId: "form-theme-input-textColor",
    cssVar: "--form-input-text",
    raw: " currentcolor ",
    canonical: "currentColor",
    updateRaw: " INHERIT ",
    updateCanonical: "inherit",
    pickerReplacement: "#102030",
  },
  {
    group: "submit",
    key: "background",
    controlId: "form-theme-submit-background",
    cssVar: "--form-submit-bg",
    raw: " rgba(7, 8, 9, 50%) ",
    canonical: "rgba(7, 8, 9, 50%)",
    updateRaw: " CURRENTCOLOR ",
    updateCanonical: "currentColor",
    pickerReplacement: "#10203080",
  },
  {
    group: "submit",
    key: "textColor",
    controlId: "form-theme-submit-textColor",
    cssVar: "--form-submit-text",
    raw: " hsl(120deg, 100%, 50%) ",
    canonical: "hsl(120, 100%, 50%)",
    updateRaw: " INHERIT ",
    updateCanonical: "inherit",
    pickerReplacement: "#102030",
  },
] as const);

export type FormColorConsumerCase = (typeof FORM_COLOR_CONSUMER_CASES)[number];
export type FormColorTableValue = "raw" | "canonical" | "updateRaw" | "updateCanonical";

export function buildFormColorTheme(value: FormColorTableValue): FormFormTheme {
  const theme: Record<string, Record<string, string>> = {};
  for (const entry of FORM_COLOR_CONSUMER_CASES) {
    (theme[entry.group] ??= {})[entry.key] = entry[value];
  }
  return theme as FormFormTheme;
}
