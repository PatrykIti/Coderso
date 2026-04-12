import { expect, test } from "vitest";

import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import {
  HOUSE_PROJECTS_CATALOG_PRESET,
  PORTFOLIO_PROJECTS_PRESET,
  PRODUCT_CATALOG_PRESET,
} from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import {
  buildProductCheckoutNeedsInputPlan,
  buildProductInquiryCatalogPlan,
} from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import {
  getBusinessBlueprintPack,
  listBusinessBlueprintPacks,
} from "../../../core/services/assistant/blueprints/businessBlueprintTypes";

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
  const schema = plan.actions.find((action) => action.type === "content-type.upsert")?.input
    .schema as { properties?: Record<string, unknown> } | undefined;
  expect(Object.keys(schema?.properties ?? {})).toEqual(
    expect.arrayContaining(["resultSummary", "testimonialQuote"])
  );
  expect(JSON.stringify(plan.actions)).toContain("resultSummary");
  expect(JSON.stringify(plan.actions)).toContain("testimonialQuote");
});

test("business blueprint packs expose shared catalog contract", () => {
  const packs = listBusinessBlueprintPacks();
  const productPack = getBusinessBlueprintPack("product_catalog");

  expect(packs.map((pack) => pack.id)).toEqual([
    "house-projects-catalog",
    "product-catalog",
    "portfolio-projects",
    "services-directory",
    "lead-capture-site",
    "booking-service",
  ]);
  expect(productPack).toMatchObject({
    id: "product-catalog",
    intentFamily: "product_catalog",
    status: "ready",
    surfaces: [
      "content-type",
      "custom-screen",
      "listing-query",
      "listing-template",
      "page",
    ],
    actionTypes: [
      "setting.content-route.upsert",
      "content-type.upsert",
      "custom-screen.upsert",
      "listing-query.upsert",
      "listing-template.upsert",
      "page.upsert",
    ],
  });
  expect(getBusinessBlueprintPack("unknown")).toBeNull();
});

test("booking service blueprint pack is gated until booking adapters exist", () => {
  const pack = getBusinessBlueprintPack("booking_service");
  const plan = pack?.buildPlan({ promptKind: "setup_request" });

  expect(pack).toMatchObject({
    id: "booking-service",
    intentFamily: "booking_service",
    status: "requires-prerequisite",
    actionTypes: [],
  });
  expect(plan?.status).toBe("needs_input");
  expect(plan?.intentFamily).toBe("booking_service");
  expect(plan?.actions).toEqual([]);
  expect(plan?.questions[0]?.id).toBe("booking-adapter-scope");
});

test("lead capture business blueprint pack builds page and form plan", () => {
  const pack = getBusinessBlueprintPack("lead_capture_site");
  const plan = pack?.buildPlan({ promptKind: "setup_request" });

  expect(pack).toMatchObject({
    id: "lead-capture-site",
    intentFamily: "lead_capture_site",
    surfaces: ["page", "form"],
    actionTypes: ["form.upsert", "page.upsert"],
  });
  expect(plan?.status).toBe("ready");
  expect(plan?.actions.map((action) => action.type)).toEqual(["form.upsert", "page.upsert"]);
  expect(plan?.actions.find((action) => action.type === "form.upsert")?.input).toMatchObject({
    slug: "lead-capture-inquiry",
    submissionAccess: "public",
  });
  expect(plan?.actions.find((action) => action.type === "page.upsert")?.input).toMatchObject({
    slug: "/kontakt",
    formEmbed: {
      formName: "Lead Capture Inquiry",
    },
  });
});

test("product inquiry blueprint adds inquiry form without checkout", () => {
  const plan = buildProductInquiryCatalogPlan({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(plan.intentId).toBe("product-inquiry-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
  ]);
  expect(plan.actions.find((action) => action.type === "form.upsert")?.input).toMatchObject({
    slug: "product-catalog-inquiry",
    submissionAccess: "public",
  });
  expect(plan.assumptions.join(" ")).toContain("not checkout");
});

test("product checkout blueprint remains gated", () => {
  const plan = buildProductCheckoutNeedsInputPlan({ promptKind: "setup_request" });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("product-checkout-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("business blueprint pack builds strict plans without changing catalog output", () => {
  const productPack = getBusinessBlueprintPack("product_catalog");
  const packPlan = productPack?.buildPlan({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const directPlan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(packPlan).toEqual(directPlan);
});
