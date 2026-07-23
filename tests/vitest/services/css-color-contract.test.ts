import { describe, expect, test } from "vitest";

import {
  CSS_COLOR_SCHEMA_PATTERNS,
  CSS_COLOR_VALUE_MAX_LENGTH,
  cssColorProfiles,
  normalizeCssColorValue,
  parseCssColorValue,
  type CssColorProfile,
  type ParsedCssColor,
} from "../../../core/services/theme/cssColorContract";

const authoringPattern = new RegExp(CSS_COLOR_SCHEMA_PATTERNS.authoring);
const inheritedPattern = new RegExp(CSS_COLOR_SCHEMA_PATTERNS["inherited-render"]);

const expectLiteral = (
  input: string,
  expected: Extract<ParsedCssColor, { kind: "hex" | "rgb" | "hsl" }>,
  profile: CssColorProfile = "authoring"
) => {
  expect(parseCssColorValue(input, profile)).toEqual(expected);
  expect(normalizeCssColorValue(input, profile)).toBe(expected.normalized);
};

describe("cssColorContract public contract", () => {
  test("exports the exact profiles, raw-input cap, and compilable structural patterns", () => {
    expect(cssColorProfiles).toEqual(["authoring", "inherited-render"]);
    expect(CSS_COLOR_VALUE_MAX_LENGTH).toBe(128);
    expect(Object.keys(CSS_COLOR_SCHEMA_PATTERNS)).toEqual(["authoring", "inherited-render"]);
    expect(Object.isFrozen(CSS_COLOR_SCHEMA_PATTERNS)).toBe(true);
    expect(CSS_COLOR_SCHEMA_PATTERNS.authoring).not.toContain("\\s");
    expect(CSS_COLOR_SCHEMA_PATTERNS["inherited-render"]).not.toContain("\\s");
    expect(authoringPattern.test("rgba(1, 2, 3, .5)")).toBe(true);
    expect(inheritedPattern.test(" CURRENTCOLOR ")).toBe(true);
  });

  test("rejects non-string input and unknown runtime profiles without throwing", () => {
    for (const input of [undefined, null, 0, Number.NaN, {}, []]) {
      expect(parseCssColorValue(input, "authoring")).toBeUndefined();
      expect(normalizeCssColorValue(input, "authoring")).toBeUndefined();
    }
    expect(parseCssColorValue("#fff", "unexpected" as CssColorProfile)).toBeUndefined();
  });
});

describe("hex colors", () => {
  test("accepts 3/4/6/8 digits, lowercases without expanding canonical text, and derives metadata", () => {
    expectLiteral(" #AbC ", {
      kind: "hex",
      normalized: "#abc",
      baseHex: "#aabbcc",
      alpha: 1,
      rgb: { red: 170, green: 187, blue: 204 },
    });
    expectLiteral("#AbCd", {
      kind: "hex",
      normalized: "#abcd",
      baseHex: "#aabbcc",
      alpha: 0xdd / 255,
      rgb: { red: 170, green: 187, blue: 204 },
    });
    expectLiteral("#A1B2C3", {
      kind: "hex",
      normalized: "#a1b2c3",
      baseHex: "#a1b2c3",
      alpha: 1,
      rgb: { red: 161, green: 178, blue: 195 },
    });
    expectLiteral("#A1B2C3D4", {
      kind: "hex",
      normalized: "#a1b2c3d4",
      baseHex: "#a1b2c3",
      alpha: 0xd4 / 255,
      rgb: { red: 161, green: 178, blue: 195 },
    });
  });
});

