// @vitest-environment happy-dom

import React from "react";
import { expect, test } from "vitest";
import { renderAdminUi } from "../../utils/adminRouterRender";

import type {
  AssistantActionPlan,
  AssistantBlueprintCompositionMetadata,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import { ActionPlanReview } from "../../../core/admin/ui/assistant/components/ActionPlanReview";

const basePlan = (actions: AssistantPlannedAction[]): AssistantActionPlan => ({
  id: "plan-edge",
  status: "ready",
  intentId: "edge-review",
  title: "Edge review",
  answer: "Plan ready",
  summary: "Covers edge-case flows.",
  confidence: 0.9,
  assumptions: [],
  questions: [],
  actions,
});

const baseComposition = (
  overrides: Partial<AssistantBlueprintCompositionMetadata> = {}
): AssistantBlueprintCompositionMetadata => ({
  schemaVersion: 1,
  kind: "blueprint-composition",
  primaryCapabilityId: "product-catalog",
  adjunctCapabilityIds: ["product-inquiry-catalog"],
  gatedCapabilityIds: [],
  mergedResources: [],
  existingResourceMatches: [],
  resolvedConflicts: [],
  unresolvedConflicts: [],
  diagnostics: { candidateScores: [] },
  ...overrides,
});

test("ActionPlanReview labels unclassified action types with a Review badge", () => {
  const html = renderAdminUi(
    <ActionPlanReview
      plan={basePlan([
        {
          id: "kit-validate",
          type: "site-kit.validate",
          title: "Validate the selected site kit",
          description: "Run the validation pass.",
          input: { runId: "run-1" },
        },
      ])}
      preview={{ plan: basePlan([]), changes: [], warnings: [], readyToExecute: true }}
      onPreview={() => undefined}
      onExecute={() => undefined}
    />
  );

  expect(html).toContain("Validate the selected site kit");
  expect(html).toContain("Review");
  expect(html).toContain("Execute reviewed actions");
});

test("ActionPlanReview renders gated capability badges from the composition", () => {
  const html = renderAdminUi(
    <ActionPlanReview
      plan={{
        ...basePlan([
          {
            id: "menu-products",
            type: "menu.item.upsert",
            title: "Add products to navigation",
            description: "Add a safe relative menu item.",
            input: { menuId: "primary", label: "Products", href: "/products" },
          },
        ]),
        metadata: {
          planner: "provider",
          providerDraftUsed: true,
          providerId: "fake",
          blueprintComposition: baseComposition({
            gatedCapabilityIds: ["product-catalog-gated"],
            mergedResources: [
              {
                key: "content-type:products",
                kind: "content-type",
                sourceCapabilityIds: ["product-catalog", "product-catalog-gated"],
              },
            ],
          }),
        },
      }}
      preview={null}
      onPreview={() => undefined}
      onExecute={() => undefined}
    />
  );

  expect(html).toContain("Composition diagnostics");
  expect(html).toContain("Gated");
  expect(html).toContain("product catalog gated");
});
