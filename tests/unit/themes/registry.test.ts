import { afterEach, expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  listThemes,
  resetThemeRegistry,
  scanThemes,
} from "../../../core/themes/registry";

const createTheme = async (baseDir: string, name: string, payload: unknown) => {
  const themeDir = path.join(baseDir, name);
  await mkdir(themeDir, { recursive: true });
  await writeFile(path.join(themeDir, "theme.json"), JSON.stringify(payload, null, 2));
};

afterEach(() => {
  delete process.env.THEMES_DIR;
  resetThemeRegistry();
});

test("scanThemes indexes valid themes and sorts by name", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-themes-"));
  process.env.THEMES_DIR = tempDir;

  await createTheme(tempDir, "beta", {
    name: "beta",
    version: "1.0.0",
    templates: ["page", "content", "error"],
  });
  await createTheme(tempDir, "alpha", {
    name: "alpha",
    version: "1.0.0",
    templates: ["page"],
    tokens: { colors: { primary: "#111111" } },
  });

  await scanThemes();
  const themes = listThemes();
  expect(themes.map((theme) => theme.name)).toEqual(["alpha", "beta"]);
});

test("scanThemes ignores invalid theme.json files", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-themes-"));
  process.env.THEMES_DIR = tempDir;

  await createTheme(tempDir, "broken", { name: "broken" });

  const warn = console.warn;
  const warnings: unknown[][] = [];
  console.warn = (...args: unknown[]) => {
    warnings.push(args);
  };

  try {
    await scanThemes();
    const themes = listThemes();
    expect(themes).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.[0]).toBe("Theme 'broken' ignored:");
  } finally {
    console.warn = warn;
  }
});