describe("legacy comma-form RGB colors", () => {
  test("canonicalizes numbers, mixed units, aliases, arity, and leading-dot alpha", () => {
    expectLiteral(" RGB(000.500, 001.000%, 000255, .5000) ", {
      kind: "rgb",
      normalized: "rgba(0.5, 1%, 255, 0.5)",
      baseHex: "#0103ff",
      alpha: 0.5,
      rgb: { red: 1, green: 3, blue: 255 },
    });
    expect(normalizeCssColorValue("rgba(1,2,3)", "authoring")).toBe("rgb(1, 2, 3)");
    expect(normalizeCssColorValue("rgb(1,2,3,25.0%)", "authoring")).toBe("rgba(1, 2, 3, 25%)");
  });

  test("uses exact numeric and percentage byte rounding without clamping", () => {
    expectLiteral("rgb(0.49, 50%, 254.5)", {
      kind: "rgb",
      normalized: "rgb(0.49, 50%, 254.5)",
      baseHex: "#0080ff",
      alpha: 1,
      rgb: { red: 0, green: 128, blue: 255 },
    });
    expectLiteral("rgb(0.1%, 49.8%, 99.9%)", {
      kind: "rgb",
      normalized: "rgb(0.1%, 49.8%, 99.9%)",
      baseHex: "#007fff",
      alpha: 1,
      rgb: { red: 0, green: 127, blue: 255 },
    });
  });
});

describe("legacy comma-form HSL colors", () => {
  test("drops the deg suffix, derives canonical names from arity, and preserves HSL text", () => {
    expectLiteral(" HSLA(210.500DEG, 063.250%, 042.750%, .5000) ", {
      kind: "hsl",
      normalized: "hsla(210.5, 63.25%, 42.75%, 0.5)",
      baseHex: "#286cb2",
      alpha: 0.5,
      rgb: { red: 40, green: 108, blue: 178 },
    });
    expect(normalizeCssColorValue("hsla(210,50%,40%)", "authoring")).toBe("hsl(210, 50%, 40%)");
    expect(normalizeCssColorValue("hsl(210,50%,40%,25%)", "authoring")).toBe(
      "hsla(210, 50%, 40%, 25%)"
    );
  });

  test("converts primary, secondary, achromatic, and hue-360 metadata deterministically", () => {
    const cases = [
      ["hsl(0, 100%, 50%)", "#ff0000", { red: 255, green: 0, blue: 0 }],
      ["hsl(60, 100%, 50%)", "#ffff00", { red: 255, green: 255, blue: 0 }],
      ["hsl(120, 100%, 50%)", "#00ff00", { red: 0, green: 255, blue: 0 }],
      ["hsl(180, 100%, 50%)", "#00ffff", { red: 0, green: 255, blue: 255 }],
      ["hsl(240, 100%, 50%)", "#0000ff", { red: 0, green: 0, blue: 255 }],
      ["hsl(300, 100%, 50%)", "#ff00ff", { red: 255, green: 0, blue: 255 }],
      ["hsl(0, 0%, 50%)", "#808080", { red: 128, green: 128, blue: 128 }],
    ] as const;

    for (const [input, baseHex, rgb] of cases) {
      const parsed = parseCssColorValue(input, "authoring");
      expect(parsed?.kind).toBe("hsl");
      if (parsed?.kind !== "hsl") throw new Error(`expected HSL for ${input}`);
      expect(parsed.baseHex).toBe(baseHex);
      expect(parsed.rgb).toEqual(rgb);
    }

    const hueZero = parseCssColorValue("hsl(0, 100%, 50%)", "authoring");
    const hueFullTurn = parseCssColorValue("hsl(360, 100%, 50%)", "authoring");
    expect(hueFullTurn?.normalized).toBe("hsl(360, 100%, 50%)");
    expect(hueFullTurn && "rgb" in hueFullTurn ? hueFullTurn.rgb : undefined).toEqual(
      hueZero && "rgb" in hueZero ? hueZero.rgb : undefined
    );
  });
});

describe("tokens, keywords, and profiles", () => {
  test("canonicalizes only the case-insensitive var identifier and accepted keywords", () => {
    expect(parseCssColorValue(" VAR(  --color-accent-2  ) ", "authoring")).toEqual({
      kind: "token",
      normalized: "var(--color-accent-2)",
    });
    expect(parseCssColorValue(" TrAnSpArEnT ", "authoring")).toEqual({
      kind: "keyword",
      normalized: "transparent",
    });
  });

  test("admits currentColor and inherit only through inherited-render", () => {
    for (const [input, normalized] of [
      ["CURRENTCOLOR", "currentColor"],
      ["InHeRiT", "inherit"],
    ] as const) {
      expect(parseCssColorValue(input, "authoring")).toBeUndefined();
      expect(parseCssColorValue(input, "inherited-render")).toEqual({
        kind: "keyword",
        normalized,
      });
    }
  });

  test("keeps custom-property names lowercase and exact", () => {
    for (const input of [
      "var(--Color-accent)",
      "var(--color_accent)",
      "var(--color-)",
      "var(--color-accent, #fff)",
      "var(var(--color-accent))",
      "var(--surface)",
    ]) {
      expect(parseCssColorValue(input, "inherited-render"), input).toBeUndefined();
    }
  });
});

