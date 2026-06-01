import { expect, test } from "vitest";

import {
  compactObject,
  compactStyle,
  resolveClearableCssColorValue,
  resolveClearableStyleValue,
} from "../../../core/widgets/core/clearableStyle";

test("resolveClearableStyleValue keeps intentional transparent values", () => {
  expect(resolveClearableStyleValue("transparent")).toBe("transparent");
  expect(resolveClearableStyleValue(" rgba(0,0,0,0.2) ")).toBe("rgba(0,0,0,0.2)");
});

test("resolveClearableStyleValue treats missing and empty values as cleared", () => {
  expect(resolveClearableStyleValue(undefined)).toBeUndefined();
  expect(resolveClearableStyleValue(null)).toBeUndefined();
  expect(resolveClearableStyleValue("")).toBeUndefined();
  expect(resolveClearableStyleValue("   ")).toBeUndefined();
});

test("compact helpers omit only cleared fields", () => {
  expect(
    compactStyle({
      backgroundColor: undefined,
      borderColor: "transparent",
    })
  ).toEqual({ borderColor: "transparent" });

  expect(compactObject({ a: undefined, b: "", c: "value" })).toEqual({ c: "value" });
});

test("resolveClearableCssColorValue accepts bounded authorable color grammar", () => {
  expect(resolveClearableCssColorValue("#abc")).toBe("#abc");
  expect(resolveClearableCssColorValue("#aabbccdd")).toBe("#aabbccdd");
  expect(resolveClearableCssColorValue(" rgb(12, 24, 36) ")).toBe("rgb(12, 24, 36)");
  expect(resolveClearableCssColorValue("rgba(12, 24, 36, 0.4)")).toBe("rgba(12, 24, 36, 0.4)");
  expect(resolveClearableCssColorValue("hsl(210, 50%, 40%)")).toBe("hsl(210, 50%, 40%)");
  expect(resolveClearableCssColorValue("hsla(210, 50%, 40%, 25%)")).toBe(
    "hsla(210, 50%, 40%, 25%)"
  );
  expect(resolveClearableCssColorValue("var(--color-primary)")).toBe("var(--color-primary)");
  expect(resolveClearableCssColorValue("transparent")).toBe("transparent");
  expect(resolveClearableCssColorValue("currentcolor")).toBe("currentColor");
  expect(resolveClearableCssColorValue("inherit")).toBe("inherit");
});

test("resolveClearableCssColorValue rejects inline CSS injection strings", () => {
  expect(resolveClearableCssColorValue("url(javascript:alert(1))")).toBeUndefined();
  expect(resolveClearableCssColorValue("expression(alert(1))")).toBeUndefined();
  expect(resolveClearableCssColorValue("javascript:alert(1)")).toBeUndefined();
  expect(resolveClearableCssColorValue("linear-gradient(red, blue)")).toBeUndefined();
  expect(resolveClearableCssColorValue("rgb(999, 0, 0)")).toBeUndefined();
  expect(resolveClearableCssColorValue("rgba(0, 0, 0, 2)")).toBeUndefined();
  expect(resolveClearableCssColorValue("var(--section-surface)")).toBeUndefined();
  expect(resolveClearableCssColorValue("")).toBeUndefined();
});
