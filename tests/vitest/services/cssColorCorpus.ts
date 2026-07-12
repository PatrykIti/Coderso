import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

export const CSS_COLOR_CORPUS_PROFILES = Object.freeze(["authoring", "inherited-render"] as const);

export type CssColorCorpusProfile = (typeof CSS_COLOR_CORPUS_PROFILES)[number];
export type CssColorCorpusKind = "hex" | "rgb" | "hsl" | "token" | "keyword";
export type CssColorCorpusRgb = Readonly<{
  red: number;
  green: number;
  blue: number;
}>;
export type CssColorCorpusExpectation =
  | Readonly<{
      kind: "hex" | "rgb" | "hsl";
      normalized: string;
      baseHex: string;
      alpha: number;
      rgb: CssColorCorpusRgb;
    }>
  | Readonly<{
      kind: "token";
      normalized: string;
    }>
  | Readonly<{
      kind: "keyword";
      normalized: "transparent" | "currentColor" | "inherit";
    }>;
export type CssColorCorpusCase = Readonly<{
  id: string;
  input: unknown;
  parser: Readonly<Record<CssColorCorpusProfile, CssColorCorpusExpectation | undefined>>;
  structural: Readonly<Record<CssColorCorpusProfile, boolean>>;
}>;

const profileMap = <Value>(
  authoring: Value,
  inheritedRender: Value
): Readonly<Record<CssColorCorpusProfile, Value>> =>
  Object.freeze({
    authoring,
    "inherited-render": inheritedRender,
  });

const literal = (
  kind: Extract<CssColorCorpusKind, "hex" | "rgb" | "hsl">,
  normalized: string,
  baseHex: string,
  alpha: number,
  red: number,
  green: number,
  blue: number
): CssColorCorpusExpectation =>
  Object.freeze({
    kind,
    normalized,
    baseHex,
    alpha,
    rgb: Object.freeze({ red, green, blue }),
  });

const token = (normalized: string): CssColorCorpusExpectation =>
  Object.freeze({ kind: "token", normalized });

const keyword = (
  normalized: Extract<CssColorCorpusExpectation, { kind: "keyword" }>["normalized"]
): CssColorCorpusExpectation => Object.freeze({ kind: "keyword", normalized });

const corpusCase = (
  id: string,
  input: unknown,
  authoring: CssColorCorpusExpectation | undefined,
  inheritedRender: CssColorCorpusExpectation | undefined,
  authoringStructural: boolean,
  inheritedRenderStructural: boolean
): CssColorCorpusCase =>
  Object.freeze({
    id,
    input,
    parser: profileMap(authoring, inheritedRender),
    structural: profileMap(authoringStructural, inheritedRenderStructural),
  });

const acceptedByBoth = (
  id: string,
  input: string,
  expectation: CssColorCorpusExpectation
): CssColorCorpusCase => corpusCase(id, input, expectation, expectation, true, true);

const acceptedOnlyWhenInherited = (
  id: string,
  input: string,
  expectation: CssColorCorpusExpectation
): CssColorCorpusCase => corpusCase(id, input, undefined, expectation, false, true);

const rejectedByBoth = (id: string, input: unknown): CssColorCorpusCase =>
  corpusCase(id, input, undefined, undefined, false, false);

const structuralFalsePositive = (id: string, input: string): CssColorCorpusCase =>
  corpusCase(id, input, undefined, undefined, true, true);

const paddedTerminal = "transparent";
const paddingLength = CSS_COLOR_VALUE_MAX_LENGTH - paddedTerminal.length;
const leftPadding = " ".repeat(Math.floor(paddingLength / 2));
const rightPadding = " ".repeat(paddingLength - leftPadding.length);
const rawPaddingAtCap = `${leftPadding}${paddedTerminal}${rightPadding}`;
const rawPaddingOverCap = `${rawPaddingAtCap} `;

const canonicalOverflowPrefix = "rgb(0,0,0,.";
const canonicalOverflowSuffix = ")";
const canonicalOverflowDigits = "1".repeat(
  CSS_COLOR_VALUE_MAX_LENGTH - canonicalOverflowPrefix.length - canonicalOverflowSuffix.length
);
const canonicalOutputOverCap = `${canonicalOverflowPrefix}${canonicalOverflowDigits}${canonicalOverflowSuffix}`;

const frozenObjectInput = Object.freeze({});
const frozenArrayInput = Object.freeze([]);

