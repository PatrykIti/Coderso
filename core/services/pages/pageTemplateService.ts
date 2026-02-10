import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { ensureThemesLoaded } from "../../themes/registry";
import { getTheme } from "../../themes/registry";
import { resolveTemplate } from "../../themes/resolver";
import type { TemplateCache } from "../../themes/cache";

export const DEFAULT_PAGE_TEMPLATE_KEY = "landing";

const normalizeThemeName = (value?: string | null) =>
  value && value.trim().length > 0 ? value.trim() : "default";

export type PageTemplateOption = {
  key: string;
  label: string;
  source: "theme" | "plugin" | "core";
};

export function normalizePageTemplateKey(input: unknown): string {
  if (typeof input !== "string") return DEFAULT_PAGE_TEMPLATE_KEY;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return DEFAULT_PAGE_TEMPLATE_KEY;

  const normalized = trimmed
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  return normalized || DEFAULT_PAGE_TEMPLATE_KEY;
}

const resolveFirstExisting = (candidates: string[]) => {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

const resolveDefaultRoots = () => {
  const cwd = process.cwd();
  const pluginsRoot =
    resolveFirstExisting([
      path.resolve(cwd, "plugins"),
      path.resolve(cwd, "core", "plugins"),
      path.resolve(cwd, "..", "core", "plugins"),
    ]) ?? path.resolve(cwd, "plugins");

  const coreRoot =
    resolveFirstExisting([
      path.resolve(cwd, "templates"),
      path.resolve(cwd, "core", "templates"),
      path.resolve(cwd, "..", "core", "templates"),
    ]) ?? path.resolve(cwd, "templates");

  return { pluginsRoot, coreRoot };
};

const keyToLabel = (key: string) =>
  key
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");

const listPageTemplateKeysInDir = async (dir: string) => {
  if (!existsSync(dir)) return [] as string[];
  const entries = await readdir(dir, { withFileTypes: true });
  const keys: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const match = /^page-(.+)\.tsx$/.exec(entry.name);
    if (!match) continue;
    const key = normalizePageTemplateKey(match[1]);
    if (key) keys.push(key);
  }
  return keys;
};

export async function listPageTemplateOptions(options: {
  themeName?: string | null;
}): Promise<{ themeName: string; templates: PageTemplateOption[] }> {
  await ensureThemesLoaded();

  const themeName = normalizeThemeName(options.themeName);
  const themeRoot = getTheme(themeName)?.rootDir ?? null;
  const { pluginsRoot, coreRoot } = resolveDefaultRoots();

  const themeKeys = themeRoot
    ? await listPageTemplateKeysInDir(path.join(themeRoot, "templates"))
    : [];
  const pluginKeys = await listPageTemplateKeysInDir(path.join(pluginsRoot, "views"));
  const coreKeys = await listPageTemplateKeysInDir(coreRoot);

  const map = new Map<string, PageTemplateOption>();
  for (const key of themeKeys) {
    map.set(key, { key, label: keyToLabel(key), source: "theme" });
  }
  for (const key of pluginKeys) {
    if (map.has(key)) continue;
    map.set(key, { key, label: keyToLabel(key), source: "plugin" });
  }
  for (const key of coreKeys) {
    if (map.has(key)) continue;
    map.set(key, { key, label: keyToLabel(key), source: "core" });
  }

  if (!map.has(DEFAULT_PAGE_TEMPLATE_KEY)) {
    map.set(DEFAULT_PAGE_TEMPLATE_KEY, {
      key: DEFAULT_PAGE_TEMPLATE_KEY,
      label: keyToLabel(DEFAULT_PAGE_TEMPLATE_KEY),
      source: "core",
    });
  }

  const templates = Array.from(map.values());
  templates.sort((a, b) => {
    if (a.key === DEFAULT_PAGE_TEMPLATE_KEY) return -1;
    if (b.key === DEFAULT_PAGE_TEMPLATE_KEY) return 1;
    return a.label.localeCompare(b.label);
  });

  return { themeName, templates };
}

export async function resolvePageTemplatePath(options: {
  themeName?: string | null;
  templateKey?: unknown;
  cache?: TemplateCache;
}): Promise<string | null> {
  await ensureThemesLoaded();

  const themeName = normalizeThemeName(options.themeName);
  const key = normalizePageTemplateKey(options.templateKey);

  return resolveTemplate({
    themeName,
    type: "page",
    key,
    cache: options.cache,
  });
}
