import { expect, test } from "vitest";

import {
  normalizeAssistantActionPlan,
  isAssistantActionPlanStrict,
} from "../../../core/services/assistant/actionPlanSchema";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildFullServiceSitePlan } from "../../../core/services/assistant/blueprints/fullServiceSiteBlueprint";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildBasicSiteBuilderNeedsInputPlan } from "../../../core/services/assistant/assistantSiteBuilderIntakeBasicFlow";
import {
  createPageBlockV2,
  createPageSectionV2,
} from "../../../core/services/pages/pageDocumentV2";

test("normalizeAssistantActionPlan accepts current catalog family plans", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.intentId).toBe("product-catalog");
  expect(normalized.actions.map((action) => action.type)).toEqual([
    "content-type.upsert",
    "detail-page.upsert",
    "setting.content-route.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
});

test("normalizeAssistantActionPlan accepts curated media profile entry values", () => {
  const plan = buildFullServiceSitePlan({ promptKind: "setup_request" });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.intentId).toBe("service-business-full-site");
  expect(
    normalized.actions
      .filter((action) => action.type === "entry.sample.create")
      .every(
        (action) =>
          action.type === "entry.sample.create" &&
          typeof action.input.values.coverImageUrl === "string" &&
          action.input.values.coverImageUrl.startsWith("https://images.unsplash.com/")
      )
  ).toBe(true);
});

