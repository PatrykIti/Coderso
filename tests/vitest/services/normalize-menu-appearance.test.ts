import { describe, expect, test } from "vitest";

import {
  MENU_APPEARANCE_INVALID,
  MenuAppearanceError,
  isMenuAppearanceError,
  menuAppearanceNumberRanges,
  normalizeMenuAppearance,
  resolveStoredMenuAppearance,
  sanitizeMenuAppearance,
  type MenuAppearance,
} from "../../../core/services/menus/normalizeMenuAppearance";

const fullValidAppearance: MenuAppearance = {
  surfaceColor: "#0f172a",
  linkColor: "var(--color-primary)",
  linkHoverColor: "rgba(255, 255, 255, 0.12)",
  linkActiveColor: "hsl(220, 60%, 50%)",
  itemGap: 12,
  paddingY: 16,
  paddingX: 32,
  alignment: "center",
  fontSize: 15,
  fontWeight: 600,
  textTransform: "uppercase",
  borderColor: "transparent",
  borderWidth: 2,
  shadow: "sm",
  sticky: true,
  dropdownDirection: "top",
  mobileMode: "inline",
};

describe("normalizeMenuAppearance accepts", () => {
  test("the full token-backed model and round-trips it unchanged", () => {
    const normalized = normalizeMenuAppearance(fullValidAppearance);
    expect(normalized).toEqual(fullValidAppearance);
    expect(normalizeMenuAppearance(normalized)).toEqual(normalized);
  });

  test("an empty model (all fields optional, defaults applied at CSS-build time)", () => {
    expect(normalizeMenuAppearance({})).toEqual({});
  });

  test("transparent as a first-class color on every color field", () => {
    expect(
      normalizeMenuAppearance({
        surfaceColor: "transparent",
        linkColor: "TRANSPARENT",
        linkHoverColor: "transparent",
        linkActiveColor: "transparent",
        borderColor: "transparent",
      })
    ).toEqual({
      surfaceColor: "transparent",
      linkColor: "TRANSPARENT",
      linkHoverColor: "transparent",
      linkActiveColor: "transparent",
      borderColor: "transparent",
    });
  });

  test("hex, var(--color-*) tokens, rgb()/rgba(), hsl()/hsla() shapes and trims whitespace", () => {
    expect(normalizeMenuAppearance({ surfaceColor: " #abc " }).surfaceColor).toBe("#abc");
    expect(normalizeMenuAppearance({ surfaceColor: "#aabbccdd" }).surfaceColor).toBe("#aabbccdd");
    expect(normalizeMenuAppearance({ linkColor: "var(--color-accent-2)" }).linkColor).toBe(
      "var(--color-accent-2)"
    );
    expect(normalizeMenuAppearance({ linkHoverColor: "rgb(10,20,30)" }).linkHoverColor).toBe(
      "rgb(10,20,30)"
    );
    expect(
      normalizeMenuAppearance({ linkActiveColor: "hsla(200, 50%, 40%, 0.5)" }).linkActiveColor
    ).toBe("hsla(200, 50%, 40%, 0.5)");
  });

  test("null and undefined field values mean unset and are dropped", () => {
    expect(
      normalizeMenuAppearance({ surfaceColor: null, itemGap: undefined, sticky: null })
    ).toEqual({});
  });
});

describe("normalizeMenuAppearance clamps", () => {
  test("numeric fields to their sane ranges and rounds to integers", () => {
    expect(normalizeMenuAppearance({ itemGap: 999 }).itemGap).toBe(
      menuAppearanceNumberRanges.itemGap.max
    );
    expect(normalizeMenuAppearance({ itemGap: -5 }).itemGap).toBe(
      menuAppearanceNumberRanges.itemGap.min
    );
    expect(normalizeMenuAppearance({ paddingY: 64.6 }).paddingY).toBe(64);
    expect(normalizeMenuAppearance({ paddingX: 10.6 }).paddingX).toBe(11);
    expect(normalizeMenuAppearance({ fontSize: 200 }).fontSize).toBe(
      menuAppearanceNumberRanges.fontSize.max
    );
    expect(normalizeMenuAppearance({ fontSize: 1 }).fontSize).toBe(
      menuAppearanceNumberRanges.fontSize.min
    );
    expect(normalizeMenuAppearance({ borderWidth: 99 }).borderWidth).toBe(
      menuAppearanceNumberRanges.borderWidth.max
    );
  });
});

