export const cssColorProfiles = ["authoring", "inherited-render"] as const;
export type CssColorProfile = (typeof cssColorProfiles)[number];

export type RgbChannels = Readonly<{
  red: number;
  green: number;
  blue: number;
}>;

export type ParsedCssColor =
  | {
      kind: "hex" | "rgb" | "hsl";
      normalized: string;
      baseHex: string;
      alpha: number;
      rgb: RgbChannels;
    }
  | { kind: "token"; normalized: string }
  | { kind: "keyword"; normalized: "transparent" | "currentColor" | "inherit" };

export const CSS_COLOR_VALUE_MAX_LENGTH = 128 as const;

const DECIMAL_SOURCE = "[0-9]+(?:\\.[0-9]+)?";
const ALPHA_DECIMAL_SOURCE = `(?:${DECIMAL_SOURCE}|\\.[0-9]+)`;
const RGB_CHANNEL_SOURCE = `${DECIMAL_SOURCE}%?`;
const ALPHA_SOURCE = `${ALPHA_DECIMAL_SOURCE}%?`;
const ASCII_SPACE_SOURCE = " *";
const COMMA_SOURCE = `${ASCII_SPACE_SOURCE},${ASCII_SPACE_SOURCE}`;

const RGB_FUNCTION_SOURCE =
  `[rR][gG][bB](?:[aA])?\\(${ASCII_SPACE_SOURCE}` +
  `${RGB_CHANNEL_SOURCE}${COMMA_SOURCE}${RGB_CHANNEL_SOURCE}${COMMA_SOURCE}` +
  `${RGB_CHANNEL_SOURCE}(?:${COMMA_SOURCE}${ALPHA_SOURCE})?${ASCII_SPACE_SOURCE}\\)`;
const HSL_FUNCTION_SOURCE =
  `[hH][sS][lL](?:[aA])?\\(${ASCII_SPACE_SOURCE}` +
  `${DECIMAL_SOURCE}(?:[dD][eE][gG])?${COMMA_SOURCE}${DECIMAL_SOURCE}%` +
  `${COMMA_SOURCE}${DECIMAL_SOURCE}%(?:${COMMA_SOURCE}${ALPHA_SOURCE})?` +
  `${ASCII_SPACE_SOURCE}\\)`;
const HEX_SOURCE = "#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})";
const TOKEN_SOURCE = "[vV][aA][rR]\\( *--color-[a-z0-9-]+ *\\)";
const TRANSPARENT_SOURCE = "[tT][rR][aA][nN][sS][pP][aA][rR][eE][nN][tT]";
const CURRENT_COLOR_SOURCE = "[cC][uU][rR][rR][eE][nN][tT][cC][oO][lL][oO][rR]";
const INHERIT_SOURCE = "[iI][nN][hH][eE][rR][iI][tT]";

// JSON Schema patterns are structural prefilters only. The printable-ASCII guard
// prevents ECMAScript's `$` behavior from accepting a trailing line terminator,
// while deliberately leaving numeric range checks to parseCssColorValue.
const PRINTABLE_ASCII_SCHEMA_GUARD = "(?![\\u0000-\\uffff]*[^\\u0020-\\u007e])";
const schemaPatternFor = (keywordSource: string): string =>
  `^${PRINTABLE_ASCII_SCHEMA_GUARD}${ASCII_SPACE_SOURCE}(?:${HEX_SOURCE}|${RGB_FUNCTION_SOURCE}|${HSL_FUNCTION_SOURCE}|${TOKEN_SOURCE}|${keywordSource})${ASCII_SPACE_SOURCE}$`;

export const CSS_COLOR_SCHEMA_PATTERNS: Readonly<Record<CssColorProfile, string>> = Object.freeze({
  authoring: schemaPatternFor(TRANSPARENT_SOURCE),
  "inherited-render": schemaPatternFor(
    `(?:${TRANSPARENT_SOURCE}|${CURRENT_COLOR_SOURCE}|${INHERIT_SOURCE})`
  ),
});

