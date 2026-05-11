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
const loadCustomScreens = () => import("../../../core/services/customScreens/customScreenService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Screens Actor",
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
    title: {
      type: "string",
      title: "Title",
    },
  },
  required: [],
} as const;

const createContentTypeFixture = async (
  prefix: string,
  cleanup: ReturnType<typeof createLiveCleanupStack>
) => {
  const { createContentType, deleteContentType } = await loadContentTypes();
  const contentType = await createContentType({
    name: `${prefix} Screen Model`,
    slug: `${prefix}-screen-model`,
    schema,
  });
  if (!contentType) throw new Error("assistant_live_content_type_create_failed");
  cleanup.add(`content-type:${contentType.id}`, async () => {
    await deleteContentType(contentType.id).catch(() => undefined);
  });
  return contentType;
};

const createScreenFixture = async (input: {
  name: string;
  contentTypeId: string;
  status: "draft" | "active";
  showInSidebar: boolean;
  cleanup: ReturnType<typeof createLiveCleanupStack>;
}) => {
  const { createCustomScreen, deleteCustomScreen } = await loadCustomScreens();
  const screen = await createCustomScreen({
    name: input.name,
    contentTypeId: input.contentTypeId,
    status: input.status,
    showInSidebar: input.showInSidebar,
    sidebarLabel: input.showInSidebar ? input.name : null,
    blocks: [],
    bindings: [],
  });
  input.cleanup.add(`custom-screen:${screen.id}`, async () => {
    await deleteCustomScreen(screen.id).catch(() => undefined);
  });
  return screen;
};

const buildScreenContext = async (activeScreenId?: string): Promise<AssistantActionContext> => {
  const [{ listContentTypes }, { getCustomScreen, listCustomScreens }] = await Promise.all([
    loadContentTypes(),
    loadCustomScreens(),
  ]);
  const [contentTypes, screens, activeScreen] = await Promise.all([
    listContentTypes(),
    listCustomScreens(),
    activeScreenId ? getCustomScreen(activeScreenId) : Promise.resolve(null),
  ]);
  return {
    page: activeScreen
      ? `/admin/advanced/custom-screens/${activeScreen.id}`
      : "/admin/advanced/custom-screens",
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
      customScreens: screens.map((screen) => ({
        id: screen.id,
        name: screen.name,
        contentTypeId: screen.contentTypeId,
        status: screen.status,
        collectionRole: screen.collectionRole,
        compositionKey: screen.compositionKey,
        showInSidebar: screen.showInSidebar,
        sidebarLabel: screen.sidebarLabel,
        writableBindingFields: [],
        bindings: [],
      })),
      listings: { queries: [], templates: [] },
      forms: [],
      menus: [],
      seoDocuments: [],
      widgets: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 2,
      route: activeScreen
        ? `/admin/advanced/custom-screens/${activeScreen.id}`
        : "/admin/advanced/custom-screens",
      activeHref: "/admin/advanced/custom-screens",
      area: "advanced",
      advancedModule: "custom-screens",
      selectedResource: activeScreen ? { kind: "custom-screen", id: activeScreen.id } : null,
      visibleActions: [],
      permissionHints: {
        known: false,
        requiredForVisibleActions: [],
        reason: "frontend_user_has_no_permissions",
      },
    },
    activeSurface: activeScreen
      ? {
          kind: "custom-screen",
          screen: {
            id: activeScreen.id,
            name: activeScreen.name,
            status: activeScreen.status,
            contentTypeId: activeScreen.contentTypeId,
            showInSidebar: activeScreen.showInSidebar,
            sidebarLabel: activeScreen.sidebarLabel,
            mode: "list",
          },
          selectedEntryId: null,
          selectedBlockId: null,
          blocks: [],
          bindings: [],
          writableBindingFields: [],
          warnings: [],
        }
      : null,
  };
};

const runCustomScreensMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`screens-${provider.id}`);
  const actor = await createActor(prefix);
  const contentType = await createContentTypeFixture(prefix, cleanup);
  const screenAlpha = await createScreenFixture({
    name: `${prefix} Screen Alpha`,
    contentTypeId: contentType.id,
    status: "active",
    showInSidebar: true,
    cleanup,
  });
  const screenBeta = await createScreenFixture({
    name: `${prefix} Screen Beta`,
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    cleanup,
  });
  await createScreenFixture({
    name: `Unrelated Screen ${prefix}`,
    contentTypeId: contentType.id,
    status: "active",
    showInSidebar: true,
    cleanup,
  });

  try {
    const lookupPlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(),
      prompt: `Znajdz ekrany custom screen z prefixem "${prefix} Screen"`,
    });
    expect(lookupPlan.responseKind, provider.id).toBe("inspection");
    const labels = lookupPlan.inspection?.candidates.map((candidate) => candidate.label) ?? [];
    expect(labels, provider.id).toContain(screenAlpha.name);
    expect(labels, provider.id).not.toContain(`Unrelated Screen ${prefix}`);

    const draftLookupPlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(),
      prompt: `Czy istnieje custom screen "${screenBeta.name}"?`,
    });
    expect(
      draftLookupPlan.inspection?.candidates.map((candidate) => candidate.label) ?? [],
      provider.id
    ).toContain(screenBeta.name);

    const visiblePlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(),
      prompt: `Pokaz widoczne w sidebarze ekrany custom screen z prefixem "${prefix}"`,
    });
    const visibleLabels =
      visiblePlan.inspection?.candidates.map((candidate) => candidate.label) ?? [];
    expect(visibleLabels, provider.id).toContain(screenAlpha.name);
    expect(visibleLabels, provider.id).not.toContain(screenBeta.name);

    const renamed = `${prefix} Screen Alpha Renamed`;
    const updatePlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(screenAlpha.id),
      prompt: `Zmien nazwe aktywnego custom screen na "${renamed}"`,
    });
    expect(
      updatePlan.actions.map((action) => action.type),
      provider.id
    ).toContain("custom-screen.update");
    expect((await dryRunLivePlan(updatePlan)).readyToExecute, provider.id).toBe(true);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-screen-update`,
      })
    );
    const { getCustomScreen } = await loadCustomScreens();
    expect((await getCustomScreen(screenAlpha.id))?.name, provider.id).toBe(renamed);

    const broadDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(),
      prompt: "usun wszystkie ekrany custom screen",
    });
    expect(broadDeletePlan.status, provider.id).toBe("needs_input");
    expect(broadDeletePlan.actions, provider.id).toEqual([]);

    const deletePlan = await planWithLiveProvider({
      provider,
      context: await buildScreenContext(),
      prompt: `Usun dokladnie dwa ekrany custom screen z prefixem "${prefix} Screen"`,
    });
    expect(
      deletePlan.actions.map((action) => action.type),
      provider.id
    ).toEqual(["custom-screen.delete", "custom-screen.delete"]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deletePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-screen-delete`,
      })
    );
    expect(await getCustomScreen(screenAlpha.id), provider.id).toBeNull();
    expect(await getCustomScreen(screenBeta.id), provider.id).toBeNull();
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle custom screen matrix",
  async () => {
    for (const provider of providers) {
      await runCustomScreensMatrixForProvider(provider);
    }
  },
  180_000
);
