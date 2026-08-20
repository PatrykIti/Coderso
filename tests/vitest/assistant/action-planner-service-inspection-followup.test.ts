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

test("planAssistantActions returns docs guidance plan for non-actionable docs prompt", () => {
  const plan = planAssistantActions({
    prompt: "gdzie zmienie kolory hero widgetu?",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.responseKind).toBe("docs");
  expect(plan.promptKind).toBe("docs_question");
  expect(plan.intentFamily).toBe("unknown");
  expect(plan.questions).toEqual([]);
  expect(plan.actions).toHaveLength(0);
});

test("planAssistantActions returns read-only CMS inspection plan for page lookup", () => {
  const plan = planAssistantActions({
    prompt: "czy widzisz strone 'Pysiek Mysiek' w pages?",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          {
            id: "page-pysiek",
            title: "Pysiek Mysiek",
            slug: "/pysiek-mysiek",
            status: "draft",
          },
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

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("cms-resource-inspect");
  expect(plan.actions).toEqual([]);
  expect(plan.inspection).toMatchObject({
    resourceKind: "page",
    matchStatus: "matched",
    candidates: [
      {
        id: "page-pysiek",
        label: "Pysiek Mysiek",
      },
    ],
  });
});

test("planAssistantActions builds generic page delete plan from resource catalog target", () => {
  const plan = planAssistantActions({
    prompt: "czy widzisz strone 'Pysiek Mysiek' w pages i mi ja usun",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          {
            id: "page-pysiek",
            title: "Pysiek Mysiek",
            slug: "/pysiek-mysiek",
            status: "draft",
          },
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

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "page-delete-page-pysiek",
    type: "page.delete",
    input: {
      id: "page-pysiek",
      title: "Pysiek Mysiek",
      slug: "/pysiek-mysiek",
      expectedStatus: "draft",
    },
  });
});

test("planAssistantActions returns custom screen prefix candidates as read-only inspection", () => {
  const plan = planAssistantActions({
    prompt: "no to jakie ekrany widzisz z prefixem 'House Projects' ?",
    context: {
      page: "/admin/settings/assistant",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-16T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "type-1",
            status: "active",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-house-archive",
            name: "House Projects Archive",
            contentTypeId: "type-1",
            status: "draft",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: false,
            sidebarLabel: null,
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("cms-resource-inspect");
  expect(plan.actions).toEqual([]);
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("planAssistantActions reuses planning state for follow-up target selection", () => {
  const plan = planAssistantActions({
    prompt: "usun te dwa pierwsze",
    context: {
      page: "/admin/advanced/custom-screens",
      locale: "pl-PL",
      planningState: {
        schemaVersion: 1,
        sourcePlanId: "plan-cms-custom-screen-inspect",
        route: "/admin/advanced/custom-screens",
        resourceKind: "custom-screen",
        operation: "inspect",
        query: "House Projects",
        candidates: [
          {
            kind: "custom-screen",
            id: "screen-house",
            label: "House Projects",
            status: "active",
          },
          {
            kind: "custom-screen",
            id: "screen-house-archive",
            label: "House Projects Archive",
            status: "draft",
          },
        ],
        createdAt: "2026-04-17T10:00:00.000Z",
        expiresAt: "2099-04-17T10:10:00.000Z",
      },
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-17T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [],
        contentTypes: [],
        customScreens: [
          {
            id: "screen-house",
            name: "House Projects",
            contentTypeId: "type-1",
            status: "active",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-house-archive",
            name: "House Projects Archive",
            contentTypeId: "type-1",
            status: "draft",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: false,
            sidebarLabel: null,
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_ambiguous");
  expect(plan.actions).toEqual([]);
  expect(plan.inspection?.candidates.map((candidate) => candidate.id)).toEqual([
    "screen-house",
    "screen-house-archive",
  ]);
});

test("planAssistantActions reuses all prior page candidates when follow-up has no query", () => {
  const plan = planAssistantActions({
    prompt: "usun te strony",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      planningState: {
        schemaVersion: 1,
        sourcePlanId: "plan-cms-page-inspect",
        route: "/admin/pages",
        resourceKind: "page",
        operation: "find",
        query: null,
        candidates: [
          { kind: "page", id: "home", label: "home", slug: "/", status: "published" },
          {
            kind: "page",
            id: "catalog",
            label: "Katalog Projektów Domów 33151341",
            slug: "/projekty-domow-33151341",
            status: "published",
          },
          {
            kind: "page",
            id: "seo-page",
            label: "llm-live SEO Page",
            slug: "/llm-live-seo-page",
            status: "published",
          },
        ],
        createdAt: "2026-04-17T10:00:00.000Z",
        expiresAt: "2099-04-17T10:10:00.000Z",
      },
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-17T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          { id: "home", title: "home", slug: "/", status: "published" },
          {
            id: "catalog",
            title: "Katalog Projektów Domów 33151341",
            slug: "/projekty-domow-33151341",
            status: "published",
          },
          {
            id: "seo-page",
            title: "llm-live SEO Page",
            slug: "/llm-live-seo-page",
            status: "published",
          },
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
  expect(plan.intentId).toBe("site-builder-follow-up-target_ambiguous");
  expect(plan.actions).toEqual([]);
  expect(plan.inspection?.candidates.map((candidate) => candidate.id)).toEqual([
    "home",
    "catalog",
    "seo-page",
  ]);
});

test("planAssistantActions deletes all published pages through explicit filtered request", () => {
  const plan = planAssistantActions({
    prompt: "znajdz wszystkie opublikowane strony i je usun",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-17T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        pages: [
          { id: "home", title: "home", slug: "/", status: "published" },
          { id: "draft", title: "Draft", slug: "/draft", status: "draft" },
          {
            id: "catalog",
            title: "Katalog Projektów Domów 33151341",
            slug: "/projekty-domow-33151341",
            status: "published",
          },
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

  expect(plan.status).toBe("ready");
  expect(plan.actions.map((action) => action.type)).toEqual(["page.delete", "page.delete"]);
  expect(plan.actions.map((action) => action.title)).toEqual([
    "Delete home",
    "Delete Katalog Projektów Domów 33151341",
  ]);
});

test("planAssistantActions builds custom screen delete plan from resource catalog prefix", () => {
  const plan = planAssistantActions({
    prompt: "usun dwa ekrany w screens o prefixie 'House Projects' w tytule ekranu",
    context: {
      page: "/admin/advanced/custom-screens/screen-1/entries",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-12T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [
          {
            id: "screen-1",
            name: "House Projects",
            contentTypeId: "type-1",
            status: "active",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: true,
            sidebarLabel: "House Projects",
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-2",
            name: "House Projects Archive",
            contentTypeId: "type-1",
            status: "draft",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: false,
            sidebarLabel: null,
            writableBindingFields: [],
            bindings: [],
          },
          {
            id: "screen-3",
            name: "Products",
            contentTypeId: "type-2",
            status: "active",
            collectionRole: null,
            compositionKey: null,
            showInSidebar: true,
            sidebarLabel: "Products",
            writableBindingFields: [],
            bindings: [],
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("custom-screen-delete");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "custom-screen.delete",
    "custom-screen.delete",
  ]);
  const deleteActions = plan.actions.filter(
    (action): action is Extract<AssistantPlannedAction, { type: "custom-screen.delete" }> =>
      action.type === "custom-screen.delete"
  );
  expect(deleteActions.map((action) => action.input.name)).toEqual([
    "House Projects",
    "House Projects Archive",
  ]);
});

test("planAssistantActions builds page delete plan from active page context", () => {
  const plan = planAssistantActions({
    prompt: "usun te strone contact",
    context: {
      page: "/admin/pages/page-contact",
      locale: "pl-PL",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-contact",
          title: "Contact",
          slug: "/contact",
          status: "published",
          template: "landing",
        },
        selectedSectionId: null,
        selectedBlockId: "hero-1",
        sections: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-delete");
  expect(plan.actions).toEqual([
    {
      id: "page-delete-page-contact",
      type: "page.delete",
      title: "Delete Contact",
      description: "Delete the active page selected from admin context.",
      input: {
        id: "page-contact",
        title: "Contact",
        slug: "/contact",
        expectedStatus: "published",
      },
    },
  ]);
});

test("planAssistantActions asks for active page context before page deletion", () => {
  const plan = planAssistantActions({
    prompt: "usun strone contact",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions asks for a guided follow-up target when trusted page candidates are ambiguous", () => {
  const plan = planAssistantActions({
    prompt: "update page Projects title to Featured Projects",
    context: {
      page: "/admin/pages",
      locale: "en",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [
          {
            id: "page-projects-a",
            title: "Projects",
            slug: "/projects",
            status: "published",
          },
          {
            id: "page-projects-b",
            title: "Projects",
            slug: "/work",
            status: "draft",
          },
        ],
      }),
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_ambiguous");
  expect(plan.actions).toEqual([]);
  expect(plan.questions).toEqual([
    {
      id: "site-builder-follow-up-target",
      label: "Which existing page or builder resource should I change?",
      description:
        "Choose one of the trusted candidates or open the exact page/screen before continuing.",
      required: true,
    },
  ]);
  expect(plan.inspection).toMatchObject({
    kind: "resource-candidates",
    resourceKind: "page",
    matchStatus: "ambiguous",
    candidates: [
      { id: "page-projects-a", label: "Projects", slug: "/projects" },
      { id: "page-projects-b", label: "Projects", slug: "/work" },
    ],
  });
});

test("planAssistantActions treats beginner section or gallery setup on an active generated page as a guided follow-up", () => {
  const plan = planAssistantActions({
    prompt: "nie ogarniam cms, chce dodac sekcje/projekty domow albo galerie wnetrz na stronie",
    context: {
      page: "/admin/pages/page-projects",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [
          {
            id: "page-projects",
            title: "Realizacje",
            slug: "/realizacje",
            status: "published",
          },
        ],
      }),
      activeSurface: {
        kind: "page",
        page: {
          id: "page-projects",
          title: "Realizacje",
          slug: "/realizacje",
          status: "published",
          template: "landing",
        },
        selectedSectionId: null,
        selectedBlockId: null,
        sections: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_required");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.actions).toEqual([]);
  expect(plan.inspection?.candidates).toEqual([
    {
      kind: "page",
      id: "page-projects",
      label: "Realizacje",
      slug: "/realizacje",
      status: "published",
      adminHref: "/admin/pages/page-projects",
    },
  ]);
});

test("planAssistantActionsWithProviderDraft asks for the guided follow-up target before provider inspection on an active page", async () => {
  let providerCalls = 0;
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "nie ogarniam cms, chce dodac sekcje/projekty domow albo galerie wnetrz na stronie",
    llmAvailable: true,
    provider: {
      id: "openrouter",
      complete: async () => {
        providerCalls += 1;
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "custom-screen",
            targetQuery: {
              text: "gallery interiors / interior galleries / projekty domow",
            },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "anthropic/claude-sonnet-4",
    context: {
      page: "/admin/pages/page-projects",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [
          {
            id: "page-projects",
            title: "Realizacje",
            slug: "/realizacje",
            status: "published",
          },
        ],
      }),
      activeSurface: {
        kind: "page",
        page: {
          id: "page-projects",
          title: "Realizacje",
          slug: "/realizacje",
          status: "published",
          template: "landing",
        },
        selectedSectionId: null,
        selectedBlockId: null,
        sections: [],
        warnings: [],
      },
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("needs_input");
  expect(plan.intentId).toBe("site-builder-follow-up-target_required");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.actions).toEqual([]);
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: false,
    providerId: "openrouter",
  });
  expect(plan.assumptions).toContain(
    "Provider path used deterministic local follow-up target routing before provider drafting."
  );
});
