import { describe, expect, test } from "vitest";

import {
  colorAlpha,
  composeHexColor,
  isAlphaPickerRepresentable,
  normalizeAdminColorValue,
  parseColorValue,
} from "../../../core/admin/ui/shared/colorValue";
import { resolveClearableCssColorValue } from "../../../core/widgets/core/clearableStyle";

describe("parseColorValue", () => {
  test("parses 8-digit hex into base + alpha", () => {
    const parsed = parseColorValue("#0812209e");
    expect(parsed.kind).toBe("hex");
    if (parsed.kind !== "hex") throw new Error("expected hex");
    expect(parsed.baseHex).toBe("#081220");
    expect(parsed.alpha).toBeCloseTo(0x9e / 255, 5); // ~0.62
  });

  test("expands shorthand hex with alpha (#abcd)", () => {
    const parsed = parseColorValue("#abcd");
    expect(parsed.kind).toBe("hex");
    if (parsed.kind !== "hex") throw new Error("expected hex");
    expect(parsed.baseHex).toBe("#aabbcc");
    expect(parsed.alpha).toBeCloseTo(0xdd / 255, 5); // ~0.87
  });

  test("parses rgba with leading-dot alpha", () => {
    const parsed = parseColorValue("rgba(8,17,31,.84)");
    expect(parsed.kind).toBe("rgb");
    if (parsed.kind !== "rgb") throw new Error("expected rgb");
    expect(parsed.baseHex).toBe("#08111f");
    expect(parsed.alpha).toBeCloseTo(0.84, 5);
  });

  test("classifies keyword / token / hsla", () => {
    expect(parseColorValue("transparent").kind).toBe("keyword");
    const kw = parseColorValue("transparent");
    if (kw.kind === "keyword") expect(kw.keyword).toBe("transparent");
    expect(parseColorValue("var(--color-brand)").kind).toBe("token");
    // hsla is safe + accepted but not faithfully picker-representable.
    expect(parseColorValue("hsla(210,60%,8%,.84)").kind).toBe("token");
  });

  test("blank / unsafe input degrades to unknown (never throws)", () => {
    expect(parseColorValue("").kind).toBe("unknown");
    expect(parseColorValue(null).kind).toBe("unknown");
    expect(parseColorValue("url(x)").kind).toBe("unknown");
    expect(parseColorValue("javascript:alert(1)").kind).toBe("unknown");
  });
});

describe("composeHexColor", () => {
  test("emits #rrggbbaa for translucent, #rrggbb for opaque", () => {
    const translucent = composeHexColor("#081220", 0.62);
    expect(translucent.startsWith("#081220")).toBe(true);
    expect(translucent).toHaveLength(9);
    expect(composeHexColor("#081220", 1)).toBe("#081220");
  });

  test("clamps out-of-range / NaN alpha", () => {
    expect(composeHexColor("#081220", 2)).toBe("#081220"); // >1 -> opaque
    expect(composeHexColor("#081220", Number.NaN)).toBe("#081220"); // NaN -> opaque
    expect(composeHexColor("#081220", -1)).toBe("#08122000"); // <0 -> fully transparent
  });

  test("invalid base hex falls back to #000000", () => {
    expect(composeHexColor("not-a-color", 1)).toBe("#000000");
    expect(composeHexColor("#abc", 1)).toBe("#aabbcc"); // shorthand expanded
  });
});

describe("HI-1 round-trip idempotence (hex kinds)", () => {
  for (const value of ["#081220", "#0812209e", "#aabbccdd", "#ffffff00"]) {
    test(`reproduces ${value}`, () => {
      const parsed = parseColorValue(value);
      const roundTripped = composeHexColor(
        parsed.kind === "hex" ? parsed.baseHex : "#000000",
        colorAlpha(parsed)
      );
      expect(roundTripped).toBe(value);
    });
  }
});

describe("isAlphaPickerRepresentable", () => {
  test("true for hex/rgb, false for token/keyword/blank", () => {
    expect(isAlphaPickerRepresentable("#0812209e")).toBe(true);
    expect(isAlphaPickerRepresentable("rgba(8,17,31,.84)")).toBe(true);
    expect(isAlphaPickerRepresentable("var(--color-x)")).toBe(false);
    expect(isAlphaPickerRepresentable("transparent")).toBe(false);
    expect(isAlphaPickerRepresentable("hsla(210,60%,8%,.84)")).toBe(false);
    expect(isAlphaPickerRepresentable("")).toBe(false);
  });
});

describe("Security — whitelist parity on the CANONICAL emit", () => {
  const acceptedInputs = [
    "#fff",
    "#abcd",
    "#081220",
    "#0812209e",
    "transparent",
    "currentColor",
    "inherit",
    "var(--color-brand)",
    "rgb(8, 17, 31)",
    "rgba(8,17,31,0.84)",
    "rgba(8,17,31,.84)", // leading-dot -> canonicalized on emit
    "rgba(50%, 50%, 50%, 50%)",
    "hsl(210, 60%, 8%)",
    "hsla(210,60%,8%,.84)", // leading-dot -> canonicalized on emit
  ];

  test("every emitted value is accepted by the render boundary", () => {
    for (const value of acceptedInputs) {
      const out = normalizeAdminColorValue(value);
      expect(out, `normalizeAdminColorValue(${value}) should emit`).toBeDefined();
      expect(
        resolveClearableCssColorValue(out),
        `resolveClearableCssColorValue(${out}) should be defined`
      ).toBeDefined();
    }
  });

  test("canonicalizes leading-dot alpha that the render boundary rejects raw", () => {
    // The raw leading-dot form fails the render boundary...
    expect(resolveClearableCssColorValue("rgba(8,17,31,.84)")).toBeUndefined();
    // ...but the helper canonicalizes it so the emitted form passes.
    expect(normalizeAdminColorValue("rgba(8,17,31,.84)")).toBe("rgba(8,17,31,0.84)");
    expect(resolveClearableCssColorValue("rgba(8,17,31,0.84)")).toBeDefined();
    // hsla leading-dot canonicalizes too.
    expect(normalizeAdminColorValue("hsla(210,60%,8%,.84)")).toBe("hsla(210,60%,8%,0.84)");
  });

  test("rejects unsafe / unknown input (fail-soft to undefined)", () => {
    for (const value of [
      "url(x)",
      "expression(1)",
      "javascript:alert(1)",
      "#fff;}<script>",
      "",
      "not-a-color",
    ]) {
      expect(normalizeAdminColorValue(value), value).toBeUndefined();
    }
  });
});
