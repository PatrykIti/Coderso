import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseThemeJson, type ThemeJson } from "./schema";

export type ThemeMeta = ThemeJson & {
  rootDir: string;
};

let registry = new Map<string, ThemeMeta>();
let scanned = false;

const resolveThemesDir = () => {
  const envDir = process.env.THEMES_DIR?.trim();
  if (envDir && existsSync(envDir)) return envDir;

  const cwdDir = path.resolve(process.cwd(), "themes");
  if (existsSync(cwdDir)) return cwdDir;

  const parentDir = path.resolve(process.cwd(), "..", "themes");
  if (existsSync(parentDir)) return parentDir;

  return null;
};

const readThemeJson = async (themeDir: string) => {
  const filePath = path.join(themeDir, "theme.json");
  const file = await readFile(filePath, "utf8");
  const parsed = JSON.parse(file) as unknown;
  const meta = parseThemeJson(parsed);
  return { ...meta, rootDir: themeDir } satisfies ThemeMeta;
};

export async function scanThemes() {
  registry = new Map();
  scanned = true;

  const themesDir = resolveThemesDir();
  if (!themesDir) return registry;

  const entries = await readdir(themesDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeDir = path.join(themesDir, entry.name);
    const themeJsonPath = path.join(themeDir, "theme.json");
    if (!existsSync(themeJsonPath)) continue;

    try {
      const meta = await readThemeJson(themeDir);
      registry.set(meta.name, meta);
    } catch (error) {
      console.warn(`Theme '${entry.name}' ignored:`, error);
    }
  }

  return registry;
}

export async function ensureThemesLoaded() {
  if (!scanned) {
    await scanThemes();
  }
  return registry;
}

export function listThemes(): ThemeMeta[] {
  return Array.from(registry.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getTheme(name: string): ThemeMeta | null {
  return registry.get(name) ?? null;
}

export function resetThemeRegistry() {
  registry = new Map();
  scanned = false;
}
