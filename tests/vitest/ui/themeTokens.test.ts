import { expect, test } from "vitest";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";
import {
  toAdminThemeCssVariables,
  toCssVariables,
  toPageCanvasColorCssVariableMap,
} from "../../../core/ui/theme/tokenCss";

test("toCssVariables outputs root tokens", () => {
  const css = toCssVariables(DEFAULT_TOKENS);
  expect(css).toContain("--color-primary");
  expect(css).toContain(DEFAULT_TOKENS.colors.primary);
  expect(css).toContain("--background");
  expect(css).toContain("--font-sans");
});

test("toAdminThemeCssVariables outputs admin tokens", () => {
  const css = toAdminThemeCssVariables(DEFAULT_ADMIN_THEME_TOKENS);
  expect(css).toContain("--admin-base-bg");
  expect(css).toContain(DEFAULT_ADMIN_THEME_TOKENS.base.bg);
  expect(css).toContain("--admin-button-primary-bg");
});

test("toPageCanvasColorCssVariableMap emits site neutral colors + typography only (chrome-safe) (TASK-477-02)", () => {
  const map = toPageCanvasColorCssVariableMap(DEFAULT_TOKENS);
  // The 3 neutral page-color vars the admin canvas otherwise lacks, so neutral
  // block colors are WYSIWYG in-editor.
  expect(map["--color-bg"]).toBe(DEFAULT_TOKENS.neutrals.bg);
  expect(map["--color-surface"]).toBe(DEFAULT_TOKENS.neutrals.surface);
  expect(map["--color-text"]).toBe(DEFAULT_TOKENS.neutrals.text);
  // Site typography carried through (existing canvas behavior).
  expect(map["--font-sans"]).toBe(DEFAULT_TOKENS.typography.sans);
  // Brand colors, border, and shadcn aliases are NOT re-emitted on the canvas
  // frame — they already resolve via the admin @theme and re-emitting them would
  // override editor chrome (ring-primary, borders).
  expect(map["--color-primary"]).toBeUndefined();
  expect(map["--color-secondary"]).toBeUndefined();
  expect(map["--color-accent"]).toBeUndefined();
  expect(map["--color-border"]).toBeUndefined();
  expect(map["--background"]).toBeUndefined();
  expect(map["--foreground"]).toBeUndefined();
});
