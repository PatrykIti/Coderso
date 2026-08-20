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

test("planAssistantActionsWithProviderDraft rejects provider action arrays and uses local policy fallback", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "create one draft product entry",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        intentId: "provider-entry",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Draft entry",
        answer: "I can draft an entry.",
        summary: "Create a draft product entry.",
        confidence: 0.8,
        assumptions: [],
        actions: [
          {
            type: "entry.upsert-draft",
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
      })
    ),
  });

  expect(plan.actions).toEqual([]);
  expect(JSON.stringify(plan)).not.toContain("entry.upsert-draft");
  expect(JSON.stringify(plan)).not.toContain("provider-entry");
});

test("planAssistantActionsWithProviderDraft recovers empty provider inspection through policy local inspection", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "page",
        surfaceHint: "Pages",
        targetQuery: { exactName: "Pages" },
        filters: null,
        mutation: null,
        constraints: null,
      })
    ),
    context: {
      page: "/admin/pages",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-19T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          { id: "page-pysiek", title: "Pysiek Mysiek", slug: "/pysiek-mysiek", status: "draft" },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.metadata?.providerDraftUsed).toBe(true);
  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toContain(
    "Pysiek Mysiek"
  );
});

test("planAssistantActionsWithProviderDraft ignores untrusted resource catalogs during provider local recovery", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        operation: "inspect",
        resourceKind: "page",
        surfaceHint: "Pages",
        targetQuery: { exactName: "Pages" },
        filters: null,
        mutation: null,
        constraints: null,
      })
    ),
    context: {
      page: "/admin/pages",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-19T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          { id: "page-pysiek", title: "Pysiek Mysiek", slug: "/pysiek-mysiek", status: "draft" },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.candidates).toEqual([]);
});

test("planAssistantActionsWithProviderDraft falls back when provider is unavailable", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Create a product catalog with inquiry form and a blog hub.",
    llmAvailable: false,
    provider: createFakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("blueprint-composed-product-catalog");
  expect(
    plan.actions
      .filter((action) => action.type === "page.upsert")
      .map((action) => (action.type === "page.upsert" ? action.input.slug : null))
  ).toEqual(["/produkty", "/blog"]);
});

