import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { assistantActionExecutions, detailPageDocuments, users } from "../../../core/db/schema";
import { matchExistingCompositionResources } from "../../../core/services/assistant/blueprints/blueprintExistingResourceMatcher";
import { executeAssistantActionPlan } from "../../../core/services/assistant/actionExecutorService";
import type {
  AssistantActionPlan,
  AssistantDetailPageUpsertAction,
} from "../../../core/services/assistant/actionPlanTypes";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";

const hasDb = Boolean(process.env.DATABASE_URL) && (await canConnect());
const testIfDb = (hasDb ? test : test.skip) as typeof test;
const testIfDbWithOptions = testIfDb as unknown as (
  name: string,
  fn: () => Promise<void>,
  options: { timeout: number }
) => void;

async function canConnect() {
  try {
    await db.execute(sql`
      select to_regclass('public.detail_page_documents') as detail_pages_table
    `);
    return true;
  } catch {
    return false;
  }
}

const createdUserIds = new Set<string>();
const createdContentTypeIds = new Set<string>();
const createdDetailPageIds = new Set<string>();
const idempotencyKeysToCleanup = new Set<string>();

const createActor = async () => {
  const [created] = await db
    .insert(users)
    .values({
      email: `assistant-detail-page-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Detail Page DB Actor",
      status: "active",
    })
    .returning();
  if (!created) throw new Error("actor_create_failed");
  createdUserIds.add(created.id);
  return created;
};

afterAll(async () => {
  if (!hasDb) return;

  for (const key of idempotencyKeysToCleanup) {
    await db
      .delete(assistantActionExecutions)
      .where(eq(assistantActionExecutions.idempotencyKey, key))
      .catch(() => undefined);
  }

  for (const detailPageId of createdDetailPageIds) {
    await db
      .delete(detailPageDocuments)
      .where(eq(detailPageDocuments.id, detailPageId))
      .catch(() => undefined);
  }

  for (const contentTypeId of createdContentTypeIds) {
    await deleteContentType(contentTypeId).catch(() => undefined);
  }

  for (const userId of createdUserIds) {
    await db
      .delete(users)
      .where(eq(users.id, userId))
      .catch(() => undefined);
  }
});

testIfDbWithOptions(
  "detail-page upsert actions persist one canonical detail-page document per id",
  async () => {
    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Detail Page Products ${token}`,
      slug: `detail-page-products-${token}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    createdContentTypeIds.add(contentType.id);
    const detailPageId = "74d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";
    createdDetailPageIds.add(detailPageId);

    const document = {
      schemaVersion: 1 as const,
      id: detailPageId,
      name: `Products detail template ${token}`,
      contentTypeId: contentType.id,
      contentTypeSlug: "stale-products",
      status: "published" as const,
      titlePattern: "{{ title }}",
      settings: {
        template: "detail",
        layout: {
          wrapper: {
            container: "default" as const,
            padding: { top: "md" as const, bottom: "lg" as const },
            background: {
              color: "#ffffff",
              image: null,
              media: {
                type: "none" as const,
                source: "external" as const,
                src: null,
              },
            },
          },
          sections: {
            gap: "lg" as const,
            defaults: {
              container: "default" as const,
              padding: { top: "xl" as const, bottom: "xl" as const },
              margin: { top: "none" as const, bottom: "none" as const },
            },
          },
          applyDefaultsToNewBlocks: false,
        },
      },
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          variant: "centered",
          data: {
            headline: "Products detail",
          },
        },
      ],
      bindings: [],
    } satisfies AssistantDetailPageUpsertAction["input"]["document"];

    const plan: AssistantActionPlan = {
      id: `plan-detail-page-upsert-${token}`,
      status: "ready" as const,
      intentId: `detail-page-upsert-${token}`,
      promptKind: "setup_request" as const,
      intentFamily: "product_catalog" as const,
      title: "Create detail template",
      answer: "I can create the detail template.",
      summary: "Create a products detail template.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: `detail-page-products-${token}`,
          type: "detail-page.upsert" as const,
          title: "Create products detail template",
          description: "Create a products detail template.",
          input: {
            document,
          },
        },
      ],
    };

    await executeAssistantActionPlan({
      plan,
      actorId: actor.id,
      idempotencyKey: `assistant-detail-page-db-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-detail-page-db-${token}-1`);

    const detailAction = plan.actions[0];
    if (!detailAction || detailAction.type !== "detail-page.upsert") {
      throw new Error("missing_detail_page_action");
    }

    await executeAssistantActionPlan({
      plan: {
        ...plan,
        actions: [
          {
            ...detailAction,
            input: {
              ...detailAction.input,
              document: {
                ...document,
                name: `Products detail template ${token} updated`,
                status: "draft" as const,
              },
            },
          },
        ],
      },
      actorId: actor.id,
      idempotencyKey: `assistant-detail-page-db-${token}-2`,
    });
    idempotencyKeysToCleanup.add(`assistant-detail-page-db-${token}-2`);

    const rows = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, detailPageId));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("draft");
    expect(rows[0]?.publishedDocument).toBeNull();
  },
  { timeout: 20_000 }
);

testIfDbWithOptions(
  "matched existing detail-page ids update the canonical row instead of creating duplicates",
  async () => {
    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `Matched Detail Page Products ${token}`,
      slug: `matched-detail-page-products-${token}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    createdContentTypeIds.add(contentType.id);
    const existingDetailPageId = randomUUID();
    const plannedDetailPageId = randomUUID();
    createdDetailPageIds.add(existingDetailPageId);
    createdDetailPageIds.add(plannedDetailPageId);

    const baseDocument = {
      schemaVersion: 1 as const,
      id: existingDetailPageId,
      name: `Matched products detail template ${token}`,
      contentTypeId: contentType.id,
      contentTypeSlug: contentType.slug,
      status: "published" as const,
      titlePattern: "{{ title }}",
      settings: {
        template: "detail",
        layout: {
          wrapper: {
            container: "default" as const,
            padding: { top: "md" as const, bottom: "lg" as const },
            background: {
              color: "#ffffff",
              image: null,
              media: {
                type: "none" as const,
                source: "external" as const,
                src: null,
              },
            },
          },
          sections: {
            gap: "lg" as const,
            defaults: {
              container: "default" as const,
              padding: { top: "xl" as const, bottom: "xl" as const },
              margin: { top: "none" as const, bottom: "none" as const },
            },
          },
          applyDefaultsToNewBlocks: false,
        },
      },
      blocks: [{ id: "hero-1", type: "hero", variant: "centered", data: {} }],
      bindings: [],
    } satisfies AssistantDetailPageUpsertAction["input"]["document"];

    await executeAssistantActionPlan({
      plan: {
        id: `plan-detail-page-matched-initial-${token}`,
        status: "ready",
        intentId: `detail-page-matched-initial-${token}`,
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Create initial detail template",
        answer: "I can create the detail template.",
        summary: "Create initial template.",
        confidence: 0.91,
        assumptions: [],
        questions: [],
        actions: [
          {
            id: `detail-page-matched-initial-${token}`,
            type: "detail-page.upsert",
            title: "Create initial detail template",
            description: "Create initial template.",
            input: {
              document: baseDocument,
            },
          },
        ],
      },
      actorId: actor.id,
      idempotencyKey: `assistant-detail-page-matched-db-${token}-1`,
    });
    idempotencyKeysToCleanup.add(`assistant-detail-page-matched-db-${token}-1`);

    const matched = matchExistingCompositionResources({
      actions: [
        {
          id: `detail-page-matched-update-${token}`,
          type: "detail-page.upsert",
          title: "Update matched detail template",
          description: "Update matched template.",
          input: {
            document: {
              ...baseDocument,
              id: plannedDetailPageId,
              name: `Matched products detail template ${token} updated`,
              status: "draft" as const,
            },
          },
        },
      ],
      catalog: {
        schemaVersion: 1,
        generatedAt: "2026-05-10T10:00:00.000Z",
        budget: { maxItemsPerGroup: 50, maxFieldsPerResource: 24, truncated: false },
        pages: [],
        posts: [],
        entries: [],
        contentTypes: [
          {
            id: contentType.id,
            slug: contentType.slug,
            name: contentType.name,
            entryCount: 0,
            fields: [],
          },
        ],
        customScreens: [],
        detailPages: [
          {
            id: existingDetailPageId,
            name: baseDocument.name,
            status: "published",
            contentTypeId: contentType.id,
            contentTypeSlug: contentType.slug,
            linkedRouteType: contentType.slug,
            updatedAt: "2026-05-10T09:00:00.000Z",
            blockCount: 1,
            bindingCount: 0,
          },
        ],
        listings: { queries: [], templates: [] },
        forms: [],
        menus: [],
        seoDocuments: [],
        widgets: [],
        media: [],
        commerce: { products: [], collections: [] },
        solutionKits: [],
        warnings: [],
      },
    });

    expect(matched.conflicts).toHaveLength(0);

    await executeAssistantActionPlan({
      plan: {
        id: `plan-detail-page-matched-update-${token}`,
        status: "ready",
        intentId: `detail-page-matched-update-${token}`,
        promptKind: "setup_request",
        intentFamily: "product_catalog",
        title: "Update matched detail template",
        answer: "I can update the detail template.",
        summary: "Update matched template.",
        confidence: 0.91,
        assumptions: [],
        questions: [],
        actions: matched.actions,
      },
      actorId: actor.id,
      idempotencyKey: `assistant-detail-page-matched-db-${token}-2`,
    });
    idempotencyKeysToCleanup.add(`assistant-detail-page-matched-db-${token}-2`);

    const existingRows = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, existingDetailPageId));
    const plannedRows = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, plannedDetailPageId));

    expect(existingRows).toHaveLength(1);
    expect(plannedRows).toHaveLength(0);
    expect(existingRows[0]?.name).toBe(`Matched products detail template ${token} updated`);
    expect(existingRows[0]?.status).toBe("draft");
  },
  { timeout: 20_000 }
);
