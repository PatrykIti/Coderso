import { expect, test } from "vitest";

import {
  classifyAssistantPrompt,
  isLikelyGuidePlanningPrompt,
  isLikelyHouseProjectsCatalogPrompt,
  planAssistantActions,
  planAssistantActionsWithProviderDraft,
} from "../../../core/services/assistant/actionPlannerService";
import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantProvider } from "../../../core/services/assistant/providers/providerTypes";

const createFakeProvider = (text: string): AssistantProvider => ({
  id: "fake",
  complete: async () => ({ text }),
});

type AssistantPageSurface = Extract<
  NonNullable<AssistantActionContext["activeSurface"]>,
  { kind: "page" }
>;

const createPageWithReferencedTemplateContext = (
  surfaceOverrides: Partial<AssistantPageSurface> = {}
): AssistantActionContext => ({
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
    selectedBlockId: "template-section-1",
    blocks: [
      {
        id: "template-section-1",
        type: "template-section",
        label: "Hero Template",
        path: "0",
        childCount: 0,
        slotKeys: [],
        templateId: "template-1",
        templateName: "Hero Template",
      },
    ],
    templateReferences: [
      {
        templateId: "template-1",
        templateName: "Hero Template",
        blockIds: ["template-section-1"],
        paths: ["0"],
        count: 1,
      },
    ],
    referencedTemplates: [
      {
        id: "template-1",
        name: "Hero Template",
        status: "published",
        category: "Marketing",
        description: null,
        blockCount: 1,
        blocks: [
          {
            id: "hero-1",
            type: "hero",
            label: "Hero",
            path: "0",
            childCount: 0,
            slotKeys: [],
            dataKeys: ["headline", "body"],
            templateId: null,
            templateName: null,
          },
        ],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    ],
    warnings: [],
    ...surfaceOverrides,
  },
});

