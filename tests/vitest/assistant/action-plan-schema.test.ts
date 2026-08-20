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
