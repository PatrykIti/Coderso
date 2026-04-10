import { expect, test } from "vitest";

import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import {
  HOUSE_PROJECTS_CATALOG_PRESET,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
} from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";

test("buildCatalogFamilyPlan keeps house-projects preset backward-compatible", () => {
  const genericPlan = buildCatalogFamilyPlan(HOUSE_PROJECTS_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
  });
  const legacyPlan = buildHouseProjectsCatalogPlan({
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
  });

  expect(genericPlan).toEqual(legacyPlan);
});

test("buildCatalogFamilyPlan produces product catalog plan from preset", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(plan.intentId).toBe("product-catalog");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
  expect(
    plan.actions.find((action) => action.type === "content-type.upsert")?.input
  ).toMatchObject({
    slug: "products",
    name: "Products",
  });
  expect(
    plan.actions.find((action) => action.type === "page.upsert")?.input
  ).toMatchObject({
    slug: "/produkty",
    listingTemplateSlug: "product-catalog-grid",
  });
});

test("buildCatalogFamilyPlan produces portfolio projects plan from preset", () => {
  const plan = buildCatalogFamilyPlan(PORTFOLIO_PROJECTS_PRESET, {
    promptKind: "setup_request",
    intentFamily: "portfolio_projects",
  });

  expect(plan.intentId).toBe("portfolio-projects");
  expect(plan.intentFamily).toBe("portfolio_projects");
  expect(plan.title).toContain("Portfolio");
  expect(
    plan.actions.find((action) => action.type === "content-type.upsert")?.input
  ).toMatchObject({
    slug: "portfolio-projects",
    name: "Portfolio Projects",
  });
  expect(
    plan.actions.find((action) => action.type === "custom-screen.upsert")?.input
  ).toMatchObject({
    name: "Portfolio Projects",
    contentTypeSlug: "portfolio-projects",
  });
});