test("detects guide planning prompt for house projects catalog", () => {
  expect(
    isLikelyGuidePlanningPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
  expect(
    isLikelyHouseProjectsCatalogPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toBe(true);
});

test("classifyAssistantPrompt distinguishes docs, setup, and refinement prompts", () => {
  expect(classifyAssistantPrompt("gdzie zmienie kolory hero widgetu?")).toMatchObject({
    promptKind: "docs_question",
    intentFamily: "unknown",
  });

  expect(
    classifyAssistantPrompt(
      "potrzebuje strony na ktore bede mogl prezentowac projekty domow, caly katalog"
    )
  ).toMatchObject({
    promptKind: "setup_request",
    intentFamily: "catalog_showcase",
  });

  expect(
    classifyAssistantPrompt("dodaj filtr po metrazu i liczbie pokoi")
  ).toMatchObject({
    promptKind: "refinement_request",
  });
});

test("planAssistantActions builds ready house projects catalog plan", () => {
  const plan = planAssistantActions({
    prompt:
      "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("setup_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "page.upsert",
  ]);
  expect(plan.actions.some((action) => action.type === "page.upsert")).toBe(true);
});

test("planAssistantActions returns docs guidance plan for non-actionable docs prompt", () => {
  const plan = planAssistantActions({
    prompt: "gdzie zmienie kolory hero widgetu?",
    context: {
      page: "/admin/coderso/widgets",
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
        widgets: [],
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
        widgets: [],
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
        widgets: [],
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
      page: "/admin/coderso/custom-screens",
      locale: "pl-PL",
      planningState: {
        schemaVersion: 1,
        sourcePlanId: "plan-cms-custom-screen-inspect",
        route: "/admin/coderso/custom-screens",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "custom-screen.delete",
    "custom-screen.delete",
  ]);
});

test("planAssistantActions builds custom screen delete plan from resource catalog prefix", () => {
  const plan = planAssistantActions({
    prompt: "usun dwa ekrany w screens o prefixie 'House Projects' w tytule ekranu",
    context: {
      page: "/admin/coderso/custom-screens/screen-1/entries",
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
        widgets: [],
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
  expect(plan.actions.map((action) => action.input.name)).toEqual([
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
        selectedBlockId: "hero-1",
        blocks: [],
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
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-update");
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
        selectedBlockId: null,
        blocks: [],
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

test("planAssistantActions builds selected page widget data patch plan", () => {
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
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-widget-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "page-widget-patch-hero-1",
    type: "page.widget.patch",
    input: {
      pageSlug: "/",
      operation: "patch-data",
      blockId: "hero-1",
      expectedBlockType: "hero",
      dataPath: ["headline"],
      value: "New headline",
    },
  });
});

test("planAssistantActions asks for page instance vs template target on ambiguous template-section edits", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku na 'New headline'",
    context: createPageWithReferencedTemplateContext(),
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-template-target-needs-input");
  expect(plan.actions).toEqual([]);
  expect(plan.questions).toEqual([
    {
      id: "page-template-target",
      label: "Should I edit only this page instance or the reusable template?",
      description:
        "Choose page instance for a local page change, or reusable template for a change that can affect every page using that template.",
      required: true,
    },
  ]);
});

test("planAssistantActions routes explicit template-section page instance edits to page widget patch", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku tylko na tej stronie na 'New headline'",
    context: createPageWithReferencedTemplateContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-widget-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "page-widget-patch-template-section-1",
    type: "page.widget.patch",
    input: {
      pageSlug: "/",
      operation: "patch-data",
      blockId: "template-section-1",
      expectedBlockType: "template-section",
      dataPath: ["title"],
      value: "New headline",
    },
  });
});

test("planAssistantActions routes explicit template-wide edits to referenced reusable template block patch", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku template everywhere na 'New headline'",
    context: createPageWithReferencedTemplateContext(),
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("page-referenced-template-block-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "widget-template-block-patch-hero-1",
    type: "widget-template.block.patch",
    input: {
      id: "template-1",
      name: "Hero Template",
      expectedStatus: "published",
      blockId: "hero-1",
      expectedBlockType: "hero",
      dataPath: ["headline"],
      value: "New headline",
    },
  });
});

test("planAssistantActions asks for selected block before page widget data patch", () => {
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
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("page-widget-patch-needs-input");
});

test("planAssistantActions builds widget template delete plan from active template context", () => {
  const plan = planAssistantActions({
    prompt: "usun ten widget template Contact CTA",
    context: {
      page: "/admin/coderso/widgets/templates/template-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Contact CTA",
          status: "published",
          category: "Marketing",
        },
        selectedBlockId: "cta-1",
        blocks: [],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("widget-template-delete");
  expect(plan.actions).toEqual([
    {
      id: "widget-template-delete-template-1",
      type: "widget-template.delete",
      title: "Delete Contact CTA",
      description: "Delete the active reusable widget template selected from admin context.",
      input: {
        id: "template-1",
        name: "Contact CTA",
        expectedStatus: "published",
        expectedCategory: "Marketing",
      },
    },
  ]);
});

test("planAssistantActions asks for active widget template context before template deletion", () => {
  const plan = planAssistantActions({
    prompt: "usun widget template Contact CTA",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("widget-template-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds widget template update plan from active template context", () => {
  const plan = planAssistantActions({
    prompt: "zmien nazwe widget template na 'Contact CTA Updated'",
    context: {
      page: "/admin/coderso/widgets/templates/template-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Contact CTA",
          status: "draft",
          category: "Marketing",
        },
        selectedBlockId: null,
        blocks: [],
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("widget-template-update");
  expect(plan.actions[0]).toMatchObject({
    id: "widget-template-update-template-1",
    type: "widget-template.update",
    input: {
      id: "template-1",
      name: "Contact CTA",
      expectedStatus: "draft",
      expectedCategory: "Marketing",
      patch: {
        name: "Contact CTA Updated",
      },
    },
  });
});

test("planAssistantActions builds widget template block patch plan from selected block", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku widget template na 'New headline'",
    context: {
      page: "/admin/coderso/widgets/templates/template-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Hero Template",
          status: "draft",
          category: "Marketing",
        },
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
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("widget-template-block-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "widget-template-block-patch-hero-1",
    type: "widget-template.block.patch",
    input: {
      id: "template-1",
      name: "Hero Template",
      expectedStatus: "draft",
      blockId: "hero-1",
      expectedBlockType: "hero",
      dataPath: ["headline"],
      value: "New headline",
    },
  });
});

test("planAssistantActions asks for explicit template target outside reusable template context", () => {
  const plan = planAssistantActions({
    prompt: "zmien nazwe widget template na 'Contact CTA Updated'",
    context: {
      page: "/admin/pages/page-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-1",
          title: "Home",
          slug: "/",
          status: "draft",
          template: "landing",
        },
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("widget-template-edit-needs-input");
});

test("planAssistantActions builds custom screen update plan from active screen context", () => {
  const plan = planAssistantActions({
    prompt: "zmien nazwe custom screen na 'Projects Admin'",
    context: {
      page: "/admin/coderso/custom-screens/screen-1/builder",
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

test("planAssistantActions builds custom screen widget patch plan from selected block", () => {
  const plan = planAssistantActions({
    prompt: "zmien tytuł wybranego bloku custom screen na 'New headline'",
    context: {
      page: "/admin/coderso/custom-screens/screen-1/builder",
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
  expect(plan.intentId).toBe("custom-screen-widget-patch");
  expect(plan.actions[0]).toMatchObject({
    id: "custom-screen-widget-patch-hero-1",
    type: "custom-screen.widget.patch",
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
      page: "/admin/coderso/entries/products/entry-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 1,
        route: "/admin/coderso/entries/products/entry-1",
        activeHref: "/admin/coderso/entries/products/entry-1",
        area: "coderso",
        codersoModule: "entries",
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
      page: "/admin/coderso/engine",
      locale: "pl-PL",
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
        widgets: [],
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

test("planAssistantActions blocks content type delete when entries exist", () => {
  const plan = planAssistantActions({
    prompt: "usun content type 'products'",
    context: {
      page: "/admin/coderso/engine",
      locale: "pl-PL",
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
            entryCount: 2,
            fields: [],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("content-type-delete-needs-input");
  expect(plan.summary).toContain("Content type deletion");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds listing query delete plan from active listing route", () => {
  const plan = planAssistantActions({
    prompt: "usun ten listing query",
    context: {
      page: "/admin/coderso/listings/query-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 1,
        route: "/admin/coderso/listings/query-1",
        activeHref: "/admin/coderso/listings/query-1",
        area: "coderso",
        codersoModule: "listings",
        selectedResource: { kind: "listing-query", id: "query-1" },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-query-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "listing-query-delete-query-1",
    type: "listing-query.delete",
    input: {
      id: "query-1",
      name: "Products Catalog Query",
    },
  });
});

test("planAssistantActions builds listing template delete plan from exact slug", () => {
  const plan = planAssistantActions({
    prompt: "usun listing template 'products-grid'",
    context: {
      page: "/admin/coderso/listings",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [],
          templates: [
            {
              id: "template-1",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-template-delete");
  expect(plan.actions[0]).toMatchObject({
    id: "listing-template-delete-template-1",
    type: "listing-template.delete",
    input: {
      id: "template-1",
      name: "Products Grid",
      slug: "products-grid",
      expectedLayout: "grid",
    },
  });
});

test("planAssistantActions asks for exact listing query when name is ambiguous", () => {
  const plan = planAssistantActions({
    prompt: "usun listing query 'Products Catalog Query'",
    context: {
      page: "/admin/coderso/listings",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-13T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
              description: null,
              source: "entries",
              contentTypeId: "ct-products",
              taxonomyId: null,
              includeDrafts: false,
              fields: ["title"],
              sort: [],
              limit: 12,
            },
            {
              id: "query-2",
              name: "Products Catalog Query",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("listing-query-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds listing query update plan from exact target", () => {
  const plan = planAssistantActions({
    prompt: "zmien limit listing query 'Products Catalog Query' na 24",
    context: {
      page: "/admin/coderso/listings",
      locale: "pl-PL",
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-14T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        contentTypes: [],
        customScreens: [],
        listings: {
          queries: [
            {
              id: "query-1",
              name: "Products Catalog Query",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("listing-query-update");
  expect(plan.actions[0]).toMatchObject({
    type: "listing-query.update",
    input: { id: "query-1", name: "Products Catalog Query", patch: { limit: 24 } },
  });
});

test("planAssistantActions builds form delete plan from active form route", () => {
  const plan = planAssistantActions({
    prompt: "usun ten formularz",
    context: {
      page: "/admin/coderso/forms/form-1",
      locale: "pl-PL",
      runtimeSnapshot: {
        schemaVersion: 1,
        route: "/admin/coderso/forms/form-1",
        activeHref: "/admin/coderso/forms/form-1",
        area: "coderso",
        codersoModule: "forms",
        selectedResource: { kind: "form", id: "form-1" },
        visibleActions: [],
        permissionHints: {
          known: false,
          requiredForVisibleActions: [],
          reason: "frontend_user_has_no_permissions",
        },
      },
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
        widgets: [],
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
      page: "/admin/coderso/forms",
      locale: "pl-PL",
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
        widgets: [],
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
      page: "/admin/coderso/forms",
      locale: "pl-PL",
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
        widgets: [],
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
        widgets: [],
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
        widgets: [],
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
        widgets: [],
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
        widgets: [],
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("menu-item-delete-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions routes non-house-project setup prompts into generic needs-input family", () => {
  const docsQuestionPlan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(docsQuestionPlan.status).toBe("ready");
  expect(docsQuestionPlan.promptKind).toBe("setup_request");
  expect(docsQuestionPlan.intentFamily).toBe("product_catalog");
  expect(docsQuestionPlan.intentId).toBe("product-catalog");
});

test("planAssistantActions builds product inquiry catalog for catalog plus form prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z formularzem zapytania",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-inquiry-catalog");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "setting.content-route.upsert",
    "content-type.upsert",
    "custom-screen.upsert",
    "listing-query.upsert",
    "listing-template.upsert",
    "form.upsert",
    "page.upsert",
  ]);
  expect(plan.summary).toContain("inquiry form");
});

test("planAssistantActions returns needs-input for checkout/payment prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje sklep z checkoutem koszykiem i platnosciami",
    context: {
      page: "/admin/coderso/commerce",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-checkout-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds ready portfolio and services plans for routed families", () => {
  const portfolioPlan = planAssistantActions({
    prompt: "stworz portfolio projektow dla agencji architektonicznej",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(portfolioPlan.status).toBe("ready");
  expect(portfolioPlan.intentFamily).toBe("portfolio_projects");
  expect(portfolioPlan.intentId).toBe("portfolio-projects");
  expect(JSON.stringify(portfolioPlan.actions)).toContain("resultSummary");
  expect(JSON.stringify(portfolioPlan.actions)).toContain("testimonialQuote");

  const servicesPlan = planAssistantActions({
    prompt: "potrzebuje katalogu uslug dla firmy sprzatajacej",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(servicesPlan.status).toBe("ready");
  expect(servicesPlan.intentFamily).toBe("services_directory");
  expect(servicesPlan.intentId).toBe("services-directory");
});

test("planAssistantActions builds ready lead capture site plan", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje strony kontaktowej z formularzem kontaktowym do zbierania leadow",
    context: {
      page: "/admin/coderso/forms",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("lead_capture_site");
  expect(plan.intentId).toBe("lead-capture-site");
  expect(plan.actions.map((action) => action.type)).toEqual(["form.upsert", "page.upsert"]);
});

test("planAssistantActions returns gated needs-input plan for booking service prompts", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje strony z rezerwacja online i kalendarzem wizyt",
    context: {
      page: "/admin/coderso/booking",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentFamily).toBe("booking_service");
  expect(plan.intentId).toBe("booking-service-needs-prerequisite");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds editorial content hub without post mutations", () => {
  const plan = planAssistantActions({
    prompt: "stworz blog z aktualnosciami i najnowszymi wpisami",
    context: {
      page: "/admin/posts",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("editorial_content_hub");
  expect(plan.intentId).toBe("editorial-content-hub");
  expect(plan.actions.map((action) => action.type)).toEqual(["page.upsert"]);
  expect(JSON.stringify(plan.actions)).toContain("posts-feed");
});

test("planAssistantActions gates direct post mutation prompts", () => {
  const plan = planAssistantActions({
    prompt: "utworz post blogowy o tytule Test",
    context: {
      page: "/admin/coderso/posts",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("post-mutation-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions gates media upload prompts", () => {
  const plan = planAssistantActions({
    prompt: "wgraj nowy obraz z internetu",
    context: { page: "/admin/media", locale: "pl-PL" },
  });

  expect(plan.status).toBe("needs_input");
  expect(plan.intentId).toBe("media-upload-needs-input");
  expect(plan.actions).toEqual([]);
});

test("planAssistantActions builds ready refinement plan for house-project filters", () => {
  const plan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/coderso/widgets",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog-refinement");
  expect(plan.actions).toHaveLength(1);
  expect(plan.actions[0]?.type).toBe("page.upsert");
  if (plan.actions[0]?.type !== "page.upsert") {
    throw new Error("expected_page_upsert_action");
  }
  expect(plan.actions[0].input.listingFilters?.facets.length).toBeGreaterThan(1);
});

test("planAssistantActions builds inquiry form refinement plan for house projects", () => {
  const plan = planAssistantActions({
    prompt: "dodaj formularz zapytania do strony szczegolowej",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.promptKind).toBe("refinement_request");
  expect(plan.intentFamily).toBe("catalog_showcase");
  expect(plan.intentId).toBe("house-projects-catalog-inquiry-form");
  expect(plan.actions.map((action) => action.type)).toEqual(["form.upsert", "page.upsert"]);
  const formAction = plan.actions.find((action) => action.type === "form.upsert");
  expect(formAction?.input.slug).toBe("house-projects-catalog-inquiry");
  const pageAction = plan.actions.find((action) => action.type === "page.upsert");
  expect(pageAction?.input.formEmbed?.formName).toBe("House Projects Catalog Inquiry");
});

test("planAssistantActions builds site-kit actions from guided site-kit context", () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation", "online_booking"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("site_kit");
  expect(plan.actions.map((action) => action.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  const install = plan.actions.find((action) => action.type === "site-kit.install");
  expect(install?.input.preview.selectedKitId).toBe("automotive-workshop");
  expect(install?.input.preview.enabledStepIds).toEqual(["settings", "pages", "qa"]);
});

test("planAssistantActions accepts enriched resource catalog context without DB imports", () => {
  const plan = planAssistantActions({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
    context: {
      page: "/admin/coderso/engine",
      locale: "pl-PL",
      includeResourceCatalog: true,
      resourceCatalog: {
        schemaVersion: 1,
        generatedAt: "2026-04-11T10:00:00.000Z",
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
            entryCount: 3,
            fields: [
              {
                name: "title",
                type: "string",
                required: true,
                label: "Title",
                orderIndex: null,
              },
            ],
          },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.status).toBe("ready");
  expect(plan.intentFamily).toBe("product_catalog");
  expect(plan.intentId).toBe("product-catalog");
});

test("planAssistantActionsWithProviderDraft maps provider JSON through strict adapter", async () => {
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

  expect(plan.status).toBe("ready");
  expect(plan.intentId).toBe("provider-entry");
  expect(plan.actions[0]?.type).toBe("entry.upsert-draft");
});

test("planAssistantActionsWithProviderDraft falls back when provider is unavailable", async () => {
  const plan = await planAssistantActionsWithProviderDraft({
    prompt: "potrzebuje katalogu produktow dla sklepu z meblami",
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
  expect(plan.intentId).toBe("product-catalog");
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.status).toBe("ready");
  expect(plan.actions.map((action) => action.type)).toEqual(["page.delete", "page.delete"]);
  expect(plan.actions.map((action) => action.title)).toEqual([
    "Delete test-page",
    "Delete test2",
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
        widgets: [],
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
      page: "/admin/coderso/forms",
      locale: "pl-PL",
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
        widgets: [],
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
      page: "/admin/coderso/forms",
      locale: "pl-PL",
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
        widgets: [],
        warnings: [],
      },
    },
  });

  expect(plan.responseKind).toBe("inspection");
  expect(plan.inspection?.candidates.map((candidate) => candidate.label)).toEqual([
    "Lead Public",
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
      page: "/admin/coderso/forms",
      locale: "pl-PL",
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
        widgets: [],
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
      page: "/admin/coderso/listings",
      locale: "pl-PL",
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
        widgets: [],
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

test("planAssistantActionsWithProviderDraft prefers active widget template block context before provider inference", async () => {
  let providerCalls = 0;
  const provider: AssistantProvider = {
    id: "fake",
    complete: async () => {
      providerCalls += 1;
      return {
        text: JSON.stringify({
          operation: "update",
          resourceKind: "widget-template",
          targetQuery: { active: true },
          mutation: { value: "Wrong metadata" },
        }),
      };
    },
  };

  const plan = await planAssistantActionsWithProviderDraft({
    prompt: 'Zmien headline wybranego bloku widget template na "New headline"',
    llmAvailable: true,
    provider,
    context: {
      page: "/admin/coderso/widgets/templates/template-1",
      locale: "pl-PL",
      activeSurface: {
        kind: "widget-template",
        template: {
          id: "template-1",
          name: "Hero Template",
          status: "published",
          category: "Marketing",
        },
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
        settings: {
          wrapperContainer: "default",
          sectionGap: "md",
          hasBackgroundMedia: false,
        },
        warnings: [],
      },
    },
  });

  expect(providerCalls).toBe(0);
  expect(plan.actions[0]).toMatchObject({
    type: "widget-template.block.patch",
    input: {
      blockId: "hero-1",
      dataPath: ["headline"],
      value: "New headline",
    },
  });
});

test("planAssistantActions builds explicit media reference attach plan", () => {
  const plan = planAssistantActions({
    prompt: 'Podlacz mediaId "media-1" do entryId "entry-1" field "heroImage"',
    context: {
      page: "/admin/coderso/entries/products/entry-1",
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

test("planAssistantActionsWithProviderDraft recovers unsafe provider drafts as questions", async () => {
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

  expect(plan.status).toBe("needs_input");
  expect(plan.summary).toContain("unsupported actions");
});
