import { expect, test } from "vitest";

import { buildAssistantAdminContext } from "../../../core/services/assistant/adminContextService";
import { resolveSiteBuilderFollowUpTarget } from "../../../core/services/assistant/assistantSiteBuilderFollowUpResolver";
import { normalizeCmsOperationDraft } from "../../../core/services/assistant/cmsOperationDraftSchema";
import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "../../../core/services/assistant/adminContextTypes";

const baseCatalog = (
  overrides: Partial<AssistantResourceCatalogSnapshot> = {}
): AssistantResourceCatalogSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-06-06T00:00:00.000Z",
  budget: {
    maxItemsPerGroup: 50,
    maxFieldsPerResource: 24,
    truncated: false,
  },
  pages: [
    {
      id: "page-home",
      title: "Home",
      slug: "/",
      status: "published",
    },
  ],
  contentTypes: [
    {
      id: "ct-projects",
      slug: "projects",
      name: "Projects",
      entryCount: 4,
      fields: [],
    },
  ],
  customScreens: [
    {
      id: "screen-projects",
      name: "Projects Workspace",
      contentTypeId: "ct-projects",
      status: "active",
      collectionRole: "canonical-admin-screen",
      compositionKey: "guided-portfolio",
      showInSidebar: true,
      sidebarLabel: "Projects",
      writableBindingFields: ["title", "summary"],
      bindings: [],
    },
  ],
  detailPages: [
    {
      id: "detail-projects",
      name: "Project Detail",
      status: "draft",
      contentTypeId: "ct-projects",
      contentTypeSlug: "projects",
      linkedRouteType: "projects",
      updatedAt: "2026-06-06T00:00:00.000Z",
      blockCount: 3,
      bindingCount: 2,
    },
  ],
  listings: {
    queries: [
      {
        id: "query-projects",
        name: "Projects Listing",
        description: null,
        source: "content",
        contentTypeId: "ct-projects",
        taxonomyId: null,
        includeDrafts: false,
        fields: ["title", "summary"],
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
  ...overrides,
});

const contextWithCatalog = (
  catalogOverrides: Partial<AssistantResourceCatalogSnapshot> = {},
  contextOverrides: Partial<AssistantActionContext> = {}
) =>
  buildAssistantAdminContext({
    page: "/admin/pages",
    locale: "en",
    resourceCatalog: baseCatalog(catalogOverrides),
    ...contextOverrides,
  });

test("resolveSiteBuilderFollowUpTarget resolves active page follow-ups from active context", () => {
  const context = buildAssistantAdminContext({
    page: "/admin/pages/page-home",
    activeSurface: {
      kind: "page",
      page: {
        id: "page-home",
        title: "Home",
        slug: "/",
        status: "draft",
        template: null,
      },
      selectedBlockId: null,
      blocks: [],
      warnings: [],
    },
  });

  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "zmien tytul tej strony na Welcome",
    context,
  });

  expect(result).toMatchObject({
    status: "resolved",
    request: {
      operation: "update",
      resourceKind: "page",
      destructive: false,
      requiresConfirmation: false,
    },
    target: {
      id: "page-home",
      label: "Home",
      source: "active-context",
      refinementKind: "static-page",
    },
  });
  expect(JSON.stringify(result)).not.toContain("Welcome");
  expect(JSON.stringify(result)).not.toContain("zmien tytul");
});

test("resolveSiteBuilderFollowUpTarget asks when a named prompt conflicts with active context", () => {
  const context = contextWithCatalog(
    {
      pages: [
        {
          id: "page-projects",
          title: "Projects",
          slug: "/projects",
          status: "published",
        },
      ],
    },
    {
      page: "/admin/pages/page-home",
      activeSurface: {
        kind: "page",
        page: {
          id: "page-home",
          title: "Home",
          slug: "/",
          status: "draft",
          template: null,
        },
        selectedBlockId: null,
        blocks: [],
        warnings: [],
      },
    }
  );

  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update page Projects",
    context,
  });

  expect(result).toMatchObject({
    status: "needs_input",
    target: null,
    question: {
      code: "target_required",
    },
  });
  expect(result.candidates.map((candidate) => [candidate.id, candidate.source]).sort()).toEqual([
    ["page-home", "active-context"],
    ["page-projects", "server-catalog"],
  ]);
});

test("resolveSiteBuilderFollowUpTarget distinguishes collection pages from static pages", () => {
  const context = contextWithCatalog({
    pages: [
      {
        id: "page-projects",
        title: "Projects",
        slug: "/projects",
        status: "published",
        collectionLink: {
          contentTypeId: "ct-projects",
          pageRole: "canonical-list-page",
          compositionKey: "guided-portfolio",
          listingQueryId: "query-projects",
          listingTemplateId: "template-projects",
        },
      },
    ],
  });

  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update page Projects",
    context,
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "page",
      resourceKey: "page",
      targetQuery: {
        exactName: "Projects",
      },
    }),
  });

  expect(result).toMatchObject({
    status: "resolved",
    target: {
      id: "page-projects",
      slug: "/projects",
      refinementKind: "content-engine",
      details: {
        collectionContentTypeId: "ct-projects",
        collectionRole: "canonical-list-page",
        collectionCompositionKey: "guided-portfolio",
        listingQueryId: "query-projects",
        listingTemplateId: "template-projects",
      },
    },
  });
});

