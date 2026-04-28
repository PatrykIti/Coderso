import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { buildDefaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";
import { ADVANCED_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/advancedModules";
import { settingsSidebarItems } from "../../../core/admin/ui/settings/SettingsSidebar";
import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import {
  buildAdminNavigationRoutes,
  buildLiveCoverageRouteMap,
} from "../../../core/services/assistant/operationPolicy/coveragePolicy";

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
const policyRoutes = buildLiveCoverageRouteMap(assistantOperationPolicy);

test("LLM Guide live coverage matrix includes every admin nav route", () => {
  const expected = buildAdminNavigationRoutes({
    navSections: buildDefaultNavSections(),
    advancedModules: ADVANCED_MODULE_REGISTRY,
    settingsItems: settingsSidebarItems,
  });

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

test("LLM Guide live coverage matrix matches assistantOperationPolicy route state and task ids", () => {
  for (const row of coverageRows) {
    const policyRow = policyRoutes.get(row.route);
    expect(policyRow, row.route).toBeDefined();
    expect(row.coverage, row.route).toBe(policyRow?.coverage);
    expect(row.task, row.route).toBe(policyRow?.task);
  }
});