describe("normalizeMenuAppearance rejects", () => {
  const expectFieldError = (value: unknown, field: string) => {
    try {
      normalizeMenuAppearance(value);
      throw new Error(`expected ${field} to be rejected`);
    } catch (error) {
      expect(isMenuAppearanceError(error)).toBe(true);
      const appearanceError = error as MenuAppearanceError;
      expect(appearanceError.message).toBe(MENU_APPEARANCE_INVALID);
      expect(appearanceError.code).toBe(MENU_APPEARANCE_INVALID);
      expect(appearanceError.field).toBe(field);
    }
  };

  test("non-object payloads", () => {
    expectFieldError(null, "appearance");
    expectFieldError("dark", "appearance");
    expectFieldError([], "appearance");
    expectFieldError(42, "appearance");
  });

  test("unknown keys (reject-unknown)", () => {
    expectFieldError({ surfaceColor: "#fff", logoColor: "#fff" }, "logoColor");
    expectFieldError({ css: "body{display:none}" }, "css");
  });

  test("non-token color shapes including CSS injection attempts", () => {
    expectFieldError({ surfaceColor: "red" }, "surfaceColor");
    expectFieldError({ surfaceColor: "#zzz" }, "surfaceColor");
    expectFieldError({ linkColor: "var(--evil)" }, "linkColor");
    expectFieldError({ linkColor: "url(javascript:alert(1))" }, "linkColor");
    expectFieldError({ borderColor: "#fff}body{display:none" }, "borderColor");
    expectFieldError({ linkHoverColor: "expression(alert(1))" }, "linkHoverColor");
    expectFieldError({ linkActiveColor: 12 }, "linkActiveColor");
  });

  test("non-finite or non-number numeric values", () => {
    expectFieldError({ itemGap: "12" }, "itemGap");
    expectFieldError({ paddingY: Number.NaN }, "paddingY");
    expectFieldError({ paddingX: Number.POSITIVE_INFINITY }, "paddingX");
    expectFieldError({ borderWidth: "1px" }, "borderWidth");
  });

  test("values outside the enum vocabularies", () => {
    expectFieldError({ alignment: "justify" }, "alignment");
    expectFieldError({ fontWeight: 450 }, "fontWeight");
    expectFieldError({ fontWeight: "600" }, "fontWeight");
    expectFieldError({ textTransform: "lowercase" }, "textTransform");
    expectFieldError({ shadow: "lg" }, "shadow");
    expectFieldError({ dropdownDirection: "auto" }, "dropdownDirection");
    expectFieldError({ mobileMode: "drawer" }, "mobileMode");
    expectFieldError({ sticky: "yes" }, "sticky");
  });
});

describe("sanitizeMenuAppearance (fail-closed render path)", () => {
  test("keeps valid fields, drops invalid and unknown ones, never throws", () => {
    expect(
      sanitizeMenuAppearance({
        surfaceColor: "#111827",
        linkColor: "red",
        itemGap: 999,
        alignment: "diagonal",
        unknownKey: true,
        sticky: true,
      })
    ).toEqual({
      surfaceColor: "#111827",
      itemGap: menuAppearanceNumberRanges.itemGap.max,
      sticky: true,
    });
  });

  test("degrades non-object input to the empty (default) model", () => {
    expect(sanitizeMenuAppearance(null)).toEqual({});
    expect(sanitizeMenuAppearance("legacy")).toEqual({});
    expect(sanitizeMenuAppearance([1, 2])).toEqual({});
  });
});

describe("resolveStoredMenuAppearance", () => {
  test("null/legacy settings resolve to null (legacy look)", () => {
    expect(resolveStoredMenuAppearance(null)).toBeNull();
    expect(resolveStoredMenuAppearance(undefined)).toBeNull();
    expect(resolveStoredMenuAppearance("{}")).toBeNull();
    expect(resolveStoredMenuAppearance([])).toBeNull();
    expect(resolveStoredMenuAppearance({})).toBeNull();
    expect(resolveStoredMenuAppearance({ appearance: null })).toBeNull();
    expect(resolveStoredMenuAppearance({ appearance: "dark" })).toBeNull();
  });

  test("reads the appearance envelope and sanitizes stored fields", () => {
    expect(resolveStoredMenuAppearance({ appearance: fullValidAppearance })).toEqual(
      fullValidAppearance
    );
    expect(
      resolveStoredMenuAppearance({
        appearance: { surfaceColor: "#fff", linkColor: "not-a-color" },
      })
    ).toEqual({ surfaceColor: "#fff" });
  });

  test("ignores sibling envelope keys so future settings can ride alongside", () => {
    expect(
      resolveStoredMenuAppearance({ appearance: { itemGap: 8 }, futureExtras: { x: 1 } })
    ).toEqual({ itemGap: 8 });
  });
});
