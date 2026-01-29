import { expect, test } from "bun:test";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";
import { toAdminThemeCssVariables, toCssVariables } from "../../../core/ui/theme/tokenCss";

test("toCssVariables outputs root tokens", () => {
  const css = toCssVariables(DEFAULT_TOKENS);
  expect(css).toContain("--color-primary");
  expect(css).toContain(DEFAULT_TOKENS.colors.primary);
  expect(css).toContain("--font-sans");
});

test("toAdminThemeCssVariables outputs admin tokens", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS);
  expect(css).toContain("--admin-base-bg");
  expect(css).toContain(DEFAULT_ADMIN_THEME_TOKENS.base.bg);
  expect(css).toContain("--admin-button-primary-bg");
});
