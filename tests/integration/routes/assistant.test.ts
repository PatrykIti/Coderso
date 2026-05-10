import { expect, test } from "bun:test";

import { ApiError } from "../../../core/server/errorHandler";
import { registerAssistantRoutes } from "../../../core/server/routes/assistantRoutes";
import { validate as validateSchema } from "../../../core/server/validation/schemaValidator";
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

test("registerAssistantRoutes wires endpoints", () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
  });

  const paths = routes.map((route) => `${route.method} ${route.path}`);

  expect(paths).toEqual(
    expect.arrayContaining([
      "GET /assistant/status",
      "POST /assistant/reindex",
      "POST /assistant/chat",
      "POST /assistant/actions/plan",
      "POST /assistant/actions/dry-run",
      "POST /assistant/actions/execute",
    ])
  );
  expect(paths).not.toContain("POST /assistant/site-builder/plan");
  expect(paths).not.toContain("POST /assistant/site-builder/execute");
  expect(paths).not.toContain("POST /assistant/site-builder/validate");

  expect(requestedPermissions).toEqual([
    "settings:read",
    "settings:write",
    "settings:read",
    "settings:read",
    "content:read",
  ]);
});

test("chat route calls service and returns payload", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => {
      validateCalls += 1;
    },
    service: {
      chat: async () => ({
        mode: "docs-only",
        template: "location_answer",
        detailLevel: "instruction",
        guideMode: "default",
        answer: "Most relevant locations in docs",
        confidence: 0.9,
        sources: [],
        followUpOptions: [],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { message: "where is hero visual", mode: "docs-only" },
    requestId: "req-1",
    user: { id: "user-1" },
  });

  expect(validateCalls).toBe(1);
  expect(result).toMatchObject({
    mode: "docs-only",
    retrievalBackend: "db",
    requestedMode: "docs-only",
  });
});

test("chat route returns clarifying question payload without remapping template", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => ({
        mode: "docs-only",
        template: "clarifying_question",
        detailLevel: "medium",
        guideMode: "default",
        answer:
          "I am not confident which product area you mean from the docs yet.\n\nDo you mean:\n- Themes\n- Coderso Widgets and Template Editor",
        confidence: 0.22,
        sources: [],
        followUpOptions: [],
        fallbackUsed: false,
        requestedMode: "docs-only",
        effectiveMode: "docs-only",
        retrievalBackend: "db",
        llm: null,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { message: "where can I configure colors", mode: "docs-only" },
    requestId: "req-clarify",
    user: { id: "user-3" },
  });

  expect(result).toMatchObject({
    template: "clarifying_question",
    retrievalBackend: "db",
  });
});

test("chat route forwards detail level and guide mode", async () => {
  const { router, routes } = makeRouter();
  let receivedDetailLevel: string | undefined;
  let receivedGuideMode: string | undefined;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async (input) => {
        receivedDetailLevel = input.detailLevel;
        receivedGuideMode = input.guideMode;
        return {
          mode: "docs-only",
          template: "how_to_answer",
          detailLevel: "advanced",
          guideMode: "security",
          answer: "Security answer",
          confidence: 0.72,
          sources: [],
          followUpOptions: [],
          fallbackUsed: false,
          requestedMode: "docs-only",
          effectiveMode: "docs-only",
          retrievalBackend: "db",
          llm: null,
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      message: "how to secure assistant integrations",
      detailLevel: "advanced",
      guideMode: "security",
    },
    requestId: "req-detail-mode",
    user: { id: "user-10" },
  });

  expect(receivedDetailLevel).toBe("advanced");
  expect(receivedGuideMode).toBe("security");
});

