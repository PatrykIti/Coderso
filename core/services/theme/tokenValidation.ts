import type { DesignTokenOverrides } from "./tokenTypes";

const tokenGroups = {
  colors: ["primary", "secondary", "accent"],
  neutrals: ["bg", "surface", "text"],
  spacing: ["xs", "sm", "md", "lg", "xl", "2xl"],
  radius: ["sm", "md", "lg", "xl"],
  typography: ["sans", "display", "sm", "md", "lg", "xl", "2xl"],
} as const;

type TokenGroupName = keyof typeof tokenGroups;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertStringRecord(
  value: Record<string, unknown>,
  allowed: readonly string[]
) {
  for (const [key, entry] of Object.entries(value)) {
    if (!allowed.includes(key)) {
      throw new Error("design_tokens_invalid");
    }
    if (typeof entry !== "string") {
      throw new Error("design_tokens_invalid");
    }
  }
}

export function assertTokenOverrides(
  input: unknown
): asserts input is DesignTokenOverrides {
  if (!isPlainObject(input)) {
    throw new Error("design_tokens_invalid");
  }

  const inputKeys = Object.keys(input);
  for (const key of inputKeys) {
    if (!(key in tokenGroups)) {
      throw new Error("design_tokens_invalid");
    }

    const group = input[key as TokenGroupName];
    if (!isPlainObject(group)) {
      throw new Error("design_tokens_invalid");
    }

    assertStringRecord(group, tokenGroups[key as TokenGroupName]);
  }
}