describe("numeric and positive-grammar rejection", () => {
  test("rejects every out-of-range channel or alpha instead of clamping", () => {
    for (const input of [
      "rgb(256, 0, 0)",
      "rgb(255.000000000000000001, 0, 0)",
      "rgb(100.1%, 0%, 0%)",
      "rgb(100.000000000000000001%, 0%, 0%)",
      "rgba(0, 0, 0, 1.1)",
      "rgba(0, 0, 0, 1.000000000000000001)",
      "rgba(0, 0, 0, 100.1%)",
      "hsl(360.1, 50%, 50%)",
      "hsl(360.000000000000000001, 50%, 50%)",
      "hsl(0, 100.1%, 50%)",
      "hsl(0, 50%, 100.1%)",
      "hsla(0, 50%, 50%, 2)",
    ]) {
      expect(parseCssColorValue(input, "inherited-render"), input).toBeUndefined();
    }
  });

  test("rejects signs, exponents, trailing dots, hexadecimal numbers, and split lexemes", () => {
    for (const input of [
      "rgb(-1, 0, 0)",
      "rgb(+1, 0, 0)",
      "rgb(1e2, 0, 0)",
      "rgb(1., 0, 0)",
      "rgb(.5, 0, 0)",
      "rgb(0x10, 0, 0)",
      "rgba(0, 0, 0, 1.)",
      "rgba(0, 0, 0, NaN)",
      "rgba(0, 0, 0, Infinity)",
      "hsl(-1, 50%, 50%)",
      "hsl(1 DEG, 50%, 50%)",
      "rgb (1, 2, 3)",
      "rgb(1 2 3)",
    ]) {
      expect(parseCssColorValue(input, "authoring"), input).toBeUndefined();
    }
  });

  test("serializes long small decimals from their lexemes without exponent notation", () => {
    const alpha = ".00000000000000000000000000000000000001";
    const normalized = normalizeCssColorValue(`rgba(0,0,0,${alpha})`, "authoring");
    expect(normalized).toBe(`rgba(0, 0, 0, 0${alpha})`);
    expect(normalized).not.toMatch(/[eE][+-]?[0-9]/);
  });
});

