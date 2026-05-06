import { afterEach, expect, test, vi } from "vitest";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import {
  compareBlueprintCandidateSelection,
  shouldRunBlueprintCandidateShadow,
} from "../../../core/services/assistant/blueprints/blueprintComposerShadow";
import { resolveBlueprintCandidates } from "../../../core/services/assistant/blueprints/blueprintCandidateResolver";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("compareBlueprintCandidateSelection reports legacy primary routing drift for mixed product prompts", () => {
  const currentPlan = planAssistantActions({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    })
  ).toMatchObject({
    currentIntentId: "product-inquiry-catalog",
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
    mismatchReason: "legacy_primary_routing",
  });
});

test("compareBlueprintCandidateSelection reports no mismatch for aligned single-pack prompts", () => {
  const currentPlan = planAssistantActions({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });
  const candidates = resolveBlueprintCandidates({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(
    compareBlueprintCandidateSelection({
      currentPlan,
      candidates,
    }).mismatchReason
  ).toBeNull();
});

test("shouldRunBlueprintCandidateShadow stays off outside tests/debug for normal runtime prompts", () => {
  vi.stubEnv("NODE_ENV", "production");

  expect(
    shouldRunBlueprintCandidateShadow({
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
      },
    })
  ).toBe(false);

  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  expect(
    shouldRunBlueprintCandidateShadow({
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
      },
    })
  ).toBe(true);
});
