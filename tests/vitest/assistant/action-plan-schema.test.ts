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

test("normalizeAssistantActionPlan accepts strict planner metadata", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        providerId: "fake",
        blueprintShadow: {
          schemaVersion: 1,
          currentIntentId: "product-catalog",
          currentIntentFamily: "product_catalog",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: ["product-inquiry-catalog"],
          gatedCapabilityIds: [],
          candidates: [
            {
              capabilityId: "product-catalog",
              role: "primary",
              score: 100,
              matchedSignals: ["intent:product_catalog"],
              reasons: ["Primary product catalog."],
            },
          ],
          mismatchReason: null,
        },
      },
    }).metadata
  ).toEqual({
    planner: "provider",
    providerDraftUsed: true,
    providerId: "fake",
    blueprintShadow: {
      schemaVersion: 1,
      currentIntentId: "product-catalog",
      currentIntentFamily: "product_catalog",
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog"],
      gatedCapabilityIds: [],
      candidates: [
        {
          capabilityId: "product-catalog",
          role: "primary",
          score: 100,
          matchedSignals: ["intent:product_catalog"],
          reasons: ["Primary product catalog."],
        },
      ],
      mismatchReason: null,
    },
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        debug: true,
      },
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        blueprintShadow: {
          schemaVersion: 2,
          currentIntentId: "product-catalog",
          currentIntentFamily: "product_catalog",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: [],
          gatedCapabilityIds: [],
          candidates: [],
          mismatchReason: null,
        },
      },
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        blueprintShadow: {
          schemaVersion: 1,
          currentIntentId: "product-catalog",
          currentIntentFamily: "wrong_family",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: [],
          gatedCapabilityIds: [],
          candidates: [],
          mismatchReason: null,
        },
      },
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "provider",
        providerDraftUsed: true,
        blueprintShadow: {
          schemaVersion: 1,
          currentIntentId: "product-catalog",
          currentIntentFamily: "product_catalog",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: [],
          gatedCapabilityIds: [],
          candidates: [
            {
              capabilityId: "product-catalog",
              role: "unsupported",
              score: 100,
              matchedSignals: [],
              reasons: [],
            },
          ],
          mismatchReason: null,
        },
      },
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts read-only inspection plans", () => {
  const plan = normalizeAssistantActionPlan({
    id: "plan-cms-page-inspect",
    status: "ready",
    intentId: "cms-resource-inspect",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    inspection: {
      kind: "resource-candidates",
      operation: "inspect",
      resourceKind: "page",
      matchStatus: "matched",
      query: "Pysiek Mysiek",
      candidates: [
        {
          kind: "page",
          id: "page-pysiek",
          label: "Pysiek Mysiek",
          slug: "/pysiek-mysiek",
          status: "draft",
          adminHref: "/admin/pages/page-pysiek",
        },
      ],
      truncated: false,
    },
    title: "CMS resource inspection",
    answer: "Found one page.",
    summary: "Found 1 page candidate.",
    confidence: 0.84,
    assumptions: ["Read-only."],
    questions: [],
    actions: [],
  });

  expect(plan.inspection?.candidates[0]?.label).toBe("Pysiek Mysiek");
  expect(plan.actions).toEqual([]);
});

