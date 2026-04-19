import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { settingsSidebarItems } from "../../../core/admin/ui/settings/SettingsSidebar";
import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import { adminSurfacePolicies } from "../../../core/services/assistant/operationPolicy/adminSurfacePolicies";
import { normalizeAssistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/policySchema";
import {
  getFieldPolicy,
  getResourcePolicy,
  resolveResourcePolicyFromPrompt,
} from "../../../core/services/assistant/operationPolicy/policyLookup";

const matrixPath = resolve(process.cwd(), "_docs/LLM_GUIDE_LIVE_COVERAGE_MATRIX.md");
const matrix = readFileSync(matrixPath, "utf8");

const matrixRows = matrix
  .split("\n")
  .filter((line) => line.startsWith("| /admin"))
  .map((line) => {
    const [route, , coverage, task] = line
      .split("|")
      .slice(1, 5)
      .map((item) => item.trim());
    return { route, coverage, task };
  });

const matrixByRoute = new Map(matrixRows.map((row) => [row.route, row]));

const adminToolRoutes = [
  "/admin",
  "/admin/menus",
  "/admin/search",
  "/admin/seo",
  "/admin/analytics",
  "/admin/backups",
  "/admin/tools/import-export",
  "/admin/redirects",
  "/admin/users",
  "/admin/roles",
  "/admin/audit",
  "/admin/access-logs",
  "/admin/settings",
];

const settingsRoutes = settingsSidebarItems.map((item) => item.href);
const expectedRoutes = [...adminToolRoutes, ...settingsRoutes];

const policyByRoute = () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);
  return new Map(
    Object.values(policy.resources).flatMap((resource) =>
      resource.coverage.routes.map((route) => [route, resource] as const)
    )
  );
};

test("assistantOperationPolicy maps admin tool and settings routes to live coverage states", () => {
  const policies = policyByRoute();

  for (const route of expectedRoutes) {
    const policy = policies.get(route);
    const matrixRow = matrixByRoute.get(route);

    expect(policy, route).toBeDefined();
    expect(matrixRow, route).toBeDefined();
    expect(policy?.coverage.state, route).toBe(matrixRow?.coverage);
    expect(policy?.coverage.task, route).toBe(matrixRow?.task);
  }
});

test("admin surface policy keeps sensitive and privileged surfaces gated or redacted", () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);

  for (const key of [
    "settings-root",
    "settings-assistant",
    "settings-security",
    "settings-api-keys",
    "settings-webhooks",
    "settings-email",
    "settings-storage",
    "settings-integrations",
    "user",
    "audit-log",
    "access-log",
  ]) {
    expect(policy.resources[key]?.secrets, key).toMatchObject({
      redacted: true,
      providerAllowed: false,
    });
  }

  expect(policy.resources.backup?.actions.restore).toMatchObject({
    type: "none",
    mode: "gated",
  });
  expect(policy.resources.user?.actions.delete).toMatchObject({
    type: "none",
    mode: "gated",
  });
  expect(policy.resources.role?.actions.update).toMatchObject({
    type: "none",
    mode: "gated",
  });
  expect(policy.resources["settings-security"]?.actions.update).toMatchObject({
    type: "none",
    mode: "gated",
  });
});

test("admin surface policy preserves executable menu and SEO action contracts", () => {
  const menu = getResourcePolicy(assistantOperationPolicy, "menu-item");
  const seo = getResourcePolicy(assistantOperationPolicy, "seo-document");
  if (!menu || !seo) throw new Error("missing_menu_or_seo_policy");

  expect(resolveResourcePolicyFromPrompt(assistantOperationPolicy, "zmien link menu")).toBe(menu);
  expect(getFieldPolicy(menu, "url")?.action).toMatchObject({
    type: "menu.item.update",
    patchPath: ["href"],
  });
  expect(menu.actions.delete).toMatchObject({
    type: "menu.item.delete",
    mode: "executable",
  });

  expect(resolveResourcePolicyFromPrompt(assistantOperationPolicy, "meta description seo")).toBe(seo);
  expect(getFieldPolicy(seo, "meta description")?.action).toMatchObject({
    type: "seo.document.update",
    patchPath: ["seo", "description"],
  });
  expect(seo.actions.update).toMatchObject({
    type: "seo.document.update",
    mode: "executable",
  });
});

test("adminSurfacePolicies exports every settings sidebar item through canonical routes", () => {
  const routes = new Set(
    Object.values(adminSurfacePolicies).flatMap((resource) => resource.coverage.routes)
  );

  for (const route of settingsRoutes) {
    expect(routes.has(route), route).toBe(true);
  }
});
