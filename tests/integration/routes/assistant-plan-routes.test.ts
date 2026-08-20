import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerAssistantRoutes } from "../../../core/server/routes/assistantRoutes";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
import { ASSISTANT_SITE_BUILDER_INTAKE_VERSION } from "../../../core/services/assistant/assistantSiteBuilderIntakeTypes";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";

type RouteContext = {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: unknown;
  user?: { id: string };
  requestId?: string;
};

type RouteHandler = (ctx: RouteContext) => Promise<unknown> | unknown;

type Route = { method: string; path: string; handlers: RouteHandler[] };

const makeRouter = () => {
  const routes: Route[] = [];
  return {
    routes,
    router: {
      get: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "GET", path, handlers }),
      post: (path: string, ...handlers: RouteHandler[]) =>
        routes.push({ method: "POST", path, handlers }),
    },
  };
};

test("assistant action plan route returns typed plan payload", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => {
      validateCalls += 1;
    },
    service: {
      planActions: async () => buildHouseProjectsCatalogPlan(),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: {
      prompt:
        "potrzebuje strony na ktore bede mogl prezentowac swoje produkty czyli projekty domow, caly katalog",
    },
    requestId: "req-plan",
    user: { id: "user-1" },
  });

  expect(validateCalls).toBe(1);
  expect(result).toMatchObject({
    status: "ready",
    intentId: "house-projects-catalog",
  });
});

test("assistant action plan route attaches resource catalog context when requested", async () => {
  const { router, routes } = makeRouter();
  let receivedContext: unknown = null;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "llm-guide",
        retrievalBackend: "db",
        llmAvailable: true,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
      buildResourceCatalog: async () => ({
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
      }),
      planActions: async (payload) => {
        receivedContext = payload.context;
        return buildHouseProjectsCatalogPlan();
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: {
      prompt: "potrzebuje katalogu produktow",
      context: {
        page: "/admin/advanced/widgets",
        locale: "pl-PL",
        includeResourceCatalog: true,
        runtimeSnapshot: {
          schemaVersion: 2,
          route: "/admin/advanced/widgets",
          activeHref: "/admin/advanced/widgets",
          area: "advanced",
          advancedModule: "widgets",
          selectedResource: null,
          visibleActions: [
            {
              id: "custom-screen.create",
              label: "Create custom screen",
              kind: "create",
              href: "/admin/advanced/custom-screens",
              requiredPermission: "content:write",
            },
          ],
          permissionHints: {
            known: false,
            reason: "frontend_user_has_no_permissions",
            requiredForVisibleActions: ["content:write"],
          },
        },
      },
    },
    requestId: "req-plan-catalog",
    user: { id: "user-1" },
  });

  expect(result).toMatchObject({ status: "ready" });
  expect(receivedContext).toMatchObject({
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      contentTypes: [{ slug: "products" }],
    },
    runtimeSnapshot: {
      route: "/admin/advanced/widgets",
      visibleActions: [
        {
          id: "custom-screen.create",
          label: "Create custom screen",
          kind: "create",
          href: "/admin/advanced/custom-screens",
          requiredPermission: "content:write",
        },
      ],
    },
  });
});

test("assistant action plan route preserves locally composed mixed setup plans after trusted catalog handoff", async () => {
  const { router, routes } = makeRouter();
  let receivedContext: Record<string, unknown> | undefined;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: true,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
      hydrateActiveSurface: async (context) => context,
      buildResourceCatalog: async () => ({
        schemaVersion: 1,
        generatedAt: "2026-04-11T10:00:00.000Z",
        budget: {
          maxItemsPerGroup: 50,
          maxFieldsPerResource: 24,
          truncated: false,
        },
        contentTypes: [
          { id: "ct-products", slug: "products", name: "Products", entryCount: 0, fields: [] },
        ],
        customScreens: [],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        warnings: [],
      }),
      planActions: async (payload) => {
        receivedContext = payload.context as Record<string, unknown>;
        return {
          ...buildHouseProjectsCatalogPlan(),
          intentId: "blueprint-composed-product-catalog",
          metadata: {
            planner: "local",
            providerDraftUsed: false,
          },
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: {
      prompt: "Create a product catalog with inquiry form and a blog hub.",
      context: {
        page: "/admin/advanced/widgets",
        locale: "en-US",
        includeResourceCatalog: true,
      },
    },
    requestId: "req-plan-mixed-local",
    user: { id: "user-1" },
  });

  expect(result).toMatchObject({
    intentId: "blueprint-composed-product-catalog",
    metadata: {
      planner: "local",
      providerDraftUsed: false,
    },
  });
  expect(receivedContext).toMatchObject({
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      contentTypes: [{ slug: "products" }],
    },
  });
});

