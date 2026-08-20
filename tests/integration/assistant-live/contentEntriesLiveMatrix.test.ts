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
const loadEntries = () => import("../../../core/services/content/entryService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Entries Actor",
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

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      title: "Summary",
    },
  },
  required: [],
} as const;

const createContentTypeFixture = async (input: {
  name: string;
  slug: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createContentType, deleteContentType } = await loadContentTypes();
  const contentType = await createContentType({
    name: input.name,
    slug: input.slug,
    schema,
  });
  if (!contentType) throw new Error("assistant_live_content_type_create_failed");
  input.cleanup.add(`content-type:${contentType.id}`, async () => {
    await deleteContentType(contentType.id).catch(() => undefined);
  });
  return contentType;
};

const createEntryFixture = async (input: {
  typeId: string;
  title: string;
  slug: string;
  actorId: string;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createEntry, deleteEntry } = await loadEntries();
  const entry = await createEntry(input.typeId, {
    title: input.title,
    slug: input.slug,
    data: {
      summary: `${input.title} summary`,
    },
    authorId: input.actorId,
  });
  if (!entry) throw new Error("assistant_live_entry_create_failed");
  input.cleanup.add(`entry:${entry.id}`, async () => {
    await deleteEntry(entry.id).catch(() => undefined);
  });
  return entry;
};

const buildContentContext = async (input?: {
  activeEntryId?: string;
  activeContentTypeSlug?: string;
}): Promise<AssistantActionContext> => {
  const { listContentTypes } = await loadContentTypes();
  const contentTypes = await listContentTypes();
  const route =
    input?.activeEntryId && input.activeContentTypeSlug
      ? `/admin/advanced/entries/${input.activeContentTypeSlug}/${input.activeEntryId}`
      : "/admin/advanced/engine";
  return {
    page: route,
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
      listings: { queries: [], templates: [] },
      forms: [],
      menus: [],
      seoDocuments: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 2,
      route,
      activeHref: route,
      area: "advanced",
      advancedModule: "entries",
      selectedResource: input?.activeEntryId ? { kind: "entry", id: input.activeEntryId } : null,
      visibleActions: [],
      permissionHints: {
        known: false,
        requiredForVisibleActions: [],
        reason: "frontend_user_has_no_permissions",
      },
    },
  };
};

const runContentEntriesMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`content-entries-${provider.id}`);
  const actor = await createActor(prefix);
  const usedType = await createContentTypeFixture({
    name: `${prefix} Used Model`,
    slug: `${prefix}-used-model`,
    cleanup,
  });
  const zeroType = await createContentTypeFixture({
    name: `${prefix} Empty Model`,
    slug: `${prefix}-empty-model`,
    cleanup,
  });
  const entry = await createEntryFixture({
    typeId: usedType.id,
    title: `${prefix} Entry Alpha`,
    slug: `${prefix}-entry-alpha`,
    actorId: actor.id,
    cleanup,
  });

  try {
    const lookupPlan = await planWithLiveProvider({
      provider,
      context: await buildContentContext(),
      prompt: `Czy istnieje model "${usedType.name}" w Engine?`,
    });
    expect(lookupPlan.responseKind, provider.id).toBe("inspection");
    expect(lookupPlan.inspection?.resourceKind, provider.id).toBe("content-type");
    expect(
      lookupPlan.inspection?.candidates.map((candidate) => candidate.label) ?? [],
      provider.id
    ).toContain(usedType.name);

    const unsafeDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildContentContext(),
      prompt: `Usun model "${usedType.name}" z Engine`,
    });
    expect(unsafeDeletePlan.status, provider.id).toBe("needs_input");
    expect(unsafeDeletePlan.actions, provider.id).toEqual([]);

    const renamedEntry = `${prefix} Entry Renamed`;
    const updateEntryPlan = await planWithLiveProvider({
      provider,
      context: await buildContentContext({
        activeEntryId: entry.id,
        activeContentTypeSlug: usedType.slug,
      }),
      prompt: `Zmien tytul aktywnego wpisu na "${renamedEntry}"`,
    });
    expect(
      updateEntryPlan.actions.map((action) => action.type),
      provider.id
    ).toContain("entry.update");
    expect((await dryRunLivePlan(updateEntryPlan)).readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updateEntryPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-entry-update`,
      })
    );
    const { getEntry, deleteEntry } = await loadEntries();
    expect((await getEntry(entry.id))?.title, provider.id).toBe(renamedEntry);

    const deleteEntryPlan = await planWithLiveProvider({
      provider,
      context: await buildContentContext({
        activeEntryId: entry.id,
        activeContentTypeSlug: usedType.slug,
      }),
      prompt: "Usun aktywny wpis",
    });
    expect(
      deleteEntryPlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["entry.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteEntryPlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-entry-delete`,
      })
    );
    expect(await getEntry(entry.id), provider.id).toBeNull();

    const deleteZeroTypePlan = await planWithLiveProvider({
      provider,
      context: await buildContentContext(),
      prompt: `Usun model "${zeroType.name}" z Engine`,
    });
    expect(
      deleteZeroTypePlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["content-type.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deleteZeroTypePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-content-type-delete`,
      })
    );
    const { getContentType } = await loadContentTypes();
    expect(await getContentType(zeroType.id), provider.id).toBeNull();

    await deleteEntry(entry.id).catch(() => undefined);
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle content type and entry matrix",
  async () => {
    for (const provider of providers) {
      await runContentEntriesMatrixForProvider(provider);
    }
  },
  180_000
);
