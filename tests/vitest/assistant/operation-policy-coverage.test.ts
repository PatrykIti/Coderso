import { expect, test } from "vitest";

import { CODERSO_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/codersoModules";
import { buildDefaultNavSections } from "../../../core/admin/ui/navigation/sidebarConfig";
import { settingsSidebarItems } from "../../../core/admin/ui/settings/SettingsSidebar";
import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import {
  buildAdminNavigationRoutes,
  buildLiveCoverageRows,
  findExecutablePlannedRoutes,
  findMissingCoverageRoutes,
} from "../../../core/services/assistant/operationPolicy/coveragePolicy";

test("operation policy coverage covers every admin navigation route", () => {
  const routes = buildAdminNavigationRoutes({
    navSections: buildDefaultNavSections(),
    codersoModules: CODERSO_MODULE_REGISTRY,
    settingsItems: settingsSidebarItems,
  });

  expect(findMissingCoverageRoutes(assistantOperationPolicy, routes)).toEqual([]);
});

test("operation policy coverage rows have stable route state and task metadata", () => {
  const rows = buildLiveCoverageRows(assistantOperationPolicy);

  expect(rows.length).toBeGreaterThan(0);
  expect(rows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        route: "/admin/pages",
        coverage: "live-execute",
        task: "TASK-184-02",
      }),
      expect.objectContaining({
        route: "/admin/settings/api-keys",
        coverage: "live-gated",
        task: "TASK-184-15",
      }),
      expect.objectContaining({
        route: "/admin/coderso/appointments",
        coverage: "not-applicable",
        task: "TASK-184-16",
      }),
    ])
  );
});

test("planned policy routes cannot expose executable actions", () => {
  expect(findExecutablePlannedRoutes(assistantOperationPolicy)).toEqual([]);
});
