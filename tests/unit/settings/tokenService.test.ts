import { expect, test } from "bun:test";
import { DEFAULT_TOKENS } from "../../../core/services/theme/tokenTypes";
import { mergeTokens } from "../../../core/services/theme/tokenService";

test("mergeTokens applies overrides", () => {
  const merged = mergeTokens(DEFAULT_TOKENS, {
    colors: { primary: "#000000" },
    spacing: { md: "2rem" },
    typography: { display: "Futura, sans-serif" },
  });

  expect(merged.colors.primary).toBe("#000000");
  expect(merged.colors.secondary).toBe(DEFAULT_TOKENS.colors.secondary);
  expect(merged.spacing.md).toBe("2rem");
  expect(merged.spacing.lg).toBe(DEFAULT_TOKENS.spacing.lg);
  expect(merged.typography.display).toBe("Futura, sans-serif");
});