test("chat route maps assistant errors to ApiError with requestId", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      chat: async () => {
        throw new Error("assistant_disabled");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/chat");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { message: "test", mode: "docs-only" },
      requestId: "req-42",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_disabled");
    expect(apiError.status).toBe(403);
    expect(apiError.details).toEqual({ requestId: "req-42" });
  }
});

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
              id: "widget-template.create",
              label: "Create widget template",
              kind: "create",
              href: "/admin/advanced/widgets",
              requiredPermission: "widgets:write",
            },
          ],
          permissionHints: {
            known: false,
            reason: "frontend_user_has_no_permissions",
            requiredForVisibleActions: ["widgets:write"],
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
          id: "widget-template.create",
          label: "Create widget template",
          kind: "create",
          href: "/admin/advanced/widgets",
          requiredPermission: "widgets:write",
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

test("assistant action plan route requires widget read permission for active page template inspection", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
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
      prompt: "sprawdz template section na tej stronie",
      context: {
        page: "/admin/pages/page-1",
        activeSurface: {
          kind: "page",
          page: {
            id: "page-1",
            title: "Contact",
            slug: "/contact",
            status: "draft",
            template: "landing",
          },
          selectedBlockId: "template-ref",
          blocks: [
            {
              id: "template-ref",
              type: "template-section",
              label: "Contact CTA",
              path: "0",
              childCount: 0,
              slotKeys: [],
              templateId: "template-1",
              templateName: "Contact CTA",
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
  expect(requestedPermissions).toContain("widgets:read");
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
  expect(requestedPermissions).toContain("widgets:read");
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

test("assistant action plan route blocks site-kit planning when LLM Guide is unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
    },
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
    expect(apiError.code).toBe("assistant_llm_unavailable");
    expect(apiError.status).toBe(409);
    expect(apiError.message).toBe(
      "LLM Guide must be configured before catalog-backed planning or site-kit actions"
    );
    expect(apiError.details).toEqual({ requestId: "req-site-kit-unavailable" });
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

test("assistant action dry-run route blocks site-kit actions when LLM Guide is unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-install",
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Install site kit",
    answer: "I can install the site kit.",
    summary: "Install the selected site kit.",
    confidence: 0.8,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Apply the site kit.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          preview: {
            selectedKitId: "automotive-workshop",
            selectedKitTitle: "Automotive Workshop",
            enabledStepIds: ["settings"],
            plan: { confidence: 80 },
          },
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings"],
          continueOnError: true,
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan },
      requestId: "req-site-kit-dry-run-unavailable",
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
    expect(apiError.details).toEqual({ requestId: "req-site-kit-dry-run-unavailable" });
  }
});

test("assistant action execute route blocks site-kit actions when LLM Guide is unavailable", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      getStatus: async () => ({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "db",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 12,
        chunkCount: 44,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-install",
    status: "ready",
    intentId: "site-kit-install",
    promptKind: "setup_request",
    intentFamily: "site_kit",
    title: "Install site kit",
    answer: "I can install the site kit.",
    summary: "Install the selected site kit.",
    confidence: 0.8,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Apply the site kit.",
        input: {
          businessType: "automotive_workshop",
          goals: ["lead_generation"],
          locale: "en",
          preview: {
            selectedKitId: "automotive-workshop",
            selectedKitTitle: "Automotive Workshop",
            enabledStepIds: ["settings"],
            plan: { confidence: 80 },
          },
          selectedKitId: "automotive-workshop",
          enabledStepIds: ["settings"],
          continueOnError: true,
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-site-kit-unavailable" },
      requestId: "req-site-kit-execute-unavailable",
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
    expect(apiError.details).toEqual({ requestId: "req-site-kit-execute-unavailable" });
  }
});

test("assistant action dry-run route forwards plan payload", async () => {
  const { router, routes } = makeRouter();
  const plan = buildHouseProjectsCatalogPlan();
  let receivedPlanId: string | null = null;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      dryRunActions: async (payload) => {
        receivedPlanId = payload.plan.id;
        return {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan },
    requestId: "req-dry-run",
    user: { id: "user-1" },
  });

  expect(receivedPlanId).toBe(plan.id);
  expect(result).toMatchObject({
    readyToExecute: true,
  });
});

test("assistant action dry-run route enforces per-action read permissions", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const plan = {
    id: "plan-per-action-dry-run",
    status: "ready",
    intentId: "per-action",
    title: "Per action",
    answer: "Plan",
    summary: "Plan",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "screen-update",
        type: "custom-screen.update",
        title: "Screen update",
        description: "Screen update",
        input: {},
      },
      {
        id: "screen-widget",
        type: "custom-screen.widget.patch",
        title: "Screen widget",
        description: "Screen widget",
        input: {},
      },
      { id: "menu", type: "menu.item.upsert", title: "Menu", description: "Menu", input: {} },
      {
        id: "menu-delete",
        type: "menu.item.delete",
        title: "Menu delete",
        description: "Menu delete",
        input: {},
      },
      {
        id: "menu-update",
        type: "menu.item.update",
        title: "Menu update",
        description: "Menu update",
        input: {},
      },
      { id: "entry", type: "entry.delete", title: "Entry", description: "Entry", input: {} },
      {
        id: "entry-update",
        type: "entry.update",
        title: "Entry update",
        description: "Entry update",
        input: {},
      },
      {
        id: "listing-query",
        type: "listing-query.delete",
        title: "Listing query",
        description: "Listing query",
        input: {},
      },
      {
        id: "listing-query-update",
        type: "listing-query.update",
        title: "Listing query update",
        description: "Listing query update",
        input: {},
      },
      {
        id: "listing-template",
        type: "listing-template.delete",
        title: "Listing template",
        description: "Listing template",
        input: {},
      },
      {
        id: "listing-template-update",
        type: "listing-template.update",
        title: "Listing template update",
        description: "Listing template update",
        input: {},
      },
      {
        id: "content-type",
        type: "content-type.delete",
        title: "Content type",
        description: "Content type",
        input: {},
      },
      { id: "form", type: "form.automation.upsert", title: "Form", description: "Form", input: {} },
      {
        id: "form-delete",
        type: "form.delete",
        title: "Form delete",
        description: "Form delete",
        input: {},
      },
      {
        id: "form-archive",
        type: "form.archive",
        title: "Form archive",
        description: "Form archive",
        input: {},
      },
      {
        id: "form-update",
        type: "form.update",
        title: "Form update",
        description: "Form update",
        input: {},
      },
      {
        id: "media",
        type: "media.reference.attach",
        title: "Media",
        description: "Media",
        input: {},
      },
      {
        id: "seo-delete",
        type: "seo.document.delete",
        title: "SEO delete",
        description: "SEO delete",
        input: {},
      },
      {
        id: "seo-update",
        type: "seo.document.update",
        title: "SEO update",
        description: "SEO update",
        input: {},
      },
      { id: "page", type: "page.delete", title: "Page", description: "Page", input: {} },
      {
        id: "template",
        type: "widget-template.delete",
        title: "Template",
        description: "Template",
        input: {},
      },
      {
        id: "template-update",
        type: "widget-template.update",
        title: "Template update",
        description: "Template update",
        input: {},
      },
      {
        id: "template-block",
        type: "widget-template.block.patch",
        title: "Template block",
        description: "Template block",
        input: {},
      },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
    service: {
      dryRunActions: async (payload) => ({
        plan: payload.plan,
        changes: [],
        warnings: [],
        readyToExecute: true,
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: { plan },
    requestId: "req-dry-run-per-action",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("menus:read");
  expect(requestedPermissions).toContain("forms:read");
  expect(requestedPermissions).toContain("media:read");
  expect(requestedPermissions).toContain("widgets:read");
});

test("assistant action dry-run route maps unsupported actions to invalid plan error", async () => {
  const { router, routes } = makeRouter();
  const plan = {
    id: "plan-unsupported-action",
    status: "ready",
    intentId: "unsupported",
    title: "Unsupported",
    answer: "Unsupported",
    summary: "Unsupported",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "bad-action",
        type: "database.drop",
        title: "Drop database",
        description: "Unsupported action.",
        input: {},
      },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
  });

  const route = routes.find((item) => item.path === "/assistant/actions/dry-run");
  const handler = route?.handlers[route.handlers.length - 1];

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan },
      requestId: "req-unsupported-action",
      user: { id: "user-1" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_action_plan_invalid");
    expect(apiError.status).toBe(400);
    expect(apiError.details).toEqual({ requestId: "req-unsupported-action" });
  }
});

test("assistant action execute route injects actorId and idempotency key", async () => {
  const { router, routes } = makeRouter();
  const plan = buildHouseProjectsCatalogPlan();
  let receivedActorId: string | null = null;
  let receivedIdempotencyKey: string | null = null;

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      executeActions: async (payload) => {
        receivedActorId = payload.actorId;
        receivedIdempotencyKey = payload.idempotencyKey;
        return {
          plan: payload.plan,
          preview: {
            plan: payload.plan,
            changes: [],
            warnings: [],
            readyToExecute: true,
          },
          results: [],
          summary: {
            create: 0,
            update: 0,
            noop: 0,
            failed: 0,
          },
        };
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-action-1" },
    requestId: "req-execute",
    user: { id: "user-55" },
  });

  expect(receivedActorId).toBe("user-55");
  expect(receivedIdempotencyKey).toBe("assistant-action-1");
  expect(result).toMatchObject({
    summary: {
      create: 0,
    },
  });
});

test("assistant action execute route enforces per-action write permissions", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];
  const plan = {
    id: "plan-per-action-execute",
    status: "ready",
    intentId: "per-action",
    title: "Per action",
    answer: "Plan",
    summary: "Plan",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "screen-update",
        type: "custom-screen.update",
        title: "Screen update",
        description: "Screen update",
        input: {},
      },
      {
        id: "screen-widget",
        type: "custom-screen.widget.patch",
        title: "Screen widget",
        description: "Screen widget",
        input: {},
      },
      { id: "menu", type: "menu.item.upsert", title: "Menu", description: "Menu", input: {} },
      {
        id: "menu-delete",
        type: "menu.item.delete",
        title: "Menu delete",
        description: "Menu delete",
        input: {},
      },
      {
        id: "menu-update",
        type: "menu.item.update",
        title: "Menu update",
        description: "Menu update",
        input: {},
      },
      { id: "entry", type: "entry.delete", title: "Entry", description: "Entry", input: {} },
      {
        id: "entry-update",
        type: "entry.update",
        title: "Entry update",
        description: "Entry update",
        input: {},
      },
      {
        id: "listing-query",
        type: "listing-query.delete",
        title: "Listing query",
        description: "Listing query",
        input: {},
      },
      {
        id: "listing-query-update",
        type: "listing-query.update",
        title: "Listing query update",
        description: "Listing query update",
        input: {},
      },
      {
        id: "listing-template",
        type: "listing-template.delete",
        title: "Listing template",
        description: "Listing template",
        input: {},
      },
      {
        id: "listing-template-update",
        type: "listing-template.update",
        title: "Listing template update",
        description: "Listing template update",
        input: {},
      },
      {
        id: "content-type",
        type: "content-type.delete",
        title: "Content type",
        description: "Content type",
        input: {},
      },
      { id: "form", type: "form.automation.upsert", title: "Form", description: "Form", input: {} },
      {
        id: "form-delete",
        type: "form.delete",
        title: "Form delete",
        description: "Form delete",
        input: {},
      },
      {
        id: "form-archive",
        type: "form.archive",
        title: "Form archive",
        description: "Form archive",
        input: {},
      },
      {
        id: "form-update",
        type: "form.update",
        title: "Form update",
        description: "Form update",
        input: {},
      },
      {
        id: "media",
        type: "media.reference.attach",
        title: "Media",
        description: "Media",
        input: {},
      },
      {
        id: "seo-delete",
        type: "seo.document.delete",
        title: "SEO delete",
        description: "SEO delete",
        input: {},
      },
      {
        id: "seo-update",
        type: "seo.document.update",
        title: "SEO update",
        description: "SEO update",
        input: {},
      },
      { id: "page", type: "page.delete", title: "Page", description: "Page", input: {} },
      {
        id: "template",
        type: "widget-template.delete",
        title: "Template",
        description: "Template",
        input: {},
      },
      {
        id: "template-update",
        type: "widget-template.update",
        title: "Template update",
        description: "Template update",
        input: {},
      },
      {
        id: "template-block",
        type: "widget-template.block.patch",
        title: "Template block",
        description: "Template block",
        input: {},
      },
    ],
  };

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
    service: {
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [],
        summary: {
          create: 0,
          update: 0,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-per-action-1" },
    requestId: "req-execute-per-action",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("menus:write");
  expect(requestedPermissions).toContain("forms:write");
  expect(requestedPermissions).toContain("media:read");
  expect(requestedPermissions).toContain("content:write");
  expect(requestedPermissions).toContain("content:publish");
  expect(requestedPermissions).toContain("widgets:write");
});

