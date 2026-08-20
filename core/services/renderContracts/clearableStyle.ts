import type { CSSProperties } from "react";

import { normalizeCssColorValue, type CssColorProfile } from "../theme/cssColorContract";

export function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function resolveClearableCssColorValue(
  value: unknown,
  profile: CssColorProfile = "authoring",
  options: Readonly<{ allowInheritKeyword?: boolean }> = {}
): string | undefined {
  const normalized = normalizeCssColorValue(value, profile);
  return options.allowInheritKeyword === false && normalized === "inherit" ? undefined : normalized;
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
