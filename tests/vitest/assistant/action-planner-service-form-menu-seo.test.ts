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

test("planAssistantActions gates unsupported guided follow-up families before generic action assembly", () => {
  const plan = planAssistantActions({
    prompt: "zmien form 'Lead Form' na 'Lead Capture'",
    context: {
      page: "/admin/advanced/forms",
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

  expect(plan.status).toBe("needs_input");
  expect(plan.responseKind).toBe("gated");
  expect(plan.intentId).toBe("site-builder-follow-up-target_family_unsupported");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds form delete plan from active form route", () => {
  const plan = planAssistantActions({
    prompt: "usun ten formularz",
    context: {
      page: "/admin/advanced/forms/form-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 2,
        route: "/admin/advanced/forms/form-1",
        activeHref: "/admin/advanced/forms/form-1",
        area: "advanced",
        advancedModule: "forms",
        selectedResource: { kind: "form", id: "form-1" },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [
          {
            id: "form-1",
            name: "Lead Capture",
            slug: "lead-capture",
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

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("form-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "form-delete-form-1",
    type: "form.delete",
    input: {
      id: "form-1",
      name: "Lead Capture",
      slug: "lead-capture",
      expectedStatus: "published",
    },
  });
});

test("planAssistantActions builds form archive plan from exact slug", () => {
  const plan = planAssistantActions({
    prompt: "zarchiwizuj formularz 'lead-capture'",
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [
          {
            id: "form-1",
            name: "Lead Capture",
            slug: "lead-capture",
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

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("form-archive");
  expect(plan.actions[0]).toMatchObject({
    id: "form-archive-form-1",
    type: "form.archive",
    input: {
      id: "form-1",
      name: "Lead Capture",
      slug: "lead-capture",
      expectedStatus: "published",
    },
  });
});

test("planAssistantActions asks for exact form when name is ambiguous", () => {
  const plan = planAssistantActions({
    prompt: "usun formularz 'Lead Capture'",
    context: {
      page: "/admin/advanced/forms",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [
          {
            id: "form-1",
            name: "Lead Capture",
            slug: "lead-capture",
            status: "published",
            submissionAccess: "public",
            fields: [],
          },
          {
            id: "form-2",
            name: "Lead Capture",
            slug: "lead-capture-alt",
            status: "draft",
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
  expect(plan.intentId).toBe("form-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds menu item delete plan from exact href", () => {
  const plan = planAssistantActions({
    prompt: "usun menu item '/products'",
    context: {
      page: "/admin/menus/menu-primary",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [
          {
            id: "menu-primary",
            name: "Primary",
            location: "primary",
            itemCount: 2,
            items: [
              {
                id: "menu-products",
                label: "Products",
                href: "/products",
                pageId: null,
                parentId: null,
                orderIndex: 0,
                depth: 0,
              },
              {
                id: "menu-about",
                label: "About",
                href: "/about",
                pageId: null,
                parentId: null,
                orderIndex: 1,
                depth: 0,
              },
            ],
          },
        ],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("menu-item-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "menu-item-delete-menu-products",
    type: "menu.item.delete",
    input: {
      menuId: "menu-primary",
      itemId: "menu-products",
      label: "Products",
      expectedHref: "/products",
      expectedParentId: null,
    },
  });
});

test("planAssistantActions builds menu item update plan from exact href", () => {
  const plan = planAssistantActions({
    prompt: "zmien menu item '/products' na 'Products Catalog'",
    context: {
      page: "/admin/menus/menu-primary",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [
          {
            id: "menu-primary",
            name: "Primary",
            location: "primary",
            itemCount: 1,
            items: [
              {
                id: "menu-products",
                label: "Products",
                href: "/products",
                pageId: null,
                parentId: null,
                orderIndex: 0,
                depth: 0,
              },
            ],
          },
        ],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("menu-item-update");
  expect(plan.actions[0]).toMatchObject({
    type: "menu.item.update",
    input: {
      menuId: "menu-primary",
      itemId: "menu-products",
      label: "Products",
      expectedHref: "/products",
      patch: {
        label: "Products Catalog",
      },
    },
  });
});

test("planAssistantActions builds SEO document delete plan from exact slug", () => {
  const plan = planAssistantActions({
    prompt: "usun seo document '/products'",
    context: {
      page: "/admin/seo/seo-products",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [
          {
            id: "seo-products",
            targetType: "page",
            targetId: "page-products",
            targetTitle: "Products",
            slug: "/products",
            title: "Products Catalog",
            status: "warning",
          },
        ],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("seo-document-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "seo-document-delete-seo-products",
    type: "seo.document.delete",
    input: {
      id: "seo-products",
      targetType: "page",
      targetId: "page-products",
      expectedSlug: "/products",
      expectedTitle: "Products Catalog",
    },
  });
});

test("planAssistantActions builds SEO document update plan from exact slug", () => {
  const plan = planAssistantActions({
    prompt: "zmien seo document '/products' title na 'Products SEO'",
    context: {
      page: "/admin/seo/seo-products",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [
          {
            id: "seo-products",
            targetType: "page",
            targetId: "page-products",
            targetTitle: "Products",
            slug: "/products",
            title: "Products Catalog",
            status: "warning",
          },
        ],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("seo-document-update");
  expect(plan.actions[0]).toMatchObject({
    type: "seo.document.update",
    input: {
      id: "seo-products",
      targetType: "page",
      targetId: "page-products",
      expectedSlug: "/products",
      expectedTitle: "Products Catalog",
      patch: {
        title: "Products SEO",
      },
    },
  });
});

test("planAssistantActions asks for exact menu item when label is ambiguous", () => {
  const plan = planAssistantActions({
    prompt: "usun menu item 'Products'",
    context: {
      page: "/admin/menus/menu-primary",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [
          {
            id: "menu-primary",
            name: "Primary",
            location: "primary",
            itemCount: 2,
            items: [
              {
                id: "menu-products",
                label: "Products",
                href: "/products",
                pageId: null,
                parentId: null,
                orderIndex: 0,
                depth: 0,
              },
              {
                id: "menu-products-footer",
                label: "Products",
                href: "/catalog",
                pageId: null,
                parentId: null,
                orderIndex: 1,
                depth: 0,
              },
            ],
          },
        ],
        seoDocuments: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("menu-item-delete-needs-input");
  expect(plan.actions).toEqual([]);
});
