import { expect, test } from "bun:test";

import { assertAdminThemeTokens } from "../../../core/services/adminThemes/tokenValidation";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";

test("assertAdminThemeTokens accepts defaults", () => {
  expect(() => assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS)).not.toThrow();
});

test("assertAdminThemeTokens rejects invalid payload", () => {
  expect(() => assertAdminThemeTokens({})).toThrow();
});