test("buildFullServiceSitePlan does not fall back to unrelated curated media profiles", () => {
  const plan = buildFullServiceSitePlan({
    prompt: "Stworz kompletny serwis dla restauracji z menu, rezerwacjami i filmem w tle.",
    promptKind: "setup_request",
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(JSON.stringify(normalized.actions)).not.toContain("https://images.unsplash.com/");
  expect(normalized.metadata?.launchReadiness?.requiredMediaPages).toBeUndefined();
  expect(normalized.metadata?.launchReadiness?.checks.some((check) => check.id === "media")).toBe(
    false
  );
});

test("normalizeAssistantActionPlan accepts content route actions with explicit detailPageId semantics", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-content-route-detail-page-id",
    status: "ready",
    intentId: "content-route-detail-page-id",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Update content route",
    answer: "I can update the content route.",
    summary: "Update the route metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "route-blog",
        type: "setting.content-route.upsert",
        title: "Update blog route",
        description: "Update the blog route.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
          detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      },
      {
        id: "route-news",
        type: "setting.content-route.upsert",
        title: "Clear news route detail page link",
        description: "Clear the linked detail page.",
        input: {
          typeSlug: "news",
          listPath: "/news",
          detailPath: "/news/:slug",
          enabled: true,
          detailPageId: null,
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "setting.content-route.upsert",
    input: {
      detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    },
  });
  expect(normalized.actions[1]).toMatchObject({
    type: "setting.content-route.upsert",
    input: {
      detailPageId: null,
    },
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...normalized,
      actions: [
        {
          id: "route-invalid",
          type: "setting.content-route.upsert",
          title: "Invalid detail page route",
          description: "Reject invalid detailPageId.",
          input: {
            typeSlug: "invalid",
            listPath: "/invalid",
            detailPath: "/invalid/:slug",
            enabled: true,
            detailPageId: "not-a-detail-page-id",
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan accepts strict content-type field-add actions", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-content-type-field-add",
    status: "ready",
    intentId: "content-type-field-add",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Add fields",
    answer: "I can add supported fields.",
    summary: "Add fields to one content model.",
    confidence: 0.85,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "content-type-field-add-products",
        type: "content-type.field.add",
        title: "Add product fields",
        description: "Add fields to Products.",
        input: {
          id: "ct-products",
          slug: "products",
          name: "Products",
          fields: [
            { name: "price_amount", label: "Price Amount", type: "number" },
            {
              name: "gallery_images",
              label: "Gallery Images",
              type: "media",
              multiple: true,
              mediaAccept: ["image/*"],
            },
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "content-type.field.add",
    input: {
      fields: [
        expect.objectContaining({ name: "price_amount", type: "number" }),
        expect.objectContaining({ name: "gallery_images", type: "media", multiple: true }),
      ],
    },
  });
  expect(() =>
    normalizeAssistantActionPlan({
      ...normalized,
      actions: [
        {
          id: "bad-field-add",
          type: "content-type.field.add",
          title: "Bad field",
          description: "Reject unknown nested keys.",
          input: {
            id: "ct-products",
            slug: "products",
            name: "Products",
            fields: [{ name: "api_token", type: "text", extra: true }],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
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

test("normalizeAssistantActionPlan rejects unknown site-builder intake metadata registries", () => {
  const validPlan = buildBasicSiteBuilderNeedsInputPlan({});

  const invalidStepRegistryPlan = JSON.parse(JSON.stringify(validPlan)) as Record<string, unknown>;
  const invalidStepMetadata = invalidStepRegistryPlan.metadata as Record<string, unknown>;
  const invalidStepIntake = invalidStepMetadata.siteBuilderIntake as Record<string, unknown>;
  const invalidStepSteps = invalidStepIntake.steps as Record<string, unknown>[];
  const firstStep = invalidStepSteps[0];
  if (!firstStep) throw new Error("site_builder_intake_step_missing");
  invalidStepSteps[0] = {
    ...firstStep,
    optionRegistryId: "externalMedia",
  };

  expect(() => normalizeAssistantActionPlan(invalidStepRegistryPlan)).toThrow(
    "assistant_action_plan_invalid"
  );

  const invalidFieldRegistryPlan = JSON.parse(JSON.stringify(validPlan)) as Record<string, unknown>;
  const invalidFieldMetadata = invalidFieldRegistryPlan.metadata as Record<string, unknown>;
  const invalidFieldIntake = invalidFieldMetadata.siteBuilderIntake as Record<string, unknown>;
  const invalidFieldSteps = invalidFieldIntake.steps as Record<string, unknown>[];
  const siteMapStep = invalidFieldSteps.find((step) => step.id === "site-map");
  if (!siteMapStep) throw new Error("site_map_step_missing");
  const answerFields = siteMapStep.answerFields as Record<string, unknown>[];
  const firstAnswerField = answerFields[0];
  if (!firstAnswerField) throw new Error("site_map_answer_field_missing");
  answerFields[0] = {
    ...firstAnswerField,
    optionRegistryId: "remoteImages",
  };

  expect(() => normalizeAssistantActionPlan(invalidFieldRegistryPlan)).toThrow(
    "assistant_action_plan_invalid"
  );
});

test("normalizeAssistantActionPlan accepts strict blueprint composition metadata", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    metadata: {
      planner: "local",
      providerDraftUsed: false,
      blueprintComposition: {
        schemaVersion: 1,
        kind: "blueprint-composition",
        primaryCapabilityId: "product-catalog",
        adjunctCapabilityIds: ["product-inquiry-catalog"],
        gatedCapabilityIds: ["booking-service"],
        mergedResources: [
          {
            key: "detail-page:products",
            kind: "detail-page",
            sourceCapabilityIds: ["product-catalog"],
          },
          {
            key: "content-type:products",
            kind: "content-type",
            sourceCapabilityIds: ["product-catalog", "product-inquiry-catalog"],
          },
        ],
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
        resolvedConflicts: [],
        unresolvedConflicts: [
          {
            code: "gated_domain",
            severity: "error",
            message: "Booking remains gated.",
            capabilityId: "booking-service",
            resourceKey: "gated:booking",
            actionType: null,
          },
        ],
        diagnostics: {
          candidateScores: [
            {
              id: "product-catalog",
              role: "primary",
              score: 100,
              reasons: ["Primary product catalog."],
            },
          ],
        },
      },
    },
  });

  expect(normalized.metadata?.blueprintComposition).toMatchObject({
    kind: "blueprint-composition",
    primaryCapabilityId: "product-catalog",
    adjunctCapabilityIds: ["product-inquiry-catalog"],
    gatedCapabilityIds: ["booking-service"],
    mergedResources: expect.arrayContaining([
      expect.objectContaining({ kind: "detail-page", key: "detail-page:products" }),
    ]),
    existingResourceMatches: [
      expect.objectContaining({
        status: "matched",
        existingId: "page-products",
      }),
    ],
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "local",
        providerDraftUsed: false,
        blueprintComposition: {
          schemaVersion: 1,
          kind: "blueprint-composition",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: [],
          gatedCapabilityIds: [],
          mergedResources: [],
          existingResourceMatches: [],
          resolvedConflicts: [],
          unresolvedConflicts: [],
          rawProviderOutput: "not allowed",
        },
      },
    })
  ).toThrow("assistant_action_plan_invalid");

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      metadata: {
        planner: "local",
        providerDraftUsed: false,
        blueprintComposition: {
          schemaVersion: 2,
          kind: "blueprint-composition",
          primaryCapabilityId: "product-catalog",
          adjunctCapabilityIds: [],
          gatedCapabilityIds: [],
          mergedResources: [],
          existingResourceMatches: [],
          resolvedConflicts: [],
          unresolvedConflicts: [],
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

test("normalizeAssistantActionPlan accepts gated direct site-kit context plans", () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "forms", "qa"],
      },
    },
  });

  const normalized = normalizeAssistantActionPlan(plan);

  expect(normalized.intentFamily).toBe("site_kit");
  expect(normalized.status).toBe("needs_input");
  expect(normalized.responseKind).toBe("gated");
  expect(normalized.actions).toEqual([]);
});

test("normalizeAssistantActionPlan accepts strict site-kit Advanced runtime overrides", () => {
  const advancedRuntimeOverrides = {
    schemaVersion: 1,
    designPresetId: "modern",
    menu: {
      behaviorIds: ["sticky", "collapse-on-scroll", "mobile-drawer"],
      variantId: "with-cta",
      sticky: true,
      collapseOnScroll: true,
      transparent: false,
      mobileMode: "drawer",
      ctaTargetPageRole: "contact",
    },
    hero: {
      variantId: "split",
      widgetType: "hero",
      widgetVariantId: "split",
      module: "content",
      alias: "hero",
    },
    sectionVariants: [
      {
        variantId: "proof-spotlight",
        sectionRoleId: "proof",
        alias: "testimonials",
        widgetType: "testimonials",
        widgetVariantId: "spotlight",
        module: "engagement",
      },
    ],
  };
  const plan = {
    id: "plan-site-kit-advanced-runtime",
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Advanced Site Kit",
    answer: "Install the reviewed Advanced site kit.",
    summary: "Dry-run and execute the selected Advanced site kit.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-recommend-advanced",
        type: "site-kit.recommend",
        title: "Recommend kit",
        description: "Recommend the selected kit.",
        input: {
          businessType: "custom",
          goals: ["lead_generation"],
          locale: "pl",
          selectedKitId: "local-service-business",
          enabledStepIds: ["settings", "pages", "navigation", "qa"],
          advancedRuntimeOverrides,
          preview: { selectedKitId: "local-service-business" },
        },
      },
      {
        id: "site-kit-install-advanced",
        type: "site-kit.install",
        title: "Install kit",
        description: "Install the selected kit.",
        input: {
          businessType: "custom",
          goals: ["lead_generation"],
          locale: "pl",
          selectedKitId: "local-service-business",
          enabledStepIds: ["settings", "pages", "navigation", "qa"],
          advancedRuntimeOverrides,
          continueOnError: true,
          preview: { selectedKitId: "local-service-business" },
        },
      },
    ],
  } as const;

  const normalized = normalizeAssistantActionPlan(plan);
  expect(normalized.actions[1]).toMatchObject({
    type: "site-kit.install",
    input: {
      advancedRuntimeOverrides: {
        menu: {
          behaviorIds: ["sticky", "collapse-on-scroll", "mobile-drawer"],
          collapseOnScroll: true,
          ctaTargetPageRole: "contact",
        },
        hero: {
          widgetVariantId: "split",
        },
      },
    },
  });

  const tampered = structuredClone(plan);
  tampered.actions[1].input.advancedRuntimeOverrides.hero.widgetType = "cta-banner";
  expect(() => normalizeAssistantActionPlan(tampered)).toThrow("assistant_action_plan_invalid");

  const tamperedNavigationVariant = structuredClone(plan);
  tamperedNavigationVariant.actions[1].input.advancedRuntimeOverrides.menu.variantId = "mega";
  expect(() => normalizeAssistantActionPlan(tamperedNavigationVariant)).toThrow(
    "assistant_action_plan_invalid"
  );

  const tamperedMobileMode = structuredClone(plan);
  tamperedMobileMode.actions[1].input.advancedRuntimeOverrides.menu.mobileMode = "popover";
  expect(() => normalizeAssistantActionPlan(tamperedMobileMode)).toThrow(
    "assistant_action_plan_invalid"
  );

  const tamperedCollapseOnScroll = structuredClone(plan);
  (
    tamperedCollapseOnScroll.actions[1].input.advancedRuntimeOverrides.menu as {
      collapseOnScroll: unknown;
    }
  ).collapseOnScroll = "yes";
  expect(() => normalizeAssistantActionPlan(tamperedCollapseOnScroll)).toThrow(
    "assistant_action_plan_invalid"
  );
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
            targetId: {
              kind: "stable-slug",
              resourceType: "page",
              slug: "/products",
              debug: true,
            },
            seo: {
              title: "Products",
            },
          },
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

test("normalizeAssistantActionPlan accepts public sample entry actions", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "entry-sample-service",
        type: "entry.sample.create",
        title: "Publish service sample",
        description: "Create a published sample service entry.",
        input: {
          contentTypeSlug: "services-directory",
          title: "Projekt koncepcyjny",
          slug: "projekt-koncepcyjny",
          status: "published",
          values: {
            title: "Projekt koncepcyjny",
          },
          seo: {
            title: "Projekt koncepcyjny | Studio Forma",
            description: "Poznaj zakres projektu koncepcyjnego dla inwestorow.",
            canonicalUrl: "/uslugi/projekt-koncepcyjny",
            robots: "index,follow",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "entry.sample.create",
    input: {
      status: "published",
      slug: "projekt-koncepcyjny",
    },
  });
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
        id: "menu-primary",
        type: "menu.upsert",
        title: "Create primary menu",
        description: "Create the primary navigation menu.",
        input: {
          name: "Primary navigation",
          location: "primary",
          status: "published",
        },
      },
      {
        id: "menu-products",
        type: "menu.item.upsert",
        title: "Add products to menu",
        description: "Add products catalog link.",
        input: {
          menuId: {
            kind: "action-result",
            actionId: "menu-primary",
            resourceType: "menu",
            field: "id",
          },
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

  expect(normalized.actions[0]?.type).toBe("menu.upsert");
  expect(normalized.actions[1]).toMatchObject({
    type: "menu.item.upsert",
    input: {
      menuId: {
        kind: "action-result",
        actionId: "menu-primary",
        resourceType: "menu",
      },
    },
  });
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

test("normalizeAssistantActionPlan accepts seo target locators", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "seo-home",
        type: "seo.document.upsert",
        title: "Update home SEO",
        description: "Add SEO metadata to the home page.",
        input: {
          targetType: "page",
          targetId: {
            kind: "stable-slug",
            resourceType: "page",
            slug: "/",
          },
          seo: {
            title: "Studio Forma",
            description: "Architektura w pelnym procesie.",
            canonicalUrl: "/",
            robots: "index,follow",
          },
        },
      },
      {
        id: "seo-service",
        type: "seo.document.upsert",
        title: "Update service SEO",
        description: "Add SEO metadata to a sample service.",
        input: {
          targetType: "entry",
          targetId: {
            kind: "action-result",
            actionId: "entry-sample-service",
            resourceType: "entry",
            field: "id",
          },
          seo: {
            title: "Projekt koncepcyjny | Studio Forma",
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "seo.document.upsert",
    input: {
      targetId: {
        kind: "stable-slug",
        resourceType: "page",
        slug: "/",
      },
    },
  });
  expect(normalized.actions[1]).toMatchObject({
    type: "seo.document.upsert",
    input: {
      targetId: {
        kind: "action-result",
        actionId: "entry-sample-service",
      },
    },
  });
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

test("normalizeAssistantActionPlan rejects retired page widget patch actions", () => {
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
            operation: "upsert-block",
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

test("normalizeAssistantActionPlan accepts page upsert sections that reference trusted media library asset ids", () => {
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
          sections: [
            createPageSectionV2("hero", {
              id: "hero-1",
              name: "Hero",
              blocks: [
                createPageBlockV2("image", {
                  id: "hero-media",
                  props: {
                    assetId: "media-hero",
                    alt: "Product hero",
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      sections: [
        {
          blocks: [
            {
              props: {
                assetId: "media-hero",
              },
            },
          ],
        },
      ],
    },
  });
});

test("normalizeAssistantActionPlan accepts detail-page upsert documents", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-detail-page-upsert",
    status: "ready",
    intentId: "detail-page-upsert",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: {
            schemaVersion: 1,
            id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            name: "Products detail template",
            contentTypeId: "4fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
            status: "published",
            titlePattern: "{{ title }}",
            settings: {
              template: "detail",
              layout: {
                wrapper: {
                  container: "default",
                  padding: { top: "md", bottom: "lg" },
                  background: {
                    color: "#ffffff",
                    image: null,
                    media: {
                      type: "none",
                      source: "external",
                      src: null,
                    },
                  },
                },
                sections: {
                  gap: "lg",
                  defaults: {
                    container: "default",
                    padding: { top: "xl", bottom: "xl" },
                    margin: { top: "none", bottom: "none" },
                  },
                },
                applyDefaultsToNewBlocks: false,
              },
            },
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                variant: "centered",
                data: {
                  headline: "Products detail",
                },
              },
            ],
            bindings: [],
          },
          expectedExistingId: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "detail-page.upsert",
    input: {
      expectedExistingId: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      document: {
        id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        contentTypeSlug: "products",
        status: "published",
      },
    },
  });
});

test("normalizeAssistantActionPlan accepts detail-page content type locators", () => {
  const normalized = normalizeAssistantActionPlan({
    id: "plan-detail-page-upsert-locator",
    status: "ready",
    intentId: "detail-page-upsert-locator",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          contentTypeId: {
            kind: "stable-slug",
            resourceType: "content-type",
            slug: "products",
          },
          document: {
            schemaVersion: 1,
            id: "44d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            name: "Products detail template",
            contentTypeId: "4fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
            status: "published",
            titlePattern: "{{ title }}",
            settings: {
              template: "detail",
              layout: {
                wrapper: {
                  container: "default",
                  padding: { top: "md", bottom: "lg" },
                  background: {
                    color: "#ffffff",
                    image: null,
                    media: {
                      type: "none",
                      source: "external",
                      src: null,
                    },
                  },
                },
                sections: {
                  gap: "lg",
                  defaults: {
                    container: "default",
                    padding: { top: "xl", bottom: "xl" },
                    margin: { top: "none", bottom: "none" },
                  },
                },
                applyDefaultsToNewBlocks: false,
              },
            },
            blocks: [],
            bindings: [],
          },
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "detail-page.upsert",
    input: {
      contentTypeId: {
        kind: "stable-slug",
        resourceType: "content-type",
        slug: "products",
      },
    },
  });
});

test("normalizeAssistantActionPlan rejects top-level detail-page status outside document", () => {
  expect(() =>
    normalizeAssistantActionPlan({
      id: "plan-detail-page-upsert-invalid",
      status: "ready",
      intentId: "detail-page-upsert-invalid",
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Create detail template",
      answer: "I can create the detail template.",
      summary: "Create a products detail template.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: "detail-page-products",
          type: "detail-page.upsert",
          title: "Create products detail template",
          description: "Create a products detail template.",
          input: {
            status: "published",
            document: {
              schemaVersion: 1,
              id: "54d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
              name: "Products detail template",
              contentTypeId: "5fd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
              contentTypeSlug: "products",
              status: "published",
              titlePattern: "{{ title }}",
              settings: {
                template: "detail",
                layout: {
                  wrapper: {
                    container: "default",
                    padding: { top: "md", bottom: "lg" },
                    background: {
                      color: "#ffffff",
                      image: null,
                      media: {
                        type: "none",
                        source: "external",
                        src: null,
                      },
                    },
                  },
                  sections: {
                    gap: "lg",
                    defaults: {
                      container: "default",
                      padding: { top: "xl", bottom: "xl" },
                      margin: { top: "none", bottom: "none" },
                    },
                  },
                  applyDefaultsToNewBlocks: false,
                },
              },
              blocks: [],
              bindings: [],
            },
          },
        },
      ],
    })
  ).toThrow();
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
            collectionRole: "secondary-admin-screen",
            compositionKey: "projects-secondary",
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
  expect(normalized.actions[0]).toMatchObject({
    input: {
      patch: {
        collectionRole: "secondary-admin-screen",
        compositionKey: "projects-secondary",
      },
    },
  });
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
  const imageBlock = createPageBlockV2("image", {
    id: "hero-media",
    props: {
      alt: "Browse products",
    },
  });
  const heroSection = createPageSectionV2("hero", {
    id: "hero-1",
    name: "Hero",
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
              sections: [
                {
                  ...heroSection,
                  blocks: [
                    {
                      ...imageBlock,
                      props: {
                        ...imageBlock.props,
                        src,
                      },
                    },
                  ],
                },
              ],
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan accepts assistant-emittable nested layout page blocks", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const normalized = normalizeAssistantActionPlan({
    ...plan,
    actions: [
      {
        id: "page-layout",
        type: "page.upsert",
        title: "Create layout page",
        description: "Create a page with nested layout blocks.",
        input: {
          title: "Layout",
          slug: "/layout",
          status: "published",
          introTitle: "Layout",
          introBody: "Nested layout content.",
          sections: [
            createPageSectionV2("content", {
              id: "section-layout",
              blocks: [
                createPageBlockV2("container", {
                  id: "container-1",
                  slots: {
                    children: [
                      createPageBlockV2("heading", {
                        id: "nested-heading",
                        props: { text: "Nested heading", level: "h2", align: "left" },
                      }),
                    ],
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

  const pageAction = normalized.actions[0];
  expect(pageAction?.type).toBe("page.upsert");
  expect(
    pageAction?.type === "page.upsert" ? pageAction.input.sections?.[0]?.blocks[0] : null
  ).toMatchObject({
    type: "container",
    slots: {
      children: [{ id: "nested-heading", type: "heading" }],
    },
  });
});

test("normalizeAssistantActionPlan rejects data-bound sections outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-form-section",
          type: "page.upsert",
          title: "Create form page",
          description: "Attempt to create an assistant-gated form section.",
          input: {
            title: "Contact",
            slug: "/contact",
            status: "published",
            introTitle: "Contact",
            introBody: "Send a message.",
            sections: [
              createPageSectionV2("lead-form", {
                id: "section-form",
                blocks: [createPageBlockV2("text", { id: "form-copy" })],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects data-bound blocks outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-form-block",
          type: "page.upsert",
          title: "Create form block page",
          description: "Attempt to create an assistant-gated form block.",
          input: {
            title: "Contact",
            slug: "/contact",
            status: "published",
            introTitle: "Contact",
            introBody: "Send a message.",
            sections: [
              createPageSectionV2("content", {
                id: "section-content",
                blocks: [
                  createPageBlockV2("form", {
                    id: "form-1",
                    props: { formId: "form-contact", title: "Contact form" },
                  }),
                ],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects page blocks outside assistant vocabulary", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "page-icon",
          type: "page.upsert",
          title: "Create icon page",
          description: "Attempt to create a gated icon block.",
          input: {
            title: "Icon",
            slug: "/icon",
            status: "published",
            introTitle: "Icon",
            introBody: "Unsupported block.",
            sections: [
              createPageSectionV2("content", {
                id: "section-icon",
                blocks: [createPageBlockV2("icon", { id: "icon-1" })],
              }),
            ],
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan rejects raw media URLs inside entry media fields", () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const key of ["coverImageUrl", "heroImage", "gallery"]) {
    const values =
      key === "gallery"
        ? { title: "Unsafe entry", gallery: ["https://example.com/gallery.jpg"] }
        : { title: "Unsafe entry", [key]: "https://example.com/cover.jpg" };
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: `entry-unsafe-${key}`,
            type: "entry.sample.create",
            title: "Create unsafe sample",
            description: "Attempt to render a remote media URL from provider output.",
            input: {
              contentTypeSlug: "portfolio-projects",
              title: "Unsafe entry",
              slug: "unsafe-entry",
              status: "published",
              values,
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan rejects curated URLs inside media asset id fields", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const curatedUrl = fullServicePlan.actions.find((action) => action.type === "entry.sample.create")
    ?.input.values.coverImageUrl;
  if (typeof curatedUrl !== "string") {
    throw new Error("expected_curated_cover_url");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  for (const key of ["heroImage", "gallery"]) {
    const values =
      key === "gallery"
        ? { title: "Unsafe entry", gallery: [curatedUrl] }
        : { title: "Unsafe entry", [key]: curatedUrl };
    expect(() =>
      normalizeAssistantActionPlan({
        ...plan,
        actions: [
          {
            id: `entry-curated-unsafe-${key}`,
            type: "entry.sample.create",
            title: "Create unsafe curated sample",
            description: "Attempt to store a curated URL inside a media asset id field.",
            input: {
              contentTypeSlug: "portfolio-projects",
              title: "Unsafe entry",
              slug: "unsafe-entry",
              status: "published",
              values,
            },
          },
        ],
      })
    ).toThrow("assistant_action_plan_invalid");
  }
});

test("normalizeAssistantActionPlan rejects untrusted curated media metadata urls", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const sample = fullServicePlan.actions.find((action) => action.type === "entry.sample.create");
  if (!sample || sample.type !== "entry.sample.create") {
    throw new Error("expected_curated_sample");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-unsafe-curated-source",
          type: "entry.sample.create",
          title: "Create unsafe curated source",
          description: "Attempt to attach an arbitrary source URL to curated media.",
          input: {
            contentTypeSlug: "portfolio-projects",
            title: "Unsafe source",
            slug: "unsafe-source",
            status: "published",
            values: {
              title: "Unsafe source",
              coverImageUrl: sample.input.values.coverImageUrl,
              coverImageSourceName: sample.input.values.coverImageSourceName,
              coverImageSourceUrl: "https://example.com/source",
              coverImageLicenseName: sample.input.values.coverImageLicenseName,
              coverImageLicenseUrl: sample.input.values.coverImageLicenseUrl,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan requires source and license metadata for curated cover urls", () => {
  const fullServicePlan = buildFullServiceSitePlan({ promptKind: "setup_request" });
  const sample = fullServicePlan.actions.find((action) => action.type === "entry.sample.create");
  if (!sample || sample.type !== "entry.sample.create") {
    throw new Error("expected_curated_sample");
  }
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  expect(() =>
    normalizeAssistantActionPlan({
      ...plan,
      actions: [
        {
          id: "entry-missing-curated-source",
          type: "entry.sample.create",
          title: "Create incomplete curated source",
          description: "Attempt to attach curated media without source metadata.",
          input: {
            contentTypeSlug: "portfolio-projects",
            title: "Incomplete source",
            slug: "incomplete-source",
            status: "published",
            values: {
              title: "Incomplete source",
              coverImageUrl: sample.input.values.coverImageUrl,
            },
          },
        },
      ],
    })
  ).toThrow("assistant_action_plan_invalid");
});

test("normalizeAssistantActionPlan keeps non-media URL fields available to page section contracts", () => {
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
          sections: [
            createPageSectionV2("hero", {
              id: "hero-1",
              name: "Hero",
              blocks: [
                createPageBlockV2("button", {
                  id: "hero-cta",
                  props: {
                    href: "https://example.com/buy",
                    label: "Buy",
                  },
                }),
              ],
            }),
          ],
        },
      },
    ],
  });

  expect(normalized.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      sections: [
        {
          blocks: [
            {
              props: {
                href: "https://example.com/buy",
              },
            },
          ],
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

test("normalizeAssistantActionPlan rejects malformed sample entry actions", () => {
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
            title: "Sample",
            slug: "sample",
            status: "draft",
            values: {
              title: "Sample",
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
          id: "entry-products",
          type: "entry.sample.create",
          title: "Create product entry",
          description: "Published sample product entry.",
          input: {
            contentTypeSlug: "products",
            title: "Sample",
            slug: "sample",
            status: "published",
            values: {
              title: "Sample",
            },
            debug: true,
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
          type: "entry.bulk-draft.create",
          title: "Create product entries",
          description: "Draft sample product entries.",
          input: {
            contentTypeSlug: "products",
            entries: [],
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
