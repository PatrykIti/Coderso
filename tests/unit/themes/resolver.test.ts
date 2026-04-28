import { expect, test } from "bun:test";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { createTemplateCache } from "../../../core/themes/cache";
import { resolveTemplate, resolveTemplateOr404 } from "../../../core/themes/resolver";

const writeTemplate = async (dir: string, relativePath: string) => {
  const filePath = path.join(dir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "// template");
  return filePath;
};

test("resolveTemplate prefers theme templates", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-theme-resolve-"));
  const themeRoot = path.join(tempDir, "themes", "minimal");
  const pluginsRoot = path.join(tempDir, "plugins");
  const coreTemplates = path.join(tempDir, "core-templates");

  const themeTemplate = await writeTemplate(themeRoot, "templates/page-home.tsx");
  await writeTemplate(path.join(pluginsRoot, "views"), "page-home.tsx");
  await writeTemplate(coreTemplates, "page.tsx");

  const resolved = resolveTemplate({
    themeName: "minimal",
    type: "page",
    key: "home",
    themeRoot,
    pluginsRoot,
    coreRoot: coreTemplates,
  });

  expect(resolved).toBe(themeTemplate);
});

test("resolveTemplate falls back to plugin views and caches result", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-theme-resolve-"));
  const themeRoot = path.join(tempDir, "themes", "minimal");
  const pluginsRoot = path.join(tempDir, "plugins");
  const coreTemplates = path.join(tempDir, "core-templates");

  const pluginTemplate = await writeTemplate(path.join(pluginsRoot, "views"), "page.tsx");
  await writeTemplate(coreTemplates, "page.tsx");

  const cache = createTemplateCache();
  const resolved = resolveTemplate({
    themeName: "minimal",
    type: "page",
    themeRoot,
    pluginsRoot,
    coreRoot: coreTemplates,
    cache,
  });

  expect(resolved).toBe(pluginTemplate);
  expect(cache.size).toBe(1);
});

test("resolveTemplateOr404 returns core 404 when missing", async () => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "coderso-theme-resolve-"));
  const coreTemplates = path.join(tempDir, "core-templates");
  const fallback = await writeTemplate(coreTemplates, "404.tsx");

  const resolved = resolveTemplateOr404({
    themeName: "minimal",
    type: "page",
    coreRoot: coreTemplates,
  });

  expect(resolved).toBe(fallback);
});