test("assistant action execute preserves the settings-only route-link permission boundary", async () => {
  const { router, routes } = makeRouter();
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => undefined,
    service: {
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [],
        summary: {
          create: 0,
          update: 1,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  await handler?.({
    params: {},
    query: {},
    body: {
      idempotencyKey: "assistant-content-route-execute-1",
      plan: {
        id: "plan-content-route-execute",
        status: "ready",
        intentId: "content-route-execute",
        title: "Update content route",
        answer: "Update content route",
        summary: "Update content route",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "route-link",
            type: "setting.content-route.upsert",
            title: "Update route link",
            description: "Update route link",
            input: {
              typeSlug: "products",
              listPath: "/products",
              detailPath: "/products/:slug",
              enabled: true,
              detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            },
          },
        ],
      },
    },
    requestId: "req-content-route-execute",
    user: { id: "user-1" },
  });

  expect(requestedPermissions).toContain("settings:write");
  expect(requestedPermissions).not.toContain("content:write");
  expect(requestedPermissions).not.toContain("content:publish");
});

test("assistant action execute route enforces kit permission for site-kit plans", async () => {
  const { router, routes } = makeRouter();
  let validateCalls = 0;
  const requestedPermissions: string[] = [];

  registerAssistantRoutes(router, {
    requirePermission: (permission) => {
      requestedPermissions.push(permission);
      return async () => undefined;
    },
    validate: () => {
      validateCalls += 1;
    },
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
      executeActions: async (payload) => ({
        plan: payload.plan,
        preview: {
          plan: payload.plan,
          changes: [],
          warnings: [],
          readyToExecute: true,
        },
        results: [
          {
            actionId: "site-kit-install-automotive-workshop",
            type: "site-kit.install",
            targetType: "site-kit",
            targetKey: "automotive-workshop",
            operation: "create",
            status: "success",
            resourceId: "run-1",
            adminHref: "/admin/advanced/solution-kits",
            publicHref: null,
            message: `Actor ${payload.actorId} executed site kit.`,
            details: {
              siteKit: {
                validation: {
                  runId: "run-1",
                  status: "ok",
                  unresolvedItems: [],
                  checks: [],
                },
              },
            },
          },
        ],
        summary: {
          create: 1,
          update: 0,
          noop: 0,
          failed: 0,
        },
      }),
    },
  });

  const plan = {
    id: "plan-site-kit-automotive-workshop",
    status: "ready",
    intentId: "site-kit-install",
    title: "Automotive Workshop Site Kit",
    answer: "Plan ready",
    summary: "Install site kit",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-install-automotive-workshop",
        type: "site-kit.install",
        title: "Install Automotive Workshop",
        description: "Install selected site kit steps.",
        input: {},
      },
    ],
  };

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const result = await handler?.({
    params: {},
    query: {},
    body: { plan, idempotencyKey: "assistant-site-kit-1" },
    user: { id: "user-99" },
    requestId: "req-site-kit-1",
  });

  expect(validateCalls).toBe(1);
  expect(requestedPermissions).toContain("solution-kits:write");
  expect(result).toMatchObject({
    summary: {
      create: 1,
    },
  });
});