const HEX_PATTERN = new RegExp(`^${HEX_SOURCE}$`);
const RGB_FUNCTION_PATTERN = new RegExp(
  `^[rR][gG][bB](?:[aA])?\\( *(${RGB_CHANNEL_SOURCE}) *, *(${RGB_CHANNEL_SOURCE}) *, *(${RGB_CHANNEL_SOURCE})(?: *, *(${ALPHA_SOURCE}))? *\\)$`
);
const HSL_FUNCTION_PATTERN = new RegExp(
  `^[hH][sS][lL](?:[aA])?\\( *(${DECIMAL_SOURCE})(?:[dD][eE][gG])? *, *(${DECIMAL_SOURCE}%) *, *(${DECIMAL_SOURCE}%)(?: *, *(${ALPHA_SOURCE}))? *\\)$`
);
const TOKEN_PATTERN = /^[vV][aA][rR]\( *(--color-[a-z0-9-]+) *\)$/;
const DECIMAL_PATTERN = /^[0-9]+(?:\.[0-9]+)?$/;
const ALPHA_DECIMAL_PATTERN = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
const UNLISTED_ASCII_PATTERN = /[^ A-Za-z0-9#%(),.-]/;

type ParsedDecimal = Readonly<{
  normalized: string;
  numeric: number;
  percentage: boolean;
}>;

const trimAsciiSpace = (value: string): string => {
  let start = 0;
  let end = value.length;
  while (start < end && value.charCodeAt(start) === 0x20) start += 1;
  while (end > start && value.charCodeAt(end - 1) === 0x20) end -= 1;
  return value.slice(start, end);
};

const hasControlOrNonAscii = (value: string): boolean => {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code >= 0x7f) return true;
  }
  return false;
};

const normalizeDecimalLexeme = (lexeme: string): string => {
  const [integerPart = "", fractionalPart] = lexeme.split(".");
  const normalizedInteger = integerPart.replace(/^0+/, "") || "0";
  const normalizedFraction = fractionalPart?.replace(/0+$/, "") ?? "";
  return normalizedFraction.length > 0
    ? `${normalizedInteger}.${normalizedFraction}`
    : normalizedInteger;
};

const parseDecimal = (token: string, allowLeadingDot = false): ParsedDecimal | undefined => {
  const percentage = token.endsWith("%");
  const lexeme = percentage ? token.slice(0, -1) : token;
  const pattern = allowLeadingDot ? ALPHA_DECIMAL_PATTERN : DECIMAL_PATTERN;
  if (!pattern.test(lexeme)) return undefined;

  const numeric = Number(lexeme);
  if (!Number.isFinite(numeric)) return undefined;

  return {
    normalized: `${normalizeDecimalLexeme(lexeme)}${percentage ? "%" : ""}`,
    numeric,
    percentage,
  };
};

const isWithinIntegerMaximum = (value: ParsedDecimal, maximum: number): boolean => {
  const normalized = value.percentage ? value.normalized.slice(0, -1) : value.normalized;
  const [integerPart = "0", fractionalPart] = normalized.split(".");
  const maximumText = String(maximum);
  if (integerPart.length !== maximumText.length) {
    return integerPart.length < maximumText.length;
  }
  if (integerPart !== maximumText) return integerPart < maximumText;
  return fractionalPart === undefined;
};

const parseRgbChannel = (token: string): ParsedDecimal | undefined => {
  const parsed = parseDecimal(token);
  if (!parsed) return undefined;
  const maximum = parsed.percentage ? 100 : 255;
  return isWithinIntegerMaximum(parsed, maximum) ? parsed : undefined;
};

const parsePercentage = (token: string): ParsedDecimal | undefined => {
  const parsed = parseDecimal(token);
  return parsed?.percentage && isWithinIntegerMaximum(parsed, 100) ? parsed : undefined;
};

const parseAlpha = (token: string | undefined): ParsedDecimal | undefined => {
  if (token === undefined) {
    return { normalized: "1", numeric: 1, percentage: false };
  }
  const parsed = parseDecimal(token, true);
  if (!parsed) return undefined;
  const maximum = parsed.percentage ? 100 : 1;
  return isWithinIntegerMaximum(parsed, maximum) ? parsed : undefined;
};

const channelByte = (channel: ParsedDecimal): number =>
  Math.round(channel.percentage ? (channel.numeric * 255) / 100 : channel.numeric);

const byteHex = (value: number): string => value.toString(16).padStart(2, "0");

const baseHexFor = (rgb: RgbChannels): string =>
  `#${byteHex(rgb.red)}${byteHex(rgb.green)}${byteHex(rgb.blue)}`;

const parseHex = (value: string): ParsedCssColor => {
  const normalized = value.toLowerCase();
  const body = normalized.slice(1);
  const short = body.length === 3 || body.length === 4;
  const redHex = short ? `${body[0]}${body[0]}` : body.slice(0, 2);
  const greenHex = short ? `${body[1]}${body[1]}` : body.slice(2, 4);
  const blueHex = short ? `${body[2]}${body[2]}` : body.slice(4, 6);
  const alphaHex =
    body.length === 4 ? `${body[3]}${body[3]}` : body.length === 8 ? body.slice(6, 8) : undefined;
  const rgb = {
    red: Number.parseInt(redHex, 16),
    green: Number.parseInt(greenHex, 16),
    blue: Number.parseInt(blueHex, 16),
  };

  return {
    kind: "hex",
    normalized,
    baseHex: baseHexFor(rgb),
    alpha: alphaHex === undefined ? 1 : Number.parseInt(alphaHex, 16) / 255,
    rgb,
  };
};

