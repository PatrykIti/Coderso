import { expect, test } from "vitest";

import {
  compactObject,
  compactStyle,
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
