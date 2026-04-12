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

test("normalizeAssistantActionPlan accepts entry upsert draft actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-products",
        type: "entry.upsert-draft",
        title: "Create product entry",
        description: "Draft sample product entry.",
        input: {
          contentTypeSlug: "products",
          title: "Sample",
          slug: "sample",
          values: {
            title: "Sample",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("entry.upsert-draft");
});

test("normalizeAssistantActionPlan accepts safe menu item upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "menu-products",
        type: "menu.item.upsert",
        title: "Add products to menu",
        description: "Add products catalog link.",
        input: {
          menuId: "menu-primary",
          label: "Products",
          href: "/products",
          orderIndex: 1,
          settings: {
            description: "Browse products",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("menu.item.upsert");
});

test("normalizeAssistantActionPlan accepts seo document upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "seo-products",
        type: "seo.document.upsert",
        title: "Update product SEO",
        description: "Add SEO metadata to products page.",
        input: {
          targetType: "page",
          targetId: "page-products",
          seo: {
            title: "Products",
            description: "Browse products.",
            canonicalUrl: "/products",
            robots: "index,follow",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("seo.document.upsert");
});

test("normalizeAssistantActionPlan accepts entry media reference attach actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "media-entry",
        type: "media.reference.attach",
        title: "Attach hero image",
        description: "Attach existing media to entry field.",
        input: {
          mediaId: "media-1",
          targetType: "entry",
          targetId: "entry-1",
          field: "heroImage",
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("media.reference.attach");
});

test("normalizeAssistantActionPlan accepts listing query filter patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-filters",
        type: "listing-query.filters.patch",
        title: "Add listing filters",
        description: "Patch filters onto the product listing query.",
        input: {
          listingQueryName: "Products Catalog Query",
          filters: [
            {
              field: "category",
              operator: "eq",
              value: "chairs",
            },
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("listing-query.filters.patch");
});

test("normalizeAssistantActionPlan rejects malformed listing query filter patches", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-filters",
          type: "listing-query.filters.patch",
          title: "Add listing filters",
          description: "Patch filters onto the product listing query.",
          input: {
            listingQueryName: "Products Catalog Query",
            filters: [],
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsupported media reference targets", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "media-entry",
          type: "media.reference.attach",
          title: "Attach hero image",
          description: "Attach existing media to page field.",
          input: {
            mediaId: "media-1",
            targetType: "page",
            targetId: "page-1",
            field: "heroImage",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects invalid seo targets and fields", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "seo-products",
          type: "seo.document.upsert",
          title: "Update product SEO",
          description: "Add SEO metadata to products page.",
          input: {
            targetType: "product",
            targetId: "page-products",
            seo: {
              title: "Products",
            },
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
          id: "seo-products",
          type: "seo.document.upsert",
          title: "Update product SEO",
          description: "Add SEO metadata to products page.",
          input: {
            targetType: "page",
            targetId: "page-products",
            seo: {
              title: "Products",
              debug: true,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsafe menu hrefs", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "menu-products",
          type: "menu.item.upsert",
          title: "Add products to menu",
          description: "Add products catalog link.",
          input: {
            menuId: "menu-primary",
            label: "Products",
            href: "https://example.com/products",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects remaining contract-only actions until adapters land", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-products",
          type: "entry.sample.create",
          title: "Create product entry",
          description: "Draft sample product entry.",
          input: {
            contentTypeSlug: "products",
            samples: [],
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
