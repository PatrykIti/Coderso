// TASK-539-02-L02: immutable security corpus proving the Page authoring grid and
// background sanitizers fail closed against adversarial input.
//
// Additive suite only. It never edits the L01-owned sanitizer source or its
// compatibility suite; it re-proves the same contracts from a frozen, explicit
// adversarial corpus: raw C0/C1 + non-ASCII whitespace guards at every placement,
// tripwire/imbalance/overflow, unsafe URLs/protocols, deep nesting, over-cap
// layers, byte-identity of accepted image/color values, and full TASK-541 raw
// parity through both Page color adapters and the embedded final-color path.
import { expect, test } from "vitest";

import {
  PAGE_BG_MAX_LAYERS,
  PAGE_CSS_VALUE_MAX_LENGTH,
  authoringColorTokenNames,
  isSafeAuthoringCssBackgroundLayers,
  isSafeAuthoringCssColor,
  isSafeAuthoringCssGradient,
  parseAuthoringCssBackgroundPaint,
  sanitizeAuthoringCssBackground,
  sanitizeAuthoringCssColor,
  sanitizeAuthoringGridTemplate,
} from "../../../core/services/pages/pageAuthoringSanitizers";
import {
  CSS_COLOR_VALUE_MAX_LENGTH,
  parseCssColorValue,
} from "../../../core/services/theme/cssColorContract";
import { CSS_COLOR_CORPUS_CASES } from "../services/cssColorCorpus";

const oneGradient = "linear-gradient(90deg,#000,#fff)";

// ── Immutable raw code-point guard tables ────────────────────────────────────
// The sanitizers reject the FULL C0 block (U+0000..U+001F — every control,
// including TAB/LF/CR which are also ECMAScript whitespace), the FULL C1 block
// (U+007F DEL .. U+009F), and every Unicode/ECMAScript whitespace code point
// other than ASCII space U+0020 (Zs: U+00A0, U+1680, U+2000..U+200A, U+202F,
// U+205F, U+3000; Zl: U+2028; Zp: U+2029), plus U+FEFF BOM explicitly (it is
// NOT covered by Unicode `White_Space`). ASCII space is the only legal
// whitespace and canonicalizes deterministically.
const C0_CONTROL_CODE_POINTS: readonly number[] = Object.freeze(
  Array.from({ length: 0x20 }, (_, index) => index)
);
const C1_CONTROL_CODE_POINTS: readonly number[] = Object.freeze(
  Array.from({ length: 0x21 }, (_, index) => index + 0x7f)
);
const NON_ASCII_WHITESPACE_CODE_POINTS: readonly number[] = Object.freeze([
  0x00a0, 0x1680, 0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009,
  0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff,
]);
const FORBIDDEN_RAW_CODE_POINTS: readonly number[] = Object.freeze([
  ...C0_CONTROL_CODE_POINTS,
  ...C1_CONTROL_CODE_POINTS,
  ...NON_ASCII_WHITESPACE_CODE_POINTS,
]);
const FORBIDDEN_RAW_STRINGS: readonly string[] = Object.freeze(
  FORBIDDEN_RAW_CODE_POINTS.map((codePoint) => String.fromCodePoint(codePoint))
);

