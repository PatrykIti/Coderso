import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { buildDefaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";
import { CODERSO_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/codersoModules";
import { settingsSidebarItems } from "../../../core/admin/ui/settings/SettingsSidebar";

const matrixPath = resolve(process.cwd(), "_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md");
const matrix = readFileSync(matrixPath, "utf8");

const coverageRows = matrix
  .split("\n")
  .filter((line) => line.startsWith("| /admin"))
  .map((line) => {
    const [route, label, coverage, task] = line
      .split("|")
      .slice(1, 5)
      .map((item) => item.trim());
    return { route, label, coverage, task };
  });

const coveredRoutes = new Set(coverageRows.map((row) => row.route));
const coverageStates = new Set(["live-execute", "live-read-only", "live-gated", "not-applicable"]);

const defaultNavRoutes = () => {
  const sections = buildDefaultNavSections();
  return sections.flatMap((section) => [
    ...(section.items ?? []).map((item) => item.href),
    ...(section.groups ?? []).flatMap((group) => group.items.map((item) => item.href)),
    ...(section.itemsAfterGroups ?? []).map((item) => item.href),
  ]);
};

test("LLM Guide live coverage matrix includes every admin nav route", () => {
  const expected = new Set([
    ...defaultNavRoutes(),
    ...CODERSO_MODULE_REGISTRY.flatMap((module) => (module.nav ? [module.nav.href] : [])),
    ...settingsSidebarItems.map((item) => item.href),
  ]);

  for (const route of expected) {
    expect(coveredRoutes.has(route), route).toBe(true);
  }
});

test("LLM Guide live coverage matrix uses valid states and task ids", () => {
  expect(coverageRows.length).toBeGreaterThan(0);
  for (const row of coverageRows) {
    expect(row.label, row.route).toBeTruthy();
    expect(coverageStates.has(row.coverage), row.route).toBe(true);
    expect(row.task, row.route).toMatch(/^TASK-\d+/);
  }
});
