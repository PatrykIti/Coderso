import { describe, expect, test } from "vitest";

import {
  colorAlpha,
  composeHexColor,
  isAlphaPickerRepresentable,
  normalizeAdminColorValue,
  parseColorValue,
  pickerHexFor,
} from "../../../core/admin/ui/shared/colorValue";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

describe("parseColorValue", () => {
  test("adapts literal metadata while preserving the original raw bytes", () => {
    expect(parseColorValue(" #AbC ")).toEqual({
      kind: "hex",
      raw: " #AbC ",
      normalized: "#abc",
      baseHex: "#aabbcc",
      alpha: 1,
      rgb: { red: 170, green: 187, blue: 204 },
    });

    expect(parseColorValue("rgba(8,17,31,.84)")).toEqual({
      kind: "rgb",
      raw: "rgba(8,17,31,.84)",
      normalized: "rgba(8, 17, 31, 0.84)",
      baseHex: "#08111f",
      alpha: 0.84,
      rgb: { red: 8, green: 17, blue: 31 },
    });

    expect(parseColorValue("hsla(210,50%,40%,.5)")).toEqual({
      kind: "hsl",
      raw: "hsla(210,50%,40%,.5)",
      normalized: "hsla(210, 50%, 40%, 0.5)",
      baseHex: "#336699",
      alpha: 0.5,
      rgb: { red: 51, green: 102, blue: 153 },
    });
  });

  test("adapts token and keyword metadata without widening the default profile", () => {
    expect(parseColorValue(" VAR( --color-brand ) ")).toEqual({
      kind: "token",
      raw: " VAR( --color-brand ) ",
      normalized: "var(--color-brand)",
    });
    expect(parseColorValue("TRANSPARENT")).toEqual({
      kind: "keyword",
      raw: "TRANSPARENT",
      normalized: "transparent",
      keyword: "transparent",
    });

    expect(parseColorValue("currentColor")).toEqual({
      kind: "unknown",
      raw: "currentColor",
    });
    expect(parseColorValue("inherit")).toEqual({ kind: "unknown", raw: "inherit" });
    expect(parseColorValue("CURRENTCOLOR", "inherited-render")).toEqual({
      kind: "keyword",
      raw: "CURRENTCOLOR",
      normalized: "currentColor",
      keyword: "currentColor",
    });
    expect(parseColorValue("INHERIT", "inherited-render")).toEqual({
      kind: "keyword",
      raw: "INHERIT",
      normalized: "inherit",
      keyword: "inherit",
    });
  });

  test("normalizes three/four-channel aliases through the owner", () => {
    expect(normalizeAdminColorValue("rgba(1,2,3)")).toBe("rgb(1, 2, 3)");
    expect(normalizeAdminColorValue("rgb(1,2,3,.5)")).toBe("rgba(1, 2, 3, 0.5)");
    expect(normalizeAdminColorValue("hsla(210,50%,40%)")).toBe("hsl(210, 50%, 40%)");
    expect(normalizeAdminColorValue("hsl(210,50%,40%,.5)")).toBe("hsla(210, 50%, 40%, 0.5)");
  });

  test("rejects out-of-range values instead of clamping them", () => {
    for (const value of [
      "rgb(256,0,0)",
      "rgb(100.1%,0%,0%)",
      "rgba(1,2,3,1.1)",
      "rgba(1,2,3,100.1%)",
      "hsl(360.1,100%,50%)",
      "hsl(1,100.1%,50%)",
      "hsl(1,100%,100.1%)",
      "hsla(1,100%,50%,1.1)",
    ]) {
      expect(parseColorValue(value), value).toEqual({ kind: "unknown", raw: value });
      expect(normalizeAdminColorValue(value), value).toBeUndefined();
    }
  });

  test("preserves invalid and nullish raw values without throwing or coercing", () => {
    expect(parseColorValue(null)).toEqual({ kind: "unknown", raw: "" });
    expect(parseColorValue(undefined)).toEqual({ kind: "unknown", raw: "" });
    for (const value of ["", "url(x)", "javascript:alert(1)", "not-a-color"]) {
      expect(parseColorValue(value), value).toEqual({ kind: "unknown", raw: value });
    }
  });

  test("checks raw length before ASCII-space normalization and rejects non-ASCII/control bytes", () => {
    const terminal = "transparent";
    const atCap = `${" ".repeat(CSS_COLOR_VALUE_MAX_LENGTH - terminal.length)}${terminal}`;
    const overCap = `${atCap} `;
    expect(atCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(parseColorValue(atCap)).toMatchObject({
      kind: "keyword",
      raw: atCap,
      normalized: "transparent",
    });
    expect(parseColorValue(overCap)).toEqual({ kind: "unknown", raw: overCap });

    for (const value of ["\u00a0#abc", "\u2003#abc", "\u0009#abc", "\u0085#abc"]) {
      expect(parseColorValue(value), JSON.stringify(value)).toEqual({
        kind: "unknown",
        raw: value,
      });
      expect(normalizeAdminColorValue(value), JSON.stringify(value)).toBeUndefined();
    }
  });
});

describe("composeHexColor", () => {
  test("expands and lowercases opaque bases and rounds alpha to one byte", () => {
    expect(composeHexColor("#AbC", 1)).toBe("#aabbcc");
    expect(composeHexColor("#AbC", 0.5)).toBe("#aabbcc80");
    expect(composeHexColor("#081220", 0)).toBe("#08122000");
    expect(composeHexColor("#081220", 0.62)).toBe("#0812209e");
  });

  test("returns undefined for invalid/non-opaque bases and invalid alpha", () => {
    for (const base of ["not-a-color", "#abcd", "#0812209e", " #abc", "abc"]) {
      expect(composeHexColor(base, 1), base).toBeUndefined();
    }
    for (const alpha of [-1, 1.01, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(composeHexColor("#081220", alpha), String(alpha)).toBeUndefined();
    }
  });
});

describe("picker adapters", () => {
  test("round-trips literal alpha and reports nonliteral alpha as opaque", () => {
    for (const value of ["#0812209e", "rgba(8,17,31,.84)", "hsla(210,50%,40%,.5)"]) {
      const parsed = parseColorValue(value);
      expect(colorAlpha(parsed), value).toBeLessThan(1);
      if (parsed.kind === "hex" || parsed.kind === "rgb" || parsed.kind === "hsl") {
        expect(composeHexColor(parsed.baseHex, parsed.alpha), value).toMatch(/^#[0-9a-f]{8}$/);
      }
    }
    expect(colorAlpha(parseColorValue("var(--color-brand)"))).toBe(1);
    expect(colorAlpha(parseColorValue("transparent"))).toBe(1);
    expect(colorAlpha(parseColorValue("unknown"))).toBe(1);
  });

  test("uses literal base metadata and strictly normalizes only UI fallbacks", () => {
    expect(pickerHexFor(parseColorValue("hsl(210,50%,40%)"), "bad")).toBe("#336699");
    expect(pickerHexFor(parseColorValue("var(--color-brand)"), "#AbC")).toBe("#aabbcc");
    expect(pickerHexFor(parseColorValue("var(--color-brand)"), "#A1B2C3")).toBe("#a1b2c3");
    expect(pickerHexFor(parseColorValue("var(--color-brand)"), "#abcd")).toBe("#000000");
  });

  test("is representable exactly for literals under the requested profile", () => {
    expect(isAlphaPickerRepresentable("#0812209e")).toBe(true);
    expect(isAlphaPickerRepresentable("rgba(8,17,31,.84)")).toBe(true);
    expect(isAlphaPickerRepresentable("hsla(210,50%,40%,.5)")).toBe(true);
    expect(isAlphaPickerRepresentable("var(--color-x)")).toBe(false);
    expect(isAlphaPickerRepresentable("transparent")).toBe(false);
    expect(isAlphaPickerRepresentable("currentColor", "inherited-render")).toBe(false);
    expect(isAlphaPickerRepresentable("inherit", "inherited-render")).toBe(false);
    expect(isAlphaPickerRepresentable("")).toBe(false);
  });

  test("normalizes inherited keywords only under the explicit profile", () => {
    expect(normalizeAdminColorValue("currentColor")).toBeUndefined();
    expect(normalizeAdminColorValue("inherit")).toBeUndefined();
    expect(normalizeAdminColorValue(" CURRENTCOLOR ", "inherited-render")).toBe("currentColor");
    expect(normalizeAdminColorValue(" INHERIT ", "inherited-render")).toBe("inherit");
  });
});
