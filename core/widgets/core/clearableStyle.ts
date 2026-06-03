import type { CSSProperties } from "react";

export function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const safeCssColorKeywords = new Map([
  ["transparent", "transparent"],
  ["currentcolor", "currentColor"],
  ["inherit", "inherit"],
]);

const cssHexColorPattern = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const cssColorTokenPattern = /^var\(\s*--color-[a-zA-Z0-9_-]+\s*\)$/;
const cssRgbColorPattern =
  /^rgba?\(\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)\s*,\s*(\d{1,3}(?:\.\d+)?%?)(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const cssHslColorPattern =
  /^hsla?\(\s*(\d{1,3}(?:\.\d+)?)(?:deg)?\s*,\s*(\d{1,3}(?:\.\d+)?)%\s*,\s*(\d{1,3}(?:\.\d+)?)%(?:\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?|\d{1,3}(?:\.\d+)?%))?\s*\)$/i;
const unsafeCssColorFragments = /(?:url\s*\(|expression\s*\(|javascript:|data:|[;{}<>])/i;

const isBoundedCssNumber = (value: string, maximum: number) => {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return false;
  const limit = value.endsWith("%") ? 100 : maximum;
  return numeric >= 0 && numeric <= limit;
};

const isBoundedCssPercentage = (value: string) => {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 100;
};

const isBoundedCssAlpha = (value: string | undefined) => {
  if (value === undefined) return true;
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return false;
  return value.endsWith("%") ? numeric >= 0 && numeric <= 100 : numeric >= 0 && numeric <= 1;
};

function isSafeFunctionalCssColor(value: string) {
  const rgbMatch = cssRgbColorPattern.exec(value);
  if (rgbMatch) {
    return (
      isBoundedCssNumber(rgbMatch[1]!, 255) &&
      isBoundedCssNumber(rgbMatch[2]!, 255) &&
      isBoundedCssNumber(rgbMatch[3]!, 255) &&
      isBoundedCssAlpha(rgbMatch[4])
    );
  }

  const hslMatch = cssHslColorPattern.exec(value);
  if (!hslMatch) return false;
  const hue = Number.parseFloat(hslMatch[1]!);
  return (
    Number.isFinite(hue) &&
    hue >= 0 &&
    hue <= 360 &&
    isBoundedCssPercentage(hslMatch[2]!) &&
    isBoundedCssPercentage(hslMatch[3]!) &&
    isBoundedCssAlpha(hslMatch[4])
  );
}

export function resolveClearableCssColorValue(value: unknown): string | undefined {
  const trimmed = resolveClearableStyleValue(value);
  if (!trimmed || unsafeCssColorFragments.test(trimmed)) return undefined;

  const keyword = safeCssColorKeywords.get(trimmed.toLowerCase());
  if (keyword) return keyword;
  if (cssHexColorPattern.test(trimmed)) return trimmed;
  if (cssColorTokenPattern.test(trimmed)) return trimmed;
  if (isSafeFunctionalCssColor(trimmed)) return trimmed;
  return undefined;
}

export function compactStyle(style: CSSProperties): CSSProperties | undefined {
  const next = Object.fromEntries(
    Object.entries(style).filter(([, value]) => value !== undefined)
  ) as CSSProperties;
  return Object.keys(next).length > 0 ? next : undefined;
}

export function compactObject<T extends Record<string, unknown>>(value: T): Partial<T> | undefined {
  const next = Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== "")
  ) as Partial<T>;
  return Object.keys(next).length > 0 ? next : undefined;
}
