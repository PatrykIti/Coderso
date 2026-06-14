import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  assistantActionExecutions,
  assistantActionUndoItems,
  users,
} from "../../../core/db/schema";
import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import { executeAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import {
  deleteContentType,
  getContentTypeBySlug,
} from "../../../core/services/content/typeService";
import {
  deleteCustomScreen,
  listCustomScreens,
} from "../../../core/services/customScreens/customScreenService";
import {
  deleteListingQuery,
  listListingQueries,
} from "../../../core/services/content/listingQueriesService";
import {
  deleteListingTemplate,
  listListingTemplates,
} from "../../../core/services/content/listingTemplatesService";
import { deleteDetailPageDocument } from "../../../core/services/content/detailPageDocumentService";
import { deletePage, getPageBySlug } from "../../../core/services/pages/pageService";
import {
  getSetting,
  setSetting,
  type ContentRouteSetting,
} from "../../../core/services/settings/settingsService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = (hasDb ? test : test.skip) as typeof test;
type DbTestOptions = { timeout?: number; retry?: number; repeats?: number };
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: DbTestOptions
) => void;

async function canConnect() {
  try {
    const result = await db.execute(sql`
      select
        to_regclass('public.assistant_action_executions') as executions_table,
        to_regclass('public.assistant_action_undo_items') as undo_table
    `);
    const rows = Array.isArray(result) ? result : [];
    const first = rows[0] as
      | { executions_table?: string | null; undo_table?: string | null }
      | undefined;
    return (
      first?.executions_table === "assistant_action_executions" &&
      first.undo_table === "assistant_action_undo_items"
    );
  } catch {
    return false;
  }
}

const createdUserIds = new Set<string>();
const idempotencyKeysToCleanup = new Set<string>();
const plansToCleanup: Array<{
  contentTypeSlug: string;
  customScreenName: string;
  listingQueryName: string;
  listingTemplateSlug: string;
  pageSlug: string;
  detailPageId: string;
}> = [];
let originalContentRoutes: ContentRouteSetting[] | null = null;