export const CSS_COLOR_CORPUS_CASES: readonly CssColorCorpusCase[] = Object.freeze([
  acceptedByBoth("hex-3-lower", "#abc", literal("hex", "#abc", "#aabbcc", 1, 170, 187, 204)),
  acceptedByBoth(
    "hex-3-mixed-case-padding",
    " #AbC ",
    literal("hex", "#abc", "#aabbcc", 1, 170, 187, 204)
  ),
  acceptedByBoth("hex-4-alpha-zero", "#0000", literal("hex", "#0000", "#000000", 0, 0, 0, 0)),
  acceptedByBoth(
    "hex-4-alpha-mid",
    "#AbCd",
    literal("hex", "#abcd", "#aabbcc", 0.8666666666666667, 170, 187, 204)
  ),
  acceptedByBoth(
    "hex-6-mixed-case",
    "#A1B2C3",
    literal("hex", "#a1b2c3", "#a1b2c3", 1, 161, 178, 195)
  ),
  acceptedByBoth(
    "hex-8-alpha-zero",
    "#11223300",
    literal("hex", "#11223300", "#112233", 0, 17, 34, 51)
  ),
  acceptedByBoth(
    "hex-8-alpha-mid",
    "#11223380",
    literal("hex", "#11223380", "#112233", 0.5019607843137255, 17, 34, 51)
  ),
  acceptedByBoth(
    "hex-8-alpha-one-case",
    "#112233FF",
    literal("hex", "#112233ff", "#112233", 1, 17, 34, 51)
  ),

  acceptedByBoth(
    "rgb-number-zero",
    "rgb(0,0,0)",
    literal("rgb", "rgb(0, 0, 0)", "#000000", 1, 0, 0, 0)
  ),
  acceptedByBoth(
    "rgb-number-round-low",
    "rgb(0,0.49,0.5)",
    literal("rgb", "rgb(0, 0.49, 0.5)", "#000001", 1, 0, 0, 1)
  ),
  acceptedByBoth(
    "rgb-number-round-high",
    "rgb(1,254.5,255)",
    literal("rgb", "rgb(1, 254.5, 255)", "#01ffff", 1, 1, 255, 255)
  ),
  acceptedByBoth(
    "rgb-percent-round-low",
    "rgb(0%,0.1%,49.8%)",
    literal("rgb", "rgb(0%, 0.1%, 49.8%)", "#00007f", 1, 0, 0, 127)
  ),
  acceptedByBoth(
    "rgb-percent-round-high",
    "rgb(50%,99.9%,100%)",
    literal("rgb", "rgb(50%, 99.9%, 100%)", "#80ffff", 1, 0x80, 255, 255)
  ),
  acceptedByBoth(
    "rgb-mixed-number-percent",
    "rgb(255,50%,0.5)",
    literal("rgb", "rgb(255, 50%, 0.5)", "#ff8001", 1, 255, 0x80, 1)
  ),
  acceptedByBoth(
    "rgb-redundant-zeroes-case-spacing",
    " RGB(000.500, 001.000%, 000255, .5000) ",
    literal("rgb", "rgba(0.5, 1%, 255, 0.5)", "#0103ff", 0.5, 1, 3, 255)
  ),
  acceptedByBoth(
    "rgba-three-channel-alias",
    "rgba(1,2,3)",
    literal("rgb", "rgb(1, 2, 3)", "#010203", 1, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgb-four-channel-alias",
    "rgb(1,2,3,.5)",
    literal("rgb", "rgba(1, 2, 3, 0.5)", "#010203", 0.5, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-number-zero",
    "rgba(1,2,3,0)",
    literal("rgb", "rgba(1, 2, 3, 0)", "#010203", 0, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-number-one",
    "rgba(1,2,3,1.000)",
    literal("rgb", "rgba(1, 2, 3, 1)", "#010203", 1, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-percent-zero",
    "rgb(1,2,3,0.0%)",
    literal("rgb", "rgba(1, 2, 3, 0%)", "#010203", 0, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-percent-one",
    "rgba(1,2,3,100.0%)",
    literal("rgb", "rgba(1, 2, 3, 100%)", "#010203", 1, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-leading-dot",
    "RGBA(1,2,3,.5000)",
    literal("rgb", "rgba(1, 2, 3, 0.5)", "#010203", 0.5, 1, 2, 3)
  ),
  acceptedByBoth(
    "rgba-alpha-long-small-decimal",
    "rgba(0,0,0,.00000000000000000000000000000000000001)",
    literal(
      "rgb",
      "rgba(0, 0, 0, 0.00000000000000000000000000000000000001)",
      "#000000",
      1e-38,
      0,
      0,
      0
    )
  ),

  acceptedByBoth(
    "hsl-hue-zero",
    "hsl(0,100%,50%)",
    literal("hsl", "hsl(0, 100%, 50%)", "#ff0000", 1, 255, 0, 0)
  ),
  acceptedByBoth(
    "hsl-hue-one",
    "hsl(1,100%,50%)",
    literal("hsl", "hsl(1, 100%, 50%)", "#ff0400", 1, 255, 4, 0)
  ),
  acceptedByBoth(
    "hsl-hue-359-9",
    "hsl(359.9,100%,50%)",
    literal("hsl", "hsl(359.9, 100%, 50%)", "#ff0000", 1, 255, 0, 0)
  ),
  acceptedByBoth(
    "hsl-hue-full-turn-deg",
    "HSL(360DEG,100%,50%)",
    literal("hsl", "hsl(360, 100%, 50%)", "#ff0000", 1, 255, 0, 0)
  ),
  acceptedByBoth(
    "hsl-secondary-yellow",
    "hsl(60,100%,50%)",
    literal("hsl", "hsl(60, 100%, 50%)", "#ffff00", 1, 255, 255, 0)
  ),
  acceptedByBoth(
    "hsl-primary-green",
    "hsl(120,100%,50%)",
    literal("hsl", "hsl(120, 100%, 50%)", "#00ff00", 1, 0, 255, 0)
  ),
  acceptedByBoth(
    "hsl-secondary-cyan",
    "hsl(180,100%,50%)",
    literal("hsl", "hsl(180, 100%, 50%)", "#00ffff", 1, 0, 255, 255)
  ),
  acceptedByBoth(
    "hsl-primary-blue",
    "hsl(240,100%,50%)",
    literal("hsl", "hsl(240, 100%, 50%)", "#0000ff", 1, 0, 0, 255)
  ),
  acceptedByBoth(
    "hsl-secondary-magenta",
    "hsl(300,100%,50%)",
    literal("hsl", "hsl(300, 100%, 50%)", "#ff00ff", 1, 255, 0, 255)
  ),
  acceptedByBoth(
    "hsl-saturation-zero",
    "hsl(0,0%,50%)",
    literal("hsl", "hsl(0, 0%, 50%)", "#808080", 1, 0x80, 0x80, 0x80)
  ),
  acceptedByBoth(
    "hsl-lightness-zero",
    "hsl(210,100%,0%)",
    literal("hsl", "hsl(210, 100%, 0%)", "#000000", 1, 0, 0, 0)
  ),
  acceptedByBoth(
    "hsl-lightness-one-hundred",
    "hsl(210,100%,100%)",
    literal("hsl", "hsl(210, 100%, 100%)", "#ffffff", 1, 255, 255, 255)
  ),
  acceptedByBoth(
    "hsl-deg-case-and-reference",
    " HSL(210DEG,50%,40%) ",
    literal("hsl", "hsl(210, 50%, 40%)", "#336699", 1, 51, 102, 153)
  ),
  acceptedByBoth(
    "hsl-fractional-reference",
    "HSLA(210.500DEG,063.250%,042.750%,.5000)",
    literal("hsl", "hsla(210.5, 63.25%, 42.75%, 0.5)", "#286cb2", 0.5, 40, 108, 178)
  ),
  acceptedByBoth(
    "hsla-three-channel-alias",
    "hsla(210,50%,40%)",
    literal("hsl", "hsl(210, 50%, 40%)", "#336699", 1, 51, 102, 153)
  ),
  acceptedByBoth(
    "hsl-four-channel-alias",
    "hsl(210,50%,40%,25%)",
    literal("hsl", "hsla(210, 50%, 40%, 25%)", "#336699", 0.25, 51, 102, 153)
  ),
  acceptedByBoth(
    "hsla-redundant-zeroes",
    "HSLA(000.000DEG,100.000%,50.000%,.5000)",
    literal("hsl", "hsla(0, 100%, 50%, 0.5)", "#ff0000", 0.5, 255, 0, 0)
  ),

  acceptedByBoth("token-basic", "var(--color-accent)", token("var(--color-accent)")),
  acceptedByBoth(
    "token-function-case-padding",
    " VAR(  --color-accent-2  ) ",
    token("var(--color-accent-2)")
  ),
  acceptedByBoth(
    "token-lowercase-digits-hyphens",
    "var(--color-0-a--b-)",
    token("var(--color-0-a--b-)")
  ),
  acceptedByBoth("keyword-transparent-case", " TrAnSpArEnT ", keyword("transparent")),
  acceptedOnlyWhenInherited(
    "keyword-current-color-profile",
    "CURRENTCOLOR",
    keyword("currentColor")
  ),
  acceptedOnlyWhenInherited("keyword-inherit-profile", " InHeRiT ", keyword("inherit")),
  acceptedByBoth("raw-padding-at-cap", rawPaddingAtCap, keyword("transparent")),

  structuralFalsePositive("rgb-number-over-maximum", "rgb(256,0,0)"),
  structuralFalsePositive("rgb-number-precision-over-maximum", "rgb(255.000000000000000001,0,0)"),
  structuralFalsePositive("rgb-percent-over-maximum", "rgb(100.1%,0%,0%)"),
  structuralFalsePositive(
    "rgb-percent-precision-over-maximum",
    "rgb(100.000000000000000001%,0%,0%)"
  ),
  structuralFalsePositive("rgba-alpha-number-over-maximum", "rgba(0,0,0,1.1)"),
  structuralFalsePositive(
    "rgba-alpha-number-precision-over-maximum",
    "rgba(0,0,0,1.000000000000000001)"
  ),
  structuralFalsePositive("rgba-alpha-percent-over-maximum", "rgba(0,0,0,100.1%)"),
  structuralFalsePositive(
    "rgba-alpha-percent-precision-over-maximum",
    "rgba(0,0,0,100.000000000000000001%)"
  ),
  structuralFalsePositive("hsl-hue-over-maximum", "hsl(360.1,50%,50%)"),
  structuralFalsePositive("hsl-hue-precision-over-maximum", "hsl(360.000000000000000001,50%,50%)"),
  structuralFalsePositive("hsl-saturation-over-maximum", "hsl(0,100.1%,50%)"),
  structuralFalsePositive("hsl-lightness-over-maximum", "hsl(0,50%,100.1%)"),
  structuralFalsePositive("hsla-alpha-over-maximum", "hsla(0,50%,50%,2)"),
  structuralFalsePositive("raw-padding-over-cap", rawPaddingOverCap),
  structuralFalsePositive("canonical-output-over-cap", canonicalOutputOverCap),

  rejectedByBoth("non-string-undefined", undefined),
  rejectedByBoth("non-string-null", null),
  rejectedByBoth("non-string-number", 0),
  rejectedByBoth("non-string-nan", Number.NaN),
  rejectedByBoth("non-string-boolean", true),
  rejectedByBoth("non-string-object", frozenObjectInput),
  rejectedByBoth("non-string-array", frozenArrayInput),
  rejectedByBoth("empty-string", ""),
  rejectedByBoth("ascii-space-only", "   "),
  rejectedByBoth("hex-too-short", "#12"),
  rejectedByBoth("hex-length-five", "#12345"),
  rejectedByBoth("hex-length-seven", "#1234567"),
  rejectedByBoth("hex-invalid-character", "#ggg"),
  rejectedByBoth("rgb-channel-negative", "rgb(-1,0,0)"),
  rejectedByBoth("rgb-channel-positive-sign", "rgb(+1,0,0)"),
  rejectedByBoth("rgb-channel-exponent", "rgb(1e2,0,0)"),
  rejectedByBoth("rgb-channel-trailing-dot", "rgb(1.,0,0)"),
  rejectedByBoth("rgb-channel-leading-dot", "rgb(.5,0,0)"),
  rejectedByBoth("rgb-channel-hex-number", "rgb(0x10,0,0)"),
  rejectedByBoth("rgba-alpha-negative", "rgba(0,0,0,-.5)"),
  rejectedByBoth("rgba-alpha-positive-sign", "rgba(0,0,0,+.5)"),
  rejectedByBoth("rgba-alpha-trailing-dot", "rgba(0,0,0,1.)"),
  rejectedByBoth("rgba-alpha-exponent", "rgba(0,0,0,1e-1)"),
  rejectedByBoth("rgba-alpha-nan", "rgba(0,0,0,NaN)"),
  rejectedByBoth("rgba-alpha-infinity", "rgba(0,0,0,Infinity)"),
  rejectedByBoth("hsl-hue-negative", "hsl(-1,50%,50%)"),
  rejectedByBoth("hsl-hue-split-deg", "hsl(1 DEG,50%,50%)"),
  rejectedByBoth("hsl-hue-percent", "hsl(1%,50%,50%)"),
  rejectedByBoth("hsl-hue-radian", "hsl(1rad,50%,50%)"),
  rejectedByBoth("hsl-saturation-negative", "hsl(0,-1%,50%)"),
  rejectedByBoth("hsl-lightness-negative", "hsl(0,50%,-1%)"),
  rejectedByBoth("function-name-space", "rgb (1,2,3)"),
  rejectedByBoth("rgb-missing-commas", "rgb(1 2 3)"),
  rejectedByBoth("rgb-too-few-channels", "rgb(1,2)"),
  rejectedByBoth("rgb-too-many-channels", "rgb(1,2,3,4,5)"),
  rejectedByBoth("rgb-empty-alpha", "rgb(1,2,3,)"),
  rejectedByBoth("rgb-semicolon-separators", "rgb(1;2;3)"),
  rejectedByBoth("rgb-modern-slash-syntax", "rgb(1 2 3 / .5)"),
  rejectedByBoth("hsl-missing-percent", "hsl(0,50,50%)"),
  rejectedByBoth("leading-tab", "\t#fff"),
  rejectedByBoth("trailing-newline", "#fff\n"),
  rejectedByBoth("internal-tab", "rgb(1,\t2,3)"),
  rejectedByBoth("control-null", "\u0000#fff"),
  rejectedByBoth("control-unit-separator", "\u001f#fff"),
  rejectedByBoth("control-delete", "\u007f#fff"),
  rejectedByBoth("control-c1-next-line", "\u0085#fff"),
  rejectedByBoth("non-ascii-nbsp", "\u00a0#fff"),
  rejectedByBoth("non-ascii-em-space", "\u2003#fff"),
  rejectedByBoth("comment-prefix", "/*x*/#fff"),
  rejectedByBoth("rule-declaration-fragment", "#fff; color:red"),
  rejectedByBoth("rule-block-fragment", "#fff}body{color:red}"),
  rejectedByBoth("single-quoted-fragment", "'#fff'"),
  rejectedByBoth("double-quoted-fragment", '"#fff"'),
  rejectedByBoth("template-fragment", "`#fff`"),
  rejectedByBoth("escaped-fragment", "\\#fff"),
  rejectedByBoth("bracket-fragment", "[#fff]"),
  rejectedByBoth("angle-fragment", "<#fff>"),
  rejectedByBoth("token-uppercase-name", "var(--color-Accent)"),
  rejectedByBoth("token-underscore-name", "var(--color_accent)"),
  rejectedByBoth("token-empty-name", "var(--color-)"),
  rejectedByBoth("token-fallback", "var(--color-accent, #fff)"),
  rejectedByBoth("token-nested", "var(var(--color-accent))"),
  rejectedByBoth("token-arbitrary-name", "var(--surface)"),
  rejectedByBoth("named-color-red", "red"),
  rejectedByBoth("named-color-rebeccapurple", "rebeccapurple"),
  rejectedByBoth("unlisted-color-mix", "color-mix(in srgb, #fff, #000)"),
  rejectedByBoth("unlisted-lab", "lab(50% 0 0)"),
  rejectedByBoth("unlisted-calc", "calc(1)"),
  rejectedByBoth("unlisted-env", "env(color)"),
  rejectedByBoth("unlisted-url", "url(x)"),
  rejectedByBoth("unlisted-gradient", "linear-gradient(#fff, #000)"),
]);

export const CSS_COLOR_STRUCTURAL_FALSE_POSITIVE_IDS: readonly string[] = Object.freeze([
  "rgb-number-over-maximum",
  "rgb-number-precision-over-maximum",
  "rgb-percent-over-maximum",
  "rgb-percent-precision-over-maximum",
  "rgba-alpha-number-over-maximum",
  "rgba-alpha-number-precision-over-maximum",
  "rgba-alpha-percent-over-maximum",
  "rgba-alpha-percent-precision-over-maximum",
  "hsl-hue-over-maximum",
  "hsl-hue-precision-over-maximum",
  "hsl-saturation-over-maximum",
  "hsl-lightness-over-maximum",
  "hsla-alpha-over-maximum",
  "raw-padding-over-cap",
  "canonical-output-over-cap",
]);
