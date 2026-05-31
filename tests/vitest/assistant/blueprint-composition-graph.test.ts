import { expect, test } from "vitest";

import { buildBlueprintCompositionGraph } from "../../../core/services/assistant/blueprints/blueprintCompositionGraph";

test("buildBlueprintCompositionGraph builds deterministic fragments for executable mixed prompts", () => {
  const graph = buildBlueprintCompositionGraph({
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    candidates: [
      {
        capabilityId: "editorial-content-hub",
        role: "adjunct",
        score: 60,
        matchedSignals: ["module:editorial-hub-low"],
        reasons: ["Blog duplicate low."],
      },
      {
        capabilityId: "product-inquiry-catalog",
        role: "adjunct",
        score: 85,
        matchedSignals: ["module:product-inquiry"],
        reasons: ["Inquiry."],
      },
      {
        capabilityId: "editorial-content-hub",
        role: "adjunct",
        score: 72,
        matchedSignals: ["module:editorial-hub"],
        reasons: ["Blog."],
      },
      {
        capabilityId: "product-catalog",
        role: "primary",
        score: 100,
        matchedSignals: ["intent:product_catalog"],
        reasons: ["Primary product catalog."],
      },
    ],
  });

  expect(graph.primary?.capability.id).toBe("product-catalog");
  expect(graph.adjuncts.map((node) => node.capability.id)).toEqual([
    "product-inquiry-catalog",
    "editorial-content-hub",
  ]);
  expect(graph.selectedCapabilityIds).toEqual([
    "product-catalog",
    "product-inquiry-catalog",
    "editorial-content-hub",
  ]);
  expect(graph.fragments).toHaveLength(3);
  expect(graph.conflicts).toEqual([]);
});
