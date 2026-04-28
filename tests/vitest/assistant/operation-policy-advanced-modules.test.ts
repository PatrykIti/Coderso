import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

import { ADVANCED_MODULE_REGISTRY } from "../../../core/admin/ui/navigation/advancedModules";
import { assistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/assistantOperationPolicy";
import { advancedModulePolicies } from "../../../core/services/assistant/operationPolicy/advancedModulePolicies";
import { normalizeAssistantOperationPolicy } from "../../../core/services/assistant/operationPolicy/policySchema";
import {
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

const codersoRegistryRoutes = ADVANCED_MODULE_REGISTRY.flatMap((module) =>
  module.nav ? [module.nav.href] : []
);

const expectedRoutes = [
  "/admin/posts",
  ...codersoRegistryRoutes,
  "/admin/store",
  "/admin/themes",
];

const policyByRoute = () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);
  return new Map(
    Object.values(policy.resources).flatMap((resource) =>
      resource.coverage.routes.map((route) => [route, resource] as const)
    )
  );
};

test("assistantOperationPolicy maps Advanced module routes to live coverage states", () => {
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

test("planned Advanced modules are not applicable and never executable", () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);

  for (const key of ["appointments", "mega-menu", "portal", "i18n"]) {
    const resource = policy.resources[key];
    expect(resource?.coverage.state, key).toBe("not-applicable");
    expect(Object.values(resource?.actions ?? {}).every((item) => item.mode !== "executable"), key).toBe(true);
  }
});

test("gated Advanced modules do not expose executable mutations", () => {
  const policy = normalizeAssistantOperationPolicy(assistantOperationPolicy);

  for (const key of [
    "post",
    "filters",
    "advanced-search",
    "booking",
    "reviews",
    "commerce",
    "popups",
    "solution-kit",
    "plugin-store",
    "theme",
  ]) {
    const resource = policy.resources[key];
    expect(resource?.coverage.state, key).toBe("live-gated");
    expect(Object.values(resource?.actions ?? {}).some((item) => item.mode === "executable"), key).toBe(false);
  }

  expect(policy.resources.booking?.secrets).toMatchObject({
    redacted: true,
    providerAllowed: false,
  });
  expect(policy.resources.commerce?.secrets?.secretFields).toContain("payment.secret");
  expect(policy.resources["plugin-store"]?.actions.install).toMatchObject({
    type: "none",
    mode: "gated",
  });
});

test("solution kit typed actions remain represented but gated", () => {
  const solutionKit = getResourcePolicy(assistantOperationPolicy, "solution-kit");
  if (!solutionKit) throw new Error("missing_solution_kit_policy");

  expect(solutionKit.actions.recommend).toMatchObject({
    type: "site-kit.recommend",
    mode: "gated",
  });
  expect(solutionKit.actions.install).toMatchObject({
    type: "site-kit.install",
    mode: "gated",
  });
  expect(resolveResourcePolicyFromPrompt(assistantOperationPolicy, "site kit starter")).toBe(solutionKit);
});

test("advancedModulePolicies exports remaining gated route policies", () => {
  const routes = new Set(
    Object.values(advancedModulePolicies).flatMap((resource) => resource.coverage.routes)
  );

  for (const route of [
    "/admin/posts",
    "/admin/advanced/filters",
    "/admin/advanced/search",
    "/admin/advanced/booking",
    "/admin/advanced/reviews",
    "/admin/advanced/commerce",
    "/admin/advanced/popups",
    "/admin/advanced/solution-kits",
    "/admin/store",
    "/admin/themes",
  ]) {
    expect(routes.has(route), route).toBe(true);
  }
});