test("normalizeAssistantActionPlan accepts docs response kind and rejects executable docs plans", () => {
  const docsPlan = normalizeAssistantActionPlan({
    id: "plan-docs-guidance",
    status: "ready",
    intentId: "docs-guidance",
    responseKind: "docs",
    promptKind: "docs_question",
    intentFamily: "unknown",
    title: "Documentation guidance",
    answer: "This is a non-mutating docs answer.",
    summary: "Docs guidance.",
    confidence: 0.62,
    assumptions: ["Read-only."],
    questions: [],
    actions: [],
  });

  expect(docsPlan.responseKind).toBe("docs");

  expect(() =>
    normalizeAssistantActionPlan({
      ...docsPlan,
      actions: [
        {
          id: "page-delete",
          type: "page.delete",
          title: "Delete page",
          description: "Unsafe docs response action.",
          input: {
            id: "page-1",
            title: "Home",
            slug: "/",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
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

test("normalizeAssistantActionPlan accepts menu and seo delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "menu-products-delete",
        type: "menu.item.delete",
        title: "Delete products menu item",
        description: "Delete selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
        },
      },
      {
        id: "seo-products-delete",
        type: "seo.document.delete",
        title: "Delete products SEO",
        description: "Delete selected SEO document.",
        input: {
          id: "seo-1",
          targetType: "page",
          targetId: "page-products",
          expectedSlug: "/products",
          expectedTitle: "Products Catalog",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "menu.item.delete",
    "seo.document.delete",
  ]);
});

test("normalizeAssistantActionPlan accepts remaining domain update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-update",
        type: "entry.update",
        title: "Update entry",
        description: "Update selected entry.",
        input: {
          id: "entry-1",
          contentTypeSlug: "products",
          expectedTitle: "Old",
          expectedSlug: "old",
          expectedStatus: "draft",
          patch: {
            title: "New",
            values: { title: "New" },
            seo: { title: "SEO New" },
          },
        },
      },
      {
        id: "form-update",
        type: "form.update",
        title: "Update form",
        description: "Update selected form.",
        input: {
          id: "form-1",
          name: "Contact",
          slug: "contact",
          expectedStatus: "published",
          patch: {
            name: "Contact Updated",
            submissionAccess: "internal",
          },
        },
      },
      {
        id: "listing-query-update",
        type: "listing-query.update",
        title: "Update query",
        description: "Update listing query.",
        input: {
          id: "query-1",
          name: "Products Query",
          patch: {
            limit: 24,
            includeDrafts: false,
          },
        },
      },
      {
        id: "listing-template-update",
        type: "listing-template.update",
        title: "Update template",
        description: "Update listing template.",
        input: {
          id: "template-1",
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
          patch: {
            layout: "list",
            card: { showImage: false },
          },
        },
      },
      {
        id: "menu-item-update",
        type: "menu.item.update",
        title: "Update menu item",
        description: "Update menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
          patch: {
            label: "Products Catalog",
          },
        },
      },
      {
        id: "seo-update",
        type: "seo.document.update",
        title: "Update SEO",
        description: "Update SEO document.",
        input: {
          id: "seo-1",
          targetType: "page",
          targetId: "page-1",
          expectedSlug: "/products",
          expectedTitle: "Products",
          patch: {
            title: "Products SEO",
            description: "Browse products.",
          },
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "entry.update",
    "form.update",
    "listing-query.update",
    "listing-template.update",
    "menu.item.update",
    "seo.document.update",
  ]);
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

test("normalizeAssistantActionPlan accepts listing delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-query-delete",
        type: "listing-query.delete",
        title: "Delete listing query",
        description: "Delete product listing query.",
        input: {
          id: "query-1",
          name: "Products Catalog Query",
        },
      },
      {
        id: "listing-template-delete",
        type: "listing-template.delete",
        title: "Delete listing template",
        description: "Delete product listing template.",
        input: {
          id: "template-1",
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "listing-query.delete",
    "listing-template.delete",
  ]);
});

test("normalizeAssistantActionPlan accepts listing template card patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "listing-card",
        type: "listing-template.card.patch",
        title: "Update card config",
        description: "Patch product card config.",
        input: {
          listingTemplateSlug: "products-grid",
          card: {
            showPrice: true,
            showStatus: true,
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("listing-template.card.patch");
});

test("normalizeAssistantActionPlan accepts page widget patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-spacer",
        type: "page.widget.patch",
        title: "Add spacer",
        description: "Append a spacer block to the page.",
        input: {
          pageSlug: "/products",
          operation: "upsert-block",
          block: {
            id: "assistant-spacer",
            type: "spacer",
            data: {},
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("page.widget.patch");
});

test("normalizeAssistantActionPlan accepts page widget data patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-hero-title",
        type: "page.widget.patch",
        title: "Patch hero title",
        description: "Patch selected block title.",
        input: {
          pageSlug: "/products",
          operation: "patch-data",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["title"],
          value: "New title",
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("page.widget.patch");
});

test("normalizeAssistantActionPlan accepts page update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-update",
        type: "page.update",
        title: "Update page",
        description: "Update page metadata.",
        input: {
          id: "page-1",
          title: "Products",
          slug: "/products",
          expectedStatus: "draft",
          patch: {
            title: "Products Catalog",
            slug: "/catalog",
            status: "published",
            settings: {
              template: "landing",
              showInNav: false,
              revisionRetention: 5,
              seo: {
                title: "Products Catalog",
                description: "Browse products.",
              },
            },
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("page.update");
});

test("normalizeAssistantActionPlan accepts page upsert collection-link metadata", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create page",
        description: "Create a catalog page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          listingQueryName: "Products Catalog Query",
          listingTemplateSlug: "products-grid",
          introTitle: "Products",
          introBody: "Browse products.",
          collectionLink: {
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            pageRole: "canonical-list-page",
            listingQueryId: "query-products",
            listingQueryName: "Products Catalog Query",
            listingTemplateId: "template-products",
            listingTemplateSlug: "products-grid",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      collectionLink: {
        contentTypeId: "ct-products",
        contentTypeSlug: "products",
        pageRole: "canonical-list-page",
        listingQueryId: "query-products",
        listingQueryName: "Products Catalog Query",
        listingTemplateId: "template-products",
        listingTemplateSlug: "products-grid",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts page upsert blocks that reference trusted media library asset ids", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create page",
        description: "Create a catalog page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          introTitle: "Products",
          introBody: "Browse products.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Browse products",
                media: {
                  type: "image",
                  source: "library",
                  assetId: "media-hero",
                },
              },
            },
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      blocks: [
        {
          data: {
            media: {
              type: "image",
              source: "library",
              assetId: "media-hero",
            },
          },
        },
      ],
    },
  });
});

test("normalizeAssistantActionPlan accepts widget template update and block patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "template-update",
        type: "widget-template.update",
        title: "Update template",
        description: "Update reusable widget template.",
        input: {
          id: "template-1",
          name: "Hero Template",
          expectedStatus: "draft",
          expectedCategory: "Marketing",
          patch: {
            name: "Hero Template Updated",
            status: "published",
            settings: {
              wrapperContainer: "narrow",
              sectionGap: "md",
            },
          },
        },
      },
      {
        id: "template-block-patch",
        type: "widget-template.block.patch",
        title: "Patch template block",
        description: "Patch reusable widget template block.",
        input: {
          id: "template-1",
          name: "Hero Template",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "widget-template.update",
    "widget-template.block.patch",
  ]);
});

