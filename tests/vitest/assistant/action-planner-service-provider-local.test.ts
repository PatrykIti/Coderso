import { afterEach, expect, test, vi } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import { mapCmsOperationToActionPlan } from "../../../core/services/assistant/cmsOperationActionMapper";
import {
  isCuratedMediaUrl,
  selectCuratedMediaProfile,
} from "../../../core/services/media/curatedMediaProfiles";
import type {
  AssistantActionContext,
  AssistantAdminContext,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";
import {
  carCatalogMarkdownPrompt,
  createContentTypeFieldAddContext,
  createFakeProvider,
  createPageWithReferencedTemplateContext,
  createTrustedCatalog,
  contentTypeFieldAddPrompt,
} from "./actionPlannerFixtures";

afterEach(() => {
  vi.unstubAllEnvs();
});

test("planAssistantActionsWithProviderDraft keeps markdown catalog setup local before provider calls", async () => {
  let providerCalls = 0;
  const longPrompt = `${carCatalogMarkdownPrompt}\n\n${"Dodatkowy opis uzytkownika. ".repeat(400)}`;

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: longPrompt,
    llmAvailable: true,
    provider: {
      id: "openrouter",
      complete: async () => {
        providerCalls += 1;
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "page",
            targetQuery: { exactName: "samochodow" },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "openai/gpt-5.4-nano",
    limits: {
      maxInputTokens: 400_000,
      maxOutputTokens: 1_500,
      timeoutMs: 25_000,
    },
    context: {
      page: "/admin/settings/assistant",
      locale: "pl-PL",
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("generic-catalog-samochodow");
  expect(plan.metadata).toMatchObject({
    planner: "local",
    providerDraftUsed: false,
  });
});

test("planAssistantActionsWithProviderDraft routes English full-service prompts into Basic intake before provider calls", async () => {
  const requests: Array<Parameters<AssistantProvider["complete"]>[0]> = [];
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: [
      "Create a premium full-service architecture studio site for Studio Forma.",
      "It must include home, services, portfolio, about, process, references, contact with lead form, primary nav, footer, SEO, public sample content, and working services and portfolio detail pages.",
      "Use a clean premium architecture-studio UX with strong public pages, not a scaffold.",
    ].join(" "),
    llmAvailable: true,
    provider: {
      id: "openrouter",
      complete: async (request) => {
        requests.push(request);
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "page",
            targetQuery: { exactName: "home" },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "anthropic/claude-sonnet-4",
    context: {
      page: "/admin/settings/assistant",
      locale: "en-US",
      planningState: {
        schemaVersion: 1,
        sourcePlanId: "plan-cms-page-inspect",
        route: "/admin/pages",
        resourceKind: "page",
        operation: "inspect",
        query: "home",
        candidates: [
          {
            kind: "page",
            id: "page-home",
            label: "home",
            status: "published",
          },
        ],
        createdAt: "2026-06-04T10:00:00.000Z",
        expiresAt: "2099-06-04T10:10:00.000Z",
      },
    },
  });

  expect(requests).toHaveLength(0);
  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.intentId).toBe("site-builder-basic-intake");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata?.siteBuilderIntake).toMatchObject({
    mode: "basic",
    nextStepId: "business-profile",
  });
});

test("planAssistantActions composes single-adjunct prompts through the live blueprint planner path", () => {
  const plan = planAssistantActions({
    prompt: "Create a contact page and blog hub.",
    context: {
      page: "/admin/pages",
      locale: "en-US",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("editorial_content_hub");
  expect(plan.intentId).toBe("blueprint-composed-editorial-content-hub");
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/blog", "/kontakt"]);
});

test("planAssistantActions exposes aligned blueprint shadow diagnostics only when the debug flag is enabled", () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = planAssistantActions({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/produkty", "/blog"]);
  expect(plan.metadata).toMatchObject({
    planner: "local",
    providerDraftUsed: false,
    blueprintShadow: {
      currentIntentId: "blueprint-composed-product-catalog",
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      mismatchReason: null,
    },
  });
});

test("planAssistantActionsWithProviderDraft also exposes aligned blueprint shadow diagnostics only when the debug flag is enabled", async () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    llmAvailable: false,
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(plan.metadata).toMatchObject({
    planner: "local",
    providerDraftUsed: false,
    blueprintShadow: {
      currentIntentId: "blueprint-composed-product-catalog",
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      mismatchReason: null,
    },
  });
});

test("planAssistantActionsWithProviderDraft prefers local blueprint composition before provider drafting for supported mixed setup requests", async () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");
  const requests: Array<Parameters<AssistantProvider["complete"]>[0]> = [];

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    llmAvailable: true,
    provider: {
      id: "openai",
      complete: async (request) => {
        requests.push(request);
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "page",
            targetQuery: { exactName: "non-existent-page" },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "gpt-4o-mini",
    context: {
      page: "/admin/advanced/widgets",
      locale: "en-US",
    },
  });

  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(plan.metadata).toMatchObject({
    planner: "local",
    providerDraftUsed: false,
    blueprintComposition: {
      kind: "blueprint-composition",
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      gatedCapabilityIds: [],
    },
    blueprintShadow: {
      currentIntentId: "blueprint-composed-product-catalog",
      primaryCapabilityId: "product-catalog",
      adjunctCapabilityIds: ["product-inquiry-catalog", "editorial-content-hub"],
      mismatchReason: null,
    },
  });
  expect(plan.metadata?.blueprintComposition?.mergedResources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "detail-page", key: "detail-page:products" }),
    ])
  );
  expect(requests).toHaveLength(0);
});