// ── TASK-539-02-L02 grid matrix ──────────────────────────────────────────────
// Accept exact zero spellings, unitful zero, leading-dot/unitful lengths, auto,
// every allowed unit, minmax with zero/unitful positions, bounded repeat, and the
// 1/12 outer-track and repeat-count boundaries. Canonical column = deterministic
// normalized bytes; every canonical value must survive a second pass unchanged.
const GRID_ACCEPT: ReadonlyArray<readonly [input: string, canonical: string]> = Object.freeze([
  // Exact zero spellings (zero-only unitless).
  ["0", "0"],
  ["00", "00"], // all-zero integer spelling (grammar accepts; pinned as behavior)
  ["0.0", "0.0"],
  ["0.000", "0.000"],
  [".0", ".0"],
  [".000", ".000"],
  // Unitful zero.
  ["0px", "0px"],
  ["0.0px", "0.0px"],
  ["0fr", "0fr"],
  ["0rem", "0rem"],
  ["0em", "0em"],
  ["0%", "0%"],
  // Leading-dot / unitful nonzero lengths and every allowed unit.
  [".85fr", ".85fr"],
  ["1.15fr", "1.15fr"],
  ["1.0fr", "1.0fr"],
  ["50%", "50%"],
  ["1rem", "1rem"],
  ["1em", "1em"],
  ["1px", "1px"],
  ["2fr", "2fr"],
  // auto and mixed bare tracks.
  ["auto", "auto"],
  ["auto 1fr", "auto 1fr"],
  ["0 1fr", "0 1fr"],
  ["auto 1fr 2fr", "auto 1fr 2fr"],
  // minmax with zero/unitful positions (both argument slots).
  ["minmax(0,1fr)", "minmax(0,1fr)"],
  ["minmax(0.0,1fr)", "minmax(0.0,1fr)"],
  ["minmax(.0,1fr)", "minmax(.0,1fr)"],
  ["minmax(0px,1fr)", "minmax(0px,1fr)"],
  ["minmax(1fr,0px)", "minmax(1fr,0px)"],
  ["minmax(0.0px,1fr)", "minmax(0.0px,1fr)"],
  ["minmax(0%,1fr)", "minmax(0%,1fr)"],
  ["minmax(1fr,0rem)", "minmax(1fr,0rem)"],
  ["minmax(auto,1fr)", "minmax(auto,1fr)"],
  ["minmax(1fr,2fr)", "minmax(1fr,2fr)"],
  // Bounded repeat: 1/12 repeat-count boundaries and zero/auto inner tracks.
  ["repeat(1,1fr)", "repeat(1,1fr)"],
  ["repeat(12,1fr)", "repeat(12,1fr)"],
  ["repeat(1,0)", "repeat(1,0)"],
  ["repeat(12,0)", "repeat(12,0)"],
  ["repeat(3,0.0)", "repeat(3,0.0)"],
  ["repeat(3,0px)", "repeat(3,0px)"],
  ["repeat(3,0fr)", "repeat(3,0fr)"],
  ["repeat(2,0.0%)", "repeat(2,0.0%)"],
  ["repeat(3,auto)", "repeat(3,auto)"],
  ["repeat(12,auto)", "repeat(12,auto)"],
  // 1/12 outer-track boundaries.
  ["1fr", "1fr"],
  [
    "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
    "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
  ],
  // Canonical top-level/function whitespace (canonical second-pass output).
  ["minmax(0, 1fr)", "minmax(0,1fr)"],
  ["repeat(3, 1fr)", "repeat(3,1fr)"],
  ["minmax(0, 1fr) minmax(420px, .9fr)", "minmax(0,1fr) minmax(420px,.9fr)"],
  ["minmax(0, 1fr) repeat(3, 1fr)", "minmax(0,1fr) repeat(3,1fr)"],
  ["  0  1fr ", "0 1fr"],
  ["  1.15fr    .85fr  ", "1.15fr .85fr"],
]);

// Reject: nonzero unitless everywhere, negatives, bare units, unsupported and
// case-changed units, zero-like malformed values, 0/13 repeat, 13 tracks, nested
// and unbalanced functions, multiple repeat body tracks, metacharacters,
// URL/expression, and oversized input. Controls and non-ASCII whitespace are
// table-driven separately below (raw guard), so every reject here is a grammar
// reject on an otherwise ASCII-space value.
const GRID_REJECT: ReadonlyArray<string> = Object.freeze([
  // Nonzero unitless in standalone, either minmax argument, and repeat body.
  "5",
  "1.5",
  "0.5",
  "5 1fr",
  "1fr 5",
  "minmax(5,1fr)",
  "minmax(1fr,5)",
  "minmax(1fr,0.5)",
  "repeat(3,2)",
  "repeat(3,0.5)",
  "repeat(2,1.5)",
  // Negatives (including -0).
  "-1fr",
  "-5",
  "-0",
  "minmax(-1fr,1fr)",
  "repeat(2,-1fr)",
  // Bare units.
  "px",
  "fr",
  "rem",
  "em",
  "%",
  "px 1fr",
  // Unsupported units.
  "1vw",
  "1vh",
  "1ch",
  "1s",
  "1deg",
  "1cm",
  "1in",
  // Case-changed units / function names / keywords.
  "1FR",
  "1PX",
  "1REM",
  "MINMAX(0,1fr)",
  "REPEAT(3,1fr)",
  "AUTO",
  "Auto",
  // Zero-like malformed values.
  "0.",
  ".",
  "+0",
  "0e0",
  "0x0",
  "1.",
  "1.5e1",
  // 0 / 13 repeat and 13 tracks.
  "repeat(0,1fr)",
  "repeat(13,1fr)",
  "repeat(99,1fr)",
  "1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr",
  // Nested / unbalanced functions.
  "repeat(3,minmax(0,1fr))",
  "minmax(minmax(0,1fr),1fr)",
  "minmax(0,minmax(1fr,2fr))",
  "minmax(0,1fr",
  "minmax(0,1fr))",
  "(1fr)",
  "1fr)",
  // Multiple repeat body tracks.
  "repeat(3,1fr 2fr)",
  "repeat(3,1fr 1fr)",
  "repeat(3,1fr,2fr)",
  // Metacharacters / rule / style-tag breakout categories.
  "1fr;}body{display:none",
  "1fr}",
  "1fr;",
  "1fr /* x */ 1fr",
  "1fr @import",
  "1fr `x`",
  "1fr\\2f 1fr",
  "<b>",
  "1fr:2fr",
  "1fr/2fr",
  // URL / expression.
  "url(evil)",
  "expression(alert(1))",
  // Oversized input.
  "a".repeat(201),
  "1fr ".repeat(100),
]);