const clonePlanWithToken = (token: string) => {
  const plan = JSON.parse(JSON.stringify(buildHouseProjectsCatalogPlan())) as ReturnType<
    typeof buildHouseProjectsCatalogPlan
  >;

  const contentTypeSlug = `house-projects-${token}`;
  const listingQueryName = `House Projects Catalog Query ${token}`;
  const listingTemplateSlug = `house-projects-catalog-grid-${token}`;
  const customScreenName = `House Projects ${token}`;
  const pageSlug = `/projekty-domow-${token}`;
  const listPath = `/_catalog/house-projects-${token}`;
  const detailPath = `${pageSlug}/:slug`;
  const detailPageId = randomUUID();

  plan.id = `plan-house-projects-catalog-${token}`;
  plan.title = `House Projects Catalog ${token}`;

  plan.actions = plan.actions.map((action) => {
    switch (action.type) {
      case "setting.content-route.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            typeSlug: contentTypeSlug,
            listPath,
            detailPath,
            detailPageId,
          },
        };
      case "detail-page.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            expectedExistingId: detailPageId,
            document: {
              ...action.input.document,
              id: detailPageId,
              name: `House Projects ${token} Detail Template`,
              contentTypeSlug,
            },
            contentTypeId: {
              kind: "stable-slug",
              resourceType: "content-type",
              slug: contentTypeSlug,
            },
          },
        };
      case "content-type.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            slug: contentTypeSlug,
            name: `House Projects ${token}`,
          },
        };
      case "custom-screen.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: customScreenName,
            sidebarLabel: customScreenName,
            contentTypeSlug,
          },
        };
      case "listing-query.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: listingQueryName,
            description: `Published house projects used by the public catalog page (${token}).`,
            contentTypeSlug,
          },
        };
      case "listing-template.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            name: `House Projects Catalog Grid ${token}`,
            slug: listingTemplateSlug,
          },
        };
      case "page.upsert":
        return {
          ...action,
          id: `${action.id}-${token}`,
          input: {
            ...action.input,
            title: `Katalog Projektów Domów ${token}`,
            slug: pageSlug,
            listingQueryName,
            listingTemplateSlug,
            introTitle: `Katalog Projektów Domów ${token}`,
            collectionLink: action.input.collectionLink
              ? {
                  ...action.input.collectionLink,
                  contentTypeSlug,
                  listingQueryName,
                  listingTemplateSlug,
                }
              : undefined,
          },
        };
      default:
        return action;
    }
  });

  plansToCleanup.push({
    contentTypeSlug,
    customScreenName,
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
    detailPageId,
  });

  return {
    plan,
    contentTypeSlug,
    customScreenName,
    listingQueryName,
    listingTemplateSlug,
    pageSlug,
  };
};

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `assistant-action-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Action DB Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  if (!hasDb) return;

  if (originalContentRoutes) {
    await setSetting("site.contentRoutes", originalContentRoutes);
  }

  for (const key of idempotencyKeysToCleanup) {
    await db
      .delete(assistantActionExecutions)
      .where(eq(assistantActionExecutions.idempotencyKey, key))
      .catch(() => undefined);
  }
  idempotencyKeysToCleanup.clear();

  for (const plan of plansToCleanup.reverse()) {
    const page = await getPageBySlug(plan.pageSlug);
    if (page) {
      await deletePage(page.id).catch(() => undefined);
    }

    await deleteDetailPageDocument(plan.detailPageId).catch(() => undefined);

    const templates = await listListingTemplates();
    const template = templates.find((entry) => entry.slug === plan.listingTemplateSlug);
    if (template) {
      await deleteListingTemplate(template.id).catch(() => undefined);
    }

    const queries = await listListingQueries();
    const query = queries.find((entry) => entry.name === plan.listingQueryName);
    if (query) {
      await deleteListingQuery(query.id).catch(() => undefined);
    }

    const contentType = await getContentTypeBySlug(plan.contentTypeSlug);
    if (contentType) {
      const screens = await listCustomScreens();
      for (const screen of screens.filter((entry) => entry.contentTypeId === contentType.id)) {
        await deleteCustomScreen(screen.id).catch(() => undefined);
      }
      await deleteContentType(contentType.id).catch(() => undefined);
    }
  }

  for (const userId of createdUserIds) {
    await db
      .delete(users)
      .where(eq(users.id, userId))
      .catch(() => undefined);
  }
  createdUserIds.clear();
}, 20_000);

testIfDbWithOptions(
  "executeAssistantActionPlan persists resources and reruns without duplicates",
  async () => {
    originalContentRoutes =
      originalContentRoutes ??
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
      [];

    const token = randomUUID().slice(0, 8);
    const actor = await createActor();
    const {
      plan,
      contentTypeSlug,
      customScreenName,
      listingQueryName,
      listingTemplateSlug,
      pageSlug,
    } = clonePlanWithToken(token);

    const first = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-action-${token}-1`);

    expect(first.summary.failed).toBe(0);
    expect(first.summary.create).toBeGreaterThan(0);

    const [firstExecution] = await db
      .select()
      .from(assistantActionExecutions)
      .where(eq(assistantActionExecutions.idempotencyKey, `assistant-action-${token}-1`));
    expect(firstExecution?.id).toBeTruthy();
    const firstUndoItems = firstExecution
      ? await db
          .select()
          .from(assistantActionUndoItems)
          .where(eq(assistantActionUndoItems.executionId, firstExecution.id))
      : [];
    expect(firstUndoItems.length).toBe(first.results.length);
    expect(
      firstUndoItems.some(
        (item) =>
          item.actionType === "content-type.upsert" &&
          item.resourceType === "content-type" &&
          item.undoStrategy === "delete" &&
          item.createdByAssistant
      )
    ).toBe(true);

    const contentType = await getContentTypeBySlug(contentTypeSlug);
    expect(contentType?.slug).toBe(contentTypeSlug);

    const screens = await listCustomScreens();
    const customScreen = screens.find((entry) => entry.name === customScreenName);
    expect(customScreen?.showInSidebar).toBe(true);

    const queries = await listListingQueries();
    expect(queries.filter((entry) => entry.name === listingQueryName)).toHaveLength(1);

    const templates = await listListingTemplates();
    expect(templates.filter((entry) => entry.slug === listingTemplateSlug)).toHaveLength(1);

    const page = await getPageBySlug(pageSlug);
    expect(page?.status).toBe("published");

    expect(
      first.results.some(
        (item) =>
          item.type === "setting.content-route.upsert" &&
          item.status === "success" &&
          item.targetKey === contentTypeSlug
      )
    ).toBe(true);

    const second = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-2`,
    });
    idempotencyKeysToCleanup.add(`assistant-action-${token}-2`);

    expect(second.summary.failed).toBe(0);
    expect(second.summary.create).toBe(0);

    const [secondExecution] = await db
      .select()
      .from(assistantActionExecutions)
      .where(eq(assistantActionExecutions.idempotencyKey, `assistant-action-${token}-2`));
    const secondUndoItems = secondExecution
      ? await db
          .select()
          .from(assistantActionUndoItems)
          .where(eq(assistantActionUndoItems.executionId, secondExecution.id))
      : [];
    expect(secondUndoItems.length).toBe(second.results.length);

    const queriesAfterSecond = await listListingQueries();
    const templatesAfterSecond = await listListingTemplates();
    const screensAfterSecond = await listCustomScreens();

    expect(queriesAfterSecond.filter((entry) => entry.name === listingQueryName)).toHaveLength(1);
    expect(templatesAfterSecond.filter((entry) => entry.slug === listingTemplateSlug)).toHaveLength(
      1
    );
    expect(screensAfterSecond.filter((entry) => entry.name === customScreenName)).toHaveLength(1);

    const replay = await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-2`,
    });

    expect(replay.summary).toEqual(second.summary);
    expect(replay.results).toEqual(second.results);
    expect(second.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
    expect(replay.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
    const secondUndoItemsAfterReplay = secondExecution
      ? await db
          .select()
          .from(assistantActionUndoItems)
          .where(eq(assistantActionUndoItems.executionId, secondExecution.id))
      : [];
    expect(secondUndoItemsAfterReplay).toHaveLength(secondUndoItems.length);

    const refinementPlan = planAssistantActions({
      prompt: "dodaj filtr po metrazu i liczbie pokoi",
      context: {
        page: `/admin/pages${pageSlug}`,
        locale: "pl-PL",
      },
    });

    const refinement = await executeAssistantActionPlan({
      plan: {
        ...refinementPlan,
        actions: refinementPlan.actions.map((action) =>
          action.type === "page.upsert"
            ? {
                ...action,
                input: {
                  ...action.input,
                  slug: pageSlug,
                  title: `Katalog Projektów Domów ${token}`,
                  introTitle: `Katalog Projektów Domów ${token}`,
                  listingQueryName,
                  listingTemplateSlug,
                  collectionLink: action.input.collectionLink
                    ? {
                        ...action.input.collectionLink,
                        contentTypeSlug,
                        listingQueryName,
                        listingTemplateSlug,
                      }
                    : undefined,
                },
              }
            : action
        ),
      },
      actorId: actor.id,
      idempotencyKey: `assistant-action-${token}-3`,
    });
    idempotencyKeysToCleanup.add(`assistant-action-${token}-3`);

    expect(refinement.summary.failed).toBe(0);
    expect(refinement.summary.create).toBe(0);
    expect(refinement.summary.update).toBeGreaterThan(0);

    const refinedPage = await getPageBySlug(pageSlug);
    const refinedData = refinedPage?.currentData as
      | { sections?: Array<{ type?: string; blocks?: Array<{ type?: string }> }> }
      | undefined;
    const sections = Array.isArray(refinedData?.sections) ? refinedData.sections : [];
    const blocks = sections.flatMap((section) => section.blocks ?? []);
    expect(sections.some((section) => section.type === "filters")).toBe(true);
    expect(blocks.some((block) => block.type === "filters")).toBe(true);
  },
  { timeout: 40_000 }
);

