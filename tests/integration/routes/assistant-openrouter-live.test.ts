import { expect, test } from "bun:test";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import { planAssistantActionsWithProviderDraft } from "../../../core/services/assistant/actionPlannerService";
import { createOpenRouterProvider } from "../../../core/services/assistant/providers/openRouterProvider";

const apiKey = process.env.TEST_OPENROUTER_API_KEY?.trim();
const model = process.env.TEST_OPENROUTER_MODEL?.trim();

const liveTest = apiKey && model ? test : test.skip;

const catalog = {
  schemaVersion: 1,
  generatedAt: "2026-04-17T10:00:00.000Z",
  budget: {
    maxItemsPerGroup: 50,
    maxFieldsPerResource: 24,
    truncated: false,
  },
  pages: [
    { id: "page-home", title: "home", slug: "/", status: "published" },
    { id: "page-pysiek", title: "Pysiek Mysiek", slug: "/pysiek-mysiek", status: "draft" },
    { id: "page-contact", title: "Contact", slug: "/contact", status: "published" },
    {
      id: "page-catalog",
      title: "Katalog Projektów Domów 33151341",
      slug: "/projekty-domow-33151341",
      status: "published",
    },
    { id: "page-test", title: "test-page", slug: "/test-page", status: "published" },
    { id: "page-test-2", title: "test2", slug: "/test2", status: "published" },
  ],
  contentTypes: [
    {
      id: "ct-products",
      slug: "products",
      name: "Products",
      entryCount: 0,
      fields: [
        {
          name: "title",
          type: "string",
          required: false,
          label: "Title",
          orderIndex: null,
        },
      ],
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", title: "Title" },
        },
      },
    },
    { id: "ct-orders", slug: "orders", name: "Orders", entryCount: 3, fields: [] },
  ],
  customScreens: [
    {
      id: "screen-house",
      name: "House Projects",
      contentTypeId: "ct-house",
      status: "active",
      showInSidebar: true,
      sidebarLabel: "House Projects",
      writableBindingFields: [],
      bindings: [],
    },
    {
      id: "screen-products",
      name: "Products",
      contentTypeId: "ct-products",
      status: "draft",
      showInSidebar: false,
      sidebarLabel: null,
      writableBindingFields: [],
      bindings: [],
    },
  ],
  listings: {
    queries: [
      {
        id: "query-products",
        name: "Products Query",
        description: null,
        source: "entries",
        contentTypeId: "ct-products",
        taxonomyId: null,
        includeDrafts: false,
        fields: ["title"],
        sort: [],
        limit: 12,
      },
    ],
    templates: [],
  },
  forms: [
    {
      id: "form-lead",
      name: "Lead Form",
      slug: "lead-form",
      status: "published",
      submissionAccess: "public",
      fields: [],
    },
  ],
  menus: [],
  seoDocuments: [],
  widgets: [],
  warnings: [],
} as unknown as AssistantActionContext["resourceCatalog"];

const cases = [
  {
    name: "custom screens surface hint",
    prompt:
      "sprawdz jakie ekrany customowe sa widoczne w sekcji Screens i podaj ich dokladne nazwy",
    expectedResourceKind: "custom-screen",
    expectedCandidate: "House Projects",
  },
  {
    name: "page lookup",
    prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
    expectedResourceKind: "page",
    expectedCandidate: "Pysiek Mysiek",
  },
  {
    name: "published page title search",
    prompt: "znajdz wszystkie opublikowane strony ktore maja w nazwie / tytule slowo 'test'",
    expectedResourceKind: "page",
    expectedCandidates: ["test-page", "test2"],
    excludedCandidates: ["home", "Katalog Projektów Domów 33151341"],
  },
  {
    name: "engine content type lookup",
    prompt: "czy istnieje model Products w Engine?",
    expectedResourceKind: "content-type",
    expectedCandidate: "Products",
  },
  {
    name: "form visibility lookup",
    prompt: "czy formularz Lead Form jest publiczny?",
    expectedResourceKind: "form",
    expectedCandidate: "Lead Form",
  },
] as const;

