import { expect, test } from "bun:test";

import {
  DEFAULT_ADMIN_THEME_TOKENS,
  DEFAULT_ADMIN_THEME_TOKENS_DARK,
} from "../../../core/services/adminThemes/tokenTypes";
import {
  toAdminThemeCssVariables,
  toAdminThemeCssVariableMap,
} from "../../../core/ui/theme/tokenCss";

const NEW_ADMIN_VARS = [
  "--admin-primary-soft",
  "--admin-primary-soft-text",
  "--admin-state-info",
  "--admin-state-info-foreground",
  "--admin-state-success-foreground",
  "--admin-state-warning-foreground",
  "--admin-state-danger-foreground",
  "--admin-state-success-soft",
  "--admin-state-warning-soft",
  "--admin-state-info-soft",
  "--admin-sidebar-muted",
  "--admin-sidebar-accent",
  "--admin-sidebar-accent-foreground",
  "--admin-sidebar-border",
  "--admin-shadow-soft",
  "--admin-shadow-card",
  "--admin-shadow-pop",
] as const;

test("toAdminThemeCssVariables wraps the light block in :root and contains all NEW vars", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS);
  expect(css.startsWith(":root{")).toBe(true);
  expect(css.endsWith(";}")).toBe(true);
  for (const name of NEW_ADMIN_VARS) {
    expect(css).toContain(`${name}:`);
  }
  expect(css).toContain(`--admin-primary-soft:${DEFAULT_ADMIN_THEME_TOKENS.primarySoft.bg}`);
  expect(css).toContain(`--admin-shadow-card:${DEFAULT_ADMIN_THEME_TOKENS.effects.shadowCard}`);
});

test("toAdminThemeCssVariables emits the dark block under :root.dark with dark chrome hexes", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS_DARK, ":root.dark");
  expect(css.startsWith(":root.dark{")).toBe(true);
  expect(css.endsWith(";}")).toBe(true);
  expect(css).toContain("--admin-base-bg:#18171a");
  expect(css).toContain("--admin-button-primary-bg:#8b5cf6");
  expect(css).toContain("--admin-sidebar-bg:#1c1b1f");
  expect(css).toContain("--admin-topbar-bg:#18171a");
  expect(css).toContain("--admin-state-danger-foreground:#1c1a17");
});

test("toAdminThemeCssVariables default selector is backward-compatible (:root)", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS);
  expect(css).toContain(":root{");
  expect(css).not.toContain(":root.dark");
});

test("toAdminThemeCssVariableMap carries all NEW vars for the editor live preview", () => {
  const map = toAdminThemeCssVariableMap(DEFAULT_ADMIN_THEME_TOKENS);
  for (const name of NEW_ADMIN_VARS) {
    expect(map[name]).toBeDefined();
  }
  expect(map["--admin-primary-soft"]).toBe(DEFAULT_ADMIN_THEME_TOKENS.primarySoft.bg);
  expect(map["--admin-sidebar-accent"]).toBe(DEFAULT_ADMIN_THEME_TOKENS.sidebar.accent);
  expect(map["--admin-state-info"]).toBe(DEFAULT_ADMIN_THEME_TOKENS.state.info);
  expect(map["--admin-shadow-pop"]).toBe(DEFAULT_ADMIN_THEME_TOKENS.effects.shadowPop);
});