test("assistant action execute maps site-kit validate errors through generic route", async () => {
  const { router, routes } = makeRouter();

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
      executeActions: async () => {
        throw new Error("site_builder_run_not_found");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = {
    id: "plan-site-kit-validate",
    status: "ready",
    intentId: "site-kit-validate",
    title: "Validate site kit run",
    answer: "Validate run",
    summary: "Validate run",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "site-kit-validate-run",
        type: "site-kit.validate",
        title: "Validate run",
        description: "Validate site kit run.",
        input: {
          runId: "0f7573a3-9ac9-4bc7-a492-fb11da09c37e",
        },
      },
    ],
  };

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-site-kit-validate-1" },
      requestId: "req-site-kit-2",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("site_builder_run_not_found");
    expect(apiError.status).toBe(404);
    expect(apiError.details).toEqual({ requestId: "req-site-kit-2" });
  }
});

test("assistant action execute maps idempotency conflicts", async () => {
  const { router, routes } = makeRouter();

  registerAssistantRoutes(router, {
    requirePermission: () => async () => undefined,
    validate: () => undefined,
    service: {
      executeActions: async () => {
        throw new Error("assistant_action_idempotency_conflict");
      },
    },
  });

  const route = routes.find((item) => item.path === "/assistant/actions/execute");
  const handler = route?.handlers[route.handlers.length - 1];
  const plan = buildHouseProjectsCatalogPlan();

  try {
    await handler?.({
      params: {},
      query: {},
      body: { plan, idempotencyKey: "assistant-action-conflict-1" },
      requestId: "req-idempotency-conflict",
      user: { id: "user-2" },
    });
    throw new Error("expected_error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.code).toBe("assistant_action_idempotency_conflict");
    expect(apiError.status).toBe(409);
    expect(apiError.details).toEqual({ requestId: "req-idempotency-conflict" });
  }
});
