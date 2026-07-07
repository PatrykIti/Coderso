import { describe, expect, test } from "vitest";

import { normalizeMenuColorValue } from "../../../core/services/menus/normalizeMenuAppearance";

/**
 * TASK-519-04 rollout verification: the menu `ColorSwatchControl` usages
 * (MenuDesignEditor 9 direct sites + `swatch()`/`chromeSwatch()` wrappers,
 * MenuAppearancePanel 5 sites) inherit alpha authoring from the 519-02 control
 * upgrade and store the raw string via their `onChange` handlers (no 6-digit-only
 * re-normalize, no `allowCustom={false}` suppression). This asserts the menu write
 * boundary these values persist through (`normalizeMenuColorValue`) accepts an
 * authored alpha value UNCHANGED, so an authored `#0812209e` / `rgba(8,17,31,.84)`
 * round-trips schema-valid with NO schema widening.
 */
describe("menu color alpha rollout (519-04)", () => {
  test("8-digit alpha hex round-trips unchanged", () => {
    expect(normalizeMenuColorValue("#0812209e")).toBe("#0812209e");
  });

  test("leading-dot rgba alpha round-trips unchanged at the menu write boundary", () => {
    expect(normalizeMenuColorValue("rgba(8,17,31,.84)")).toBe("rgba(8,17,31,.84)");
  });

  test("hsla alpha + 4-digit hex + transparent + token all stay schema-valid", () => {
    expect(normalizeMenuColorValue("hsla(210,60%,8%,.84)")).toBe("hsla(210,60%,8%,.84)");
    expect(normalizeMenuColorValue("#0812")).toBe("#0812");
    expect(normalizeMenuColorValue("transparent")).toBe("transparent");
    expect(normalizeMenuColorValue("var(--color-primary)")).toBe("var(--color-primary)");
  });

  test("unsafe values are still dropped by the unchanged write boundary", () => {
    expect(normalizeMenuColorValue("url(javascript:alert(1))")).toBeNull();
    expect(normalizeMenuColorValue("expression(alert(1))")).toBeNull();
    expect(normalizeMenuColorValue("")).toBeNull();
  });
});