test("normalizeAssistantActionPlan accepts custom screen update and widget patch actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "screen-update",
        type: "custom-screen.update",
        title: "Update screen",
        description: "Update custom screen.",
        input: {
          id: "screen-1",
          name: "Project Screen",
          expectedStatus: "draft",
          expectedContentTypeId: "ct-projects",
          patch: {
            name: "Project Screen Updated",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "Projects",
            binding: {
              widgetId: "hero-1",
              propPath: "headline",
              field: "title",
              mode: "readwrite",
            },
          },
        },
      },
      {
        id: "screen-widget-patch",
        type: "custom-screen.widget.patch",
        title: "Patch screen widget",
        description: "Patch custom screen widget block.",
        input: {
          id: "screen-1",
          name: "Project Screen",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual([
    "custom-screen.update",
    "custom-screen.widget.patch",
  ]);
});

test("normalizeAssistantActionPlan accepts safe form automation upsert actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "form-success",
        type: "form.automation.upsert",
        title: "Set success message",
        description: "Set form success message automation.",
        input: {
          formId: "form-1",
          action: {
            id: "success-message",
            type: "success_message",
            label: "Show success",
            config: {
              message: "Thanks for your message.",
            },
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]?.type).toBe("form.automation.upsert");
});

test("normalizeAssistantActionPlan accepts form delete and archive actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "form-delete",
        type: "form.delete",
        title: "Delete contact form",
        description: "Delete empty form.",
        input: {
          id: "form-1",
          name: "Contact",
          slug: "contact",
          expectedStatus: "draft",
        },
      },
      {
        id: "form-archive",
        type: "form.archive",
        title: "Archive lead form",
        description: "Archive form with submissions.",
        input: {
          id: "form-2",
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  });

  expect(normalized.actions.map((action) => action.type)).toEqual(["form.delete", "form.archive"]);
});