// Raw guard placements: leading/trailing edges (trim would erase these), between
// tracks, function interior, and comma-adjacent inside a function. Every
// forbidden code point must reject in every placement BEFORE .trim() or top-level
// tokenization; ASCII space alone remains legal and canonicalizes.
const GRID_GUARD_PLACEMENTS: ReadonlyArray<
  readonly [label: string, place: (cp: string) => string]
> = Object.freeze([
  ["leading edge", (cp) => `${cp}1fr 1fr`],
  ["trailing edge", (cp) => `1fr 1fr${cp}`],
  ["between tracks", (cp) => `1fr${cp}1fr`],
  ["function interior", (cp) => `minmax(0,${cp}1fr)`],
  ["comma-adjacent inside function", (cp) => `minmax(0${cp},1fr)`],
]);

test("TASK-539-02-L02: grid accepts zero-only unitful grammar at every boundary and is second-pass deterministic", () => {
  for (const [input, canonical] of GRID_ACCEPT) {
    expect(sanitizeAuthoringGridTemplate(input), JSON.stringify(input)).toBe(canonical);
    // Deterministic second pass: the canonical output must be stable.
    expect(sanitizeAuthoringGridTemplate(canonical), `second pass ${canonical}`).toBe(canonical);
  }
});

test("TASK-539-02-L02: grid rejects every out-of-grammar adversarial category fail closed", () => {
  for (const value of GRID_REJECT) {
    expect(sanitizeAuthoringGridTemplate(value), JSON.stringify(value)).toBeNull();
  }
});

test("TASK-539-02-L02: grid raw guard rejects every C0/C1 and non-ASCII whitespace code point at every placement", () => {
  for (const codePoint of FORBIDDEN_RAW_STRINGS) {
    for (const [label, place] of GRID_GUARD_PLACEMENTS) {
      expect(
        sanitizeAuthoringGridTemplate(place(codePoint)),
        `grid ${label} ${JSON.stringify(codePoint)}`
      ).toBeNull();
    }
  }
  // ASCII space alone is legal and canonicalizes deterministically.
  expect(sanitizeAuthoringGridTemplate(" 1fr 1fr ")).toBe("1fr 1fr");
  expect(sanitizeAuthoringGridTemplate("minmax(0, 1fr)")).toBe("minmax(0,1fr)");
  expect(sanitizeAuthoringGridTemplate("1fr 1fr")).toBe("1fr 1fr");
  expect(sanitizeAuthoringGridTemplate("minmax(0,1fr) 1fr")).toBe("minmax(0,1fr) 1fr");
});

// ── TASK-539-02-L02 background / image-byte matrix ───────────────────────────
type BackgroundFixture = Readonly<{
  input: string;
  paint: Readonly<{ image: string | null; color: string | null }>;
  sanitized: string;
}>;

