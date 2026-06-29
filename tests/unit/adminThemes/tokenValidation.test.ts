import { expect, test } from "bun:test";

import {
  assertAdminThemeTokens,
  assertKnownAdminThemeTokenShape,
  normalizeAdminThemeTokens,
} from "../../../core/services/adminThemes/tokenValidation";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";

test("assertAdminThemeTokens accepts defaults", () => {
  expect(() => assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS)).not.toThrow();
});

test("assertAdminThemeTokens rejects invalid payload", () => {
  expect(() => assertAdminThemeTokens({})).toThrow();
});

test("assertAdminThemeTokens (strict) requires the NEW groups", () => {
  const { primarySoft: _ps, effects: _fx, ...withoutNewGroups } = DEFAULT_ADMIN_THEME_TOKENS;
  expect(() => assertAdminThemeTokens(withoutNewGroups)).toThrow("admin_theme_tokens_invalid");
});

test("assertAdminThemeTokens rejects unknown keys in a NEW group", () => {
  const invalid = {
    ...DEFAULT_ADMIN_THEME_TOKENS,
    effects: { ...DEFAULT_ADMIN_THEME_TOKENS.effects, unknown: "#000000" },
  };
  expect(() => assertAdminThemeTokens(invalid)).toThrow("admin_theme_tokens_invalid");
});

test("assertAdminThemeTokens rejects unknown keys in sidebar / state", () => {
  const badSidebar = {
    ...DEFAULT_ADMIN_THEME_TOKENS,
    sidebar: { ...DEFAULT_ADMIN_THEME_TOKENS.sidebar, unknown: "#000000" },
  };
  expect(() => assertAdminThemeTokens(badSidebar)).toThrow("admin_theme_tokens_invalid");

  const badState = {
    ...DEFAULT_ADMIN_THEME_TOKENS,
    state: { ...DEFAULT_ADMIN_THEME_TOKENS.state, unknown: "#000000" },
  };
  expect(() => assertAdminThemeTokens(badState)).toThrow("admin_theme_tokens_invalid");
});

test("assertAdminThemeTokens rejects a numeric leaf", () => {
  const invalid = {
    ...DEFAULT_ADMIN_THEME_TOKENS,
    state: { ...DEFAULT_ADMIN_THEME_TOKENS.state, info: 1 },
  };
  expect(() => assertAdminThemeTokens(invalid)).toThrow("admin_theme_tokens_invalid");
});

test("assertKnownAdminThemeTokenShape tolerates MISSING new groups (legacy shape)", () => {
  const { primarySoft: _ps, effects: _fx, ...legacy } = DEFAULT_ADMIN_THEME_TOKENS;
  const legacyShape = {
    ...legacy,
    sidebar: {
      bg: "#f1efea",
      text: "#57534e",
      activeBg: "#ece6fb",
      activeText: "#6d28d9",
      hoverBg: "#efece6",
    },
    state: { success: "#16a34a", warning: "#d97706", danger: "#e11d48" },
  };
  expect(() => assertKnownAdminThemeTokenShape(legacyShape)).not.toThrow();
});

test("assertKnownAdminThemeTokenShape still rejects unknown keys / non-string leaves", () => {
  expect(() => assertKnownAdminThemeTokenShape({ unknownGroup: { bg: "#000000" } })).toThrow(
    "admin_theme_tokens_invalid"
  );
  expect(() => assertKnownAdminThemeTokenShape({ base: { bg: 123 } })).toThrow(
    "admin_theme_tokens_invalid"
  );
});

test("normalizeAdminThemeTokens back-fills NEW fields on a legacy row without throwing", () => {
  const legacyRow = {
    base: { bg: "#101010", surface: "#202020", text: "#fefefe", border: "#303030" },
    sidebar: {
      bg: "#f1efea",
      text: "#57534e",
      activeBg: "#ece6fb",
      activeText: "#6d28d9",
      hoverBg: "#efece6",
    },
    state: { success: "#16a34a", warning: "#d97706", danger: "#e11d48" },
  };

  const normalized = normalizeAdminThemeTokens(legacyRow);

  // Overridden values are preserved.
  expect(normalized.base.bg).toBe("#101010");
  // Missing NEW groups are filled from the violet/warm defaults.
  expect(normalized.primarySoft).toEqual(DEFAULT_ADMIN_THEME_TOKENS.primarySoft);
  expect(normalized.effects).toEqual(DEFAULT_ADMIN_THEME_TOKENS.effects);
  // Missing NEW keys inside an existing group are back-filled.
  expect(normalized.sidebar.accent).toBe(DEFAULT_ADMIN_THEME_TOKENS.sidebar.accent);
  expect(normalized.state.info).toBe(DEFAULT_ADMIN_THEME_TOKENS.state.info);
  expect(normalized.state.dangerForeground).toBe(DEFAULT_ADMIN_THEME_TOKENS.state.dangerForeground);
  // The result is a complete object accepted by the strict validator.
  expect(() => assertAdminThemeTokens(normalized)).not.toThrow();
});

test("normalizeAdminThemeTokens rejects unknown keys (does not silently drop)", () => {
  expect(() => normalizeAdminThemeTokens({ bogus: { x: "#000000" } })).toThrow(
    "admin_theme_tokens_invalid"
  );
});
