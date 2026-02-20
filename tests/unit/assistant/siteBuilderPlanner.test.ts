import { expect, test } from "bun:test";

import {
  buildSiteBuilderPlan,
  filterKitDefinitionByPlan,
} from "../../../core/services/assistant/siteBuilderPlanner";
import { getSolutionKitFromCatalog } from "../../../core/services/kits/solutionKitsCatalog";

test("buildSiteBuilderPlan recommends matching business kit first", () => {
  const output = buildSiteBuilderPlan({
    businessType: "automotive_workshop",
    goals: ["online_booking", "lead_generation"],
    locale: "pl",
    siteName: "AutoFix",
  });

  expect(output.recommendedKitId).toBe("automotive-workshop");
  expect(output.recommendations[0]?.kitId).toBe("automotive-workshop");
  expect(output.settingsPatch["site.locale"]).toBe("pl");
  expect(output.settingsPatch["site.name"]).toBe("AutoFix");
  expect(output.steps.length).toBeGreaterThan(3);
});

test("buildSiteBuilderPlan honors preferred kit with scoring tie-break", () => {
  const output = buildSiteBuilderPlan({
    businessType: "custom",
    goals: ["lead_generation"],
    locale: "en",
    preferredKitId: "medical-clinic",
  });

  expect(output.recommendations[0]?.kitId).toBe("medical-clinic");
  expect(output.recommendedKitId).toBe("medical-clinic");
});

test("buildSiteBuilderPlan output is deterministic for identical input", () => {
  const input = {
    businessType: "small_ecommerce",
    goals: ["sell_products", "catalog_showcase", "reviews_social_proof"],
    locale: "en",
  } as const;

  const left = buildSiteBuilderPlan(input);
  const right = buildSiteBuilderPlan(input);

  expect(left).toEqual(right);
  expect(left.recommendedKitId).toBe("small-ecommerce");
});

test("filterKitDefinitionByPlan removes resource groups for disabled editable steps", () => {
  const kit = getSolutionKitFromCatalog("automotive-workshop");
  expect(kit).toBeTruthy();
  if (!kit) return;

  const filtered = filterKitDefinitionByPlan(kit, {
    enabledStepIds: ["settings", "pages", "qa"],
  });

  expect(filtered.resourceBlueprint.pages.length).toBeGreaterThan(0);
  expect(filtered.resourceBlueprint.contentTypes).toHaveLength(0);
  expect(filtered.resourceBlueprint.forms).toHaveLength(0);
  expect(filtered.resourceBlueprint.menus).toHaveLength(0);
});