liveTest(
  "OpenRouter live provider handles natural CMS prompt matrix",
  async () => {
    if (!apiKey || !model) throw new Error("missing_openrouter_test_env");

    const provider = createOpenRouterProvider({
      apiKey,
      model,
      retryCount: 0,
      appName: "Coderso LLM Guide Integration Test",
    });

    for (const item of cases) {
      const plan = await planAssistantActionsWithProviderDraft({
        prompt: item.prompt,
        provider,
        providerModel: model,
        llmAvailable: true,
        context: {
          page: "/admin/advanced/custom-screens",
          locale: "pl-PL",
          includeResourceCatalog: true,
          resourceCatalog: catalog,
          runtimeSnapshot: {
            schemaVersion: 2,
            route: "/admin/advanced/custom-screens",
            activeHref: "/admin/advanced/custom-screens",
            area: "advanced",
            advancedModule: "custom-screens",
            selectedResource: null,
            visibleActions: [],
            permissionHints: {
              known: false,
              requiredForVisibleActions: [],
              reason: "frontend_user_has_no_permissions",
            },
          },
        },
        limits: {
          maxInputTokens: 400_000,
          maxOutputTokens: 1_500,
          timeoutMs: 25_000,
        },
      });

      expect(plan.responseKind, item.name).toBe("inspection");
      expect(plan.intentId, item.name).toBe("cms-resource-inspect");
      if (plan.metadata?.planner !== undefined) {
        expect(["provider", "local"], item.name).toContain(plan.metadata.planner);
        expect(typeof plan.metadata.providerDraftUsed, item.name).toBe("boolean");
      }
      expect(plan.actions, item.name).toEqual([]);
      expect(plan.inspection?.resourceKind, item.name).toBe(item.expectedResourceKind);
      const labels = plan.inspection?.candidates.map((candidate) => candidate.label) ?? [];
      const expectedCandidates =
        "expectedCandidates" in item ? item.expectedCandidates : [item.expectedCandidate];
      const excludedCandidates = "excludedCandidates" in item ? item.excludedCandidates : [];
      for (const expected of expectedCandidates) {
        expect(labels, item.name).toContain(expected);
      }
      for (const excluded of excludedCandidates) {
        expect(labels, item.name).not.toContain(excluded);
      }
      expect(JSON.stringify(plan), item.name).not.toContain(apiKey);
    }
  },
  60_000
);

liveTest(
  "OpenRouter live provider handles generic content-type field refinement prompt",
  async () => {
    if (!apiKey || !model) throw new Error("missing_openrouter_test_env");

    const provider = createOpenRouterProvider({
      apiKey,
      model,
      retryCount: 0,
      appName: "Coderso LLM Guide Content Type Field Test",
    });

    const plan = await planAssistantActionsWithProviderDraft({
      prompt: `dodaj mi pola do Content Type o nazwie 'Products'.. pola ktore podaje nizej

# Project

title
slug
project_code
short_description
full_description
featured_image

usable_area_m2
building_area_m2
volume_m3
floors_count
bedrooms_count
bathrooms_count
garage_spaces
roof_type
roof_slope
building_shape
technology

style[]
building_type[]
construction_type[]
tags[]

rooms[]
  - room_name
  - room_area_m2
  - room_type

sections[]
  - title
  - content

exterior_gallery[]
interior_gallery[]

floor_plan_image
roof_plan_image
section_image
elevation_images[]

project_pdf

meta_title
meta_description
og_image`,
      provider,
      providerModel: model,
      llmAvailable: true,
      context: {
        page: "/admin/advanced/engine",
        locale: "pl-PL",
        includeResourceCatalog: true,
        resourceCatalog: catalog,
        runtimeSnapshot: {
          schemaVersion: 2,
          route: "/admin/advanced/engine",
          activeHref: "/admin/advanced/engine",
          area: "advanced",
          advancedModule: "engine",
          selectedResource: {
            kind: "content-type",
            id: "ct-products",
          },
          visibleActions: [],
          permissionHints: {
            known: false,
            requiredForVisibleActions: [],
            reason: "frontend_user_has_no_permissions",
          },
        },
      },
      limits: {
        maxInputTokens: 400_000,
        maxOutputTokens: 1_500,
        timeoutMs: 25_000,
      },
    });

    expect(plan.status).toBe("ready");
    expect(plan.responseKind).toBe("action_plan");
    expect(plan.actions).toHaveLength(1);
    const action = plan.actions[0];
    if (!action || action.type !== "content-type.field.add") {
      throw new Error("missing_content_type_field_add_action");
    }
    expect(action.input.slug).toBe("products");
    expect(action.input.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "project_code", type: "text" }),
        expect.objectContaining({ name: "short_description", type: "richtext" }),
        expect.objectContaining({ name: "full_description", type: "richtext" }),
        expect.objectContaining({ name: "usable_area_m2", type: "number" }),
        expect.objectContaining({ name: "featured_image", type: "media" }),
        expect.objectContaining({ name: "exterior_gallery", type: "media", multiple: true }),
        expect.objectContaining({ name: "project_pdf", type: "media" }),
        expect.objectContaining({ name: "og_image", type: "media" }),
      ])
    );
    expect(action.input.fields.some((field) => field.name === "title")).toBe(false);
    expect(action.input.fields.some((field) => field.name === "rooms")).toBe(false);
    expect(action.description).toContain("Unsupported nested or array fields were not planned");
    expect(JSON.stringify(plan)).not.toContain(apiKey);
  },
  90_000
);
