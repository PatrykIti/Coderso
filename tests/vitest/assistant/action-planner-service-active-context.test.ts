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

test("planAssistantActions builds page update plan from active page context", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł strony na 'Contact Us'",
    context: {
      page: "/admin/pages/page-contact",
      locale: "pl-PL",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-contact",
          title: "Contact",
          slug: "/contact",
          status: "draft",
          template: "landing",
        },
        selectedSectionId: null,
        selectedBlockId: null,
        sections: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.assumptions).toContain(
    "The follow-up target was resolved by the guided site-builder follow-up resolver before action mapping."
  );
  expect(plan.actions[0]).toMatchObject({
    id: "page-update-page-contact",
    type: "page.update",
    input: {
      id: "page-contact",
      title: "Contact",
      slug: "/contact",
      expectedStatus: "draft",
      patch: {
        title: "Contact Us",
      },
    },
  });
});

test("planAssistantActionsWithProviderDraft normalizes extensionless page slugs before page update actions", async () => {
  let providerCalls = 0;
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: 'update page "Contact" title to "Contact L04"',
    llmAvailable: true,
    provider: {
      id: "openrouter",
      complete: async () => {
        providerCalls += 1;
        return {
          text: JSON.stringify({
            operation: "inspect",
            resourceKind: "page",
            targetQuery: { exactName: "Contact" },
            filters: null,
            mutation: null,
            constraints: null,
          }),
        };
      },
    },
    providerModel: "anthropic/claude-sonnet-4",
    context: {
      page: "/admin/pages",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: createTrustedCatalog({
        pages: [
          {
            id: "page-contact",
            title: "Contact",
            slug: "contact",
            status: "published",
          },
        ],
      }),
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.metadata).toMatchObject({
    planner: "provider",
    providerDraftUsed: false,
    providerId: "openrouter",
  });
  expect(plan.actions[0]).toMatchObject({
    type: "page.update",
    input: {
      id: "page-contact",
      title: "Contact",
      slug: "/contact",
      expectedStatus: "published",
      patch: {
        title: "Contact L04",
      },
    },
  });
});

test("planAssistantActions builds page navigation update plan from active page context", () => {
  const plan = planAssistantActions({
    prompt: "ukryj te strone w nawigacji",
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
        selectedBlockId: null,
        sections: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.actions[0]).toMatchObject({
    type: "page.update",
    input: {
      patch: {
        settings: {
          showInNav: false,
        },
      },
    },
  });
});

test("planAssistantActions builds page metadata update plan from active page context", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku na 'New headline'",
    context: {
      page: "/admin/pages/page-home",
      locale: "pl-PL",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-home",
          title: "Home",
          slug: "/",
          status: "draft",
          template: "landing",
        },
        selectedSectionId: "section-hero",
        selectedBlockId: "hero-1",
        sections: [
          {
            id: "section-hero",
            type: "hero",
            name: "Hero",
            path: "sections.0",
            blockCount: 1,
            blocks: [
              {
                id: "hero-1",
                type: "heading",
                label: "Hero",
                path: "sections.0.blocks.0",
                childCount: 0,
                slotKeys: [],
                templateId: null,
                templateName: null,
              },
            ],
          },
        ],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.actions[0]).toMatchObject({
    id: "page-update-page-home",
    type: "page.update",
    input: {
      id: "page-home",
      patch: {
        title: "New headline",
      },
    },
  });
});

test("planAssistantActions treats page section edits as page metadata updates", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku na 'New headline'",
    context: createPageWithReferencedTemplateContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.actions[0]).toMatchObject({
    type: "page.update",
    input: {
      id: "page-home",
      patch: {
        title: "New headline",
      },
    },
  });
});

test("planAssistantActions keeps explicit page instance edits on the page update action", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku tylko na tej stronie na 'New headline'",
    context: createPageWithReferencedTemplateContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
  expect(plan.actions[0]).toMatchObject({
    id: "page-update-page-home",
    type: "page.update",
    input: {
      id: "page-home",
      patch: {
        title: "New headline",
      },
    },
  });
});

test("planAssistantActions builds custom screen update plan from active screen context", () => {
  const plan = planAssistantActions({
    prompt: "zmien nazwe custom screen na 'Projects Admin'",
    context: {
      page: "/admin/advanced/custom-screens/screen-1/builder",
      locale: "pl-PL",
      activeSurface: {
        kind: "custom-screen",
        screen: {
          id: "screen-1",
          name: "Projects Screen",
          status: "draft",
          contentTypeId: "ct-projects",
          showInSidebar: false,
          sidebarLabel: null,
          mode: "record-view",
        },
        selectedEntryId: null,
        selectedBlockId: null,
        blocks: [],
        bindings: [],
        writableBindingFields: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("custom-screen-update");
  expect(plan.actions[0]).toMatchObject({
    id: "custom-screen-update-screen-1",
    type: "custom-screen.update",
    input: {
      id: "screen-1",
      name: "Projects Screen",
      expectedStatus: "draft",
      expectedContentTypeId: "ct-projects",
      patch: {
        name: "Projects Admin",
      },
    },
  });
});

test("planAssistantActions builds custom screen block patch plan from selected block", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku custom screen na 'New headline'",
    context: {
      page: "/admin/advanced/custom-screens/screen-1/builder",
      locale: "pl-PL",
      activeSurface: {
        kind: "custom-screen",
        screen: {
          id: "screen-1",
          name: "Projects Screen",
          status: "draft",
          contentTypeId: "ct-projects",
          showInSidebar: false,
          sidebarLabel: null,
          mode: "record-view",
        },
        selectedEntryId: null,
        selectedBlockId: "hero-1",
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            label: "Hero",
            path: "0",
            childCount: 0,
            slotKeys: [],
            templateId: null,
            templateName: null,
          },
        ],
        bindings: [],
        writableBindingFields: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("custom-screen-block-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "custom-screen-block-patch-hero-1",
    type: "custom-screen.block.patch",
    input: {
      id: "screen-1",
      name: "Projects Screen",
      expectedStatus: "draft",
      blockId: "hero-1",
      expectedBlockType: "hero",
      dataPath: ["headline"],
      value: "New headline",
    },
  });
});

test("planAssistantActions builds entry delete plan from active entry route", () => {
  const plan = planAssistantActions({
    prompt: "usun ten wpis",
    context: {
      page: "/admin/advanced/entries/products/entry-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/entries/products/entry-1",
        activeHref: "/admin/advanced/entries/products/entry-1",
        area: "advanced",
        advancedModule: "entries",
        selectedResource: { kind: "entry", id: "entry-1" },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("entry-delete");
  expect(plan.actions).toEqual([
    {
      id: "entry-delete-entry-1",
      type: "entry.delete",
      title: "Delete active entry",
      description: "Delete the active entry selected from admin context.",
      input: {
        id: "entry-1",
        contentTypeSlug: "products",
      },
    },
  ]);
});

test("planAssistantActions builds content type delete plan from resource catalog", () => {
  const plan = planAssistantActions({
    prompt: "usun content type 'products'",
    context: {
      page: "/admin/advanced/engine",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [
          {
            id: "ct-products",
            slug: "products",
            name: "Products",
            entryCount: 0,
            fields: [],
          },
        ],
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
  expect(plan.intentId).toBe("content-type-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "content-type-delete-ct-products",
    type: "content-type.delete",
    input: {
      id: "ct-products",
      name: "Products",
      slug: "products",
      expectedEntryCount: 0,
    },
  });
});