test("assistant action plan route does not require widget read permission for active page sections", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: validateSchema,
    service: {
      hydrateActiveSurface: async (context) => context,
      planActions: async () => buildHouseProjectsCatalogPlan(),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      prompt: "sprawdz sekcje na tej stronie",
      context: {
        page: "/admin/pages/page-1",
        activeSurface: {
          kind: "page",
          schemaVersion: 2,
          page: {
            id: "page-1",
            title: "Contact",
            slug: "/contact",
            status: "draft",
            template: "landing",
          },
          selectedSectionId: "section-hero",
          selectedBlockId: "heading-1",
          selectedBlockPath: "sections.0.blocks.0",
          sections: [
            {
              id: "section-hero",
              type: "hero",
              name: "Hero",
              path: "sections.0",
              blockCount: 1,
              blocks: [
                {
                  id: "heading-1",
                  type: "heading",
                  label: "Contact CTA",
                  path: "sections.0.blocks.0",
                  childCount: 0,
                  slotKeys: [],
                  templateId: null,
                  templateName: null,
                  capabilities: {
                    editorInsertable: true,
                    insertable: true,
                    assistantEmittable: true,
                    runtimeRenderer: "real",
                    publicDataBinding: "none",
                    slots: [],
                    reason: null,
                  },
                  children: [],
                },
              ],
              capabilities: {
                insertable: true,
                assistantEmittable: true,
                reason: null,
              },
            },
          ],
          warnings: [],
        },
      },
    },
    requestId: "req-plan-page-template-ref",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("content:read");
  expect(requestedPermissions).not.toContain("widgets:read");
});

test("assistant action plan route hydrates collection workspace hints with explicit detail page permissions", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  let receivedHydrationPermissions: readonly string[] | undefined;
  let receivedContext: Record<string, unknown> | undefined;

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: validateSchema,
    resolvePermissions: () => ["content:read", "settings:read"],
    service: {
      hydrateActiveSurface: async (context, options) => {
        receivedHydrationPermissions = options?.permissions;
        return {
          ...context,
          collectionWorkspace: {
            contentType: {
              id: "ct-products",
              name: "Products",
              slug: "products",
              status: "published",
              fieldCount: 3,
              updatedAt: "2026-05-10T10:00:00.000Z",
            },
            canonical: {
              contentRoute: null,
              detailPage: {
                id: "detail-page-products",
                label: "Product Detail",
                status: "draft",
              },
              listPage: null,
              listingQuery: null,
              listingTemplate: null,
              adminScreen: null,
            },
            linkedSecondary: {
              pages: [],
              adminScreens: [],
            },
            unresolved: [],
            candidates: {
              detailPages: [],
              pages: [],
              listingQueries: [],
              listingTemplates: [],
              adminScreens: [],
            },
            activeDetailPageId: "detail-page-products",
          },
        };
      },
      planActions: async (payload) => {
        receivedContext = payload.context as Record<string, unknown>;
        return buildHouseProjectsCatalogPlan();
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      prompt: "continue this detail template",
      context: {
        page: "/admin/advanced/engine/ct-products/collection/detail-template/detail-page-products",
        collectionWorkspaceHint: {
          contentTypeId: "ct-products",
          activeDetailPageId: "detail-page-products",
        },
        activeSurface: {
          kind: "detail-page",
          detailPage: {
            id: "detail-page-products",
            name: "Product Detail",
            status: "draft",
            contentTypeId: "ct-products",
            contentTypeSlug: "products",
            titlePattern: "{title}",
          },
          sampleEntryId: "entry-1",
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
    },
    requestId: "req-plan-detail-page",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("content:read");
  expect(requestedPermissions).not.toContain("widgets:read");
  expect(receivedHydrationPermissions).toEqual(["content:read", "settings:read"]);
  expect(receivedContext?.collectionWorkspace).toMatchObject({
    contentType: {
      id: "ct-products",
    },
    activeDetailPageId: "detail-page-products",
  });
});

test("assistant action plan route rejects unknown context fields", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: validateSchema,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: {
        prompt: "potrzebuje katalogu produktow",
        context: {
          page: "/admin/advanced/widgets",
          resourceCatalog: {},
        },
      },
      requestId: "req-plan-invalid-context",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("validation_error");
    expect(apiError.status).toBe(400);
  }
});

