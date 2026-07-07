import { expect, test } from "vitest";

import {
  FORM_THEME_DEFAULTS,
  buildFormThemeStyleVars,
  formThemeAlignClass,
  formThemeBorderWidthClass,
  formThemeButtonAlignClass,
  formThemeColumnsClass,
  formThemeFontFamilyClass,
  formThemeGapClass,
  formThemeInputSizeClass,
  formThemePaddingClass,
  formThemeRadiusClass,
  formThemeShadowClass,
  formThemeTitleSizeClass,
  formThemeTitleWeightClass,
  formThemeWidthClass,
  resolveFormTheme,
} from "../../../core/services/forms/formTheme";

test("resolveFormTheme(undefined) reproduces the prototype defaults", () => {
  const resolved = resolveFormTheme(undefined);
  expect(resolved.layout.width).toBe("md");
  expect(resolved.layout.align).toBe("center");
  expect(resolved.layout.columns).toBe(1);
  expect(resolved.layout.fieldGap).toBe("md");
  expect(resolved.surface.card).toBe(true);
  expect(resolved.surface.padding).toBe("lg");
  expect(resolved.surface.radius).toBe("xl");
  expect(resolved.surface.shadow).toBe("soft");
  expect(resolved.surface.borderWidth).toBe("sm");
  expect(resolved.typography.fontFamily).toBe("display");
  expect(resolved.typography.titleSize).toBe("lg");
  expect(resolved.typography.titleWeight).toBe("semibold");
  expect(resolved.input.size).toBe("md");
  expect(resolved.input.radius).toBe("lg");
  expect(resolved.submit.fullWidth).toBe(true);
  expect(resolved.submit.radius).toBe("lg");
  // optional color tokens stay undefined so no inline vars are emitted by default
  expect(resolved.surface.background).toBeUndefined();
  expect(resolved.submit.background).toBeUndefined();
});

test("prototype defaults map to the exact prototype classes", () => {
  const d = FORM_THEME_DEFAULTS;
  expect(formThemeWidthClass[d.layout.width]).toBe("max-w-lg");
  expect(formThemeAlignClass[d.layout.align]).toBe("mx-auto");
  expect(formThemeColumnsClass[d.layout.columns]).toBe("grid-cols-1");
  expect(formThemeGapClass[d.layout.fieldGap]).toBe("gap-4");
  expect(formThemePaddingClass[d.surface.padding]).toBe("p-6");
  expect(formThemeRadiusClass[d.surface.radius]).toBe("rounded-2xl");
  expect(formThemeShadowClass[d.surface.shadow]).toBe("shadow-soft");
  expect(formThemeBorderWidthClass[d.surface.borderWidth]).toBe("border");
  expect(formThemeFontFamilyClass[d.typography.fontFamily]).toBe("font-display");
  expect(formThemeTitleSizeClass[d.typography.titleSize]).toBe("text-lg");
  expect(formThemeTitleWeightClass[d.typography.titleWeight]).toBe("font-semibold");
  expect(formThemeInputSizeClass[d.input.size]).toBe("h-9 text-sm");
  expect(formThemeRadiusClass[d.input.radius]).toBe("rounded-xl");
  expect(formThemeRadiusClass[d.submit.radius]).toBe("rounded-xl");
});

test("resolveFormTheme deep-merges per group and key", () => {
  const resolved = resolveFormTheme({ layout: { width: "lg" } });
  expect(resolved.layout.width).toBe("lg");
  // sibling keys + other groups keep defaults
  expect(resolved.layout.align).toBe("center");
  expect(resolved.surface.radius).toBe("xl");
});

test("resolveFormTheme respects explicit false booleans", () => {
  const resolved = resolveFormTheme({
    surface: { card: false },
    submit: { fullWidth: false },
  });
  expect(resolved.surface.card).toBe(false);
  expect(resolved.submit.fullWidth).toBe(false);
});

test("resolveFormTheme re-runs colors through the CSS policy (defence in depth)", () => {
  const resolved = resolveFormTheme({
    surface: { background: "#abcdef", borderColor: "url(evil)" },
  });
  expect(resolved.surface.background).toBe("#abcdef");
  expect(resolved.surface.borderColor).toBeUndefined();
});

test("token class maps cover their full enum sets", () => {
  expect(Object.keys(formThemeWidthClass).sort()).toEqual(["full", "lg", "md", "sm", "xl"].sort());
  expect(Object.keys(formThemeColumnsClass).sort()).toEqual(["1", "2"]);
  expect(formThemeColumnsClass[1]).toBe("grid-cols-1");
  expect(formThemeColumnsClass[2]).toBe("md:grid-cols-2");
  expect(Object.keys(formThemeAlignClass).sort()).toEqual(["center", "left", "right"].sort());
  expect(formThemeButtonAlignClass.full).toBe("w-full");
  expect(Object.keys(formThemeButtonAlignClass).sort()).toEqual(
    ["center", "full", "left", "right"].sort()
  );
  expect(Object.keys(formThemeGapClass).sort()).toEqual(["lg", "md", "sm"].sort());
  expect(Object.keys(formThemeRadiusClass).sort()).toEqual(["lg", "md", "none", "sm", "xl"].sort());
  expect(Object.keys(formThemePaddingClass).sort()).toEqual(["lg", "md", "sm", "xl"].sort());
  expect(formThemeShadowClass.soft).toBe("shadow-soft");
  expect(Object.keys(formThemeShadowClass).sort()).toEqual(
    ["lg", "md", "none", "sm", "soft"].sort()
  );
  expect(Object.keys(formThemeBorderWidthClass).sort()).toEqual(["md", "none", "sm"].sort());
  expect(Object.keys(formThemeInputSizeClass).sort()).toEqual(["lg", "md", "sm"].sort());
  expect(Object.keys(formThemeTitleSizeClass).sort()).toEqual(["lg", "md", "sm", "xl"].sort());
  expect(formThemeTitleWeightClass.normal).toBe("font-normal");
  expect(Object.keys(formThemeTitleWeightClass).sort()).toEqual(
    ["bold", "medium", "normal", "semibold"].sort()
  );
  expect(Object.keys(formThemeFontFamilyClass).sort()).toEqual(
    ["display", "inherit", "mono", "sans", "serif"].sort()
  );
});

test("buildFormThemeStyleVars emits present-only pinned CSS vars", () => {
  const noVars = buildFormThemeStyleVars(resolveFormTheme(undefined));
  expect(noVars).toEqual({});

  const vars = buildFormThemeStyleVars(
    resolveFormTheme({
      surface: { background: "#ffffff", borderColor: "#000000" },
      typography: { titleColor: "#111111", labelColor: "#222222", helperColor: "#333333" },
      input: { background: "#eeeeee", borderColor: "#dddddd", textColor: "#cccccc" },
      submit: { background: "#ff0000", textColor: "#ffffff" },
    })
  );
  expect(vars).toEqual({
    "--form-surface-bg": "#ffffff",
    "--form-border": "#000000",
    "--form-title": "#111111",
    "--form-label": "#222222",
    "--form-helper": "#333333",
    "--form-input-bg": "#eeeeee",
    "--form-input-border": "#dddddd",
    "--form-input-text": "#cccccc",
    "--form-submit-bg": "#ff0000",
    "--form-submit-text": "#ffffff",
  });
});
