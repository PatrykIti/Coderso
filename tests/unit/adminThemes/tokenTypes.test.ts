import { expect, test } from "bun:test";

import {
  DEFAULT_ADMIN_THEME_TOKENS,
  DEFAULT_ADMIN_THEME_TOKENS_DARK,
} from "../../../core/services/adminThemes/tokenTypes";
import {
  getDefaultAdminThemeTokens,
  mergeAdminThemeTokens,
} from "../../../core/services/adminThemes/tokenUtils";
import { assertAdminThemeTokens } from "../../../core/services/adminThemes/tokenValidation";

test("DEFAULT_ADMIN_THEME_TOKENS carries every NEW field with violet/warm values", () => {
  expect(DEFAULT_ADMIN_THEME_TOKENS.primarySoft).toEqual({
    bg: "#f1ecfe",
    text: "#6d28d9",
  });
  expect(DEFAULT_ADMIN_THEME_TOKENS.sidebar.muted).toBe("#a8a29a");
  expect(DEFAULT_ADMIN_THEME_TOKENS.sidebar.accent).toBe("#ece6fb");
  expect(DEFAULT_ADMIN_THEME_TOKENS.sidebar.accentForeground).toBe("#6d28d9");
  expect(DEFAULT_ADMIN_THEME_TOKENS.sidebar.border).toBe("#e7e3db");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.info).toBe("#2563eb");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.infoForeground).toBe("#ffffff");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.successForeground).toBe("#ffffff");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.warningForeground).toBe("#ffffff");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.dangerForeground).toBe("#ffffff");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.successSoft).toBe("#e7f6ec");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.warningSoft).toBe("#fdf0db");
  expect(DEFAULT_ADMIN_THEME_TOKENS.state.infoSoft).toBe("#e7eefe");
  expect(DEFAULT_ADMIN_THEME_TOKENS.effects.shadowSoft).toContain("rgba(28, 25, 23");
  expect(DEFAULT_ADMIN_THEME_TOKENS.effects.shadowCard).toContain("rgba(28, 25, 23");
  expect(DEFAULT_ADMIN_THEME_TOKENS.effects.shadowPop).toContain("rgba(28, 25, 23");
  // Re-valued (warm/violet) base + primary defaults.
  expect(DEFAULT_ADMIN_THEME_TOKENS.base.bg).toBe("#f6f5f2");
  expect(DEFAULT_ADMIN_THEME_TOKENS.buttons.primary.bg).toBe("#7c3aed");
  expect(DEFAULT_ADMIN_THEME_TOKENS.typography.sans).toContain("Inter");
});

test("DEFAULT_ADMIN_THEME_TOKENS is a valid strict token object", () => {
  expect(() => assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS)).not.toThrow();
});

test("DEFAULT_ADMIN_THEME_TOKENS_DARK is a full, valid, dark-chrome palette", () => {
  expect(() => assertAdminThemeTokens(DEFAULT_ADMIN_THEME_TOKENS_DARK)).not.toThrow();
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.base.bg).toBe("#18171a");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.buttons.primary.bg).toBe("#8b5cf6");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.sidebar.bg).toBe("#1c1b1f");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.topbar.bg).toBe("#18171a");
  // Non-white solid-status foregrounds in dark (L01 §B fix).
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.state.dangerForeground).toBe("#1c1a17");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.state.successForeground).toBe("#06281c");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.state.warningForeground).toBe("#2a1c05");
  expect(DEFAULT_ADMIN_THEME_TOKENS_DARK.state.infoForeground).toBe("#07203f");
});

test("getDefaultAdminThemeTokens returns a deep clone (mutation-safe)", () => {
  const a = getDefaultAdminThemeTokens();
  a.primarySoft.bg = "#000000";
  expect(DEFAULT_ADMIN_THEME_TOKENS.primarySoft.bg).toBe("#f1ecfe");
});

test("mergeAdminThemeTokens(defaults, {}) returns a complete object", () => {
  const merged = mergeAdminThemeTokens(getDefaultAdminThemeTokens(), {});
  expect(() => assertAdminThemeTokens(merged)).not.toThrow();
  expect(merged.primarySoft).toEqual(DEFAULT_ADMIN_THEME_TOKENS.primarySoft);
  expect(merged.effects).toEqual(DEFAULT_ADMIN_THEME_TOKENS.effects);
});

test("mergeAdminThemeTokens back-fills NEW groups for a legacy (pre-479-05) shape", () => {
  const legacy: Record<string, unknown> = {
    base: DEFAULT_ADMIN_THEME_TOKENS.base,
    buttons: DEFAULT_ADMIN_THEME_TOKENS.buttons,
    inputs: DEFAULT_ADMIN_THEME_TOKENS.inputs,
    sidebar: {
      bg: "#ffffff",
      text: "#64748b",
      activeBg: "#e0f2fe",
      activeText: "#1d4ed8",
      hoverBg: "#f1f5f9",
    },
    topbar: DEFAULT_ADMIN_THEME_TOKENS.topbar,
    card: DEFAULT_ADMIN_THEME_TOKENS.card,
    typography: DEFAULT_ADMIN_THEME_TOKENS.typography,
    state: { success: "#16a34a", warning: "#f59e0b", danger: "#ef4444" },
  };

  const merged = mergeAdminThemeTokens(getDefaultAdminThemeTokens(), legacy as never);

  expect(() => assertAdminThemeTokens(merged)).not.toThrow();
  // Legacy overrides preserved.
  expect(merged.sidebar.activeBg).toBe("#e0f2fe");
  expect(merged.state.danger).toBe("#ef4444");
  // NEW keys/groups filled from defaults.
  expect(merged.sidebar.accent).toBe(DEFAULT_ADMIN_THEME_TOKENS.sidebar.accent);
  expect(merged.state.info).toBe(DEFAULT_ADMIN_THEME_TOKENS.state.info);
  expect(merged.primarySoft).toEqual(DEFAULT_ADMIN_THEME_TOKENS.primarySoft);
  expect(merged.effects).toEqual(DEFAULT_ADMIN_THEME_TOKENS.effects);
});
