import { expect, test } from "vitest";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { DEFAULT_ADMIN_THEME_TOKENS } from "../../../core/services/adminThemes/tokenTypes";
import {
  adminBrandColorCssVariableMap,
  toAdminThemeCssVariables,
  toCssVariableMap,
  toCssVariables,
  toPageCanvasBrandColorCssVariableMap,
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

test("adminBrandColorCssVariableMap re-asserts the admin brand on chrome (TASK-481-01-L02)", () => {
  // Mirror of the globals.css `@theme {` brand mapping, applied inline on the
  // canvas section/block chrome frames so nested `data-page-editor-content`
  // scopes cannot recolor chrome with the SITE brand vars.
  expect(adminBrandColorCssVariableMap).toEqual({
    "--color-primary": "var(--primary)",
    "--color-secondary": "var(--secondary)",
    "--color-accent": "var(--accent)",
    "--color-border": "var(--border)",
  });
  // The three NEUTRAL vars are intentionally NOT re-asserted (no admin chrome
  // consumes them; re-asserting would fight the TASK-477-02 neutral emission).
  expect(adminBrandColorCssVariableMap["--color-bg"]).toBeUndefined();
  expect(adminBrandColorCssVariableMap["--color-surface"]).toBeUndefined();
  expect(adminBrandColorCssVariableMap["--color-text"]).toBeUndefined();
});

const BRAND_CSS_VAR_KEYS = [
  "--color-primary",
  "--color-secondary",
  "--color-accent",
  "--color-border",
] as const;

test("toPageCanvasBrandColorCssVariableMap emits exactly the four SITE brand vars from DEFAULT_TOKENS (TASK-481-02-L01)", () => {
  const map = toPageCanvasBrandColorCssVariableMap(DEFAULT_TOKENS);
  // Exact key set: no neutrals, no typography, no shadcn aliases.
  expect(Object.keys(map).sort()).toEqual([...BRAND_CSS_VAR_KEYS].sort());
  expect(map["--color-primary"]).toBe(DEFAULT_TOKENS.colors.primary);
  expect(map["--color-secondary"]).toBe(DEFAULT_TOKENS.colors.secondary);
  expect(map["--color-accent"]).toBe(DEFAULT_TOKENS.colors.accent);
  // --color-border is sourced from neutrals, NOT colors.
  expect(map["--color-border"]).toBe(DEFAULT_TOKENS.neutrals.border);
});

test("toPageCanvasBrandColorCssVariableMap follows a custom-token fixture (TASK-481-02-L01)", () => {
  const customTokens = {
    ...DEFAULT_TOKENS,
    colors: {
      primary: "#111827",
      secondary: "#7c3aed",
      accent: "#dc2626",
    },
    neutrals: {
      ...DEFAULT_TOKENS.neutrals,
      border: "#334155",
    },
  };
  const map = toPageCanvasBrandColorCssVariableMap(customTokens);
  expect(map).toEqual({
    "--color-primary": customTokens.colors.primary,
    "--color-secondary": customTokens.colors.secondary,
    "--color-accent": customTokens.colors.accent,
    "--color-border": customTokens.neutrals.border,
  });
});

test("toPageCanvasBrandColorCssVariableMap values match toCssVariableMap for the same tokens (TASK-481-02-L01)", () => {
  const map = toPageCanvasBrandColorCssVariableMap(DEFAULT_TOKENS);
  const frontMap = toCssVariableMap(DEFAULT_TOKENS);
  for (const key of BRAND_CSS_VAR_KEYS) {
    expect(map[key]).toBe(frontMap[key]);
  }
});

test("toPageCanvasBrandColorCssVariableMap shares NO keys with the frame map (TASK-481-02-L01)", () => {
  const brandMap = toPageCanvasBrandColorCssVariableMap(DEFAULT_TOKENS);
  const frameMap = toPageCanvasColorCssVariableMap(DEFAULT_TOKENS);
  const overlap = Object.keys(brandMap).filter((key) => key in frameMap);
  expect(overlap).toEqual([]);
});
