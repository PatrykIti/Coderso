import { afterAll, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { assistantActionExecutions, detailPageDocuments, users } from "../../../core/db/schema";
import { matchExistingCompositionResources } from "../../../core/services/assistant/blueprints/blueprintExistingResourceMatcher";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import type {
  AssistantActionPlan,
  AssistantDetailPageUpsertAction,
} from "../../../core/services/assistant/actionPlanTypes";
import { createContentType, deleteContentType } from "../../../core/services/content/typeService";
import type { DetailPageDocumentV1 } from "../../../core/services/content/detailPageTypes";
import type { PageLayoutSettings } from "../../../core/services/pages/layoutSettings";

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

const layoutSettings = {
  wrapper: {
    container: "default",
    padding: { top: "md", bottom: "lg" },
    background: {
      color: "#ffffff",
      image: null,
      media: {
        type: "none",
        source: "external",
        src: null,
      },
    },
  },
  sections: {
    gap: "lg",
    defaults: {
      container: "default",
      padding: { top: "xl", bottom: "xl" },
      margin: { top: "none", bottom: "none" },
    },
  },
  applyDefaultsToNewBlocks: false,
} satisfies PageLayoutSettings;

// Assistant detail-page authoring is schemaVersion 2 sections only
// (TASK-580-03-L06); v1 `blocks` payloads fail closed on write.
const buildV2DetailPageDocument = (input: {
  id: string;
  contentTypeId: string;
  contentTypeSlug: string;
  name: string;
  status?: "draft" | "published";
  heroText?: string;
}): AssistantDetailPageUpsertAction["input"]["document"] => ({
  schemaVersion: 2,
  id: input.id,
  name: input.name,
  contentTypeId: input.contentTypeId,
  contentTypeSlug: input.contentTypeSlug,
  status: input.status ?? "published",
  titlePattern: "{{ title }}",
  settings: {
    template: "detail",
    layout: layoutSettings,
  },
  sections: [
    {
      id: "hero-1",
      type: "hero",
      name: "Hero",
      variant: "centered",
      layout: {
        columns: 1,
        align: "start",
        justify: "start",
        maxWidth: 1080,
        stackVertical: false,
      },
      style: {
        background: "#ffffff",
        backgroundType: "color",
        backgroundImage: null,
        accent: "#0d9488",
        radius: 0,
        shadow: "none",
      },
      spacing: {
        paddingTop: 64,
        paddingBottom: 64,
        paddingLeft: 40,
        paddingRight: 40,
        gap: 24,
      },
      visibility: {
        visible: true,
        authOnly: false,
        anchor: null,
        startsAt: null,
        endsAt: null,
      },
      responsive: {},
      blocks: [
        {
          id: "hero-1-heading",
          type: "heading",
          props: { text: input.heroText ?? "Products detail" },
          visibility: { visible: true },
        },
      ],
    },
  ],
  bindings: [],
});

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
}, 30_000);

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

    const document = buildV2DetailPageDocument({
      id: detailPageId,
      contentTypeId: contentType.id,
      contentTypeSlug: "stale-products",
      name: `Products detail template ${token}`,
      heroText: "Products detail",
    }) satisfies AssistantDetailPageUpsertAction["input"]["document"];

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

    const baseDocument = buildV2DetailPageDocument({
      id: existingDetailPageId,
      contentTypeId: contentType.id,
      contentTypeSlug: contentType.slug,
      name: `Matched products detail template ${token}`,
      heroText: "Matched products detail",
    }) satisfies AssistantDetailPageUpsertAction["input"]["document"];

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

testIfDbWithOptions(
  "v1-shaped detail-page documents fail closed with detail_page_legacy_v1_invalid",
  async () => {
    const actor = await createActor();
    const token = randomUUID().slice(0, 8);
    const contentType = await createContentType({
      name: `V1 Rejected Products ${token}`,
      slug: `v1-rejected-products-${token}`,
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          headline: { type: "string", xFieldType: "text" },
        },
      },
    });
    createdContentTypeIds.add(contentType.id);
    const v1DetailPageId = "54d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c";

    const v1Document: DetailPageDocumentV1 = {
      schemaVersion: 1,
      id: v1DetailPageId,
      name: `V1 rejected products detail template ${token}`,
      contentTypeId: contentType.id,
      contentTypeSlug: contentType.slug,
      status: "draft",
      titlePattern: "{{ title }}",
      settings: {
        template: "detail",
        layout: layoutSettings,
      },
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          variant: "centered",
          data: { headline: "V1 products detail" },
        },
      ],
      bindings: [],
    };

    const plan: AssistantActionPlan = {
      id: `plan-detail-page-v1-rejected-${token}`,
      status: "ready",
      intentId: `detail-page-v1-rejected-${token}`,
      promptKind: "setup_request",
      intentFamily: "product_catalog",
      title: "Create detail template",
      answer: "I can create the detail template.",
      summary: "Create a products detail template from a legacy v1 document.",
      confidence: 0.91,
      assumptions: [],
      questions: [],
      actions: [
        {
          id: `detail-page-v1-rejected-${token}`,
          type: "detail-page.upsert",
          title: "Create products detail template",
          description: "Create a products detail template from a legacy v1 document.",
          input: {
            document: v1Document as unknown as AssistantDetailPageUpsertAction["input"]["document"],
          },
        },
      ],
    };

    const preview = await dryRunAssistantActionPlan({ plan });
    expect(preview.readyToExecute).toBe(false);
    expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_legacy_v1_invalid");

    await expect(
      executeAssistantActionPlan({
        plan,
        actorId: actor.id,
        idempotencyKey: `assistant-detail-page-v1-rejected-${token}`,
      })
    ).rejects.toThrow("assistant_action_plan_not_ready");
    idempotencyKeysToCleanup.add(`assistant-detail-page-v1-rejected-${token}`);

    const rows = await db
      .select()
      .from(detailPageDocuments)
      .where(eq(detailPageDocuments.id, v1DetailPageId));
    expect(rows).toHaveLength(0);
  },
  { timeout: 20_000 }
);