// Exact {image,color} values, derived per fixture. `image` is the exact
// outer-trimmed source substring spanning the validated gradient layers
// (original spelling, inner whitespace, and top-level separators are preserved
// byte-for-byte); `color` is TASK-541 canonical output. `sanitized` pins
// image-only bytes, canonical color-only bytes, or image + the one canonical
// `, ` delimiter + color.
const BACKGROUND_ACCEPT: ReadonlyArray<BackgroundFixture> = Object.freeze([
  // Color-only (canonical color bytes, including noncanonical spellings).
  { input: "#0d9488", paint: { image: null, color: "#0d9488" }, sanitized: "#0d9488" },
  { input: "#0D9488", paint: { image: null, color: "#0d9488" }, sanitized: "#0d9488" },
  {
    input: "rgba(0,0,0,.5)",
    paint: { image: null, color: "rgba(0, 0, 0, 0.5)" },
    sanitized: "rgba(0, 0, 0, 0.5)",
  },
  {
    input: "var(--color-primary)",
    paint: { image: null, color: "var(--color-primary)" },
    sanitized: "var(--color-primary)",
  },
  { input: "transparent", paint: { image: null, color: "transparent" }, sanitized: "transparent" },
  // One gradient (exact image-only bytes, original spelling).
  { input: oneGradient, paint: { image: oneGradient, color: null }, sanitized: oneGradient },
  {
    input: "linear-gradient( 90deg , #000 , #fff )",
    paint: { image: "linear-gradient( 90deg , #000 , #fff )", color: null },
    sanitized: "linear-gradient( 90deg , #000 , #fff )",
  },
  {
    input: "LINEAR-GRADIENT(90deg,#000,#fff)",
    paint: { image: "LINEAR-GRADIENT(90deg,#000,#fff)", color: null },
    sanitized: "LINEAR-GRADIENT(90deg,#000,#fff)",
  },
  // Irregular multi-gradient stack: image spans exact top-level separators.
  {
    input:
      "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)",
    paint: {
      image:
        "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)",
      color: null,
    },
    sanitized:
      "radial-gradient(circle at 82% 10%, rgba(142,232,255,.35), transparent 60%), linear-gradient(145deg,#0f1720,#1b2733)",
  },
  {
    input:
      "radial-gradient(circle, #8ee8ff, transparent 70%),linear-gradient(180deg,#eaf3ff,#dfe9ff)",
    paint: {
      image:
        "radial-gradient(circle, #8ee8ff, transparent 70%),linear-gradient(180deg,#eaf3ff,#dfe9ff)",
      color: null,
    },
    sanitized:
      "radial-gradient(circle, #8ee8ff, transparent 70%),linear-gradient(180deg,#eaf3ff,#dfe9ff)",
  },
  // Gradients plus one final color: image is byte-identical across color spellings.
  {
    input: `${oneGradient}, #fff`,
    paint: { image: oneGradient, color: "#fff" },
    sanitized: `${oneGradient}, #fff`,
  },
  {
    input: `${oneGradient}, #FFFFFF`,
    paint: { image: oneGradient, color: "#ffffff" },
    sanitized: `${oneGradient}, #ffffff`,
  },
  {
    input: `${oneGradient}, rgba(255,255,255,1)`,
    paint: { image: oneGradient, color: "rgba(255, 255, 255, 1)" },
    sanitized: `${oneGradient}, rgba(255, 255, 255, 1)`,
  },
  {
    input: `${oneGradient}, var(--color-primary)`,
    paint: { image: oneGradient, color: "var(--color-primary)" },
    sanitized: `${oneGradient}, var(--color-primary)`,
  },
  // Outer ASCII spaces are excluded from image; inner gradient spacing preserved.
  { input: ` ${oneGradient} `, paint: { image: oneGradient, color: null }, sanitized: oneGradient },
  {
    input: `${oneGradient}, #fff `,
    paint: { image: oneGradient, color: "#fff" },
    sanitized: `${oneGradient}, #fff`,
  },
]);

