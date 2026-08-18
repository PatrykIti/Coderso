import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "vitest";

const registrySource = readFileSync(
  path.join(process.cwd(), "core/admin/ui/widgets/registry.ts"),
  "utf8"
);

test("admin widget registry does not import the editor barrel eagerly (TASK-467-03)", () => {
  expect(registrySource).not.toMatch(/from\s+["']\.\/editors(?:\/index)?["']/);
  expect(registrySource).not.toMatch(/import\s*\(\s*["']\.\/editors(?:\/index)?["']\s*\)/);
});

test("admin widget registry lazy-loads concrete editor modules only (TASK-467-03)", () => {
  const specifiers = [...registrySource.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)].map(
    (match) => match[1]
  );

  expect(specifiers.length).toBeGreaterThan(0);
  for (const specifier of specifiers) {
    expect(specifier).toMatch(/^\.\/editors\/[^"']+$/);
    expect(specifier).not.toMatch(/\/index$/);
  }
});

test("admin widget registry keeps synchronous metadata registration entry (TASK-467-03)", () => {
  expect(registrySource).toContain("export function ensureCoreWidgetsRegistered()");
  expect(registrySource).toContain("registerCoreWidgets(editorLoaders)");
});

test("admin widget registry still exposes all surface listing helpers (TASK-467-03)", () => {
  for (const helper of [
    "listRegisteredWidgets",
    "listRegisteredPageWidgets",
    "listRegisteredWidgetLibraryWidgets",
    "listRegisteredScreenWidgets",
    "listRegisteredWidgetsForSurface",
    "getRegisteredWidget",
  ]) {
    expect(registrySource).toContain(`export function ${helper}(`);
  }
});
