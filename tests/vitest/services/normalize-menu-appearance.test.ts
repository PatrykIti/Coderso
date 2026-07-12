import { describe, expect, test } from "vitest";

import {
  MENU_APPEARANCE_INVALID,
  MenuAppearanceError,
  isMenuAppearanceError,
  menuAppearanceNumberRanges,
  normalizeMenuAppearance,
  normalizeMenuColorValue,
  resolvePublishedMenuAppearance,
  resolveStoredMenuAppearance,
  sanitizeMenuAppearance,
  type MenuAppearance,
} from "../../../core/services/menus/normalizeMenuAppearance";
import { CSS_COLOR_VALUE_MAX_LENGTH } from "../../../core/services/theme/cssColorContract";

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

const boundaryTerminal = "transparent";
const boundaryPaddingLength = CSS_COLOR_VALUE_MAX_LENGTH - boundaryTerminal.length;
const rawAtCap = `${" ".repeat(Math.floor(boundaryPaddingLength / 2))}${boundaryTerminal}${" ".repeat(
  Math.ceil(boundaryPaddingLength / 2)
)}`;
const rawOverCap = `${rawAtCap} `;
const rawMenuColorCases = [
  { id: "exact cap", input: rawAtCap, expected: "transparent" },
  { id: "cap plus one", input: rawOverCap, expected: null },
  { id: "C0 control", input: `\u001f${boundaryTerminal}`, expected: null },
  { id: "C1 control", input: `\u0085${boundaryTerminal}`, expected: null },
  { id: "NBSP", input: `\u00a0${boundaryTerminal}`, expected: null },
  { id: "EM SPACE", input: `\u2003${boundaryTerminal}`, expected: null },
  { id: "inherited currentColor", input: "currentColor", expected: null },
  { id: "inherited inherit", input: "inherit", expected: null },
  { id: "out-of-range function", input: "rgb(256,0,0)", expected: null },
] as const;

describe("canonical Menu color boundaries", () => {
  test("passes original raw values to the authoring owner", () => {
    expect(rawAtCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH);
    expect(rawOverCap).toHaveLength(CSS_COLOR_VALUE_MAX_LENGTH + 1);

    for (const colorCase of rawMenuColorCases) {
      expect(normalizeMenuColorValue(colorCase.input), colorCase.id).toBe(colorCase.expected);
    }
  });

  test("keeps flat writes strict with field-only errors and canonical accepted bytes", () => {
    for (const colorCase of rawMenuColorCases) {
      if (colorCase.expected !== null) {
        expect(
          normalizeMenuAppearance({ surfaceColor: colorCase.input, itemGap: 12 }),
          colorCase.id
        ).toEqual({ surfaceColor: colorCase.expected, itemGap: 12 });
        continue;
      }

      try {
        normalizeMenuAppearance({ surfaceColor: colorCase.input, itemGap: 12 });
        throw new Error(`expected ${colorCase.id} to reject`);
      } catch (error) {
        expect(error, colorCase.id).toBeInstanceOf(MenuAppearanceError);
        expect((error as MenuAppearanceError).code, colorCase.id).toBe(MENU_APPEARANCE_INVALID);
        expect((error as MenuAppearanceError).field, colorCase.id).toBe("surfaceColor");
        expect(error, colorCase.id).not.toHaveProperty("value");
      }
    }
  });

  test("sanitizes stored and published values field-by-field without restoring rejected bytes", () => {
    for (const colorCase of rawMenuColorCases) {
      const appearance = { surfaceColor: colorCase.input, itemGap: 12 };
      const expected =
        colorCase.expected === null
          ? { itemGap: 12 }
          : { surfaceColor: colorCase.expected, itemGap: 12 };

      expect(sanitizeMenuAppearance(appearance), colorCase.id).toEqual(expected);
      expect(resolveStoredMenuAppearance({ appearance }), colorCase.id).toEqual(expected);
      expect(resolvePublishedMenuAppearance({ published: { appearance } }), colorCase.id).toEqual(
        expected
      );
    }
  });
});

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
      linkColor: "transparent",
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
      "rgb(10, 20, 30)"
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

