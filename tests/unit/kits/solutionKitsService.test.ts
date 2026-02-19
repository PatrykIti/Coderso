import { expect, test } from "bun:test";

import {
  getSolutionKit,
  listSolutionKits,
  previewSolutionKitPlan,
} from "../../../core/services/kits/solutionKitsService";

test("listSolutionKits returns v1 catalog summaries", () => {
  const kits = listSolutionKits();

  expect(kits.length).toBeGreaterThanOrEqual(5);
  expect(kits.some((kit) => kit.id === "automotive-workshop")).toBe(true);
  expect(kits.some((kit) => kit.id === "small-ecommerce")).toBe(true);
});

test("getSolutionKit returns full definition", () => {
  const kit = getSolutionKit("medical-clinic");

  expect(kit).not.toBeNull();
  expect(kit?.title).toContain("Medical");
  expect(kit?.resourceBlueprint.pages.length).toBeGreaterThan(0);
});

test("previewSolutionKitPlan returns recommendation and steps", () => {
  const plan = previewSolutionKitPlan({
    businessType: "services_directory",
    goals: ["catalog_showcase", "collect_qualified_leads"],
    locale: "en",
  });

  expect(plan.recommendedKitId).toBe("services-directory");
  expect(plan.steps.length).toBeGreaterThan(0);
  expect(plan.recommendations[0]?.kitId).toBe("services-directory");
});