describe("raw input and structural-schema boundaries", () => {
  const terminal = "transparent";
  const paddingLength = CSS_COLOR_VALUE_MAX_LENGTH - terminal.length;
  const leftPadding = " ".repeat(Math.floor(paddingLength / 2));
  const rightPadding = " ".repeat(paddingLength - leftPadding.length);
  const atLimit = `${leftPadding}${terminal}${rightPadding}`;
  const overLimit = `${atLimit} `;
  const compactFunctionalPrefix = "rgb(0,0,0,.";
  const compactFunctionalSuffix = ")";
  const alphaDigits = "1".repeat(
    CSS_COLOR_VALUE_MAX_LENGTH - compactFunctionalPrefix.length - compactFunctionalSuffix.length
  );
  const canonicalOverflowAtRawLimit = `${compactFunctionalPrefix}${alphaDigits}${compactFunctionalSuffix}`;
  const expandedCanonicalFunctional = `rgba(0, 0, 0, 0.${alphaDigits})`;

  test("measures the original string before stripping only surrounding ASCII spaces", () => {
    expect(atLimit).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(overLimit).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);
    expect(normalizeCssColorValue(atLimit, "authoring")).toBe(terminal);
    expect(normalizeCssColorValue(overLimit, "authoring")).toBeUndefined();
    expect(authoringPattern.test(atLimit)).toBe(true);
    expect(authoringPattern.test(overLimit)).toBe(true);
  });

  test("rejects a raw-at-cap function when canonical output would exceed the cap", () => {
    expect(canonicalOverflowAtRawLimit).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(expandedCanonicalFunctional.length).toBeGreaterThan(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(authoringPattern.test(canonicalOverflowAtRawLimit)).toBe(true);
    expect(inheritedPattern.test(canonicalOverflowAtRawLimit)).toBe(true);
    expect(parseCssColorValue(canonicalOverflowAtRawLimit, "authoring")).toBeUndefined();
    expect(parseCssColorValue(canonicalOverflowAtRawLimit, "inherited-render")).toBeUndefined();
    expect(normalizeCssColorValue(canonicalOverflowAtRawLimit, "authoring")).toBeUndefined();
    expect(normalizeCssColorValue(canonicalOverflowAtRawLimit, "inherited-render")).toBeUndefined();
  });

  test("rejects controls, non-ASCII whitespace, comments, and rule fragments before parsing", () => {
    for (const input of [
      "\t#fff",
      "#fff\n",
      "\u0000#fff",
      "\u0085#fff",
      "\u00a0#fff",
      "\u2003#fff",
      "/*x*/#fff",
      "#fff; color:red",
      "#fff}body{color:red}",
      "'#fff'",
      '"#fff"',
      "`#fff`",
      "\\#fff",
      "[#fff]",
      "<#fff>",
    ]) {
      expect(parseCssColorValue(input, "inherited-render"), JSON.stringify(input)).toBeUndefined();
      expect(inheritedPattern.test(input), JSON.stringify(input)).toBe(false);
    }
  });

  test("keeps structural regex and semantic range validation deliberately distinct", () => {
    const rangeInvalid = "rgb(256, 0, 0)";
    expect(authoringPattern.test(rangeInvalid)).toBe(true);
    expect(inheritedPattern.test(rangeInvalid)).toBe(true);
    expect(parseCssColorValue(rangeInvalid, "authoring")).toBeUndefined();
    expect(parseCssColorValue(rangeInvalid, "inherited-render")).toBeUndefined();
    expect(authoringPattern.test("currentColor")).toBe(false);
    expect(inheritedPattern.test("currentColor")).toBe(true);
  });

  test("rejects every unlisted CSS color language and unsafe fallback", () => {
    for (const input of [
      "",
      "   ",
      "red",
      "rebeccapurple",
      "color-mix(in srgb, #fff, #000)",
      "lab(50% 0 0)",
      "calc(1)",
      "env(color)",
      "url(x)",
      "linear-gradient(#fff, #000)",
      "#12",
      "#12345",
      "#ggg",
    ]) {
      expect(parseCssColorValue(input, "inherited-render"), input).toBeUndefined();
    }
  });
});

describe("normalization idempotence and structural acceptance", () => {
  const accepted = [
    [" #ABC ", "authoring"],
    ["RGB(000.5, 50%, 254.500, .25)", "authoring"],
    ["HSLA(360DEG, 100%, 50%, 100.0%)", "authoring"],
    ["VAR( --color-accent )", "authoring"],
    ["TRANSPARENT", "authoring"],
    ["CURRENTCOLOR", "inherited-render"],
    ["INHERIT", "inherited-render"],
  ] as const satisfies readonly (readonly [string, CssColorProfile])[];

  for (const [input, profile] of accepted) {
    test(`${profile} normalizes ${input} to a stable accepted value`, () => {
      const parsed = parseCssColorValue(input, profile);
      expect(parsed).toBeDefined();
      if (!parsed) throw new Error(`expected ${input} to parse`);
      const pattern = new RegExp(CSS_COLOR_SCHEMA_PATTERNS[profile]);
      expect(pattern.test(input)).toBe(true);
      expect(pattern.test(parsed.normalized)).toBe(true);
      expect(parseCssColorValue(parsed.normalized, profile)).toEqual(parsed);
      expect(normalizeCssColorValue(parsed.normalized, profile)).toBe(parsed.normalized);
    });
  }
});
