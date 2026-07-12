import {
  normalizeCssColorValue,
  parseCssColorValue,
  type CssColorProfile,
  type RgbChannels,
} from "../../../services/theme/cssColorContract";

export type ParsedColor =
  | Readonly<{
      kind: "hex" | "rgb" | "hsl";
      raw: string;
      normalized: string;
      baseHex: string;
      alpha: number;
      rgb: RgbChannels;
    }>
  | Readonly<{
      kind: "token";
      raw: string;
      normalized: string;
    }>
  | Readonly<{
      kind: "keyword";
      raw: string;
      normalized: "transparent" | "currentColor" | "inherit";
      keyword: "transparent" | "currentColor" | "inherit";
    }>
  | Readonly<{ kind: "unknown"; raw: string }>;

const opaqueHexPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const normalizeOpaqueHex = (value: string): string | undefined => {
  if (!opaqueHexPattern.test(value)) return undefined;
  const body = value.slice(1).toLowerCase();
  if (body.length === 6) return `#${body}`;
  return `#${body[0]}${body[0]}${body[1]}${body[1]}${body[2]}${body[2]}`;
};

const byteToHex = (value: number): string => value.toString(16).padStart(2, "0");

export function parseColorValue(
  value: string | null | undefined,
  profile: CssColorProfile = "authoring"
): ParsedColor {
  const raw = value ?? "";
  const parsed = parseCssColorValue(raw, profile);
  if (!parsed) return { kind: "unknown", raw };

  switch (parsed.kind) {
    case "hex":
    case "rgb":
    case "hsl":
      return { ...parsed, raw };
    case "token":
      return { ...parsed, raw };
    case "keyword":
      return { ...parsed, raw, keyword: parsed.normalized };
  }
}

export function normalizeAdminColorValue(
  value: string | null | undefined,
  profile: CssColorProfile = "authoring"
): string | undefined {
  return normalizeCssColorValue(value, profile);
}

export function composeHexColor(baseHex: string, alpha: number): string | undefined {
  if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return undefined;
  const normalizedBase = normalizeOpaqueHex(baseHex);
  if (!normalizedBase) return undefined;
  if (alpha === 1) return normalizedBase;
  return `${normalizedBase}${byteToHex(Math.round(alpha * 255))}`;
}

export function colorAlpha(parsed: ParsedColor): number {
  return parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl" ? parsed.alpha : 1;
}

export function pickerHexFor(parsed: ParsedColor, fallback = "#000000"): string {
  if (parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl") {
    return parsed.baseHex;
  }
  return normalizeOpaqueHex(fallback) ?? "#000000";
}

export function isAlphaPickerRepresentable(
  value: string | null | undefined,
  profile: CssColorProfile = "authoring"
): boolean {
  const parsed = parseColorValue(value, profile);
  return parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl";
}
