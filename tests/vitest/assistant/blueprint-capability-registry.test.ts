import { expect, test } from "vitest";

import {
  findCapabilitiesProviding,
  getBlueprintCapability,
  getBlueprintCapabilityRegistration,
  listBlueprintCapabilities,
  listBlueprintCapabilityRegistrations,
} from "../../../core/services/assistant/blueprints/blueprintCapabilityRegistry";

test("blueprint capability registry exposes current packs and adjunct modules", () => {
  expect(listBlueprintCapabilities().map((capability) => capability.id)).toEqual([
    "house-projects-catalog",
    "product-catalog",
    "portfolio-projects",
    "services-directory",
    "lead-capture-site",
    "product-inquiry-catalog",
    "editorial-content-hub",
    "booking-service",
    "checkout-payment",
  ]);

  expect(listBlueprintCapabilityRegistrations()).toHaveLength(9);
});

test("catalog capabilities expose executable public detail-page metadata", () => {
  const productCatalog = getBlueprintCapability("product-catalog");

  expect(productCatalog?.provides.map((entry) => entry.kind)).toContain("public-detail-page");
  expect(
    productCatalog?.resources.find((entry) =>
      entry.actionTypes.includes("setting.content-route.upsert")
    )
  ).toMatchObject({
    kind: "content-route",
    owner: "setting.content-route.upsert",
  });
  expect(productCatalog?.gated).toEqual([]);
  expect(productCatalog?.resources.find((entry) => entry.kind === "detail-page")).toMatchObject({
    executable: true,
    actionTypes: ["detail-page.upsert"],
    owner: "detail-page.upsert",
  });
});

test("registry supports provide lookups and gated module builders", () => {
  expect(findCapabilitiesProviding("public-detail-page").map((entry) => entry.id)).toEqual([
    "house-projects-catalog",
    "product-catalog",
    "portfolio-projects",
    "services-directory",
  ]);

  const productInquiry = getBlueprintCapabilityRegistration("product-inquiry-catalog");
  const checkout = getBlueprintCapabilityRegistration("checkout-payment");
  const booking = getBlueprintCapabilityRegistration("booking-service");

  expect(
    productInquiry?.buildPlan({ promptKind: "setup_request" }).actions.map((action) => action.type)
  ).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
  ]);
  expect(checkout?.capability.merge.role).toBe("gated");
  expect(checkout?.buildPlan({ promptKind: "setup_request" }).status).toBe("needs_input");
  expect(booking?.capability.merge.role).toBe("gated");
  expect(booking?.buildPlan({ promptKind: "setup_request" }).questions[0]?.id).toBe(
    "booking-adapter-scope"
  );
});
