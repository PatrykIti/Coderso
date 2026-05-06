import { expect, test } from "vitest";

import { buildProductInquiryCatalogPlan } from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { resolveBlueprintCompositionConflicts } from "../../../core/services/assistant/blueprints/blueprintConflictResolver";

test("resolveBlueprintCompositionConflicts accepts product inquiry page merge on the same catalog slug", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const inquiry = buildProductInquiryCatalogPlan({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
      {
        capabilityId: "product-catalog",
        planId: base.id,
        title: base.title,
        assumptions: base.assumptions,
        actions: base.actions,
      },
      {
        capabilityId: "product-inquiry-catalog",
        planId: inquiry.id,
        title: inquiry.title,
        assumptions: inquiry.assumptions,
        actions: inquiry.actions,
      },
    ],
  });

  expect(conflicts).toEqual([]);
});

test("resolveBlueprintCompositionConflicts reports conflicting page upserts for the same slug", () => {
  const base = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const conflicting = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });
  const page = conflicting.actions.find((action) => action.type === "page.upsert");
  if (!page || page.type !== "page.upsert") {
    throw new Error("page_upsert_missing");
  }
  page.input.listingQueryName = "Other Query";

  const conflicts = resolveBlueprintCompositionConflicts({
    fragments: [
      {
        capabilityId: "product-catalog",
        planId: base.id,
        title: base.title,
        assumptions: base.assumptions,
        actions: base.actions,
      },
      {
        capabilityId: "product-catalog-conflict",
        planId: conflicting.id,
        title: conflicting.title,
        assumptions: conflicting.assumptions,
        actions: conflicting.actions,
      },
    ],
  });

  expect(conflicts).toEqual([
    expect.objectContaining({
      code: "blueprint_action_merge_conflict",
      actionType: "page.upsert",
    }),
  ]);
});