testIfDb(
  "content route actions persist detailPageId preserve, clear, and replace semantics",
  async () => {
    const token = randomUUID().slice(0, 8);
    originalContentRoutes =
      originalContentRoutes ??
      ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ??
      [];

    const actor = await createActor();
    await setSetting("site.contentRoutes", [
      {
        type: "blog",
        listPath: "/blog",
        detailPath: "/blog/:slug",
        enabled: true,
        detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
      },
    ]);

    await executeAssistantActionPlan({
      plan: {
        id: "plan-route-preserve-db",
        status: "ready",
        intentId: "route-preserve-db",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Preserve route link",
        answer: "I can preserve the linked detail page.",
        summary: "Keep the current route link.",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "route-blog-preserve-db",
            type: "setting.content-route.upsert",
            title: "Update blog route",
            description: "Update the route without changing the detail page link.",
            input: {
              typeSlug: "blog",
              listPath: "/blog",
              detailPath: "/blog/:slug",
              enabled: true,
            },
          },
        ],
      },
      actorId: actor.id,
      idempotencyKey: `assistant-route-preserve-db-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-route-preserve-db-${token}-1`);

    let contentRoutes = ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
    expect(contentRoutes[0]?.detailPageId).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");

    await executeAssistantActionPlan({
      plan: {
        id: "plan-route-clear-db",
        status: "ready",
        intentId: "route-clear-db",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Clear route link",
        answer: "I can clear the linked detail page.",
        summary: "Clear the current route link.",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "route-blog-clear-db",
            type: "setting.content-route.upsert",
            title: "Clear blog route link",
            description: "Clear the linked detail page.",
            input: {
              typeSlug: "blog",
              listPath: "/blog",
              detailPath: "/blog/:slug",
              enabled: true,
              detailPageId: null,
            },
          },
        ],
      },
      actorId: actor.id,
      idempotencyKey: `assistant-route-clear-db-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-route-clear-db-${token}-1`);

    contentRoutes = ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
    expect(contentRoutes[0]?.detailPageId).toBeNull();

    await executeAssistantActionPlan({
      plan: {
        id: "plan-route-replace-db",
        status: "ready",
        intentId: "route-replace-db",
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Replace route link",
        answer: "I can replace the linked detail page.",
        summary: "Set a new route link.",
        confidence: 0.9,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: "route-blog-replace-db",
            type: "setting.content-route.upsert",
            title: "Replace blog route link",
            description: "Replace the linked detail page.",
            input: {
              typeSlug: "blog",
              listPath: "/blog",
              detailPath: "/blog/:slug",
              enabled: true,
              detailPageId: "6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            },
          },
        ],
      },
      actorId: actor.id,
      idempotencyKey: `assistant-route-replace-db-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-route-replace-db-${token}-1`);

    contentRoutes = ((await getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [];
    expect(contentRoutes[0]?.detailPageId).toBe("6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
  }
);
