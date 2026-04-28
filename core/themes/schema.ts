import type { DesignTokenOverrides } from "../services/theme/tokenTypes";
import { assertTokenOverrides } from "../services/theme/tokenValidation";

export type ThemeJson = {
  name: string;
  version: string;
  templates: string[];
  tokens?: DesignTokenOverrides;
  description?: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

export function parseThemeJson(input: unknown): ThemeJson {
  if (!isPlainObject(input)) {
    throw new Error("theme_invalid");
  }

  const name = input.name;
  const version = input.version;
  const templates = input.templates;

  if (!isNonEmptyString(name) || !isNonEmptyString(version)) {
    throw new Error("theme_invalid");
  }

  if (!isStringArray(templates) || templates.length === 0) {
    throw new Error("theme_invalid");
  }

  if (input.tokens !== undefined) {
    assertTokenOverrides(input.tokens);
  }

  return {
    name: name.trim(),
    version: version.trim(),
    templates: templates.map((entry) => entry.trim()).filter(Boolean),
    tokens: input.tokens as DesignTokenOverrides | undefined,
    description: isNonEmptyString(input.description) ? input.description.trim() : undefined,
  };
}