const BACKGROUND_REJECT: ReadonlyArray<string> = Object.freeze([
  // Color before / between gradients and multiple colors.
  "#000, linear-gradient(90deg,#000,#fff)",
  "linear-gradient(90deg,#000,#fff), #fff, radial-gradient(circle,#000,#fff)",
  "#000, #fff",
  "var(--color-primary), linear-gradient(90deg,#000,#fff)",
  "transparent, linear-gradient(90deg,#000,#fff)",
  // Empty layers / lone separators.
  ",",
  ", ",
  " ",
  `${oneGradient}, , ${oneGradient}`,
  `${oneGradient},,`,
  // Imbalance (unclosed / unmatched / stray parens).
  "linear-gradient(90deg,#000,#fff",
  "radial-gradient(circle,#000,#fff)), linear-gradient(90deg,#000,#fff)",
  `${oneGradient})`,
  `(${oneGradient}`,
  // Non-gradient image / fetch functions (whole-value tripwire).
  "url(//evil/x)",
  'image-set("//evil/x" 1x), linear-gradient(90deg,#000,#fff)',
  "element(#foo), linear-gradient(90deg,#000,#fff)",
  "cross-fade(url(//evil/a), url(//evil/b)), linear-gradient(90deg,#000,#fff)",
  "image(//evil/x), linear-gradient(90deg,#000,#fff)",
  "url(https://cdn.example.com/a.png), linear-gradient(90deg,#000,#fff)",
  // Unsafe protocols / at-rules / functions (whole-value tripwire).
  "javascript:alert(1), linear-gradient(90deg,#000,#fff)",
  "linear-gradient(90deg,#000,#fff), data:text/html,<script>",
  "vbscript:msgbox(1), linear-gradient(90deg,#000,#fff)",
  "@import url(evil); linear-gradient(90deg,#000,#fff)",
  "linear-gradient(90deg,#000,#fff), expression(alert(1))",
  "linear-gradient(90deg,#000,#fff), behavior:url(#default#foo)",
  "-moz-binding:url(//evil/x), linear-gradient(90deg,#000,#fff)",
  // Rule / style-tag breakout categories.
  `${oneGradient}</style>`,
  `${oneGradient}<script>alert(1)</script>`,
  `${oneGradient}}`,
  `${oneGradient};`,
  `${oneGradient}{color:red}`,
  // A layer that is neither a safe gradient nor a safe color.
  "12 34, linear-gradient(90deg,#000,#fff)",
  "foo, linear-gradient(90deg,#000,#fff)",
  // Non-Page token as the final color (the seven-token filter applies to the split).
  `${oneGradient}, var(--color-danger)`,
  // Whole-value overflow (untouched length > PAGE_CSS_VALUE_MAX_LENGTH).
  `${oneGradient}${" ".repeat(PAGE_CSS_VALUE_MAX_LENGTH)}`,
]);

// Raw whole-value guard placements: leading/trailing edges, a top-level
// separator, a gradient interior, and a final color slice.
const BACKGROUND_GUARD_PLACEMENTS: ReadonlyArray<
  readonly [label: string, place: (cp: string) => string]
> = Object.freeze([
  ["leading edge", (cp) => `${cp}${oneGradient}`],
  ["trailing edge", (cp) => `${oneGradient}${cp}`],
  ["top-level separator", (cp) => `${oneGradient},${cp}#fff`],
  ["gradient interior", (cp) => `linear-gradient(90deg,${cp}#000,#fff)`],
  ["final color slice", (cp) => `${oneGradient}, ${cp}#fff`],
]);

test("TASK-539-02-L02: background parser and sanitizer return exact image/color bytes", () => {
  for (const fixture of BACKGROUND_ACCEPT) {
    expect(parseAuthoringCssBackgroundPaint(fixture.input), fixture.input).toEqual(fixture.paint);
    expect(sanitizeAuthoringCssBackground(fixture.input), fixture.input).toBe(fixture.sanitized);
    // Sanitized output is deterministic on a second pass.
    expect(sanitizeAuthoringCssBackground(fixture.sanitized), `second pass ${fixture.input}`).toBe(
      fixture.sanitized
    );
  }
});

test("TASK-539-02-L02: background rejects colors before/between, images, tripwires, imbalance, empty/over-cap layers, overflow", () => {
  for (const value of BACKGROUND_REJECT) {
    expect(sanitizeAuthoringCssBackground(value), `sanitize ${JSON.stringify(value)}`).toBeNull();
    expect(parseAuthoringCssBackgroundPaint(value), `parse ${JSON.stringify(value)}`).toBeNull();
    expect(isSafeAuthoringCssBackgroundLayers(value), `layers ${JSON.stringify(value)}`).toBe(
      false
    );
  }
  // Non-string input fails closed through every boundary.
  expect(parseAuthoringCssBackgroundPaint(12 as unknown)).toBeNull();
  expect(sanitizeAuthoringCssBackground(12 as unknown)).toBeNull();
  expect(sanitizeAuthoringCssBackground(null as unknown)).toBeNull();
  // The predicate is string-typed; the cast keeps the non-string runtime value raw.
  expect(isSafeAuthoringCssBackgroundLayers(42 as unknown as string)).toBe(false);
});