describe("menu appearance nav-link cheap-win scalars (TASK-504-01 §2a)", () => {
  test("linkPaddingX/linkPaddingY/linkRadius clamp via the shared table", () => {
    expect(menuAppearanceNumberRanges.linkPaddingX).toEqual({ min: 0, max: 40 });
    expect(menuAppearanceNumberRanges.linkPaddingY).toEqual({ min: 0, max: 32 });
    expect(menuAppearanceNumberRanges.linkRadius).toEqual({ min: 0, max: 32 });
    expect(normalizeMenuAppearance({ linkPaddingX: 999 }).linkPaddingX).toBe(40);
    expect(normalizeMenuAppearance({ linkPaddingX: -5 }).linkPaddingX).toBe(0);
    expect(normalizeMenuAppearance({ linkPaddingY: 999 }).linkPaddingY).toBe(32);
    expect(normalizeMenuAppearance({ linkRadius: 12.6 }).linkRadius).toBe(13);
  });

  test("linkHoverTextColor is token-validated + nullable (unset ⇒ dropped)", () => {
    expect(
      normalizeMenuAppearance({ linkHoverTextColor: "var(--color-primary)" }).linkHoverTextColor
    ).toBe("var(--color-primary)");
    expect(normalizeMenuAppearance({ linkHoverTextColor: "#abcdef" }).linkHoverTextColor).toBe(
      "#abcdef"
    );
    expect("linkHoverTextColor" in normalizeMenuAppearance({ linkHoverTextColor: null })).toBe(
      false
    );
  });

  test("bad cheap-win values reject with the offending field", () => {
    const expectFieldError = (value: unknown, field: string) => {
      try {
        normalizeMenuAppearance(value);
        throw new Error(`expected ${field} to be rejected`);
      } catch (error) {
        expect(isMenuAppearanceError(error)).toBe(true);
        expect((error as MenuAppearanceError).field).toBe(field);
      }
    };
    expectFieldError({ linkPaddingX: "12" }, "linkPaddingX");
    expectFieldError({ linkRadius: Number.NaN }, "linkRadius");
    expectFieldError({ linkHoverTextColor: "red" }, "linkHoverTextColor");
    expectFieldError({ linkHoverTextColor: "url(javascript:alert(1))" }, "linkHoverTextColor");
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

describe("menu appearance orientation (TASK-501-01)", () => {
  const expectFieldError = (value: unknown, field: string) => {
    try {
      normalizeMenuAppearance(value);
      throw new Error(`expected ${field} to be rejected`);
    } catch (error) {
      expect(isMenuAppearanceError(error)).toBe(true);
      expect((error as MenuAppearanceError).field).toBe(field);
    }
  };

  test("accepts horizontal and vertical", () => {
    expect(normalizeMenuAppearance({ orientation: "horizontal" })).toEqual({
      orientation: "horizontal",
    });
    expect(normalizeMenuAppearance({ orientation: "vertical" })).toEqual({
      orientation: "vertical",
    });
  });

  test("rejects non-enum orientation values with the offending field", () => {
    expectFieldError({ orientation: "diagonal" }, "orientation");
    expectFieldError({ orientation: 42 }, "orientation");
    expectFieldError({ orientation: {} }, "orientation");
    expectFieldError({ orientation: true }, "orientation");
  });

  test("sanitize drops bad orientation values and keeps valid ones", () => {
    expect(sanitizeMenuAppearance({ orientation: "vertical", itemGap: 8 })).toEqual({
      orientation: "vertical",
      itemGap: 8,
    });
    expect(sanitizeMenuAppearance({ orientation: "diagonal", itemGap: 8 })).toEqual({ itemGap: 8 });
  });

  test("absent orientation stays absent after round-trip (default is CSS-build-time only)", () => {
    const roundTripped = normalizeMenuAppearance(normalizeMenuAppearance({ itemGap: 8 }));
    expect(roundTripped).toEqual({ itemGap: 8 });
    expect("orientation" in roundTripped).toBe(false);
    expect("orientation" in sanitizeMenuAppearance({ itemGap: 8 })).toBe(false);
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