test("planAssistantActionsWithProviderDraft preserves provider metadata and request contract on a real provider response", async () => {
  vi.stubEnv("ASSISTANT_BLUEPRINT_SHADOW", "1");
  const requests: Array<Parameters<AssistantProvider["complete"]>[0]> = [];

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
    llmAvailable: true,
    provider: {
      id: "openai",
      complete: async (request) => {
        requests.push(request);
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "page",
            surfaceHint: "Pages",
            targetQuery: { exactName: "Pysiek Mysiek" },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "gpt-4o-mini",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-19T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          {
            id: "page-pysiek",
            title: "Pysiek Mysiek",
            slug: "/pysiek-mysiek",
            status: "draft",
          },
        ],
        posts: [],
        entries: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: true,
    providerId: "openai",
  });
  expect(plan.metadata?.blueprintShadow).toBeUndefined();
  expect(requests).toHaveLength(1);
  expect(requests[0]?.responseContract).toMatchObject({
    kind: "json_schema",
    name: "cms_operation_draft",
  });
});

test("planAssistantActionsWithProviderDraft rejects prompts that exceed provider package input budget", async () => {
  let providerCalls = 0;

  await expect(
    planAssistantActionsWithProviderDraft({
      prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
      llmAvailable: true,
      provider: {
        id: "openai",
        complete: async () => {
          providerCalls += 1;
          return {
            text: JSON.stringify({
              operation: "inspect",
              resourceKind: "page",
              surfaceHint: "Pages",
              targetQuery: { exactName: "Pysiek Mysiek" },
              filters: null,
              mutation: null,
              constraints: null,
            }),
          };
        },
      },
      providerModel: "gpt-4o-mini",
      limits: {
        maxInputTokens: 128,
        maxOutputTokens: 64,
        timeoutMs: 1_000,
      },
      context: {
        page: "/admin/pages",
        locale: "pl-PL",
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-04-19T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [
            { id: "page-home", title: "home", slug: "/", status: "published" },
            {
              id: "page-pysiek",
              title: "Pysiek Mysiek",
              slug: "/pysiek-mysiek",
              status: "draft",
            },
          ],
          posts: [],
          entries: [],
          contentTypes: [],
          customScreens: [],
          listings: { queries: [], templates: [] },
          forms: [],
          menus: [],
          seoDocuments: [],
          media: [],
          warnings: [],
        },
      },
    })
  ).rejects.toThrow("assistant_prompt_too_large");

  expect(providerCalls).toBe(0);
});

test("planAssistantActionsWithProviderDraft keeps provider responses free of blueprint shadow metadata when the debug flag is off", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "page",
        surfaceHint: "Pages",
        targetQuery: { exactName: "Pysiek Mysiek" },
        filters: null,
        mutation: null,
        constraints: null,
      })
    ),
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-19T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          {
            id: "page-pysiek",
            title: "Pysiek Mysiek",
            slug: "/pysiek-mysiek",
            status: "draft",
          },
        ],
        posts: [],
        entries: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        media: [],
        warnings: [],
      },
    },
  });

  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.metadata?.providerDraftUsed).toBe(true);
  expect(plan.metadata?.providerId).toBe("fake");
  expect(plan.metadata?.blueprintShadow).toBeUndefined();
});

test("planAssistantActionsWithProviderDraft gates unsupported guided follow-up drafts before generic mapping", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "update",
          resourceKind: "form",
          resourceKey: "form",
          targetQuery: { exactName: "Lead Form" },
          mutation: { fieldIntent: "name", value: "Lead Capture" },
          constraints: { destructive: false, requiresConfirmation: false },
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "popraw to miejsce po wygenerowaniu strony",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/settings/assistant",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
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
      }),
    },
  });

  expect(providerCalls).toBe(1);
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentId).toBe("site-builder-follow-up-target_family_unsupported");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: true,
    providerId: "fake",
  });
  expect(plan.assumptions).toContain(
    "Provider path used deterministic local policy routing or recovery."
  );
});

test("planAssistantActionsWithProviderDraft blocks unsupported guided follow-up operations before provider drafting", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "update",
          resourceKind: "page",
          resourceKey: "page",
          targetQuery: { exactName: "Home" },
          mutation: { fieldIntent: "title", value: "Hidden" },
          constraints: { destructive: false, requiresConfirmation: false },
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: 'archive page "Home"',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [{ id: "page-home", title: "Home", slug: "/", status: "published" }],
      }),
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentId).toBe("site-builder-follow-up-operation_unsupported");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: false,
    providerId: "fake",
  });
});