test("TASK-539-02-L02: background raw guard rejects every C0/C1 and non-ASCII whitespace code point before normalization", () => {
  for (const codePoint of FORBIDDEN_RAW_STRINGS) {
    for (const [label, place] of BACKGROUND_GUARD_PLACEMENTS) {
      expect(
        sanitizeAuthoringCssBackground(place(codePoint)),
        `sanitize ${label} ${JSON.stringify(codePoint)}`
      ).toBeNull();
      expect(
        parseAuthoringCssBackgroundPaint(place(codePoint)),
        `parse ${label} ${JSON.stringify(codePoint)}`
      ).toBeNull();
    }
  }
  // ASCII space alone remains legal everywhere and canonicalizes deterministically.
  expect(sanitizeAuthoringCssBackground(` ${oneGradient} `)).toBe(oneGradient);
  expect(sanitizeAuthoringCssBackground(`${oneGradient}, #fff`)).toBe(`${oneGradient}, #fff`);
});

test("TASK-539-02-L02: parser and legacy predicate delegate to one analysis (historical cardinality)", () => {
  const oneColor = "#0d9488";
  // The structured parser accepts one legal color and one legal gradient...
  expect(parseAuthoringCssBackgroundPaint(oneColor)).toEqual({ image: null, color: oneColor });
  expect(parseAuthoringCssBackgroundPaint(oneGradient)).toEqual({
    image: oneGradient,
    color: null,
  });
  expect(sanitizeAuthoringCssBackground(oneColor)).toBe(oneColor);
  expect(sanitizeAuthoringCssBackground(oneGradient)).toBe(oneGradient);
  // ...while the legacy predicate is false for either single-layer form.
  expect(isSafeAuthoringCssBackgroundLayers(oneColor)).toBe(false);
  expect(isSafeAuthoringCssBackgroundLayers(oneGradient)).toBe(false);
  // Valid 2..PAGE_BG_MAX_LAYERS gradient/final-color stacks are true.
  for (let layers = 2; layers <= PAGE_BG_MAX_LAYERS; layers += 1) {
    const stack = Array.from({ length: layers }, () => oneGradient).join(", ");
    expect(isSafeAuthoringCssBackgroundLayers(stack), `${layers} layers`).toBe(true);
    expect(parseAuthoringCssBackgroundPaint(stack)).not.toBeNull();
  }
  expect(isSafeAuthoringCssBackgroundLayers(`${oneGradient}, #fff`)).toBe(true);
  // Invalid input and a stack above the cap are false.
  const overCap = Array.from({ length: PAGE_BG_MAX_LAYERS + 1 }, () => oneGradient).join(", ");
  expect(isSafeAuthoringCssBackgroundLayers(overCap)).toBe(false);
  expect(parseAuthoringCssBackgroundPaint(overCap)).toBeNull();
  expect(sanitizeAuthoringCssBackground(overCap)).toBeNull();
  for (const invalid of ["url(x)", "", ",", "12 34", "#000, #fff"]) {
    expect(isSafeAuthoringCssBackgroundLayers(invalid), JSON.stringify(invalid)).toBe(false);
  }
});

test("TASK-539-02-L02: fixtures are deeply frozen and parsers never mutate inputs", () => {
  const frozenObject = Object.freeze({ value: oneGradient });
  expect(parseAuthoringCssBackgroundPaint(frozenObject)).toBeNull();
  expect(sanitizeAuthoringCssColor(frozenObject)).toBeNull();
  expect(Object.isFrozen(frozenObject)).toBe(true);
  expect(frozenObject).toEqual({ value: oneGradient });

  const frozenArray = Object.freeze([oneGradient]);
  expect(parseAuthoringCssBackgroundPaint(frozenArray)).toBeNull();
  expect(Object.isFrozen(frozenArray)).toBe(true);
  expect(frozenArray).toEqual([oneGradient]);

  // Repeated calls are deterministic and never mutate a shared accepted input.
  expect(parseAuthoringCssBackgroundPaint(oneGradient)).toEqual({
    image: oneGradient,
    color: null,
  });
  expect(parseAuthoringCssBackgroundPaint(oneGradient)).toEqual({
    image: oneGradient,
    color: null,
  });
  expect(sanitizeAuthoringCssBackground(oneGradient)).toBe(oneGradient);
  expect(oneGradient).toBe("linear-gradient(90deg,#000,#fff)");

  // The corpus tables themselves are frozen.
  expect(Object.isFrozen(GRID_ACCEPT)).toBe(true);
  expect(Object.isFrozen(GRID_REJECT)).toBe(true);
  expect(Object.isFrozen(BACKGROUND_ACCEPT)).toBe(true);
  expect(Object.isFrozen(BACKGROUND_REJECT)).toBe(true);
  expect(Object.isFrozen(FORBIDDEN_RAW_CODE_POINTS)).toBe(true);
});

