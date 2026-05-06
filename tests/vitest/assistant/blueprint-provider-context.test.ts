import { expect, test } from "vitest";

import { normalizeProviderBlueprintCompositionDraft } from "../../../core/services/assistant/blueprints/blueprintCompositionDraftSchema";
import { buildBlueprintProviderContext } from "../../../core/services/assistant/blueprints/blueprintProviderContext";

test("buildBlueprintProviderContext exposes bounded capability summaries without action payloads", () => {
  const context = buildBlueprintProviderContext({ maxCapabilities: 4 });

  expect(context.schemaVersion).toBe(1);
  expect(context.capabilities).toHaveLength(4);
  expect(context.capabilities[0]).toMatchObject({
    id: "house-projects-catalog",
    family: "catalog_showcase",
  });
  expect(JSON.stringify(context)).not.toContain('"actions"');
  expect(context.warnings).toContain("blueprint_capabilities_truncated");
  expect(context.warnings).toContain("detail_pages_unavailable");
});

test("normalizeProviderBlueprintCompositionDraft accepts known capability ids only", () => {
  expect(
    normalizeProviderBlueprintCompositionDraft({
      schemaVersion: 1,
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      gatedCapabilityIds: ["checkout-payment"],
      notes: ["Prefer inquiry before checkout."],
    })
  ).toEqual({
    schemaVersion: 1,
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
    gatedCapabilityIds: ["checkout-payment"],
    notes: ["Prefer inquiry before checkout."],
  });
});

test("normalizeProviderBlueprintCompositionDraft rejects unknown ids, duplicate ids, and action payloads", () => {
  expect(() =>
    normalizeProviderBlueprintCompositionDraft({
      schemaVersion: 1,
      primaryCapabilityId: "unknown-capability",
      adjunctCapabilityIds: [],
      gatedCapabilityIds: [],
    })
  ).toThrow("assistant_blueprint_composition_draft_invalid");

  expect(() =>
    normalizeProviderBlueprintCompositionDraft({
      schemaVersion: 1,
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-catalog"],
      gatedCapabilityIds: [],
    })
  ).toThrow("assistant_blueprint_composition_draft_invalid");

  expect(() =>
    normalizeProviderBlueprintCompositionDraft({
      schemaVersion: 1,
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: [],
      gatedCapabilityIds: [],
      actions: [],
    })
  ).toThrow("assistant_blueprint_composition_draft_invalid");
});
