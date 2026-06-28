import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "bun:test";

import { parseThemeJson } from "../../../core/themes/schema";

const THEME_JSON_PATH = path.resolve(import.meta.dir, "../../../themes/admin-default/theme.json");

function readAdminDefaultThemeJson(): unknown {
  return JSON.parse(readFileSync(THEME_JSON_PATH, "utf8")) as unknown;
}

test("themes/admin-default/theme.json parses under the front theme schema", () => {
  const raw = readAdminDefaultThemeJson();
  expect(() => parseThemeJson(raw)).not.toThrow();

  const meta = parseThemeJson(raw);
  expect(meta.name).toBe("admin-default");
  expect(meta.version).toBe("1.1.0");
  expect(meta.templates).toEqual(["page", "content", "error"]);
});

test("themes/admin-default/theme.json carries the violet/warm 'Soft & Friendly' palette", () => {
  const meta = parseThemeJson(readAdminDefaultThemeJson());
  const tokens = meta.tokens;
  expect(tokens).toBeDefined();
  if (!tokens) throw new Error("expected tokens");

  // Violet accent.
  expect(tokens.colors?.primary).toBe("#7c3aed");
  expect(tokens.colors?.secondary).toBe("#f1efeb");
  expect(tokens.colors?.accent).toBe("#ece6fb");
  // Warm near-white canvas.
  expect(tokens.neutrals?.bg).toBe("#f6f5f2");
  expect(tokens.neutrals?.surface).toBe("#f3f1ed");
  expect(tokens.neutrals?.border).toBe("#eae7e0");
  expect(tokens.neutrals?.text).toBe("#1c1a17");
  // Softer rounding.
  expect(tokens.radius?.sm).toBe("8px");
  expect(tokens.radius?.xl).toBe("24px");
  // Inter font stack.
  expect(tokens.typography?.sans).toContain("Inter");
  expect(tokens.typography?.display).toContain("Inter Tight");
});