test("resolveSiteBuilderFollowUpTarget resolves listing detail and custom-screen targets", () => {
  const context = contextWithCatalog();

  expect(
    resolveSiteBuilderFollowUpTarget({
      prompt: "update listing query Projects Listing",
      context,
      draft: normalizeCmsOperationDraft({
        operation: "update",
        resourceKind: "listing-query",
        resourceKey: "listing-query",
        targetQuery: {
          exactName: "Projects Listing",
        },
      }),
    })
  ).toMatchObject({
    status: "resolved",
    target: {
      id: "query-projects",
      refinementKind: "listing",
      details: {
        contentTypeId: "ct-projects",
      },
    },
  });

  expect(
    resolveSiteBuilderFollowUpTarget({
      prompt: "update detail page for projects",
      context,
      draft: normalizeCmsOperationDraft({
        operation: "update",
        resourceKind: "detail-page",
        resourceKey: "detail-page",
        targetQuery: {
          exactName: "ct-projects",
        },
      }),
    })
  ).toMatchObject({
    status: "resolved",
    target: {
      id: "detail-projects",
      refinementKind: "detail-page",
      details: {
        contentTypeId: "ct-projects",
        contentTypeSlug: "projects",
        linkedRouteType: "projects",
      },
    },
  });

  expect(
    resolveSiteBuilderFollowUpTarget({
      prompt: "delete custom screen Projects Workspace",
      context,
      draft: normalizeCmsOperationDraft({
        operation: "delete",
        resourceKind: "custom-screen",
        resourceKey: "custom-screen",
        targetQuery: {
          exactName: "Projects Workspace",
        },
      }),
    })
  ).toMatchObject({
    status: "resolved",
    request: {
      operation: "delete",
      destructive: true,
      requiresConfirmation: true,
    },
    target: {
      id: "screen-projects",
      refinementKind: "custom-screen",
      details: {
        contentTypeId: "ct-projects",
        collectionRole: "canonical-admin-screen",
        compositionKey: "guided-portfolio",
      },
    },
  });
});

test("resolveSiteBuilderFollowUpTarget redacts secret-like candidate details", () => {
  const context = contextWithCatalog({
    customScreens: [
      {
        id: "screen-secret",
        name: "Secret Screen",
        contentTypeId: "ct-projects",
        status: "active",
        collectionRole: "canonical-admin-screen",
        compositionKey: "guided-portfolio",
        showInSidebar: true,
        sidebarLabel: "https://cdn.example.test/img.jpg?signature=abc123",
        writableBindingFields: [],
        bindings: [],
      },
    ],
  });

  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update custom screen Secret Screen",
    context,
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "custom-screen",
      resourceKey: "custom-screen",
      targetQuery: {
        exactName: "Secret Screen",
      },
    }),
  });

  expect(result).toMatchObject({
    status: "resolved",
    target: {
      details: {
        sidebarLabel: "[REDACTED]",
      },
    },
  });
  expect(JSON.stringify(result)).not.toContain("signature=abc123");
});

test("resolveSiteBuilderFollowUpTarget asks for a target when trusted candidates are ambiguous", () => {
  const context = contextWithCatalog({
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
  });

  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update page Projects",
    context,
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "page",
      resourceKey: "page",
      targetQuery: {
        exactName: "Projects",
      },
    }),
  });

  expect(result).toMatchObject({
    status: "needs_input",
    question: {
      code: "target_ambiguous",
    },
    target: null,
  });
  expect(result.candidates.map((candidate) => [candidate.id, candidate.slug])).toEqual([
    ["page-projects-a", "/projects"],
    ["page-projects-b", "/work"],
  ]);
});

test("resolveSiteBuilderFollowUpTarget treats free text as a hint only", () => {
  const result = resolveSiteBuilderFollowUpTarget({
    prompt: 'update page "Admin Secret api_key=sk-or-test" title',
    context: contextWithCatalog(),
  });
  const serialized = JSON.stringify(result);

  expect(result).toMatchObject({
    status: "needs_input",
    question: {
      code: "target_required",
    },
    target: null,
    candidates: [],
  });
  expect(serialized).not.toContain("Admin Secret");
  expect(serialized).not.toContain("sk-or-test");
});

test("resolveSiteBuilderFollowUpTarget asks for stale or unknown trusted ids", () => {
  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update stale page id",
    context: contextWithCatalog(),
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "page",
      resourceKey: "page",
      targetQuery: {
        exactName: "stale-page-id",
      },
    }),
  });

  expect(result).toMatchObject({
    status: "needs_input",
    question: {
      code: "target_required",
    },
    target: null,
    candidates: [],
  });
});

test("resolveSiteBuilderFollowUpTarget gates unsupported resource families", () => {
  const result = resolveSiteBuilderFollowUpTarget({
    prompt: "update plugin store item",
    context: contextWithCatalog(),
    draft: normalizeCmsOperationDraft({
      operation: "update",
      resourceKind: "plugin-store",
      resourceKey: "plugin-store",
    }),
  });

  expect(result).toMatchObject({
    status: "gated",
    gate: {
      code: "target_family_unsupported",
    },
    candidates: [],
  });

  expect(
    resolveSiteBuilderFollowUpTarget({
      prompt: "update form Lead Form",
      context: contextWithCatalog({
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
      draft: normalizeCmsOperationDraft({
        operation: "update",
        resourceKind: "form",
        resourceKey: "form",
        targetQuery: {
          exactName: "Lead Form",
        },
      }),
    })
  ).toMatchObject({
    status: "gated",
    gate: {
      code: "target_family_unsupported",
    },
    candidates: [],
  });

  expect(
    resolveSiteBuilderFollowUpTarget({
      prompt: "archive page Home",
      context: contextWithCatalog(),
      draft: normalizeCmsOperationDraft({
        operation: "archive",
        resourceKind: "page",
        resourceKey: "page",
      }),
    })
  ).toMatchObject({
    status: "gated",
    gate: {
      code: "operation_unsupported",
    },
    candidates: [],
  });
});
