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

const loadForms = () => import("../../../core/services/forms/formsService");

const createActor = async (prefix: string) => {
  const { db, users } = await loadDb();
  const [actor] = await db
    .insert(users)
    .values({
      email: `${prefix}-${randomUUID()}@coderso.test`,
      passwordHash: `hash-${randomUUID()}`,
      name: "Assistant Live Forms Actor",
      status: "active",
    })
    .returning();
  if (!actor) throw new Error("assistant_live_actor_create_failed");
  globalCleanup.add(`user:${actor.id}`, async () => {
    await db.delete(users).where(eq(users.id, actor.id)).catch(() => undefined);
  });
  return actor;
};

const createFormFixture = async (
  input: {
    name: string;
    slug: string;
    status: "draft" | "published" | "archived";
    submissionAccess: "public" | "internal";
    cleanup: ReturnType<typeof createLiveCleanupStack>;
  }
) => {
  const { createForm, deleteForm } = await loadForms();
  const form = await createForm({
    name: input.name,
    slug: input.slug,
    status: input.status,
    submissionAccess: input.submissionAccess,
    description: `${input.name} description`,
    successMessage: "Thanks",
  });
  if (!form) throw new Error("assistant_live_form_create_failed");
  input.cleanup.add(`form:${form.id}`, async () => {
    await deleteForm(form.id).catch(() => undefined);
  });
  return form;
};

const buildFormsContext = async (): Promise<AssistantActionContext> => {
  const { listForms } = await loadForms();
  const forms = await listForms();
  return {
    page: "/admin/advanced/forms",
    locale: "pl-PL",
    resourceCatalog: {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      budget: {
        maxItemsPerGroup: 100,
        maxFieldsPerResource: 24,
        truncated: false,
      },
      pages: [],
      contentTypes: [],
      customScreens: [],
      listings: { queries: [], templates: [] },
      forms: forms.map((form) => ({
        id: form.id,
        name: form.name,
        slug: form.slug,
        status: form.status,
        submissionAccess: form.submissionAccess,
        fields: [],
      })),
      menus: [],
      seoDocuments: [],
      widgets: [],
      warnings: [],
    },
    runtimeSnapshot: {
      schemaVersion: 2,
      route: "/admin/advanced/forms",
      activeHref: "/admin/advanced/forms",
      area: "advanced",
      advancedModule: "forms",
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

const runFormsMatrixForProvider = async (provider: LiveProviderRuntime) => {
  const cleanup = createLiveCleanupStack();
  const prefix = createLiveRunPrefix(`forms-${provider.id}`);
  const actor = await createActor(prefix);
  const publicForm = await createFormFixture({
    name: `${prefix} Lead Public`,
    slug: `${prefix}-lead-public`,
    status: "published",
    submissionAccess: "public",
    cleanup,
  });
  const internalForm = await createFormFixture({
    name: `${prefix} Lead Internal`,
    slug: `${prefix}-lead-internal`,
    status: "draft",
    submissionAccess: "internal",
    cleanup,
  });
  await createFormFixture({
    name: `${prefix} Other`,
    slug: `${prefix}-other`,
    status: "published",
    submissionAccess: "public",
    cleanup,
  });

  try {
    const createSlug = `${prefix}-created-form`;
    const createPlan = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: [
        `Utworz formularz o nazwie "${prefix} Created Form"`,
        `slug "${createSlug}"`,
        `status "draft"`,
        `submissionAccess "internal"`,
      ].join(", "),
    });
    expect(createPlan.actions.map((action) => action.type), provider.id).toContain("form.upsert");
    expect((await dryRunLivePlan(createPlan)).readyToExecute, provider.id).toBe(true);
    const createResult = await executeLivePlan({
      plan: createPlan,
      actorId: actor.id,
      idempotencyKey: `${prefix}-form-create`,
    });
    expectSuccessfulExecution(createResult);
    const createdId = createResult.results.find((item) => item.type === "form.upsert")?.resourceId;
    if (createdId) {
      const { deleteForm } = await loadForms();
      cleanup.add(`form:${createdId}`, async () => {
        await deleteForm(createdId).catch(() => undefined);
      });
    }

    const publicLookup = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: `Znajdz publiczne formularze ktore maja w nazwie "${prefix} Lead Public"`,
    });
    const publicLabels = publicLookup.inspection?.candidates.map((candidate) => candidate.label) ?? [];
    expect(publicLabels, provider.id).toContain(publicForm.name);
    expect(publicLabels, provider.id).not.toContain(internalForm.name);

    const renamed = `${prefix} Lead Public Renamed`;
    const updatePlan = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: `Zmien nazwe formularza "${publicForm.name}" na "${renamed}"`,
    });
    expect(updatePlan.actions.map((action) => action.type), provider.id).toContain("form.update");
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: updatePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-form-update`,
      })
    );
    const { getForm } = await loadForms();
    expect((await getForm(publicForm.id))?.name, provider.id).toBe(renamed);

    const archivePlan = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: `Zarchiwizuj formularz "${renamed}"`,
    });
    expect(archivePlan.actions.map((action) => action.type), provider.id).toContain("form.archive");
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: archivePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-form-archive`,
      })
    );
    expect((await getForm(publicForm.id))?.status, provider.id).toBe("archived");

    const broadDeletePlan = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: "usun wszystkie formularze",
    });
    expect(broadDeletePlan.status, provider.id).toBe("needs_input");
    expect(broadDeletePlan.actions, provider.id).toEqual([]);

    const deletePlan = await planWithLiveProvider({
      provider,
      context: await buildFormsContext(),
      prompt: `Usun dokladnie dwa formularze, ktore maja w nazwie "${prefix} Lead"`,
    });
    expect(deletePlan.actions.map((action) => action.type), provider.id).toEqual([
      "form.delete",
      "form.delete",
    ]);
    expectSuccessfulExecution(
      await executeLivePlan({
        plan: deletePlan,
        actorId: actor.id,
        idempotencyKey: `${prefix}-form-delete`,
      })
    );
    expect(await getForm(publicForm.id), provider.id).toBeNull();
    expect(await getForm(internalForm.id), provider.id).toBeNull();
  } finally {
    await cleanup.run();
  }
};

afterAll(async () => {
  await globalCleanup.run();
});

testIfLive(
  "assistant live providers handle forms matrix",
  async () => {
    for (const provider of providers) {
      await runFormsMatrixForProvider(provider);
    }
  },
  180_000
);