test("planAssistantActionsWithProviderDraft enforces the LLM gate for catalog-backed planning", async () => {
  await expect(
    planAssistantActionsWithProviderDraft({
      prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
      llmAvailable: false,
      context: {
        page: "/admin/pages",
        locale: "pl-PL",
        includeResourceCatalog: true,
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-04-19T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
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
  ).rejects.toThrow("assistant_llm_unavailable");
});

test("planAssistantActionsWithProviderDraft gates supported catalog-backed setup requests when LLM is unavailable", async () => {
  await expect(
    planAssistantActionsWithProviderDraft({
      prompt: "Create a product catalog with inquiry form and a blog hub.",
      llmAvailable: false,
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
        includeResourceCatalog: true,
        resourceCatalog: {
          schemaVersion: 1,
          generatedAt: "2026-05-07T10:00:00.000Z",
          budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
          pages: [],
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
  ).rejects.toThrow("assistant_llm_unavailable");
});

test("planAssistantActionsWithProviderDraft prefers planning state for follow-up target selection", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "delete",
          resourceKind: "page",
          targetQuery: { text: "tak, to te dwie" },
          constraints: { destructive: true, requiresConfirmation: true },
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "tak, to te dwie, usun je",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      planningState: {
        schemaVersion: 1,
        sourcePlanId: "plan-cms-page-delete-needs-input",
        route: "/admin/pages",
        resourceKind: "page",
        operation: "delete",
        query: "test",
        candidates: [
          {
            kind: "page",
            id: "page-test",
            label: "test-page",
            slug: "/test-page",
            status: "published",
          },
          {
            kind: "page",
            id: "page-test-2",
            label: "test2",
            slug: "/test2",
            status: "published",
          },
        ],
        createdAt: "2026-04-18T10:00:00.000Z",
        expiresAt: "2099-04-18T10:10:00.000Z",
      },
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          {
            id: "page-catalog",
            title: "Katalog Projektów Domów 33151341",
            slug: "/projekty-domow-33151341",
            status: "published",
          },
          { id: "page-test", title: "test-page", slug: "/test-page", status: "published" },
          { id: "page-test-2", title: "test2", slug: "/test2", status: "published" },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_ambiguous");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: false,
    providerId: "fake",
  });
  expect(plan.assumptions).toContain(
    "Provider path used deterministic local planning-state follow-up routing before provider drafting."
  );
  expect(plan.inspection?.candidates.map((candidate) => candidate.id)).toEqual([
    "page-test",
    "page-test-2",
  ]);
});

test("planAssistantActionsWithProviderDraft recovers explicit page create fields when provider asks for target", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "find",
      resourceKind: "page",
      targetQuery: { text: "create page" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt:
      'Utworz jedna strone z tytulem "Live Created", slug "/live-created", status "draft", introTitle "Live intro", introBody "Live body"',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.actions).toHaveLength(1);
  expect(plan.actions[0]).toMatchObject({
    type: "page.upsert",
    input: {
      title: "Live Created",
      slug: "/live-created",
      status: "draft",
      introTitle: "Live intro",
      introBody: "Live body",
    },
  });
});

test("planAssistantActionsWithProviderDraft recovers explicit form create fields when provider asks for target", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "find",
      resourceKind: "form",
      targetQuery: { text: "create form" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt:
      'Utworz formularz o nazwie "Live Form", slug "live-form", status "draft", submissionAccess "internal"',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.metadata?.planner).toBe("provider");
  expect(plan.actions[0]).toMatchObject({
    type: "form.upsert",
    input: {
      name: "Live Form",
      slug: "live-form",
      status: "draft",
      submissionAccess: "internal",
      fields: [],
    },
  });
});

test("planAssistantActionsWithProviderDraft applies prompt-implied public form visibility filter", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "find",
      resourceKind: "form",
      targetQuery: { text: "Lead" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "Znajdz publiczne formularze ktore maja w nazwie Lead",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [
          {
            id: "form-public",
            name: "Lead Public",
            slug: "lead-public",
            status: "published",
            submissionAccess: "public",
            fields: [],
          },
          {
            id: "form-internal",
            name: "Lead Internal",
            slug: "lead-internal",
            status: "draft",
            submissionAccess: "internal",
            fields: [],
          },
        ],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual(["Lead Public"]);
});

test("planAssistantActions inspects trusted form visibility questions instead of routing them into refinement setup", () => {
  const plan = planAssistantActions({
    prompt: "czy formularz Lead Form jest publiczny?",
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
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
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.intentId).toBe("cms-resource-inspect");
  expect(plan.inspection?.resourceKind).toBe("form");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual(["Lead Form"]);
});

test("planAssistantActionsWithProviderDraft recovers provider misses with local read-only word search", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "find",
          resourceKind: "page",
          targetQuery: { text: "wrong target" },
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "znajdz wszystkie opublikowane strony ktore maja w nazwie / tytule slowo 'test'",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          { id: "page-home", title: "home", slug: "/", status: "published" },
          { id: "page-test", title: "test-page", slug: "/test-page", status: "published" },
          { id: "page-test-2", title: "test2", slug: "/test2", status: "published" },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual([
    "test-page",
    "test2",
  ]);
});

test("planAssistantActionsWithProviderDraft rejects provider destructive actions for broad all prompts", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "delete",
      resourceKind: "form",
      targetQuery: { exactName: "Lead Public" },
      constraints: { destructive: true, requiresConfirmation: true },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "usun wszystkie formularze",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [
          {
            id: "form-public",
            name: "Lead Public",
            slug: "lead-public",
            status: "published",
            submissionAccess: "public",
            fields: [],
          },
        ],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActionsWithProviderDraft rejects provider destructive count mismatches", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "delete",
      resourceKind: "page",
      targetQuery: { exactName: "Live Page" },
      constraints: { expectedCount: 2, destructive: true, requiresConfirmation: true },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "usun dokladnie trzy strony z prefixem Live Page",
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          { id: "page-1", title: "Live Page Alpha", slug: "/live-alpha", status: "published" },
          { id: "page-2", title: "Live Page Beta", slug: "/live-beta", status: "published" },
        ],
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActionsWithProviderDraft applies prompt-implied listing template layout intent", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "update",
      resourceKind: "listing-template",
      targetQuery: { exactName: "Products Grid" },
      mutation: { value: "list" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: 'Zmien layout listing template "Products Grid" na "list"',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [],
          templates: [
            {
              id: "template-products",
              name: "Products Grid",
              slug: "products-grid",
              description: null,
              layout: "grid",
              configKeys: [],
            },
          ],
        },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.actions[0]).toMatchObject({
    type: "listing-template.update",
    input: {
      patch: {
        layout: "list",
      },
    },
  });
});

test("planAssistantActionsWithProviderDraft coerces prompt-implied listing query limit intent", async () => {
  const provider = createFakeProvider(
    JSON.stringify({
      operation: "update",
      resourceKind: "listing-query",
      targetQuery: { exactName: "Products Query" },
      mutation: { value: "24" },
    })
  );

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: 'Zmien limit listing query "Products Query" na 24',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
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
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: {
      patch: {
        limit: 24,
      },
    },
  });
});

test("planAssistantActions reads listing query limit outside quoted target names", () => {
  const plan = planAssistantActions({
    prompt: 'Zmien limit listing query "Query 716" na 24',
    context: {
      page: "/admin/advanced/listings",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-18T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-716",
              name: "Query 716",
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
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: {
      patch: {
        limit: 24,
      },
    },
  });
});

test("planAssistantActions builds explicit media reference attach plan", () => {
  const plan = planAssistantActions({
    prompt: 'Podlacz mediaId "media-1" do entryId "entry-1" field "heroImage"',
    context: {
      page: "/admin/advanced/entries/products/entry-1",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions[0]).toMatchObject({
    type: "media.reference.attach",
    input: {
      mediaId: "media-1",
      targetType: "entry",
      targetId: "entry-1",
      field: "heroImage",
    },
  });
});

test("planAssistantActionsWithProviderDraft falls back on provider errors", async () => {
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      throw new Error("timeout");
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "potrzebuje katalogu uslug dla firmy sprzatajacej",
    llmAvailable: true,
    provider,
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("services_directory");
  expect(plan.intentId).toBe("services-directory");
});

test("planAssistantActionsWithProviderDraft ignores unsafe provider action arrays", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "create catalog",
    llmAvailable: true,
    provider: createFakeProvider(
      JSON.stringify({
        actions: [
          {
            type: "database.drop",
            input: {},
          },
        ],
      })
    ),
  });

  expect(plan.status).toBe("ready");
  expect(JSON.stringify(plan)).not.toContain("database.drop");
});
