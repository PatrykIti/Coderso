import { expect, test } from "vitest";

import {
  normalizeAssistantActionPlan,
  isAssistantActionPlanStrict,
} from "../../../core/services/assistant/actionPlanSchema";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";

test("normalizeAssistantActionPlan accepts current catalog family plans", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.intentId).toBe("product-catalog");
  expect(normalized.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
});

test("normalizeAssistantActionPlan accepts site-kit action plans", () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.intentFamily).toBe("site_kit");
  expect(normalized.actions.map((action) => action.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
});

test("normalizeAssistantActionPlan rejects unknown plan and action fields", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      debug: true,
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          ...plan.actions[0],
          debug: true,
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed action inputs", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          ...plan.actions[0],
          input: {
            typeSlug: "products",
            listPath: "/products",
            enabled: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          ...plan.actions[0],
          input: {
            ...(plan.actions[0]?.input ?? {}),
            extra: "not allowed",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan enforces ready and needs-input invariants", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      questions: [
        {
          id: "question",
          label: "Question",
          description: "Description",
          required: true,
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      status: "needs_input",
      actions: [],
      questions: [],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan clamps confidence and type guard uses strict schema", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(
    normalizeAssistantActionPlan({
      ...plan,
      confidence: 1.7,
    }).confidence
  ).toBe(1);
  expect(isAssistantActionPlanStrict(plan)).toBe(true);
  expect(
    isAssistantActionPlanStrict({
      ...plan,
      actions: [{ ...plan.actions[0], extra: true }],
    })
  ).toBe(false);
});
