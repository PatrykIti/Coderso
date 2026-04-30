import type { CSSProperties } from "react";

export function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
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
