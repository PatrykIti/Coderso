import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import type { AssistantActionContext } from "../../../core/services/assistant/actionPlanTypes";
import {
  canConnectToLiveDatabase,
  createEnabledLiveProviderRuntimes,
  createLiveCleanupStack,
  createLiveRunPrefix,
  dryRunLivePlan,
  executeLivePlan,
  expectSuccessfulExecution,
  planWithLiveProvider,
  type LiveProviderRuntime,
} from "./liveCmsHarness";

const hasDb = await canConnectToLiveDatabase();
const providers = createEnabledLiveProviderRuntimes();
const testIfLive = hasDb && providers.length > 0 ? test : test.skip;
const globalCleanup = createLiveCleanupStack();

const loadDb = async () => {
  const [{ db }, { users }] = await Promise.all([
    import("../../../core/db/client"),
    import("../../../core/db/schema"),
  ]);
  return { db, users };
};

const loadContentTypes = () => import("../../../core/services/content/typeService");
const loadListingQueries = () => import("../../../core/services/content/listingQueriesService");
const loadListingTemplates = () => import("../../../core/services/content/listingTemplatesService");

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      title: "Title",
    },
  },
  required: [],
} as const;

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Listings Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db
      .delete(users)
      .where(eq(users.id, actor.id))
      .catch(() => undefined);
  });
  return actor;
};

const createContentTypeFixture = async (
  prefix: string,
  cleanup: ReturnType<typeof createLiveCleanupStack>
) => {
  const { createContentType, deleteContentType } = await loadContentTypes();
  const contentType = await createContentType({
    name: `${prefix} Listing Model`,
    slug: `${prefix}-listing-model`,
    schema,
  });
  if (!contentType) throw new Error("assistant_live_content_type_create_failed");
  cleanup.add(`content-type:${contentType.id}`, async () => {
    await deleteContentType(contentType.id).catch(() => undefined);
  });
  return contentType;
};

const createListingQueryFixture = async (input: {
  name: string;
  contentTypeId: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createListingQuery, deleteListingQuery } = await loadListingQueries();
  const query = await createListingQuery({
    name: input.name,
    description: `${input.name} description`,
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: input.contentTypeId,
        includeDrafts: false,
      },
      filters: [],
      sort: [],
      pagination: {
        limit: 12,
        offset: 0,
      },
      fields: ["title"],
    },
  });
  input.cleanup.add(`listing-query:${query.id}`, async () => {
    await deleteListingQuery(query.id).catch(() => undefined);
  });
  return query;
};

const createListingTemplateFixture = async (input: {
  name: string;
  slug: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createListingTemplate, deleteListingTemplate } = await loadListingTemplates();
  const template = await createListingTemplate({
    name: input.name,
    slug: input.slug,
    description: `${input.name} description`,
    layout: "grid",
    config: {
      fields: [{ key: "title", source: "title", label: "Title", format: "text" }],
      itemActions: [],
      emptyState: { title: "No items", description: null, ctaLabel: null, ctaHref: null },
      style: { columns: 3, gap: "md", cardVariant: "default" },
    },
  });
  input.cleanup.add(`listing-template:${template.id}`, async () => {
    await deleteListingTemplate(template.id).catch(() => undefined);
  });
  return template;
};

const buildListingsContext = async (): Promise<AssistantActionContext> => {
  const [{ listContentTypes }, { listListingQueries }, { listListingTemplates }] =
    await Promise.all([loadContentTypes(), loadListingQueries(), loadListingTemplates()]);
  const [contentTypes, queries, templates] = await Promise.all([
    listContentTypes(),
    listListingQueries(),
    listListingTemplates(),
  ]);
  return {
    page: "/admin/advanced/listings",
    locale: "pl-PL",
    includeResourceCatalog: true,
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      budget: {
        maxItemsPerGroup: 100,
        maxFieldsPerResource: 24,
        truncated: false,
      },
      pages: [],
      contentTypes: contentTypes.map((type) => ({
        id: type.id,
        slug: type.slug,
        name: type.name,
        entryCount: type.entryCount ?? 0,
        fields: [],
      })),
      customScreens: [],
      listings: {
        queries: queries.map((query) => ({
          id: query.id,
          name: query.name,
          description: query.description,
          source: query.query.source,
          contentTypeId: query.query.sourceConfig.contentTypeId ?? null,
          taxonomyId: query.query.sourceConfig.taxonomyId ?? null,
          includeDrafts: query.query.sourceConfig.includeDrafts ?? false,
          fields: query.query.fields,
          sort: query.query.sort,
          limit: query.query.pagination.limit,
        })),
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          slug: template.slug,
          description: template.description,
          layout: template.layout,
          configKeys: Object.keys(template.config),
        })),
      },
      forms: [],
      menus: [],
      seoDocuments: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 2,
      route: "/admin/advanced/listings",
      activeHref: "/admin/advanced/listings",
      area: "advanced",
      advancedModule: "listings",
      selectedResource: null,
      visibleActions: [],
      permissionHints: {
        known: false,
        requiredForVisibleActions: [],
        reason: "frontend_user_has_no_permissions",
      },
    },
  };
};

const runListingsMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`listings-${provider.id}`);
  const actor = await createActor(prefix);
  const contentType = await createContentTypeFixture(prefix, cleanup);
  const query = await createListingQueryFixture({
    name: `${prefix} Query`,
    contentTypeId: contentType.id,
    cleanup,
  });
  const template = await createListingTemplateFixture({
    name: `${prefix} Template`,
    slug: `${prefix}-template`,
    cleanup,
  });

  try {
    const queryLookup = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Znajdz listing query o nazwie "${query.name}"`,
    });
    expect(queryLookup.responseKind, provider.id).toBe("inspection");
    expect(queryLookup.inspection?.resourceKind, provider.id).toBe("listing-query");
    expect(
      queryLookup.inspection?.candidates.map((candidate) => candidate.label),
      provider.id
    ).toContain(query.name);

    const templateLookup = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Znajdz listing template o slug "${template.slug}"`,
    });
    expect(templateLookup.responseKind, provider.id).toBe("inspection");
    expect(templateLookup.inspection?.resourceKind, provider.id).toBe("listing-template");
    expect(
      templateLookup.inspection?.candidates.map((candidate) => candidate.label),
      provider.id
    ).toContain(template.name);

    const updateQueryPlan = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Zmien limit listing query "${query.name}" na 24`,
    });
    expect(
      updateQueryPlan.actions.map((action) => action.type),
      provider.id
    ).toContain("listing-query.update");
    const queryAction = updateQueryPlan.actions.find(
      (action) => action.type === "listing-query.update"
    );
    expect(queryAction?.input.id, provider.id).toBe(query.id);
    expect(queryAction?.input.patch, provider.id).toMatchObject({ limit: 24 });
    expect((await dryRunLivePlan(updateQueryPlan)).readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updateQueryPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-listing-query-update`,
      })
    );
    const { getListingQuery, deleteListingQuery } = await loadListingQueries();
    expect((await getListingQuery(query.id))?.query.pagination.limit, provider.id).toBe(24);

    const updateTemplatePlan = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Zmien layout listing template o slug "${template.slug}" na "list"`,
    });
    expect(
      updateTemplatePlan.actions.map((action) => action.type),
      provider.id
    ).toContain("listing-template.update");
    const templateAction = updateTemplatePlan.actions.find(
      (action) => action.type === "listing-template.update"
    );
    expect(templateAction?.input.id, provider.id).toBe(template.id);
    expect(templateAction?.input.patch, provider.id).toMatchObject({ layout: "list" });
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updateTemplatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-listing-template-update`,
      })
    );
    const { getListingTemplate, deleteListingTemplate } = await loadListingTemplates();
    expect((await getListingTemplate(template.id))?.layout, provider.id).toBe("list");

    const broadDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: "usun wszystkie listing queries",
    });
    expect(broadDeletePlan.status, provider.id).toBe("needs_input");
    expect(broadDeletePlan.actions, provider.id).toEqual([]);

    const deleteQueryPlan = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Usun listing query "${query.name}"`,
    });
    expect(
      deleteQueryPlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["listing-query.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteQueryPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-listing-query-delete`,
      })
    );
    expect(await getListingQuery(query.id), provider.id).toBeNull();

    const deleteTemplatePlan = await planWithLiveProvider({
      provider,
      context: await buildListingsContext(),
      prompt: `Usun listing template "${template.name}"`,
    });
    expect(
      deleteTemplatePlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["listing-template.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteTemplatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-listing-template-delete`,
      })
    );
    expect(await getListingTemplate(template.id), provider.id).toBeNull();

    await deleteListingQuery(query.id).catch(() => undefined);
    await deleteListingTemplate(template.id).catch(() => undefined);
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle listings matrix",
  async () => {
    for (const provider of providers) {
      await runListingsMatrixForProvider(provider);
    }
  },
  180_000
);