// ── TASK-539-02-L02 TASK-541 raw-input parity ────────────────────────────────
// Every immutable TASK-541 corpus case reaches both Page color adapters and the
// embedded final-color background path with its raw input untouched. Expected
// Page policy is TASK-541 authoring acceptance plus the second token filter:
// every non-token accepted color uses parsed.normalized, only the seven Page
// tokens accept, and every otherwise-valid token rejects. The adapter derives
// expectations from parseCssColorValue itself (never a copied acceptance table)
// and never calls .trim()/.toLowerCase().
const SEVEN_PAGE_TOKENS: ReadonlySet<string> = new Set(
  authoringColorTokenNames.map((name) => `var(--color-${name})`)
);

const pageColorFromTask541 = (input: unknown): string | null => {
  const parsed = parseCssColorValue(input, "authoring");
  if (!parsed) return null;
  if (parsed.kind !== "token") return parsed.normalized;
  return SEVEN_PAGE_TOKENS.has(parsed.normalized) ? parsed.normalized : null;
};

test("TASK-539-02-L02: every TASK-541 corpus case reaches both color adapters and the final-color background path raw", () => {
  for (const { id, input } of CSS_COLOR_CORPUS_CASES) {
    const expectedColor = pageColorFromTask541(input);
    expect(sanitizeAuthoringCssColor(input), id).toBe(expectedColor);
    expect(isSafeAuthoringCssColor(input as string), id).toBe(expectedColor !== null);
    if (typeof input !== "string") {
      expect(parseAuthoringCssBackgroundPaint(input), id).toBeNull();
      continue;
    }
    // Color-only/final-color candidate with the untouched string; a string that
    // is a legal single gradient is parsed as the image layer instead.
    const expectedPaint =
      expectedColor !== null
        ? { image: null, color: expectedColor }
        : isSafeAuthoringCssGradient(input)
          ? { image: input, color: null }
          : null;
    expect(parseAuthoringCssBackgroundPaint(input), id).toEqual(expectedPaint);
  }
});

test("TASK-539-02-L02: exact-cap/cap+1 ASCII padding and raw code points pin untouched-raw behavior", () => {
  const terminal = "#abc";
  // Build the boundaries from CSS_COLOR_VALUE_MAX_LENGTH, never a numeric mirror.
  const exactCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
  const capPlusOne = ` ${exactCap}`;
  expect(exactCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
  expect(capPlusOne).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

  // Single-color adapters: exact cap accepts (canonical), cap+1 fails closed.
  expect(sanitizeAuthoringCssColor(exactCap)).toBe(terminal);
  expect(sanitizeAuthoringCssColor(capPlusOne)).toBeNull();
  expect(isSafeAuthoringCssColor(exactCap)).toBe(true);
  expect(isSafeAuthoringCssColor(capPlusOne)).toBe(false);

  // Final-color background parsing: the untouched raw argument honors the same cap.
  expect(parseAuthoringCssBackgroundPaint(exactCap)).toEqual({ image: null, color: terminal });
  expect(sanitizeAuthoringCssBackground(exactCap)).toBe(terminal);
  expect(parseAuthoringCssBackgroundPaint(capPlusOne)).toBeNull();
  expect(sanitizeAuthoringCssBackground(capPlusOne)).toBeNull();

  // C0, C1, non-breaking space, and every other Unicode whitespace reject in both
  // single-color adapters and the final-color background slice before trimming.
  for (const codePoint of FORBIDDEN_RAW_STRINGS) {
    expect(
      sanitizeAuthoringCssColor(`${codePoint}${terminal}`),
      JSON.stringify(codePoint)
    ).toBeNull();
    expect(
      sanitizeAuthoringCssColor(`${terminal}${codePoint}`),
      JSON.stringify(codePoint)
    ).toBeNull();
    expect(
      parseAuthoringCssBackgroundPaint(`${oneGradient}, ${codePoint}${terminal}`),
      `bg ${JSON.stringify(codePoint)}`
    ).toBeNull();
  }
});