const parseRgb = (value: string): ParsedCssColor | undefined => {
  const match = RGB_FUNCTION_PATTERN.exec(value);
  if (!match) return undefined;

  const red = parseRgbChannel(match[1]!);
  const green = parseRgbChannel(match[2]!);
  const blue = parseRgbChannel(match[3]!);
  const alpha = parseAlpha(match[4]);
  if (!red || !green || !blue || !alpha) return undefined;

  const rgb = {
    red: channelByte(red),
    green: channelByte(green),
    blue: channelByte(blue),
  };
  const channels = `${red.normalized}, ${green.normalized}, ${blue.normalized}`;
  const hasAlpha = match[4] !== undefined;

  return {
    kind: "rgb",
    normalized: hasAlpha ? `rgba(${channels}, ${alpha.normalized})` : `rgb(${channels})`,
    baseHex: baseHexFor(rgb),
    alpha: alpha.percentage ? alpha.numeric / 100 : alpha.numeric,
    rgb,
  };
};

const hslToRgb = (hue: number, saturation: number, lightness: number): RgbChannels => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = ((hue === 360 ? 0 : hue) % 360) / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  const match = lightness - chroma / 2;
  return {
    red: Math.round((red + match) * 255),
    green: Math.round((green + match) * 255),
    blue: Math.round((blue + match) * 255),
  };
};

const parseHsl = (value: string): ParsedCssColor | undefined => {
  const match = HSL_FUNCTION_PATTERN.exec(value);
  if (!match) return undefined;

  const hue = parseDecimal(match[1]!);
  const saturation = parsePercentage(match[2]!);
  const lightness = parsePercentage(match[3]!);
  const alpha = parseAlpha(match[4]);
  if (
    !hue ||
    hue.percentage ||
    !isWithinIntegerMaximum(hue, 360) ||
    !saturation ||
    !lightness ||
    !alpha
  ) {
    return undefined;
  }

  const rgb = hslToRgb(hue.numeric, saturation.numeric / 100, lightness.numeric / 100);
  const channels = `${hue.normalized}, ${saturation.normalized}, ${lightness.normalized}`;
  const hasAlpha = match[4] !== undefined;

  return {
    kind: "hsl",
    normalized: hasAlpha ? `hsla(${channels}, ${alpha.normalized})` : `hsl(${channels})`,
    baseHex: baseHexFor(rgb),
    alpha: alpha.percentage ? alpha.numeric / 100 : alpha.numeric,
    rgb,
  };
};

const isCssColorProfile = (profile: CssColorProfile): boolean => cssColorProfiles.includes(profile);

const enforceCanonicalLength = (parsed: ParsedCssColor): ParsedCssColor | undefined =>
  parsed.normalized.length <= CSS_COLOR_VALUE_MAX_LENGTH ? parsed : undefined;

export function parseCssColorValue(
  value: unknown,
  profile: CssColorProfile
): ParsedCssColor | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length > CSS_COLOR_VALUE_MAX_LENGTH) return undefined;
  if (hasControlOrNonAscii(value) || UNLISTED_ASCII_PATTERN.test(value)) {
    return undefined;
  }
  if (!isCssColorProfile(profile)) return undefined;

  const raw = trimAsciiSpace(value);
  if (raw.length === 0) return undefined;

  if (HEX_PATTERN.test(raw)) return enforceCanonicalLength(parseHex(raw));

  const rgb = parseRgb(raw);
  if (rgb) return enforceCanonicalLength(rgb);

  const hsl = parseHsl(raw);
  if (hsl) return enforceCanonicalLength(hsl);

  const token = TOKEN_PATTERN.exec(raw);
  if (token) {
    return enforceCanonicalLength({ kind: "token", normalized: `var(${token[1]})` });
  }

  const keyword = raw.toLowerCase();
  if (keyword === "transparent") {
    return enforceCanonicalLength({ kind: "keyword", normalized: "transparent" });
  }
  if (profile !== "inherited-render") return undefined;
  if (keyword === "currentcolor") {
    return enforceCanonicalLength({ kind: "keyword", normalized: "currentColor" });
  }
  if (keyword === "inherit") {
    return enforceCanonicalLength({ kind: "keyword", normalized: "inherit" });
  }
  return undefined;
}

export function normalizeCssColorValue(
  value: unknown,
  profile: CssColorProfile
): string | undefined {
  return parseCssColorValue(value, profile)?.normalized;
}