test("assistant action plan route rejects browser supplied collection workspace summaries", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: validateSchema,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: {
        prompt: "potrzebuje katalogu produktow",
        context: {
          page: "/admin/advanced/engine/ct-products/collection",
          collectionWorkspaceHint: {
            contentTypeId: "ct-products",
          },
          collectionWorkspace: {
            contentType: {
              id: "ct-products",
            },
          },
        },
      },
      requestId: "req-plan-invalid-workspace",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("validation_error");
    expect(apiError.status).toBe(400);
  }
});

test("assistant action plan route accepts reviewed intake session context", async () => {
  const { router, routes } = makeRouter();
  let capturedPrompt: string | null = null;
  let statusCalls = 0;
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: validateSchema,
    service: {
      getStatus: async () => {
        statusCalls += 1;
        return {
          enabled: true,
          defaultMode: "llm-guide",
          retrievalBackend: "db",
          llmAvailable: true,
          indexReady: true,
          indexBuilding: false,
          indexError: null,
          lastReindexAt: null,
          docCount: 12,
          chunkCount: 44,
        };
      },
      planActions: async (input) => {
        capturedPrompt = input.prompt;
        return {
          id: "plan-site-builder-needs-input",
          status: "needs_input",
          intentId: "site-builder-needs-input",
          responseKind: "needs_input",
          promptKind: "setup_request",
          intentFamily: "site_kit",
          title: "Continue reviewed site-builder intake",
          answer: "Continue the reviewed intake.",
          summary: "Reviewed intake route context accepted.",
          confidence: 0.5,
          assumptions: [],
          questions: [
            {
              id: "continue-intake",
              label: "Continue intake",
              description: "Continue the reviewed site-builder intake.",
              required: true,
            },
          ],
          actions: [],
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: {
      prompt: "Continue guided site-builder intake.",
      context: {
        siteBuilderIntakeState: {
          activeSession: {
            version: ASSISTANT_SITE_BUILDER_INTAKE_VERSION,
            mode: "basic",
            currentStepId: "business-profile",
            answers: [],
          },
        },
      },
    },
    requestId: "req-reviewed-intake",
    user: { id: "user-1" },
  });

  expect(capturedPrompt).toBe("Continue guided site-builder intake.");
  expect(statusCalls).toBe(1);
  expect(requestedPermissions).toContain("solution-kits:read");
  expect(result).toMatchObject({
    status: "needs_input",
    intentFamily: "site_kit",
    actions: [],
  });
});

test("assistant action plan route rejects direct site-kit context payloads", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: validateSchema,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: {
        prompt: "prepare a starter site kit",
        context: {
          locale: "en",
          siteKit: {
            businessType: "automotive_workshop",
            goals: ["lead_generation"],
            locale: "en",
          },
        },
      },
      requestId: "req-site-kit-unavailable",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("validation_error");
    expect(apiError.status).toBe(400);
  }
});

test("assistant action plan route maps catalog-backed planner unavailability", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      buildResourceCatalog: async () => ({
        schemaVersion: 1,
        generatedAt: "2026-04-11T10:00:00.000Z",
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
        seoDocuments: [],
        widgets: [],
        warnings: [],
      }),
      hydrateActiveSurface: async (context) => context,
      planActions: async () => {
        throw new Error("assistant_llm_unavailable");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/plan");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: {
        prompt: "czy widzisz strone Pysiek Mysiek w Pages?",
        context: {
          page: "/admin/pages",
          locale: "pl-PL",
          includeResourceCatalog: true,
        },
      },
      requestId: "req-catalog-unavailable",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_llm_unavailable");
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe(
      "LLM Guide must be configured before catalog-backed planning or site-kit actions"
    );
    expect(apiError.details).toEqual({ requestId: "req-catalog-unavailable" });
  }
});
