import { existsSync } from "node:fs";
import path from "node:path";

import { buildTemplateCacheKey, type TemplateCache } from "./cache";
import { getTheme, type ThemeMeta } from "./registry";

export type TemplateType = "page" | "content" | "error";

export type TemplateResolveInput = {
  themeName: string;
  type: TemplateType;
  key?: string;
  themeRoot?: string;
  pluginsRoot?: string;
  coreRoot?: string;
  cache?: TemplateCache;
};

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

const buildCandidates = (root: string, type: TemplateType, key?: string) => {
  const base = path.join(root, "templates");
  const entries: string[] = [];
  if (key) {
    entries.push(path.join(base, `${type}-${key}.tsx`));
  }
  entries.push(path.join(base, `${type}.tsx`));
  return entries;
};

export function resolveTemplate(input: TemplateResolveInput): string | null {
  const cacheKey = input.cache
    ? buildTemplateCacheKey(input.themeName, input.type, input.key)
    : null;
  if (cacheKey && input.cache?.has(cacheKey)) {
    return input.cache.get(cacheKey) ?? null;
  }

  const themeRoot = input.themeRoot ?? getTheme(input.themeName)?.rootDir;
  const { pluginsRoot, coreRoot } = resolveDefaultRoots();
  const pluginsBase = input.pluginsRoot ?? pluginsRoot;
  const coreBase = input.coreRoot ?? coreRoot;

  const candidates: string[] = [];

  if (themeRoot) {
    candidates.push(...buildCandidates(themeRoot, input.type, input.key));
  }

  if (pluginsBase) {
    const pluginViews = path.join(pluginsBase, "views");
    if (input.key) {
      candidates.push(path.join(pluginViews, `${input.type}-${input.key}.tsx`));
    }
    candidates.push(path.join(pluginViews, `${input.type}.tsx`));
  }

  if (coreBase) {
    const coreTemplates = coreBase;
    if (input.key) {
      candidates.push(path.join(coreTemplates, `${input.type}-${input.key}.tsx`));
    }
    candidates.push(path.join(coreTemplates, `${input.type}.tsx`));
  }

  let resolved: string | null = null;
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      resolved = candidate;
      break;
    }
  }

  if (cacheKey) {
    input.cache?.set(cacheKey, resolved);
  }

  return resolved;
}

export function resolveTemplateOr404(input: TemplateResolveInput): string {
  const resolved = resolveTemplate(input);
  if (resolved) return resolved;
  const coreRoot = input.coreRoot ?? resolveDefaultRoots().coreRoot;
  return path.join(coreRoot, "404.tsx");
}

export function resolveTemplateForTheme(theme: ThemeMeta, type: TemplateType, key?: string) {
  return resolveTemplate({ themeName: theme.name, themeRoot: theme.rootDir, type, key });
}
