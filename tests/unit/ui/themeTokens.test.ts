import { expect, test } from "bun:test";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { toCssVariables } from "../../../core/ui/theme/tokenCss";

test("toCssVariables outputs root tokens", () => {
  const css = toCssVariables(DEFAULT_TOKENS);
  expect(css).toContain("--color-primary");
  expect(css).toContain(DEFAULT_TOKENS.colors.primary);
  expect(css).toContain("--font-sans");
});
