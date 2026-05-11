import { expect, test } from "vitest";

import { normalizeAssistantActionPlan } from "../../../core/services/assistant/actionPlanSchema";
import { assembleComposedBlueprintPlan } from "../../../core/services/assistant/blueprints/blueprintActionAssembler";
import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";
import { buildBlueprintCompositionMetadata } from "../../../core/services/assistant/blueprints/blueprintCompositionMetadata";
import { normalizeBlueprintConflict } from "../../../core/services/assistant/blueprints/blueprintCapabilityTypes";

test("buildBlueprintCompositionMetadata explains primary adjunct gated and merged resources", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    candidates: [
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
      },
      {
        capabilityId: "product-inquiry-catalog",
        role: "adjunct",
        score: 82,
        matchedSignals: ["module:product-inquiry"],
        reasons: ["Inquiry form requested."],
      },
      {
        capabilityId: "booking-service",
        role: "gated",
        score: 62,
        matchedSignals: ["module:booking"],
        reasons: ["Booking requested."],
      },
    ],
  });

  const metadata = buildBlueprintCompositionMetadata({
    graph,
    existingResourceMatches: [
      {
        actionId: "page-products",
        actionType: "page.upsert",
        resourceKey: "page-collection-link:ct-products",
        existingId: "page-products",
        status: "matched",
        reason: "collection_link",
        candidateIds: ["page-products"],
      },
    ],
    unresolvedConflicts: graph.conflicts,
  });

  expect(metadata).toMatchObject({
    kind: "blueprint-composition",
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog"],
    gatedCapabilityIds: ["booking-service"],
    existingResourceMatches: [
      expect.objectContaining({
        status: "matched",
        resourceKey: "page-collection-link:ct-products",
      }),
    ],
  });
  expect(metadata.mergedResources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        key: "content-type:products",
        kind: "content-type",
        sourceCapabilityIds: ["product-catalog", "product-inquiry-catalog"],
      }),
      expect.objectContaining({
        key: "detail-page:products",
        kind: "detail-page",
        sourceCapabilityIds: ["product-catalog"],
      }),
    ])
  );
  expect(metadata.unresolvedConflicts).toEqual(
    expect.arrayContaining([expect.objectContaining({ code: "gated_domain" })])
  );
  expect(metadata.diagnostics?.candidateScores).toEqual([
    expect.objectContaining({ id: "product-catalog", role: "primary", score: 100 }),
    expect.objectContaining({ id: "product-inquiry-catalog", role: "adjunct", score: 82 }),
    expect.objectContaining({ id: "booking-service", role: "gated", score: 62 }),
  ]);
});

test("assembled composed plans carry strict blueprint composition metadata", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    candidates: [
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
      },
      {
        capabilityId: "product-inquiry-catalog",
        role: "adjunct",
        score: 82,
        matchedSignals: ["module:product-inquiry"],
        reasons: ["Inquiry form requested."],
      },
    ],
  });

  const plan = assembleComposedBlueprintPlan({
    prompt: "Create a product catalog with inquiry form.",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    graph,
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.metadata?.blueprintComposition).toMatchObject({
    kind: "blueprint-composition",
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog"],
    gatedCapabilityIds: [],
    unresolvedConflicts: [],
  });
  expect(normalized.metadata?.blueprintComposition?.mergedResources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "detail-page", key: "detail-page:products" }),
    ])
  );
});

test("blueprint composition metadata redacts secret-like diagnostic strings", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    candidates: [
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary uses apiKeySecret alias."],
      },
    ],
  });

  const metadata = buildBlueprintCompositionMetadata({
    graph,
    unresolvedConflicts: [
      normalizeBlueprintConflict({
        code: "resource_key_duplicate",
        severity: "error",
        message: "Do not expose bearerToken value here.",
        resourceKey: "secretResource:products",
        actionType: "page.upsert",
      }),
    ],
  });

  expect(JSON.stringify(metadata)).not.toMatch(/bearerToken|apiKeySecret|secretResource/);
  expect(JSON.stringify(metadata)).toContain("[redacted]");
});