test("normalizeAssistantActionPlan rejects webhook form automation in this slice", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "form-webhook",
          type: "form.automation.upsert",
          title: "Set webhook",
          description: "Set form webhook automation.",
          input: {
            formId: "form-1",
            action: {
              id: "webhook",
              type: "webhook",
              config: {
                url: "https://example.com/hook",
                method: "POST",
                headers: {
                  authorization: "secret",
                },
                timeoutMs: 8000,
                includeSubmission: true,
              },
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed form delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "form-delete",
          type: "form.delete",
          title: "Delete contact form",
          description: "Delete empty form.",
          input: {
            id: "form-1",
            name: "Contact",
            slug: "contact",
            debug: true,
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
          id: "form-archive",
          type: "form.archive",
          title: "Archive contact form",
          description: "Archive form.",
          input: {
            id: "form-1",
            name: "Contact",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsupported page widget patch operations", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-spacer",
          type: "page.widget.patch",
          title: "Add spacer",
          description: "Append a spacer block to the page.",
          input: {
            pageSlug: "/products",
            operation: "delete-block",
            block: {
              id: "assistant-spacer",
              type: "spacer",
              data: {},
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects unsafe page widget data patch paths", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-hero-title",
          type: "page.widget.patch",
          title: "Patch hero title",
          description: "Patch selected block title.",
          input: {
            pageSlug: "/products",
            operation: "patch-data",
            blockId: "hero-1",
            dataPath: ["__proto__"],
            value: "Nope",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed page update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-update",
          type: "page.update",
          title: "Update page",
          description: "Update page metadata.",
          input: {
            id: "page-1",
            title: "Products",
            slug: "/products",
            patch: {
              blocks: [],
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed widget template edit actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "template-update",
          type: "widget-template.update",
          title: "Update template",
          description: "Update reusable widget template.",
          input: {
            id: "template-1",
            name: "Hero Template",
            patch: {
              settings: {
                wrapperContainer: "wide",
              },
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
          id: "template-block-patch",
          type: "widget-template.block.patch",
          title: "Patch template block",
          description: "Patch reusable widget template block.",
          input: {
            id: "template-1",
            name: "Hero Template",
            blockId: "hero-1",
            dataPath: ["constructor"],
            value: "Nope",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed custom screen edit actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "screen-update",
          type: "custom-screen.update",
          title: "Update screen",
          description: "Update custom screen.",
          input: {
            id: "screen-1",
            name: "Project Screen",
            patch: {
              binding: {
                widgetId: "hero-1",
                propPath: "headline",
                field: "title",
                mode: "admin",
              },
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
          id: "screen-widget-patch",
          type: "custom-screen.widget.patch",
          title: "Patch screen widget",
          description: "Patch custom screen widget block.",
          input: {
            id: "screen-1",
            name: "Project Screen",
            blockId: "hero-1",
            dataPath: ["prototype"],
            value: "Nope",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed listing template card patches", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-card",
          type: "listing-template.card.patch",
          title: "Update card config",
          description: "Patch product card config.",
          input: {
            listingTemplateSlug: "products-grid",
            card: {},
            debug: true,
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects malformed remaining domain update actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-query-update",
          type: "listing-query.update",
          title: "Update query",
          description: "Update listing query.",
          input: {
            id: "query-1",
            name: "Products Query",
            patch: {
              debug: true,
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
          id: "menu-item-update",
          type: "menu.item.update",
          title: "Update menu item",
          description: "Update menu item.",
          input: {
            menuId: "menu-primary",
            itemId: "menu-products",
            label: "Products",
            patch: {
              href: "https://example.com",
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
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

test("normalizeAssistantActionPlan rejects malformed listing delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "listing-query-delete",
          type: "listing-query.delete",
          title: "Delete listing query",
          description: "Delete product listing query.",
          input: {
            id: "query-1",
            name: "Products Catalog Query",
            debug: true,
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
          id: "listing-template-delete",
          type: "listing-template.delete",
          title: "Delete listing template",
          description: "Delete product listing template.",
          input: {
            id: "template-1",
            name: "Products Grid",
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

test("normalizeAssistantActionPlan rejects raw media URLs inside page upsert blocks", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const src of [
    "https://example.com/hero.jpg",
    "data:image/png;base64,Zm9v",
    "blob:https://example.com/123",
    "file:///tmp/hero.jpg",
  ]) {
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: "page-products",
            type: "page.upsert",
            title: "Create page",
            description: "Create a catalog page.",
            input: {
              title: "Products",
              slug: "/products",
              status: "published",
              introTitle: "Products",
              introBody: "Browse products.",
              blocks: [
                {
                  id: "hero-1",
                  type: "hero",
                  variant: "centered",
                  data: {
                    headline: "Browse products",
                    media: {
                      type: "image",
                      source: "external",
                      src,
                    },
                  },
                },
              ],
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan keeps non-media URL fields available to widget contracts", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-products",
        type: "page.upsert",
        title: "Create page",
        description: "Create a catalog page.",
        input: {
          title: "Products",
          slug: "/products",
          status: "published",
          introTitle: "Products",
          introBody: "Browse products.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Browse products",
                ctaUrl: "https://example.com/buy",
              },
            },
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      blocks: [
        {
          data: {
            ctaUrl: "https://example.com/buy",
          },
        },
      ],
    },
  });
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

test("normalizeAssistantActionPlan rejects malformed menu and seo delete actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "menu-delete",
          type: "menu.item.delete",
          title: "Delete menu item",
          description: "Delete selected menu item.",
          input: {
            menuId: "menu-primary",
            itemId: "menu-products",
            label: "Products",
            debug: true,
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
          id: "seo-delete",
          type: "seo.document.delete",
          title: "Delete SEO",
          description: "Delete selected SEO document.",
          input: {
            id: "seo-1",
            targetType: "product",
            targetId: "page-products",
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
